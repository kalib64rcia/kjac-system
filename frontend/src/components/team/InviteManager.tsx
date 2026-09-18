import { useState } from "react";
import { Loader2, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  useTechInviteMutation,
  useStaffInviteMutation,
  useTechInvites,
  useStaffInvites,
} from "@/hooks/useOffice";
import { toast } from "@/stores/toast.store";

const inviteTypeOptions = [
  { id: "staff", label: "Staff" },
  { id: "technician", label: "Technician" },
];

export function InviteManager() {
  const [email, setEmail] = useState("");
  const [type, setType] = useState<"staff" | "technician">("staff");
  const [error, setError] = useState<string | null>(null);

  const techInviteMut = useTechInviteMutation();
  const staffInviteMut = useStaffInviteMutation();
  const techInvites = useTechInvites();
  const staffInvites = useStaffInvites();

  const isPending = type === "staff" ? staffInviteMut.send.isPending : techInviteMut.send.isPending;

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError("Email is required");
      return;
    }

    try {
      const mutator = type === "staff" ? staffInviteMut.send : techInviteMut.send;
      await mutator.mutateAsync(email.trim());
      toast.success("Invite sent", `${type} has 7 days to accept.`);
      setEmail("");
    } catch (err) {
      setError(err instanceof Error ? err.message : `Could not send invite. Try again.`);
    }
  };

  // Combine all invites (tech + staff)
  const allInvites = [
    ...(techInvites.data ?? []).map((i) => ({ ...i, type: "technician" as const })),
    ...(staffInvites.data ?? []).map((i) => ({ ...i, type: "staff" as const })),
  ];

  return (
    <div className="space-y-6">
      {/* Invite Form */}
      <Card>
        <CardHeader>
          <CardTitle>Send Invite</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSendInvite} noValidate className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address *</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  autoComplete="off"
                />
                {error && <p className="mt-1 text-sm text-error-600">{error}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Role *</label>
                <div className="flex gap-2">
                  {inviteTypeOptions.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setType(opt.id as "staff" | "technician")}
                      className={`flex-1 rounded-lg border-2 px-3 py-2 text-sm font-medium transition-colors ${
                        type === opt.id
                          ? "border-primary-600 bg-primary-50 text-primary-700"
                          : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <Button type="submit" disabled={isPending} className="w-full">
              {isPending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}
              Send Invite
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Pending Invites */}
      {allInvites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Invites</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {allInvites.map((inv) => (
              <div key={inv.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-100 px-3 py-2">
                <div className="flex-1 min-w-0">
                  <p className="truncate font-medium text-gray-900 text-sm">{inv.email}</p>
                  <p className="truncate text-xs text-gray-500">{inv.type}</p>
                </div>

                <Badge
                  variant={
                    inv.used_at ? "success" : inv.revoked_at ? "secondary" : "warning"
                  }
                >
                  {inv.used_at ? "used" : inv.revoked_at ? "revoked" : "live"}
                </Badge>

                {!inv.used_at && !inv.revoked_at && (
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        const mut =
                          inv.type === "staff"
                            ? staffInviteMut.resend
                            : techInviteMut.resend;
                        void mut.mutateAsync(inv.id).then(() => {
                          toast.success("Invite resent");
                        }).catch(() => {
                          toast.error("Failed to resend invite");
                        });
                      }}
                      className="text-xs font-semibold text-primary-600 hover:underline px-2 py-1"
                    >
                      Resend
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const mut =
                          inv.type === "staff"
                            ? staffInviteMut.revoke
                            : techInviteMut.revoke;
                        void mut.mutateAsync(inv.id).then(() => {
                          toast.success("Invite revoked");
                        }).catch(() => {
                          toast.error("Failed to revoke invite");
                        });
                      }}
                      className="text-xs font-semibold text-error-600 hover:underline px-2 py-1"
                    >
                      Revoke
                    </button>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
