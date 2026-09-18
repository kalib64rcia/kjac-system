import { useMemo, useState } from "react";
import { CalendarDays } from "lucide-react";
import { Calendar, type Matcher } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FieldError, Label } from "@/components/ui/input";

export const TIME_SLOTS = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00",
  "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00",
];



function manilaParts(now = new Date()): { ymd: string; hour: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return { ymd: `${get("year")}-${get("month")}-${get("day")}`, hour: Number(get("hour")) };
}

function addDays(ymd: string, days: number): string {
  const d = new Date(`${ymd}T00:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function toDate(ymd: string): Date | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return undefined;
  return new Date(`${ymd}T00:00:00`);
}

function toYmd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function weekdayShort(ymd: string): string {
  return ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][
    new Date(`${ymd}T00:00:00`).getDay()
  ] as string;
}

function monthDay(ymd: string): string {
  return new Date(`${ymd}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/** Day badge from its slots: closed beats full, full beats filling. */
export function dayBadge(states: string[]): string {
  if (states.length > 0 && states.every((s) => s === "closed")) return "Closed";
  if (states.length > 0 && states.every((s) => s === "closed" || s === "full")) return "Full";
  if (states.includes("low")) return "Filling";
  return "Open";
}

/**
 * Simple date picker for booking: customers select a date only.
 * Admin will assign the exact time later and email the customer.
 */
export function SchedulePicker({
  date,
  allowSunday,
  onChange,
  errors,
}: {
  date: string;
  allowSunday: boolean;
  onChange: (patch: { preferred_date?: string }) => void;
  errors: { preferred_date?: string };
}) {
  const [calOpen, setCalOpen] = useState(false);
  const manila = useMemo(() => manilaParts(), []);
  const minDate = manila.hour < 12 ? manila.ymd : addDays(manila.ymd, 1);
  const maxDate = addDays(manila.ymd, 30);

  const disabled: Matcher[] = useMemo(
    () => [
      { before: toDate(minDate) as Date },
      { after: toDate(maxDate) as Date },
      ...(allowSunday ? [] : [{ dayOfWeek: [0] }]),
    ],
    [minDate, maxDate, allowSunday],
  );

  const dateError = useMemo(() => {
    if (!date) return undefined;
    if (date < minDate) return "That date has passed. Pick another day.";
    if (date > maxDate) return "Bookings open at most 30 days ahead.";
    const wd = new Date(`${date}T00:00:00`).getDay();
    if (wd === 0 && !allowSunday) return "We are closed on Sundays. Pick another day.";
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, allowSunday]);

  const selected = toDate(date);

  const pickDate = (ymd: string) => {
    onChange({ preferred_date: ymd });
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Label id="slot-label">Preferred date *</Label>
        <Popover open={calOpen} onOpenChange={setCalOpen}>
          <PopoverTrigger
            aria-label="Pick a date"
            className="mt-2 flex w-full min-h-[44px] cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-primary-300"
          >
            <CalendarDays size={18} className="shrink-0 text-gray-500" aria-hidden="true" />
            {date ? (
              <span>{weekdayShort(date)}, {monthDay(date)}</span>
            ) : (
              <span>Click to select date</span>
            )}
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selected}
              disabled={disabled}
              captionLayout="label"
              startMonth={toDate(minDate)}
              endMonth={toDate(maxDate)}
              onSelect={(d) => {
                if (d) {
                  pickDate(toYmd(d));
                  setCalOpen(false);
                }
              }}
            />
          </PopoverContent>
        </Popover>
        <FieldError message={errors.preferred_date ?? dateError} />
        {!allowSunday && (
          <p className="mt-1.5 text-xs text-gray-500">Mon-Sat &bull; 8am-5pm. Closed on Sundays.</p>
        )}
        <p className="mt-3 text-sm text-gray-600">
          We will email your confirmed schedule. Exact service times may vary depending on the service type and daily workload.
        </p>
      </div>
    </div>
  );
}
