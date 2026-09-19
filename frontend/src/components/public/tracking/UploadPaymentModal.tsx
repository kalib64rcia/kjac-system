import { useState } from "react";
import { Clock, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FieldError, Input, Label } from "@/components/ui/input";
import { FileUploader } from "@/components/forms/FileUploader";
import { bookingApi } from "@/api/booking.api";
import { ApiError } from "@/api/errors";
import { toast } from "@/stores/toast.store";
import { formatPeso } from "@/utils/format";
import { useCountdown } from "@/hooks/useCountdown";
import { useLandingContent } from "@/hooks/usePublic";
import type { TrackBookingResponse } from "@/types/booking.types";

const GCASH_RE = /^\d{13}$/;

/** Receipt upload modal: file + amount-locked + GCash ref + email proof. */
export function UploadPaymentModal({
  booking,
  email,
  open,
  onClose,
  onDone,
  onFail,
}: {
  booking: TrackBookingResponse;
  email: string;
  open: boolean;
  onClose: () => void;
  onDone: () => void;
  onFail?: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [gcashRef, setGcashRef] = useState("");
  const [gcashError, setGcashError] = useState<string | undefined>();
  const [fileError, setFileError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const { label } = useCountdown(booking.expires_at);
  const content = useLandingContent();

  const submit = async () => {
    let ok = true;
    if (!file) {
      setFileError("Receipt image is required.");
      ok = false;
    }
    const digits = gcashRef.replace(/\D/g, "");
    if (!GCASH_RE.test(digits)) {
      setGcashError("Enter the 13-digit GCash reference number.");
      ok = false;
    }
    if (!ok) return;
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file as File);
      form.append("gcash_reference_number", digits);
      form.append("amount", String(booking.down_payment_amount));
      form.append("payment_method", "gcash");
      form.append("email", email);
      await bookingApi.uploadPayment(booking.reference_id, form);
      toast.success("Payment uploaded", "Admin will verify within 24 hours.");
      onClose();
      onDone();
    } catch (err) {
      if (err instanceof ApiError && (err.status === 400 || err.status === 409)) {
        toast.error(
          "Cannot upload now",
          "Schedule changed or deadline passed. Check track status and try again.",
        );
      } else {
        toast.error(
          "Upload failed",
          err instanceof ApiError ? err.message : "Check your connection and try again.",
        );
      }
      onFail?.();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-2xl" onClose={onClose}>
        <DialogHeader>
          <DialogTitle>Upload Payment Receipt</DialogTitle>
        </DialogHeader>
      <p className="text-sm text-gray-600">
        Booking <span className="font-technical font-semibold">{booking.reference_id}</span>
        {" · "}Down payment:{" "}
        <span className="font-technical font-semibold">{formatPeso(booking.down_payment_amount)}</span>
      </p>
      {booking.expires_at && (
        <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-warning-700">
          <Timer size={16} aria-hidden="true" />
          <span>Time remaining: {label}</span>
        </p>
      )}
      <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-600">
        <Clock size={16} aria-hidden="true" />
        <span>Pay early for on time arrival. Late payment can mean late arrival.</span>
      </p>
      <div className="mt-4 rounded-lg bg-gray-50 p-4 text-sm text-gray-700">
        <p className="font-semibold text-gray-900">Step 1: Send payment via GCash</p>
        {content.data?.gcash_account_number ? (
          <p className="mt-1">
            Send the exact down payment to{" "}
            <span className="font-technical font-semibold tabular-nums">{content.data.gcash_account_number}</span>
            {content.data.gcash_account_name && <> ({content.data.gcash_account_name})</>},
            then screenshot the receipt.
          </p>
        ) : (
          <p className="mt-1">Send the exact down payment to the business GCash account shown on your booking confirmation, then screenshot the receipt.</p>
        )}
        <p className="mt-3 font-semibold text-gray-900">Step 2: Upload the screenshot</p>
      </div>
      <div className="mt-4">
        <FileUploader label="Receipt photo *" file={file} error={fileError} onSelect={(f) => { setFile(f); setFileError(undefined); }} onClear={() => setFile(null)} />
      </div>
      <div className="mt-4">
        <Label htmlFor="up-gcash">GCash reference number *</Label>
        <Input
          id="up-gcash"
          name="gcash_reference_number"
          inputMode="numeric"
          autoComplete="off"
          spellCheck={false}
          placeholder="13-digit number from your receipt"
          value={gcashRef}
          aria-invalid={!!gcashError}
          onChange={(e) => {
            setGcashRef(e.target.value);
            setGcashError(undefined);
          }}
        />
        <FieldError message={gcashError} />
      </div>
      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
        <Button onClick={() => void submit()} disabled={busy}>
          {busy ? "Uploading…" : "Upload Payment"}
        </Button>
      </div>
      </DialogContent>
    </Dialog>
  );
}
