import { useEffect, useMemo, useRef, useState } from "react";
import {
  Calendar as CalendarIcon,
  CalendarCheck,
  CircleCheck,
  Info,
  Wallet,
  Wrench,
} from "lucide-react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useNavigate } from "react-router-dom";
import { BookingDetailSheet } from "@/components/office/BookingDetailSheet";
import { EmptyState, FilteredEmptyState } from "@/components/shared/EmptyState";
import { FilterPopover, ListLoading, PaginationFooter, ResultCount, SearchField, SortHeaderButton, TABLE_BASE, TableShell, TD_CELL, TH_CELL, THEAD_ROW, TR_ROW, TableLoadingBar, useDebouncedValue } from "@/components/shared/FilterPopover";
import { ErrorCard, PageHeader } from "@/components/shared/PageHeader";
import { StatCard, StatsGrid } from "@/components/shared/StatCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ApiError } from "@/api/errors";
import { useAdminBookings } from "@/hooks/useOffice";
import { pageCountOf, usePaginationState } from "@/hooks/usePaginationState";
import { useBrands, useServices } from "@/hooks/usePublic";
import { useAuthStore } from "@/stores/auth.store";
import type { AdminBooking, BookingStatus } from "@/types/booking.types";
import { formatDateLong, manilaToday } from "@/utils/format";
import { cn } from "@/lib/utils";

const TABS: { key: string; label: string; status?: BookingStatus }[] = [
  { key: "all", label: "All" },
  { key: "submitted", label: "Submitted", status: "submitted" },
  { key: "proposed", label: "Proposed Schedule", status: "proposed" },
  { key: "scheduled", label: "Awaiting Payment", status: "scheduled" },
  { key: "confirmed", label: "Confirmed", status: "confirmed" },
  { key: "assigned", label: "Assigned", status: "assigned" },
  { key: "ongoing", label: "Ongoing", status: "ongoing" },
  { key: "completed", label: "Completed", status: "completed" },
  { key: "cancelled", label: "Cancelled", status: "cancelled" },
  { key: "expired", label: "Expired", status: "expired" },
];

type SortKey = "newest" | "schedule" | "customer";
const SORT_FIRST_DIR: Record<SortKey, "asc" | "desc"> = {
  newest: "desc",
  schedule: "asc",
  customer: "asc",
};
/** Table column id → server sort key (unsortable columns map to null). */
const SORT_COLUMN: Record<string, SortKey | null> = {
  row: null,
  customer: "customer",
  schedule: "schedule",
  service: null,
  status: null,
  actions: null,
};

