/**
 * Minimaler Microsoft-Graph-Client für den nativen Teams-Gast-Flow.
 *
 * Ersetzt die bisher von n8n übernommenen Graph-Calls 1:1:
 *   1. POST /invitations                       → Gast einladen
 *   2. POST /groups/{id}/members/$ref          → in die M365-Gruppe (= Team) aufnehmen
 *
 * Auth: OAuth2 Client-Credentials (App-Only) – dieselbe Azure-App, die heute in
 * n8n hinterlegt ist. Es werden nur die drei Werte MS_GRAPH_* benötigt.
 */

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

/** true, wenn alle für den Native-Modus nötigen Env-Variablen gesetzt sind. */
export function isGraphConfigured(): boolean {
  return (
    !!process.env.MS_GRAPH_TENANT_ID &&
    !!process.env.MS_GRAPH_CLIENT_ID &&
    !!process.env.MS_GRAPH_CLIENT_SECRET
  );
}

// ─── Token-Cache (modul-lokal, ~1 h gültig) ──────────────────────────────────
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getGraphToken(): Promise<string> {
  // 60 s Puffer, damit ein Token nicht mitten im Call abläuft.
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token;
  }

  const tenant = process.env.MS_GRAPH_TENANT_ID;
  const clientId = process.env.MS_GRAPH_CLIENT_ID;
  const clientSecret = process.env.MS_GRAPH_CLIENT_SECRET;
  if (!tenant || !clientId || !clientSecret) {
    throw new Error(
      "Microsoft-Graph-Credentials fehlen (MS_GRAPH_TENANT_ID / MS_GRAPH_CLIENT_ID / MS_GRAPH_CLIENT_SECRET)."
    );
  }

  const res = await fetch(
    `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        scope: "https://graph.microsoft.com/.default",
        grant_type: "client_credentials",
      }),
    }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Graph-Token-Anfrage fehlgeschlagen (${res.status}): ${text}`);
  }

  const json = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    token: json.access_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  };
  return cachedToken.token;
}

/**
 * Lädt eine Person als Gast ein. Idempotent: Für eine bereits eingeladene
 * Adresse liefert Graph den bestehenden User zurück. Gibt die invitedUser-ID
 * (= directoryObject-ID) zurück.
 */
export async function inviteGuest(input: {
  email: string;
  displayName: string;
  redirectUrl: string;
}): Promise<string> {
  const token = await getGraphToken();
  const res = await fetch(`${GRAPH_BASE}/invitations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      invitedUserEmailAddress: input.email,
      invitedUserDisplayName: input.displayName,
      inviteRedirectUrl: input.redirectUrl,
      sendInvitationMessage: true,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Graph /invitations fehlgeschlagen (${res.status}): ${text}`);
  }

  const json = (await res.json()) as { invitedUser?: { id?: string } };
  const userId = json.invitedUser?.id;
  if (!userId) {
    throw new Error("Graph /invitations: invitedUser.id fehlt in der Antwort.");
  }
  return userId;
}

/**
 * Nimmt einen User in die M365-Gruppe (= Teams-Team) auf. Bewusst der
 * /groups/{id}/members-Endpoint und NICHT /teams/{id}/members: frisch eingeladene
 * Gäste sind noch kein Gruppen-Member und bekämen dort 403. Die Team-Mitgliedschaft
 * wird aus der Gruppe automatisch synchronisiert.
 *
 * 400/409 „bereits Mitglied" werden als Erfolg behandelt (idempotent) – ersetzt
 * das „Continue On Fail" des bisherigen n8n-Nodes.
 */
export async function addUserToGroup(input: {
  groupId: string;
  userId: string;
}): Promise<void> {
  const token = await getGraphToken();
  const res = await fetch(`${GRAPH_BASE}/groups/${input.groupId}/members/$ref`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      "@odata.id": `${GRAPH_BASE}/directoryObjects/${input.userId}`,
    }),
  });

  if (res.ok) return;

  // „One or more added object references already exist" → bereits Mitglied.
  if (res.status === 400 || res.status === 409) {
    const text = await res.text().catch(() => "");
    if (/already exist|added object references/i.test(text)) return;
    throw new Error(`Graph add-member fehlgeschlagen (${res.status}): ${text}`);
  }

  const text = await res.text().catch(() => "");
  throw new Error(`Graph add-member fehlgeschlagen (${res.status}): ${text}`);
}

/**
 * Komplette native Aufnahme: Gast einladen und in das Team (M365-Gruppe)
 * aufnehmen. Setzt KEINE DB-Felder – das übernimmt der Aufrufer (Dispatcher)
 * bzw. wird bei Test-Einladungen bewusst weggelassen.
 */
export async function inviteGuestToTeam(input: {
  email: string;
  displayName: string;
  teamsGroupId: string;
  redirectUrl: string;
}): Promise<void> {
  const userId = await inviteGuest({
    email: input.email,
    displayName: input.displayName,
    redirectUrl: input.redirectUrl,
  });
  await addUserToGroup({ groupId: input.teamsGroupId, userId });
}
