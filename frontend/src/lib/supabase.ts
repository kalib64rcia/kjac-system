import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env";

let client: SupabaseClient | null = null;

/** Supabase client for direct auth (Option A — backend never sees passwords). */
export function getSupabase(): SupabaseClient | null {
  if (client) return client;
  if (!env.supabaseUrl || !env.supabasePublishableKey) return null;
  client = createClient(env.supabaseUrl, env.supabasePublishableKey);
  return client;
}
