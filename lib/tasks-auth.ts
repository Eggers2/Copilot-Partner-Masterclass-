import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

const COOKIE_NAME = "tasks-token";

export interface TaskSession {
  userId: number;
  username: string;
  displayName: string;
  role: string;
}

export async function requireTasksAuth(): Promise<TaskSession> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) {
    redirect("/tasks/login");
  }

  try {
    const parsed = JSON.parse(Buffer.from(token, "base64").toString());
    const user = await prisma.taskUser.findUnique({ where: { id: parsed.userId } });
    if (!user) {
      redirect("/tasks/login");
    }
    return {
      userId: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
    };
  } catch {
    redirect("/tasks/login");
  }
}

export async function isTasksAuthenticated(): Promise<TaskSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) return null;

  try {
    const parsed = JSON.parse(Buffer.from(token, "base64").toString());
    const user = await prisma.taskUser.findUnique({ where: { id: parsed.userId } });
    if (!user) return null;
    return {
      userId: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
    };
  } catch {
    return null;
  }
}

export async function loginTaskUser(
  username: string,
  password: string
): Promise<TaskSession | null> {
  // Auto-create admin user if no users exist yet (first-time setup)
  const userCount = await prisma.taskUser.count();
  if (userCount === 0) {
    const adminPassword = process.env.TASKS_ADMIN_PASSWORD || "changeme123";
    const hash = await bcrypt.hash(adminPassword, 12);
    await prisma.taskUser.create({
      data: {
        username: "alex",
        passwordHash: hash,
        displayName: "Alex",
        role: "admin",
      },
    });
    console.log("✅ Auto-created admin user (username: alex)");
  }

  const user = await prisma.taskUser.findUnique({ where: { username } });
  if (!user) return null;

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return null;

  const session: TaskSession = {
    userId: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
  };

  const cookieStore = await cookies();
  const token = Buffer.from(JSON.stringify({ userId: user.id })).toString("base64");
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });

  return session;
}

export async function logoutTaskUser(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
