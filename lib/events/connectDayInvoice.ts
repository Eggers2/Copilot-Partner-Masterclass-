import { prisma } from "@/lib/prisma";
import {
  createInvoice,
  ensureContact,
  getInvoice,
  getInvoicePdf,
  getSevdeskMode,
  markInvoiceSent,
  renderInvoice,
  sendInvoiceByEmail,
  SevdeskError,
} from "@/lib/sevdesk";
import { sendConnectDayInvoiceEmail } from "@/lib/email/sendConnectDay";

/** Zahlungsziel in Tagen – steht auf der Rechnung und in der Rechnungs-Mail. */
const ZAHLUNGSZIEL_TAGE = 14;

/**
 * Erstellt und versendet die sevDesk-Rechnung zu einer Event-Anmeldung.
 *
 * IDEMPOTENT: bereits erledigte Schritte (Kontakt/Rechnung vorhanden,
 * Rechnung versendet) werden übersprungen – dieselbe Funktion dient daher
 * als Erstversand nach der Anmeldung UND als Admin-Retry nach Fehlern.
 *
 * WIRFT NIE: Jeder Fehler landet als invoiceStatus=FAILED + invoiceError an
 * der Anmeldung. Eine Anmeldung geht durch einen sevDesk-Ausfall nie
 * verloren und kostet keinen reservierten Platz.
 *
 * USt-Hinweis: Präsenzveranstaltung in Frankfurt → Veranstaltungsort-Prinzip
 * (§ 3a UStG), voraussichtlich 19 % auch für AT/CH-Partner. Der Steuerfall
 * wird hier zentral aus dem Preis-Snapshot abgeleitet; soll pauschal 19 %
 * gelten, `taxCase` unten fest auf "default" setzen (Ein-Zeilen-Änderung,
 * nach Rücksprache mit dem Steuerberater).
 */
