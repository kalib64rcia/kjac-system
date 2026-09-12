import { z } from "zod";
import { PHONE_RE, REFERENCE_RE } from "@/types/booking.types";

/** Mirrors backend BookingCreate limits; server re-validates everything. */
export const bookingSchema = z.object({
  customer_first_name: z.string().trim().min(1, "First name is required").max(100),
  customer_last_name: z.string().trim().min(1, "Last name is required").max(100),
  customer_email: z.string().trim().email("Enter a valid email address").max(255),
  customer_phone: z
    .string()
    .trim()
    .regex(PHONE_RE, "Use 09XXXXXXXXX or +639XXXXXXXXX"),
  region_code: z.string().min(1, "Select a region"),
  province_code: z.string().min(1, "Select a province"),
  city_municipality_code: z.string().min(1, "Select a city/municipality"),
  barangay_code: z.string().min(1, "Select a barangay"),
  street_address: z.string().trim().min(5, "Street address needs at least 5 characters").max(500),
  landmark: z.string().trim().min(1, "Landmark is required").max(255),
  service_id: z.number({ error: "Select a service" }).int().positive("Select a service"),
  brand_id: z.number({ error: "Select a brand" }).int().positive("Select a brand"),
  preferred_date: z.string().min(1, "Select a date"),
  preferred_time: z.string().min(1, "Select a time slot"),
  problem_description: z.string().max(1000).optional().or(z.literal("")),
  agree_payment: z.literal(true, { error: "Please accept the payment policy" }),
  agree_terms: z.literal(true, { error: "Please accept the terms of service" }),
});

export type BookingFormValues = z.infer<typeof bookingSchema>;

export const trackSchema = z.object({
  reference_id: z
    .string()
    .trim()
    .toUpperCase()
    .regex(REFERENCE_RE, "Format: KJAC-YYYY-XXXXXX"),
  email: z.string().trim().email("Enter a valid email address"),
});

export type TrackFormValues = z.infer<typeof trackSchema>;
