/** Typed access to Vite env — never commit real values (see backend R4). */
export const env = {
  apiUrl: import.meta.env.VITE_API_URL as string | undefined,
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL as string | undefined,
  supabasePublishableKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as
    | string
    | undefined,
  turnstileSiteKey: import.meta.env.VITE_TURNSTILE_SITE_KEY as
    | string
    | undefined,
};

if (!env.apiUrl && import.meta.env.DEV) {
  // eslint-disable-next-line no-console
  console.warn("[kjac] VITE_API_URL is not set — API calls will fail.");
}
