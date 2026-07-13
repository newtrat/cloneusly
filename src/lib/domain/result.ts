import "server-only";

export type ErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "VALIDATION_ERROR"
  | "USER_INACTIVE"
  | "RECIPIENT_NOT_FOUND"
  | "DUPLICATE_RECIPIENT"
  | "SELF_RECOGNITION"
  | "INSUFFICIENT_GIVING_POINTS"
  | "INSUFFICIENT_RECEIVED_POINTS"
  | "TEST_MODE_DISABLED"
  | "IDEMPOTENCY_CONFLICT"
  | "RECOGNITION_NOT_FOUND"
  | "GIF_HOST_NOT_ALLOWED"
  | "CONFLICT_RETRY_EXHAUSTED"
  | "INTERNAL_ERROR";

export type CommandError = {
  code: ErrorCode;
  message: string;
  fieldErrors?: Record<string, string[]>;
  correlationId?: string;
};

export type CommandResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: CommandError };

export function ok<T>(data: T): CommandResult<T> {
  return { ok: true, data };
}

export function err<T>(
  code: ErrorCode,
  message: string,
  extras?: Omit<CommandError, "code" | "message">,
): CommandResult<T> {
  return {
    ok: false,
    error: { code, message, ...extras },
  };
}
