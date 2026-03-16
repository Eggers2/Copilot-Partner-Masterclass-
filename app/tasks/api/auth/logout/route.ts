import { NextResponse } from "next/server";
import { logoutTaskUser } from "@/lib/tasks-auth";

export async function POST() {
  await logoutTaskUser();
  return NextResponse.json({ success: true });
}
