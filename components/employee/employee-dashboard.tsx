"use client";

import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Pencil,
  Plus,
  Search,
  Settings2,
  Sparkles,
  Tag,
  Trash2,
  Trophy,
  UserRound,
  Users,
  X,
} from "lucide-react";
import {
  addDays,
  addMonths,
  addWeeks,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from "date-fns";
import { useRouter } from "next/navigation";
import { EmployeeManagement } from "@/components/employee/employee-management";
import { ASPIRE_BUSINESS_KEY, appointmentKinds, appointmentStatuses, catalogSections, earningModes } from "@/lib/aspire/constants";
import type {
  Appointment,
  AppointmentAssignment,
  AppointmentKind,
  AppointmentStatus,
  CatalogDraft,
  CatalogItem,
  Customer,
  DashboardData,
  EmployeeAccess,
  EarningMode,
  Inquiry,
  LoyaltySettings,
  PointsMethod,
  Reward,
} from "@/lib/aspire/types";
import { createClient } from "@/lib/supabase/client";

type Tab = "overview" | "inquiries" | "calendar" | "customers" | "loyalty" | "catalog" | "employees";
type CalendarView = "month" | "week" | "list";

const tabs: Array<{ id: Tab; label: string; icon: typeof LayoutDashboard }> = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "inquiries", label: "Inquiries", icon: Inbox },
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "customers", label: "Customers", icon: Users },
  { id: "loyalty", label: "Points & rewards", icon: Trophy },
  { id: "catalog", label: "Packages & pricing", icon: Tag },
  { id: "employees", label: "Employees", icon: UserRound },
];

const customerFields = "id,business_key,full_name,phone,email,vehicle_details,notes,starting_points,created_at,updated_at";
const appointmentFields = "id,business_key,customer_id,inquiry_id,catalog_item_id,assigned_user_id,kind,status,title,starts_at,ends_at,all_day,location,vehicle_details,final_amount,notes,created_at,updated_at";
const catalogFields = "id,business_key,section,slug,level_label,name,summary,primary_price,primary_price_label,secondary_price,secondary_price_label,is_starting_at,is_quote_only,is_featured,is_active,sort_order,features,draft_content,published_at,created_at,updated_at";
const rewardFields = "id,business_key,name,description,points_cost,is_active,sort_order";

function money(value: number | null) {
  if (value === null || Number.isNaN(Number(value))) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value));
}

function dateTimeLocal(iso?: string | null) {
  const date = iso ? new Date(iso) : new Date();
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function nullable(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text || null;
}

function numeric(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text === "" ? null : Number(text);
}

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 100);
}

function StatusBadge({ status }: { status: string }) {
  return <span className={`employee-status status-${status.replace("_", "-")}`}>{status.replace("_", " ")}</span>;
}

