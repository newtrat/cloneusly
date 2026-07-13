import type { NextConfig } from "next";

const allowedGifHosts = (process.env.ALLOWED_GIF_HOSTS ?? "media.giphy.com,media.tenor.com")
  .split(",")
  .map((host) => host.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  images: {
    remotePatterns: allowedGifHosts.map((hostname) => ({
      protocol: "https",
      hostname,
    })),
    unoptimized: true,
  },
};

export default nextConfig;
