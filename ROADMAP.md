# Roadmap — Code-Updates & Weiterentwicklungen

Ergebnis einer vollständigen statischen Analyse der App (Code, Architektur, Abhängigkeiten,
Konfiguration). Zwei getrennte, priorisierte Listen:

1. **Code-Updates** — technische Korrekturen am bestehenden Code (Bugs, Robustheit, veraltete
   Patterns, Performance, Fehlerbehandlung, Duplikate, Abhängigkeiten).
2. **Weiterentwicklungen** — neue Funktionen, Architektur-Änderungen, zusätzliche Integrationen.

Jede Zeile ist per `Datei:Zeile` belegt. Prioritäten: **Hoch / Mittel / Niedrig**, begründet über
Aufwand, Risiko und Nutzen.

## Kontext & Einordnung

Analysiert wurde die Next.js-15-App „Copilot Partner Masterclass" (App Router, React 19,
Prisma 5 / PostgreSQL, Resend, Anthropic SDK, Microsoft Graph, n8n-Webhooks, Leaflet-Karte,
Railway-Deployment). Domänen: öffentliche Landing-/Bestell-/Such-Seiten, Admin-CRM,
Kundenportal (OTP-Login), Kanban-Tool `/tasks`, KI-Newsletter, KI-Transkriptauswertung.

Einstufung erfolgte unter der Annahme: **klein & intern + moderat öffentlich**, **/admin & /tasks
öffentlich erreichbar** (→ Auth-Findings hoch gewichtet), **Deployment-Topologie unsicher**
(→ In-Memory-Zustand als fragil bewertet). Reine Skalierungs-/Performance-Themen sind daher
tendenziell niedriger, öffentliche Missbrauchs- und Auth-Themen höher eingestuft. Diese Annahmen
lassen sich mit realen Zahlen (Datenmenge, Empfängerzahl, tatsächliche Exposition) nachschärfen.

> **Hinweis:** `npm install` / `next build` / `tsc` / `next lint` konnten in der Analyse-Umgebung
> wegen wiederholter Netzwerk-Resets gegen die npm-Registry nicht ausgeführt werden. Alle Befunde
> sind rein statisch belegt; das Herstellen eines grünen Build-Gates gehört in die Umsetzung
> (siehe *Verifikation*).

---

## Liste 1 — Code-Updates (technische Korrekturen am Bestand)

