import axios, { type AxiosError } from "axios";
import { env } from "@/lib/env";
import { ApiError, type ApiErrorBody } from "./errors";

export const api = axios.create({
  baseURL: env.apiUrl ?? "http://localhost:8000/v1",
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
});

let accessToken: string | null = null;
let twoFaTicket: string | null = sessionStorage.getItem("kjac-2fa");

/** Called by the auth store after Supabase sign-in (admin JWT thread-through). */
export function setAccessToken(token: string | null): void {
  accessToken = token;
}

/** Admin 2FA ticket — sent as X-Admin-2FA on every admin call. */
export function setTwoFaTicket(ticket: string | null): void {
  twoFaTicket = ticket;
  if (ticket) sessionStorage.setItem("kjac-2fa", ticket);
  else sessionStorage.removeItem("kjac-2fa");
}

export function getTwoFaTicket(): string | null {
  return twoFaTicket;
}

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  if (twoFaTicket) {
    config.headers["X-Admin-2FA"] = twoFaTicket;
  }
  return config;
});

function toApiError(error: AxiosError): ApiError {
  const data = error.response?.data as
    | { error?: ApiErrorBody; message?: string }
    | undefined;
  const status = error.response?.status ?? 0;
  if (data?.error) {
    return new ApiError(
      data.error.code,
      data.error.message,
      status,
      data.error.details ?? [],
    );
  }
  if (error.code === "ECONNABORTED") {
    return new ApiError(
      "NETWORK_TIMEOUT",
      "Connection timed out. Check your internet and try again.",
      status,
    );
  }
  if (!error.response) {
    // No reply at all: either this device is offline, or the server never
    // answered (down, restarting — or it crashed and the browser hid the
    // error reply). navigator.onLine splits the two honestly.
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      return new ApiError(
        "NETWORK_OFFLINE",
        "You appear to be offline. Check your internet and try again.",
        status,
      );
    }
    return new ApiError(
      "NETWORK_ERROR",
      "The server didn't respond. It may be down or restarting. Try again in a moment.",
      status,
    );
  }
  return new ApiError(
    `HTTP_${status}`,
    data?.message ?? "Something went wrong. Please try again.",
    status,
  );
}

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Auto-logout on 401 (session/auth expired)
    if (error.response?.status === 401) {
      // Dynamic import: axios module is ESM (no require in Vite).
      void import("@/stores/auth.store").then(({ useAuthStore }) => {
        useAuthStore.getState().signOut().catch(() => {
          /* ignore logout errors */
        });
      });

      // Redirect to the office login with session expired flag
      if (typeof window !== "undefined") {
        const currentUrl = window.location.pathname;
        // Only redirect if not already on an auth page
        if (!currentUrl.includes("/admin/login")) {
          window.location.href = "/admin/login?reason=session_expired";
        }
      }
    }
    return Promise.reject(toApiError(error));
  },
);
