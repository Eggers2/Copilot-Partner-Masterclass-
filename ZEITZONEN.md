# Zeitzonen im CRM

## Die Regel

**In der Datenbank steht echtes UTC. Umgerechnet wird nur an den Rändern, gegen Europe/Berlin.**

Alle Umrechnungen liegen in `lib/datetime.ts` und nirgendwo sonst. Die Zeitzonendaten kommen
aus der IANA-Datenbank über [luxon](https://moment.github.io/luxon/), es gibt kein hartkodiertes
`+1` oder `+2`. Damit stimmt die Umstellung zwischen Sommer- und Winterzeit automatisch, auch
rückwirkend für alte Termine.

| Richtung | Funktion | Wo |
|---|---|---|
| Formular → DB | `berlinInputToUtc("2026-09-16T11:30")` | `app/admin/actions.ts` |
| Nur-Datum → DB | `berlinDayToUtc("2026-09-16")` → 12:00 Berlin | MCP-Follow-up |
| DB → Anzeige | `formatBerlinDateTime(wert)` | Listen, Widgets, Timeline |
| DB → Formular | `utcToBerlinInput(wert)` | `datetime-local`-Vorbelegung |
| DB → frei | `formatBerlin(wert, { weekday: "long", … })` | Wochentag, langer Monat |

### Kalenderdaten sind keine Zeitpunkte

`Task.deadline` und `FirstCallScore.followUpDate` (`@db.Date`) sowie die Klassen-Laufzeiten
`kickoffDate`, `startDate`, `endDate` sind **Tage**, keine Zeitstempel. Sie liegen auf 00:00 UTC
und werden **nicht** umgerechnet, sonst rutschen sie einen Tag zurück. Dafür gibt es
`calendarDateToUtc`, `formatCalendarDate`, `calendarDateInput` und `formatCalendar`.

### Was nie wieder in den Code darf

```ts
new Date("2026-09-16T11:30")              // hängt an der Prozess-Zeitzone, auf Railway UTC
wert.toISOString().slice(0, 16)           // gibt den rohen UTC-Wert als Ortszeit aus
wert.toLocaleString("de-DE")              // ohne timeZone: Server ≠ Browser
`${d.getFullYear()}-${d.getMonth() + 1}`  // lokale Getter, gleiche Falle
```

Genau diese vier Muster waren der Bug: der Admin schrieb und las naiv, der MCP-Server rechnete
korrekt in UTC um. Dieselbe Zeile stand dadurch je nach Blickwinkel zwei Stunden daneben.

## Was die Umstellung geändert hat

- `Lead.followUpAt` wurde einmalig von naiver Ortszeit auf echtes UTC gehoben
  (Migration `20260911120000_zeitzonen_konvention_followup`). **Die angezeigte Uhrzeit bleibt
  dabei exakt gleich**, weil sich Migration und Anzeigeumstellung gegenseitig aufheben.
- `Webinar.scheduledAt`, `KlasseTermin.datum` und die Connect-Day-Felder standen schon vorher
  korrekt in UTC und wurden **nicht** angefasst.
- System-Zeitstempel (`createdAt` und Verwandte) wurden im Admin bisher als UTC angezeigt und
  zeigen jetzt deutsche Ortszeit. Das ist die einzige gewollte sichtbare Änderung.

## Ablauf beim Ausrollen

Datenmigration und Anzeigeumstellung müssen **zusammen** live gehen. Deshalb liegt die Migration
in `prisma/migrations/`: Railway führt beim Start `prisma migrate deploy` aus, bevor der neue
Server hochkommt (siehe `railway.toml`). Ein getrenntes Ausrollen ist gar nicht erst möglich.

### Der einfache Weg: Admin → Zeitzonen

Nach dem Deployment steht das vollständige Ergebnis unter `/admin/zeitzonen`. Kein Terminal, kein
Snapshot vorweg.

Das geht, weil die Sicherungstabelle je Lead den alten **und** den neuen Wert hält. Beide Seiten
des Vergleichs lassen sich daraus nachträglich ausrechnen:

| | Quelle |
|---|---|
| Anzeige vorher | `naiveReading(alt_wert)`, so gab der alte Code den Wert aus |
| Anzeige nachher | `formatBerlinDateTime(neu_wert)`, so gibt der neue Code ihn aus |

Die Seite zeigt oben ein Gesamturteil, darunter jede Zeile mit gespeichertem und angezeigtem Wert
vorher und nachher, und listet Termine auf, die sich zwangsläufig verschieben würden. Wurde ein
Termin nach der Migration von Hand geändert, weist die Seite das getrennt aus statt es als Fehler
zu melden. Vor dem Deployment sagt sie, dass die Migration noch nicht gelaufen ist.

### Der Weg über das Terminal

Nur nötig, wenn du den Trockenlauf vorab sehen oder eine Datei zum Archivieren haben willst.

```bash
# 1. Vorher-Snapshot ziehen, gegen die Produktionsdatenbank
npm run tz:snapshot -- --stand=vorher --out=vorher.json

# 2. Trockenlauf: zeigt je Lead alt/neu und die Anzeige vorher/nachher.
#    Schreibt nichts. Prüft insbesondere, ob Datensätze existieren, die sich
#    zwangsläufig verschieben würden.
npm run tz:migrate -- --sicherung=sicherung.json

# 3. Deployen. Die Migration läuft automatisch mit.

# 4. Nachher-Snapshot ziehen
npm run tz:snapshot -- --stand=nachher --out=nachher.json

# 5. Vergleichen. Erwartet: "Null Abweichungen bei Terminen und Kalenderdaten."
npm run tz:vergleich -- vorher.json nachher.json
```

Schritt 5 endet mit Exit-Code 1, sobald auch nur ein Termin abweicht. Dann das Deployment
zurückrollen und den Stand melden, nicht nachbessern.

### Zurücknehmen

Die alten Werte stehen in `zeitzonen_migration_followup`:

```sql
UPDATE "waitlist" w SET "followUpAt" = m.alt_wert
FROM zeitzonen_migration_followup m WHERE w.id = m.lead_id;
```

Danach das vorherige Deployment wiederherstellen. Beides gehört zusammen.

### Idempotenz

`zeitzonen_migration_followup` hält fest, welcher Lead schon migriert wurde. Ein zweiter Lauf
überspringt diese Zeilen und ändert nichts. Das gilt für die SQL-Migration und für
`scripts/tz-migrate-followup.ts` gleichermaßen, beide teilen sich die Tabelle.

## Der eine Fall, der sich nicht auflösen lässt

Fällt die gespeicherte Uhrzeit eines Altwerts in die **übersprungene Stunde der
Frühjahrsumstellung** (z.B. 29.03.2026 02:30, diese Ortszeit existiert in Deutschland nicht),
dann gibt es keine Umrechnung, die die Anzeige unverändert lässt. Solche Zeilen werden von der
Migration bewusst **nicht** angefasst und vom Trockenlauf namentlich aufgelistet. Ihre Anzeige
verschiebt sich trotzdem, weil der neue Anzeigecode den unmigrierten Wert umrechnet. Das ist
eine Entscheidung für den Betreiber, keine für das Skript.

Zum Stand der Analyse (11.09.2026) gab es in der Produktionsdatenbank **keinen** solchen
Datensatz. Der Trockenlauf sagt es dir vor jedem Ausrollen erneut.

## Tests

```bash
npm test
```

`tests/zeitzonen.test.ts` prüft Sommer-, Winter- und beide Umstellungstermine, jeweils über den
Admin-Schreibpfad und über den MCP-Schreibpfad geschrieben und über beide Lesepfade wieder
gelesen. Ergibt ein Pfad etwas anderes als der andere, ist der Test rot. Zusätzlich abgesichert:
die Migrations-Identität (Anzeige vorher = Anzeige nachher) an echten Produktionswerten, und
die Unabhängigkeit von der Zeitzone des Servers.
