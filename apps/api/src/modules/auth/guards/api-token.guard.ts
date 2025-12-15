import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { Request } from 'express';
import { AccountWithPermissions } from '@sigauth/generics';

@Injectable()
export class ApiTokenGuard implements CanActivate {
    constructor(private readonly prisma: PrismaService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<Request>();

        const apiToken = request.headers['x-api-key'] as string;

        if (!apiToken) {
            throw new UnauthorizedException('No API token provided');
        }

        const account = await this.prisma.account.findFirst({
            where: { api: apiToken },
            include: { permissions: true },
        });

        if (!account) {
            throw new UnauthorizedException('Invalid API token');
        }

        request.account = account as AccountWithPermissions;
        return true;
    }
}
