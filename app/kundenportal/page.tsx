import { redirect } from "next/navigation";
import { Mail, AlertCircle } from "lucide-react";
import { getCustomerSession } from "@/lib/auth/customer";
import { requestLinkAction } from "./actions";

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
      ? "Dein Login-Link ist abgelaufen. Bitte fordere einen neuen an."
      : error === "used"
        ? "Dieser Login-Link wurde bereits genutzt. Bitte fordere einen neuen an."
        : error === "invalid"
          ? "Der Login-Link ist ungültig. Bitte fordere einen neuen an."
          : null;

  return (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-[#030386]/10 border border-[#030386]/20 rounded-2xl mb-4">
          <Mail className="w-8 h-8 text-[#030386]" />
        </div>
        <h1 className="text-2xl font-bold text-dark-slate-900">
          Willkommen im Kundenportal
        </h1>
        <p className="text-dark-slate-500 text-sm mt-2">
          Gib deine E-Mail-Adresse ein. Wir senden dir einen persönlichen
          Login-Link, der 30 Minuten gültig ist.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-dark-slate-100 shadow-sm p-8">
        <form action={requestLinkAction} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-dark-slate-600 mb-1">
              E-Mail-Adresse
            </label>
            <input
              type="email"
              name="email"
              required
              placeholder="du@firma.de"
              className="w-full px-3 py-2 text-sm border border-dark-slate-200 rounded-lg focus:border-[#030386] focus:outline-none bg-white text-dark-slate-900"
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
            className="w-full py-3 bg-[#030386] hover:bg-[#030386]/90 text-white font-semibold rounded-lg transition-colors"
          >
            Login-Link anfordern
          </button>
        </form>
      </div>

      <p className="text-center text-dark-slate-500 text-xs mt-6">
        Zugang nur für bestehende Kunden. Aus Sicherheitsgründen verraten wir
        nicht, ob deine E-Mail registriert ist.
      </p>
    </div>
  );
}
