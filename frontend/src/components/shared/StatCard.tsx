import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** Icon-tile tints — existing pairs only (blue = info, amber = waiting, green = live). */
const TINTS = {
  primary: "bg-primary-50 text-primary-600",
  sky: "bg-primary-50 text-primary-700",
  warning: "bg-warning-500/10 text-warning-700",
  // Slate wash = slate-100 darkened exactly 0.3% (#F0F4F8). Glyph unchanged.
  slate: "bg-[#F0F4F8] text-slate-700",
  teal: "bg-teal-500/10 text-teal-700",
  success: "bg-success-100 text-success-700",
} as const;

interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  hint?: string;
  tint?: keyof typeof TINTS;
}

/** Dashboard metric card — the only KPI card (no per-domain duplicates). */
export function StatCard({ title, value, icon: Icon, hint, tint = "primary" }: StatCardProps) {
  return (
    <Card>
      <CardContent>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-700">{title}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-gray-900">
              {value}
            </p>
            {hint && <p className="mt-1 text-xs text-gray-600">{hint}</p>}
          </div>
          <span
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
              TINTS[tint],
            )}
          >
            <Icon size={20} aria-hidden="true" />
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
