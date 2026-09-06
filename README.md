# EGC-Energie Vertriebsportal

Webbasiertes CRM für den Vertrieb von Strom- und Erdgaslieferverträgen.

## Was die Anwendung kann

- **Angebotsanfragen** — Vertriebspartner erfassen Kunde, Lieferstellen je Sparte,
  Zählerart SLP oder RLM mit Lastgang-Upload, Produktwunsch, Laufzeit oder festes
  Lieferende und den gewünschten Aufschlag.
- **Kalkulation** — prüft, fordert fehlende Unterlagen nach, hält Rücksprache mit der
  Geschäftsführung und gibt eine oder mehrere Angebotsvarianten mit PDF zurück.
- **Provisionen** — Differenzprovision entlang der Vertriebsstruktur. Der Firmenanteil
  ist ausschließlich für die Geschäftsführung sichtbar.
- **Leads** — Kanban-Board, Liste und Auswertung mit Zeitraum- und Herkunftsfilter.
- **Onboarding** — Vertriebspartner werden angelegt, per Link eingeladen, hinterlegen
  ihre Stammdaten als Handelsvertreter und werden von der Geschäftsführung freigegeben.
- **Unterlagen** — Schulungen, Dokumente und Marketingmaterial.

## Rollen

Vertriebspartner, Teamleiter, Leitung Vertrieb, Kalkulation, Vertragsmanagement,
Geschäftsführung. Jede Rolle hat eine eigene Übersicht und eigene Sichtrechte.

## Lokal starten

```bash
npm install
npm run build
npx serve dist
```

## Deployment

Netlify baut über `npm run build` und veröffentlicht den Ordner `dist`.
Die Konfiguration steht in `netlify.toml`, es ist nichts weiter einzustellen.

## Demo-Zugänge

| E-Mail | Rolle |
|---|---|
| karsten@egc-energie.de | Geschäftsführung |
| k.roth@egc-energie.de | Leitung Vertrieb |
| j.adam@egc-energie.de | Teamleiter |
| m.weber@egc-energie.de | Vertriebspartner |
| kalkulation@egc-energie.de | Kalkulation |
| n.petry@egc-energie.de | Vertragsmanagement |

Passwort für alle: `EGC-demo!2026`

## Stand der Umsetzung

Dies ist ein funktionsfähiger Prototyp der Oberfläche und der Abläufe. Die Daten
liegen im `localStorage` des jeweiligen Browsers, hochgeladene Dateien werden nur
mit ihrem Namen erfasst, Passwörter stehen im Klartext.

Vor dem Echtbetrieb wird ein Backend benötigt:

- Anmeldung mit gehashten Passwörtern und serverseitiger Rechteprüfung
- Datenbank statt Browserspeicher, damit alle Rollen denselben Stand sehen
- geschützter Dateispeicher für Abrechnungen, Lastgänge, Ausweiskopien und Vollmachten
- Löschfristen für Ausweisdokumente und Bankdaten nach DSGVO
- E-Mail-Versand für Einladungen und Lead-Zuweisungen
