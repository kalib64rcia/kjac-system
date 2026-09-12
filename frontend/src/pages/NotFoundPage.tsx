import { Link } from "react-router-dom";
import { EmptyState } from "@/components/shared/EmptyState";

export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <EmptyState
        title="Page not found"
        description="The page you're looking for doesn't exist or was moved."
        actionLabel="Back to home"
        onAction={() => window.location.assign("/")}
      />
      <p className="mt-4 text-center text-sm text-gray-500">
        <Link to="/" className="font-semibold text-primary-600 hover:underline">
          Home
        </Link>
      </p>
    </div>
  );
}
