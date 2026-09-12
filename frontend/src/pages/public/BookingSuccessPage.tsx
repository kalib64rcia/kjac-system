import { Link, Navigate, useLocation } from "react-router-dom";
import { CheckCircle2, Copy } from "lucide-react";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/stores/toast.store";
import { useCountdown } from "@/hooks/useCountdown";
import { formatPeso } from "@/utils/format";

interface SuccessState {
  reference_id: string;
  expires_at: string | null;
  down_payment: number;
  email: string;
}

/** Post-booking success: ref once, countdown, next steps. */
export function BookingSuccessPage() {
  const location = useLocation();
  const state = location.state as SuccessState | null;
  const [copied, setCopied] = useState(false);
  const { label } = useCountdown(state?.expires_at ?? null);

  if (!state?.reference_id) {
    return <Navigate to="/book" replace />;
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(state.reference_id);
      setCopied(true);
      toast.success("Copied", "Reference ID copied to clipboard.");
    } catch {
      toast.error("Copy failed", "Please copy the reference ID manually.");
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <Card>
        <CardContent>
          <div className="flex flex-col items-center py-4 text-center">
            <CheckCircle2 size={48} className="text-success-500" aria-hidden="true" />
            <h1 className="mt-3 text-balance text-2xl font-bold text-gray-900">Booking Created Successfully!</h1>
            <p className="mt-2 text-gray-600">Your booking reference ID:</p>
            <div className="mt-2 flex items-center gap-2 rounded-lg bg-gray-50 px-4 py-3 ring-1 ring-gray-200">
              <span className="font-technical text-lg font-semibold tracking-wide text-gray-900">
                {state.reference_id}
              </span>
              <button
                type="button"
                onClick={() => void copy()}
                aria-label="Copy reference ID"
                className="flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-md text-primary-600 hover:bg-primary-50"
              >
                <Copy size={18} />
              </button>
            </div>
            {copied && <p className="mt-1 text-xs text-success-600">Copied!</p>}
            <p className="mt-3 text-sm font-semibold text-warning-700">
              ⚠ Save this ID — it is shown only once. You need it plus your email to track.
            </p>
            <p className="mt-2 text-sm text-gray-700">
              ⏰ Upload payment within <span className="font-technical font-semibold tabular-nums">{label}</span>
            </p>
            <div className="mt-4 w-full rounded-lg bg-gray-50 p-4 text-left text-sm text-gray-700">
              <p className="font-semibold text-gray-900">Next steps</p>
              <ol className="mt-1 list-decimal pl-5">
                <li>✓ Booking created</li>
                <li>Pay <span className="font-technical font-semibold">{formatPeso(state.down_payment)}</span> down payment via GCash</li>
                <li>Upload your GCash receipt below</li>
                <li>Wait for admin verification</li>
              </ol>
              <p className="mt-2">Confirmation details were sent to {state.email}.</p>
            </div>
            <div className="mt-6 flex w-full flex-col gap-2 sm:flex-row">
              <Link
                to={`/track?ref=${encodeURIComponent(state.reference_id)}&email=${encodeURIComponent(state.email)}`}
                className="inline-flex min-h-[52px] flex-1 items-center justify-center rounded-lg bg-primary-400 px-6 text-base font-semibold text-white hover:bg-primary-500"
              >
                Upload Payment Now
              </Link>
              <Link
                to="/"
                className="inline-flex min-h-[52px] items-center justify-center rounded-lg px-6 text-base font-semibold text-primary-600 hover:bg-primary-50"
              >
                Back to Home
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
