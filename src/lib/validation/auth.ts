import { z } from "zod";

export const setFirstPasswordInputSchema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Invalid email address"),
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
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const path = issue.path.join(".") || "_form";
      fieldErrors[path] = fieldErrors[path] ?? [];
      fieldErrors[path].push(issue.message);
    }
    return { ok: false, fieldErrors };
  }

  return { ok: true, data: parsed.data };
}
