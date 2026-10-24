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
Vertragsmanagement · Leadmanagement · Finanzbuchhaltung · Geschäftsführung

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
