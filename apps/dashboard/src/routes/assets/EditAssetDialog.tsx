import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSession } from '@/context/SessionContext';
import { request } from '@/lib/utils';
import { AssetFieldType, type AssetTypeField } from '@sigauth/sdk/asset';
import { Edit } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

export const EditAssetDialog = ({ assetIds, open, setOpen }: { assetIds: number[]; open: boolean; setOpen: (open: boolean) => void }) => {
    const { session, setSession } = useSession();

    const asset = useMemo(() => {
        if (assetIds.length !== 1) return undefined;
        return session.assets.find(a => a.id === assetIds[0]);
    }, [assetIds, session.assets]);
    const [assetFields, setAssetFields] = useState<Record<string, string | number | boolean>>({});

    const assetType = useMemo(() => session.assetTypes.find(type => type.uuid === asset?.typeUuid) || null, [asset]);

    useEffect(() => {
        if (asset) {
            const { uuid, name, ...fields } = asset;
            setAssetFields(fields as Record<string, string | number | boolean>);
        }
    }, [asset]);

    const handleSubmit = async () => {
        if (!asset) return;
        const name = (document.getElementById('edit-name') as HTMLInputElement).value;
        if (name.length < 4) {
            throw new Error('Name must be at least 4 characters long');
        }

        const res = await request('POST', '/api/asset/edit', {
            uuid: asset.uuid,
            name,
            fields: assetFields,
        });

        close();
        if (res.ok) {
            const data = await res.json();
            setSession({
                assets: session.assets.map(a => (a.id === asset.id ? data.asset : a)),
            });
            return;
        }
        throw new Error('Failed to edit asset');
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button disabled={assetIds.length !== 1} size="icon-lg" variant="ghost" className="w-fit">
                    <Edit />
                </Button>
            </DialogTrigger>
            <DialogContent className="!max-w-fit">
                <DialogHeader>
                    <DialogTitle>Edit {asset?.name}</DialogTitle>
                    <DialogDescription>
                        Edit the asset depending on an asset type. You can create as many asset types as you want and fill them with data.
                    </DialogDescription>
                </DialogHeader>
                <div>
                    <div className="grid gap-3">
                        <Label htmlFor="edit-name">Name</Label>
                        <Input id="edit-name" name="name" placeholder="e.G Back to the Future 3" defaultValue={asset?.name} />
                    </div>

                    <ScrollArea className="w-full max-h-96 mt-3">
                        <div className="flex flex-col gap-3 m-1">
                            {asset &&
                                (assetType?.fields as AssetTypeField[]).map(field => {
                                    return (
                                        <div className="grid col-span-2 gap-1 animate-in fade-in duration-500">
                                            <Label htmlFor={field.name}>{field.name}</Label>
                                            {field.type === AssetFieldType.BOOLEAN ? (
                                                <Checkbox
                                                    checked={!!assetFields[field.name]}
                                                    onCheckedChange={checked => setAssetFields({ ...assetFields, [field.name]: checked })}
                                                />
                                            ) : (
                                                <Input
                                                    id={field.name}
                                                    name={field.name}
                                                    type={field.type == AssetFieldType.INTEGER ? 'number' : 'text'}
                                                    defaultValue={assetFields[field.name] as string | number}
                                                    onChange={e =>
                                                        setAssetFields({
                                                            ...assetFields,
                                                            [field.name]:
                                                                field.type == AssetFieldType.INTEGER
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
                            Edit
                        </Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

