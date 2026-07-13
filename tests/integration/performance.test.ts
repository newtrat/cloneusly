import "../fixtures/auth-mock";

import { describe, expect, it, beforeAll, afterAll } from "vitest";

import { getFeed } from "@/lib/dal/recognition-feed";
import { getLeaderboard } from "@/lib/dal/leaderboard";
import {
  mockSessionUser,
  toAuthenticatedUser,
} from "../fixtures/auth-mock";
import {
  disconnectTestDatabase,
  getTestDatabaseUrl,
  resetTestDatabase,
} from "../fixtures/database";
import { seedPerformanceFixture } from "../fixtures/performance-data";

const hasDatabase = Boolean(getTestDatabaseUrl());

describe.skipIf(!hasDatabase)("performance integration", () => {
  beforeAll(async () => {
    await resetTestDatabase();
    const { viewerId } = await seedPerformanceFixture();
    mockSessionUser(
      toAuthenticatedUser({
        id: viewerId,
        email: "perf-viewer@test.local",
        handle: "perfviewer",
        name: "Perf Viewer",
      }),
    );
  }, 120_000);

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  it("loads feed within reasonable time", async () => {
    const started = Date.now();
    const result = await getFeed({ limit: 20 });
    const elapsed = Date.now() - started;

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.items.length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(5000);
  });

  it("loads leaderboard within reasonable time", async () => {
    const started = Date.now();
    const result = await getLeaderboard({ period: "month", limit: 25 });
    const elapsed = Date.now() - started;

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.entries.length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(5000);
  });
});
