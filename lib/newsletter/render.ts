import type {
  NewsletterContent,
  NewsletterNewsItem,
  NewsletterEventItem,
} from "./types";

function esc(value: string | undefined | null): string {
  if (value == null) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Farbschema 1:1 aus der Design-Vorlage (Copilot Insider Update Template).
// Wir rechnen alle rgba() in feste Hex-Werte um, weil Outlook rgba() oft
// nicht rendert. Die Werte sind gegen den Hintergrund #1A1A2E vorberechnet.
const COLORS = {
  // Basis
  bgOuter: "#1A1A2E", // --ds
  accent: "#00C896", // --sg
  ivory: "#EAF9F4", // --im
  cool: "#E8E8F0", // --cw
  gray: "#6B6B8A", // --gray
  // Badge-Farben aus dem Template
  blue: "#63b3ed",
  purple: "#9f7aea",
  orange: "#ed8936",
  yellow: "#ecc94b",
  // Flächen – aus rgba gegen #1A1A2E gemischt (für Outlook-Kompatibilität)
  cardBg: "#22223C", // ~ rgba(232,232,240,0.06)
  cardBorder: "#2B2B48", // ~ rgba(232,232,240,0.1)
  cardStrongBorder: "#353555", // ~ rgba(232,232,240,0.2)
  promptBg: "#1E2A3A", // ~ Prompt-Card Mix aus ivory/accent auf ds
  statBg: "#1D2B3E", // Gradient-Annäherung für Zahl der Woche
  codeBg: "#141426", // innerer Prompt-Kasten
  accentSoft: "#1B3B38", // accent @ low alpha auf ds
  accentStrong: "#2D5249", // accent box (CTA)
  eventBg: "#1E2E3F", // Event-Block Hintergrund
};

type BadgeTheme = {
  color: string;
  bg: string;
  border: string;
};

// Die Badge-Typen aus dem Datenmodell auf die Tag-Farben aus dem Template
// mappen. Werte gegen #1A1A2E vorgemischt, damit Outlook halbtransparente
// Hintergründe korrekt rendert.
const BADGE_THEME: Record<string, BadgeTheme> = {
  PREMIUM: { color: "#63b3ed", bg: "#1C2640", border: "#2B3E5E" },
  CHAT: { color: "#00C896", bg: "#17352F", border: "#1F5043" },
  STUDIO: { color: "#9f7aea", bg: "#2A244A", border: "#3F3566" },
  DATENSCHUTZ: { color: "#00C896", bg: "#17352F", border: "#1F5043" },
  DISTRIBUTOR: { color: "#ecc94b", bg: "#33311B", border: "#52492A" }, // ADN/Distri
  EVENT: { color: "#00C896", bg: "#17352F", border: "#1F5043" },
  ADOPTION: { color: "#8FD694", bg: "#1E3A28", border: "#2E5638" },
  SALES: { color: "#ed8936", bg: "#38271C", border: "#5A3C25" },
};

function themeFor(badge: string): BadgeTheme {
  return BADGE_THEME[badge.toUpperCase()] ?? BADGE_THEME.CHAT;
}

function badgePill(badge: string, label?: string): string {
  const t = themeFor(badge);
  const text = esc((label ?? badge).toString());
  return `<span style="display:inline-block;padding:3px 10px;border-radius:100px;border:1px solid ${t.border};background:${t.bg};color:${t.color};font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;font-family:'DM Sans',Arial,Helvetica,sans-serif;mso-line-height-rule:exactly;line-height:1.4;">${text}</span>`;
}

function newsCard(item: NewsletterNewsItem, index: number): string {
  const nr = String(index + 1).padStart(2, "0");
  const t = themeFor(item.badge);
  const isDistri = item.badge.toUpperCase() === "DISTRIBUTOR";

  const cardBg = isDistri ? "#262218" : COLORS.cardBg;
  const cardBorder = isDistri ? "#4A3E1F" : COLORS.cardBorder;

  const ctaBlock = item.cta
    ? `<div style="margin-top:14px;padding:10px 14px;background:${COLORS.accentSoft};border-radius:8px;color:${COLORS.accent};font-size:13px;font-weight:500;font-family:'DM Sans',Arial,Helvetica,sans-serif;line-height:1.45;">&rarr;&nbsp; ${esc(item.cta)}</div>`
    : "";

  const sourceBlock = item.sourceUrl
    ? `<div style="margin-top:12px;font-family:'DM Sans',Arial,Helvetica,sans-serif;"><a href="${esc(item.sourceUrl)}" target="_blank" style="display:inline-block;font-size:12px;color:${COLORS.gray};text-decoration:none;">&#8599; ${esc(item.sourceLabel || item.sourceUrl)}</a></div>`
    : item.sourceLabel
      ? `<div style="margin-top:12px;font-size:12px;color:${COLORS.gray};font-family:'DM Sans',Arial,Helvetica,sans-serif;">${esc(item.sourceLabel)}</div>`
      : "";

  return `
  <tr>
    <td style="padding:0 0 16px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${cardBg};border:1px solid ${cardBorder};border-radius:14px;">
        <tr>
          <td style="padding:24px 24px 20px 24px;position:relative;">
            <!--[if !mso]><!-->
            <div style="position:absolute;top:14px;right:20px;color:#2A2A44;font-size:48px;font-weight:700;line-height:1;font-family:'DM Sans',Arial,Helvetica,sans-serif;">${nr}</div>
            <!--<![endif]-->
            ${badgePill(item.badge)}
            <div style="margin-top:12px;color:${COLORS.cool};font-size:17px;font-weight:600;line-height:1.35;font-family:'DM Sans',Arial,Helvetica,sans-serif;padding-right:40px;">${esc(item.title)}</div>
            <div style="margin-top:10px;color:${COLORS.gray};font-size:14px;line-height:1.7;font-family:'DM Sans',Arial,Helvetica,sans-serif;">${esc(item.body)}</div>
            ${ctaBlock}
            ${sourceBlock}
          </td>
        </tr>
      </table>
    </td>
  </tr>`;
}

function eventBlock(content: NewsletterContent): string {
  const ev = content.eventBlock;
  if (!ev) return "";

  const cta = ev.ctaUrl
    ? `<div style="margin-top:10px;font-family:'DM Sans',Arial,Helvetica,sans-serif;"><a href="${esc(ev.ctaUrl)}" target="_blank" style="display:inline-block;font-size:13px;font-weight:600;color:${COLORS.accent};text-decoration:none;">${esc(ev.ctaLabel || "Kostenlos anmelden")} &rarr;</a></div>`
    : "";

  return `
  <tr>
    <td style="padding:0 0 8px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${COLORS.eventBg};border:1px solid ${COLORS.cardStrongBorder};border-radius:14px;">
        <tr>
          <td style="padding:20px 22px;" valign="top">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td width="56" valign="top" style="padding-right:16px;">
                  <div style="width:44px;height:44px;line-height:44px;border-radius:10px;background:${COLORS.accentSoft};text-align:center;font-size:20px;">&#128197;</div>
                </td>
                <td valign="top">
                  <div style="font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:${COLORS.accent};font-family:'DM Sans',Arial,Helvetica,sans-serif;">${esc(ev.badge || "ADN Event")}</div>
                  <div style="margin-top:4px;color:${COLORS.cool};font-size:15px;font-weight:600;font-family:'DM Sans',Arial,Helvetica,sans-serif;line-height:1.4;">${esc(ev.titel)}</div>
                  <div style="margin-top:4px;color:${COLORS.gray};font-size:13px;line-height:1.55;font-family:'DM Sans',Arial,Helvetica,sans-serif;">${esc(ev.body)}</div>
                  ${cta}
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>`;
}

function truncate(s: string, max: number): string {
  const t = s.trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}

// Termin-Datum in deutscher Schreibweise, gegen Europe/Berlin gerechnet
// (die API liefert UTC-ISO-Zeitstempel).
function formatEventDate(startsAt: string | null, endsAt: string | null): string {
  if (!startsAt) return "";
  const start = new Date(startsAt);
  if (Number.isNaN(start.getTime())) return "";
  const dateFmt = new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const timeFmt = new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    hour: "2-digit",
    minute: "2-digit",
  });
  const datePart = dateFmt.format(start);
  const startTime = timeFmt.format(start);
  let timePart = `${startTime} Uhr`;
  if (endsAt) {
    const end = new Date(endsAt);
    if (!Number.isNaN(end.getTime()) && dateFmt.format(end) === datePart) {
      timePart = `${startTime}–${timeFmt.format(end)} Uhr`;
    }
  }
  return `${datePart} · ${timePart}`;
}

