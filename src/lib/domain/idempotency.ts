import "server-only";

import { createHash } from "node:crypto";

export function canonicalizeForHash(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

export function hashRequestInput(value: unknown): string {
  return createHash("sha256").update(canonicalizeForHash(value)).digest("hex");
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return Object.keys(record)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = sortKeys(record[key]);
        return acc;
      }, {});
  }
  return value;
}

export function userIdempotencyScope(userId: string): string {
  return `user:${userId}`;
}
