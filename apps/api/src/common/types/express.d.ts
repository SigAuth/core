import { App } from '@sigauth/generics/prisma-client';
import { AccountWithPermissions } from '@src/common/types/extended-prisma';

declare global {
    namespace Express {
        interface Request {
            account?: AccountWithPermissions;
            sigauthApp?: App;
            cookies: Record<string, string>;
            authMethod: 'session' | 'api-token';
        }
    }
}
