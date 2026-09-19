import { useMemo } from "react";
import { FieldError, Label } from "@/components/ui/input";
import { PickDateField } from "@/components/forms/PickDate";
import { addDaysYmd, manilaToday, useBusinessHours } from "@/components/forms/BookingCalendar";

export const TIME_SLOTS = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00",
  "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00",
];

/**
 * Date picker for booking: customers select a date only.
 * Closed weekdays come from Settings → Business Hours; Sundays additionally
 * require the booking toggle. Admin will assign the exact time later and
 * email the customer.
 */

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

export function SchedulePicker({
  date,
  allowSunday,
  onChange,
  errors,
  showScheduleNote = true,
}: {
  date: string;
  allowSunday: boolean;
  onChange: (patch: { preferred_date?: string }) => void;
  errors: { preferred_date?: string };
  /** Customer-facing reassurance line. Hidden on admin surfaces. */
  showScheduleNote?: boolean;
}) {
  const hours = useBusinessHours();
  const manila = useMemo(() => {
    const hour = Number(
      new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", hour: "2-digit", hourCycle: "h23" }).format(new Date()),
    );
    return { ymd: manilaToday(), hour };
  }, []);
  const minDate = manila.hour < 12 ? manila.ymd : addDaysYmd(manila.ymd, 1);
  const maxDate = addDaysYmd(manila.ymd, 30);
  const sundayClosed = !allowSunday || !hours.openDays[6];

  const dateError = useMemo(() => {
    if (!date) return undefined;
    if (date < minDate) return "That date has passed. Pick another day.";
    if (date > maxDate) return "Bookings open at most 30 days ahead.";
    const wd = new Date(`${date}T00:00:00`).getDay();
    if (wd === 0 && sundayClosed) return "We are closed on Sundays. Pick another day.";
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, allowSunday]);

  const pickDate = (ymd: string) => {
    onChange({ preferred_date: ymd });
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Label id="slot-label">Preferred date *</Label>
        <PickDateField
          value={date}
          onChange={pickDate}
          placeholder="Click to select date"
          pickedLabel={(ymd) => (<span>{weekdayShort(ymd)}, {monthDay(ymd)}</span>)}
          minDate={minDate}
          maxDate={maxDate}
          extraDisabled={allowSunday ? undefined : [{ dayOfWeek: [0] }]}
        />
        <FieldError message={errors.preferred_date ?? dateError} />
        {showScheduleNote && (
          <p className="mt-3 text-sm text-gray-600">
            We will email your confirmed schedule. Exact service times may vary depending on the service type and daily workload.
          </p>
        )}
      </div>
    </div>
  );
}