function eventCard(ev: NewsletterEventItem): string {
  const dateLabel = formatEventDate(ev.startsAt, ev.endsAt);
  const role = (ev.role ?? "").toUpperCase();
  const roleLabel = role === "SPEAKER" ? "Speaker" : role === "PROMOTE" ? "Event" : "Termin";

  const meta: string[] = [];
  if (dateLabel) meta.push(`&#128197;&nbsp; ${esc(dateLabel)}`);
  if (ev.location) meta.push(`&#128205;&nbsp; ${esc(ev.location)}`);
  const metaLine = meta.length
    ? `<div style="margin-top:6px;color:${COLORS.gray};font-size:13px;line-height:1.5;font-family:'DM Sans',Arial,Helvetica,sans-serif;">${meta.join("&nbsp;&nbsp;&middot;&nbsp;&nbsp;")}</div>`
    : "";

  const desc = ev.description
    ? `<div style="margin-top:8px;color:${COLORS.gray};font-size:13px;line-height:1.55;font-family:'DM Sans',Arial,Helvetica,sans-serif;">${esc(truncate(ev.description, 180))}</div>`
    : "";

  const link = ev.url
    ? `<div style="margin-top:10px;font-family:'DM Sans',Arial,Helvetica,sans-serif;"><a href="${esc(ev.url)}" target="_blank" style="display:inline-block;font-size:13px;font-weight:600;color:${COLORS.accent};text-decoration:none;">Mehr erfahren &rarr;</a></div>`
    : "";

  return `
  <tr>
    <td style="padding:0 0 12px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${COLORS.eventBg};border:1px solid ${COLORS.cardStrongBorder};border-radius:14px;">
        <tr>
          <td style="padding:18px 20px;" valign="top">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td width="52" valign="top" style="padding-right:14px;">
                  <div style="width:42px;height:42px;line-height:42px;border-radius:10px;background:${COLORS.accentSoft};text-align:center;font-size:20px;">&#128197;</div>
                </td>
                <td valign="top">
                  <div style="font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:${COLORS.accent};font-family:'DM Sans',Arial,Helvetica,sans-serif;">${esc(roleLabel)}</div>
                  <div style="margin-top:4px;color:${COLORS.cool};font-size:16px;font-weight:600;font-family:'DM Sans',Arial,Helvetica,sans-serif;line-height:1.35;">${esc(ev.title)}</div>
                  ${metaLine}
                  ${desc}
                  ${link}
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>`;
}

