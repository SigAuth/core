import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';

const TOKEN_PREFIX = 'Token ';

@Injectable()
export class ApiAccountGuard implements CanActivate {
    private readonly logger = new Logger(ApiAccountGuard.name);

    constructor() {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        // const request = context.switchToHttp().getRequest<Request>();
        // const authHeader = request.headers['authorization'];
        // request.authMethod = 'api-token';

        // if (!authHeader?.startsWith(TOKEN_PREFIX)) {
        //     this.logger.warn(`Unauthorized request: missing or invalid Authorization header`);
        //     throw new UnauthorizedException('Missing or invalid Authorization header');
        // }

        // const apiToken = authHeader.slice(TOKEN_PREFIX.length).trim();
        // if (!apiToken || apiToken.length === 0) {
        //     this.logger.warn(`Unauthorized request: empty API token`);
        //     throw new UnauthorizedException('API token is empty');
        // }

        // const account = await this.prisma.account.findFirst({
        //     where: { api: apiToken },
        //     include: { permissions: true },
        // });

        // if (!account) {
        //     this.logger.warn(`Unauthorized request: invalid API token`);
        //     throw new UnauthorizedException('Invalid API token');
        // }

        // request.account = account as AccountWithPermissions;
        return true;
    }
}
