import { AuthService } from '@/modules/auth/auth.service';
import { HasPermissionDto } from '@/modules/auth/dto/has-permission.dto';
import { LoginRequestDto } from '@/modules/auth/dto/login-request.dto';
import { OIDCAuthenticateDto } from '@/modules/auth/dto/oidc-authenticate.dto';
import { AuthGuard } from '@/modules/auth/guards/authentication.guard';
import { BadRequestException, Body, Controller, Get, HttpCode, HttpStatus, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import {
    ApiAcceptedResponse,
    ApiBadRequestResponse,
    ApiForbiddenResponse,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AccountWithPermissions } from '@sigauth/prisma-wrapper/prisma-extended';
import { type Request, type Response } from 'express';
import * as process from 'node:process';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Get('oidc/authenticate')
    @HttpCode(HttpStatus.OK)
    @ApiOkResponse({ description: 'Redirect to the app with the authorization code.' })
    @ApiNotFoundResponse({ description: 'App or no session found.' })
    async authenticateOIDC(@Query() oidcAuthDto: OIDCAuthenticateDto, @Req() req: Request) {
        return await this.authService.authenticateOIDC(oidcAuthDto, req.cookies['sid'] as string);
    }

    @Get('oidc/exchange')
    @HttpCode(HttpStatus.OK)
    @ApiUnauthorizedResponse({ description: 'Invalid code or app token.' })
    @ApiOkResponse({
        description: 'Access and refresh tokens issued successfully.',
        example: { accessToken: 'eyDSawjdgaszdgwagdsukgduigvsagdaisghdwagdsiuzdhi', refreshToken: 't5468gfd486wef486fsd846v864' },
    })
    async exchangeOIDC(@Query('code') code: string, @Query('app-token') appToken: string) {
        return await this.authService.exchangeOIDCToken(code, appToken);
    }

    @Get('oidc/refresh')
    @HttpCode(HttpStatus.OK)
    @ApiUnauthorizedResponse({ description: 'Invalid code or app token.' })
    @ApiOkResponse({
        description: 'Access and refresh tokens refreshed successfully.',
        example: { accessToken: 'eyDSawjdgaszdgwagdsukgduigvsagdaisghdwagdsiuzdhi', refreshToken: 't5468gfd486wef486fsd846v864' },
    })
    async refreshOIDC(@Query('refreshToken') refreshToken: string, @Query('app-token') appToken: string) {
        return await this.authService.refreshOIDCToken(refreshToken, appToken);
    }

    /**
     * this route should only be called from the SigAuth frontend.
     *
     * how can we verify this:
     * - we could use cloudflare turnstile or something similar
     */
    @Post('login')
    @HttpCode(HttpStatus.ACCEPTED)
    @ApiAcceptedResponse({ description: 'Session created and cookie set. No content.' })
    async login(@Body() loginRequestDto: LoginRequestDto, @Res() res: Response) {
        // TODO allow authentcation via other methods as well (e.g. OAuth, SAML, Mail)
        const sessionId = await this.authService.login(loginRequestDto);
        res.cookie('sid', sessionId, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 1000 * 60 * 60 * 24 * +(process.env.SESSION_EXPIRATION_OFFSET ?? 5), // needs to be in millis
            path: '/',
        });

        res.sendStatus(202);
    }

    @Get('logout')
    @UseGuards(AuthGuard)
    @HttpCode(HttpStatus.OK)
    @ApiOkResponse({ description: 'Session deleted and cookie cleared. No content.' })
    async logout(@Req() req: Request, @Res() res: Response) {
        const sid = (req.cookies as Record<string, string>)?.['sid'];
        await this.authService.logout(req.account as AccountWithPermissions, sid);
        res.clearCookie('sid');
        res.sendStatus(200);
    }

    @Get('/oidc/has-permission')
    @HttpCode(HttpStatus.OK)
    @ApiOkResponse({
        description: 'Permission check result.',
        example: 'OK',
    })
    @ApiForbiddenResponse({ description: 'Account does not have the required permission or is signed out.', example: 'Forbidden' })
    @ApiBadRequestResponse({ description: 'Permission query parameter is missing.' })
    async hasPermission(@Req() req: Request, @Query() permissionDto: HasPermissionDto) {
        return await this.authService.hasPermission(permissionDto);
    }

    @Get('init')
    @UseGuards(AuthGuard)
    @HttpCode(HttpStatus.OK)
    @ApiOkResponse({
        description: 'Session validated and general information to run the dashboard fetched successfully.',
        example: {
            account: { id: 1, name: 'root', created: 1695292800, secondFactor: null },
            accounts: [{ id: 1, name: 'root', created: 1695292800, secondFactor: null }],
            assets: [{ id: 1, name: 'test', typeId: 1, data: {}, created: 1695292800 }],
            assetTypes: [{ id: 1, name: 'test', fields: [{ id: 1, name: 'test' }] }],
            apps: [{ id: 1, name: 'SigAuth', identifier: 'sigauth', created: 1695292800 }],
            containers: [{ id: 1, name: 'Default', assets: [1], created: 1695292800 }],
        },
    })
    async init(@Req() req: Request) {
        return await this.authService.getInitData(req.cookies['sid'] as string, req.account as AccountWithPermissions);
    }
}
