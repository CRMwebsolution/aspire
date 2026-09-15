"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Check, ShieldCheck, UserPlus, UserRound, X } from "lucide-react";
import type { EmployeeAccess, EmployeeRole } from "@/lib/aspire/types";
import { createClient } from "@/lib/supabase/client";

type EditableRole = Extract<EmployeeRole, "admin" | "employee">;

type EmployeeManagementProps = {
  initialEmployees: EmployeeAccess[];
  onEmployeesChange: (employees: EmployeeAccess[]) => void;
};

type FunctionResult = {
  employee: EmployeeAccess;
  invited?: boolean;
};

export function EmployeeManagement({ initialEmployees, onEmployeesChange }: EmployeeManagementProps) {
  const supabase = useMemo(() => createClient(), []);
  const [employees, setEmployees] = useState(initialEmployees);
  const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  function applyEmployee(employee: EmployeeAccess) {
    const next = [...employees.filter((item) => item.user_id !== employee.user_id), employee]
      .sort((a, b) => a.display_name.localeCompare(b.display_name));
    setEmployees(next);
    onEmployeesChange(next);
  }

  async function invoke(body: Record<string, unknown>) {
    const result = await supabase.functions.invoke<FunctionResult>("aspire-manage-employees", { body });
    if (result.error) throw result.error;
    if (!result.data?.employee) throw new Error("The employee service returned an incomplete response.");
    return result.data;
  }

  async function inviteEmployee(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setBusy(true);
    setNotice(null);

    try {
      const result = await invoke({
        action: "invite",
        email: String(form.get("email") ?? "").trim(),
        display_name: String(form.get("display_name") ?? "").trim(),
        role: String(form.get("role") ?? "employee"),
        redirect_to: window.location.origin + "/login",
      });
      applyEmployee(result.employee);
      formElement.reset();
      setNotice({
        kind: "success",
        text: result.invited ? "Employee invited and access granted." : "Existing account added to Aspire.",
      });
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "Unable to add the employee." });
    } finally {
      setBusy(false);
    }
  }

  async function updateEmployee(employee: EmployeeAccess, values: { display_name: string; role: EditableRole; is_active: boolean }) {
    setBusy(true);
    setNotice(null);
    try {
      const result = await invoke({ action: "update", user_id: employee.user_id, ...values });
      applyEmployee(result.employee);
      setNotice({ kind: "success", text: values.is_active ? "Employee access updated." : "Employee access deactivated." });
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "Unable to update the employee." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="employee-management-grid">
      <section className="employee-panel">
        <header>
          <div>
            <span>TEAM ACCESS</span>
            <h3>Add an employee</h3>
            <p>An invitation email is sent when the address does not already have a Supabase account.</p>
          </div>
          <UserPlus />
        </header>
        {notice && (
          <div className={"employee-notice " + notice.kind} role="status">
            <span>{notice.kind === "success" ? <Check /> : <X />}{notice.text}</span>
            <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss"><X /></button>
          </div>
        )}
        <form className="employee-form employee-invite-form" onSubmit={inviteEmployee}>
          <label>
            Full name
            <input name="display_name" required maxLength={120} autoComplete="name" />
          </label>
          <label>
            Email
            <input name="email" type="email" required maxLength={254} autoComplete="email" />
          </label>
          <label>
            Role
            <select name="role" defaultValue="employee">
              <option value="employee">Employee</option>
              <option value="admin">Admin</option>
            </select>
            <small>Admins can see and manage the full calendar. Employees only see jobs assigned to them.</small>
          </label>
          <button className="primary-action" type="submit" disabled={busy}><UserPlus /> Send invite</button>
        </form>
      </section>

      <section className="employee-panel employee-directory">
        <header>
          <div>
            <span>ACTIVE DIRECTORY</span>
            <h3>Employees</h3>
            <p>Diagnostic accounts are hidden automatically and never appear here.</p>
          </div>
          <ShieldCheck />
        </header>
        {employees.length ? (
          <div className="employee-access-list">
            {employees.map((employee) => (
              <EmployeeAccessRow key={employee.user_id} employee={employee} busy={busy} onSave={updateEmployee} />
            ))}
          </div>
        ) : (
          <div className="employee-empty">
            <UserRound />
            <h4>No visible employees yet</h4>
            <p>Add the business owner or first employee with the form.</p>
          </div>
        )}
      </section>
    </div>
  );
}

function EmployeeAccessRow({
  employee,
  busy,
  onSave,
}: {
  employee: EmployeeAccess;
  busy: boolean;
  onSave: (employee: EmployeeAccess, values: { display_name: string; role: EditableRole; is_active: boolean }) => void;
}) {
  const [displayName, setDisplayName] = useState(employee.display_name);
  const [role, setRole] = useState<EditableRole>(employee.role === "admin" ? "admin" : "employee");
  const [isActive, setIsActive] = useState(employee.is_active);

  return (
    <article className={isActive ? "employee-access-row" : "employee-access-row inactive"}>
      <div className="initial-avatar">{displayName.charAt(0) || "E"}</div>
      <div className="employee-access-identity">
        <input aria-label={"Name for " + employee.email} value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={120} />
        <span>{employee.email}</span>
      </div>
      <select aria-label={"Role for " + employee.email} value={role} onChange={(event) => setRole(event.target.value as EditableRole)}>
        <option value="employee">Employee</option>
        <option value="admin">Admin</option>
      </select>
      <label className="employee-active-toggle">
        <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
        <span>{isActive ? "Active" : "Inactive"}</span>
      </label>
      <button
        className="secondary-action"
        type="button"
        disabled={busy || !displayName.trim()}
        onClick={() => onSave(employee, { display_name: displayName.trim(), role, is_active: isActive })}
      >
        <Check /> Save
      </button>
    </article>
  );
}
