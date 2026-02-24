import { AccountPayload } from '@sigauth/sdk/authentication';
import { SigAuthConfig } from '@sigauth/sdk/config';
import { decodeJwt, importJWK, JWTPayload, jwtVerify } from '@sigauth/sdk/jose';
import { sigauthRequest } from '@sigauth/sdk/utils';

export interface MinimalRequest {
    headers: Record<string, string | string[] | undefined>;
}

export class SigAuthVerifier {
    private user: AccountPayload | null = null;

    private decodedIdToken: JWTPayload | null = null;
    private idToken: string | null = null;
    public refreshToken: string | null = null;
    private accessToken: string | null = null;
    private accessExpires: number | null = null;

    constructor(private readonly config: SigAuthConfig) {}

    private parseCookies(cookieHeader?: string | null): Record<string, string> {
        const out: Record<string, string> = {};
        if (!cookieHeader) return out;
        const parts = cookieHeader.split(/;\s*/);
        for (const part of parts) {
            const idx = part.indexOf('=');
            if (idx === -1) continue;
            const k = decodeURIComponent(part.slice(0, idx).trim());
            const v = decodeURIComponent(part.slice(idx + 1));
            out[k] = v;
        }
        return out;
    }

    private async initTokens(req: MinimalRequest, ignoreExpiration?: boolean): Promise<{ ok: boolean; status?: number; error?: string }> {
        if (!this.decodedIdToken) {
            const raw = req.headers.cookie;
            const cookieString = Array.isArray(raw) ? raw.join('; ') : raw;
            const cookies = this.parseCookies(cookieString);
            const accessToken = cookies['accessToken'] ?? null;
            const refreshToken = cookies['refreshToken'] ?? null;
            const idToken = cookies['idToken'] ?? null;

            if (!accessToken) {
                this.accessToken = null;
                this.refreshToken = null;
                this.idToken = null;
                this.accessExpires = null;
                this.decodedIdToken = null;
                return { ok: false, status: 401, error: 'Missing access token' };
            }

            try {
                const publicKey = await this.getPublicKey();
                const { payload } = await jwtVerify(idToken, publicKey, {
                    audience: this.config.appId,
                    issuer: this.config.issuer,
                });

                if (!ignoreExpiration && payload.exp) {
                    const timeLeft = (payload.exp as number) - Date.now() / 1000;
                    if (timeLeft < (this.config.refreshThresholdSeconds ?? 60))
                        return { ok: false, status: 409, error: 'refresh_required' };
                }
                this.refreshToken = refreshToken;
                this.accessExpires = payload.exp as number;
                this.accessToken = accessToken;
                this.idToken = idToken;
                this.decodedIdToken = payload;
            } catch (e) {
                let decoded: JWTPayload = {};
                if (typeof idToken === 'string') {
                    decoded = decodeJwt(idToken);
                    if (decoded) {
                        // verify without exp
                        if (!ignoreExpiration && decoded.exp && Date.now() / 1000 > (decoded.exp as number)) {
                            console.log('Access token expired, refresh required', +decoded.exp - Date.now() / 1000);
                            return { ok: false, status: 409, error: 'refresh_required' };
                        }

                        if (ignoreExpiration) {
                            try {
                                const publicKey = await this.getPublicKey();
                                const { payload } = await jwtVerify(idToken, publicKey, {
                                    audience: this.config.appId,
                                    issuer: this.config.issuer,
                                    currentDate: new Date(((decoded.exp as number) - 1) * 1000),
                                });

                                this.refreshToken = refreshToken;
                                this.accessExpires = payload.exp as number;
                                this.accessToken = accessToken;
                                this.idToken = idToken;
                                this.decodedIdToken = payload;

                                return { ok: true };
                            } catch (fallbackError) {
                                console.error('Failed to verify id token while ignoring exp:', fallbackError, decoded);
                            }
                        }
                    }
                }
                console.error('Failed to verify id token:', e, decoded);
                return { ok: false, status: 401, error: 'Invalid id token' };
            }
        }
        return { ok: true };
    }

