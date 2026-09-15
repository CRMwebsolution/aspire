import { createClient } from "@supabase/supabase-js";
import { ASPIRE_BUSINESS_KEY, getSupabaseEnv } from "@/lib/aspire/constants";
import type { CatalogItem, LoyaltySettings, Reward } from "@/lib/aspire/types";

const now = "2026-01-01T00:00:00.000Z";

function catalogItem(
  section: CatalogItem["section"],
  slug: string,
  name: string,
  summary: string,
  primaryPrice: number | null,
  options: Partial<CatalogItem> = {},
): CatalogItem {
  return {
    id: `fallback-${slug}`,
    business_key: ASPIRE_BUSINESS_KEY,
    section,
    slug,
    level_label: null,
    name,
    summary,
    primary_price: primaryPrice,
    primary_price_label: null,
    secondary_price: null,
    secondary_price_label: null,
    is_starting_at: false,
    is_quote_only: false,
    is_featured: false,
    is_active: true,
    sort_order: 0,
    features: [],
    draft_content: null,
    published_at: now,
    created_at: now,
    updated_at: now,
    ...options,
  };
}

export const fallbackCatalog: CatalogItem[] = [
  catalogItem("package", "exterior-wash", "Exterior Wash", "A crisp maintenance wash with polish and protection.", 34.95, { secondary_price: 39.95, primary_price_label: "Cars / mid-size", secondary_price_label: "Large SUV / truck / van", is_starting_at: true, sort_order: 10, features: ["Wash & dry", "Quick polish / sealer", "Windows & door jambs", "Wheels & tire dressing"] }),
  catalogItem("package", "exterior-detail", "Exterior Detail", "Decontamination and shine for tired exterior surfaces.", 74.95, { secondary_price: 79.95, primary_price_label: "Cars / mid-size", secondary_price_label: "Large SUV / truck / van", is_starting_at: true, sort_order: 20, features: ["Foam bath", "Clay bar", "Bug & tar removal", "Quick polish / sealer"] }),
  catalogItem("package", "interior-clean", "Interior Clean", "A practical interior reset for your daily driver.", 99.95, { secondary_price: 109.95, primary_price_label: "Cars / mid-size", secondary_price_label: "Large SUV / truck / van", is_starting_at: true, sort_order: 30, features: ["Full vacuum", "Hard-surface wipe-down", "Leather, plastic & trim", "Windows & door jambs"] }),
  catalogItem("package", "standard-detail", "Standard Detail", "Our streamlined inside-and-out maintenance package.", 119.95, { secondary_price: 129.95, primary_price_label: "Cars / mid-size", secondary_price_label: "Large SUV / truck / van", is_starting_at: true, sort_order: 40, features: ["Interior cleaning", "Exterior cleaning", "Windows inside & out", "Wheels & tires"] }),
  catalogItem("package", "interior-detail", "Interior Detail", "A deeper clean focused on stains, surfaces and comfort.", 149.95, { secondary_price: 159.95, primary_price_label: "Cars / mid-size", secondary_price_label: "Large SUV / truck / van", is_starting_at: true, sort_order: 50, features: ["Full vacuum", "Surface stain removal", "Scrub & clean all trim", "Leather & surface conditioning"] }),
  catalogItem("package", "full-detail", "Full Detail", "The complete interior and exterior transformation.", 269.95, { secondary_price: 289.95, primary_price_label: "Cars / mid-size", secondary_price_label: "Large SUV / truck / van", is_starting_at: true, is_featured: true, sort_order: 60, features: ["Interior Detail package", "Exterior Detail package", "Clay-bar decontamination", "Conditioning & protection"] }),
  catalogItem("addon", "headlight-renewal", "Headlight renewal", "", 49.95, { sort_order: 10 }),
  catalogItem("addon", "steam-cleaning", "Steam cleaning", "", 59.95, { is_starting_at: true, sort_order: 20 }),
  catalogItem("addon", "engine-bay", "Engine bay", "", 64.95, { sort_order: 30 }),
  catalogItem("addon", "deep-shampoo", "Deep shampoo", "", 89.95, { is_starting_at: true, sort_order: 40 }),
  catalogItem("specialty", "ceramic-graphene-coating", "Ceramic & graphene coating", "Professional preparation and application with an in-person consultation.", 849.95, { level_label: "01", is_starting_at: true, sort_order: 10 }),
  catalogItem("specialty", "exterior-reconditioning", "Exterior re-conditioning", "Buff and polish to improve gloss and address visible paint defects. Test spots recommended.", 299.95, { level_label: "02", is_starting_at: true, sort_order: 20 }),
  catalogItem("specialty", "specialty-vehicles", "Boats, RVs & specialty vehicles", "Mobile detailing for boats, side-by-sides, motor homes, campers and RVs.", null, { level_label: "03", is_quote_only: true, sort_order: 30 }),
  catalogItem("course", "level-1-basic-core", "Basic Core Auto Detailing", "Interior, exterior, reconditioning, stains, odors and extraction.", 500, { level_label: "LEVEL 1", sort_order: 10 }),
  catalogItem("course", "level-2-intermediate", "Intermediate", "Paint correction, sanding, leveling and scratch-removal technique.", 600, { level_label: "LEVEL 2", sort_order: 20 }),
  catalogItem("course", "level-3-advanced", "Advanced", "Ceramic and graphene coatings, SOPs and business essentials.", 700, { level_label: "LEVEL 3", sort_order: 30 }),
  catalogItem("course", "master-all-levels", "All three levels", "A complete progression from fundamentals through advanced coatings.", 1500, { level_label: "MASTER", sort_order: 40 }),
];

