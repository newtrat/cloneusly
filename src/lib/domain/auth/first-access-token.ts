import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { getEnv } from "@/lib/env";

const DEFAULT_TTL_MS = 30 * 60 * 1000; // 30 minutes
const TOKEN_PURPOSE = "first-access";

type TokenPayload = {
  p: typeof TOKEN_PURPOSE;
  e: string;
  x: number;
};

function base64UrlEncode(input: string): string {
  return Buffer.from(input, "utf8").toString("base64url");
}

function base64UrlDecode(input: string): string | null {
  try {
    return Buffer.from(input, "base64url").toString("utf8");
  } catch {
    return null;
  }
}

function sign(payloadSegment: string, secret: string): string {
  return createHmac("sha256", secret).update(payloadSegment).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Creates a stateless, signed, time-boxed token proving the bearer received it
 * for `email`. Used to gate the first-access password step behind email
 * ownership without a database round-trip. `now`/`ttlMs` are injectable for tests.
 */
export function createFirstAccessToken(
  email: string,
  options: { secret?: string; now?: number; ttlMs?: number } = {},
): string {
  const secret = options.secret ?? getEnv().BETTER_AUTH_SECRET;
  const now = options.now ?? Date.now();
  const ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;

  const payload: TokenPayload = {
    p: TOKEN_PURPOSE,
    e: email.trim().toLowerCase(),
    x: now + ttlMs,
  };
  const payloadSegment = base64UrlEncode(JSON.stringify(payload));
  const signature = sign(payloadSegment, secret);
  return `${payloadSegment}.${signature}`;
}

/**
 * Verifies a first-access token and returns the associated email when the
 * signature is valid and the token has not expired; otherwise returns null.
 */
export function verifyFirstAccessToken(
  token: string,
  options: { secret?: string; now?: number } = {},
): { email: string } | null {
  const secret = options.secret ?? getEnv().BETTER_AUTH_SECRET;
  const now = options.now ?? Date.now();

  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payloadSegment, signature] = parts;

  const expected = sign(payloadSegment, secret);
  if (!safeEqual(signature, expected)) return null;

  const decoded = base64UrlDecode(payloadSegment);
  if (!decoded) return null;

  let payload: TokenPayload;
  try {
    payload = JSON.parse(decoded) as TokenPayload;
  } catch {
    return null;
  }

  if (payload.p !== TOKEN_PURPOSE) return null;
  if (typeof payload.e !== "string" || typeof payload.x !== "number") {
    return null;
  }
  if (now > payload.x) return null;

  return { email: payload.e };
}
