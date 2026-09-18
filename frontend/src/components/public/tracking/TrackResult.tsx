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
            <div><dt className="text-gray-500">Contact</dt><dd className="font-medium tabular-nums text-gray-900">{booking.masked_phone}</dd></div>
            <div><dt className="text-gray-500">Date</dt><dd className="font-medium text-gray-900">{formatDateLong(booking.preferred_date)}</dd></div>
            <div><dt className="text-gray-500">Time</dt><dd className="font-medium text-gray-900">{formatTime12h(booking.preferred_time)}</dd></div>
            <div><dt className="text-gray-500">Area</dt><dd className="font-medium text-gray-900">{[booking.area_barangay, booking.area_city].filter(Boolean).join(", ") || "—"}</dd></div>
            <div><dt className="text-gray-500">Down payment</dt><dd className="font-technical font-medium text-gray-900">{formatPeso(booking.down_payment_amount)}</dd></div>
          </dl>
          {booking.technician_name && (
            <div className="mt-3 rounded-lg bg-gray-50 p-3 text-sm">
              <p className="font-semibold text-gray-900">Team: {booking.technician_name}</p>
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
            <h2 className="font-bold text-gray-900">Request Submitted</h2>
            <p className="mt-1 text-sm text-gray-600">
              We got your service request. Our team is checking availability now. We will message you with a proposed schedule soon.
            </p>
            <div className="mt-3">
              <Button variant="destructiveOutline" onClick={onCancel}>Cancel Request</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {booking.status === "proposed" && (
        <Card>
          <CardContent>
            <h2 className="font-bold text-gray-900">Schedule Proposed</h2>
            <p className="mt-1 text-sm text-gray-600">
              We found an available slot for <span className="font-semibold">{formatDateLong(booking.preferred_date)} at {formatTime12h(booking.preferred_time)}</span>. 
              Review the proposed time above. If you agree, proceed to payment. If not, you can decline and request a different time.
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <Button onClick={onUpload}>Accept & Pay</Button>
              <Button variant="outline" onClick={onCancel}>Decline</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {booking.status === "scheduled" && (
        <Card>
          <CardContent>
            <h2 className="font-bold text-gray-900">Payment Required</h2>
            <p className="mt-1 text-sm text-gray-600">
              Send payment before expiry to confirm your slot: <span className="font-technical font-semibold tabular-nums">{label}</span>. Pay early so we arrive on time.
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <Button onClick={onUpload}>Pay Now</Button>
              <Button variant="destructiveOutline" onClick={onCancel}>Cancel Booking</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {(booking.status === "ongoing" || booking.status === "completed" || booking.status === "rescheduled") && (
        <Card>
          <CardContent>
            <h2 className="font-bold text-gray-900">
              {booking.status === "ongoing" ? "Service In Progress" : booking.status === "completed" ? "Service Done" : "Schedule Updated"}
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              {booking.status === "ongoing"
                ? "The team is working now."
                : booking.status === "completed"
                  ? "Thank you. Please rate KJAC service."
                  : "Your window changed. Check the date and window above."}
            </p>
          </CardContent>
        </Card>
      )}

      {(booking.status === "cancelled" || booking.status === "expired") && (
        <Card>
          <CardContent>
            <h2 className="font-bold text-gray-900">
              {booking.status === "cancelled" ? "Booking Cancelled" : "Booking Expired"}
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              {booking.status === "cancelled"
                ? "Refunds go back in 3 to 5 business days via GCash if you paid."
                : "No payment was received in time. No charges applied."}
            </p>
            <div className="mt-3">
              <Button asChild className="px-6">
                <Link to="/book">Book Again</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
