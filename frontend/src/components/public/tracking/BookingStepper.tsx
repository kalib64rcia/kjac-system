import { Check } from "lucide-react";
import type { BookingStatus } from "@/types/booking.types";
import { cn } from "@/lib/utils";

const STEPS = ["submitted", "proposed", "scheduled", "confirmed", "assigned", "ongoing", "completed"] as const;
const LABELS: Record<string, string> = {
  submitted: "Submitted",
  proposed: "Proposed Schedule",
  scheduled: "Awaiting Payment",
  confirmed: "Confirmed",
  assigned: "Assigned",
  ongoing: "In Progress",
  completed: "Completed",
};

/** Status stepper (timeline-driven, terminal states shown by parent). */
export function BookingStepper({ status }: { status: BookingStatus }) {
  const current = STEPS.indexOf(status as (typeof STEPS)[number]);
  return (
    <ol className="flex flex-col gap-0" aria-label="Booking progress">
      {STEPS.map((step, i) => {
        const done = current >= 0 && i < current;
        const active = i === current;
        return (
          <li key={step} className="flex gap-3">
            <div className="flex flex-col items-center" aria-hidden="true">
              <span
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold",
                  done || active ? "bg-success-500 text-white" : "bg-gray-200 text-gray-500",
                )}
              >
                {done ? <Check size={14} /> : i + 1}
              </span>
              {i < STEPS.length - 1 && <span className="w-0.5 flex-1 bg-gray-200" />}
            </div>
            <div className="pb-5">
              <p className={cn("text-sm font-semibold", active ? "text-gray-900" : done ? "text-gray-700" : "text-gray-400")}>
                {LABELS[step]}
                {active && <span className="ml-2 text-xs font-medium text-primary-600">(current)</span>}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
