import type { Metadata } from "next";
import Link from "next/link";
import { PromptKarte } from "@/components/uebungen/PromptKarte";

// Übungsseite zum Ingram Micro · Microsoft Copilot Bootcamp, Zürich, 16.11.2026.
// Alle Prompts des Tages zum Kopieren. Erreichbar nur über den QR-Code auf den
// Übungsfolien: noindex, nicht in Navigation oder Sitemap. Keine Lead-Erfassung.

export const metadata: Metadata = {
  title: "Übungen und Prompts | Copilot Bootcamp Zürich",
  description: "Alle Prompts aus dem Copilot Bootcamp zum Kopieren.",
  robots: { index: false, follow: false },
};

function Block({ id, titel, children }: { id: string; titel: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mt-10 scroll-mt-4 border-t border-slate-3 pt-6">
      <h2 className="m-0 mb-3 font-body text-sm font-bold uppercase tracking-[0.18em] text-white/55">
        {titel}
      </h2>
      {children}
    </section>
  );
}

function Uebung({ eyebrow, titel, children }: { eyebrow: string; titel: string; children: React.ReactNode }) {
  return (
    <div className="mb-5 rounded-[14px] bg-slate-2 p-5">
      <p className="m-0 text-xs font-bold uppercase tracking-[0.18em] text-green">{eyebrow}</p>
      <h3 className="m-0 mt-1 mb-2 font-heading text-2xl font-bold text-white">{titel}</h3>
      {children}
    </div>
  );
}

const hinweis = "m-0 mt-3 text-[15px] leading-relaxed text-white/65";
const liste = "m-0 mb-1 list-decimal pl-5 text-base leading-relaxed text-white [&>li]:my-1";
const b = "font-semibold text-green";