function eventsSection(content: NewsletterContent): string {
  const events = Array.isArray(content.events) ? content.events.slice(0, 3) : [];
  if (events.length === 0) return "";
  const header = `
  <tr>
    <td style="padding:8px 0 14px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td width="160" style="color:${COLORS.accent};font-size:11px;font-weight:600;letter-spacing:2.5px;text-transform:uppercase;font-family:'DM Sans',Arial,Helvetica,sans-serif;white-space:nowrap;">Kommende Termine</td>
          <td style="padding-left:10px;">
            <div style="height:1px;background:${COLORS.cardStrongBorder};line-height:1px;font-size:0;">&nbsp;</div>
          </td>
        </tr>
      </table>
    </td>
  </tr>`;
  return header + events.map(eventCard).join("");
}

export interface RenderOptions {
  ausgabeNr: number;
  kw: number;
  jahr: number;
  titel: string;
  subtitle?: string | null;
  gesendetAm?: Date | null;
  autor?: string;
  lesezeit?: string;
}

export function renderNewsletterHtml(
  content: NewsletterContent,
  opts: RenderOptions
): string {
  const dateLabel = (opts.gesendetAm ?? new Date()).toLocaleDateString("de-DE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const autor = opts.autor ?? "Alexander Eggers";
  const lesezeit = opts.lesezeit ?? "5 Min.";

  const titelRaw = opts.titel || "Copilot Insider Update";
  const titelParts = titelRaw.split(" ");
  const titelLast = esc(titelParts.pop() ?? "Update");
  const titelRest = esc(titelParts.join(" "));
  const titelClean = esc(titelRaw);

  const selected = content.selectedIds
    .map((id) => content.candidates.find((c) => c.id === id))
    .filter((c): c is NewsletterNewsItem => !!c);
  const newsItems = selected.length > 0 ? selected : content.candidates.slice(0, 5);

  const newsCards = newsItems.map((item, i) => newsCard(item, i)).join("");

  const subtitle = esc(
    opts.subtitle ?? "Prompts, News und Insights – dein wöchentlicher Vorsprung."
  );

  const prompt = content.prompt;

  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark light">
<meta name="supported-color-schemes" content="dark light">
<title>${titelClean} – Ausgabe #${opts.ausgabeNr} · KW ${opts.kw}</title>
<!--[if mso]>
<style type="text/css">
body, table, td, a { font-family: Arial, Helvetica, sans-serif !important; }
</style>
<![endif]-->
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
  @media (max-width: 600px) {
    .ctn-outer { padding: 20px 12px !important; }
    .ctn-inner { width: 100% !important; }
    .h1 { font-size: 28px !important; }
    .stat-num { font-size: 48px !important; }
    .meta-row td { display: block !important; width: 100% !important; padding-bottom: 4px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:${COLORS.bgOuter};color:${COLORS.cool};font-family:'DM Sans',Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${COLORS.bgOuter};">
  <tr>
    <td align="center" class="ctn-outer" style="padding:32px 20px;">
      <table role="presentation" class="ctn-inner" width="640" cellpadding="0" cellspacing="0" border="0" style="max-width:640px;width:100%;">

        <!-- HERO -->
        <tr>
          <td style="padding:24px 0 20px 0;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td width="10" style="background:${COLORS.accent};border-radius:3px;line-height:28px;">&nbsp;</td>
                <td width="12">&nbsp;</td>
                <td style="color:${COLORS.gray};font-size:12px;font-weight:500;letter-spacing:2px;text-transform:uppercase;font-family:'DM Sans',Arial,Helvetica,sans-serif;">NextSkills &middot; Copilot Partner Masterclass</td>
              </tr>
            </table>
            <div style="margin-top:20px;">
              <span style="display:inline-block;padding:6px 16px;border-radius:100px;border:1px solid ${themeFor("CHAT").border};background:${themeFor("CHAT").bg};color:${COLORS.accent};font-size:12px;font-weight:600;letter-spacing:0.5px;font-family:'DM Sans',Arial,Helvetica,sans-serif;">&#9679; Ausgabe #${opts.ausgabeNr} &middot; KW ${opts.kw}</span>
            </div>
            <h1 class="h1" style="margin:18px 0 10px 0;color:${COLORS.cool};font-size:40px;font-weight:700;line-height:1.15;letter-spacing:-0.5px;font-family:'DM Sans',Arial,Helvetica,sans-serif;">${titelRest ? `${titelRest} ` : ""}<span style="color:${COLORS.accent};">${titelLast}</span></h1>
            <div style="color:${COLORS.gray};font-size:16px;line-height:1.55;font-family:'DM Sans',Arial,Helvetica,sans-serif;max-width:520px;">${subtitle}</div>

            <table role="presentation" class="meta-row" cellpadding="0" cellspacing="0" border="0" style="margin-top:18px;">
              <tr>
                <td style="padding-right:24px;color:${COLORS.gray};font-size:13px;font-family:'DM Sans',Arial,Helvetica,sans-serif;">&#128197;&nbsp; ${dateLabel}</td>
                <td style="padding-right:24px;color:${COLORS.gray};font-size:13px;font-family:'DM Sans',Arial,Helvetica,sans-serif;">&#9203;&nbsp; ${esc(lesezeit)}</td>
                <td style="color:${COLORS.gray};font-size:13px;font-family:'DM Sans',Arial,Helvetica,sans-serif;">&#128100;&nbsp; ${esc(autor)}</td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- SECTION: KOMMENDE TERMINE -->
        ${eventsSection(content)}

        <!-- EVENT (manuell, optional) -->
        ${eventBlock(content)}

        <!-- SECTION: PROMPT DER WOCHE -->
        <tr>
          <td style="padding:32px 0 14px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td width="150" style="color:${COLORS.accent};font-size:11px;font-weight:600;letter-spacing:2.5px;text-transform:uppercase;font-family:'DM Sans',Arial,Helvetica,sans-serif;white-space:nowrap;">Prompt der Woche</td>
                <td style="padding-left:10px;">
                  <div style="height:1px;background:${COLORS.cardStrongBorder};line-height:1px;font-size:0;">&nbsp;</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:0 0 12px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${COLORS.promptBg};border:1px solid ${themeFor("CHAT").border};border-radius:16px;">
              <tr>
                <td style="background:${COLORS.accent};border-radius:16px 16px 0 0;line-height:3px;font-size:0;">&nbsp;</td>
              </tr>
              <tr>
                <td style="padding:26px 28px;">
                  ${badgePill("PREMIUM", prompt.badge || "Copilot Premium")}
                  <div style="margin-top:14px;color:${COLORS.cool};font-size:18px;font-weight:600;line-height:1.35;font-family:'DM Sans',Arial,Helvetica,sans-serif;">${esc(prompt.title)}</div>
                  ${prompt.tipp ? "" : ""}
                  <div style="margin-top:18px;padding:18px;background:${COLORS.codeBg};border:1px solid ${COLORS.cardBorder};border-radius:10px;color:${COLORS.cool};font-family:'JetBrains Mono','Courier New',Consolas,monospace;font-size:13px;line-height:1.7;white-space:pre-wrap;word-break:break-word;">${esc(prompt.body)}</div>
                  ${prompt.tipp ? `<div style="margin-top:18px;padding:14px 18px;background:${COLORS.accentSoft};border-left:3px solid ${COLORS.accent};border-radius:0 10px 10px 0;font-family:'DM Sans',Arial,Helvetica,sans-serif;"><span style="color:${COLORS.cool};font-weight:600;font-size:13px;">Sales-Tipp:</span> <span style="color:${COLORS.gray};font-size:13px;line-height:1.55;">${esc(prompt.tipp)}</span></div>` : ""}
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- SECTION: NEWS DER WOCHE -->
        <tr>
          <td style="padding:32px 0 14px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td width="140" style="color:${COLORS.accent};font-size:11px;font-weight:600;letter-spacing:2.5px;text-transform:uppercase;font-family:'DM Sans',Arial,Helvetica,sans-serif;white-space:nowrap;">News der Woche</td>
                <td style="padding-left:10px;">
                  <div style="height:1px;background:${COLORS.cardStrongBorder};line-height:1px;font-size:0;">&nbsp;</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        ${newsCards}

        <!-- FOOTER -->
        <tr>
          <td style="padding:32px 0 12px 0;">
            <div style="height:1px;background:${COLORS.cardBorder};line-height:1px;font-size:0;">&nbsp;</div>
          </td>
        </tr>
        <tr>
          <td style="padding:12px 0 32px 0;text-align:center;">
            <div style="color:${COLORS.gray};font-size:12px;line-height:1.7;font-family:'DM Sans',Arial,Helvetica,sans-serif;">
              Copilot Partner Masterclass &middot; NextSkills GmbH &middot; <a href="https://www.copilotberater.de" style="color:${COLORS.accent};text-decoration:none;" target="_blank">copilotberater.de</a><br>
              Fragen? Einfach auf die Mail antworten.
            </div>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}
