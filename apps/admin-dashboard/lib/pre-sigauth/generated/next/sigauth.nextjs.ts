import { SigAuthSDK } from '@/lib/pre-sigauth/generated/sigauth.sdk';
import { config } from '@/sigauth.config';
import { AccountPayload } from '@sigauth/sdk/authentication';
import { decodeJwt } from '@sigauth/sdk/jose';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { NextResponse } from 'next/server';
import { createHash, randomBytes } from 'node:crypto';

export class SigAuthNextWrapper {
    private static toBase64Url(value: Buffer): string {
        return value.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
    }

    private static async getHeaderRecord(): Promise<Record<string, string | string[] | undefined>> {
        const headerList = await headers();
        const headerRecord: Record<string, string | string[] | undefined> = {};

        for (const [key, value] of headerList.entries()) {
            if (headerRecord[key]) {
                if (Array.isArray(headerRecord[key])) {
                    (headerRecord[key] as string[]).push(value);
                } else {
                    headerRecord[key] = [headerRecord[key] as string, value];
                }
            } else {
                headerRecord[key] = value;
            }
        }

        return headerRecord;
    }

    public static async checkAuthentication(
        state: string,
        options?: { refreshSessionCookies?: boolean },
    ): Promise<{ user: AccountPayload | null; refreshRequired?: boolean; loginRedirect?: string }> {
        const headerRecord = await this.getHeaderRecord();
        const outcome = await SigAuthSDK.getInstance().verifier.validateRequest({ headers: headerRecord }, state);
        if (!outcome.ok && outcome.status === 307) {
            redirect(outcome.error!);
        } else if (!outcome.ok && outcome.status === 409 && outcome.error === 'refresh_required') {
            return {
                user: null,
                refreshRequired: true,
                loginRedirect: outcome.loginRedirect,
            };
        } else if (!outcome.ok) {
            console.error('Authentication failed:', outcome.error);
            return { user: null };
        }

        if (options?.refreshSessionCookies) {
            await this.refreshSessionCookies();
        }
        return { user: outcome.user! };
    }

    public static async refreshSessionCookies(): Promise<{ refreshed: boolean; failed?: boolean }> {
        const headerRecord = await this.getHeaderRecord();

        const setCookie = async (name: string, value: string, options?: any) => {
            const cookieStore = await cookies();
            cookieStore.set(name, value, options);
        };

        const defaultOptions = {
            httpOnly: true,
            secure: SigAuthSDK.getInstance().config.secureCookies,
            sameSite: 'lax',
            path: '/',
        };

        const refresh = await SigAuthSDK.getInstance().verifier.refreshOnDemand({ headers: headerRecord });
        if (refresh.refreshed) {
            await setCookie('accessToken', refresh.accessToken!, defaultOptions);
            await setCookie('idToken', refresh.idToken!, defaultOptions);
            await setCookie('refreshToken', refresh.refreshToken!, defaultOptions);
            return { refreshed: true };
        }

        if (refresh.failed) {
            console.log('Failed to refresh tokens, clear cookies ');
            await setCookie('accessToken', '', { ...defaultOptions, maxAge: 0 });
            await setCookie('idToken', '', { ...defaultOptions, maxAge: 0 });
            await setCookie('refreshToken', '', { ...defaultOptions, maxAge: 0 });
            return { refreshed: false, failed: true };
        }

        return { refreshed: false };
    }

