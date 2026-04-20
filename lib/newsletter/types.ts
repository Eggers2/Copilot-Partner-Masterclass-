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

export interface NewsletterZahlOfWeek {
  wert: string;
  titel: string;
  body: string;
}

export interface NewsletterContent {
  candidates: NewsletterNewsItem[];
  selectedIds: string[];
  prompt: NewsletterPromptOfWeek;
  zahl: NewsletterZahlOfWeek;
  eventBlock?: {
    badge: string;
    titel: string;
    body: string;
    ctaLabel: string;
    ctaUrl: string;
  };
}
