import { prisma } from "@/lib/prisma";
import { randomSecret, sha256, verifyPkce } from "./crypto";
import {
  ACCESS_TOKEN_TTL_SEC,
  ALL_SCOPES,
  AUTH_CODE_TTL_SEC,
  REFRESH_TOKEN_TTL_SEC,
  SCOPE_READ,
  allowedRedirectHosts,
} from "./config";

/**
 * Minimaler OAuth-2.1-Autorisierungsserver für den MCP-Endpunkt.
 *
 * - Dynamic Client Registration (RFC 7591) mit strenger Redirect-URI-Prüfung
 * - Authorization Code + PKCE (S256, Pflicht), Codes sind 5 Minuten gültig und
 *   nur einmal einlösbar
 * - Access-Tokens 1 h, Refresh-Tokens 30 Tage mit Rotation; ein wiederverwendetes
 *   Refresh-Token widerruft die gesamte Verbindung (Diebstahl-Erkennung)
 * - In der Datenbank liegen nur SHA-256-Hashes
 */

export class OAuthError extends Error {
  constructor(
    public code:
      | "invalid_request"
      | "invalid_client"
      | "invalid_grant"
      | "invalid_scope"
      | "unauthorized_client"
      | "unsupported_grant_type"
      | "invalid_redirect_uri"
      | "invalid_client_metadata",
    message: string,
    public status = 400
  ) {
    super(message);
  }
}

// ─── Redirect-URIs ───────────────────────────────────────────────────────────

function parseUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function isLoopbackHost(host: string): boolean {
  return host === "localhost" || host === "127.0.0.1" || host === "[::1]";
}

/** Prüft eine Redirect-URI gegen die Allowlist (https auf erlaubten Hosts, http nur Loopback). */
export function isAllowedRedirectUri(uri: string): boolean {
  const url = parseUrl(uri);
  if (!url) return false;
  if (url.hash) return false;
  if (url.protocol === "http:") return isLoopbackHost(url.hostname);
  if (url.protocol !== "https:") return false;
  return allowedRedirectHosts().includes(url.hostname.toLowerCase());
}

/**
 * Vergleicht die angefragte Redirect-URI mit den registrierten. Für Loopback-
 * Adressen wird der Port ignoriert (RFC 8252 7.3, Claude Code nutzt einen
 * wechselnden Port), alles andere muss exakt übereinstimmen.
 */
export function redirectUriMatches(requested: string, registered: string[]): boolean {
  if (registered.includes(requested)) return true;
  const req = parseUrl(requested);
  if (!req || req.protocol !== "http:" || !isLoopbackHost(req.hostname)) return false;
  return registered.some((r) => {
    const reg = parseUrl(r);
    return (
      !!reg &&
      reg.protocol === "http:" &&
      isLoopbackHost(reg.hostname) &&
      reg.pathname === req.pathname
    );
  });
}

// ─── Scopes ──────────────────────────────────────────────────────────────────

export function parseScopes(raw: string | null | undefined): string[] {
  if (!raw) return [...ALL_SCOPES];
  const requested = raw.split(/\s+/).filter(Boolean);
  const known = requested.filter((s) => (ALL_SCOPES as readonly string[]).includes(s));
  if (known.length === 0) return [SCOPE_READ];
  if (!known.includes(SCOPE_READ)) known.unshift(SCOPE_READ);
  return known;
}

// ─── Client Registration ─────────────────────────────────────────────────────

export interface RegistrationInput {
  redirect_uris?: unknown;
  client_name?: unknown;
  token_endpoint_auth_method?: unknown;
  grant_types?: unknown;
}

export async function registerClient(input: RegistrationInput) {
  if (!Array.isArray(input.redirect_uris) || input.redirect_uris.length === 0) {
    throw new OAuthError("invalid_redirect_uri", "redirect_uris fehlt oder ist leer.");
  }
  const uris = input.redirect_uris.filter((u): u is string => typeof u === "string");
  if (uris.length !== input.redirect_uris.length || uris.length > 10) {
    throw new OAuthError("invalid_redirect_uri", "redirect_uris ist ungültig.");
  }
  for (const uri of uris) {
    if (!isAllowedRedirectUri(uri)) {
      throw new OAuthError(
        "invalid_redirect_uri",
        `Redirect-URI nicht erlaubt: ${uri}. Zugelassen sind claude.ai und Loopback-Adressen.`
      );
    }
  }
  if (
    input.token_endpoint_auth_method !== undefined &&
    input.token_endpoint_auth_method !== "none"
  ) {
    throw new OAuthError(
      "invalid_client_metadata",
      "Nur token_endpoint_auth_method=none (Public Client mit PKCE) wird unterstützt."
    );
  }
  const name =
    typeof input.client_name === "string" ? input.client_name.slice(0, 120) : null;

  return prisma.mcpClient.create({
    data: {
      clientId: randomSecret("mcpc_", 16),
      name,
      redirectUris: uris,
    },
  });
}

