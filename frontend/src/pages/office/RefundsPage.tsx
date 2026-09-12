import { useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldError, Input, Label } from "@/components/ui/input";
import { useRefundMutation, useRefunds } from "@/hooks/useOffice";
import { useAuthStore } from "@/stores/auth.store";
import { toast } from "@/stores/toast.store";
import type { Refund } from "@/api/office.api";
import { cn } from "@/lib/utils";

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
  const { register, handleSubmit, reset, formState } = useForm<ProposeValues>({
    resolver: zodResolver(proposeSchema) as unknown as Resolver<ProposeValues>,
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
      <CardHeader><CardTitle>Propose a refund</CardTitle></CardHeader>
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
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const canReview = me?.role === "owner" || me?.can_execute_refunds;
  const decide = async (action: "approve" | "deny") => {
    setBusy(true);
    try {
      await review.mutateAsync({
        id: refund.id,
        payload: action === "approve"
          ? { action, admin_notes: note || undefined }
          : { action, denial_reason: note || undefined },
      });
      toast.success(action === "approve" ? "Refund approved & executed" : "Refund denied");
      setNote("");
    } catch (e) {
      toast.error("Review failed", e instanceof Error ? e.message : undefined);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-technical font-semibold text-gray-900">#{refund.id}</p>
        <Badge variant={
          refund.status === "approved" ? "success" : refund.status === "denied" ? "destructive" : "warning"
        }>
          {refund.status}
        </Badge>
        <span className="ml-auto font-technical font-semibold text-gray-900">
          ₱{Number(refund.refund_amount).toFixed(2)}
        </span>
      </div>
      <p className="mt-1 text-sm text-gray-600">
        Booking #{refund.booking_id} · Payment #{refund.payment_id} — {refund.reason}
      </p>
      {refund.denial_reason && (
        <p className="mt-1 text-sm text-error-600">Denied: {refund.denial_reason}</p>
      )}
      {refund.status === "proposed" && canReview && (
        <div className="mt-3 flex flex-col gap-2 border-t border-gray-100 pt-3 sm:flex-row">
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note or denial reason…"
            aria-label="Review note"
            className="flex-1"
          />
          <div className="flex gap-2">
            <Button size="sm" disabled={busy} onClick={() => void decide("approve")}>
              Approve & Execute
            </Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => void decide("deny")}>
              Deny
            </Button>
          </div>
        </div>
      )}
      {refund.status === "proposed" && !canReview && (
        <p className="mt-2 text-xs text-gray-500">Awaiting owner review.</p>
      )}
    </div>
  );
}

/** Office propose + owner/delegated review (maker-checker). */
export function RefundsPage() {
  const [filter, setFilter] = useState<string | undefined>("proposed");
  const refunds = useRefunds(filter);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Refunds" description="Staff propose — owner (or delegated staff) approves and executes." />
      <ProposeForm />
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>Refund ledger</CardTitle>
            <div className="ml-auto flex gap-1" role="tablist" aria-label="Refund filter">
              {["proposed", "approved", "denied", undefined].map((s) => (
                <button
                  key={s ?? "all"}
                  type="button"
                  role="tab"
                  aria-selected={filter === s}
                  onClick={() => setFilter(s)}
                  className={cn(
                    "min-h-[44px] cursor-pointer rounded-lg px-3 text-sm font-semibold",
                    filter === s ? "bg-primary-50 text-primary-700" : "text-gray-500 hover:bg-gray-50",
                  )}
                >
                  {s ?? "all"}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {refunds.isPending && <p className="text-sm text-gray-500">Loading refunds…</p>}
          {(refunds.data?.items ?? []).map((r) => <RefundCard key={r.id} refund={r} />)}
          {!refunds.isPending && (refunds.data?.items ?? []).length === 0 && (
            <p className="text-sm text-gray-500">No refunds in this state.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
