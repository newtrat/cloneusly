import "server-only";

import { WebClient } from "@slack/web-api";

import { getEnv } from "@/lib/env";

let cachedClient: WebClient | null = null;

export function getSlackClient(): WebClient {
  if (cachedClient) return cachedClient;
  const token = getEnv().SLACK_BOT_TOKEN;
  if (!token) {
    throw new Error("SLACK_BOT_TOKEN is not configured.");
  }
  cachedClient = new WebClient(token);
  return cachedClient;
}

export function resetSlackClientCache(): void {
  cachedClient = null;
}
