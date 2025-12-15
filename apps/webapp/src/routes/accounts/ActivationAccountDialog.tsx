import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useSession } from '@/context/SessionContext';
import { request } from '@/lib/utils';
import { TriangleAlertIcon } from 'lucide-react';
import { toast } from 'sonner';

export const ActivationAccountDialog = ({ open, setOpen }: { open: number; setOpen: (open: number) => void }) => {
    const { session, setSession } = useSession();

    const handleSubmit = async () => {
        const account = session.accounts.find(acc => acc.id === open);
        if (!account) throw new Error('Account not found in session');
        const res = await request('POST', `/api/account/edit`, {
            accountId: open,
            ...account,
            apiAccess: !!account.api,
            deactivated: !account.deactivated,
        });

        if (res.ok) {
            setSession({
                accounts: session.accounts.map(acc => (acc.id === open ? { ...acc, deactivated: !account.deactivated } : acc)),
            });
            setOpen(0);
        } else {
            throw new Error(`Failed to update account activation (${await res.text()})`);
        }
    };

    const isDeactivated = session.accounts.find(acc => acc.id === open)?.deactivated;
    return (
        <AlertDialog open={open != 0} onOpenChange={() => setOpen(0)}>
            <AlertDialogContent>
                <AlertDialogHeader className="items-center">
                    <div className="bg-destructive/10 mx-auto mb-2 flex size-12 items-center justify-center rounded-full">
                        <TriangleAlertIcon className="text-destructive size-6" />
                    </div>
                    <AlertDialogTitle>Are you sure you want to {isDeactivated ? 'activate' : 'deactivate'}?</AlertDialogTitle>
                    <AlertDialogDescription className="text-center">
                        The selected account will be {isDeactivated ? 'activated' : 'deactivated'}, that means{' '}
                        {isDeactivated
                            ? 'his ability to sign in will be restored'
                            : 'he will be logged out in all apps and cannot log in anymore'}
                        .
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction asChild>
                        <Button
                            className={`${isDeactivated ? '' : 'bg-destructive'}`}
                            onClick={() =>
                                toast.promise(handleSubmit, {
                                    position: 'bottom-right',
                                    loading: `${isDeactivated ? 'Activating' : 'Deactivating'}...`,
                                    success: `${isDeactivated ? 'Activated' : 'Deactivated'} successfully`,
                                    error: `Failed to ${isDeactivated ? 'activate' : 'deactivate'}`,
                                })
                            }
                        >
                            {isDeactivated ? 'Activate' : 'Deactivate'}
                        </Button>
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};
