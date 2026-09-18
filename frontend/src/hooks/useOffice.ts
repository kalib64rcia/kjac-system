import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { bookingApi } from "@/api/booking.api";
import { ApiError } from "@/api/errors";
import { auditApi, refundsApi } from "@/api/office.api";
import {
  catalogAdminApi,
  inventoryApi,
  notificationsApi,
  payrollApi,
  ratingsAdminApi,
  reportsApi,
  type InventoryCreate,
  type InventoryUpdate,
  type PayrollGenerate,
  type StockAdjust,
} from "@/api/office-ext.api";
import { invitesApi, usersApi, type RolePatch } from "@/api/users.api";
import type { AdminBookingParams } from "@/types/booking.types";

export const officeKeys = {
  users: ["office", "users"] as const,
  staffInvites: ["office", "staff-invites"] as const,
  techInvites: ["office", "tech-invites"] as const,
  refunds: (status?: string) => ["office", "refunds", status ?? "all"] as const,
  audit: (params: string) => ["office", "audit", params] as const,
  bookings: (params: string) => ["office", "bookings", params] as const,
  vacancy: (from: string, to: string) => ["office", "vacancy", from, to] as const,
  waitlist: (day: string) => ["office", "waitlist", day] as const,
  roster: ["office", "roster"] as const,
  adminSettings: ["office", "settings"] as const,
  inventory: (params: string) => ["office", "inventory", params] as const,
  movements: (params: string) => ["office", "movements", params] as const,
  payrolls: (params: string) => ["office", "payrolls", params] as const,
  dashboard: ["office", "dashboard"] as const,
  notifications: (params: string) => ["office", "notifications", params] as const,
  unreadCount: ["office", "notifications", "unread"] as const,
  adminServices: ["office", "catalog", "services"] as const,
  adminBrands: ["office", "catalog", "brands"] as const,
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

export function useAdminBookings(params: AdminBookingParams) {
  const key = JSON.stringify(params);
  return useQuery({
    queryKey: officeKeys.bookings(key),
    queryFn: () => bookingApi.adminList({ ...params, limit: params.limit ?? 50 }),
    // A 404 means the endpoint doesn't exist yet — retrying can never help.
    retry: (count, err) => !(err instanceof ApiError) || (err.status !== 404 && count < 2),
  });
}

export function useBookingMutation() {
  const qc = useQueryClient();
  const invalidate = () => void qc.invalidateQueries({ queryKey: ["office", "bookings"] });
  return {
    assign: useMutation({
      mutationFn: ({ id, technicianId, expectedTechnicianId }: { id: number; technicianId: number; expectedTechnicianId?: number | null }) =>
        bookingApi.assignTechnician(id, technicianId, expectedTechnicianId),
      onSuccess: invalidate,
      // A 409 means someone else just assigned it: refresh so the drawer
      // shows the winner's row behind the conflict message.
      onError: invalidate,
    }),
    verifyPayment: useMutation({
      mutationFn: ({ id, action, reason }: { id: number; action: "approve" | "reject"; reason?: string }) =>
        bookingApi.verifyPayment(id, action, reason),
      onSuccess: invalidate,
    }),
    reviewReschedule: useMutation({
      mutationFn: ({ id, action, notes }: { id: number; action: "approve" | "deny"; notes?: string }) =>
        bookingApi.reviewReschedule(id, action, notes),
      onSuccess: invalidate,
    }),
    cancel: useMutation({
      mutationFn: ({ id, reason }: { id: number; reason: string }) =>
        bookingApi.adminCancel(id, reason),
      onSuccess: invalidate,
    }),
    setSlot: useMutation({
      mutationFn: ({ id, date, time, duration }: { id: number; date: string; time: string; duration?: number }) =>
        bookingApi.setSlot(id, date, time, duration),
      onSuccess: invalidate,
      // A 409 means the slot filled under us: refresh so the drawer shows why.
      onError: invalidate,
    }),
    schedule: useMutation({
      mutationFn: ({ id, date, startTime, duration }: { id: number; date: string; startTime: string; duration?: number }) =>
        bookingApi.schedule(id, date, startTime, duration),
      onSuccess: invalidate,
      // A 409 means time slot conflict: refresh so the drawer shows updated bookings.
      onError: invalidate,
    }),
    unschedule: useMutation({
      mutationFn: (id: number) => bookingApi.unschedule(id),
      onSuccess: invalidate,
    }),
    dayOrder: useMutation({
      mutationFn: ({ date, orderedIds }: { date: string; orderedIds: number[] }) =>
        bookingApi.setDayOrder(date, orderedIds),
      onSuccess: invalidate,
    }),
    closeWindow: useMutation({
      mutationFn: ({ date, window, reason }: { date: string; window: string; reason?: string | null }) =>
        bookingApi.closeWindow(date, window, reason),
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: ["office", "vacancy"] });
        void qc.invalidateQueries({ queryKey: ["office", "bookings"] });
      },
    }),
    reopenWindow: useMutation({
      mutationFn: ({ date, window }: { date: string; window: string }) =>
        bookingApi.reopenWindow(date, window),
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: ["office", "vacancy"] });
        void qc.invalidateQueries({ queryKey: ["office", "bookings"] });
      },
    }),
  };
}

