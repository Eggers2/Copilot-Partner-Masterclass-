import { z } from "zod";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  MCP_PROTOCOL_VERSIONS,
  MCP_SERVER_NAME,
  MCP_SERVER_VERSION,
  RATE_LIMIT_PER_MINUTE,
  SCOPE_WRITE,
} from "./config";
import type { AuthContext } from "./oauth";
import { findTool, toolsForScopes } from "./tools";
import { ToolError, toJsonSchema } from "./tools/types";
import { logToolCall } from "./audit";

/**
 * Zustandsloser MCP-Server (Streamable HTTP, JSON-Antworten). Implementiert
 * die Methoden initialize, ping, tools/list und tools/call. Es gibt keine
 * Sessions und keinen SSE-Stream, was für Claude vollkommen ausreicht und die
 * Angriffsfläche klein hält.
 */

type JsonRpcId = string | number | null;

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: JsonRpcId;
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: JsonRpcId;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

const PARSE_ERROR = -32700;
const INVALID_REQUEST = -32600;
const METHOD_NOT_FOUND = -32601;
const INVALID_PARAMS = -32602;
const INTERNAL_ERROR = -32603;

const SERVER_INSTRUCTIONS = `Du arbeitest mit dem CRM der Copilot Partner Masterclass (NextSkills GmbH).
Datenmodell: Leads (Warteliste/Interessenten/Kunden, Tabelle mit Status NEW, CONTACTED, QUALIFIED, PROPOSAL, WON, LOST, WAITLIST, WEBINAR_ATTENDED, FOLLOW_UP, EXPERTE, ONE_MAN_SHOW), Bestellungen aus dem Online-Shop (Status neu, bearbeitet, abgeschlossen), Webinare mit Anmeldungen sowie Klassen (Kohorten der Masterclass).
Zeitstempel sind ISO-8601 in UTC; Nutzer sitzen in Deutschland (Europe/Berlin). Geldbeträge sind Euro.
Vor Änderungen den aktuellen Stand per lead_details lesen. Schreibaktionen erzeugen sichtbare Aktivitäten in der Lead-Timeline und werden protokolliert. Es gibt bewusst kein Löschen.`;

function err(id: JsonRpcId, code: number, message: string, data?: unknown): JsonRpcResponse {
  return { jsonrpc: "2.0", id, error: { code, message, ...(data !== undefined ? { data } : {}) } };
}

function ok(id: JsonRpcId, result: unknown): JsonRpcResponse {
  return { jsonrpc: "2.0", id, result };
}

function isRequest(value: unknown): value is JsonRpcRequest {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as JsonRpcRequest).jsonrpc === "2.0" &&
    typeof (value as JsonRpcRequest).method === "string"
  );
}

export interface HandleResult {
  status: number;
  body: JsonRpcResponse | JsonRpcResponse[] | null;
}

/** Verarbeitet einen HTTP-Body (einzelne Nachricht oder Batch). */
export async function handleJsonRpcBody(rawBody: string, auth: AuthContext): Promise<HandleResult> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return { status: 400, body: err(null, PARSE_ERROR, "Ungültiges JSON.") };
  }

  const messages = Array.isArray(parsed) ? parsed : [parsed];
  if (messages.length === 0) {
    return { status: 400, body: err(null, INVALID_REQUEST, "Leerer Batch.") };
  }

  const responses: JsonRpcResponse[] = [];
  for (const msg of messages) {
    if (!isRequest(msg)) {
      responses.push(err(null, INVALID_REQUEST, "Keine gültige JSON-RPC-2.0-Nachricht."));
      continue;
    }
    // Notifications (ohne id) erwarten keine Antwort.
    if (msg.id === undefined) {
      continue;
    }
    responses.push(await handleRequest(msg, auth));
  }

  if (responses.length === 0) return { status: 202, body: null };
  return { status: 200, body: Array.isArray(parsed) ? responses : responses[0] };
}

