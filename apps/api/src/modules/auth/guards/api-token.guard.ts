import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { Request } from 'express';
import { AccountWithPermissions } from '@sigauth/generics';

const TOKEN_PREFIX = 'Token ';

@Injectable()
export class ApiTokenGuard implements CanActivate {
    private readonly logger = new Logger(ApiTokenGuard.name);

    constructor(private readonly prisma: PrismaService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<Request>();
        const authHeader = request.headers['authorization'];
        request.authMethod = 'api-token';

        if (!authHeader?.startsWith(TOKEN_PREFIX)) {
            this.logger.warn(`Unauthorized request: missing or invalid Authorization header`);
            throw new UnauthorizedException('Missing or invalid Authorization header');
        }

        const apiToken = authHeader.slice(TOKEN_PREFIX.length).trim();
        if (!apiToken) {
            this.logger.warn(`Unauthorized request: empty API token`);
            throw new UnauthorizedException('API token is empty');
        }

        const account = await this.prisma.account.findFirst({
            where: { api: apiToken },
            include: { permissions: true },
        });

        if (!account) {
            this.logger.warn(`Unauthorized request: invalid API token`);
            throw new UnauthorizedException('Invalid API token');
        }

        request.account = account as AccountWithPermissions;
        return true;
    }
}
