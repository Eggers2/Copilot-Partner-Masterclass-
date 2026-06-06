import Link from "next/link";
import { redirect } from "next/navigation";
import { KeyRound, AlertCircle } from "lucide-react";
import { getCustomerSession, getOtpPendingEmail } from "@/lib/auth/customer";
import { verifyOtpCodeAction } from "../actions";

export default async function KundenportalCodePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getCustomerSession();
  if (session) redirect("/kundenportal/bestellungen");

  const pendingEmail = await getOtpPendingEmail();
  if (!pendingEmail) redirect("/kundenportal?error=expired");

  const { error } = await searchParams;
  const errorMessage =
    error === "invalid"
      ? "Der Code stimmt nicht. Bitte prüfe ihn und versuche es erneut."
      : error === "expired"
        ? "Dein Code ist abgelaufen. Bitte fordere einen neuen an."
        : error === "used"
          ? "Dieser Code wurde bereits genutzt. Bitte fordere einen neuen an."
          : error === "too_many_attempts"
            ? "Zu viele Fehlversuche. Bitte fordere einen neuen Code an."
            : null;

  return (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green/10 border border-green/20 rounded-2xl mb-4">
          <KeyRound className="w-8 h-8 text-green" />
        </div>
        <h1 className="text-2xl font-bold text-slate font-heading">
          Code eingeben
        </h1>
        <p className="text-gray text-sm mt-2">
          Wir haben einen 6-stelligen Code an{" "}
          <span className="font-medium text-slate">{pendingEmail}</span>{" "}
          gesendet. Er ist 10 Minuten gültig.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-cool shadow-sm p-8">
        <form action={verifyOtpCodeAction} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate mb-1">
              6-stelliger Code
            </label>
            <input
              type="text"
              name="code"
              required
              autoFocus
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              autoComplete="one-time-code"
              placeholder="123456"
              className="w-full px-3 py-3 text-center text-2xl tracking-[0.5em] font-mono border border-cool rounded-xl focus:border-green focus:outline-none bg-white text-slate"
            />
          </div>

          {errorMessage && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {errorMessage}
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3 bg-green hover:bg-green-d text-slate font-semibold rounded-xl transition-colors"
          >
            Anmelden
          </button>
        </form>
      </div>

      <p className="text-center text-gray text-xs mt-6">
        Keine E-Mail erhalten?{" "}
        <Link href="/kundenportal" className="text-green hover:underline">
          Neuen Code anfordern
        </Link>
      </p>
    </div>
  );
}
