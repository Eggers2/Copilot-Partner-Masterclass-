"use server";

import { loginTaskUser, logoutTaskUser, requireTasksAuth } from "@/lib/tasks-auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function tasksLoginAction(formData: FormData) {
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;

  if (!username || !password) {
    return { error: "Bitte Benutzername und Passwort eingeben." };
  }

  const session = await loginTaskUser(username, password);
  if (!session) {
    return { error: "Ungültige Anmeldedaten." };
  }

  redirect("/tasks");
}

export async function tasksLogoutAction() {
  await logoutTaskUser();
  redirect("/tasks/login");
}

export async function createUserAction(formData: FormData) {
  const session = await requireTasksAuth();
  if (session.role !== "admin") {
    return { error: "Keine Berechtigung." };
  }

  const username = formData.get("username") as string;
  const password = formData.get("password") as string;
  const displayName = formData.get("displayName") as string;
  const role = (formData.get("role") as string) || "member";

  if (!username || !password || !displayName) {
    return { error: "Alle Felder sind Pflicht." };
  }

  const existing = await prisma.taskUser.findUnique({ where: { username } });
  if (existing) {
    return { error: "Benutzername bereits vergeben." };
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.taskUser.create({
    data: { username, passwordHash, displayName, role },
  });

  return { success: true };
}
