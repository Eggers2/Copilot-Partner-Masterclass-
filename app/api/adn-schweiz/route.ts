import { EVENT_DOWNLOADS } from "@/lib/event-download/events";
import { createEventDownloadPost } from "@/lib/event-download/handler";

// Folien-Download /adn-schweiz (Vortrag ADN Schweiz, 28.10.2026).
export const POST = createEventDownloadPost(EVENT_DOWNLOADS["adn-schweiz"]);
