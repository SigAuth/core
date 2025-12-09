import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSession } from '@/context/SessionContext';
import { cn, request } from '@/lib/utils';
import { AssetFieldType, type AssetTypeField } from '@sigauth/generics/json-types';
import { type Asset, type Container } from '@sigauth/generics/prisma-types';
import { PROTECTED } from '@sigauth/generics/protected';
import { Check, ChevronsUpDown } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

export const EditAssetDialog = ({ asset, close }: { asset?: Asset; close: () => void }) => {
    const { session, setSession } = useSession();

    const [assetFields, setAssetFields] = useState<Record<string, string | number | boolean>>({});

    const [containerIds, setContainerIds] = useState<number[]>([]);
    const [containerSelectionOpen, setContainerSelectionOpen] = useState(false);

    const assetType = useMemo(() => session.assetTypes.find(type => type.id === asset?.typeId) || null, [asset]);

    useEffect(() => {
        if (asset) {
            setAssetFields((asset.fields as Record<string, string | number | boolean>) || {});
            setContainerIds(session.containers.filter(con => con.assets.includes(asset.id)).map(c => c.id));
        }
    }, [asset]);

    const handleSubmit = async () => {
        if (!asset) return;
        const name = (document.getElementById('edit-name') as HTMLInputElement).value;
        if (name.length < 4) {
            throw new Error('Name must be at least 4 characters long');
        }

        const res = await request('POST', '/api/asset/edit', {
            assetId: asset.id,
            name,
            fields: assetFields,
            containerIds,
        });

        close();
        if (res.ok) {
            const data = await res.json();
            setSession({
                assets: session.assets.map(a => (a.id === asset.id ? data.asset : a)),
                containers: session.containers.map(c => {
                    const updated = data.updatedContainers.find((uc: Container) => uc.id === c.id);
                    return updated ? updated : c;
                }),
            });
            return;
        }
        throw new Error('Failed to edit asset');
    };

    if (!asset) return null;
    return (
        <Dialog open={!!asset} onOpenChange={close}>
            <DialogContent className="!max-w-fit">
                <DialogHeader>
                    <DialogTitle>Edit {asset.name}</DialogTitle>
                    <DialogDescription>
                        Edit the asset depending on a asset type. You can create as many asset types as you want and fill them with data.
                    </DialogDescription>
                </DialogHeader>
                <div>
                    <div className="grid gap-3">
                        <Label htmlFor="edit-name">Name</Label>
                        <Input id="edit-name" name="name" placeholder="e.G Back to the Future 3" defaultValue={asset.name} />
                    </div>

                    {/* Container selection */}
                    <div className="grid gap-1 mt-3">
                        <Label htmlFor="name">Assign to container</Label>
                        <div className="[&>:first-child]:w-full [&>:last-child]:!min-w-[90%]">
                            <Popover open={containerSelectionOpen} onOpenChange={setContainerSelectionOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={'outline'}
                                        role="combobox"
                                        aria-expanded={containerSelectionOpen}
                                        className="justify-between"
                                    >
                                        Select containers...
                                        <ChevronsUpDown className="opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="p-0 !z-300">
                                    <Command>
                                        <CommandInput placeholder="Search containers..." className="h-9" />
                                        <CommandList>
                                            <CommandEmpty>No containers found.</CommandEmpty>
                                            <CommandGroup>
                                                {session.containers
                                                    .filter(con => con.id != PROTECTED.Container.id)
                                                    .map(con => (
                                                        <CommandItem
                                                            key={con.id}
                                                            onSelect={() => {
                                                                setContainerIds(prev =>
                                                                    prev.includes(con.id)
                                                                        ? prev.filter(id => id !== con.id)
                                                                        : [...prev, con.id],
                                                                );
                                                            }}
                                                        >
                                                            {con.name}
                                                            <Check
                                                                className={cn(
                                                                    'ml-auto',
                                                                    containerIds.includes(con.id) ? 'opacity-100' : 'opacity-0',
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

                    <ScrollArea className="w-full max-h-96 mt-3">
                        <div className="flex flex-col gap-3 m-1">
                            {asset &&
                                (assetType?.fields as AssetTypeField[]).map(field => {
                                    return (
                                        <div className="grid col-span-2 gap-1 animate-in fade-in duration-500">
                                            <Label htmlFor={field.name}>{field.name}</Label>
                                            {field.type == AssetFieldType.CHECKFIELD ? (
                                                <Checkbox
                                                    checked={!!assetFields[field.id]}
                                                    onCheckedChange={checked => setAssetFields({ ...assetFields, [field.id]: checked })}
                                                />
                                            ) : (
                                                <Input
                                                    id={field.name}
                                                    name={field.name}
                                                    type={field.type == AssetFieldType.NUMBER ? 'number' : 'text'}
                                                    defaultValue={assetFields[field.id] as string | number}
                                                    onChange={e =>
                                                        setAssetFields({
                                                            ...assetFields,
                                                            [field.id]:
                                                                field.type == AssetFieldType.NUMBER
                                                                    ? parseFloat(e.target.value)
                                                                    : e.target.value,
                                                        })
                                                    }
                                                />
                                            )}
                                        </div>
                                    );
                                })}
                        </div>
                    </ScrollArea>
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button
                            className="w-full"
                            disabled={!assetType}
                            onClick={() =>
                                toast.promise(handleSubmit, {
                                    loading: 'Submitting changes...',
                                    success: 'Asset edited successfully',
                                    error: (e: Error) => e.message || 'Failed to edit asset',
                                })
                            }
                        >
                            Create
                        </Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
