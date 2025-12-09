import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useSession } from '@/context/SessionContext';
import { CreateAppDialog } from '@/routes/apps/CreateAppDialog';
import { DeleteAppDialog } from '@/routes/apps/DeleteAppDialog';
import { EditAppDialog } from '@/routes/apps/EditAppDialog';
import type { AppPermission } from '@sigauth/prisma-wrapper/json-types';
import type { App } from '@sigauth/prisma-wrapper/prisma-types';
import { PROTECTED } from '@sigauth/prisma-wrapper/protected';
import { Copy, Edit, Trash } from 'lucide-react';
import { useState } from 'react';

export const AppsPage = () => {
    const { session } = useSession();

    const [configureApp, setConfigureApp] = useState<App | undefined>(undefined);
    const [deleteApp, setDeleteApp] = useState<App | undefined>(undefined);

    return (
        <>
            <h2 className="scroll-m-20 text-3xl font-semibold">Manage Apps</h2>
            <p className="leading-7 text-accent-foreground">
                Create and manage your apps here. You can create, edit, or delete them as you wish.
            </p>

            <Card className="w-full py-2! p-2">
                <CreateAppDialog />
                <EditAppDialog app={configureApp} close={() => setConfigureApp(undefined)} />
                <DeleteAppDialog app={deleteApp} close={() => setDeleteApp(undefined)} />

                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[100px]">ID</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>URL</TableHead>
                            <TableHead>API Token</TableHead>
                            <TableHead>Web Fetch</TableHead>
                            <TableHead>Containers</TableHead>
                            <TableHead>Permissions</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {session.apps.map(app => (
                            <TableRow key={app.id}>
                                <TableCell className="w-[100px]">{app.id}</TableCell>
                                <TableCell>{app.name}</TableCell>
                                <TableCell>{app.url}</TableCell>
                                <TableCell>
                                    {app.token.slice(0, 6)}...{app.token.slice(-4)}
                                    <Button
                                        onClick={() => navigator.clipboard.writeText(app.token)}
                                        className="ring-offset-background hover:ring-primary/90 transition-all duration-300 hover:ring-2 ml-3 hover:ring-offset-2"
                                        size={'sm'}
                                    >
                                        <Copy />
                                    </Button>
                                </TableCell>
                                <TableCell>{app.webFetch ? 'Enabled' : 'Disabled'}</TableCell>
                                <TableCell>
                                    {session.containers.filter(c => (c.apps as number[]).includes(app.id)).map(c => c.name).length}
                                </TableCell>
                                <TableCell>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <span>{(app.permissions as AppPermission).asset.length} </span>
                                        </TooltipTrigger>
                                        <TooltipContent>Asset permissions</TooltipContent>
                                    </Tooltip>
                                    /
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <span> {(app.permissions as AppPermission).container.length} </span>
                                        </TooltipTrigger>
                                        <TooltipContent>Container permissions</TooltipContent>
                                    </Tooltip>
                                    /
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <span> {(app.permissions as AppPermission).root.length} </span>
                                        </TooltipTrigger>
                                        <TooltipContent>Root permissions</TooltipContent>
                                    </Tooltip>
                                </TableCell>
                                <TableCell className="text-right justify-end flex gap-2">
                                    <Button
                                        disabled={app.id == PROTECTED.App.id}
                                        variant="outline"
                                        size="icon"
                                        onClick={() => setConfigureApp(app)}
                                    >
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        disabled={app.id == PROTECTED.App.id}
                                        variant="outline"
                                        size="icon"
                                        onClick={() => setDeleteApp(app)}
                                    >
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
