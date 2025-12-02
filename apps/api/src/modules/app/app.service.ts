import { PrismaService } from '@/common/prisma/prisma.service';
import { Utils } from '@/common/utils';
import { CreateAppDto } from '@/modules/app/dto/create-app.dto';
import { EditAppDto } from '@/modules/app/dto/edit-app.dto';
import { HttpService } from '@nestjs/axios';
import {
    BadRequestException,
    Injectable,
    Logger,
    NotFoundException,
    RequestTimeoutException,
    UnprocessableEntityException,
} from '@nestjs/common';
import { AppPermission, AppWebFetch } from '@sigauth/prisma-wrapper/json-types';
import { App } from '@sigauth/prisma-wrapper/prisma-client';
import { PROTECTED } from '@sigauth/prisma-wrapper/protected';
import dayjs from 'dayjs';
import { firstValueFrom, retry, timeout } from 'rxjs';

const APP_FETCH_ROUTE = '/connect-config.json';
const APP_NUDGE_ROUTE = '/api/connect/nudge';

@Injectable()
export class AppsService {
    private readonly logger = new Logger(AppsService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly httpService: HttpService,
    ) {}

    async createApp(createAppDto: CreateAppDto): Promise<App> {
        let appToken: string = '';
        do {
            appToken = Utils.generateToken(64);
        } while (await this.prisma.app.findUnique({ where: { token: appToken } }));

        if (createAppDto.webFetchEnabled)
            createAppDto.permissions = (await this.fetchPermissionsFromURL(createAppDto.url)) ?? createAppDto.permissions;

        // look for duplicate identifiers in permissions
        const allPerms = Object.values(createAppDto.permissions).flat();
        const uniquePerms = Array.from(new Set(allPerms));
        if (allPerms.length !== uniquePerms.length) throw new UnprocessableEntityException('Duplicate permissions in different categories');

        const app = await this.prisma.app.create({
            data: {
                name: createAppDto.name,
                url: createAppDto.url,
                token: appToken,
                oidcAuthCodeUrl: createAppDto.oidcAuthCodeUrl,
                webFetch: {
                    enabled: createAppDto.webFetchEnabled,
                    lastFetch: 0,
                    success: false,
                },
                permissions: {
                    root: createAppDto.permissions.root,
                    container: createAppDto.permissions.container,
                    asset: createAppDto.permissions.asset,
                } as AppPermission,
            },
        });

        return app;
    }

    async editApp(editAppDto: EditAppDto): Promise<App> {
        if (editAppDto.id == PROTECTED.App.id) throw new BadRequestException('You can not edit the SigAuth app, please create a new one');

        const app = await this.prisma.app.findUnique({ where: { id: editAppDto.id } });
        if (!app) throw new NotFoundException("App doesn't exist");

        if (editAppDto.nudge) await this.sendAppNudge(app.url);

        // look for duplicate identifiers in permissions
        const allPerms = Object.values(editAppDto.permissions).flat();
        const uniquePerms = Array.from(new Set(allPerms));
        if (allPerms.length !== uniquePerms.length) throw new UnprocessableEntityException('Duplicate permissions in different categories');

        const newPerms = editAppDto.webFetchEnabled
            ? await this.fetchPermissionsFromURL(app.url)
            : (editAppDto.permissions as AppPermission);
        if (!newPerms) throw new UnprocessableEntityException('Fetched permissions have invalid format');

        // handle permission removal
        await this.clearDeletedPermissions(app.id, app.permissions as AppPermission, newPerms);
        return this.prisma.app.update({
            where: { id: editAppDto.id },
            data: {
                name: editAppDto.name,
                url: editAppDto.url,
                oidcAuthCodeUrl: (editAppDto.oidcAuthCodeUrl || '').length > 0 ? editAppDto.oidcAuthCodeUrl : null,
                webFetch: {
                    enabled: editAppDto.webFetchEnabled,
                    lastFetch: editAppDto.webFetchEnabled ? dayjs().unix() : (app.webFetch as AppWebFetch).lastFetch,
                    success: editAppDto.webFetchEnabled ? true : (app.webFetch as AppWebFetch).success,
                },
                permissions: newPerms,
            },
        });
    }

