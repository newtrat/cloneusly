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

// Email ownership is proven by the one-time code delivered over Slack DM, so
// the email + code are verified together before a password can be set.
export const setFirstPasswordInputSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Invalid email address"),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter the 6-digit code sent to you on Slack"),
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
