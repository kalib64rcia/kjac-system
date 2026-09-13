import { AcceptFlow } from "@/components/forms/AcceptFlow";

/** Public technician invite landing: /technician/accept?token=…
 *  Registration lives on this web link (spam-proof); the future mobile app
 *  gets sign-in only. Same flow, same component as staff. */
export function TechAcceptPage() {
  return <AcceptFlow kind="tech" />;
}
