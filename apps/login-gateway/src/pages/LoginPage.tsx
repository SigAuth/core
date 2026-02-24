import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { buildRedirectUrl, request } from '@/lib/utils';
import type { AuthenticationParams } from '@/RootComponent';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { Toaster, toast } from 'sonner';

type LoginPageProps = {
    authParams: AuthenticationParams;
    obtainAuthorizationCode: () => Promise<string | undefined>;
};

export const LoginPage = ({ authParams, obtainAuthorizationCode }: LoginPageProps) => {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const sendCredentialLogin = async () => {
        if (isSubmitting) return;

        const username = (document.getElementById('username') as HTMLInputElement).value.trim();
        const password = (document.getElementById('password') as HTMLInputElement).value.trim();

        // TODO add 2FA
        if (username.length < 3 || password.length < 3) return toast.warning('Please enter longer credentials.');

        setIsSubmitting(true);

        try {
            const res = await request('POST', `/api/auth/login`, { username, password });

            if (res.ok) {
                const authCode = await obtainAuthorizationCode();
                if (authCode) {
                    window.location.href = buildRedirectUrl({ code: authCode, state: authParams.state }, authParams.redirect_uri);
                } else {
                    // window.location.href = buildRedirectUrl(
                    //     { error: 'authorization_code_failed', state: authParams.state },
                    //     authParams.redirect_uri,
                    // );
                }
            } else if (res.status === 429) {
                toast.error('Too many requests. Please wait a moment and try again.');
            } else {
                toast.error('Login failed. Please check your credentials.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const onSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        void sendCredentialLogin();
    };

    return (
        <main className="flex items-center justify-center min-h-screen bg-muted">
            <Toaster position="bottom-right" />
            <Card className="w-full max-w-sm">
                <CardHeader>
                    <CardTitle>Login to your account</CardTitle>
                    <CardDescription>Enter your email below to login to your account</CardDescription>
                    <CardAction>
                        <Button disabled variant="link">
                            Sign Up
                        </Button>
                    </CardAction>
                </CardHeader>
                <CardContent>
                    <form className="flex flex-col gap-6" onSubmit={onSubmit}>
                        <div className="grid gap-2">
                            <Label htmlFor="username">Username</Label>
                            <Input id="username" type="text" placeholder="john.doe" required />
                        </div>
                        <div className="grid gap-2">
                            <div className="flex items-center">
                                <Label htmlFor="password">Password</Label>
                                <Button disabled variant="link" className="ml-auto inline-block text-sm underline-offset-4 hover:underline">
                                    Forgot your password?
                                </Button>
                            </div>
                            <Input id="password" type="password" required />
                        </div>
                    </form>
                </CardContent>
                <CardFooter className="flex-col gap-2">
                    <Button type="button" onClick={() => void sendCredentialLogin()} className="w-full" disabled={isSubmitting}>
                        Login
                    </Button>
                </CardFooter>
            </Card>
        </main>
    );
};

