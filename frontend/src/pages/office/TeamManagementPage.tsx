import { useEffect, useState } from "react";
import {
  Pencil,
  Users,
} from "lucide-react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { FilteredEmptyState } from "@/components/shared/EmptyState";
import { FilterPopover, ListLoading, PaginationFooter, ResultCount, SearchField, TABLE_BASE, TableShell, TD_CELL, TH_CELL, THEAD_ROW, TR_ROW, TableLoadingBar, useDebouncedValue, SortHeaderButton } from "@/components/shared/FilterPopover";
import { ErrorCard, PageHeader } from "@/components/shared/PageHeader";
import { StatCard, StatsGrid } from "@/components/shared/StatCard";
import { ToneBadge } from "@/components/shared/ToneBadge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { OfficeUser } from "@/api/users.api";
import { useOfficeUsers, useTechInvites, useStaffInvites } from "@/hooks/useOffice";
import { pageCountOf, usePaginationState } from "@/hooks/usePaginationState";
import { cn } from "@/lib/utils";
import { TeamMemberModal } from "@/components/team/TeamMemberModal";
import { InviteManager } from "@/components/team/InviteManager";

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
  const { page, setPage, pageSize, setPageSize, resetPage, prevPage, nextPage } = usePaginationState(50);
  const [sortBy, setSortBy] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const debouncedSearch = useDebouncedValue(search, 300);

  // Reset page on filter changes
  useEffect(() => {
    resetPage();
  }, [debouncedSearch, roleFilter, statusFilter, sortBy, sortDir, pageSize, resetPage]);

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
  const pageCount = pageCountOf(total, pageSize);

  // Get selected member for modal
  const selected = users.data?.items?.find((u) => u.id === selectedId) ?? null;

  // Calculate stats
  const members = users.data?.items ?? [];
  const stats = {
    total: members.length,
    active: members.filter((u) => u.status === "active").length,
    pending: members.filter((u) => u.status === "pending_approval").length,
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
            <p className="truncate text-xs text-gray-500">{u.position || ""}</p>
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
        return (
          <ToneBadge
            map={{ active: "success", pending_approval: "warning" }}
            value={status}
            label={status.replace("_", " ")}
          />
        );
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
            <Pencil size={16} aria-hidden="true" />
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

      {/* Stat Cards — canonical slots: total · attention · live · growth */}
      <StatsGrid>
        <StatCard title="Total members" value={String(stats.total)} icon={Users} hint="Staff and technicians" tint="sky" loading={users.isLoading && !users.data} />
        <StatCard
          title="Pending approval"
          value={String(stats.pending)}
          icon={Users}
          hint="Awaiting approval"
          tint="warning"
          loading={users.isLoading && !users.data}
        />
        <StatCard title="Active" value={String(stats.active)} icon={Users} hint="Working members" tint="teal" loading={users.isLoading && !users.data} />
        <StatCard title="Invited" value={String(stats.invited)} icon={Users} hint="Pipeline growth" tint="success" loading={users.isLoading && !users.data} />
      </StatsGrid>

      {/* Search + Filters */}
      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <SearchField value={search} onChange={setSearch} placeholder="Search name, email" label="Search team members" />

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
      <ResultCount shown={paged.length} total={total} noun="member" nounPlural="members" isLoading={!users.data} loadingLabel="Loading members" filtersActive={filtersActive} onClear={clearFilters} />

      {/* Table */}
      <div className="mt-1 flex min-w-0 flex-col gap-3">
        {users.isLoading && !users.data && (
          <ListLoading label="Loading team members" />
        )}

        {users.isError && (
          <ErrorCard
            message={users.error instanceof Error ? users.error.message : "Could not load team members."}
            onRetry={() => void users.refetch()}
          />
        )}

        {users.data && paged.length === 0 && (
          <FilteredEmptyState
            filtersActive={filtersActive}
            onClearFilters={clearFilters}
            filteredTitle="No members match these filters"
            filteredDescription="Try different filters or search."
            emptyTitle="No team members yet"
            emptyDescription="Invite staff and technicians to get started."
          />
        )}

        {paged.length > 0 && (
          <>
            <TableShell shadow>
              <TableLoadingBar active={users.isFetching && paged.length > 0} label="Refreshing team" />
              <table className={cn(TABLE_BASE, "min-w-[840px]")}>
                <thead>
                  {table.getHeaderGroups().map((hg) => (
                    <tr key={hg.id} className={THEAD_ROW}>
                      {hg.headers.map((h) => (
                        <th
                          key={h.id}
                          scope="col"
                          className={cn(
                            TH_CELL,
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
                        TR_ROW,
                        row.original.status === "pending_approval" && "bg-yellow-50/40"
                      )}
                    >
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

            {/* Pagination Footer */}
            <PaginationFooter page={page} pageCount={pageCount} isFetching={users.isFetching} onPrev={prevPage} onNext={() => nextPage(pageCount)} pageSize={pageSize} onPageSize={setPageSize} />
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