function Modal({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return (
    <div className="employee-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className={`employee-modal ${wide ? "wide" : ""}`} role="dialog" aria-modal="true" aria-label={title}>
        <header><div><span>ASPIRE WORKSPACE</span><h2>{title}</h2></div><button type="button" onClick={onClose} aria-label="Close"><X /></button></header>
        {children}
      </section>
    </div>
  );
}

export function EmployeeDashboard({ initialData, access, userId }: { initialData: DashboardData; access: EmployeeAccess; userId: string }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [data, setData] = useState(initialData);
  const [tab, setTab] = useState<Tab>("overview");
  const [navOpen, setNavOpen] = useState(false);
  const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [customerEditor, setCustomerEditor] = useState<Customer | "new" | null>(null);
  const [appointmentEditor, setAppointmentEditor] = useState<Appointment | "new" | null>(null);
  const [appointmentViewer, setAppointmentViewer] = useState<Appointment | null>(null);
  const [catalogEditor, setCatalogEditor] = useState<CatalogItem | "new" | null>(null);
  const [rewardEditor, setRewardEditor] = useState<Reward | "new" | null>(null);
  const [convertInquiry, setConvertInquiry] = useState<Inquiry | null>(null);

  const pointBalances = useMemo(() => {
    const balances = new Map(data.customers.map((customer) => [customer.id, Number(customer.starting_points)]));
    data.points.forEach((transaction) => balances.set(transaction.customer_id, (balances.get(transaction.customer_id) ?? 0) + Number(transaction.points_delta)));
    return balances;
  }, [data.customers, data.points]);

  async function logActivity(action: string, entityType: string, entityId?: string | null, details: Record<string, unknown> = {}) {
    await supabase.from("aspire_activity_log").insert({
      business_key: ASPIRE_BUSINESS_KEY,
      actor_user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId ?? null,
      details,
    });
  }

  async function perform(successText: string, operation: () => Promise<void>) {
    setBusy(true);
    setNotice(null);
    try {
      await operation();
      setNotice({ kind: "success", text: successText });
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "Something went wrong." });
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  async function saveCustomer(event: FormEvent<HTMLFormElement>, current: Customer | "new") {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const values = {
      business_key: ASPIRE_BUSINESS_KEY,
      full_name: String(form.get("full_name") ?? "").trim(),
      phone: nullable(form.get("phone")),
      email: nullable(form.get("email")),
      vehicle_details: nullable(form.get("vehicle_details")),
      notes: nullable(form.get("notes")),
      starting_points: Math.max(0, Number(form.get("starting_points") ?? 0)),
      updated_by: userId,
    };

    await perform(current === "new" ? "Customer added." : "Customer updated.", async () => {
      if (current === "new") {
        const result = await supabase.from("aspire_customers").insert({ ...values, created_by: userId }).select(customerFields).single();
        if (result.error) throw result.error;
        const customer = result.data as Customer;
        setData((previous) => ({ ...previous, customers: [...previous.customers, customer].sort((a, b) => a.full_name.localeCompare(b.full_name)) }));
        await logActivity("customer.created", "customer", customer.id, { name: customer.full_name });
      } else {
        const result = await supabase.from("aspire_customers").update(values).eq("id", current.id).eq("business_key", ASPIRE_BUSINESS_KEY).select(customerFields).single();
        if (result.error) throw result.error;
        const customer = result.data as Customer;
        setData((previous) => ({ ...previous, customers: previous.customers.map((item) => item.id === customer.id ? customer : item).sort((a, b) => a.full_name.localeCompare(b.full_name)) }));
        await logActivity("customer.updated", "customer", customer.id, { name: customer.full_name });
      }
      setCustomerEditor(null);
    });
  }

  async function deleteCustomer(customer: Customer) {
    if (!window.confirm(`Delete ${customer.full_name}? Their points history will also be removed.`)) return;
    await perform("Customer deleted.", async () => {
      const result = await supabase.from("aspire_customers").delete().eq("id", customer.id).eq("business_key", ASPIRE_BUSINESS_KEY);
      if (result.error) throw result.error;
      setData((previous) => ({
        ...previous,
        customers: previous.customers.filter((item) => item.id !== customer.id),
        points: previous.points.filter((item) => item.customer_id !== customer.id),
      }));
      await logActivity("customer.deleted", "customer", customer.id, { name: customer.full_name });
      setCustomerEditor(null);
    });
  }

  async function saveAppointment(event: FormEvent<HTMLFormElement>, current: Appointment | "new") {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const startsAt = new Date(String(form.get("starts_at"))).toISOString();
    const endsAt = new Date(String(form.get("ends_at"))).toISOString();
    if (new Date(endsAt) <= new Date(startsAt)) {
      setNotice({ kind: "error", text: "The end time must be after the start time." });
      return;
    }
    const assignedUserIds = form.getAll("assigned_user_ids").map(String);
    const values = {
      business_key: ASPIRE_BUSINESS_KEY,
      customer_id: nullable(form.get("customer_id")),
      catalog_item_id: nullable(form.get("catalog_item_id")),
      kind: String(form.get("kind")) as AppointmentKind,
      status: String(form.get("status")) as AppointmentStatus,
      title: String(form.get("title") ?? "").trim(),
      starts_at: startsAt,
      ends_at: endsAt,
      all_day: form.get("all_day") === "on",
      location: nullable(form.get("location")),
      vehicle_details: nullable(form.get("vehicle_details")),
      final_amount: numeric(form.get("final_amount")),
      notes: nullable(form.get("notes")),
      updated_by: userId,
    };

    await perform(current === "new" ? "Calendar item added." : "Calendar item updated.", async () => {
      const appointmentResult = current === "new"
        ? await supabase.from("aspire_appointments").insert({ ...values, created_by: userId }).select(appointmentFields).single()
        : await supabase.from("aspire_appointments").update(values).eq("id", current.id).eq("business_key", ASPIRE_BUSINESS_KEY).select(appointmentFields).single();
      if (appointmentResult.error) throw appointmentResult.error;
      const appointment = appointmentResult.data as Appointment;

      const assignmentResult = await supabase.rpc("aspire_set_appointment_assignments", {
        p_appointment_id: appointment.id,
        p_user_ids: assignedUserIds,
      });
      if (assignmentResult.error) throw assignmentResult.error;
      const assignments = (assignmentResult.data ?? []) as AppointmentAssignment[];

      setData((previous) => ({
        ...previous,
        appointments: [
          ...previous.appointments.filter((item) => item.id !== appointment.id),
          appointment,
        ].sort((a, b) => a.starts_at.localeCompare(b.starts_at)),
        assignments: [
          ...previous.assignments.filter((item) => item.appointment_id !== appointment.id),
          ...assignments,
        ],
      }));
      await logActivity(
        current === "new" ? "appointment.created" : "appointment.updated",
        "appointment",
        appointment.id,
        { title: appointment.title, status: appointment.status, assigned_user_ids: assignedUserIds },
      );
      setAppointmentEditor(null);
    });
  }

  async function deleteAppointment(appointment: Appointment) {
    if (!window.confirm(`Delete “${appointment.title}”?`)) return;
    await perform("Calendar item deleted.", async () => {
      const result = await supabase.from("aspire_appointments").delete().eq("id", appointment.id).eq("business_key", ASPIRE_BUSINESS_KEY);
      if (result.error) throw result.error;
      setData((previous) => ({
        ...previous,
        appointments: previous.appointments.filter((item) => item.id !== appointment.id),
        assignments: previous.assignments.filter((item) => item.appointment_id !== appointment.id),
      }));
      await logActivity("appointment.deleted", "appointment", appointment.id, { title: appointment.title });
      setAppointmentEditor(null);
    });
  }

  async function updateInquiryStatus(inquiry: Inquiry, status: Inquiry["status"]) {
    await perform("Inquiry status updated.", async () => {
      const result = await supabase.from("aspire_assessment_requests").update({ status, handled_by: userId }).eq("id", inquiry.id).eq("business_key", ASPIRE_BUSINESS_KEY).select("*").single();
      if (result.error) throw result.error;
      setData((previous) => ({ ...previous, inquiries: previous.inquiries.map((item) => item.id === inquiry.id ? { ...item, status } : item) }));
      await logActivity("inquiry.status_updated", "inquiry", inquiry.id, { status });
    });
  }

  async function completeConversion(event: FormEvent<HTMLFormElement>, inquiry: Inquiry) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const assignedUserIds = form.getAll("assigned_user_ids").map(String);
    await perform("Inquiry converted to a customer and appointment.", async () => {
      let customer = inquiry.customer_id ? data.customers.find((item) => item.id === inquiry.customer_id) : undefined;
      if (!customer) {
        const customerResult = await supabase.from("aspire_customers").insert({
          business_key: ASPIRE_BUSINESS_KEY,
          full_name: inquiry.name,
          phone: inquiry.phone,
          email: inquiry.email,
          vehicle_details: inquiry.vehicle_type,
          notes: inquiry.notes,
          starting_points: Math.max(0, Number(form.get("starting_points") ?? 0)),
          created_by: userId,
          updated_by: userId,
        }).select(customerFields).single();
        if (customerResult.error) throw customerResult.error;
        customer = customerResult.data as Customer;
      }

      const startsAt = new Date(String(form.get("starts_at"))).toISOString();
      const endsAt = new Date(String(form.get("ends_at"))).toISOString();
      const appointmentResult = await supabase.from("aspire_appointments").insert({
        business_key: ASPIRE_BUSINESS_KEY,
        customer_id: customer.id,
        inquiry_id: inquiry.id,
        kind: inquiry.request_type,
        status: "confirmed",
        title: String(form.get("title") ?? "").trim(),
        starts_at: startsAt,
        ends_at: endsAt,
        location: nullable(form.get("location")),
        vehicle_details: inquiry.vehicle_type,
        notes: inquiry.notes,
        created_by: userId,
        updated_by: userId,
      }).select(appointmentFields).single();
      if (appointmentResult.error) throw appointmentResult.error;
      const appointment = appointmentResult.data as Appointment;

      const assignmentResult = await supabase.rpc("aspire_set_appointment_assignments", {
        p_appointment_id: appointment.id,
        p_user_ids: assignedUserIds,
      });
      if (assignmentResult.error) throw assignmentResult.error;
      const assignments = (assignmentResult.data ?? []) as AppointmentAssignment[];

      const inquiryResult = await supabase.from("aspire_assessment_requests").update({
        status: "scheduled",
        customer_id: customer.id,
        appointment_id: appointment.id,
        handled_by: userId,
      }).eq("id", inquiry.id).eq("business_key", ASPIRE_BUSINESS_KEY);
      if (inquiryResult.error) throw inquiryResult.error;

      setData((previous) => ({
        ...previous,
        customers: previous.customers.some((item) => item.id === customer!.id) ? previous.customers : [...previous.customers, customer!].sort((a, b) => a.full_name.localeCompare(b.full_name)),
        appointments: [...previous.appointments, appointment].sort((a, b) => a.starts_at.localeCompare(b.starts_at)),
        assignments: [...previous.assignments, ...assignments],
        inquiries: previous.inquiries.map((item) => item.id === inquiry.id ? { ...item, status: "scheduled", customer_id: customer!.id, appointment_id: appointment.id } : item),
      }));
      await logActivity("inquiry.converted", "inquiry", inquiry.id, { customer_id: customer.id, appointment_id: appointment.id, assigned_user_ids: assignedUserIds });
      setConvertInquiry(null);
    });
  }

  async function saveLoyalty(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const values = {
      earning_mode: String(form.get("earning_mode")) as EarningMode,
      points_per_dollar: Math.max(0.0001, Number(form.get("points_per_dollar") ?? 1)),
      points_per_job: Math.max(1, Number(form.get("points_per_job") ?? 1)),
      enrollment_points: Math.max(0, Number(form.get("enrollment_points") ?? 0)),
      updated_by: userId,
    };
    await perform("Point rules saved.", async () => {
      const result = await supabase.from("aspire_loyalty_settings").update(values).eq("business_key", ASPIRE_BUSINESS_KEY).select("business_key,earning_mode,points_per_dollar,points_per_job,enrollment_points,updated_at").single();
      if (result.error) throw result.error;
      setData((previous) => ({ ...previous, loyalty: result.data as LoyaltySettings }));
      await logActivity("loyalty.settings_updated", "loyalty_settings", null, values);
    });
  }

  async function addPoints(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const customerId = String(form.get("customer_id") ?? "");
    const entryType = String(form.get("entry_type") ?? "earn") as "earn" | "redemption" | "adjustment";
    const manualPoints = Math.abs(Number(form.get("points") ?? 0));
    const dollarAmount = Math.max(0, Number(form.get("dollar_amount") ?? 0));
    let method: PointsMethod = data.loyalty.earning_mode;
    let delta = 0;
    if (entryType === "redemption") {
      method = "redemption";
      delta = -manualPoints;
    } else if (entryType === "adjustment") {
      method = "adjustment";
      delta = Number(form.get("points") ?? 0);
    } else if (method === "dollar") {
      delta = Math.floor(dollarAmount * Number(data.loyalty.points_per_dollar));
    } else if (method === "job") {
      delta = Number(data.loyalty.points_per_job);
    } else {
      delta = manualPoints;
    }
    if (!customerId || !delta) {
      setNotice({ kind: "error", text: "Choose a customer and enter a non-zero point value." });
      return;
    }

    await perform("Point entry added.", async () => {
      const result = await supabase.from("aspire_points_transactions").insert({
        business_key: ASPIRE_BUSINESS_KEY,
        customer_id: customerId,
        method,
        points_delta: delta,
        dollar_amount: method === "dollar" ? dollarAmount : null,
        description: String(form.get("description") ?? "").trim(),
        created_by: userId,
      }).select("id,business_key,customer_id,appointment_id,method,points_delta,dollar_amount,description,created_at").single();
      if (result.error) throw result.error;
      setData((previous) => ({ ...previous, points: [result.data, ...previous.points] }));
      await logActivity("points.entry_created", "points_transaction", result.data.id, { customer_id: customerId, method, points_delta: delta });
      formElement.reset();
    });
  }

  async function saveReward(event: FormEvent<HTMLFormElement>, current: Reward | "new") {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const values = {
      business_key: ASPIRE_BUSINESS_KEY,
      name: String(form.get("name") ?? "").trim(),
      description: String(form.get("description") ?? "").trim(),
      points_cost: Math.max(1, Number(form.get("points_cost") ?? 1)),
      sort_order: Number(form.get("sort_order") ?? 0),
      is_active: form.get("is_active") === "on",
      updated_by: userId,
    };
    await perform(current === "new" ? "Reward added." : "Reward updated.", async () => {
      const result = current === "new"
        ? await supabase.from("aspire_rewards").insert({ ...values, created_by: userId }).select(rewardFields).single()
        : await supabase.from("aspire_rewards").update(values).eq("id", current.id).eq("business_key", ASPIRE_BUSINESS_KEY).select(rewardFields).single();
      if (result.error) throw result.error;
      const reward = result.data as Reward;
      setData((previous) => ({ ...previous, rewards: current === "new" ? [...previous.rewards, reward].sort((a, b) => a.sort_order - b.sort_order) : previous.rewards.map((item) => item.id === reward.id ? reward : item).sort((a, b) => a.sort_order - b.sort_order) }));
      await logActivity(current === "new" ? "reward.created" : "reward.updated", "reward", reward.id, { name: reward.name });
      setRewardEditor(null);
    });
  }

  function catalogDraftFromForm(form: FormData): CatalogDraft {
    const quoteOnly = form.get("is_quote_only") === "on";
    return {
      level_label: nullable(form.get("level_label")),
      name: String(form.get("name") ?? "").trim(),
      summary: String(form.get("summary") ?? "").trim(),
      primary_price: quoteOnly ? null : numeric(form.get("primary_price")),
      primary_price_label: nullable(form.get("primary_price_label")),
      secondary_price: quoteOnly ? null : numeric(form.get("secondary_price")),
      secondary_price_label: nullable(form.get("secondary_price_label")),
      is_starting_at: !quoteOnly && form.get("is_starting_at") === "on",
      is_quote_only: quoteOnly,
      is_featured: form.get("is_featured") === "on",
      is_active: form.get("is_active") === "on",
      sort_order: Number(form.get("sort_order") ?? 0),
      features: String(form.get("features") ?? "").split("\n").map((feature) => feature.trim()).filter(Boolean),
    };
  }

  async function saveCatalog(event: FormEvent<HTMLFormElement>, current: CatalogItem | "new") {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const intent = submitter?.value === "publish" ? "publish" : "draft";
    const draft = catalogDraftFromForm(form);
    const section = String(form.get("section")) as CatalogItem["section"];
    const requestedSlug = slugify(String(form.get("slug") || draft.name));

    await perform(intent === "publish" ? "Catalog change published to the website." : "Catalog draft saved privately.", async () => {
      if (current === "new") {
        const base = {
          business_key: ASPIRE_BUSINESS_KEY,
          section,
          slug: requestedSlug,
          ...draft,
          is_active: intent === "publish" ? draft.is_active : false,
          draft_content: intent === "draft" ? draft : null,
          published_at: new Date().toISOString(),
          created_by: userId,
          updated_by: userId,
        };
        const result = await supabase.from("aspire_catalog_items").insert(base).select(catalogFields).single();
        if (result.error) throw result.error;
        const item = result.data as CatalogItem;
        setData((previous) => ({ ...previous, catalog: [...previous.catalog, item].sort((a, b) => a.section.localeCompare(b.section) || a.sort_order - b.sort_order) }));
        await logActivity(intent === "publish" ? "catalog.created_and_published" : "catalog.draft_created", "catalog_item", item.id, { name: item.name, section });
      } else {
        const values = intent === "publish"
          ? { ...draft, draft_content: null, published_at: new Date().toISOString(), updated_by: userId }
          : { draft_content: draft, updated_by: userId };
        const result = await supabase.from("aspire_catalog_items").update(values).eq("id", current.id).eq("business_key", ASPIRE_BUSINESS_KEY).select(catalogFields).single();
        if (result.error) throw result.error;
        const item = result.data as CatalogItem;
        setData((previous) => ({ ...previous, catalog: previous.catalog.map((entry) => entry.id === item.id ? item : entry).sort((a, b) => a.section.localeCompare(b.section) || a.sort_order - b.sort_order) }));
        await logActivity(intent === "publish" ? "catalog.published" : "catalog.draft_saved", "catalog_item", item.id, { name: draft.name });
      }
      setCatalogEditor(null);
    });
  }

  const canManageCalendar = access.role === "owner" || access.role === "admin" || access.role === "support";
  const canManageEmployees = canManageCalendar;
  const visibleTabs = canManageEmployees ? tabs : tabs.filter((item) => item.id !== "employees");
  const currentTab = visibleTabs.find((item) => item.id === tab) ?? visibleTabs[0];
  const newInquiryCount = data.inquiries.filter((inquiry) => inquiry.status === "new").length;

  return (
    <div className="employee-app">
      <aside className={navOpen ? "employee-sidebar open" : "employee-sidebar"}>
        <div className="employee-sidebar-brand"><span className="brand-mark">A</span><div>ASPIRE<small>EMPLOYEE WORKSPACE</small></div><button type="button" onClick={() => setNavOpen(false)} aria-label="Close menu"><X /></button></div>
        <nav>
          {visibleTabs.map((item) => {
            const Icon = item.icon;
            return <button className={tab === item.id ? "active" : ""} key={item.id} type="button" onClick={() => { setTab(item.id); setNavOpen(false); }}><Icon /><span>{item.label}</span>{item.id === "inquiries" && newInquiryCount > 0 && <b>{newInquiryCount}</b>}</button>;
          })}
        </nav>
        <div className="employee-profile"><UserRound /><div><strong>{access.display_name}</strong><span>{access.role === "support" ? "Support administrator" : access.role}</span></div></div>
        <button className="employee-signout" type="button" onClick={signOut}><LogOut /> Sign out</button>
      </aside>

      <main className="employee-main">
        <header className="employee-topbar">
          <button className="employee-menu" type="button" onClick={() => setNavOpen(true)} aria-label="Open navigation"><Menu /></button>
          <div><span>ASPIRE MOBIL DETAILING</span><h1>{currentTab.label}</h1></div>
          <a href="/" target="_blank" rel="noreferrer">View website <ArrowRight /></a>
        </header>

        {notice && <div className={`employee-notice ${notice.kind}`} role="status"><span>{notice.kind === "success" ? <Check /> : <X />}{notice.text}</span><button type="button" onClick={() => setNotice(null)} aria-label="Dismiss"><X /></button></div>}
        {busy && <div className="employee-progress" />}

        <div className="employee-content">
          {tab === "overview" && <Overview data={data} balances={pointBalances} canManageCalendar={canManageCalendar} onTab={setTab} onNewAppointment={() => setAppointmentEditor("new")} />}
          {tab === "inquiries" && <Inquiries inquiries={data.inquiries} onStatus={updateInquiryStatus} onConvert={setConvertInquiry} />}
          {tab === "calendar" && (
            <CalendarPanel
              appointments={data.appointments}
              assignments={data.assignments}
              employees={data.employees}
              customers={data.customers}
              canManageCalendar={canManageCalendar}
              onCreate={() => setAppointmentEditor("new")}
              onOpen={(appointment) => canManageCalendar ? setAppointmentEditor(appointment) : setAppointmentViewer(appointment)}
            />
          )}
          {tab === "customers" && <Customers customers={data.customers} balances={pointBalances} points={data.points} onCreate={() => setCustomerEditor("new")} onEdit={setCustomerEditor} />}
          {tab === "loyalty" && <LoyaltyPanel data={data} balances={pointBalances} onSaveSettings={saveLoyalty} onAddPoints={addPoints} onEditReward={setRewardEditor} onNewReward={() => setRewardEditor("new")} />}
          {tab === "catalog" && <CatalogPanel catalog={data.catalog} onEdit={setCatalogEditor} onNew={() => setCatalogEditor("new")} />}
          {tab === "employees" && canManageEmployees && (
            <EmployeeManagement
              initialEmployees={data.employees}
              onEmployeesChange={(employees) => setData((previous) => ({ ...previous, employees }))}
            />
          )}
        </div>
      </main>

      {customerEditor && <CustomerModal current={customerEditor} busy={busy} onClose={() => setCustomerEditor(null)} onSave={saveCustomer} onDelete={deleteCustomer} />}
      {appointmentEditor && (
        <AppointmentModal
          current={appointmentEditor}
          customers={data.customers}
          catalog={data.catalog}
          employees={data.employees.filter((employee) => employee.is_active)}
          assignments={data.assignments}
          busy={busy}
          onClose={() => setAppointmentEditor(null)}
          onSave={saveAppointment}
          onDelete={deleteAppointment}
        />
      )}
      {appointmentViewer && (
        <AppointmentDetailsModal
          appointment={appointmentViewer}
          customers={data.customers}
          employees={data.employees}
          assignments={data.assignments}
          onClose={() => setAppointmentViewer(null)}
        />
      )}
      {catalogEditor && <CatalogModal current={catalogEditor} busy={busy} onClose={() => setCatalogEditor(null)} onSave={saveCatalog} />}
      {rewardEditor && <RewardModal current={rewardEditor} busy={busy} onClose={() => setRewardEditor(null)} onSave={saveReward} />}
      {convertInquiry && <ConvertInquiryModal inquiry={convertInquiry} loyalty={data.loyalty} employees={data.employees.filter((employee) => employee.is_active)} busy={busy} onClose={() => setConvertInquiry(null)} onSave={completeConversion} />}
    </div>
  );
}

