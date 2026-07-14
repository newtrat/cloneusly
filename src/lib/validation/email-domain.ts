import { getEnv } from "@/lib/env";

/**
 * Returns the normalized local domain (host part) of an email, or null when the
 * value is not a well-formed single-`@` address.
 */
export function emailDomain(email: string): string | null {
  const normalized = email.trim().toLowerCase();
  const at = normalized.lastIndexOf("@");
  if (at <= 0 || at !== normalized.indexOf("@")) return null;
  const domain = normalized.slice(at + 1);
  if (domain.length === 0 || domain.includes(" ")) return null;
  return domain;
}

/**
 * Pure domain check used by signup/first-access flows so tests don't need env.
 * Accepts the address only when its domain matches `allowedDomain` exactly.
 */
export function emailHasDomain(email: string, allowedDomain: string): boolean {
  const domain = emailDomain(email);
  if (!domain) return false;
  return domain === allowedDomain.trim().toLowerCase().replace(/^@/, "");
}

export function getAllowedSignupDomain(): string {
  return getEnv().ALLOWED_SIGNUP_EMAIL_DOMAIN;
}

/**
 * Environment-aware check: is this a company email allowed to self-provision?
 */
export function isAllowedCompanyEmail(email: string): boolean {
  return emailHasDomain(email, getAllowedSignupDomain());
}
