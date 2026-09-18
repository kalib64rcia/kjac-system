import { BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AdminBooking } from "@/types/booking.types";

interface PoolStripProps {
  window: "morning" | "afternoon";
  poolBookings: AdminBooking[];
  onPlaceBooking?: (booking: AdminBooking) => void;
}

/**
 * Pool strip: displays unassigned (pool) bookings for a window.
 * Shows booking count, reference IDs, and a "Place" button to assign crew+time.
 */
export function PoolStrip({ window, poolBookings, onPlaceBooking }: PoolStripProps) {
  if (poolBookings.length === 0) {
    return (
      <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-100">
        <p className="text-xs text-gray-500">
          Pool {window === "morning" ? "Morning" : "Afternoon"}: empty.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-100 flex items-center justify-between gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <BookOpen size={14} className="shrink-0 text-gray-500" aria-hidden="true" />
          <p className="text-xs font-semibold text-gray-700">
            Pool {window === "morning" ? "Morning" : "Afternoon"} ({poolBookings.length})
          </p>
        </div>
        <ul className="mt-1.5 flex flex-wrap gap-2">
          {poolBookings.map((b) => (
            <li key={b.id} className="inline-flex">
              <span className="text-xs bg-white border border-gray-200 rounded px-2 py-1 text-gray-600">
                {b.reference_id}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => {
          if (onPlaceBooking && poolBookings.length > 0) {
            onPlaceBooking(poolBookings[0]);
          }
        }}
        disabled={poolBookings.length === 0}
        className="shrink-0"
      >
        Place
      </Button>
    </div>
  );
}
