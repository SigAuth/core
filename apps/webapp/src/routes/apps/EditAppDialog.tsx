import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSession } from '@/context/SessionContext';
import { request } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import type { AppPermission, AppWebFetch } from '@sigauth/generics/json-types';
import { BadgePlus, Edit, XIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

const formSchema = z.object({
    name: z.string().min(4, 'Name must be at least 4 characters long'),
    url: z.string().url('Invalid URL'),
    oidcAuthCodeUrl: z.string().url('Invalid OIDC Authorization Code URL').optional(),
    permissions: z.object({
        asset: z.array(z.string().min(3, 'Asset permission must be at least 3 characters long')),
        container: z.array(z.string().min(3, 'Container permission must be at least 3 characters long')),
        root: z.array(z.string().min(3, 'Root permission must be at least 3 characters long')),
    }),
    nudge: z.boolean(),
    webFetchEnabled: z.boolean().optional(),
});

export const EditAppDialog = ({ appIds, open, setOpen }: { appIds: number[]; open: boolean; setOpen: (open: boolean) => void }) => {
    const { session, setSession } = useSession();

    const app = useMemo(() => {
        if (appIds.length !== 1) return undefined;
        return session.apps.find(a => a.id === appIds[0]);
    }, [appIds, session.apps]);

    const [tab, setTab] = useState<'asset' | 'container' | 'root'>('asset');
    const [permissionField, setPermissionField] = useState<string>('');

    const submitToApi = async (values: z.infer<typeof formSchema>) => {
        if (!app) return;
        const res = await request('POST', '/api/app/edit', { id: app.id, ...values });

        if (res.ok) {
            const data = await res.json();
            setSession({ apps: session.apps.map(a => (a.id === app.id ? data : a)) });
            close();
            return;
        }
        throw new Error((await res.json()).message || 'Failed to edit app');
    };

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: app?.name,
            url: app?.url,
            oidcAuthCodeUrl: app?.oidcAuthCodeUrl || '',
            webFetchEnabled: app ? (app.webFetch as AppWebFetch).enabled : false,
            nudge: false,
            permissions: {
                asset: app ? (app.permissions as AppPermission).asset : [],
                container: app ? (app.permissions as AppPermission).container : [],
                root: app ? (app.permissions as AppPermission).root : [],
            },
        },
        mode: 'onChange',
    });

    useEffect(() => {
        if (app) {
            form.reset({
                name: app.name,
                url: app.url,
                oidcAuthCodeUrl: app.oidcAuthCodeUrl || '',
                webFetchEnabled: (app.webFetch as AppWebFetch).enabled,
                nudge: false,
                permissions: {
                    asset: (app.permissions as AppPermission).asset,
                    container: (app.permissions as AppPermission).container,
                    root: (app.permissions as AppPermission).root,
                },
            });
        }
    }, [app]);

    if (!app) return null;
    const permissions = form.watch(`permissions.${tab}`);
    const webFetch = form.watch('webFetchEnabled');
    const addItem = () => {
        if (!permissionField || permissionField.length < 3 || !/^[A-Z0-9_-]*$/i.test(permissionField)) {
            return;
        }

        form.setValue(`permissions.${tab}`, [...permissions, permissionField], {
            shouldValidate: true,
            shouldDirty: true,
            shouldTouch: true,
        });
        setPermissionField('');
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button disabled={appIds.length !== 1} variant="ghost" size="icon-lg" className="w-fit">
                    <Edit />
                </Button>
            </DialogTrigger>
            <DialogContent className="!max-w-fit">
                <DialogHeader>
                    <DialogTitle>Edit {app?.name}</DialogTitle>
                    <DialogDescription>Reconfigure your application settings and permissions.</DialogDescription>
                </DialogHeader>
                <div>
                    <Form {...form}>
                        <form
                            onSubmit={(e: React.FormEvent) => {
                                e.preventDefault();
                                if (!form.formState.isValid) return;
                                toast.promise(form.handleSubmit(submitToApi), {
                                    loading: 'Editing app...',
                                    success: 'App edited successfully',
                                    error: (err: Error) => err?.message || 'Failed to edit app',
                                });
                            }}
                            className="space-y-8"
                        >
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Application name</FormLabel>
                                        <FormDescription>The name of your application.</FormDescription>
                                        <FormControl>
                                            <Input placeholder="My Web Application" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="url"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Application URL</FormLabel>
                                        <FormDescription>The URL of your application.</FormDescription>
                                        <FormControl>
                                            <Input placeholder="https://example.com" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="oidcAuthCodeUrl"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>OIDC Authorization Code URL</FormLabel>
                                        <FormDescription>
                                            The URL of your application's OIDC authorization code endpoint. (optional)
                                        </FormDescription>
                                        <FormControl>
                                            <Input placeholder="https://example.com/oidc/auth" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="webFetchEnabled"
                                render={({ field }) => (
                                    <FormItem>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <FormLabel>Enable Web Fetch</FormLabel>
                                                <FormDescription className="w-[70%]">
                                                    Toggle web fetching permissions from the url after submitting the request
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

                            <Tabs defaultValue="asset" value={tab} onValueChange={value => setTab(value as 'asset' | 'container' | 'root')}>
                                <div className="flex gap-3">
                                    <TabsList className="mb-3">
                                        <TabsTrigger value="asset">Asset</TabsTrigger>
                                        <TabsTrigger value="container">Container</TabsTrigger>
                                        <TabsTrigger value="root">Root</TabsTrigger>
                                    </TabsList>
                                    {!webFetch && (
                                        <div className="w-full">
                                            <div className="relative w-full">
                                                <Input
                                                    id="permission-name"
                                                    placeholder="e.g Post Modify Permission"
                                                    className={`pe-9 ${((permissionField.length > 0 && permissionField.length < 3) || !/^[A-Z0-9_-]*$/i.test(permissionField)) && 'border-destructive !ring-destructive text-destructive placeholder:text-destructive'}`}
                                                    value={permissionField}
                                                    onChange={e => setPermissionField(e.target.value)}
                                                />
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={addItem}
                                                    type="button"
                                                    className="text-muted-foreground focus-visible:ring-ring/50 absolute inset-y-0 end-0 rounded-s-none hover:bg-transparent"
                                                >
                                                    <BadgePlus />
                                                    <span className="sr-only">Name</span>
                                                </Button>
                                            </div>

                                            {((permissionField.length > 0 && permissionField.length < 3) ||
                                                !/^[A-Z0-9_-]*$/i.test(permissionField)) && (
                                                <p data-slot="form-message" className="text-destructive text-sm mt-2">
                                                    Permission must be at least 3 characters long and alphanumeric.
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-wrap gap-3">
                                    {permissions.map((permission, index) => (
                                        <Badge key={index}>
                                            {permission}
                                            <button
                                                className="focus-visible:border-ring focus-visible:ring-ring/50 text-primary-foreground/60 hover:text-primary-foreground -my-px -ms-px -me-1.5 inline-flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-[inherit] p-0 transition-[color,box-shadow] outline-none focus-visible:ring-[3px]"
                                                aria-label="Close"
                                                onClick={() =>
                                                    form.setValue(
                                                        `permissions.${tab}`,
                                                        permissions.filter((_, i) => i !== index),
                                                        { shouldValidate: true, shouldDirty: true, shouldTouch: true },
                                                    )
                                                }
                                            >
                                                <XIcon className="size-3" aria-hidden="true" />
                                            </button>
                                        </Badge>
                                    ))}
                                </div>
                            </Tabs>

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
