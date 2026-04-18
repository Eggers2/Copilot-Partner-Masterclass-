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
