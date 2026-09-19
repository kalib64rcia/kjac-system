import { useState } from "react";
import { ClipboardClock, Download, LayoutGrid, TriangleAlert, Wallet } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorCard, PageHeader } from "@/components/shared/PageHeader";
import { StatCard, StatsGrid } from "@/components/shared/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/input";
import { CardSkeleton } from "@/components/ui/skeleton";
import { FilterPopover } from "@/components/shared/FilterPopover";
import { ApiError } from "@/api/errors";
import { reportsApi, type BookingsReport, type RevenueReport } from "@/api/office-ext.api";
import { useBookingsReport, useRevenueReport } from "@/hooks/useOffice";
import { toast } from "@/stores/toast.store";
import { manilaToday } from "@/utils/format";
import { formatPeso } from "@/utils/format";

const STATUS_OPTIONS = [
  { id: "submitted", name: "Submitted" },
  { id: "pending", name: "Pending" },
  { id: "confirmed", name: "Confirmed" },
  { id: "ongoing", name: "Ongoing" },
  { id: "completed", name: "Completed" },
  { id: "cancelled", name: "Cancelled" },
  { id: "expired", name: "Expired" },
];

function monthAgo(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Canonical stat slots: range total · attention · live mix · money. */
function ReportStats({ bookings, revenue, dateFrom, dateTo }: {
  bookings: BookingsReport;
  revenue: RevenueReport;
  dateFrom: string;
  dateTo: string;
}) {
  const troubled = bookings.items.filter((b) => b.status === "cancelled" || b.status === "expired").length;
  return (
    <StatsGrid>
      <StatCard title="Bookings" value={String(bookings.total)} icon={ClipboardClock} hint={`${dateFrom} → ${dateTo}`} tint="sky" />
      <StatCard title="Cancelled + expired" value={String(troubled)} icon={TriangleAlert} hint="Needs follow-up" tint="warning" />
      <StatCard title="Services earning" value={String(revenue.by_service.length)} icon={LayoutGrid} hint="With verified payments" tint="teal" />
      <StatCard title="Verified revenue" value={formatPeso(revenue.grand_total)} icon={Wallet} hint="Verified payments only" tint="success" />
    </StatsGrid>
  );
}

/** Reports board: shared by owner + staff routes. JSON tables + CSV export (PDF later). */
export function ReportsPage() {
  const [from, setFrom] = useState(monthAgo());
  const [to, setTo] = useState(manilaToday());
  const [status, setStatus] = useState("");
  const [run, setRun] = useState<{ date_from: string; date_to: string; status?: string } | null>(null);
  const [downloading, setDownloading] = useState(false);

  const rangeValid = from !== "" && to !== "" && to >= from;
  const bookings = useBookingsReport(run);
  const revenue = useRevenueReport(run ? { date_from: run.date_from, date_to: run.date_to } : null);

  const downloadCsv = async () => {
    if (!run) return;
    setDownloading(true);
    try {
      const blob = await reportsApi.bookingsCsv({ date_from: run.date_from, date_to: run.date_to, status: run.status });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bookings-${run.date_from}-${run.date_to}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("CSV downloaded.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not download CSV.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-w-0">
      <PageHeader title="Reports" description="Bookings and revenue for any date range. Export CSV for accounting." />
      <Card>
        <CardContent>
          <div className="flex flex-col gap-3 pt-6 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rep-from">From *</Label>
              <Input id="rep-from" type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} className="font-technical tabular-nums" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rep-to">To *</Label>
              <Input id="rep-to" type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} className="font-technical tabular-nums" />
            </div>
            <FilterPopover
              label="statuses"
              display={status ? STATUS_OPTIONS.find((o) => o.id === status)?.name ?? status : "All statuses"}
              options={STATUS_OPTIONS}
              isLoading={false}
              value={status}
              onPick={setStatus}
            />
            <Button
              type="button"
              onClick={() => setRun({ date_from: from, date_to: to, status: status || undefined })}
              disabled={!rangeValid}
            >
              Run report
            </Button>
            {run && (
              <Button type="button" variant="outline" onClick={() => void downloadCsv()} disabled={downloading}>
                <Download size={16} aria-hidden="true" data-icon="inline-start" />
                {downloading ? "Preparing…" : "Download CSV"}
              </Button>
            )}
          </div>
          {!rangeValid && (
            <p role="alert" className="pt-2 text-sm text-error-600">Pick a valid range: “to” must not come before “from”.</p>
          )}
        </CardContent>
      </Card>

      {run === null && (
        <div className="mt-4">
          <EmptyState title="No report yet" description="Pick a date range and run the report to see bookings and revenue." />
        </div>
      )}

      {run !== null && (
        <div className="mt-4 flex min-w-0 flex-col gap-4">
          {(bookings.isLoading || revenue.isLoading) && !bookings.data && !revenue.data && (
            <div aria-busy="true" aria-label="Loading report">{[0, 1].map((i) => (<CardSkeleton key={i} />))}</div>
          )}
          {(bookings.isError || revenue.isError) && (
            <ErrorCard
              message={bookings.error instanceof Error ? bookings.error.message : revenue.error instanceof Error ? revenue.error.message : "Could not load the report."}
              onRetry={() => { void bookings.refetch(); void revenue.refetch(); }}
            />
          )}
          {bookings.data && revenue.data && (
            <>
              <ReportStats bookings={bookings.data} revenue={revenue.data} dateFrom={run.date_from} dateTo={run.date_to} />
              <Card>
                <CardHeader><CardTitle>Revenue by day</CardTitle></CardHeader>
                <CardContent>
                  {revenue.data.by_day.length === 0 ? (
                    <p className="text-sm text-gray-600">No verified payments in this range.</p>
                  ) : (
                    <div className="h-64 w-full" role="img" aria-label={`Revenue by day, total ₱${revenue.data.grand_total}`}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={revenue.data.by_day} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                          <XAxis dataKey="day" tick={{ fontSize: 11 }} tickLine={false} axisLine={{ stroke: "#E5E7EB" }} minTickGap={24} />
                          <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={64} tickFormatter={(v: number) => `₱${Number(v).toLocaleString("en-PH", { maximumFractionDigits: 0 })}`} />
                          <Tooltip formatter={(v) => [formatPeso(Number(v)), "Revenue"]} labelClassName="text-gray-900" />
                          <Bar dataKey="total" fill="#38b6ff" radius={[6, 6, 0, 0]} maxBarSize={36} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Revenue by service</CardTitle></CardHeader>
                <CardContent>
                  {revenue.data.by_service.length === 0 ? (
                    <p className="text-sm text-gray-600">Nothing to break down yet.</p>
                  ) : (
                    <ul className="flex flex-col divide-y divide-gray-100">
                      {revenue.data.by_service.map((row) => (
                        <li key={row.service} className="flex items-center justify-between gap-2 py-2 text-sm">
                          <span className="min-w-0 truncate font-medium text-gray-900">{row.service}</span>
                          <span className="shrink-0 font-technical tabular-nums text-gray-900">
                            {formatPeso(row.total)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Bookings ({bookings.data.total})</CardTitle></CardHeader>
                <CardContent>
                  {bookings.data.items.length === 0 ? (
                    <p className="text-sm text-gray-600">No bookings in this range.</p>
                  ) : (
                    <div className="thin-scroll overflow-x-auto">
                      <table className="w-full min-w-[560px] border-collapse text-left">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th scope="col" className="whitespace-nowrap px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-gray-500">Reference</th>
                            <th scope="col" className="whitespace-nowrap px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-gray-500">Status</th>
                            <th scope="col" className="whitespace-nowrap px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-gray-500">Down payment</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bookings.data.items.map((b) => (
                            <tr key={b.reference_id} className="border-b border-gray-100 last:border-0">
                              <td className="px-3 py-2.5 font-technical text-sm tabular-nums text-gray-900">{b.reference_id}</td>
                              <td className="px-3 py-2.5"><Badge variant="secondary">{b.status}</Badge></td>
                              <td className="px-3 py-2.5 font-technical text-sm tabular-nums text-gray-900">
                                {formatPeso(Number(b.down_payment_amount))}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}
    </div>
  );
}
