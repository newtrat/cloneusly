export const AUTO_SIGN_IN_FAILED_MESSAGE =
  "Password set, but we couldn't sign you in automatically.";

export type EmailSignIn = (credentials: {
  email: string;
  password: string;
}) => Promise<{ error?: { message?: string | null } | null }>;

/**
 * Signs the user in after a successful first-access password set.
 * Returns `"signed-in"` on success, or `"sign-in-failed"` when Better Auth
 * rejects the credentials or the call throws (e.g. network).
 */
export async function signInAfterFirstAccess(
  signInEmail: EmailSignIn,
  credentials: { email: string; password: string },
): Promise<"signed-in" | "sign-in-failed"> {
  try {
    const result = await signInEmail(credentials);
    if (result.error) {
      return "sign-in-failed";
    }
    return "signed-in";
  } catch {
    return "sign-in-failed";
  }
}
