import { useMemo, useState } from "react";
import { ErrorCard, PageHeader } from "@/components/shared/PageHeader";
import { ConfirmDialog, type ConfirmSpec } from "@/components/feedback/ConfirmDialog";
import { ReceiptViewer } from "@/components/office/BookingDetailSheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CardSkeleton } from "@/components/ui/skeleton";
import { useAdminBookings, useBookingMutation } from "@/hooks/useOffice";
import { useAuthStore } from "@/stores/auth.store";
import { toast } from "@/stores/toast.store";
import type { AdminBooking } from "@/types/booking.types";
import { formatDateLong, formatPeso, msUntil } from "@/utils/format";
import { cn } from "@/lib/utils";

const TABS = ["pending", "verified", "rejected", undefined] as const;
type TabFilter = (typeof TABS)[number];

const TAB_LABEL: Record<string, string> = {
  pending: "Pending",
  verified: "Verified",
  rejected: "Rejected",
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
        <Badge variant={payment.status === "verified" ? "success" : payment.status === "rejected" ? "destructive" : "warning"}>
          {payment.status}
        </Badge>
        <span className="ml-auto font-technical font-semibold tabular-nums text-gray-900">
          {formatPeso(payment.amount)}
        </span>
      </div>
      <p className="mt-1 truncate text-sm text-gray-600">{customerLine(booking)}</p>
      {payment.gcash_reference_number && (
        <p className="mt-0.5 truncate text-sm tabular-nums text-gray-500">
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
  const [filter, setFilter] = useState<TabFilter>("pending");
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
              <div className="ml-auto flex gap-1" role="tablist" aria-label="Payment filter">
                {TABS.map((s) => (
                  <button
                    key={s ?? "all"}
                    type="button"
                    role="tab"
                    aria-selected={filter === s}
                    onClick={() => setFilter(s)}
                    className={cn(
                      "min-h-[44px] cursor-pointer rounded-lg px-3 text-sm font-semibold",
                      filter === s ? "bg-primary-50 text-primary-700" : "text-gray-500 hover:bg-gray-50",
                    )}
                  >
                    {s === undefined ? "All" : TAB_LABEL[s]}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
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
              <p className="text-sm text-gray-500">{EMPTY_COPY[filter ?? "all"]}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
