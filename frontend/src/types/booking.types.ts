/** Frontend types mirroring backend/app/schemas/booking.py — do not duplicate. */

export type BookingStatus =
  | "submitted"
  | "proposed"
  | "scheduled"
  | "confirmed"
  | "assigned"
  | "ongoing"
  | "completed"
  | "cancelled"
  | "expired"
  | "rescheduled"
  | "alternative_proposed"
  | "awaiting_payment";

export interface BookingCreate {
  customer_first_name: string;
  customer_last_name: string;
  customer_email: string;
  customer_phone: string;
  region_code: string;
  province_code: string;
  city_municipality_code: string;
  barangay_code: string;
  street_address: string;
  landmark: string;
  service_id: number;
  brand_id: number;
  preferred_date: string; // YYYY-MM-DD
  preferred_time: string | null; // HH:MM or null if not yet scheduled
  problem_description?: string | null;
  turnstile_token?: string | null;
  hold_token?: string | null;
  flex_window?: string | null;
}

/** Public availability: states only, never counts (privacy P1–P3). */
export type SlotState = "open" | "low" | "full" | "closed";

export interface SlotAvailability {
  time: string; // HH:MM
  state: SlotState;
}

export interface DayAvailability {
  date: string; // YYYY-MM-DD
  slots: SlotAvailability[];
}

export interface AvailabilityResponse {
  days: DayAvailability[];
}

export interface SlotHold {
  reference: string;
  hold_token: string;
  expires_at: string;
}

export interface BookingResponse {
  id: number;
  reference_id: string;
  status: BookingStatus;
  customer_first_name: string;
  customer_last_name: string;
  customer_email: string;
  customer_phone: string;
  service_id: number;
  brand_id: number;
  preferred_date: string;
  original_preferred_date?: string; // Customer's original preferred date (YYYY-MM-DD)
  preferred_time: string;
  down_payment_amount: number;
  total_service_cost: number | null;
  expires_at: string | null;
}

export interface TimelineItem {
  from: string | null;
  to: string;
  at: string | null;
  note: string | null;
}

export interface TrackBookingResponse {
  booking_id: number;
  reference_id: string;
  status: BookingStatus;
  customer_name: string;
  service_id: number;
  brand_id: number;
  preferred_date: string;
  preferred_time: string;
  area_barangay: string | null;
  area_city: string | null;
  masked_phone: string;
  technician_name: string | null;
  technician_rating: number | null;
  down_payment_amount: number;
  expires_at: string | null;
  timeline: TimelineItem[];
}

export interface CancelResponse {
  booking_id: number;
  status: string;
  refund_status: string;
  refund_amount: number;
}

export const REFERENCE_RE = /^KJAC-\d{4}-[A-Z0-9]{6}$/;
export const PHONE_RE = /^(09|\+639)\d{9}$/;

/**
 * Office dispatch board (contract): refunds/audit-style {total, items} shape.
 * Nested records stay optional — tolerant until the backend list ships.
 */
export interface AdminBookingTech {
  id: number;
  name: string;
  rating?: number | null;
}

export interface AdminBookingPayment {
  id: number;
  uuid: string;
  status: string;
  amount: number;
  gcash_reference_number?: string | null;
  submitted_at?: string | null;
}

export interface AdminBookingReschedule {
  id: number;
  old_date: string;
  old_time: string;
  new_date: string;
  new_time: string;
  reason: string;
}

export interface AdminBooking extends BookingResponse {
  technician_id: number | null;
  technician?: AdminBookingTech | null;
  service_name?: string | null;
  service_estimated_duration_minutes?: number | null;
  estimated_duration_minutes?: number | null;
  brand_name?: string | null;
  brand_is_partner?: boolean;
  address_text?: string | null;
  address_parts?: {
    street?: string | null;
    barangay?: string | null;
    city?: string | null;
    province?: string | null;
    region?: string | null;
  } | null;
  landmark?: string | null;
  payment?: AdminBookingPayment | null;
  active_reschedule?: AdminBookingReschedule | null;
  timeline?: TimelineItem[];
  created_at?: string | null;
  updated_at?: string | null;
  flex_window?: string | null;
  dispatch_order?: number | null;
}

export interface AdminBookingList {
  total: number;
  items: AdminBooking[];
  summary?: Record<string, number>;
}

export interface AdminBookingParams {
  status?: string;
  search?: string;
  date_from?: string;
  date_to?: string;
  brand_id?: number;
  service_id?: number;
  page?: number;
  limit?: number;
  sort_by?: "newest" | "schedule" | "customer";
  sort_dir?: "asc" | "desc";
}

export interface VacancySlot {
  time: string;
  state: SlotState;
  capacity: number;
  booked: number;
  holds: number;
  left: number;
}

export interface VacancyDay {
  date: string;
  slots: VacancySlot[];
}

export interface VacancyResponse {
  days: VacancyDay[];
}

export interface WaitlistEntry {
  id: number;
  preferred_date: string;
  name: string;
  phone: string;
  email: string | null;
  status: "waiting" | "offered" | "removed";
}

export interface WaitlistOfferResult {
  entry: WaitlistEntry;
  booking_link: string;
  hold_expires_at: string;
}

export interface ReminderRunResult {
  tomorrow_sent: number;
  payment_sent: number;
}

export interface AdminSetting {
  setting_key: string;
  setting_value: string;
  data_type: "string" | "integer" | "boolean" | "json";
  category: string | null;
  description: string | null;
  is_editable: boolean;
}

export interface TravelRow {
  id: number;
  area_level: "region" | "province" | "city";
  area_code: string;
  area_name: string;
  minutes: number;
}

export interface RosterLeave {
  id: number;
  date_from: string;
  date_to: string;
  reason: string | null;
}

export interface RosterTech {
  user_id: number;
  name: string;
  days: boolean[]; // Mon..Sun working flags
  leave: RosterLeave[];
}
