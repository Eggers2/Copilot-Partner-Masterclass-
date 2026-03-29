import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.copilotberater.de",
      },
    ],
  },
};

export default nextConfig;
