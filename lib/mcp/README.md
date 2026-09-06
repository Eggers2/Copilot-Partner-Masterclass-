# MCP-Server für Claude

Claude (Chat, Cowork, Desktop, Claude Code) greift über `/api/mcp` auf das CRM zu.
Der Server ist Teil der Next.js-App und nutzt dieselbe Datenschicht (`lib/db/*`)
wie das Admin-Portal. Es gibt keinen direkten Datenbankzugriff und kein SQL.

## Verbinden

1. claude.ai → Einstellungen → Connectors → Custom Connector → URL `https://<host>/api/mcp`
2. „Verbinden" öffnet `/admin/mcp/authorize`. Admin-Login, dann Lesen (immer) und
   Schreiben (abwählbar) freigeben.
3. Claude Code: `claude mcp add --transport http masterclass-crm https://<host>/api/mcp`

Verwaltung, Protokoll und Trennen unter `/admin/mcp`.

### Copilot Studio

Tool „Model Context Protocol" → Server-URL `https://<host>/api/mcp`, Authentifizierung
**OAuth 2.0 → Dynamische Ermittlung**. Copilot Studio registriert sich selbst; weil
Microsoft dabei zwingend ein Client-Secret verlangt, erhält jeder Client, dessen
Redirect nicht auf claude.ai oder Loopback zeigt, automatisch eines
(`token_endpoint_auth_method = client_secret_post`). Die Rück-Adresse liegt auf
`*.consent.azure-apim.net` und ist in der Allowlist. Die Freigabe läuft wie bei
Claude über `/admin/mcp/authorize`; die Verbindung sollte in Copilot Studio als
Maker-Verbindung genutzt werden, damit Endnutzer des Agents kein Admin-Passwort brauchen.

## Sicherheit

| Maßnahme | Umsetzung |
| --- | --- |
| Kein statisches Secret | OAuth 2.1 mit Dynamic Client Registration (RFC 7591). Public Clients (Claude) mit PKCE-Pflicht, vertrauliche Clients (Copilot Studio) mit generiertem Secret, PKCE optional. |
| Redirect-Allowlist | `https://claude.ai/...`, `https://*.consent.azure-apim.net/...` (Power Platform) und Loopback (`http://localhost`, Port egal, für Claude Code). Erweiterbar per `MCP_ALLOWED_REDIRECT_HOSTS`. |
| Freigabe nur durch Admin | `/admin/mcp/authorize` verlangt den Admin-Login; Login leitet per `next` zurück. |
| Kurze Laufzeiten | Auth-Code 5 min (einmalig), Access-Token 1 h, Refresh-Token 30 Tage mit Rotation. |
| Diebstahl-Erkennung | Wiederverwendeter Auth-Code widerruft alle Tokens des Clients; altes Refresh-Token ist nach Rotation wertlos. |
| Nur Hashes in der DB | SHA-256 von Codes, Access- und Refresh-Tokens (`mcp_auth_codes`, `mcp_tokens`). |
| Scopes | `crm:read` (9 Werkzeuge), `crm:write` (6 Werkzeuge). Schreibwerkzeuge sind ohne Scope unsichtbar und nicht aufrufbar. |
| Kein Löschen | Keine Delete-Werkzeuge; Umsatz, Rechnungsdaten und E-Mail-Adressen sind nicht änderbar. |
| Kein Massenexport | Listen liefern maximal 50 Datensätze; Tracking-Felder (UTM, Referrer) nur auf Anfrage. |
| Audit | Jeder Tool-Aufruf mit Argumenten, Dauer und Ergebnis in `mcp_audit_logs`; Schreibaktionen erzeugen zusätzlich `LeadActivity`-Einträge wie im Admin. |
| Rate-Limit | 120 Aufrufe/min pro Token, Registrierungs- und Token-Endpunkt pro IP limitiert. |
| Origin-Prüfung | Fremde `Origin`-Header werden mit 403 abgewiesen (DNS-Rebinding). |

## Aufbau

```
lib/mcp/config.ts       Konstanten, URLs, Scopes
lib/mcp/crypto.ts       Zufallssecrets, SHA-256, PKCE
lib/mcp/oauth.ts        Registrierung, Auth-Codes, Token-Austausch/-Rotation, Widerruf
lib/mcp/server.ts       JSON-RPC (initialize, ping, tools/list, tools/call)
lib/mcp/audit.ts        Audit-Log und Verbindungsliste
lib/mcp/tools/lesen.ts  Lesewerkzeuge
lib/mcp/tools/schreiben.ts  Schreibwerkzeuge
app/api/mcp/route.ts    MCP-Endpunkt (Streamable HTTP, zustandslos, nur POST)
app/api/mcp/oauth/*     register, token, revoke
app/.well-known/*       RFC 9728 / RFC 8414 Metadaten
app/admin/mcp/*         Freigabeseite, Verwaltung, Protokoll
```

Werkzeuge werden mit `defineTool()` und einem zod-Schema deklariert; das JSON-Schema
für Claude wird daraus generiert. Neue Werkzeuge in `lesen.ts` bzw. `schreiben.ts`
ergänzen und in die jeweilige Liste aufnehmen.
