import { disposableEmailBlocklistSet } from "disposable-email-domains-js";

// Serverseitige Prüfung der E-Mail-Adresse im Wartelisten-Formular.
// Wegwerf-Domains kommen aus dem Paket disposable-email-domains-js (gepflegte
// Liste von github.com/disposable-email-domains). Privatmail-Domains werden
// nicht geblockt, nur am Lead vermerkt.

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Domains, die Privatpersonen nutzen. Kein Ausschlussgrund, nur ein Hinweis. */
export const PRIVATMAIL_DOMAINS = new Set([
  "gmail.com", "googlemail.com",
  "gmx.de", "gmx.net", "gmx.at", "gmx.ch", "gmx.com",
  "web.de", "t-online.de", "freenet.de", "arcor.de", "online.de", "mail.de",
  "posteo.de", "mailbox.org", "vodafone.de", "1und1.de", "bluewin.ch",
  "aol.com", "aol.de", "att.net", "sbcglobal.net", "bellsouth.net",
  "comcast.net", "verizon.net", "cox.net", "charter.net",
  "outlook.com", "outlook.de", "hotmail.com", "hotmail.de", "live.com", "live.de", "msn.com",
  "yahoo.com", "yahoo.de", "ymail.com", "icloud.com", "me.com", "mac.com",
  "proton.me", "protonmail.com",
]);

const GMAIL_DOMAINS = new Set(["gmail.com", "googlemail.com"]);

/** Ab so vielen Punkten im Local Part gilt eine Gmail-Adresse als verdächtig. */
export const GMAIL_PUNKTE_SCHWELLE = 3;

let wegwerfListe: Set<string> | null = null;

/** Wegwerf-Domain, auch Subdomains davon (z. B. x.mailinator.com). */
export function istWegwerfDomain(domain: string): boolean {
  wegwerfListe ??= disposableEmailBlocklistSet();
  const teile = domain.toLowerCase().trim().split(".");
  for (let i = 0; i < teile.length - 1; i++) {
    if (wegwerfListe.has(teile.slice(i).join("."))) return true;
  }
  return false;
}

export function emailDomain(email: string): string {
  return email.slice(email.lastIndexOf("@") + 1).toLowerCase();
}

export interface EmailBefund {
  domain: string;
  wegwerf: boolean;
  /** Domain, wenn es eine Privatmail-Adresse ist, sonst null. */
  privatmail: string | null;
  /** Anzahl Punkte im Local Part einer Gmail-Adresse ab der Schwelle, sonst null. */
  gmailPunkte: number | null;
}

export function pruefeEmail(email: string): EmailBefund {
  const domain = emailDomain(email);
  const local = email.slice(0, email.lastIndexOf("@"));
  const punkte = (local.match(/\./g) ?? []).length;
  return {
    domain,
    wegwerf: istWegwerfDomain(domain),
    privatmail: PRIVATMAIL_DOMAINS.has(domain) ? domain : null,
    gmailPunkte: GMAIL_DOMAINS.has(domain) && punkte >= GMAIL_PUNKTE_SCHWELLE ? punkte : null,
  };
}
