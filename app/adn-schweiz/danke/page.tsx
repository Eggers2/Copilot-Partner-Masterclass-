import { EVENT_DOWNLOADS } from "@/lib/event-download/events";
import { EventDankePage, eventDankeMetadata } from "@/components/event-download/EventDankePage";

// Danke-Seite mit dem Folien-Download: Vortrag ADN Schweiz, Opfikon, 28.10.2026.

const event = EVENT_DOWNLOADS["adn-schweiz"];

export const metadata = eventDankeMetadata(event);

export default function Page() {
  return <EventDankePage event={event} />;
}