export const fallbackRewards: Reward[] = [
  { id: "fallback-25", business_key: ASPIRE_BUSINESS_KEY, name: "Cleaning, trim or merchandise reward", description: "Cleaning, trim or select merchandise rewards.", points_cost: 25, is_active: true, sort_order: 10 },
  { id: "fallback-50", business_key: ASPIRE_BUSINESS_KEY, name: "Leather, engine bay or apparel reward", description: "Leather care, engine bay service or select apparel.", points_cost: 50, is_active: true, sort_order: 20 },
  { id: "fallback-100", business_key: ASPIRE_BUSINESS_KEY, name: "Free Standard Cleaning", description: "Redeem for one Standard Cleaning.", points_cost: 100, is_active: true, sort_order: 30 },
  { id: "fallback-200", business_key: ASPIRE_BUSINESS_KEY, name: "Free Deep Shampoo", description: "Redeem for one Deep Shampoo service.", points_cost: 200, is_active: true, sort_order: 40 },
];

export const fallbackLoyalty: LoyaltySettings = {
  business_key: ASPIRE_BUSINESS_KEY,
  earning_mode: "manual",
  points_per_dollar: 1,
  points_per_job: 1,
  enrollment_points: 50,
  updated_at: now,
};

function sortByOrder<T extends { sort_order: number }>(items: T[]) {
  return [...items].sort((a, b) => a.sort_order - b.sort_order);
}

export async function getPublicSiteData() {
  try {
    const { url, key } = getSupabaseEnv();
    const supabase = createClient(url, key, { auth: { persistSession: false } });
    const [catalogResult, rewardsResult, loyaltyResult] = await Promise.all([
      supabase.from("aspire_catalog_items").select("id,business_key,section,slug,level_label,name,summary,primary_price,primary_price_label,secondary_price,secondary_price_label,is_starting_at,is_quote_only,is_featured,is_active,sort_order,features,published_at,created_at,updated_at").eq("business_key", ASPIRE_BUSINESS_KEY).eq("is_active", true).order("sort_order"),
      supabase.from("aspire_rewards").select("id,business_key,name,description,points_cost,is_active,sort_order").eq("business_key", ASPIRE_BUSINESS_KEY).eq("is_active", true).order("sort_order"),
      supabase.from("aspire_loyalty_settings").select("business_key,enrollment_points").eq("business_key", ASPIRE_BUSINESS_KEY).maybeSingle(),
    ]);

    const catalog = catalogResult.data?.length
      ? sortByOrder(catalogResult.data.map((item) => ({ ...item, draft_content: null })) as CatalogItem[])
      : fallbackCatalog;
    const rewards = rewardsResult.data?.length ? sortByOrder(rewardsResult.data as Reward[]) : fallbackRewards;
    const loyalty = loyaltyResult.data
      ? { ...fallbackLoyalty, ...loyaltyResult.data }
      : fallbackLoyalty;

    return { catalog, rewards, loyalty };
  } catch {
    return { catalog: fallbackCatalog, rewards: fallbackRewards, loyalty: fallbackLoyalty };
  }
}

export function formatPrice(item: Pick<CatalogItem, "primary_price" | "is_starting_at" | "is_quote_only">) {
  if (item.is_quote_only) return "Quote only";
  if (item.primary_price === null) return "Contact us";
  const price = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: item.primary_price % 1 ? 2 : 0 }).format(item.primary_price);
  return item.is_starting_at ? `from ${price}` : price;
}
