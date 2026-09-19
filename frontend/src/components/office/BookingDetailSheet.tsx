import { useState } from "react";
import { Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ConfirmDialog, type ConfirmSpec } from "@/components/feedback/ConfirmDialog";
import { DetailRow } from "@/components/shared/DetailRow";
import { DrawerHeader } from "@/components/shared/DrawerHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAdminBookings, useBookingMutation, useOfficeUsers } from "@/hooks/useOffice";
import { useAuthStore } from "@/stores/auth.store";
import { toast } from "@/stores/toast.store";
import { ReceiptImageViewer } from "@/components/office/ReceiptImageViewer";
import { AreaSection } from "@/components/office/AreaSection";
import type { AdminBooking } from "@/types/booking.types";
import { formatDateLong, formatPeso, formatTime12h } from "@/utils/format";
import { cn } from "@/lib/utils";

/** Shared drawer section (booking + audit sheets). */
export function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section aria-label={title} className="rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="text-sm font-bold text-gray-900">{title}</h3>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function AssignDialog({
  booking,
  open,
  onClose,
}: {
  booking: AdminBooking;
  open: boolean;
  onClose: () => void;
}) {
  const techs = useOfficeUsers({ role: "technician", status: "active" });
  const mut = useBookingMutation();
  const [techId, setTechId] = useState<number | null>(null);
  const [confirm, setConfirm] = useState<ConfirmSpec | null>(null);
  const chosen = (techs.data?.items ?? []).find((t) => t.id === techId) ?? null;
  const chosenName = chosen ? `${chosen.first_name} ${chosen.last_name}`.trim() : "";
  // Jobs each tech already carries that day (from the board feed — no extra call).
  const dayLoad = useAdminBookings({
    date_from: booking.preferred_date,
    date_to: booking.preferred_date,
    limit: 100,
  });
  const jobsFor = (id: number) =>
    (dayLoad.data?.items ?? []).filter(
      (b) => b.technician_id === id &&
        ["submitted", "proposed", "scheduled", "confirmed", "ongoing"].includes(b.status),
    ).length;

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
        <DialogContent onClose={onClose} aria-label="Assign technician">
          <DialogHeader>
            <DialogTitle>Assign technician</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            {booking.reference_id} · {booking.preferred_date} {booking.preferred_time}
          </p>
          {techs.isLoading && <p className="text-sm text-gray-500">Loading technicians…</p>}
          {techs.isError && <p role="alert" className="text-sm font-medium text-error-600">Could not load technicians.</p>}
          {techs.data && techs.data.items.length === 0 && (
            <p className="text-sm text-gray-500">No active technicians. Invite one first.</p>
          )}
          <div className="flex max-h-64 flex-col gap-2 overflow-y-auto" role="radiogroup" aria-label="Technicians">
            {(techs.data?.items ?? []).map((t) => {
              const jobs = jobsFor(t.id);
              return (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={techId === t.id}
                onClick={() => setTechId(t.id)}
                className={cn(
                  "min-h-[44px] cursor-pointer rounded-lg border px-3 py-2 text-left transition-colors",
                  techId === t.id
                    ? "border-primary-600 bg-primary-50"
                    : "border-gray-200 bg-white hover:border-primary-300",
                )}
              >
                <span className="block truncate text-sm font-semibold text-gray-900">
                  {t.first_name} {t.last_name}
                </span>
                <span className="block truncate text-xs tabular-nums text-gray-500">
                  {[t.position, t.email].filter(Boolean).join(" · ")}
                  {dayLoad.data ? ` · ${jobs} ${jobs === 1 ? "job" : "jobs"} that day` : ""}
                </span>
              </button>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900" onClick={onClose} disabled={mut.assign.isPending}>
              Cancel
            </Button>
            <Button
              disabled={!chosen || mut.assign.isPending}
              onClick={() =>
                chosen &&
                setConfirm({
                  title: `Assign ${chosenName}?`,
                  body: (
                    <>
                      {chosenName} gets booking <strong className="font-technical">{booking.reference_id}</strong> and
                      is notified immediately.
                    </>
                  ),
                  confirmLabel: "Assign & Notify",
                  onConfirm: async () => {
                    await mut.assign.mutateAsync({
                      id: booking.id,
                      technicianId: chosen.id,
                      expectedTechnicianId: booking.technician_id ?? null,
                    });
                    toast.success("Technician assigned", `${chosenName} has been notified.`);
                    setConfirm(null);
                    onClose();
                  },
                })
              }
            >
              Assign &amp; Notify
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmDialog spec={confirm} onClose={() => setConfirm(null)} />
    </>
  );
}

/** Dispatch places a window booking's exact hour (same promised day only). */
/** Receipt image viewer (drawer + payments queue share it). */
export function ReceiptViewer({ paymentUuid, referenceId, gcashRefId }: { paymentUuid: string; referenceId: string; gcashRefId?: string | null | undefined }) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <div className="mt-2">
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="min-h-[44px] cursor-pointer px-2 text-sm font-semibold text-primary-600 hover:underline"
        >
          View receipt
        </button>
      </div>
      <ReceiptImageViewer
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        paymentUuid={paymentUuid}
        referenceId={referenceId}
        gcashRefId={gcashRefId}
      />
    </>
  );
}

function Body({ 
  booking, 
  onClose, 
  onProposeSchedule,
  startAssignOpen = false 
}: { 
  booking: AdminBooking; 
  onClose: () => void; 
  onProposeSchedule?: () => void;
  startAssignOpen?: boolean 
}) {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const base = user?.role === "owner" ? "/owner" : "/staff";
  const mut = useBookingMutation();
  const [assignOpen, setAssignOpen] = useState(startAssignOpen);
  const [confirm, setConfirm] = useState<ConfirmSpec | null>(null);
  const canVerify = user?.role === "owner" || !!user?.can_execute_refunds;
  const payment = booking.payment ?? null;
  const name = `${booking.customer_first_name} ${booking.customer_last_name}`.trim();
  const cancellable = ["submitted", "proposed", "scheduled", "confirmed", "rescheduled", "ongoing"].includes(booking.status);

  return (
    <>
      <div className="flex flex-col gap-4">
        <Block title="Customer">
          <dl>
            <DetailRow label="Name" value={name} />
            <DetailRow label="Phone" value={booking.customer_phone} />
            <DetailRow label="Email" value={booking.customer_email} />
          </dl>
        </Block>

        <Block title="Address">
          <dl>
            {booking.address_parts ? (
              <>
                <AreaSection addressParts={booking.address_parts} />
                {booking.address_parts.street && (
                  <DetailRow label="Street" value={booking.address_parts.street} />
                )}
              </>
            ) : (
              <DetailRow label="Area" value={booking.address_text ?? "—"} />
            )}
            <DetailRow label="Landmark" value={booking.landmark ?? "—"} />
          </dl>
        </Block>

        <Block title="Service & schedule">
          <dl>
            <DetailRow
              label="Service"
              value={booking.service_name ?? `Service #${booking.service_id}`}
            />
            <DetailRow
              label="Brand"
              value={booking.brand_name ?? `Brand #${booking.brand_id}`}
            />
            {booking.total_service_cost != null && (
              <DetailRow
                label="Total"
                value={formatPeso(booking.total_service_cost)}
              />
            )}
            <DetailRow
              label="Down"
              value={formatPeso(booking.down_payment_amount)}
            />
            <DetailRow
              label="Preferred schedule"
              value={formatDateLong(booking.original_preferred_date || booking.preferred_date)}
            />
            {booking.flex_window && (
              <DetailRow
                label="Window"
                value={booking.flex_window === "morning" ? "Morning (8AM to 12PM)" : booking.flex_window === "afternoon" ? "Afternoon (12PM to 5PM)" : "Anytime (8AM to 5PM)"}
              />
            )}
            {booking.preferred_time && (
              <DetailRow
                label="Schedule"
                value={`${formatDateLong(booking.preferred_date)} at ${formatTime12h(booking.preferred_time)}`}
              />
            )}
            {!booking.preferred_time && (
              <DetailRow
                label="Schedule"
                value="—"
              />
            )}
            {booking.status === "scheduled" && booking.expires_at && (
              <DetailRow label="Pay before" value={formatDateLong(booking.expires_at)} />
            )}
          </dl>
        </Block>

        <Block title="Payment">
          {!payment && booking.status === "submitted" && (
            <p className="text-sm text-gray-600">No payment record linked.</p>
          )}
          {!payment && booking.status === "scheduled" && (
            <p className="text-sm text-gray-600">Receipt uploaded. Waiting for admin review.</p>
          )}
          {!payment && booking.status !== "submitted" && booking.status !== "scheduled" && (
            <p className="text-sm text-gray-600">No payment record linked.</p>
          )}
          {payment && (
            <dl>
              <DetailRow label="Status" value={payment.status} />
              <DetailRow label="Amount" value={formatPeso(payment.amount)} />
              {payment.gcash_reference_number && (
                <DetailRow label="GCash ref" value={payment.gcash_reference_number} />
              )}
              {payment.submitted_at && (
                <DetailRow
                  label="Received"
                  value={new Date(payment.submitted_at).toLocaleString('en-PH', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZone: 'Asia/Manila',
                  })}
                />
              )}
            </dl>
          )}
          {payment && <ReceiptViewer paymentUuid={payment.uuid} referenceId={booking.reference_id} gcashRefId={payment.gcash_reference_number} />}
          {payment && payment.status !== "pending" && (
            <div className="mt-3">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  navigate(`${base}/refunds`, {
                    state: {
                      booking_id: booking.id,
                      payment_id: payment.id,
                      refund_amount: payment.amount,
                    },
                  })
                }
              >
                Propose refund
              </Button>
            </div>
          )}
          {(booking.timeline ?? []).filter((t) => (t.note ?? "").toLowerCase().includes("upload")).length > 0 && (
            <div className="mt-3 rounded-lg bg-gray-50 p-3">
              <p className="text-sm font-semibold text-gray-900">Receipt activity</p>
              <ul className="mt-1 flex flex-col gap-1">
                {(booking.timeline ?? [])
                  .filter((t) => (t.note ?? "").toLowerCase().includes("upload"))
                  .map((t, i) => (
                    <li key={i} className="text-sm text-gray-600">
                      {t.note}
                      {t.at && (
                        <> · {new Date(t.at).toLocaleString('en-PH', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          timeZone: 'Asia/Manila',
                        })}</>
                      )}
                    </li>
                  ))}
              </ul>
            </div>
          )}
          {payment && payment.status === "pending" && (
            canVerify ? (
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
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
            ) : (
              <p className="mt-2 text-xs text-gray-500">Only the owner and staff with refund rights can verify payments.</p>
            )
          )}
        </Block>

        <Block title="Technician">
          {booking.technician?.name ?? booking.technician_id != null ? (
            <p className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
              {booking.technician?.name ?? `Technician #${booking.technician_id}`}
              {booking.technician?.rating != null && (
                <span className="inline-flex items-center gap-1 font-medium text-gray-600">
                  <Star size={14} className="text-warning-500" aria-hidden="true" />
                  {booking.technician.rating.toFixed(2)}
                </span>
              )}
            </p>
          ) : (
            <p className="text-sm text-gray-600">Unassigned. Pick someone below.</p>
          )}
          <div className="mt-3">
            {(booking.status === "confirmed" || booking.status === "assigned") ? (
              <Button size="sm" variant="outline" onClick={() => setAssignOpen(true)}>
                {booking.technician_id != null ? "Reassign" : "Assign technician"}
              </Button>
            ) : (
              <p className="text-sm text-gray-600">Waiting for payment. Assign opens after the payment is verified.</p>
            )}
          </div>
        </Block>

        {booking.active_reschedule && (
          <Block title="Reschedule request">
            <dl>
              <DetailRow
                label="Change"
                value={`${formatDateLong(booking.active_reschedule.old_date)} ${formatTime12h(booking.active_reschedule.old_time)} → ${formatDateLong(booking.active_reschedule.new_date)} ${formatTime12h(booking.active_reschedule.new_time)}`}
              />
              <DetailRow label="Reason" value={booking.active_reschedule.reason} />
            </dl>
            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                onClick={() =>
                  setConfirm({
                    title: `Approve reschedule for ${booking.reference_id}?`,
                    body: "The new schedule takes effect and everyone is notified.",
                    confirmLabel: "Approve reschedule",
                    onConfirm: async () => {
                      await mut.reviewReschedule.mutateAsync({ id: booking.active_reschedule!.id, action: "approve" });
                      toast.success("Reschedule approved");
                    },
                  })
                }
              >
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setConfirm({
                    title: `Deny reschedule for ${booking.reference_id}?`,
                    body: "The original schedule stays.",
                    confirmLabel: "Deny reschedule",
                    destructive: true,
                    requireReason: "Denial reason",
                    onConfirm: async (reason: string) => {
                      await mut.reviewReschedule.mutateAsync({ id: booking.active_reschedule!.id, action: "deny", notes: reason });
                      toast.success("Reschedule denied");
                    },
                  })
                }
              >
                Deny
              </Button>
            </div>
          </Block>
        )}

        <Block title="Submitted">
          <p className="text-sm text-gray-700">
            {booking.created_at
              ? `${new Date(booking.created_at).toLocaleString('en-PH', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  timeZone: 'Asia/Manila'
                })}.`
              : "No history yet."}
          </p>
        </Block>

        {booking.status === "cancelled" && (
          <Block title="Cancellation">
            <dl>
              <DetailRow label="Reason" value={booking.cancellation_reason ?? "—"} />
              {booking.refund ? (
                <>
                  <DetailRow label="Refund" value={`${booking.refund.status} · ${formatPeso(booking.refund.refund_amount)}`} />
                  {(booking.refund.refund_to_number || booking.refund.refund_to_name) && (
                    <DetailRow
                      label="Send to"
                      value={[booking.refund.refund_to_number, booking.refund.refund_to_name].filter(Boolean).join(", ")}
                    />
                  )}
                </>
              ) : (
                <DetailRow label="Refund" value="No payment, nothing to refund." />
              )}
            </dl>
          </Block>
        )}

        {booking.status === "submitted" && (
          <Button
            className="w-full"
            onClick={() => onProposeSchedule?.()}
          >
            Propose Schedule
          </Button>
        )}

        {booking.status === "proposed" && (
          <>
            <Button
              variant="outline"
              className="w-full"
              disabled={payment?.status === "pending"}
              onClick={() =>
                setConfirm({
                  title: `Remove ${booking.reference_id} from schedule?`,
                  body: "Booking returns to unscheduled pool. Customer sees updated schedule in track.",
                  confirmLabel: "Remove from schedule",
                  onConfirm: async () => {
                    await mut.unschedule.mutateAsync(booking.id);
                    toast.success("Removed from schedule", "Booking returned to unscheduled pool.");
                    onClose();
                  },
                })
              }
            >
              Remove from schedule
            </Button>
            {payment?.status === "pending" && (
              <p className="text-xs text-gray-500">Payment under review. Verify or reject first.</p>
            )}
          </>
        )}

        {cancellable && (
          <>
            <Button
              variant="destructiveOutline"
              className="w-full"
              disabled={payment?.status === "pending"}
              onClick={() => {
              const needsTarget = payment?.status === "pending" || payment?.status === "verified";
              setConfirm({
                title: `Cancel ${booking.reference_id}?`,
                body: (
                  <>
                    <p>Refund follows policy: full before confirmation, decided same-day, none once dispatched.</p>
                    {needsTarget && (
                      <div className="mt-3 grid grid-cols-1 gap-2">
                        <label className="text-sm font-medium text-gray-900" htmlFor="admin-cancel-gcash">
                          Refund to GCash number
                        </label>
                        <input
                          id="admin-cancel-gcash"
                          inputMode="numeric"
                          placeholder="09xx xxx xxxx"
                          className="min-h-[44px] w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-base text-gray-900 placeholder:text-gray-400 focus:border-primary-600 focus:outline-none"
                        />
                        <label className="text-sm font-medium text-gray-900" htmlFor="admin-cancel-gcash-name">
                          Name on GCash
                        </label>
                        <input
                          id="admin-cancel-gcash-name"
                          placeholder="Juan D"
                          className="min-h-[44px] w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-base text-gray-900 placeholder:text-gray-400 focus:border-primary-600 focus:outline-none"
                        />
                        <p className="text-xs text-gray-500">Optional now. Required before payout.</p>
                      </div>
                    )}
                  </>
                ),
                confirmLabel: "Cancel booking",
                destructive: true,
                requireReason: "Cancellation reason",
                onConfirm: async (reason: string) => {
                  if (needsTarget) {
                    const numEl = document.getElementById("admin-cancel-gcash") as HTMLInputElement | null;
                    const nameEl = document.getElementById("admin-cancel-gcash-name") as HTMLInputElement | null;
                    const rawDigits = (numEl?.value ?? "").replace(/\D/g, "");
                    const name = (nameEl?.value ?? "").trim();
                    if (rawDigits === "" && name === "") {
                      const res = await mut.cancel.mutateAsync({ id: booking.id, reason });
                      toast.success("Booking cancelled", `Refund ${res.refund_status}: ${formatPeso(res.refund_amount)}.`);
                    } else {
                      if (!/^(09\d{9}|639\d{9})$/.test(rawDigits)) {
                        throw new Error("Enter active GCash number for refund.");
                      }
                      if (name.length < 2) {
                        throw new Error("Enter the name on GCash.");
                      }
                      const res = await mut.cancel.mutateAsync({ id: booking.id, reason, refundTo: { number: rawDigits, name } });
                      toast.success("Booking cancelled", `Refund ${res.refund_status}: ${formatPeso(res.refund_amount)}.`);
                    }
                  } else {
                    const res = await mut.cancel.mutateAsync({ id: booking.id, reason });
                    toast.success("Booking cancelled", `Refund ${res.refund_status}: ${formatPeso(res.refund_amount)}.`);
                  }
                  onClose();
                },
              });
            }}
          >
            Cancel booking
          </Button>
            {payment?.status === "pending" && (
              <p className="text-xs text-gray-500">Payment under review. Verify or reject first.</p>
            )}
          </>
        )}
      </div>

      <AssignDialog booking={booking} open={assignOpen} onClose={() => setAssignOpen(false)} />
      <ConfirmDialog spec={confirm} onClose={() => setConfirm(null)} />
    </>
  );
}

/** Office booking detail: left drawer (system sheet), full-screen on phones. */
export function BookingDetailSheet({
  booking,
  onClose,
  onProposeSchedule,
  startAssignOpen = false,
}: {
  booking: AdminBooking | null;
  onClose: () => void;
  onProposeSchedule?: () => void;
  /** Open straight into the assign-technician dialog (card Assign button). */
  startAssignOpen?: boolean;
}) {
  return (
    <Sheet open={booking !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent
        label="Booking details"
        side="right"
        onClose={onClose}
        className="w-[92%] max-w-md p-0"
      >
        <SheetTitle className="sr-only">Booking details</SheetTitle>
        {booking && (
          <>
            <DrawerHeader
              title={<span className="font-technical text-sm">{booking.reference_id}</span>}
              action={<StatusBadge status={booking.status} />}
              onClose={onClose}
            />
            <ScrollArea className="min-h-0 flex-1">
              <div className="p-4">
                <Body key={booking.id} booking={booking} onClose={onClose} onProposeSchedule={onProposeSchedule} startAssignOpen={startAssignOpen} />
              </div>
            </ScrollArea>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
