import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useSession } from '@/context/SessionContext';
import { request } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { BadgePlus } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

const formSchema = z.object({
    name: z.string().min(4).max(32),
    autoRun: z.boolean().optional(),
    autoRunInterval: z.number().min(1),
});

export const CreateMirrorDialog = () => {
    const { session, setSession } = useSession();

    const [open, setOpen] = useState(false);

    const submitToApi = async (values: z.infer<typeof formSchema>) => {
        const res = await request('POST', 'api/mirror/create', { ...values });

        if (res.ok) {
            const data = await res.json();
            setOpen(false);
            setSession({ mirrors: [...session.mirrors, data] });
            return;
        }
        throw new Error((await res.json()).message || 'Failed to create mirror');
    };

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: '',
            autoRun: false,
            autoRunInterval: 5,
        },
        mode: 'onChange',
    });
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="icon-lg" variant="ghost" className="w-fit">
                    <BadgePlus />
                </Button>
            </DialogTrigger>
            <DialogContent className="!max-w-fit">
                <DialogHeader>
                    <DialogTitle>Create a mirror</DialogTitle>
                    <DialogDescription>Fill out the form below to create a new mirror.</DialogDescription>
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
                                                <Switch checked={field.value} defaultChecked={false} onCheckedChange={field.onChange} />
                                            </FormControl>
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button className="w-full" type="submit" disabled={!form.formState.isValid}>
                                Create
                            </Button>
                        </form>
                    </Form>
                </div>
            </DialogContent>
        </Dialog>
    );
};
