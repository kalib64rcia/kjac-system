import { AcceptFlow } from "@/components/forms/AcceptFlow";

/** Public staff invite landing: /staff/accept?token=… */
export function StaffAcceptPage() {
  return <AcceptFlow kind="staff" />;
}