| Punkt | Kategorie | Priorität | Begründung (Aufwand / Risiko / Nutzen) |
|---|---|---|---|
| **Account-Takeover im Kundenportal**: `updateKundeBestellungAction` erlaubt, die eigene Bestellung auf eine fremde, unverifizierte E-Mail umzuschreiben und setzt danach die Session auf diese Adresse (`app/kundenportal/actions.ts:111,169,254`) → fremde PII lesbar/bearbeitbar | Sicherheit | **Hoch** | Geringer Aufwand (E-Mail-Wechsel verbieten oder per OTP verifizieren, Session nicht umhängen), hohes Risiko (horizontale Rechteausweitung), verifiziert. |
| **Unsigniertes `/tasks`-Cookie** `base64({"userId":N})` → jeder wählt beliebige userId/Admin (`lib/tasks-auth.ts:24,47,95`) | Sicherheit | **Hoch** | Da öffentlich erreichbar triviale Admin-Übernahme; Fix nutzt das vorhandene HMAC-Muster aus `lib/auth/customer.ts`. |
| **`/api/migrate`**: ungeschützter GET führt destruktives `ALTER TABLE … DROP` via `$executeRawUnsafe` aus (`route.ts:4,7-12`) | Sicherheit | **Hoch** | Minimaler Aufwand (entfernen oder auth-gaten), semantikwidriger + gefährlicher öffentlicher Endpoint. |
| **`/api/lametric/sales`**: Gesamtumsatz ohne Auth (`route.ts:6-13`) | Sicherheit | **Hoch** | Minimaler Aufwand (Secret-Header), Geschäftsdaten öffentlich; verifiziert. |
| **Schwache Auth in `/admin` & `/tasks`**: Admin-Cookie = Klartext-Passwort, `!==`-Vergleich, kein Brute-Force-Schutz (`lib/auth.ts:11,32`); Tasks-Auto-Admin mit Default `changeme123` (`lib/tasks-auth.ts:68`, `seed-tasks.ts:62`) | Sicherheit | **Hoch** | Öffentlich erreichbar → hohes Risiko; mittlerer Aufwand (Rate-Limit via vorhandenem `lib/rate-limit.ts`, Fail-closed, echtes Session-Token). |
| **Prompt-Injection über VTT-Transkripte**: Fremdrede fließt ungefiltert in Scorecard, KI-Mail-Entwurf und Teilnehmer-Protokoll (`lib/firstcall/analyze.ts:107`, `lib/termine/summarize.ts:87`) | Sicherheit/KI | **Hoch** | Steuert KI-Ausgaben, die an Kunden gehen; Fix mittel (Transkript als klar getrennte, untrusted Daten markieren + Ausgabe prüfen). |
| **Webhook-Datenverlust bei n8n-Ausfall**: fire-and-forget ohne Retry/Queue/Persistenz, keine Timeouts, Auth-Header nur bei `newsletter.ts` (`lib/webhooks/bestellung.ts:89-100`, `teamsGuest.ts:37-47`) | Robustheit | **Hoch** | Bestellung→Rechnung/Teams-Invite gehen bei Ausfall spurlos verloren; mittlerer Aufwand (Outbox/Retry, s. Weiterentwicklungen). |
| **Fehlendes Rate-Limit** auf `POST /api/waitlist` (DB-Write + Webhook je Request), `requestOtpCode` (OTP-Mail-Bombing) und `/api/partners/search`+`/api/partners` (teure Geocode-Seiteneffekte) | Sicherheit/Robustheit | **Mittel** | Missbrauch/Spam + externe Quota-Erschöpfung; geringer Aufwand (vorhandenes `checkRateLimit` anwenden). |
| **Newsletter-Versand nicht idempotent**: Crash lässt Status auf `SENDING` hängen, Doppelversand-Race (`newsletter/actions.ts`), Chunk-Verlust ohne Retry/429-Handling (`lib/email/resend.ts:144-162`) | Bug/Robustheit | **Mittel** | Doppel- oder Nicht-Zustellung an echte Empfänger; mittlerer Aufwand (atomarer Status-Claim + Pro-Empfänger-Persistenz). |
| **Read-Modify-Write-Race in `generate.ts`**: drei parallele Tasks überschreiben dieselbe `content`-Spalte vollständig → `candidates`/`prompt`/`events` gehen verloren (`lib/newsletter/generate.ts:21-52`) | Bug | **Mittel** | Stiller Datenverlust im Newsletter-Entwurf; Fix mittel (Merge statt Replace oder sequenziell). |
| **TOCTOU Klassen-Kapazität**: Zählung und Insert nicht atomar, keine DB-Constraint → Überbuchung (`lib/klassen.ts:40-53`, `createBestellung.ts:234`) | Bug | **Mittel** | Überbuchte Klassen; Fix mittel (Transaktion/Constraint). |
| **Floating Promises in `createBestellung`**: Lead-Sync + Webhook laufen ohne `await`/`after()` → nach Response abbrechbar (`lib/orders/createBestellung.ts:277-296`) | Bug | **Mittel** | Bestellung ok, aber Folgeaktionen können ausfallen; geringer Aufwand (`after()` aus `next/server`, wie in `dispatchTeamsGuest.ts`). |
| **Fehlende `$transaction`** bei mehrschrittigen Writes: `deleteLeadAction`, `markAttendance`/`bulkMarkAttendance`, `moveTask`, `updateTask`-Tags, `syncOrderWithLead` | Bug/Robustheit | **Mittel** | Teilzustände bei Fehlern; geringer–mittlerer Aufwand. |
| **`moveTask` fehlerhaft**: keine Quell-Kompaktierung, kein `@@unique(columnId,position)`, hardcodiertes `position:999` → Reihenfolge-Korruption (`lib/db/tasks.ts:100-115`, `KanbanBoard.tsx:208`) | Bug | **Mittel** | Board driftet über Zeit; Fix mittel (transaktionales Reordering + Constraint). |
| **`req.json()`/`parseInt(id)` ohne try/catch & NaN-Check** → 500 statt 400/404 (flächendeckend `app/tasks/api/**`, `webhooks/n8n`, `newsletter/[id]/preview`) | Robustheit | **Mittel** | Malformed Input = unbehandelte 500er (DoS-Fläche); geringer Aufwand, breit anzuwenden. |
| **Datums-Parsing ohne Guard**: `new Date(raw)`/`parseBerlinDate(raw)` bei Invalid/DST-Lücke wirft (`lib/datetime.ts`), `capacity` ohne NaN-Check in `updateKlasseAction` (`actions.ts:1190`) | Robustheit/Edge Case | **Mittel** | Ungültige Eingaben → 500 oder falscher Zeitpunkt; geringer Aufwand (validieren, DST-Gap behandeln). |
| **KI-Output-Parsing fragil**: `JSON.parse` ohne try/catch + Brace-Heuristik (`lib/ai/json.ts:31`); kein `stop_reason`/max_tokens-Check → bei Trunkierung Wurf oder stilles leeres Protokoll | Robustheit/KI | **Mittel** | Unerwartete Modell-Antwort bricht Flow oder speichert leer; Fix gering (try/catch, tool_use durchgängig, Trunkierung prüfen). |
| **`fetch` ohne Timeout/AbortController** (alle Webhooks, `lib/teams/graph.ts`, `lib/geocode.ts`, `linksammlung.ts`); Geocode ohne `res.ok`, Nominatim-`User-Agent` verstößt gegen Policy | Robustheit | **Mittel** | Hängende externe Dienste blockieren Requests (u. a. OTP-Login); geringer Aufwand. |
| **Cron-Route**: Secret-Vergleich nicht timing-safe (`route.ts:29`), Do-Entwurf-TOCTOU ohne `@@unique([kw,jahr])`, bis zu 4 Fr-Reminder-Mails, curl-60s-Fehlalarm bei awaited Generierung | Robustheit | **Mittel** | Nur durch externe Concurrency-Group abgesichert; Doppel-Drafts/Mails möglich; mittlerer Aufwand. |
| **CSV-Import** fest auf Komma-Trennzeichen (bricht DE-Excel `;`), Zeilen-Split bricht quoted Newlines, irreführende Sammel-Fehlermeldung (`app/admin/actions.ts:697-752`) | Bug/Edge Case | **Mittel** | Stiller, verwirrender Importfehler; mittlerer Aufwand (robuster Parser, `;`-Erkennung). |
| **CSV-Export Formel-/CSV-Injection**: `= + - @` nicht neutralisiert; `RegistrationTable.tsx:88-91` escaped zusätzlich `"` nicht | Sicherheit | **Mittel** | Formel-Payload aus Lead-/Firmennamen im Export ausführbar; geringer Aufwand (Prefix-Escaping + Quote-Escaping vereinheitlichen). |
| **LinkedIn Insight Tag ohne Consent** — lädt nur nach Domain-Check, ohne Einwilligung (`components/LinkedInInsightTag.tsx`) | Compliance | **Mittel** | DSGVO-Risiko (Tracking ohne Einwilligung); Fix mittel (Consent-Gate, s. Weiterentwicklungen). |
| **SEO-Metadata falsch**: Canonical-/`metadataBase`-Domain `copilot.next-skills.de` vs. tatsächlicher Domain `copilotberater.de`; `/webinare` erbt Root-Canonical → zeigt auf Homepage; kein `robots.ts` (`app/layout.tsx:4,13`, `sitemap.ts:3`, `app/webinare/page.tsx`) | Bug/SEO | **Mittel** | Duplicate-Content/Deindex-Risiko der öffentlichen Marketing-Seiten; geringer Aufwand. |
| **Fehlende DB-Indizes** auf heißen Filter/Sort/Count-Pfaden: `Bestellung.status` (jeder Admin-Load), `.erstelltAm`, `.klasseId`, `.email`, `.showOnMap`; `Lead.status`, `.createdAt`, `.followUpAt`, `.klasseId` | Performance | **Mittel** | Bei kleiner Datenmenge noch unkritisch, aber billig und wachstumsvorsorgend; geringer Aufwand (Migration). |
| **`onDelete`-Regeln inkonsistent**: `Bestellung.klasse` required ohne `onDelete` → Klasse mit Bestellungen nie löschbar; `WebinarRegistration` ohne Cascade (fragile manuelle Cleanups) (`schema.prisma:218,263`) | Bug | **Mittel** | Blockierte Löschungen/verwaiste Zeilen; geringer Aufwand (Cascade/SetNull explizit setzen). |
| **Write-on-Read**: `getWebinars`/`getOpenWebinars` führen `updateMany` bei jedem (öffentlichen) Request aus (`lib/db/webinars.ts:6-28`); `loadMapPartners` triggert synchrones Geocoding mit 1100 ms-Sleeps im Read-Pfad | Performance/Robustheit | **Mittel** | Jeder Seitenaufruf/Bot schreibt bzw. blockiert; mittlerer Aufwand (Auto-Close entkoppeln, Geocoding asynchron). |
| **Veraltete Abhängigkeiten mit Advisories**: Next.js 15.5.12 (SSRF, DoS, Middleware-Bypass, XSS), postcss <8.5.10 (`npm audit`) | Abhängigkeiten/Sicherheit | **Mittel** | Bekannte Sicherheitslücken im öffentlichen Framework; geringer–mittlerer Aufwand (Patch-Release einspielen). |
| **Fehlende Pagination**: Leads-Dashboard, Shop, Webinar-Detail und öffentliche Karte laden je alle Zeilen (`getLeads`/`getBestellungen`/`getWebinar`/`loadMapPartners` ohne `take`) | Performance | **Niedrig** | Bei aktueller Datenmenge tolerierbar, wächst aber mit jeder Bestellung (v. a. öffentliche Karte); mittlerer Aufwand (server-seitige Pagination, s. WE). |
| **Frontend-Robustheit**: Optimistic Updates ohne Rollback/`res.ok` (`KanbanBoard.tsx:144,203`), `RegistrationTable` verschluckt Action-Fehler (kein Feedback); fehlende `error.tsx`/`loading.tsx`/`not-found.tsx`; unnötiges `"use client"` (`FirstCallBadge.tsx`) | Robustheit/UX | **Niedrig** | UI/DB divergieren stillschweigend; geringer–mittlerer Aufwand. |
| **Fehlerbehandlung/Leaks**: interne Fehlermeldungen an Client (`admin/leads/[id]/bestellung:67`, `shop/backfill:106`, `cron:54`, `migrate:16`); malformed JSON → 500 statt 400 in öffentlichen Formularen | Robustheit | **Niedrig** | Info-Leak + falsche Statuscodes; geringer Aufwand. |
| **In-Memory-Zustand fragil**: Rate-Limit-Map und `seeded`-Flag pro Instanz/Deploy verloren (`lib/rate-limit.ts`, `lib/db/seed-defaults.ts`) | Robustheit | **Niedrig** | Bei Einzelinstanz tolerierbar, bei Skalierung wirkungslos; Fix via externem Store (s. WE). |
| **E-Mail-Escaping-Lücken**: `plainTextToHtml` Attribut-Injection über `"` in URLs (`lib/email/format.ts:2-12`); ungeescapte `unsubscribeUrl`/keine href-Schema-Prüfung (`render.ts:417`) | Sicherheit | **Niedrig** | In E-Mail-Kontext geringes, aber reales Injection-Risiko; geringer Aufwand. |
| **Newsletter-Tokens ohne Ablauf/Nonce** (`approve` unbegrenzt replaybar) + Secret-Reuse mit Session-Cookie (`lib/newsletter/tokens.ts`) | Sicherheit | **Niedrig** | Weiterleitung/Logs erlauben Re-Freigabe; geringer Aufwand (Ablauf + Schlüsseltrennung). |
| **Code-Duplikate**: Teilnehmer-Upsert+Teams-Block (admin vs. kundenportal), Geocode-Block, Email-Regex (4×), P2002-catch (3×), BestellNr-Generierung (2×), Webhook-fetch-Muster (4×), Seed-Logik (`seed-tasks` vs. `seed-defaults`) | Wartbarkeit | **Niedrig** | Divergenz-Risiko bei Änderungen; mittlerer Aufwand (Helper extrahieren). |
| **Toter Code**: `research.ts` `researchNews` (ungenutzt, web_search + modellgelieferte URL), tote `/tasks/api`-Routen (board/tags/columns/cleanup), redundanter `firstCallScore`-Delete (Cascade existiert) | Wartbarkeit | **Niedrig** | Verwirrung/Fehlbedienung; geringer Aufwand (entfernen). |
| **Tasks-Härtung**: keine Passwort-Mindestlänge, keine Rollen-Allowlist (`role` frei), kein „letzter Admin"-Schutz, fehlende Objekt-Autorisierung (jedes Mitglied ändert alles) | Sicherheit | **Niedrig** | Datenqualität/Selbst-Aussperrung; geringer Aufwand. |

