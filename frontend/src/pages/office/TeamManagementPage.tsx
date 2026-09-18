import { useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Users,
} from "lucide-react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { EmptyState } from "@/components/shared/EmptyState";
import { FilterPopover, RowsSelect, TableLoadingBar, useDebouncedValue, SortHeaderButton } from "@/components/shared/FilterPopover";
import { ErrorCard, PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CardSkeleton } from "@/components/ui/skeleton";
import type { OfficeUser } from "@/api/users.api";
import { useOfficeUsers, useTechInvites, useStaffInvites } from "@/hooks/useOffice";
import { cn } from "@/lib/utils";
import { TeamMemberModal } from "@/components/team/TeamMemberModal";
import { InviteManager } from "@/components/team/InviteManager";

const DEFAULT_PAGE_SIZE = 50;

type SortKey = "name" | "email";
const SORT_FIRST_DIR: Record<SortKey, "asc" | "desc"> = {
  name: "asc",
  email: "asc",
};

function memberFullName(u: OfficeUser): string {
  return `${u.first_name} ${u.last_name}`.trim() || u.email;
}

function sortMembers(members: OfficeUser[], sortBy: SortKey, sortDir: "asc" | "desc"): OfficeUser[] {
  const sorted = [...members];
  sorted.sort((a, b) => {
    let aVal: string, bVal: string;
    if (sortBy === "name") {
      aVal = memberFullName(a);
      bVal = memberFullName(b);
    } else {
      aVal = a.email;
      bVal = b.email;
    }
    const cmp = aVal.localeCompare(bVal);
    return sortDir === "asc" ? cmp : -cmp;
  });
  return sorted;
}

