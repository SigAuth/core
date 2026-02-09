import { StorageService } from '@/internal/database/storage.service';
import { Utils } from '@/internal/utils';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { SigAuthPermissions } from '@sigauth/sdk/protected';
import { Request } from 'express';

@Injectable()
export class IsRoot implements CanActivate {
    constructor(private readonly storage: StorageService) {}

    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest<Request>();
        if (!request.account) return true;
        const account = request.account;
        return !!account.account_grants!.find(
            p => p.appUuid == this.storage.SigAuthAppUuid && p.permission == Utils.convertPermissionNameToIdent(SigAuthPermissions.ROOT),
        );
    }
}

