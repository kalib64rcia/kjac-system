import { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuditLogs } from "@/hooks/useOffice";
import { cn } from "@/lib/utils";

const TABLES = ["users", "bookings", "payments", "refunds", "inventory_items", "payroll_records"];
const ACTIONS = ["INSERT", "UPDATE", "DELETE"];

/** Owner (or audit-granted staff) immutable trail viewer. Nobody can edit rows. */
export function AuditPage() {
  const [table, setTable] = useState<string | undefined>(undefined);
  const [action, setAction] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);
  const logs = useAuditLogs({ table_name: table, action, page });

  const pick = (label: string, active: boolean, onClick: () => void) => (
    <button
      key={label}
      type="button"
      onClick={() => { onClick(); setPage(1); }}
      aria-pressed={active}
      className={cn(
        "min-h-[44px] cursor-pointer rounded-lg px-3 text-sm font-semibold",
        active ? "bg-primary-50 text-primary-700" : "text-gray-500 hover:bg-gray-50",
      )}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Audit Logs"
        description="Tamper-proof trail — every change with actor and microsecond timestamp. Read-only."
      />
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <div className="mt-2 flex flex-wrap gap-1" aria-label="Table filter">
            {pick("all tables", !table, () => setTable(undefined))}
            {TABLES.map((t) => pick(t, table === t, () => setTable(table === t ? undefined : t)))}
          </div>
          <div className="mt-1 flex flex-wrap gap-1" aria-label="Action filter">
            {pick("all actions", !action, () => setAction(undefined))}
            {ACTIONS.map((a) => pick(a, action === a, () => setAction(action === a ? undefined : a)))}
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {logs.isPending && <p className="text-sm text-gray-500">Loading trail…</p>}
          {(logs.data?.items ?? []).map((log) => (
            <details key={log.id} className="rounded-lg border border-gray-200 bg-white px-3 py-2">
              <summary className="flex min-h-[44px] cursor-pointer flex-wrap items-center gap-2 text-sm">
                <span className="font-technical text-gray-500">#{log.id}</span>
                <Badge variant={
                  log.action === "DELETE" ? "destructive" : log.action === "INSERT" ? "success" : "default"
                }>
                  {log.action}
                </Badge>
                <span className="font-medium text-gray-900">{log.table_name} #{log.record_id}</span>
                <span className="text-gray-500">
                  by {log.user_id ? `user #${log.user_id}` : "system"}
                </span>
                <span className="ml-auto font-technical text-xs text-gray-500">
                  {new Date(log.created_at).toLocaleString()}
                </span>
              </summary>
              <pre className="thin-scroll mt-2 overflow-x-auto rounded-md bg-gray-50 p-3 font-technical text-xs text-gray-700">
                {JSON.stringify({ before: log.old_data, after: log.new_data }, null, 2)}
              </pre>
            </details>
          ))}
          {!logs.isPending && (logs.data?.items ?? []).length === 0 && (
            <p className="text-sm text-gray-500">No entries match.</p>
          )}
          <div className="mt-2 flex items-center justify-between">
            <p className="text-sm text-gray-500">{logs.data?.total ?? 0} entries</p>
            <div className="flex gap-2">
              <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
                className="min-h-[44px] cursor-pointer rounded-lg border border-gray-200 px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40">
                Newer
              </button>
              <button type="button" onClick={() => setPage((p) => p + 1)}
                className="min-h-[44px] cursor-pointer rounded-lg border border-gray-200 px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                Older
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
