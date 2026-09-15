import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { LoginForm } from "@/components/employee/login-form";

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
  const nextPath = params.next?.startsWith("/employee") ? params.next : "/employee";

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
        {params.error === "not-authorized" && (
          <p className="employee-auth-error">This account does not have access to the Aspire workspace.</p>
        )}
        <LoginForm nextPath={nextPath} />
        <Link className="employee-auth-return" href="/">← Return to the public website</Link>
      </section>
    </main>
  );
}
