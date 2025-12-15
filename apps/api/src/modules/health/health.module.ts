import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { ApiTokenGuard } from '@/modules/auth/guards/api-token.guard';

@Module({
  controllers: [HealthController],
  providers: [HealthService, PrismaService, ApiTokenGuard]
})
export class HealthModule {}
