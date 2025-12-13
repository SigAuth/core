import { Controller, ForbiddenException, Get, HttpCode, HttpStatus, Req } from '@nestjs/common';
import { ApiForbiddenResponse, ApiOkResponse } from '@nestjs/swagger';
import { HealthService } from '@/modules/health/health.service';

@Controller('health')
export class HealthController {
    constructor(private readonly healthService: HealthService) {}

    @Get()
    @HttpCode(HttpStatus.OK)
    @ApiForbiddenResponse({ description: 'Health endpoint is disabled' })
    async getHealth() {

        if (process.env.EXPOSE_HEALTH_ENDPOINT === 'false') {
            throw new ForbiddenException('Health endpoint is disabled');
        }

        var healthApps = this.healthService.getHealthApps();

        return {
            timestamp: new Date(),
            status: 'ok',
            apps: healthApps,
        };
    }
}
