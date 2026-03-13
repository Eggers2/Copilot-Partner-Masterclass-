import type {
  LeadStatus,
  LeadSource,
  WebinarStatus,
  RegistrationStatus,
} from "@prisma/client";

export const LEAD_TARGET = 20;
export const EARLY_BIRD_PRICE = 3490;

export const LEAD_STATUS_CONFIG: Record<
  LeadStatus,
  { label: string; color: string; bg: string; order: number }
> = {
  NEW: { label: "Neu", color: "#030386", bg: "#E3ECF8", order: 0 },
  WAITLIST: { label: "Warteliste", color: "#6b7280", bg: "#f3f4f6", order: 1 },
  SEQUENCE_ACTIVE: { label: "Sequenz läuft", color: "#0891b2", bg: "#cffafe", order: 2 },
  CONTACTED: { label: "Kontaktiert", color: "#05015B", bg: "#DCDCEE", order: 3 },
  WEBINAR_INVITED: { label: "Webinar eingeladen", color: "#7c3aed", bg: "#ede9fe", order: 4 },
  WEBINAR_ATTENDED: { label: "Webinar besucht", color: "#2563eb", bg: "#dbeafe", order: 5 },
  QUALIFIED: { label: "Qualifiziert", color: "#0078D4", bg: "#dbeafe", order: 6 },
  PROPOSAL: { label: "Angebot", color: "#9333ea", bg: "#f3e8ff", order: 7 },
  FOLLOW_UP: { label: "Follow-up", color: "#d97706", bg: "#fef3c7", order: 8 },
  WON: { label: "Gewonnen", color: "#16a34a", bg: "#dcfce7", order: 9 },
  LOST: { label: "Verloren", color: "#dc2626", bg: "#fef2f2", order: 10 },
};

export const LEAD_SOURCE_CONFIG: Record<LeadSource, { label: string }> = {
  WEBSITE: { label: "Website" },
  REFERRAL: { label: "Empfehlung" },
  LINKEDIN: { label: "LinkedIn" },
  WEBINAR: { label: "Webinar" },
  COLD_OUTREACH: { label: "Kaltakquise" },
  OTHER: { label: "Sonstiges" },
};

export const FUNNEL_STAGES: LeadStatus[] = [
  "NEW",
  "WAITLIST",
  "SEQUENCE_ACTIVE",
  "WEBINAR_INVITED",
  "WEBINAR_ATTENDED",
  "QUALIFIED",
  "PROPOSAL",
  "WON",
];

export const WEBINAR_STATUS_CONFIG: Record<
  WebinarStatus,
  { label: string; color: string; bg: string }
> = {
  PLANNED: { label: "Geplant", color: "#6b7280", bg: "#f3f4f6" },
  OPEN: { label: "Offen", color: "#16a34a", bg: "#dcfce7" },
  CLOSED: { label: "Geschlossen", color: "#d97706", bg: "#fef3c7" },
  COMPLETED: { label: "Abgeschlossen", color: "#030386", bg: "#E3ECF8" },
  CANCELLED: { label: "Abgesagt", color: "#dc2626", bg: "#fef2f2" },
};

export const REGISTRATION_STATUS_CONFIG: Record<
  RegistrationStatus,
  { label: string; color: string; bg: string }
> = {
  REGISTERED: { label: "Angemeldet", color: "#030386", bg: "#E3ECF8" },
  ATTENDED: { label: "Erschienen", color: "#16a34a", bg: "#dcfce7" },
  NO_SHOW: { label: "No-Show", color: "#dc2626", bg: "#fef2f2" },
  CANCELLED: { label: "Abgemeldet", color: "#6b7280", bg: "#f3f4f6" },
};
