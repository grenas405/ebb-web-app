/**
 * validate.ts — Explicit, composable input validation.
 *
 * Validators are small functions returning a Result. They never throw on bad
 * user input; callers decide how to respond. This keeps the "validate at the
 * boundary" OWASP principle local and testable.
 */

export type Result<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: string };

const ok = <T>(value: T): Result<T> => ({ ok: true, value });
const err = (error: string): Result<never> => ({ ok: false, error });

/**
 * Trim and bound the length of a free-text field. A missing field (null) is
 * treated as empty, so an optional field (min 0) passes whether the form sends
 * "" or omits it entirely, while a required field reports "is required".
 */
export function text(raw: unknown, field: string, min: number, max: number): Result<string> {
  const v = (typeof raw === "string" ? raw : "").trim();
  if (v.length === 0) return min > 0 ? err(`${field} is required.`) : ok(v);
  if (v.length < min) return err(`${field} must be at least ${min} characters.`);
  if (v.length > max) return err(`${field} must be ${max} characters or fewer.`);
  return ok(v);
}

/** Validate a US-style phone number (digits, with optional formatting). */
export function phone(raw: unknown): Result<string> {
  if (typeof raw !== "string") return err("Phone number is required.");
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 11) return err("Enter a valid phone number.");
  return ok(digits);
}

/** Validate an email address with a conservative pattern (optional field). */
export function emailOptional(raw: unknown): Result<string> {
  if (typeof raw !== "string" || raw.trim() === "") return ok("");
  const v = raw.trim();
  if (v.length > 254 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) {
    return err("Enter a valid email address.");
  }
  return ok(v);
}

/** Parse and bound a positive bail amount in dollars. */
export function money(raw: unknown, field: string, max: number): Result<number> {
  if (typeof raw !== "string" && typeof raw !== "number") return err(`${field} is required.`);
  const n = Number(String(raw).replace(/[$,\s]/g, ""));
  if (!Number.isFinite(n) || n <= 0) return err(`Enter a valid ${field}.`);
  if (n > max) return err(`${field} exceeds the supported maximum.`);
  return ok(Math.round(n * 100) / 100);
}

/** A validated bail-bond lead captured from the contact form. */
export interface Lead {
  readonly name: string;
  readonly phone: string;
  readonly email: string;
  readonly defendant: string;
  readonly facility: string;
  readonly message: string;
}

/**
 * Validate a full lead submission, accumulating the first error per field.
 * Returns the clean Lead or the first validation error encountered.
 */
export function validateLead(form: FormData): Result<Lead> {
  const name = text(form.get("name"), "Name", 2, 80);
  if (!name.ok) return name;
  const ph = phone(form.get("phone"));
  if (!ph.ok) return ph;
  const email = emailOptional(form.get("email"));
  if (!email.ok) return email;
  const defendant = text(form.get("defendant"), "Defendant name", 2, 80);
  if (!defendant.ok) return defendant;
  const facility = text(form.get("facility"), "Jail / facility", 0, 120);
  if (!facility.ok) return facility;
  const message = text(form.get("message"), "Message", 0, 2000);
  if (!message.ok) return message;

  return ok({
    name: name.value,
    phone: ph.value,
    email: email.value,
    defendant: defendant.value,
    facility: facility.value,
    message: message.value,
  });
}
