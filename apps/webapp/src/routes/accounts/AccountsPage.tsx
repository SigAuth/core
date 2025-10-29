import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useSession } from '@/context/SessionContext';
import { CreateAccountDialog } from '@/routes/accounts/CreateAccountDialog';
import { DeleteAccountDialog } from '@/routes/accounts/DeleteAccountDialog';
import { EditAccountDialog } from '@/routes/accounts/EditAccountDialog';
import { PermissionSetAccountDialog } from '@/routes/accounts/PermissionSetAccountDialog';
import type { AccountWithPermissions } from '@sigauth/prisma-wrapper/prisma-extended';
import { Axe, Edit, Trash } from 'lucide-react';
import { useState } from 'react';

export const AccountsPage: React.FC = () => {
    const { session } = useSession();

    const [editAccount, setEditAccount] = useState<AccountWithPermissions | undefined>(undefined);
    const [deleteAccount, setDeleteAccount] = useState<AccountWithPermissions | undefined>(undefined);
    const [setPermissionAccount, updateSetPermissionAccount] = useState<AccountWithPermissions | undefined>(undefined);

    return (
        <>
            <h2 className="scroll-m-20 text-3xl font-semibold">Manage Accounts</h2>
            <p className="leading-7 text-accent-foreground">
                Create and manage your accounts here. You can create, edit, grant or delete them as you wish.
            </p>

            <Card className="w-full py-2! p-2">
                <CreateAccountDialog />
                <EditAccountDialog account={editAccount} close={() => setEditAccount(undefined)} />
                <DeleteAccountDialog account={deleteAccount} close={() => setDeleteAccount(undefined)} />
                <PermissionSetAccountDialog account={setPermissionAccount} close={() => updateSetPermissionAccount(undefined)} />

                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[100px]">ID</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Related Containers</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {session.accounts.map(account => (
                            <TableRow key={account.id}>
                                <TableCell className="w-[100px]">{account.id}</TableCell>
                                <TableCell>{account.name}</TableCell>
                                <TableCell>{account.email}</TableCell>
                                <TableCell>{new Set(account.permissions.map(p => p.containerId)).size}</TableCell>
                                <TableCell className="text-right flex justify-end gap-2">
                                    <Button variant="outline" size="icon" onClick={() => setEditAccount(account)}>
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button variant="outline" size="icon" onClick={() => updateSetPermissionAccount(account)}>
                                        <Axe className="h-4 w-4" />
                                    </Button>
                                    <Button variant="outline" size="icon" onClick={() => setDeleteAccount(account)}>
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
