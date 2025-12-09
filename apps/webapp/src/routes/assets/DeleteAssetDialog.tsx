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
import type { Asset } from '@sigauth/generics/prisma-types';
import { TriangleAlertIcon } from 'lucide-react';
import { toast } from 'sonner';

export const DeleteAssetDialog = ({ asset, close }: { asset?: Asset; close: () => void }) => {
    const { session, setSession } = useSession();

    const handleSubmit = async () => {
        if (!asset) return;

        const res = await request('POST', '/api/asset/delete', {
            assetIds: [asset.id],
        });

        if (res.ok) {
            setSession({ assets: session.assets.filter(a => a.id !== asset.id) });
        } else {
            console.error(await res.text());
            throw new Error();
        }
    };

    if (!asset) return null;
    return (
        <AlertDialog open={true} onOpenChange={() => close()}>
            <AlertDialogContent className="!max-w-fit">
                <AlertDialogHeader className="items-center">
                    <div className="bg-destructive/10 mx-auto mb-2 flex size-12 items-center justify-center rounded-full">
                        <TriangleAlertIcon className="text-destructive size-6" />
                    </div>
                    <AlertDialogTitle>Are you absolutely sure you want to delete?</AlertDialogTitle>
                    <AlertDialogDescription className="text-center">
                        This action cannot be undone. This will permanently delete the asset and remove all related data with it.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction asChild>
                        <Button
                            className="bg-destructive dark:bg-destructive/60 hover:bg-destructive focus-visible:ring-destructive text-white"
                            onClick={() =>
                                toast.promise(handleSubmit, {
                                    loading: 'Deleting asset...',
                                    success: 'Asset deleted successfully',
                                    error: 'Failed to delete asset',
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
