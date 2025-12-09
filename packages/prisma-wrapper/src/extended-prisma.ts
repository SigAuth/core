import * as PrismaNS from './prisma-generated/client.js';
import { PrismaPg } from '@prisma/adapter-pg';

export { PrismaPg };

export type AccountWithPermissions = PrismaNS.Prisma.AccountGetPayload<{
    include: {
        permissions: true;
    };
}>;