    async deleteApps(appIds: number[]) {
        if (appIds.includes(PROTECTED.App.id)) throw new BadRequestException('You can not delete the SigAuth app!');

        const apps = await this.prisma.app.findMany({ where: { id: { in: appIds } } });
        if (apps.length != appIds.length) throw new NotFoundException('Not all apps found or invalid ids provided');

        // delete related permission instances
        await this.prisma.permissionInstance.deleteMany({
            where: {
                appId: { in: appIds },
            },
        });

        // todo this can be in a single query if we had a container-app relation table
        for (const id of appIds) {
            const containers = await this.prisma.container.findMany({ where: { apps: { has: id } } });
            for (const container of containers) {
                container.apps = container.apps.filter(c => c !== id);
                await this.prisma.container.update({ where: { id: container.id }, data: { apps: container.apps } });
            }
        }

        await this.prisma.app.deleteMany({ where: { id: { in: appIds } } });
    }

    async clearDeletedPermissions(appId: number, oldPermissions: AppPermission, newPermissions: AppPermission) {
        const oldPerms = Object.values(oldPermissions).flat();
        const newPerms = Object.values(newPermissions).flat();
        const removed = oldPerms.filter(p => !newPerms.includes(p)).map(p => Utils.convertPermissionNameToIdent(p));
        await this.prisma.permissionInstance.deleteMany({ where: { identifier: { in: removed }, appId } });
    }

    async fetchPermissionsFromURL(url: string) {
        try {
            const appRequest = await firstValueFrom(
                this.httpService
                    .get(url + APP_FETCH_ROUTE, { withCredentials: true })
                    .pipe(retry(3))
                    .pipe(timeout(2000)),
            );
            if (appRequest.status != 200) {
                this.logger.error(url + ' returned status ' + appRequest.status + " couldn't update permissions");
                return;
            }

            const perms = appRequest.data as AppPermission;
            if (
                !Array.isArray(perms.root) ||
                !Array.isArray(perms.container) ||
                !Array.isArray(perms.asset) ||
                perms.root.some(r => typeof r != 'string') ||
                perms.container.some(r => typeof r != 'string') ||
                perms.asset.some(r => typeof r != 'string')
            )
                throw new UnprocessableEntityException('Fetched permissions have invalid format');
            return {
                root: perms.root,
                container: perms.container,
                asset: perms.asset,
            };
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (error) {
            this.logger.error(url + " wasn't reachable couldn't update permissions");
            throw new RequestTimeoutException('App unreachable');
        }
    }

    async sendAppNudge(url: string) {
        try {
            await firstValueFrom(this.httpService.get(url + APP_NUDGE_ROUTE, { withCredentials: true }));
        } catch (_) {
            this.logger.error(url + " wasn't reachable couldn't send nudge");
        }
    }

    async getAppInfo(appToken: string) {
        const app = await this.prisma.app.findFirst({ where: { token: appToken } });
        if (!app) throw new NotFoundException("Couldn't resolve app");

        const accounts = await this.prisma.account.findMany({
            where: {
                permissions: {
                    some: {
                        appId: app.id,
                    },
                },
            },
            select: {
                id: true,
                email: true,
                name: true,
                accounts: true,
            },
        });

        const assets = await this.prisma.asset.findMany({
            where: {
                PermissionInstance: {
                    some: {
                        appId: app.id,
                    },
                },
            },
        });

        const containers = await this.prisma.container.findMany({
            where: {
                PermissionInstance: {
                    some: {
                        appId: app.id,
                    },
                },
            },
        });

        const containerIds = containers.map(c => c.id);

        const containerAssets = await this.prisma.asset.findMany({
            where: {
                typeId: PROTECTED.AssetType.id,
            },
        });

        const filtered = containerAssets.filter(
            a => Array.isArray(a.fields) && containerIds.includes((a.fields as string | number[])[0] as number),
        );

        return {
            permissions: app.permissions,
            webFetch: app.webFetch,
            accounts,
            assets,
            containers,
            containerAssets,
        };
    }
}
