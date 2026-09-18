import { api } from "./axios";
import type { Brand, ServiceDetail } from "@/types/catalog.types";

/* ------------------------------------------------------------------ */
/* Inventory (backend: /v1/admin/inventory — office + 2FA)             */
/* ------------------------------------------------------------------ */

export interface InventoryItem {
  id: number;
  sku: string;
  qr_code: string | null;
  item_type: string;
  name: string;
  quantity: number;
  minimum_stock_level: number;
  unit_cost: number;
  selling_price: number | null;
  is_active: boolean;
}

export interface InventoryList {
  total: number;
  items: InventoryItem[];
}

export interface InventoryCreate {
  sku: string;
  item_type: string;
  name: string;
  description?: string | null;
  brand_id?: number | null;
  model_number?: string | null;
  part_number?: string | null;
  quantity?: number;
  minimum_stock_level?: number;
  unit_of_measure?: string;
  unit_cost: number;
  selling_price?: number | null;
  storage_location?: string | null;
}

export interface InventoryUpdate {
  name?: string;
  description?: string | null;
  minimum_stock_level?: number;
  unit_cost?: number;
  selling_price?: number | null;
  storage_location?: string | null;
  is_active?: boolean;
}

export interface StockAdjust {
  movement_type: string;
  quantity: number;
  reason?: string | null;
  booking_id?: number | null;
  reference_number?: string | null;
}

export interface Movement {
  id: number;
  inventory_item_id: number;
  movement_type: string;
  quantity: number;
  previous_quantity: number;
  new_quantity: number;
}

export const inventoryApi = {
  list: (params?: { search?: string; item_type?: string; low_stock?: boolean; page?: number; limit?: number }) =>
    api.get<InventoryList>("/admin/inventory", { params }).then((r) => r.data),

  create: (payload: InventoryCreate) =>
    api.post<InventoryItem>("/admin/inventory", payload).then((r) => r.data),

  update: (id: number, payload: InventoryUpdate) =>
    api.patch<InventoryItem>(`/admin/inventory/${id}`, payload).then((r) => r.data),

  remove: (id: number) =>
    api.delete(`/admin/inventory/${id}`).then((r) => r.data),

  adjust: (id: number, payload: StockAdjust) =>
    api.post<Movement>(`/admin/inventory/${id}/adjust`, payload).then((r) => r.data),

  movements: (params?: { item_id?: number; page?: number; limit?: number }) =>
    api.get<{ total: number; items: Movement[] }>("/admin/inventory/movements/list", { params }).then((r) => r.data),
};

/* ------------------------------------------------------------------ */
/* Payroll (backend: /v1/admin/payroll — owner + 2FA; totals server-side) */
/* ------------------------------------------------------------------ */

export interface PayrollRecord {
  id: number;
  employee_user_id: number;
  period_start_date: string;
  period_end_date: string;
  payment_date: string;
  base_salary: number;
  commission: number;
  total_earnings: number;
  total_deductions: number;
  net_pay: number;
  status: string;
  payment_method: string | null;
}

export interface PayrollGenerate {
  employee_user_id: number;
  period_start_date: string;
  period_end_date: string;
  payment_date: string;
  base_salary?: number;
  overtime_pay?: number;
  bonuses?: number;
  other_earnings?: number;
  tax_withheld?: number;
  sss_contribution?: number;
  philhealth_contribution?: number;
  pagibig_contribution?: number;
  other_deductions?: number;
  notes?: string | null;
}

export const payrollApi = {
  list: (params?: { employee_user_id?: number; payroll_status?: string; page?: number; limit?: number }) =>
    api.get<{ total: number; items: PayrollRecord[] }>("/admin/payroll", { params }).then((r) => r.data),

  generate: (payload: PayrollGenerate) =>
    api.post<PayrollRecord>("/admin/payroll/generate", payload).then((r) => r.data),

  get: (id: number) =>
    api.get<PayrollRecord>(`/admin/payroll/${id}`).then((r) => r.data),

  transition: (id: number, payload: { action: "approve" | "pay" | "cancel"; payment_method?: string | null }) =>
    api.patch<PayrollRecord>(`/admin/payroll/${id}`, payload).then((r) => r.data),
};

/* ------------------------------------------------------------------ */
/* Reports + Analytics (office + 2FA; PDF deferred)                    */
/* ------------------------------------------------------------------ */

export interface BookingsReport {
  total: number;
  items: { reference_id: string; status: string; down_payment_amount: number }[];
}

export interface RevenueReport {
  grand_total: number;
  by_day: { day: string; total: number }[];
  by_service: { service: string; total: number }[];
}

