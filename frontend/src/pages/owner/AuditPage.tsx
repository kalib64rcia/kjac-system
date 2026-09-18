import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Eye, Download, Search } from "lucide-react";
import { Block } from "@/components/office/BookingDetailSheet";
import { EmptyState } from "@/components/shared/EmptyState";
import { DetailRow } from "@/components/shared/DetailRow";
import { ErrorCard, PageHeader } from "@/components/shared/PageHeader";
import { FilterPopover, RowsSelect, SortHeaderButton, TableLoadingBar, useDebouncedValue } from "@/components/shared/FilterPopover";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { CardSkeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetCloseButton, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { auditApi, type AuditLog } from "@/api/office.api";
import { useAuditLogs, useOfficeUsers } from "@/hooks/useOffice";
import { toast } from "@/stores/toast.store";
import { formatAuditClock, formatAuditDay, getInitials, manilaToday } from "@/utils/format";
import { cn } from "@/lib/utils";

const AREA_OPTIONS = [
  { id: "users", name: "People" },
  { id: "bookings", name: "Bookings" },
  { id: "payments", name: "Payments" },
  { id: "refunds", name: "Refunds" },
  { id: "inventory_items", name: "Stock" },
  { id: "payroll_records", name: "Payroll" },
];

const DATE_OPTIONS = [
  { id: "today", name: "Today" },
  { id: "week", name: "Last 7 days" },
  { id: "month", name: "Last 30 days" },
];

/** Manila calendar day N days back, as YYYY-MM-DD. */
function manilaDaysAgo(days: number): string {
  const [y, m, d] = manilaToday().split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d) - days * 86_400_000).toISOString().slice(0, 10);
}

function actorInitials(name: string | null | undefined): string {
  if (!name) return "S";
  const parts = name.trim().split(/\s+/);
  return getInitials(parts[0] ?? "", parts[parts.length - 1] ?? "", null);
}

function capRole(role: string | null | undefined): string {
  if (!role) return "";
  return role.charAt(0).toUpperCase() + role.slice(1);
}

