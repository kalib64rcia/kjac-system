import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FieldError, Label, Textarea } from "@/components/ui/input";
import { bookingApi } from "@/api/booking.api";
import { ApiError } from "@/api/errors";
import { toast } from "@/stores/toast.store";
import type { TrackBookingResponse } from "@/types/booking.types";

/** Guest cancel with tier-aware copy + reason + email proof. */
export function CancelBookingDialog({
  booking,
  email,
  open,
  onClose,
  onDone,
}: {
  booking: TrackBookingResponse;
  email: string;
  open: boolean;
  onClose: () => void;
  onDone: (refundStatus: string, refundAmount: number) => void;
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (reason.trim().length < 3) {
      setError("Please tell us why (at least 3 characters).");
      return;
    }
    setBusy(true);
    try {
      const res = await bookingApi.cancel(booking.booking_id, reason.trim(), email);
      if (res.refund_status === "none") {
        toast.success("Booking cancelled", "No payment was made, so there is nothing to refund.");
      } else {
        toast.success("Booking cancelled", `Refund status: ${res.refund_status}.`);
      }
      onClose();
      onDone(res.refund_status, res.refund_amount);
    } catch (err) {
      toast.error("Cancellation failed", err instanceof ApiError ? err.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent onClose={onClose}>
        <DialogHeader>
          <DialogTitle>Cancel Booking</DialogTitle>
        </DialogHeader>
      <p className="text-sm text-gray-600">
        Reference <span className="font-technical font-semibold">{booking.reference_id}</span>
      </p>
      {booking.status === "submitted" || booking.status === "pending" ? (
        <p className="mt-2 rounded-lg bg-success-50 p-3 text-sm font-medium text-success-700">
          ✓ Eligible for full refund of your down payment.
        </p>
      ) : (
        <p className="mt-2 rounded-lg bg-warning-50 p-3 text-sm font-medium text-warning-700">
          ⚠ Same-day or dispatched bookings need admin review — the refund amount will be decided by admin.
        </p>
      )}
      <div className="mt-4">
        <Label htmlFor="cancel-reason">Reason for cancellation *</Label>
        <Textarea
          id="cancel-reason"
          rows={3}
          value={reason}
          aria-invalid={!!error}
          onChange={(e) => {
            setReason(e.target.value);
            setError(undefined);
          }}
        />
        <FieldError message={error} />
      </div>
      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={onClose} disabled={busy}>Go Back</Button>
        <Button variant="destructive" onClick={() => void submit()} disabled={busy}>
          {busy ? "Cancelling…" : "Confirm Cancellation"}
        </Button>
      </div>
      </DialogContent>
    </Dialog>
  );
}
