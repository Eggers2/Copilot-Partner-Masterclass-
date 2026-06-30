-- Termin-Erweiterung: Links, Transkript & KI-Protokoll
-- Pro Termin lassen sich SharePoint-Aufzeichnung und Teams-Link hinterlegen,
-- ein Transkript hochladen und daraus eine kompakte Zusammenfassung sowie ein
-- ausführliches Meetingprotokoll generieren. protokoll_gesendet_am hält fest,
-- wann das Protokoll an die Teilnehmer versendet wurde.

ALTER TABLE "klasse_termine"
    ADD COLUMN "video_url" TEXT,
    ADD COLUMN "teams_link" TEXT,
    ADD COLUMN "transkript" TEXT,
    ADD COLUMN "transkript_dateiname" TEXT,
    ADD COLUMN "zusammenfassung" TEXT,
    ADD COLUMN "protokoll" TEXT,
    ADD COLUMN "protokoll_gesendet_am" TIMESTAMP(3);
