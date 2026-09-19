import { useState } from "react";
import { CalendarDays } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { BookingCalendar } from "@/components/forms/BookingCalendar";
import type { Matcher } from "@/components/ui/calendar";

/** Centered "Pick a date" modal shared by every booking date picker.
 *  Same chrome as the Schedule board dialog. */
export function PickDateDialog({
  open,
  onClose,
  value,
  onChange,
  minDate,
  maxDate,
  extraDisabled,
  showNote = true,
}: {
  open: boolean;
  onClose: () => void;
  value: string;
  onChange: (ymd: string) => void;
  minDate?: string;
  maxDate?: string;
  extraDisabled?: Matcher[];
  showNote?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent onClose={onClose} aria-label="Pick a date" className="w-auto">
        <DialogHeader>
          <DialogTitle>Pick a date</DialogTitle>
        </DialogHeader>
        <BookingCalendar
          value={value}
          onChange={(ymd) => {
            onChange(ymd);
            onClose();
          }}
          minDate={minDate}
          maxDate={maxDate}
          extraDisabled={extraDisabled}
          showNote={showNote}
        />
      </DialogContent>
    </Dialog>
  );
}

/** Date field: current full-width box trigger + shared modal.
 *  Trigger visuals are unchanged (box, icon, placeholder/picked label). */
export function PickDateField({
  value,
  onChange,
  placeholder = "Click to select date",
  pickedLabel,
  minDate,
  maxDate,
  extraDisabled,
  showNote = true,
}: {
  value: string;
  onChange: (ymd: string) => void;
  placeholder?: string;
  pickedLabel?: (ymd: string) => React.ReactNode;
  minDate?: string;
  maxDate?: string;
  extraDisabled?: Matcher[];
  showNote?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        aria-label="Pick a date"
        className="mt-2 flex min-h-[44px] w-full cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-primary-300"
      >
        <CalendarDays size={18} className="shrink-0 text-gray-500" aria-hidden="true" />
        {value ? (pickedLabel ? pickedLabel(value) : <span>{value}</span>) : (<span>{placeholder}</span>)}
      </DialogTrigger>
      <DialogContent onClose={() => setOpen(false)} aria-label="Pick a date" className="w-auto">
        <DialogHeader>
          <DialogTitle>Pick a date</DialogTitle>
        </DialogHeader>
        <BookingCalendar
          value={value}
          onChange={(ymd) => {
            onChange(ymd);
            setOpen(false);
          }}
          minDate={minDate}
          maxDate={maxDate}
          extraDisabled={extraDisabled}
          showNote={showNote}
        />
      </DialogContent>
    </Dialog>
  );
}
