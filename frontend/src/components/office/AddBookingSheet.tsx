import { useMemo, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { Block } from "@/components/office/BookingDetailSheet";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetCloseButton,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SchedulePicker, TIME_SLOTS } from "@/components/forms/SchedulePicker";
import { useAdminBookings } from "@/hooks/useOffice";
import { formatDateLong, formatTime12h } from "@/utils/format";

interface AddBookingSheetProps {
  open: boolean;
  onClose: () => void;
  onSave?: (data: {
    bookingId: number;
    date: string;
    startTime: string;
    endTime: string;
  }) => Promise<void>;
}

/**
 * Time overlap checker: returns true if two time ranges conflict
 */
function hasTimeOverlap(
  start1Str: string,
  end1Str: string,
  start2Str: string,
  end2Str: string
): boolean {
  const [h1, m1] = start1Str.split(":").map(Number);
  const [h1e, m1e] = end1Str.split(":").map(Number);
  const [h2, m2] = start2Str.split(":").map(Number);
  const [h2e, m2e] = end2Str.split(":").map(Number);

  const start1Min = h1 * 60 + m1;
  const end1Min = h1e * 60 + m1e;
  const start2Min = h2 * 60 + m2;
  const end2Min = h2e * 60 + m2e;

  return start1Min < end2Min && start2Min < end1Min;
}

/**
 * Get the end time of a booking (assumed to be 1 hour from start time)
 */
