import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

@Injectable()
export class IsRoot implements CanActivate {
    constructor() {}

    canActivate(context: ExecutionContext): boolean {
        // const request = context.switchToHttp().getRequest<Request>();
        // request.authMethod = 'session';
        // if (!request.account) throw new UnauthorizedException('No account found');
        // const account: AccountWithPermissions = request.account as AccountWithPermissions;
        // return !!account.permissions.find(
        //     p => p.appId == PROTECTED.App.id && p.identifier == Utils.convertPermissionNameToIdent(SigAuthRootPermissions.ROOT),
        // );
        return true;
    }
}
