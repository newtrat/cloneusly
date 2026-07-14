import "server-only";

import { Prisma } from "@prisma/client";
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

  let userId: string;
  let userEmail: string;
  if (existing) {
    userId = existing.id;
    userEmail = existing.email;
  } else {
    const slackProfile = await fetchSlackProfileByEmail(email);
    if (!slackProfile) {
      return err(
        "ACCOUNT_NOT_FOUND",
        "No Cloneusly account found for that email.",
        { correlationId },
      );
    }
    const provisioned = await provisionUserFromSlackProfile(slackProfile, email);
    userId = provisioned.id;
    userEmail = provisioned.email;
  }

  const existingAccount = await prisma.account.findFirst({
    where: { userId, providerId: "credential" },
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
        accountId: userId,
        providerId: "credential",
        userId,
        password: hashedPassword,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      // A concurrent request won the race and already created the
      // credential account for this user.
      return err(
        "PASSWORD_ALREADY_SET",
        "This account already has a password. Contact an admin if you need it reset.",
        { correlationId },
      );
    }

    logOperation("error", "Failed to set first password", {
      operation: "setFirstPassword",
      correlationId,
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
    return err("INTERNAL_ERROR", "Unable to set password.", {
      correlationId,
    });
  }

  logOperation("info", "First password set", {
    operation: "setFirstPassword",
    correlationId,
    userId,
  });

  return ok({ email: userEmail });
}
