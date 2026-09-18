import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
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
          <h2 className="text-lg font-bold text-gray-900">❌ Booking Not Found</h2>
          <p className="mt-1 text-sm text-gray-600">
            Check the reference ID for typos — and make sure the email matches the one used at booking.
          </p>
        </div>
      )}

      {query.isError && !failed && (
        <div className="mt-6">
          <ErrorCard
            message={query.error instanceof ApiError ? query.error.message : "Lookup failed."}
            onRetry={() => void query.refetch()}
          />
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
              const refundable =
                booking.status === "submitted" || booking.status === "proposed";
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
                    {refundable ? (
                      <p className="mt-2 rounded-lg bg-success-50 p-3 font-medium text-success-700">
                        Eligible for full refund of your down payment.
                      </p>
                    ) : (
                      <p className="mt-2 rounded-lg bg-warning-50 p-3 font-medium text-warning-700">
                        Same-day or dispatched bookings need admin review — the refund
                        amount will be decided by admin.
                      </p>
                    )}
                  </>
                ),
                confirmLabel: "Confirm Cancellation",
                destructive: true,
                requireReason: "Reason for cancellation",
                onConfirm: async (reason) => {
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
