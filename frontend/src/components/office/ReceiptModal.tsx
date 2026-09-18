import { useEffect, useState } from "react";
import { X, Download } from "lucide-react";
import { bookingApi } from "@/api/booking.api";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/** Session receipt cache: one download per receipt, shared by queue + drawer.
 *  Memory only (never persisted), bounded with oldest-out eviction. */
const receiptCache = new Map<string, { url: string; type: string }>();
const RECEIPT_CACHE_CAP = 30;

async function cachedReceipt(paymentUuid: string): Promise<{ url: string; type: string }> {
  const hit = receiptCache.get(paymentUuid);
  if (hit) return hit;
  const blob = await bookingApi.receiptBlob(paymentUuid);
  const entry = { url: URL.createObjectURL(blob), type: blob.type };
  if (receiptCache.size >= RECEIPT_CACHE_CAP) {
    const oldest = receiptCache.keys().next();
    if (!oldest.done) {
      const evicted = receiptCache.get(oldest.value);
      if (evicted) URL.revokeObjectURL(evicted.url);
      receiptCache.delete(oldest.value);
    }
  }
  receiptCache.set(paymentUuid, entry);
  return entry;
}

interface ReceiptModalProps {
  open: boolean;
  onClose: () => void;
  paymentUuid: string;
  referenceId: string;
  gcashRefId: string;
}

export function ReceiptModal({
  open,
  onClose,
  paymentUuid,
  referenceId,
  gcashRefId,
}: ReceiptModalProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [mime, setMime] = useState("");
  const [broken, setBroken] = useState(false);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setState("loading");
    cachedReceipt(paymentUuid).then(
      (entry) => {
        if (!alive) return;
        setUrl(entry.url);
        setMime(entry.type);
        setState("idle");
      },
      () => {
        if (alive) setState("error");
      },
    );
    return () => {
      alive = false;
    };
  }, [open, paymentUuid]);

  const previewable = mime === "" || (mime.startsWith("image/") && mime !== "image/heic");

  const handleDownload = () => {
    if (url) {
      const a = document.createElement("a");
      a.href = url;
      a.download = `receipt-${referenceId}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent onClose={onClose} className="max-w-sm">
        <DialogHeader className="relative border-b border-gray-200 pb-4">
          <div className="absolute right-3 top-3">
            <button
              type="button"
              onClick={onClose}
              aria-label="Close receipt"
              className="flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          <DialogTitle className="text-left">Receipt</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 max-h-[80vh] overflow-y-auto">
          {/* Labels and Reference Information - Responsive Stacking */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 rounded-lg p-3">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Reference Code
              </p>
              <p className="mt-1 font-technical text-xs font-semibold text-gray-900">
                {referenceId}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                GCash Reference ID
              </p>
              <p className="mt-1 font-technical text-xs font-semibold text-gray-900">
                {gcashRefId}
              </p>
            </div>
          </div>

          {/* Receipt Image Container - Portrait Aspect Ratio */}
          <div className="flex items-center justify-center rounded-lg border border-gray-200 bg-gray-50 aspect-[9/16] overflow-auto">
            {state === "loading" && (
              <div aria-busy="true" aria-label="Loading receipt" className="animate-pulse">
                <div className="h-96 w-72 bg-gray-200 rounded-lg" />
              </div>
            )}

            {state === "error" && (
              <div className="text-center p-4">
                <p role="alert" className="text-xs font-medium text-error-600 mb-2">
                  Could not load the receipt.
                </p>
                <button
                  type="button"
                  onClick={() => setState("idle")}
                  className="text-xs font-semibold text-primary-600 hover:underline"
                >
                  Try again.
                </button>
              </div>
            )}

            {state === "idle" && url && previewable && !broken && (
              <img
                src={url}
                alt={`GCash receipt for ${referenceId}`}
                onError={() => setBroken(true)}
                className="max-w-full max-h-full object-contain"
              />
            )}

            {state === "idle" && url && (!previewable || broken) && (
              <div className="text-center p-3">
                <p className="text-xs text-gray-600 mb-3">
                  Preview unavailable for this file type.
                </p>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-primary-600 text-white font-semibold text-xs hover:bg-primary-700 transition-colors"
                >
                  <Download size={14} />
                  Download
                </button>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex gap-2 justify-end border-t border-gray-200 pt-3">
          <Button
            variant="outline"
            onClick={onClose}
            size="sm"
            className="border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900"
          >
            <X size={16} />
            Close
          </Button>
          <Button
            onClick={handleDownload}
            disabled={!url || state !== "idle"}
            size="sm"
            className="gap-2"
          >
            <Download size={16} />
            Download
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
