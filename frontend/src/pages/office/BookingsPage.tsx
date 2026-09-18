import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Calendar as CalendarIcon,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Info,
  Play,
  Search,
  Wallet,
  Wrench,
} from "lucide-react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { BookingDetailSheet } from "@/components/office/BookingDetailSheet";
import { EmptyState } from "@/components/shared/EmptyState";
import { FilterPopover, RowsSelect, TableLoadingBar, useDebouncedValue } from "@/components/shared/FilterPopover";
import { ErrorCard, PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CardSkeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/api/errors";
import { useAdminBookings } from "@/hooks/useOffice";
import { useBrands, useServices } from "@/hooks/usePublic";
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
];

const DEFAULT_PAGE_SIZE = 50;

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
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [sortBy, setSortBy] = useState<SortKey>("newest");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [assignId, setAssignId] = useState<number | null>(null);

  const debouncedSearch = useDebouncedValue(search, 300);
  const status = TABS.find((t) => t.key === tab)?.status;

  // Fresh page from page 1 whenever the result-set definition changes.
  useEffect(() => {
    setPage(1);
  }, [tab, debouncedSearch, date, brand, service, sortBy, sortDir, pageSize]);

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
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  // Fresh object from live queries — mutations refresh the open drawer, no stale badge.
  const selected: AdminBooking | null =
    items.find((b) => b.id === selectedId) ??
    (overview.data?.items ?? []).find((b) => b.id === selectedId) ??
    null;

  const counts = useMemo(() => {
    const list = overview.data?.items ?? [];
    const today = manilaToday();
    return {
      needsPayment: list.filter((b) => b.status === "scheduled").length,
      needsTech: list.filter(
        (b) => b.status === "confirmed" && !b.technician_id,
      ).length,
      today: list.filter((b) => b.preferred_date === today).length,
      ongoing: list.filter((b) => b.status === "ongoing").length,
      assignedToday: list.filter(
        (b) => b.preferred_date === today && (b.status === "assigned" || b.technician_id != null),
      ).length,
    };
  }, [overview.data]);

  /** Sortable header button: first click takes the column's natural order, then toggles. */
  const sortHeader = (label: string, key: SortKey) => {
    const active = sortBy === key;
    const Icon = active ? (sortDir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
    return (
      <button
        type="button"
        onClick={() => {
          if (!active) {
            setSortBy(key);
            setSortDir(SORT_FIRST_DIR[key]);
          } else {
            setSortDir((d) => (d === "asc" ? "desc" : "asc"));
          }
        }}
        aria-label={`Sort by ${label}`}
        className="inline-flex cursor-pointer items-center gap-1 uppercase transition-colors hover:text-gray-900"
      >
        {label}
        <Icon
          size={14}
          aria-hidden="true"
          className={active ? "text-primary-600" : "text-gray-400"}
        />
      </button>
    );
  };

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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard title="Needs payment" value={String(counts.needsPayment)} icon={Wallet} hint="Submitted, awaiting receipt" tint="sky" />
        <StatCard title="Needs technician" value={String(counts.needsTech)} icon={Wrench} hint="Confirmed bookings awaiting technician" tint="slate" />
        <StatCard title="Assigned today" value={String(counts.assignedToday)} icon={CalendarCheck} hint="With team, counts toward today" tint="teal" />
        <StatCard title="Scheduled today" value={String(counts.today)} icon={CalendarCheck} hint="Scheduled for today" tint="warning" />
        <StatCard title="Ongoing now" value={String(counts.ongoing)} icon={Play} hint="Services currently in progress" tint="teal" />
      </div>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative flex-1 sm:min-w-52">
          <Search
            size={18}
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search reference, name, email…"
            aria-label="Search bookings"
            className="pl-10"
          />
        </div>
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

      <div className="flex min-h-[44px] items-center justify-between gap-2">
        <p className="text-sm text-gray-600" role="status">
          {board.data ? (
            <>
              Showing{" "}
              <span className="font-semibold tabular-nums text-gray-900">{items.length}</span>{" "}
              of <span className="font-semibold tabular-nums text-gray-900">{total}</span>{" "}
              {total === 1 ? "booking" : "bookings"}
            </>
          ) : (
            "Loading bookings…"
          )}
        </p>
        {filtersActive && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear
          </Button>
        )}
      </div>

      <div className="mt-1 flex min-w-0 flex-col gap-3">
        {board.isLoading && !board.data && (
          <div aria-busy="true" aria-label="Loading bookings">
            {[0, 1, 2].map((i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
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
          <EmptyState
            title={filtersActive ? "No bookings match these filters" : "No bookings yet"}
            description={
              filtersActive
                ? "Try another status, date, or search."
                : "New walk-in and app bookings will appear here."
            }
            actionLabel={filtersActive ? "Clear filters" : undefined}
            onAction={filtersActive ? clearFilters : undefined}
          />
        )}
        {items.length > 0 && (
          <>
            <div
              aria-busy={board.isFetching}
              className="thin-scroll relative min-w-0 overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&:hover::-webkit-scrollbar-track]:bg-transparent"
            >
              <TableLoadingBar active={board.isFetching && items.length > 0} label="Refreshing bookings" />
              <table className="w-full min-w-[840px] border-collapse text-left">
                <thead>
                  {table.getHeaderGroups().map((hg) => (
                    <tr key={hg.id} className="border-b border-gray-200 bg-gray-50">
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
                              "whitespace-nowrap px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-gray-500",
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
                      className="border-b border-gray-100 transition-colors last:border-0 hover:bg-primary-50/60"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td
                          key={cell.id}
                          className={cn(
                            "min-w-0 px-3 py-2.5 align-middle",
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
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <RowsSelect
                value={pageSize}
                onChange={(n) => {
                  setPageSize(n);
                  setPage(1);
                }}
              />
              <div className="flex items-center justify-between gap-2 sm:justify-end">
                <p className="text-sm text-gray-600">
                  Page <span className="font-semibold tabular-nums text-gray-900">{page}</span>{" "}
                  of <span className="font-semibold tabular-nums text-gray-900">{pageCount}</span>
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={page <= 1 || board.isFetching}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    aria-label="Previous page"
                  >
                    <ChevronLeft size={16} aria-hidden="true" />
                    Prev
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={page >= pageCount || board.isFetching}
                    onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                    aria-label="Next page"
                  >
                    Next
                    <ChevronRight size={16} aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <BookingDetailSheet
        booking={selected}
        onClose={closeSheet}
        startAssignOpen={assignId !== null && assignId === selected?.id}
      />
    </div>
  );
}
