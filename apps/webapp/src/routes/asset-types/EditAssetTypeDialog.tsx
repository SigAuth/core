import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useSession } from '@/context/SessionContext';
import { request } from '@/lib/utils';
import { AssetFieldType, type AssetTypeField } from '@sigauth/generics/json-types';
import { BadgePlus, Trash } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

export const EditAssetTypeDialog = ({ typeIds, open, setOpen }: { typeIds: number[]; open: boolean; setOpen: (open: boolean) => void }) => {
    const { session, setSession } = useSession();

    const assetType = useMemo(() => {
        if (typeIds.length !== 1) return undefined;
        return session.assetTypes.find(at => at.id === typeIds[0]);
    }, [typeIds, session.assetTypes]);
    const [fields, setFields] = useState<AssetTypeField[]>([]);
    const [fieldCache, setFieldCache] = useState<AssetTypeField[]>([]);

    useEffect(() => {
        if (assetType) {
            setFields(assetType.fields as AssetTypeField[]);
            setFieldCache(assetType.fields as AssetTypeField[]);
        }
    }, [assetType]);

    const addField = () => {
        const newField: AssetTypeField = {
            id: fields.reduce((maxId, field) => Math.max(maxId, field.id), 0) + 1,
            name: 'New Field',
            type: AssetFieldType.TEXT,
            options: [],
            required: false,
        };
        setFields([...fields, newField]);
    };

    const handleSubmit = async () => {
        const name = (document.getElementById('edit-name') as HTMLInputElement).value.trim();
        if (!assetType) return;
        if (name.length < 4) {
            toast.error('Name must be at least 4 characters long');
            return;
        }

        const res = await request('POST', '/api/asset-type/edit', {
            assetTypeId: assetType.id,
            updatedName: name,
            updatedFields: fields.map(f => {
                // eslint-disable-next-line
                if (!fieldCache.find(fc => fc.id === f.id)) return { ...f, id: undefined } as any; // new fields get a id from the backend
                return f;
            }),
        });

        if (res.ok) {
            const data = await res.json();
            setSession({ assetTypes: session.assetTypes.map(at => (at.id === assetType.id ? data.updatedAssetType : at)) });
            setFields([]);
        } else {
            console.error(await res.text());
            throw new Error();
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="!max-w-fit">
                <DialogHeader>
                    <DialogTitle>Edit {assetType?.name}</DialogTitle>
                    <DialogDescription>
                        Edit asset type (a blueprint for your assets) by specifying its name, and variables that assets can have.
                    </DialogDescription>
                </DialogHeader>
                <div>
                    <div className="grid gap-4">
                        <div className="grid gap-3">
                            <Label htmlFor="edit-name">Name</Label>
                            <Input id="edit-name" name="edit-name" placeholder="e.G Blog Post" defaultValue={assetType?.name} />
                        </div>
                    </div>

                    <ScrollArea className="w-full h-96 mt-3">
                        <Table>
                            <TableCaption>Asset Type Variables</TableCaption>
                            <TableHeader className="sticky top-0">
                                <TableRow>
                                    <TableHead></TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Options</TableHead>
                                    <TableHead>Required</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {fields.map(field => (
                                    <TableRow key={field.id}>
                                        <TableCell
                                            className="w-[10px] cursor-pointer"
                                            onClick={() => {
                                                setFields(fields.filter(f => f.id !== field.id));
                                                setFieldCache(fieldCache.filter(f => f.id !== field.id));
                                            }}
                                        >
                                            <Trash size={12} />
                                        </TableCell>

                                        <TableCell>
                                            <ScrollArea className="max-w-[200px] overflow-auto">
                                                <div
                                                    className="p-1 focus:outline-none focus:ring-2 focus:ring-ring "
                                                    contentEditable={true}
                                                    suppressContentEditableWarning={true}
                                                    onInput={e =>
                                                        setFields(
                                                            fields.map(f =>
                                                                f.id === field.id
                                                                    ? { ...f, name: (e.target as HTMLDivElement).innerText }
                                                                    : f,
                                                            ),
                                                        )
                                                    }
                                                >
                                                    {fieldCache.find(f => f.id === field.id)?.name || 'New Field'}
                                                </div>
                                            </ScrollArea>
                                        </TableCell>

                                        <TableCell>
                                            <Select
                                                value={field.type + ''}
                                                onValueChange={value => {
                                                    const type = parseInt(value) as AssetFieldType;
                                                    setFields(fields.map(f => (f.id === field.id ? { ...f, type } : f)));
                                                }}
                                            >
                                                <SelectTrigger className="w-[150px]">
                                                    <SelectValue placeholder="Select a type" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectGroup>
                                                        <SelectLabel>Field types</SelectLabel>
                                                        <SelectItem value={AssetFieldType.TEXT + ''}>Text</SelectItem>
                                                        <SelectItem value={AssetFieldType.NUMBER + ''}>Number</SelectItem>
                                                        <SelectItem value={AssetFieldType.CHECKFIELD + ''}>Checkfield</SelectItem>
                                                    </SelectGroup>
                                                </SelectContent>
                                            </Select>
                                        </TableCell>

                                        <TableCell>-</TableCell>

                                        <TableCell>
                                            <Switch
                                                checked={field.required}
                                                onCheckedChange={checked => {
                                                    setFields(fields.map(f => (f.id === field.id ? { ...f, required: checked } : f)));
                                                }}
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))}

                                {/* Add Item */}
                                <TableRow className="hover:bg-accent cursor-pointer" onClick={addField}>
                                    <TableCell></TableCell>
                                    <TableCell className="flex items-center gap-2">
                                        <BadgePlus size={16} /> Add item
                                    </TableCell>
                                    <TableCell></TableCell>
                                    <TableCell></TableCell>
                                    <TableCell></TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button
                            className="w-full"
                            onClick={() =>
                                toast.promise(handleSubmit, {
                                    loading: 'Updating asset type...',
                                    success: 'Asset type updated successfully',
                                    error: 'Failed to update asset type',
                                })
                            }
                        >
                            Submit
                        </Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
