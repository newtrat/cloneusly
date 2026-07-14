import "server-only";

import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

import { getEnv } from "@/lib/env";
import { prisma } from "@/lib/prisma";

const CODE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const CODE_LENGTH = 6;

function identifierFor(email: string): string {
  return `first-access-code:${email.trim().toLowerCase()}`;
}

/** Generates a zero-padded numeric code (e.g. "042317"). */
export function generateVerificationCode(): string {
  const max = 10 ** CODE_LENGTH;
  return String(randomInt(0, max)).padStart(CODE_LENGTH, "0");
}

/** Deterministic keyed hash of a code so plaintext codes are never stored. */
export function hashVerificationCode(code: string, secret?: string): string {
  const key = secret ?? getEnv().BETTER_AUTH_SECRET;
  return createHmac("sha256", key).update(code.trim()).digest("hex");
}

export function codesMatch(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Stores a freshly hashed verification code for an email, replacing any prior
 * outstanding code for that email. Reuses Better Auth's `Verification` table so
 * no schema change is needed.
 */
export async function storeVerificationCode(
  email: string,
  code: string,
): Promise<void> {
  const identifier = identifierFor(email);
  await prisma.$transaction(async (tx) => {
    await tx.verification.deleteMany({ where: { identifier } });
    await tx.verification.create({
      data: {
        identifier,
        value: hashVerificationCode(code),
        expiresAt: new Date(Date.now() + CODE_TTL_MS),
      },
    });
  });
}

/**
 * Verifies a submitted code for an email in constant time and consumes it
 * (single use). Returns true only when a non-expired matching code exists.
 */
export async function consumeVerificationCode(
  email: string,
  code: string,
): Promise<boolean> {
  const identifier = identifierFor(email);
  const record = await prisma.verification.findFirst({
    where: { identifier },
    orderBy: { createdAt: "desc" },
  });

  if (!record) return false;

  const expired = record.expiresAt.getTime() < Date.now();
  const matches = codesMatch(record.value, hashVerificationCode(code));

  // Always clear outstanding codes for this email after an attempt so a code
  // cannot be brute-forced or reused.
  await prisma.verification.deleteMany({ where: { identifier } });

  return !expired && matches;
}