function Overview({ data, balances, canManageCalendar, onTab, onNewAppointment }: { data: DashboardData; balances: Map<string, number>; canManageCalendar: boolean; onTab: (tab: Tab) => void; onNewAppointment: () => void }) {
  const now = new Date();
  const upcoming = data.appointments.filter((item) => new Date(item.ends_at) >= now && item.status !== "cancelled").slice(0, 5);
  const openInquiries = data.inquiries.filter((item) => item.status === "new" || item.status === "contacted");
  const totalPoints = [...balances.values()].reduce((total, points) => total + points, 0);
  return (
    <div className="employee-stack">
      <section className="employee-welcome"><div><span>WORKSPACE OVERVIEW</span><h2>Keep today moving.</h2><p>Manage new requests, schedule work, track customers and publish pricing from one place.</p></div>{canManageCalendar && <button type="button" onClick={onNewAppointment}><Plus /> Add calendar item</button>}</section>
      <section className="employee-metrics">
        <button type="button" onClick={() => onTab("inquiries")}><Inbox /><span>Open inquiries</span><strong>{openInquiries.length}</strong><small>{data.inquiries.filter((item) => item.status === "new").length} new</small></button>
        <button type="button" onClick={() => onTab("calendar")}><CalendarDays /><span>Upcoming</span><strong>{upcoming.length}</strong><small>scheduled items</small></button>
        <button type="button" onClick={() => onTab("customers")}><Users /><span>Customers</span><strong>{data.customers.length}</strong><small>customer records</small></button>
        <button type="button" onClick={() => onTab("loyalty")}><Trophy /><span>Points issued</span><strong>{totalPoints}</strong><small>current balances</small></button>
      </section>
      <div className="employee-overview-grid">
        <section className="employee-panel"><header><div><span>NEXT UP</span><h3>Upcoming calendar</h3></div><button type="button" onClick={() => onTab("calendar")}>Open calendar</button></header>{upcoming.length ? <div className="employee-list">{upcoming.map((item) => <article key={item.id}><div className={`calendar-kind kind-${item.kind}`}><CalendarDays /></div><div><strong>{item.title}</strong><span>{format(new Date(item.starts_at), "EEE, MMM d · h:mm a")}</span></div><StatusBadge status={item.status} /></article>)}</div> : <EmptyState icon={<CalendarDays />} title="Nothing scheduled yet" text="Add your first detailing job, class or blocked time." />}</section>
        <section className="employee-panel"><header><div><span>NEW REQUESTS</span><h3>Inquiry queue</h3></div><button type="button" onClick={() => onTab("inquiries")}>View all</button></header>{openInquiries.length ? <div className="employee-list">{openInquiries.slice(0, 5).map((item) => <article key={item.id}><div className="initial-avatar">{item.name.charAt(0)}</div><div><strong>{item.name}</strong><span>{item.service_interest || item.class_interest || item.request_type}</span></div><StatusBadge status={item.status} /></article>)}</div> : <EmptyState icon={<Inbox />} title="Inbox is clear" text="New website requests will appear here." />}</section>
      </div>
    </div>
  );
}

