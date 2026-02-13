import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { logout, request } from '@/lib/utils';
import { useEffect, useRef, useState } from 'react';
import { toast, Toaster } from 'sonner';

const SignInPage = () => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const isSubmittingRef = useRef(false);
    const queryParams = new URLSearchParams(window.location.search);

    const clientId = queryParams.get('client_id');
    const responseType = queryParams.get('response_type');
    const scope = queryParams.get('scope');
    const redirect_uri = queryParams.get('redirect_uri');
    const state = queryParams.get('state');

    const nonce = queryParams.get('nonce');
    const challenge = queryParams.get('code_challenge');
    const challengeMethod = queryParams.get('code_challenge_method');
    const prompt = queryParams.get('prompt'); // none, login, consent, select_account

    const handleSubmit = async () => {
        // Prevent double-submit (Enter + click, fast re-press, etc.)
        if (isSubmittingRef.current) return;

        const username = (document.getElementById('username') as HTMLInputElement).value.trim();
        const password = (document.getElementById('password') as HTMLInputElement).value.trim();

        // TODO add 2FA
        if (username.length < 3 || password.length < 3) return toast.warning('Please enter longer credentials.');

        isSubmittingRef.current = true;
        setIsSubmitting(true);

        try {
            const res = await request('POST', `/api/auth/login`, { username, password });

            if (res.ok) {
                toast.success('Login successful!');
                window.location.reload();
            } else if (res.status === 429) {
                toast.error('Too many requests. Please wait a moment and try again.');
            } else {
                toast.error('Login failed. Please check your credentials.');
            }
        } finally {
            isSubmittingRef.current = false;
            setIsSubmitting(false);
        }
    };

    useEffect(() => {
        request(
            'GET',
            `/api/auth/oidc/authenticate?client_id=${clientId}&response_type=${responseType}&scope=${scope}&redirect_uri=${redirect_uri}&state=${state}&nonce=${nonce}&code_challenge=${challenge}&code_challenge_method=${challengeMethod}&prompt=${prompt}`,
        ).then(async res => {
            if (res.ok) {
                // redirecting to app, show consent screen if needed
                toast.info('Already logged in, redirecting...');
                // window.location.href = await res.text();
            } else {
                logout();
            }
        });

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key !== 'Enter') return;

            // Ignore OS key-repeat when holding Enter
            if (e.repeat) return;

            void handleSubmit();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

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
                    <div className="flex flex-col gap-6">
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
                    </div>
                </CardContent>
                <CardFooter className="flex-col gap-2">
                    <Button type="submit" onClick={handleSubmit} className="w-full" disabled={isSubmitting}>
                        Login
                    </Button>
                </CardFooter>
            </Card>
        </main>
    );
};

export default SignInPage;