async function handleRequest(req: JsonRpcRequest, auth: AuthContext): Promise<JsonRpcResponse> {
  const id = req.id ?? null;
  const params = req.params ?? {};

  switch (req.method) {
    case "initialize": {
      const requested = typeof params.protocolVersion === "string" ? params.protocolVersion : "";
      const protocolVersion = (MCP_PROTOCOL_VERSIONS as readonly string[]).includes(requested)
        ? requested
        : MCP_PROTOCOL_VERSIONS[0];
      return ok(id, {
        protocolVersion,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: MCP_SERVER_NAME, title: "Copilot Masterclass CRM", version: MCP_SERVER_VERSION },
        instructions: SERVER_INSTRUCTIONS,
      });
    }

    case "ping":
      return ok(id, {});

    case "tools/list": {
      const tools = toolsForScopes(auth.scopes).map((t) => ({
        name: t.name,
        title: t.title,
        description: t.description,
        inputSchema: toJsonSchema(t.schema),
        annotations: {
          title: t.title,
          readOnlyHint: t.scope !== SCOPE_WRITE,
          destructiveHint: false,
          idempotentHint: t.scope !== SCOPE_WRITE,
          openWorldHint: false,
        },
      }));
      return ok(id, { tools });
    }

    case "tools/call":
      return handleToolCall(id, params, auth);

    // Ressourcen und Prompts werden nicht angeboten; leere Listen statt Fehler,
    // falls ein Client sie trotzdem anfragt.
    case "resources/list":
      return ok(id, { resources: [] });
    case "prompts/list":
      return ok(id, { prompts: [] });

    default:
      return err(id, METHOD_NOT_FOUND, `Methode nicht unterstützt: ${req.method}`);
  }
}

async function handleToolCall(
  id: JsonRpcId,
  params: Record<string, unknown>,
  auth: AuthContext
): Promise<JsonRpcResponse> {
  const name = typeof params.name === "string" ? params.name : "";
  const tool = findTool(name);
  if (!tool) return err(id, INVALID_PARAMS, `Unbekanntes Werkzeug: ${name}`);

  if (!auth.scopes.includes(tool.scope)) {
    return ok(id, toolResult({ fehler: `Für ${name} fehlt die Berechtigung ${tool.scope}. Verbindung in Claude mit Schreibzugriff neu autorisieren.` }, true));
  }

  if (!checkRateLimit(`mcp:${auth.tokenId}`, RATE_LIMIT_PER_MINUTE, 60_000)) {
    return ok(id, toolResult({ fehler: "Zu viele Anfragen. Bitte kurz warten." }, true));
  }

  const rawArgs = params.arguments ?? {};
  const started = Date.now();
  const parsedArgs = tool.schema.safeParse(rawArgs);
  if (!parsedArgs.success) {
    const message = z.prettifyError(parsedArgs.error);
    await logToolCall({
      tokenId: auth.tokenId,
      tool: name,
      args: rawArgs,
      ok: false,
      error: `Ungültige Argumente: ${message}`,
      durationMs: Date.now() - started,
    });
    return ok(id, toolResult({ fehler: "Ungültige Argumente", details: message }, true));
  }

  try {
    const result = await tool.handler(parsedArgs.data);
    await logToolCall({
      tokenId: auth.tokenId,
      tool: name,
      args: parsedArgs.data,
      ok: true,
      durationMs: Date.now() - started,
    });
    return ok(id, toolResult(result, false));
  } catch (e) {
    const isToolError = e instanceof ToolError;
    const message = e instanceof Error ? e.message : String(e);
    await logToolCall({
      tokenId: auth.tokenId,
      tool: name,
      args: parsedArgs.data,
      ok: false,
      error: message,
      durationMs: Date.now() - started,
    });
    if (!isToolError) console.error(`[MCP] Fehler in ${name}:`, e);
    return ok(
      id,
      toolResult(
        { fehler: isToolError ? message : "Interner Fehler beim Ausführen des Werkzeugs." },
        true
      )
    );
  }
}

function toolResult(payload: unknown, isError: boolean) {
  const text = JSON.stringify(payload, null, 2);
  return {
    content: [{ type: "text", text }],
    ...(typeof payload === "object" && payload !== null && !Array.isArray(payload)
      ? { structuredContent: payload }
      : {}),
    isError,
  };
}

export function internalError(id: JsonRpcId, message: string): JsonRpcResponse {
  return err(id, INTERNAL_ERROR, message);
}
