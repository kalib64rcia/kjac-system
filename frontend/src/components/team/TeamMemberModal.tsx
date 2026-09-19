import { useState } from "react";
import { Trash2 } from "lucide-react";
import type { OfficeUser } from "@/api/users.api";
import { ConfirmDialog, type ConfirmSpec } from "@/components/feedback/ConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { Block } from "@/components/office/BookingDetailSheet";
import { DetailRow } from "@/components/shared/DetailRow";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetCloseButton,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRosterMutation, useRoster, useUserMutation } from "@/hooks/useOffice";
import { useAuthStore } from "@/stores/auth.store";
import { toast } from "@/stores/toast.store";
import { formatDateLong } from "@/utils/format";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface TeamMemberModalProps {
  member: OfficeUser | null;
  onClose: () => void;
}

function LeaveForm({ techId, onDone }: { techId: number; onDone: () => void }) {
  const mut = useRosterMutation();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [reason, setReason] = useState("");
  const valid = from !== "" && to !== "" && to >= from;

  return (
    <form
      className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        mut.addLeave.mutate(
          { user_id: techId, date_from: from, date_to: to, reason: reason.trim() || null },
          {
            onSuccess: () => {
              toast.success("Time off added");
              onDone();
            },
            onError: (err) => toast.error("Add failed", err instanceof Error ? err.message : undefined),
          }
        );
      }}
    >
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold text-gray-700">From</span>
        <input
          aria-label="Leave from"
          type="date"
          className="min-h-[44px] w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-base tabular-nums text-gray-900 focus:border-primary-600 focus:outline-none"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold text-gray-700">To</span>
        <input
          aria-label="Leave to"
          type="date"
          min={from || undefined}
          className="min-h-[44px] w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-base tabular-nums text-gray-900 focus:border-primary-600 focus:outline-none"
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />
      </label>
      <label className="block sm:col-span-2">
        <span className="mb-1.5 block text-sm font-semibold text-gray-700">Reason (optional)</span>
        <input
          aria-label="Leave reason"
          placeholder="Family day"
          maxLength={500}
          className="min-h-[44px] w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-base text-gray-900 focus:border-primary-600 focus:outline-none"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </label>
      <div className="flex items-end gap-2 sm:col-span-2">
        <Button type="submit" disabled={!valid || mut.addLeave.isPending} className="flex-1">
          {mut.addLeave.isPending ? "Adding…" : "Add"}
        </Button>
        <Button type="button" variant="outline" onClick={onDone}>
          Done
        </Button>
      </div>
    </form>
  );
}

