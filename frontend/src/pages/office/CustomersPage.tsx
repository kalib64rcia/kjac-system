import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { FilteredEmptyState } from "@/components/shared/EmptyState";
import { FilterPopover, ListLoading, PaginationFooter, ResultCount, SearchField, SortHeaderButton, TABLE_BASE, TableShell, TD_CELL, TH_CELL, THEAD_ROW, TR_ROW, TableLoadingBar, useDebouncedValue } from "@/components/shared/FilterPopover";
import { ErrorCard, PageHeader } from "@/components/shared/PageHeader";
import { StatCard, StatsGrid } from "@/components/shared/StatCard";
import { ToneBadge } from "@/components/shared/ToneBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { DrawerHeader } from "@/components/shared/DrawerHeader";
import { cn } from "@/lib/utils";
import type { OfficeUser } from "@/api/users.api";
import { useAdminBookings, useOfficeUsers } from "@/hooks/useOffice";
import { pageCountOf, usePaginationState } from "@/hooks/usePaginationState";
import { useAuthStore } from "@/stores/auth.store";
import { Users, UserCheck, UserPlus } from "lucide-react";

const STATUS_OPTIONS = [
  { id: "active", name: "Active" },
  { id: "inactive", name: "Inactive" },
  { id: "suspended", name: "Suspended" },
];

const STATUS_TONE: Record<string, "success" | "secondary" | "destructive"> = {
  active: "success",
  suspended: "destructive",
};

/** Customers board: shared by owner + staff routes (office-wide list). Read-only. */
export function CustomersPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const { page, setPage, pageSize, setPageSize, resetPage, prevPage, nextPage } = usePaginationState();
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const debouncedSearch = useDebouncedValue(search, 300);

  useEffect(() => {
    resetPage();
  }, [debouncedSearch, status, pageSize, sortDir, resetPage]);

  const list = useOfficeUsers({
    role: "customer",
    status: status || undefined,
    search: debouncedSearch.trim() || undefined,
  });
  const totals = useOfficeUsers({ role: "customer" });

  // useOfficeUsers fetches the full customer directory once (Team pattern);
  // paginate locally so the board stays snappy. Name sort is client-side
  // over the whole directory "” honest, unlike page-only sorting.
  const all = list.data?.items ?? [];
  const sorted = [...all].sort((a, b) => {
    const an = `${a.first_name} ${a.last_name}`.trim() || a.email;
    const bn = `${b.first_name} ${b.last_name}`.trim() || b.email;
    const cmp = an.localeCompare(bn);
    return sortDir === "asc" ? cmp : -cmp;
  });
  const pageCount = pageCountOf(sorted.length, pageSize);
  const safePage = Math.min(page, pageCount);
  const total = sorted.length;
  const items = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);
  const selected = all.find((u) => u.id === selectedId) ?? null;

  const allCustomers = totals.data?.items ?? [];
  const activeCount = allCustomers.filter((u) => u.status === "active").length;
  const suspendedCount = allCustomers.filter((u) => u.status === "suspended").length;
  const thirtyDaysAgo = Date.now() - 30 * 86_400_000;
  const newCount = allCustomers.filter((u) => u.created_at && new Date(u.created_at).getTime() >= thirtyDaysAgo).length;

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
      header: () => (
        <SortHeaderButton
          label="Customer"
          active
          ascending={sortDir === "asc"}
          onSort={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
        />
      ),
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
          <ToneBadge map={STATUS_TONE} value={row.original.status} />
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
      <StatsGrid>
        <StatCard title="Total customers" value={String(allCustomers.length)} icon={Users} hint="Registered accounts" tint="sky" loading={totals.isLoading && !totals.data} />
        <StatCard title="Suspended" value={String(suspendedCount)} icon={Users} hint="Blocked from booking" tint="warning" loading={totals.isLoading && !totals.data} />
        <StatCard title="Active" value={String(activeCount)} icon={UserCheck} hint="Can book today" tint="teal" loading={totals.isLoading && !totals.data} />
        <StatCard title="New (30 days)" value={String(newCount)} icon={UserPlus} hint="Recent sign-ups" tint="success" loading={totals.isLoading && !totals.data} />
      </StatsGrid>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <SearchField value={search} onChange={setSearch} placeholder="Search name or email" label="Search customers" />
        <FilterPopover
          label="statuses"
          display={status ? STATUS_OPTIONS.find((o) => o.id === status)?.name ?? status : "All statuses"}
          options={STATUS_OPTIONS}
          isLoading={false}
          value={status}
          onPick={setStatus}
        />
      </div>

      <ResultCount shown={items.length} total={total} noun="customer" nounPlural="customers" isLoading={!list.data} loadingLabel="Loading customers" filtersActive={filtersActive} onClear={clearFilters} />

      <div className="mt-1 flex min-w-0 flex-col gap-3">
        {list.isLoading && !list.data && (
          <ListLoading label="Loading customers" />
        )}
        {list.isError && (
          <ErrorCard message={list.error instanceof Error ? list.error.message : "Could not load customers."} onRetry={() => void list.refetch()} />
        )}
        {list.data && items.length === 0 && (
          <FilteredEmptyState
            filtersActive={filtersActive}
            onClearFilters={clearFilters}
            filteredTitle="No customers match these filters"
            filteredDescription="Try another search or status."
            emptyTitle="No customers yet"
            emptyDescription="New app registrations and guest bookers will appear here."
          />
        )}
        {items.length > 0 && (
          <>
            <TableShell>
              <TableLoadingBar active={list.isFetching && items.length > 0} label="Refreshing customers" />
              <table className={cn(TABLE_BASE, "min-w-[640px]")}>
                <thead>
                  {table.getHeaderGroups().map((hg) => (
                    <tr key={hg.id} className={THEAD_ROW}>
                      {hg.headers.map((h) => (
                        <th key={h.id} scope="col" className={TH_CELL}>
                          {flexRender(h.column.columnDef.header, h.getContext())}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {table.getRowModel().rows.map((row) => (
                    <tr key={row.id} className={TR_ROW}>
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className={TD_CELL}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableShell>
            <PaginationFooter page={safePage} pageCount={pageCount} isFetching={list.isFetching} onPrev={prevPage} onNext={() => nextPage(pageCount)} pageSize={pageSize} onPageSize={setPageSize} />
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
      <SheetContent label="Customer details" side="right" onClose={onClose} className="w-[400px] max-w-[92vw] p-0">
        <DrawerHeader title={name || "Customer"} onClose={onClose} />
        <div className="thin-scroll flex-1 overflow-y-auto p-6">
        {customer && (
          <div className="mt-4 flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="secondary">Customer</Badge>
              <ToneBadge map={STATUS_TONE} value={customer.status} />
            </div>
            <dl className="flex flex-col gap-2 rounded-lg border border-gray-200 p-3 text-sm">
              <div className="flex justify-between gap-2"><dt className="text-gray-600">Email</dt><dd className="min-w-0 truncate text-right text-gray-900">{customer.email}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-gray-600">User ID</dt><dd className="font-technical tabular-nums text-gray-900">#{customer.id}</dd></div>
            </dl>
            <section aria-label="Recent bookings" className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold text-gray-900">Recent bookings</h3>
              {bookings.isLoading && <p className="text-sm text-gray-600">Loading...</p>}
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
        </div>
      </SheetContent>
    </Sheet>
  );
}
