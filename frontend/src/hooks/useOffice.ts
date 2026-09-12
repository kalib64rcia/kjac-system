import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { auditApi, refundsApi } from "@/api/office.api";
import { invitesApi, usersApi, type RolePatch } from "@/api/users.api";

export const officeKeys = {
  users: ["office", "users"] as const,
  staffInvites: ["office", "staff-invites"] as const,
  techInvites: ["office", "tech-invites"] as const,
  refunds: (status?: string) => ["office", "refunds", status ?? "all"] as const,
  audit: (params: string) => ["office", "audit", params] as const,
};

export function useOfficeUsers(params?: { role?: string; status?: string; search?: string }) {
  return useQuery({ queryKey: [...officeKeys.users, params], queryFn: () => usersApi.list(params) });
}

export function useUserMutation() {
  const qc = useQueryClient();
  const invalidate = () => void qc.invalidateQueries({ queryKey: officeKeys.users });
  return {
    setStatus: useMutation({
      mutationFn: ({ id, status }: { id: number; status: "active" | "inactive" | "suspended" }) =>
        usersApi.setStatus(id, status),
      onSuccess: invalidate,
    }),
    review: useMutation({
      mutationFn: ({ id, action }: { id: number; action: "approve" | "deny" }) =>
        usersApi.review(id, action),
      onSuccess: invalidate,
    }),
    updateRole: useMutation({
      mutationFn: ({ id, patch }: { id: number; patch: RolePatch }) =>
        usersApi.updateRole(id, patch),
      onSuccess: invalidate,
    }),
  };
}

export function useStaffInvites() {
  return useQuery({ queryKey: officeKeys.staffInvites, queryFn: invitesApi.staffList });
}

export function useStaffInviteMutation() {
  const qc = useQueryClient();
  const invalidate = () => void qc.invalidateQueries({ queryKey: officeKeys.staffInvites });
  return {
    send: useMutation({ mutationFn: invitesApi.staffSend, onSuccess: invalidate }),
    resend: useMutation({ mutationFn: invitesApi.staffResend, onSuccess: invalidate }),
    revoke: useMutation({ mutationFn: invitesApi.staffRevoke, onSuccess: invalidate }),
  };
}

export function useTechInvites() {
  return useQuery({ queryKey: officeKeys.techInvites, queryFn: invitesApi.techList });
}

export function useTechInviteMutation() {
  const qc = useQueryClient();
  const invalidate = () => void qc.invalidateQueries({ queryKey: officeKeys.techInvites });
  return {
    send: useMutation({ mutationFn: invitesApi.techSend, onSuccess: invalidate }),
    resend: useMutation({ mutationFn: invitesApi.techResend, onSuccess: invalidate }),
    revoke: useMutation({ mutationFn: invitesApi.techRevoke, onSuccess: invalidate }),
  };
}

export function useRefunds(status?: string) {
  return useQuery({ queryKey: officeKeys.refunds(status), queryFn: () => refundsApi.list({ status }) });
}

export function useRefundMutation() {
  const qc = useQueryClient();
  const invalidate = () => void qc.invalidateQueries({ queryKey: ["office", "refunds"] });
  return {
    propose: useMutation({ mutationFn: refundsApi.propose, onSuccess: invalidate }),
    review: useMutation({
      mutationFn: ({ id, payload }: {
        id: number;
        payload: { action: "approve" | "deny"; admin_notes?: string; denial_reason?: string };
      }) => refundsApi.review(id, payload),
      onSuccess: invalidate,
    }),
  };
}

export function useAuditLogs(params: { table_name?: string; action?: string; page?: number }) {
  const key = JSON.stringify(params);
  return useQuery({
    queryKey: officeKeys.audit(key),
    queryFn: () => auditApi.list({ ...params, limit: 20 }),
  });
}
