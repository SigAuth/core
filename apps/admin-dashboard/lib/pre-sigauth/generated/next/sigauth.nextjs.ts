import { SigAuthSDK } from '@/lib/pre-sigauth/generated/sigauth.sdk';
import { config } from '@/sigauth.config';
import { AccountPayload } from '@sigauth/sdk/authentication';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';

export class SigAuthNextWrapper {
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

    public static async checkAuthentication(state: string): Promise<{ user: AccountPayload | null }> {
        const headerRecord = await this.getHeaderRecord();

        const outcome = await SigAuthSDK.getInstance().verifier.validateRequest({ headers: headerRecord }, state);
        if (!outcome.ok && outcome.status === 307) {
            redirect(outcome.error!);
        } else if (!outcome.ok) {
            console.error('Authentication failed:', outcome.error);
            return { user: null };
        }

        return { user: outcome.user! };
    }

    public static async refreshSessionCookies(): Promise<void> {
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
            console.log('Refreshed tokens in cookies');
            await setCookie('accessToken', refresh.accessToken!, defaultOptions);
            await setCookie('refreshToken', refresh.refreshToken!, defaultOptions);
        }

        if (refresh.failed) {
            console.log('Failed to refresh tokens, clear cookies ');
            await setCookie('accessToken', '', { ...defaultOptions, maxAge: 0 });
            await setCookie('refreshToken', '', { ...defaultOptions, maxAge: 0 });
        }
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

        console.log('Resolving auth code via Wrapper', url);
        const result = await SigAuthSDK.getInstance().verifier.resolveAuthCode(code, state);
        if (!result.ok) return Response.json({ error: 'Failed to resolve auth code' }, { status: 401 });

        return new Response(null, {
            status: 302,
            headers: {
                'Set-Cookie': [
                    `accessToken=${result.accessToken}; Path=/; HttpOnly; SameSite=Lax; ${SigAuthSDK.getInstance().config.secureCookies ? 'Secure;' : ''}`,
                    `refreshToken=${result.refreshToken}; Path=/; HttpOnly; SameSite=Lax; ${SigAuthSDK.getInstance().config.secureCookies ? 'Secure;' : ''}`,
                    `idToken=${result.idToken}; Path=/; HttpOnly; SameSite=Lax; ${SigAuthSDK.getInstance().config.secureCookies ? 'Secure;' : ''}`,
                ].join(', '),
                Location: state,
            },
        });
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

