import { PrismaService } from '@/common/prisma/prisma.service';
import { Utils } from '@/common/utils';
import { HasPermissionDto } from '@/modules/auth/dto/has-permission.dto';
import { LoginRequestDto } from '@/modules/auth/dto/login-request.dto';
import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Account, App, Asset, AssetType, Container, Mirror, Session } from '@sigauth/generics/prisma-client';
import { AccountWithPermissions } from '@sigauth/generics/prisma-extended';
import { PROTECTED, SigAuthRootPermissions } from '@sigauth/generics/protected';
import * as bycrypt from 'bcryptjs';
import dayjs from 'dayjs';
import fs from 'fs';
import { jwtVerify, SignJWT } from 'jose';
import { createPrivateKey, createPublicKey, generateKeyPairSync, KeyObject } from 'node:crypto';
import * as process from 'node:process';
import * as speakeasy from 'speakeasy';
import { OIDCAuthenticateDto } from './dto/oidc-authenticate.dto';
import { UserInfo } from '@sigauth/generics/json-types';

@Injectable()
export class AuthService {
    private readonly logger = new Logger(PrismaService.name);

    public publicKey: KeyObject | null = null;
    public privateKey: KeyObject | null = null;

    // load or generate RSA keys
    async onModuleInit() {
        const privatePath = './keys/private.pem';
        const publicPath = './keys/public.pub.pem';

        fs.mkdirSync('./keys', { recursive: true });

        if (!fs.existsSync(privatePath) || !fs.existsSync(publicPath)) {
            this.logger.warn('No RSA keys found, generating new keys');
            const pair = generateKeyPairSync('rsa', {
                modulusLength: 4096,
                publicExponent: 0x10001,
                publicKeyEncoding: { type: 'spki', format: 'pem' },
                privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
            });

            fs.writeFileSync(privatePath, pair.privateKey);
            fs.writeFileSync(publicPath, pair.publicKey);

            this.publicKey = createPublicKey(pair.publicKey);
            this.privateKey = createPrivateKey(pair.privateKey);
        } else {
            this.logger.log('Using existing RSA keys');
            this.publicKey = createPublicKey(fs.readFileSync(publicPath, 'utf8'));
            this.privateKey = createPrivateKey(fs.readFileSync(privatePath, 'utf8'));
        }
    }

    constructor(private readonly prisma: PrismaService) {}

    async login(loginRequestDto: LoginRequestDto) {
        const account = await this.prisma.account.findUnique({ where: { name: loginRequestDto.username } });
        if (!account || !bycrypt.compareSync(loginRequestDto.password, account.password)) {
            throw new UnauthorizedException('Invalid credentials');
        }

        if (account.deactivated) {
            throw new UnauthorizedException('Account deactivated');
        }

        // validate 2fa
        if (account.secondFactor && typeof loginRequestDto.secondFactor !== 'string') {
            throw new UnauthorizedException('2FA required');
        } else if (account.secondFactor) {
            const verified = speakeasy.totp.verify({
                secret: account.secondFactor,
                encoding: 'ascii',
                token: loginRequestDto.secondFactor!,
            });

            if (!verified) {
                throw new UnauthorizedException('Invalid credentials');
            }
        }

        // create session and return token
        const sessionId = Utils.generateToken(64);

        const created = dayjs().unix();
        const expire = created + 60 * 60 * 24 * +(process.env.SESSION_EXPIRATION_OFFSET ?? 5);
        await this.prisma.session.create({
            data: {
                id: sessionId,

                created,
                expire,
                subject: account.id,
            },
        });
        return sessionId;
    }

    async logout(account: AccountWithPermissions, sessionId: string) {
        const session = await this.prisma.session.delete({ where: { id: sessionId } });
        if (!session) throw new UnauthorizedException('Invalid session');
        // TODO handle automatically remove expired session from db after a certain time
    }

