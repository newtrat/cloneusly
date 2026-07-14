import "server-only";

import { hashPassword } from "better-auth/crypto";

import { createCorrelationId, logOperation } from "@/lib/domain/logger";
import { err, ok, type CommandResult } from "@/lib/domain/result";
import {
  fetchSlackProfileByEmail,
  findUserByEmailAnyStatus,
  provisionUserFromSlackProfile,
} from "@/lib/domain/users/provision-slack-user";
import { prisma } from "@/lib/prisma";
import { parseSetFirstPasswordInput } from "@/lib/validation/auth";

export type SetFirstPasswordData = {
  email: string;
};

export async function setFirstPassword(
  input: unknown,
): Promise<CommandResult<SetFirstPasswordData>> {
  const correlationId = createCorrelationId();

  const parsed = parseSetFirstPasswordInput(input);
  if (!parsed.ok) {
    return err("VALIDATION_ERROR", "Invalid input.", {
      fieldErrors: parsed.fieldErrors,
      correlationId,
    });
  }

  const email = parsed.data.email.trim().toLowerCase();

  const existing = await findUserByEmailAnyStatus(email);

  if (existing && existing.status !== "ACTIVE") {
    return err(
      "ACCOUNT_NOT_FOUND",
      "No Cloneusly account found for that email.",
      { correlationId },
    );
  }

  const user = existing ?? (await provisionNewUser(email));

  const existingAccount = await prisma.account.findFirst({
    where: { userId: user.id, providerId: "credential" },
  });

  if (existingAccount) {
    return err(
      "PASSWORD_ALREADY_SET",
      "This account already has a password. Contact an admin if you need it reset.",
      { correlationId },
    );
  }

  const hashedPassword = await hashPassword(parsed.data.password);

  try {
    await prisma.account.create({
      data: {
        accountId: user.id,
        providerId: "credential",
        userId: user.id,
        password: hashedPassword,
      },
    });
  } catch (error) {
    logOperation("error", "Failed to set first password", {
      operation: "setFirstPassword",
      correlationId,
      userId: user.id,
      error: error instanceof Error ? error.message : String(error),
    });
    return err("INTERNAL_ERROR", "Unable to set password.", {
      correlationId,
    });
  }

  logOperation("info", "First password set", {
    operation: "setFirstPassword",
    correlationId,
    userId: user.id,
  });

  return ok({ email: user.email });
}

async function provisionNewUser(email: string) {
  const slackProfile = await fetchSlackProfileByEmail(email);
  return provisionUserFromSlackProfile(slackProfile ?? {}, email);
}
