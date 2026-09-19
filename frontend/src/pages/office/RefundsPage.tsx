import { useState } from "react";
import { useLocation } from "react-router-dom";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, ReceiptText, Wallet } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorCard } from "@/components/shared/PageHeader";
import { PillTabs } from "@/components/shared/FilterPopover";
import { ToneBadge } from "@/components/shared/ToneBadge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, type ConfirmSpec } from "@/components/feedback/ConfirmDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CardSkeleton } from "@/components/ui/skeleton";
import { FieldError, Input, Label } from "@/components/ui/input";
import { FileUploader } from "@/components/forms/FileUploader";
import { useRefundMutation, useRefunds } from "@/hooks/useOffice";
import { useAuthStore } from "@/stores/auth.store";
import { toast } from "@/stores/toast.store";
import { formatPeso } from "@/utils/format";
import type { Refund } from "@/api/office.api";

const proposeSchema = z.object({
  booking_id: z.coerce.number().int().positive("Booking ID is required"),
  payment_id: z.coerce.number().int().positive("Payment ID is required"),
  refund_amount: z.coerce.number().positive("Amount must be positive"),
  reason: z.string().trim().min(5, "Give a reason (min 5 characters)").max(1000),
});

type ProposeValues = z.infer<typeof proposeSchema>;

