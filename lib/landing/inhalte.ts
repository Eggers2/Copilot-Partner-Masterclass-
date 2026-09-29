import type { LandingKlasse } from "@/lib/landing/klassen";

/**
 * Texte der Startseite, die an mehreren Stellen gebraucht werden: auf der
 * Seite selbst, im JSON-LD (FAQPage, Course) und in /llms.txt. Wer hier eine
 * Antwort ändert, ändert sie überall gleich. Widersprüchliche Angaben
 * zitieren KI-Tools seltener.
 */

// Marketing-Kennzahlen, bewusst im Code gehalten (Summe der Klassen 1 bis 3).
export const PARTNER_COUNT = "75+";
export const MITARBEITER_COUNT = "400+";

export const PROGRAMM_DEFINITION =
  "Die Copilot Partner Masterclass ist ein 12-monatiges Online-Programm der NextSkills GmbH. Es bereitet Microsoft-Partner und IT-Systemhäuser darauf vor, Microsoft 365 Copilot nicht nur als Lizenz zu verkaufen, sondern Beratung, Workshops und Adoption-Projekte dafür anzubieten.";

export const PROGRAMM_INHALT =
  "Teilnehmende erhalten über 50 On-Demand-Videos, fertige Pitch Decks, Angebotsvorlagen und Workshop-Formate, zwei Live-Sessions pro Monat mit Microsoft MVPs sowie eine eigene Community in Microsoft Teams. Dazu gibt es die Zertifizierung als Copilot-Berater und einen Eintrag auf der Partnerkarte von copilotberater.de.";

export interface Stimme {
  name: string;
  firma: string;
  klasse: string;
  zitat: string;
}

/**
 * Sinngemäß aus den Q&A-Sessions (K1 #06 bis #08, K2 #06). Die Freigabe der
 * Personen wird im Nachgang eingeholt; wer nicht zustimmt, fliegt hier raus.
 */
export const STIMME_HIGHLIGHT: Stimme & { vorher: string; vorherLabel: string; nachher: string; nachherLabel: string; kontext: string } = {
  name: "Martin Busslinger",
  firma: "Dreikom AG",
  klasse: "Klasse 1",
  zitat:
    "Im Geschäftsleitungs-Workshop hat der Kunde seine Use Cases selbst benannt. Danach habe ich mit dem Return-on-Invest-Rechner aus der Masterclass gezeigt, was er damit sparen kann. Beim gemeinsamen Ausfüllen hat die Geschäftsleitung selbst erkannt, wie viel Potenzial in ihren eigenen Abläufen steckt. Am Ende war klar: Wir starten sofort. 50.000 Franken für die Beratung wurden direkt durchgewunken.",
  vorher: "2 Std.",
  vorherLabel: "Geschäftsleitungs-Workshop",
  nachher: "50.000 CHF",
  nachherLabel: "Beratungsbudget sofort freigegeben",
  kontext: "Sein erster Workshop, bei einem Produktionsbetrieb aus dem eigenen Kundenstamm",
};

export const STIMMEN: Stimme[] = [
  {
    name: "Georg Gehring",
    firma: "GME GmbH",
    klasse: "Klasse 1",
    zitat:
      "Ich habe den Ansatz aus der Masterclass genommen: erst ein Unternehmer-Workshop mit der Geschäftsleitung, statt KI mit der Gießkanne zu verteilen. Das hat der Kunde sofort verstanden. Den Workshop hat er so gut wie gekauft.",
  },
  {
    name: "Anna Kassimir",
    firma: "ACP",
    klasse: "Klasse 2",
    zitat:
      "Aus den Modulen der Copilot Masterclass haben wir unser eigenes Portfolio abgeleitet. Es begleitet Kunden von den ersten strategischen Überlegungen bis zur nachhaltigen Nutzung und schafft die Grundlage für eine skalierbare und zukunftssichere Verankerung von KI in den Unternehmensprozessen. Die ersten Kundenworkshops wurden bereits erfolgreich durchgeführt.",
  },
  {
    name: "Franziska Kufner",
    firma: "COC AG",
    klasse: "Klasse 2",
    zitat:
      "Wir haben wahnsinnig viel mitgenommen und schon einen Geschäftsleitungs-Workshop verkauft. Aus der Masterclass heraus haben wir sogar einen eigenen Podcast gestartet. Ohne die Masterclass hätten wir uns das nicht getraut.",
  },
  {
    name: "Jan Göbel",
    firma: "CodeKlar GmbH",
    klasse: "Klasse 2",
    zitat:
      "Für Bestandskunden machen wir kurze Webinare zu den Basics, etwa Copilot in Excel oder Outlook. Das kommt extrem gut an. Wer die Kunden dort abholt, baut Vertrauen auf, und dann kommen die Folgeprojekte.",
  },
  {
    name: "Marc Bayer",
    firma: "SIT-Solutions",
    klasse: "Klasse 1",
    zitat:
      "Um jeden Schritt aus der Masterclass bauen wir ein Managed-Service-Produkt, vom Security-Check bis zum Discovery-Workshop. So wird Copilot für uns kein Einmalprojekt.",
  },
  {
    name: "Josef Haider",
    firma: "Know How! AG",
    klasse: "Klasse 1",
    zitat:
      "Der Kunde hatte Copilot vorher mit einem anderen Dienstleister getestet und war nicht zufrieden. Den zweiten Anlauf hat er uns anvertraut. Wir haben oben angefangen, mit Interviews und einem Workshop für die Geschäftsleitung. Daraus sind drei klare Use Cases entstanden und danach der Auftrag für den Rollout.",
  },
];

