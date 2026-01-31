import { StorageService } from '@/internal/database/storage.service';
import { Utils } from '@/internal/utils';
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { SigAuthPermissions } from '@sigauth/generics/protected';
import { Request } from 'express';

@Injectable()
export class IsRoot implements CanActivate {
    constructor(private readonly storage: StorageService) {}

    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest<Request>();
        request.authMethod = 'session';
        if (!request.account) throw new UnauthorizedException('No account found');
        const account = request.account;
        return !!account.account_grants!.find(
            p => p.appUuid == this.storage.SigAuthAppUuid && p.permission == Utils.convertPermissionNameToIdent(SigAuthPermissions.ROOT),
        );
    }
}

