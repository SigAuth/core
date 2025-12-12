import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useSession } from '@/context/SessionContext';
import { request } from '@/lib/utils';
import { Trash, TriangleAlertIcon } from 'lucide-react';
import { toast } from 'sonner';

export const DeleteMirrorDialog = ({
    mirrorIds,
    open,
    setOpen,
}: {
    mirrorIds: number[];
    open: boolean;
    setOpen: (open: boolean) => void;
}) => {
    const { session, setSession } = useSession();

    const handleSubmit = async () => {
        if (mirrorIds.length === 0) return;

        const res = await request('POST', '/api/mirror/delete', {
            ids: mirrorIds,
        });

        if (res.ok) {
            setSession({ mirrors: session.mirrors.filter(m => !mirrorIds.includes(m.id)) });
        } else {
            console.error(await res.text());
            throw new Error();
        }
    };

    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon-lg" disabled={mirrorIds.length === 0} className="w-fit">
                    <Trash />
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader className="items-center">
                    <div className="bg-destructive/10 mx-auto mb-2 flex size-12 items-center justify-center rounded-full">
                        <TriangleAlertIcon className="text-destructive size-6" />
                    </div>
                    <AlertDialogTitle>Are you absolutely sure you want to delete?</AlertDialogTitle>
                    <AlertDialogDescription className="text-center">
                        This action cannot be undone. This will permanently delete the mirror and remove all related data with it.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction asChild>
                        <Button
                            className="bg-destructive dark:bg-destructive/60 hover:bg-destructive focus-visible:ring-destructive text-white"
                            onClick={() =>
                                toast.promise(handleSubmit, {
                                    loading: 'Deleting mirror...',
                                    success: 'Mirror deleted successfully',
                                    error: 'Failed to delete mirror',
                                })
                            }
                        >
                            Delete
                        </Button>
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};
