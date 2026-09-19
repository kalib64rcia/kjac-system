import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { SearchX } from "lucide-react";
import { useTrackBooking } from "@/hooks/usePublic";
import { bookingApi } from "@/api/booking.api";
import { ApiError } from "@/api/errors";
import { ConfirmDialog, type ConfirmSpec } from "@/components/feedback/ConfirmDialog";
import { toast } from "@/stores/toast.store";
import { PageHeader, ErrorCard } from "@/components/shared/PageHeader";
import { SectionDotGrid } from "@/components/public/Decor";
import { Footer } from "@/components/public/Footer";
import { TrackResult } from "@/components/public/tracking/TrackResult";
import { TrackSearch } from "@/components/public/tracking/TrackSearch";
import { UploadPaymentModal } from "@/components/public/tracking/UploadPaymentModal";
import type { TrackFormValues } from "@/schemas/booking.schema";

/** Booking tracker: ref + email → masked status + upload + cancel. */
export function TrackPage() {
  const location = useLocation();
  const trackState = location.state as { reference_id: string; email: string } | null;
  const [submitted, setSubmitted] = useState({
    reference_id: "",
    email: "",
  });
  const [uploadOpen, setUploadOpen] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState<ConfirmSpec | null>(null);
  const query = useTrackBooking(submitted.reference_id, submitted.email);
  const autoSearched = useRef(false);

  // Auto-fill from state object if coming from success page
  useEffect(() => {
    if (!autoSearched.current && trackState?.reference_id && trackState?.email) {
      autoSearched.current = true;
      setSubmitted({
        reference_id: trackState.reference_id,
        email: trackState.email,
      });
      // Trigger search after state is set
      window.setTimeout(() => void query.refetch(), 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackState]);

  const search = (values: TrackFormValues) => {
    setSubmitted({ reference_id: values.reference_id, email: values.email });
    // key changes with inputs; refetch explicitly for same-value retries
    window.setTimeout(() => void query.refetch(), 0);
  };

  const failed =
    query.isError && query.error instanceof ApiError && query.error.status === 404;

  return (
    <>
      <div className="relative overflow-hidden">
        <SectionDotGrid variant="primary" />
      <div className="relative mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <PageHeader
        title="Track Your Booking"
        description="Enter your reference ID and booking email."
      />
      <TrackSearch
        pending={query.isFetching}
        onSearch={search}
      />

      {query.isFetching && (
        <p className="mt-6 text-sm text-gray-500" role="status">Looking up your booking…</p>
      )}

      {failed && (
        <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6 text-center" role="alert">
          <div className="flex flex-col items-center gap-2">
            <SearchX size={28} className="text-gray-400" aria-hidden="true" />
            <h2 className="text-lg font-bold text-gray-900">Booking Not Found</h2>
          </div>
          <p className="mt-1 text-sm text-gray-600">
            Check the reference ID for typos — and make sure the email matches the one used at booking.
          </p>
        </div>
      )}

      {query.isError && !failed && !query.data && (
        <div className="mt-6">
          <ErrorCard
            message={query.error instanceof ApiError ? query.error.message : "Lookup failed."}
            onRetry={() => void query.refetch()}
          />
        </div>
      )}

      {query.isError && !failed && query.data && (
        <div className="mt-6 rounded-lg border border-warning-200 bg-warning-50 p-4" role="status">
          <p className="text-sm font-medium text-warning-800">
            Could not refresh. Showing last saved status.
          </p>
          <button
            type="button"
            onClick={() => void query.refetch()}
            className="mt-1 min-h-[44px] cursor-pointer text-sm font-semibold text-primary-600 hover:underline"
          >
            Try again
          </button>
        </div>
      )}

      {query.data && (
        <div className="mt-6">
          <TrackResult
            booking={query.data}
            onUpload={() => setUploadOpen(true)}
            onCancel={() => {
              const booking = query.data;
              if (!booking) return;
              // Rejected receipts are not money: only pending or verified counts.
              const paid = (booking.has_payment ?? false) && booking.payment_status !== "rejected";
              setConfirmCancel({
                title: "Cancel Booking",
                body: (
                  <>
                    <p>
                      Reference{" "}
                      <span className="font-technical font-semibold">
                        {booking.reference_id}
                      </span>
                    </p>
                    {!paid ? (
                      <p className="mt-2 rounded-lg bg-gray-50 p-3 font-medium text-gray-700">
                        No payment found. No refund needed.
                      </p>
                    ) : (
                      <>
                        <p className="mt-2 rounded-lg bg-success-50 p-3 font-medium text-success-700">
                          You paid {booking.down_payment_amount}. Early cancel means full refund auto.
                          Same day means admin review. Late or dispatched means no refund.
                          Refund goes to GCash in 3 to 5 days.
                        </p>
                        <div className="mt-3 grid grid-cols-1 gap-2">
                          <label className="text-sm font-medium text-gray-900" htmlFor="cancel-gcash">
                            Refund to GCash number *
                          </label>
                          <input
                            id="cancel-gcash"
                            inputMode="numeric"
                            placeholder="09xx xxx xxxx"
                            className="min-h-[44px] w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-base text-gray-900 placeholder:text-gray-400 focus:border-primary-600 focus:outline-none"
                          />
                          <label className="text-sm font-medium text-gray-900" htmlFor="cancel-gcash-name">
                            Name on GCash *
                          </label>
                          <input
                            id="cancel-gcash-name"
                            placeholder="Juan D"
                            className="min-h-[44px] w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-base text-gray-900 placeholder:text-gray-400 focus:border-primary-600 focus:outline-none"
                          />
                          <p className="text-xs text-gray-500">Number must be active. We send only to this number.</p>
                        </div>
                      </>
                    )}
                  </>
                ),
                confirmLabel: "Confirm Cancellation",
                destructive: true,
                requireReason: "Reason for cancellation",
                onConfirm: async (reason) => {
                  if (paid) {
                    const numEl = document.getElementById("cancel-gcash") as HTMLInputElement | null;
                    const nameEl = document.getElementById("cancel-gcash-name") as HTMLInputElement | null;
                    const digits = (numEl?.value ?? "").replace(/\D/g, "");
                    const name = (nameEl?.value ?? "").trim();
                    if (!/^(09\d{9}|639\d{9})$/.test(digits)) {
                      throw new Error("Enter active GCash number for refund.");
                    }
                    if (name.length < 2) {
                      throw new Error("Enter the name on GCash.");
                    }
                    const res = await bookingApi.cancel(
                      booking.booking_id,
                      reason,
                      submitted.email,
                      { number: digits, name },
                    );
                    toast.success("Booking cancelled", `Refund status: ${res.refund_status}.`);
                  } else {
                    const res = await bookingApi.cancel(
                      booking.booking_id,
                      reason,
                      submitted.email,
                    );
                    if (res.refund_status === "none") {
                      toast.success("Booking cancelled", "No payment was made, so there is nothing to refund.");
                    } else {
                      toast.success("Booking cancelled", `Refund status: ${res.refund_status}.`);
                    }
                  }
                  void query.refetch();
                },
              });
            }}
          />
          <UploadPaymentModal
            booking={query.data}
            email={submitted.email}
            open={uploadOpen}
            onClose={() => setUploadOpen(false)}
            onDone={() => {
              void query.refetch();
              toast.info("Status updated", "Your booking now shows payment under review.");
            }}
            onFail={() => {
              void query.refetch();
            }}
          />
          <ConfirmDialog spec={confirmCancel} onClose={() => setConfirmCancel(null)} />
        </div>
      )}
      </div>
    </div>
    <Footer />
  </>
  );
}
