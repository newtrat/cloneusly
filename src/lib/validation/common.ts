import { z } from "zod";

export const MAX_SAFE_POINTS = Number.MAX_SAFE_INTEGER;

export const requestIdSchema = z
  .string()
  .trim()
  .min(8, "Request ID must be at least 8 characters")
  .max(128, "Request ID must be at most 128 characters");

export const positiveSafeIntegerSchema = z
  .number()
  .int("Amount must be a whole number")
  .positive("Amount must be positive")
  .max(MAX_SAFE_POINTS, "Amount exceeds safe integer limit");

export const positiveSafeIntegerFromInput = z.coerce
  .number()
  .int("Amount must be a whole number")
  .positive("Amount must be positive")
  .max(MAX_SAFE_POINTS, "Amount exceeds safe integer limit");

export function computeTotalCost(
  pointsPerRecipient: number,
  recipientCount: number,
): number | null {
  if (recipientCount <= 0) return null;
  const total = pointsPerRecipient * recipientCount;
  if (!Number.isSafeInteger(total)) return null;
  return total;
}

export function hasDuplicateStrings(values: string[]): boolean {
  return new Set(values).size !== values.length;
}

export const trimmedNonEmptyString = (max: number, label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .max(max, `${label} must be at most ${max} characters`);
