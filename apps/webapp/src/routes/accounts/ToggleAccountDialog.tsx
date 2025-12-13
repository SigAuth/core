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

export const ToggleAccountDialog = ({
    accountIds,
    open,
    setOpen,
    action,
}: {
    accountIds?: number[];
    open: boolean;
    setOpen: (open: boolean) => void;
    action: 'deactivate' | 'activate';
}) => {
    const { session, setSession } = useSession();

    const handleSubmit = async () => {
        const accounts = session.accounts.filter(a => accountIds?.includes(a.id));
        if (accounts.length !== accountIds?.length || accounts.length === 0) return;

        const res = await request('POST', `/api/account/${action}`, {
            accountIds,
        });

        if (res.ok) {
            setSession({
                accounts: session.accounts.map(acc =>
                    accountIds?.includes(acc.id) ? { ...acc, deactivated: action === 'deactivate' } : acc,
                ),
            });
        }
    };

    const isDeactivate = action === 'deactivate';

    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogContent>
                <AlertDialogHeader className="items-center">
                    <div className="bg-destructive/10 mx-auto mb-2 flex size-12 items-center justify-center rounded-full">
                        <TriangleAlertIcon className="text-destructive size-6" />
                    </div>
                    <AlertDialogTitle>Are you sure you want to {action}?</AlertDialogTitle>
                    <AlertDialogDescription className="text-center">
                        The selected {accountIds?.length ?? 0} account(s) will be {action}d and{' '}
                        {isDeactivate ? 'cannot log in anymore' : 'can log in again'}.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction asChild>
                        <Button
                            className={`${isDeactivate ? 'bg-destructive' : ''}`}
                            onClick={() =>
                                toast.promise(handleSubmit, {
                                    position: 'bottom-right',
                                    loading: `${isDeactivate ? 'Deactivating' : 'Activating'}...`,
                                    success: `${action.charAt(0).toUpperCase() + action.slice(1)}d successfully`,
                                    error: `Failed to ${action}`,
                                })
                            }
                        >
                            {isDeactivate ? 'Deactivate' : 'Activate'}
                        </Button>
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};
