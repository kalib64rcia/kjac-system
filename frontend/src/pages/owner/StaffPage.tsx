import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Send } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, type ConfirmSpec } from "@/components/feedback/ConfirmDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldError, Input, Label } from "@/components/ui/input";
import {
  useOfficeUsers,
  useStaffInviteMutation,
  useStaffInvites,
  useUserMutation,
} from "@/hooks/useOffice";
import { useAuthStore } from "@/stores/auth.store";
import { toast } from "@/stores/toast.store";
import type { OfficeUser } from "@/api/users.api";

const inviteSchema = z.object({
  email: z.string().trim().email("Enter a valid email address").max(255),
});

const GRANTS = [
  { key: "can_approve_technicians", label: "Approve technicians" },
  { key: "can_execute_refunds", label: "Execute refunds" },
  { key: "can_view_audit", label: "View audit logs" },
] as const;

function InviteForm() {
  const send = useStaffInviteMutation().send;
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, reset, formState } = useForm<{ email: string }>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: "" },
  });
  const submit = handleSubmit(async (v) => {
    setError(null);
    try {
      await send.mutateAsync(v.email.trim());
      toast.success("Invite sent", "The staffer has 7 days to accept.");
      reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send invite.");
    }
  });
  return (
    <Card>
      <CardHeader><CardTitle>Invite staff</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={(e) => void submit(e)} noValidate className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Label htmlFor="staff-email">Work email *</Label>
            <Input id="staff-email" type="email" placeholder="teammate@email.com"
              autoComplete="off" spellCheck={false}
              aria-invalid={!!formState.errors.email} {...register("email")} />
            <FieldError message={formState.errors.email?.message} />
          </div>
          <Button type="submit" disabled={send.isPending}>
            {send.isPending ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Send size={16} aria-hidden="true" />}
            Send Invite
          </Button>
        </form>
        {error && <p role="alert" className="mt-2 text-sm font-medium text-error-600">{error}</p>}
      </CardContent>
    </Card>
  );
}

function StaffRow({ user }: { user: OfficeUser }) {
  const me = useAuthStore((s) => s.user);
  const { setStatus, review, updateRole } = useUserMutation();
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmSpec | null>(null);
  const isSelf = me?.email === user.email;
  const fullName = `${user.first_name} ${user.last_name}`.trim();
  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(ok);
    } catch (e) {
      toast.error("Action failed", e instanceof Error ? e.message : undefined);
    } finally {
      setBusy(false);
    }
  };
  const denyWithReason = async (id: number, reason: string) => {
    await review.mutateAsync({ id, action: "deny" });
    toast.success(`Denied: ${reason}`);
  };
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-gray-900">
            {fullName}
            {isSelf && <span className="ml-2 text-xs font-normal text-gray-500">(you)</span>}
          </p>
          <p className="truncate text-sm text-gray-500">{user.email}{user.position ? ` · ${user.position}` : ""}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <Badge variant={user.role === "owner" ? "default" : "secondary"}>{user.role}</Badge>
            <Badge variant={user.status === "active" ? "success" : user.status === "pending_approval" ? "warning" : "secondary"}>
              {user.status.replace("_", " ")}
            </Badge>
            {user.gender && <Badge variant="secondary">{user.gender}</Badge>}
            {!user.gender && (user.role === "staff" || user.role === "technician") && (
              <Badge variant="warning">gender not specified</Badge>
            )}
            {user.can_approve_technicians && <Badge variant="info">tech approvals</Badge>}
            {user.can_execute_refunds && <Badge variant="info">refunds</Badge>}
            {user.can_view_audit && <Badge variant="info">audit</Badge>}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {user.status === "pending_approval" && user.role === "staff" && (
            <>
              <Button size="sm" disabled={busy}
                onClick={() => setConfirm({
                  title: `Approve ${fullName}?`,
                  body: <>They will sign in as <strong>staff{user.position ? ` · ${user.position}` : ""}</strong> with the grants currently set. This is logged.</>,
                  confirmLabel: "Approve Staff",
                  onConfirm: () => run(
                    () => review.mutateAsync({ id: user.id, action: "approve" }),
                    "Staff approved",
                  ),
                })}>
                Approve
              </Button>
              <Button size="sm" variant="outline" disabled={busy}
                onClick={() => setConfirm({
                  title: `Deny ${fullName}?`,
                  body: <>Their application closes and they cannot sign in. They will be notified.</>,
                  confirmLabel: "Deny Application",
                  destructive: true,
                  requireReason: "Denial reason",
                  onConfirm: (reason) => denyWithReason(user.id, reason),
                })}>
                Deny
              </Button>
            </>
          )}
          {user.status === "active" && !isSelf && (
            <Button size="sm" variant="outline" disabled={busy}
              onClick={() => setConfirm({
                title: `Suspend ${fullName}?`,
                body: <>They lose access <strong>immediately</strong>, including any open session on next check. Reversible via Reactivate.</>,
                confirmLabel: "Suspend",
                destructive: true,
                onConfirm: () => run(
                  () => setStatus.mutateAsync({ id: user.id, status: "suspended" }),
                  "Staff suspended",
                ),
              })}>
              Suspend
            </Button>
          )}
          {user.status === "suspended" && (
            <Button size="sm" variant="outline" disabled={busy}
              onClick={() => void run(
                () => setStatus.mutateAsync({ id: user.id, status: "active" }),
                "Staff reactivated",
              )}>
              Reactivate
            </Button>
          )}
        </div>
      </div>
      {user.role === "staff" && user.status === "active" && (
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 border-t border-gray-100 pt-3">
          {GRANTS.map((g) => (
            <label key={g.key} className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                disabled={busy}
                checked={!!user[g.key]}
                onChange={(e) => void run(
                  () => updateRole.mutateAsync({ id: user.id, patch: { [g.key]: e.target.checked } }),
                  `${g.label} ${e.target.checked ? "granted" : "revoked"}`,
                )}
                className="h-5 w-5 cursor-pointer accent-primary-600"
              />
              {g.label}
            </label>
          ))}
        </div>
      )}
      <ConfirmDialog spec={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}

