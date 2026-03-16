import { NextRequest, NextResponse } from "next/server";
import { loginTaskUser } from "@/lib/tasks-auth";

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();

  if (!username || !password) {
    return NextResponse.json({ error: "Bitte Benutzername und Passwort eingeben." }, { status: 400 });
  }

  const session = await loginTaskUser(username, password);
  if (!session) {
    return NextResponse.json({ error: "Ungültige Anmeldedaten." }, { status: 401 });
  }

  return NextResponse.json({ success: true, user: session });
}
