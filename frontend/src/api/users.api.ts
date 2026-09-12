import { api } from "./axios";

export interface OfficeUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  status: string;
  position?: string | null;
  can_approve_technicians?: boolean;
  can_execute_refunds?: boolean;
  can_view_audit?: boolean;
}

export interface UserList {
  total: number;
  items: OfficeUser[];
}

export interface RolePatch {
  role?: "owner" | "staff";
  position?: string | null;
  can_approve_technicians?: boolean;
  can_execute_refunds?: boolean;
  can_view_audit?: boolean;
}

/** Backend: /v1/admin/users — owner-only (list/status/approval-staff/role). */
export const usersApi = {
  list: (params?: { role?: string; status?: string; search?: string; page?: number; limit?: number }) =>
    api.get<UserList>("/admin/users", { params }).then((r) => r.data),

  setStatus: (id: number, status: "active" | "inactive" | "suspended") =>
    api.patch<OfficeUser>(`/admin/users/${id}/status`, { status }).then((r) => r.data),

  review: (id: number, action: "approve" | "deny") =>
    api.patch<OfficeUser>(`/admin/users/${id}/approval`, { action }).then((r) => r.data),

  updateRole: (id: number, patch: RolePatch) =>
    api.patch<OfficeUser>(`/admin/users/${id}/role`, patch).then((r) => r.data),
};

export interface Invite {
  id: number;
  email: string;
  expires_at: string;
  used_at: string | null;
  revoked_at: string | null;
}

/** Backend: staff invites (owner) + tech invites (office). */
export const invitesApi = {
  staffList: () => api.get<Invite[]>("/admin/staff-invites").then((r) => r.data),
  staffSend: (email: string) =>
    api.post<Invite>("/admin/staff-invites", { email }).then((r) => r.data),
  staffResend: (id: number) =>
    api.post<Invite>(`/admin/staff-invites/${id}/resend`, {}).then((r) => r.data),
  staffRevoke: (id: number) =>
    api.post<Invite>(`/admin/staff-invites/${id}/revoke`, {}).then((r) => r.data),
  staffAccept: (payload: Record<string, unknown>) =>
    api.post<{ id: number; status: string }>("/auth/staff/accept", payload).then((r) => r.data),

  techList: () => api.get<Invite[]>("/admin/tech-invites").then((r) => r.data),
  techSend: (email: string) =>
    api.post<Invite>("/admin/tech-invites", { email }).then((r) => r.data),
  techResend: (id: number) =>
    api.post<Invite>(`/admin/tech-invites/${id}/resend`, {}).then((r) => r.data),
  techRevoke: (id: number) =>
    api.post<Invite>(`/admin/tech-invites/${id}/revoke`, {}).then((r) => r.data),
};
