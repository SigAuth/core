import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem } from '@/components/ui/pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useSession } from '@/context/SessionContext';
import { usePagination } from '@/lib/use-pagination';
import { cn, logout, request } from '@/lib/utils';
import type { AccountWithPermissions } from '@sigauth/generics';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import {
    flexRender,
    getCoreRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    type PaginationState,
    type SortingState,
    useReactTable,
    type ColumnDef,
    getFilteredRowModel,
} from '@tanstack/react-table';
import {
    ChevronDownIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    ChevronUpIcon,
    DownloadCloudIcon,
    Edit,
    EllipsisVertical,
    FileSpreadsheetIcon,
    FileTextIcon,
    Hammer,
    MonitorX,
    Trash,
    UserRoundPlus,
    UserRoundX,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { CreateAccountDialog } from '@/routes/accounts/CreateAccountDialog';
import { DeleteAccountDialog } from '@/routes/accounts/DeleteAccountDialog';
import { EditAccountDialog } from '@/routes/accounts/EditAccountDialog';
import { ToggleAccountDialog } from '@/routes/accounts/ToggleAccountDialog';
import { PermissionSetAccountDialog } from '@/routes/accounts/PermissionSetAccountDialog';
import { toast } from 'sonner';

export const AccountsList = () => {
    const pageSize = 20;
    const { session } = useSession();

    const [permissionDialogOpen, setPermissionDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [toggleAccountDialogOpen, setToggleAccountDialogOpen] = useState(false);
    const [toggleAccountAction, setToggleAccountAction] = useState<'activate' | 'deactivate'>('deactivate');

    const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize });
    const [rowSelection, setRowSelection] = useState({});
    const [data, setData] = useState<AccountWithPermissions[]>(session.accounts);

    const [globalFilter, setGlobalFilter] = useState('');
    const [sorting, setSorting] = useState<SortingState>([
        {
            id: 'name',
            desc: false,
        },
    ]);

    useEffect(() => {
        setData(session.accounts);
        setRowSelection({});
    }, [session.accounts]);

    const columns: ColumnDef<AccountWithPermissions>[] = [
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
        { header: 'ID', accessorKey: 'id', maxSize: 1 },
        {
            header: 'Name',
            accessorKey: 'name',
            cell: ({ row, getValue }) => {
                const isDeactivated = row.original.deactivated;

                return (
                    <div className="flex items-center gap-2">
                        <span>{getValue<string>()}</span>

                        {isDeactivated && (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <UserRoundX className="size-4 text-destructive" aria-label="Deactivated account" />
                                    </TooltipTrigger>
                                    <TooltipContent side="top">
                                        <span>Deactivated</span>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
                    </div>
                );
            },
        },
        { header: 'E-Mail', accessorKey: 'email', cell: info => info.getValue() },
        { header: 'Related Containers', accessorFn: row => new Set(row.permissions.map(p => p.containerId)).size },
        { header: 'API Access', accessorKey: 'apiAccess', cell: info => (info.getValue() ? 'Yes' : 'No') },
        {
            header: 'Actions',
            id: 'actions',
            cell: ({ row }) => (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <EllipsisVertical />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        {row.original.api && (
                            <>
                                <DropdownMenuItem>
                                    <FileTextIcon className="mr-2 size-4" />
                                    Copy API Key
                                </DropdownMenuItem>
                            </>
                        )}
                        <DropdownMenuItem
                            onClick={() => {
                                setPermissionDialogOpen(true);
                            }}
                        >
                            <Hammer className="mr-2 size-4" />
                            Permissions
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => {
                                setEditDialogOpen(true);
                            }}
                        >
                            <Edit className="mr-2 size-4" />
                            Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => {
                                toast.promise(logOutAll(row.original.id), {
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
                                setToggleAccountAction(row.original.deactivated ? 'activate' : 'deactivate');
                                setToggleAccountDialogOpen(true);
                            }}
                        >
                            {row.original.deactivated ? <UserRoundPlus className="mr-2 size-4" /> : <UserRoundX className="mr-2 size-4" />}
                            {row.original.deactivated ? 'Activate' : 'Deactivate'}
                        </DropdownMenuItem>

                        <DropdownMenuItem
                            onClick={() => {
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

    const logOutAll = async (accountId: number) => {
        const res = await request('POST', `/api/account/logout-all`, { accountId });
        if (!res.ok) throw new Error('Failed to sign out everywhere');
        if (accountId === session.account.id) {
            logout();
            window.location.reload();
        }
    };

    const exportToCSV = () => {
        const selectedRows = table.getSelectedRowModel().rows;

        const dataToExport =
            selectedRows.length > 0 ? selectedRows.map(row => row.original) : table.getFilteredRowModel().rows.map(row => row.original);

        const csv = Papa.unparse(dataToExport, {
            header: true,
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', `accounts-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const exportToJSON = () => {
        const selectedRows = table.getSelectedRowModel().rows;

        const dataToExport =
            selectedRows.length > 0 ? selectedRows.map(row => row.original) : table.getFilteredRowModel().rows.map(row => row.original);

        const json = JSON.stringify(dataToExport, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', `accounts-${new Date().toISOString().split('T')[0]}.json`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const exportToExcel = () => {
        const selectedRows = table.getSelectedRowModel().rows;

        const dataToExport =
            selectedRows.length > 0 ? selectedRows.map(row => row.original) : table.getFilteredRowModel().rows.map(row => row.original);

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(workbook, worksheet, 'Accounts');

        const cols = [{ wch: 10 }, { wch: 20 }, { wch: 15 }, { wch: 25 }, { wch: 15 }];

        worksheet['!cols'] = cols;

        XLSX.writeFile(workbook, `accounts-${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onSortingChange: setSorting,
        enableSortingRemoval: true,
        getPaginationRowModel: getPaginationRowModel(),
        onRowSelectionChange: setRowSelection,
        onGlobalFilterChange: setGlobalFilter,
        globalFilterFn: 'includesString',
        onPaginationChange: setPagination,
        state: {
            pagination,
            sorting,
            rowSelection,
            globalFilter,
            columnPinning: {
                right: ['actions'],
            },
        },
    });

    const selectedAccountIds = table.getSelectedRowModel().rows.map(row => row.original.id);
    const { pages, showLeftEllipsis, showRightEllipsis } = usePagination({
        currentPage: table.getState().pagination.pageIndex + 1,
        totalPages: table.getPageCount(),
        paginationItemsToDisplay: 5,
    });

    return (
        <div className="w-full space-y-4">
            <div className="flex justify-between gap-2 max-sm:flex-col sm:items-center">
                <div className="flex items-center space-x-2">
                    <Input
                        placeholder="Search all columns..."
                        value={globalFilter ?? ''}
                        onChange={event => setGlobalFilter(String(event.target.value))}
                        className="max-w-sm"
                    />

                    <div className="flex gap-2 ml-3">
                        <CreateAccountDialog />
                        <DeleteAccountDialog open={deleteDialogOpen} setOpen={setDeleteDialogOpen} accountIds={selectedAccountIds} />
                        <EditAccountDialog setOpen={setEditDialogOpen} open={editDialogOpen} accountIds={selectedAccountIds} />
                        <ToggleAccountDialog
                            open={toggleAccountDialogOpen}
                            setOpen={setToggleAccountDialogOpen}
                            accountIds={selectedAccountIds}
                            action={toggleAccountAction}
                        />
                        <PermissionSetAccountDialog
                            open={permissionDialogOpen}
                            setOpen={setPermissionDialogOpen}
                            accountIds={selectedAccountIds}
                        />
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    <div className="text-muted-foreground text-sm">
                        {table.getSelectedRowModel().rows.length > 0 && (
                            <span className="mr-2">
                                {table.getSelectedRowModel().rows.length} of {table.getFilteredRowModel().rows.length} row(s) selected
                            </span>
                        )}
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                                <DownloadCloudIcon className="mr-2" />
                                Export
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={exportToCSV}>
                                <FileTextIcon className="mr-2 size-4" />
                                Export as CSV
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={exportToExcel}>
                                <FileSpreadsheetIcon className="mr-2 size-4" />
                                Export as Excel
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={exportToJSON}>
                                <FileTextIcon className="mr-2 size-4" />
                                Export as JSON
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map(headerGroup => (
                            <TableRow key={headerGroup.id} className="hover:bg-transparent">
                                {headerGroup.headers.map(header => {
                                    return (
                                        <TableHead
                                            key={header.id}
                                            style={{ width: `${header.getSize()}px` }}
                                            className={cn(
                                                'h-11',
                                                header.column.getIsPinned() && 'text-right', // right-align header
                                            )}
                                        >
                                            {header.isPlaceholder ? null : header.column.getCanSort() ? (
                                                <div
                                                    className={cn(
                                                        header.column.getCanSort() &&
                                                            'flex h-full cursor-pointer items-center justify-between gap-2 select-none',
                                                        header.column.getIsPinned() && 'justify-end', // push icon to the right
                                                    )}
                                                    onClick={header.column.getToggleSortingHandler()}
                                                    onKeyDown={e => {
                                                        if (header.column.getCanSort() && (e.key === 'Enter' || e.key === ' ')) {
                                                            e.preventDefault();
                                                            header.column.getToggleSortingHandler()?.(e);
                                                        }
                                                    }}
                                                    tabIndex={header.column.getCanSort() ? 0 : undefined}
                                                >
                                                    {flexRender(header.column.columnDef.header, header.getContext())}
                                                    {{
                                                        asc: <ChevronUpIcon className="shrink-0 opacity-60" size={16} aria-hidden="true" />,
                                                        desc: (
                                                            <ChevronDownIcon className="shrink-0 opacity-60" size={16} aria-hidden="true" />
                                                        ),
                                                    }[header.column.getIsSorted() as string] ?? null}
                                                </div>
                                            ) : (
                                                flexRender(header.column.columnDef.header, header.getContext())
                                            )}
                                        </TableHead>
                                    );
                                })}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map(row => (
                                <TableRow
                                    key={row.id}
                                    data-state={row.getIsSelected() && 'selected'}
                                    onClick={event => {
                                        const target = event.target as HTMLElement | null;

                                        if (
                                            target?.closest(
                                                'button, a, input, textarea, select, label, [role="button"], [data-no-row-select="true"]',
                                            )
                                        )
                                            return;
                                        row.toggleSelected();
                                    }}
                                >
                                    {row.getVisibleCells().map(cell => (
                                        <TableCell
                                            key={cell.id}
                                            className={cn(
                                                cell.column.getIsPinned() && 'flex justify-end text-right', // right-align cell
                                            )}
                                        >
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-24 text-center">
                                    No results.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <div className="flex items-center justify-between gap-3 max-sm:flex-col">
                <p className="text-muted-foreground flex-1 text-sm whitespace-nowrap" aria-live="polite">
                    Page <span className="text-foreground">{table.getState().pagination.pageIndex + 1}</span> of{' '}
                    <span className="text-foreground">{table.getPageCount()}</span>
                </p>

                <div className="grow">
                    <Pagination>
                        <PaginationContent>
                            <PaginationItem>
                                <Button
                                    size="icon"
                                    variant="outline"
                                    className="disabled:pointer-events-none disabled:opacity-50"
                                    onClick={() => table.previousPage()}
                                    disabled={!table.getCanPreviousPage()}
                                    aria-label="Go to previous page"
                                >
                                    <ChevronLeftIcon aria-hidden="true" />
                                </Button>
                            </PaginationItem>

                            {showLeftEllipsis && (
                                <PaginationItem>
                                    <PaginationEllipsis />
                                </PaginationItem>
                            )}

                            {pages.map(page => {
                                const isActive = page === table.getState().pagination.pageIndex + 1;

                                return (
                                    <PaginationItem key={page}>
                                        <Button
                                            size="icon"
                                            variant={`${isActive ? 'outline' : 'ghost'}`}
                                            onClick={() => table.setPageIndex(page - 1)}
                                            aria-current={isActive ? 'page' : undefined}
                                        >
                                            {page}
                                        </Button>
                                    </PaginationItem>
                                );
                            })}

                            {showRightEllipsis && (
                                <PaginationItem>
                                    <PaginationEllipsis />
                                </PaginationItem>
                            )}

                            <PaginationItem>
                                <Button
                                    size="icon"
                                    variant="outline"
                                    className="disabled:pointer-events-none disabled:opacity-50"
                                    onClick={() => table.nextPage()}
                                    disabled={!table.getCanNextPage()}
                                    aria-label="Go to next page"
                                >
                                    <ChevronRightIcon aria-hidden="true" />
                                </Button>
                            </PaginationItem>
                        </PaginationContent>
                    </Pagination>
                </div>

                <div className="flex flex-1 justify-end">
                    <Select
                        value={table.getState().pagination.pageSize.toString()}
                        onValueChange={value => {
                            table.setPageSize(Number(value));
                        }}
                    >
                        <SelectTrigger id="results-per-page" className="w-fit whitespace-nowrap" aria-label="Results per page">
                            <SelectValue placeholder="Select number of results" />
                        </SelectTrigger>
                        <SelectContent>
                            {[5, 10, 25, 50, 100].map(pageSize => (
                                <SelectItem key={pageSize} value={pageSize.toString()}>
                                    {pageSize} / page
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </div>
    );
};