export async function createAndSendConnectDayInvoice(
  registrationId: string
): Promise<void> {
  let step = "laden";
  try {
    const registration = await prisma.eventRegistration.findUnique({
      where: { id: registrationId },
      include: {
        event: true,
        bestellung: true,
        teilnehmer: { orderBy: { position: "asc" } },
      },
    });
    if (!registration || registration.status !== "CONFIRMED") return;
    if (registration.invoiceStatus === "SENT") return;

    if (getSevdeskMode() === "off") {
      await prisma.eventRegistration.update({
        where: { id: registrationId },
        data: {
          invoiceStatus: "FAILED",
          invoiceError:
            "sevDesk ist nicht konfiguriert (SEVDESK_API_KEY/SEVDESK_MODE setzen), Rechnung im Admin erneut anstoßen.",
        },
      });
      return;
    }

    const { bestellung, event } = registration;

    // 1. Kontakt sicherstellen (Cache auf der Bestellung)
    step = "Kontakt anlegen";
    let contactId = registration.sevdeskContactId ?? bestellung.sevdeskContactId;
    if (!contactId) {
      contactId = await ensureContact({
        firma: bestellung.firma,
        strasse: bestellung.strasse,
        plz: bestellung.plz,
        ort: bestellung.ort,
        land: bestellung.land,
        ustId: bestellung.ustId,
        email: bestellung.email,
      });
      await prisma.bestellung.update({
        where: { id: bestellung.id },
        data: { sevdeskContactId: contactId },
      });
    }
    if (registration.sevdeskContactId !== contactId) {
      await prisma.eventRegistration.update({
        where: { id: registrationId },
        data: { sevdeskContactId: contactId },
      });
    }

    // 2. Rechnung erstellen (überspringen, wenn schon vorhanden)
    step = "Rechnung erstellen";
    let invoiceId = registration.sevdeskInvoiceId;
    if (!invoiceId) {
      const mwstSatz = Number(registration.mwstSatz);
      const taxCase = registration.reverseCharge
        ? "eu"
        : mwstSatz === 0
          ? "noteu"
          : "default";

      const teilnehmerListe = registration.teilnehmer
        .map((t) => `${t.vorname} ${t.nachname}`)
        .join(", ");

      // Empfänger-Adressblock aus der Bestellung (Quelle der Wahrheit – die
      // Partner pflegen ihre Rechnungsdaten selbst im Kundenportal).
      const landName: Record<string, string> = { AT: "Österreich", CH: "Schweiz" };
      const address = [
        bestellung.firma,
        bestellung.strasse,
        `${bestellung.plz} ${bestellung.ort}`,
        ...(landName[bestellung.land] ? [landName[bestellung.land]] : []),
      ].join("\n");

      const created = await createInvoice({
        contactId,
        address,
        header: `Rechnung – ${event.name}`,
        headText:
          `${event.name} am 10./11. Dezember 2026 im ${event.ort ?? "nhow Hotel Frankfurt am Main"}.<br>` +
          `Teilnehmer (${registration.personen}): ${teilnehmerListe}.<br>` +
          `Bezug: Anmeldung über das Kundenportal, Bestellung ${bestellung.bestellNr}.`,
        footText:
          "Der Platz ist erst nach Zahlungseingang verbindlich bestätigt. " +
          "Die Anmeldung ist verbindlich; eine Absage ist jederzeit möglich, " +
          "kostet aber 399 Euro, falls wir den Platz nicht nachbesetzen können. " +
          "Alle weiteren Informationen erhaltet ihr rechtzeitig vor dem Termin.",
        timeToPayDays: ZAHLUNGSZIEL_TAGE,
        positions: [
          {
            name: `${event.name} – Eigenanteil`,
            text: `Teilnahme inkl. Hotelübernachtung, Verpflegung und Abendveranstaltung (${teilnehmerListe})`,
            quantity: registration.personen,
            price: Number(event.preisNettoProPerson),
            taxRate: mwstSatz,
          },
        ],
        taxRate: mwstSatz,
        taxCase,
        taxText: registration.reverseCharge
          ? "Reverse Charge gem. Art. 196 MwSt-Richtlinie – Steuerschuldnerschaft des Leistungsempfängers"
          : undefined,
      });

      invoiceId = created.invoiceId;
      await prisma.eventRegistration.update({
        where: { id: registrationId },
        data: {
          invoiceStatus: "CREATED",
          sevdeskInvoiceId: created.invoiceId,
          sevdeskInvoiceNr: created.invoiceNumber,
          invoiceError: null,
        },
      });
    }

    // 3. Rechnung festschreiben (Entwurf → "Offen"): erst dabei vergibt
    //    sevDesk die endgültige Rechnungsnummer aus dem Nummernkreis. Das MUSS
    //    vor dem PDF-Abruf passieren – sonst geht ein Entwurfs-PDF mit leerem
    //    Rechnungsnummern-Feld an den Partner raus, während die Rechnung in
    //    sevDesk später eine Nummer trägt.
    //    Idempotent: ist die Rechnung schon "Offen" (z.B. Admin-Retry nach
    //    fehlgeschlagenem Mailversand), wird nur die Nummer nachgeladen.
    step = "Rechnung festschreiben";
    const current = await getInvoice(invoiceId);
    let rechnungNr = current.invoiceNumber;
    if (current.status === "100") {
      await markInvoiceSent(invoiceId);
      rechnungNr = (await getInvoice(invoiceId)).invoiceNumber;
    }
    if (!rechnungNr) {
      throw new SevdeskError(
        "sevDesk hat nach dem Festschreiben keine Rechnungsnummer vergeben – Versand abgebrochen, damit kein PDF ohne Rechnungsnummer rausgeht."
      );
    }
    if (registration.sevdeskInvoiceNr !== rechnungNr) {
      await prisma.eventRegistration.update({
        where: { id: registrationId },
        data: { sevdeskInvoiceNr: rechnungNr },
      });
    }

    // 4. PDF rendern – Pflicht, kein Best-effort: ohne Neu-Render könnte
    //    sevDesk das gecachte Entwurfs-PDF (ohne Rechnungsnummer) ausliefern.
    step = "Rechnung rendern";
    await renderInvoice(invoiceId);

    // 5. Rechnung per E-Mail versenden.
    //    Bevorzugt über Resend im Branddesign (Absender Next Skills, Template
    //    connect_day_rechnung, PDF aus sevDesk im Anhang).
    //    Fallback ohne Resend: Versand direkt aus sevDesk (alte Optik).
    step = "Rechnung versenden";
    const teilnehmerListe = registration.teilnehmer
      .map((t) => `${t.vorname} ${t.nachname}`)
      .join(", ");

    const pdf = await getInvoicePdf(invoiceId);
    const viaResend = await sendConnectDayInvoiceEmail({
      email: bestellung.email,
      vorname: bestellung.vorname,
      firma: bestellung.firma,
      personen: registration.personen,
      teilnehmerListe,
      rechnungNr,
      preisBrutto: Number(registration.preisBrutto),
      zahlungszielTage: ZAHLUNGSZIEL_TAGE,
      pdf,
    });

    if (!viaResend) {
      await sendInvoiceByEmail({
        invoiceId,
        toEmail: bestellung.email,
        subject: `Deine Rechnung – ${event.name}`,
        text:
          `Hallo ${bestellung.vorname},\n\n` +
          `anbei die Rechnung ${rechnungNr} für eure Anmeldung zum ${event.name} ` +
          `(${registration.personen} ${registration.personen === 1 ? "Person" : "Personen"}).\n\n` +
          `Viele Grüße\nNext Skills`,
      });
    }

    await prisma.eventRegistration.update({
      where: { id: registrationId },
      data: {
        invoiceStatus: "SENT",
        invoiceSentAt: new Date(),
        invoiceError: null,
        sevdeskInvoiceNr: rechnungNr,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      `[ConnectDay] Rechnung für Anmeldung ${registrationId} fehlgeschlagen (${step}):`,
      err
    );
    try {
      await prisma.eventRegistration.update({
        where: { id: registrationId },
        data: {
          invoiceStatus: "FAILED",
          invoiceError: `${step}: ${message}`.slice(0, 1000),
        },
      });
    } catch (persistErr) {
      console.error(
        "[ConnectDay] invoiceError konnte nicht gespeichert werden:",
        persistErr
      );
    }
  }
}