function Inquiries({ inquiries, onStatus, onConvert }: { inquiries: Inquiry[]; onStatus: (inquiry: Inquiry, status: Inquiry["status"]) => void; onConvert: (inquiry: Inquiry) => void }) {
  const [filter, setFilter] = useState<"open" | "all">("open");
  const shown = inquiries.filter((item) => filter === "all" || item.status === "new" || item.status === "contacted");
  return (
    <section className="employee-panel employee-table-panel">
      <header><div><span>WEBSITE LEADS</span><h3>Inquiry queue</h3><p>Review requests, follow up, then convert accepted work to a customer and calendar item.</p></div><div className="segment-control"><button className={filter === "open" ? "active" : ""} type="button" onClick={() => setFilter("open")}>Open</button><button className={filter === "all" ? "active" : ""} type="button" onClick={() => setFilter("all")}>All</button></div></header>
      {shown.length ? <div className="inquiry-cards">{shown.map((inquiry) => <article key={inquiry.id} className="inquiry-card"><div className="inquiry-card-head"><div className="initial-avatar">{inquiry.name.charAt(0)}</div><div><h4>{inquiry.name}</h4><span>{format(new Date(inquiry.created_at), "MMM d, yyyy · h:mm a")}</span></div><StatusBadge status={inquiry.status} /></div><div className="inquiry-facts"><span><b>{inquiry.request_type === "class" ? "Class" : "Service"}</b>{inquiry.class_interest || inquiry.service_interest || "Not specified"}</span><span><b>Contact</b><a href={`tel:${inquiry.phone}`}>{inquiry.phone}</a>{inquiry.email && <a href={`mailto:${inquiry.email}`}>{inquiry.email}</a>}</span><span><b>Location</b>{inquiry.county} County{inquiry.vehicle_type && ` · ${inquiry.vehicle_type}`}</span><span><b>Preferred time</b>{inquiry.preferred_window || "Not specified"}</span></div>{inquiry.notes && <p className="inquiry-notes">{inquiry.notes}</p>}<footer><select aria-label={`Status for ${inquiry.name}`} value={inquiry.status} onChange={(event) => onStatus(inquiry, event.target.value as Inquiry["status"])}><option value="new">New</option><option value="contacted">Contacted</option><option value="scheduled">Scheduled</option><option value="closed">Closed</option></select><button type="button" disabled={Boolean(inquiry.appointment_id)} onClick={() => onConvert(inquiry)}><CalendarDays /> {inquiry.appointment_id ? "Already scheduled" : "Convert & schedule"}</button></footer></article>)}</div> : <EmptyState icon={<Inbox />} title="No inquiries here" text="New website requests will automatically appear in this queue." />}
    </section>
  );
}