function getBookingEndTime(startTimeStr: string): string {
  const [h, m] = startTimeStr.split(":").map(Number);
  const endH = Math.min(h + 1, 23); // Cap at 23:59
  return `${String(endH).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Propose booking sheet: select ANY submitted booking and propose a schedule on ANY date (within 30 days).
 * Admin picks a date and time, customer receives email to accept/decline.
 * Technician assignment happens AFTER customer accepts.
 */
export function AddBookingSheet({ open, onClose, onSave }: AddBookingSheetProps) {
  const [selectedBookingId, setSelectedBookingId] = useState<string>("");
  const [proposedDate, setProposedDate] = useState<string>("");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("09:00");
  const [saving, setSaving] = useState(false);

  // 1. Load ALL submitted bookings (no date filter) for dropdown
  const allSubmitted = useAdminBookings({ status: "submitted", limit: 100 });
  
  const poolBookings = useMemo(
    () => (allSubmitted.data?.items ?? []).filter((b) => b.status === "submitted" && !b.technician_id),
    [allSubmitted.data],
  );

  const selectedBooking = poolBookings.find((b) => b.id === Number(selectedBookingId));

  // 2. Load conflicts only for the SELECTED date
  const conflictQuery = useAdminBookings({
    date_from: proposedDate || undefined,
    date_to: proposedDate || undefined,
    limit: 100,
  });

  // Get all proposed, scheduled, assigned, and ongoing bookings on selected date for conflict detection
  const scheduledBookings = useMemo(
    () => (conflictQuery.data?.items ?? []).filter((b) =>
      (b.status === "proposed" || b.status === "scheduled" || b.status === "assigned" || b.status === "ongoing") &&
      b.preferred_time
    ),
    [conflictQuery.data],
  );

  // Valid end times: must be after start time
  const validEndSlots = useMemo(() => {
    const startIdx = TIME_SLOTS.indexOf(startTime);
    if (startIdx === -1) return [];
    return TIME_SLOTS.slice(startIdx + 1);
  }, [startTime]);

  // Auto-adjust end time if it becomes invalid
  if (endTime && !validEndSlots.includes(endTime) && validEndSlots.length > 0) {
    setEndTime(validEndSlots[0]);
  }

  // Find conflicting bookings with selected time range
  const conflictingBooking = useMemo(() => {
    if (!startTime || !endTime) return null;
    
    for (const b of scheduledBookings) {
      if (!b.preferred_time) continue;
      
      // Assume bookings are 1 hour long if duration not specified
      const bookingEndTime = getBookingEndTime(b.preferred_time);
      
      if (hasTimeOverlap(startTime, endTime, b.preferred_time, bookingEndTime)) {
        return b;
      }
    }
    return null;
  }, [startTime, endTime, scheduledBookings]);

  const handleSave = async () => {
    if (!selectedBooking || !startTime || !endTime || !proposedDate) {
      return;
    }

    setSaving(true);
    try {
      if (onSave) {
        await onSave({
          bookingId: selectedBooking.id,
          date: proposedDate,
          startTime,
          endTime,
        });
      }
      // Reset form after successful save
      setSelectedBookingId("");
      setProposedDate("");
      setStartTime("08:00");
      setEndTime("09:00");
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent label="Propose booking schedule" className="flex w-full flex-col gap-0 p-0 sm:max-w-md" onClose={onClose}>
        <div className="flex items-start justify-between gap-2 border-b border-gray-200 p-4">
          <div>
            <SheetTitle>Propose booking schedule</SheetTitle>
            <p className="mt-0.5 text-sm tabular-nums text-gray-600">
              {proposedDate ? formatDateLong(proposedDate) : "Select a date"}
            </p>
          </div>
          <SheetCloseButton onClose={onClose} />
        </div>

        <div className="thin-scroll flex-1 overflow-y-auto p-4">
          <div className="flex flex-col gap-4">
            {/* 1. Select Booking */}
            <Block title="1 Booking">
              {allSubmitted.isPending ? (
                <p className="text-sm text-gray-500">Loading bookings…</p>
              ) : poolBookings.length === 0 ? (
                <p className="text-sm text-gray-500">No unassigned submitted bookings.</p>
              ) : (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-600">
                    Select booking *
                  </label>
                  <Select value={selectedBookingId} onValueChange={setSelectedBookingId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a booking…" />
                    </SelectTrigger>
                    <SelectContent>
                      {poolBookings.map((b) => (
                        <SelectItem key={b.id} value={String(b.id)}>
                          {b.reference_id} · {b.customer_first_name} {b.customer_last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedBooking && (
                    <div className="mt-2 rounded-lg bg-primary-50 border border-primary-200 p-2.5 space-y-1.5">
                      <p className="text-xs text-gray-600">
                        <span className="font-semibold text-gray-900">{selectedBooking.reference_id}</span>
                        {" · "}
                        <span>
                          {selectedBooking.flex_window === "morning" || selectedBooking.flex_window === "afternoon" || selectedBooking.flex_window === "anytime"
                            ? selectedBooking.flex_window === "morning"
                              ? "Morning (8 to 12)"
                              : selectedBooking.flex_window === "afternoon"
                                ? "Afternoon (12 to 5)"
                                : "Anytime (8 to 5)"
                            : "Custom"}
                        </span>
                      </p>
                      <p className="text-xs text-gray-600">{selectedBooking.address_text}</p>
                      <p className="text-xs text-primary-700 font-semibold">
                        Preferred: {formatDateLong(selectedBooking.preferred_date)}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </Block>

            {/* 2. Select Date */}
            {selectedBooking && (
              <Block title="2 Date">
                <SchedulePicker
                  date={proposedDate}
                  allowSunday={true}
                  onChange={({ preferred_date }) => {
                    if (preferred_date) setProposedDate(preferred_date);
                  }}
                  errors={{}}
                />
              </Block>
            )}

            {/* 3. Select Time Slot */}
            {selectedBooking && proposedDate && (
              <Block title="3 Time Slot">
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-2">
                      Start time *
                    </label>
                    <Select value={startTime} onValueChange={setStartTime}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIME_SLOTS.map((slot) => (
                          <SelectItem key={slot} value={slot}>
                            {formatTime12h(slot)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-2">
                      End time *
                    </label>
                    <Select value={endTime} onValueChange={setEndTime}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {validEndSlots.map((slot) => (
                          <SelectItem key={slot} value={slot}>
                            {formatTime12h(slot)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <p className="text-xs text-gray-500">
                    Duration: {startTime && endTime ? `${formatTime12h(startTime)} – ${formatTime12h(endTime)}` : "—"}
                  </p>

                  {conflictingBooking && (
                    <div className="rounded-lg bg-red-50 border border-red-200 p-3 flex gap-2">
                      <AlertCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                      <p className="text-xs text-red-900">
                        <span className="font-semibold">Time conflict:</span> Booking {conflictingBooking.reference_id} is already scheduled at this time. Choose a different time.
                      </p>
                    </div>
                  )}

                  <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
                    <p className="text-xs text-blue-900">
                      <span className="font-semibold">Info:</span> Customer will receive an email with the proposed time. They can accept or request a reschedule. You can adjust the time anytime before assigning a technician.
                    </p>
                  </div>
                </div>
              </Block>
            )}
          </div>
        </div>

        {/* Save Button */}
        <div className="border-t border-gray-200 bg-white p-4 flex gap-2">
          <Button
            type="button"
            className="flex-1"
            disabled={saving || !selectedBooking || !proposedDate || !startTime || !endTime || !!conflictingBooking}
            onClick={handleSave}
          >
            {saving && <Loader2 size={14} className="mr-1.5 animate-spin" aria-hidden="true" />}
            {saving ? "Proposing…" : "Propose Schedule"}
          </Button>
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Discard
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
