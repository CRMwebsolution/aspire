export type CatalogSection = "package" | "addon" | "specialty" | "course";
export type AppointmentKind = "detailing" | "class" | "blocked";
export type AppointmentStatus = "tentative" | "confirmed" | "completed" | "cancelled" | "no_show";
export type EarningMode = "dollar" | "job" | "manual";
export type PointsMethod = EarningMode | "redemption" | "adjustment";

export type CatalogDraft = {
  level_label: string | null;
  name: string;
  summary: string;
  primary_price: number | null;
  primary_price_label: string | null;
  secondary_price: number | null;
  secondary_price_label: string | null;
  is_starting_at: boolean;
  is_quote_only: boolean;
  is_featured: boolean;
  is_active: boolean;
  sort_order: number;
  features: string[];
};

export type CatalogItem = CatalogDraft & {
  id: string;
  business_key: string;
  section: CatalogSection;
  slug: string;
  draft_content: CatalogDraft | null;
  published_at: string;
  created_at: string;
  updated_at: string;
};

export type Reward = {
  id: string;
  business_key: string;
  name: string;
  description: string;
  points_cost: number;
  is_active: boolean;
  sort_order: number;
};

export type LoyaltySettings = {
  business_key: string;
  earning_mode: EarningMode;
  points_per_dollar: number;
  points_per_job: number;
  enrollment_points: number;
  updated_at: string;
};

export type Customer = {
  id: string;
  business_key: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  vehicle_details: string | null;
  notes: string | null;
  starting_points: number;
  created_at: string;
  updated_at: string;
};

export type Appointment = {
  id: string;
  business_key: string;
  customer_id: string | null;
  inquiry_id: string | null;
  catalog_item_id: string | null;
  assigned_user_id: string | null;
  kind: AppointmentKind;
  status: AppointmentStatus;
  title: string;
  starts_at: string;
  ends_at: string;
  all_day: boolean;
  location: string | null;
  vehicle_details: string | null;
  final_amount: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type Inquiry = {
  id: string;
  business_key: string;
  request_type: "detailing" | "class";
  name: string;
  phone: string;
  email: string | null;
  county: string;
  vehicle_type: string | null;
  service_interest: string | null;
  class_interest: string | null;
  preferred_window: string | null;
  notes: string | null;
  status: "new" | "contacted" | "scheduled" | "closed";
  customer_id: string | null;
  appointment_id: string | null;
  created_at: string;
  updated_at: string;
};

export type PointsTransaction = {
  id: string;
  business_key: string;
  customer_id: string;
  appointment_id: string | null;
  method: PointsMethod;
  points_delta: number;
  dollar_amount: number | null;
  description: string;
  created_at: string;
};

export type EmployeeRole = "owner" | "admin" | "employee" | "support";

export type EmployeeAccess = {
  business_key: string;
  user_id: string;
  email: string;
  display_name: string;
  role: EmployeeRole;
  is_active: boolean;
  is_hidden: boolean;
};

export type AppointmentAssignment = {
  business_key: string;
  appointment_id: string;
  user_id: string;
  assigned_at: string;
};

export type DashboardData = {
  customers: Customer[];
  catalog: CatalogItem[];
  rewards: Reward[];
  loyalty: LoyaltySettings;
  appointments: Appointment[];
  assignments: AppointmentAssignment[];
  employees: EmployeeAccess[];
  points: PointsTransaction[];
  inquiries: Inquiry[];
};
