import Link from "next/link";
import { MailCheck } from "lucide-react";

export default function CheckEmailPage() {
  return (
    <div className="max-w-md mx-auto text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 bg-green-50 border border-green-200 rounded-2xl mb-4">
        <MailCheck className="w-8 h-8 text-green-600" />
      </div>
      <h1 className="text-2xl font-bold text-dark-slate-900 mb-2">
        E-Mail unterwegs
      </h1>
      <p className="text-dark-slate-600 text-sm">
        Falls deine E-Mail-Adresse bei uns hinterlegt ist, hast du jetzt einen
        Login-Link erhalten. Der Link ist 30 Minuten gültig und funktioniert nur
        einmal.
      </p>
      <p className="text-dark-slate-500 text-xs mt-4">
        Keine E-Mail erhalten? Prüfe den Spam-Ordner oder fordere einen neuen
        Link an.
      </p>
      <Link
        href="/kundenportal"
        className="inline-block mt-6 text-sm font-medium text-[#030386] hover:underline"
      >
        Zurück zur Anmeldung
      </Link>
    </div>
  );
}