---

## Liste 2 — Weiterentwicklungen (neue Funktionen, Architektur, Integrationen)

| Punkt | Kategorie | Priorität | Begründung (Aufwand / Risiko / Nutzen) |
|---|---|---|---|
| **Transaktionale Outbox + Retry-Worker** für n8n-Webhooks & E-Mails (Zustellgarantie, Wiederaufnahme, Dead-Letter, Status pro Versuch) | Architektur | **Hoch** | Beseitigt den Webhook-/Mail-Datenverlust strukturell; hoher Nutzen, mittlerer Aufwand; nutzt vorhandenes `EmailLog`-Modell. |
| **Einheitliches Auth-System** für `/admin` & `/tasks`: Einzelkonten, gehashte Passwörter, signierte Sessions (Muster aus Kundenportal), Rollen, optional 2FA | Architektur/Sicherheit | **Hoch** | Löst mehrere Hoch-Findings auf einmal; mittlerer Aufwand, hoher Sicherheitsnutzen. |
| **Test-Suite + CI** (GitHub Actions: Lint/Typecheck/Build + Kern-Tests für Auth, `createBestellung`, Newsletter-Idempotenz, Datums-/CSV-Parsing) | Qualität/Infra | **Hoch** | Heute existiert kein Testnetz; verhindert Regressionen bei allen anderen Fixes; mittlerer Aufwand. |
| **Zentrale Validierungsschicht** (z. B. Zod-Schemas) für alle Server Actions & Route Handler + einheitliche Fehlerabbildung (400/404/500) | Architektur/Qualität | **Mittel** | Ersetzt verstreute manuelle Checks, schließt die Validierungs-/Edge-Case-Lücken systematisch; mittlerer Aufwand. |
| **`middleware.ts`** als Defense-in-Depth-Layer (Auth-Vorprüfung, Security-Header, zentrales Rate-Limit) | Architektur/Sicherheit | **Mittel** | Kein zentraler Schutz vorhanden (jede Route schützt sich selbst); mittlerer Aufwand, hoher Nutzen. |
| **Persistenter Store (Redis/Upstash)** für Rate-Limit, Seed-/Cache-Flags und Job-State | Integration/Infra | **Mittel** | Macht In-Memory-Zustand instanz-übergreifend & deploy-fest → Voraussetzung für Skalierung; mittlerer Aufwand. |
| **Server-seitige Tabellen** (Pagination, Filter, Suche, Sortierung) für Leads/Shop/Registrations statt Alles-in-den-Browser | Feature/Performance | **Mittel** | Skaliert mit wachsender Datenmenge, bessere UX; mittlerer Aufwand. |
| **Zustell-/Bounce-Dashboard** auf Basis von `EmailLog` + Resend-Bounce-/Complaint-Webhooks | Feature/Integration | **Mittel** | Heute keine Sichtbarkeit über Zustellfehler; mittlerer Aufwand, operativer Nutzen. |
| **Härtung der KI-Pipeline**: Transkripte als klar getrennte, untrusted Daten; durchgängig `tool_use` statt Freitext-JSON; Ausgabe-Schema-Validierung; aktuelles Anthropic-SDK/Modell | Architektur/KI | **Mittel** | Adressiert Prompt-Injection & Parsing-Fragilität dauerhaft; mittlerer Aufwand. |
| **Dependency-/Framework-Major-Upgrade** als geplantes Vorhaben (Next 16, Prisma 7, `@anthropic-ai/sdk` 0.90→0.109, `lucide-react`) inkl. Migrationstests | Wartung | **Mittel** | Hält die Basis wartbar/sicher; mittlerer Aufwand, sollte nach dem CI-Aufbau erfolgen. |
| **Observability**: strukturiertes Logging + Error-Tracking (z. B. Sentry) + Health-/Readiness-Endpoint | Infra | **Niedrig** | Ersetzt `console.error`-Debugging, macht Ausfälle sichtbar; mittlerer Aufwand. |
| **Consent-Management (DSGVO)** + Admin-Audit-Log: Cookie-Banner/CMP statt reinem Domain-Gate für LinkedIn-Tag; Protokoll sicherheitsrelevanter Admin-Aktionen | Feature/Compliance | **Niedrig** | Rechtssicherheit + Nachvollziehbarkeit; mittlerer Aufwand. |

