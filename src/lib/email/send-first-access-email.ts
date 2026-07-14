import "server-only";

import { logOperation } from "@/lib/domain/logger";
import { getEnv } from "@/lib/env";

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const REQUEST_TIMEOUT_MS = 5000;

type SendFirstAccessEmailParams = {
  email: string;
  url: string;
  correlationId?: string;
};

function buildEmail(url: string): { subject: string; text: string; html: string } {
  const subject = "Verify your email to activate Cloneusly";
  const text = [
    "Welcome to Cloneusly!",
    "",
    "Click the link below to verify your email and set your password:",
    url,
    "",
    "This link expires in 30 minutes. If you didn't request it, you can ignore this email.",
  ].join("\n");
  const html = `
    <div style="font-family: system-ui, sans-serif; line-height: 1.5;">
      <h2>Welcome to Cloneusly!</h2>
      <p>Click the button below to verify your email and set your password.</p>
      <p><a href="${url}" style="display:inline-block;padding:10px 18px;background:#111;color:#fff;text-decoration:none;">Verify &amp; set password</a></p>
      <p style="color:#666;font-size:13px;">Or paste this link into your browser:<br />${url}</p>
      <p style="color:#666;font-size:13px;">This link expires in 30 minutes. If you didn't request it, you can ignore this email.</p>
    </div>
  `;
  return { subject, text, html };
}

/**
 * Sends the first-access verification email. Uses Resend when RESEND_API_KEY is
 * configured; otherwise logs the verification URL to the server console so the
 * flow remains usable in local/demo environments without email credentials.
 */
export async function sendFirstAccessEmail({
  email,
  url,
  correlationId,
}: SendFirstAccessEmailParams): Promise<void> {
  const env = getEnv();
  const { subject, text, html } = buildEmail(url);

  if (!env.RESEND_API_KEY) {
    logOperation("info", "First-access verification link (email delivery not configured)", {
      operation: "sendFirstAccessEmail",
      correlationId,
      email,
      url,
    });
    return;
  }

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to: [email],
        subject,
        text,
        html,
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      logOperation("error", "Failed to send first-access email via Resend", {
        operation: "sendFirstAccessEmail",
        correlationId,
        email,
        status: response.status,
      });
    }
  } catch (error) {
    logOperation("error", "Error sending first-access email", {
      operation: "sendFirstAccessEmail",
      correlationId,
      email,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