/** Entry detail: right drawer in the booking-sheet pattern. */
function AuditDetailSheet({ entry, onClose }: { entry: AuditLog | null; onClose: () => void }) {
  return (
    <Sheet open={entry !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent
        label="Audit entry details"
        onClose={onClose}
        className="w-[92%] max-w-md p-0"
      >
        <SheetTitle className="sr-only">Audit entry details</SheetTitle>
        {entry && (
          <>
            <div className="flex shrink-0 items-center gap-2 border-b border-gray-200 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-gray-900">
                  {entry.action_label || "Entry details"}
                </p>
              </div>
              <SheetCloseButton onClose={onClose} />
            </div>
            <ScrollArea className="min-h-0 flex-1">
              <div className="flex flex-col gap-4 p-4">
                <Block title="What happened">
                  <p className="text-sm text-gray-700">
                    {entry.summary || `${entry.action} ${entry.table_name} #${entry.record_id}`}
                  </p>
                </Block>
                <Block title="People involved">
                  <dl>
                    <DetailRow
                      label="Author"
                      value={
                        entry.actor_name
                          ? `${entry.actor_name}${entry.actor_role ? ` (${capRole(entry.actor_role)})` : ""}`
                          : "System"
                      }
                    />
                    {entry.subject_label && (
                      <DetailRow label="About" value={entry.subject_label} />
                    )}
                  </dl>
                </Block>
                {entry.booking && (
                  <Block title="Booking">
                    <dl>
                      <DetailRow label="Reference" value={entry.booking.reference} />
                      <DetailRow label="Customer" value={entry.booking.customer} />
                      {entry.booking.phone && (
                        <DetailRow label="Phone" value={entry.booking.phone} />
                      )}
                      {entry.booking.service && (
                        <DetailRow label="Service" value={entry.booking.service} />
                      )}
                      {entry.booking.schedule && (
                        <DetailRow label="Schedule" value={entry.booking.schedule} />
                      )}
                      {entry.booking.status && (
                        <DetailRow label="Status" value={entry.booking.status} />
                      )}
                      {entry.booking.technician && (
                        <DetailRow label="Technician" value={entry.booking.technician} />
                      )}
                    </dl>
                  </Block>
                )}
                <Block title="When">
                  <dl>
                    <DetailRow label="Date" value={formatAuditDay(entry.created_at)} />
                    <DetailRow label="Exact time" value={formatAuditClock(entry.created_at)} />
                  </dl>
                </Block>
                <Block title="Changes">
                  {(entry.changes ?? []).length > 0 ? (
                    <dl>
                      {(entry.changes ?? []).map((c) => (
                        <DetailRow key={c.field} label={c.label} value={`${c.before} → ${c.after}`} />
                      ))}
                    </dl>
                  ) : (
                    <p className="text-sm text-gray-500">No field-level changes recorded.</p>
                  )}
                </Block>
              </div>
            </ScrollArea>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

/** Owner (or audit-granted staff) history: who did what, when. Read-only. */
export function AuditPage() {
  const [area, setArea] = useState("");
  const [actor, setActor] = useState("");
  const [range, setRange] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [detailId, setDetailId] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);

  const resetPage = (fn: (v: string) => void) => (v: string) => {
    fn(v);
    setPage(1);
  };
  const debouncedSearch = useDebouncedValue(search, 300);
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const dateFrom =
    range === "" ? undefined : range === "today" ? manilaToday() : manilaDaysAgo(range === "week" ? 6 : 29);
  const filters = {
    table_name: area || undefined,
    user_id: actor ? Number(actor) : undefined,
    date_from: dateFrom,
    sort_dir: sortDir,
    search: debouncedSearch.trim() || undefined,
  };
  const logs = useAuditLogs({ ...filters, page, limit: pageSize });
  const people = useOfficeUsers();

  const items = logs.data?.items ?? [];
  const total = logs.data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const filtersActive = area !== "" || actor !== "" || range !== "" || search.trim() !== "";
  const clearFilters = () => {
    setArea("");
    setActor("");
    setRange("");
    setSearch("");
    setPage(1);
  };
  const toggleSort = () => {
    setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    setPage(1);
  };
  const emptyHint = [
    search.trim() !== "" ? "search" : null,
    actor !== "" ? "person" : null,
    area !== "" ? "area" : null,
    range !== "" ? "date" : null,
  ].filter((x): x is string => x !== null);
  const detail = items.find((l) => l.id === detailId) ?? null;

  const actorOptions = (people.data?.items ?? []).map((u) => ({
    id: String(u.id),
    name: `${u.first_name} ${u.last_name}`.trim() || u.email,
  }));
  const actorName = actorOptions.find((o) => o.id === actor)?.name;
  const areaName = AREA_OPTIONS.find((o) => o.id === area)?.name;
  const rangeName = DATE_OPTIONS.find((o) => o.id === range)?.name;

  const exportExcel = async () => {
    setExporting(true);
    try {
      const blob = await auditApi.exportXlsx(filters);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "audit-logs.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error("Export failed", e instanceof Error ? e.message : undefined);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-w-0 overflow-x-clip">
      <PageHeader
        title="Audit history"
        description="History of system actions, updates, and administrative activity."
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative flex-1 sm:min-w-52">
          <Search
            size={18}
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search names, references, IDs…"
            aria-label="Search audit history"
            title="Search by name, reference code, or ID"
            className="pl-10"
          />
        </div>
        <FilterPopover
          label="people"
          display={actorName ?? "All people"}
          options={actorOptions}
          isLoading={people.isLoading}
          value={actor}
          onPick={resetPage(setActor)}
        />
        <FilterPopover
          label="areas"
          display={areaName ?? "All areas"}
          options={AREA_OPTIONS}
          isLoading={false}
          value={area}
          onPick={resetPage(setArea)}
        />
        <FilterPopover
          label="dates"
          display={rangeName ?? "All dates"}
          options={DATE_OPTIONS}
          isLoading={false}
          value={range}
          onPick={resetPage(setRange)}
        />
        <Button
          type="button"
          onClick={() => void exportExcel()}
          disabled={exporting || total === 0}
          className="sm:ml-auto"
        >
          <Download size={16} aria-hidden="true" />
          {exporting ? "Exporting…" : "Export Excel"}
        </Button>
      </div>

      <div className="flex min-h-[44px] items-center justify-between gap-2">
        <p className="text-sm text-gray-600" role="status">
          {logs.data ? (
            <>
              Showing{" "}
              <span className="font-semibold tabular-nums text-gray-900">{items.length}</span>{" "}
              of <span className="font-semibold tabular-nums text-gray-900">{total}</span>{" "}
              {total === 1 ? "entry" : "entries"}
            </>
          ) : (
            "Loading history…"
          )}
        </p>
        {filtersActive && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear
          </Button>
        )}
      </div>

      <div className="mt-1 flex min-w-0 flex-col gap-3">
        {logs.isPending && !logs.data && (
          <div aria-busy="true" aria-label="Loading audit history">
            {[0, 1, 2].map((i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        )}
        {logs.isError && (
          <ErrorCard
            message={logs.error instanceof Error ? logs.error.message : "Could not load the history."}
            onRetry={() => void logs.refetch()}
          />
        )}
        {logs.data && items.length === 0 && (
          <EmptyState
            title={filtersActive ? "No entries match these filters" : "No history yet"}
            description={
              filtersActive
                ? `Try another ${emptyHint.join(", ") || "filter"}.`
                : "Changes across the office will appear here."
            }
            actionLabel={filtersActive ? "Clear filters" : undefined}
            onAction={filtersActive ? clearFilters : undefined}
          />
        )}
        {items.length > 0 && (
          <>
            <div
              aria-busy={logs.isFetching}
              className="thin-scroll relative min-w-0 overflow-x-auto rounded-lg border border-gray-200 bg-white [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&:hover::-webkit-scrollbar-track]:bg-transparent"
            >
              <TableLoadingBar active={logs.isFetching && items.length > 0} label="Refreshing history" />
              <table className="w-full min-w-[820px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th
                      scope="col"
                      className="w-px whitespace-nowrap px-3 py-2.5 text-xs font-semibold uppercase tabular-nums tracking-wider text-gray-500"
                    >
                      #
                    </th>
                    <th
                      scope="col"
                      className="whitespace-nowrap px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-gray-500"
                    >
                      Author
                    </th>
                    <th
                      scope="col"
                      className="whitespace-nowrap px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-gray-500"
                    >
                      Action
                    </th>
                    <th
                      scope="col"
                      className="whitespace-nowrap px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-gray-500"
                    >
                      Area
                    </th>
                    <th
                      scope="col"
                      aria-sort={sortDir === "asc" ? "ascending" : "descending"}
                      className="whitespace-nowrap px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-gray-500"
                    >
                      <SortHeaderButton
                        label="Time"
                        active
                        ascending={sortDir === "asc"}
                        onSort={toggleSort}
                      />
                    </th>
                    <th
                      scope="col"
                      className="whitespace-nowrap px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-gray-500"
                    >
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((log, i) => {
                    const name = log.actor_name || "System";
                    const fixedNumber = (page - 1) * pageSize + i + 1;
                    return (
                      <tr
                        key={log.id}
                        className="border-b border-gray-100 transition-colors last:border-0 hover:bg-primary-50/60"
                      >
                        <td className="whitespace-nowrap px-3 py-2.5 align-middle">
                          <span className="font-technical text-sm tabular-nums text-gray-500">
                            {fixedNumber}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 align-middle">
                          <span className="flex min-w-0 items-center gap-2">
                            <Avatar className="size-8 shrink-0">
                              <AvatarFallback
                                className={cn(
                                  "text-xs",
                                  !log.actor_name && "bg-[#F0F4F8] text-slate-700",
                                )}
                              >
                                {actorInitials(log.actor_name)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="min-w-0">
                              <span className="block max-w-36 truncate text-sm font-semibold text-gray-900">
                                {name}
                              </span>
                              {log.actor_role && (
                                <span className="block text-xs capitalize text-gray-600">
                                  {log.actor_role}
                                </span>
                              )}
                            </span>
                          </span>
                        </td>
                        <td className="min-w-0 px-3 py-2.5 align-middle">
                          <p className="max-w-52 truncate text-sm font-medium text-gray-900">
                            {log.action_label || log.action}
                          </p>
                          <p className="max-w-52 truncate text-xs text-gray-600">
                            {log.subject_label}
                          </p>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 align-middle">
                          <span className="text-sm text-gray-700">
                            {log.module_label || log.table_name}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 align-middle">
                          <p className="text-sm font-medium tabular-nums text-gray-900">
                            {formatAuditDay(log.created_at)}
                          </p>
                          <p className="font-technical text-xs tabular-nums text-gray-600">
                            {formatAuditClock(log.created_at)}
                          </p>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 align-middle">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setDetailId(log.id)}
                            aria-label={`View details for entry ${log.id}`}
                          >
                            <Eye size={16} aria-hidden="true" />
                            View
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
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
                  Page <span className="font-semibold tabular-nums text-gray-900">{page}</span> of{" "}
                  <span className="font-semibold tabular-nums text-gray-900">{pageCount}</span>
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={page <= 1 || logs.isFetching}
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
                    disabled={page >= pageCount || logs.isFetching}
                    onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                    aria-label="Next page"
                  >
                    Next
                    <ChevronRight size={16} aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              Older rows may show System. The doer wasn&apos;t recorded at the time.
            </p>
          </>
        )}
      </div>

      <AuditDetailSheet entry={detail} onClose={() => setDetailId(null)} />
    </div>
  );
}
