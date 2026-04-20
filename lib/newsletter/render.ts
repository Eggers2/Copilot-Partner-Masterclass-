import type { NewsletterContent, NewsletterNewsItem } from "./types";

function esc(value: string | undefined | null): string {
  if (value == null) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const COLORS = {
  bgOuter: "#0B1220",
  bgCard: "#111A2E",
  bgCardMuted: "#0F1728",
  border: "#1E2A44",
  borderStrong: "#2A3A5C",
  text: "#E6EBF5",
  textMuted: "#96A3BD",
  textDim: "#6C7A95",
  accent: "#2FE29B",
  badgePremium: "#7E9EFF",
  badgeChat: "#5EC3FF",
  badgeStudio: "#C58DFF",
  badgeDatenschutz: "#2FE29B",
  badgeDistributor: "#F4B955",
  badgeEvent: "#2FE29B",
  badgeAdoption: "#8FD694",
};

const BADGE_COLORS: Record<string, string> = {
  PREMIUM: COLORS.badgePremium,
  CHAT: COLORS.badgeChat,
  STUDIO: COLORS.badgeStudio,
  DATENSCHUTZ: COLORS.badgeDatenschutz,
  DISTRIBUTOR: COLORS.badgeDistributor,
  EVENT: COLORS.badgeEvent,
  ADOPTION: COLORS.badgeAdoption,
};

function badgeStyle(badge: string): string {
  const color = BADGE_COLORS[badge.toUpperCase()] ?? COLORS.badgeChat;
  return `display:inline-block;padding:4px 10px;border-radius:999px;border:1px solid ${color}55;background:${color}14;color:${color};font-size:11px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;font-family:Arial,Helvetica,sans-serif;`;
}

function newsCard(item: NewsletterNewsItem, index: number): string {
  const nr = String(index + 1).padStart(2, "0");
  const badgeColor = BADGE_COLORS[item.badge] ?? COLORS.badgeChat;
  const sourceParts = [esc(item.sourceLabel)];
  if (item.sourceUrl) {
    sourceParts.push(
      `<a href="${esc(item.sourceUrl)}" style="color:${COLORS.textMuted};text-decoration:none;" target="_blank">↗ ${esc(item.sourceLabel || item.sourceUrl)}</a>`
    );
  }
  return `
  <tr>
    <td style="padding:0 0 16px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${COLORS.bgCard};border:1px solid ${COLORS.border};border-radius:12px;">
        <tr>
          <td style="padding:20px 24px;position:relative;">
            <div style="position:absolute;top:12px;right:20px;color:${COLORS.textDim}22;font-size:48px;font-weight:700;letter-spacing:-2px;font-family:Arial,Helvetica,sans-serif;">${nr}</div>
            <div style="${badgeStyle(item.badge)}">${esc(item.badge)}</div>
            <div style="margin-top:12px;color:${COLORS.text};font-size:18px;font-weight:700;line-height:1.3;font-family:Arial,Helvetica,sans-serif;">${esc(item.title)}</div>
            <div style="margin-top:8px;color:${COLORS.textMuted};font-size:14px;line-height:1.55;font-family:Arial,Helvetica,sans-serif;">${esc(item.body)}</div>
            ${
              item.cta
                ? `<div style="margin-top:14px;padding:10px 14px;background:${badgeColor}10;border:1px solid ${badgeColor}33;border-radius:8px;color:${badgeColor};font-size:13px;font-weight:600;font-family:Arial,Helvetica,sans-serif;">${esc(item.cta)}</div>`
                : ""
            }
            <div style="margin-top:14px;color:${COLORS.textDim};font-size:12px;font-family:Arial,Helvetica,sans-serif;">${sourceParts.join(" · ")}</div>
          </td>
        </tr>
      </table>
    </td>
  </tr>`;
}

function eventBlock(content: NewsletterContent): string {
  const ev = content.eventBlock;
  if (!ev) return "";
  return `
  <tr>
    <td style="padding:0 0 24px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${COLORS.bgCard};border:1px solid ${COLORS.accent}44;border-radius:12px;">
        <tr>
          <td style="padding:20px 24px;">
            <div style="${badgeStyle("EVENT")}">${esc(ev.badge || "ADN EVENT")}</div>
            <div style="margin-top:10px;color:${COLORS.text};font-size:18px;font-weight:700;font-family:Arial,Helvetica,sans-serif;">${esc(ev.titel)}</div>
            <div style="margin-top:8px;color:${COLORS.textMuted};font-size:14px;line-height:1.55;font-family:Arial,Helvetica,sans-serif;">${esc(ev.body)}</div>
            ${
              ev.ctaUrl
                ? `<div style="margin-top:14px;"><a href="${esc(ev.ctaUrl)}" style="color:${COLORS.accent};font-size:14px;font-weight:600;text-decoration:none;font-family:Arial,Helvetica,sans-serif;" target="_blank">${esc(ev.ctaLabel || "Mehr erfahren")} →</a></div>`
                : ""
            }
          </td>
        </tr>
      </table>
    </td>
  </tr>`;
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
  const titelClean = esc(opts.titel || "Copilot Insider Update");
  const titelParts = (opts.titel || "Copilot Insider Update").split(" ");
  const titelLast = esc(titelParts.pop() ?? "Update");
  const titelRest = esc(titelParts.join(" "));

  const selected = content.selectedIds
    .map((id) => content.candidates.find((c) => c.id === id))
    .filter((c): c is NewsletterNewsItem => !!c);
  const newsItems = selected.length > 0 ? selected : content.candidates.slice(0, 5);

  const newsCards = newsItems.map((item, i) => newsCard(item, i)).join("");

  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${titelClean} – Ausgabe #${opts.ausgabeNr} · KW ${opts.kw}</title>
</head>
<body style="margin:0;padding:0;background:${COLORS.bgOuter};color:${COLORS.text};font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${COLORS.bgOuter};">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <table role="presentation" width="640" cellpadding="0" cellspacing="0" border="0" style="max-width:640px;width:100%;">

        <tr>
          <td style="padding:0 0 20px 0;border-left:3px solid ${COLORS.accent};padding-left:16px;">
            <div style="color:${COLORS.accent};font-size:11px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;">NEXTSKILLS · COPILOT PARTNER MASTERCLASS</div>
            <div style="margin-top:12px;display:inline-block;padding:4px 12px;border:1px solid ${COLORS.border};border-radius:999px;color:${COLORS.textMuted};font-size:11px;letter-spacing:0.6px;"><span style="color:${COLORS.accent};">●</span> Ausgabe #${opts.ausgabeNr} · KW ${opts.kw}</div>
            <h1 style="margin:14px 0 8px 0;color:${COLORS.text};font-size:32px;font-weight:800;line-height:1.15;">${titelRest} <span style="color:${COLORS.accent};">${titelLast}</span></h1>
            <div style="color:${COLORS.textMuted};font-size:14px;line-height:1.5;">${esc(opts.subtitle ?? "Prompts, News und Insights – dein wöchentlicher Vorsprung.")}</div>
            <div style="margin-top:12px;color:${COLORS.textDim};font-size:12px;">📅 ${dateLabel} &nbsp;·&nbsp; ⌛ ${esc(lesezeit)} &nbsp;·&nbsp; 👤 ${esc(autor)}</div>
          </td>
        </tr>

        ${eventBlock(content)}

        <tr>
          <td style="padding:24px 0 8px 0;">
            <div style="color:${COLORS.accent};font-size:11px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;">Prompt der Woche</div>
          </td>
        </tr>
        <tr>
          <td style="padding:0 0 24px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${COLORS.bgCard};border:1px solid ${COLORS.accent}33;border-radius:12px;">
              <tr>
                <td style="padding:22px 24px;">
                  <div style="${badgeStyle("PREMIUM")}">${esc(content.prompt.badge || "COPILOT PREMIUM")}</div>
                  <div style="margin-top:12px;color:${COLORS.text};font-size:20px;font-weight:700;line-height:1.3;">${esc(content.prompt.title)}</div>
                  <div style="margin-top:8px;color:${COLORS.textMuted};font-size:14px;line-height:1.55;">Verwandelt jedes Teams-Meeting, jede Recherche, jedes Angebot in Minuten statt Stunden.</div>
                  <div style="margin-top:16px;padding:16px;background:${COLORS.bgCardMuted};border:1px solid ${COLORS.border};border-radius:8px;color:${COLORS.text};font-family:'Courier New',Consolas,monospace;font-size:13px;line-height:1.65;white-space:pre-wrap;">${esc(content.prompt.body)}</div>
                  <div style="margin-top:16px;padding:12px 14px;border-left:3px solid ${COLORS.accent};background:${COLORS.accent}10;color:${COLORS.textMuted};font-size:13px;line-height:1.5;"><strong style="color:${COLORS.text};">Sales-Tipp:</strong> ${esc(content.prompt.tipp)}</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td style="padding:24px 0 8px 0;">
            <div style="color:${COLORS.accent};font-size:11px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;">News der Woche</div>
          </td>
        </tr>

        <tr>
          <td style="padding:0 0 16px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${COLORS.bgCard};border:1px solid ${COLORS.border};border-radius:12px;">
              <tr>
                <td align="center" style="padding:28px 24px;">
                  <div style="color:${COLORS.accent};font-size:56px;font-weight:800;line-height:1;letter-spacing:-1px;">${esc(content.zahl.wert)}</div>
                  <div style="margin-top:12px;color:${COLORS.text};font-size:16px;font-weight:700;">${esc(content.zahl.titel)}</div>
                  <div style="margin-top:6px;color:${COLORS.textMuted};font-size:13px;line-height:1.5;">${esc(content.zahl.body)}</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        ${newsCards}

        <tr>
          <td style="padding:24px 0 8px 0;border-top:1px solid ${COLORS.border};">
            <div style="text-align:center;color:${COLORS.textDim};font-size:12px;line-height:1.6;">
              Copilot Partner Masterclass · NextSkills GmbH · <a href="https://www.copilotberater.de" style="color:${COLORS.accent};text-decoration:none;" target="_blank">copilotberater.de</a><br>
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
