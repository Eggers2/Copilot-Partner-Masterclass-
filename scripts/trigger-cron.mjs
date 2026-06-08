// Einstiegspunkt für den Railway-Cron-Service.
//
// Dieser Service teilt sich das Repo mit der Web-App, hat aber als Start-Command
// `node scripts/trigger-cron.mjs` und einen Cron-Schedule (UTC) im Railway-
// Dashboard. Das Skript stößt nur den geschützten Endpoint der Web-App an und
// beendet sich danach – die eigentliche Logik (und die Berlin-Zeit-Prüfung)
// liegt serverseitig in /api/cron/newsletter.
//
// Reines Node (kein tsx/curl nötig). Erwartete Env-Variablen im Cron-Service:
//   APP_BASE_URL   – öffentliche Basis-URL der Web-App
//   CRON_SECRET    – muss mit der Web-App übereinstimmen
//   CRON_FORCE     – optional: "thursday" | "friday" (nur zum Testen)

const base = (process.env.APP_BASE_URL || "").replace(/\/$/, "");
const secret = process.env.CRON_SECRET;
const force = process.env.CRON_FORCE;

if (!base) {
  console.error("[trigger-cron] APP_BASE_URL fehlt.");
  process.exit(1);
}
if (!secret) {
  console.error("[trigger-cron] CRON_SECRET fehlt.");
  process.exit(1);
}

const url = `${base}/api/cron/newsletter${force ? `?force=${encodeURIComponent(force)}` : ""}`;

try {
  const res = await fetch(url, {
    method: "POST",
    headers: { "x-cron-secret": secret },
  });
  const text = await res.text();
  console.log(`[trigger-cron] ${res.status} POST ${url}`);
  console.log(text);
  process.exit(res.ok ? 0 : 1);
} catch (err) {
  console.error("[trigger-cron] Aufruf fehlgeschlagen:", err);
  process.exit(1);
}
