import { Badge } from "@/components/ui/badge";
import type { BookingStatus } from "@/types/booking.types";

const TONES: Record<
  BookingStatus,
  "default" | "success" | "warning" | "destructive" | "secondary" | "info" | "teal" | "slate"
> = {
  submitted: "warning", // Yellow/Gold
  proposed: "warning", // Orange (using warning tone)
  scheduled: "info", // Blue
  confirmed: "success", // Green
  assigned: "teal", // Teal/Cyan
  ongoing: "slate", // Violet/Purple (using slate for now, may need custom)
  completed: "secondary", // Gray
  cancelled: "destructive", // Red
  expired: "destructive", // Red
  rescheduled: "slate",
  alternative_proposed: "warning",
  awaiting_payment: "warning",
};

const LABELS: Record<BookingStatus, string> = {
  submitted: "Submitted",
  proposed: "Proposed Schedule",
  scheduled: "Awaiting Payment",
  confirmed: "Confirmed",
  assigned: "Assigned",
  ongoing: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
  expired: "Expired",
  rescheduled: "Rescheduled",
  alternative_proposed: "Alternative",
  awaiting_payment: "Awaiting Payment",
};

/** Unified status display (COMPONENT_INVENTORY.md StatusBadge). */
export function StatusBadge({ status }: { status: BookingStatus }) {
  return <Badge variant={TONES[status] ?? "secondary"}>{LABELS[status] ?? status}</Badge>;
}
