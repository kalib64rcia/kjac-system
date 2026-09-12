/** Frontend types mirroring backend/app/schemas/catalog.py + payment.py (PsgcItem). */

export interface ServiceImage {
  image_url: string;
  image_type: string | null;
  caption: string | null;
}

export interface Service {
  id: number;
  name: string;
  slug: string;
  description: string;
  base_price: number;
  down_payment_amount: number;
  down_payment_type: "fixed" | "percentage";
  estimated_duration_minutes: number | null;
  estimated_duration_display: string | null;
  icon_name: string | null;
  badge_text: string | null;
  is_active: boolean;
  is_featured: boolean;
  images: ServiceImage[];
}

export interface ServiceDetail extends Service {
  detailed_description: string | null;
  process_steps: unknown;
}

export interface BrandImage {
  image_url: string;
  image_type: string | null;
  caption: string | null;
}

export interface Brand {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  is_partner: boolean;
  badge_text: string | null;
  is_active: boolean;
  images: BrandImage[];
}

export interface PsgcItem {
  code: string;
  name: string;
}

export interface PaymentResponse {
  id: number;
  booking_id: number;
  payment_type: string;
  amount: number;
  payment_method: string | null;
  gcash_reference_number: string | null;
  status: string;
}
