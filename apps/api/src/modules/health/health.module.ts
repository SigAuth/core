import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { ApiAccountGuard } from '@/modules/auth/guards/api-account.guard';

@Module({
    controllers: [HealthController],
    providers: [HealthService, PrismaService, ApiAccountGuard],
})
export class HealthModule {}
