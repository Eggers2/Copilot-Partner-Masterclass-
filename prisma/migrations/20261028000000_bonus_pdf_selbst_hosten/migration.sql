-- Sofort-Bonus der Wartelisten-Bestätigung liegt jetzt in der App
-- (public/downloads) statt bei Wix. Ersetzt nur die alte URL, damit
-- eventuell schon bearbeitete Texte der Vorlage erhalten bleiben. Existiert
-- die Vorlage noch nicht, legt ensureEmailTemplates sie mit der neuen URL an.
UPDATE "email_templates"
SET "aktualisiert_am" = NOW(),
    "html" = REPLACE("html", 'https://8db8c715-1a96-4b57-a5f9-9ce732377cc1.usrfiles.com/ugd/8db8c7_b511a84998704756820775d08f75e1f2.pdf', 'https://www.copilotberater.de/downloads/Partner-Guide_3_Fehler_Copilot-Pitch.pdf')
WHERE "key" = 'warteliste_bestaetigung'
  AND "html" LIKE '%usrfiles.com%';
