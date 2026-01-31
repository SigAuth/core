import { Account, App } from '@/internal/database/orm-client/types.client';

declare global {
    namespace Express {
        interface Request {
            account?: Account;
            sigauthApp?: App;
            cookies: Record<string, string>;
            authMethod: 'session' | 'api-token';
        }
    }
}

