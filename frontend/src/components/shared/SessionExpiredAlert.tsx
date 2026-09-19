/** Alert shown on login page when session expires. */
import { TriangleAlert } from "lucide-react";

export function SessionExpiredAlert() {
  return (
    <div className="rounded-lg border border-warning-200 bg-warning-50 p-4">
      <div className="flex gap-3">
        <div className="flex-shrink-0 text-warning-600">
          <TriangleAlert size={20} aria-hidden="true" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-warning-900">Session Expired</h3>
          <p className="mt-1 text-sm text-warning-800">
            Your login session has expired. Please log in again to continue.
          </p>
        </div>
      </div>
    </div>
  );
}
