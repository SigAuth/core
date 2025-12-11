import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useSession } from '@/context/SessionContext';
import { request } from '@/lib/utils';
import { CodeEditor } from '@/routes/mirror/CodeEditor';
import { CreateMirrorDialog } from '@/routes/mirror/CreateMirrorDialog';
import { DeleteMirrorDialog } from '@/routes/mirror/DeleteMirrorDialog';
import { EditMirrorDialog } from '@/routes/mirror/EditMirrorDialog';
import type { Mirror } from '@sigauth/generics/prisma-client';
import { Check, Code, Edit, Play, Save, Trash, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export const MirrorPage: React.FC = () => {
    const { session, setSession } = useSession();
    const [code, setCode] = useState<string>('// Write your mirror code here');
    const [currentRun, setCurrentRun] = useState<string>('');

    const [editMirror, setEditMirror] = useState<Mirror | null>(null);
    const [deleteMirror, setDeleteMirror] = useState<Mirror | null>(null);
    const [selectedMirror, setSelectedMirror] = useState<Mirror | null>(null);

    const saveCode = async () => {
        if (selectedMirror) {
            // Here you would typically send the updated code to your backend to save it
            const res = await request('POST', '/api/mirror/edit', {
                id: selectedMirror.id,
                name: selectedMirror.name,
                autoRun: selectedMirror.autoRun,
                autoRunInterval: selectedMirror.autoRunInterval,
                code: code,
            });

            if (!res.ok) {
                console.error('Failed to save code');
            } else {
                setSession({
                    mirrors: session.mirrors.map(m => (m.id === selectedMirror.id ? { ...m, code: code } : m)),
                });
            }
        }
    };

    const runCode = async (method: 'init' | 'run') => {
        if (selectedMirror) {
            setCurrentRun(method);
            const res = await request('POST', `/api/mirror/run?method=${method}`, {
                id: selectedMirror.id,
                code: code,
            });

            // read chunk by chunk

            setCurrentRun('');
        }
    };

    // save on STRG + S
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.ctrlKey && (event.key === 's' || event.key === 'S')) {
                event.preventDefault();
                // optional: nur speichern, wenn ein Mirror ausgewählt ist
                if (selectedMirror) {
                    toast.promise(saveCode, {
                        position: 'bottom-right',
                        loading: 'Saving code...',
                        success: 'Code saved successfully',
                        error: 'Failed to save code',
                    });
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [saveCode, selectedMirror]);

    return (
        <>
            <h2 className="scroll-m-20 text-3xl font-semibold">Manage Mirrors</h2>

            <p className="leading-7 text-accent-foreground">
                Create and manage your mirrors here. You can create, edit, or delete them as you wish.
            </p>
            <Card className="w-full py-2! p-2 mb-6">
                <CreateMirrorDialog />
                <EditMirrorDialog mirror={editMirror} reset={() => setEditMirror(null)} />
                <DeleteMirrorDialog mirror={deleteMirror} close={() => setDeleteMirror(null)} />

                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[100px]">ID</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Auto-Run</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {session.mirrors.map(mirror => (
                            <TableRow key={mirror.id}>
                                <TableCell className="w-[100px]">{mirror.id}</TableCell>
                                <TableCell>{mirror.name}</TableCell>
                                <TableCell>{mirror.autoRun ? `Every ${mirror.autoRunInterval} min` : 'No'}</TableCell>
                                <TableCell>
                                    {mirror.lastResult == 'OK' ? (
                                        <Badge className="scale-110 py-1 dark:bg-green-900 bg-green-200">
                                            <Check />
                                        </Badge>
                                    ) : !mirror.lastResult ? (
                                        <Badge className="scale-110 py-1 " variant="default" color="gray">
                                            ?
                                        </Badge>
                                    ) : (
                                        <Badge className="scale-110 py-1 " variant="destructive">
                                            <X />
                                        </Badge>
                                    )}
                                </TableCell>
                                <TableCell className="justify-end flex gap-2">
                                    <Button variant="outline" size="sm" onClick={() => setSelectedMirror(mirror)}>
                                        <Code />
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => setEditMirror(mirror)}>
                                        <Edit />
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => setDeleteMirror(mirror)}>
                                        <Trash />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Card>
            {selectedMirror && (
                <div className="grid xl:grid-cols-2 gap-2">
                    <div className="animate-in fade-in slide-in-from-left-10 duration-500 ease-out relative">
                        <CodeEditor key={selectedMirror.id} code={selectedMirror.code || ''} setCode={setCode} />
                        <div className="absolute bottom-5 right-5 z-40 flex gap-2">
                            <Button variant="ghost" onClick={() => setSelectedMirror(null)}>
                                <X />
                            </Button>
                            <Button
                                onClick={async () => {
                                    toast.promise(saveCode, {
                                        position: 'bottom-right',
                                        loading: 'Saving code...',
                                        success: 'Code saved successfully',
                                        error: 'Failed to save code',
                                    });
                                }}
                            >
                                <Save />
                            </Button>
                        </div>
                    </div>
                    <div className="animate-in fade-in slide-in-from-right-10 delay-000 duration-500 ease-out dark:bg-[#1e1e1e] p-3 rounded-xl h-fit">
                        <h6 className="scroll-m-20 text-xl font-semibold mb-2">Execution Panel</h6>
                        <div className="flex gap-2">
                            <Button disabled={currentRun.length > 0} onClick={() => runCode('init')}>
                                {currentRun === 'init' ? <LoadingSpinner /> : <Play />}
                                Init
                            </Button>
                            <Button disabled={currentRun.length > 0} onClick={() => runCode('run')}>
                                {currentRun === 'run' ? <LoadingSpinner /> : <Play />}
                                Run
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
