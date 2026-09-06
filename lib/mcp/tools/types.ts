import { z } from "zod";
import { SCOPE_READ, SCOPE_WRITE } from "../config";

export type McpScope = typeof SCOPE_READ | typeof SCOPE_WRITE;

export interface McpTool<S extends z.ZodObject = z.ZodObject> {
  name: string;
  title: string;
  description: string;
  scope: McpScope;
  schema: S;
  handler: (args: z.infer<S>) => Promise<unknown>;
}

/** Hilfsfunktion, damit TypeScript den Argument-Typ des Handlers aus dem Schema ableitet. */
export function defineTool<S extends z.ZodObject>(tool: McpTool<S>): McpTool<S> {
  return tool;
}

/** Fehler, den der Handler bewusst an Claude zurückgibt (kein Server-Fehler). */
export class ToolError extends Error {}

export function toJsonSchema(schema: z.ZodObject): Record<string, unknown> {
  const json = z.toJSONSchema(schema, { target: "draft-2020-12", io: "input" }) as Record<
    string,
    unknown
  >;
  delete json.$schema;
  return json;
}
