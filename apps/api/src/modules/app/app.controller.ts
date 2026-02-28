import { AppsService } from '@/modules/app/app.service';
import { CreateAppDto } from '@/modules/app/dto/create-app.dto';
import { DeleteAppDto } from '@/modules/app/dto/delete-app.dto';
import { EditAppDto } from '@/modules/app/dto/edit-app.dto';
import { IsRoot } from '@/modules/auth/guards/authentication.is-root.guard';
import { SDKGuard } from '@/modules/auth/guards/sdk.guard';
import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, UseGuards } from '@nestjs/common';
import {
    ApiCreatedResponse,
    ApiForbiddenResponse,
    ApiNoContentResponse,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiProperty,
    ApiRequestTimeoutResponse,
    ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { App } from '@sigauth/sdk/fundamentals';

@Controller('app')
export class AppsController {
    constructor(private readonly appsService: AppsService) {}

    @Post('create')
    @UseGuards(SDKGuard, IsRoot)
    @ApiCreatedResponse({
        description: 'App created successfully',
        example: {
            app: {
                id: 25,
                name: 'test',
                url: 'https://sigauth.com',
                permissions: [
                    { permissions: ['read', 'write', 'delete'] },
                    { typeUuid: '550e8400-e29b-41d4-a716-446655440000', permissions: ['view', 'edit'] },
                ],
            },
        },
    })
    @ApiRequestTimeoutResponse({ description: 'Request to fetch apps permissions timed out' })
    @ApiUnprocessableEntityResponse({
        description: 'Fetched permissions have invalid format (e.g. root is not an array of strings, etc.',
    })
    @ApiForbiddenResponse({ description: 'Forbidden' })
    @ApiUnprocessableEntityResponse({ description: 'Duplicate permissions in different categories' })
    async createApp(@Body() createAppDto: CreateAppDto): Promise<App> {
        return await this.appsService.createApp(createAppDto);
    }

    @Post('edit')
    @UseGuards(SDKGuard, IsRoot)
    @HttpCode(HttpStatus.OK)
    @ApiOkResponse({
        description: 'App updated successfully',
        example: {
            app: {
                id: 25,
                name: 'test',
                url: 'https://sigauth.com',
                permissions: [
                    { permissions: ['read', 'write', 'delete'] },
                    { typeUuid: '550e8400-e29b-41d4-a716-446655440000', permissions: ['view', 'edit'] },
                ],
            },
        },
    })
    @ApiRequestTimeoutResponse({ description: 'Request to fetch apps permissions timed out' })
    @ApiUnprocessableEntityResponse({
        description:
            'Fetched permissions have invalid format (e.g. root is not an array of strings, etc. or duplicate permissions in different categories',
    })
    @ApiForbiddenResponse({ description: 'Forbidden' })
    @ApiNotFoundResponse({ description: 'App not found' })
    async editApp(@Body() editAppDto: EditAppDto): Promise<App> {
        return await this.appsService.editApp(editAppDto);
    }

    @Post('delete')
    @UseGuards(SDKGuard, IsRoot)
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiNoContentResponse({ description: 'Apps deleted successfully' })
    @ApiNotFoundResponse({ description: 'Not all apps found or invalid ids provided' })
    @ApiForbiddenResponse({ description: 'Forbidden' })
    async deleteApps(@Body() deleteAppsDto: DeleteAppDto) {
        return await this.appsService.deleteApps(deleteAppsDto.appUuids);
    }

    @Get('generic-info')
    @HttpCode(HttpStatus.OK)
    @ApiProperty({ description: 'Generic info about the app, used for the login gateway' })
    async genericInfo(@Query('client_id') clientId: string) {
        return await this.appsService.getAppGenericInfo(clientId);
    }
}

