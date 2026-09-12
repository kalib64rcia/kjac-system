/** Landing content keys (category "landing") + auth user. Backend: system_settings. */

export interface LandingContent {
  hero_title: string;
  hero_description: string;
  about_text: string;
  mission_text: string;
  vision_text: string;
  contact_phone: string;
  contact_phone_secondary: string;
  contact_email: string;
  contact_address: string;
  business_hours: string;
  facebook_url: string;
  announcement_text: string;
  announcement_enabled: boolean;
  faq_items: { q: string; a: string }[];
  show_testimonials: boolean;
  show_gallery: boolean;
  show_faq: boolean;
  allow_sunday_bookings: boolean;
}

export const LANDING_DEFAULTS: LandingContent = {
  hero_title: "KLEIN & JUSTIN AIRCONDITIONING",
  hero_description:
    "Laguna's authorized Daikin partner for aircon installation, repair, and maintenance — certified technicians, genuine parts.",
  about_text:
    "Klein & Justin Airconditioning has been serving Laguna with professional aircon installation, repair, and maintenance services for homes and businesses.",
  mission_text: "",
  vision_text: "",
  contact_phone: "0926-633-3129",
  contact_phone_secondary: "",
  contact_email: "abadeciomar@yahoo.com",
  contact_address: "060 Sitio Narra, Brgy. Labuin, Sta. Cruz, Laguna",
  business_hours: "Monday–Saturday, 8:00 AM – 5:00 PM",
  facebook_url: "https://facebook.com/abadeciomar",
  announcement_text: "",
  announcement_enabled: false,
  faq_items: [],
  show_testimonials: true,
  show_gallery: true,
  show_faq: true,
  allow_sunday_bookings: false,
};

export interface AuthUser {
  id: string;
  email: string;
  role: "owner" | "staff" | "admin" | "customer" | "technician";
  first_name: string;
  last_name: string;
  position?: string | null;
  can_approve_technicians?: boolean;
  can_execute_refunds?: boolean;
  can_view_audit?: boolean;
}
