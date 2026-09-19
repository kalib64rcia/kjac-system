import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, Clock, HandCoins, Info, Wallet } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/input";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { DrawerHeader } from "@/components/shared/DrawerHeader";
import { cn } from "@/lib/utils";
import type { PayrollRecord } from "@/api/office-ext.api";
import { useOfficeUsers, usePayrollMutation, usePayrolls } from "@/hooks/useOffice";
import { pageCountOf, usePaginationState } from "@/hooks/usePaginationState";
import { toastMutation } from "@/stores/toast.store";
import { formatPeso } from "@/utils/format";

type SortKey = "newest" | "period" | "net";
const SORT_FIRST_DIR: Record<SortKey, "asc" | "desc"> = {
  newest: "desc",
  period: "desc",
  net: "desc",
};

const STATUS_OPTIONS = [
  { id: "pending", name: "Pending" },
  { id: "approved", name: "Approved" },
  { id: "paid", name: "Paid" },
  { id: "cancelled", name: "Cancelled" },
];

const STATUS_TONE: Record<string, "warning" | "info" | "success" | "secondary"> = {
  pending: "warning",
  approved: "info",
  paid: "success",
  cancelled: "secondary",
};

const METHOD_OPTIONS = [
  { id: "gcash", name: "GCash" },
  { id: "bank_transfer", name: "Bank transfer" },
  { id: "cash", name: "Cash" },
];