    async getInitData(
        sessionId: string,
        account?: AccountWithPermissions,
    ): Promise<{
        account: Partial<AccountWithPermissions>;
        session: Session;
        accounts: Partial<AccountWithPermissions>[];
        assets: Asset[];
        assetTypes: AssetType[];
        apps: App[];
        containers: Container[];
        mirrors: Mirror[];
    }> {
        const session = await this.prisma.session.findUnique({ where: { id: sessionId } });
        if (!account || !session) throw new UnauthorizedException('Not authenticated');

        // update expire new threshold
        await this.prisma.session.update({
            where: { id: sessionId },
            data: {
                expire: dayjs().unix() + 60 * 60 * 24 * +(process.env.SESSION_EXPIRATION_OFFSET ?? 5),
            },
        });

        if (account.permissions.some(p => p.identifier == Utils.convertPermissionNameToIdent(SigAuthRootPermissions.ROOT))) {
            const [accounts, assets, assetTypes, apps, containers, mirrors] = await Promise.all([
                this.prisma.account.findMany({
                    select: { id: true, name: true, email: true, api: true, accounts: true, permissions: true, deactivated: true },
                }),
                this.prisma.asset.findMany(),
                this.prisma.assetType.findMany(),
                this.prisma.app.findMany(),
                this.prisma.container.findMany(),
                this.prisma.mirror.findMany(),
            ]);

            return { account, session, accounts, assets, assetTypes, apps, containers, mirrors };
        } else {
            const accounts = await this.prisma.account.findMany({
                where: { id: { in: account.accounts as number[] } },
                select: { id: true, name: true, email: true, api: true, accounts: true, permissions: true },
            });

            const apps = await this.prisma.app.findMany({
                where: { id: { in: account.permissions.map(p => p.appId) } },
            });

            const containers = await this.prisma.container.findMany({
                where: { id: { in: account.permissions.map(p => p.containerId).filter(id => id !== null) } },
            });

            const assetIds = containers.map(c => c.assets).flat();
            const assets = await this.prisma.asset.findMany({
                where: { id: { in: assetIds } },
            });

            const assetTypeIds = assets.map(a => a.typeId);
            const assetTypes = await this.prisma.assetType.findMany({
                where: { id: { in: assetTypeIds } },
            });

            return { account, session, accounts, assets, assetTypes, apps, containers, mirrors: [] };
        }
    }

    async authenticateOIDC(data: OIDCAuthenticateDto, sessionId: string) {
        const session = await this.prisma.session.findFirst({ where: { id: sessionId }, include: { account: true } });
        if (!session) throw new NotFoundException("Couldn't resolve session");

        const app = await this.prisma.app.findUnique({ where: { id: +data.appId } });
        if (!app) throw new NotFoundException("Couldn't resolve app");

        const authorizationCode = Utils.generateToken(64);
        const challenge = await this.prisma.authorizationChallenge.create({
            data: {
                appId: +data.appId,
                sessionId,
                authorizationCode,
                redirectUri: data.redirectUri,
            },
        });

        return `${app.oidcAuthCodeUrl}?code=${challenge.authorizationCode}&expires=${challenge.created.getTime() + 1000 * 60 * +(process.env.AUTHORIZATION_CHALLENGE_EXPIRATION_OFFSET ?? 5)}&redirectUri=${data.redirectUri}`;
    }

    async exchangeOIDCToken(code: string, appToken: string, redirectUri: string) {
        const authChallenge = await this.prisma.authorizationChallenge.findUnique({
            where: { authorizationCode: code, redirectUri },
            include: { session: { include: { account: true } } },
        });
        if (!authChallenge) throw new NotFoundException("Couldn't resolve authorization challenge");

        if (
            dayjs(authChallenge.created)
                .add(+(process.env.AUTHORIZATION_CHALLENGE_EXPIRATION_OFFSET ?? 5), 'minute')
                .isBefore(dayjs())
        ) {
            await this.prisma.authorizationChallenge.delete({ where: { id: authChallenge.id } });
            throw new UnauthorizedException('Authorization challenge expired');
        }

        if (dayjs.unix(authChallenge.session.expire).isBefore(dayjs())) {
            await this.prisma.authorizationChallenge.deleteMany({ where: { sessionId: authChallenge.sessionId } });
            await this.prisma.authorizationInstance.deleteMany({ where: { sessionId: authChallenge.sessionId } });
            await this.prisma.session.delete({ where: { id: authChallenge.sessionId } });
            throw new UnauthorizedException('Session expired');
        }

        const app = await this.prisma.app.findUnique({ where: { id: authChallenge.appId } });
        if (!app || app.token !== appToken) throw new UnauthorizedException("Couldn't resolve app or invalid app token");

        const payload = {
            name: authChallenge.session.account.name,
            email: authChallenge.session.account.email,
            // more claims to come
        };

        const accessToken = await new SignJWT(payload)
            .setProtectedHeader({ alg: 'RS256', kid: 'sigauth' })
            .setIssuedAt()
            .setSubject(String(authChallenge.session.account.id))
            .setIssuer(process.env.FRONTEND_URL || 'No issuer provided in env')
            .setAudience(app.name)
            .setExpirationTime(
                dayjs()
                    .add(+(process.env.OIDC_ACCESS_TOKEN_EXPIRATION_OFFSET ?? 10), 'minute')
                    .toDate(),
            )
            .sign(this.privateKey!);

        const instance = await this.prisma.authorizationInstance.create({
            data: {
                sessionId: authChallenge.sessionId,
                appId: authChallenge.appId,
                refreshToken: Utils.generateToken(64),
                refreshTokenExpire: dayjs().unix() + 60 * 60 * 24 * +(process.env.OIDC_REFRESH_TOKEN_EXPIRATION_OFFSET ?? 30),
            },
        });

        await this.prisma.authorizationChallenge.delete({ where: { id: authChallenge.id } });
        return {
            accessToken,
            refreshToken: instance.refreshToken,
        };
    }

