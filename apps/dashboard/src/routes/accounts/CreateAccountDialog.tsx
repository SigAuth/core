import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useSession } from '@/context/SessionContext';
import { request } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { BadgePlus } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

export const CreateAccountDialog = () => {
    const { session, setSession } = useSession();

    const formSchema = z.object({
        name: z
            .string()
            .regex(/^[a-zA-Z0-9_-]+$/, 'Only Letters, Digits, - and _ allowed, no spaces')
            .min(4, 'Name must be at least 4 characters long')
            .refine(val => session.accounts.findIndex(a => a.name === val) === -1, { message: 'An account with this name already exists' }),
        password: z
            .string()
            .min(8, 'Password must be at least 8 characters long')
            .regex(
                /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/,
                'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
            ),
        email: z
            .string()
            .email('Invalid email address')
            .refine(val => session.accounts.findIndex(a => a.email === val) === -1, {
                message: 'An account with this email already exists',
            }),
        apiAccess: z.boolean(),
    });

    const [open, setOpen] = useState(false);

    const submitToApi = async (values: z.infer<typeof formSchema>) => {
        const res = await request('POST', '/api/account/create', values);

        if (res.ok) {
            const data = await res.json();
            setSession({ accounts: [...session.accounts, data.account] });
            setOpen(false);
            return;
        }
        throw new Error((await res.json()).message || 'Failed to create account');
    };

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: '',
            email: '',
            password: '',
            apiAccess: false,
        },
        mode: 'onChange',
    });

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon-lg" className="w-fit">
                    <BadgePlus />
                </Button>
            </DialogTrigger>
            <DialogContent className="!max-w-fit">
                <DialogHeader>
                    <DialogTitle>Create a new account</DialogTitle>
                    <DialogDescription>
                        Define a new account here. You can create as many accounts as you want and fill them with data.
                    </DialogDescription>
                </DialogHeader>
                <div>
                    <Form {...form}>
                        <form
                            onSubmit={(e: React.FormEvent) => {
                                e.preventDefault();
                                if (!form.formState.isValid) return;
                                toast.promise(form.handleSubmit(submitToApi), {
                                    loading: 'Creating account...',
                                    success: 'Account created successfully',
                                    error: (err: Error) => err?.message || 'Failed to create account',
                                });
                            }}
                            className="space-y-8"
                        >
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Account name</FormLabel>
                                        <FormDescription>Enter the username of your account.</FormDescription>
                                        <FormControl>
                                            <Input placeholder="e.g. John.Doe" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Password</FormLabel>
                                        <FormDescription>Enter the password for your account.</FormDescription>
                                        <FormControl>
                                            <Input placeholder="Pick something safe" {...field} />
                                        </FormControl>
                                        <ul className="list-disc pl-8 text-gray-400">
                                            <li>At least 8 characters long</li>
                                            <li>Includes uppercase and lowercase letters</li>
                                            <li>Includes numbers</li>
                                            <li>Includes special characters</li>
                                            <li>Does not contain your username or parts of your full name</li>
                                        </ul>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Email</FormLabel>
                                        <FormDescription>Enter the email for your account.</FormDescription>
                                        <FormControl>
                                            <Input placeholder="john.doe@mail.com" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="apiAccess"
                                render={({ field }) => (
                                    <FormItem>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <FormLabel>Enable API Access</FormLabel>
                                                <FormDescription className="w-[70%]">
                                                    Toggle API access for the account and generate a token.
                                                </FormDescription>
                                            </div>
                                            <FormControl>
                                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                                            </FormControl>
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <Button className="w-full" type="submit" disabled={!form.formState.isValid}>
                                Submit
                            </Button>
                        </form>
                    </Form>
                </div>
            </DialogContent>
        </Dialog>
    );
};