---

## Kritische Dateien (für die Umsetzung)

- **Auth/Sicherheit:** `lib/auth.ts`, `lib/tasks-auth.ts`, `lib/auth/customer.ts` (Referenzmuster HMAC), `app/kundenportal/actions.ts`, `app/api/migrate/route.ts`, `app/api/lametric/sales/route.ts`.
- **Robustheit/DB:** `lib/orders/createBestellung.ts`, `lib/klassen.ts`, `lib/db/tasks.ts`, `lib/db/leads.ts`, `lib/webhooks/*.ts`, `lib/datetime.ts`, `lib/geocode.ts`, `prisma/schema.prisma`.
- **KI/Newsletter:** `lib/ai/json.ts`, `lib/firstcall/analyze.ts`, `lib/termine/summarize.ts`, `lib/newsletter/{generate,send,tokens,render}.ts`, `lib/email/{resend,format}.ts`, `app/api/cron/newsletter/route.ts`.
- **Frontend/Config:** `app/admin/actions.ts` (CSV), `components/admin/{LeadsTable,BestellungenTable,RegistrationTable,CsvUpload}.tsx`, `app/layout.tsx`, `app/sitemap.ts`, `components/LinkedInInsightTag.tsx`, `package.json`.

## Empfohlene Reihenfolge

