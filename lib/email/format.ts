/** Wandelt einen reinen Text in einfaches, klickbares E-Mail-HTML. */
export function plainTextToHtml(text: string): string {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const linked = escaped.replace(
    /(https?:\/\/[^\s<]+)/g,
    '<a href="$1">$1</a>'
  );
  const withBreaks = linked.replace(/\r?\n/g, "<br>");
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#1a1a1a;">${withBreaks}</div>`;
}

/**
 * Textfassung zu einer HTML-Mail (multipart/alternative). Mails nur mit HTML
 * werten Spamfilter schlechter; persönliche Mails sollen deshalb immer beide
 * Teile haben. Links werden als "Linktext: URL" ausgeschrieben.
 */
export function htmlToPlainText(html: string): string {
  return html
    .replace(/\s*\n\s*/g, " ")
    .replace(/<(style|head|title)[\s\S]*?<\/\1>/gi, "")
    .replace(/<a\s[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_m, href: string, text: string) => {
      const label = text.replace(/<[^>]+>/g, "").trim();
      return label && label !== href ? `${label}: ${href}` : href;
    })
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|tr|li)>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&uuml;/g, "ü").replace(/&ouml;/g, "ö").replace(/&auml;/g, "ä").replace(/&szlig;/g, "ß")
    .replace(/&rarr;/g, "→").replace(/&darr;/g, "↓").replace(/&middot;/g, "·")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
