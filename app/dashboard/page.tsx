import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { EmployeeDashboard } from "@/components/employee/employee-dashboard";
import { ASPIRE_BUSINESS_KEY } from "@/lib/aspire/constants";
import type { DashboardData, EmployeeAccess, LoyaltySettings } from "@/lib/aspire/types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Employee dashboard | Aspire",
  robots: { index: false, follow: false },
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/login");

  const { data: access } = await supabase
    .from("aspire_employee_access")
    .select("business_key,user_id,email,display_name,role,is_active,is_hidden")
    .eq("business_key", ASPIRE_BUSINESS_KEY)
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  if (!access) redirect("/login?error=not-authorized");

  const employeeAccess = access as EmployeeAccess;
  const canUseAdminDashboard = employeeAccess.role === "owner" || employeeAccess.role === "admin" || employeeAccess.role === "support";

  if (!canUseAdminDashboard) {
    const [appointments, assignments, employees] = await Promise.all([
      supabase.from("aspire_appointments").select("id,business_key,customer_id,inquiry_id,catalog_item_id,assigned_user_id,kind,status,title,starts_at,ends_at,all_day,location,vehicle_details,final_amount,notes,created_at,updated_at").eq("business_key", ASPIRE_BUSINESS_KEY).order("starts_at"),
      supabase.from("aspire_appointment_assignments").select("business_key,appointment_id,user_id,assigned_at").eq("business_key", ASPIRE_BUSINESS_KEY),
      supabase.from("aspire_employee_access").select("business_key,user_id,email,display_name,role,is_active,is_hidden").eq("business_key", ASPIRE_BUSINESS_KEY).eq("is_hidden", false).in("role", ["employee", "admin"]).order("display_name"),
    ]);

    const firstError = [appointments, assignments, employees].find((result) => result.error)?.error;
    if (firstError) throw new Error(`Unable to load the Aspire calendar: ${firstError.message}`);

    const calendarData: DashboardData = {
      customers: [],
      catalog: [],
      rewards: [],
      loyalty: {
        business_key: ASPIRE_BUSINESS_KEY,
        earning_mode: "manual",
        points_per_dollar: 1,
        points_per_job: 1,
        enrollment_points: 0,
        updated_at: "",
      },
      appointments: appointments.data ?? [],
      assignments: assignments.data ?? [],
      employees: employees.data ?? [],
      points: [],
      inquiries: [],
    };

    return <EmployeeDashboard initialData={calendarData} access={employeeAccess} userId={userId} />;
  }

  const [customers, catalog, rewards, loyalty, appointments, assignments, employees, points, inquiries] = await Promise.all([
    supabase.from("aspire_customers").select("id,business_key,full_name,phone,email,vehicle_details,notes,starting_points,created_at,updated_at").eq("business_key", ASPIRE_BUSINESS_KEY).order("full_name"),
    supabase.from("aspire_catalog_items").select("id,business_key,section,slug,level_label,name,summary,primary_price,primary_price_label,secondary_price,secondary_price_label,is_starting_at,is_quote_only,is_featured,is_active,sort_order,features,draft_content,published_at,created_at,updated_at").eq("business_key", ASPIRE_BUSINESS_KEY).order("section").order("sort_order"),
    supabase.from("aspire_rewards").select("id,business_key,name,description,points_cost,is_active,sort_order").eq("business_key", ASPIRE_BUSINESS_KEY).order("sort_order"),
    supabase.from("aspire_loyalty_settings").select("business_key,earning_mode,points_per_dollar,points_per_job,enrollment_points,updated_at").eq("business_key", ASPIRE_BUSINESS_KEY).single(),
    supabase.from("aspire_appointments").select("id,business_key,customer_id,inquiry_id,catalog_item_id,assigned_user_id,kind,status,title,starts_at,ends_at,all_day,location,vehicle_details,final_amount,notes,created_at,updated_at").eq("business_key", ASPIRE_BUSINESS_KEY).order("starts_at"),
    supabase.from("aspire_appointment_assignments").select("business_key,appointment_id,user_id,assigned_at").eq("business_key", ASPIRE_BUSINESS_KEY),
    supabase.from("aspire_employee_access").select("business_key,user_id,email,display_name,role,is_active,is_hidden").eq("business_key", ASPIRE_BUSINESS_KEY).eq("is_hidden", false).in("role", ["employee", "admin"]).order("display_name"),
    supabase.from("aspire_points_transactions").select("id,business_key,customer_id,appointment_id,method,points_delta,dollar_amount,description,created_at").eq("business_key", ASPIRE_BUSINESS_KEY).order("created_at", { ascending: false }),
    supabase.from("aspire_assessment_requests").select("id,business_key,request_type,name,phone,email,county,vehicle_type,service_interest,class_interest,preferred_window,notes,status,customer_id,appointment_id,created_at,updated_at").eq("business_key", ASPIRE_BUSINESS_KEY).order("created_at", { ascending: false }),
  ]);

  const firstError = [customers, catalog, rewards, loyalty, appointments, assignments, employees, points, inquiries].find((result) => result.error)?.error;
  if (firstError) throw new Error(`Unable to load the Aspire dashboard: ${firstError.message}`);

  const data: DashboardData = {
    customers: customers.data ?? [],
    catalog: catalog.data ?? [],
    rewards: rewards.data ?? [],
    loyalty: loyalty.data as LoyaltySettings,
    appointments: appointments.data ?? [],
    assignments: assignments.data ?? [],
    employees: employees.data ?? [],
    points: points.data ?? [],
    inquiries: inquiries.data ?? [],
  };

  return <EmployeeDashboard initialData={data} access={employeeAccess} userId={userId} />;
}
