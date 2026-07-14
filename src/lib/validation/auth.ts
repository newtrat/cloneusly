import { z } from "zod";

function toFieldErrors(error: z.ZodError): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const path = issue.path.join(".") || "_form";
    fieldErrors[path] = fieldErrors[path] ?? [];
    fieldErrors[path].push(issue.message);
  }
  return fieldErrors;
}

export const requestFirstAccessInputSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Invalid email address"),
});

export type RequestFirstAccessInput = z.infer<
  typeof requestFirstAccessInputSchema
>;

export function parseRequestFirstAccessInput(
  input: unknown,
):
  | { ok: true; data: RequestFirstAccessInput }
  | { ok: false; fieldErrors: Record<string, string[]> } {
  const parsed = requestFirstAccessInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, fieldErrors: toFieldErrors(parsed.error) };
  }
  return { ok: true, data: parsed.data };
}

// The email is never trusted from the client here: it is derived from the
// signed verification token, so only a `token` and the new `password` are taken.
export const setFirstPasswordInputSchema = z.object({
  token: z.string().trim().min(1, "Verification token is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type SetFirstPasswordInput = z.infer<typeof setFirstPasswordInputSchema>;

export function parseSetFirstPasswordInput(
  input: unknown,
):
  | { ok: true; data: SetFirstPasswordInput }
  | { ok: false; fieldErrors: Record<string, string[]> } {
  const parsed = setFirstPasswordInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, fieldErrors: toFieldErrors(parsed.error) };
  }
  return { ok: true, data: parsed.data };
}
