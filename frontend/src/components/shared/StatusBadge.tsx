import { Badge } from "@/components/ui/badge";
import type { BookingStatus } from "@/types/booking.types";

const TONES: Record<
  BookingStatus,
  "default" | "success" | "warning" | "destructive" | "secondary" | "info" | "teal" | "slate"
> = {
  submitted: "slate",
  proposed: "warning",
  scheduled: "info",
  confirmed: "success",
  assigned: "teal",
  ongoing: "default",
  completed: "secondary",
  cancelled: "destructive",
  expired: "secondary",
  rescheduled: "secondary",
  alternative_proposed: "warning",
  awaiting_payment: "slate",
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
  awaiting_payment: "Awaiting Payment legacy",
};

/** Unified status display (COMPONENT_INVENTORY.md StatusBadge). */
export function StatusBadge({ status }: { status: BookingStatus }) {
  return <Badge variant={TONES[status] ?? "secondary"}>{LABELS[status] ?? status}</Badge>;
}
