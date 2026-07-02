import Link from "next/link";
import { ShoppingBag, Mail, CalendarDays } from "lucide-react";
import { getCustomerSession } from "@/lib/auth/customer";
import { logoutCustomerAction } from "./actions";

export default async function KundenportalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCustomerSession();

  return (
    <div className="min-h-screen bg-ice">
      <header className="bg-slate border-b border-slate-2 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link
              href={session ? "/kundenportal/bestellungen" : "/kundenportal"}
              className="flex items-center gap-3"
            >
              <span className="font-bold text-white text-xl font-heading">
                Next<span className="text-green">Skills</span>
              </span>
              <span className="text-white/50 text-xs border-l border-slate-3 pl-3">
                Kundenportal
              </span>
            </Link>

            {session && (
              <div className="flex items-center gap-4">
                <Link
                  href="/kundenportal/bestellungen"
                  className="hidden sm:flex items-center gap-2 px-3 py-2 text-sm text-white/60 hover:text-white hover:bg-slate-2 rounded-lg transition-all"
                >
                  <ShoppingBag className="w-4 h-4" />
                  Meine Bestellungen
                </Link>
                <Link
                  href="/kundenportal/connect-day"
                  className="hidden sm:flex items-center gap-2 px-3 py-2 text-sm text-white/60 hover:text-white hover:bg-slate-2 rounded-lg transition-all"
                >
                  <CalendarDays className="w-4 h-4" />
                  Connect Day
                </Link>
                <Link
                  href="/kundenportal/newsletter"
                  className="hidden sm:flex items-center gap-2 px-3 py-2 text-sm text-white/60 hover:text-white hover:bg-slate-2 rounded-lg transition-all"
                >
                  <Mail className="w-4 h-4" />
                  Newsletter-Archiv
                </Link>
                <span className="hidden md:inline text-xs text-white/40 font-mono">
                  {session.email}
                </span>
                <form action={logoutCustomerAction}>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm text-white/60 hover:text-white hover:bg-slate-2 rounded-lg transition-all"
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
