import { useMemo, useRef, useState } from "react";
import { Megaphone, Trash2 } from "lucide-react";
import { type CalendarRef } from "@fullcalendar/react";
import { BookingDetailSheet } from "@/components/office/BookingDetailSheet";
import { AddBookingSheet } from "@/components/office/AddBookingSheet";
import { FullCalendarScheduleBoard, type ScheduleBoardView } from "@/components/office/FullCalendarScheduleBoard";
import { ConfirmDialog, type ConfirmSpec } from "@/components/feedback/ConfirmDialog";
import { TIME_SLOTS } from "@/components/forms/SchedulePicker";
import { ErrorCard, PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { CardSkeleton } from "@/components/ui/skeleton";
import { useBusinessHours } from "@/components/forms/BookingCalendar";
import { PickDateDialog } from "@/components/forms/PickDate";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAdminBookings, useBookingMutation } from "@/hooks/useOffice";
import { useWaitlist, useWaitlistMutation } from "@/hooks/useOffice";
import { toast } from "@/stores/toast.store";
import { formatDateLong, formatTime12h, manilaToday } from "@/utils/format";

function parseISO(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDaysISO(ymd: string, n: number): string {
  const d = parseISO(ymd);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

function clampDate(ymd: string, min: string, max: string): string {
  if (ymd < min) return min;
  if (ymd > max) return max;
  return ymd;
}

/** Schedule board: FullCalendar (own header), pool strip, waitlist. */
export function SchedulePage() {
  const today = manilaToday();
  const [selectedDate, setSelectedDate] = useState(today);
  const [view, setView] = useState<ScheduleBoardView>("Day");
  const [range, setRange] = useState({ from: today, to: today });
  const [calOpen, setCalOpen] = useState(false);
  const [pendingSlot, setPendingSlot] = useState<{ date: string; time: string; endTime?: string | null; bookingId?: number } | null>(null);
  const [addBookingOpen, setAddBookingOpen] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null);
  const [confirm, setConfirm] = useState<ConfirmSpec | null>(null);
  const [offerTime, setOfferTime] = useState("08:00");

  const minDate = today;
  const maxDate = addDaysISO(today, 30);
  const hours = useBusinessHours();

  const calRef = useRef<CalendarRef | null>(null);
  /** Revert for the pending drag/resize (called on dialog cancel only). */
  const pendingRevert = useRef<(() => void) | null>(null);

  // Visible range comes from the calendar (datesSet); queries follow it.
  const rangeFrom = range.from;
  const rangeTo = range.to;

  // Load bookings for the visible range. Backend caps limit at 100 (le=100),
  // so busy weeks pull a conditional second page when total overflows.
  const dayBookings = useAdminBookings({ date_from: rangeFrom, date_to: rangeTo, limit: 100 });
  const needPage2 = (dayBookings.data?.total ?? 0) > (dayBookings.data?.items.length ?? 0);
  const page2 = useAdminBookings(
    { date_from: rangeFrom, date_to: rangeTo, limit: 100, page: 2 },
    { enabled: needPage2 },
  );

  /** Full visible-range list (page 1 + overflow page 2 when the week is busy). */
  const boardItems = useMemo(
    () => [...(dayBookings.data?.items ?? []), ...(needPage2 ? (page2.data?.items ?? []) : [])],
    [dayBookings.data, page2.data, needPage2],
  );

  const boardPending = dayBookings.isPending || (needPage2 && page2.isPending);
  const boardFailed = dayBookings.isError || (needPage2 && page2.isError);
  const boardErrorMessage =
    (dayBookings.isError && dayBookings.error instanceof Error && dayBookings.error.message) ||
    (needPage2 && page2.isError && page2.error instanceof Error && page2.error.message) ||
    "Could not load bookings.";

  const refetchBoard = () => {
    const pending = [dayBookings.refetch()];
    if (needPage2) pending.push(page2.refetch());
    return Promise.all(pending);
  };
  const waitlist = useWaitlist(selectedDate);
  const wl = useWaitlistMutation();
  const mut = useBookingMutation();

  // Calendar events: bookings WITH a scheduled time (pool stays out of the grid).
  const allAssignedBookings = useMemo(
    () =>
      boardItems.filter(
        (b) =>
          b.preferred_date >= rangeFrom &&
          b.preferred_date <= rangeTo &&
          b.preferred_time &&
          (b.status === "proposed" || b.status === "scheduled" || b.status === "assigned" || b.status === "ongoing"),
      ),
    [boardItems, rangeFrom, rangeTo],
  );

  // Pool bookings (submitted, no time assigned yet) across the visible range.
  const allPoolBookings = useMemo(
    () =>
      boardItems.filter(
        (b) =>
          b.preferred_date >= rangeFrom &&
          b.preferred_date <= rangeTo &&
          b.status === "submitted" &&
          !b.preferred_time,
      ),
    [boardItems, rangeFrom, rangeTo],
  );

  const gotoDate = (ymd: string) => {
    setSelectedDate(ymd);
    calRef.current?.getApi().gotoDate(ymd);
  };

  /** Calendar header nav reports back: keep view + anchor + query range in sync. */
  const handleDatesChange = (anchor: string, start: string, endExclusive: string) => {
    setSelectedDate((prev) => {
      const next = clampDate(anchor, minDate, maxDate);
      return next === prev ? prev : next;
    });
    setRange((prev) => {
      const to = addDaysISO(endExclusive, -1);
      return prev.from === start && prev.to === to ? prev : { from: start, to };
    });
  };

  /** Slot guards mirror live business rules (Settings → Business Hours). */
  const checkSlot = (date: string, time: string): { title: string; message: string } | null => {
    const day = new Date(`${date}T00:00:00`);
    if (!hours.openDays[(day.getDay() + 6) % 7]) {
      const name = day.toLocaleDateString("en-US", { weekday: "long" });
      return { title: "Closed day", message: `${name} is outside business days. Pick an open day.` };
    }
    if (date < minDate || date > maxDate) {
      return { title: "Out of range", message: "Schedule within today and the next 30 days." };
    }
    if (time < hours.openTime || time > hours.closeTime) {
      return { title: "Outside business hours", message: `Pick ${formatTime12h(hours.openTime)} – ${formatTime12h(hours.closeTime)}.` };
    }
    return null;
  };

  /** Clicked/dragged slot → prefill the propose sheet. Guards mirror business rules. */
  const handleSlotSelect = (date: string, time: string, endTime: string | null = null) => {
    const err = checkSlot(date, time);
    if (err) {
      toast.error(err.title, err.message);
      return;
    }
    setPendingSlot({ date, time, endTime });
    setAddBookingOpen(true);
  };

  /** Drag-move / resize → confirm → guard-checked set-slot. Dialog cancel reverts the drag. */
  const requestMove = (bookingId: number, newDate: string, newTime: string, durationMinutes: number, kind: "move" | "resize", revert: () => void) => {
    const booking = boardItems.find((b) => b.id === bookingId);
    if (!booking) {
      revert();
      return;
    }
    if (booking.status === "ongoing") {
      toast.error("Job in progress", "Ongoing jobs can't be moved. Edit via the detail sheet.");
      revert();
      return;
    }
    const err = checkSlot(newDate, newTime);
    if (err) {
      toast.error(err.title, err.message);
      revert();
      return;
    }
    const oldLabel = `${formatDateLong(booking.preferred_date)} at ${formatTime12h(booking.preferred_time?.slice(0, 5) ?? null)}`;
    const newLabel = `${formatDateLong(newDate)} at ${formatTime12h(newTime)}`;
    let confirmed = false;
    pendingRevert.current = () => {
      if (!confirmed) revert();
    };
    setConfirm({
      title: `${kind === "move" ? "Move" : "Resize"} ${booking.reference_id}?`,
      body: (
        <>
          {oldLabel} → <strong>{newLabel}</strong>
          {kind === "resize" ? ` (${durationMinutes} min).` : "."} Everyone affected is notified.
        </>
      ),
      confirmLabel: kind === "move" ? "Move booking" : "Change duration",
      onConfirm: async () => {
        confirmed = true;
        try {
          await mut.setSlot.mutateAsync({ id: bookingId, date: newDate, time: newTime, duration: durationMinutes });
          toast.success(kind === "move" ? "Booking moved" : "Duration changed", newLabel);
        } catch (err) {
          toast.error(kind === "move" ? "Move failed" : "Resize failed", err instanceof Error ? err.message : undefined);
        }
      },
    });
  };

  const offer = (entryId: number, name: string) => {
    wl.offer.mutate(
      { id: entryId, time: offerTime },
      {
        onSuccess: () => toast.success("Offer sent", `${name} was emailed a booking link.`),
        onError: (e) => toast.error("Offer failed", e instanceof Error ? e.message : undefined),
      },
    );
  };

  return (
    <div className="min-w-0">
      <PageHeader
        title="Schedule"
        description="Day, Week, Month and List views with drag-and-drop. View assignments, manage pool bookings, check the waitlist."
      />

      {/* Date navigation lives in the calendar header (prev/next/today, Pick date, view switch). */}

      {/* Loading / Error states */}
      {boardPending && (
        <div aria-busy="true" aria-label="Loading schedule" className="mt-4">
          <CardSkeleton />
        </div>
      )}
      {boardFailed && (
        <div className="mt-4">
          <ErrorCard
            message={boardErrorMessage}
            onRetry={() => void refetchBoard()}
          />
        </div>
      )}

      {dayBookings.data && (
        <div className="mt-6 flex flex-col gap-8">
          {/* Pool bookings section */}
          {allPoolBookings.length > 0 && (
            <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
              <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
                <h2 className="text-sm font-semibold text-gray-900">Awaiting Schedule ({allPoolBookings.length})</h2>
                <p className="text-xs text-gray-500 mt-1">Submitted bookings waiting for admin to propose exact time.</p>
              </div>
              <div className="divide-y divide-gray-100">
                {allPoolBookings.map((b) => (
                  <div key={b.id} className="flex items-center justify-between gap-2 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900">
                        {`${b.customer_first_name} ${b.customer_last_name}`.trim()}
                      </p>
                      <p className="text-xs text-gray-600 mt-0.5">{b.service_name} · {b.address_text}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setPendingSlot({ date: b.preferred_date, time: "08:00", bookingId: b.id });
                        setAddBookingOpen(true);
                      }}
                      className="rounded-lg border border-primary-200 bg-primary-50 px-3 py-2 text-sm font-semibold text-primary-700 hover:bg-primary-100 transition-colors whitespace-nowrap"
                    >
                      Assign time
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* FullCalendar (own header, 8 AM to 5 PM business hours) */}
          <FullCalendarScheduleBoard
            bookings={allAssignedBookings}
            selectedDate={selectedDate}
            view={view}
            minDate={minDate}
            maxDate={maxDate}
            calendarRef={calRef}
            onViewChange={setView}
            onDatesChange={handleDatesChange}
            onEventClick={(bookingId) => setSelectedBookingId(bookingId)}
            onSlotSelect={handleSlotSelect}
            onEventMove={(id, date, time, duration, revert) => requestMove(id, date, time, duration, "move", revert)}
            onEventResize={(id, date, time, duration, revert) => requestMove(id, date, time, duration, "resize", revert)}
            onPickDateRequest={() => setCalOpen(true)}
            onAddBookingRequest={() => {
              setPendingSlot(null);
              setAddBookingOpen(true);
            }}
          />

          {/* Waitlist */}
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-gray-900">
                Waitlist ({(waitlist.data ?? []).length})
              </h3>
              {(waitlist.data ?? []).length > 0 && (
                <label className="flex items-center gap-2 text-xs font-semibold text-gray-600">
                  Offer time
                  <Select value={offerTime} onValueChange={setOfferTime}>
                    <SelectTrigger className="w-32" aria-label="Offer time">
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
                </label>
              )}
            </div>
            {waitlist.isPending ? (
              <p className="mt-2 text-sm text-gray-500">Loading…</p>
            ) : (waitlist.data ?? []).length === 0 ? (
              <p className="mt-2 text-sm text-gray-500">Nobody waiting.</p>
            ) : (
              <ul className="mt-3 flex flex-col gap-2">
                {(waitlist.data ?? []).map((entry) => (
                  <li key={entry.id} className="flex items-center justify-between gap-2 rounded-lg border border-gray-100 px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{entry.name}</p>
                      <p className="text-xs text-gray-500">{entry.phone}</p>
                      {entry.status === "offered" && (
                        <p className="text-xs font-medium text-teal-700">Offer sent by email</p>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      {entry.status === "waiting" && (
                        <Button
                          type="button"
                          size="sm"
                          disabled={wl.offer.isPending}
                          onClick={() => offer(entry.id, entry.name)}
                        >
                          <Megaphone size={14} aria-hidden="true" />
                          Offer
                        </Button>
                      )}
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        aria-label={`Remove ${entry.name} from waitlist`}
                        disabled={wl.remove.isPending}
                        onClick={() =>
                          wl.remove.mutate(entry.id, {
                            onError: (e) => toast.error("Remove failed", e instanceof Error ? e.message : undefined),
                          })
                        }
                      >
                        <Trash2 size={14} aria-hidden="true" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Move/resize confirmation (dialog cancel reverts the drag, then refresh) */}
      <ConfirmDialog
        spec={confirm}
        onClose={() => {
          pendingRevert.current?.();
          pendingRevert.current = null;
          setConfirm(null);
          void refetchBoard();
        }}
      />

      {/* Pick-date dialog (opened from the calendar header) */}
      <PickDateDialog
        open={calOpen}
        onClose={() => setCalOpen(false)}
        value={selectedDate}
        onChange={gotoDate}
        minDate={minDate}
        maxDate={maxDate}
      />

      {/* Add booking sheet (prefilled when opened from a calendar slot or pool row) */}
      <AddBookingSheet
        open={addBookingOpen}
        initialDate={pendingSlot?.date}
        initialStartTime={pendingSlot?.time}
        initialEndTime={pendingSlot?.endTime}
        initialBookingId={pendingSlot?.bookingId}
        onClose={() => {
          setAddBookingOpen(false);
          setPendingSlot(null);
        }}
        onSave={async (data) => {
          try {
            // Calculate duration in minutes from start and end time
            const [startHour, startMin] = data.startTime.split(':').map(Number);
            const [endHour, endMin] = data.endTime.split(':').map(Number);
            const startTotalMin = startHour * 60 + startMin;
            const endTotalMin = endHour * 60 + endMin;
            const durationMinutes = endTotalMin - startTotalMin;

            // Call the new schedule endpoint to transition booking to 'proposed' status
            // This sends an email to the customer with date + start time only
            await mut.schedule.mutateAsync({
              id: data.bookingId,
              date: data.date,
              startTime: data.startTime,
              duration: durationMinutes,
            });

            toast.success("Schedule proposed", `${data.date} at ${formatTime12h(data.startTime)}. Customer notified via email.`);
            setAddBookingOpen(false);
            setPendingSlot(null);
            await refetchBoard();
          } catch (err) {
            toast.error("Proposal failed", err instanceof Error ? err.message : "Could not propose schedule for booking.");
          }
        }}
      />

      {/* Booking detail sheet for editing scheduled bookings */}
      <BookingDetailSheet
        booking={selectedBookingId ? boardItems.find((b) => b.id === selectedBookingId) ?? null : null}
        onClose={() => {
          setSelectedBookingId(null);
          void refetchBoard();
        }}
        onProposeSchedule={() => {
          setAddBookingOpen(true);
        }}
      />
    </div>
  );
}

