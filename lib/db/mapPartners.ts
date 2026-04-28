import { prisma } from "@/lib/prisma";
import { geocodeAddress } from "@/lib/geocode";

const PLACEHOLDER = "—";

function isValidAddress(
  strasse: string | null,
  plz: string | null,
  ort: string | null
): boolean {
  return (
    !!strasse &&
    !!plz &&
    !!ort &&
    strasse !== PLACEHOLDER &&
    plz !== PLACEHOLDER &&
    ort !== PLACEHOLDER
  );
}

async function geocodeMissingBestellungen() {
  const missing = await prisma.bestellung.findMany({
    where: {
      showOnMap: true,
      latitude: null,
    },
    select: { id: true, strasse: true, plz: true, ort: true },
  });

  for (const b of missing) {
    if (!isValidAddress(b.strasse, b.plz, b.ort)) continue;
    const coords = await geocodeAddress(b.strasse, b.plz, b.ort);
    if (coords) {
      await prisma.bestellung.update({
        where: { id: b.id },
        data: { latitude: coords.latitude, longitude: coords.longitude },
      });
    }
    // Nominatim Rate-Limit: 1 req/sec
    await new Promise((r) => setTimeout(r, 1100));
  }
}

export interface MapPartner {
  companyName: string;
  street: string;
  zip: string;
  city: string;
  website: string | null;
  latitude: number;
  longitude: number;
}

/**
 * Liefert alle Partner für die Karte. Quelle ist die Bestellung-Tabelle (vom
 * Kunden im Portal pflegbar). Pro E-Mail wird die jüngste Bestellung als
 * kanonisch verwendet; ist irgendeine Bestellung mit derselben E-Mail
 * opted-out, blendet das den gesamten Partner aus.
 */
export async function loadMapPartners(): Promise<MapPartner[]> {
  await geocodeMissingBestellungen();

  const bestellungen = await prisma.bestellung.findMany({
    select: {
      email: true,
      firma: true,
      strasse: true,
      plz: true,
      ort: true,
      latitude: true,
      longitude: true,
      showOnMap: true,
    },
    orderBy: { erstelltAm: "desc" },
  });

  const optedOutEmails = new Set<string>();
  const latestByEmail = new Map<string, (typeof bestellungen)[number]>();
  for (const b of bestellungen) {
    const email = b.email.toLowerCase();
    if (!b.showOnMap) optedOutEmails.add(email);
    if (!latestByEmail.has(email)) latestByEmail.set(email, b);
  }

  const visible = Array.from(latestByEmail.entries())
    .filter(([email, b]) => {
      if (optedOutEmails.has(email)) return false;
      if (b.latitude == null || b.longitude == null) return false;
      if (!isValidAddress(b.strasse, b.plz, b.ort)) return false;
      return true;
    })
    .map(([, b]) => b);

  const emails = visible.map((b) => b.email.toLowerCase());
  const leads = emails.length
    ? await prisma.lead.findMany({
        where: { email: { in: emails } },
        select: { email: true, website: true },
      })
    : [];
  const websiteByEmail = new Map(
    leads.map((l) => [l.email.toLowerCase(), l.website])
  );

  return visible.map((b) => ({
    companyName: b.firma,
    street: b.strasse,
    zip: b.plz,
    city: b.ort,
    website: websiteByEmail.get(b.email.toLowerCase()) ?? null,
    latitude: b.latitude!,
    longitude: b.longitude!,
  }));
}
