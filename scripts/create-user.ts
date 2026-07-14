import { PrismaClient, type UserRole, type UserStatus } from "@prisma/client";
import { hashPassword } from "better-auth/crypto";

type CliOptions = {
  email: string;
  name: string;
  handle: string;
  password: string;
  role: UserRole;
  status: UserStatus;
  points: number;
};

const USAGE = `Create a new Cloneusly user (User + credential Account + PointAccount).

Usage:
  npm run create-user -- --email <email> --name "<name>" --handle <handle> [options]

Required:
  --email <email>       Login email (stored lowercased, must be unique)
  --name "<name>"       Display name
  --handle <handle>     Unique handle: letters, numbers, underscores, dots,
                        hyphens (2-32 chars, stored lowercased)

Options:
  --password <value>    Password (min 8 chars). Falls back to CREATE_USER_PASSWORD
                        then SEED_USER_PASSWORD if omitted.
  --role <role>         MEMBER (default) or TESTER
  --points <n>          Initial giving points via labeled test top-up (default 0)
  --inactive            Create the account as INACTIVE (default ACTIVE)
  --help                Show this help

Example:
  npm run create-user -- --email dave@cloneusly.local --name "Dave Member" \\
    --handle dave --password devpassword123 --role MEMBER --points 100
`;

function parseArgs(argv: string[]): CliOptions {
  const raw = new Map<string, string | boolean>();

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) {
      throw new Error(`Unexpected argument: ${token}`);
    }
    const key = token.slice(2);
    if (key === "help" || key === "inactive") {
      raw.set(key, true);
      continue;
    }
    const value = argv[i + 1];
    if (value === undefined || value.startsWith("--")) {
      throw new Error(`Missing value for --${key}`);
    }
    raw.set(key, value);
    i += 1;
  }

  if (raw.has("help")) {
    console.info(USAGE);
    process.exit(0);
  }

  const email = String(raw.get("email") ?? "")
    .trim()
    .toLowerCase();
  const name = String(raw.get("name") ?? "").trim();
  const handle = String(raw.get("handle") ?? "")
    .trim()
    .toLowerCase();
  const password = String(
    raw.get("password") ??
      process.env.CREATE_USER_PASSWORD ??
      process.env.SEED_USER_PASSWORD ??
      "",
  );
  const roleInput = String(raw.get("role") ?? "MEMBER")
    .trim()
    .toUpperCase();
  const pointsInput = String(raw.get("points") ?? "0").trim();
  const status: UserStatus = raw.has("inactive") ? "INACTIVE" : "ACTIVE";

  const errors: string[] = [];

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push("--email must be a valid email address");
  }
  if (name.length === 0) {
    errors.push("--name is required");
  }
  if (!/^[a-z0-9._-]{2,32}$/.test(handle)) {
    errors.push(
      "--handle must be 2-32 chars of lowercase letters, numbers, underscores, dots, or hyphens",
    );
  }
  if (password.length < 8) {
    errors.push(
      "--password (or CREATE_USER_PASSWORD/SEED_USER_PASSWORD) must be at least 8 characters",
    );
  }
  if (roleInput !== "MEMBER" && roleInput !== "TESTER") {
    errors.push("--role must be MEMBER or TESTER");
  }
  const points = Number(pointsInput);
  if (!Number.isInteger(points) || points < 0) {
    errors.push("--points must be a non-negative whole number");
  }

  if (errors.length > 0) {
    throw new Error(`${errors.join("\n")}\n\n${USAGE}`);
  }

  return {
    email,
    name,
    handle,
    password,
    role: roleInput as UserRole,
    status,
    points,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const prisma = new PrismaClient();

  try {
    const conflict = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: options.email, mode: "insensitive" } },
          { handle: { equals: options.handle, mode: "insensitive" } },
        ],
      },
      select: { email: true, handle: true },
    });

    if (conflict) {
      const reason =
        conflict.email.toLowerCase() === options.email
          ? `email "${options.email}"`
          : `handle "${options.handle}"`;
      throw new Error(`A user with ${reason} already exists.`);
    }

    const hashedPassword = await hashPassword(options.password);

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: options.email,
          emailVerified: true,
          name: options.name,
          handle: options.handle,
          status: options.status,
          role: options.role,
        },
      });

      await tx.account.create({
        data: {
          accountId: created.id,
          providerId: "credential",
          userId: created.id,
          password: hashedPassword,
        },
      });

      await tx.pointAccount.create({
        data: {
          userId: created.id,
          givingBalance: 0,
          receivedBalance: 0,
        },
      });

      if (options.points > 0) {
        const now = new Date();
        const transaction = await tx.pointTransaction.create({
          data: {
            kind: "TEST_TOP_UP",
            actorUserId: created.id,
            idempotencyScope: `create-user:${created.id}`,
            idempotencyKey: "initial-giving",
            requestHash: `create-user-initial-${created.id}`,
            createdAt: now,
          },
        });

        await tx.testTopUp.create({
          data: {
            transactionId: transaction.id,
            actorUserId: created.id,
            beneficiaryUserId: created.id,
            amount: options.points,
            createdAt: now,
          },
        });

        await tx.pointEntry.create({
          data: {
            transactionId: transaction.id,
            userId: created.id,
            bucket: "GIVING",
            delta: options.points,
            createdAt: now,
          },
        });

        await tx.pointAccount.update({
          where: { userId: created.id },
          data: { givingBalance: options.points },
        });
      }

      return created;
    });

    console.info(
      `Created ${user.email} (@${user.handle}) as ${user.role}/${user.status} with ${options.points} giving points.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
