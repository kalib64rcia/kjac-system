import { Badge, badgeVariants } from "@/components/ui/badge";
import { prettyEnum } from "@/utils/format";

export type BadgeTone = NonNullable<Parameters<typeof badgeVariants>[0]>["variant"];

/** Map-driven status badge. Domain tone maps stay per page; the Badge
 *  JSX + label formatting live here exactly once. Pass `label` only when
 *  the page shows intentionally unformatted text. */
export function ToneBadge<T extends string>({ map, value, fallback = "secondary", label }: {
  map: Partial<Record<T, BadgeTone>>;
  value: T;
  fallback?: BadgeTone;
  label?: React.ReactNode;
}) {
  return <Badge variant={map[value] ?? fallback}>{label ?? prettyEnum(value)}</Badge>;
}
