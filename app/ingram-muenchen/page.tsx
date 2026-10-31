import { EVENT_DOWNLOADS } from "@/lib/event-download/events";
import {
  EventDownloadPage,
  eventDownloadMetadata,
} from "@/components/event-download/EventDownloadPage";

// Folien-Download: Ingram Micro CSP Partner Enablement Training, München, Tag 1, 03.11.2026.
// Erreichbar nur über den QR-Code auf der letzten Folie: noindex, nicht in
// Navigation oder Sitemap.

const event = EVENT_DOWNLOADS["ingram-muenchen"];

export const metadata = eventDownloadMetadata(event);

// Liest die UTM-Werte pro Request aus der URL → kein Static Render.
export const dynamic = "force-dynamic";

export default function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <EventDownloadPage event={event} searchParams={searchParams} />;
}
