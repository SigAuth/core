import { ConsentManager } from '@/lib/consent.management';
import { getGernericAppData, getSessions } from '@/lib/utils';
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

const RootComponent = () => {
    const queryParams = new URLSearchParams(window.location.search);
    const [loggedAccounts, setLoggedAccounts] = useState<{ sessions: Session[]; accounts: Account[] } | undefined>(undefined);
    const [appData, setAppData] = useState<{ name: string; logo: string; url: string } | null>(null);
    const [selectedAccount, setSelectedAccount] = useState<Account | undefined>(undefined);
    const [flowState, setFlowState] = useState<'login' | 'account_selected' | 'obtain_consent' | 'consent_obtained'>('login');

    /**
     * None Workflow:
     * Get Account (either logged in or in by a selection)
     * check and evaluate consent of that account
     * obtain authCode
     *
     * each of these steps is optional but if the prompt includes an attribute it can also be enforced by the client
     * e.g login select_account will aloways show login screen and selection but consent only if its optional
     */

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
    const requestedScopes = authParams.scope.split(' ').filter(Boolean);

    // validation
    if (!authParams.state || !authParams.client_id || !authParams.response_type || !authParams.scope || !authParams.redirect_uri)
        return <main>Request parameters are missing or invalid.</main>;
    if (prompts.includes('none') && prompts.length > 1)
        return <main>Invalid prompt parameter. 'none' cannot be used with other prompts.</main>;

    const evaluateSessions = async () => {
        const data = await getSessions();
        const appData = await getGernericAppData(authParams.client_id);
        setAppData(appData);

        if (!data) {
            setLoggedAccounts({ sessions: [], accounts: [] });
            return;
        }

        setLoggedAccounts({
            sessions: Array.isArray(data.sessions) ? data.sessions : [],
            accounts: Array.isArray(data.accounts) ? data.accounts : [],
        });

        if (prompts.includes('login') || data.accounts.length === 0) {
            setFlowState('login');
        } else if (prompts.includes('select_account') || !selectedAccount) {
            setFlowState('account_selected');
        } else if (
            prompts.includes('consent') ||
            ConsentManager.requiresConsentForScopes(authParams.client_id, selectedAccount?.uuid ?? '', requestedScopes)
        ) {
            setFlowState('obtain_consent');
        } else {
            setFlowState('consent_obtained');
        }
    };
    useEffect(() => {
        evaluateSessions();
    }, []);

    if (!loggedAccounts) return <main>Loading...</main>;
    console.log('Flow State:', flowState);
    // wait for sessions to load
    if (!loggedAccounts) return <main></main>;

    console.log('Logged Accounts:', loggedAccounts);
    if (flowState === 'login') {
        return (
            <LoginPage
                updateState={async () => {
                    console.log('Updating state after login...');
                    await evaluateSessions();

                    if (prompts.includes('select_account') || !selectedAccount) {
                        setFlowState('account_selected');
                    } else if (
                        prompts.includes('consent') ||
                        ConsentManager.requiresConsentForScopes(authParams.client_id, selectedAccount.uuid ?? '', requestedScopes)
                    ) {
                        setFlowState('obtain_consent');
                    } else {
                        setFlowState('consent_obtained');
                    }
                }}
            />
        );
    } else if (flowState === 'account_selected') {
        return (
            <AccountSelectorPage
                params={authParams}
                accounts={loggedAccounts.accounts}
                onSelectAccount={acc => {
                    setSelectedAccount(acc);
                    if (
                        prompts.includes('consent') ||
                        ConsentManager.requiresConsentForScopes(authParams.client_id, acc.uuid, requestedScopes)
                    ) {
                        setFlowState('obtain_consent');
                    } else {
                        setFlowState('consent_obtained');
                    }
                }}
            />
        );
    } else if (flowState === 'obtain_consent') {
        if (!selectedAccount) throw new Error('Illegal State: Selected account is required for consent page');
        return (
            <ConsentPage
                selectedAccount={selectedAccount}
                clientId={authParams.client_id}
                requestedScopes={requestedScopes}
                updateState={async () => {
                    await evaluateSessions();
                    setFlowState('consent_obtained');
                }}
                appData={appData}
            />
        );
    } else {
        return <SilentAuthPage params={authParams} account={selectedAccount!} />;
    }
};

export default RootComponent;