export default function Page() {
  return (
    <main className="min-h-screen bg-slate font-body flex flex-col">
      <header className="border-b border-slate-2">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-[56px] flex items-center">
          <Link href="/" className="font-heading font-bold text-white text-xl">
            Next<span className="text-green">Skills</span>
          </Link>
        </div>
      </header>

      <div className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 pt-8 pb-14">
        <p className="m-0 text-xs font-bold uppercase tracking-[0.18em] text-green">
          Ingram Micro · Microsoft Copilot Bootcamp · Zürich · 16.11.2026
        </p>
        <h1
          className="font-heading font-extrabold text-white leading-[1.1] m-0 mt-2"
          style={{ fontSize: "clamp(30px, 5vw, 44px)" }}
        >
          Übungen und Prompts
        </h1>
        <p className="text-white/70 text-base sm:text-lg mt-3 mb-5 leading-relaxed">
          Alle Prompts des Tages zum Kopieren. Auf „Kopieren“ tippen, in Copilot einfügen.
        </p>
        <nav className="flex flex-wrap gap-2">
          {[1, 2, 3, 4].map((n) => (
            <a
              key={n}
              href={`#block-${n}`}
              className="rounded-full border border-green px-4 py-1.5 text-sm font-semibold text-green hover:bg-green hover:text-slate"
            >
              Block {n}
            </a>
          ))}
        </nav>

        <Block id="block-1" titel="Block 1 · Grundlagen und Wow-Demos">
          <Uebung eyebrow="Zum Ausprobieren" titel="Superhelden-Prompt">
            <p className={hinweis}>Copilot Chat öffnen, auf „Arbeit“ stellen.</p>
            <PromptKarte
              label="Prompt"
              text="Schau dir die E-Mails und Kommentare in Teams-Meetings an, die ich in den letzten zwei Wochen verschickt habe. Basierend auf der obigen Analyse: Welcher Superheld repräsentiert meinen Arbeitsstil am besten? Was wären meine Superkräfte?"
            />
          </Uebung>
        </Block>

        <Block id="block-2" titel="Block 2 · Agenten">
          <Uebung eyebrow="Hands-on · 8 Minuten" titel="Skills zum Mitmachen">
            <PromptKarte
              label="1 · Excel"
              text="Ich will den neuen Excel-Skill „Clean Data“ benutzen. Bitte erstelle mir eine Excel-Datei, in der die Daten nicht ganz sauber aufgearbeitet sind, damit ich das testen kann."
            />
            <p className={hinweis}>
              Tabelle öffnen, im Copilot-Bereich eingeben: <span className={b}>@clean-data</span>
            </p>
            <PromptKarte
              label="2 · Copilot Chat, Arbeit"
              text="Was habe ich in den letzten sieben Tagen in Mails, Chats und Meetings zugesagt und noch nicht erledigt? Liste mit Datum, Empfänger und Quelle."
            />
            <p className={hinweis}>
              <span className={b}>3 · PowerPoint:</span> Eigenes Deck öffnen, Copilot-Bereich, + › Fähigkeiten
              auswählen › „Diese Folie visualisieren“.
            </p>
          </Uebung>

          <Uebung eyebrow="Übung · 15 Minuten" titel="Agent mit Stresstest">
            <ol className={liste}>
              <li>
                <span className={b}>Vorhersagen:</span> Drei Testfragen notieren. Eine, die eure Website
                beantwortet. Eine, die dort fehlt, zum Beispiel der Stundensatz. Eine themenfremde. Was wird
                der Agent tun?
              </li>
              <li>
                <span className={b}>Bauen:</span> Copilot › Neuer Agent › Konfigurieren. Name, Anweisung, unter
                Wissen eure Website eintragen, „Nur angegebene Quellen“ einschalten.
              </li>
              <li>
                <span className={b}>Testen:</span> Die drei Fragen im Testbereich stellen. Ergebnis neben die
                Vorhersage schreiben.
              </li>
              <li>
                <span className={b}>Nachschärfen:</span> Anweisung ändern, bis der Agent bei Frage 2 offen sagt,
                dass er es nicht weiß.
              </li>
            </ol>
            <PromptKarte
              label="Anweisung für den Start · Firmenname ersetzen"
              text="Du beantwortest Fragen zu [Firmenname] auf Basis der hinterlegten Website."
            />
            <PromptKarte
              label="Erstellen gesperrt? Gleicher Test im Copilot Chat"
              text="Beantworte meine Fragen nur auf Basis von [eure Website]. Steht etwas dort nicht, sag das offen und rate nicht."
            />
          </Uebung>
        </Block>

        <Block id="block-3" titel="Block 3 · Adoption und Geschäftsmodell">
          <Uebung eyebrow="Übung · 7 Minuten" titel="Zeitfresser-Inventur">
            <p className={hinweis}>Abkürzung für Schritt 1 und 2. Copilot Chat, „Arbeit“.</p>
            <PromptKarte
              label="Prompt"
              text="Analysiere meine Termine, E-Mails und Dokumente der letzten drei Wochen. Welche Aufgaben wiederholen sich und kosten mich regelmäßig Zeit? Nenne die fünf größten mit geschätztem Aufwand pro Woche."
            />
          </Uebung>

          <Uebung eyebrow="Übung · 8 Minuten" titel="Rollenspiel: zu teuer">
            <ol className={liste}>
              <li>
                <span className={b}>Starten:</span> Prompt einfügen. Copilot spielt den Kunden.
              </li>
              <li>
                <span className={b}>Antworten:</span> Drei Runden, schriftlich.
              </li>
              <li>
                <span className={b}>Auswerten:</span> Feedback lesen. Den einen Satz notieren, den ihr beim
                nächsten Kunden anders sagt.
              </li>
            </ol>
            <PromptKarte
              label="Prompt"
              text={
                "Spiele einen kritischen Kunden, der unser Angebot zu teuer findet.\nIch bin der Verkäufer und antworte dir.\nBleib hartnäckig und bring in jeder Runde einen neuen Einwand.\nNach drei Runden beendest du das Rollenspiel und gibst mir ehrliches Feedback: Was war überzeugend, was nicht, was hätte ich besser sagen können?"
              }
            />
          </Uebung>
        </Block>

        <Block id="block-4" titel="Block 4 · Secure Productivity">
          <Uebung eyebrow="Übung · 8 Minuten" titel="Richtlinie in fünf Fragen">
            <p className={hinweis}>
              Prompt kopieren, die fünf Zeilen mit euren Stichworten füllen, absenden.
            </p>
            <PromptKarte
              label="Prompt"
              text={
                "Schreibe eine KI-Richtlinie auf einer Seite für unser Unternehmen. Nutze nur meine fünf Entscheidungen. Wo ich nichts entschieden habe, schreibe OFFEN und erfinde nichts.\n\n1 Erlaubte und nicht erlaubte KI-Tools:\n2 Daten, die nie in ein KI-Tool dürfen:\n3 Wer prüft Ergebnisse, bevor sie zum Kunden gehen:\n4 Wer darf Agenten bauen und teilen:\n5 Ansprechperson bei Fragen und Vorfällen: "
              }
            />
          </Uebung>

          <Uebung eyebrow="Übung · 5 Minuten" titel="Ready for Production?">
            <p className={hinweis}>
              Runde 1 auf Papier für einen echten Kunden. Runde 2 als Umfrage für euer eigenes Haus, zehn
              Fragen, anonym.
            </p>
            <a
              href="https://forms.cloud.microsoft/e/W1YqziU9GQ"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-block rounded-lg bg-green px-4 py-2 text-[15px] font-bold text-slate hover:bg-green-d"
            >
              Zur Umfrage
            </a>
          </Uebung>
        </Block>
      </div>

      <footer className="border-t border-slate-2 py-5">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 flex gap-5 text-sm text-white/45">
          <Link href="/impressum" className="hover:text-white">Impressum</Link>
          <Link href="/datenschutz" className="hover:text-white">Datenschutz</Link>
        </div>
      </footer>
    </main>
  );
}
