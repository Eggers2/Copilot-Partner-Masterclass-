-- Zwei zusätzliche Lead-Status für die Einordnung von Bewerbern, die nicht in
-- den regulären Funnel gehören:
--   EXPERTE       – bringt bereits eigenes Copilot-Know-how mit
--   ONE_MAN_SHOW  – Einzelberater / Freelancer, kein Systemhaus-Team
--
-- Hinweis: In PostgreSQL darf ein per ALTER TYPE ... ADD VALUE hinzugefügter
-- Enum-Wert nicht in derselben Transaktion verwendet werden – das tun wir hier
-- auch nicht (nur Schema-DDL), daher unkritisch.
ALTER TYPE "LeadStatus" ADD VALUE 'EXPERTE';
ALTER TYPE "LeadStatus" ADD VALUE 'ONE_MAN_SHOW';