function TechnicianContent({ member }: { member: OfficeUser }) {
  const roster = useRoster();
  const mut = useRosterMutation();
  const [adding, setAdding] = useState(false);

  const tech = roster.data?.find((t) => t.user_id === member.id);

  const flipDay = (index: number) => {
    if (!tech) return;
    const days = tech.days.map((d, i) => (i === index ? !d : d));
    mut.setDays.mutate({ id: tech.user_id, days }, {
      onError: (e) => toast.error("Save failed", e instanceof Error ? e.message : undefined),
    });
  };

  return (
    <div className="space-y-4">
      <Block title="Weekly Schedule">
        <div className="flex flex-wrap gap-1.5">
          {WEEKDAYS.map((wd, i) => {
            const on = tech?.days[i] ?? true;
            return (
              <button
                key={wd}
                type="button"
                aria-pressed={on}
                title={`${wd} ${on ? "working" : "off"}`}
                disabled={!tech || mut.setDays.isPending}
                onClick={() => flipDay(i)}
                className={cn(
                  "min-h-[36px] min-w-[44px] rounded-lg border px-2 text-xs font-semibold transition-colors disabled:cursor-not-allowed",
                  on
                    ? "border-primary-700 bg-primary-700 text-white"
                    : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
                )}
              >
                {wd}
              </button>
            );
          })}
        </div>
      </Block>

      <Block title={`Time Off (${tech?.leave.length ?? 0})`}>
        {tech && tech.leave.length === 0 ? (
          <p className="text-sm text-gray-500">No leave booked.</p>
        ) : tech ? (
          <ul className="flex flex-col gap-1.5">
            {tech.leave.map((row) => (
              <li
                key={row.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-gray-100 px-2.5 py-2"
              >
                <p className="min-w-0 truncate text-sm tabular-nums text-gray-900">
                  {formatDateLong(row.date_from)}
                  {row.date_to !== row.date_from && ` – ${formatDateLong(row.date_to)}`}
                  {row.reason && <span className="text-gray-500"> · {row.reason}</span>}
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  aria-label={`Cancel leave ${row.date_from}`}
                  disabled={mut.deleteLeave.isPending}
                  onClick={() =>
                    mut.deleteLeave.mutate(row.id, {
                      onError: (e) => toast.error("Cancel failed", e instanceof Error ? e.message : undefined),
                    })
                  }
                >
                  <Trash2 size={14} />
                </Button>
              </li>
            ))}
          </ul>
        ) : null}

        {tech && !adding && (
          <Button type="button" size="sm" variant="outline" className="mt-2 w-full" onClick={() => setAdding(true)}>
            Add time off
          </Button>
        )}
        {tech && adding && <LeaveForm techId={tech.user_id} onDone={() => setAdding(false)} />}
      </Block>
    </div>
  );
}

function StaffContent({ member }: { member: OfficeUser }) {
  const mut = useUserMutation();
  const [busy, setBusy] = useState(false);

  const GRANTS = [
    { key: "can_approve_technicians", label: "Approve technicians" },
    { key: "can_execute_refunds", label: "Execute refunds" },
    { key: "can_view_audit", label: "View audit logs" },
  ] as const;

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

  return (
    <Block title="Permissions">
      <div className="space-y-2">
        {GRANTS.map((g) => (
          <label key={g.key} className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              disabled={busy}
              checked={!!member[g.key]}
              onChange={(e) =>
                void run(
                  () => mut.updateRole.mutateAsync({ id: member.id, patch: { [g.key]: e.target.checked } }),
                  `${g.label} ${e.target.checked ? "granted" : "revoked"}`
                )
              }
              className="h-5 w-5 cursor-pointer accent-primary-600 rounded"
            />
            <span className="text-sm text-gray-700">{g.label}</span>
          </label>
        ))}
      </div>
    </Block>
  );
}

function ApprovalContent({ member }: { member: OfficeUser }) {
  const mut = useUserMutation();
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmSpec | null>(null);

  const fullName = `${member.first_name} ${member.last_name}`.trim();
  const roleLabel = member.role === "technician" ? "technician" : "staff";

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

  return (
    <div className="space-y-4">
      <Block title="Application">
        <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-3">
          <p className="text-sm text-yellow-900">
            <strong>{fullName}</strong> has applied to join as a <strong>{roleLabel}</strong>.
          </p>
          {member.position && <p className="text-xs text-yellow-800 mt-1">Position: {member.position}</p>}
        </div>
      </Block>

      <Block title="Decision">
        <div className="space-y-2">
          <Button
            className="w-full"
            disabled={busy}
            onClick={() =>
              setConfirm({
                title: `Approve ${fullName}?`,
                body: (
                  <>
                    They will be able to sign in as <strong>{roleLabel}</strong> immediately after approval.
                  </>
                ),
                confirmLabel: "Approve",
                onConfirm: () =>
                  run(
                    () => mut.review.mutateAsync({ id: member.id, action: "approve" }),
                    `${fullName} approved`
                  ),
              })
            }
          >
            ✓ Approve
          </Button>

          <Button
            variant="outline"
            className="w-full"
            disabled={busy}
            onClick={() =>
              setConfirm({
                title: `Deny ${fullName}?`,
                body: (
                  <>
                    Their application will be closed and they will not be able to sign in. We will notify them.
                  </>
                ),
                confirmLabel: "Deny",
                destructive: true,
                requireReason: "Denial reason (optional)",
                onConfirm: (reason) =>
                  run(
                    () => mut.review.mutateAsync({ id: member.id, action: "deny" }),
                    `Denied: ${reason || "No reason provided"}`
                  ),
              })
            }
          >
            ✗ Deny
          </Button>
        </div>
      </Block>

      <ConfirmDialog spec={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}

export function TeamMemberModal({ member, onClose }: TeamMemberModalProps) {
  const user = useAuthStore((s) => s.user);
  const mut = useUserMutation();
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmSpec | null>(null);

  if (!member) return null;

  const canEdit = user?.role === "owner";
  const fullName = `${member.first_name} ${member.last_name}`.trim();
  const isSelf = user?.email === member.email;

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

  return (
    <Sheet open={!!member} onOpenChange={(open) => !open && onClose()}>
      <SheetContent label={member.status === "pending_approval" ? "Review Application" : `Edit: ${fullName}`} side="right" onClose={onClose}>
        <SheetHeader>
          <SheetTitle>{member.status === "pending_approval" ? "Review Application" : `Edit: ${fullName}`}</SheetTitle>
          <SheetCloseButton onClose={onClose} />
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-160px)]">
          <div className="space-y-4 pr-4 pt-4">
            {/* Account Info */}
            <Block title="Account Info">
              <dl>
                <DetailRow label="Name" value={fullName} />
                <DetailRow label="Email" value={member.email} />
                <DetailRow label="Role" value={<Badge variant={member.role === "owner" ? "default" : "secondary"}>{member.role}</Badge>} />
                <DetailRow
                  label="Status"
                  value={
                    <Badge
                      variant={
                        member.status === "active"
                          ? "success"
                          : member.status === "pending_approval"
                            ? "warning"
                            : "secondary"
                      }
                    >
                      {member.status.replace("_", " ")}
                    </Badge>
                  }
                />
              </dl>
            </Block>

            {/* Role-specific content */}
            {member.status === "pending_approval" ? (
              <ApprovalContent member={member} />
            ) : member.status === "active" && member.role === "staff" ? (
              <StaffContent member={member} />
            ) : member.status === "active" && member.role === "technician" ? (
              <TechnicianContent member={member} />
            ) : member.status === "suspended" ? (
              <Block title="Status">
                <div className="rounded-lg bg-gray-100 p-3 text-center">
                  <p className="text-sm font-medium text-gray-900">Account is suspended</p>
                  <p className="text-xs text-gray-500 mt-1">Contact admin to reactivate</p>
                </div>
              </Block>
            ) : null}

            {/* Action Buttons */}
            {member.status === "active" && !isSelf && canEdit && (
              <div className="space-y-2 border-t border-gray-200 pt-4">
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={busy}
                  onClick={() =>
                    setConfirm({
                      title: `Suspend ${fullName}?`,
                      body: <>They will lose access immediately. This is reversible.</>,
                      confirmLabel: "Suspend",
                      destructive: true,
                      onConfirm: () =>
                        run(
                          () => mut.setStatus.mutateAsync({ id: member.id, status: "suspended" }),
                          "Member suspended"
                        ),
                    })
                  }
                >
                  Suspend
                </Button>
              </div>
            )}

            {member.status === "suspended" && canEdit && (
              <div className="space-y-2 border-t border-gray-200 pt-4">
                <Button
                  className="w-full"
                  disabled={busy}
                  onClick={() =>
                    run(
                      () => mut.setStatus.mutateAsync({ id: member.id, status: "active" }),
                      "Member reactivated"
                    )
                  }
                >
                  Reactivate
                </Button>
              </div>
            )}

            <ConfirmDialog spec={confirm} onClose={() => setConfirm(null)} />
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
