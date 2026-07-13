import { describe, expect, it } from "vitest";

import { resolveAuthOrigins } from "@/lib/auth/origins";

describe("resolveAuthOrigins", () => {
  it("uses the configured production origin", () => {
    expect(
      resolveAuthOrigins({
        baseUrl: "https://cloneusly.vercel.app",
        vercelEnvironment: "production",
      }),
    ).toEqual({
      baseUrl: "https://cloneusly.vercel.app",
      trustedOrigins: ["https://cloneusly.vercel.app"],
    });
  });

  it("uses VERCEL_URL and trusts team preview aliases", () => {
    expect(
      resolveAuthOrigins({
        vercelEnvironment: "preview",
        vercelUrl: "cloneusly-abc123-newtrats-projects.vercel.app",
      }),
    ).toEqual({
      baseUrl: "https://cloneusly-abc123-newtrats-projects.vercel.app",
      trustedOrigins: [
        "https://cloneusly-abc123-newtrats-projects.vercel.app",
        "https://*.newtrats-projects.vercel.app",
      ],
    });
  });

  it("requires a configured base URL outside previews", () => {
    expect(() => resolveAuthOrigins({})).toThrow(
      "BETTER_AUTH_URL is required outside Vercel preview deployments.",
    );
  });
});
