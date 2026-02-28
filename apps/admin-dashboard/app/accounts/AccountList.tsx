'use client';

import { Checkbox } from '@/components/ui/checkbox';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { LIST_DEFAULT_PAGE_SIZE } from '@/lib/utils';
import { Account } from '@sigauth/sdk/fundamentals';
import { ColumnDef, PaginationState, SortingState } from '@tanstack/react-table';
import { Edit, EllipsisVertical, Hammer, MonitorX, Trash, User, UserRoundPlus, UserRoundX } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

const AccountList = ({ accounts }: { accounts: Account[] }) => {
    const pageSize = LIST_DEFAULT_PAGE_SIZE;
    const [permissionDialogOpen, setPermissionDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [toggleAccountDialogOpen, setToggleAccountDialogOpen] = useState<string>('');

    const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize });
    const [rowSelection, setRowSelection] = useState({});
    const [data, setData] = useState<Account[]>(accounts);

    const [globalFilter, setGlobalFilter] = useState('');
    const [sorting, setSorting] = useState<SortingState>([
        {
            id: 'username',
            desc: false,
        },
    ]);

    const columns: ColumnDef<Account>[] = [
        {
            id: 'select',
            maxSize: 1,
            header: ({ table }) => (
                <Checkbox
                    checked={table.getIsAllPageRowsSelected() || table.getIsSomePageRowsSelected()}
                    onCheckedChange={value => table.toggleAllPageRowsSelected(!!value)}
                    aria-label="Select all"
                />
            ),
            cell: ({ row }) => (
                <Checkbox checked={row.getIsSelected()} onCheckedChange={value => row.toggleSelected(!!value)} aria-label="Select row" />
            ),
            enableSorting: false,
        },
        {
            header: 'Name',
            accessorKey: 'username',
            cell: ({ row, getValue }) => {
                const isDeactivated = row.original.deactivated;

                return (
                    <div className="flex items-center gap-2">
                        {
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        {isDeactivated ? (
                                            <UserRoundX className="size-4 text-destructive" aria-label="Deactivated account" />
                                        ) : (
                                            <User className="size-4" aria-label="Account Icon" />
                                        )}
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="flex flex-col gap-1">
                                        <span>ID: {row.original.uuid}</span>
                                        {isDeactivated && <span>Account is deactivated</span>}
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        }

                        <span>{getValue<string>()}</span>
                    </div>
                );
            },
        },
        { header: 'E-Mail', accessorKey: 'email', cell: info => info.getValue() },
        {
            header: 'Actions',
            id: 'actions',
            cell: ({ row }) => (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <EllipsisVertical />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem
                            onClick={() => {
                                setPermissionDialogOpen(true);
                                setRowSelection({ [row.index]: true });
                            }}
                        >
                            <Hammer className="mr-2 size-4" />
                            Permissions
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => {
                                setRowSelection({ [row.index]: true });
                                setEditDialogOpen(true);
                            }}
                        >
                            <Edit className="mr-2 size-4" />
                            Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => {
                                toast.promise(logOutAll(row.original.uuid), {
                                    position: 'bottom-right',
                                    loading: 'Signing out everywhere...',
                                    success: 'Signed out everywhere successfully',
                                    error: 'Failed to sign out everywhere',
                                });
                            }}
                        >
                            <MonitorX className="mr-2 size-4" />
                            Sign out everywhere
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onClick={() => {
                                setToggleAccountDialogOpen(row.original.uuid);
                            }}
                        >
                            {row.original.deactivated ? <UserRoundPlus className="mr-2 size-4" /> : <UserRoundX className="mr-2 size-4" />}
                            {row.original.deactivated ? 'Activate' : 'Deactivate'}
                        </DropdownMenuItem>

                        <DropdownMenuItem
                            onClick={() => {
                                setRowSelection({ [row.index]: true });
                                setDeleteDialogOpen(true);
                            }}
                        >
                            <Trash className="mr-2 size-4" />
                            Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            ),
        },
    ];

    const logOutAll = async (accountId: string) => {
        // const res = await request('POST', `/api/account/logout-all`, { accountId });
        // if (!res.ok) throw new Error('Failed to sign out everywhere');
        // if (accountId === session.account.uuid) {
        //     logout();
        //     window.location.reload();
        // }
    };

    return <div></div>;
};

export default AccountList;

