import { z } from "zod";

/** Admin credentials — verified by Supabase Auth directly, never by us. */
export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address").max(255),
  password: z.string().min(1, "Password is required").max(128),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

/** 6-digit email code from POST /v1/auth/2fa/request. */
export const twoFaSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter the 6-digit code from your email"),
});

export type TwoFaFormValues = z.infer<typeof twoFaSchema>;

/** First-run profile completion (brand-new Supabase user, no row yet). */
export const profileSchema = z.object({
  first_name: z.string().trim().min(1, "First name is required").max(100),
  last_name: z.string().trim().min(1, "Last name is required").max(100),
  phone: z
    .string()
    .trim()
    .regex(/^(09|\+639)\d{9}$/, "Use 09XXXXXXXXX or +639XXXXXXXXX"),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;

export const forgotSchema = z.object({
  email: z.string().trim().email("Enter a valid email address").max(255),
});

export type ForgotFormValues = z.infer<typeof forgotSchema>;

export const resetSchema = z
  .object({
    password: z.string().min(8, "Password needs at least 8 characters").max(128),
    confirm: z.string().min(1, "Confirm your new password"),
  })
  .refine((v) => v.password === v.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  });

export type ResetFormValues = z.infer<typeof resetSchema>;
