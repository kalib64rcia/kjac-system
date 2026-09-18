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
        // Presentational caption: never intercepts nav-button clicks
        // (positioned sibling paints above otherwise). Re-enabled on the
        // month/year selects only.
        month_caption:
          "pointer-events-none relative flex h-11 items-center justify-center gap-1 [&_select]:pointer-events-auto",
        caption_label: "text-sm font-semibold text-gray-900",
        dropdowns: "flex items-center gap-1",
        months_dropdown:
          "min-h-[44px] cursor-pointer rounded-lg border border-gray-200 bg-white px-2 text-sm font-semibold text-gray-900 focus:border-primary-600 focus:outline-none",
        years_dropdown:
          "min-h-[44px] cursor-pointer rounded-lg border border-gray-200 bg-white px-2 text-sm font-semibold text-gray-900 focus:border-primary-600 focus:outline-none",
        nav: "flex items-center gap-1 absolute inset-x-0 justify-between px-1",
        button_previous:
          "flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent aria-disabled:opacity-40 aria-disabled:cursor-not-allowed active:scale-100",
        button_next:
          "flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent aria-disabled:opacity-40 aria-disabled:cursor-not-allowed active:scale-100",
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday: "w-11 py-2 text-xs font-semibold text-gray-500",
        week: "flex w-full",
        day: "relative p-0 text-center text-sm",
        day_button:
          "mx-auto flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg text-sm font-medium text-gray-900 transition-colors hover:bg-primary-50 hover:text-primary-700 disabled:cursor-not-allowed disabled:text-gray-300 disabled:hover:bg-transparent disabled:hover:text-gray-300 active:scale-100",
        outside: "text-gray-300",
      }}
      modifiersClassNames={{
        // v10 marks the grid cell (td), not the inner button — paint the
        // button from the cell. Same size, blue fill only.
        selected:
          "[&>button]:bg-primary-500 [&>button]:text-sm [&>button]:font-medium [&>button]:text-white [&>button:hover]:bg-primary-600 [&>button:hover]:text-white",
      }}
      {...props}
    />
  );
}
