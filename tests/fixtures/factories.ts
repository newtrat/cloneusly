import { hashPassword } from "better-auth/crypto";

import { getTestPrisma } from "./database";

export type FactoryUser = {
  id: string;
  email: string;
  handle: string;
  name: string;
  givingBalance: number;
  receivedBalance: number;
};

export async function createActiveUser(input: {
  email: string;
  handle: string;
  name: string;
  password?: string;
  givingBalance?: number;
  receivedBalance?: number;
  role?: "MEMBER" | "TESTER";
}): Promise<FactoryUser> {
  const prisma = getTestPrisma();
  const password = input.password ?? "test-password-123";
  const hashedPassword = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      email: input.email,
      emailVerified: true,
      name: input.name,
      handle: input.handle,
      status: "ACTIVE",
      role: input.role ?? "MEMBER",
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

  const givingBalance = input.givingBalance ?? 0;
  const receivedBalance = input.receivedBalance ?? 0;

  await prisma.pointAccount.create({
    data: {
      userId: user.id,
      givingBalance,
      receivedBalance,
    },
  });

  // Back any seeded starting balances with ledger entries so the immutable
  // ledger stays consistent with the account balances (sum of entries == balance).
  if (givingBalance > 0 || receivedBalance > 0) {
    const now = new Date();
    const transaction = await prisma.pointTransaction.create({
      data: {
        kind: "TEST_TOP_UP",
        actorUserId: user.id,
        idempotencyScope: `factory:${user.id}`,
        idempotencyKey: "initial-balance",
        requestHash: `factory-initial-${user.id}`,
        createdAt: now,
      },
    });

    const entries: {
      transactionId: string;
      userId: string;
      bucket: "GIVING" | "RECEIVED";
      delta: number;
      createdAt: Date;
    }[] = [];
    if (givingBalance > 0) {
      entries.push({
        transactionId: transaction.id,
        userId: user.id,
        bucket: "GIVING",
        delta: givingBalance,
        createdAt: now,
      });
    }
    if (receivedBalance > 0) {
      entries.push({
        transactionId: transaction.id,
        userId: user.id,
        bucket: "RECEIVED",
        delta: receivedBalance,
        createdAt: now,
      });
    }
    await prisma.pointEntry.createMany({ data: entries });
  }

  return {
    id: user.id,
    email: user.email,
    handle: user.handle,
    name: user.name,
    givingBalance,
    receivedBalance,
  };
}

export async function createRecognition(input: {
  senderId: string;
  recipientIds: string[];
  pointsPerRecipient: number;
  text?: string;
  hashtags?: string[];
  createdAt?: Date;
}): Promise<{ id: string; createdAt: Date }> {
  const prisma = getTestPrisma();
  const now = input.createdAt ?? new Date();
  const totalCost = input.pointsPerRecipient * input.recipientIds.length;

  const transaction = await prisma.pointTransaction.create({
    data: {
      kind: "RECOGNITION",
      actorUserId: input.senderId,
      idempotencyScope: `user:${input.senderId}`,
      idempotencyKey: `factory-${crypto.randomUUID()}`,
      requestHash: crypto.randomUUID(),
      createdAt: now,
    },
  });

  const recognition = await prisma.recognition.create({
    data: {
      transactionId: transaction.id,
      senderId: input.senderId,
      pointsPerRecipient: input.pointsPerRecipient,
      text: input.text ?? "Factory recognition",
      createdAt: now,
    },
  });

  await prisma.recognitionRecipient.createMany({
    data: input.recipientIds.map((recipientId) => ({
      recognitionId: recognition.id,
      recipientId,
      createdAt: now,
    })),
  });

  for (const tag of input.hashtags ?? []) {
    const normalized = tag.replace(/^#/, "").toLowerCase();
    const hashtag = await prisma.hashtag.upsert({
      where: { normalizedName: normalized },
      create: { normalizedName: normalized, displayName: tag },
      update: {},
    });
    await prisma.recognitionHashtag.create({
      data: { recognitionId: recognition.id, hashtagId: hashtag.id },
    });
  }

  await prisma.pointEntry.create({
    data: {
      transactionId: transaction.id,
      userId: input.senderId,
      bucket: "GIVING",
      delta: -totalCost,
      createdAt: now,
    },
  });

  for (const recipientId of input.recipientIds) {
    await prisma.pointEntry.create({
      data: {
        transactionId: transaction.id,
        userId: recipientId,
        bucket: "RECEIVED",
        delta: input.pointsPerRecipient,
        createdAt: now,
      },
    });
    await prisma.pointAccount.update({
      where: { userId: recipientId },
      data: { receivedBalance: { increment: input.pointsPerRecipient } },
    });
  }

  await prisma.pointAccount.update({
    where: { userId: input.senderId },
    data: { givingBalance: { decrement: totalCost } },
  });

  return { id: recognition.id, createdAt: recognition.createdAt };
}
