const STORAGE_KEY = "cb_utm_data";
const TTL_MS = 90 * 24 * 60 * 60 * 1000;
const MAX_UTM_LEN = 100;
const MAX_URL_LEN = 500;

export type UtmData = {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  referrer: string | null;
  landing_page: string | null;
  first_touch_at: string;
};

type StoredUtm = UtmData & { expires_at: number };

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;
type UtmKey = (typeof UTM_KEYS)[number];

function truncate(value: string | null, max: number): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
}

function readStored(): StoredUtm | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredUtm;
    if (!parsed.expires_at || parsed.expires_at < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeStored(data: UtmData): void {
  try {
    const payload: StoredUtm = { ...data, expires_at: Date.now() + TTL_MS };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // localStorage may be blocked (private mode, quota); silently ignore
  }
}

function readUtmsFromUrl(): Partial<Record<UtmKey, string | null>> {
  const params = new URLSearchParams(window.location.search);
  const result: Partial<Record<UtmKey, string | null>> = {};
  for (const key of UTM_KEYS) {
    result[key] = truncate(params.get(key), MAX_UTM_LEN);
  }
  return result;
}

function hasAnyUtm(utms: Partial<Record<UtmKey, string | null>>): boolean {
  return UTM_KEYS.some((key) => utms[key] != null);
}

export function captureUtmData(): void {
  if (typeof window === "undefined") return;

  const urlUtms = readUtmsFromUrl();
  const stored = readStored();

  const urlHasUtms = hasAnyUtm(urlUtms);
  if (!urlHasUtms && stored) return;

  const referrer = truncate(document.referrer || null, MAX_URL_LEN);
  const landingPage = truncate(
    window.location.pathname + window.location.search,
    MAX_URL_LEN,
  );

  const next: UtmData = {
    utm_source: urlUtms.utm_source ?? null,
    utm_medium: urlUtms.utm_medium ?? null,
    utm_campaign: urlUtms.utm_campaign ?? null,
    utm_content: urlUtms.utm_content ?? null,
    utm_term: urlUtms.utm_term ?? null,
    referrer,
    landing_page: landingPage,
    first_touch_at: new Date().toISOString(),
  };

  writeStored(next);
}

export function getUtmData(): UtmData | null {
  if (typeof window === "undefined") return null;
  const stored = readStored();
  if (!stored) return null;
  return {
    utm_source: stored.utm_source,
    utm_medium: stored.utm_medium,
    utm_campaign: stored.utm_campaign,
    utm_content: stored.utm_content,
    utm_term: stored.utm_term,
    referrer: stored.referrer,
    landing_page: stored.landing_page,
    first_touch_at: stored.first_touch_at,
  };
}