export interface DashboardData {
  today: { appointments: number; pending_bookings: number; active_technicians: number; revenue: number };
  this_month: { total_bookings: number; completed_bookings: number; cancelled_bookings: number; revenue: number; new_customers: number };
  charts: {
    revenue_by_month: { month: string; total: number }[];
    bookings_by_service: { service: string; count: number }[];
    customer_growth: { month: string; new_customers: number }[];
  };
}

export const reportsApi = {
  bookings: (params: { date_from: string; date_to: string; status?: string }) =>
    api.get<BookingsReport>("/admin/reports/bookings", { params }).then((r) => r.data),

  bookingsCsv: (params: { date_from: string; date_to: string; status?: string }) =>
    api.get<Blob>("/admin/reports/bookings", { params: { ...params, format: "csv" }, responseType: "blob" }).then((r) => r.data),

  revenue: (params: { date_from: string; date_to: string }) =>
    api.get<RevenueReport>("/admin/reports/revenue", { params }).then((r) => r.data),

  dashboard: () =>
    api.get<DashboardData>("/admin/analytics/dashboard").then((r) => r.data),
};

/* ------------------------------------------------------------------ */
/* Notifications (any authenticated office user; 60s badge poll)       */
/* ------------------------------------------------------------------ */

export interface OfficeNotification {
  id: number;
  type: string;
  title: string;
  message: string;
  booking_id: number | null;
  is_read: boolean;
  created_at: string | null;
}

export const notificationsApi = {
  list: (params?: { is_read?: boolean; page?: number; limit?: number }) =>
    api.get<{ total: number; unread_count: number; items: OfficeNotification[] }>("/notifications/me", { params }).then((r) => r.data),

  markRead: (id: number) =>
    api.patch<OfficeNotification>(`/notifications/${id}/read`).then((r) => r.data),

  markAllRead: () =>
    api.post<{ marked_read: number }>("/notifications/read-all").then((r) => r.data),
};

/* ------------------------------------------------------------------ */
/* Catalog admin (office + 2FA; public reads stay in catalogApi)        */
/* ------------------------------------------------------------------ */

export interface ServiceAdminCreate {
  name: string;
  slug: string;
  description: string;
  detailed_description?: string | null;
  base_price: number;
  down_payment_amount: number;
  down_payment_type?: string;
  estimated_duration_minutes?: number | null;
  icon_name?: string | null;
  badge_text?: string | null;
  badge_color?: string | null;
  display_order?: number;
  is_active?: boolean;
  is_featured?: boolean;
}

export interface BrandAdminCreate {
  name: string;
  slug: string;
  description?: string | null;
  logo_url?: string | null;
  is_partner?: boolean;
  badge_text?: string | null;
  badge_color?: string | null;
  display_order?: number;
  is_active?: boolean;
}

export const catalogAdminApi = {
  allServices: () =>
    api.get<ServiceDetail[]>("/admin/services").then((r) => r.data),

  createService: (payload: ServiceAdminCreate) =>
    api.post<ServiceDetail>("/admin/services", payload).then((r) => r.data),

  updateService: (id: number, payload: Partial<ServiceAdminCreate>) =>
    api.patch<ServiceDetail>(`/admin/services/${id}`, payload).then((r) => r.data),

  deleteService: (id: number) =>
    api.delete(`/admin/services/${id}`).then((r) => r.data),

  allBrands: () =>
    api.get<Brand[]>("/admin/brands").then((r) => r.data),

  createBrand: (payload: BrandAdminCreate) =>
    api.post<Brand>(`/admin/brands`, payload).then((r) => r.data),

  updateBrand: (id: number, payload: Partial<BrandAdminCreate>) =>
    api.patch<Brand>(`/admin/brands/${id}`, payload).then((r) => r.data),

  deleteBrand: (id: number) =>
    api.delete(`/admin/brands/${id}`).then((r) => r.data),
};

/* ------------------------------------------------------------------ */
/* Ratings lookup (public per-technician wall + admin delete;          */
/* no admin list endpoint exists — lookup by technician id)            */
/* ------------------------------------------------------------------ */

export interface TechRatingItem {
  id: number;
  rating: number;
  review_text: string | null;
  created_at: string;
}

export const ratingsAdminApi = {
  forTechnician: (technicianId: number, params?: { page?: number; limit?: number }) =>
    api.get<{ technician_id: number; average_rating: number; total: number; items: TechRatingItem[] }>(
      `/technicians/${technicianId}/ratings`, { params },
    ).then((r) => r.data),

  remove: (id: number) =>
    api.delete(`/admin/ratings/${id}`).then((r) => r.data),
};
