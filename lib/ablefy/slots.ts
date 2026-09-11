import type { AblefyState } from "@prisma/client";

/**
 * Ablefy-Zustand eines Teilnehmerplatzes, wie er beim Speichern der
 * Teilnehmerliste mitgeschrieben wird.
 */
export interface AblefySlotData {
  ablefyState: AblefyState;
  ablefyOrderId: string | null;
  ablefyOrderToken: string | null;
  ablefyEmail: string | null;
  ablefyEingebuchtAm: Date | null;
  ablefyVersuchAm: Date | null;
  ablefyFehler: string | null;
}

export interface AblefySlotBestand extends AblefySlotData {
  email: string;
}

export interface AblefyRevokeTarget {
  orderId: string | null;
  orderToken: string | null;
  email: string;
}

const LEER: AblefySlotData = {
  ablefyState: "OFFEN",
  ablefyOrderId: null,
  ablefyOrderToken: null,
  ablefyEmail: null,
  ablefyEingebuchtAm: null,
  ablefyVersuchAm: null,
  ablefyFehler: null,
};

/**
 * Ordnet die bestehenden Ablefy-Bestellungen den neuen Teilnehmerzeilen zu und
 * sagt, welche Zugänge dabei herrenlos werden.
 *
 * Der Zustand hängt an der E-Mail, nicht an der Position: wird eine leere Zeile
 * entfernt, rücken im Formular alle folgenden Teilnehmer eine Position nach
 * oben. Bliebe die Bestellung an der Position kleben, würde dieselbe Person ein
 * zweites Mal eingebucht – Ablefy hat keine Idempotenz, jeder POST erzeugt eine
 * neue Bestellung.
 *
 * @param bestand   Teilnehmerplätze, wie sie vor dem Speichern in der DB stehen
 * @param neueMails Die E-Mails nach dem Speichern (leere Einträge erlaubt)
 */
export function planAblefySlots(
  bestand: AblefySlotBestand[],
  neueMails: string[]
): {
  /** Ablefy-Felder, die für diese E-Mail geschrieben werden sollen. */
  datenFuer: (email: string) => AblefySlotData;
  /** Zugänge, die nach dem Speichern zu keiner Zeile mehr gehören. */
  entzuege: AblefyRevokeTarget[];
} {
  // Nur die Ablefy-Felder übernehmen: der Bestand kommt aus einem Prisma-Select
  // und trägt auch position und email mit, die beim Schreiben aus der
  // Formulareingabe stammen müssen.
  const bekannt = new Map<string, AblefySlotData>();
  for (const slot of bestand) {
    if (!slot.email) continue;
    bekannt.set(slot.email, {
      ablefyState: slot.ablefyState,
      ablefyOrderId: slot.ablefyOrderId,
      ablefyOrderToken: slot.ablefyOrderToken,
      ablefyEmail: slot.ablefyEmail,
      ablefyEingebuchtAm: slot.ablefyEingebuchtAm,
      ablefyVersuchAm: slot.ablefyVersuchAm,
      ablefyFehler: slot.ablefyFehler,
    });
  }

  const behalten = new Set(neueMails.filter(Boolean));
  const entzuege: AblefyRevokeTarget[] = [];
  for (const [email, daten] of bekannt) {
    if (behalten.has(email)) continue;
    if (!daten.ablefyOrderId && !daten.ablefyOrderToken) continue;
    entzuege.push({
      orderId: daten.ablefyOrderId,
      orderToken: daten.ablefyOrderToken,
      email: daten.ablefyEmail ?? email,
    });
  }

  return {
    datenFuer: (email: string) =>
      (email ? bekannt.get(email) : undefined) ?? { ...LEER },
    entzuege,
  };
}

/**
 * Findet die erste E-Mail, die in der Teilnehmerliste doppelt vorkommt.
 *
 * Zwei Plätze auf dieselbe Adresse zu buchen ergibt fachlich keinen Sinn und
 * würde zwei Ablefy-Bestellungen für dieselbe Person erzeugen. Die Einbuchung
 * hängt deshalb daran, dass jede Adresse nur einmal vorkommt.
 */
export function findeDoppelteMail(mails: string[]): string | null {
  const gesehen = new Set<string>();
  for (const mail of mails) {
    const normalisiert = mail.trim().toLowerCase();
    if (!normalisiert) continue;
    if (gesehen.has(normalisiert)) return normalisiert;
    gesehen.add(normalisiert);
  }
  return null;
}
