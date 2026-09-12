import { api } from "./axios";

export interface Refund {
  id: number;
  booking_id: number;
  payment_id: number;
  refund_amount: number;
  reason: string;
  status: string;
  admin_notes?: string | null;
  denial_reason?: string | null;
  processed_at?: string | null;
  created_at: string;
}

export interface AuditLog {
  id: number;
  user_id: number | null;
  table_name: string;
  record_id: number;
  action: string;
  old_data?: Record<string, unknown> | null;
  new_data?: Record<string, unknown> | null;
  changed_fields?: string[] | null;
  ip_address?: string | null;
  request_id?: string | null;
  created_at: string;
}

/** Backend: refunds (office propose/list; owner or granted review). */
export const refundsApi = {
  propose: (payload: { booking_id: number; payment_id: number; refund_amount: number; reason: string }) =>
    api.post<Refund>("/admin/refunds", payload).then((r) => r.data),

  list: (params?: { status?: string; page?: number; limit?: number }) =>
    api.get<{ total: number; items: Refund[] }>("/admin/refunds", { params }).then((r) => r.data),

  review: (id: number, payload: { action: "approve" | "deny"; admin_notes?: string; denial_reason?: string }) =>
    api.post<Refund>(`/admin/refunds/${id}/review`, payload).then((r) => r.data),
};

/** Backend: audit viewer (owner or can_view_audit grant). */
export const auditApi = {
  list: (params?: { table_name?: string; action?: string; user_id?: number; page?: number; limit?: number }) =>
    api.get<{ total: number; items: AuditLog[] }>("/admin/audit-logs", { params }).then((r) => r.data),
};
