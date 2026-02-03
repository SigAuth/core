import { StorageService } from '@/internal/database/storage.service';
import { Utils } from '@/internal/utils';
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { SigAuthPermissions } from '@sigauth/sdk/protected';
import { Request } from 'express';

// - database moved in nestapp
// - cli & generics wird gemerged zu sdk
// - sdk wird mit appToken initialisiert kann dann types genieren für user
// - sdk served api wrapper für user
// - admin dashboard wird mit sdk gebaut (läuft unter gleicher interner app)

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

