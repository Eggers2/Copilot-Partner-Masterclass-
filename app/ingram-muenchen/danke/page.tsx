import { EVENT_DOWNLOADS } from "@/lib/event-download/events";
import { EventDankePage, eventDankeMetadata } from "@/components/event-download/EventDankePage";

// Danke-Seite mit dem Folien-Download: Ingram Micro CSP Partner Enablement Training, München, Tag 1, 03.11.2026.

const event = EVENT_DOWNLOADS["ingram-muenchen"];

export const metadata = eventDankeMetadata(event);

export default function Page() {
  return <EventDankePage event={event} />;
}
