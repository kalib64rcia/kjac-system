import { useMemo, useState } from "react";
import { CalendarDays, Megaphone, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { Block, BookingDetailSheet } from "@/components/office/BookingDetailSheet";
import { AddBookingSheet } from "@/components/office/AddBookingSheet";
import { TimeSlotSchedule } from "@/components/office/TimeSlotSchedule";
import { ErrorCard, PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { CardSkeleton } from "@/components/ui/skeleton";
import { Sheet, SheetCloseButton, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Calendar, type Matcher } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAdminBookings, useBookingMutation } from "@/hooks/useOffice";
import { useWaitlist, useWaitlistMutation } from "@/hooks/useOffice";
import { toast } from "@/stores/toast.store";
import type { WaitlistEntry } from "@/types/booking.types";
import { formatDateLong, formatTime12h } from "@/utils/format";

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

function manilaToday(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function toDate(ymd: string): Date | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return undefined;
  return new Date(`${ymd}T00:00:00`);
}

function toYmd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function dayOfWeek(ymd: string): string {
  const wd = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return wd[new Date(`${ymd}T00:00:00`).getDay()] ?? "?";
}

/** Hour details drawer: shows bookings in a specific hour + waitlist. */
function HourDrawer({ date, time, onClose }: { date: string | null; time: string | null; onClose: () => void }) {
  const board = useAdminBookings({ date_from: date ?? undefined, date_to: date ?? undefined, limit: 100 });
  const waitlist = useWaitlist(date);
  const wl = useWaitlistMutation();

  // Bookings in this specific hour
  const hourBookings = useMemo(() => {
    if (!time) return [];
    return (board.data?.items ?? []).filter((b) => b.preferred_time && b.preferred_time.slice(0, 5) === time);
  }, [board.data, time]);

  const offer = (entry: WaitlistEntry) => {
    if (!time || !date) return;
    wl.offer.mutate(
      { id: entry.id, time },
      {
        onSuccess: () => toast.success("Offer sent", `${entry.name} was emailed a booking link.`),
        onError: (e) => toast.error("Offer failed", e instanceof Error ? e.message : undefined),
      },
    );
  };

  return (
    <Sheet open={date !== null && time !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent label="Hour details" className="flex w-full flex-col gap-0 p-0 sm:max-w-md" onClose={onClose}>
        <div className="flex items-start justify-between gap-2 border-b border-gray-200 p-4">
          <div>
            <SheetTitle>{date ? formatDateLong(date) : ""}</SheetTitle>
            <p className="mt-0.5 text-sm tabular-nums text-gray-600">
              {time ? formatTime12h(time) : ""} hour
            </p>
          </div>
          <SheetCloseButton onClose={onClose} />
        </div>
        <div className="thin-scroll flex-1 overflow-y-auto p-4">
          <div className="flex flex-col gap-4">
            <Block title={`Bookings (${hourBookings.length})`}>
              {board.isPending ? (
                <p className="text-sm text-gray-500">Loading…</p>
              ) : hourBookings.length === 0 ? (
                <p className="text-sm text-gray-500">No bookings at this hour.</p>
              ) : (
                <dl className="flex flex-col gap-2">
                  {hourBookings.map((b) => (
                    <div key={b.id} className="flex items-center justify-between gap-2 rounded-lg border border-gray-100 px-2.5 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900">
                          {`${b.customer_first_name} ${b.customer_last_name}`.trim()}
                        </p>
                        <p className="truncate font-technical text-xs text-gray-500">{b.reference_id}</p>
                      </div>
                      <StatusBadge status={b.status} />
                    </div>
                  ))}
                </dl>
              )}
            </Block>
            <Block title={`Waitlist (${(waitlist.data ?? []).length})`}>
              {waitlist.isPending ? (
                <p className="text-sm text-gray-500">Loading…</p>
              ) : (waitlist.data ?? []).length === 0 ? (
                <p className="text-sm text-gray-500">Nobody waiting.</p>
              ) : (
                <dl className="flex flex-col gap-2">
                  {(waitlist.data ?? []).map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between gap-2 rounded-lg border border-gray-100 px-2.5 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900">{entry.name}</p>
                        <p className="truncate text-xs tabular-nums text-gray-500">{entry.phone}</p>
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
                            onClick={() => offer(entry)}
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
                    </div>
                  ))}
                </dl>
              )}
            </Block>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/** Daily timetable schedule board: hourly rows 8am-5pm, pool strip for awaiting-schedule bookings. */
export function SchedulePage() {
  const today = manilaToday();
  const [selectedDate, setSelectedDate] = useState(today);
  const [calOpen, setCalOpen] = useState(false);
  const [selectedHour, setSelectedHour] = useState<{ date: string; time: string } | null>(null);
  const [addBookingOpen, setAddBookingOpen] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null);

  const minDate = today;
  const maxDate = addDaysISO(today, 30);

  // Load bookings for the selected day
  const dayBookings = useAdminBookings({ date_from: selectedDate, date_to: selectedDate, limit: 100 });
  const waitlist = useWaitlist(selectedDate);
  const mut = useBookingMutation();

  // Get all assigned and ongoing bookings for the day (only those WITH a scheduled time)
  const allAssignedBookings = useMemo(
    () => {
      const filtered = (dayBookings.data?.items ?? []).filter(
        (b) => b.preferred_date === selectedDate && b.preferred_time && (b.status === "proposed" || b.status === "scheduled" || b.status === "assigned" || b.status === "ongoing")
      );
      console.debug("allAssignedBookings filter:", {
        totalItems: dayBookings.data?.items?.length ?? 0,
        filteredItems: filtered.length,
        selectedDate,
        sample: dayBookings.data?.items?.[0] ? {
          id: dayBookings.data.items[0].id,
          preferred_date: dayBookings.data.items[0].preferred_date,
          preferred_time: dayBookings.data.items[0].preferred_time,
          status: dayBookings.data.items[0].status,
        } : null,
      });
      return filtered;
    },
    [dayBookings.data, selectedDate]
  );

  // Get all pool bookings (submitted, no time assigned yet)
  const allPoolBookings = useMemo(
    () => (dayBookings.data?.items ?? []).filter(
      (b) => b.preferred_date === selectedDate && b.status === "submitted" && !b.preferred_time
    ),
    [dayBookings.data, selectedDate]
  );

  const dayName = dayOfWeek(selectedDate);

  const disabled: Matcher[] = [
    { before: toDate(minDate) as Date },
    { after: toDate(maxDate) as Date },
    { dayOfWeek: [0] }, // Sundays
  ];

  const handleDateChange = (direction: -1 | 1) => {
    const newDate = addDaysISO(selectedDate, direction);
    if (newDate >= minDate && newDate <= maxDate) {
      setSelectedDate(newDate);
    }
  };

  return (
    <div className="min-w-0">
      <PageHeader
        title="Schedule"
        description="Daily timetable with hourly time slots. View assignments, manage pool bookings, check the waitlist."
      />

      {/* Header: Date navigation */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => setSelectedDate(today)}
              variant="default"
            >
              Today
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="min-h-[36px] min-w-[36px]"
              disabled={selectedDate <= minDate}
              onClick={() => handleDateChange(-1)}
              aria-label="Previous day"
            >
              <ChevronLeft size={16} aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="min-h-[36px] min-w-[36px]"
              disabled={selectedDate >= maxDate}
              onClick={() => handleDateChange(1)}
              aria-label="Next day"
            >
              <ChevronRight size={16} aria-hidden="true" />
            </Button>
            <Popover open={calOpen} onOpenChange={setCalOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <CalendarDays size={16} aria-hidden="true" />
                  Pick date
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={toDate(selectedDate)}
                  disabled={disabled}
                  onSelect={(d) => {
                    if (d) {
                      setSelectedDate(toYmd(d));
                      setCalOpen(false);
                    }
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>
          <Button type="button" size="sm" onClick={() => setAddBookingOpen(true)}>
            + Add booking
          </Button>
        </div>

        {/* Date display */}
        <div className="px-1 py-2">
          <h2 className="text-xl font-bold text-gray-900">
            {dayName}, {new Date(`${selectedDate}T00:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </h2>
        </div>
      </div>

      {/* Loading / Error states */}
      {dayBookings.isPending && (
        <div aria-busy="true" aria-label="Loading schedule" className="mt-4">
          <CardSkeleton />
        </div>
      )}
      {dayBookings.isError && (
        <div className="mt-4">
          <ErrorCard
            message={dayBookings.error instanceof Error ? dayBookings.error.message : "Could not load bookings."}
            onRetry={() => void dayBookings.refetch()}
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
                      onClick={() => setSelectedHour({ date: selectedDate, time: "08:00" })}
                      className="rounded-lg border border-primary-200 bg-primary-50 px-3 py-2 text-sm font-semibold text-primary-700 hover:bg-primary-100 transition-colors whitespace-nowrap"
                    >
                      Assign time
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Daily timetable 8 AM to 5 PM using TimeSlotSchedule component */}
          <TimeSlotSchedule
            bookings={allAssignedBookings}
            onBookingClick={(bookingId) => setSelectedBookingId(bookingId)}
            onSlotClick={(time) => setSelectedHour({ date: selectedDate, time })}
          />

          {/* Waitlist */}
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-gray-900">
              Waitlist ({(waitlist.data ?? []).length})
            </h3>
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
                    </div>
                    <div className="flex gap-1.5">
                      <Button size="sm" variant="outline">
                        <Megaphone size={14} aria-hidden="true" />
                      </Button>
                      <Button size="sm" variant="outline">
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

      {/* Hour drawer for viewing details */}
      <HourDrawer
        date={selectedHour?.date ?? null}
        time={selectedHour?.time ?? null}
        onClose={() => setSelectedHour(null)}
      />

      {/* Add booking sheet */}
      <AddBookingSheet
        open={addBookingOpen}
        onClose={() => setAddBookingOpen(false)}
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
            await dayBookings.refetch();
          } catch (err) {
            toast.error("Proposal failed", err instanceof Error ? err.message : "Could not propose schedule for booking.");
          }
        }}
      />

      {/* Booking detail sheet for editing scheduled bookings */}
      <BookingDetailSheet
        booking={selectedBookingId ? dayBookings.data?.items.find((b) => b.id === selectedBookingId) ?? null : null}
        onClose={() => {
          setSelectedBookingId(null);
          void dayBookings.refetch();
        }}
        onProposeSchedule={() => {
          setAddBookingOpen(true);
        }}
      />
    </div>
  );
}

