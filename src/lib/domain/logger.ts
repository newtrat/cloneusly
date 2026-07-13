import "server-only";

import { randomUUID } from "node:crypto";

export type LogLevel = "info" | "warn" | "error";

export type OperationLogContext = {
  operation: string;
  correlationId?: string;
  userId?: string;
  [key: string]: unknown;
};

export function createCorrelationId(): string {
  return randomUUID();
}

export function logOperation(
  level: LogLevel,
  message: string,
  context: OperationLogContext,
): void {
  const payload = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...context,
  };

  const line = JSON.stringify(payload);

  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.info(line);
  }
}
