import { AppsService } from '@/modules/app/app.service';
import { CreateAppDto } from '@/modules/app/dto/create-app.dto';
import { DeleteAppDto } from '@/modules/app/dto/delete-app.dto';
import { EditAppDto } from '@/modules/app/dto/edit-app.dto';
import { AuthGuard } from '@/modules/auth/guards/authentication.guard';
import { IsRoot } from '@/modules/auth/guards/authentication.is-root.guard';
import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import {
    ApiCreatedResponse,
    ApiForbiddenResponse,
    ApiNoContentResponse,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiRequestTimeoutResponse,
    ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { App } from '@sigauth/generics/database/orm-client/types.client';

@Controller('app')
export class AppsController {
    constructor(private readonly appsService: AppsService) {}

    @Post('create')
    @UseGuards(AuthGuard, IsRoot)
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
    @UseGuards(AuthGuard, IsRoot)
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
    @UseGuards(AuthGuard, IsRoot)
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiNoContentResponse({ description: 'Apps deleted successfully' })
    @ApiNotFoundResponse({ description: 'Not all apps found or invalid ids provided' })
    @ApiForbiddenResponse({ description: 'Forbidden' })
    async deleteApps(@Body() deleteAppsDto: DeleteAppDto) {
        await this.appsService.deleteApps(deleteAppsDto.appUuids);
    }

    // @Get('info')
    // @HttpCode(HttpStatus.OK)
    // @UseGuards(ApiAppGuard)
    // @ApiHeader({ name: 'Authorization', description: 'Token <app-token>', required: true })
    // @ApiNotFoundResponse({ description: 'Invalid App Token' })
    // @ApiOkResponse({
    //     description: 'App related assets, containers and accounts fetched successfully',
    //     example: {
    //         ok: true,
    //         appInfo: {
    //             assets: [
    //                 {
    //                     id: 1,
    //                     name: 'test',
    //                     typeId: 2,
    //                     fields: [
    //                         {
    //                             id: 1,
    //                             name: 'test',
    //                         },
    //                     ],
    //                 },
    //                 {
    //                     id: 2,
    //                     name: 'Blog Post 2',
    //                     typeId: 2,
    //                     fields: [
    //                         {
    //                             id: 1,
    //                             name: 'How I started my 1 million dollar company',
    //                         },
    //                     ],
    //                 },
    //             ],
    //             assetTypes: [
    //                 {
    //                     id: 2,
    //                     name: 'Blog Post',
    //                     fields: [
    //                         {
    //                             type: 2,
    //                             name: 'Text',
    //                             required: true,
    //                         },
    //                     ],
    //                 },
    //                 {
    //                     id: 4,
    //                     name: 'test',
    //                     fields: [
    //                         {
    //                             type: 1,
    //                             name: 'ID',
    //                             required: true,
    //                         },
    //                         {
    //                             type: 2,
    //                             name: 'Name',
    //                             required: true,
    //                         },
    //                     ],
    //                 },
    //             ],
    //             containers: [
    //                 {
    //                     id: 178,
    //                     name: 'example-container',
    //                     assets: [2],
    //                     apps: [3],
    //                 },
    //                 {
    //                     id: 179,
    //                     name: 'example-container-2',
    //                     assets: [1],
    //                     apps: [3],
    //                 },
    //             ],
    //             containerAssets: [
    //                 {
    //                     id: 4,
    //                     name: 'example-asset',
    //                     typeId: 1,
    //                     fields: {
    //                         0: 178,
    //                         1: 'example-container',
    //                     },
    //                 },
    //                 {
    //                     id: 5,
    //                     name: 'example-asset-2',
    //                     typeId: 1,
    //                     fields: {
    //                         0: 179,
    //                         1: 'example-container-2',
    //                     },
    //                 },
    //             ],
    //             accounts: [
    //                 { id: 574, name: 'John Doe', email: 'doe@example.com' },
    //                 { id: 532, name: 'Ben Hacker', email: 'john@example.com' },
    //             ],
    //             permissions: {
    //                 asset: ['chart-insights', 'reports', 'maintainer'],
    //                 container: ['brand-manager', 'editor', 'viewer'],
    //                 root: ['app1-administrator', 'app1-developer'],
    //             },
    //             webFetch: {
    //                 enabled: true,
    //                 lastFetch: 0,
    //                 success: false,
    //             },
    //         },
    //     },
    // })
    // async getAppInfo(@Req() req: Request) {
    //     return await this.appsService.getAppInfo(req.sigauthApp!);
    // }
}

