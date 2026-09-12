import { DayPicker, type Matcher } from "react-day-picker";
import "react-day-picker/style.css";
import { cn } from "@/lib/utils";

export type { Matcher };

/** Shadcn-pattern calendar (react-day-picker) with KJAC tokens. */
export function Calendar({
  className,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col gap-4",
        month: "flex flex-col gap-3",
        month_caption: "flex justify-center relative items-center h-11",
        caption_label: "text-sm font-semibold text-gray-900",
        nav: "flex items-center gap-1 absolute inset-x-0 justify-between px-1",
        button_previous:
          "flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 disabled:opacity-40",
        button_next:
          "flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 disabled:opacity-40",
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday: "w-11 py-2 text-xs font-semibold text-gray-500",
        week: "flex w-full",
        day: "relative p-0 text-center text-sm",
        day_button:
          "mx-auto flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg font-medium text-gray-900 transition-colors hover:bg-primary-50 hover:text-primary-700 disabled:cursor-not-allowed disabled:text-gray-300 disabled:hover:bg-transparent aria-selected:bg-primary-500 aria-selected:text-white aria-selected:hover:bg-primary-600",
        outside: "text-gray-300",
      }}
      {...props}
    />
  );
}
