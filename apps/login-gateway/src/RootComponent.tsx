import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { request } from '@/lib/utils';
import { LoginPage } from '@/pages/LoginPage';
import { useEffect } from 'react';
import { Toaster, toast } from 'sonner';

export type AuthenticationParams = {
    client_id: string;
    response_type: string;
    scope: string;
    redirect_uri: string;
    state: string;

    nonce?: string;
    code_challenge?: string;
    code_challenge_method?: string;
    prompt?: string; // none, login, consent, select_account
    display?: string; // page, popup, touch, wap (not implemented, just for future use)
};

const SignInPage = () => {
    const queryParams = new URLSearchParams(window.location.search);

    const authParams: AuthenticationParams = {
        client_id: queryParams.get('client_id') ?? '',
        response_type: queryParams.get('response_type') ?? '',
        scope: queryParams.get('scope') ?? '',
        redirect_uri: queryParams.get('redirect_uri') ?? '',
        state: queryParams.get('state') ?? '',
        nonce: queryParams.get('nonce') ?? undefined,
        code_challenge: queryParams.get('code_challenge') ?? undefined,
        code_challenge_method: queryParams.get('code_challenge_method') ?? undefined,
        prompt: queryParams.get('prompt') ?? undefined,
        display: queryParams.get('display') ?? undefined,
    };

    const { state, client_id, response_type, scope, redirect_uri, nonce, code_challenge, code_challenge_method, prompt } = authParams;
    const prompts = (prompt ?? '').trim().split(/\s+/).filter(Boolean);

    if (!state || !client_id || !response_type || !scope || !redirect_uri) {
        return <main>Request parameters are missing or invalid.</main>;
    }

    if (response_type !== 'code') return <main>Unsupported response type. Only 'code' is supported.</main>;
    if (prompts.includes('none') && prompts.length > 1) {
        return <main>Invalid prompt parameter. 'none' cannot be used with other prompts.</main>;
    }

    const obtainAuthorizationCode = async () => {
        const apiSearchParams = new URLSearchParams({
            client_id,
            response_type,
            scope,
            redirect_uri,
            state,
        });

        if (nonce) apiSearchParams.set('nonce', nonce);
        if (code_challenge) apiSearchParams.set('code_challenge', code_challenge);
        if (code_challenge_method) apiSearchParams.set('code_challenge_method', code_challenge_method);

        const res = await request('GET', `/api/auth/oidc/authenticate?${apiSearchParams.toString()}`);

        const data = await res.json();
        return data.authorizationCode;
    };

    const buildRedirectUrl = (params: Record<string, string>) => {
        const target = new URL(redirect_uri);

        Object.entries(params).forEach(([key, value]) => {
            target.searchParams.set(key, value);
        });

        return target.toString();
    };

    useEffect(() => {
        if (!prompts.includes('none')) return;

        const runSilentAuth = async () => {
            try {
                const authCode = await obtainAuthorizationCode();

                if (authCode) {
                    toast.info('Welcome back! Redirecting...');
                    window.location.href = buildRedirectUrl({ code: authCode, state });
                    return;
                }

                window.location.href = buildRedirectUrl({ error: 'login_required', state });
            } catch {
                window.location.href = buildRedirectUrl({ error: 'server_error', state });
            }
        };

        void runSilentAuth();
    }, [prompts, state]);

    if (prompts.includes('none')) {
        return (
            <main>
                <Toaster position="bottom-right" />
                <div className="flex items-center justify-center min-h-screen bg-muted">
                    <Card className="w-full max-w-sm">
                        <CardHeader>
                            <CardTitle>Checking authentication...</CardTitle>
                            <CardDescription>Please wait while we check your authentication status.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-center">
                                <svg
                                    className="animate-spin h-8 w-8 text-primary"
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                >
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                    ></path>
                                </svg>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </main>
        );
    }

    return <LoginPage authParams={authParams} obtainAuthorizationCode={obtainAuthorizationCode} buildRedirectUrl={buildRedirectUrl} />;
};

export default SignInPage;

