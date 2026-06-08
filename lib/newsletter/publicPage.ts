import { NextResponse } from "next/server";

/**
 * Gemeinsame, in sich geschlossene HTML-Hülle (dark, im Newsletter-Look) für die
 * öffentlichen, token-gesicherten Seiten Freigabe und Abmeldung. Bewusst ohne
 * React/Design-System, damit diese Utility-Routen unabhängig und cachefrei sind.
 */
export function pageShell(opts: {
  title: string;
  heading: string;
  /** Roh-HTML für den Inhaltsbereich (Text, Buttons, Formulare). */
  body: string;
  accent?: string;
}): string {
  const bg = "#1A1A2E";
  const accent = opts.accent ?? "#00C896";
  const cool = "#E8E8F0";
  const gray = "#6B6B8A";
  const card = "#22223C";
  const border = "#2B2B48";
  return `<!doctype html>
<html lang="de"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>${opts.title}</title>
</head>
<body style="margin:0;padding:0;background:${bg};font-family:'DM Sans',Arial,Helvetica,sans-serif;color:${cool};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${bg};min-height:100vh;">
  <tr><td align="center" valign="middle" style="padding:40px 20px;">
    <table role="presentation" width="520" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;width:100%;background:${card};border:1px solid ${border};border-radius:16px;">
      <tr><td style="padding:36px 36px 32px 36px;">
        <div style="color:${accent};font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">Copilot Partner Masterclass</div>
        <h1 style="margin:14px 0 0 0;color:${cool};font-size:24px;font-weight:700;line-height:1.25;">${opts.heading}</h1>
        <div style="margin-top:16px;color:${gray};font-size:15px;line-height:1.65;">${opts.body}</div>
      </td></tr>
    </table>
    <div style="margin-top:18px;color:${gray};font-size:12px;">NextSkills GmbH · <a href="https://www.copilotberater.de" style="color:${accent};text-decoration:none;">copilotberater.de</a></div>
  </td></tr>
</table>
</body></html>`;
}

export function htmlResponse(status: number, html: string): NextResponse {
  return new NextResponse(html, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

/** Grün/Akzent-Button, der ein Formular absendet. */
export function submitButton(label: string, accent = "#00C896"): string {
  return `<button type="submit" style="display:inline-block;background:${accent};color:#06251D;font-size:15px;font-weight:700;border:none;cursor:pointer;padding:13px 24px;border-radius:10px;">${label}</button>`;
}
