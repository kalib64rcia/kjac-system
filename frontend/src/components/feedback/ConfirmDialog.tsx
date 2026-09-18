import { useState } from "react";
import { CheckCircle2, Loader2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FieldError, Label } from "@/components/ui/input";

export interface ConfirmSpec {
  title: string;
  body: React.ReactNode;
  confirmLabel: string;
  destructive?: boolean;
  /** Optional event icon (existing Lucide icon + existing text token only).
   *  Defaults: destructive → red alert triangle, otherwise green check. */
  icon?: React.ReactNode;
  requireReason?: string;
  onConfirm: (reason: string) => Promise<unknown> | unknown;
}

/** Destructive/important action gate: who, what, consequence, explicit
 *  confirm. Deny-style actions can demand a typed reason (backend enforces).
 *
 *  Layout (locked): icon box top-left (X comes from DialogContent top-right),
 *  bold title, gray message, then Cancel (neutral bordered, existing gray
 *  tokens) + action (existing `destructive` red / `default` blue only).
 *  Desktop: equal halves. Mobile: stacked, action on top. */
export function ConfirmDialog({
  spec,
  onClose,
}: {
  spec: ConfirmSpec | null;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!spec) return null;
  const reasonNeeded = !!spec.requireReason && reason.trim().length < 5;

  const confirm = async () => {
    if (reasonNeeded) {
      setError(`${spec.requireReason} (min 5 characters).`);
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await spec.onConfirm(reason.trim());
      setReason("");
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  };

  const fallbackIcon = spec.destructive ? (
    <TriangleAlert size={20} aria-hidden="true" className="shrink-0 text-error-500" />
  ) : (
    <CheckCircle2 size={20} aria-hidden="true" className="shrink-0 text-success-500" />
  );

  return (
    <Dialog open onOpenChange={(open) => { if (!open) { setReason(""); setError(null); onClose(); } }}>
      <DialogContent onClose={onClose} aria-label={spec.title}>
        <DialogHeader>
          <div className="flex items-start">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white">
              {spec.icon ?? fallbackIcon}
            </span>
          </div>
          <DialogTitle className="pt-2">{spec.title}</DialogTitle>
          <DialogDescription asChild>
            <div className="text-sm leading-relaxed text-gray-600">{spec.body}</div>
          </DialogDescription>
        </DialogHeader>
        {spec.requireReason && (
          <div>
            <Label htmlFor="confirm-reason">{spec.requireReason} *</Label>
            <textarea
              id="confirm-reason"
              rows={3}
              maxLength={1000}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Type the reason here…"
              aria-invalid={!!error}
              className="flex min-h-[88px] w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-base text-gray-900 transition-colors placeholder:text-gray-400 hover:border-gray-300 focus:border-primary-600 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-50 aria-[invalid=true]:border-error-500"
            />
            <FieldError message={error ?? undefined} />
          </div>
        )}
        {!spec.requireReason && error && (
          <p role="alert" className="text-sm font-medium text-error-600">{error}</p>
        )}
        <DialogFooter className="flex-col-reverse gap-3 sm:grid sm:grid-cols-2">
          <Button
            variant="outline"
            className="w-full border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900"
            onClick={() => {
              setReason("");
              setError(null);
              onClose();
            }}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button
            variant={spec.destructive ? "destructive" : "default"}
            className="w-full"
            onClick={() => void confirm()}
            disabled={busy}
          >
            {busy && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
            {spec.confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