export async function getClientByClientId(clientId: string) {
  if (!clientId) return null;
  return prisma.mcpClient.findUnique({ where: { clientId } });
}

// ─── Authorization Codes ─────────────────────────────────────────────────────

export interface AuthorizeRequest {
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  scope: string[];
  state?: string;
}

/** Validiert die Parameter eines /authorize-Aufrufs. Wirft OAuthError bei Fehlern. */
export async function validateAuthorizeRequest(params: {
  response_type?: string | null;
  client_id?: string | null;
  redirect_uri?: string | null;
  code_challenge?: string | null;
  code_challenge_method?: string | null;
  scope?: string | null;
  state?: string | null;
}) {
  const client = await getClientByClientId(params.client_id ?? "");
  if (!client) {
    throw new OAuthError("invalid_client", "Unbekannter OAuth-Client. Bitte Verbindung in Claude neu anlegen.");
  }
  const redirectUri = params.redirect_uri ?? "";
  if (!redirectUri || !redirectUriMatches(redirectUri, client.redirectUris)) {
    throw new OAuthError("invalid_redirect_uri", "Die Redirect-URI passt nicht zur Registrierung.");
  }
  if (params.response_type !== "code") {
    throw new OAuthError("invalid_request", "Nur response_type=code wird unterstützt.");
  }
  if ((params.code_challenge_method ?? "S256") !== "S256") {
    throw new OAuthError("invalid_request", "Nur PKCE mit S256 wird unterstützt.");
  }
  const codeChallenge = params.code_challenge ?? "";
  if (!/^[A-Za-z0-9\-_]{43}$/.test(codeChallenge)) {
    throw new OAuthError("invalid_request", "code_challenge fehlt oder ist ungültig (PKCE ist Pflicht).");
  }
  return {
    client,
    request: {
      clientId: client.clientId,
      redirectUri,
      codeChallenge,
      codeChallengeMethod: "S256",
      scope: parseScopes(params.scope),
      state: params.state ?? undefined,
    } satisfies AuthorizeRequest,
  };
}

export async function issueAuthCode(clientDbId: string, req: AuthorizeRequest) {
  const code = randomSecret("mcpac_", 32);
  await prisma.mcpAuthCode.create({
    data: {
      codeHash: sha256(code),
      clientId: clientDbId,
      redirectUri: req.redirectUri,
      codeChallenge: req.codeChallenge,
      scope: req.scope.join(" "),
      expiresAt: new Date(Date.now() + AUTH_CODE_TTL_SEC * 1000),
    },
  });
  return code;
}

// ─── Tokens ──────────────────────────────────────────────────────────────────

export interface TokenResponse {
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
  refresh_token: string;
  scope: string;
}

function newTokenPair() {
  const accessToken = randomSecret("mcpat_", 32);
  const refreshToken = randomSecret("mcprt_", 32);
  return { accessToken, refreshToken };
}

