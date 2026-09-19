import { useMemo, useRef, type RefObject } from "react";
import FullCalendar, { type CalendarRef, type EventInput } from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/react/daygrid";
import timeGridPlugin from "@fullcalendar/react/timegrid";
import listPlugin from "@fullcalendar/react/list";
import interactionPlugin from "@fullcalendar/react/interaction";
import monarchTheme from "@fullcalendar/react/themes/monarch";
import type { AdminBooking } from "@/types/booking.types";
import { formatTime12h } from "@/utils/format";

export type ScheduleBoardView = "Day" | "Week" | "Month" | "List";

const VIEW_KEY: Record<ScheduleBoardView, string> = {
  Day: "timeGridDay",
  Week: "timeGridWeek",
  Month: "dayGridMonth",
  List: "listWeek",
};

const KEY_VIEW: Record<string, ScheduleBoardView> = {
  timeGridDay: "Day",
  timeGridWeek: "Week",
  dayGridMonth: "Month",
  listWeek: "List",
};

const BUSINESS_HOURS = {
  daysOfWeek: [1, 2, 3, 4, 5, 6], // Mon..Sat — Sundays stay hidden
  startTime: "08:00",
  endTime: "17:00",
};

const HEADER_TOOLBAR = {
  left: "prev,next today pickDate",
  center: "title",
  right: "addBooking dayGridMonth,timeGridWeek,timeGridDay,listWeek",
};

const STATUS_STYLE: Record<string, { color: string; contrast: string }> = {
  proposed: { color: "#ffedd5", contrast: "#1f2937" },
  scheduled: { color: "#dbeafe", contrast: "#1f2937" },
  assigned: { color: "#ede9fe", contrast: "#1f2937" },
  ongoing: { color: "#d1fae5", contrast: "#1f2937" },
};

