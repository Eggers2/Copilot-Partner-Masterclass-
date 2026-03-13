"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { setAuthCookie, clearAuthCookie, requireAuth } from "@/lib/auth";
import { updateLead, addActivity } from "@/lib/db/leads";
import type { LeadStatus, LeadSource, ActivityType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function loginAction(
  _prev: unknown,
  formData: FormData
): Promise<{ error?: string }> {
  const password = formData.get("password") as string;

  if (!password?.trim()) {
    return { error: "Passwort ist erforderlich." };
  }

  const success = await setAuthCookie(password);

  if (!success) {
    return { error: "Falsches Passwort. Bitte versuche es erneut." };
  }

  redirect("/admin");
}

export async function logoutAction() {
  await clearAuthCookie();
  redirect("/admin/login");
}

export async function updateLeadAction(
  _prev: unknown,
  formData: FormData
): Promise<{ success?: boolean; error?: string }> {
  await requireAuth();

  const id = formData.get("id") as string;
  if (!id) return { error: "ID fehlt." };

  const currentLead = await prisma.lead.findUnique({
    where: { id },
    select: { status: true },
  });

  const newStatus = formData.get("status") as LeadStatus;
  const followUpAtRaw = formData.get("followUpAt") as string;

  await updateLead(id, {
    name: (formData.get("name") as string) || null,
    company: (formData.get("company") as string) || null,
    phone: (formData.get("phone") as string) || null,
    status: newStatus,
    source: formData.get("source") as LeadSource,
    notes: (formData.get("notes") as string) || null,
    score: parseInt(formData.get("score") as string) || 0,
    followUpAt: followUpAtRaw ? new Date(followUpAtRaw) : null,
  });

  if (currentLead && currentLead.status !== newStatus) {
    await addActivity(id, {
      type: "STATUS_CHANGE" as ActivityType,
      content: `Status geändert: ${currentLead.status} → ${newStatus}`,
    });
  }

  revalidatePath(`/admin/leads/${id}`);
  revalidatePath("/admin");

  return { success: true };
}

export async function addActivityAction(
  _prev: unknown,
  formData: FormData
): Promise<{ success?: boolean; error?: string }> {
  await requireAuth();

  const leadId = formData.get("leadId") as string;
  const type = formData.get("type") as ActivityType;
  const content = formData.get("content") as string;

  if (!leadId || !type || !content?.trim()) {
    return { error: "Alle Felder sind erforderlich." };
  }

  await addActivity(leadId, { type, content: content.trim() });

  revalidatePath(`/admin/leads/${leadId}`);

  return { success: true };
}

export async function deleteLeadAction(id: string): Promise<void> {
  await requireAuth();
  await prisma.lead.delete({ where: { id } });
  revalidatePath("/admin");
  redirect("/admin");
}