    async refreshOIDCToken(refreshToken: string, appToken: string) {
        const instance = await this.prisma.authorizationInstance.findUnique({
            where: { refreshToken },
            include: { session: { include: { account: true } } },
        });
        if (!instance) throw new NotFoundException("Couldn't resolve authorization instance");

        if (dayjs.unix(instance.refreshTokenExpire).isBefore(dayjs())) {
            await this.prisma.authorizationInstance.deleteMany({ where: { sessionId: instance.sessionId } });
            throw new UnauthorizedException('Refresh token expired');
        }

        if (dayjs.unix(instance.session.expire).isBefore(dayjs())) {
            await this.prisma.authorizationInstance.deleteMany({ where: { sessionId: instance.sessionId } });
            await this.prisma.session.delete({ where: { id: instance.sessionId } });
            throw new UnauthorizedException('Session expired');
        }

        const app = await this.prisma.app.findUnique({ where: { id: instance.appId } });
        if (!app || app.token !== appToken) throw new UnauthorizedException("Couldn't resolve app or invalid app token");

        const payload = {
            name: instance.session.account.name,
            email: instance.session.account.email,
            // more claims to come
        };

        const accessToken = await new SignJWT(payload)
            .setProtectedHeader({ alg: 'RS256', kid: 'sigauth' })
            .setIssuedAt()
            .setSubject(String(instance.session.account.id))
            .setIssuer(process.env.FRONTEND_URL || 'No issuer provided in env')
            .setAudience(app.name)
            .setExpirationTime(
                dayjs()
                    .add(+(process.env.OIDC_ACCESS_TOKEN_EXPIRATION_OFFSET ?? 10), 'minute')
                    .toDate(),
            )
            .sign(this.privateKey!);

        return {
            accessToken,
            refreshToken: instance.refreshToken,
        };
    }

    async hasPermission(dto: HasPermissionDto) {
        const parts = dto.permission.split(':');
        if (parts.length != 4) {
            throw new BadRequestException('Invalid permission format');
        }
        const ident = parts[0] === '' ? null : parts[0];
        const assetId = parts[1] === '' ? null : +parts[1];
        const appId = parts[2] === '' ? null : +parts[2];
        const containerId = parts[3] === '' ? null : +parts[3];

        if (!ident || !appId || (!containerId && assetId)) {
            throw new BadRequestException('Invalid permission format');
        }

        const app = await this.prisma.app.findUnique({ where: { id: +dto.appId } });
        if (!app || app.token !== dto.appToken) {
            throw new NotFoundException("Couldn't resolve app");
        }

        if (appId != app.id) {
            throw new ForbiddenException('Forbidden cross-app permission check');
        }

        const decoded = await jwtVerify(dto.accessToken, this.publicKey!, {
            audience: app.name,
            issuer: process.env.FRONTEND_URL || 'No issuer provided in env',
        });

        if (!decoded || decoded.payload.exp! < Date.now() / 1000) throw new UnauthorizedException('Invalid access token');
        const tokenAccountId = +decoded.payload.sub!;

        const permInstance = await this.prisma.permissionInstance.findFirst({
            where: {
                identifier: ident,
                appId: appId,
                assetId: assetId,
                containerId: containerId,
                accountId: tokenAccountId,
            },
        });

        if (permInstance) {
            return 'OK';
        } else {
            throw new ForbiddenException('Forbidden');
        }
    }

    public async getUserInfo(accessToken: string, appToken: string): Promise<UserInfo> {
        const app = await this.prisma.app.findFirst({ where: { token: appToken } });
        if (!app || app.token !== appToken) {
            throw new NotFoundException("Couldn't resolve app");
        }

        const decoded = await jwtVerify(accessToken, this.publicKey!, {
            audience: app.name,
            issuer: process.env.FRONTEND_URL || 'No issuer provided in env',
        });

        if (!decoded || decoded.payload.exp! < Date.now() / 1000) throw new UnauthorizedException('Invalid access token');
        const tokenAccountId = +decoded.payload.sub!;

        const permissions = await this.prisma.permissionInstance.findMany({
            where: {
                OR: [
                    { accountId: tokenAccountId, appId: app.id },
                    { accountId: tokenAccountId, appId: PROTECTED.App.id },
                ],
            },
        });

        const containers = permissions.filter(p => p.containerId !== null && p.assetId === null);
        const assets = permissions.filter(p => p.assetId !== null);
        const root = permissions.filter(p => p.containerId === null && p.assetId === null).map(p => p.identifier);

        return {
            containers,
            assets,
            root,
        };
    }
}
