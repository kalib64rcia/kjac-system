import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";

interface PageHeaderProps {
  title: string;
  description?: string;
  actionLabel?: string;
  actionTo?: string;
}

/** Consistent page header with optional primary action. */
export function PageHeader({ title, description, actionLabel, actionTo }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-balance text-2xl font-bold text-gray-900 sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-gray-600">{description}</p>}
      </div>
      {actionLabel && actionTo && (
        <Link
          to={actionTo}
          className="inline-flex min-h-[44px] cursor-pointer items-center rounded-lg bg-primary-400 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}

export function ErrorCard({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Card>
      <CardContent>
        <div role="alert" className="flex flex-col items-center py-10 text-center">
          <h3 className="text-base font-semibold text-gray-900">Something went wrong</h3>
          <p className="mt-1 max-w-sm text-sm text-gray-600">{message}</p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-4 inline-flex min-h-[44px] cursor-pointer items-center rounded-lg border border-primary-600 px-4 py-2 text-sm font-semibold text-primary-600 hover:bg-primary-50"
            >
              Try again
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
