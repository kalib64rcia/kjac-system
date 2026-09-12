import { Link } from "react-router-dom";
import {
  BookOpenCheck,
  ClipboardList,
  Package,
  Users,
  Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/stores/auth.store";
import { useRefunds } from "@/hooks/useOffice";
import { useOfficeUsers } from "@/hooks/useOffice";

function OwnerShortcuts() {
  const refunds = useRefunds("proposed");
  const pending = useOfficeUsers({ status: "pending_approval" });
  const proposed = refunds.data?.total ?? 0;
  const approvals = (pending.data?.items ?? []).length;
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Link to="/owner/approvals" className="cursor-pointer">
        <StatCard title="Pending approvals" value={String(approvals)} icon={BookOpenCheck}
          hint="Staff + technician applications" />
      </Link>
      <Link to="/owner/payments" className="cursor-pointer">
        <StatCard title="Refund proposals" value={String(proposed)} icon={Wallet}
          hint="Awaiting your decision" />
      </Link>
      <Link to="/owner/bookings" className="cursor-pointer">
        <StatCard title="Bookings" value="→" icon={ClipboardList} hint="Open dispatch board" />
      </Link>
      <Link to="/owner/staff" className="cursor-pointer">
        <StatCard title="Team" value="→" icon={Users} hint="Manage staff & grants" />
      </Link>
    </div>
  );
}

/** Owner home: oversight + pending decisions. Full KPI charts ship next. */
export function OwnerDashboardPage() {
  const user = useAuthStore((s) => s.user);
  const first = user?.first_name || "Owner";
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={`Good day, ${first}`} description="Business at a glance — approvals and money need you." />
      <OwnerShortcuts />
      <Card>
        <CardHeader><CardTitle>Coming next</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">
            Revenue charts, booking trends, recent bookings, and inventory alerts land with the
            analytics module. Navigation, Staff, Approvals, Refunds, and Audit Logs are live now.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function StaffShortcuts() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Link to="/staff/bookings" className="cursor-pointer">
        <StatCard title="Bookings" value="→" icon={ClipboardList} hint="Today's dispatch board" />
      </Link>
      <Link to="/staff/payments" className="cursor-pointer">
        <StatCard title="Payments" value="→" icon={Wallet} hint="Verify receipts" />
      </Link>
      <Link to="/staff/technicians" className="cursor-pointer">
        <StatCard title="Technicians" value="→" icon={Users} hint="Records + invites" />
      </Link>
      <Link to="/staff/inventory" className="cursor-pointer">
        <StatCard title="Inventory" value="→" icon={Package} hint="Stock + movements" />
      </Link>
    </div>
  );
}

/** Staff home: today's operational work. No revenue, no payroll, no settings. */
export function StaffDashboardPage() {
  const user = useAuthStore((s) => s.user);
  const first = user?.first_name || "there";
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Good day, ${first}`}
        description="Your operational board — bookings, payments, and dispatch."
      />
      <StaffShortcuts />
      <Card>
        <CardHeader><CardTitle>How today works</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">
            Verify payment receipts, dispatch technicians, and propose refunds for owner review.
            Technician invites you send wait for owner approval.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
