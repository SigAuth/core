import { Account, App } from '@/internal/database/orm-client/types.client';

declare global {
    namespace Express {
        interface Request {
            account?: Account;
            sigauthApp?: App;
            internalAccountAuthorization?: boolean;
            cookies: Record<string, string>;
        }
    }
}

