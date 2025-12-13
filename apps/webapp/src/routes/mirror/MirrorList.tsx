import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem } from '@/components/ui/pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useSession } from '@/context/SessionContext';
import { usePagination } from '@/lib/use-pagination';
import { cn } from '@/lib/utils';
import { CreateMirrorDialog } from '@/routes/mirror/CreateMirrorDialog';
import { DeleteMirrorDialog } from '@/routes/mirror/DeleteMirrorDialog';
import { EditMirrorDialog } from '@/routes/mirror/EditMirrorDialog';
import type { Mirror } from '@sigauth/generics/prisma-client';
import {
    type ColumnDef,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    type PaginationState,
    type SortingState,
    useReactTable,
} from '@tanstack/react-table';
import {
    Check,
    ChevronDownIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    ChevronUpIcon,
    Code,
    Edit,
    EllipsisVertical,
    Trash,
    X,
} from 'lucide-react';
import { useEffect, useState } from 'react';

export const MirrorList = ({ openCodeEditor }: { openCodeEditor: (mirror: Mirror) => void }) => {
    const pageSize = 25;
    const { session } = useSession();

    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);

    const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize });
    const [rowSelection, setRowSelection] = useState({});
    const [data, setData] = useState<Mirror[]>(session.mirrors);

    const [globalFilter, setGlobalFilter] = useState('');
    const [sorting, setSorting] = useState<SortingState>([
        {
            id: 'name',
            desc: false,
        },
    ]);

    useEffect(() => {
        setData(session.mirrors);
        setRowSelection({});
    }, [session.mirrors]);

    const columns: ColumnDef<Mirror>[] = [
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
        { header: 'Name', accessorKey: 'name', cell: info => info.getValue() },
        {
            header: 'Auto-Run',
            accessorKey: 'autoRun',
            cell: info => (info.getValue() ? `Every ${info.row.original.autoRunInterval} minutes` : 'No'),
        },
        {
            header: 'Status',
            cell: ({ row }) => (
                <>
                    {row.original.lastResult == 'OK' ? (
                        <Badge className="scale-110 py-1 dark:bg-green-900 bg-green-200">
                            <Check />
                        </Badge>
                    ) : !row.original.lastResult ? (
                        <Badge className="scale-110 py-1 " variant="default" color="gray">
                            ?
                        </Badge>
                    ) : (
                        <Badge className="scale-110 py-1 " variant="destructive">
                            <X />
                        </Badge>
                    )}
                </>
            ),
        },
        {
            header: 'Last Run',
            accessorKey: 'lastRun',
            cell: info => (info.getValue() ? new Date(info.getValue() as string).toLocaleString() : 'Never'),
        },
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
                                openCodeEditor(row.original);
                            }}
                        >
                            <Code className="mr-2 size-4" />
                            Open Code Editor
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

    const selectedMirrorIds = table.getSelectedRowModel().rows.map(row => row.original.id);
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
                        <CreateMirrorDialog />
                        <DeleteMirrorDialog open={deleteDialogOpen} setOpen={setDeleteDialogOpen} mirrorIds={selectedMirrorIds} />
                        <EditMirrorDialog setOpen={setEditDialogOpen} open={editDialogOpen} mirrorIds={selectedMirrorIds} />
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
