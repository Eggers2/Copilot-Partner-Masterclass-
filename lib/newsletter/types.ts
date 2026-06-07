export type NewsBadge =
  | "PREMIUM"
  | "CHAT"
  | "STUDIO"
  | "DATENSCHUTZ"
  | "DISTRIBUTOR"
  | "EVENT"
  | "ADOPTION";

export interface NewsletterNewsItem {
  id: string;
  badge: NewsBadge;
  title: string;
  body: string;
  cta: string;
  sourceLabel: string;
  sourceUrl: string;
}

export interface NewsletterPromptOfWeek {
  badge: string;
  title: string;
  body: string;
  tipp: string;
}

export interface NewsletterEventItem {
  id: string;
  title: string;
  description: string | null;
  url: string | null;
  location: string | null;
  /** ISO-8601 (UTC) – Start des Termins */
  startsAt: string | null;
  /** ISO-8601 (UTC) – Ende, optional */
  endsAt: string | null;
  /** SPEAKER | PROMOTE (oder null) */
  role: string | null;
  imageUrl: string | null;
}

export interface NewsletterContent {
  candidates: NewsletterNewsItem[];
  selectedIds: string[];
  prompt: NewsletterPromptOfWeek;
  /** Bis zu 3 kommende Termine aus der Linksammlung (oben im Newsletter). */
  events: NewsletterEventItem[];
  eventBlock?: {
    badge: string;
    titel: string;
    body: string;
    ctaLabel: string;
    ctaUrl: string;
  };
}
