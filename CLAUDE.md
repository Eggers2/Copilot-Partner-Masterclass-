# Hinweise für Claude

## Deployment

- Produktions-Branch ist `claude/copilot-masterclass-landing-cru4s` (es gibt kein `main`). Railway deployt bei jedem Push darauf sofort.
- Änderungen immer über eigenen Branch und Pull Request. Gemergt wird erst nach ausdrücklichem OK von Alex.
- Migrationen laufen beim Start automatisch (`prisma migrate deploy`). Datenkorrekturen in Produktion daher als einmalige Migration, vorher lokal gegen eine Wegwerf-Postgres testen.

## Landingpages mit Lead-Erfassung (Event, Download, Formular)

Pflichtregeln, gelernt aus /adn-schweiz (Oktober 2026). Sie gelten für Event- und Sonder-Landingpages mit Einwilligungs-Checkbox. Das Wartelisten-Formular der Startseite (`/api/waitlist`) startet die Sequenz für jeden Eintrag und bleibt davon unberührt.

1. **Mails und Wartelisten-Lauf nur mit Marketing-Einwilligung.** Nur wer die Einwilligungs-Checkbox gesetzt hat, bekommt die Wartelisten-Bestätigung und kommt in den Follow-up-Lauf (`sequenzStartDaten()` aus `lib/followup/versand.ts`, Bestätigung und vier Follow-ups). Ohne Einwilligung geht keine einzige Mail an den Lead.
2. **Versand über Resend, wie in `/api/waitlist`.** Bestätigung über `bestaetigungUeberApp()` und `sendeWartelisteBestaetigung()`. Den n8n-Webhook `N8N_WEBHOOK_URL` nicht als "interne Benachrichtigung" aufrufen: der n8n-Workflow "EMail Masterclass" schickt jedem übergebenen Kontakt die Wartelisten-Bestätigung.
3. **Bestehende Leads** (E-Mail schon im CRM): kein Fehler für den Nutzer, nur eine NOTE-Aktivität anhängen. Status, Quelle, UTM-Werte und eine laufende Sequenz bleiben unverändert.
4. **Einwilligung dokumentieren:** In Notiz und NOTE-Aktivität immer "Marketing-Einwilligung: ja" oder "Marketing-Einwilligung: nein".
5. **UTM-Werte** direkt aus der URL der Seite lesen, nicht aus `lib/utm-tracker.ts` (der speichert den ersten Kontakt).
6. Vor dem Einbinden eines Webhooks oder Workflows immer prüfen, was er tatsächlich verschickt.
7. **Feld "Keine E-Mails"** am Lead (`keineMailsAm`, `keineMailsGrund`, Logik in `lib/leads/keineMails.ts`): Leads ohne Einwilligung damit markieren (`sperreMails`). Jeder neue automatische Versand muss Leads mit gesetztem Feld auslassen.

Vorlage: `app/adn-schweiz`, `app/api/adn-schweiz/route.ts`, `lib/adn-schweiz/lead.ts`.

## Texte

Keine Gedankenstriche in Texten für Nutzer, stattdessen Komma oder neuer Satz.
