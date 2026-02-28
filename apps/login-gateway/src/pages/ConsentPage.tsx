import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ConsentManager } from '@/lib/consent.management';
import type { Account } from '@sigauth/sdk/fundamentals';
import { useState } from 'react';

type ConsentPageProps = {
    clientId: string;
    appData?: { name: string; logo: string; url: string } | null;
    requestedScopes: string[];
    selectedAccount: Account;
    updateState: () => void;
};

export const ConsentPage = ({ clientId, requestedScopes, selectedAccount, appData, updateState }: ConsentPageProps) => {
    const [denied, setDenied] = useState(false);
    const [selectedScopes, setSelectedScopes] = useState<string[]>(
        ConsentManager.obtainPersistentConsent(clientId, selectedAccount.uuid).length == 0
            ? requestedScopes
            : ConsentManager.obtainPersistentConsent(clientId, selectedAccount.uuid),
    );

    const changeScope = (scope: string, isChecked: boolean) => {
        setSelectedScopes(prev => {
            if (isChecked) {
                return [...prev, scope];
            } else {
                return prev.filter(s => s !== scope);
            }
        });
    };

    if (denied) {
        return (
            <main className="flex items-center justify-center min-h-screen bg-muted p-4">
                <Card className="w-full max-w-lg">
                    <CardHeader>
                        <CardTitle>Access denied</CardTitle>
                        <CardDescription>You have denied access to this application.</CardDescription>
                    </CardHeader>
                </Card>
            </main>
        );
    }

    return (
        <main className="flex items-center justify-center min-h-screen bg-muted p-4">
            <Card className="w-full max-w-lg">
                <CardHeader>
                    <CardTitle>Review access request</CardTitle>
                    <CardDescription>This app is requesting access to your account.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <p className="text-sm">
                        <span className="font-medium">Application:</span> {appData?.name ?? clientId}
                    </p>
                    <p className="text-sm">
                        <span className="font-medium">Signed in as:</span> {selectedAccount.name}
                    </p>

                    <div className="space-y-2">
                        <p className="text-sm font-medium">Requested scopes</p>
                        {requestedScopes.length > 0 ? (
                            <div className="space-y-2">
                                {requestedScopes.map(scope => {
                                    const checkboxId = `scope-${scope}`;
                                    return (
                                        <div className="flex items-center gap-2" key={scope}>
                                            <Input
                                                id={checkboxId}
                                                type="checkbox"
                                                className="h-4 w-4"
                                                checked={selectedScopes.includes(scope)}
                                                onChange={event => changeScope(scope, event.target.checked)}
                                            />
                                            <Label htmlFor={checkboxId} className="text-sm font-normal">
                                                {scope}
                                            </Label>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">No scopes requested.</p>
                        )}
                    </div>
                </CardContent>
                <CardFooter className="flex gap-2 justify-end">
                    <Button type="button" variant="outline" onClick={() => setDenied(true)}>
                        Deny
                    </Button>
                    <Button
                        type="button"
                        onClick={() => {
                            ConsentManager.persistConsent(clientId, selectedAccount.uuid, selectedScopes);
                            updateState();
                        }}
                    >
                        Allow
                    </Button>
                </CardFooter>
            </Card>
        </main>
    );
};

