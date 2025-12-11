import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useSession } from '@/context/SessionContext';
import { request } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Mirror } from '@sigauth/generics/prisma-client';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

const formSchema = z.object({
    name: z.string().min(4).max(32),
    autoRun: z.boolean(),
    autoRunInterval: z.number().min(1),
});

export const EditMirrorDialog = ({ mirror, reset }: { mirror?: Mirror; reset: () => void }) => {
    const { session, setSession } = useSession();

    const submitToApi = async (values: z.infer<typeof formSchema>) => {
        const res = await request('POST', 'api/mirror/edit', { id: mirror!.id, ...values });

        if (res.ok) {
            const data = await res.json();
            setSession({ mirrors: session.mirrors.map(m => (m.id === data.mirror.id ? data.mirror : m)) });
            reset();
            return;
        }
        throw new Error((await res.json()).message || 'Failed to create mirror');
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

    if (!mirror) return null;
    return (
        <Dialog open={true} onOpenChange={() => reset()}>
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
                                    loading: 'Creating Mirror...',
                                    success: 'Mirror created successfully',
                                    error: (err: Error) => err?.message || 'Failed to create mirror',
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
                                Create
                            </Button>
                        </form>
                    </Form>
                </div>
            </DialogContent>
        </Dialog>
    );
};
