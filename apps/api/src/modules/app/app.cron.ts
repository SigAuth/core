import { AppsService } from '@/modules/app/app.service';
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class AppWebFetchCron {
    private readonly logger: Logger = new Logger(AppWebFetchCron.name);

    constructor(private readonly appService: AppsService) {}

    @Cron('0 0 * * *') // Every day at midnight
    async tick() {
        // const apps = await this.prisma.app.findMany({ where: { webFetch: { path: ['enabled'], equals: true } } });
        // for (const app of apps) {
        //     try {
        //         const permissions = await this.appService.fetchPermissionsFromURL(app.url);
        //         let fetchSuccess = false;
        //         if (permissions) {
        //             // look for duplicate identifiers in permissions
        //             const allPerms = Object.values(permissions).flat();
        //             const uniquePerms = Array.from(new Set(allPerms));
        //             if (allPerms.length !== uniquePerms.length) {
        //                 this.logger.warn(`Duplicate permissions found for app ${app.name} (${app.id}). Skipping update.`);
        //                 await this.updateWebFetchStatus(app.id, app.webFetch as AppWebFetch, false);
        //                 continue;
        //             }
        //             await this.appService.clearDeletedPermissions(app.id, app.permissions as AppPermission, permissions);
        //             this.logger.log(`Updated permissions for app ${app.name} (${app.id}) from web fetch.`);
        //             fetchSuccess = true;
        //         }
        //         await this.updateWebFetchStatus(app.id, app.webFetch as AppWebFetch, fetchSuccess);
        //     } catch (error: any) {
        //         this.logger.error(`Failed to fetch permissions for app ${app.name} (${app.id}): ${error.message}`);
        //         await this.updateWebFetchStatus(app.id, app.webFetch as AppWebFetch, false);
        //     }
        // }
    }

    private updateWebFetchStatus(appId: number, webFetch: any, status: boolean) {
        // return this.prisma.app.update({
        //     where: { id: appId },
        //     data: {
        //         webFetch: {
        //             ...(webFetch as AppWebFetch),
        //             success: status,
        //             lastFetch: new Date(),
        //         },
        //     },
        // });
    }
}
