import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { EmptyState } from "@/components/shared/EmptyState";
import { FilterPopover, RowsSelect, TableLoadingBar, useDebouncedValue } from "@/components/shared/FilterPopover";
import { ErrorCard, PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { CardSkeleton } from "@/components/ui/skeleton";
import type { OfficeUser } from "@/api/users.api";
import { useAdminBookings, useOfficeUsers } from "@/hooks/useOffice";
import { useAuthStore } from "@/stores/auth.store";
import { Users, UserCheck, UserPlus } from "lucide-react";

const DEFAULT_PAGE_SIZE = 20;

const STATUS_OPTIONS = [
  { id: "active", name: "Active" },
  { id: "inactive", name: "Inactive" },
  { id: "suspended", name: "Suspended" },
];

function statusTone(status: string): "success" | "secondary" | "destructive" {
  if (status === "active") return "success";
  if (status === "suspended") return "destructive";
  return "secondary";
}

/** Customers board: shared by owner + staff routes (office-wide list). Read-only. */
export function CustomersPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const debouncedSearch = useDebouncedValue(search, 300);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status, pageSize]);

  const list = useOfficeUsers({
    role: "customer",
    status: status || undefined,
    search: debouncedSearch.trim() || undefined,
  });
  const totals = useOfficeUsers({ role: "customer" });

  // useOfficeUsers fetches the full customer directory once (Team pattern);
  // paginate locally so the board stays snappy.
  const all = list.data?.items ?? [];
  const total = all.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pageCount);
  const items = all.slice((safePage - 1) * pageSize, safePage * pageSize);
  const selected = all.find((u) => u.id === selectedId) ?? null;

  const allCustomers = totals.data?.items ?? [];
  const activeCount = allCustomers.filter((u) => u.status === "active").length;

  const filtersActive = search.trim() !== "" || status !== "";
  const clearFilters = () => { setSearch(""); setStatus(""); };

  const columnHelper = createColumnHelper<OfficeUser>();
  const columns = [
    columnHelper.display({
      id: "row",
      header: "#",
      cell: ({ row }) => (
        <span className="font-technical text-sm tabular-nums text-gray-500">
          {(safePage - 1) * pageSize + row.index + 1}
        </span>
      ),
    }),
    columnHelper.display({
      id: "name",
      header: "Customer",
      cell: ({ row }) => {
        const u = row.original;
        const name = `${u.first_name} ${u.last_name}`.trim() || u.email;
        return (
          <div className="min-w-0 max-w-56">
            <p className="truncate text-sm font-semibold text-gray-900">{name}</p>
            <p className="truncate text-xs text-gray-600">{u.email}</p>
          </div>
        );
      },
    }),
    columnHelper.display({
      id: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={statusTone(row.original.status)}>
          {row.original.status.charAt(0).toUpperCase() + row.original.status.slice(1)}
        </Badge>
      ),
    }),
    columnHelper.display({
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <Button type="button" variant="outline" size="sm" onClick={() => setSelectedId(row.original.id)}>
          View
        </Button>
      ),
    }),
  ];

  const table = useReactTable({
    data: items,
    columns,
    manualPagination: true,
    pageCount,
    state: { pagination: { pageIndex: safePage - 1, pageSize } },
    onPaginationChange: (updater) => {
      const current = { pageIndex: safePage - 1, pageSize };
      const next = typeof updater === "function" ? updater(current) : updater;
      setPage(next.pageIndex + 1);
    },
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="min-w-0 overflow-x-clip">
      <PageHeader title="Customers" description="Customer directory. Profiles are managed by customers; bookings live on the dispatch board." />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard title="Total customers" value={String(allCustomers.length)} icon={Users} hint="Registered accounts" tint="sky" />
        <StatCard title="Active" value={String(activeCount)} icon={UserCheck} hint="Can book today" tint="success" />
        <StatCard title="Matching filters" value={String(total)} icon={UserPlus} hint="In this view" tint="teal" />
      </div>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative flex-1 sm:min-w-52">
          <Search size={18} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or email…" aria-label="Search customers" className="pl-10" />
        </div>
        <FilterPopover
          label="statuses"
          display={status ? STATUS_OPTIONS.find((o) => o.id === status)?.name ?? status : "All statuses"}
          options={STATUS_OPTIONS}
          isLoading={false}
          value={status}
          onPick={setStatus}
        />
      </div>

      <div className="flex min-h-[44px] items-center justify-between gap-2">
        <p className="text-sm text-gray-600" role="status">
          {list.data ? (
            <>Showing <span className="font-semibold tabular-nums text-gray-900">{items.length}</span> of <span className="font-semibold tabular-nums text-gray-900">{total}</span> {total === 1 ? "customer" : "customers"}</>
          ) : ("Loading customers…")}
        </p>
        {filtersActive && (<Button variant="ghost" size="sm" onClick={clearFilters}>Clear</Button>)}
      </div>

      <div className="mt-1 flex min-w-0 flex-col gap-3">
        {list.isLoading && !list.data && (
          <div aria-busy="true" aria-label="Loading customers">{[0, 1, 2].map((i) => (<CardSkeleton key={i} />))}</div>
        )}
        {list.isError && (
          <ErrorCard message={list.error instanceof Error ? list.error.message : "Could not load customers."} onRetry={() => void list.refetch()} />
        )}
        {list.data && items.length === 0 && (
          <EmptyState
            title={filtersActive ? "No customers match these filters" : "No customers yet"}
            description={filtersActive ? "Try another search or status." : "New app registrations and guest bookers will appear here."}
            actionLabel={filtersActive ? "Clear filters" : undefined}
            onAction={filtersActive ? clearFilters : undefined}
          />
        )}
        {items.length > 0 && (
          <>
            <div className="thin-scroll relative min-w-0 overflow-x-auto rounded-lg border border-gray-200 bg-white [&::-webkit-scrollbar]:h-1.5">
              <TableLoadingBar active={list.isFetching && items.length > 0} label="Refreshing customers" />
              <table className="w-full min-w-[640px] border-collapse text-left">
                <thead>
                  {table.getHeaderGroups().map((hg) => (
                    <tr key={hg.id} className="border-b border-gray-200 bg-gray-50">
                      {hg.headers.map((h) => (
                        <th key={h.id} scope="col" className="whitespace-nowrap px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-gray-500">
                          {flexRender(h.column.columnDef.header, h.getContext())}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {table.getRowModel().rows.map((row) => (
                    <tr key={row.id} className="border-b border-gray-100 transition-colors last:border-0 hover:bg-primary-50/60">
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="min-w-0 px-3 py-2.5 align-middle">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <RowsSelect value={pageSize} onChange={(n) => { setPageSize(n); setPage(1); }} />
              <div className="flex items-center justify-between gap-2 sm:justify-end">
                <p className="text-sm text-gray-600">
                  Page <span className="font-semibold tabular-nums text-gray-900">{safePage}</span> of <span className="font-semibold tabular-nums text-gray-900">{pageCount}</span>
                </p>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" disabled={safePage <= 1 || list.isFetching} onClick={() => setPage((p) => Math.max(1, p - 1))} aria-label="Previous page">
                    <ChevronLeft size={16} aria-hidden="true" /> Prev
                  </Button>
                  <Button type="button" variant="outline" size="sm" disabled={safePage >= pageCount || list.isFetching} onClick={() => setPage((p) => Math.min(pageCount, p + 1))} aria-label="Next page">
                    Next <ChevronRight size={16} aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <CustomerSheet customer={selected} onClose={() => setSelectedId(null)} />
    </div>
  );
}

function CustomerSheet({ customer, onClose }: { customer: OfficeUser | null; onClose: () => void }) {
  const user = useAuthStore((s) => s.user);
  const base = user?.role === "owner" ? "/owner" : "/staff";
  const navigate = useNavigate();
  const bookings = useAdminBookings({
    search: customer?.email ?? "",
    page: 1,
    limit: 5,
    sort_by: "newest",
    sort_dir: "desc",
  });

  const name = customer ? `${customer.first_name} ${customer.last_name}`.trim() || customer.email : "";

  return (
    <Sheet open={customer !== null} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent label="Customer details" side="right" onClose={onClose} className="w-[400px] max-w-[92vw] overflow-y-auto p-6">
        <SheetTitle className="text-lg font-semibold text-gray-900">{name}</SheetTitle>
        {customer && (
          <div className="mt-4 flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="secondary">Customer</Badge>
              <Badge variant={statusTone(customer.status)}>
                {customer.status.charAt(0).toUpperCase() + customer.status.slice(1)}
              </Badge>
            </div>
            <dl className="flex flex-col gap-2 rounded-lg border border-gray-200 p-3 text-sm">
              <div className="flex justify-between gap-2"><dt className="text-gray-600">Email</dt><dd className="min-w-0 truncate text-right text-gray-900">{customer.email}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-gray-600">User ID</dt><dd className="font-technical tabular-nums text-gray-900">#{customer.id}</dd></div>
            </dl>
            <section aria-label="Recent bookings" className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold text-gray-900">Recent bookings</h3>
              {bookings.isLoading && <p className="text-sm text-gray-600">Loading…</p>}
              {bookings.data && bookings.data.items.length === 0 && (
                <p className="text-sm text-gray-600">No bookings found for this email.</p>
              )}
              <ul className="flex flex-col gap-1.5">
                {(bookings.data?.items ?? []).map((b) => (
                  <li key={b.id} className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm">
                    <span className="min-w-0 truncate font-technical tabular-nums text-gray-900" title={b.reference_id}>{b.reference_id}</span>
                    <Badge variant="secondary">{b.status}</Badge>
                  </li>
                ))}
              </ul>
              <Button type="button" variant="outline" size="sm" onClick={() => navigate(`${base}/bookings`)}>
                Open dispatch board
              </Button>
            </section>
            <p className="text-xs text-gray-600">Profile edits belong to the customer (mobile app). Address changes never rewrite past bookings.</p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
