import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useSession } from '@/context/SessionContext';
import { CreateAssetDialog } from '@/routes/assets/CreateAssetDialog';
import { DeleteAssetDialog } from '@/routes/assets/DeleteAssetDialog';
import { EditAssetDialog } from '@/routes/assets/EditAssetDialog';
import type { Asset } from '@sigauth/generics/prisma-types';
import { PROTECTED } from '@sigauth/generics/protected';
import { Edit, Trash } from 'lucide-react';
import { useState } from 'react';

export const AssetPage: React.FC = () => {
    const { session } = useSession();

    const [editAsset, setEditAsset] = useState<Asset | undefined>(undefined);
    const [deleteAsset, setDeleteAsset] = useState<Asset | undefined>(undefined); // support bulk delete later on

    return (
        <>
            <h2 className="scroll-m-20 text-3xl font-semibold">Manage Assets</h2>
            <p className="leading-7 text-accent-foreground">
                Create and manage your assets here. You can create, edit, or delete them as you wish.
            </p>

            <Card className="w-full py-2! p-2">
                <CreateAssetDialog />
                <DeleteAssetDialog asset={deleteAsset} close={() => setDeleteAsset(undefined)} />
                <EditAssetDialog asset={editAsset} close={() => setEditAsset(undefined)} />

                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[100px]">ID</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {session.assets.map(asset => (
                            <TableRow key={asset.id}>
                                <TableCell className="w-[45px]">{asset.id}</TableCell>
                                <TableCell>{asset.name}</TableCell>
                                <TableCell>{session.assetTypes.find(t => t.id === asset.typeId)?.name || 'Unknown'}</TableCell>
                                <TableCell>
                                    {Object.values(asset.fields as Record<string, string | number | boolean>).length > 0
                                        ? 'Has Fields'
                                        : 'No Fields'}
                                </TableCell>
                                <TableCell className="justify-end flex gap-2 items-center">
                                    <Button
                                        disabled={asset.typeId === PROTECTED.AssetType.id}
                                        variant="outline"
                                        size="icon"
                                        onClick={() => setEditAsset(asset)}
                                    >
                                        <Edit className="h-4 w-4" />
                                        <span className="sr-only">Edit</span>
                                    </Button>
                                    <Button
                                        disabled={asset.typeId === PROTECTED.AssetType.id}
                                        variant="outline"
                                        size="icon"
                                        onClick={() => setDeleteAsset(asset)}
                                    >
                                        <Trash className="h-4 w-4" />
                                        <span className="sr-only">Delete</span>
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Card>
        </>
    );
};
