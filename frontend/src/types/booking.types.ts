/** Frontend types mirroring backend/app/schemas/booking.py — do not duplicate. */

export type BookingStatus =
  | "submitted"
  | "pending"
  | "confirmed"
  | "ongoing"
  | "completed"
  | "cancelled"
  | "expired"
  | "rescheduled";

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
  preferred_time: string; // HH:MM
  problem_description?: string | null;
  turnstile_token?: string | null;
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
