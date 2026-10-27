/**
 * Contact details of a leader (phone, WhatsApp, e-mail, social ...). Pure functions, no I/O.
 *
 * The list of KINDS lives in the database (`contact_kinds`) so an admin can add a new one without
 * a developer. The database is the final authority on the format of a value (`contact_kinds.value_pattern`).
 */

export interface ContactKindDef {
  code: string;
  label_kiny: string;
  label_eng: string | null;
  icon: string | null;
  value_pattern: string | null; // regex or simple hint
  is_phone: boolean;
  is_public: boolean;
}

export interface ContactInput {
  kind: string;
  value: string;
  is_primary?: boolean;
  note?: string | null;
}

export const MAX_CONTACTS = 20;

/** Very light E.164-ish normalizer for Rwanda (+250). Returns null if unusable. */
export function normalizePhone(input: string): string | null {
  if (!input || typeof input !== "string") return null;
  let s = input.trim().replace(/[\s\-\.\(\)]/g, "");
  if (s.startsWith("00")) s = "+" + s.slice(2);
  if (s.startsWith("0") && s.length === 10) s = "+250" + s.slice(1);
  if (s.startsWith("250") && s.length === 12) s = "+" + s;
  if (!s.startsWith("+")) s = "+" + s;
  // Rwanda mobile: +2507xxxxxxxx (12 digits after +)
  if (/^\+2507\d{8}$/.test(s)) return s;
  // Allow other +E.164 that look plausible
  if (/^\+[1-9]\d{7,14}$/.test(s)) return s;
  return null;
}

export function formatPhoneDisplay(e164: string): string {
  if (!e164) return "";
  if (e164.startsWith("+250") && e164.length === 13) {
    return `0${e164.slice(4, 7)} ${e164.slice(7, 10)} ${e164.slice(10)}`;
  }
  return e164;
}

/** Mask for public display: show first 4 and last 2, rest as • */
export function maskPhone(e164: string | null | undefined): string {
  if (!e164) return "";
  const d = e164.replace(/\D/g, "");
  if (d.length < 8) return "••••";
  return d.slice(0, 4) + "•".repeat(Math.max(0, d.length - 6)) + d.slice(-2);
}

export function isValidContactValue(kind: string, value: string, kinds?: ContactKindDef[]): boolean {
  if (!value || value.trim().length === 0) return false;
  if (kind === "phone" || kind === "whatsapp" || kind === "mobile") {
    return normalizePhone(value) !== null;
  }
  if (kind === "email") {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  }
  // fallback: non-empty and reasonable length
  return value.trim().length >= 3 && value.trim().length <= 200;
}

export function sanitizeContactInput(input: ContactInput): ContactInput | null {
  const kind = (input.kind || "").trim().toLowerCase();
  let value = (input.value || "").trim();
  if (!kind || !value) return null;
  if (kind === "phone" || kind === "whatsapp" || kind === "mobile") {
    const n = normalizePhone(value);
    if (!n) return null;
    value = n;
  }
  return {
    kind,
    value,
    is_primary: !!input.is_primary,
    note: input.note?.trim() || null,
  };
}
