import { AccountPayload } from '@sigauth/sdk/authentication';
import { SigAuthConfig } from '@sigauth/sdk/config';
import { decodeJwt, importJWK, JWTPayload, jwtVerify } from '@sigauth/sdk/jose';
import { sigauthRequest } from '@sigauth/sdk/utils';

export interface MinimalRequest {
    headers: Record<string, string | string[] | undefined>;
}

interface OpenIdConfiguration {
    issuer: string;
    authorization_endpoint: string;
    token_endpoint: string;
    end_session_endpoint: string;
    jwks_uri: string;
}

interface OpenIdConfigurationPaths {
    authorization_endpoint: string;
    token_endpoint: string;
    end_session_endpoint: string;
    jwks_uri: string;
}

export class SigAuthVerifier {
    private user: AccountPayload | null = null;

    private decodedIdToken: JWTPayload | null = null;
    private idToken: string | null = null;
    public refreshToken: string | null = null;
    private accessToken: string | null = null;
    private accessExpires: number | null = null;
    private openIdConfigurationPaths: OpenIdConfigurationPaths | null = null;

    constructor(private readonly config: SigAuthConfig) {}

    private normalizePath(path: string): string {
        return path.replace(/^\/{2,}/, '/');
    }

    private appendQuery(path: string, params: Record<string, string>): string {
        const url = new URL(path, this.config.issuer);
        for (const [key, value] of Object.entries(params)) {
            url.searchParams.set(key, value);
        }
        return `${this.normalizePath(url.pathname)}${url.search}`;
    }

    private endpointToPath(endpoint: string, endpointName: string): string {
        if (!endpoint) throw new Error(`Missing discovery endpoint: ${endpointName}`);

        const configUrl = new URL(this.config.issuer);
        const endpointUrl = new URL(endpoint, this.config.issuer);
        if (endpointUrl.host !== configUrl.host) {
            throw new Error(`Invalid discovery endpoint host for ${endpointName}: expected ${configUrl.host} but got ${endpointUrl.host}`);
        }

        return `${this.normalizePath(endpointUrl.pathname)}${endpointUrl.search}`;
    }

    private async requestEndpoint(method: 'POST' | 'GET', path: string, options?: { internalAuthorization?: boolean }): Promise<Response> {
        return await sigauthRequest(method, path, {
            config: this.config,
            internalAuthorization: options?.internalAuthorization ?? true,
        });
    }

    private async getOpenIdConfigurationPaths(): Promise<OpenIdConfigurationPaths> {
        if (this.openIdConfigurationPaths) return this.openIdConfigurationPaths;

        const res = await sigauthRequest('GET', '/.well-known/openid-configuration', {
            config: this.config,
            internalAuthorization: false,
        });
        const discovery = (await res.json()) as OpenIdConfiguration;

        if (!res.ok) {
            throw new Error(`Failed to load OpenID configuration: ${JSON.stringify(discovery)}`);
        }

        const configUrl = new URL(this.config.issuer);
        const discoveryIssuer = new URL(discovery.issuer, this.config.issuer);
        if (discoveryIssuer.host !== configUrl.host) {
            throw new Error(`Invalid discovery issuer host: expected ${configUrl.host} but got ${discoveryIssuer.host}`);
        }

        this.openIdConfigurationPaths = {
            authorization_endpoint: this.endpointToPath(discovery.authorization_endpoint, 'authorization_endpoint'),
            token_endpoint: this.endpointToPath(discovery.token_endpoint, 'token_endpoint'),
            end_session_endpoint: this.endpointToPath(discovery.end_session_endpoint, 'end_session_endpoint'),
            jwks_uri: this.endpointToPath(discovery.jwks_uri, 'jwks_uri'),
        };
        return this.openIdConfigurationPaths;
    }

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

        const discovery = await this.getOpenIdConfigurationPaths();
        const refreshEndpoint = this.appendQuery(discovery.token_endpoint, {
            grant_type: 'refresh_token',
            refresh_token: this.refreshToken,
        });

        // refresh
        const res = await this.requestEndpoint('GET', refreshEndpoint, { internalAuthorization: false });
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
        const discovery = await this.getOpenIdConfigurationPaths();
        const jwksFetch = await this.requestEndpoint('GET', discovery.jwks_uri, { internalAuthorization: false });
        const jwksObj = await jwksFetch.json();
        const jwk = jwksObj.keys.find((k: any) => k.kid === 'sigauth');
        if (!jwk) {
            throw new Error('Failed to find JWK for access token');
        }
        return await importJWK(jwk, 'RS256');
    }

    private async loginURL(prompt: string): Promise<string> {
        const discovery = await this.getOpenIdConfigurationPaths();
        const authorizationUrl = new URL(discovery.authorization_endpoint, this.config.issuer);
        authorizationUrl.searchParams.set('response_type', 'code');
        authorizationUrl.searchParams.set('client_id', this.config.appId);
        authorizationUrl.searchParams.set('scope', 'openid offline_access');
        authorizationUrl.searchParams.set('redirect_uri', this.config.redirectUri);
        authorizationUrl.searchParams.set('state', '/');
        authorizationUrl.searchParams.set('prompt', prompt);

        const loginGatewayUrl = authorizationUrl.toString();
        return `/api/oidc/login?login_url=${encodeURIComponent(loginGatewayUrl)}`;
    }

    async resolveAuthError(error: string, state: string): Promise<{ error: string; status: number; redirect?: string }> {
        if (error === 'login_required') {
            return {
                error,
                status: 307,
                redirect: await this.loginURL('login'),
            };
        } else if (error === 'login_required') {
            return {
                error,
                status: 307,
                redirect: await this.loginURL('login select_account consent'),
            };
        } else {
            console.error('Authentication error:', error);
            return { error, status: 400 };
        }
    }

    async resolveAuthCode(
        code: string,
        state: string,
        codeVerifier: string,
    ): Promise<{ ok: boolean; refreshToken: string; accessToken: string; idToken: string }> {
        const discovery = await this.getOpenIdConfigurationPaths();
        const tokenEndpoint = this.appendQuery(discovery.token_endpoint, {
            grant_type: 'authorization_code',
            code,
            code_verifier: codeVerifier,
        });
        const res = await this.requestEndpoint('GET', tokenEndpoint, { internalAuthorization: false });

        const contentType = res.headers.get('content-type') ?? '';
        if (!contentType.includes('application/json')) {
            const text = await res.text();
            console.log(tokenEndpoint);
            console.log(text);
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
                loginRedirect: await this.loginURL('none'),
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
                error: await this.loginURL('none'),
            };
        }

        this.user = this.decodedIdToken as AccountPayload;
        return { ok: true, user: this.user };
    }
}

