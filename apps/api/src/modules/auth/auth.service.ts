import { Account, App, Session } from '@/internal/database/generic/orm-client/types.client';
import { ORMService } from '@/internal/database/orm.client';
import { StorageService } from '@/internal/database/storage.service';
import { Utils } from '@/internal/utils';
import { LoginRequestDto } from '@/modules/auth/dto/login-request.dto';
import { OIDCAuthenticateDto } from '@/modules/auth/dto/oidc-authenticate.dto';
import { BadRequestException, Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { AssetType } from '@sigauth/sdk/asset';
import { ProtectedData, SigAuthPermissions } from '@sigauth/sdk/protected';
import bcrypt from 'bcryptjs';
import dayjs from 'dayjs';
import { SignJWT } from 'jose';
import speakeasy from 'speakeasy';

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        private readonly db: ORMService,
        private readonly storage: StorageService,
    ) {}

    async login(loginRequestDto: LoginRequestDto) {
        const account = await this.db.Account.findOne({ where: { username: loginRequestDto.username } });
        if (!account || !bcrypt.compareSync(loginRequestDto.password, account.passwordHash)) {
            throw new UnauthorizedException('Invalid credentials');
        }

        if (account.deactivated) {
            throw new UnauthorizedException('Your account has been deactivated. Please contact your administrator for assistance.');
        }

        // validate 2fa
        if (account.twoFactorCode && typeof loginRequestDto.twoFactorCode !== 'string') {
            throw new UnauthorizedException('2FA required');
        } else if (account.twoFactorCode) {
            const verified = speakeasy.totp.verify({
                secret: account.twoFactorCode,
                encoding: 'ascii',
                token: loginRequestDto.twoFactorCode!,
            });

            if (!verified) {
                throw new UnauthorizedException('Invalid credentials');
            }
        }

        // create session and return token
        const created = dayjs().unix();
        const expire = created + 60 * 60 * 24 * +(process.env.SESSION_EXPIRATION_OFFSET ?? 5);
        const session = await this.db.Session.createOne({
            data: {
                created,
                expire,
                subjectUuid: account.uuid,
            },
        });
        return session.uuid;
    }

    async logout(account: Account, sessionId: string) {
        const session = await this.db.Session.deleteOne({ where: { uuid: sessionId } });
        if (!session) throw new UnauthorizedException('Invalid session');
        // TODO handle automatically remove expired session from db after a certain time
    }

    async getInitData(
        sessionId: string,
        account?: Account,
    ): Promise<{
        account: Partial<Account>;
        session: Session;
        accounts: Partial<Account>[];
        assetTypes: AssetType[];
        apps: App[];
        protected: ProtectedData;
    }> {
        const session = await this.db.Session.findOne({ where: { uuid: sessionId } });
        if (!account || !session) throw new UnauthorizedException('Not authenticated');

        // update expire new threshold
        await this.db.Session.updateOne({
            where: { uuid: sessionId },
            data: {
                expire: dayjs().unix() + 60 * 60 * 24 * +(process.env.SESSION_EXPIRATION_OFFSET ?? 5),
            },
        });

        const isRoot = await this.db.Grant.findOne({
            where: { accountUuid: account.uuid, appUuid: this.storage.SigAuthAppUuid!, permission: SigAuthPermissions.ROOT },
        });

        if (isRoot) {
            const [accounts, assetTypes, apps] = await Promise.all([
                this.db.Account.findMany({}),
                this.db.DBClient.getAssetTypes(),
                this.db.App.findMany({ includes: { app_permissions: true } }),
            ]);

            accounts.map(a => {
                delete (a as any)['passwordHash'];
                delete (a as any)['twoFactorCode'];
            });

            return { account, session, accounts, assetTypes, apps, protected: this.storage.getProtectedData() };
        } else {
            // const accounts = await this.db.Account.findMany({
            //     where: { id: { in: account.accounts as number[] } },
            //     select: { id: true, name: true, email: true, api: true, accounts: true, permissions: true },
            // });

            // const apps = await this.prisma.app.findMany({
            //     where: { id: { in: account.permissions.map(p => p.appId) } },
            // });

            // const assetIds = account.permissions
            //     .map(p => p.assetId)
            //     .filter((value, index, self) => value !== null && self.indexOf(value) === index) as number[];
            // const assets = await this.prisma.asset.findMany({
            //     where: { id: { in: assetIds } },
            // });

            // const assetTypeIds = assets.map(a => a.typeId);
            // const assetTypes = await this.prisma.assetType.findMany({
            //     where: { id: { in: assetTypeIds } },
            // });

            return { account, session, accounts: [], assetTypes: [], apps: [], protected: this.storage.getProtectedData() };
        }
    }

    async authenticateOIDC(data: OIDCAuthenticateDto, sessionId: string) {
        const session = await this.db.Session.findOne({ where: { uuid: sessionId }, include: { account: true } });
        if (!session) throw new NotFoundException("Couldn't resolve session");

        const app = await this.db.App.findOne({ where: { uuid: data.appUuid } });
        if (!app) throw new NotFoundException("Couldn't resolve app");
        if (!app.oidcAuthCodeCb) throw new BadRequestException('App does not support OIDC authorization code flow');

        const authorizationCode = Utils.generateToken(64);
        const challenge = await this.db.AuthorizationChallenge.createOne({
            data: {
                appUuid: data.appUuid,
                sessionUuid: sessionId,
                authCode: authorizationCode,
                redirectUri: data.redirectUri,
                created: new Date(),
                challenge: '', // TODO PKCE
            },
        });

        return `${app.oidcAuthCodeCb}?code=${challenge.authCode}&expires=${challenge.created.getTime() + 1000 * 60 * +(process.env.AUTHORIZATION_CHALLENGE_EXPIRATION_OFFSET ?? 5)}&redirectUri=${data.redirectUri}`;
    }

    async exchangeOIDCToken(code: string, app: App, redirectUri: string) {
        const authChallenge = await this.db.AuthorizationChallenge.findOne({
            where: { authorizationCode: code, redirectUri },
            includes: { session_reference: { subject_account: true } },
        });
        if (!authChallenge) throw new NotFoundException("Couldn't resolve authorization challenge");

        if (
            dayjs(authChallenge.created)
                .add(+(process.env.AUTHORIZATION_CHALLENGE_EXPIRATION_OFFSET ?? 5), 'minute')
                .isBefore(dayjs())
        ) {
            await this.db.AuthorizationChallenge.deleteOne({ where: { uuid: authChallenge.uuid } });
            throw new UnauthorizedException('Authorization challenge expired');
        }

        if (dayjs.unix(authChallenge.session_reference.expire).isBefore(dayjs())) {
            await this.db.AuthorizationChallenge.deleteMany({ where: { sessionUuid: authChallenge.sessionUuid } });
            await this.db.AuthorizationInstance.deleteMany({ where: { sessionUuid: authChallenge.sessionUuid } });
            await this.db.Session.deleteOne({ where: { uuid: authChallenge.sessionUuid } });
            throw new UnauthorizedException('Session expired');
        }

        const payload = {
            name: authChallenge.session_reference.subject_account.username,
            email: authChallenge.session_reference.subject_account.email,
            // more claims to come
        };

        const accessToken = await new SignJWT(payload)
            .setProtectedHeader({ alg: 'RS256', kid: 'sigauth' })
            .setIssuedAt()
            .setSubject(String(authChallenge.session_reference.subject_account.uuid))
            .setIssuer(process.env.FRONTEND_URL || 'No issuer provided in env')
            .setAudience(app.name)
            .setExpirationTime(
                dayjs()
                    .add(+(process.env.OIDC_ACCESS_TOKEN_EXPIRATION_OFFSET ?? 10), 'minute')
                    .toDate(),
            )
            .sign(this.storage.AuthPrivateKey!);

        const instance = await this.db.AuthorizationInstance.createOne({
            data: {
                sessionUuid: authChallenge.sessionUuid,
                appUuid: authChallenge.appUuid,
                refreshToken: Utils.generateToken(64),
                refreshTokenExpire: dayjs().unix() + 60 * 60 * 24 * +(process.env.OIDC_REFRESH_TOKEN_EXPIRATION_OFFSET ?? 30),
            },
        });

        await this.db.AuthorizationChallenge.deleteOne({ where: { uuid: authChallenge.uuid } });
        return {
            accessToken,
            refreshToken: instance.refreshToken,
        };
    }

    async refreshOIDCToken(refreshToken: string, app: App) {
        const instance = await this.db.AuthorizationInstance.findOne({
            where: { refreshToken },
            includes: { session_reference: { subject_account: true } },
        });
        if (!instance) throw new NotFoundException("Couldn't resolve authorization instance");

        if (dayjs.unix(instance.refreshTokenExpire).isBefore(dayjs())) {
            await this.db.AuthorizationInstance.deleteMany({ where: { sessionUuid: instance.sessionUuid } });
            throw new UnauthorizedException('Refresh token expired');
        }

        if (dayjs.unix(instance.session_reference.expire).isBefore(dayjs())) {
            await this.db.AuthorizationInstance.deleteMany({ where: { sessionUuid: instance.sessionUuid } });
            await this.db.Session.deleteOne({ where: { uuid: instance.sessionUuid } });
            throw new UnauthorizedException('Session expired');
        }

        const payload = {
            name: instance.session_reference.subject_account.username,
            email: instance.session_reference.subject_account.email,
            // more claims to come
        };

        const accessToken = await new SignJWT(payload)
            .setProtectedHeader({ alg: 'RS256', kid: 'sigauth' })
            .setIssuedAt()
            .setSubject(String(instance.session_reference.subject_account.uuid))
            .setIssuer(process.env.FRONTEND_URL || 'No issuer provided in env')
            .setAudience(app.name)
            .setExpirationTime(
                dayjs()
                    .add(+(process.env.OIDC_ACCESS_TOKEN_EXPIRATION_OFFSET ?? 10), 'minute')
                    .toDate(),
            )
            .sign(this.storage.AuthPrivateKey!);

        return {
            accessToken,
            refreshToken: instance.refreshToken,
        };
    }

    // async hasPermission(dto: HasPermissionDto) {
    //     const parts = dto.permission.split(':');
    //     if (parts.length != 4) {
    //         throw new BadRequestException('Invalid permission format');
    //     }
    //     const ident = parts[0] === '' ? null : parts[0];
    //     const assetId = parts[1] === '' ? null : +parts[1];
    //     const appId = parts[2] === '' ? null : +parts[2];

    //     if (!ident || !appId) {
    //         throw new BadRequestException('Invalid permission format');
    //     }

    //     const app = await this.prisma.app.findUnique({ where: { id: +dto.appId } });
    //     if (!app || app.token !== dto.appToken) {
    //         throw new NotFoundException("Couldn't resolve app");
    //     }

    //     if (appId != app.id) {
    //         throw new ForbiddenException('Forbidden cross-app permission check');
    //     }

    //     const decoded = await jwtVerify(dto.accessToken, this.publicKey!, {
    //         audience: app.name,
    //         issuer: process.env.FRONTEND_URL || 'No issuer provided in env',
    //     });

    //     if (!decoded || decoded.payload.exp! < Date.now() / 1000) throw new UnauthorizedException('Invalid access token');
    //     const tokenAccountId = +decoded.payload.sub!;

    //     const permInstance = await this.prisma.permissionInstance.findFirst({
    //         where: {
    //             identifier: ident,
    //             appId: appId,
    //             assetId: assetId,
    //             accountId: tokenAccountId,
    //         },
    //     });

    //     if (permInstance) {
    //         return 'OK';
    //     } else {
    //         throw new ForbiddenException('Forbidden');
    //     }
    // }

    // public async getUserInfo(accessToken: string, app: App): Promise<UserInfo> {
    //     const decoded = await jwtVerify(accessToken, this.storage.AuthPublicKey!, {
    //         audience: app.name,
    //         issuer: process.env.FRONTEND_URL || 'No issuer provided in env',
    //     });

    //     if (!decoded || decoded.payload.exp! < Date.now() / 1000) throw new UnauthorizedException('Invalid access token');
    //     const tokenAccountId = decoded.payload.sub!;

    //     const explicitPermissions = await this.db.Grant.findMany({
    //         where: {
    //             OR: [
    //                 { accountUuid: tokenAccountId, appUuid: app.uuid },
    //                 { accountUuid: tokenAccountId, appUuid: this.storage.SigAuthAppUuid! },
    //             ],
    //         },
    //     });

    //     return {
    //         permissions: explicitPermissions,
    //     };
    // }
}

