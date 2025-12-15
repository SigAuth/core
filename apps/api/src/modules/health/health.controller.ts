import { Controller, ForbiddenException, Get, HttpCode, HttpStatus, ParseBoolPipe, Query, UseGuards } from '@nestjs/common';
import { ApiForbiddenResponse, ApiHeader, ApiOkResponse, ApiQuery } from '@nestjs/swagger';
import { HealthService } from '@/modules/health/health.service';
import { ApiTokenGuard } from '@/modules/auth/guards/api-token.guard';

@Controller('health')
export class HealthController {
    constructor(private readonly healthService: HealthService) {}

    @UseGuards(ApiTokenGuard)
    @Get()
    @HttpCode(HttpStatus.OK)
    @ApiHeader({
        name: 'x-api-key',
        description: 'Your API token. You can also provide it as query parameter `apiKey`.',
        required: true,
    })
    @ApiQuery({
        name: 'apps',
        required: false,
        type: 'boolean',
        description: 'Include app/dependency health checks',
    })
    @ApiOkResponse({
        description: 'Health check without app checks',
        example: {
            timestamp: '2025-12-15T09:45:12.123Z',
            status: 'ok',
        },
    })
    @ApiOkResponse({
        description: 'Health check including app/dependency checks',
        example: {
            timestamp: '2025-12-15T09:45:12.123Z',
            status: 'ok',
            apps: [
                { id: 1, name: 'auth', status: 'healthy' },
                { id: 2, name: 'database', status: 'healthy' },
            ],
        },
    })
    @ApiForbiddenResponse({ description: 'Health endpoint is disabled' })
    async getHealth(@Query('apps', new ParseBoolPipe({ optional: true })) includeApps = false) {
        if (process.env.EXPOSE_HEALTH_ENDPOINT === 'false') {
            throw new ForbiddenException('Health endpoint is disabled');
        }

        return {
            timestamp: new Date(),
            status: 'ok',
            ...(includeApps && {
                apps: await this.healthService.getAppsHealthStatus(),
            }),
        };
    }
}
