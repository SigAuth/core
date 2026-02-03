import { ORMService } from '@/internal/database/orm.client';
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Account } from '@sigauth/generics/database/orm-client/types.client';
import { Request } from 'express';

@Injectable()
export class AuthGuard implements CanActivate {
    constructor(private readonly db: ORMService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<Request>();
        request.authMethod = 'session';

        const sid = (request.cookies as Record<string, string>)?.['sid'];

        if (!sid) {
            throw new UnauthorizedException('No session found');
        }

        const session = await this.db.Session.findOne({
            where: { uuid: sid },
            includes: {
                subject_account: true,
            },
        });

        if (!session || session.expire < Math.floor(Date.now() / 1000)) {
            throw new UnauthorizedException('Invalid session');
        }

        request.account = session.subject_account as Account;
        return true;
    }
}

