import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

@Injectable()
export class AuthGuard implements CanActivate {
    constructor() {}
    async canActivate(context: ExecutionContext): Promise<boolean> {
        // const request = context.switchToHttp().getRequest<Request>();
        // request.authMethod = 'session';

        // const sid = (request.cookies as Record<string, string>)?.['sid'];

        // if (!sid) {
        //     throw new UnauthorizedException('No session found');
        // }

        // const session = await this.prisma.session.findUnique({
        //     where: { id: sid },
        //     include: {
        //         account: {
        //             include: {
        //                 permissions: true,
        //             },
        //         },
        //     },
        // });

        // if (!session || session.expire < Math.floor(Date.now() / 1000)) {
        //     throw new UnauthorizedException('Invalid session');
        // }

        // request.account = session.account as AccountWithPermissions;
        return true;
    }
}
