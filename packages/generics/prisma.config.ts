import dotenv from 'dotenv';
import type { PrismaConfig } from 'prisma';
import { env } from 'prisma/config';

if (process.env.NODE_ENV !== 'production') {
    dotenv.config({ path: '../../.env' });
}

export default {
    schema: 'prisma/schema.prisma',
    
    migrations: {
        path: 'prisma/migrations',
        seed: 'tsx prisma/seed.ts',
    },
    datasource: {
        url: env('DATABASE_URL'),
    },
} satisfies PrismaConfig;
