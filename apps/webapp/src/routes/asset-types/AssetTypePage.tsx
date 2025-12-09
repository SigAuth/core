import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useSession } from '@/context/SessionContext';
import { CreateAssetTypeDialog } from '@/routes/asset-types/CreateAssetTypeDialog';
import { DeleteAssetTypeDialog } from '@/routes/asset-types/DeleteAssetTypeDialog';
import { EditAssetTypeDialog } from '@/routes/asset-types/EditAssetTypeDialog';
import type { AssetTypeField } from '@sigauth/generics/json-types';
import type { AssetType } from '@sigauth/generics/prisma-types';
import { PROTECTED } from '@sigauth/generics/protected';
import { Edit, Trash } from 'lucide-react';
import { useState } from 'react';

export const AssetTypePage: React.FC = () => {
    const { session } = useSession();

    const [editAssetType, setEditAssetType] = useState<AssetType | undefined>(undefined);
    const [deleteAssetType, setDeleteAssetType] = useState<AssetType | undefined>(undefined); // support bulk delete later on

    return (
        <>
            <h2 className="scroll-m-20 text-3xl font-semibold">Manage Asset Types</h2>
            <p className="leading-7 text-accent-foreground">
                Create and manage your blueprints for assets here. You can define variables and
            </p>

            <Card className="w-full py-2! p-2">
                <CreateAssetTypeDialog />
                <EditAssetTypeDialog assetType={editAssetType} close={() => setEditAssetType(undefined)} />
                <DeleteAssetTypeDialog assetType={deleteAssetType} close={() => setDeleteAssetType(undefined)} />

                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[100px]">ID</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Fields</TableHead>
                            <TableHead>Assets</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {session.assetTypes.map(assetType => (
                            <TableRow key={assetType.id}>
                                <TableCell className="w-[45px]">{assetType.id}</TableCell>
                                <TableCell>{assetType.name}</TableCell>
                                <TableCell>{(assetType.fields as AssetTypeField[]).length}</TableCell>
                                <TableCell>{session.assets.filter(a => a.typeId === assetType.id).length}</TableCell>
                                <TableCell className="justify-end flex gap-2 items-center">
                                    <Button
                                        disabled={assetType.id === PROTECTED.AssetType.id}
                                        variant="outline"
                                        size="icon"
                                        onClick={() => setEditAssetType(assetType)}
                                    >
                                        <Edit className="h-4 w-4" />
                                        <span className="sr-only">Edit</span>
                                    </Button>
                                    <Button
                                        disabled={assetType.id === PROTECTED.AssetType.id}
                                        variant="outline"
                                        size="icon"
                                        onClick={() => setDeleteAssetType(assetType)}
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
