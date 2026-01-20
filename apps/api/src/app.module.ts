import { DatabaseModule } from '@/internal/database/database.module';
import { AccountModule } from '@/modules/account/account.module';
import { AppsModule } from '@/modules/app/app.module';
import { AssetTypeModule } from '@/modules/asset-type/asset-type.module';
import { AssetModule } from '@/modules/asset/asset.module';
import { AuthModule } from '@/modules/auth/auth.module';
import { HealthModule } from '@/modules/health/health.module';
import { MirrorModule } from '@/modules/mirror/mirror.module';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { join } from 'path';
import { WellKnownModule } from './modules/well-known/well-known.module';

const API_RATE_LIMIT = +(process.env.API_RATE_LIMIT ?? 15);

@Module({
    imports: [
        ServeStaticModule.forRoot({
            rootPath: join(__dirname, '../..', 'webapp', 'dist'),
        }),
        ScheduleModule.forRoot(),
        ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../../.env'] }),
        AccountModule,
        ThrottlerModule.forRoot([
            {
                ttl: 60 * 1000, // 1 minute
                limit: API_RATE_LIMIT,
            },
        ]),
        AssetTypeModule,
        AssetModule,
        AppsModule,
        AuthModule,
        MirrorModule,
        WellKnownModule,
        HealthModule,
        DatabaseModule,
    ],
    providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
