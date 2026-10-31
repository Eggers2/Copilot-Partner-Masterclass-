import { EVENT_DOWNLOADS } from "@/lib/event-download/events";
import { createEventDownloadPost } from "@/lib/event-download/handler";

// Folien-Download /ingram-muenchen (Ingram Micro München, Tag 1, 03.11.2026).
export const POST = createEventDownloadPost(EVENT_DOWNLOADS["ingram-muenchen"]);
