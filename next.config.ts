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
  async redirects() {
    return [
      {
        // Kurzlink für den geboosteten LinkedIn-Post (temporär, 307)
        source: "/li",
        destination:
          "/?utm_source=linkedin&utm_medium=boost&utm_campaign=post_zeitfenster_okt26",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
