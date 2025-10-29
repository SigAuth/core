import { PrismaService } from '@/common/prisma/prisma.service';
import { Utils } from '@/common/utils';
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AccountWithPermissions } from '@sigauth/prisma-wrapper/prisma-extended';
import { PROTECTED, SigAuthRootPermissions } from '@sigauth/prisma-wrapper/protected';
import { Request } from 'express';

@Injectable()
export class IsRoot implements CanActivate {
    constructor(private readonly prisma: PrismaService) {}

    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest<Request>();
        if (!request.account) throw new UnauthorizedException('No account found');

        const account: AccountWithPermissions = request.account as AccountWithPermissions;
        return !!account.permissions.find(
            p => p.appId == PROTECTED.App.id && p.identifier == Utils.convertPermissionNameToIdent(SigAuthRootPermissions.ROOT),
        );
    }
}