function ProposeForm() {
  const propose = useRefundMutation().propose;
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();
  const prefill = (location.state ?? {}) as {
    booking_id?: number; payment_id?: number; refund_amount?: number;
  };
  const { register, handleSubmit, reset, formState } = useForm<ProposeValues>({
    resolver: zodResolver(proposeSchema) as unknown as Resolver<ProposeValues>,
    mode: "onSubmit",
    defaultValues: {
      booking_id: prefill.booking_id ?? undefined,
      payment_id: prefill.payment_id ?? undefined,
      refund_amount: prefill.refund_amount ?? undefined,
      reason: "",
    },
  });
  const submit = handleSubmit(async (v) => {
    setError(null);
    try {
      await propose.mutateAsync(v);
      toast.success("Refund proposed", "The owner has been notified.");
      reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not propose refund.");
    }
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle>Propose a refund</CardTitle>
        {prefill.booking_id != null && (
          <p className="text-sm text-gray-600">
            Prefilled from booking #{prefill.booking_id}. Adjust amount for partial refunds.
          </p>
        )}
      </CardHeader>
      <CardContent>
        <form onSubmit={(e) => void submit(e)} noValidate className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="rf-booking">Booking ID *</Label>
            <Input id="rf-booking" inputMode="numeric" placeholder="123"
              aria-invalid={!!formState.errors.booking_id} {...register("booking_id")} />
            <FieldError message={formState.errors.booking_id?.message} />
          </div>
          <div>
            <Label htmlFor="rf-payment">Payment ID *</Label>
            <Input id="rf-payment" inputMode="numeric" placeholder="456"
              aria-invalid={!!formState.errors.payment_id} {...register("payment_id")} />
            <FieldError message={formState.errors.payment_id?.message} />
          </div>
          <div>
            <Label htmlFor="rf-amount">Amount (₱) *</Label>
            <Input id="rf-amount" inputMode="decimal" placeholder="250.00"
              aria-invalid={!!formState.errors.refund_amount} {...register("refund_amount")} />
            <FieldError message={formState.errors.refund_amount?.message} />
          </div>
          <div>
            <Label htmlFor="rf-reason">Reason *</Label>
            <Input id="rf-reason" placeholder="Duplicate charge…"
              aria-invalid={!!formState.errors.reason} {...register("reason")} />
            <FieldError message={formState.errors.reason?.message} />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={propose.isPending}>
              {propose.isPending && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
              Submit Proposal
            </Button>
            {error && <p role="alert" className="mt-2 text-sm font-medium text-error-600">{error}</p>}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function RefundCard({ refund }: { refund: Refund }) {
  const me = useAuthStore((s) => s.user);
  const review = useRefundMutation().review;
  const complete = useRefundMutation().complete;
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmSpec | null>(null);
  const [payoutFile, setPayoutFile] = useState<File | null>(null);
  const [payoutRef, setPayoutRef] = useState("");
  const [payoutToNumber, setPayoutToNumber] = useState(refund.refund_to_number ?? "");
  const [payoutToName, setPayoutToName] = useState(refund.refund_to_name ?? "");
  const [payoutError, setPayoutError] = useState<string | undefined>();
  const canReview = me?.role === "owner" || me?.can_execute_refunds;
  const decide = async (action: "approve" | "deny", reason: string) => {
    setBusy(true);
    try {
      await review.mutateAsync({
        id: refund.id,
        payload: action === "approve"
          ? { action, admin_notes: reason || undefined }
          : { action, denial_reason: reason },
      });
      toast.success(action === "approve" ? "Refund approved" : "Refund denied", action === "approve" ? "Owed. Upload payout proof to complete." : undefined);
      setNote("");
    } catch (e) {
      toast.error("Review failed", e instanceof Error ? e.message : undefined);
    } finally {
      setBusy(false);
    }
  };
  const markSent = async () => {
    if (!payoutFile) {
      setPayoutError("Receipt required before marking sent.");
      return;
    }
    const digits = payoutRef.replace(/\D/g, "");
    if (digits.length < 6) {
      setPayoutError("Enter payout reference number.");
      return;
    }
    const toDigits = payoutToNumber.replace(/\D/g, "");
    if (!/^(09\d{9}|639\d{9})$/.test(toDigits)) {
      setPayoutError("Enter the refund GCash number.");
      return;
    }
    if (payoutToName.trim().length < 2) {
      setPayoutError("Enter the name on GCash.");
      return;
    }
    setPayoutError(undefined);
    setBusy(true);
    try {
      const form = new FormData();
      form.append("payout_reference_number", digits);
      form.append("file", payoutFile);
      form.append("refund_to_number", toDigits);
      form.append("refund_to_name", payoutToName.trim());
      await complete.mutateAsync({ id: refund.id, form });
      toast.success("Refund sent", "Payout proof saved.");
      setPayoutFile(null);
      setPayoutRef("");
    } catch (e) {
      toast.error("Mark sent failed", e instanceof Error ? e.message : undefined);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-technical font-semibold text-gray-900">#{refund.id}</p>
        <ToneBadge
          map={{ approved: "success", denied: "destructive", completed: "success", processing: "warning", proposed: "warning" }}
          value={refund.status}
          label={refund.status}
        />
        <span className="ml-auto font-technical font-semibold text-gray-900">
          {formatPeso(refund.refund_amount)}
        </span>
      </div>
      <p className="mt-1 text-sm text-gray-600">
        Booking #{refund.booking_id} · Payment #{refund.payment_id}: {refund.reason}
      </p>
      {(refund.refund_to_number || refund.refund_to_name) && (
        <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-700">
          <Wallet size={16} aria-hidden="true" />
          <span>Send to: {refund.refund_to_number ?? ""}{refund.refund_to_name ? `, ${refund.refund_to_name}` : ""}</span>
        </p>
      )}
      {(refund.payout_reference_number || refund.payout_receipt_url) && (
        <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-700">
          <ReceiptText size={16} aria-hidden="true" />
          <span>Sent{refund.payout_reference_number ? ` Ref: ${refund.payout_reference_number}` : ""}. Check receipt in booking files.</span>
        </p>
      )}
      {refund.denial_reason && (
        <p className="mt-1 text-sm text-error-600">Denied: {refund.denial_reason}</p>
      )}
      {(refund.status === "proposed" || refund.status === "processing") && canReview && (
        <div className="mt-3 flex flex-col gap-2 border-t border-gray-100 pt-3 sm:flex-row">
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Approval note (optional)…"
            aria-label="Approval note"
            className="flex-1"
          />
          <div className="flex gap-2">
            <Button size="sm" disabled={busy}
              onClick={() => setConfirm({
                title: `Approve refund #${refund.id}?`,
                body: <>Send <strong className="font-technical">{formatPeso(refund.refund_amount)}</strong> back for booking #{refund.booking_id}. Approved means owed. Upload proof to complete.</>,
                confirmLabel: "Approve",
                destructive: false,
                onConfirm: () => decide("approve", note),
              })}>
              Approve
            </Button>
            <Button size="sm" variant="outline" disabled={busy}
              onClick={() => setConfirm({
                title: `Deny refund #${refund.id}?`,
                body: <>The proposal closes and the requester is notified.</>,
                confirmLabel: "Deny Refund",
                destructive: true,
                requireReason: "Denial reason",
                onConfirm: (reason) => decide("deny", reason),
              })}>
              Deny
            </Button>
          </div>
        </div>
      )}
      {refund.status === "approved" && canReview && (
        <div className="mt-3 flex flex-col gap-2 border-t border-gray-100 pt-3">
          <FileUploader label="Payout receipt *" file={payoutFile} error={payoutError} onSelect={(f) => { setPayoutFile(f); setPayoutError(undefined); }} onClear={() => setPayoutFile(null)} />
          <Input
            value={payoutRef}
            onChange={(e) => setPayoutRef(e.target.value)}
            placeholder="Payout reference number"
            aria-label="Payout reference number"
            inputMode="numeric"
          />
          <Input
            value={payoutToNumber}
            onChange={(e) => setPayoutToNumber(e.target.value)}
            placeholder="Refund to GCash number *"
            aria-label="Refund to GCash number"
            inputMode="numeric"
          />
          <Input
            value={payoutToName}
            onChange={(e) => setPayoutToName(e.target.value)}
            placeholder="Name on GCash *"
            aria-label="Name on GCash"
          />
          <div>
            <Button size="sm" disabled={busy} onClick={() => void markSent()}>
              Mark as sent
            </Button>
          </div>
        </div>
      )}
      {(refund.status === "proposed" || refund.status === "processing") && !canReview && (
        <p className="mt-2 text-xs text-gray-500">Awaiting owner review.</p>
      )}
      <ConfirmDialog spec={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}

/** Office propose + owner/delegated review (maker-checker). */
export function RefundsPage() {
  const [filter, setFilter] = useState<string | undefined>("proposed");
  const refunds = useRefunds(filter);
  const items = refunds.data?.items ?? [];
  const tab = (filter ?? "all") as "proposed" | "processing" | "approved" | "completed" | "denied" | "all";
  return (
    <div className="min-w-0">
      <PageHeader title="Refunds" description="Review and process customer refund requests." />
      <div className="space-y-6">
        <ProposeForm />
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle>Refund ledger</CardTitle>
              <div className="ml-auto">
                <PillTabs
                  label="Refund filter"
                  options={[
                    { id: "proposed" as const, name: "Proposed" },
                    { id: "processing" as const, name: "Processing" },
                    { id: "approved" as const, name: "Approved" },
                    { id: "completed" as const, name: "Completed" },
                    { id: "denied" as const, name: "Denied" },
                    { id: "all" as const, name: "All" },
                  ]}
                  value={tab}
                  onPick={(v) => setFilter(v === "all" ? undefined : v)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-sm text-gray-600" role="status">
              {refunds.data ? (
                <>Showing <span className="font-semibold tabular-nums text-gray-900">{items.length}</span> {items.length === 1 ? "refund" : "refunds"}</>
              ) : ("Loading refunds…")}
            </p>
            {refunds.isPending && (
              <div aria-busy="true" aria-label="Loading refunds">
                <CardSkeleton />
              </div>
            )}
            {refunds.isError && (
              <ErrorCard
                message={refunds.error instanceof Error ? refunds.error.message : "Could not load refunds."}
                onRetry={() => void refunds.refetch()}
              />
            )}
            {items.map((r) => <RefundCard key={r.id} refund={r} />)}
            {!refunds.isPending && !refunds.isError && items.length === 0 && (
              <EmptyState
                title="No refunds in this state"
                description={filter === undefined ? "Nothing proposed, processing, approved, completed, or denied yet." : `No ${filter} refunds. Proposals land here for review.`}
                actionLabel={filter === undefined ? undefined : "Propose a refund"}
                onAction={filter === undefined ? undefined : () => document.getElementById("rf-booking")?.focus()}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
