import { Button } from '@/components/ui/button';
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
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useSession } from '@/context/SessionContext';
import { request } from '@/lib/utils';
import { AssetFieldType, type AssetTypeField } from '@sigauth/generics/json-types';
import { BadgePlus, Trash } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export const CreateAssetTypeDialog = () => {
    const { session, setSession } = useSession();

    const [fields, setFields] = useState<AssetTypeField[]>([]);

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
        const name = (document.getElementById('name') as HTMLInputElement).value;
        if (name.length < 4) {
            throw new Error('Name must be at least 4 characters long');
        }

        if (fields.some(f => f.name.length < 4)) {
            throw new Error('All field names must be at least 4 characters long');
        }

        const res = await request('POST', '/api/asset-type/create', {
            name: (document.getElementById('name') as HTMLInputElement).value,
            fields,
        });

        if (res.ok) {
            setSession({ assetTypes: [...session.assetTypes, (await res.json()).assetType] });
            setFields([]);
            return;
        }
        throw new Error('Failed to create asset type');
    };

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button size="icon-lg" variant="ghost" className="w-fit">
                    <BadgePlus />
                </Button>
            </DialogTrigger>
            <DialogContent className="!max-w-fit">
                <DialogHeader>
                    <DialogTitle>Create a new asset type</DialogTitle>
                    <DialogDescription>
                        Define a new asset type (a blueprint for your assets) by specifying its name, and variables that assets can have.
                    </DialogDescription>
                </DialogHeader>
                <div>
                    <div className="grid gap-4">
                        <div className="grid gap-3">
                            <Label htmlFor="name">Name</Label>
                            <Input id="name" name="name" placeholder="e.G Blog Post" />
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
                                            onClick={() => setFields(fields.filter(f => f.id !== field.id))}
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
                                                    New Field
                                                </div>
                                            </ScrollArea>
                                        </TableCell>

                                        <TableCell>
                                            <Select
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
                                    loading: 'Creating asset type...',
                                    success: 'Asset type created successfully',
                                    error: (e: Error) => e.message || 'Failed to create asset type',
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
