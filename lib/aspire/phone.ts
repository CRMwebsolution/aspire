export function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

export function normalizePhone(value: string | null | undefined) {
  const digits = digitsOnly(value ?? "");
  if (!digits) return "";
  if (digits.length === 11 && digits.startsWith("1")) return digits.slice(1);
  return digits;
}

export function isUsablePhone(value: string | null | undefined) {
  const normalized = normalizePhone(value);
  return normalized.length >= 10 && normalized.length <= 15;
}

export function formatPhone(value: string | null | undefined) {
  const normalized = normalizePhone(value);
  if (normalized.length === 10) {
    return `(${normalized.slice(0, 3)}) ${normalized.slice(3, 6)}-${normalized.slice(6)}`;
  }
  return value?.trim() || "";
}

export function phonesMatch(left: string | null | undefined, right: string | null | undefined) {
  const a = normalizePhone(left);
  const b = normalizePhone(right);
  return Boolean(a) && a === b;
}
