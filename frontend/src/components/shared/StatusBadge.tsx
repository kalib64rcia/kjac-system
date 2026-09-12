import { Badge } from "@/components/ui/badge";
import type { BookingStatus } from "@/types/booking.types";

const TONES: Record<BookingStatus, "default" | "success" | "warning" | "destructive" | "secondary" | "info"> = {
  submitted: "warning",
  pending: "warning",
  confirmed: "success",
  ongoing: "default",
  completed: "success",
  cancelled: "destructive",
  expired: "secondary",
  rescheduled: "info",
};

const LABELS: Record<BookingStatus, string> = {
  submitted: "Submitted",
  pending: "Pending review",
  confirmed: "Confirmed",
  ongoing: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
  expired: "Expired",
  rescheduled: "Rescheduled",
};

/** Unified status display (COMPONENT_INVENTORY.md StatusBadge). */
export function StatusBadge({ status }: { status: BookingStatus }) {
  return <Badge variant={TONES[status] ?? "secondary"}>{LABELS[status] ?? status}</Badge>;
}
