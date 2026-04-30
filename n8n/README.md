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

Verarbeitet den Webhook `N8N_WEBHOOK_URL_teams_guest` aus `lib/webhooks/teamsGuest.ts`. Für jeden `BestellungTeilnehmer` mit ausgefüllter E-Mail wird eine Microsoft-Gast-Einladung erzeugt und die Person der M365-Gruppe hinzugefügt, die das Ziel-Team trägt (Team-Mitgliedschaft wird daraus automatisch synchronisiert). Anschließend meldet der Workflow den Erfolg via Callback an die App zurück, damit `teams_eingeladen_am` gesetzt wird und kein Teilnehmer mehrfach eingeladen wird.

### Voraussetzungen (einmalig)

1. **Azure AD App Registration**:
   - App registrieren im Azure-Portal
   - Application Permissions hinzufügen (beide als **Application**, nicht Delegated):
     - `User.Invite.All` (für Gast-Einladung)
     - `GroupMember.ReadWrite.All` (für Hinzufügen zur M365-Gruppe)
   - **Admin Consent** für beide Permissions erteilen (grüner Haken in der Status-Spalte)
   - Client Secret erzeugen
2. **Teams-Einstellungen**: Im Ziel-Team "Gastzugriff" aktivieren
3. **Group-ID** ermitteln (Teams → Team → "Link zum Team abrufen" → GUID aus URL extrahieren, Parameter `groupId`). Diese ID ist **identisch zur Team-ID** – Teams sind M365-Gruppen.

### Import

1. In n8n: **Workflows → Import from File** → `teams-guest-invite.json`
2. Workflow öffnen und folgende Platzhalter ersetzen:
   - `REPLACE_WITH_GRAPH_OAUTH_CREDENTIAL_ID` → OAuth2-Credential für die Azure-App. **Wichtig**: Nicht die vorgefertigte „Microsoft OAuth2 API"-Credential nutzen (die erwartet User-Login mit Refresh-Token), sondern eine generische **OAuth2 API**-Credential anlegen mit Grant Type `Client Credentials`, Access Token URL `https://login.microsoftonline.com/<TENANT_ID>/oauth2/v2.0/token`, Scope `https://graph.microsoft.com/.default`, Authentication `Body`. Im HTTP-Request-Node dann *Authentication = Generic Credential Type → OAuth2 API* auswählen.
   - `REPLACE_WITH_GROUP_ID` → GUID der M365-Gruppe (= Team-ID)
   - `REPLACE_WITH_APP_BASE_URL` → z.B. `https://www.copilotberater.de`
   - `REPLACE_WITH_N8N_WEBHOOK_SECRET` → gleicher Wert wie `N8N_WEBHOOK_SECRET` in Railway
3. Webhook-URL aus dem ersten Node kopieren (Production URL) und in Railway setzen:
   ```
   N8N_WEBHOOK_URL_teams_guest=https://<dein-n8n-host>/webhook/teams-guest-invite
   ```
4. Workflow **aktivieren** (Toggle oben rechts)

### Warum Groups- statt Teams-Endpoint?

Der Workflow ruft `POST /groups/{id}/members/$ref` auf, nicht `POST /teams/{id}/members`. Grund: der Teams-Endpoint setzt voraus, dass der Nutzer bereits Mitglied der darunterliegenden M365-Gruppe ist – ein frisch per `/invitations` erzeugter Gast ist das nicht und bekommt sonst **403 AccessDenied**. Der Groups-Endpoint akzeptiert Gäste direkt, Teams-Mitgliedschaft wird anschließend automatisch synchronisiert.

### Troubleshooting

- **403 AccessDenied auf den Graph-Call** → Permission `GroupMember.ReadWrite.All` fehlt, ist als Delegated statt Application gesetzt, oder Admin-Consent wurde nach dem Hinzufügen nicht gegeben. Status-Spalte in Azure muss grün sein.
- **401 Unauthorized** → altes Token im n8n-Cache (Permissions wurden nach erstem Test geändert). Fix: OAuth2-Credential in n8n kurz öffnen und **Save** erneut drücken, oder die Credential löschen und neu anlegen → erzwingt Token-Refresh.
- **"refreshToken is required"** → falscher Credential-Typ gewählt. Nutze generische **OAuth2 API** mit Grant Type *Client Credentials*, nicht die vorgefertigte „Microsoft OAuth2 API" (= Authorization-Code-Flow für User-Login).
- **409 Conflict auf Group-Member-Call** → Nutzer ist bereits Mitglied. Der Node ist mit *Continue On Fail* konfiguriert, Callback läuft trotzdem.
- **Callback gibt 401 zurück** → `x-webhook-secret` in n8n stimmt nicht mit `N8N_WEBHOOK_SECRET` in Railway überein (oder Railway-Wert ist leer – dann dort einen starken Zufallswert setzen).

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

## Bestellungs-Webhook – ADN-Kanal & Klassen-Kohorte

Der Bestell-Webhook (`N8N_WEBHOOK_URL_bestellen`, gefeuert aus `lib/webhooks/bestellung.ts`) liefert seit der Klasse-2-/ADN-Erweiterung zusätzliche Felder. Faktura-Workflows müssen den `adn_channel` lesen und die Rechnung entsprechend routen.

### Felder (neu in `bestellung`)

- `adn_channel`: `"NONE" | "ADN_50" | "ADN_15"`
  - `NONE` → Direktbestellung; Rechnungsempfänger = Kunde aus `unternehmen`. `preis_netto` = Listenpreis.
  - `ADN_50` → ADN zahlt 50%, wir fakturieren **100% des Listenpreises** an ADN. `preis_netto` = Listenpreis. Rechnungsempfänger = ADN.
  - `ADN_15` → wir fakturieren **85% des Listenpreises** an ADN; ADN fakturiert weiter. `preis_netto` = 0,85 × Liste, `list_preis_netto` = Listenpreis. Rechnungsempfänger = ADN.
- `list_preis_netto`: voller Listenpreis (immer als Referenz, auch ohne ADN-Kanal).

### Neuer Top-Level-Block `klasse`

```json
"klasse": {
  "id": "klasse-1-seed-id",
  "name": "Klasse 1",
  "slug": "klasse-1",
  "kickoffDate": "2026-05-22T09:00:00.000Z",
  "startDate": "2026-06-01T00:00:00.000Z",
  "endDate": "2027-05-31T23:59:59.000Z"
}
```

Workflow-Empfehlung: nach `bestellung.adn_channel` verzweigen (3 Branches), Rechnungsadresse + Betrag entsprechend zusammenstellen, im Mail-/Rechnungs-Template Klasse-Daten anzeigen.
