import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";

import { verifySlackRequest } from "@/lib/slack/verify-request";

function sign(secret: string, timestamp: string, body: string): string {
  const basestring = `v0:${timestamp}:${body}`;
  const digest = createHmac("sha256", secret)
    .update(basestring, "utf8")
    .digest("hex");
  return `v0=${digest}`;
}

describe("verifySlackRequest", () => {
  const secret = "test-signing-secret";
  const body = "token=x&team_id=T1&command=%2Fthanks";
  const now = 1_700_000_000;
  const timestamp = String(now);

  it("accepts a valid signature within the clock skew window", () => {
    const signature = sign(secret, timestamp, body);
    expect(
      verifySlackRequest({
        signingSecret: secret,
        rawBody: body,
        timestamp,
        signature,
        nowSeconds: now,
      }),
    ).toBe(true);
  });

  it("rejects a bad signature", () => {
    expect(
      verifySlackRequest({
        signingSecret: secret,
        rawBody: body,
        timestamp,
        signature: "v0=deadbeef",
        nowSeconds: now,
      }),
    ).toBe(false);
  });

  it("rejects requests outside the 5-minute clock skew window", () => {
    const signature = sign(secret, timestamp, body);
    expect(
      verifySlackRequest({
        signingSecret: secret,
        rawBody: body,
        timestamp,
        signature,
        nowSeconds: now + 60 * 6,
      }),
    ).toBe(false);
  });

  it("rejects missing timestamp or signature headers", () => {
    expect(
      verifySlackRequest({
        signingSecret: secret,
        rawBody: body,
        timestamp: null,
        signature: "v0=abc",
        nowSeconds: now,
      }),
    ).toBe(false);
    expect(
      verifySlackRequest({
        signingSecret: secret,
        rawBody: body,
        timestamp,
        signature: null,
        nowSeconds: now,
      }),
    ).toBe(false);
  });
});
