import { useMemo, useState } from "react";
import { CalendarDays } from "lucide-react";
import { Calendar, type Matcher } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FieldError, Label } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const TIME_SLOTS = [
  "08:00", "09:00", "10:00", "11:00", "12:00",
  "13:00", "14:00", "15:00", "16:00",
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

/**
 * Schedule picker enforcing locked rules: same-day only before 12 PM Manila,
 * Sunday blocked unless the setting allows, max 30 days out, 8 AM–4 PM slots.
 */
export function SchedulePicker({
  date,
  time,
  allowSunday,
  onChange,
  errors,
}: {
  date: string;
  time: string;
  allowSunday: boolean;
  onChange: (patch: { preferred_date?: string; preferred_time?: string }) => void;
  errors: { preferred_date?: string; preferred_time?: string };
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
    if (date < minDate) return "That date has passed — pick another day.";
    if (date > maxDate) return "Bookings open at most 30 days ahead.";
    const wd = new Date(`${date}T00:00:00`).getDay();
    if (wd === 0 && !allowSunday) return "We're closed on Sundays — pick another day.";
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, allowSunday]);

  const selected = toDate(date);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <Label id="pref-date-label">Preferred date *</Label>
        <Popover open={calOpen} onOpenChange={setCalOpen}>
          <PopoverTrigger
            aria-labelledby="pref-date-label"
            aria-invalid={!!(errors.preferred_date || dateError)}
            className={cn(
              "flex min-h-[44px] w-full cursor-pointer items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-base text-gray-900 transition-colors hover:border-gray-300 focus:border-primary-600 focus:outline-none aria-[invalid=true]:border-error-500",
              !selected && "text-gray-400",
            )}
          >
            <span>{selected ? selected.toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" }) : "Pick a date"}</span>
            <CalendarDays size={18} className="shrink-0 text-gray-500" aria-hidden="true" />
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selected}
              disabled={disabled}
              onSelect={(d) => {
                if (d) {
                  onChange({ preferred_date: toYmd(d) });
                  setCalOpen(false);
                }
              }}
            />
          </PopoverContent>
        </Popover>
        <FieldError message={errors.preferred_date ?? dateError} />
        {!allowSunday && (
          <p className="mt-1.5 text-xs text-gray-500">Closed on Sundays.</p>
        )}
      </div>
      <div>
        <Label id="slot-label">Preferred time *</Label>
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-labelledby="slot-label">
          {TIME_SLOTS.map((slot) => (
            <button
              key={slot}
              type="button"
              role="radio"
              aria-checked={time === slot}
              onClick={() => onChange({ preferred_time: slot })}
              className={cn(
                "min-h-[44px] cursor-pointer rounded-lg border px-2 font-technical text-sm font-medium transition-colors",
                time === slot
                  ? "border-primary-600 bg-primary-50 text-primary-700"
                  : "border-gray-200 bg-white text-gray-700 hover:border-primary-300",
              )}
            >
              {slot}
            </button>
          ))}
        </div>
        <FieldError message={errors.preferred_time} />
      </div>
    </div>
  );
}
