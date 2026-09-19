import { useMemo, useState } from "react";
import { ErrorCard, PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { PillTabs } from "@/components/shared/FilterPopover";
import { ConfirmDialog, type ConfirmSpec } from "@/components/feedback/ConfirmDialog";
import { ReceiptViewer } from "@/components/office/BookingDetailSheet";
import { ToneBadge } from "@/components/shared/ToneBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CardSkeleton } from "@/components/ui/skeleton";
import { useAdminBookings, useBookingMutation } from "@/hooks/useOffice";
import { useAuthStore } from "@/stores/auth.store";
import { toast } from "@/stores/toast.store";
import type { AdminBooking } from "@/types/booking.types";
import { formatDateLong, formatPeso, msUntil } from "@/utils/format";
import { cn } from "@/lib/utils";

const TABS = ["pending", "verified", "rejected", "all"] as const;
type TabFilter = (typeof TABS)[number];

const TAB_LABEL: Record<TabFilter, string> = {
  pending: "Pending",
  verified: "Verified",
  rejected: "Rejected",
  all: "All",
};

const EMPTY_COPY: Record<string, string> = {
  pending: "No receipts waiting. New uploads land here.",
  verified: "No verified payments yet.",
  rejected: "No rejected payments.",
  all: "No payments yet.",
};

function customerLine(b: AdminBooking): string {
  const name = `${b.customer_first_name} ${b.customer_last_name}`.trim();
  const contact = b.customer_email || b.customer_phone || "";
  return [name, contact].filter(Boolean).join(" · ");
}

/** One receipt triage row: viewer + verify/reject share the drawer flow. */
function PaymentCard({ booking }: { booking: AdminBooking }) {
  const user = useAuthStore((s) => s.user);
  const mut = useBookingMutation();
  const [confirm, setConfirm] = useState<ConfirmSpec | null>(null);
  const canVerify = user?.role === "owner" || !!user?.can_execute_refunds;
  const payment = booking.payment;
  if (!payment) return null;

  const pending = payment.status === "pending";
  const msLeft = pending && booking.expires_at ? msUntil(booking.expires_at) : null;
  const urgent = msLeft !== null && msLeft > 0 && msLeft < 60 * 60 * 1000;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-technical font-semibold text-gray-900">{booking.reference_id}</p>
        <ToneBadge
          map={{ verified: "success", rejected: "destructive" }}
          value={payment.status}
          label={payment.status}
        />
        <span className="ml-auto font-technical font-semibold tabular-nums text-gray-900">
          {formatPeso(payment.amount)}
        </span>
      </div>
      <p className="mt-1 truncate text-sm text-gray-600">{customerLine(booking)}</p>
      {payment.gcash_reference_number && (
        <p className="mt-0.5 truncate font-technical text-sm tabular-nums text-gray-600">
          GCash ref ID: {payment.gcash_reference_number}
        </p>
      )}
      {pending && booking.expires_at && (
        <p className={cn("mt-0.5 text-sm tabular-nums", urgent ? "font-semibold text-warning-700" : "text-gray-500")}>
          Pay before {formatDateLong(booking.expires_at)}
          {urgent && ` · ${Math.max(1, Math.ceil(msLeft / 60000))} min left`}
        </p>
      )}
      <ReceiptViewer paymentUuid={payment.uuid} referenceId={booking.reference_id} gcashRefId={payment.gcash_reference_number} />
      {pending && canVerify && (
        <div className="mt-3 flex gap-2">
          <Button
            size="sm"
            disabled={mut.verifyPayment.isPending}
            onClick={() =>
              setConfirm({
                title: `Verify payment for ${booking.reference_id}?`,
                body: (
                  <>
                    Mark {formatPeso(payment.amount)} as verified. The booking becomes{" "}
                    <strong>confirmed</strong>.
                  </>
                ),
                confirmLabel: "Verify payment",
                onConfirm: async () => {
                  await mut.verifyPayment.mutateAsync({ id: payment.id, action: "approve" });
                  toast.success("Payment verified", "Booking is now confirmed.");
                },
              })
            }
          >
            Verify
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={mut.verifyPayment.isPending}
            onClick={() =>
              setConfirm({
                title: `Reject payment for ${booking.reference_id}?`,
                body: "The customer is notified and can upload again while the window lasts.",
                confirmLabel: "Reject payment",
                destructive: true,
                requireReason: "Rejection reason",
                onConfirm: async (reason: string) => {
                  await mut.verifyPayment.mutateAsync({ id: payment.id, action: "reject", reason });
                  toast.success("Payment rejected", "Customer has been notified.");
                },
              })
            }
          >
            Reject
          </Button>
        </div>
      )}
      {pending && !canVerify && (
        <p className="mt-2 text-xs text-gray-500">Only the owner and staff with refund rights can verify payments.</p>
      )}
      <ConfirmDialog spec={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}

/** Receipt triage queue: pending first by expiry, history behind filter tabs. */
export function PaymentsPage() {
  const [tab, setTab] = useState<TabFilter>("pending");
  const filter = tab === "all" ? undefined : tab;
  const feed = useAdminBookings({ limit: 100 });

  const rows = useMemo(() => {
    const items = (feed.data?.items ?? []).filter((b) =>
      b.payment && (filter === undefined || b.payment.status === filter),
    );
    return [...items].sort((a, b) => {
      if (filter === "pending" || filter === undefined) {
        const ea = a.expires_at ?? "9999";
        const eb = b.expires_at ?? "9999";
        return ea < eb ? -1 : ea > eb ? 1 : b.id - a.id;
      }
      return b.id - a.id;
    });
  }, [feed.data, filter]);

  return (
    <div className="min-w-0">
      <PageHeader title="Payments" description="Check receipts and confirm down payments." />
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle>Receipts</CardTitle>
              <div className="ml-auto">
                <PillTabs
                  label="Payment filter"
                  options={TABS.map((s) => ({ id: s, name: TAB_LABEL[s] }))}
                  value={tab}
                  onPick={setTab}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-sm text-gray-600" role="status">
              {feed.data ? (
                <>Showing <span className="font-semibold tabular-nums text-gray-900">{rows.length}</span> {rows.length === 1 ? "receipt" : "receipts"}</>
              ) : ("Loading payments…")}
            </p>
            {feed.isPending && (
              <div aria-busy="true" aria-label="Loading payments">
                {[0, 1].map((i) => (
                  <CardSkeleton key={i} />
                ))}
              </div>
            )}
            {feed.isError && (
              <ErrorCard
                message={feed.error instanceof Error ? feed.error.message : "Could not load payments."}
                onRetry={() => void feed.refetch()}
              />
            )}
            {rows.map((b) => (
              <PaymentCard key={b.id} booking={b} />
            ))}
            {!feed.isPending && !feed.isError && rows.length === 0 && (
              <EmptyState
                title={tab === "pending" ? "No receipts waiting" : `No ${TAB_LABEL[tab].toLowerCase()} payments`}
                description={EMPTY_COPY[tab]}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
