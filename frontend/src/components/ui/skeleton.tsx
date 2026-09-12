import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn("animate-pulse rounded-md bg-gray-100", className)}
      {...props}
    />
  );
}

function CardSkeleton() {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="mt-3 h-4 w-full" />
      <Skeleton className="mt-2 h-4 w-5/6" />
    </div>
  );
}

function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 rounded-none border-b border-gray-100 last:border-0" />
      ))}
    </div>
  );
}

export { Skeleton, CardSkeleton, TableSkeleton };
