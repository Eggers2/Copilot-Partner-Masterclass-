import type { McpTool } from "./types";
import { leseTools } from "./lesen";
import { schreibTools } from "./schreiben";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const ALL_TOOLS: McpTool<any>[] = [...leseTools, ...schreibTools];

export function findTool(name: string) {
  return ALL_TOOLS.find((t) => t.name === name);
}

/** Werkzeuge, die mit den erteilten Scopes sichtbar sind. */
export function toolsForScopes(scopes: string[]) {
  return ALL_TOOLS.filter((t) => scopes.includes(t.scope));
}
