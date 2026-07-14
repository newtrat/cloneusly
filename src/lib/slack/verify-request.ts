import { createHmac, timingSafeEqual } from "node:crypto";

const MAX_CLOCK_SKEW_SECONDS = 60 * 5;

export function verifySlackRequest(params: {
  signingSecret: string;
  rawBody: string;
  timestamp: string | null;
  signature: string | null;
  nowSeconds?: number;
}): boolean {
  const { signingSecret, rawBody, timestamp, signature } = params;
  if (!timestamp || !signature) return false;
  if (!/^\d+$/.test(timestamp)) return false;

  const now = params.nowSeconds ?? Math.floor(Date.now() / 1000);
  const requestTime = Number(timestamp);
  if (Math.abs(now - requestTime) > MAX_CLOCK_SKEW_SECONDS) {
    return false;
  }

  const basestring = `v0:${timestamp}:${rawBody}`;
  const digest = createHmac("sha256", signingSecret)
    .update(basestring, "utf8")
    .digest("hex");
  const expected = `v0=${digest}`;

  const expectedBuf = Buffer.from(expected, "utf8");
  const actualBuf = Buffer.from(signature, "utf8");
  if (expectedBuf.length !== actualBuf.length) return false;
  return timingSafeEqual(expectedBuf, actualBuf);
}
