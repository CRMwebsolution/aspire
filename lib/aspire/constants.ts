export const ASPIRE_BUSINESS_KEY = "aspire-mobile-detailing";

export const catalogSections = ["package", "addon", "specialty", "course"] as const;
export const appointmentKinds = ["detailing", "class", "blocked"] as const;
export const appointmentStatuses = ["tentative", "confirmed", "completed", "cancelled", "no_show"] as const;
export const earningModes = ["dollar", "job", "manual"] as const;

export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY are required.");
  }

  return { url, key };
}
