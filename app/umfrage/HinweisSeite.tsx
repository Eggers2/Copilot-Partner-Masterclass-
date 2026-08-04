/**
 * Freundliche Hinweisseite für ungültige oder abgelaufene Umfrage-Links.
 * Bewusst ohne Details, warum der Link nicht funktioniert (öffentliche Route).
 */
export default function HinweisSeite({ grund }: { grund: "ungueltig" | "beendet" }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center">
      <h1 className="text-2xl font-bold text-slate mb-4">
        {grund === "beendet" ? "Diese Umfrage-Runde ist beendet" : "Dieser Link funktioniert nicht"}
      </h1>
      <p className="text-gray leading-relaxed">
        {grund === "beendet"
          ? "Die Runde, zu der dieser Link gehört, ist abgeschlossen. Mit der nächsten Runde bekommst du automatisch einen neuen Link per E-Mail."
          : "Der Link ist ungültig oder unvollständig. Bitte nutze den Link aus deiner E-Mail oder den aktuellen QR-Code aus der Session."}
      </p>
    </div>
  );
}
