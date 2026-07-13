import { PrismaClient } from "@prisma/client";

let testPrisma: PrismaClient | null = null;

export function getTestDatabaseUrl(): string | null {
  return process.env.TEST_DATABASE_URL ?? null;
}

export function getTestPrisma(): PrismaClient {
  const url = getTestDatabaseUrl();
  if (!url) {
    throw new Error("TEST_DATABASE_URL is required for integration tests.");
  }
  if (!testPrisma) {
    testPrisma = new PrismaClient({
      datasources: { db: { url } },
    });
  }
  return testPrisma;
}

export async function resetTestDatabase(): Promise<void> {
  const prisma = getTestPrisma();
  const tables = [
    "notification",
    "reaction",
    "comment",
    "recognition_hashtag",
    "hashtag",
    "recognition_recipient",
    "recognition",
    "conversion",
    "monthly_grant",
    "test_top_up",
    "point_entry",
    "point_transaction",
    "point_account",
    "session",
    "account",
    "verification",
    "user",
  ];

  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${tables.map((t) => `"${t}"`).join(", ")} RESTART IDENTITY CASCADE`,
  );
}

export async function disconnectTestDatabase(): Promise<void> {
  if (testPrisma) {
    await testPrisma.$disconnect();
    testPrisma = null;
  }
}
