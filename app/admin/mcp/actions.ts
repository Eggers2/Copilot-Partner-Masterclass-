"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { SCOPE_READ, SCOPE_WRITE } from "@/lib/mcp/config";
import {
  issueAuthCode,
  OAuthError,
  revokeAllTokens,
  revokeTokenById,
  validateAuthorizeRequest,
} from "@/lib/mcp/oauth";

/**
 * Entscheidung auf der OAuth-Freigabeseite. Die Parameter werden hier erneut
 * validiert, damit ein manipuliertes Formular keinen Code für eine fremde
 * Redirect-URI erzeugen kann.
 */
export async function decideMcpAuthorizationAction(formData: FormData): Promise<void> {
  await requireAuth();

  const str = (key: string) => {
    const v = formData.get(key);
    return typeof v === "string" && v.length > 0 ? v : null;
  };

  let redirectUrl: URL;
  try {
    const { client, request } = await validateAuthorizeRequest({
      response_type: str("response_type"),
      client_id: str("client_id"),
      redirect_uri: str("redirect_uri"),
      code_challenge: str("code_challenge"),
      code_challenge_method: str("code_challenge_method"),
      scope: str("scope"),
      state: str("state"),
    });

    redirectUrl = new URL(request.redirectUri);
    if (request.state) redirectUrl.searchParams.set("state", request.state);

    if (formData.get("entscheidung") !== "erlauben") {
      redirectUrl.searchParams.set("error", "access_denied");
      redirectUrl.searchParams.set("error_description", "Zugriff im Admin abgelehnt.");
    } else {
      // Schreibzugriff nur, wenn angefragt UND im Formular bestätigt.
      const scopes = [SCOPE_READ];
      if (request.scope.includes(SCOPE_WRITE) && formData.get("schreiben") === "on") {
        scopes.push(SCOPE_WRITE);
      }
      const code = await issueAuthCode(client.id, { ...request, scope: scopes });
      redirectUrl.searchParams.set("code", code);
    }
  } catch (e) {
    if (e instanceof OAuthError) {
      redirect(`/admin/mcp/authorize?fehler=${encodeURIComponent(e.message)}`);
    }
    throw e;
  }

  redirect(redirectUrl.toString());
}

export async function revokeMcpTokenAction(formData: FormData): Promise<void> {
  await requireAuth();
  const id = formData.get("id");
  if (typeof id === "string" && id) {
    await revokeTokenById(id);
  }
  revalidatePath("/admin/mcp");
}

export async function revokeAllMcpTokensAction(): Promise<void> {
  await requireAuth();
  await revokeAllTokens();
  revalidatePath("/admin/mcp");
}
