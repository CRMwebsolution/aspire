import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnv } from "@/lib/aspire/constants";

export function createClient() {
  const { url, key } = getSupabaseEnv();
  return createBrowserClient(url, key);
}