export async function exchangeAuthCode(params: {
  code?: string | null;
  client_id?: string | null;
  redirect_uri?: string | null;
  code_verifier?: string | null;
}): Promise<TokenResponse> {
  const { code, client_id, redirect_uri, code_verifier } = params;
  if (!code || !client_id || !code_verifier) {
    throw new OAuthError("invalid_request", "code, client_id und code_verifier sind erforderlich.");
  }
  const client = await getClientByClientId(client_id);
  if (!client) throw new OAuthError("invalid_client", "Unbekannter Client.", 401);

  const record = await prisma.mcpAuthCode.findUnique({ where: { codeHash: sha256(code) } });
  if (!record || record.clientId !== client.id) {
    throw new OAuthError("invalid_grant", "Autorisierungscode ungültig.");
  }
  if (record.usedAt) {
    // Wiederverwendung eines Codes: alle Tokens dieses Clients widerrufen.
    await prisma.mcpToken.updateMany({
      where: { clientId: client.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    throw new OAuthError("invalid_grant", "Autorisierungscode wurde bereits verwendet.");
  }
  if (record.expiresAt.getTime() < Date.now()) {
    throw new OAuthError("invalid_grant", "Autorisierungscode abgelaufen.");
  }
  if (redirect_uri && redirect_uri !== record.redirectUri) {
    throw new OAuthError("invalid_grant", "redirect_uri stimmt nicht mit der Anfrage überein.");
  }
  if (!verifyPkce(code_verifier, record.codeChallenge)) {
    throw new OAuthError("invalid_grant", "PKCE-Prüfung fehlgeschlagen.");
  }

  const { accessToken, refreshToken } = newTokenPair();
  const now = Date.now();
  await prisma.$transaction([
    prisma.mcpAuthCode.update({ where: { id: record.id }, data: { usedAt: new Date(now) } }),
    prisma.mcpToken.create({
      data: {
        clientId: client.id,
        accessTokenHash: sha256(accessToken),
        refreshTokenHash: sha256(refreshToken),
        scope: record.scope,
        accessExpiresAt: new Date(now + ACCESS_TOKEN_TTL_SEC * 1000),
        refreshExpiresAt: new Date(now + REFRESH_TOKEN_TTL_SEC * 1000),
      },
    }),
  ]);

  return {
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: ACCESS_TOKEN_TTL_SEC,
    refresh_token: refreshToken,
    scope: record.scope,
  };
}

export async function refreshTokens(params: {
  refresh_token?: string | null;
  client_id?: string | null;
  scope?: string | null;
}): Promise<TokenResponse> {
  const { refresh_token, client_id } = params;
  if (!refresh_token) throw new OAuthError("invalid_request", "refresh_token fehlt.");

  const record = await prisma.mcpToken.findUnique({
    where: { refreshTokenHash: sha256(refresh_token) },
    include: { client: true },
  });
  if (!record) throw new OAuthError("invalid_grant", "Refresh-Token ungültig.");
  if (client_id && record.client.clientId !== client_id) {
    throw new OAuthError("invalid_grant", "Refresh-Token gehört zu einem anderen Client.");
  }
  if (record.revokedAt) throw new OAuthError("invalid_grant", "Verbindung wurde getrennt.");
  if (record.refreshExpiresAt.getTime() < Date.now()) {
    throw new OAuthError("invalid_grant", "Refresh-Token abgelaufen. Bitte neu verbinden.");
  }

  // Scope darf beim Refresh nur eingeschränkt, nie erweitert werden.
  const granted = record.scope.split(" ");
  const requested = params.scope ? parseScopes(params.scope) : granted;
  const scope = requested.filter((s) => granted.includes(s));
  if (scope.length === 0) throw new OAuthError("invalid_scope", "Angeforderter Scope nicht erlaubt.");

  const { accessToken, refreshToken } = newTokenPair();
  const now = Date.now();
  // Rotation: alte Hashes werden ersetzt, das bisherige Refresh-Token ist damit wertlos.
  await prisma.mcpToken.update({
    where: { id: record.id },
    data: {
      accessTokenHash: sha256(accessToken),
      refreshTokenHash: sha256(refreshToken),
      scope: scope.join(" "),
      accessExpiresAt: new Date(now + ACCESS_TOKEN_TTL_SEC * 1000),
      refreshExpiresAt: new Date(now + REFRESH_TOKEN_TTL_SEC * 1000),
    },
  });

  return {
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: ACCESS_TOKEN_TTL_SEC,
    refresh_token: refreshToken,
    scope: scope.join(" "),
  };
}

/** Widerruft ein Token anhand von Access- oder Refresh-Token (RFC 7009). Idempotent. */
export async function revokeByTokenValue(token: string): Promise<void> {
  const hash = sha256(token);
  await prisma.mcpToken.updateMany({
    where: {
      OR: [{ accessTokenHash: hash }, { refreshTokenHash: hash }],
      revokedAt: null,
    },
    data: { revokedAt: new Date() },
  });
}

export async function revokeTokenById(id: string): Promise<void> {
  await prisma.mcpToken.updateMany({
    where: { id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function revokeAllTokens(): Promise<number> {
  const res = await prisma.mcpToken.updateMany({
    where: { revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return res.count;
}

// ─── Access-Token-Prüfung ────────────────────────────────────────────────────

export interface AuthContext {
  tokenId: string;
  clientName: string | null;
  scopes: string[];
}

export function extractBearer(req: Request): string | null {
  const header = req.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1].trim() : null;
}

/** Liefert den Auth-Kontext für ein gültiges Access-Token oder null. */
export async function authenticateAccessToken(token: string | null): Promise<AuthContext | null> {
  if (!token || !token.startsWith("mcpat_")) return null;
  const record = await prisma.mcpToken.findUnique({
    where: { accessTokenHash: sha256(token) },
    include: { client: { select: { name: true } } },
  });
  if (!record || record.revokedAt) return null;
  if (record.accessExpiresAt.getTime() < Date.now()) return null;

  // lastUsedAt höchstens einmal pro Minute schreiben, um die DB zu entlasten.
  if (!record.lastUsedAt || Date.now() - record.lastUsedAt.getTime() > 60_000) {
    prisma.mcpToken
      .update({ where: { id: record.id }, data: { lastUsedAt: new Date() } })
      .catch(() => undefined);
  }

  return {
    tokenId: record.id,
    clientName: record.client.name,
    scopes: record.scope.split(" ").filter(Boolean),
  };
}

/** Aufräumen: abgelaufene Codes und Tokens löschen (wird gelegentlich vom Endpunkt angestoßen). */
export async function cleanupExpired(): Promise<void> {
  const now = new Date();
  await prisma.$transaction([
    prisma.mcpAuthCode.deleteMany({ where: { expiresAt: { lt: now } } }),
    prisma.mcpToken.deleteMany({
      where: {
        OR: [
          { refreshExpiresAt: { lt: now } },
          { revokedAt: { lt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) } },
        ],
      },
    }),
  ]);
}