function CalendarPanel({
  appointments,
  assignments,
  employees,
  customers,
  canManageCalendar,
  onCreate,
  onOpen,
}: {
  appointments: Appointment[];
  assignments: AppointmentAssignment[];
  employees: EmployeeAccess[];
  customers: Customer[];
  canManageCalendar: boolean;
  onCreate: () => void;
  onOpen: (appointment: Appointment) => void;
}) {
  const [view, setView] = useState<CalendarView>("month");
  const [cursor, setCursor] = useState(new Date());
  const customerNames = useMemo(() => new Map(customers.map((customer) => [customer.id, customer.full_name])), [customers]);
  const employeeNames = useMemo(() => new Map(employees.map((employee) => [employee.user_id, employee.display_name])), [employees]);
  const monthStart = startOfWeek(startOfMonth(cursor), { weekStartsOn: 0 });
  const monthEnd = endOfWeek(endOfMonth(cursor), { weekStartsOn: 0 });
  const days: Date[] = [];
  for (let day = monthStart; day <= monthEnd; day = addDays(day, 1)) days.push(day);
  const weekStart = startOfWeek(cursor, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const visibleList = appointments.filter((item) => new Date(item.ends_at) >= startOfMonth(cursor) && new Date(item.starts_at) <= addMonths(endOfMonth(cursor), 1));
  const navigate = (direction: -1 | 1) => setCursor((current) => view === "week" ? (direction === 1 ? addWeeks(current, 1) : subWeeks(current, 1)) : (direction === 1 ? addMonths(current, 1) : subMonths(current, 1)));
  const teamNames = (appointmentId: string) => assignments
    .filter((item) => item.appointment_id === appointmentId)
    .map((item) => employeeNames.get(item.user_id))
    .filter((name): name is string => Boolean(name));
  const teamLabel = (appointmentId: string) => teamNames(appointmentId).join(", ");

  return (
    <section className="employee-panel calendar-panel">
      <header>
        <div>
          <span>INTERNAL SCHEDULE</span>
          <h3>{view === "week" ? format(weekStart, "MMM d") + " – " + format(addDays(weekStart, 6), "MMM d, yyyy") : format(cursor, "MMMM yyyy")}</h3>
        </div>
        <div className="calendar-actions">
          <div className="segment-control">
            <button className={view === "month" ? "active" : ""} onClick={() => setView("month")}>Month</button>
            <button className={view === "week" ? "active" : ""} onClick={() => setView("week")}>Week</button>
            <button className={view === "list" ? "active" : ""} onClick={() => setView("list")}>List</button>
          </div>
          <button className="icon-button" type="button" onClick={() => navigate(-1)} aria-label="Previous"><ChevronLeft /></button>
          <button className="today-button" type="button" onClick={() => setCursor(new Date())}>Today</button>
          <button className="icon-button" type="button" onClick={() => navigate(1)} aria-label="Next"><ChevronRight /></button>
          {canManageCalendar && <button className="primary-action" type="button" onClick={onCreate}><Plus /> Add item</button>}
        </div>
      </header>

      {view === "month" && (
        <div className="month-calendar">
          <div className="calendar-weekdays">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <span key={day}>{day}</span>)}</div>
          <div className="calendar-days">
            {days.map((day) => {
              const dayItems = appointments.filter((item) => isSameDay(new Date(item.starts_at), day));
              return (
                <div className={(isSameMonth(day, cursor) ? "" : "outside") + " " + (isToday(day) ? "today" : "")} key={day.toISOString()}>
                  <span>{format(day, "d")}</span>
                  {dayItems.slice(0, 3).map((item) => (
                    <button className={"calendar-chip kind-" + item.kind} type="button" key={item.id} onClick={() => onOpen(item)} title={item.title}>
                      <b>{item.all_day ? "" : format(new Date(item.starts_at), "h:mm")}</b>
                      {item.title}
                      {teamLabel(item.id) && <small className="calendar-team">{teamLabel(item.id)}</small>}
                    </button>
                  ))}
                  {dayItems.length > 3 && <small>+{dayItems.length - 3} more</small>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {view === "week" && (
        <div className="week-calendar">
          {weekDays.map((day) => (
            <div key={day.toISOString()}>
              <header className={isToday(day) ? "today" : ""}><span>{format(day, "EEE")}</span><strong>{format(day, "d")}</strong></header>
              <div>
                {appointments.filter((item) => isSameDay(new Date(item.starts_at), day)).map((item) => (
                  <button className={"week-event kind-" + item.kind} key={item.id} onClick={() => onOpen(item)}>
                    <span>{item.all_day ? "All day" : format(new Date(item.starts_at), "h:mm a")}</span>
                    <strong>{item.title}</strong>
                    <small>{item.customer_id ? customerNames.get(item.customer_id) : item.kind}</small>
                    {teamLabel(item.id) && <small className="calendar-team">{teamLabel(item.id)}</small>}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {view === "list" && (
        visibleList.length ? (
          <div className="calendar-list">
            {visibleList.map((item) => (
              <button type="button" key={item.id} onClick={() => onOpen(item)}>
                <div className="date-block"><strong>{format(new Date(item.starts_at), "d")}</strong><span>{format(new Date(item.starts_at), "MMM")}</span></div>
                <div className={"calendar-kind kind-" + item.kind}><CalendarDays /></div>
                <div>
                  <strong>{item.title}</strong>
                  <span>{format(new Date(item.starts_at), "EEEE · h:mm a")} – {format(new Date(item.ends_at), "h:mm a")}{item.customer_id && " · " + customerNames.get(item.customer_id)}</span>
                  {teamLabel(item.id) && <small className="calendar-team">{teamLabel(item.id)}</small>}
                </div>
                <StatusBadge status={item.status} />
              </button>
            ))}
          </div>
        ) : <EmptyState icon={<CalendarDays />} title="No calendar items" text="No jobs are scheduled in this date range." />
      )}
    </section>
  );
}

function Customers({ customers, balances, points, onCreate, onEdit }: { customers: Customer[]; balances: Map<string, number>; points: DashboardData["points"]; onCreate: () => void; onEdit: (customer: Customer) => void }) {
  const [search, setSearch] = useState("");
  const filtered = customers.filter((customer) => `${customer.full_name} ${customer.phone ?? ""} ${customer.email ?? ""} ${customer.vehicle_details ?? ""}`.toLowerCase().includes(search.toLowerCase()));
  return (
    <section className="employee-panel employee-table-panel">
      <header><div><span>CUSTOMER RECORDS</span><h3>Customers</h3><p>Starting points are editable; later changes are preserved in the points ledger.</p></div><button className="primary-action" type="button" onClick={onCreate}><Plus /> Add customer</button></header>
      <div className="employee-toolbar"><label><Search /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, phone, email or vehicle" /></label><span>{filtered.length} customer{filtered.length === 1 ? "" : "s"}</span></div>
      {filtered.length ? <div className="customer-table"><div className="customer-table-head"><span>Customer</span><span>Contact</span><span>Vehicle</span><span>Points</span><span /></div>{filtered.map((customer) => <button type="button" key={customer.id} onClick={() => onEdit(customer)}><span className="customer-name"><i>{customer.full_name.charAt(0)}</i><strong>{customer.full_name}</strong></span><span>{customer.phone || "No phone"}<small>{customer.email || "No email"}</small></span><span>{customer.vehicle_details || "Not added"}</span><span className="customer-points"><strong>{balances.get(customer.id) ?? 0}</strong><small>{points.filter((entry) => entry.customer_id === customer.id).length} ledger entries</small></span><Pencil /></button>)}</div> : <EmptyState icon={<Users />} title={search ? "No matching customers" : "Your customer list is empty"} text={search ? "Try a different search." : "Add a customer manually or convert an inquiry."} action={!search ? <button className="primary-action" type="button" onClick={onCreate}><Plus /> Add first customer</button> : undefined} />}
    </section>
  );
}

function LoyaltyPanel({ data, balances, onSaveSettings, onAddPoints, onEditReward, onNewReward }: { data: DashboardData; balances: Map<string, number>; onSaveSettings: (event: FormEvent<HTMLFormElement>) => void; onAddPoints: (event: FormEvent<HTMLFormElement>) => void; onEditReward: (reward: Reward) => void; onNewReward: () => void }) {
  const [entryType, setEntryType] = useState("earn");
  const mode = data.loyalty.earning_mode;
  return (
    <div className="employee-loyalty-grid">
      <section className="employee-panel"><header><div><span>POINT RULES</span><h3>Earning settings</h3><p>Choose one earning method. Existing ledger entries and balances never change when this setting changes.</p></div><Settings2 /></header><form className="employee-form" onSubmit={onSaveSettings}><fieldset className="earning-modes"><legend>How customers earn points</legend>{earningModes.map((item) => <label key={item}><input type="radio" name="earning_mode" value={item} defaultChecked={mode === item} /><span><strong>{item === "dollar" ? "By dollar" : item === "job" ? "By completed job" : "Manual only"}</strong><small>{item === "dollar" ? "Multiply final sale amount" : item === "job" ? "Fixed points for each job" : "You decide every entry"}</small></span></label>)}</fieldset><div className="form-row"><label>Points per dollar<input name="points_per_dollar" type="number" min="0.0001" step="0.0001" defaultValue={data.loyalty.points_per_dollar} required /></label><label>Points per job<input name="points_per_job" type="number" min="1" step="1" defaultValue={data.loyalty.points_per_job} required /></label></div><label>Enrollment / public starting offer<input name="enrollment_points" type="number" min="0" step="1" defaultValue={data.loyalty.enrollment_points} required /><small>This value is shown on the public website. Each customer’s actual starting balance remains independently editable.</small></label><button className="primary-action" type="submit"><Check /> Save point rules</button></form></section>
      <section className="employee-panel"><header><div><span>POINT LEDGER</span><h3>Add an entry</h3><p>Every change is append-only so adjustments remain traceable.</p></div><CircleDollarSign /></header>{data.customers.length ? <form className="employee-form" onSubmit={onAddPoints}><label>Customer<select name="customer_id" required defaultValue=""><option value="" disabled>Select customer</option>{data.customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.full_name} · {balances.get(customer.id) ?? 0} pts</option>)}</select></label><label>Entry type<select name="entry_type" value={entryType} onChange={(event) => setEntryType(event.target.value)}><option value="earn">Earn points ({mode})</option><option value="redemption">Redeem points</option><option value="adjustment">Correction / adjustment</option></select></label>{entryType === "earn" && mode === "dollar" && <label>Sale amount<input name="dollar_amount" type="number" min="0" step="0.01" required /><small>Points are rounded down using {Number(data.loyalty.points_per_dollar)} point{Number(data.loyalty.points_per_dollar) === 1 ? "" : "s"} per dollar.</small></label>}{(entryType !== "earn" || mode === "manual") && <label>{entryType === "redemption" ? "Points to redeem" : "Point change"}<input name="points" type="number" min={entryType === "redemption" || mode === "manual" ? 1 : undefined} step="1" required /><small>{entryType === "adjustment" ? "Use a negative number to reduce the balance." : "Enter a positive number."}</small></label>}{entryType === "earn" && mode === "job" && <div className="calculated-points"><Sparkles /><span>This entry will add <strong>{data.loyalty.points_per_job} points</strong>.</span></div>}<label>Note<input name="description" maxLength={300} placeholder="Example: Full Detail on Sept. 15" /></label><button className="primary-action" type="submit"><Plus /> Add ledger entry</button></form> : <EmptyState icon={<Users />} title="Add a customer first" text="Point entries must belong to a customer record." />}</section>
      <section className="employee-panel rewards-manager"><header><div><span>PUBLIC REWARDS</span><h3>Reward menu</h3><p>Active rewards are shown on the public website.</p></div><button className="primary-action" type="button" onClick={onNewReward}><Plus /> Add reward</button></header><div>{data.rewards.map((reward) => <button type="button" key={reward.id} onClick={() => onEditReward(reward)}><strong>{reward.points_cost}<small>points</small></strong><span><b>{reward.name}</b><small>{reward.description}</small></span><StatusBadge status={reward.is_active ? "active" : "inactive"} /><Pencil /></button>)}</div></section>
      <section className="employee-panel points-history"><header><div><span>RECENT ACTIVITY</span><h3>Point entries</h3></div></header>{data.points.length ? <div>{data.points.slice(0, 20).map((entry) => { const customer = data.customers.find((item) => item.id === entry.customer_id); return <article key={entry.id}><i className={entry.points_delta > 0 ? "positive" : "negative"}>{entry.points_delta > 0 ? "+" : ""}{entry.points_delta}</i><span><strong>{customer?.full_name ?? "Deleted customer"}</strong><small>{entry.description || entry.method} · {format(new Date(entry.created_at), "MMM d, yyyy")}</small></span><StatusBadge status={entry.method} /></article>; })}</div> : <EmptyState icon={<Trophy />} title="No point entries yet" text="Customer starting values will show in balances without creating a ledger entry." />}</section>
    </div>
  );
}

function CatalogPanel({ catalog, onEdit, onNew }: { catalog: CatalogItem[]; onEdit: (item: CatalogItem) => void; onNew: () => void }) {
  const [section, setSection] = useState<CatalogItem["section"]>("package");
  const items = catalog.filter((item) => item.section === section).sort((a, b) => a.sort_order - b.sort_order);
  return (
    <section className="employee-panel catalog-manager">
      <header><div><span>PUBLIC CATALOG</span><h3>Packages & pricing</h3><p>Save private drafts, then publish when the changes are ready for the public website.</p></div><button className="primary-action" type="button" onClick={onNew}><Plus /> Add item</button></header>
      <div className="catalog-tabs">{catalogSections.map((item) => <button className={item === section ? "active" : ""} type="button" key={item} onClick={() => setSection(item)}>{item === "addon" ? "Add-ons" : `${item}s`}</button>)}</div>
      <div className="catalog-list">{items.map((item) => <button type="button" key={item.id} onClick={() => onEdit(item)}><span className="catalog-order">{String(item.sort_order).padStart(2, "0")}</span><span className="catalog-description"><strong>{item.level_label && <em>{item.level_label}</em>}{item.name}</strong><small>{item.summary || "No description"}</small></span><span className="catalog-price">{item.is_quote_only ? "Quote only" : item.primary_price === null ? "No price" : `${item.is_starting_at ? "From " : ""}${money(item.primary_price)}`}<small>{item.secondary_price !== null && `${money(item.secondary_price)} secondary`}</small></span><span className="catalog-flags">{item.draft_content && <b className="draft-badge">Draft</b>}<StatusBadge status={item.is_active ? "live" : "hidden"} />{item.is_featured && <b>Featured</b>}</span><Pencil /></button>)}</div>
    </section>
  );
}

function CustomerModal({ current, busy, onClose, onSave, onDelete }: { current: Customer | "new"; busy: boolean; onClose: () => void; onSave: (event: FormEvent<HTMLFormElement>, current: Customer | "new") => void; onDelete: (customer: Customer) => void }) {
  const customer = current === "new" ? null : current;
  return <Modal title={customer ? `Edit ${customer.full_name}` : "Add customer"} onClose={onClose}><form className="employee-form modal-form" onSubmit={(event) => onSave(event, current)}><label>Full name<input name="full_name" required maxLength={120} defaultValue={customer?.full_name} /></label><div className="form-row"><label>Phone<input name="phone" type="tel" maxLength={30} defaultValue={customer?.phone ?? ""} /></label><label>Email<input name="email" type="email" maxLength={254} defaultValue={customer?.email ?? ""} /></label></div><label>Vehicle details<input name="vehicle_details" maxLength={300} defaultValue={customer?.vehicle_details ?? ""} placeholder="Year, make, model, color or condition" /></label><label>Starting points<input name="starting_points" type="number" min="0" step="1" required defaultValue={customer?.starting_points ?? 0} /><small>This sets the customer’s base balance. Later changes belong in the point ledger.</small></label><label>Notes<textarea name="notes" rows={4} defaultValue={customer?.notes ?? ""} /></label><footer>{customer && <button className="danger-action" type="button" onClick={() => onDelete(customer)} disabled={busy}><Trash2 /> Delete</button>}<span /><button className="secondary-action" type="button" onClick={onClose}>Cancel</button><button className="primary-action" type="submit" disabled={busy}><Check /> Save customer</button></footer></form></Modal>;
}

function AssigneeFields({ employees, selectedIds = [] }: { employees: EmployeeAccess[]; selectedIds?: string[] }) {
  return (
    <fieldset>
      <legend>Assigned employees</legend>
      {employees.length ? (
        <div className="employee-assignee-grid">
          {employees.map((employee) => (
            <label key={employee.user_id}>
              <input name="assigned_user_ids" type="checkbox" value={employee.user_id} defaultChecked={selectedIds.includes(employee.user_id)} />
              <span>{employee.display_name} · {employee.role === "admin" ? "Admin" : "Employee"}</span>
            </label>
          ))}
        </div>
      ) : <small>Add an employee before assigning this job.</small>}
    </fieldset>
  );
}

function AppointmentModal({
  current,
  customers,
  catalog,
  employees,
  assignments,
  busy,
  onClose,
  onSave,
  onDelete,
}: {
  current: Appointment | "new";
  customers: Customer[];
  catalog: CatalogItem[];
  employees: EmployeeAccess[];
  assignments: AppointmentAssignment[];
  busy: boolean;
  onClose: () => void;
  onSave: (event: FormEvent<HTMLFormElement>, current: Appointment | "new") => void;
  onDelete: (appointment: Appointment) => void;
}) {
  const appointment = current === "new" ? null : current;
  const [defaults] = useState(() => ({
    start: appointment?.starts_at ?? new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    end: appointment?.ends_at ?? new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
  }));
  const selectedIds = appointment
    ? assignments.filter((item) => item.appointment_id === appointment.id).map((item) => item.user_id)
    : [];

  return (
    <Modal title={appointment ? "Edit calendar item" : "Add calendar item"} onClose={onClose} wide>
      <form className="employee-form modal-form" onSubmit={(event) => onSave(event, current)}>
        <div className="form-row">
          <label>Type<select name="kind" defaultValue={appointment?.kind ?? "detailing"}>{appointmentKinds.map((kind) => <option key={kind} value={kind}>{kind.charAt(0).toUpperCase() + kind.slice(1)}</option>)}</select></label>
          <label>Status<select name="status" defaultValue={appointment?.status ?? "tentative"}>{appointmentStatuses.map((status) => <option key={status} value={status}>{status.replace("_", " ")}</option>)}</select></label>
        </div>
        <label>Title<input name="title" required maxLength={160} defaultValue={appointment?.title ?? ""} placeholder="Example: Full Detail — Smith" /></label>
        <div className="form-row">
          <label>Start<input name="starts_at" type="datetime-local" required defaultValue={dateTimeLocal(defaults.start)} /></label>
          <label>End<input name="ends_at" type="datetime-local" required defaultValue={dateTimeLocal(defaults.end)} /></label>
        </div>
        <label className="check-label"><input name="all_day" type="checkbox" defaultChecked={appointment?.all_day} /> All-day item</label>
        <AssigneeFields employees={employees} selectedIds={selectedIds} />
        <div className="form-row">
          <label>Customer<select name="customer_id" defaultValue={appointment?.customer_id ?? ""}><option value="">No linked customer</option>{customers.map((customer) => <option value={customer.id} key={customer.id}>{customer.full_name}</option>)}</select></label>
          <label>Package / class<select name="catalog_item_id" defaultValue={appointment?.catalog_item_id ?? ""}><option value="">No linked catalog item</option>{catalog.filter((item) => item.is_active).map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
        </div>
        <div className="form-row">
          <label>Location<input name="location" defaultValue={appointment?.location ?? ""} /></label>
          <label>Final amount<input name="final_amount" type="number" min="0" step="0.01" defaultValue={appointment?.final_amount ?? ""} /></label>
        </div>
        <label>Vehicle details<input name="vehicle_details" defaultValue={appointment?.vehicle_details ?? ""} /></label>
        <label>Notes<textarea name="notes" rows={4} defaultValue={appointment?.notes ?? ""} /></label>
        <footer>
          {appointment && <button className="danger-action" type="button" onClick={() => onDelete(appointment)} disabled={busy}><Trash2 /> Delete</button>}
          <span />
          <button className="secondary-action" type="button" onClick={onClose}>Cancel</button>
          <button className="primary-action" type="submit" disabled={busy}><Check /> Save item</button>
        </footer>
      </form>
    </Modal>
  );
}

function AppointmentDetailsModal({
  appointment,
  customers,
  employees,
  assignments,
  onClose,
}: {
  appointment: Appointment;
  customers: Customer[];
  employees: EmployeeAccess[];
  assignments: AppointmentAssignment[];
  onClose: () => void;
}) {
  const customer = customers.find((item) => item.id === appointment.customer_id);
  const employeeNames = new Map(employees.map((employee) => [employee.user_id, employee.display_name]));
  const team = assignments
    .filter((item) => item.appointment_id === appointment.id)
    .map((item) => employeeNames.get(item.user_id))
    .filter((name): name is string => Boolean(name));

  return (
    <Modal title={appointment.title} onClose={onClose}>
      <div className="appointment-details">
        <div className="appointment-details-grid">
          <span><b>When</b>{format(new Date(appointment.starts_at), "EEE, MMM d · h:mm a")} – {format(new Date(appointment.ends_at), "h:mm a")}</span>
          <span><b>Status</b><StatusBadge status={appointment.status} /></span>
          <span><b>Customer</b>{customer?.full_name ?? "No linked customer"}</span>
          <span><b>Location</b>{appointment.location ?? "Not added"}</span>
          <span><b>Vehicle</b>{appointment.vehicle_details ?? "Not added"}</span>
          <span><b>Type</b>{appointment.kind}</span>
        </div>
        <div className="appointment-team-list"><b>Assigned team</b>{team.length ? team.join(", ") : "No employees assigned"}</div>
        {appointment.notes && <p>{appointment.notes}</p>}
      </div>
    </Modal>
  );
}

function CatalogModal({ current, busy, onClose, onSave }: { current: CatalogItem | "new"; busy: boolean; onClose: () => void; onSave: (event: FormEvent<HTMLFormElement>, current: CatalogItem | "new") => void }) {
  const item = current === "new" ? null : current;
  const values = item?.draft_content ?? item;
  return <Modal title={item ? `Edit ${item.name}` : "Add catalog item"} onClose={onClose} wide><form className="employee-form modal-form" onSubmit={(event) => onSave(event, current)}><div className="draft-explainer"><Package /><span><strong>{item?.draft_content ? "This item has an unpublished draft." : "Drafts stay private."}</strong><small>Save Draft to keep working without changing the public website. Publish when ready.</small></span></div><div className="form-row"><label>Section<select name="section" defaultValue={item?.section ?? "package"} disabled={Boolean(item)}>{catalogSections.map((section) => <option key={section}>{section}</option>)}</select>{item && <input type="hidden" name="section" value={item.section} />}</label><label>URL slug<input name="slug" required defaultValue={item?.slug ?? ""} placeholder="Created from name if blank" disabled={Boolean(item)} />{item && <input type="hidden" name="slug" value={item.slug} />}</label></div><div className="form-row"><label>Level / eyebrow <span>optional</span><input name="level_label" defaultValue={values?.level_label ?? ""} placeholder="Example: LEVEL 1" /></label><label>Display order<input name="sort_order" type="number" step="1" defaultValue={values?.sort_order ?? 10} required /></label></div><label>Name<input name="name" required maxLength={120} defaultValue={values?.name ?? ""} /></label><label>Summary<textarea name="summary" rows={3} defaultValue={values?.summary ?? ""} /></label><div className="form-row"><label>Primary price<input name="primary_price" type="number" min="0" step="0.01" defaultValue={values?.primary_price ?? ""} /></label><label>Primary price label<input name="primary_price_label" defaultValue={values?.primary_price_label ?? ""} placeholder="Cars / mid-size" /></label></div><div className="form-row"><label>Secondary price <span>optional</span><input name="secondary_price" type="number" min="0" step="0.01" defaultValue={values?.secondary_price ?? ""} /></label><label>Secondary price label <span>optional</span><input name="secondary_price_label" defaultValue={values?.secondary_price_label ?? ""} placeholder="Large SUV / truck / van" /></label></div><label>Included features <span>one per line</span><textarea name="features" rows={5} defaultValue={values?.features.join("\n") ?? ""} /></label><div className="checkbox-grid"><label><input name="is_starting_at" type="checkbox" defaultChecked={values?.is_starting_at} /><span><strong>Starting at</strong><small>Display “from” before the price</small></span></label><label><input name="is_quote_only" type="checkbox" defaultChecked={values?.is_quote_only} /><span><strong>Quote only</strong><small>Hide prices and request a quote</small></span></label><label><input name="is_featured" type="checkbox" defaultChecked={values?.is_featured} /><span><strong>Featured</strong><small>Visually emphasize this item</small></span></label><label><input name="is_active" type="checkbox" defaultChecked={values?.is_active ?? true} /><span><strong>Visible</strong><small>Show this item publicly</small></span></label></div><footer><span /><button className="secondary-action" type="button" onClick={onClose}>Cancel</button><button className="secondary-action" name="intent" value="draft" type="submit" disabled={busy}>Save draft</button><button className="primary-action" name="intent" value="publish" type="submit" disabled={busy}><ArrowRight /> Publish</button></footer></form></Modal>;
}

function RewardModal({ current, busy, onClose, onSave }: { current: Reward | "new"; busy: boolean; onClose: () => void; onSave: (event: FormEvent<HTMLFormElement>, current: Reward | "new") => void }) {
  const reward = current === "new" ? null : current;
  return <Modal title={reward ? "Edit reward" : "Add reward"} onClose={onClose}><form className="employee-form modal-form" onSubmit={(event) => onSave(event, current)}><label>Name<input name="name" required maxLength={160} defaultValue={reward?.name ?? ""} /></label><label>Description<textarea name="description" rows={3} defaultValue={reward?.description ?? ""} /></label><div className="form-row"><label>Points required<input name="points_cost" type="number" min="1" step="1" required defaultValue={reward?.points_cost ?? 25} /></label><label>Display order<input name="sort_order" type="number" step="1" required defaultValue={reward?.sort_order ?? 10} /></label></div><label className="check-label"><input name="is_active" type="checkbox" defaultChecked={reward?.is_active ?? true} /> Show this reward publicly</label><footer><span /><button className="secondary-action" type="button" onClick={onClose}>Cancel</button><button className="primary-action" type="submit" disabled={busy}><Check /> Save reward</button></footer></form></Modal>;
}

function ConvertInquiryModal({
  inquiry,
  loyalty,
  employees,
  busy,
  onClose,
  onSave,
}: {
  inquiry: Inquiry;
  loyalty: LoyaltySettings;
  employees: EmployeeAccess[];
  busy: boolean;
  onClose: () => void;
  onSave: (event: FormEvent<HTMLFormElement>, inquiry: Inquiry) => void;
}) {
  const [defaults] = useState(() => {
    const start = new Date(Date.now() + 24 * 60 * 60 * 1000);
    start.setMinutes(0, 0, 0);
    return { start, end: new Date(start.getTime() + 2 * 60 * 60 * 1000) };
  });
  const interest = inquiry.service_interest || inquiry.class_interest || (inquiry.request_type === "class" ? "Detailing class" : "Detailing appointment");

  return (
    <Modal title={"Schedule " + inquiry.name} onClose={onClose}>
      <form className="employee-form modal-form" onSubmit={(event) => onSave(event, inquiry)}>
        <div className="conversion-summary"><UserRound /><span><strong>{inquiry.name}</strong><small>{inquiry.phone} · {interest}</small></span></div>
        <label>Calendar title<input name="title" required defaultValue={interest + " — " + inquiry.name} /></label>
        <div className="form-row">
          <label>Start<input name="starts_at" type="datetime-local" required defaultValue={dateTimeLocal(defaults.start.toISOString())} /></label>
          <label>End<input name="ends_at" type="datetime-local" required defaultValue={dateTimeLocal(defaults.end.toISOString())} /></label>
        </div>
        <AssigneeFields employees={employees} />
        <label>Service location<input name="location" defaultValue={inquiry.county ? inquiry.county + " County" : ""} /></label>
        {!inquiry.customer_id && <label>Customer starting points<input name="starting_points" type="number" min="0" step="1" required defaultValue={0} /><small>The public enrollment offer is currently {loyalty.enrollment_points} points; this customer-specific value can be changed now or later.</small></label>}
        <footer>
          <span />
          <button className="secondary-action" type="button" onClick={onClose}>Cancel</button>
          <button className="primary-action" type="submit" disabled={busy}><CalendarDays /> Create customer & schedule</button>
        </footer>
      </form>
    </Modal>
  );
}

function EmptyState({ icon, title, text, action }: { icon: ReactNode; title: string; text: string; action?: ReactNode }) {
  return <div className="employee-empty">{icon}<h4>{title}</h4><p>{text}</p>{action}</div>;
}
