import { ORMService } from '@/internal/database/generic/orm.client';
import { StorageService } from '@/internal/database/storage.service';
import { Utils } from '@/internal/utils';
import { LoginRequestDto } from '@/modules/auth/dto/login-request.dto';
import { OIDCAuthenticateDto } from '@/modules/auth/dto/oidc-authenticate.dto';
import { BadRequestException, Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { DefinitiveAssetType } from '@sigauth/sdk/architecture';
import { Account, App, Session } from '@sigauth/sdk/fundamentals';
import { OIDC_DEFAULT_CLAIMS, OIDC_DEFAULT_SCOPES, ProtectedData, SigAuthPermissions } from '@sigauth/sdk/protected';
import bcrypt from 'bcryptjs';
import dayjs from 'dayjs';
import { JWTPayload, jwtVerify, JWTVerifyResult, SignJWT } from 'jose';
import speakeasy from 'speakeasy';

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        private readonly db: ORMService,
        private readonly storage: StorageService,
    ) {}

    async login(loginRequestDto: LoginRequestDto) {
        const account = await this.db.Account.findOne({ where: { name: loginRequestDto.username } });
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

    async logout(sessionRawArray: string, idToken: string) {
        if (!sessionRawArray) throw new BadRequestException('No session cookie found');
        const sessions = sessionRawArray.split(';');
        if (!Array.isArray(sessions)) throw new BadRequestException('Invalid session format');

        let decoded: JWTVerifyResult<JWTPayload> | null = null;
        try {
            const publicKey = await this.storage.AuthPublicKey!;
            decoded = await jwtVerify(idToken, publicKey, {
                issuer: process.env.FRONTEND_URL || 'No issuer provided in env',
            });
        } catch (e) {
            this.logger.error('Failed to verify id token during logout:', e);
            throw new UnauthorizedException('Invalid id token');
        }

        if (!decoded) throw new UnauthorizedException('Invalid id token');

        const sessionId = decoded.payload.sid;
        if (!sessionId || typeof sessionId !== 'string') {
            throw new UnauthorizedException('Invalid id token payload');
        }

        const session = await this.db.Session.deleteOne({ where: { uuid: sessionId } });
        if (!session) throw new UnauthorizedException('Invalid session');
        // TODO handle automatically remove expired session from db after a certain time

        return sessions.filter((id: string) => id !== sessionId);
    }

    async getSessions(sessionRawArray: string): Promise<{ sessions: Session[]; accounts: Account[]; invalidSessions: string[] }> {
        const sessionsIds = sessionRawArray.split(';');
        if (!Array.isArray(sessionsIds)) throw new BadRequestException('Invalid session format');
        const sessions = await this.db.Session.findMany({ where: { uuid: { in: sessionsIds } } });
        const invalidSessions = sessionsIds.filter(id => !sessions.find(s => s.uuid === id));

        const accounts = await this.db.Account.findMany({ where: { uuid: { in: sessions.map(s => s.subjectUuid) } } });

        return { sessions, accounts, invalidSessions };
    }

    async getInitData(
        sessionId: string,
        account?: Account,
    ): Promise<{
        account: Partial<Account>;
        session: Session;
        accounts: Partial<Account>[];
        assetTypes: DefinitiveAssetType[];
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
                this.db.App.findMany({ includes: { permission_apps: true } }),
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

    async authenticateOIDC(data: OIDCAuthenticateDto, rawSessions: string) {
        if (!rawSessions) throw new BadRequestException('No session cookie found');

        const sessionId = rawSessions.includes(';') ? rawSessions.split(';')[data.account_index ?? 0] : rawSessions;
        if (!sessionId) throw new BadRequestException('No session ID found in cookie');

        const session = await this.db.Session.findOne({ where: { uuid: sessionId }, includes: { subject_ref: true } });
        if (!session) throw new NotFoundException("Couldn't resolve session");
        const app = await this.db.App.findOne({ where: { uuid: data.client_id } });
        if (!app) throw new NotFoundException("Couldn't resolve app");
        if (!app.oidcAuthCodeCb) throw new BadRequestException('App does not support OIDC authorization code flow');
        if (data.redirect_uri !== app.oidcAuthCodeCb) throw new BadRequestException('Invalid redirect URI');

        const authorizationCode = Utils.generateToken(64);
        const challenge = await this.db.AuthorizationChallenge.createOne({
            data: {
                appUuid: app.uuid,
                sessionUuid: sessionId,
                authCode: authorizationCode,
                created: new Date(),

                scope: data.scope,
                challengeMethod: data.code_challenge_method,
                challenge: data.code_challenge,
                nonce: data.nonce,
            },
        });
        return { authorizationCode: challenge.authCode };
    }

    async exchangeOIDCToken(code: string, app: App, codeVerfier: string) {
        const authChallenge = await this.db.AuthorizationChallenge.findOne({
            where: { authCode: code },
            includes: { session_ref: { subject_ref: true } },
        });
        if (!authChallenge) throw new NotFoundException("Couldn't resolve authorization challenge");
        if (authChallenge.appUuid !== app.uuid) throw new NotFoundException("Couldn't resolve app from authorization challenge");

        if (authChallenge.challengeMethod === 'S256') {
            const expectedChallenge = Utils.base64URLEncode(await Utils.sha256(codeVerfier));
            if (expectedChallenge !== authChallenge.challenge) {
                throw new UnauthorizedException('Invalid code verifier');
            }
        } else if (authChallenge.challengeMethod === 'plain') {
            if (codeVerfier !== authChallenge.challenge) {
                throw new UnauthorizedException('Invalid code verifier');
            }
        } else if (authChallenge.challengeMethod) {
            throw new BadRequestException('Unsupported code challenge method');
        }

        if (
            dayjs(authChallenge.created)
                .add(+(process.env.AUTHORIZATION_CHALLENGE_EXPIRATION_OFFSET ?? 5), 'minute')
                .isBefore(dayjs())
        ) {
            await this.db.AuthorizationChallenge.deleteOne({ where: { uuid: authChallenge.uuid } });
            throw new UnauthorizedException('Authorization challenge expired');
        }

        if (dayjs.unix(authChallenge.session_ref.expire).isBefore(dayjs())) {
            await this.db.AuthorizationChallenge.deleteMany({ where: { sessionUuid: authChallenge.sessionUuid } });
            await this.db.AuthorizationInstance.deleteMany({ where: { sessionUuid: authChallenge.sessionUuid } });
            await this.db.Session.deleteOne({ where: { uuid: authChallenge.sessionUuid } });
            throw new UnauthorizedException('Session expired');
        }

        const tokens = await this.generateTokens(
            authChallenge.sessionUuid,
            authChallenge.scope,
            app,
            authChallenge.session_ref.subject_ref,
        );

        const instance = await this.db.AuthorizationInstance.createOne({
            data: {
                scope: authChallenge.scope,
                sessionUuid: authChallenge.sessionUuid,
                appUuid: authChallenge.appUuid,
                refreshToken: tokens.refreshToken,
                expire: dayjs().unix() + 60 * 60 * 24 * +(process.env.OIDC_REFRESH_TOKEN_EXPIRATION_OFFSET ?? 30),
            },
        });

        await this.db.AuthorizationChallenge.deleteOne({ where: { uuid: authChallenge.uuid } });
        return {
            accessToken: tokens.accessToken,
            idToken: tokens.idToken,
            refreshToken: instance.refreshToken,
        };
    }

    async refreshOIDCToken(refreshToken: string, app: App) {
        const instance = await this.db.AuthorizationInstance.findOne({
            where: { refreshToken },
            includes: { session_ref: { subject_ref: true }, app_ref: true },
        });
        if (!instance) throw new NotFoundException("Couldn't resolve authorization instance");

        if (dayjs.unix(instance.expire).isBefore(dayjs())) {
            await this.db.AuthorizationInstance.deleteMany({ where: { sessionUuid: instance.sessionUuid } });
            throw new UnauthorizedException('Refresh token expired');
        }

        if (dayjs.unix(instance.session_ref.expire).isBefore(dayjs())) {
            await this.db.AuthorizationInstance.deleteMany({ where: { sessionUuid: instance.sessionUuid } });
            await this.db.Session.deleteOne({ where: { uuid: instance.sessionUuid } });
            throw new UnauthorizedException('Session expired');
        }

        const tokens = await this.generateTokens(instance.sessionUuid, instance.scope, app, instance.session_ref.subject_ref);

        await this.db.AuthorizationInstance.updateOne({
            where: { uuid: instance.uuid },
            data: {
                refreshToken: tokens.refreshToken!,
                expire: dayjs().unix() + 60 * 60 * 24 * +(process.env.OIDC_REFRESH_TOKEN_EXPIRATION_OFFSET ?? 30),
            },
        });

        return {
            accessToken: tokens.accessToken,
            idToken: tokens.idToken,
            refreshToken: tokens.refreshToken,
        };
    }

    private async generateTokens(sessionUuid: string, scope: string, app: App, account: Account) {
        let generateRefreshToken = false;
        const accessTokenPayload: Record<string, any> = { sid: sessionUuid };
        const idTokenPayload: Record<string, any> = { sid: sessionUuid };

        const scopes = scope.split(' ');
        if (scopes.includes('offline_access')) generateRefreshToken = true;

        const scopeMapping = { ...JSON.parse(app.scopes || '{}'), ...OIDC_DEFAULT_SCOPES };
        const claimMapping = { ...JSON.parse(app.claims || '{}'), ...OIDC_DEFAULT_CLAIMS };

        const resolveClaimValue = (claimValue: string) => {
            if (claimValue.startsWith('account.')) {
                const accountField = claimValue.split('.')[1];
                return (account as any)[accountField];
            }
            return claimValue;
        };

        scopes.forEach(scope => {
            const targetClaims = scopeMapping[scope] || [];
            targetClaims.forEach((claim: string) => {
                if (claimMapping[claim]) {
                    idTokenPayload[claim] = resolveClaimValue(claimMapping[claim]);
                }
            });
        });
        accessTokenPayload['scope'] = scope;

        // move this to a new method to reduce code duplication between exchange and refresh token
        const idToken = await new SignJWT(idTokenPayload)
            .setProtectedHeader({ alg: 'RS256', kid: 'sigauth' })
            .setIssuedAt()
            .setSubject(account.uuid)
            .setIssuer(process.env.FRONTEND_URL || 'No issuer provided in env')
            .setAudience(app.uuid)
            .setExpirationTime(
                dayjs()
                    .add(+(process.env.OIDC_ACCESS_TOKEN_EXPIRATION_OFFSET ?? 10), 'minute')
                    .toDate(),
            )
            .sign(this.storage.AuthPrivateKey!);

        const accessToken = await new SignJWT(accessTokenPayload)
            .setProtectedHeader({ alg: 'RS256', kid: 'sigauth' })
            .setIssuedAt()
            .setSubject(sessionUuid)
            .setIssuer(process.env.FRONTEND_URL || 'No issuer provided in env')
            .setAudience(app.uuid)
            .setExpirationTime(
                dayjs()
                    .add(+(process.env.OIDC_ACCESS_TOKEN_EXPIRATION_OFFSET ?? 10), 'minute')
                    .toDate(),
            )
            .sign(this.storage.AuthPrivateKey!);

        return { idToken, accessToken, refreshToken: generateRefreshToken ? Utils.generateToken(64) : undefined };
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

