import { api } from "./axios";
import { LANDING_DEFAULTS, type LandingContent } from "@/types/content.types";

interface SettingRow {
  setting_key: string;
  setting_value: string;
  data_type: "string" | "integer" | "boolean" | "json";
}

function coerce(row: SettingRow): string | number | boolean | unknown {
  switch (row.data_type) {
    case "integer":
      return Number.parseInt(row.setting_value, 10);
    case "boolean":
      return row.setting_value === "true";
    case "json":
      try {
        return JSON.parse(row.setting_value) as unknown;
      } catch {
        return row.setting_value;
      }
    default:
      return row.setting_value;
  }
}

/**
 * Public landing content. Served by GET /v1/content/landing (landing-category
 * settings only). Falls back to built-in defaults so the site never breaks.
 */
export const contentApi = {
  landing: async (): Promise<LandingContent> => {
    try {
      const { data } = await api.get<SettingRow[]>("/content/landing");
      const map = new Map(data.map((r) => [r.setting_key, coerce(r)]));
      const get = <T,>(key: string, fallback: T): T =>
        (map.get(key) as T | undefined) ?? fallback;
      return {
        hero_title: get("hero_title", LANDING_DEFAULTS.hero_title),
        hero_description: get(
          "hero_description",
          LANDING_DEFAULTS.hero_description,
        ),
        about_text: get("about_text", LANDING_DEFAULTS.about_text),
        mission_text: get("mission_text", LANDING_DEFAULTS.mission_text),
        vision_text: get("vision_text", LANDING_DEFAULTS.vision_text),
        contact_phone: get("contact_phone", LANDING_DEFAULTS.contact_phone),
        contact_phone_secondary: get(
          "contact_phone_secondary",
          LANDING_DEFAULTS.contact_phone_secondary,
        ),
        contact_email: get("contact_email", LANDING_DEFAULTS.contact_email),
        contact_address: get(
          "contact_address",
          LANDING_DEFAULTS.contact_address,
        ),
        business_hours: get("business_hours", LANDING_DEFAULTS.business_hours),
        facebook_url: get("facebook_url", LANDING_DEFAULTS.facebook_url),
        announcement_text: get(
          "announcement_text",
          LANDING_DEFAULTS.announcement_text,
        ),
        announcement_enabled: get(
          "announcement_enabled",
          LANDING_DEFAULTS.announcement_enabled,
        ),
        faq_items: get("faq_items", LANDING_DEFAULTS.faq_items),
        show_testimonials: get(
          "show_testimonials",
          LANDING_DEFAULTS.show_testimonials,
        ),
        show_gallery: get("show_gallery", LANDING_DEFAULTS.show_gallery),
        show_faq: get("show_faq", LANDING_DEFAULTS.show_faq),
        allow_sunday_bookings: get(
          "allow_sunday_bookings",
          LANDING_DEFAULTS.allow_sunday_bookings,
        ),
      };
    } catch {
      return LANDING_DEFAULTS;
    }
  },
};