/** Payroll board: owner-only. Covers staff + technician employees. */
export function PayrollPage() {
  const [employee, setEmployee] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const { page, setPage, pageSize, setPageSize, resetPage, prevPage, nextPage } = usePaginationState();
  const [sortBy, setSortBy] = useState<SortKey>("newest");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [generating, setGenerating] = useState(false);

  const debouncedSearch = useDebouncedValue(search, 300);

  useEffect(() => {
    resetPage();
  }, [employee, status, pageSize, sortBy, sortDir, debouncedSearch, resetPage]);

  const list = usePayrolls({
    employee_user_id: employee ? Number(employee) : undefined,
    payroll_status: status || undefined,
    search: debouncedSearch.trim() || undefined,
    page,
    limit: pageSize,
    sort_by: sortBy,
    sort_dir: sortDir,
  });
  const pendingCount = usePayrolls({ payroll_status: "pending", page: 1, limit: 1 });
  const approvedCount = usePayrolls({ payroll_status: "approved", page: 1, limit: 1 });
  const paidCount = usePayrolls({ payroll_status: "paid", page: 1, limit: 1 });
  const totalCount = usePayrolls({ page: 1, limit: 1 });
  const employees = useOfficeUsers();

  const items = list.data?.items ?? [];
  const total = list.data?.total ?? 0;
  const pageCount = pageCountOf(total, pageSize);
  const selected = items.find((p) => p.id === selectedId) ?? null;

  const employeeOptions = useMemo(
    () => (employees.data?.items ?? [])
      .filter((u) => u.role === "staff" || u.role === "technician")
      .map((u) => ({ id: String(u.id), name: `${u.first_name} ${u.last_name}`.trim() || u.email })),
    [employees.data],
  );
  const employeeName = (id: number) =>
    employeeOptions.find((o) => o.id === String(id))?.name ?? `Employee #${id}`;

  const filtersActive = employee !== "" || status !== "" || search.trim() !== "";
  const clearFilters = () => { setEmployee(""); setStatus(""); setSearch(""); };

  const columnHelper = createColumnHelper<PayrollRecord>();

  const onSort = (key: Exclude<SortKey, "newest">) => {
    if (sortBy !== key) {
      setSortBy(key);
      setSortDir(SORT_FIRST_DIR[key]);
    } else {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    }
  };

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
        id: "employee",
        header: "Employee",
        cell: ({ row }) => (
          <p className="whitespace-nowrap text-sm font-semibold text-gray-900">{employeeName(row.original.employee_user_id)}</p>
        ),
      }),
      columnHelper.display({
        id: "period",
        header: () => (
          <SortHeaderButton label="Period" active={sortBy === "period"} ascending={sortDir === "asc"} onSort={() => onSort("period")} />
        ),
        cell: ({ row }) => {
          const p = row.original;
          return (
            <p className="whitespace-nowrap font-technical text-sm tabular-nums text-gray-900">
              {p.period_start_date} → {p.period_end_date}
            </p>
          );
        },
      }),
      columnHelper.display({
        id: "net",
        header: () => (
          <SortHeaderButton label="Net pay" active={sortBy === "net"} ascending={sortDir === "asc"} onSort={() => onSort("net")} />
        ),
        cell: ({ row }) => (
          <p className="whitespace-nowrap font-technical text-sm font-semibold tabular-nums text-gray-900">
            {formatPeso(row.original.net_pay)}
          </p>
        ),
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
          <Button type="button" variant="outline" size="sm" onClick={() => { setSelectedId(row.original.id); setGenerating(false); }}>
            Review
          </Button>
        ),
      }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [page, pageSize, sortBy, sortDir, employees.data],
  );

  const table = useReactTable({
    data: items,
    columns,
    manualPagination: true,
    manualSorting: true,
    pageCount,
    state: { pagination: { pageIndex: page - 1, pageSize } },
    onPaginationChange: (updater) => {
      const current = { pageIndex: page - 1, pageSize };
      const next = typeof updater === "function" ? updater(current) : updater;
      setPage(next.pageIndex + 1);
    },
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="min-w-0 overflow-x-clip">
      <PageHeader title="Payroll" description="Generate pay for staff and technicians, then approve and mark paid." />
      <StatsGrid>
        <StatCard title="Total records" value={String(totalCount.data?.total ?? "–")} icon={HandCoins} hint="All payroll runs" tint="sky" loading={totalCount.isLoading && !totalCount.data} />
        <StatCard title="Pending" value={String(pendingCount.data?.total ?? "–")} icon={Clock} hint="Awaiting review" tint="warning" loading={pendingCount.isLoading && !pendingCount.data} />
        <StatCard title="Approved" value={String(approvedCount.data?.total ?? "–")} icon={BadgeCheck} hint="Ready to pay" tint="teal" loading={approvedCount.isLoading && !approvedCount.data} />
        <StatCard title="Paid" value={String(paidCount.data?.total ?? "–")} icon={Wallet} hint="Completed payouts" tint="success" loading={paidCount.isLoading && !paidCount.data} />
      </StatsGrid>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <SearchField value={search} onChange={setSearch} placeholder="Search employee name or email…" label="Search payroll" />
        <FilterPopover
          label="employees"
          display={employee ? (employeeOptions.find((o) => o.id === employee)?.name ?? "All employees") : "All employees"}
          options={employeeOptions}
          isLoading={employees.isLoading}
          value={employee}
          onPick={setEmployee}
        />
        <FilterPopover
          label="statuses"
          display={status ? STATUS_OPTIONS.find((o) => o.id === status)?.name ?? status : "All statuses"}
          options={STATUS_OPTIONS}
          isLoading={false}
          value={status}
          onPick={setStatus}
        />
        <Button type="button" onClick={() => { setGenerating(true); setSelectedId(null); }}>
          <HandCoins size={16} aria-hidden="true" data-icon="inline-start" />
          Generate payroll
        </Button>
      </div>

      <ResultCount shown={items.length} total={total} noun="record" nounPlural="records" isLoading={!list.data} loadingLabel="Loading payroll…" filtersActive={filtersActive} onClear={clearFilters} />

      <div className="mt-1 flex min-w-0 flex-col gap-3">
        {list.isLoading && !list.data && (
          <ListLoading label="Loading payroll" />
        )}
        {list.isError && (
          <ErrorCard message={list.error instanceof Error ? list.error.message : "Could not load payroll."} onRetry={() => void list.refetch()} />
        )}
        {list.data && items.length === 0 && (
          <FilteredEmptyState
            filtersActive={filtersActive}
            onClearFilters={clearFilters}
            filteredTitle="No records match these filters"
            filteredDescription="Try another employee or status."
            emptyTitle="No payroll yet"
            emptyDescription="Generate the first payroll period to get started."
            actionLabel="Generate payroll"
            onAction={() => setGenerating(true)}
          />
        )}
        {items.length > 0 && (
          <>
            <TableShell>
              <TableLoadingBar active={list.isFetching && items.length > 0} label="Refreshing payroll" />
              <table className={cn(TABLE_BASE, "min-w-[760px]")}>
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
            <PaginationFooter page={page} pageCount={pageCount} isFetching={list.isFetching} onPrev={prevPage} onNext={() => nextPage(pageCount)} pageSize={pageSize} onPageSize={setPageSize} />
          </>
        )}
      </div>

      <PayrollSheet
        record={selected}
        employeeName={selected ? employeeName(selected.employee_user_id) : ""}
        generating={generating}
        employeeOptions={employeeOptions}
        onClose={() => { setSelectedId(null); setGenerating(false); }}
      />
    </div>
  );
}

function MoneyField({ label, value, onChange, disabled }: { label: string; value: string; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label} (₱)</Label>
      <Input type="number" min={0} step="0.01" value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} className="font-technical tabular-nums" />
    </div>
  );
}