export function useAuditLogs(params: { table_name?: string; action?: string; user_id?: number; date_from?: string; date_to?: string; sort_dir?: "asc" | "desc"; page?: number; limit?: number }) {
  const key = JSON.stringify(params);
  return useQuery({
    queryKey: officeKeys.audit(key),
    queryFn: () => auditApi.list({ ...params, limit: params.limit ?? 20 }),
    // Hold the previous page while the next loads — rows never flash empty.
    placeholderData: keepPreviousData,
  });
}

export function useVacancy(from: string, to: string) {
  return useQuery({
    queryKey: officeKeys.vacancy(from, to),
    queryFn: () => bookingApi.vacancy(from, to),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useWaitlist(day: string | null) {
  return useQuery({
    queryKey: officeKeys.waitlist(day ?? ""),
    queryFn: () => bookingApi.waitlist(day ?? ""),
    enabled: day !== null,
  });
}

export function useWaitlistMutation() {
  const qc = useQueryClient();
  const invalidate = () => void qc.invalidateQueries({ queryKey: ["office", "waitlist"] });
  return {
    offer: useMutation({
      mutationFn: ({ id, time }: { id: number; time: string }) =>
        bookingApi.offerWaitlist(id, time),
      onSuccess: invalidate,
      onError: invalidate,
    }),
    remove: useMutation({
      mutationFn: (id: number) => bookingApi.removeWaitlist(id),
      onSuccess: invalidate,
    }),
  };
}

export function useReminderRun() {
  return useMutation({ mutationFn: () => bookingApi.runReminders() });
}

export function useRoster() {
  return useQuery({ queryKey: officeKeys.roster, queryFn: () => bookingApi.roster() });
}

export function useRosterMutation() {
  const qc = useQueryClient();
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: officeKeys.roster });
    void qc.invalidateQueries({ queryKey: ["office", "vacancy"] });
    void qc.invalidateQueries({ queryKey: ["office", "bookings"] });
  };
  return {
    setDays: useMutation({
      mutationFn: ({ id, days }: { id: number; days: boolean[] }) =>
        bookingApi.setWorkdays(id, days),
      onSuccess: invalidate,
    }),
    addLeave: useMutation({
      mutationFn: (payload: { user_id: number; date_from: string; date_to: string; reason?: string | null }) =>
        bookingApi.addTimeOff(payload),
      onSuccess: invalidate,
    }),
    deleteLeave: useMutation({
      mutationFn: (id: number) => bookingApi.deleteTimeOff(id),
      onSuccess: invalidate,
    }),
  };
}

export function useAdminSettings(enabled: boolean) {
  return useQuery({
    queryKey: officeKeys.adminSettings,
    queryFn: () => bookingApi.adminSettings(),
    enabled,
  });
}