    public static async codeExchange(url: string): Promise<Response> {
        const { searchParams } = new URL(url);
        const code = searchParams.get('code') ?? '';
        const error = searchParams.get('error');
        const state = searchParams.get('state') ?? '';

        if (code == '') {
            const resolvedError = await SigAuthSDK.getInstance().verifier.resolveAuthError(error ?? 'unknown_error', state);
            if (resolvedError.status === 307) {
                redirect(resolvedError.redirect!);
            } else {
                console.error('Authentication error:', resolvedError.error);
                return Response.json({ error: resolvedError.error }, { status: resolvedError.status });
            }
        }

        const cookieStore = await cookies();
        const codeVerifier = cookieStore.get('oidc_code_verifier')?.value;
        const expectedNonce = cookieStore.get('oidc_nonce')?.value;

        if (!codeVerifier || !expectedNonce) {
            return Response.json({ error: 'Missing PKCE or nonce cookies' }, { status: 400 });
        }

        console.log('Resolving auth code via Wrapper', url);
        const result = await SigAuthSDK.getInstance().verifier.resolveAuthCode(code, state, codeVerifier);
        if (!result.ok) return Response.json({ error: 'Failed to resolve auth code' }, { status: 401 });

        const decodedIdToken = decodeJwt(result.idToken);
        const tokenNonce = decodedIdToken?.nonce;
        if (!tokenNonce || tokenNonce !== expectedNonce) {
            return new Response(null, {
                status: 401,
                headers: {
                    'Set-Cookie': [
                        `oidc_code_verifier=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; ${SigAuthSDK.getInstance().config.secureCookies ? 'Secure;' : ''}`,
                        `oidc_nonce=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; ${SigAuthSDK.getInstance().config.secureCookies ? 'Secure;' : ''}`,
                    ].join(', '),
                },
            });
        }

        return new Response(null, {
            status: 302,
            headers: {
                'Set-Cookie': [
                    `accessToken=${result.accessToken}; Path=/; HttpOnly; SameSite=Lax; ${SigAuthSDK.getInstance().config.secureCookies ? 'Secure;' : ''}`,
                    `refreshToken=${result.refreshToken}; Path=/; HttpOnly; SameSite=Lax; ${SigAuthSDK.getInstance().config.secureCookies ? 'Secure;' : ''}`,
                    `idToken=${result.idToken}; Path=/; HttpOnly; SameSite=Lax; ${SigAuthSDK.getInstance().config.secureCookies ? 'Secure;' : ''}`,
                    `oidc_code_verifier=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; ${SigAuthSDK.getInstance().config.secureCookies ? 'Secure;' : ''}`,
                    `oidc_nonce=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; ${SigAuthSDK.getInstance().config.secureCookies ? 'Secure;' : ''}`,
                ].join(', '),
                Location: state,
            },
        });
    }

    public static async login(url: string): Promise<Response> {
        const { searchParams } = new URL(url);
        const loginUrl = searchParams.get('login_url');
        if (!loginUrl) return NextResponse.json({ error: 'Missing login_url query parameter' }, { status: 400 });

        let redirectTarget: URL;
        try {
            redirectTarget = new URL(loginUrl);
        } catch {
            return NextResponse.json({ error: 'Invalid login_url query parameter' }, { status: 400 });
        }

        if (!['http:', 'https:'].includes(redirectTarget.protocol)) {
            return NextResponse.json({ error: 'Unsupported login_url protocol' }, { status: 400 });
        }

        const codeVerifier = this.toBase64Url(randomBytes(32));
        const nonce = this.toBase64Url(randomBytes(24));
        const codeChallenge = this.toBase64Url(createHash('sha256').update(codeVerifier).digest());

        redirectTarget.searchParams.set('code_challenge', codeChallenge);
        redirectTarget.searchParams.set('code_challenge_method', 'S256');
        redirectTarget.searchParams.set('nonce', nonce);

        const response = NextResponse.redirect(redirectTarget.toString(), 302);
        const secure = SigAuthSDK.getInstance().config.secureCookies;

        response.cookies.set('oidc_code_verifier', codeVerifier, {
            httpOnly: true,
            secure,
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 10,
        });

        response.cookies.set('oidc_nonce', nonce, {
            httpOnly: true,
            secure,
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 10,
        });

        return response;
    }

    public static async logout(postLogoutRedirectUri: string): Promise<void> {
        const cookieStore = await cookies();

        const idToken = cookieStore.get('idToken')?.value;
        if (!idToken) {
            console.error('No id token found in cookies for logout');
            return;
        }

        cookieStore.delete('accessToken');
        cookieStore.delete('refreshToken');
        cookieStore.delete('idToken');

        redirect(
            (
                config.issuer +
                `/api/auth/oidc/logout?id_token_hint=${encodeURIComponent(idToken)}&post_logout_redirect_uri=${encodeURIComponent(postLogoutRedirectUri)}`
            ).replaceAll('//', '/'),
        );
    }
}

