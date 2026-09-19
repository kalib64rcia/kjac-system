import { useMemo } from "react";
import { Label, Select } from "@/components/ui/input";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const DAY_FULL = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;

const TIMES: string[] = [];
for (let h = 0; h < 24; h++) {
  for (const m of [0, 30]) {
    TIMES.push(`${String(h).padStart(2, "0")}:${m === 0 ? "00" : "30"}`);
  }
}

export function parseDays(raw: string): boolean[] {
  try {
    const v: unknown = JSON.parse(raw);
    if (Array.isArray(v)) return v.slice(0, 7).map((d) => d === 1 || d === true);
  } catch { /* fall through to default */ }
  return [true, true, true, true, true, true, false];
}

export function serializeDays(days: boolean[]): string {
  return JSON.stringify(days.map((d) => (d ? 1 : 0)));
}

function fmtTime(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const ampm = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

/** "Monday–Saturday, 8:00 AM – 5:00 PM" from structured values. */
export function composeHoursPreview(days: boolean[], open: string, close: string): string {
  const on = days.map((d, i) => (d ? i : -1)).filter((i) => i >= 0);
  if (on.length === 0) return "Closed";
  if (on.length === 7) return `Daily, ${fmtTime(open)} – ${fmtTime(close)}`;
  const contiguous =
    on.length > 1 && on.every((v, i) => i === 0 || v === on[i - 1] + 1);
  const dayPart = contiguous
    ? `${DAY_FULL[on[0]]}–${DAY_FULL[on[on.length - 1]]}`
    : on.map((i) => DAYS[i]).join(", ");
  return `${dayPart}, ${fmtTime(open)} – ${fmtTime(close)}`;
}

/** Structured Mon–Sun + open/close editor. Writes 3 DB keys; the page
 *  also PATCHes the legacy business_hours display string on save. */
export function BusinessHoursField({
  daysValue,
  openValue,
  closeValue,
  onChange,
  disabled = false,
}: {
  daysValue: string;
  openValue: string;
  closeValue: string;
  onChange: (patch: { days?: string; open?: string; close?: string }) => void;
  disabled?: boolean;
}) {
  const days = useMemo(() => parseDays(daysValue), [daysValue]);
  const preview = useMemo(
    () => composeHoursPreview(days, openValue || "08:00", closeValue || "17:00"),
    [days, openValue, closeValue],
  );

  const toggleDay = (i: number) => {
    const next = [...days];
    next[i] = !next[i];
    onChange({ days: serializeDays(next) });
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Label id="hours-days">Days open</Label>
        <div className="mt-1.5 flex flex-wrap gap-2" role="group" aria-labelledby="hours-days">
          {DAYS.map((d, i) => (
            <button
              key={d}
              type="button"
              onClick={() => toggleDay(i)}
              disabled={disabled}
              aria-pressed={days[i]}
              className={
                days[i]
                  ? "inline-flex min-h-[44px] min-w-[52px] cursor-pointer items-center justify-center rounded-lg bg-primary-600 px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                  : "inline-flex min-h-[44px] min-w-[52px] cursor-pointer items-center justify-center rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 hover:border-gray-300 disabled:cursor-not-allowed disabled:opacity-50"
              }
            >
              {d}
            </button>
          ))}
        </div>
        <p className="mt-1 text-xs text-gray-600">Days and hours your shop accepts bookings.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="hours-open">Opens</Label>
          <Select
            id="hours-open"
            value={openValue || "08:00"}
            onChange={(e) => onChange({ open: e.target.value })}
            disabled={disabled}
          >
            {TIMES.map((t) => (
              <option key={t} value={t}>{fmtTime(t)}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="hours-close">Closes</Label>
          <Select
            id="hours-close"
            value={closeValue || "17:00"}
            onChange={(e) => onChange({ close: e.target.value })}
            disabled={disabled}
          >
            {TIMES.map((t) => (
              <option key={t} value={t}>{fmtTime(t)}</option>
            ))}
          </Select>
        </div>
      </div>
      <p className="text-sm text-gray-700" aria-live="polite">{preview}</p>
    </div>
  );
}