export function usePatchSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) =>
      bookingApi.patchSetting(key, value),
    onSuccess: () => void qc.invalidateQueries({ queryKey: officeKeys.adminSettings }),
  });
}

/* ---------------- Inventory (server paged) ---------------- */

export interface InventoryParams {
  search?: string;
  item_type?: string;
  low_stock?: boolean;
  page?: number;
  limit?: number;
}

export function useInventory(params: InventoryParams) {
  const key = JSON.stringify(params);
  return useQuery({
    queryKey: officeKeys.inventory(key),
    queryFn: () =>
      inventoryApi.list({
        search: params.search?.trim() || undefined,
        item_type: params.item_type || undefined,
        low_stock: params.low_stock || undefined,
        page: params.page ?? 1,
        limit: params.limit ?? 20,
      }),
    placeholderData: keepPreviousData,
  });
}

export function useInventoryMutation() {
  const qc = useQueryClient();
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["office", "inventory"] });
    void qc.invalidateQueries({ queryKey: ["office", "movements"] });
  };
  return {
    create: useMutation({
      mutationFn: (payload: InventoryCreate) => inventoryApi.create(payload),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, payload }: { id: number; payload: InventoryUpdate }) =>
        inventoryApi.update(id, payload),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (id: number) => inventoryApi.remove(id),
      onSuccess: invalidate,
    }),
    adjust: useMutation({
      mutationFn: ({ id, payload }: { id: number; payload: StockAdjust }) =>
        inventoryApi.adjust(id, payload),
      onSuccess: invalidate,
      // A 409 means the stock moved under us: refresh so the drawer shows why.
      onError: invalidate,
    }),
  };
}

export function useMovements(itemId: number | null, page = 1, limit = 20) {
  return useQuery({
    queryKey: officeKeys.movements(`${itemId ?? "all"}:${page}:${limit}`),
    queryFn: () =>
      inventoryApi.movements({ item_id: itemId ?? undefined, page, limit }),
    enabled: itemId !== null,
    placeholderData: keepPreviousData,
  });
}

/* ---------------- Payroll (owner-only) ---------------- */

export interface PayrollParams {
  employee_user_id?: number;
  payroll_status?: string;
  page?: number;
  limit?: number;
}

export function usePayrolls(params: PayrollParams, enabled = true) {
  const key = JSON.stringify(params);
  return useQuery({
    queryKey: officeKeys.payrolls(key),
    queryFn: () =>
      payrollApi.list({
        employee_user_id: params.employee_user_id,
        payroll_status: params.payroll_status || undefined,
        page: params.page ?? 1,
        limit: params.limit ?? 20,
      }),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function usePayrollMutation() {
  const qc = useQueryClient();
  const invalidate = () => void qc.invalidateQueries({ queryKey: ["office", "payrolls"] });
  return {
    generate: useMutation({
      mutationFn: (payload: PayrollGenerate) => payrollApi.generate(payload),
      onSuccess: invalidate,
      // Overlap refusals refresh the list so the clash is visible.
      onError: invalidate,
    }),
    transition: useMutation({
      mutationFn: ({ id, action, payment_method }: { id: number; action: "approve" | "pay" | "cancel"; payment_method?: string | null }) =>
        payrollApi.transition(id, { action, payment_method: payment_method ?? null }),
      onSuccess: invalidate,
    }),
  };
}

/* ---------------- Reports + dashboard ---------------- */

export function useDashboard(enabled = true) {
  return useQuery({
    queryKey: officeKeys.dashboard,
    queryFn: () => reportsApi.dashboard(),
    enabled,
    staleTime: 60 * 1000,
  });
}

export function useBookingsReport(params: { date_from: string; date_to: string; status?: string } | null) {
  return useQuery({
    queryKey: ["office", "reports", "bookings", JSON.stringify(params)],
    queryFn: () =>
      reportsApi.bookings({
        date_from: params?.date_from ?? "",
        date_to: params?.date_to ?? "",
        status: params?.status || undefined,
      }),
    enabled: params !== null && params.date_from !== "" && params.date_to !== "",
  });
}

export function useRevenueReport(params: { date_from: string; date_to: string } | null) {
  return useQuery({
    queryKey: ["office", "reports", "revenue", JSON.stringify(params)],
    queryFn: () =>
      reportsApi.revenue({ date_from: params?.date_from ?? "", date_to: params?.date_to ?? "" }),
    enabled: params !== null && params.date_from !== "" && params.date_to !== "",
  });
}

/* ---------------- Notifications (60s badge poll) ---------------- */

export function useNotifications(params: { unreadOnly?: boolean; page?: number; limit?: number }) {
  const key = JSON.stringify(params);
  return useQuery({
    queryKey: officeKeys.notifications(key),
    queryFn: () =>
      notificationsApi.list({
        is_read: params.unreadOnly ? false : undefined,
        page: params.page ?? 1,
        limit: params.limit ?? 20,
      }),
    placeholderData: keepPreviousData,
  });
}

export function useUnreadCount(enabled = true) {
  return useQuery({
    queryKey: officeKeys.unreadCount,
    queryFn: () => notificationsApi.list({ page: 1, limit: 1 }),
    enabled,
    refetchInterval: 60 * 1000,
    staleTime: 45 * 1000,
  });
}

export function useNotificationMutation() {
  const qc = useQueryClient();
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["office", "notifications"] });
  };
  return {
    markRead: useMutation({
      mutationFn: (id: number) => notificationsApi.markRead(id),
      onSuccess: invalidate,
    }),
    markAllRead: useMutation({
      mutationFn: () => notificationsApi.markAllRead(),
      onSuccess: invalidate,
    }),
  };
}

