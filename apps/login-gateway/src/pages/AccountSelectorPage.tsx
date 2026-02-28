import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { buildRedirectUrl } from '@/lib/utils';
import type { AuthenticationParams } from '@/RootComponent';
import type { Account } from '@sigauth/sdk/fundamentals';

type AccountSelectorPageProps = {
    params: AuthenticationParams;
    accounts: Account[];
    onSelectAccount: (account: Account) => void;
};

export const AccountSelectorPage = ({ params, accounts, onSelectAccount }: AccountSelectorPageProps) => {
    if (accounts.length === 0) {
        window.location.href = buildRedirectUrl({ error: 'login_required', state: params.state }, params.redirect_uri);
    } else if (accounts.length === 1) {
        onSelectAccount(accounts[0]);
    }

    return (
        <main className="flex items-center justify-center min-h-screen bg-muted p-4">
            <Card className="w-full max-w-lg">
                <CardHeader>
                    <CardTitle>Select an account</CardTitle>
                    <CardDescription>Choose one of the available accounts to continue.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                    {accounts.map(account => (
                        <Button
                            key={account.uuid}
                            type="button"
                            variant="outline"
                            className="w-full justify-start"
                            onClick={() => onSelectAccount(account)}
                        >
                            {account.name}
                        </Button>
                    ))}
                </CardContent>
                <CardFooter>
                    <p className="text-xs text-muted-foreground">Mockup page for OIDC select_account prompt.</p>
                </CardFooter>
            </Card>
        </main>
    );
};

