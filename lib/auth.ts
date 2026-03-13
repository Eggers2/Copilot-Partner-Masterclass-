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