function customerName(b: AdminBooking): string {
  return `${b.customer_first_name} ${b.customer_last_name}`.trim() || b.customer_email;
}

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Dispatch board: shared by owner + staff routes (role gates live in the detail sheet). */
export function BookingsPage() {
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [date, setDate] = useState("");
  const [dateOpen, setDateOpen] = useState(false);
  const [brand, setBrand] = useState("");
  const [service, setService] = useState("");
  const { page, setPage, pageSize, setPageSize, resetPage, prevPage, nextPage } = usePaginationState(50);
  const [sortBy, setSortBy] = useState<SortKey>("newest");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [assignId, setAssignId] = useState<number | null>(null);

  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const base = user?.role === "owner" ? "/owner" : "/staff";

  const debouncedSearch = useDebouncedValue(search, 300);
  const status = TABS.find((t) => t.key === tab)?.status;

  // Fresh page from page 1 whenever the result-set definition changes.
  useEffect(() => {
    resetPage();
  }, [tab, debouncedSearch, date, brand, service, sortBy, sortDir, pageSize, resetPage]);

  const board = useAdminBookings({
    status,
    search: debouncedSearch.trim() || undefined,
    brand_id: brand ? Number(brand) : undefined,
    service_id: service ? Number(service) : undefined,
    date_from: date || undefined,
    date_to: date || undefined,
    page,
    limit: pageSize,
    sort_by: sortBy,
    sort_dir: sortDir,
  });
  const overview = useAdminBookings({ limit: 100 });
  const brands = useBrands();
  const services = useServices();

  // Last-known summary: tab counts hold their numbers while the next tab loads.
  const summaryRef = useRef<Record<string, number>>({});
  if (board.data?.summary) summaryRef.current = board.data.summary;
  const summary = board.data?.summary ?? summaryRef.current;

  const items = board.data?.items ?? [];
  const total = board.data?.total ?? 0;
  const pageCount = pageCountOf(total, pageSize);

  // Fresh object from live queries — mutations refresh the open drawer, no stale badge.
  const selected: AdminBooking | null =
    items.find((b) => b.id === selectedId) ??
    (overview.data?.items ?? []).find((b) => b.id === selectedId) ??
    null;

  const counts = useMemo(() => {
    const list = overview.data?.items ?? [];
    const today = manilaToday();
    const scheduledToday = list.filter((b) => b.preferred_date === today).length;
    return {
      needsPayment: list.filter((b) => b.status === "proposed").length,
      needsTech: list.filter(
        (b) => b.status === "confirmed" && !b.technician_id,
      ).length,
      today: scheduledToday,
      assignedToday: list.filter(
        (b) => b.preferred_date === today && (b.status === "assigned" || b.technician_id != null),
      ).length,
      completedToday: list.filter(
        (b) => b.preferred_date === today && b.status === "completed",
      ).length,
    };
  }, [overview.data]);

  /** Sortable header button: first click takes the column's natural order, then toggles. */
  const onSortKey = (key: SortKey) => {
    if (sortBy !== key) {
      setSortBy(key);
      setSortDir(SORT_FIRST_DIR[key]);
    } else {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    }
  };
  const sortHeader = (label: string, key: SortKey) => (
    <SortHeaderButton label={label} active={sortBy === key} ascending={sortDir === "asc"} onSort={() => onSortKey(key)} />
  );

  const columnHelper = createColumnHelper<AdminBooking>();

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: "row",
        header: "#",
        cell: ({ row }) => (
          <span className="font-technical text-sm tabular-nums text-gray-500">
            {(page - 1) * pageSize + row.index + 1}
          </span>
        ),
      }),
      columnHelper.display({
        id: "schedule",
        header: () => sortHeader("Schedule", "schedule"),
        cell: ({ row }) => {
          const b = row.original;
          const windowLabel = b.flex_window === "morning" ? "Morning (8AM to 12PM)" : b.flex_window === "afternoon" ? "Afternoon (12PM to 5PM)" : b.flex_window === "anytime" ? "Anytime (8AM to 5PM)" : "—";
          return (
            <div className="whitespace-nowrap">
              <p className="text-sm font-medium tabular-nums text-gray-900">
                {formatDateLong(b.preferred_date)}
              </p>
              <p className="text-xs tabular-nums text-gray-500">
                {windowLabel}
              </p>
            </div>
          );
        },
      }),
      columnHelper.display({
        id: "customer",
        header: () => sortHeader("Customer", "customer"),
        cell: ({ row }) => {
          const b = row.original;
          return (
            <div className="min-w-0 max-w-52">
              <p className="truncate text-sm font-semibold text-gray-900">{customerName(b)}</p>
              <p className="truncate font-technical text-xs tabular-nums text-gray-500" title={b.reference_id}>
                {b.reference_id}
              </p>
            </div>
          );
        },
      }),
      columnHelper.display({
        id: "contact",
        header: "Contact",
        cell: ({ row }) => {
          const b = row.original;
          return (
            <div className="min-w-0 max-w-52">
              <p className="truncate text-sm tabular-nums text-gray-900">{b.customer_phone}</p>
              <p className="truncate text-xs text-gray-500">{b.customer_email}</p>
            </div>
          );
        },
      }),
      columnHelper.display({
        id: "address",
        header: "Address",
        cell: ({ row }) => {
          const b = row.original;
          const parts = b.address_parts
            ? [b.address_parts.street, b.address_parts.barangay, b.address_parts.city, b.address_parts.province]
            : [b.address_text];
          const full = parts.filter(Boolean).join(", ");
          return full ? (
            <p className="max-w-52 whitespace-normal break-words text-sm text-gray-900">{full}</p>
          ) : (
            <p className="text-sm text-gray-500">—</p>
          );
        },
      }),
      columnHelper.display({
        id: "service",
        header: "Service",
        cell: ({ row }) => {
          const b = row.original;
          return (
            <div className="min-w-0 max-w-44">
              <p className="truncate text-sm font-medium text-gray-900">
                {b.service_name ?? `Service #${b.service_id}`}
              </p>
              <p className="truncate text-xs text-gray-500">
                {b.brand_name ?? `Brand #${b.brand_id}`}
              </p>
            </div>
          );
        },
      }),
      columnHelper.display({
        id: "status",
        header: "Status",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      }),
      columnHelper.display({
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const b = row.original;
          return (
            <div className="flex gap-1.5">
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                onClick={() => {
                  setSelectedId(b.id);
                  setAssignId(null);
                }}
              >
                <Info size={16} />
                Details
              </Button>
            </div>
          );
        },
      }),
    ],
    [sortBy, sortDir, page, pageSize],
  );

  // Server owns truth (filters + sort + pages); the table renders rows and
  // writes page turns and header sorts back into server params.
  const table = useReactTable({
    data: items,
    columns,
    manualPagination: true,
    manualSorting: true,
    pageCount,
    state: {
      pagination: { pageIndex: page - 1, pageSize },
    },
    onPaginationChange: (updater) => {
      const current = { pageIndex: page - 1, pageSize };
      const next = typeof updater === "function" ? updater(current) : updater;
      setPage(next.pageIndex + 1);
    },
    getCoreRowModel: getCoreRowModel(),
  });

  const tabCount = (tabStatus?: BookingStatus) =>
    tabStatus ? (summary[tabStatus] ?? 0) : (summary.all ?? board.data?.total ?? 0);

  /** Counters read from 1: an empty status shows its bare label. */
  const countSuffix = (n: number) => (n >= 1 ? ` (${n})` : "");

  const filtersActive =
    tab !== "all" || search.trim() !== "" || date !== "" || brand !== "" || service !== "";
  const clearFilters = () => {
    setTab("all");
    setSearch("");
    setDate("");
    setBrand("");
    setService("");
  };
  const closeSheet = () => {
    setSelectedId(null);
    setAssignId(null);
  };

  const brandName = brands.data?.find((b) => String(b.id) === brand)?.name;
  const serviceName = services.data?.find((s) => String(s.id) === service)?.name;

  return (
    <div className="min-w-0 overflow-x-clip">
      <PageHeader
        title="Bookings"
        description="Manage bookings, assign technicians, and track schedules."
      />
      <StatsGrid>
        <StatCard title="Needs payment" value={String(counts.needsPayment)} icon={Wallet} hint="Proposed, waiting for receipt" tint="sky" loading={overview.isLoading && !overview.data} />
        <StatCard title="Needs technician" value={String(counts.needsTech)} icon={Wrench} hint="Confirmed, awaiting assignment" tint="warning" loading={overview.isLoading && !overview.data} />
        <StatCard title="On the board today" value={String(counts.today)} icon={CalendarCheck} hint={`${counts.assignedToday} with team`} tint="teal" loading={overview.isLoading && !overview.data} />
        <StatCard title="Completed today" value={String(counts.completedToday)} icon={CircleCheck} hint="Finished services" tint="success" loading={overview.isLoading && !overview.data} />
      </StatsGrid>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <SearchField value={search} onChange={setSearch} placeholder="Search reference, name, email…" label="Search bookings" />
        <Popover open={dateOpen} onOpenChange={setDateOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              aria-label="Filter by date"
              className="w-full flex-1 justify-between border-gray-200 bg-white font-normal tabular-nums text-gray-900 hover:bg-white hover:text-gray-900 active:scale-100 sm:w-52 sm:flex-none"
            >
              <span className="truncate">{date ? formatDateLong(date) : "All dates"}</span>
              <CalendarIcon size={16} aria-hidden="true" className="shrink-0 text-gray-500" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={date ? new Date(`${date}T00:00:00`) : undefined}
              onSelect={(d) => {
                setDate(d ? toISODate(d) : "");
                setDateOpen(false);
              }}
            />
            {date && (
              <div className="border-t border-gray-200 p-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    setDate("");
                    setDateOpen(false);
                  }}
                >
                  Clear date
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>
        <FilterPopover
          label="statuses"
          display={
            tab === "all"
              ? `All statuses${countSuffix(tabCount())}`
              : `${TABS.find((t) => t.key === tab)?.label}${countSuffix(tabCount(status))}`
          }
          options={TABS.slice(1).map((t) => ({
            id: t.key,
            name: `${t.label}${countSuffix(tabCount(t.status))}`,
          }))}
          isLoading={board.isPending && !board.data}
          value={tab === "all" ? "" : tab}
          onPick={(v) => setTab(v || "all")}
        />
        <FilterPopover
          label="brands"
          display={brandName ?? "All brands"}
          options={(brands.data ?? []).map((b) => ({ id: String(b.id), name: b.name }))}
          isLoading={brands.isLoading}
          value={brand}
          onPick={setBrand}
        />
        <FilterPopover
          label="services"
          display={serviceName ?? "All services"}
          options={(services.data ?? []).map((s) => ({ id: String(s.id), name: s.name }))}
          isLoading={services.isLoading}
          value={service}
          onPick={setService}
        />
      </div>

      <ResultCount shown={items.length} total={total} noun="booking" nounPlural="bookings" isLoading={!board.data} loadingLabel="Loading bookings…" filtersActive={filtersActive} onClear={clearFilters} />

      <div className="mt-1 flex min-w-0 flex-col gap-3">
        {board.isLoading && !board.data && (
          <ListLoading label="Loading bookings" />
        )}
        {board.isError && board.error instanceof ApiError && board.error.status === 404 ? (
          <EmptyState
            title="Bookings feed unavailable"
            description="Couldn't reach the bookings list. If the system just restarted, wait a moment and reload the page."
          />
        ) : (
          board.isError && (
            <ErrorCard
              message={
                board.error instanceof Error
                  ? board.error.message
                  : "Could not load bookings."
              }
              onRetry={() => void board.refetch()}
            />
          )
        )}
        {board.data && items.length === 0 && (
          <FilteredEmptyState
            filtersActive={filtersActive}
            onClearFilters={clearFilters}
            filteredTitle="No bookings match these filters"
            filteredDescription="Try another status, date, or search."
            emptyTitle="No bookings yet"
            emptyDescription="New walk-in and app bookings will appear here."
          />
        )}
        {items.length > 0 && (
          <>
            <TableShell shadow>
              <TableLoadingBar active={board.isFetching && items.length > 0} label="Refreshing bookings" />
              <table className={cn(TABLE_BASE, "min-w-[840px]")}>
                <thead>
                  {table.getHeaderGroups().map((hg) => (
                    <tr key={hg.id} className={THEAD_ROW}>
                      {hg.headers.map((h) => {
                        const key = SORT_COLUMN[h.column.id] ?? null;
                        return (
                          <th
                            key={h.id}
                            scope="col"
                            aria-sort={
                              key === null
                                ? undefined
                                : key !== sortBy
                                  ? "none"
                                  : sortDir === "asc"
                                    ? "ascending"
                                    : "descending"
                            }
                            className={cn(
                              TH_CELL,
                              h.column.id === "reference" &&
                                "sticky left-0 border-r border-gray-200 bg-gray-50",
                            )}
                          >
                            {flexRender(h.column.columnDef.header, h.getContext())}
                          </th>
                        );
                      })}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {table.getRowModel().rows.map((row) => (
                    <tr
                      key={row.id}
                      className={TR_ROW}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td
                          key={cell.id}
                          className={cn(
                            TD_CELL,
                            cell.column.id === "reference" &&
                              "sticky left-0 border-r border-gray-200 bg-white",
                          )}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableShell>
            <PaginationFooter page={page} pageCount={pageCount} isFetching={board.isFetching} onPrev={prevPage} onNext={() => nextPage(pageCount)} pageSize={pageSize} onPageSize={setPageSize} />
          </>
        )}
      </div>

      <BookingDetailSheet
        booking={selected}
        onClose={closeSheet}
        onProposeSchedule={() => {
          closeSheet();
          navigate(`${base}/schedule`);
        }}
        startAssignOpen={assignId !== null && assignId === selected?.id}
      />
    </div>
  );
}
