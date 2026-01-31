import { ORMService } from '@/internal/database/orm.client';
import { CanActivate, ExecutionContext, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';

const TOKEN_PREFIX = 'Token ';

@Injectable()
export class ApiAppGuard implements CanActivate {
    private readonly logger: Logger = new Logger(ApiAppGuard.name);

    constructor(private readonly db: ORMService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<Request>();
        const authHeader = request.headers['authorization'];
        request.authMethod = 'api-token';

        if (!authHeader?.startsWith(TOKEN_PREFIX)) {
            this.logger.warn(`Unauthorized request: missing or invalid Authorization header`);
            throw new UnauthorizedException('Missing or invalid Authorization header');
        }

        const apiToken = authHeader.slice(TOKEN_PREFIX.length).trim();
        if (!apiToken || apiToken.length === 0) {
            this.logger.warn(`Unauthorized request: empty API token`);
            throw new UnauthorizedException('API token is empty');
        }

        const app = await this.db.App.findOne({
            where: { token: apiToken },
        });

        if (!app) {
            this.logger.warn(`Unauthorized request: invalid API token`);
            throw new UnauthorizedException('Invalid API token');
        }

        request.sigauthApp = app;
        return true;
    }
}

