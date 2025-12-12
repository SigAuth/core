import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useSession } from '@/context/SessionContext';
import { request } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { Edit } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

const formSchema = z.object({
    name: z.string().min(4).max(32),
    autoRun: z.boolean(),
    autoRunInterval: z.number().min(1),
});

export const EditMirrorDialog = ({
    mirrorIds,
    open,
    setOpen,
}: {
    mirrorIds: number[];
    open: boolean;
    setOpen: (open: boolean) => void;
}) => {
    const { session, setSession } = useSession();

    const mirror = useMemo(() => {
        if (mirrorIds.length !== 1) return undefined;
        return session.mirrors.find(m => m.id === mirrorIds[0]);
    }, [mirrorIds, session.mirrors]);
    const submitToApi = async (values: z.infer<typeof formSchema>) => {
        if (!mirror) throw new Error('Mirror not found');
        const res = await request('POST', 'api/mirror/edit', { id: mirror.id, ...values, code: mirror.code });

        setOpen(false);
        if (res.ok) {
            const data = await res.json();
            setSession({ mirrors: session.mirrors.map(m => (m.id === data.id ? data : m)) });
            return;
        }
        throw new Error((await res.json()).message || 'Failed to edit mirror');
    };

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: mirror?.name || '',
            autoRun: mirror?.autoRun || false,
            autoRunInterval: mirror?.autoRunInterval || 5,
        },
        mode: 'onChange',
    });

    useEffect(() => {
        if (mirror) {
            form.reset({
                name: mirror?.name || '',
                autoRun: mirror?.autoRun || false,
                autoRunInterval: mirror?.autoRunInterval || 5,
            });
        }
    }, [mirror]);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button disabled={mirrorIds.length !== 1} size="icon-lg" variant="ghost" className="w-fit">
                    <Edit />
                </Button>
            </DialogTrigger>
            <DialogContent className="!max-w-fit">
                <DialogHeader>
                    <DialogTitle>Edit your mirror</DialogTitle>
                    <DialogDescription>Change the form below to edit your mirror.</DialogDescription>
                </DialogHeader>
                <div>
                    <Form {...form}>
                        <form
                            onSubmit={(e: React.FormEvent) => {
                                e.preventDefault();
                                if (!form.formState.isValid) return;
                                toast.promise(form.handleSubmit(submitToApi), {
                                    loading: 'Editing...',
                                    success: 'Edited successfully',
                                    error: (err: Error) => err?.message || 'Failed to edit',
                                });
                            }}
                            className="space-y-8"
                        >
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Mirror Name</FormLabel>
                                        <FormDescription>Enter the name of the mirror</FormDescription>
                                        <FormControl>
                                            <Input placeholder="My Mirror" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="autoRunInterval"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Auto-Run Interval (minutes)</FormLabel>
                                        <FormDescription>Set the interval at which this mirror will automatically run</FormDescription>
                                        <FormControl>
                                            <Input placeholder="5" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="autoRun"
                                render={({ field }) => (
                                    <FormItem>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <FormLabel>Enable Auto-Run</FormLabel>
                                                <FormDescription className="w-[70%]">
                                                    Automatically run this mirror at regular intervals
                                                </FormDescription>
                                            </div>
                                            <FormControl>
                                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                                            </FormControl>
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button className="w-full" type="submit">
                                Edit
                            </Button>
                        </form>
                    </Form>
                </div>
            </DialogContent>
        </Dialog>
    );
};
