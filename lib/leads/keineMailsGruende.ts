// Gründe für "Keine E-Mails" am Lead. Eigene Datei ohne Prisma, damit auch
// Client-Komponenten (components/admin/KeineMailsHinweis) sie nutzen können.

export const KEINE_MAILS_GRUND = {
  abmeldelinkWarteliste: "Abmeldelink Wartelisten-Mails",
  newsletterAbmeldung: "Newsletter-Abmeldung",
  manuell: "Manuell im Admin gesetzt",
  /** Prüfquarantäne des Wartelisten-Formulars, Freigabe im Admin (gibQuarantaeneFrei). */
  botVerdacht: "Prüfung: Verdacht auf Bot-Anmeldung",
} as const;
