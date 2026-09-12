import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

/** Reusable empty state (icon + title + description + action). */
export function EmptyState({ icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <Card>
      <CardContent>
        <div role="status" className="flex flex-col items-center py-10 text-center">
          {icon && <div className="mb-3 text-gray-400" aria-hidden="true">{icon}</div>}
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          {description && <p className="mt-1 max-w-sm text-sm text-gray-600">{description}</p>}
          {actionLabel && onAction && (
            <Button variant="outline" size="sm" className="mt-4" onClick={onAction}>
              {actionLabel}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
