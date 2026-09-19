/** Settings page config: tabs, sections, labels, one-line helpers.
 *
 *  Scope is public content + operations controls only (no CMS creep):
 *  hero/about/announcement/visibility flags stay seeded defaults and have
 *  no editor here. Capacity leftovers (slot_house_reserve, slot_low_threshold,
 *  slot_hold_minutes) are deprecated in the DB and have no editor either.
 */

export type SettingsTabId = "public" | "operations" | "system";

export const TABS: { id: SettingsTabId; label: string }[] = [
  { id: "public", label: "Public" },
  { id: "operations", label: "Operations" },
  { id: "system", label: "System" },
];

export interface SectionDef {
  id: string;
  tab: SettingsTabId;
  title: string;
  /** DB keys edited by a plain field grid. Empty for custom editors. */
  keys: string[];
  /** Custom editor id (hours/faq) instead of a field grid. */
  custom?: "hours" | "faq";
}

export const SECTIONS: SectionDef[] = [
  { id: "contact", tab: "public", title: "Contact Info",
    keys: ["business_email", "business_phone", "contact_phone_secondary", "facebook_url", "contact_address"] },
  { id: "hours", tab: "public", title: "Business Hours", keys: [], custom: "hours" },
  { id: "mission", tab: "public", title: "Mission & Vision",
    keys: ["mission_text", "vision_text"] },
  { id: "faq", tab: "public", title: "FAQ Management", keys: [], custom: "faq" },

  { id: "booking", tab: "operations", title: "Booking Rules",
    keys: ["booking_expiration_hours", "allow_sunday_bookings"] },
  { id: "payment", tab: "operations", title: "Payment Settings",
    keys: ["gcash_account_number", "gcash_account_name"] },
  { id: "bookingRate", tab: "operations", title: "Booking Rate Limiting",
    keys: ["booking_rate_limit_count", "booking_rate_limit_minutes"] },
  { id: "reminders", tab: "operations", title: "Guest Reminders",
    keys: ["reminder_booking_tomorrow_enabled", "reminder_payment_expiring_enabled"] },

  { id: "session", tab: "system", title: "Session & Auth",
    keys: ["session_timeout_minutes", "login_max_attempts", "login_lockout_minutes"] },
  { id: "apiLimits", tab: "system", title: "API Rate Limiting",
    keys: ["api_rate_limit_public", "api_rate_limit_authenticated", "api_rate_limit_admin"] },
  { id: "archive", tab: "system", title: "Archive & Cleanup",
    keys: ["archive_auto_delete_days"] },
];

/** Structured-hours editor keys + legacy display string it keeps in sync. */
export const HOURS_KEYS = ["business_open_days", "business_open_time", "business_close_time"] as const;
export const HOURS_LEGACY_KEY = "business_hours";
export const FAQ_ITEMS_KEY = "faq_items";
export const SHOW_FAQ_KEY = "show_faq";
export const SUNDAY_KEY = "allow_sunday_bookings";

/** Short field labels (label + control only, no key names in UI). */
export const LABELS: Record<string, string> = {
  business_email: "Email",
  business_phone: "Phone",
  contact_phone_secondary: "2nd phone",
  facebook_url: "Facebook URL",
  contact_address: "Address",
  mission_text: "Mission",
  vision_text: "Vision",
  booking_expiration_hours: "Request expiry (hrs)",
  allow_sunday_bookings: "Allow Sunday",
  gcash_account_number: "GCash number",
  gcash_account_name: "GCash name",
  booking_rate_limit_count: "Max bookings",
  booking_rate_limit_minutes: "Window (min)",
  reminder_booking_tomorrow_enabled: "Tomorrow reminders",
  reminder_payment_expiring_enabled: "Payment-expiry reminders",
  session_timeout_minutes: "Session timeout (min)",
  login_max_attempts: "Max login attempts",
  login_lockout_minutes: "Lockout (min)",
  api_rate_limit_public: "Public/min",
  api_rate_limit_authenticated: "Authenticated/min",
  api_rate_limit_admin: "Admin/min",
  archive_auto_delete_days: "Auto-delete (days)",
};

/** One-line helpers (locked copy). */
export const HELPERS: Record<string, string> = {
  business_email: "Shown in the footer and contact section.",
  business_phone: "Shown in the footer and contact section.",
  contact_phone_secondary: "Optional. Hidden when empty.",
  facebook_url: "Links the Facebook button on the contact section.",
  contact_address: "Shown in the footer and contact section. Powers the maps link.",
  mission_text: "Shown on the Mission & Vision section. Empty hides it.",
  vision_text: "Shown on the Mission & Vision section. Empty hides it.",
  booking_expiration_hours: "Hours before an unproposed request expires. Payment deadline is the proposed start.",
  allow_sunday_bookings: "Lets customers pick Sundays. Needs Sunday in Business Hours.",
  gcash_account_number: "Where customers send the down payment. Shown at payment step.",
  gcash_account_name: "Account name shown beside the GCash number.",
  booking_rate_limit_count: "Bookings allowed per window, per user.",
  booking_rate_limit_minutes: "Time window for the booking limit.",
  reminder_booking_tomorrow_enabled: "Sends reminders for tomorrow's bookings.",
  reminder_payment_expiring_enabled: "Warns about payments expiring within 2 hours.",
  session_timeout_minutes: "Admin logout after inactivity.",
  login_max_attempts: "Failed logins before lockout.",
  login_lockout_minutes: "How long a locked account stays locked.",
  api_rate_limit_public: "Public API requests allowed per minute.",
  api_rate_limit_authenticated: "Logged-in API requests allowed per minute.",
  api_rate_limit_admin: "Admin API requests allowed per minute.",
  archive_auto_delete_days: "Archived records permanently deleted after this.",
};

/** String keys rendered as textarea instead of a single-line input. */
export const LONG_TEXT_KEYS = new Set(["mission_text", "vision_text"]);

export function labelFor(key: string): string {
  return LABELS[key] ?? key;
}

export function helperFor(key: string): string | undefined {
  return HELPERS[key];
}
