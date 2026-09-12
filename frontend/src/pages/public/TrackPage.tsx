import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTrackBooking } from "@/hooks/usePublic";
import { ApiError } from "@/api/errors";
import { toast } from "@/stores/toast.store";
import { PageHeader, ErrorCard } from "@/components/shared/PageHeader";
import { Blobs, DotGrid } from "@/components/public/Decor";
import { CancelBookingDialog } from "@/components/public/tracking/CancelBookingDialog";
import { TrackResult } from "@/components/public/tracking/TrackResult";
import { TrackSearch } from "@/components/public/tracking/TrackSearch";
import { UploadPaymentModal } from "@/components/public/tracking/UploadPaymentModal";
import type { TrackFormValues } from "@/schemas/booking.schema";

/** Booking tracker: ref + email → masked status + upload + cancel. */
export function TrackPage() {
  const [params] = useSearchParams();
  const [submitted, setSubmitted] = useState({
    reference_id: params.get("ref") ?? "",
    email: params.get("email") ?? "",
  });
  const [uploadOpen, setUploadOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const query = useTrackBooking(submitted.reference_id, submitted.email);
  const autoSearched = useRef(false);

  // Coming from the success page with ?ref=&email= → look up immediately.
  useEffect(() => {
    if (!autoSearched.current && submitted.reference_id && submitted.email) {
      autoSearched.current = true;
      void query.refetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const search = (values: TrackFormValues) => {
    setSubmitted({ reference_id: values.reference_id, email: values.email });
    // key changes with inputs; refetch explicitly for same-value retries
    window.setTimeout(() => void query.refetch(), 0);
  };

  const failed =
    query.isError && query.error instanceof ApiError && query.error.status === 404;

  return (
    <div className="relative overflow-hidden">
      <Blobs variant="cool" />
      <DotGrid className="left-4 top-10 hidden lg:block" />
      <div className="relative mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <PageHeader
        title="Track Your Booking"
        description="Enter your reference ID and booking email."
      />
      <TrackSearch
        initial={submitted}
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
            onCancel={() => setCancelOpen(true)}
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
          <CancelBookingDialog
            booking={query.data}
            email={submitted.email}
            open={cancelOpen}
            onClose={() => setCancelOpen(false)}
            onDone={() => void query.refetch()}
          />
        </div>
      )}
      </div>
    </div>
  );
}
