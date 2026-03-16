import Link from "next/link";
import { isTasksAuthenticated } from "@/lib/tasks-auth";
import { tasksLogoutAction } from "./actions";
import {
  LayoutDashboard,
  Columns3,
  AlertTriangle,
  Users,
  LogOut,
  Zap,
} from "lucide-react";

export default async function TasksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await isTasksAuthenticated();

  if (!session) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-[#05015B] sticky top-0 z-40 shadow-lg">
        <div className="max-w-full mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-6">
              <Link href="/tasks" className="flex items-center gap-2">
                <div className="w-7 h-7 bg-[#030386] rounded-lg flex items-center justify-center">
                  <Zap className="w-4 h-4 text-white" />
                </div>
                <span className="text-white font-bold text-sm">
                  NextSkills
                </span>
                <span className="text-[#DCDCEE] text-xs">Launch Tasks</span>
              </Link>
              <nav className="hidden md:flex items-center gap-1">
                <NavLink href="/tasks" icon={Columns3} label="Board" />
                <NavLink
                  href="/tasks/dashboard"
                  icon={LayoutDashboard}
                  label="Dashboard"
                />
                <NavLink
                  href="/tasks/risks"
                  icon={AlertTriangle}
                  label="Risiken"
                />
                {session.role === "admin" && (
                  <NavLink
                    href="/tasks/admin"
                    icon={Users}
                    label="Benutzer"
                  />
                )}
              </nav>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[#DCDCEE] text-sm hidden sm:block">
                {session.displayName}
              </span>
              <form action={tasksLogoutAction}>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-[#DCDCEE] hover:text-white hover:bg-[#030386] rounded-lg transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Abmelden</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </header>
      {children}
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
      className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-[#DCDCEE] hover:text-white hover:bg-[#030386] rounded-lg transition-all"
    >
      <Icon className="w-4 h-4" />
      {label}
    </Link>
  );
}