interface FullCalendarScheduleBoardProps {
  bookings: AdminBooking[];
  selectedDate: string; // YYYY-MM-DD (initial anchor; header nav reports back via datesSet)
  view: ScheduleBoardView;
  minDate: string; // YYYY-MM-DD
  maxDate: string; // YYYY-MM-DD
  calendarRef: RefObject<CalendarRef | null>;
  onViewChange: (view: ScheduleBoardView) => void;
  /** Visible range sync: anchor = currentStart day, end is exclusive. */
  onDatesChange: (anchorDate: string, rangeStart: string, rangeEndExclusive: string) => void;
  onEventClick: (bookingId: number) => void;
  onSlotSelect: (date: string, startTime: string, endTime: string | null) => void;
  onEventMove: (bookingId: number, newDate: string, newTime: string, durationMinutes: number, revert: () => void) => void;
  onEventResize: (bookingId: number, date: string, startTime: string, durationMinutes: number, revert: () => void) => void;
  onPickDateRequest: () => void;
  onAddBookingRequest: () => void;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function toYmd(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function toHM(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function bookingDuration(b: AdminBooking): number {
  const d = b.estimated_duration_minutes ?? b.service_estimated_duration_minutes ?? 60;
  return Number.isFinite(d) && d > 0 ? Math.round(d) : 60;
}

function addMinutes(date: string, time: string, mins: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + mins;
  return `${date}T${pad(Math.floor(total / 60))}:${pad(total % 60)}:00`;
}

/**
 * FullCalendarScheduleBoard: Day/Week/Month/List calendar with the Monarch
 * shadcn theme and FullCalendar's own header (nav + view switch + actions).
 * Presentational — data fetching, guards and mutations live in SchedulePage.
 * Manila wall-time throughout (no UTC conversion; backend stores wall time,
 * browser runs local, FullCalendar parses dateless ISO strings as local).
 */
export function FullCalendarScheduleBoard({
  bookings,
  selectedDate,
  view,
  minDate,
  maxDate,
  calendarRef,
  onViewChange,
  onDatesChange,
  onEventClick,
  onSlotSelect,
  onEventMove,
  onEventResize,
  onPickDateRequest,
  onAddBookingRequest,
}: FullCalendarScheduleBoardProps) {
  // Latest callbacks for the memoised header buttons (stable toolbar identity).
  const cb = useRef({ onPickDateRequest, onAddBookingRequest });
  cb.current = { onPickDateRequest, onAddBookingRequest };

  const buttons = useMemo(
    () => ({
      pickDate: { text: "Pick date", click: () => cb.current.onPickDateRequest() },
      addBooking: { text: "+ Add booking", click: () => cb.current.onAddBookingRequest(), isPrimary: true },
    }),
    [],
  );

  const validRange = useMemo(
    () => ({ start: minDate, end: addDays(maxDate, 1) }),
    [minDate, maxDate],
  );

  const events: EventInput[] = useMemo(
    () =>
      bookings.map((b) => {
        const duration = bookingDuration(b);
        const time = b.preferred_time && /^\d{2}:\d{2}/.test(b.preferred_time) ? b.preferred_time.slice(0, 5) : "08:00";
        const style = STATUS_STYLE[b.status] ?? STATUS_STYLE.scheduled;
        const name = `${b.customer_first_name} ${b.customer_last_name}`.trim() || b.reference_id;
        return {
          id: String(b.id),
          title: `${name} · ${b.service_name ?? "Service"}`,
          start: `${b.preferred_date}T${time}:00`,
          end: addMinutes(b.preferred_date, time, duration),
          // v7 color model: `color` feeds --fc-event-color (chip bg),
          // `contrastColor` feeds --fc-event-contrast-color (chip text).
          color: style.color,
          contrastColor: style.contrast,
          display: "block",
          extendedProps: {
            bookingId: b.id,
            status: b.status,
            tooltip: `${b.reference_id} · ${formatTime12h(time)} · ${duration} min · ${b.status}${b.technician_id ? "" : " · Unassigned"}`,
          },
        };
      }),
    [bookings],
  );

  return (
    <section
      aria-label="Schedule calendar"
      className="overflow-hidden rounded-lg border border-gray-200 bg-white p-3 sm:p-4"
    >
      <FullCalendar
        ref={calendarRef}
        plugins={[monarchTheme, dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
        initialView={VIEW_KEY[view]}
        initialDate={selectedDate}
        headerToolbar={HEADER_TOOLBAR}
        buttons={buttons}
        firstDay={1}
        hiddenDays={[0]}
        validRange={validRange}
        businessHours={BUSINESS_HOURS}
        selectConstraint="businessHours"
        eventConstraint="businessHours"
        slotMinTime="08:00:00"
        slotMaxTime="17:00:00"
        slotDuration="00:30:00"
        scrollTime="08:00:00"
        height="auto"
        expandRows
        nowIndicator
        allDaySlot={false}
        dayMaxEvents={4}
        selectable
        selectMirror
        editable
        events={events}
        datesSet={(arg) => {
          const nextView = KEY_VIEW[arg.view.type];
          if (nextView) onViewChange(nextView);
          onDatesChange(toYmd(arg.view.currentStart), toYmd(arg.start), toYmd(arg.end));
        }}
        select={(arg) => {
          const startMidnight = arg.start.getHours() === 0 && arg.start.getMinutes() === 0;
          const sameDay = toYmd(arg.start) === toYmd(arg.end);
          // Month-grid drags span whole days: prefill the day at opening time.
          const time = startMidnight ? "08:00" : toHM(arg.start);
          const end = !sameDay || startMidnight ? null : toHM(arg.end);
          arg.view.calendar.unselect();
          onSlotSelect(toYmd(arg.start), time, end);
        }}
        eventClick={(arg) => {
          const id = Number(arg.event.extendedProps.bookingId ?? arg.event.id);
          if (Number.isFinite(id)) onEventClick(id);
        }}
        eventDidMount={(arg) => {
          const tip = arg.event.extendedProps.tooltip;
          if (typeof tip === "string") arg.el.setAttribute("title", tip);
        }}
        eventDrop={(arg) => {
          const id = Number(arg.event.extendedProps.bookingId ?? arg.event.id);
          const start = arg.event.start;
          if (!Number.isFinite(id) || !start) {
            arg.revert();
            return;
          }
          const end = arg.event.end ?? new Date(start.getTime() + 60 * 60 * 1000);
          const duration = Math.max(30, Math.round((end.getTime() - start.getTime()) / 60000));
          onEventMove(id, toYmd(start), toHM(start), duration, arg.revert);
        }}
        eventResize={(arg) => {
          const id = Number(arg.event.extendedProps.bookingId ?? arg.event.id);
          const start = arg.event.start;
          const end = arg.event.end;
          if (!Number.isFinite(id) || !start || !end) {
            arg.revert();
            return;
          }
          const duration = Math.max(30, Math.round((end.getTime() - start.getTime()) / 60000));
          onEventResize(id, toYmd(start), toHM(start), duration, arg.revert);
        }}
      />

      {events.length === 0 && (
        <p role="status" className="border-t border-gray-100 px-1 pt-3 text-sm text-gray-500">
          No scheduled bookings in this view. Drag across empty slots to propose one, or use + Add booking.
        </p>
      )}
    </section>
  );
}

function addDays(ymd: string, n: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + n);
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}
