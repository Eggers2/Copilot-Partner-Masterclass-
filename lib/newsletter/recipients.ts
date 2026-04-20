import { prisma } from "@/lib/prisma";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalize(email: string): string | null {
  const clean = email.trim().toLowerCase();
  if (!clean) return null;
  if (!EMAIL_RE.test(clean)) return null;
  return clean;
}

export async function getMasterclassRecipients(): Promise<string[]> {
  const [bestellungen, teilnehmer] = await Promise.all([
    prisma.bestellung.findMany({ select: { email: true } }),
    prisma.bestellungTeilnehmer.findMany({ select: { email: true } }),
  ]);

  const set = new Set<string>();
  for (const b of bestellungen) {
    const n = normalize(b.email ?? "");
    if (n) set.add(n);
  }
  for (const t of teilnehmer) {
    const n = normalize(t.email ?? "");
    if (n) set.add(n);
  }
  return [...set].sort();
}

export function parseManualEmails(input: string | null | undefined): string[] {
  if (!input) return [];
  const parts = input.split(/[;\n,]+/);
  const set = new Set<string>();
  for (const p of parts) {
    const n = normalize(p);
    if (n) set.add(n);
  }
  return [...set].sort();
}

export async function buildRecipientList(
  zusatzMails: string | null | undefined
): Promise<{ all: string[]; fromDb: string[]; manual: string[] }> {
  const fromDb = await getMasterclassRecipients();
  const manual = parseManualEmails(zusatzMails);
  const all = [...new Set([...fromDb, ...manual])].sort();
  return { all, fromDb, manual };
}
