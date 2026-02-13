import { ORMService } from '@/internal/database/generic/orm.client';
import { StorageService } from '@/internal/database/storage.service';
import { Utils } from '@/internal/utils';
import { CreateAppDto, PermissionsDto } from '@/modules/app/dto/create-app.dto';
import { EditAppDto } from '@/modules/app/dto/edit-app.dto';
import { HttpService } from '@nestjs/axios';
import { BadRequestException, Injectable, Logger, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { App, Permission } from '@sigauth/sdk/fundamentals';
import { firstValueFrom } from 'rxjs';

const APP_FETCH_ROUTE = '/sigauth-config.json';
const APP_NUDGE_ROUTE = '/api/sigauth/nudge';

@Injectable()
export class AppsService {
    private readonly logger = new Logger(AppsService.name);

    constructor(
        private readonly httpService: HttpService,
        private readonly db: ORMService,
        private readonly storage: StorageService,
    ) {}

    async createApp(createAppDto: CreateAppDto): Promise<App> {
        let appToken: string = '';
        do {
            appToken = Utils.generateToken(64);
        } while (await this.db.App.findOne({ where: { token: appToken } }));

        // if (createAppDto.webFetchEnabled)
        //    createAppDto.permissions = (await this.fetchPermissionsFromURL(createAppDto.url)) ?? createAppDto.permissions;

        // look for duplicate identifiers in permissions within a category
        this.checkForDuplicatePermissions(createAppDto.permissions);

        const app = await this.db.App.createOne({
            data: {
                name: createAppDto.name,
                url: createAppDto.url,
                token: appToken,
                oidcAuthCodeCb: createAppDto.oidcAuthCodeUrl,
            },
        });

        await this.db.Permission.createMany({
            data: createAppDto.permissions.flatMap(type =>
                type.permissions.map(perm => ({
                    appUuid: app.uuid,
                    typeUuid: type.typeUuid,
                    permission: perm,
                })),
            ),
        });

        const exisitngScopes = await this.db.AppScope.findMany({
            where: { name: { in: createAppDto.scopes } },
        });
        const uniqueScopes = [...new Set(createAppDto.scopes)];
        for (const scopeName of uniqueScopes) {
            if (!exisitngScopes.find(s => s.name === scopeName)) {
                await this.db.AppScope.createOne({
                    data: {
                        name: scopeName,
                        appUuids: [app.uuid],
                        description: '',
                        public: false,
                    },
                });
            } else {
                const scope = exisitngScopes.find(s => s.name === scopeName)!;
                if (!scope.appUuids.includes(app.uuid)) {
                    await this.db.AppScope.updateOne({
                        where: { name: scope.name },
                        data: { appUuids: [...scope.appUuids, app.uuid] },
                    });
                }
            }
        }

        return this.getApp(app.uuid) as Promise<App>;
    }

    async editApp(editAppDto: EditAppDto): Promise<App> {
        if (editAppDto.uuid == this.storage.SigAuthAppUuid)
            throw new BadRequestException('You can not edit the SigAuth app, please create a new one');

        const app = await this.db.App.findOne({ where: { uuid: editAppDto.uuid }, includes: { permission_apps: true } });
        if (!app) throw new NotFoundException("App doesn't exist");

        if (editAppDto.nudge) await this.sendAppNudge(app.url);

        // look for duplicate identifiers in permissions
        this.checkForDuplicatePermissions(editAppDto.permissions);

        // handle permission removal
        await this.clearDeletedPermissions(app.uuid, app.permission_apps, editAppDto.permissions);

        return this.db.App.updateOne({
            where: { uuid: editAppDto.uuid },
            data: {
                name: editAppDto.name,
                url: editAppDto.url,
                oidcAuthCodeCb: (editAppDto.oidcAuthCodeUrl || '').length > 0 ? editAppDto.oidcAuthCodeUrl : undefined,
            },
        });
    }

    async deleteApps(appUuids: string[]) {
        if (appUuids.includes(this.storage.SigAuthAppUuid!)) throw new BadRequestException('You can not delete the SigAuth app!');

        const apps = await this.db.App.findMany({ where: { uuid: { in: appUuids } } });
        if (apps.length != appUuids.length) throw new NotFoundException('Not all apps found or invalid ids provided');

        await this.db.App.deleteMany({ where: { uuid: { in: appUuids } } });
    }

    async clearDeletedPermissions(appUuid: string, oldPermissions: Permission[], newPermissions: PermissionsDto[]) {
        const toKeep: Set<string> = new Set();
        for (const permCategory of newPermissions) {
            for (const perm of permCategory.permissions) {
                const key = `${permCategory.typeUuid || 'root'}#${perm}`;
                toKeep.add(key);
            }
        }

        const toDelete = oldPermissions.filter(p => {
            const key = `${p.typeUuid || 'root'}#${p.permission}`;
            return !toKeep.has(key);
        });

        if (toDelete.length > 0) {
            await this.db.Permission.deleteMany({
                where: {
                    appUuid,
                    OR: toDelete.map(p => ({
                        typeUuid: p.typeUuid,
                        permission: p.permission,
                    })),
                },
            });
        }
    }

    async sendAppNudge(url: string) {
        try {
            await firstValueFrom(this.httpService.get(url + APP_NUDGE_ROUTE, { withCredentials: true }));
        } catch (_) {
            this.logger.error(url + " wasn't reachable couldn't send nudge");
        }
    }

    checkForDuplicatePermissions(dto: PermissionsDto[]) {
        const cats: Record<string, string[]> = {};
        for (const perm of dto) {
            const key = perm.typeUuid || 'root';
            if (!cats[key]) cats[key] = [];
            cats[key].push(...perm.permissions);
        }

        if (
            Object.values(cats).some(c => {
                const uniquePerms = Array.from(new Set(c));
                return c.length !== uniquePerms.length;
            })
        ) {
            throw new UnprocessableEntityException('Duplicate permissions in the same category');
        }
    }

    async getApp(uuid: string): Promise<App | null> {
        return this.db.App.findOne({ where: { uuid }, includes: { permission_apps: true, appScope_apps: true } });
    }
}
