import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Interne Bereiche. Sie hängen hinter Logins oder Tokens, sollen aber auch
// nicht als Treffer in Suchmaschinen oder KI-Antworten auftauchen.
const DISALLOW = [
  "/admin",
  "/api",
  "/kundenportal",
  "/tasks",
  "/umfrage",
  "/newsletter",
  "/danke",
];

// KI-Crawler werden ausdrücklich genannt, damit klar ist, dass sie erwünscht
// sind. Eine eigene Gruppe ersetzt für den jeweiligen Bot die *-Gruppe, daher
// dieselben Sperren noch einmal.
const KI_CRAWLER = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "PerplexityBot",
  "Google-Extended",
  "Applebot-Extended",
  "bingbot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: DISALLOW },
      { userAgent: KI_CRAWLER, allow: "/", disallow: DISALLOW },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
