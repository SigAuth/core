import { Prisma } from '@/prisma-generated/client.js';
import { PrismaPg } from '@prisma/adapter-pg';

export { PrismaPg };

export type AccountWithPermissions = Prisma.AccountGetPayload<{
    include: {
        permissions: true;
    };
}>;
