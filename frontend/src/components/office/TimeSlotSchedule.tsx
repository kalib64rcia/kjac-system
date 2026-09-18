import { useMemo } from "react";
import type { AdminBooking } from "@/types/booking.types";
import { formatTime12h } from "@/utils/format";

interface TimeSlotScheduleProps {
  bookings: AdminBooking[];
  onBookingClick: (bookingId: number) => void;
  onSlotClick?: (time: string) => void;
}

// Generate 30-minute time slots from 8:00 AM to 5:00 PM
const SCHEDULE_TIMES = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30",
  "16:00", "16:30", "17:00"
];

/**
 * Calculate end time from start time and duration in minutes
 */
function calculateEndTime(startTime: string, durationMinutes: number): string {
  const [hours, minutes] = startTime.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes + durationMinutes;
  const endHours = Math.floor(totalMinutes / 60) % 24;
  const endMinutes = totalMinutes % 60;
  return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
}

/**
 * Get the index of the time slot (0 for 08:00, 1 for 08:30, etc.)
 */
function getTimeSlotIndex(time: string): number {
  return SCHEDULE_TIMES.indexOf(time);
}

/**
 * Calculate how many 30-minute slots a booking spans
 */
function calculateSlotSpan(durationMinutes: number): number {
  const slots = Math.ceil(durationMinutes / 30);
  return Math.max(1, slots); // At least 1 slot
}

/**
 * TimeSlotSchedule: Renders bookings in a 30-minute time slot grid layout
 * Left: time slot ranges (8:00-8:30, 8:30-9:00, etc.)
 * Right: bookings organized by slot with horizontal stacking for overlaps
 */
export function TimeSlotSchedule({
  bookings,
  onBookingClick,
}: TimeSlotScheduleProps) {
  // Calculate which bookings start in each slot
  const bookingsByStartSlot = useMemo(() => {
    const slotBookings: Map<string, AdminBooking[]> = new Map();

    SCHEDULE_TIMES.forEach(time => {
      slotBookings.set(time, []);
    });

    // Group bookings by their starting slot
    bookings.forEach(booking => {
      const startTime = booking.preferred_time ?? "08:00";
      const startIdx = getTimeSlotIndex(startTime);

      // Only process if start time is valid
      if (startIdx >= 0 && startIdx < SCHEDULE_TIMES.length) {
        slotBookings.get(startTime)!.push(booking);
      }
    });

    return slotBookings;
  }, [bookings]);

  // Render a booking card
  const renderBookingCard = (booking: AdminBooking) => {
    const startTime = booking.preferred_time ?? "08:00";
    const duration = booking.estimated_duration_minutes ?? booking.service_estimated_duration_minutes ?? 60;
    const endTime = calculateEndTime(startTime, duration);
    const slotSpan = calculateSlotSpan(duration);
    const isCompact = duration < 60;

    // Get column index based on overlap position
    const startIdx = getTimeSlotIndex(startTime);
    const overlappingInSlot = bookingsByStartSlot.get(startTime) ?? [];
    const columnIndex = overlappingInSlot.indexOf(booking);

    return (
      <div
        key={`${booking.id}`}
        style={{
          gridColumn: `${columnIndex + 1} / span 1`,
          gridRow: `${startIdx + 1} / span ${slotSpan}`,
        }}
        className="min-w-0"
      >
        <button
          type="button"
          onClick={() => onBookingClick(booking.id)}
          className={`w-full h-full rounded-lg border px-2.5 py-2 text-left transition-all hover:shadow-md active:scale-[0.98] flex flex-col justify-start overflow-hidden ${
            isCompact
              ? "bg-primary-100 border-primary-300 hover:bg-primary-200"
              : "bg-primary-50 border-primary-200 hover:bg-primary-100"
          }`}
        >
          {/* Booking name */}
          <p className={`font-semibold text-gray-900 truncate ${isCompact ? "text-xs leading-tight" : "text-sm"}`}>
            {`${booking.customer_first_name} ${booking.customer_last_name}`.trim()}
          </p>

          {/* Service details (hidden if compact) */}
          {!isCompact && (
            <>
              <p className="text-xs text-gray-600 truncate mt-0.5">
                {booking.service_name}
              </p>
              <p className="text-xs text-gray-500 tabular-nums mt-1">
                {formatTime12h(startTime)} - {formatTime12h(endTime)}
              </p>
            </>
          )}

          {/* Technician status */}
          {!booking.technician_id && (
            <p className={`font-semibold text-amber-600 mt-auto ${isCompact ? "text-xs" : "text-xs"}`}>
              ⚠ Unassigned
            </p>
          )}
        </button>
      </div>
    );
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      {/* Header */}
      <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-900">Hourly Schedule</h2>
        <p className="text-xs text-gray-500 mt-1">8:00 AM to 5:00 PM</p>
      </div>

      {/* Grid layout: time slot ranges on left, booking area on right */}
      <div className="grid grid-cols-[140px_1fr] divide-x divide-gray-200 gap-0">
        {/* Left column: Time slot ranges (30-minute intervals) */}
        <div className="flex flex-col bg-gray-50 border-r border-gray-200">
          {SCHEDULE_TIMES.map((time, idx, arr) => {
            // Get the next time slot to form a range
            const nextIdx = idx + 1;
            const nextTime = nextIdx < arr.length ? arr[nextIdx] : null;

            const startDisplay = formatTime12h(time);
            const endDisplay = nextTime ? formatTime12h(nextTime) : formatTime12h(time);

            return (
              <div
                key={time}
                className={`h-12 px-2.5 py-1 flex items-center justify-center font-technical text-xs font-semibold text-gray-600 text-center ${
                  idx < arr.length - 1 ? "border-b border-gray-100" : ""
                }`}
              >
                <span className="leading-snug">
                  {startDisplay}<br />{endDisplay}
                </span>
              </div>
            );
          })}
        </div>

        {/* Right column: Booking grid that spans rows */}
        <div
          style={{
            display: "grid",
            gridTemplateRows: `repeat(${SCHEDULE_TIMES.length}, 48px)`,
            gridAutoColumns: "1fr",
            gap: "4px",
            padding: "8px",
          }}
        >
          {/* Render all bookings - they'll span multiple rows based on duration */}
          {bookings.map(booking => renderBookingCard(booking))}
        </div>
      </div>
    </div>
  );
}