/* ---------------- Catalog admin (office-wide) ---------------- */

export function useAdminServices() {
  return useQuery({ queryKey: officeKeys.adminServices, queryFn: () => catalogAdminApi.allServices() });
}

export function useAdminBrands() {
  return useQuery({ queryKey: officeKeys.adminBrands, queryFn: () => catalogAdminApi.allBrands() });
}

export function useCatalogMutation() {
  const qc = useQueryClient();
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: officeKeys.adminServices });
    void qc.invalidateQueries({ queryKey: officeKeys.adminBrands });
  };
  return {
    createService: useMutation({ mutationFn: catalogAdminApi.createService, onSuccess: invalidate }),
    updateService: useMutation({
      mutationFn: ({ id, payload }: { id: number; payload: Parameters<typeof catalogAdminApi.updateService>[1] }) =>
        catalogAdminApi.updateService(id, payload),
      onSuccess: invalidate,
    }),
    deleteService: useMutation({ mutationFn: catalogAdminApi.deleteService, onSuccess: invalidate }),
    createBrand: useMutation({ mutationFn: catalogAdminApi.createBrand, onSuccess: invalidate }),
    updateBrand: useMutation({
      mutationFn: ({ id, payload }: { id: number; payload: Parameters<typeof catalogAdminApi.updateBrand>[1] }) =>
        catalogAdminApi.updateBrand(id, payload),
      onSuccess: invalidate,
    }),
    deleteBrand: useMutation({ mutationFn: catalogAdminApi.deleteBrand, onSuccess: invalidate }),
  };
}

/* ---------------- Ratings lookup (per-technician wall) ---------------- */

export function useTechRatings(technicianId: number | null, page = 1) {
  return useQuery({
    queryKey: ["office", "ratings", technicianId, page],
    queryFn: () => ratingsAdminApi.forTechnician(technicianId ?? 0, { page, limit: 20 }),
    enabled: technicianId !== null && technicianId > 0,
    placeholderData: keepPreviousData,
  });
}

export function useRatingMutation() {
  const qc = useQueryClient();
  return {
    remove: useMutation({
      mutationFn: (id: number) => ratingsAdminApi.remove(id),
      onSuccess: () => void qc.invalidateQueries({ queryKey: ["office", "ratings"] }),
    }),
  };
}
