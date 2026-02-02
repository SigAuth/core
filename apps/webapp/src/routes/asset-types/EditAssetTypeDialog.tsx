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
import { AssetFieldType, type AssetTypeField } from '@sigauth/generics/asset';
import { BadgePlus, Trash } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

export const EditAssetTypeDialog = ({
    typeUuids,
    open,
    setOpen,
}: {
    typeUuids: string[];
    open: boolean;
    setOpen: (open: boolean) => void;
}) => {
    const { session, setSession } = useSession();

    const assetType = useMemo(() => {
        if (typeUuids.length !== 1) return undefined;
        return session.assetTypes.find(at => at.uuid === typeUuids[0]);
    }, [typeUuids, session.assetTypes]);

    const [fields, setFields] = useState<({ updatedName?: string } & AssetTypeField)[]>([]);

    useEffect(() => {
        if (assetType) {
            setFields(assetType.fields as ({ updatedName?: string } & AssetTypeField)[]);
        }
    }, [assetType]);

    const addField = () => {
        const newField: AssetTypeField = {
            name: 'New-Field',
            type: AssetFieldType.TEXT,
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
            assetTypeUuid: assetType.uuid,
            updatedName: name,
            updatedFields: fields,
        });

        if (res.ok) {
            const data = await res.json();
            setSession({ assetTypes: session.assetTypes.map(at => (at.uuid === assetType.uuid ? data.updatedAssetType : at)) });
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
                                    <TableRow key={field.name}>
                                        <TableCell
                                            className="w-[10px] cursor-pointer"
                                            onClick={() => {
                                                setFields(fields.filter(f => f.name !== field.name));
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
                                                                f.name === field.name
                                                                    ? { ...f, updatedName: (e.target as HTMLDivElement).innerText }
                                                                    : f,
                                                            ),
                                                        )
                                                    }
                                                >
                                                    {fields.find(f => f.name === field.name)?.updatedName ||
                                                        fields.find(f => f.name === field.name)?.name ||
                                                        'New Field'}
                                                </div>
                                            </ScrollArea>
                                        </TableCell>

                                        <TableCell>
                                            <Select
                                                value={field.type + ''}
                                                onValueChange={value => {
                                                    const type = parseInt(value) as AssetFieldType;
                                                    setFields(fields.map(f => (f.name === field.name ? { ...f, type } : f)));
                                                }}
                                            >
                                                <SelectTrigger className="w-[150px]">
                                                    <SelectValue placeholder="Select a type" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectGroup>
                                                        <SelectLabel>Field types</SelectLabel>
                                                        <SelectItem value={AssetFieldType.TEXT + ''}>Text</SelectItem>
                                                        <SelectItem value={AssetFieldType.INTEGER + ''}>Number</SelectItem>
                                                        <SelectItem value={AssetFieldType.BOOLEAN + ''}>Checkfield</SelectItem>
                                                    </SelectGroup>
                                                </SelectContent>
                                            </Select>
                                        </TableCell>

                                        <TableCell>-</TableCell>

                                        <TableCell>
                                            <Switch
                                                checked={field.required}
                                                onCheckedChange={checked => {
                                                    setFields(fields.map(f => (f.name === field.name ? { ...f, required: checked } : f)));
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