    public async refreshOnDemand(
        req: MinimalRequest,
    ): Promise<{ refreshed: boolean; failed?: boolean; accessToken?: string; refreshToken?: string; idToken?: string }> {
        if (!(await this.initTokens(req, true)).ok) return { refreshed: false, failed: true };
        if (!this.idToken || !this.refreshToken) return { refreshed: false, failed: false };
        if (this.accessExpires! - Date.now() / 1000 > (this.config.refreshThresholdSeconds ?? 60))
            return { refreshed: false, failed: false }; // skip if not close to expiring

        // refresh
        const res = await sigauthRequest('GET', '/api/auth/oidc/refresh?refresh_token=' + encodeURIComponent(this.refreshToken), {
            internalAuthorization: false,
            config: this.config,
        });
        const data = await res.json();
        this.decodedIdToken = null;

        if (!res.ok) {
            console.error('Failed to refresh tokens:', data);
            await this.initTokens({ headers: { cookie: `accessToken=; refreshToken=; idToken=` } }); // TODO which sideeffect does this have (why are we doing this)? should we just clear the cookies in the response instead?
            return { refreshed: false, failed: true };
        } else {
            await this.initTokens({
                headers: { cookie: `accessToken=${data.accessToken}; refreshToken=${data.refreshToken}; idToken=${data.idToken}` },
            }); // validate new tokens
            return { refreshed: true, ...data };
        }
    }

    private async getPublicKey(): Promise<CryptoKey | Uint8Array<ArrayBufferLike>> {
        const jwksFetch = await sigauthRequest('GET', '/.well-known/jwks.json', { config: this.config });
        const jwksObj = await jwksFetch.json();
        const jwk = jwksObj.keys.find((k: any) => k.kid === 'sigauth');
        if (!jwk) {
            throw new Error('Failed to find JWK for access token');
        }
        return await importJWK(jwk, 'RS256');
    }

    private loginURL(prompt: string): string {
        return `${this.config.issuer}/?response_type=code&client_id=${this.config.appId}&scope=openid offline_access&redirect_uri=${encodeURIComponent(this.config.redirectUri)}&state=/&prompt=${prompt}`;
    }

    async resolveAuthError(error: string, state: string): Promise<{ error: string; status: number; redirect?: string }> {
        if (error === 'login_required') {
            return {
                error,
                status: 307,
                redirect: this.loginURL('login'),
            };
        } else if (error === 'login_required') {
            return {
                error,
                status: 307,
                redirect: this.loginURL('login select_account consent'),
            };
        } else {
            console.error('Authentication error:', error);
            return { error, status: 400 };
        }
    }

    async resolveAuthCode(
        code: string,
        state: string,
    ): Promise<{ ok: boolean; refreshToken: string; accessToken: string; idToken: string }> {
        const res = await sigauthRequest('GET', `/api/auth/oidc/exchange?code=${encodeURIComponent(code)}`, {
            config: this.config,
            internalAuthorization: false,
        });

        const contentType = res.headers.get('content-type') ?? '';
        if (!contentType.includes('application/json')) {
            console.error('Expected JSON from code exchange endpoint but got:', contentType);
            return { ok: false, refreshToken: '', accessToken: '', idToken: '' };
        }

        const data = await res.json();
        if (!res.ok) {
            console.error('Failed to exchange auth code:', data);
            return { ok: false, refreshToken: '', accessToken: '', idToken: '' };
        }

        return {
            ok: true,
            refreshToken: data.refreshToken,
            accessToken: data.accessToken,
            idToken: data.idToken,
        };
    }

    async validateRequest(
        req: MinimalRequest,
        state: string,
    ): Promise<{ ok: boolean; status?: number; error?: string; user?: AccountPayload; loginRedirect?: string }> {
        this.decodedIdToken = null; // reset cached token to ensure we always validate on each request (we could optimize this by caching the result of validation until the token is close to expiring, but for simplicity we will validate on each request for now)
        const initTokensResult = await this.initTokens(req);
        if (!initTokensResult.ok && initTokensResult.status === 307) {
            return initTokensResult;
        }
        if (!initTokensResult.ok && initTokensResult.status === 409 && initTokensResult.error === 'refresh_required') {
            return {
                ok: false,
                status: 409,
                error: 'refresh_required',
                loginRedirect: this.loginURL('none'),
            };
        }

        /**
         * TODO:
         *
         * - Add PKCE
         * - Add Nonce
         * - Add option to configure login flow (e.g. force login, force consent, etc.)
         * - Test all combination of prompts e.g consent without account select
         */
        if (!this.decodedIdToken) {
            return {
                ok: false,
                status: 307,
                error: this.loginURL('none'),
            };
        }

        this.user = this.decodedIdToken as AccountPayload;
        return { ok: true, user: this.user };
    }
}

