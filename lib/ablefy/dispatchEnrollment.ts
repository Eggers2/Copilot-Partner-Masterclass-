import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  cancelOrder,
  createOrder,
  fetchOrderToken,
  getAblefyProductId,
  isAblefyCancelEnabled,
  isAblefyConfigured,
  isAblefyDryRun,
} from "@/lib/ablefy/client";

/**
 * Bucht Teilnehmerplätze als kostenlose Ablefy-Bestellung auf den Kurs.
 *
 * Aufgerufen nach jedem Speichern einer Teilnehmerliste (Admin und
 * Kundenportal). Gebucht wird jeder Platz, der eine E-Mail trägt und noch nicht
 * mit genau dieser Adresse eingebucht ist – neue Plätze also ebenso wie
 * umbenannte. Ablefy verschickt die Zugangsmail selbst.
 *
 * Die Arbeit läuft in `after()`, das Speichern wartet nicht darauf. Ein
 * Fehlschlag bleibt als AblefyState.FEHLER am Platz stehen und wird beim
 * nächsten Speichern automatisch erneut versucht.
 */

/** Ein IN_ARBEIT-Claim, der älter ist, gilt als verwaist (Deploy, Crash). */
const CLAIM_STALE_MS = 10 * 60 * 1000;

interface Kandidat {
  id: number;
  vorname: string;
  nachname: string;
  email: string;
  ablefyOrderId: string | null;
  ablefyOrderToken: string | null;
  ablefyEmail: string | null;
}

export async function dispatchAblefyEnrollments(input: {
  bestellungId: number;
}): Promise<void> {
  if (!isAblefyConfigured() && !isAblefyDryRun()) return;

  const productId = getAblefyProductId();
  if (!productId) {
    console.error(
      "[Ablefy] Keine ABLEFY_PRODUCT_ID gesetzt – es wird niemand in den Kurs eingebucht."
    );
    return;
  }

  const teilnehmer = await prisma.bestellungTeilnehmer.findMany({
    where: { bestellungId: input.bestellungId, NOT: { email: "" } },
    select: {
      id: true,
      vorname: true,
      nachname: true,
      email: true,
      ablefyState: true,
      ablefyOrderId: true,
      ablefyOrderToken: true,
      ablefyEmail: true,
      ablefyVersuchAm: true,
    },
  });

  const staleBefore = Date.now() - CLAIM_STALE_MS;
  // Fällig ist ein Platz, der noch nie eingebucht wurde, dessen Einbuchung
  // fehlschlug, oder dessen E-Mail sich seit der Einbuchung geändert hat. Ein
  // frischer IN_ARBEIT-Claim bedeutet, dass gerade ein anderer Lauf daran
  // arbeitet – Ablefy hat keine Idempotenz, ein zweiter POST erzeugt eine
  // zweite Bestellung.
  const kandidaten: Kandidat[] = teilnehmer.filter((t) => {
    if (
      t.ablefyState === "IN_ARBEIT" &&
      t.ablefyVersuchAm &&
      t.ablefyVersuchAm.getTime() > staleBefore
    ) {
      return false;
    }
    if (t.ablefyState === "PROVISIONIERT" && t.ablefyEmail === t.email) return false;
    return true;
  });

  if (kandidaten.length === 0) return;

  after(async () => {
    for (const t of kandidaten) {
      try {
        await enrollOne(t, productId, staleBefore);
      } catch (err) {
        console.error(`[Ablefy] Einbuchung für ${t.email} fehlgeschlagen:`, err);
        await markError(
          t.id,
          err instanceof Error ? err.message : String(err)
        ).catch(() => {});
      }
    }
  });
}

