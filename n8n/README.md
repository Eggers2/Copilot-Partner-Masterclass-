# n8n Workflows

## Kundenportal – Magic Link

Datei: `kundenportal-magic-link.json`

Verarbeitet den Webhook `N8N_WEBHOOK_URL_magic_link` aus `lib/webhooks/magicLink.ts` und verschickt die Login-Mail an den Kunden.

### Import

1. In n8n: **Workflows → Import from File** → `kundenportal-magic-link.json`
2. Workflow öffnen, beim Node **"Login-Mail senden (Outlook)"** die Microsoft-Outlook-Credential aus deinem n8n-Account zuweisen (der Platzhalter `REPLACE_WITH_OUTLOOK_CREDENTIAL_ID` wird sonst rot)
3. Webhook-URL aus dem ersten Node kopieren (Production URL) und in Railway als Env-Variable setzen:
   ```
   N8N_WEBHOOK_URL_magic_link=https://<dein-n8n-host>/webhook/kundenportal-magic-link
   ```
4. Workflow **aktivieren** (Toggle oben rechts)

### Erwartete Payload

Die App sendet per POST:

```json
{
  "typ": "kundenportal_login",
  "email": "kunde@firma.de",
  "link_url": "https://app.deine-domain.de/kundenportal/verify?token=...",
  "gesendet_am": "2026-04-18T14:03:00.000Z"
}
```

Der Workflow prüft `typ === "kundenportal_login"`, validiert E-Mail + Link und sendet eine gebrandete HTML-Mail mit CTA-Button. Der Link ist 30 Min. gültig und funktioniert nur einmal (serverseitig erzwungen).

### Nicht-Outlook-Setups

Wenn du Gmail, SendGrid oder SMTP nutzt:

1. Node **"Login-Mail senden (Outlook)"** löschen
2. Stattdessen passenden Send-Node einfügen (Gmail, SMTP, SendGrid …)
3. Felder übernehmen:
   - **An**: `{{ $json.email }}`
   - **Betreff**: `{{ $json.subject }}`
   - **Body (HTML)**: `{{ $json.html_body }}`
4. Mit dem **Antwort OK**-Node verbinden

### Erweiterung auf weitere Mail-Typen

Der `typ`-Parameter erlaubt später zusätzliche Mails über denselben Webhook (z.B. `typ: "kundenportal_willkommen"`). Dann einfach einen weiteren IF-Zweig ergänzen.

## Teams-Gast-Einladung

Datei: `teams-guest-invite.json`

Verarbeitet den Webhook `N8N_WEBHOOK_URL_teams_guest` aus `lib/webhooks/teamsGuest.ts`. Für jeden `BestellungTeilnehmer` mit ausgefüllter E-Mail wird eine Microsoft-Gast-Einladung erzeugt und die Person direkt dem Ziel-Team hinzugefügt. Anschließend meldet der Workflow den Erfolg via Callback an die App zurück, damit `teams_eingeladen_am` gesetzt wird und kein Teilnehmer mehrfach eingeladen wird.

### Voraussetzungen (einmalig)

1. **Azure AD App Registration**:
   - App registrieren im Azure-Portal
   - Application Permissions hinzufügen:
     - `User.Invite.All`
     - `TeamMember.ReadWrite.All`
   - **Admin Consent** erteilen
   - Client Secret erzeugen
2. **Teams-Einstellungen**: Im Ziel-Team "Gastzugriff" aktivieren
3. **Team-ID** ermitteln (Teams → Team → "Link zum Team abrufen" → GUID aus URL extrahieren, Parameter `groupId`)

### Import

1. In n8n: **Workflows → Import from File** → `teams-guest-invite.json`
2. Workflow öffnen und folgende Platzhalter ersetzen:
   - `REPLACE_WITH_GRAPH_OAUTH_CREDENTIAL_ID` → OAuth2-Credential für die Azure-App (Grant Type: Client Credentials, Scope: `https://graph.microsoft.com/.default`)
   - `REPLACE_WITH_TEAM_ID` → GUID des Ziel-Teams
   - `REPLACE_WITH_APP_BASE_URL` → z.B. `https://www.copilotberater.de`
   - `REPLACE_WITH_N8N_WEBHOOK_SECRET` → gleicher Wert wie `N8N_WEBHOOK_SECRET` in Railway
3. Webhook-URL aus dem ersten Node kopieren (Production URL) und in Railway setzen:
   ```
   N8N_WEBHOOK_URL_teams_guest=https://<dein-n8n-host>/webhook/teams-guest-invite
   ```
4. Workflow **aktivieren** (Toggle oben rechts)

### Erwartete Payload (von der App)

```json
{
  "typ": "teams_guest_invite",
  "teilnehmer_id": 42,
  "bestell_nr": "NS-2026-0017",
  "vorname": "Max",
  "nachname": "Mustermann",
  "email": "max@firma.de",
  "display_name": "Max Mustermann",
  "invite_redirect_url": "https://www.copilotberater.de/kundenportal",
  "ausgeloest_am": "2026-04-18T14:03:00.000Z"
}
```

### Callback an die App (vom Workflow am Ende)

```
POST {APP_BASE_URL}/api/webhooks/n8n
Header: x-webhook-secret: <secret>
Body:   { "event": "teams_guest_invited",
          "email": "max@firma.de",
          "data":  { "teilnehmerId": 42 } }
```

Die App setzt daraufhin `teams_eingeladen_am = NOW()` auf dem Teilnehmer, sodass bei nachfolgenden Updates kein Duplikat-Call mehr ausgelöst wird.
