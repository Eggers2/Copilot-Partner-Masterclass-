const NOMINATIM_BASE = "https://nominatim.openstreetmap.org/search";

interface NominatimResult {
  lat: string;
  lon: string;
}

export async function geocodeAddress(
  street: string,
  zip: string,
  city: string
): Promise<{ latitude: number; longitude: number } | null> {
  const query = `${street}, ${zip} ${city}`;
  const url = `${NOMINATIM_BASE}?format=json&q=${encodeURIComponent(query)}&limit=1`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "copilotberater.de" },
    });
    const data: NominatimResult[] = await res.json();
    if (data.length > 0) {
      return { latitude: parseFloat(data[0].lat), longitude: parseFloat(data[0].lon) };
    }
    return null;
  } catch {
    return null;
  }
}

export async function geocodeZip(
  zip: string
): Promise<{ latitude: number; longitude: number } | null> {
  const countries = ["Deutschland", "Österreich", "Schweiz"];
  for (const country of countries) {
    const url = `${NOMINATIM_BASE}?format=json&q=${encodeURIComponent(zip + " " + country)}&limit=1`;
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "copilotberater.de" },
      });
      const data: NominatimResult[] = await res.json();
      if (data.length > 0) {
        return { latitude: parseFloat(data[0].lat), longitude: parseFloat(data[0].lon) };
      }
    } catch {
      continue;
    }
    // Rate limit: 1 req/sec
    await new Promise((r) => setTimeout(r, 1100));
  }
  return null;
}

export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}
