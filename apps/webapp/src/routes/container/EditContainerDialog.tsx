import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSession } from '@/context/SessionContext';
import { cn, request } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { Popover, PopoverContent } from '@radix-ui/react-popover';
import type { Container } from '@sigauth/generics/prisma-types';
import { PROTECTED } from '@sigauth/generics/protected';
import { BadgePlus, Check, ChevronsUpDown, XIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

const formSchema = z.object({
    name: z.string().min(4, 'Container name must be at least 4 characters long'),
    assets: z.array(z.number()),
    apps: z.array(z.number()),
});

export const EditContainerDialog = ({ container, close }: { container?: Container; close: () => void }) => {
    const { session, setSession } = useSession();

    const [assetSelectorOpen, setAssetSelectorOpen] = useState(false);
    const [assetIdField, setAssetIdField] = useState('');
    const [appSelectorOpen, setAppSelectorOpen] = useState(false);

    const submitToApi = async (values: z.infer<typeof formSchema>) => {
        if (!container) return;
        const res = await request('POST', '/api/container/edit', { id: container.id, ...values });

        if (res.ok) {
            const data = await res.json();
            console.log(data.container, container, container.id, session.containers);
            setSession({
                containers: session.containers.map(c => (c.id === container.id ? data.container : c)),
            });
            close();
            form.reset();
        } else {
            throw new Error();
        }
    };

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: container?.name || '',
            assets: container?.assets || [],
            apps: container?.apps || [],
        },
        mode: 'onChange',
    });

    useEffect(() => {
        if (container) {
            form.reset({
                name: container.name,
                assets: container.assets,
                apps: container.apps,
            });
        }
    }, [container]);

    const isAssetIdFieldValid = useMemo(() => /^\d*(?:[,-]\d+)*$/.test(assetIdField), [assetIdField]);

    const addAssetFromIdField = () => {
        if (!isAssetIdFieldValid) return;
        const notfoundIds: number[] = [];
        const ids = assetIdField.split(',');
        for (const id of ids) {
            if (id.includes('-')) {
                const [start, end] = id.split('-').map(Number);
                for (let i = start; i <= end; i++) {
                    if (
                        !session.assets.find(a => a.id === i) ||
                        session.assets.find(a => a.id === i)?.typeId == PROTECTED.AssetType.id ||
                        form.getValues('assets').includes(i)
                    ) {
                        notfoundIds.push(i);
                        continue;
                    }
                    form.setValue('assets', [...form.getValues('assets'), i]);
                }
            } else {
                if (
                    !session.assets.find(a => a.id === Number(id)) ||
                    session.assets.find(a => a.id === Number(id))?.typeId == PROTECTED.AssetType.id ||
                    form.getValues('assets').includes(Number(id))
                ) {
                    notfoundIds.push(Number(id));
                    continue;
                }
                form.setValue('assets', [...form.getValues('assets'), Number(id)]);
            }
        }

        if (notfoundIds.length > 0) {
            toast.error(`Some assets were not found!`, {
                description: `${notfoundIds.slice(0, 6).join(', ')}${notfoundIds.length > 10 ? ', ...' : ''}`,
            });
        }
    };

    if (!container) return <></>;
    return (
        <Dialog open={!!container} onOpenChange={close}>
            <DialogContent className="max-w-3xl flex flex-col gap-5">
                <DialogHeader>
                    <DialogTitle>Edit {container.name}</DialogTitle>
                    <DialogDescription>Edit the container to group assets and applications together.</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form
                        onSubmit={(e: React.FormEvent) => {
                            e.preventDefault();
                            if (!form.formState.isValid) return;
                            toast.promise(form.handleSubmit(submitToApi), {
                                loading: 'Submitting changes...',
                                success: 'Container edited successfully',
                                error: (err: Error) => err?.message || 'Failed to edit container',
                            });
                        }}
                        className="space-y-8"
                    >
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Container Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g. Customer A" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="asset-id">Assets</Label>
                                <div className="col-span-1 grid grid-cols-3 gap-3 mt-1.5">
                                    <div className="relative w-full">
                                        <Input
                                            id="asset-id"
                                            placeholder="e.g 1,2,50-100"
                                            className={`pe-9 ${!isAssetIdFieldValid && 'border-destructive !ring-destructive text-destructive placeholder:text-destructive'}`}
                                            value={assetIdField}
                                            onChange={e => setAssetIdField(e.target.value)}
                                        />
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            hidden={assetIdField.length == 0}
                                            onClick={addAssetFromIdField}
                                            type="button"
                                            className="text-muted-foreground focus-visible:ring-ring/50 absolute inset-y-0 end-0 rounded-s-none hover:bg-transparent"
                                        >
                                            <BadgePlus />
                                            <span className="sr-only">Name</span>
                                        </Button>
                                        <p hidden={isAssetIdFieldValid} className="text-xs text-destructive mt-1">
                                            Make sure that your input follows the format: <code>1,2,50-100</code>
                                        </p>
                                    </div>
                                    <div className="col-span-2 [&>:first-child]:w-full [&>:last-child]:!min-w-[60%]">
                                        <Popover open={assetSelectorOpen} onOpenChange={setAssetSelectorOpen}>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant={'outline'}
                                                    role="combobox"
                                                    aria-expanded={assetSelectorOpen}
                                                    className="justify-between"
                                                >
                                                    Select an asset
                                                    <ChevronsUpDown className="opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="p-0 !z-300 pointer-events-auto">
                                                <Command>
                                                    <CommandInput placeholder="Search asset types..." className="h-9" />
                                                    <CommandList>
                                                        <CommandEmpty>No assets found.</CommandEmpty>
                                                        <CommandGroup>
                                                            {session.assets
                                                                .filter(
                                                                    asset =>
                                                                        asset.id != PROTECTED.AssetType.id &&
                                                                        !form.watch('assets').includes(asset.id),
                                                                )
                                                                .map(asset => (
                                                                    <CommandItem
                                                                        key={asset.id}
                                                                        onSelect={() => {
                                                                            setAssetSelectorOpen(false);
                                                                            form.setValue('assets', [
                                                                                ...form.getValues('assets'),
                                                                                asset.id,
                                                                            ]);
                                                                        }}
                                                                    >
                                                                        {asset.name}{' '}
                                                                        <span className="text-gray-500">
                                                                            ({asset.id},{' '}
                                                                            {session.assetTypes.find(a => a.id == asset.typeId)?.name})
                                                                        </span>
                                                                        <Check
                                                                            className={cn(
                                                                                'ml-auto',
                                                                                asset.id === form.watch('assets')[0]
                                                                                    ? 'opacity-100'
                                                                                    : 'opacity-0',
                                                                            )}
                                                                        />
                                                                    </CommandItem>
                                                                ))}
                                                        </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                </div>
                                <ScrollArea
                                    className="mt-2 border-2 border-dashed p-2 rounded-md h-[80px]"
                                    hidden={form.watch('assets').length == 0}
                                >
                                    <div className="flex flex-wrap gap-1">
                                        {form.watch('assets').map(assetId => {
                                            const asset = session.assets.find(a => a.id === assetId);
                                            return (
                                                <Badge key={assetId}>
                                                    <button
                                                        className="focus-visible:border-ring focus-visible:ring-ring/50 text-primary-foreground/60 hover:text-primary-foreground -my-px -ms-1 -me-1 inline-flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-[inherit] p-0 transition-[color,box-shadow] outline-none focus-visible:ring-[3px]"
                                                        aria-label="Close"
                                                        onClick={() =>
                                                            form.setValue(
                                                                'assets',
                                                                [...form.getValues('assets').filter(id => id !== assetId)],
                                                                {
                                                                    shouldValidate: true,
                                                                    shouldDirty: true,
                                                                    shouldTouch: true,
                                                                },
                                                            )
                                                        }
                                                    >
                                                        <XIcon className="size-3" aria-hidden="true" />
                                                    </button>
                                                    {asset?.name || `Unknown ${assetId}`}{' '}
                                                </Badge>
                                            );
                                        })}
                                    </div>
                                </ScrollArea>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="app-id">Apps</Label>
                                <div className="gap-3 w-full [&>:first-child]:w-full [&>:last-child]:!min-w-[90%] mt-1.5">
                                    <Popover open={appSelectorOpen} onOpenChange={setAppSelectorOpen}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant={'outline'}
                                                role="combobox"
                                                aria-expanded={appSelectorOpen}
                                                className="justify-between w-full"
                                            >
                                                Select an app
                                                <ChevronsUpDown className="opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[100%] p-0 !z-300">
                                            <Command>
                                                <CommandInput placeholder="Search asset types..." className="h-9" />
                                                <CommandList>
                                                    <CommandEmpty>No apps found.</CommandEmpty>
                                                    <CommandGroup>
                                                        {session.apps
                                                            .filter(
                                                                app => app.id != PROTECTED.App.id && !form.watch('apps').includes(app.id),
                                                            )
                                                            .map(app => (
                                                                <CommandItem
                                                                    key={app.id}
                                                                    onSelect={() => {
                                                                        setAppSelectorOpen(false);
                                                                        form.setValue('apps', [...form.getValues('apps'), app.id]);
                                                                    }}
                                                                >
                                                                    {app.name}
                                                                    <Check
                                                                        className={cn(
                                                                            'ml-auto',
                                                                            app.id === form.watch('apps')[0] ? 'opacity-100' : 'opacity-0',
                                                                        )}
                                                                    />
                                                                </CommandItem>
                                                            ))}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                <ScrollArea
                                    className="mt-2 border-2 border-dashed p-2 rounded-md h-[80px]"
                                    hidden={form.watch('apps').length == 0}
                                >
                                    <div className="flex flex-wrap gap-1">
                                        {form.watch('apps').map(appId => {
                                            const app = session.apps.find(a => a.id === appId);
                                            return (
                                                <Badge key={appId}>
                                                    <button
                                                        className="focus-visible:border-ring focus-visible:ring-ring/50 text-primary-foreground/60 hover:text-primary-foreground -my-px -ms-1 -me-1 inline-flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-[inherit] p-0 transition-[color,box-shadow] outline-none focus-visible:ring-[3px]"
                                                        aria-label="Close"
                                                        onClick={() =>
                                                            form.setValue('apps', [...form.getValues('apps').filter(id => id !== appId)], {
                                                                shouldValidate: true,
                                                                shouldDirty: true,
                                                                shouldTouch: true,
                                                            })
                                                        }
                                                    >
                                                        <XIcon className="size-3" aria-hidden="true" />
                                                    </button>
                                                    {app?.name || `Unknown ${appId}`}{' '}
                                                </Badge>
                                            );
                                        })}
                                    </div>
                                </ScrollArea>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="submit" disabled={!form.formState.isValid}>
                                Edit Container
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};
