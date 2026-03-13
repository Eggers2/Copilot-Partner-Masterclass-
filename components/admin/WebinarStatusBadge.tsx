import type { WebinarStatus } from "@prisma/client";
import { WEBINAR_STATUS_CONFIG } from "@/lib/constants/lead-config";

export function WebinarStatusBadge({ status }: { status: WebinarStatus }) {
  const config = WEBINAR_STATUS_CONFIG[status];

  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
      style={{ color: config.color, backgroundColor: config.bg }}
    >
      {config.label}
    </span>
  );
}
