import "server-only";

import { Prisma } from "@prisma/client";

const DEFAULT_MAX_RETRIES = 3;

export function isSerializationConflict(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2034"
  );
}

export async function withSerializableRetry<T>(
  fn: () => Promise<T>,
  maxRetries = DEFAULT_MAX_RETRIES,
): Promise<T> {
  let attempt = 0;

  while (true) {
    try {
      return await fn();
    } catch (error) {
      if (!isSerializationConflict(error) || attempt >= maxRetries) {
        throw error;
      }
      attempt += 1;
    }
  }
}
