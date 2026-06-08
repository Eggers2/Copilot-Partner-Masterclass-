import type { NewsletterStatus } from "@prisma/client";

const CONFIG: Record<NewsletterStatus, { label: string; color: string; bg: string }> = {
  DRAFT: { label: "Entwurf", color: "#6C7A95", bg: "#1E2A44" },
  APPROVED: { label: "Freigegeben", color: "#5BC0EB", bg: "#10283B" },
  SENDING: { label: "Wird versandt…", color: "#F4B955", bg: "#3B2E14" },
  SENT: { label: "Versandt", color: "#2FE29B", bg: "#0F3326" },
  FAILED: { label: "Fehler", color: "#FF6B6B", bg: "#3B1414" },
};

export function NewsletterStatusBadge({ status }: { status: NewsletterStatus }) {
  const config = CONFIG[status];
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
      style={{ color: config.color, backgroundColor: config.bg }}
    >
      {config.label}
    </span>
  );
}
