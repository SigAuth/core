import { ORMService } from '@/internal/database/generic/orm.client';
import { StorageService } from '@/internal/database/storage.service';
import { BadRequestException, CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { App } from '@sigauth/sdk/fundamentals';
import { jwtVerify } from 'jose';

@Injectable()
export class SDKGuard implements CanActivate {
    private appCache = new Map<string, { app: App; timestamp: number }>();

    constructor(
        private readonly db: ORMService,
        private readonly storage: StorageService,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();

        const appId = request.headers['x-sigauth-app-id'];
        const appToken = request.headers['x-sigauth-app-token'];
        if (!appToken || !appId) throw new BadRequestException('Invalid app headers');

        let internalAccountAuthorization = request.headers['x-sigauth-internal-account-authorization'];

        // TODO maybe implement some JWT token stuff to avoid database calls on every request, but for now we can just check if the app token is valid in the database

        let app: null | App = null;
        if (this.appCache.has(`${appId}:${appToken}`)) {
            const cached = this.appCache.get(`${appId}:${appToken}`)!;
            app = cached.app;
            if (Date.now() - cached.timestamp > 5 * 60 * 1000) {
                // cache for 5 minutes
                this.appCache.delete(`${appId}:${appToken}`);
                app = null;
            }
        }

        if (!app) {
            app = await this.db.App.findOne({ where: { uuid: appId, token: appToken } });
            if (app) this.appCache.set(`${appId}:${appToken}`, { app, timestamp: Date.now() });
        }

        if (!app) throw new BadRequestException('Invalid app headers');
        request.sigauthApp = app;
        request.internalAccountAuthorization = internalAccountAuthorization;

        if (internalAccountAuthorization) {
            const accessToken = request.headers['x-sigauth-account-access-token'];
            if (!accessToken) throw new BadRequestException('Missing account access token header');

            if (!process.env.FRONTEND_URL) throw new Error('FRONTEND_URL environment variable is not set');
            const decoded = await jwtVerify(accessToken, this.storage.AuthPublicKey!, {
                audience: app.name,
                issuer: process.env.FRONTEND_URL,
            });

            if (!decoded || decoded.payload.exp! < Date.now() / 1000)
                throw new UnauthorizedException('Invalid or expired account access token');
            const accountId = decoded.payload.sub;
            const account = await this.db.Account.findOne({ where: { uuid: accountId } });
            if (!account) throw new UnauthorizedException('Account not found for access token');
            request.account = account;
        }
        return true;
    }
}
