import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useSession } from '@/context/SessionContext';
import { CreateContainerDialog } from '@/routes/container/CreateContainerDialog';
import { DeleteContainerDialog } from '@/routes/container/DeleteContainer';
import { EditContainerDialog } from '@/routes/container/EditContainerDialog';
import type { Container } from '@sigauth/prisma-wrapper/prisma-types';
import { PROTECTED } from '@sigauth/prisma-wrapper/protected';
import { Edit, Trash } from 'lucide-react';
import { useState } from 'react';

export const ContainerPage: React.FC = () => {
    const { session } = useSession();

    const [editContainer, setEditContainer] = useState<Container | undefined>(undefined);
    const [deleteContainer, setDeleteContainer] = useState<Container | undefined>(undefined);

    return (
        <>
            <h2 className="scroll-m-20 text-3xl font-semibold">Manage Containers</h2>
            <p className="leading-7 text-accent-foreground">
                Create and manage your containers here. You can create, edit, or delete them as you wish.
            </p>

            <Card className="w-full py-2! p-2">
                <CreateContainerDialog />
                <DeleteContainerDialog container={deleteContainer} close={() => setDeleteContainer(undefined)} />
                <EditContainerDialog container={editContainer} close={() => setEditContainer(undefined)} />

                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[100px]">ID</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Assets</TableHead>
                            <TableHead>Applications</TableHead>
                            <TableHead>Accounts</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {session.containers.map(container => (
                            <TableRow key={container.id}>
                                <TableCell className="w-[100px]">{container.id}</TableCell>
                                <TableCell>{container.name}</TableCell>
                                <TableCell>{container.assets.length}</TableCell>
                                <TableCell>{container.apps.length}</TableCell>
                                <TableCell>
                                    {session.accounts.filter(a => a.permissions.some(p => p.containerId == container.id)).length}
                                </TableCell>
                                <TableCell className="flex gap-2 items-center justify-end">
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => setEditContainer(container)}
                                        disabled={container.id === PROTECTED.Container.id}
                                    >
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => setDeleteContainer(container)}
                                        disabled={container.id === PROTECTED.Container.id}
                                    >
                                        <Trash className="h-4 w-4" />
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
