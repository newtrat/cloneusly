import "server-only";

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

import { getEnv } from "@/lib/env";
import { prisma } from "@/lib/prisma";

function createAuth() {
  const env = getEnv();
  return betterAuth({
    database: prismaAdapter(prisma, {
      provider: "postgresql",
    }),
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    trustedOrigins: [env.BETTER_AUTH_URL],
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
    },
    rateLimit: {
      enabled: true,
      window: 60,
      max: 100,
    },
    user: {
      additionalFields: {
        handle: {
          type: "string",
          required: true,
          input: false,
        },
        status: {
          type: "string",
          required: false,
          defaultValue: "ACTIVE",
          input: false,
        },
        role: {
          type: "string",
          required: false,
          defaultValue: "MEMBER",
          input: false,
        },
      },
    },
  });
}

type AuthInstance = ReturnType<typeof createAuth>;

let cachedAuth: AuthInstance | null = null;

export function getAuth(): AuthInstance {
  if (!cachedAuth) {
    cachedAuth = createAuth();
  }
  return cachedAuth;
}

// The Next.js adapter checks for the `handler` property with the `in` operator.
// A lazy Proxy does not expose that property to `in`, causing the adapter to
// attempt to invoke the auth object as a function instead.
export const auth = getAuth();

export type Session = typeof auth.$Infer.Session;
