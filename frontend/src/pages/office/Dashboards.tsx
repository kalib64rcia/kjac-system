import { Link } from "react-router-dom";
import {
  ClipboardClock,
  Package,
  Users,
  Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CardSkeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/stores/auth.store";
import { useDashboard, useRefunds } from "@/hooks/useOffice";
import { useOfficeUsers } from "@/hooks/useOffice";

function OwnerShortcuts() {
  const refunds = useRefunds("proposed");
  const pending = useOfficeUsers({ status: "pending_approval" });
  const proposed = refunds.data?.total ?? 0;
  const approvals = (pending.data?.items ?? []).length;
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Link to="/owner/team" className="cursor-pointer">
        <StatCard title="Pending approvals" value={String(approvals)} icon={Users}
          hint="Staff and technician applications" />
      </Link>
      <Link to="/owner/refunds" className="cursor-pointer">
        <StatCard title="Refund proposals" value={String(proposed)} icon={Wallet}
          hint="Awaiting your decision" />
      </Link>
      <Link to="/owner/bookings" className="cursor-pointer">
        <StatCard title="Bookings" value="→" icon={ClipboardClock} hint="Open dispatch board" />
      </Link>
      <Link to="/owner/team" className="cursor-pointer">
        <StatCard title="Team" value="→" icon={Users} hint="Manage staff and grants" />
      </Link>
    </div>
  );
}

function peso(n: number): string {
  return `₱${Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
}

/** Owner home: oversight + pending decisions + live business pulse. */
export function OwnerDashboardPage() {
  const user = useAuthStore((s) => s.user);
  const first = user?.first_name || "Owner";
  const dashboard = useDashboard(user?.role === "owner");
  return (
    <div className="min-w-0">
      <PageHeader title={`Good day, ${first}`} description="Overview of pending approvals, refunds, and daily operations." />
      <OwnerShortcuts />
      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Today at a glance</CardTitle>
          </CardHeader>
          <CardContent>
            {dashboard.isLoading && !dashboard.data && (
              <div aria-busy="true" aria-label="Loading today's stats">
                <CardSkeleton />
              </div>
            )}
            {dashboard.data ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard title="Appointments" value={String(dashboard.data.today.appointments)} icon={ClipboardClock} hint="On the board today" tint="sky" />
                <StatCard title="Pending bookings" value={String(dashboard.data.today.pending_bookings)} icon={ClipboardClock} hint="Needs action" tint="warning" />
                <StatCard title="Active technicians" value={String(dashboard.data.today.active_technicians)} icon={Users} hint="On jobs" tint="teal" />
                <StatCard title="Revenue today" value={peso(dashboard.data.today.revenue)} icon={Wallet} hint="Verified payments" tint="success" />
              </div>
            ) : (
              !dashboard.isLoading && (
                <p className="text-sm text-gray-600">
                  Live figures are unavailable right now. Full trends live on the{" "}
                  <Link to="/owner/analytics" className="font-semibold text-primary-600 hover:underline">Analytics</Link>{" "}
                  page.
                </p>
              )
            )}
            {dashboard.data && (
              <p className="mt-4 text-sm text-gray-600">
                This month: <span className="font-semibold tabular-nums text-gray-900">{dashboard.data.this_month.total_bookings}</span> bookings ·{" "}
                <span className="font-semibold tabular-nums text-gray-900">{peso(dashboard.data.this_month.revenue)}</span> revenue ·{" "}
                <Link to="/owner/analytics" className="font-semibold text-primary-600 hover:underline">Open analytics →</Link>
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StaffShortcuts() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Link to="/staff/bookings" className="cursor-pointer">
        <StatCard title="Bookings" value="→" icon={ClipboardClock} hint="Today's dispatch board" />
      </Link>
      <Link to="/staff/payments" className="cursor-pointer">
        <StatCard title="Payments" value="→" icon={Wallet} hint="Verify receipts" />
      </Link>
      <Link to="/staff/team" className="cursor-pointer">
        <StatCard title="Team" value="→" icon={Users} hint="Records and invites" />
      </Link>
      <Link to="/staff/inventory" className="cursor-pointer">
        <StatCard title="Inventory" value="→" icon={Package} hint="Stock and movements" />
      </Link>
    </div>
  );
}

/** Staff home: today's operational work. No revenue, no payroll, no settings. */
export function StaffDashboardPage() {
  const user = useAuthStore((s) => s.user);
  const first = user?.first_name || "there";
  return (
    <div className="min-w-0">
      <PageHeader
        title={`Good day, ${first}`}
        description="Overview of today's bookings, payments, and assignments."
      />
      <StaffShortcuts />
      <div className="mt-6">
        <Card>
          <CardHeader><CardTitle>How today works</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Verify payment receipts, assign technicians to bookings, and submit refunds for owner review.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
