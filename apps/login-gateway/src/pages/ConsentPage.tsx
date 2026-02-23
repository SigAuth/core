import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

type ConsentPageProps = {
    clientId: string;
    scope: string;
    selectedAccountName: string;
    onApprove: () => void;
    onDeny: () => void;
};

export const ConsentPage = ({ clientId, scope, selectedAccountName, onApprove, onDeny }: ConsentPageProps) => {
    return (
        <main className="flex items-center justify-center min-h-screen bg-muted p-4">
            <Card className="w-full max-w-lg">
                <CardHeader>
                    <CardTitle>Review access request</CardTitle>
                    <CardDescription>This app is requesting access to your account.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <p className="text-sm">
                        <span className="font-medium">Application:</span> {clientId}
                    </p>
                    <p className="text-sm">
                        <span className="font-medium">Signed in as:</span> {selectedAccountName}
                    </p>

                    <p className="text-sm">
                        <span className="font-medium">Requested scope:</span> {scope}
                    </p>
                    <p className="text-xs text-muted-foreground">Mockup page for OIDC consent prompt.</p>
                </CardContent>
                <CardFooter className="flex gap-2 justify-end">
                    <Button type="button" variant="outline" onClick={onDeny}>
                        Deny
                    </Button>
                    <Button type="button" onClick={onApprove}>
                        Allow
                    </Button>
                </CardFooter>
            </Card>
        </main>
    );
};

