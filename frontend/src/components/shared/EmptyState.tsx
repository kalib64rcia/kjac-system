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

/** Filtered-list empty state: "no match, clear filters" vs "nothing yet"
 *  with the page's own create action. One shared ternary — never hand-roll
 *  the filtersActive switch per page. */
export function FilteredEmptyState({ icon, filtersActive, onClearFilters, filteredTitle, filteredDescription, emptyTitle, emptyDescription, actionLabel, onAction }: {
  icon?: React.ReactNode;
  filtersActive: boolean;
  onClearFilters: () => void;
  filteredTitle: string;
  filteredDescription: string;
  emptyTitle: string;
  emptyDescription: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <EmptyState
      icon={icon}
      title={filtersActive ? filteredTitle : emptyTitle}
      description={filtersActive ? filteredDescription : emptyDescription}
      actionLabel={filtersActive ? "Clear filters" : actionLabel}
      onAction={filtersActive ? onClearFilters : onAction}
    />
  );
}