export function TeamManagementPage() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [sortBy, setSortBy] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const debouncedSearch = useDebouncedValue(search, 300);

  // Reset page on filter changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, roleFilter, statusFilter, sortBy, sortDir, pageSize]);

  // Fetch all users
  const users = useOfficeUsers();

  // Apply filters
  const filtered = (users.data?.items ?? []).filter((u) => {
    const matchesRole = !roleFilter || u.role === roleFilter;
    const matchesStatus = !statusFilter || u.status === statusFilter;
    const matchesSearch =
      !debouncedSearch ||
      memberFullName(u).toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(debouncedSearch.toLowerCase());
    return matchesRole && matchesStatus && matchesSearch;
  });

  // Apply sorting
  const sorted = sortMembers(filtered, sortBy, sortDir);

  // Apply pagination
  const paged = sorted.slice((page - 1) * pageSize, page * pageSize);
  const total = sorted.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  // Get selected member for modal
  const selected = users.data?.items?.find((u) => u.id === selectedId) ?? null;

  // Calculate stats
  const stats = {
    active: (users.data?.items ?? []).filter((u) => u.status === "active").length,
    pending: (users.data?.items ?? []).filter((u) => u.status === "pending_approval").length,
    suspended: (users.data?.items ?? []).filter((u) => u.status === "suspended").length,
    invited: ((useTechInvites().data ?? []).filter((i) => !i.used_at && !i.revoked_at).length +
      (useStaffInvites().data ?? []).filter((i) => !i.used_at && !i.revoked_at).length),
  };

  const filtersActive =
    roleFilter !== "" || statusFilter !== "" || debouncedSearch.trim() !== "";

  const clearFilters = () => {
    setRoleFilter("");
    setStatusFilter("");
    setSearch("");
  };

  const sortHeader = (label: string, key: SortKey) => {
    const active = sortBy === key;
    return (
      <SortHeaderButton
        label={label}
        active={active}
        ascending={sortDir === "asc"}
        onSort={() => {
          if (!active) {
            setSortBy(key);
            setSortDir(SORT_FIRST_DIR[key]);
          } else {
            setSortDir((d) => (d === "asc" ? "desc" : "asc"));
          }
        }}
      />
    );
  };

  const columnHelper = createColumnHelper<OfficeUser>();

  const columns = [
    columnHelper.display({
      id: "row",
      header: "#",
      cell: ({ row }) => (
        <span className="font-technical text-sm tabular-nums text-gray-500">
          {(page - 1) * pageSize + row.index + 1}
        </span>
      ),
      size: 40,
    }),
    columnHelper.display({
      id: "name",
      header: () => sortHeader("Name", "name"),
      cell: ({ row }) => {
        const u = row.original;
        return (
          <div className="min-w-0 max-w-52">
            <p className="truncate text-sm font-semibold text-gray-900">{memberFullName(u)}</p>
            <p className="truncate text-xs text-gray-500">{u.position || "—"}</p>
          </div>
        );
      },
    }),
    columnHelper.display({
      id: "email",
      header: () => sortHeader("Email", "email"),
      cell: ({ row }) => (
        <p className="truncate text-sm text-gray-700" title={row.original.email}>
          {row.original.email}
        </p>
      ),
    }),
    columnHelper.display({
      id: "role",
      header: "Role",
      cell: ({ row }) => (
        <Badge variant={row.original.role === "owner" ? "default" : "secondary"}>
          {row.original.role}
        </Badge>
      ),
      size: 100,
    }),
    columnHelper.display({
      id: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.original.status;
        const variant =
          status === "active"
            ? "success"
            : status === "pending_approval"
              ? "warning"
              : "secondary";
        return <Badge variant={variant}>{status.replace("_", " ")}</Badge>;
      },
      size: 120,
    }),
    columnHelper.display({
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex gap-1.5">
          <Button
            type="button"
            size="icon"
            variant="outline"
            aria-label={`Edit ${memberFullName(row.original)}`}
            onClick={() => setSelectedId(row.original.id)}
          >
            ✎
          </Button>
        </div>
      ),
      size: 60,
    }),
  ];

  const table = useReactTable({
    data: paged,
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

  return (
    <div className="min-w-0 overflow-x-clip">
      <PageHeader
        title="Team Management"
        description="Manage all staff and technician accounts, invites, and permissions."
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Active" value={String(stats.active)} icon={Users} hint="Active members" tint="teal" />
        <StatCard
          title="Pending approval"
          value={String(stats.pending)}
          icon={Users}
          hint="Awaiting approval"
          tint="warning"
        />
        <StatCard
          title="Suspended"
          value={String(stats.suspended)}
          icon={Users}
          hint="Temporarily suspended"
          tint="slate"
        />
        <StatCard title="Invited" value={String(stats.invited)} icon={Users} hint="Pending invites" tint="sky" />
      </div>

      {/* Search + Filters */}
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
            placeholder="Search name, email…"
            aria-label="Search team members"
            className="pl-10"
          />
        </div>

        <FilterPopover
          label="roles"
          display={
            roleFilter
              ? [
                  { id: "staff", name: "Staff" },
                  { id: "technician", name: "Technician" },
                ].find((r) => r.id === roleFilter)?.name ?? "All roles"
              : "All roles"
          }
          options={[
            { id: "staff", name: "Staff" },
            { id: "technician", name: "Technician" },
          ]}
          isLoading={false}
          value={roleFilter}
          onPick={setRoleFilter}
        />

        <FilterPopover
          label="statuses"
          display={
            statusFilter
              ? [
                  { id: "active", name: "Active" },
                  { id: "pending_approval", name: "Pending Approval" },
                  { id: "suspended", name: "Suspended" },
                ].find((s) => s.id === statusFilter)?.name ?? "All statuses"
              : "All statuses"
          }
          options={[
            { id: "active", name: "Active" },
            { id: "pending_approval", name: "Pending Approval" },
            { id: "suspended", name: "Suspended" },
          ]}
          isLoading={false}
          value={statusFilter}
          onPick={setStatusFilter}
        />
      </div>

      {/* Row Counter + Clear Filters */}
      <div className="flex min-h-[44px] items-center justify-between gap-2">
        <p className="text-sm text-gray-600" role="status">
          {users.data
            ? `Showing ${paged.length} of ${total} member${total !== 1 ? "s" : ""}`
            : "Loading members…"}
        </p>
        {filtersActive && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="mt-1 flex min-w-0 flex-col gap-3">
        {users.isLoading && !users.data && (
          <div aria-busy="true" aria-label="Loading team members">
            {[0, 1, 2].map((i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        )}

        {users.isError && (
          <ErrorCard
            message={users.error instanceof Error ? users.error.message : "Could not load team members."}
            onRetry={() => void users.refetch()}
          />
        )}

        {users.data && paged.length === 0 && (
          <EmptyState
            title={filtersActive ? "No members match these filters" : "No team members yet"}
            description={
              filtersActive
                ? "Try different filters or search."
                : "Invite staff and technicians to get started."
            }
            actionLabel={filtersActive ? "Clear filters" : undefined}
            onAction={filtersActive ? clearFilters : undefined}
          />
        )}

        {paged.length > 0 && (
          <>
            <div
              aria-busy={users.isFetching}
              className="thin-scroll relative min-w-0 overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&:hover::-webkit-scrollbar-track]:bg-transparent"
            >
              <TableLoadingBar active={users.isFetching && paged.length > 0} label="Refreshing team" />
              <table className="w-full min-w-[840px] border-collapse text-left">
                <thead>
                  {table.getHeaderGroups().map((hg) => (
                    <tr key={hg.id} className="border-b border-gray-200 bg-gray-50">
                      {hg.headers.map((h) => (
                        <th
                          key={h.id}
                          scope="col"
                          className={cn(
                            "whitespace-nowrap px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-gray-500",
                            h.column.id === "row" && "w-12"
                          )}
                          style={{
                            width: h.column.columnDef.size,
                          }}
                        >
                          {flexRender(h.column.columnDef.header, h.getContext())}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {table.getRowModel().rows.map((row) => (
                    <tr
                      key={row.id}
                      className={cn(
                        "border-b border-gray-100 transition-colors last:border-0 hover:bg-primary-50/60",
                        row.original.status === "pending_approval" && "bg-yellow-50/40"
                      )}
                    >
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

            {/* Pagination Footer */}
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
                    disabled={page <= 1 || users.isFetching}
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
                    disabled={page >= pageCount || users.isFetching}
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

      {/* Invite Manager Section */}
      <div className="mt-6">
        <InviteManager />
      </div>

      {/* Edit Modal */}
      <TeamMemberModal member={selected} onClose={() => setSelectedId(null)} />
    </div>
  );
}
