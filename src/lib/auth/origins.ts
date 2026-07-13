type AuthOriginEnvironment = {
  baseUrl?: string;
  vercelEnvironment?: string;
  vercelUrl?: string;
};

const VERCEL_TEAM_PREVIEW_PATTERN = "https://*.newtrats-projects.vercel.app";

function previewDeploymentOrigin(
  vercelEnvironment?: string,
  vercelUrl?: string,
): string | undefined {
  if (vercelEnvironment !== "preview" || !vercelUrl) {
    return undefined;
  }

  return new URL(`https://${vercelUrl}`).origin;
}

export function resolveAuthOrigins({
  baseUrl,
  vercelEnvironment,
  vercelUrl,
}: AuthOriginEnvironment): {
  baseUrl: string;
  trustedOrigins: string[];
} {
  const previewOrigin = previewDeploymentOrigin(vercelEnvironment, vercelUrl);
  const resolvedBaseUrl = baseUrl ?? previewOrigin;

  if (!resolvedBaseUrl) {
    throw new Error(
      "BETTER_AUTH_URL is required outside Vercel preview deployments.",
    );
  }

  const trustedOrigins = [resolvedBaseUrl];

  if (vercelEnvironment === "preview") {
    trustedOrigins.push(VERCEL_TEAM_PREVIEW_PATTERN);
  }

  return { baseUrl: resolvedBaseUrl, trustedOrigins };
}
