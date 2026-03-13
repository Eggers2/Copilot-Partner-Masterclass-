import Link from "next/link";
import { Zap, LayoutDashboard, CheckSquare, Video } from "lucide-react";
import { isAuthenticated } from "@/lib/auth";
import { logoutAction } from "./actions";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authed = await isAuthenticated();

  if (!authed) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-dark-slate-50">
      {/* Header */}
      <header className="bg-dark-slate-900 border-b border-dark-slate-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-6">
              <Link href="/admin" className="flex items-center gap-3">
                <div className="w-8 h-8 bg-[#030386] rounded-lg flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <span className="text-white font-bold text-sm">
                    Next Skills
                  </span>
                  <span className="text-dark-slate-400 text-xs ml-2">CRM</span>
                </div>
              </Link>
              <nav className="hidden md:flex items-center gap-1">
                <NavLink href="/admin" icon={LayoutDashboard} label="Dashboard" />
                <NavLink href="/admin/tasks" icon={CheckSquare} label="Follow-ups" />
                <NavLink href="/admin/webinars" icon={Video} label="Webinare" />
              </nav>
            </div>
            <form action={logoutAction}>
              <button
                type="submit"
                className="flex items-center gap-2 px-4 py-2 text-sm text-dark-slate-400 hover:text-white hover:bg-dark-slate-700 rounded-lg transition-all"
              >
                Abmelden
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}

function NavLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: typeof LayoutDashboard;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 px-3 py-2 text-sm text-dark-slate-400 hover:text-white hover:bg-dark-slate-800 rounded-lg transition-all"
    >
      <Icon className="w-4 h-4" />
      {label}
    </Link>
  );
}
