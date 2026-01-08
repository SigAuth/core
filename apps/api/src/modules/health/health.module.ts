import { ApiAccountGuard } from '@/modules/auth/guards/api-account.guard';
import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

@Module({
    controllers: [HealthController],
    providers: [HealthService, ApiAccountGuard],
})
export class HealthModule {}
