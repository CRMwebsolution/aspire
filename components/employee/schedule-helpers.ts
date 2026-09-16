export function dateTimeLocal(iso?: string | null) {
  const date = iso ? new Date(iso) : new Date();
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function parseVehicleList(value: string | string[] | null | undefined) {
  if (Array.isArray(value)) return value.map((item) => item.trim()).filter(Boolean);
  return String(value ?? "").split(/\n|,/).map((item) => item.trim()).filter(Boolean);
}

export function appendVehicle(existing: string[] | null | undefined, incoming: string | null | undefined) {
  const next = parseVehicleList(existing);
  const candidate = String(incoming ?? "").trim();
  if (!candidate) return next;
  if (next.some((item) => item.toLowerCase() === candidate.toLowerCase())) return next;
  return [...next, candidate];
}