async function enrollOne(
  t: Kandidat,
  productId: string,
  staleBefore: number
): Promise<void> {
  // Claim: nur wer den Datensatz auf IN_ARBEIT setzen konnte, darf den Call
  // senden. Die E-Mail ist Teil der Bedingung, damit ein zwischenzeitlich
  // umbenannter Platz nicht mit der veralteten Adresse gebucht wird.
  const claim = await prisma.bestellungTeilnehmer.updateMany({
    where: {
      id: t.id,
      email: t.email,
      OR: [
        { ablefyState: { not: "IN_ARBEIT" } },
        { ablefyVersuchAm: null },
        { ablefyVersuchAm: { lt: new Date(staleBefore) } },
      ],
    },
    data: { ablefyState: "IN_ARBEIT", ablefyVersuchAm: new Date() },
  });
  if (claim.count === 0) {
    console.log(`[Ablefy] ${t.email}: übersprungen, anderer Lauf ist dran.`);
    return;
  }

  // Platz war auf eine andere Adresse gebucht: alten Zugang entziehen, bevor
  // die neue Bestellung entsteht. Best-effort – ohne ABLEFY_CANCEL_ENABLED
  // passiert hier nichts außer einem Logeintrag, und ein fehlgeschlagener
  // Entzug darf die neue Einbuchung nicht verhindern.
  let stornoHinweis: string | null = null;
  if (t.ablefyOrderId && t.ablefyEmail && t.ablefyEmail !== t.email) {
    const entzug = await revokeOne({
      orderId: t.ablefyOrderId,
      orderToken: t.ablefyOrderToken,
      email: t.ablefyEmail,
    });
    if (!entzug.ok) stornoHinweis = entzug.error;
  }

  const result = await createOrder({
    email: t.email,
    firstName: t.vorname,
    lastName: t.nachname,
    productId,
  });

  if (result.ok && result.orderId) {
    await prisma.bestellungTeilnehmer.update({
      where: { id: t.id },
      data: {
        ablefyState: "PROVISIONIERT",
        ablefyOrderId: result.orderId,
        ablefyOrderToken: result.orderToken,
        ablefyEmail: t.email,
        ablefyEingebuchtAm: new Date(),
        // Ein misslungener Entzug des Vorgängers bleibt als Hinweis stehen,
        // auch wenn die neue Einbuchung geklappt hat: der alte Zugang läuft
        // dann weiter und muss im Ablefy-Backend storniert werden.
        ablefyFehler: stornoHinweis,
      },
    });
    console.log(
      `[Ablefy] ${t.email} auf Kurs ${productId} eingebucht (Bestellung ${result.orderId}` +
        `${result.dryRun ? ", DRY_RUN" : ""}).`
    );
    return;
  }

  // Erfolgreicher Call ohne Bestell-ID: der Zugang existiert vermutlich, ist
  // über die API aber nie wieder ansprechbar.
  const message = result.idMissing
    ? "Ablefy hat die Bestellung angenommen, aber keine order_id zurückgegeben. Der Zugang " +
      "existiert vermutlich, ein späterer Entzug ist nur manuell im Ablefy-Backend möglich."
    : (result.error ?? "Ablefy hat die Einbuchung ohne Begründung abgelehnt.");

  await markError(t.id, [stornoHinweis, message].filter(Boolean).join(" | "));
  console.error(`[Ablefy] Einbuchung für ${t.email} fehlgeschlagen: ${message}`);
}

async function markError(teilnehmerId: number, message: string): Promise<void> {
  await prisma.bestellungTeilnehmer.update({
    where: { id: teilnehmerId },
    data: { ablefyState: "FEHLER", ablefyFehler: message.slice(0, 1000) },
  });
}

interface RevokeTarget {
  orderId: string | null;
  orderToken: string | null;
  email: string;
}

/**
 * Entzieht einen einzelnen Kurszugang. Fehlt der Token, wird er über
 * GET /api/orders/{id} nachgeholt – ohne ihn quittiert Ablefy den Storno, ohne
 * etwas zu entziehen.
 */
async function revokeOne(
  target: RevokeTarget
): Promise<{ ok: boolean; error: string | null }> {
  if (!target.orderId && !target.orderToken) {
    return { ok: false, error: null };
  }
  if (!isAblefyCancelEnabled() && !isAblefyDryRun()) {
    console.warn(
      `[Ablefy] Zugang von ${target.email} (Bestellung ${target.orderId}) bleibt bestehen: ` +
        "ABLEFY_CANCEL_ENABLED ist nicht gesetzt. Bitte manuell im Ablefy-Backend stornieren."
    );
    return {
      ok: false,
      error:
        `Der alte Zugang von ${target.email} (Ablefy-Bestellung ${target.orderId}) wurde nicht ` +
        "entzogen – der automatische Storno ist deaktiviert. Bitte im Ablefy-Backend stornieren.",
    };
  }

  let token = target.orderToken;
  if (!token && target.orderId) {
    token = await fetchOrderToken(target.orderId);
  }

  const result = await cancelOrder({ orderId: target.orderId, orderToken: token });
  if (result.ok) {
    console.log(`[Ablefy] Zugang von ${target.email} entzogen (${target.orderId}).`);
    return { ok: true, error: null };
  }
  console.error(
    `[Ablefy] Entzug für ${target.email} (${target.orderId}) fehlgeschlagen: ${result.error}`
  );
  return {
    ok: false,
    error:
      `Der alte Zugang von ${target.email} (Ablefy-Bestellung ${target.orderId}) konnte nicht ` +
      `entzogen werden: ${result.error}`,
  };
}

/**
 * Entzieht die Kurszugänge entfernter Teilnehmerplätze.
 *
 * Wird vor dem Löschen der Plätze mit deren Ablefy-Daten aufgerufen, weil die
 * Bestell-ID mit dem Datensatz verschwindet und sich bei Ablefy nicht wieder
 * ermitteln lässt. Best-effort: läuft in `after()` und blockiert das Speichern
 * nicht.
 */
export function dispatchAblefyRevocations(targets: RevokeTarget[]): void {
  const offen = targets.filter((t) => t.orderId || t.orderToken);
  if (offen.length === 0) return;
  if (!isAblefyConfigured() && !isAblefyDryRun()) return;

  after(async () => {
    for (const target of offen) {
      try {
        await revokeOne(target);
      } catch (err) {
        console.error(`[Ablefy] Entzug für ${target.email} fehlgeschlagen:`, err);
      }
    }
  });
}
