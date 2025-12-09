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
import type { AssetType } from '@sigauth/generics/prisma-types';
import { TriangleAlertIcon } from 'lucide-react';
import { toast } from 'sonner';

export const DeleteAssetTypeDialog = ({ assetType, close }: { assetType?: AssetType; close: () => void }) => {
    const { session, setSession } = useSession();

    const handleSubmit = async () => {
        if (!assetType) return;

        const res = await request('POST', '/api/asset-type/delete', {
            assetTypeIds: [assetType.id],
        });

        if (res.ok) {
            setSession({ assetTypes: session.assetTypes.filter(at => at.id !== assetType.id) });
        } else {
            console.error(await res.text());
            throw new Error();
        }
    };

    if (!assetType) return null;

    return (
        <AlertDialog open={true} onOpenChange={() => close()}>
            <AlertDialogContent className="!max-w-fit">
                <AlertDialogHeader className="items-center">
                    <div className="bg-destructive/10 mx-auto mb-2 flex size-12 items-center justify-center rounded-full">
                        <TriangleAlertIcon className="text-destructive size-6" />
                    </div>
                    <AlertDialogTitle>Are you absolutely sure you want to delete?</AlertDialogTitle>
                    <AlertDialogDescription className="text-center">
                        This action cannot be undone. This will permanently delete the asset type and remove all related assets with it.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction asChild>
                        <Button
                            className="bg-destructive dark:bg-destructive/60 hover:bg-destructive focus-visible:ring-destructive text-white"
                            onClick={() =>
                                toast.promise(handleSubmit, {
                                    loading: 'Deleting asset type...',
                                    success: 'Asset type deleted successfully',
                                    error: 'Failed to delete asset type',
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