function PayrollSheet({ record, employeeName, generating, employeeOptions, onClose }: {
  record: PayrollRecord | null;
  employeeName: string;
  generating: boolean;
  employeeOptions: { id: string; name: string }[];
  onClose: () => void;
}) {
  const open = generating || record !== null;
  const mutations = usePayrollMutation();
  const [form, setForm] = useState({
    employee_user_id: "", period_start_date: "", period_end_date: "", payment_date: "",
    base_salary: "0", overtime_pay: "0", bonuses: "0", other_earnings: "0",
    tax_withheld: "0", sss_contribution: "0", philhealth_contribution: "0", pagibig_contribution: "0",
    other_deductions: "0", notes: "",
  });
  const [method, setMethod] = useState("gcash");

  useEffect(() => {
    if (generating) {
      setForm({
        employee_user_id: "", period_start_date: "", period_end_date: "", payment_date: "",
        base_salary: "0", overtime_pay: "0", bonuses: "0", other_earnings: "0",
        tax_withheld: "0", sss_contribution: "0", philhealth_contribution: "0", pagibig_contribution: "0",
        other_deductions: "0", notes: "",
      });
    }
  }, [generating]);

  const busy = mutations.generate.isPending || mutations.transition.isPending;
  const num = (v: string) => (v.trim() === "" ? 0 : Number(v));

  const submitGenerate = async () => {
    const generated = await toastMutation(() => mutations.generate.mutateAsync({
      employee_user_id: Number(form.employee_user_id),
      period_start_date: form.period_start_date,
      period_end_date: form.period_end_date,
      payment_date: form.payment_date,
      base_salary: num(form.base_salary),
      overtime_pay: num(form.overtime_pay),
      bonuses: num(form.bonuses),
      other_earnings: num(form.other_earnings),
      tax_withheld: num(form.tax_withheld),
      sss_contribution: num(form.sss_contribution),
      philhealth_contribution: num(form.philhealth_contribution),
      pagibig_contribution: num(form.pagibig_contribution),
      other_deductions: num(form.other_deductions),
      notes: form.notes.trim() || null,
    }), {
      success: "Payroll generated.",
      successDetail: "Commission was computed from completed jobs.",
      error: "Could not generate payroll.",
    });
    if (generated === null) return;
    onClose();
  };

  const transition = async (action: "approve" | "pay" | "cancel") => {
    if (!record) return;
    const done = await toastMutation(() => mutations.transition.mutateAsync({
      id: record.id,
      action,
      payment_method: action === "pay" ? method : null,
    }), {
      success: action === "pay" ? "Marked as paid." : action === "approve" ? "Payroll approved." : "Payroll cancelled.",
      error: "Action failed.",
    });
    if (done === null) return;
    onClose();
  };

  const validGenerate =
    form.employee_user_id !== "" && form.period_start_date !== "" &&
    form.period_end_date !== "" && form.payment_date !== "" &&
    form.period_end_date >= form.period_start_date;

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent label={generating ? "Generate payroll" : "Payroll detail"} side="right" onClose={onClose} className="w-[440px] max-w-[94vw] p-0">
        <DrawerHeader title={generating ? "Generate payroll" : employeeName} onClose={onClose} />
        <div className="thin-scroll flex-1 overflow-y-auto p-6">
        {generating ? (
          <div className="mt-4 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Employee *</Label>
              <select
                value={form.employee_user_id}
                onChange={(e) => setForm({ ...form, employee_user_id: e.target.value })}
                disabled={busy}
                className="min-h-[44px] cursor-pointer appearance-none rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-primary-600 focus:outline-none"
              >
                <option value="">Select employee…</option>
                {employeeOptions.map((o) => (<option key={o.id} value={o.id}>{o.name}</option>))}
              </select>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <Label>Period from *</Label>
                <Input type="date" value={form.period_start_date} onChange={(e) => setForm({ ...form, period_start_date: e.target.value })} disabled={busy} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Period to *</Label>
                <Input type="date" value={form.period_end_date} onChange={(e) => setForm({ ...form, period_end_date: e.target.value })} disabled={busy} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Pay date *</Label>
                <Input type="date" value={form.payment_date} onChange={(e) => setForm({ ...form, payment_date: e.target.value })} disabled={busy} />
              </div>
            </div>
            <div>
              <h3 className="mb-2 text-sm font-semibold text-gray-900">Earnings</h3>
              <div className="grid grid-cols-2 gap-3">
                <MoneyField label="Base salary" value={form.base_salary} onChange={(v) => setForm({ ...form, base_salary: v })} disabled={busy} />
                <MoneyField label="Overtime" value={form.overtime_pay} onChange={(v) => setForm({ ...form, overtime_pay: v })} disabled={busy} />
                <MoneyField label="Bonuses" value={form.bonuses} onChange={(v) => setForm({ ...form, bonuses: v })} disabled={busy} />
                <MoneyField label="Other" value={form.other_earnings} onChange={(v) => setForm({ ...form, other_earnings: v })} disabled={busy} />
              </div>
            </div>
            <div>
              <h3 className="mb-2 text-sm font-semibold text-gray-900">Deductions</h3>
              <div className="grid grid-cols-2 gap-3">
                <MoneyField label="Tax" value={form.tax_withheld} onChange={(v) => setForm({ ...form, tax_withheld: v })} disabled={busy} />
                <MoneyField label="SSS" value={form.sss_contribution} onChange={(v) => setForm({ ...form, sss_contribution: v })} disabled={busy} />
                <MoneyField label="PhilHealth" value={form.philhealth_contribution} onChange={(v) => setForm({ ...form, philhealth_contribution: v })} disabled={busy} />
                <MoneyField label="Pag-IBIG" value={form.pagibig_contribution} onChange={(v) => setForm({ ...form, pagibig_contribution: v })} disabled={busy} />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Notes</Label>
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional" disabled={busy} maxLength={1000} />
            </div>
            <p className="text-xs text-gray-600">Commission is computed server-side from completed jobs in the period. Overlapping periods are refused.</p>
            <Button type="button" onClick={() => void submitGenerate()} disabled={!validGenerate || busy}>
              {mutations.generate.isPending ? "Generating…" : "Generate"}
            </Button>
          </div>
        ) : record ? (
          <div className="mt-4 flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-1.5">
              <ToneBadge map={STATUS_TONE} value={record.status} />
              {record.payment_method && <Badge variant="secondary">{METHOD_OPTIONS.find((m) => m.id === record.payment_method)?.name ?? record.payment_method}</Badge>}
            </div>
            <dl className="flex flex-col gap-2 rounded-lg border border-gray-200 p-3 text-sm">
              <div className="flex justify-between gap-2"><dt className="text-gray-600">Period</dt><dd className="font-technical tabular-nums text-gray-900">{record.period_start_date} → {record.period_end_date}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-gray-600">Pay date</dt><dd className="font-technical tabular-nums text-gray-900">{record.payment_date}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-gray-600">Base salary</dt><dd className="font-technical tabular-nums text-gray-900">{formatPeso(record.base_salary)}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-gray-600">Commission</dt><dd className="font-technical tabular-nums text-gray-900">{formatPeso(record.commission)}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-gray-600">Total earnings</dt><dd className="font-technical tabular-nums text-gray-900">{formatPeso(record.total_earnings)}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-gray-600">Total deductions</dt><dd className="font-technical tabular-nums text-gray-900">{formatPeso(record.total_deductions)}</dd></div>
              <div className="flex justify-between gap-2 border-t border-gray-100 pt-2"><dt className="font-semibold text-gray-900">Net pay</dt><dd className="font-technical font-semibold tabular-nums text-gray-900">{formatPeso(record.net_pay)}</dd></div>
            </dl>
            {record.status === "pending" && (
              <div className="flex gap-2">
                <Button type="button" onClick={() => void transition("approve")} disabled={busy} className="flex-1">
                  {busy ? "Working…" : "Approve"}
                </Button>
                <Button type="button" variant="destructiveOutline" onClick={() => void transition("cancel")} disabled={busy} className="flex-1">
                  Cancel
                </Button>
              </div>
            )}
            {record.status === "approved" && (
              <div className="flex flex-col gap-2 rounded-lg border border-gray-200 p-3">
                <Label>Payment method *</Label>
                <div className="flex gap-2" role="radiogroup" aria-label="Payment method">
                  {METHOD_OPTIONS.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      role="radio"
                      aria-checked={method === m.id}
                      onClick={() => setMethod(m.id)}
                      disabled={busy}
                      className={method === m.id
                        ? "min-h-[44px] flex-1 cursor-pointer rounded-lg bg-primary-400 px-3 text-sm font-semibold text-white"
                        : "min-h-[44px] flex-1 cursor-pointer rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"}
                    >
                      {m.name}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button type="button" onClick={() => void transition("pay")} disabled={busy} className="flex-1">
                    {busy ? "Working…" : "Mark paid"}
                  </Button>
                  <Button type="button" variant="destructiveOutline" onClick={() => void transition("cancel")} disabled={busy} className="flex-1">
                    Cancel
                  </Button>
                </div>
              </div>
            )}
            {(record.status === "paid" || record.status === "cancelled") && (
              <p className="text-xs text-gray-600">
                {record.status === "paid" ? "Paid out. Payslip PDF arrives in a later phase." : "Cancelled records stay for the audit trail."}
              </p>
            )}
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <Info size={12} aria-hidden="true" />
              Full earnings breakdown (overtime, bonuses) is server-computed; payslip export ships later.
            </div>
          </div>
        ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
