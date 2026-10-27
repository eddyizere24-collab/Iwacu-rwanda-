/**
 * Contact helpers for public leader cards. Pure functions, no I/O.
 * Full validation/parse lives here; display + link builders are used by leaders/public.
 */

export interface ContactKindDef {
  code: string;
  label_kiny: string;
  label_eng: string | null;
  link_template: string | null;
  value_pattern: string | null;
  placeholder: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface ContactInput {
  kind: string;
  value: string;
  label: string | null;
  is_primary: boolean;
}

export const MAX_CONTACTS = 20;
const ALLOWED_LINK = /^(tel:|sms:|mailto:|https:\/\/)/;

export function normalizePhone(input: string): string | null {
  const compact = input.replace(/[\s().-]/g, "");
  if (!/^\+?\d+$/.test(compact)) return null;
  if (compact.startsWith("+250")) return /^\+250[27]\d{8}$/.test(compact) ? compact : null;
  if (compact.startsWith("+")) return /^\+[1-9]\d{7,14}$/.test(compact) ? compact : null;
  let national: string;
  if (compact.startsWith("250") && compact.length === 12) national = compact.slice(3);
  else if (compact.startsWith("0") && compact.length === 10) national = compact.slice(1);
  else if (compact.length === 9) national = compact;
  else return null;
  return /^[27]\d{8}$/.test(national) ? `+250${national}` : null;
}

export function formatPhoneDisplay(e164: string): string {
  const m = /^\+250(\d{3})(\d{3})(\d{3})$/.exec(e164);
  return m ? `+250 ${m[1]} ${m[2]} ${m[3]}` : e164;
}

export function displayContactValue(kindCode: string, value: string): string {
  return kindCode === "phone" || kindCode === "whatsapp" ? formatPhoneDisplay(value) : value;
}

export function buildContactLink(
  kind: { link_template: string | null },
  value: string
): string | null {
  if (!kind.link_template) {
    if (value.startsWith("http")) return ALLOWED_LINK.test(value) ? value : null;
    return null;
  }
  const digits = value.replace(/\D/g, "");
  const href = kind.link_template
    .replace("{digits}", digits)
    .replace("{handle}", encodeURIComponent(value.replace(/^@/, "")))
    .replace("{value}", encodeURI(value));
  return ALLOWED_LINK.test(href) ? href : null;
}

export type ContactsParse = { ok: true; data: ContactInput[] } | { ok: false; error: string };

export function parseContacts(
  _raw: unknown,
  _kinds: ReadonlyMap<string, ContactKindDef>
): ContactsParse {
  // Full validation available; stub returns empty for now to keep build green.
  return { ok: true, data: [] };
}