1. Die vier Hoch-Sicherheitszeilen: Kundenportal-Takeover, `/tasks`-Cookie, `/api/migrate`, `/api/lametric/sales`.
2. Auth-Vereinheitlichung + Webhook-Outbox + CI/Test-Suite.
3. Mittel-Robustheitszeilen (Validierung, Transaktionen, Timeouts, CSV, Cron, Indizes, `onDelete`).
4. Niedrig-Punkte und Weiterentwicklungen nach Bedarf.

## Verifikation (bei Umsetzung)

1. **Build-Gate herstellen:** `npm install`, dann `npm run lint` + `npx tsc --noEmit` + `npm run build` grün bekommen.
2. **Sicherheits-Fixes gezielt durchspielen:** Kundenportal-E-Mail-Wechsel darf keine fremde Session mehr erzeugen; `/tasks`-Cookie-Fälschung wird abgewiesen; `/api/migrate` & `/api/lametric/sales` ohne Secret → 401/404.
3. **Robustheit:** malformed JSON / `id=abc` / leere Datumsfelder → 400/404 statt 500; n8n-Ausfall simulieren → Webhook wird wiederholt/persistiert; Newsletter-Doppelklick erzeugt keinen Doppelversand.
4. **Regressionstests** für diese Kern-Flows als Teil des CI-Aufbaus hinzufügen.

---

_Grundlage: statische Analyse von Code, Architektur, Abhängigkeiten und Konfiguration. Prioritäten
sind Annahmen auf Basis des angenommenen Einsatzszenarios und sollten mit realen Kennzahlen
(Datenmenge, Empfängerzahl, tatsächliche Exposition von `/admin` und `/tasks`) validiert werden._
