import { AccountWithPermissions } from '@src/common/types/extended-prisma';

declare global {
    namespace Express {
        interface Request {
            account?: AccountWithPermissions;
            cookies: Record<string, string>;
            authMethod: 'session' | 'api-token';
        }
    }
}
