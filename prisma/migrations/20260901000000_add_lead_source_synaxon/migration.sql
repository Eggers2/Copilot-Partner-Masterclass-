-- Neue Lead-Quelle für den Vertriebskanal SYNAXON (Landingpage /synaxon).
-- Der konkrete Herkunftswert (z.B. "synaxon-postkarte") steht zusätzlich in
-- utm_campaign, utm_source trägt "synaxon".
--
-- Hinweis: In PostgreSQL darf ein per ALTER TYPE ... ADD VALUE hinzugefügter
-- Enum-Wert nicht in derselben Transaktion verwendet werden – das tun wir hier
-- auch nicht (nur Schema-DDL), daher unkritisch.
ALTER TYPE "LeadSource" ADD VALUE 'SYNAXON';
