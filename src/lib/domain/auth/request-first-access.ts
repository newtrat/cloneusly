import "server-only";

import { createFirstAccessToken } from "@/lib/domain/auth/first-access-token";
import { createCorrelationId, logOperation } from "@/lib/domain/logger";
import { err, ok, type CommandResult } from "@/lib/domain/result";
import {
  fetchSlackProfileByEmail,
  findUserByEmailAnyStatus,
} from "@/lib/domain/users/provision-slack-user";
import { sendFirstAccessEmail } from "@/lib/email/send-first-access-email";
import { getEnv } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { isAllowedCompanyEmail } from "@/lib/validation/email-domain";
import { parseRequestFirstAccessInput } from "@/lib/validation/auth";

export type RequestFirstAccessData = {
  // Generic, non-enumerating acknowledgement.
  requested: true;
};

function appBaseUrl(): string {
  return getEnv().BETTER_AUTH_URL ?? "https://cloneusly.vercel.app";
}

/**
 * Starts the verified first-access flow: validates the email domain, and — only
 * for an eligible email — emails a signed link that authorizes setting a
 * password. Always returns a generic success so the endpoint does not reveal
 * which emails have accounts.
 */
export async function requestFirstAccessLink(
  input: unknown,
): Promise<CommandResult<RequestFirstAccessData>> {
  const correlationId = createCorrelationId();

  const parsed = parseRequestFirstAccessInput(input);
  if (!parsed.ok) {
    return err("VALIDATION_ERROR", "Invalid input.", {
      fieldErrors: parsed.fieldErrors,
      correlationId,
    });
  }

  const email = parsed.data.email.trim().toLowerCase();

  if (!isAllowedCompanyEmail(email)) {
    return err(
      "EMAIL_DOMAIN_NOT_ALLOWED",
      `Use your @${getEnv().ALLOWED_SIGNUP_EMAIL_DOMAIN} email address.`,
      { correlationId },
    );
  }

  const eligible = await isEligibleForFirstAccess(email);

  if (eligible) {
    const token = createFirstAccessToken(email);
    const url = `${appBaseUrl()}/first-access?token=${encodeURIComponent(token)}`;
    await sendFirstAccessEmail({ email, url, correlationId });
  }

  logOperation("info", "First-access link requested", {
    operation: "requestFirstAccessLink",
    correlationId,
    eligible,
  });

  // Do not leak whether the email was eligible.
  return ok({ requested: true });
}

/**
 * An email is eligible when it belongs to an existing account that has not set
 * a password yet, or when it can be provisioned from a matching Slack profile.
 */
async function isEligibleForFirstAccess(email: string): Promise<boolean> {
  const existing = await findUserByEmailAnyStatus(email);
  if (existing) {
    if (existing.status !== "ACTIVE") return false;
    const account = await prisma.account.findFirst({
      where: { userId: existing.id, providerId: "credential" },
      select: { id: true },
    });
    return account === null;
  }

  const slackProfile = await fetchSlackProfileByEmail(email);
  return slackProfile !== null;
}
