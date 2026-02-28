import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ConsentManager } from '@/lib/consent.management';
import { buildRedirectUrl, request } from '@/lib/utils';
import type { AuthenticationParams } from '@/RootComponent';
import type { Account } from '@sigauth/sdk/fundamentals';
import { useEffect } from 'react';
import { toast, Toaster } from 'sonner';

const executedSilentAuthRequestsInDev = new Set<string>();

export const SilentAuthPage = ({ params, account }: { params: AuthenticationParams; account: Account }) => {
    const obtainAuthorizationCode = async (scopesOverride?: string[]) => {
        const apiSearchParams = new URLSearchParams({
            client_id: params.client_id,
            response_type: params.response_type,
            scope: scopesOverride ? scopesOverride.join(' ') : params.scope,
            redirect_uri: params.redirect_uri,
            state: params.state,
        });

        if (params.nonce) apiSearchParams.set('nonce', params.nonce);
        if (params.code_challenge) apiSearchParams.set('code_challenge', params.code_challenge);
        if (params.code_challenge_method) apiSearchParams.set('code_challenge_method', params.code_challenge_method);
        const res = await request('GET', `/api/auth/oidc/authenticate?${apiSearchParams.toString()}`);

        const data = await res.json();
        if (!res.ok) {
            console.error('Failed to obtain authorization code:', data);
            return undefined;
        }
        return data.authorizationCode;
    };

    useEffect(() => {
        const requestKey = `${params.redirect_uri}|${params.state}`;
        if (import.meta.env.DEV) {
            if (executedSilentAuthRequestsInDev.has(requestKey)) {
                return;
            }
            executedSilentAuthRequestsInDev.add(requestKey);
        }

        const runSilentAuth = async () => {
            try {
                const consented = ConsentManager.obtainPersistentConsent(params.client_id, account.uuid);
                const authCode = await obtainAuthorizationCode();

                if (authCode) {
                    toast.info('Welcome back! Redirecting...');
                    window.location.href = buildRedirectUrl({ code: authCode, state: params.state }, params.redirect_uri);
                    return;
                }

                throw new Error('Silent authentication failed');
            } catch (error) {
                toast.error('Silent authentication failed. Please login manually.');
                console.error('You need to use another prompt than "none" to login.');
                window.location.href = buildRedirectUrl({ error: 'login_required', state: params.state }, params.redirect_uri);
            }
        };

        void runSilentAuth();
    }, []);

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
};

