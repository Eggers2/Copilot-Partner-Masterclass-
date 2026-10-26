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
  async headers() {
    return [
      {
        // Event-Folien (z.B. /adn-schweiz) sollen nicht in Suchmaschinen landen.
        source: "/downloads/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
  async redirects() {
    return [
      {
        // Kurzlink für den geboosteten LinkedIn-Post (temporär, 307). Ziel ist
        // die eigene LinkedIn-Landingpage; source/medium/campaign bleiben
        // unverändert (tägliche Auswertung), utm_content markiert die Seite.
        source: "/li",
        destination:
          "/linkedin?utm_source=linkedin&utm_medium=boost&utm_campaign=post_zeitfenster_okt26&utm_content=lp_onepager",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
