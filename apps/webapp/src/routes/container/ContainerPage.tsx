import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useSession } from '@/context/SessionContext';
import { ContainerList } from '@/routes/container/ContainerList';
import { CreateContainerDialog } from '@/routes/container/CreateContainerDialog';
import { DeleteContainerDialog } from '@/routes/container/DeleteContainer';
import { EditContainerDialog } from '@/routes/container/EditContainerDialog';
import type { Container } from '@sigauth/generics/prisma-types';
import { PROTECTED } from '@sigauth/generics/protected';
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
                <ContainerList />
            </Card>
        </>
    );
};
