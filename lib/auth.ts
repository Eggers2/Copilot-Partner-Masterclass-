import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const COOKIE_NAME = "admin-token";

export async function requireAuth(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword || token !== adminPassword) {
    redirect("/admin/login");
  }
}

export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const adminPassword = process.env.ADMIN_PASSWORD;

  return !!adminPassword && token === adminPassword;
}

export async function setAuthCookie(password: string): Promise<boolean> {
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword || password !== adminPassword) {
    return false;
  }

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, password, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24, // 24 hours
    path: "/",
  });

  return true;
}

export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

/**
 * Erlaubt nach dem Login nur Weiterleitungen innerhalb von /admin (relativer
 * Pfad, kein Protokoll, kein "//"), damit der next-Parameter nicht für Open
 * Redirects missbraucht werden kann.
 */
export function safeAdminRedirectPath(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  if (!value.startsWith("/admin") || value.startsWith("//") || value.includes("\\")) {
    return undefined;
  }
  return value.slice(0, 2000);
}
