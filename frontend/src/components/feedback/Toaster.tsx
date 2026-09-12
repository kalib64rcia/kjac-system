import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from "lucide-react";
import { useToastStore, type ToastKind } from "@/stores/toast.store";
import { cn } from "@/lib/utils";

const ICONS: Record<ToastKind, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: TriangleAlert,
  info: Info,
};

const BORDERS: Record<ToastKind, string> = {
  success: "border-l-success-500",
  error: "border-l-error-500",
  warning: "border-l-warning-500",
  info: "border-l-info-500",
};

/** Bottom-right toast stack (DESIGN.md §Toast Notifications). */
export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);
  return (
    <div
      className="fixed bottom-6 right-6 z-[9999] flex w-[calc(100%-3rem)] max-w-[400px] flex-col gap-3"
      aria-live="polite"
    >
      {toasts.map((t) => {
        const Icon = ICONS[t.kind];
        return (
          <div
            key={t.id}
            role="status"
            className={cn(
              "flex animate-toast-in items-start gap-3 rounded-lg border border-gray-200 border-l-4 bg-white p-4 shadow-md",
              BORDERS[t.kind],
            )}
          >
            <Icon size={20} className="mt-0.5 shrink-0 text-gray-500" aria-hidden="true" />
            <div className="flex-1">
              <p className="font-semibold text-gray-900">{t.title}</p>
              {t.message && <p className="text-sm text-gray-600">{t.message}</p>}
            </div>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss notification"
              className="flex min-h-[44px] min-w-[44px] shrink-0 cursor-pointer items-center justify-center rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
