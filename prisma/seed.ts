import { PrismaClient } from "@prisma/client";
import { hashPassword } from "better-auth/crypto";

import { SEED_USERS } from "../tests/fixtures/users";

const prisma = new PrismaClient();

async function main() {
  const password = process.env.SEED_USER_PASSWORD;
  if (!password || password.length < 8) {
    throw new Error("SEED_USER_PASSWORD must be at least 8 characters.");
  }

  const hashedPassword = await hashPassword(password);

  for (const spec of SEED_USERS) {
    const existing = await prisma.user.findUnique({
      where: { email: spec.email },
    });

    if (existing) {
      console.info(`Skipping existing user ${spec.email}`);
      continue;
    }

    const user = await prisma.user.create({
      data: {
        email: spec.email,
        emailVerified: true,
        name: spec.name,
        handle: spec.handle,
        status: "ACTIVE",
        role: spec.role,
      },
    });

    await prisma.account.create({
      data: {
        accountId: user.id,
        providerId: "credential",
        userId: user.id,
        password: hashedPassword,
      },
    });

    await prisma.pointAccount.create({
      data: {
        userId: user.id,
        givingBalance: 0,
        receivedBalance: 0,
      },
    });

    if (spec.initialGivingPoints > 0) {
      const now = new Date();
      const transaction = await prisma.pointTransaction.create({
        data: {
          kind: "TEST_TOP_UP",
          actorUserId: user.id,
          idempotencyScope: `seed:${user.id}`,
          idempotencyKey: "initial-giving",
          requestHash: `seed-initial-${user.id}`,
          createdAt: now,
        },
      });

      await prisma.testTopUp.create({
        data: {
          transactionId: transaction.id,
          actorUserId: user.id,
          beneficiaryUserId: user.id,
          amount: spec.initialGivingPoints,
          createdAt: now,
        },
      });

      await prisma.pointEntry.create({
        data: {
          transactionId: transaction.id,
          userId: user.id,
          bucket: "GIVING",
          delta: spec.initialGivingPoints,
          createdAt: now,
        },
      });

      await prisma.pointAccount.update({
        where: { userId: user.id },
        data: { givingBalance: spec.initialGivingPoints },
      });
    }

    console.info(`Seeded ${spec.email} (${spec.handle})`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
