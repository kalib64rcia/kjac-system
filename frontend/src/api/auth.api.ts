import { api } from "./axios";
import type { AuthUser } from "@/types/content.types";

export interface TwoFaRequestResult {
  channel: string;
  masked_email: string;
  expires_in_minutes: number;
}

export interface TwoFaVerifyResult {
  two_fa_token: string;
  expires_in_hours: number;
}

/** Backend: POST /v1/auth/* — Supabase JWT required; passwords never touch us. */
export const authApi = {
  me: () => api.get<AuthUser>("/auth/me").then((r) => r.data),

  sync: (payload: { first_name: string; last_name: string; phone: string }) =>
    api.post<AuthUser>("/auth/sync", payload).then((r) => r.data),

  requestTwoFa: () =>
    api.post<TwoFaRequestResult>("/auth/2fa/request", {}).then((r) => r.data),

  verifyTwoFa: (code: string) =>
    api.post<TwoFaVerifyResult>("/auth/2fa/verify", { code }).then((r) => r.data),
};
