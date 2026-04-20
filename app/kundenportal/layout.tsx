import Link from "next/link";
import { Zap, ShoppingBag, Mail } from "lucide-react";
import { getCustomerSession } from "@/lib/auth/customer";
import { logoutCustomerAction } from "./actions";

export default async function KundenportalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCustomerSession();

  return (
    <div className="min-h-screen bg-dark-slate-50">
      <header className="bg-dark-slate-900 border-b border-dark-slate-700 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link
              href={session ? "/kundenportal/bestellungen" : "/kundenportal"}
              className="flex items-center gap-3"
            >
              <div className="w-8 h-8 bg-[#030386] rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-white font-bold text-sm">
                  Next Skills
                </span>
                <span className="text-dark-slate-400 text-xs ml-2">
                  Kundenportal
                </span>
              </div>
            </Link>

            {session && (
              <div className="flex items-center gap-4">
                <Link
                  href="/kundenportal/bestellungen"
                  className="hidden sm:flex items-center gap-2 px-3 py-2 text-sm text-dark-slate-400 hover:text-white hover:bg-dark-slate-800 rounded-lg transition-all"
                >
                  <ShoppingBag className="w-4 h-4" />
                  Meine Bestellungen
                </Link>
                <Link
                  href="/kundenportal/newsletter"
                  className="hidden sm:flex items-center gap-2 px-3 py-2 text-sm text-dark-slate-400 hover:text-white hover:bg-dark-slate-800 rounded-lg transition-all"
                >
                  <Mail className="w-4 h-4" />
                  Newsletter-Archiv
                </Link>
                <span className="hidden md:inline text-xs text-dark-slate-500 font-mono">
                  {session.email}
                </span>
                <form action={logoutCustomerAction}>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm text-dark-slate-400 hover:text-white hover:bg-dark-slate-700 rounded-lg transition-all"
                  >
                    Abmelden
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
