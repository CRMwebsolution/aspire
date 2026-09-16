import type { Appointment, AppointmentAssignment, CatalogItem } from "@/lib/aspire/types";

export const DEFAULT_DURATION_MINUTES = 60;

export function catalogDuration(item: Pick<CatalogItem, "duration_minutes"> | undefined) {
  const minutes = Number(item?.duration_minutes ?? 0);
  return minutes > 0 ? minutes : DEFAULT_DURATION_MINUTES;
}

export function totalDurationMinutes(items: Array<Pick<CatalogItem, "duration_minutes"> | undefined>) {
  const total = items.reduce((sum, item) => sum + (item ? catalogDuration(item) : 0), 0);
  return total > 0 ? total : DEFAULT_DURATION_MINUTES;
}

export function addMinutes(isoOrLocal: string, minutes: number) {
  const date = new Date(isoOrLocal);
  return new Date(date.getTime() + minutes * 60_000);
}

export function catalogPrice(item: CatalogItem | undefined) {
  if (!item || item.is_quote_only || item.primary_price === null) return 0;
  return Number(item.primary_price) || 0;
}

export function totalCatalogPrice(items: CatalogItem[]) {
  const total = items.reduce((sum, item) => sum + catalogPrice(item), 0);
  return total > 0 ? total : null;
}

export function autoJobTitle(options: {
  kind: "detailing" | "class" | "blocked";
  packageName?: string | null;
  addonNames?: string[];
  courseName?: string | null;
  customerName?: string | null;
}) {
  if (options.kind === "blocked") return "Blocked time";
  const service = options.kind === "class"
    ? options.courseName || "Detailing class"
    : [options.packageName, ...(options.addonNames ?? [])].filter(Boolean).join(" + ") || "Detailing";
  return options.customerName ? `${service} — ${options.customerName}` : service;
}

export function appointmentsOverlap(leftStart: string, leftEnd: string, rightStart: string, rightEnd: string) {
  return new Date(leftStart) < new Date(rightEnd) && new Date(rightStart) < new Date(leftEnd);
}

export function overlappingAssignees(options: {
  appointmentId?: string | null;
  startsAt: string;
  endsAt: string;
  assignedUserIds: string[];
  appointments: Appointment[];
  assignments: AppointmentAssignment[];
}) {
  if (!options.assignedUserIds.length) return [] as string[];
  const overlappingIds = new Set<string>();
  for (const appointment of options.appointments) {
    if (appointment.id === options.appointmentId) continue;
    if (appointment.status === "cancelled") continue;
    if (!appointmentsOverlap(options.startsAt, options.endsAt, appointment.starts_at, appointment.ends_at)) continue;
    options.assignments
      .filter((assignment) => assignment.appointment_id === appointment.id && options.assignedUserIds.includes(assignment.user_id))
      .forEach((assignment) => overlappingIds.add(assignment.user_id));
  }
  return [...overlappingIds];
}