export interface Faq {
  q: string;
  a: string;
}

/** Sachfragen zuerst (so formuliert, wie sie in Google oder ChatGPT gestellt werden), danach Einwände. */
export function buildFaqs(offen: LandingKlasse): Faq[] {
  const plaetze = offen.capacity != null ? ` Es gibt ${offen.capacity} Plätze.` : "";
  return [
    {
      q: "Wann startet die nächste Copilot Partner Masterclass?",
      a: `${offen.name} startet im ${offen.startMonat} und läuft 12 Monate. Die Bewerbung ist ab sofort offen.${plaetze}`,
    },
    {
      q: "Was kostet die Copilot Partner Masterclass?",
      a: "Es gibt drei Pakete, je nachdem wie viele Mitarbeitende teilnehmen: bis 3, bis 6 oder bis 15. Die Konditionen besprechen wir persönlich im Kennenlerngespräch. Ein einziger Copilot-Beratungstag bringt 1.200 bis 2.500 €, das Programm rechnet sich also schnell.",
    },
    {
      q: "Findet die Masterclass online statt?",
      a: "Ja. Alle Videos sind on demand abrufbar, die Live-Sessions und die Community laufen in Microsoft Teams. Es gibt kein neues Tool und keine Reisezeit.",
    },
    {
      q: "Für wen ist das Programm geeignet?",
      a: "Für Geschäftsführung und Vertrieb von Microsoft-Partnern und Systemhäusern im DACH-Raum, die Copilot-Beratung als eigenes Geschäftsfeld aufbauen wollen. Technische Consultants profitieren direkt von den fertigen Frameworks und Templates.",
    },
    {
      q: `Was passiert, wenn ${offen.name} ausgebucht ist?`,
      a: "Dann setzen wir Sie auf die Warteliste für die nächste Klasse und informieren Sie als Erste, sobald die Bewerbung öffnet.",
    },
    {
      q: "Was passiert nach meiner Bewerbung?",
      a: "Alexander Eggers oder ein Teammitglied meldet sich persönlich innerhalb von 24 Stunden. Direkter Austausch, kein automatisierter Prozess.",
    },
    {
      q: "Wir haben keine Zeit für ein weiteres Programm.",
      a: "Die Masterclass ist bewusst neben dem Tagesgeschäft konzipiert. Alle Videos sind on demand abrufbar, zwischen Projekten, abends, im eigenen Tempo. Die Live-Sessions sind optional. Nicht handeln kostet mehr Zeit: Kunden, die zu besser positionierten Wettbewerbern abwandern, müssen erst wieder zurückgewonnen werden.",
    },
    {
      q: "Das ist uns zu teuer.",
      a: "Ein einziger Copilot-Beratungstag bringt zwischen 1.200 € und 2.500 €. Das Programm amortisiert sich also mit dem ersten abgerechneten Copilot-Adoption-Kunden. Die eigentliche Frage ist, ob Sie es sich leisten können, es nicht zu tun, während Ihre Kunden aktiv nach Copilot-Beratung fragen.",
    },
    {
      q: "Wir schauen noch, der Markt ist noch nicht reif.",
      a: `Das Zeitfenster schließt sich in 12 bis 18 Monaten. Wer sich jetzt positioniert, prägt seinen regionalen Markt. Über ${PARTNER_COUNT.replace("+", "")} Systemhäuser haben diesen Moment bereits erkannt. Wer wartet, verkauft weiter nur Lizenzen mit sinkenden Margen.`,
    },
    {
      q: "Das können wir auch selbst aufbauen.",
      a: "Natürlich. Der Eigenaufbau dauert erfahrungsgemäß 6 bis 12 Monate: Curriculum entwickeln, Demo-Umgebungen bauen, Vertriebsmaterial erstellen, Beratungsansatz testen. In dieser Zeit fragen Ihre Kunden. Die Masterclass liefert alles fertig und sofort einsetzbar, aus echter Systemhaus-Praxis.",
    },
  ];
}
