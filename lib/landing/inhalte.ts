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

export interface PartnerVideo {
  slug: string;
  name: string;
  firma: string;
  klasse: string;
  /** Kernaussage als Überschrift der Karte. */
  titel: string;
  /** ISO-8601-Dauer für VideoObject, z.B. "PT1M12S". */
  dauer: string;
  dauerLabel: string;
  /**
   * Abschrift, leicht geglättet. Google und KI-Tools lesen nur diesen Text,
   * nicht das Video selbst. Unklare Stellen sind weggelassen statt geraten.
   */
  abschrift: string;
}

/** Interviews vom IAMCP-Treffen. Dateien unter public/videos/<slug>.mp4 und .jpg. */
/** Veröffentlichungsdatum auf der Seite, für VideoObject.uploadDate. */
export const VIDEOS_VEROEFFENTLICHT = "2026-10-04";
export const PARTNER_VIDEOS: PartnerVideo[] = [
  {
    slug: "marvin-nitschke",
    name: "Marvin Nitschke",
    firma: "selobia GmbH",
    klasse: "Klasse 2",
    titel: "Nach dem ersten Workshop war die Nervosität verflogen",
    dauer: "PT1M34S",
    dauerLabel: "1:34",
    abschrift:
      "Die Masterclass hat uns auf jeden Fall erste Erfolge beschert. Wir konnten aufgrund dessen, was wir gelernt haben, unser Geschäftsmodell aufbauen und haben dieses Geschäftsmodell direkt bei unseren Kunden angeboten. Wir haben auch erste Aufträge erzielt und erste Workshops abgehalten. Was ich auf jeden Fall empfehlen würde: sich jemanden ranholen, wie beispielsweise Alex, der das Wissen aus seinen Erfahrungen komprimiert weitergibt, damit man nicht bei null anfängt. Auf der Basis schaut man dann, was habe ich für Kunden, was kann ich ihnen anbieten, wie kann meine Reise aussehen und wie kann ich mit Copilot Geld verdienen. Herausforderungen hatten wir einige. Gerade weil es ein neues Geschäftsmodell ist, waren wir uns nicht ganz sicher, wie wir das Ganze beim Kunden platzieren, was für Rückfragen kommen und wie das Feedback vom Kunden ist. Aber nach dem ersten Workshop waren die ganze Anspannung und die Nervosität, die man bei einem neuen Geschäftsmodell hat, wie verflogen. Jetzt freuen wir uns schon, wenn wir einen Workshop bei einem Kunden machen. Allein machen kostet immer mehr Zeit und Nerven. Vor allem macht man dann am Anfang die Fehler, die jemand anderes, beispielsweise Alex, schon gemacht hat. Darauf haben wir nicht so viel Lust. Wir wollen in der Mitte starten, aus den Fehlern lernen, die schon gemacht wurden, und direkt auf einem guten Einstiegsniveau sein, um beim Kunden Mehrwert zu bringen.",
  },
  {
    slug: "daniel-schwanitz",
    name: "Daniel Schwanitz",
    firma: "QM Software GmbH",
    klasse: "Klasse 2",
    titel: "Endlich ein Fahrplan statt Versuch und Irrtum",
    dauer: "PT1M36S",
    dauerLabel: "1:36",
    abschrift:
      "Ich habe mich motiviert, bei der Masterclass mitzumachen, um zu verstehen, wie Copilot funktioniert, wie wir das in den Markt bringen können und wie der gesamte Ablauf strukturiert sein kann. Die Schwierigkeit, bevor wir mit der Masterclass begonnen haben, war, dass wir eher unstrukturiert waren und keinen wirklichen Fahrplan hatten, wie wir das Ganze umsetzen und wie der Weg zur wirklichen Nutzung von Copilot ist. Der Vorteil, das Ganze in der Gemeinschaft zu machen: Es hat Workshop-Charakter, und jeder bringt seine Ideen und Erfahrungen aus Kundenprojekten und Anfragen mit ein. Daraus kann man das gesamte Konzept weiterentwickeln. Denn was heute gut ist, muss morgen nicht mehr gut sein, vielleicht müssen wir übermorgen etwas ganz anderes machen. Das ist ein Thema, das wir fortlaufend beobachten und immer wieder neu durchdenken sollten. Partner, die sich mit Copilot noch gar nicht beschäftigt haben, sollten es unbedingt erst einmal selbst einsetzen. Es ist ein absoluter Gamechanger im eigenen Unternehmen. Wenn ich es selbst als Tool nutze und viele Verbesserungen habe, kann ich es auch leichter beim Kunden anbringen, weil ich die Möglichkeiten und Automatismen verstehe, die dahinterstecken.",
  },
  {
    slug: "josef-haider",
    name: "Josef Haider",
    firma: "Know How! AG",
    klasse: "Klasse 1",
    titel: "Nicht mehr allein kämpfen",
    dauer: "PT1M37S",
    dauerLabel: "1:37",
    abschrift:
      "Was uns an der Masterclass am meisten begeistert: Wir haben nicht mehr das Gefühl, für uns allein kämpfen zu müssen, sondern können uns unter Anleitung in einer Community mit anderen austauschen und uns gegenseitig challengen. Wir sind Teilnehmer der Masterclass, weil wir nach zwei Jahren Arbeit mit Copilot festgestellt haben, dass wir noch zu sehr an der Oberfläche kratzen und uns tiefer in das Thema reinfuchsen müssen. Der Vorteil, das gemeinsam zu tun, ist genau dieses gegenseitige Challengen. Neben den Q&A-Sessions gibt es auch Teilnehmer-Sessions, die wir selbst leiten und gestalten, und in denen wir uns gegenseitig unsere Projekte vorstellen. Unsere erste Hürde war, den Personenkreis für die Teilnahme sinnvoll zusammenzustellen, damit der Outcome für die Know How! AG der ist, den wir erwarten: zum einen Wissen, zum anderen die Marketingmittel, um dieses Wissen auch nach draußen zu vermarkten. Wer sich noch nicht mit Copilot beschäftigt hat, dem würde ich empfehlen, erst einmal selbst Informationen zu sammeln, dann aber den Einstieg in diese Community zu suchen und sich der Masterclass anzuschließen. Die nächste startet bestimmt.",
  },
  {
    slug: "manuel-gohan",
    name: "Manuel Gohan",
    firma: "GOHAN GmbH",
    klasse: "Klasse 1",
    titel: "Als kleines Systemhaus nicht den Anschluss verlieren",
    dauer: "PT1M12S",
    dauerLabel: "1:12",
    abschrift:
      "Wir sind ein kleines Systemhaus, und es ist schwierig für uns, mit wenig Ressourcen KI-Wissen aufzubauen. Das war die Motivation. Ich kann die Ressourcen nicht herzaubern. Deswegen wollten wir die Masterclass mitmachen, das Know-how über die Masterclass aufbauen und nicht den Anschluss verlieren. Vor dem ersten Workshop war die größte Herausforderung das Zeitthema. Man muss ja erst einmal ins Doing kommen. Aber als es dann losging, war es sensationell, eine Guideline zu bekommen, an der man sich entlanghangeln kann. In der Masterclass kann man sich austauschen und das Know-how einfach abgreifen. Das Schöne ist auch, dass keiner Angst hat, Wissen zu teilen, weil er denkt, einer ist besser als er. Es geht alles so schnell voran. Deswegen ist es besser, sich zusammenzutun. Wenn du dich noch nicht mit Copilot beschäftigt hast, mach es jetzt, sonst ist es zu spät.",
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
