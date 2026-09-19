import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ErrorCard, PageHeader } from "@/components/shared/PageHeader";
import { StatCard, StatsGrid } from "@/components/shared/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CardSkeleton } from "@/components/ui/skeleton";
import { useDashboard } from "@/hooks/useOffice";
import { BarChart3, CalendarCheck, UserPlus, Users, Wallet } from "lucide-react";
import { formatPeso } from "@/utils/format";

/** Analytics board: owner-only. Same data feeds the owner dashboard. */
export function AnalyticsPage() {
  const dashboard = useDashboard(true);

  return (
    <div className="min-w-0">
      <PageHeader title="Analytics" description="Today, this month, and the trends behind them." />
      {dashboard.isLoading && !dashboard.data && (
        <div aria-busy="true" aria-label="Loading analytics">{[0, 1, 2].map((i) => (<CardSkeleton key={i} />))}</div>
      )}
      {dashboard.isError && (
        <ErrorCard message={dashboard.error instanceof Error ? dashboard.error.message : "Could not load analytics."} onRetry={() => void dashboard.refetch()} />
      )}
      {dashboard.data && (
        <div className="flex min-w-0 flex-col gap-4">
          <section aria-label="Today">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-gray-500">Today</h2>
            <StatsGrid>
              <StatCard title="Appointments" value={String(dashboard.data.today.appointments)} icon={CalendarCheck} hint="On the board today" tint="sky" />
              <StatCard title="Pending bookings" value={String(dashboard.data.today.pending_bookings)} icon={Users} hint="Needs action" tint="warning" />
              <StatCard title="Active technicians" value={String(dashboard.data.today.active_technicians)} icon={Users} hint="On jobs" tint="teal" />
              <StatCard title="Revenue today" value={formatPeso(dashboard.data.today.revenue)} icon={Wallet} hint="Verified payments" tint="success" />
            </StatsGrid>
          </section>
          <section aria-label="This month">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-gray-500">This month</h2>
            <StatsGrid>
              <StatCard title="Total bookings" value={String(dashboard.data.this_month.total_bookings)} icon={BarChart3} tint="sky" />
              <StatCard title="Cancelled" value={String(dashboard.data.this_month.cancelled_bookings)} icon={CalendarCheck} hint="Needs follow-up" tint="warning" />
              <StatCard title="New customers" value={String(dashboard.data.this_month.new_customers)} icon={UserPlus} tint="teal" />
              <StatCard title="Revenue" value={formatPeso(dashboard.data.this_month.revenue)} icon={Wallet} tint="success" />
            </StatsGrid>
            <p className="mt-2 text-sm tabular-nums text-gray-600">
              {dashboard.data.this_month.completed_bookings} of {dashboard.data.this_month.total_bookings} completed.
            </p>
          </section>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Revenue by month</CardTitle></CardHeader>
              <CardContent>
                {dashboard.data.charts.revenue_by_month.length === 0 ? (
                  <p className="text-sm text-gray-600">No revenue history yet.</p>
                ) : (
                  <div className="h-64 w-full" role="img" aria-label="Revenue by month chart">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dashboard.data.charts.revenue_by_month} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                        <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={{ stroke: "#E5E7EB" }} minTickGap={16} />
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
              <CardHeader><CardTitle>Bookings by service</CardTitle></CardHeader>
              <CardContent>
                {dashboard.data.charts.bookings_by_service.length === 0 ? (
                  <p className="text-sm text-gray-600">No bookings to break down yet.</p>
                ) : (
                  <div className="h-64 w-full" role="img" aria-label="Bookings by service chart">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dashboard.data.charts.bookings_by_service} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                        <YAxis type="category" dataKey="service" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={110} />
                        <Tooltip formatter={(v) => [v, "Bookings"]} labelClassName="text-gray-900" />
                        <Bar dataKey="count" fill="#1e90da" radius={[0, 6, 6, 0]} maxBarSize={22} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader><CardTitle>Customer growth</CardTitle></CardHeader>
            <CardContent>
              {dashboard.data.charts.customer_growth.length === 0 ? (
                <p className="text-sm text-gray-600">No growth history yet.</p>
              ) : (
                <div className="h-56 w-full" role="img" aria-label="Customer growth chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dashboard.data.charts.customer_growth} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={{ stroke: "#E5E7EB" }} minTickGap={16} />
                      <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={48} allowDecimals={false} />
                      <Tooltip formatter={(v) => [v, "New customers"]} labelClassName="text-gray-900" />
                      <Line type="monotone" dataKey="new_customers" stroke="#0d9488" strokeWidth={2} dot={{ r: 3, fill: "#0d9488" }} activeDot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
