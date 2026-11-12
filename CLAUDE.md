# EGC-Energie Vertriebsportal

Vertriebs-CRM für EGC-Energie (Energate-Consulting), B2B-Energieberatung im
Saarland und in Rheinland-Pfalz. Deutschsprachig, komplett.

## Das Wichtigste zuerst

- **Alles auf Deutsch.** Oberfläche, Kommentare, Commit-Nachrichten, Gespräch
  mit dem Nutzer. Keine englischen Fachwörter, wo es ein deutsches gibt
  („Lieferstelle" statt „delivery point").
- **Der Nutzer arbeitet ausschließlich am Handy.** Jede Anleitung muss am
  iPhone in Chrome durchführbar sein. Keine Schritte, die einen Rechner
  voraussetzen, ohne das zu sagen.
- **`App.jsx` ist eine einzige Datei mit über 10.000 Zeilen.** Das ist
  gewollt. Nicht ohne Auftrag aufteilen.
- **Nach jeder Änderung bauen** (siehe unten). Ein Fehler im Build bedeutet
  eine weiße Seite für den gesamten Vertrieb.

## Bauen und prüfen

```bash
cd /home/claude/crm
npx esbuild App.jsx --loader:.jsx=jsx --outfile=/tmp/pruef.js   # schnelle Syntaxprüfung
npm install && npm run build                                     # vollständiger Bau
```

Der Bau erzeugt `dist/` mit Inhaltskennung im Dateinamen
(`app.8d60adf6.js`). `dist/` ist in `.gitignore` und gehört nicht ins
Repository — Netlify baut selbst.

**Versionskonstante hochzählen.** In `App.jsx` oben steht:

```js
const VERSION = "v5.7 · 11.09.2026 · Smartmeter-Ablauf und Firmenanteil";
```

Bei jeder ausgelieferten Änderung erhöhen. Die Angabe erscheint auf der
Anmeldemaske und unten in der Seitenleiste und ist die einzige Möglichkeit
festzustellen, ob der Nutzer die aktuelle Fassung testet — er hat mehrfach
Fehler gemeldet, die längst behoben waren.

## Ausliefern

Push auf `main` → Netlify baut und veröffentlicht automatisch auf
`egc-vertriebsportal.netlify.app` beziehungsweise `portal.egc-energie.de`.

## Aufbau

| Datei | Zweck |
|---|---|
| `App.jsx` | Die gesamte Anwendung |
| `main.jsx` | Einstiegspunkt, hängt App in das DOM |
| `build.mjs` | Bau mit esbuild und Tailwind, Inhaltskennung, `_headers` |
| `index.html` | Grundgerüst, bindet Manifest und Hintergrunddienst ein |
| `sw.js` | Hintergrunddienst für den Betrieb ohne Netz |
| `manifest.json` | Installierbare App |

Innerhalb von `App.jsx` grob in dieser Reihenfolge: Farben und Konstanten,
Hilfsfunktionen (Datum, Zahlen, Dateien, PDF, Excel), Provisionsrechnung,
Bausteine der Oberfläche, die einzelnen Ansichten, zuletzt die Hauptkomponente
mit Zustand, Navigation und Routing.

## Rollen

Vertriebspartner · Teamleiter · Leitung Vertrieb · Kalkulation ·
Vertragsmanagement · Leadmanagement · Finanzbuchhaltung · Beschaffung · Geschäftsführung

Die Navigation ist je Rolle zugeschnitten (`const NAV` in der Hauptkomponente).
**Nicht-Vertriebsrollen haben keine Ziele, Provisionen oder Akquise.** Das war
eine ausdrückliche Vorgabe. Vor dem Ausliefern prüfen, dass keine Rolle
doppelte Menüpunkte bekommt — das ist schon zweimal passiert.

## Der Weg eines Vorgangs

```
entwurf → eingereicht → angefragt → angebot → uebermittelt
       → einreichung → bestaetigt → abgeschlossen
```

