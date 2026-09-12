import { create } from "zustand";
import { authApi } from "@/api/auth.api";
import { ApiError } from "@/api/errors";
import { getTwoFaTicket, setAccessToken, setTwoFaTicket } from "@/api/axios";
import { getSupabase } from "@/lib/supabase";
import type { AuthUser } from "@/types/content.types";

interface TwoFaState {
  maskedEmail: string;
  expiresInMinutes: number;
  requestedAt: number;
}

interface AuthState {
  user: AuthUser | null;
  ticket: string | null;
  twoFa: TwoFaState | null;
  needsProfile: boolean;
  initialized: boolean;
  init: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  completeProfile: (firstName: string, lastName: string, phone: string) => Promise<void>;
  requestCode: () => Promise<void>;
  verifyCode: (code: string) => Promise<void>;
  backToCredentials: () => void;
  signOut: () => Promise<void>;
}

function friendly(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 429) return "Too many attempts. Wait a few minutes and try again.";
    return error.message;
  }
  if (error instanceof Error) {
    if (/invalid login credentials/i.test(error.message)) {
      return "Wrong email or password.";
    }
    if (/email not confirmed/i.test(error.message)) {
      return "Check your inbox and confirm your email first.";
    }
    return error.message;
  }
  return "Something went wrong. Please try again.";
}

/**
 * Admin session via Supabase Auth direct (Option A — backend never sees
 * passwords) + backend email-code 2FA ticket (X-Admin-2FA on admin calls).
 */
export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  ticket: getTwoFaTicket(),
  twoFa: null,
  needsProfile: false,
  initialized: false,

  init: async () => {
    const supabase = getSupabase();
    if (!supabase) {
      set({ initialized: true });
      return;
    }
    const { data } = await supabase.auth.getSession();
    const session = data.session;
    setAccessToken(session?.access_token ?? null);
    if (!session?.user) {
      setTwoFaTicket(null);
      set({ user: null, ticket: null, initialized: true });
      return;
    }
    try {
      const me = await authApi.me();
      set({ user: me, ticket: getTwoFaTicket(), initialized: true });
    } catch {
      set({ user: null, initialized: true });
    }
  },

  signIn: async (email, password) => {
    const supabase = getSupabase();
    if (!supabase) throw new Error("Authentication is not configured.");
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      setAccessToken(data.session?.access_token ?? null);
      let me: AuthUser;
      try {
        me = await authApi.me();
      } catch (e) {
        // Valid Supabase session but no profile row yet (brand-new user):
        // collect name/phone once, then sync links or creates the row
        // (invite match, owner bootstrap, or plain customer).
        if (e instanceof ApiError && e.status === 401) {
          set({ needsProfile: true });
          return;
        }
        throw new Error(friendly(e));
      }
      if (me.role !== "owner" && me.role !== "staff") {
        await supabase.auth.signOut();
        setAccessToken(null);
        throw new Error("This account is not an office account.");
      }
      set({ user: me });
      await get().requestCode();
    } catch (e) {
      throw new Error(friendly(e));
    }
  },

  completeProfile: async (firstName, lastName, phone) => {
    try {
      const me = await authApi.sync({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim(),
      });
      if (me.role !== "owner" && me.role !== "staff") {
        await getSupabase()?.auth.signOut();
        setAccessToken(null);
        set({ needsProfile: false });
        throw new Error("This account is not an office account.");
      }
      set({ user: me, needsProfile: false });
      await get().requestCode();
    } catch (e) {
      throw new Error(friendly(e));
    }
  },

  requestCode: async () => {
    try {
      const res = await authApi.requestTwoFa();
      set({
        twoFa: {
          maskedEmail: res.masked_email,
          expiresInMinutes: res.expires_in_minutes,
          requestedAt: Date.now(),
        },
      });
    } catch (e) {
      throw new Error(friendly(e));
    }
  },

  verifyCode: async (code) => {
    try {
      const res = await authApi.verifyTwoFa(code);
      setTwoFaTicket(res.two_fa_token);
      set({ ticket: res.two_fa_token, twoFa: null });
    } catch (e) {
      throw new Error(friendly(e));
    }
  },

  backToCredentials: () => set({ twoFa: null, needsProfile: false }),

  signOut: async () => {
    const supabase = getSupabase();
    if (supabase) await supabase.auth.signOut();
    setAccessToken(null);
    setTwoFaTicket(null);
    set({ user: null, ticket: null, twoFa: null, needsProfile: false });
  },
}));
