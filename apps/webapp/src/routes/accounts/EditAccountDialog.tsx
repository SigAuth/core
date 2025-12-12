import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useSession } from '@/context/SessionContext';
import { request } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { Edit } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

export const EditAccountDialog = ({
    accountIds,
    open,
    setOpen,
}: {
    accountIds: number[];
    open: boolean;
    setOpen: (open: boolean) => void;
}) => {
    const { session, setSession } = useSession();

    const account = useMemo(() => {
        if (accountIds.length !== 1) return undefined;
        return session.accounts.find(a => a.id === accountIds[0]);
    }, [accountIds, session.accounts]);

    const formSchema = z.object({
        name: z
            .string()
            .regex(/^[a-zA-Z0-9_-]+$/, 'Only Letters, Digits, - and _ allowed, no spaces')
            .min(4, 'Name must be at least 4 characters long')
            .refine(val => session.accounts.findIndex(a => a.name === val && a.id !== account?.id) === -1, {
                message: 'An account with this name already exists',
            }),
        password: z.string().optional(),
        email: z
            .string()
            .email('Invalid email address')
            .refine(val => session.accounts.findIndex(a => a.email === val && a.id !== account?.id) === -1, {
                message: 'An account with this email already exists',
            }),
        apiAccess: z.boolean(),
    });

    const submitToApi = async (values: z.infer<typeof formSchema>) => {
        if (!account) return;
        if (
            values.password &&
            values.password.length > 0 &&
            !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(values.password)
        ) {
            throw new Error(
                'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
            );
        }

        const updateData: { id: number; name?: string; password?: string; email?: string; apiAccess: boolean } = {
            id: account.id,
            apiAccess: values.apiAccess,
        };
        if (values.name && values.name.length > 0) updateData.name = values.name;
        if (values.password && values.password.length > 0) updateData.password = values.password;
        if (values.email && values.email.length > 0) updateData.email = values.email;

        const res = await request('POST', '/api/account/edit', updateData);

        if (res.ok) {
            const data = await res.json();
            setSession({ accounts: session.accounts.map(a => (a.id === account.id ? data.account : a)) });
            setOpen(false);
            return;
        }
        throw new Error((await res.json()).message || 'Failed to edit account');
    };

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        mode: 'onChange',
    });

    useEffect(() => {
        form.reset({
            name: account?.name,
            email: account?.email || '',
            password: '',
            apiAccess: !!account?.api || false,
        });
    }, [account]);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" disabled={accountIds.length !== 1} size="icon-lg" className="w-fit">
                    <Edit />
                </Button>
            </DialogTrigger>
            <DialogContent className="!max-w-fit">
                <DialogHeader>
                    <DialogTitle>Edit {account?.name}</DialogTitle>
                    <DialogDescription>
                        Update {account?.name} here. You can create as many accounts as you want and fill them with data.
                    </DialogDescription>
                </DialogHeader>
                <div>
                    <Form {...form}>
                        <form
                            onSubmit={(e: React.FormEvent) => {
                                e.preventDefault();
                                if (Object.keys(form.formState.errors).length > 0) return;
                                toast.promise(form.handleSubmit(submitToApi), {
                                    loading: 'Submitting changes...',
                                    success: 'Account updated successfully',
                                    error: (err: Error) => err?.message || 'Failed to update account',
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
                                            <Input placeholder="Change if you want to update" {...field} />
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

                            <Button className="w-full" type="submit" disabled={Object.keys(form.formState.errors).length > 0}>
                                Submit
                            </Button>
                        </form>
                    </Form>
                </div>
            </DialogContent>
        </Dialog>
    );
};
