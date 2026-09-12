import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  hint?: string;
}

/** Dashboard metric card — the only KPI card (no per-domain duplicates). */
export function StatCard({ title, value, icon: Icon, hint }: StatCardProps) {
  return (
    <Card>
      <CardContent>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="font-technical mt-1 text-2xl font-semibold text-gray-900">
              {value}
            </p>
            {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
          </div>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
            <Icon size={20} aria-hidden="true" />
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
