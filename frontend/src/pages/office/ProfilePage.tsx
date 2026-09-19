import { DetailRow } from "@/components/shared/DetailRow";
import { useAuthStore } from "@/stores/auth.store";
import { getInitials } from "@/utils/format";
import { PageHeader } from "@/components/shared/PageHeader";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";



/** View-only office identity. Editing (with owner approval) ships separately. */
export function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const isOwner = user?.role === "owner";
  const name =
    [user?.first_name, user?.last_name].filter(Boolean).join(" ") ||
    user?.email ||
    "Office user";
  const grants = [
    user?.can_approve_technicians && "Approve technicians",
    user?.can_execute_refunds && "Execute refunds",
    user?.can_view_audit && "View audit logs",
  ].filter(Boolean) as string[];

  return (
    <div>
      <PageHeader
        title="My profile"
        description="Your account details and administrative permissions."
      />
      <div className="flex flex-col gap-6">
        <Card>
          <CardContent>
            <div className="flex items-center gap-4">
              <Avatar className="size-16">
                <AvatarFallback className="text-xl">
                  {getInitials(user?.first_name, user?.last_name, user?.email)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-bold text-gray-900">{name}</p>
                <p className="truncate text-sm text-gray-600">{user?.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl>
              <DetailRow label="First name" value={user?.first_name || "None"} />
              <DetailRow label="Last name" value={user?.last_name || "None"} />
              <DetailRow label="Email" value={user?.email || "None"} />
              <DetailRow
                label="Role"
                value={isOwner ? "Owner" : `Staff${user?.position ? ` · ${user.position}` : ""}`}
              />
              {!isOwner && (
                <DetailRow
                  label="Delegated access"
                  value={grants.length > 0 ? grants.join(" · ") : "None"}
                />
              )}
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
