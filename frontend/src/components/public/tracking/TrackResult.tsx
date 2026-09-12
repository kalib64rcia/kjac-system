import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useCountdown } from "@/hooks/useCountdown";
import { formatDateLong, formatPeso, formatTime12h } from "@/utils/format";
import type { TrackBookingResponse } from "@/types/booking.types";
import { BookingStepper } from "./BookingStepper";

/** Tracked booking details + per-status actions. */
export function TrackResult({
  booking,
  onUpload,
  onCancel,
}: {
  booking: TrackBookingResponse;
  onUpload: () => void;
  onCancel: () => void;
}) {
  const { label } = useCountdown(booking.expires_at);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <StatusBadge status={booking.status} />
            <span className="font-technical text-sm font-semibold text-gray-900">
              {booking.reference_id}
            </span>
          </div>
          <div className="mt-4">
            <BookingStepper status={booking.status} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <h2 className="font-bold text-gray-900">Booking Information</h2>
          <dl className="mt-2 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            <div><dt className="text-gray-500">Customer</dt><dd className="font-medium text-gray-900">{booking.customer_name}</dd></div>
            <div><dt className="text-gray-500">Contact</dt><dd className="font-technical font-medium text-gray-900">{booking.masked_phone}</dd></div>
            <div><dt className="text-gray-500">Date</dt><dd className="font-medium text-gray-900">{formatDateLong(booking.preferred_date)}</dd></div>
            <div><dt className="text-gray-500">Time</dt><dd className="font-medium text-gray-900">{formatTime12h(booking.preferred_time)}</dd></div>
            <div><dt className="text-gray-500">Area</dt><dd className="font-medium text-gray-900">{[booking.area_barangay, booking.area_city].filter(Boolean).join(", ") || "—"}</dd></div>
            <div><dt className="text-gray-500">Down payment</dt><dd className="font-technical font-medium text-gray-900">{formatPeso(booking.down_payment_amount)}</dd></div>
          </dl>
          {booking.technician_name && (
            <div className="mt-3 rounded-lg bg-gray-50 p-3 text-sm">
              <p className="font-semibold text-gray-900">Assigned technician: {booking.technician_name}</p>
              {booking.technician_rating != null && booking.technician_rating > 0 && (
                <p className="text-gray-600">★ {booking.technician_rating.toFixed(2)}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {booking.status === "submitted" && (
        <Card>
          <CardContent>
            <h2 className="font-bold text-gray-900">⚠ Payment Required</h2>
            <p className="mt-1 text-sm text-gray-600">
              Upload your GCash receipt before expiry: <span className="font-technical font-semibold tabular-nums">{label}</span>
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <Button onClick={onUpload}>Upload Payment Now</Button>
              <Button variant="destructiveOutline" onClick={onCancel}>Cancel Booking</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {booking.status === "pending" && (
        <Card>
          <CardContent>
            <h2 className="font-bold text-gray-900">⏳ Payment Under Review</h2>
            <p className="mt-1 text-sm text-gray-600">Admin will verify within 24 hours. Full refund available if you cancel now.</p>
            <div className="mt-3">
              <Button variant="destructiveOutline" onClick={onCancel}>Cancel Booking</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {booking.status === "confirmed" && (
        <Card>
          <CardContent>
            <h2 className="font-bold text-gray-900">✓ Booking Confirmed</h2>
            <p className="mt-1 text-sm text-gray-600">Your appointment is confirmed. Cancellation policy applies.</p>
            <div className="mt-3">
              <Button variant="destructiveOutline" onClick={onCancel}>Cancel Booking</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {(booking.status === "cancelled" || booking.status === "expired") && (
        <Card>
          <CardContent>
            <h2 className="font-bold text-gray-900">
              {booking.status === "cancelled" ? "❌ Booking Cancelled" : "⏰ Booking Expired"}
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              {booking.status === "cancelled"
                ? "Refunds process within 3–5 business days via GCash."
                : "No payment was received in time. No charges applied."}
            </p>
            <div className="mt-3">
              <Link
                to="/book"
                className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-primary-400 px-6 text-sm font-semibold text-white hover:bg-primary-500"
              >
                Book Again
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
