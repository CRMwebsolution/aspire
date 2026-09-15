import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { LoginForm } from "@/components/employee/login-form";
import { ASPIRE_BUSINESS_KEY } from "@/lib/aspire/constants";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Employee sign in | Aspire",
  robots: { index: false, follow: false },
};

export default async function EmployeeLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const nextPath = params.next?.startsWith("/dashboard") ? params.next : "/dashboard";
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  let accountNotAuthorized = params.error === "not-authorized";

  if (userId) {
    const { data: access } = await supabase
      .from("aspire_employee_access")
      .select("user_id")
      .eq("business_key", ASPIRE_BUSINESS_KEY)
      .eq("user_id", userId)
      .eq("is_active", true)
      .maybeSingle();

    if (access) redirect(nextPath);
    accountNotAuthorized = true;
  }

  return (
    <main className="employee-auth-page">
      <section className="employee-auth-card">
        <Link className="employee-auth-brand" href="/">
          <span className="brand-mark">A</span>
          <span>ASPIRE <small>MOBIL DETAILING</small></span>
        </Link>
        <div className="employee-auth-heading">
          <span><ShieldCheck size={15} /> PRIVATE EMPLOYEE AREA</span>
          <h1>Welcome back.</h1>
          <p>Sign in with the employee account authorized for Aspire.</p>
        </div>
        {accountNotAuthorized && (
          <p className="employee-auth-error">This account does not have access to the Aspire workspace.</p>
        )}
        <LoginForm nextPath={nextPath} />
        <Link className="employee-auth-return" href="/">← Return to the public website</Link>
      </section>
    </main>
  );
}
