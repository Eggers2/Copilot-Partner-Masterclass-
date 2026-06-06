import { redirect } from "next/navigation";
import { Mail, AlertCircle } from "lucide-react";
import { getCustomerSession } from "@/lib/auth/customer";
import { requestOtpCodeAction } from "./actions";
import { SubmitButton } from "@/components/kundenportal/SubmitButton";

export default async function KundenportalLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getCustomerSession();
  if (session) redirect("/kundenportal/bestellungen");

  const { error } = await searchParams;

  const errorMessage =
    error === "expired"
      ? "Dein Login-Code ist abgelaufen. Bitte fordere einen neuen an."
      : error === "used"
        ? "Dieser Login-Code wurde bereits genutzt. Bitte fordere einen neuen an."
        : error === "invalid"
          ? "Bitte gib eine gültige E-Mail-Adresse ein."
          : error === "delivery_failed"
            ? "Der Code konnte nicht versendet werden. Bitte versuche es in einem Moment erneut oder kontaktiere uns."
            : error === "too_many_attempts"
              ? "Zu viele Fehlversuche. Bitte fordere einen neuen Code an."
              : null;

  return (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green/10 border border-green/20 rounded-2xl mb-4">
          <Mail className="w-8 h-8 text-green" />
        </div>
        <h1 className="text-2xl font-bold text-slate font-heading">
          Willkommen im Kundenportal
        </h1>
        <p className="text-gray text-sm mt-2">
          Gib deine E-Mail-Adresse ein. Wir senden dir einen 6-stelligen
          Login-Code, der 10 Minuten gültig ist.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-cool shadow-sm p-8">
        <form action={requestOtpCodeAction} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate mb-1">
              E-Mail-Adresse
            </label>
            <input
              type="email"
              name="email"
              required
              placeholder="du@firma.de"
              className="w-full px-4 py-3 text-sm border border-cool rounded-xl focus:border-green focus:outline-none bg-white text-slate"
            />
          </div>

          {errorMessage && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {errorMessage}
            </div>
          )}

          <SubmitButton
            label="Login-Code anfordern"
            pendingLabel="Code wird gesendet…"
            className="w-full py-3 bg-green hover:bg-green-d text-slate font-semibold rounded-xl transition-colors"
          />
        </form>
      </div>

      <p className="text-center text-gray text-xs mt-6">
        Zugang nur für bestehende Kunden. Aus Sicherheitsgründen verraten wir
        nicht, ob deine E-Mail registriert ist.
      </p>
    </div>
  );
}
