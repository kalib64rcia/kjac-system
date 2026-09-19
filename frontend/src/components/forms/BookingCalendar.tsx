import { useMemo } from "react";
import { Calendar, type Matcher } from "@/components/ui/calendar";
import { useLandingContent } from "@/hooks/usePublic";

const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export interface BusinessHours {
  /** Mon..Sun open flags from Settings. */
  openDays: boolean[];
  openTime: string;
  closeTime: string;
  /** Legacy display string, auto-synced on every hours save. */
  display: string;
  allowSunday: boolean;
}

/** Live business-hours rules (5-min cache, seeded defaults on failure). */
export function useBusinessHours(): BusinessHours {
  const content = useLandingContent();
  const d = content.data;
  return {
    openDays: d?.business_open_days ?? [true, true, true, true, true, true, false],
    openTime: d?.business_open_time || "08:00",
    closeTime: d?.business_close_time || "17:00",
    display: d?.business_hours || "Monday–Saturday, 8:00 AM – 5:00 PM",
    allowSunday: d?.allow_sunday_bookings ?? false,
  };
}

export function manilaToday(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function addDaysYmd(ymd: string, n: number): string {
  const d = new Date(`${ymd}T00:00:00`);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function toDate(ymd: string): Date | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return undefined;
  return new Date(`${ymd}T00:00:00`);
}

export function toYmd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Mon-index (0) → JS day (0=Sunday). */
export function closedJsWeekdays(openDays: boolean[]): number[] {
  const out: number[] = [];
  openDays.forEach((open, i) => {
    if (!open) out.push((i + 1) % 7);
  });
  return out;
}

/** Short names of closed days, e.g. ["Sun"]. Mon-indexed input. */
export function closedDayNames(openDays: boolean[]): string[] {
  return openDays.flatMap((open, i) => (open ? [] : [DAY_SHORT[i]]));
}

/** "Mon–Sat, 8:00 AM – 5:00 PM · Closed Sun" from live settings. */
export function hoursNote(display: string, openDays: boolean[]): string {
  const closed = closedDayNames(openDays);
  return closed.length === 0 ? display : `${display} · Closed ${closed.join(", ")}`;
}

/** Shared booking calendar: past dates, closed weekdays, and anything
 *  past +30 days are unpickable. Same shadcn Calendar chrome everywhere. */
export function BookingCalendar({
  value,
  onChange,
  minDate,
  maxDate,
  disableClosedDays = true,
  extraDisabled,
  showNote = true,
}: {
  value: string;
  onChange: (ymd: string) => void;
  minDate?: string;
  maxDate?: string;
  disableClosedDays?: boolean;
  extraDisabled?: Matcher[];
  showNote?: boolean;
}) {
  const hours = useBusinessHours();
  const min = minDate ?? manilaToday();
  const max = maxDate ?? addDaysYmd(min, 30);

  const disabled: Matcher[] = useMemo(
    () => [
      { before: toDate(min) as Date },
      { after: toDate(max) as Date },
      ...(disableClosedDays && hours.openDays.includes(false)
        ? [{ dayOfWeek: closedJsWeekdays(hours.openDays) }]
        : []),
      ...(extraDisabled ?? []),
    ],
    [min, max, disableClosedDays, hours.openDays, extraDisabled],
  );

  return (
    <div>
      <Calendar
        mode="single"
        selected={toDate(value)}
        disabled={disabled}
        startMonth={toDate(min)}
        endMonth={toDate(max)}
        onSelect={(d) => {
          if (d) onChange(toYmd(d));
        }}
      />
      {showNote && (
        <p className="mt-1.5 px-3 pb-4 text-xs text-gray-500">
          {hoursNote(hours.display, hours.openDays)}
        </p>
      )}
    </div>
  );
}
