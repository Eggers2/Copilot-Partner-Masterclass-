import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

/**
 * Audit-Log für Tool-Aufrufe. Argumente werden gespeichert, damit im Admin
 * nachvollziehbar ist, was Claude gelesen oder geändert hat. Lange Texte
 * (z.B. Notizen) werden gekürzt.
 */
export async function logToolCall(entry: {
  tokenId: string | null;
  tool: string;
  args: unknown;
  ok: boolean;
  error?: string | null;
  durationMs: number;
}): Promise<void> {
  try {
    await prisma.mcpAuditLog.create({
      data: {
        tokenId: entry.tokenId,
        tool: entry.tool,
        args: truncateArgs(entry.args) as Prisma.InputJsonValue,
        ok: entry.ok,
        error: entry.error ? entry.error.slice(0, 1000) : null,
        durationMs: entry.durationMs,
      },
    });
  } catch (err) {
    console.error("[MCP] Audit-Log konnte nicht geschrieben werden:", err);
  }
}

function truncateArgs(args: unknown): unknown {
  if (args == null) return {};
  if (typeof args !== "object") return { wert: String(args).slice(0, 500) };
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(args as Record<string, unknown>)) {
    out[k] = typeof v === "string" && v.length > 500 ? `${v.slice(0, 500)}… (${v.length} Zeichen)` : v;
  }
  return out;
}

export async function listAuditLogs(limit = 100) {
  return prisma.mcpAuditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { token: { select: { id: true, client: { select: { name: true } } } } },
  });
}

export async function listConnections() {
  return prisma.mcpToken.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      client: { select: { name: true, clientId: true, redirectUris: true } },
      _count: { select: { auditLogs: true } },
    },
    take: 50,
  });
}
