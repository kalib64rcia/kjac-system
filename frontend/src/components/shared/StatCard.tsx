import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Icon-tile tints — meaning-locked pairs (sky = info, warning = attention,
 *  slate = scheduled, teal = live, success = healthy, destructive = failure).
 *  Stat slots use sky→warning→teal→success in that order; destructive is for
 *  badges and banners, never a stat slot. */
const TINTS = {
  primary: "bg-primary-50 text-primary-600",
  sky: "bg-primary-50 text-primary-700",
  warning: "bg-warning-500/10 text-warning-700",
  // Slate wash = slate-100 darkened exactly 0.3% (#F0F4F8). Glyph unchanged.
  slate: "bg-[#F0F4F8] text-slate-700",
  teal: "bg-teal-500/10 text-teal-700",
  success: "bg-success-100 text-success-700",
  destructive: "bg-error-50 text-error-700",
} as const;

interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  hint?: string;
  tint?: keyof typeof TINTS;
  /** First load: value line shimmers instead of a 0/— placeholder. */
  loading?: boolean;
}

/** 4-up KPI grid. One shared wrapper — never hand-roll the stat grid per page. */
export function StatsGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {children}
    </div>
  );
}
/** Dashboard metric card — the only KPI card (no per-domain duplicates). */
export function StatCard({ title, value, icon: Icon, hint, tint = "primary", loading = false }: StatCardProps) {
  return (
    <Card>
      <CardContent>
        {loading ? (
          <div aria-busy="true" aria-label={`Loading ${title}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="mt-2 h-8 w-24" />
                <Skeleton className="mt-2 h-3 w-2/3" />
              </div>
              <span aria-hidden="true" className="size-10 shrink-0 animate-pulse rounded-lg bg-gray-100" />
            </div>
          </div>
        ) : (
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
        )}
      </CardContent>
    </Card>
  );
}
