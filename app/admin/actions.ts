"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { setAuthCookie, clearAuthCookie, requireAuth } from "@/lib/auth";
import { updateLead, addActivity } from "@/lib/db/leads";
import {
  createWebinar,
  updateWebinar,
  updateRegistrationStatus,
  bulkUpdateRegistrationStatus,
} from "@/lib/db/webinars";
import type {
  LeadStatus,
  LeadSource,
  ActivityType,
  WebinarStatus,
  RegistrationStatus,
} from "@prisma/client";
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

  const revenueRaw = formData.get("revenue") as string;
  const revenueEuro = parseFloat(revenueRaw);
  const revenueCents = !isNaN(revenueEuro) ? Math.round(revenueEuro * 100) : 0;

  await updateLead(id, {
    name: (formData.get("name") as string) || null,
    company: (formData.get("company") as string) || null,
    phone: (formData.get("phone") as string) || null,
    status: newStatus,
    source: formData.get("source") as LeadSource,
    notes: (formData.get("notes") as string) || null,
    score: parseInt(formData.get("score") as string) || 0,
    revenue: newStatus === "WON" ? revenueCents : undefined,
    followUpAt: followUpAtRaw ? new Date(followUpAtRaw) : null,
  });

  if (currentLead && currentLead.status !== newStatus) {
    await addActivity(id, {
      type: "STATUS_CHANGE" as ActivityType,
      content: `Status geändert: ${currentLead.status} → ${newStatus}`,
      oldValue: currentLead.status,
      newValue: newStatus,
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
  await prisma.webinarRegistration.deleteMany({ where: { leadId: id } });
  await prisma.lead.delete({ where: { id } });
  revalidatePath("/admin");
}

// ─── WEBINAR ACTIONS ──────────────────────────────────

export async function createWebinarAction(
  _prev: unknown,
  formData: FormData
): Promise<{ success?: boolean; error?: string }> {
  await requireAuth();

  const title = formData.get("title") as string;
  const slug = formData.get("slug") as string;
  const scheduledAtRaw = formData.get("scheduledAt") as string;

  if (!title?.trim() || !slug?.trim() || !scheduledAtRaw) {
    return { error: "Titel, Slug und Datum sind erforderlich." };
  }

  try {
    await createWebinar({
      title: title.trim(),
      slug: slug.trim(),
      scheduledAt: new Date(scheduledAtRaw),
      durationMin: parseInt(formData.get("durationMin") as string) || 60,
      zoomLink: (formData.get("zoomLink") as string) || null,
      maxAttendees: parseInt(formData.get("maxAttendees") as string) || 50,
      description: (formData.get("description") as string) || null,
    });
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return { error: "Ein Webinar mit diesem Slug existiert bereits." };
    }
    throw error;
  }

  revalidatePath("/admin/webinars");
  redirect("/admin/webinars");
}

export async function updateWebinarStatusAction(
  id: string,
  status: WebinarStatus
): Promise<void> {
  await requireAuth();
  await updateWebinar(id, { status });
  revalidatePath(`/admin/webinars/${id}`);
  revalidatePath("/admin/webinars");
}

export async function markAttendanceAction(
  _prev: unknown,
  formData: FormData
): Promise<{ success?: boolean; error?: string }> {
  await requireAuth();

  const registrationId = formData.get("registrationId") as string;
  const status = formData.get("status") as RegistrationStatus;
  const webinarId = formData.get("webinarId") as string;

  if (!registrationId || !status) {
    return { error: "Fehlende Daten." };
  }

  const registration = await prisma.webinarRegistration.findUnique({
    where: { id: registrationId },
    include: {
      lead: { select: { id: true, status: true } },
      webinar: { select: { title: true } },
    },
  });
  if (!registration) return { error: "Registrierung nicht gefunden." };

  await updateRegistrationStatus(registrationId, status);

  const newLeadStatus: LeadStatus =
    status === "ATTENDED" ? "WEBINAR_ATTENDED" : "FOLLOW_UP";
  const oldLeadStatus = registration.lead.status;

  await prisma.lead.update({
    where: { id: registration.lead.id },
    data: { status: newLeadStatus },
  });

  const activityContent =
    status === "ATTENDED"
      ? `Webinar besucht: ${registration.webinar.title}`
      : `No-Show: ${registration.webinar.title} – Follow-up gesetzt`;

  await addActivity(registration.lead.id, {
    type: "WEBINAR" as ActivityType,
    content: activityContent,
    oldValue: oldLeadStatus,
    newValue: newLeadStatus,
  });

  revalidatePath(`/admin/webinars/${webinarId}`);
  revalidatePath("/admin");

  return { success: true };
}

export async function bulkMarkAttendanceAction(
  _prev: unknown,
  formData: FormData
): Promise<{ success?: boolean; error?: string }> {
  await requireAuth();

  const webinarId = formData.get("webinarId") as string;
  const status = formData.get("status") as RegistrationStatus;
  const registrationIds = formData.getAll("registrationIds") as string[];

  if (!webinarId || !status || registrationIds.length === 0) {
    return { error: "Fehlende Daten." };
  }

  await bulkUpdateRegistrationStatus(webinarId, registrationIds, status);

  // Update lead statuses and log activities for each
  const registrations = await prisma.webinarRegistration.findMany({
    where: { id: { in: registrationIds } },
    include: {
      lead: { select: { id: true, status: true } },
      webinar: { select: { title: true } },
    },
  });

  const newLeadStatus: LeadStatus =
    status === "ATTENDED" ? "WEBINAR_ATTENDED" : "FOLLOW_UP";

  for (const reg of registrations) {
    await prisma.lead.update({
      where: { id: reg.lead.id },
      data: { status: newLeadStatus },
    });

    const activityContent =
      status === "ATTENDED"
        ? `Webinar besucht: ${reg.webinar.title}`
        : `No-Show: ${reg.webinar.title} – Follow-up gesetzt`;

    await addActivity(reg.lead.id, {
      type: "WEBINAR" as ActivityType,
      content: activityContent,
      oldValue: reg.lead.status,
      newValue: newLeadStatus,
    });
  }

  revalidatePath(`/admin/webinars/${webinarId}`);
  revalidatePath("/admin");

  return { success: true };
}
