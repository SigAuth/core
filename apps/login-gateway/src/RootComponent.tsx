import { buildRedirectUrl, getSessions, request } from '@/lib/utils';
import { AccountSelectorPage } from '@/pages/AccountSelectorPage';
import { ConsentPage } from '@/pages/ConsentPage';
import { LoginPage } from '@/pages/LoginPage';
import { SilentAuthPage } from '@/pages/SilentAuthPage';
import type { Account, Session } from '@sigauth/sdk/fundamentals';
import { useEffect, useState } from 'react';

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
    const [loggedAccounts, setLoggedAccounts] = useState<{ sessions: Session[]; accounts: Account[] } | undefined>(undefined);
    const [selectedAccount, setSelectedAccount] = useState<string | undefined>(undefined);

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
    const prompts = (authParams.prompt ?? '').trim().split(' ').filter(Boolean);

    // validation
    if (!authParams.state || !authParams.client_id || !authParams.response_type || !authParams.scope || !authParams.redirect_uri)
        return <main>Request parameters are missing or invalid.</main>;
    if (prompts.includes('none') && prompts.length > 1)
        return <main>Invalid prompt parameter. 'none' cannot be used with other prompts.</main>;

    useEffect(() => {
        getSessions().then(data => {
            if (!data) {
                setLoggedAccounts({ sessions: [], accounts: [] });
                return;
            }

            setLoggedAccounts({
                sessions: Array.isArray(data.sessions) ? data.sessions : [],
                accounts: Array.isArray(data.accounts) ? data.accounts : [],
            });
        });
    }, []);

    const obtainAuthorizationCode = async () => {
        const apiSearchParams = new URLSearchParams({
            client_id: authParams.client_id,
            response_type: authParams.response_type,
            scope: authParams.scope,
            redirect_uri: authParams.redirect_uri,
            state: authParams.state,
        });

        if (authParams.nonce) apiSearchParams.set('nonce', authParams.nonce);
        if (authParams.code_challenge) apiSearchParams.set('code_challenge', authParams.code_challenge);
        if (authParams.code_challenge_method) apiSearchParams.set('code_challenge_method', authParams.code_challenge_method);

        const res = await request('GET', `/api/auth/oidc/authenticate?${apiSearchParams.toString()}`);

        const data = await res.json();
        if (!res.ok) {
            console.error('Failed to obtain authorization code:', data);
            return undefined;
        }
        return data.authorizationCode;
    };

    const requiresSelectAccount = prompts.includes('select_account');
    const requiresConsent = prompts.includes('consent');

    const approveConsent = async () => {
        try {
            const authCode = await obtainAuthorizationCode();
            if (!authCode) {
                window.location.href = buildRedirectUrl(
                    { error: 'authorization_code_failed', state: authParams.state },
                    authParams.redirect_uri,
                );
                return;
            }

            window.location.href = buildRedirectUrl({ code: authCode, state: authParams.state }, authParams.redirect_uri);
        } catch {
            window.location.href = buildRedirectUrl({ error: 'server_error', state: authParams.state }, authParams.redirect_uri);
        }
    };

    const denyConsent = () => {
        window.location.href = buildRedirectUrl({ error: 'access_denied', state: authParams.state }, authParams.redirect_uri);
    };

    if (!loggedAccounts) return <main></main>;
    if (prompts.includes('none')) return <SilentAuthPage obtainAuthorizationCode={obtainAuthorizationCode} params={authParams} />;
    if (prompts.includes('login') || loggedAccounts?.accounts.length == 0)
        return <LoginPage authParams={authParams} obtainAuthorizationCode={obtainAuthorizationCode} />;
    else if (requiresSelectAccount && !selectedAccount) {
        return (
            <AccountSelectorPage
                params={authParams}
                accounts={loggedAccounts?.accounts ?? []}
                onSelectAccount={account => {
                    setSelectedAccount(account.uuid);
                }}
            />
        );
    } else if (requiresConsent) {
        return (
            <ConsentPage
                clientId={authParams.client_id}
                scope={authParams.scope}
                selectedAccountName={loggedAccounts?.accounts.find(account => account.uuid === selectedAccount)?.name ?? 'Unknown Account'}
                onApprove={() => void approveConsent()}
                onDeny={denyConsent}
            />
        );
    }

    return <main></main>;
};

export default SignInPage;

