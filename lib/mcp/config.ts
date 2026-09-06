import { resolveAppBaseUrl } from "@/lib/auth/customer";

/**
 * Zentrale Konstanten für den MCP-Server (Claude-Anbindung).
 *
 * Alle URLs leiten sich aus APP_BASE_URL (bzw. dem Request-Host) ab, damit der
 * OAuth-Flow lokal, auf Railway-Previews und in Production ohne weitere
 * Konfiguration funktioniert.
 */

export const MCP_SERVER_NAME = "copilot-masterclass-crm";
export const MCP_SERVER_VERSION = "1.0.0";
export const MCP_PROTOCOL_VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"] as const;

export const SCOPE_READ = "crm:read";
export const SCOPE_WRITE = "crm:write";
export const ALL_SCOPES = [SCOPE_READ, SCOPE_WRITE] as const;

/** Gültigkeit von Autorisierungscodes (Sekunden). */
export const AUTH_CODE_TTL_SEC = 5 * 60;
/** Gültigkeit von Access-Tokens (Sekunden). Claude erneuert per Refresh-Token. */
export const ACCESS_TOKEN_TTL_SEC = 60 * 60;
/** Gültigkeit von Refresh-Tokens (Sekunden). Danach muss neu autorisiert werden. */
export const REFRESH_TOKEN_TTL_SEC = 30 * 24 * 60 * 60;

/** Maximale Tool-Aufrufe pro Token und Minute. */
export const RATE_LIMIT_PER_MINUTE = 120;

/** Maximale Datensätze pro Listen-Antwort, damit kein Komplettexport möglich ist. */
export const MAX_LIST_LIMIT = 50;
export const DEFAULT_LIST_LIMIT = 20;

export interface McpUrls {
  base: string;
  issuer: string;
  mcp: string;
  authorize: string;
  token: string;
  register: string;
  revoke: string;
  protectedResourceMetadata: string;
}

export async function getMcpUrls(): Promise<McpUrls> {
  const base = await resolveAppBaseUrl();
  return {
    base,
    issuer: base,
    mcp: `${base}/api/mcp`,
    authorize: `${base}/admin/mcp/authorize`,
    token: `${base}/api/mcp/oauth/token`,
    register: `${base}/api/mcp/oauth/register`,
    revoke: `${base}/api/mcp/oauth/revoke`,
    protectedResourceMetadata: `${base}/.well-known/oauth-protected-resource/api/mcp`,
  };
}

/**
 * Erlaubte Redirect-Hosts für die Dynamic Client Registration:
 * - claude.ai (Claude Chat, Cowork, Desktop, Mobile)
 * - *.consent.azure-apim.net (Power Platform Connectors, also Copilot Studio)
 * - Loopback-Adressen für Claude Code (RFC 8252, Port wird ignoriert)
 * Erweiterbar per MCP_ALLOWED_REDIRECT_HOSTS="host1,.suffix2" (Einträge mit
 * führendem Punkt gelten als Domain-Suffix).
 */
const DEFAULT_REDIRECT_HOSTS = ["claude.ai"];
const DEFAULT_REDIRECT_SUFFIXES = [".consent.azure-apim.net"];

export function isAllowedRedirectHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  const extra = (process.env.MCP_ALLOWED_REDIRECT_HOSTS ?? "")
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
  const hosts = [...DEFAULT_REDIRECT_HOSTS, ...extra.filter((h) => !h.startsWith("."))];
  const suffixes = [...DEFAULT_REDIRECT_SUFFIXES, ...extra.filter((h) => h.startsWith("."))];
  return hosts.includes(host) || suffixes.some((s) => host.endsWith(s));
}

/**
 * Hosts, für die ein Client ohne Angabe von token_endpoint_auth_method als
 * Public Client (ohne Secret) registriert wird. Claude registriert sich laut
 * Anthropic-Doku als Public Client; Microsoft (Copilot Studio, M365 Copilot)
 * verlangt dagegen zwingend ein Client-Secret bei der Registrierung.
 */
export const PUBLIC_CLIENT_HOSTS = ["claude.ai"];