/** Owner-only: staff roster, invites, approvals, per-person delegation grants. */
export function StaffPage() {
  const users = useOfficeUsers({ role: undefined });
  const invites = useStaffInvites();
  const inviteMut = useStaffInviteMutation();
  const office = (users.data?.items ?? []).filter((u) => u.role === "owner" || u.role === "staff");
  const pending = office.filter((u) => u.status === "pending_approval");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Staff" description="Invite, approve, and delegate — payroll stays owner-only, always." />
      {pending.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              Awaiting approval{" "}
              <Badge variant="warning">{pending.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {pending.map((u) => <StaffRow key={u.id} user={u} />)}
          </CardContent>
        </Card>
      )}
      <InviteForm />
      <Card>
        <CardHeader><CardTitle>Team</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-3">
          {users.isPending && <p className="text-sm text-gray-500">Loading team…</p>}
          {office.filter((u) => u.status !== "pending_approval").map((u) => (
            <StaffRow key={u.id} user={u} />
          ))}
          {!users.isPending && office.length === 0 && (
            <p className="text-sm text-gray-500">No team members yet.</p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Invite ledger</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-2">
          {(invites.data ?? []).map((inv) => (
            <div key={inv.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-100 px-3 py-2 text-sm">
              <span className="min-w-0 flex-1 truncate font-medium text-gray-900">{inv.email}</span>
              <Badge variant={inv.used_at ? "success" : inv.revoked_at ? "secondary" : "warning"}>
                {inv.used_at ? "used" : inv.revoked_at ? "revoked" : "live"}
              </Badge>
              {!inv.used_at && !inv.revoked_at && (
                <>
                  <button type="button" onClick={() => void inviteMut.resend.mutateAsync(inv.id)}
                    className="min-h-[44px] cursor-pointer px-2 font-semibold text-primary-600 hover:underline">
                    Resend
                  </button>
                  <button type="button" onClick={() => void inviteMut.revoke.mutateAsync(inv.id)}
                    className="min-h-[44px] cursor-pointer px-2 font-semibold text-error-600 hover:underline">
                    Revoke
                  </button>
                </>
              )}
            </div>
          ))}
          {(invites.data ?? []).length === 0 && !invites.isPending && (
            <p className="text-sm text-gray-500">No invites sent yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function ApprovalsPage() {
  const users = useOfficeUsers({ status: "pending_approval" });
  const me = useAuthStore((s) => s.user);
  const items = (users.data?.items ?? []).filter((u) =>
    u.role === "technician" || u.role === "staff",
  );
  const canDecide = (role: string) =>
    me?.role === "owner" || (role === "technician" && me?.can_approve_technicians);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Approvals"
        description={me?.role === "owner"
          ? "Staff and technician applications awaiting your decision."
          : "Technician applications awaiting review (owner approves staff)."}
      />
      <Card>
        <CardContent className="flex flex-col gap-3 pt-6">
          {users.isPending && <p className="text-sm text-gray-500">Loading…</p>}
          {items.filter((u) => canDecide(u.role)).map((u) => (
            <StaffRow key={u.id} user={u} />
          ))}
          {!users.isPending && items.filter((u) => canDecide(u.role)).length === 0 && (
            <p className="text-sm text-gray-500">Nothing awaiting your review.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