Wichtig an den letzten Schritten:

1. Die **Kalkulation** bestätigt, dass der Versorger den Kunden annimmt
   (`bestaetigt`, „Provision offen").
2. Die **Geschäftsführung** erfasst unter *Provision ausstehend* den Eingang
   und bestätigt (`abgeschlossen`).
3. Erst danach sieht der **Vertriebspartner** den Kunden in seiner
   Provisionsliste und das **Vertragsmanagement** in der Vertragsbetreuung.

Diese Reihenfolge nie verkürzen.

## Beschaffung

Externe Rolle. Abgeschlossene Kunden mit Tranchen- oder PPA-Modell übergibt
der Vertrieb (eigene Struktur), das Vertragsmanagement oder die
Geschäftsführung im Vorgang an die Beschaffung. Dabei entsteht ein Datensatz
in `beschaffung` mit einer **Abschrift** der Kundendaten — ohne Aufschlag,
Preise und Provision (die Datenbank entfernt diese Felder zusätzlich). Die
Beschaffung sieht keine Vorgänge, nur diese Aufträge, und darf die Dateien
des zugehörigen Vorgangs lesen (Lastgänge).

**Freie Aufträge:** Beschaffung, GF, VM und Leitung Vertrieb können unter
„Kunde ohne Vorgang planen“ einen Auftrag für einen Kunden anlegen, der im
Portal nicht existiert (Kundendaten von Hand, Lastgang per Upload). Solche
Aufträge haben `frei: true`, keine `anfrageId` und keinen Partner; die
Datenbank erzwingt das (Migration `_09_beschaffung_frei`). Freie Aufträge darf
die Beschaffung auch löschen.

Zugang der Abteilung: `beschaffung@egc-energie.de` (Mitarbeiter-ID
`beschaffung`). Das Passwort steht nicht im Code.

Rechnung (`preiskurve`, `jahresBewertung`, `tranchenStand`, `ampel`):
Terminmarktpreise trägt die Beschaffung je Bewertung von Hand ein
(Cal Base/Peak, wahlweise Quartale). Daraus entsteht eine arbitragefreie
Preiskurve Jahr → Quartal → Monat → Peak/Offpeak → Stunde, optional mit
Tagesprofil aus Day-Ahead-Preisen. Bewertet wird der Lastgang als
Mengen-Hedge (Base = mittlere Offpeaklast, Peak = Mehrlast) plus Struktur.
Gespeichert werden nur Kennzahlen (`bewertung.ergebnis`), nicht die Kurve.
Änderungen an der Rechnung wie bei der Provision in Node nachrechnen:
Eine flache Last muss genau den Base-Preis ergeben, Struktur 0.

**Strom und Erdgas:** Ein Auftrag hat `sparten` (`["strom"]`, `["gas"]` oder
beide; ältere Aufträge ohne Feld gelten als Strom). Strom liegt in
`bewertung`, Erdgas in `bewertungGas`. Empfehlung und abgelegte Pläne
(`plaene`) gelten für den ganzen Auftrag und liegen immer in `bewertung`.
Erdgas rechnet je Gastag (6 bis 6 Uhr): `gaskurve` (Cal Pflicht, Sommer
Apr–Sep, Winter Jan–Mär + Okt–Dez, Quartale; Vorrang Quartal → Saison → Jahr),
`jahresBewertungGas` mit Monatsbändern. Preis = Cal + Saisonanteil + Struktur.
Prüfung in Node: flache Last ergibt genau Cal, Saison und Struktur 0;
überbestimmte Eingaben melden `abweichung`.

**Spotpreise:** Strom-Day-Ahead holt der Browser von Energy-Charts. Erdgas
THE Day-Ahead liegt in der Tabelle `marktpreise` (`markt = 'THE-DA'`, Lesen
nur Beschaffung und Innendienst, Pflege durch Beschaffung/GF per Datei),
Erstbestand 1.1.2025–9.11.2026 aus der EEX-Übersicht von ENGIE. Börsendaten
nicht ins öffentliche Repository schreiben. In den Bewertungsaufträgen unter
„Spotpreise als Excel“ je eine eigene Datei für Strom und für Erdgas
(`stromMappe`, `gasMappe`) — nie beides in einer Datei, ausdrücklicher Wunsch.

Sprache: EGC ist kein Versorger. „Beschaffungsplan für den Kunden“,
„Tranchen beim Versorger“, nie „wir kaufen ein“.

## Provisionsmodell

Aufschlag in ct/kWh × Menge = Gesamtprovision je Lieferjahr.

- **Differenzprovision:** Jeder Beteiligte bekommt seinen Satz, jede Stufe
  darüber die Differenz. Die Ausschüttung entspricht immer dem höchsten Satz
  in der Kette.
- **Firmenanteil:** Nur ein Teil der Gesamtprovision kommt bei EGC an
  (`FIRMENANTEIL`, Vorgabe 75 %, je Versorger überschreibbar). Die Sätze
  rechnen trotzdem auf die volle Gesamtprovision. Was bleibt:
  `Anteil bei EGC − Ausschüttung`.
- **Eigenakquise-Bonus** und **Zielboni** gehen zulasten des Firmenanteils,
  nie zulasten der Overhead-Provision der Teamleiter.

Sätze zum Zeitpunkt dieser Notiz: Vertriebspartner 20, Teamleiter 30,
Leitung Vertrieb 35. Obergrenze der Ausschüttung: 50 Prozent.

**Jede Änderung an der Rechnung nachrechnen**, nicht nur bauen. Bewährt hat
sich, `verteilung` und `gesamtverteilung` aus der Datei zu schneiden und in
Node gegen ein Beispiel von 1.000 € laufen zu lassen.

## Wer welche Zahlen sieht

| Rolle | eigener Anteil | Gesamtaufteilung | Firmenanteil |
|---|---|---|---|
| Vertriebspartner, Teamleiter, Leitung | ja | nein | nein |
| Kalkulation | Anteil des Partners + Aufschlag | nein | nein |
| Finanzbuchhaltung | ja | ja | nein |
| Geschäftsführung | ja | ja | ja |
| Beschaffung | nein | nein | nein |

Das ist eine Vertrauensfrage im Vertrieb, keine Kleinigkeit.

## Daten

Alles liegt im Browser des jeweiligen Geräts (`window.storage`, Schlüssel
`egc-crm:*`). **Es gibt keine echte Anmeldung** — die Passwörter stehen im
Code, die Rollenumschaltung ist eine Demo.

Das Backend ist der nächste große Schritt: Supabase-Schema liegt fertig in
`/mnt/user-data/outputs/backend-schema.sql` (23 Tabellen, 53 Rechteregeln),
Anleitung daneben. Bis dahin gilt: **keine echten Kundendaten, keine
Ausweiskopien.**

## Bekannte Eigenheiten

- **PDF-Erzeugung** ist von Hand gebaut (`erzeugePdf`), im EGC-Design mit
  Logo als eingebettetes JPEG. Zeichen über Codepunkt 255 fallen weg; das
  Eurozeichen wird auf Position 128 abgebildet.
- **Excel-Einlesen** nutzt `DecompressionStream("deflate-raw")`. Auf iPhones
  erst ab iOS 16.4. CSV funktioniert überall.
- **Zahlen aus Dateien** immer über `zahlLesen` — deutsche und englische
  Schreibweise unterscheiden sich, und ein entfernter Punkt hat schon einmal
  aus 981.120 kWh 553 Milliarden gemacht.

## Umgang mit dem Nutzer

Er testet gründlich und meldet in langen Listen. Die Rückmeldungen sind
oft diktiert, also stellenweise unvollständig — im Zweifel nachfragen statt
raten. Er merkt, wenn etwas nur behauptet und nicht geprüft wurde.
