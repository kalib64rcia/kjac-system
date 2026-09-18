import { useEffect, useState, useCallback } from "react";
import { Download, Share2, X } from "lucide-react";
import { bookingApi } from "@/api/booking.api";

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

export interface ReceiptImageViewerProps {
  open: boolean;
  onClose: () => void;
  paymentUuid: string;
  referenceId: string;
  gcashRefId?: string | null;
}

export function ReceiptImageViewer({
  open,
  onClose,
  paymentUuid,
  referenceId,
  gcashRefId,
}: ReceiptImageViewerProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [mime, setMime] = useState("");
  const [broken, setBroken] = useState(false);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");

  // Load receipt from cache or API
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

  // Handle Escape key to close
  useEffect(() => {
    if (!open) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open, onClose]);

  // Prevent body scroll when viewer is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [open]);

  const previewable = mime === "" || (mime.startsWith("image/") && mime !== "image/heic");

  const handleDownload = useCallback(() => {
    if (url) {
      const a = document.createElement("a");
      a.href = url;
      a.download = `receipt-${referenceId}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  }, [url, referenceId]);

  const handlePrint = useCallback(() => {
    if (url && previewable) {
      const printWindow = window.open(url, "_blank");
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      }
    }
  }, [url, previewable]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop overlay */}
      <div
        role="presentation"
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px]"
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      {/* Full-screen viewer container */}
      <div className="fixed inset-0 z-50 flex flex-col overflow-hidden" role="dialog" aria-modal="true" aria-label="Receipt image viewer">
        {/* Fixed header */}
        <header className="flex h-16 shrink-0 items-center justify-between bg-black/40 backdrop-blur-[2px] px-4 sm:px-6">
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold text-white">
              Payment Receipt
            </h1>
            <p className="mt-0.5 truncate text-xs text-gray-400">
              <span className="font-technical">{referenceId}</span> {gcashRefId && `• ${gcashRefId}`}
            </p>
          </div>

          {/* Header buttons */}
          <div className="flex shrink-0 items-center gap-2 ml-4">
            {/* Download button */}
            <button
              type="button"
              onClick={handleDownload}
              disabled={!url || state !== "idle"}
              aria-label="Download receipt"
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-800 text-gray-300 transition-colors hover:bg-gray-700 hover:text-white hover:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download size={20} />
            </button>

            {/* Print/Share button */}
            <button
              type="button"
              onClick={handlePrint}
              disabled={!url || state !== "idle" || !previewable}
              aria-label="Print or share receipt"
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-800 text-gray-300 transition-colors hover:bg-gray-700 hover:text-white hover:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Share2 size={20} />
            </button>

            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close receipt viewer"
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-800 text-gray-300 transition-colors hover:bg-gray-700 hover:text-white hover:cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </header>

        {/* Content area - scrollable if needed */}
        <div
          className="flex min-h-0 flex-1 items-center justify-center bg-transparent px-2 py-1 sm:px-3 sm:py-2"
          onClick={handleBackdropClick}
          role="presentation"
        >
          {/* Loading state */}
          {state === "loading" && (
            <div aria-busy="true" aria-label="Loading receipt" className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-12 w-12 border-2 border-gray-600 border-t-white" />
              <p className="text-sm text-gray-400">Loading receipt…</p>
            </div>
          )}

          {/* Error state */}
          {state === "error" && (
            <div className="flex flex-col items-center gap-4 max-w-sm">
              <div className="rounded-full bg-red-500/10 p-3">
                <X size={32} className="text-red-500" />
              </div>
              <div className="text-center">
                <p role="alert" className="text-base font-medium text-white mb-2">
                  Could not load the receipt
                </p>
                <p className="text-sm text-gray-400 mb-4">
                  The file may be corrupted or unavailable. Try downloading again.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setState("idle")}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 text-white font-semibold text-sm hover:bg-primary-700 transition-colors"
              >
                Try again
              </button>
            </div>
          )}

          {/* Success state with image preview */}
          {state === "idle" && url && previewable && !broken && (
            <img
              src={url}
              alt={`Proof of payment receipt for booking ${referenceId}`}
              onError={() => setBroken(true)}
              className="max-h-[calc(100vh-80px)] max-w-full object-contain"
              style={{ aspectRatio: "9/16" }}
            />
          )}

          {/* Non-previewable file type */}
          {state === "idle" && url && (!previewable || broken) && (
            <div className="flex flex-col items-center gap-4 max-w-sm">
              <div className="rounded-full bg-gray-700 p-3">
                <X size={32} className="text-gray-500" />
              </div>
              <div className="text-center">
                <p className="text-base font-medium text-white mb-2">
                  Preview unavailable
                </p>
                <p className="text-sm text-gray-400 mb-4">
                  This file type cannot be displayed in the browser. Download to view it.
                </p>
              </div>
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 text-white font-semibold text-sm hover:bg-primary-700 transition-colors"
              >
                <Download size={16} />
                Download file
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

