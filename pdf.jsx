/* PDF-Erzeugung: Angebot mit Vollmacht, Verträge, Visitenkarte, Broschüre und Flyer.
   Eigener Programmteil: wird erst geladen, wenn jemand ihn braucht (kürzere Ladezeit für alle anderen).
   Gemeinsame Bausteine kommen aus App.jsx. Ausgelagert mit v5.40. */
import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { zipSync, strToU8 } from "fflate";
import {
  Zap, Flame, Plus, Send, ArrowLeft, Upload, FileText, Check, X,
  AlertTriangle, Users, Calculator, FileSignature, BarChart3,
  Wallet, Inbox, Trash2, ChevronRight, Paperclip, RotateCcw, Menu, Bell, Target, Calendar,
  Search, ClipboardList, Contact, Briefcase, Lightbulb, UserPlus, Network, Trophy, Ban,
  MessageSquare, FolderOpen, CircleUser, Gauge, Settings, Copy, Save, Pencil, Layers, MapPin, Phone, Mail,
} from "lucide-react";
import {
  sb, laden, abgleichen, einstellungenLaden, einstellungSpeichern, liveAbgleich, sammlungVon,
  schonBekannt, anmelden, abmelden, meineId, einladungPruefen, einladungEinloesen, dateiInhalt, passwortAendern,
  passwortVergessen, zugangSetzen, kundenangebot, kundenlinksLaden,
} from "./datenbank.js";

import {
  Abrechnung, Datei, EGC_AUFTRAG, EGC_LEISTUNGEN, EGC_SCHRITTE, FIRMENDATEN, Kunden, LOGO_PDF,
  Lastganganalyse, Provisionen, Registrierung, SMARTMETER, SMARTMETER_VORGABE, UMLAGEN, Unterschrift, VERSION,
  altPreis, bytesAlsDataUrl, bytesDataUrl, csvLesen, dataUrlBytes, dateiLaden, dateiName, dateienVon,
  datum, enddatum, erzeugePdf, firmenzeile, heute, kb, ladeJsPdf, lastgangAuswerten,
  lastgangGrafiken, laufzeitMonate, num, pdfFussFirma, pdfMitFeldern, preisTeile, smartmeterSummen, umlageSumme,
  umlagenAusgleich, umlagenJahr, verbrauchGesamt, verbrauchMedium, vertragsZeilen, visitenkartenDaten, xlsxAusZeilen, zahlLesen,
  stelleIn, stellenVon, spotVergleich, SPOT_2025,
} from "./App.jsx";
import { Beschaffung } from "./beschaffung.jsx";
import { Kalkulationen, Smartmeter } from "./innendienst.jsx";
import { Strukturanfragen } from "./selten.jsx";
import { Branchen } from "./verwaltung.jsx";

/* ------------------------------------------------------------------ */
/*  Dienstleistungsvertrag (Energiebeschaffung und Erstattungsprüfung) */
/*  Gilt für alle Kunden. Nur Kalkulation und Geschäftsführung         */
/*  erzeugen ihn: blanko oder mit der Anschrift des Kunden.            */
/* ------------------------------------------------------------------ */
/* honorar: { mit: true, betrag: 300 } · { mit: false } · blanko mit Honorar: { mit: true, betrag: null } */
const dlvText = (honorar = { mit: true, betrag: 300 }) => {
  const mit = honorar.mit !== false;
  const P = honorar.betrag == null ? "________ EUR" : num(honorar.betrag, 2) + " EUR";
  /* Erfolgshonorar auf Erstattungen: einstellbar, Vorgabe 20 %; 0 = kein Erfolgshonorar; blanko (null) = Linie */
  const EW = honorar.erfolg === undefined ? 20 : honorar.erfolg;
  const EF = EW !== 0;
  const E = EW == null ? "____ %" : num(EW, EW % 1 ? 1 : 0) + " %";
  const ESATZ = EF ? " Das Erfolgshonorar von " + E + " für Erstattungs- und Entlastungsleistungen bleibt " : "";
  /* Referenzfreigabe: Servicepauschale komplett erlassen, nur im ersten Jahr erlassen oder vergünstigt */
  const REF = ["komplett", "jahr", "rabatt"].includes(honorar.referenz) ? honorar.referenz : "komplett";
  const R = honorar.rabattBetrag == null || honorar.rabattBetrag === "" ? "________ EUR" : num(honorar.rabattBetrag, 2) + " EUR";
  const refKurz = {
    komplett: "Die Servicepauschale von " + P + " für die Energiebeschaffung entfällt vollständig, solange die Referenzfreigabe besteht",
    jahr: "Die Servicepauschale von " + P + " für die Energiebeschaffung entfällt in den ersten 12 Monaten der Vertragslaufzeit, solange die Referenzfreigabe besteht; danach wird sie in voller Höhe berechnet",
    rabatt: "Solange die Referenzfreigabe besteht, ermäßigt sich die Servicepauschale für die Energiebeschaffung auf " + R + " zzgl. gesetzlicher Umsatzsteuer pro Monat",
  }[REF];
  const ref41 = {
    komplett: "Diese Servicepauschale wird jedoch nur berechnet, wenn der Auftraggeber keine Referenzfreigabe gemäß Ziffer 5 erteilt bzw. eine erteilte Referenzfreigabe später widerruft.",
    jahr: "Erteilt der Auftraggeber die Referenzfreigabe gemäß Ziffer 5, wird die Servicepauschale in den ersten 12 Monaten der Vertragslaufzeit nicht berechnet; ab dem 13. Vertragsmonat oder nach einem Widerruf der Referenzfreigabe wird sie in voller Höhe berechnet.",
    rabatt: "Erteilt der Auftraggeber die Referenzfreigabe gemäß Ziffer 5, ermäßigt sich die Servicepauschale für die Dauer der Freigabe auf " + R + " zzgl. gesetzlicher Umsatzsteuer pro Monat; nach einem Widerruf der Referenzfreigabe wird sie in voller Höhe berechnet.",
  }[REF];
  const ref51 = {
    komplett: "entfällt ausschließlich die monatliche Servicepauschale von " + P + " zzgl. gesetzlicher Umsatzsteuer für die Energiebeschaffung und laufende Betreuung gemäß Ziffer 4.1 vollständig für die Dauer dieser Freigabe.",
    jahr: "entfällt ausschließlich die monatliche Servicepauschale von " + P + " zzgl. gesetzlicher Umsatzsteuer für die Energiebeschaffung und laufende Betreuung gemäß Ziffer 4.1 für die ersten 12 Monate der Vertragslaufzeit, längstens für die Dauer dieser Freigabe.",
    rabatt: "ermäßigt sich ausschließlich die monatliche Servicepauschale für die Energiebeschaffung und laufende Betreuung gemäß Ziffer 4.1 für die Dauer dieser Freigabe von " + P + " auf " + R + ", jeweils zzgl. gesetzlicher Umsatzsteuer.",
  }[REF];
  const refJa = {
    komplett: "Die monatliche Servicepauschale von " + P + " zzgl. USt. für die Energiebeschaffung entfällt.",
    jahr: "Die monatliche Servicepauschale von " + P + " zzgl. USt. für die Energiebeschaffung entfällt in den ersten 12 Monaten.",
    rabatt: "Die monatliche Servicepauschale für die Energiebeschaffung ermäßigt sich von " + P + " auf " + R + " zzgl. USt.",
  }[REF];
  const LZ = mit ? "6" : "5";   /* Ziffer der Laufzeit: ohne Honorar entfällt die Referenzregelung */
  const LAUF = "solange die Energiebeschaffung des Auftraggebers über einen von EGC Energie vermittelten Energieliefervertrag erfolgt";
  const t = {
  titel: "DIENSTLEISTUNGSVERTRAG",
  untertitel: "Energiebeschaffung und Erstattungsprüfung für Gewerbe & Industrie",
  mit,
  konditionen: [
    ...(mit ? [
      ["Energiebeschaffung", P + " zzgl. gesetzlicher Umsatzsteuer pro Monat" + (REF === "komplett"
        ? "; nur wenn keine Referenzfreigabe besteht" : "; bei Referenzfreigabe gilt die Regelung „Referenzkunde“")],
      ["Referenzkunde", refKurz],
    ] : [
      ["Energiebeschaffung", "Ohne Servicepauschale. Die Leistungen dieses Vertrags gelten, " + LAUF + "."],
      ["Laufzeit", "Für die Dauer der über EGC Energie vermittelten Energielieferverträge des Auftraggebers"],
    ]),
    ["Erfolgshonorar Erstattungen / Entlastungen", EF
      ? E + " zzgl. gesetzlicher Umsatzsteuer ausschließlich auf tatsächlich realisierte Erstattungen bzw. bestätigte finanzielle Entlastungen aus den Leistungen gemäß Ziffer 2.2"
      : "Kein Erfolgshonorar. Die Prüfung von Erstattungs- und Entlastungspotenzialen gemäß Ziffer 2.2 ist ohne zusätzliche Vergütung enthalten"],
  ],
  einleitung: "Zwischen dem oben bezeichneten Auftraggeber und EGC Energie als Auftragnehmer wird folgender Dienstleistungsvertrag geschlossen.",
  ziffern: [
    ["1. Vertragsgegenstand", [
      "Der Auftragnehmer unterstützt den Auftraggeber in zwei voneinander getrennten Leistungsbereichen: (a) bei der laufenden Energiebeschaffung und energiewirtschaftlichen Betreuung für Strom und Erdgas sowie (b) bei der Prüfung möglicher Erstattungs- und Entlastungsansprüche. Die Prüfung und Bearbeitung der unter Ziffer 2.2 genannten Erstattungs- und Entlastungsthemen erfolgt vollständig über den Auftragnehmer. Der Auftragnehmer ist berechtigt, hierfür im Hintergrund spezialisierte Kooperations- und Dienstleistungspartner einzubinden. Für beide Leistungsbereiche gelten die jeweils gesondert geregelten Vergütungen gemäß Ziffer 4.",
      "Soweit für einzelne Themen rechtliche oder steuerliche Beratung, Vertretung oder eine förmliche Antragstellung erforderlich ist, erfolgt diese nicht als Rechts- oder Steuerberatung durch den Auftragnehmer. Hierfür können nach Abstimmung spezialisierte Partner, Rechtsanwälte oder Steuerberater eingebunden werden."]],
    ["2. Leistungsumfang", [
      "2.1 Energiebeschaffung und laufende Betreuung. Der Auftragnehmer unterstützt den Auftraggeber insbesondere bei der Beschaffung von Strom und Erdgas, bei Markt- und Angebotsvergleichen, der Abstimmung von Lieferverträgen sowie der laufenden energiewirtschaftlichen Betreuung. " + (mit
        ? "Für diesen Leistungsbereich gilt ausschließlich die monatliche Servicepauschale gemäß Ziffer 4.1."
        : "Für diesen Leistungsbereich fällt keine Vergütung an, " + LAUF + " (Ziffer " + LZ + ").") + (EF ? " Das Erfolgshonorar gemäß Ziffer 4.2 fällt hierfür ausdrücklich nicht an." : ""),
      "2.2 Prüfung von Erstattungs- und Entlastungspotenzialen. Zusätzlich werden – abhängig von Branche, Verbrauch, Lieferstellen, Vertragslage und verfügbarer Datenbasis – durch den Auftragnehmer insbesondere folgende Erstattungs- und Entlastungsthemen geprüft und bearbeitet:",
      { punkte: [
        "Energiesteuer auf Erdgas und mögliche Entlastungs- bzw. Erstattungsansprüche,",
        "Konzessionsabgabe und mögliche Reklassifizierung bzw. Korrektur,",
        "Netzentgelte, atypische bzw. individuelle Netzentgelt-Themen und weitere netzbezogene Auffälligkeiten,",
        "Blindarbeit, Messkonzepte, Lastgänge, Leistungsspitzen und Verbrauchsmuster,",
        "Umlagen und sonstige energiewirtschaftliche Rechnungsbestandteile,",
        "CO2-Kostenkompensation bzw. weitere unterstützte Entlastungswege, soweit die Voraussetzungen im Einzelfall vorliegen,",
        "Nachweise, Fristen, Compliance-Hinweise sowie die Strukturierung und Koordination der nächsten Schritte."] },
      "Eine erste Potenzialanzeige oder Schätzung stellt noch keinen garantierten Anspruch dar. Ob und in welcher Höhe ein wirtschaftlicher Vorteil realisiert werden kann, hängt von der individuellen Prüfung und den jeweils geltenden gesetzlichen, vertraglichen und tatsächlichen Voraussetzungen ab."]],
    ["3. Mitwirkungspflichten des Auftraggebers", [
      "Der Auftraggeber stellt dem Auftragnehmer alle für die Prüfung und Bearbeitung erforderlichen Informationen, Rechnungen, Verträge, Verbrauchs- und Messdaten, Vollmachten sowie sonstigen Unterlagen vollständig und rechtzeitig zur Verfügung. Eine fristgerechte Anmeldung der Lieferstellen beim Energieversorger kann nur gewährleistet werden, wenn die vollständigen Unterlagen und der Auftrag spätestens 60 Werktage vor dem gewünschten Lieferbeginn beim Auftragnehmer vorliegen. Änderungen der Unternehmens-, Verbrauchs- oder Lieferstellendaten sind unverzüglich mitzuteilen.",
      "Der Auftraggeber bestätigt, dass die übermittelten Angaben nach bestem Wissen vollständig und richtig sind. Verzögerungen oder Nachteile, die aus fehlenden, verspäteten oder unrichtigen Angaben entstehen, fallen nicht in den Verantwortungsbereich des Auftragnehmers."]],
    ["4. Vergütung", [
      mit
        ? "4.1 Vergütung für Energiebeschaffung und laufende Betreuung. Ausschließlich für die Leistungen gemäß Ziffer 2.1 wird eine monatliche Servicepauschale in Höhe von " + P + " zzgl. gesetzlicher Umsatzsteuer vereinbart. " + ref41 + " Die Abrechnung erfolgt monatlich im Voraus; Rechnungen sind innerhalb von 14 Kalendertagen nach Zugang fällig."
        : "4.1 Energiebeschaffung und laufende Betreuung ohne Servicepauschale. Für die Leistungen gemäß Ziffer 2.1 wird keine Servicepauschale berechnet. Die Leistungen gelten für den Auftraggeber, " + LAUF + ".",
      ...(!EF ? ["4.2 Kein Erfolgshonorar. Für die Erstattungs- und Entlastungsleistungen gemäß Ziffer 2.2 wird kein Erfolgshonorar berechnet."] : [
      "4.2 Erfolgshonorar ausschließlich für Erstattungs- und Entlastungsleistungen. Für die Energiebeschaffung und laufende Betreuung gemäß Ziffer 2.1 fällt kein Erfolgshonorar an. Das Erfolgshonorar in Höhe von " + E + " zzgl. gesetzlicher Umsatzsteuer wird ausschließlich auf tatsächlich realisierte Erstattungen oder bestätigte finanzielle Entlastungen erhoben, die aus den unter Ziffer 2.2 beschriebenen und über den Auftragnehmer geprüften oder bearbeiteten Erstattungs- und Entlastungsthemen resultieren.",
      "Als realisierter wirtschaftlicher Vorteil im Sinne von Ziffer 4.2 gilt ausschließlich ein dem Auftraggeber tatsächlich ausgezahlter, gutgeschriebener, verrechneter oder von der zuständigen Stelle bzw. dem Vertragspartner verbindlich bestätigter Erstattungs- oder Entlastungsbetrag aus einer Prüfung bzw. Bearbeitung gemäß Ziffer 2.2. Eine reine Potenzialberechnung, unverbindliche Schätzung oder bloße Empfehlung löst kein Erfolgshonorar aus.",
      "Das Erfolgshonorar wird mit Realisierung bzw. verbindlicher Bestätigung des jeweiligen wirtschaftlichen Vorteils aus den Leistungen gemäß Ziffer 2.2 fällig. Der Auftraggeber informiert den Auftragnehmer unverzüglich über entsprechende Bescheide, Gutschriften, Verrechnungen oder sonstige Bestätigungen und stellt auf Anfrage geeignete Nachweise zur Verfügung."])]],
    ...(!mit ? [] : [["5. Referenzkundenregelung", [
      "5.1 Erteilt der Auftraggeber dem Auftragnehmer die nachstehende Referenzfreigabe, " + ref51 + (EF ? " Das Erfolgshonorar für Erstattungs- und Entlastungsleistungen gemäß Ziffer 4.2 bleibt hiervon unberührt." : ""),
      "5.2 Die Referenzfreigabe berechtigt den Auftragnehmer ausschließlich, den Auftraggeber mit seinem Firmennamen als Referenzkunden zu nennen, etwa auf der Unternehmenswebseite, in Vertriebsunterlagen und Präsentationen sowie gegenüber Interessenten und Geschäftspartnern, verbunden mit dem Hinweis, dass der Auftragnehmer den Auftraggeber in Energiefragen betreut. Angaben zu Beschaffungsmodell, Energiepreisen, Konditionen, Jahresverbrauch, Einsparungen oder sonstigen Vertragsinhalten werden dabei nicht genannt. Die Nutzung eines Logos, von Marken, Zitaten oder Fallstudien bedarf einer gesonderten Freigabe in Textform.",
      "5.3 Die Referenzfreigabe kann vom Auftraggeber jederzeit mit Wirkung für die Zukunft in Textform widerrufen werden. Ab dem auf den Widerruf folgenden Kalendermonat wird für die Energiebeschaffung und laufende Betreuung die monatliche Servicepauschale von " + P + " zzgl. gesetzlicher Umsatzsteuer berechnet. Bereits veröffentlichte Druckunterlagen müssen nicht vernichtet werden; digitale Nennungen werden innerhalb einer angemessenen Frist entfernt."]]]),
    [LZ + ". Laufzeit und Kündigung", [
      mit
        ? "Der Vertrag beginnt mit Unterzeichnung und wird zunächst für 12 Monate geschlossen. Er verlängert sich jeweils um weitere 12 Monate, wenn er nicht mit einer Frist von 3 Monaten zum Ende der jeweiligen Vertragslaufzeit in Textform gekündigt wird. Das Recht zur außerordentlichen Kündigung aus wichtigem Grund bleibt unberührt."
        : "Der Vertrag beginnt mit Unterzeichnung und läuft für die Dauer der über EGC Energie vermittelten Energielieferverträge des Auftraggebers, einschließlich Verlängerungen und Folgeverträgen. Ein Wechsel des Tarifs oder des Beschaffungsmodells sowie ein neuer, über EGC Energie vermittelter Energieversorger beenden den Vertrag nicht; die Leistungen bleiben ohne Servicepauschale.",
      ...(mit ? [] : [
        "Wechselt der Auftraggeber den Energieversorger ohne Vermittlung durch EGC Energie, entfällt die Grundlage für die Betreuung ohne Servicepauschale. Die Leistungen gemäß Ziffer 2.1 stehen dann nur gegen ein gesondert zu vereinbarendes Honorar zur Verfügung. Kommt keine solche Vereinbarung zustande, endet der Vertrag mit dem Ende des letzten über EGC Energie vermittelten Energieliefervertrags, ohne dass es einer Kündigung bedarf. Das Recht zur außerordentlichen Kündigung aus wichtigem Grund bleibt unberührt."]),
      ...(!EF ? [] : ["Ein während der Vertragslaufzeit begründeter Anspruch auf das Erfolgshonorar gemäß Ziffer 4.2 bleibt auch nach Vertragsende bestehen, wenn der wirtschaftliche Vorteil auf einer während der Vertragslaufzeit über den Auftragnehmer vorgenommenen Prüfung, Antragstellung oder Bearbeitung gemäß Ziffer 2.2 beruht. Für Leistungen der Energiebeschaffung gemäß Ziffer 2.1 entsteht daraus kein Erfolgshonorar."])]],
    [(mit ? "7" : "6") + ". Zusammenarbeit mit Partnern", [
      "Der Auftragnehmer ist berechtigt, zur technischen, fachlichen oder rechtlichen Bearbeitung geeignete Kooperationspartner und Dienstleister einzubeziehen, soweit dies zur Vertragserfüllung erforderlich ist. Personenbezogene Daten und vertrauliche Unternehmensdaten werden dabei nur im erforderlichen Umfang und unter Beachtung der geltenden Datenschutzbestimmungen weitergegeben. Externe kostenpflichtige Leistungen, die nicht von der vereinbarten Vergütung umfasst sind, bedürfen vor Beauftragung der Freigabe des Auftraggebers."]],
    [(mit ? "8" : "7") + ". Haftung und Entscheidungshoheit", [
      "Die endgültige Entscheidung über Anträge, Vertragsänderungen, Beschaffungsentscheidungen und sonstige Maßnahmen verbleibt beim Auftraggeber. Der Auftragnehmer schuldet eine fachgerechte Dienstleistung, jedoch keinen bestimmten Erstattungs-, Einspar- oder Beschaffungserfolg.",
      "Der Auftragnehmer haftet unbeschränkt bei Vorsatz und grober Fahrlässigkeit sowie bei Verletzung von Leben, Körper oder Gesundheit. Bei leicht fahrlässiger Verletzung wesentlicher Vertragspflichten ist die Haftung auf den vertragstypischen, vorhersehbaren Schaden begrenzt. Im Übrigen ist die Haftung für leichte Fahrlässigkeit ausgeschlossen, soweit gesetzlich zulässig."]],
    [(mit ? "9" : "8") + ". Vertraulichkeit und Datenschutz", [
      "Beide Parteien behandeln alle ihnen im Zusammenhang mit diesem Vertrag bekannt werdenden vertraulichen Informationen und Geschäftsgeheimnisse vertraulich. Gesetzliche Offenlegungs- und Aufbewahrungspflichten bleiben unberührt. Die Verarbeitung personenbezogener Daten erfolgt nach den anwendbaren datenschutzrechtlichen Vorschriften."]],
    [(mit ? "10" : "9") + ". Schlussbestimmungen", [
      "Änderungen und Ergänzungen dieses Vertrages bedürfen mindestens der Textform, soweit nicht gesetzlich eine strengere Form vorgeschrieben ist. Es gilt das Recht der Bundesrepublik Deutschland. Soweit gesetzlich zulässig und beide Parteien Kaufleute sind, wird als Gerichtsstand der Sitz des Auftragnehmers vereinbart.",
      "Sollten einzelne Bestimmungen dieses Vertrages ganz oder teilweise unwirksam oder undurchführbar sein oder werden, bleibt die Wirksamkeit der übrigen Bestimmungen unberührt. Anstelle der unwirksamen oder undurchführbaren Bestimmung gilt die gesetzliche Regelung."]],
  ],
  freigabeUnter: { komplett: "OPTIONALE FREIGABE ZUR BEFREIUNG VON DER SERVICEPAUSCHALE",
    jahr: "OPTIONALE FREIGABE ZUR BEFREIUNG IM ERSTEN VERTRAGSJAHR",
    rabatt: "OPTIONALE FREIGABE ZUR ERMÄSSIGUNG DER SERVICEPAUSCHALE" }[REF],
  freigabeJa: "Ja, wir erteilen die Referenzfreigabe gemäß Ziffer 5 (Nennung nur mit Firmennamen, ohne Preise, Verbrauch oder Beschaffungsmodell). " + refJa + (EF ? ESATZ + "bestehen." : ""),
  freigabeNein: "Nein, wir erteilen keine Referenzfreigabe. Für die Energiebeschaffung wird die monatliche Servicepauschale von " + P + " zzgl. USt. berechnet." + (EF ? ESATZ + "hiervon unberührt." : ""),
  };
  return t;
};

async function dienstleistungsvertragPdf(kunde = null, honorar = { mit: true, betrag: 300 }) {
  const DLV_TEXT = dlvText(honorar);
  const jsPDF = await ladeJsPdf();
  /* GR/ZL: Schriftgröße und Zeilenabstand des Fließtexts; es wird so lange
     probiert, bis die Seitenzahl gerade ist (Druck auf Vorder- und Rückseite) */
  const bauen = (GR, ZL) => {
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const W = 210, H = 297, RA = 18, BR = W - 2 * RA, UNTEN = H - 24;
  const NAVY = [10, 22, 38], NAVY1 = [7, 16, 29], NAVY2 = [27, 58, 96], GRUEN = [108, 180, 59],
        GRUEN1 = [74, 140, 38], GRUEN2 = [150, 206, 96], TEXT = [22, 33, 44], GRAU = [107, 119, 135],
        LINIE = [216, 221, 228], HELL = [246, 248, 250], WEISS = [255, 255, 255];
  const F = FIRMENDATEN;
  const k = kunde || {};
  const blanko = !kunde;
  const logo = "data:image/jpeg;base64," + LOGO_PDF;
  const fl = (c) => doc.setFillColor(c[0], c[1], c[2]);
  const st = (c) => doc.setDrawColor(c[0], c[1], c[2]);
  const fa = (c) => doc.setTextColor(c[0], c[1], c[2]);
  const schrift = (g, fett) => { doc.setFont("helvetica", fett ? "bold" : "normal"); doc.setFontSize(g); };
  const mische = (a, b, t) => a.map((c, i) => Math.round(c + (b[i] - c) * t));
  const dk = (o) => doc.setGState(new doc.GState({ opacity: o, "stroke-opacity": o }));
  const verlauf = (x, y, w, h, f1, f2, { r = 0, quer = true, n = 80 } = {}) => {
    doc.saveGraphicsState();
    if (r) doc.roundedRect(x, y, w, h, r, r, null); else doc.rect(x, y, w, h, null);
    doc.clip(); doc.discardPath();
    for (let i = 0; i < n; i++) {
      fl(mische(f1, f2, i / (n - 1)));
      if (quer) doc.rect(x + (i * w) / n, y, w / n + 0.25, h, "F"); else doc.rect(x, y + (i * h) / n, w, h / n + 0.25, "F");
    }
    doc.restoreGraphicsState();
  };
  const kringel = (x, y, r, c, o, art = "F") => {
    dk(o); if (art === "F") { fl(c); doc.circle(x, y, r, "F"); } else { st(c); doc.setLineWidth(0.6); doc.circle(x, y, r, "S"); } dk(1);
  };
  const kopf = (titel) => {
    verlauf(0, 0, W, 24, NAVY1, NAVY2);
    doc.saveGraphicsState(); doc.rect(0, 0, W, 24, null); doc.clip(); doc.discardPath();
    kringel(W - 22, -4, 22, GRUEN, 0.16); kringel(W - 8, -8, 28, WEISS, 0.08, "S");
    doc.restoreGraphicsState();
    doc.addImage(logo, "JPEG", RA, 5.5, (420 / 196) * 12, 12);
    schrift(12.5, true); fa(WEISS); doc.text(titel, W - RA, 14.8, { align: "right" });
    verlauf(0, 24, W, 1.2, GRUEN1, GRUEN2);
    pdfFussFirma(doc, W, H, RA);
    return 36;
  };
  const neueSeite = () => { doc.addPage(); return kopf("DIENSTLEISTUNGSVERTRAG"); };
  let y;
  const platz = (h) => { if (y + h > UNTEN) y = neueSeite(); };
  const absatz = (t, x, breite, gr = GR, zeile = ZL) => {
    schrift(gr); fa(TEXT);
    const z = doc.splitTextToSize(String(t), breite);
    /* nach einem Seitenwechsel stellt die Fußzeile eine kleine graue Schrift ein: je Zeile neu setzen */
    z.forEach((zeileText) => { platz(zeile); schrift(gr); fa(TEXT); doc.text(zeileText, x, y); y += zeile; });
  };
  const ueberschrift = (t) => {
    platz(14);
    verlauf(RA, y - 3.6, 1.6, 4.8, GRUEN2, GRUEN1, { r: 0.8, quer: false, n: 20 });
    schrift(10.5, true); fa(NAVY); doc.text(t, RA + 4, y); y += 6.5;
  };
  const linie = (x1, x2, yy) => { st(TEXT); doc.setLineWidth(0.3); doc.line(x1, yy, x2, yy); };

  /* ---------- Seite 1: Parteien und Kernkonditionen ---------- */
  y = kopf("DIENSTLEISTUNGSVERTRAG");
  schrift(22, true); fa(NAVY); doc.text("Dienstleistungsvertrag", RA, y + 6);
  schrift(10.5); fa(GRAU); doc.text(DLV_TEXT.untertitel, RA, y + 13);
  verlauf(RA, y + 17, 30, 1.3, GRUEN1, GRUEN2, { r: 0.65, n: 30 });
  y += 28;

  const partei = (rolle, zeilen, leer) => {
    const h = 34;
    fl(HELL); doc.roundedRect(RA, y, BR, h, 2.5, 2.5, "F");
    doc.saveGraphicsState(); doc.roundedRect(RA, y, BR, h, 2.5, 2.5, null); doc.clip(); doc.discardPath();
    verlauf(RA, y, 2.2, h, GRUEN2, GRUEN1, { quer: false, n: 30 });
    doc.restoreGraphicsState();
    schrift(8, true); fa(GRAU); doc.text(rolle, RA + 7, y + 7, { charSpace: 0.5 });
    const x = RA + 52;
    zeilen.forEach(([wert, platzhalter], i) => {
      const yy = y + 8 + i * 6.6;
      if (leer) { schrift(7); fa(GRAU); doc.text(platzhalter, x, yy + 3.6); st(LINIE); doc.setLineWidth(0.3); doc.line(x, yy + 0.8, W - RA - 6, yy + 0.8); }
      else { schrift(i === 0 ? 10.5 : 9.2, i === 0); fa(TEXT); doc.text(wert || "", x, yy); }
    });
    y += h + 5;
  };
  partei("AUFTRAGGEBER", [
    [k.firma, "Firma"], [k.strasse, "Straße, Hausnummer"],
    [[k.plz, k.ort].filter(Boolean).join(" "), "PLZ, Ort"],
    [blanko ? "" : "Handelsregister: ______________________", "Handelsregister (Amtsgericht, HRB)"]], blanko);
  partei("AUFTRAGNEHMER", [
    ["EGC Energie"], [F.vertreter ? "vertreten durch " + F.vertreter : ""], [F.strasse], [F.ort]], false);

  y += 3;
  ueberschrift("Kernkonditionen");
  DLV_TEXT.konditionen.forEach(([k1, k2], i) => {
    schrift(9); const z = doc.splitTextToSize(k2, BR - 64);
    const h = Math.max(13, z.length * 4.2 + 6);
    fl(i % 2 ? WEISS : HELL); doc.rect(RA, y, BR, h, "F");
    schrift(9, true); fa(NAVY); doc.text(doc.splitTextToSize(k1, 52), RA + 4, y + 5.6);
    schrift(9); fa(TEXT); doc.text(z, RA + 60, y + 5.6, { lineHeightFactor: 1.35 });
    y += h;
  });
  st(LINIE); doc.setLineWidth(0.25); doc.line(RA, y, W - RA, y);
  y += 8;
  schrift(8); fa(GRAU); doc.text("Stand: " + datum(heute()) + " | Version 1.0", RA, y);

  /* ---------- Vertragstext: direkt unter den Kernkonditionen ---------- */
  y += 12;
  absatz(DLV_TEXT.einleitung, RA, BR); y += 4;
  DLV_TEXT.ziffern.forEach(([titel, teile]) => {
    ueberschrift(titel);
    teile.forEach((t) => {
      if (t && t.punkte) {
        t.punkte.forEach((p) => {
          schrift(GR); const z = doc.splitTextToSize(p, BR - 7);
          platz(z.length * ZL);
          fl(GRUEN); doc.circle(RA + 2, y - 1.2, 0.8, "F");
          schrift(GR); fa(TEXT); z.forEach((zt) => { doc.text(zt, RA + 6, y); y += ZL; });
        });
        y += 1.5;
        return;
      }
      /* „2.1 Titel. Text“: Nummer und Titel fett */
      const m = /^(\d+\.\d+ [^.,]{3,70}\.)\s(.*)$/.exec(t);
      if (m) { platz(10); schrift(GR, true); fa(NAVY); doc.text(m[1], RA, y); y += 4.3; absatz(m[2], RA, BR); }
      else absatz(t, RA, BR);
      y += 2.2;
    });
    y += 2;
  });

  /* ---------- Referenzfreigabe und Unterschriften: neue Seite nur, wenn der Platz nicht reicht ---------- */
  platz(DLV_TEXT.mit ? 132 : 78);
  y += 6;
  schrift(16, true); fa(NAVY); doc.text(DLV_TEXT.mit ? "Referenzfreigabe" : "Unterschriften", RA, y + 2);
  if (DLV_TEXT.mit) { schrift(8.5, true); fa(GRUEN1); doc.text(DLV_TEXT.freigabeUnter, RA, y + 9, { charSpace: 0.3 }); }
  y += DLV_TEXT.mit ? 20 : 12;
  (DLV_TEXT.mit ? [DLV_TEXT.freigabeJa, DLV_TEXT.freigabeNein] : []).forEach((t) => {
    schrift(9.2); const z = doc.splitTextToSize(t, BR - 20);
    const h = z.length * 4.4 + 9;
    fl(HELL); doc.roundedRect(RA, y, BR, h, 2.5, 2.5, "F");
    st(TEXT); doc.setLineWidth(0.4); doc.roundedRect(RA + 5, y + 4.6, 4.4, 4.4, 0.6, 0.6, "S");
    fa(TEXT); doc.text(z, RA + 14, y + 8, { lineHeightFactor: 1.4 });
    y += h + 5;
  });
  y += 14;
  const halb = (BR - 14) / 2, x2 = RA + halb + 14;
  schrift(8); fa(GRAU);
  doc.text("Ort, Datum Auftraggeber", RA, y);
  doc.text((F.ort || "").replace(/^\d+\s*/, "") + ", Datum", x2, y);
  y += 22;
  linie(RA, RA + halb, y); linie(x2, x2 + halb, y);
  schrift(8); fa(GRAU);
  doc.text("Unterschrift / Name", RA, y + 4.5);
  doc.text("EGC Energie", x2, y + 4.5);
  y += 18;
  schrift(8.5); fa(TEXT);
  doc.text("Firma:", RA, y); doc.text("Vertreten durch:", x2, y);
  if (!blanko && k.firma) { schrift(9, true); doc.text(k.firma, RA + 12, y - 0.3, { maxWidth: halb - 12 }); }
  else linie(RA + 12, RA + halb, y + 0.6);
  if (F.vertreter) { schrift(9, true); fa(TEXT); doc.text(F.vertreter, x2 + 27, y - 0.3); }
  else linie(x2 + 27, x2 + halb, y + 0.6);

  /* Seitenzahlen */
  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) { doc.setPage(i); schrift(7); fa(GRAU); doc.text("Seite " + i + " von " + n, W - RA, H - 6.4, { align: "right" }); }

  return doc;
  };
  let doc = null;
  for (const [gr, zl] of [[8.8, 4.1], [8.5, 3.95], [9.1, 4.25], [8.2, 3.8], [9.4, 4.4], [7.9, 3.65]]) {
    doc = bauen(gr, zl);
    if (doc.getNumberOfPages() % 2 === 0) break;
  }
  const roh = doc.output("datauristring");
  const name = !kunde ? "Dienstleistungsvertrag_Blanko_" + (DLV_TEXT.mit ? "mit" : "ohne") + "_Honorar.pdf"
    : "Dienstleistungsvertrag_" + String(kunde.firma || "Kunde").replace(/[^\wäöüÄÖÜß]+/g, "_") + ".pdf";
  return { name, typ: "application/pdf", groesse: Math.round(roh.length * 0.75), url: "data:application/pdf;base64," + roh.split(",")[1] };
}

/* ------------------------------------------------------------------ */
/*  Verschwiegenheitserklärung (NDA)                                   */
/*  EGC verpflichtet sich gegenüber dem Kunden: Daten nur auswerten    */
/*  und zur Angebotseinholung an Versorger geben, nie an Dritte.       */
/*  Unterschreibt immer die Geschäftsführung. Nur Kalkulation und      */
/*  Geschäftsführung haben Zugriff.                                    */
/* ------------------------------------------------------------------ */
/* Ziffern der Verschwiegenheitserklärung; gegenseitig: auch der Kunde schützt Informationen von EGC */
const ndaZiffern = (gegenseitig = false) => {
  const g = gegenseitig;
  const wer = g ? "Jede Partei" : "EGC";
  const teile = [
    ["Gegenstand und Zweck", [
      "Der Kunde stellt EGC Energie (nachfolgend „EGC“) Informationen und Unterlagen zur Verfügung, damit EGC seinen Energiebedarf auswerten, ihn zur Energiebeschaffung beraten und Angebote von Energieversorgern einholen kann (nachfolgend „Zweck“)."
        + (g ? " EGC stellt dem Kunden dafür Kalkulationen, Angebote und weitere Arbeitsergebnisse zur Verfügung." : "")
        + " Diese Erklärung regelt den vertraulichen Umgang mit diesen Informationen."]],
    ["Vertrauliche Informationen", [
      "Vertraulich sind alle Informationen, die EGC im Zusammenhang mit dem Zweck vom Kunden erhält, gleich in welcher Form und auch wenn sie nicht als vertraulich gekennzeichnet sind, insbesondere Verbrauchs-, Mess- und Lastgangdaten, Zähler- und Marktlokationsdaten, Rechnungen, Energielieferverträge, Preise und Konditionen, Angaben zu Standorten und Betriebsabläufen sowie sonstige Unternehmens- und Geschäftsdaten des Kunden. Mündlich übermittelte Informationen sind eingeschlossen.",
      ...(g ? ["Ebenso vertraulich sind die Informationen, die der Kunde von EGC erhält, insbesondere Kalkulationen, Angebote, Preise und Konditionen von Energieversorgern, Marktanalysen sowie Arbeitsunterlagen und Vorgehensweisen von EGC."] : [])]],
    ["Pflichten " + (g ? "der Parteien" : "von EGC"), [
      wer + " behandelt die vertraulichen Informationen " + (g ? "der anderen Partei " : "") + "streng vertraulich und verwendet sie ausschließlich für den Zweck. "
        + wer + " schützt sie mit mindestens der Sorgfalt, die " + (g ? "sie" : "EGC") + " auf eigene vertrauliche Informationen anwendet, und trifft angemessene technische und organisatorische Schutzmaßnahmen.",
      "EGC darf die Informationen des Kunden auswerten, aufbereiten und daraus Analysen, Kalkulationen und Angebotsvergleiche für den Kunden erstellen.",
      ...(g ? ["Der Kunde verwendet die Informationen von EGC nur für die eigene Entscheidung über seine Energiebeschaffung. Er gibt sie nicht an Dritte weiter, insbesondere nicht an andere Energievermittler oder Energieversorger, um damit Vergleichsangebote einzuholen. Zulässig ist die Weitergabe an eigene Mitarbeiter und an Berater des Kunden (etwa Steuerberater oder Rechtsanwälte), die zur Verschwiegenheit verpflichtet sind."] : [])]],
    ["Zulässige Weitergabe durch EGC", [
      "EGC darf vertrauliche Informationen des Kunden nur weitergeben",
      { punkte: [
        "an Energieversorger, soweit dies zur Einholung von Angeboten und zum Abschluss von Energielieferverträgen für den Kunden erforderlich ist, und nur im dafür nötigen Umfang,",
        "an eigene Mitarbeiter und Vertriebsbeauftragte von EGC, die die Informationen für den Zweck benötigen und zur Verschwiegenheit verpflichtet sind,",
        "an technische Dienstleister, die EGC zur Datenverarbeitung einsetzt und vertraglich zur Vertraulichkeit verpflichtet hat (z. B. Auftragsverarbeitung nach Art. 28 DSGVO),",
        "soweit EGC gesetzlich, behördlich oder gerichtlich zur Offenlegung verpflichtet ist; EGC informiert den Kunden, soweit zulässig, vorher und legt nur den Teil offen, der offengelegt werden muss."] },
      "Eine Weitergabe an sonstige Dritte ist ausgeschlossen. Insbesondere verkauft EGC keine Daten des Kunden und gibt sie nicht für Werbezwecke Dritter weiter. Eine Weitergabe darüber hinaus bedarf der vorherigen Zustimmung des Kunden in Textform."]],
    ["Haftung für Mitarbeiter und Beauftragte", [
      wer + " steht dafür ein, dass " + (g ? "ihre" : "seine") + " Mitarbeiter, Vertriebsbeauftragten und eingesetzten Dienstleister die Pflichten aus dieser Erklärung einhalten, und verpflichtet sie entsprechend zur Verschwiegenheit."]],
    ["Meldepflicht", [
      (g ? "Erlangt eine Partei" : "Erlangt EGC") + " Kenntnis davon, dass vertrauliche Informationen entgegen dieser Erklärung weitergegeben oder bekannt geworden sind, informiert " + (g ? "sie die andere Partei" : "EGC den Kunden") + " unverzüglich und unterstützt bei der Begrenzung des Schadens."]],
    ["Ausnahmen", [
      "Die Pflichten gelten nicht für Informationen, die nachweislich allgemein bekannt sind oder ohne Verschulden " + (g ? "der empfangenden Partei" : "von EGC") + " allgemein bekannt werden, die bereits vor der Übermittlung rechtmäßig bekannt waren, die unabhängig erarbeitet wurden, die von einem Dritten ohne Verletzung einer Vertraulichkeitspflicht erhalten wurden oder die zur Weitergabe in Textform freigegeben wurden. Wer sich auf eine Ausnahme beruft, muss sie nachweisen."]],
    ["Rückgabe und Löschung", [
      "Auf Verlangen gibt " + (g ? "jede Partei die erhaltenen Unterlagen der anderen" : "EGC die erhaltenen Unterlagen") + " zurück oder löscht sie, soweit keine gesetzlichen Aufbewahrungspflichten entgegenstehen. Eine Kopie darf ausschließlich zu Beweiszwecken sicher aufbewahrt werden; für sie gelten die Pflichten aus dieser Erklärung fort. Bereits an Energieversorger zur Angebotseinholung übermittelte Daten unterliegen den Datenschutzbestimmungen des jeweiligen Versorgers."]],
    ["Keine Lizenz, kein Vertragszwang", [
      "Die übermittelten Informationen bleiben Eigentum der Partei, von der sie stammen. Nutzungs- oder Lizenzrechte entstehen über den Zweck hinaus nicht. Diese Erklärung verpflichtet keine Partei zum Abschluss weiterer Verträge; aus dem Nichtzustandekommen eines Vertrags entstehen keine Ansprüche gegen die andere Partei."]],
    ["Laufzeit", [
      "Diese Erklärung gilt ab Unterzeichnung für die Dauer der Zusammenarbeit und darüber hinaus für drei Jahre nach deren Ende."]],
    ["Datenschutz", [
      "Soweit personenbezogene Daten betroffen sind, werden sie nach den geltenden datenschutzrechtlichen Vorschriften verarbeitet, insbesondere der Datenschutz-Grundverordnung (DSGVO)."]],
    ["Schlussbestimmungen", [
      "Änderungen und Ergänzungen bedürfen der Textform. Es gilt das Recht der Bundesrepublik Deutschland. Soweit gesetzlich zulässig und beide Parteien Kaufleute sind, ist Gerichtsstand der Sitz von EGC. Weitergehende gesetzliche Ansprüche, etwa nach dem Gesetz zum Schutz von Geschäftsgeheimnissen (GeschGehG), bleiben unberührt. Sollte eine Bestimmung unwirksam sein, bleibt die Wirksamkeit der übrigen Bestimmungen unberührt."]],
  ];
  return teile.map(([t, inhalt], i) => [(i + 1) + ". " + t, inhalt]);
};

/* kunde = null: blanko. unterschrift: { bild (Datei), name, datum } der Geschäftsführung */
async function ndaPdf(kunde = null, unterschrift = null, gegenseitig = false) {
  const jsPDF = await ladeJsPdf();
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const W = 210, H = 297, RA = 16, BR = W - 2 * RA, UNTEN = H - 22;
  const NAVY = [10, 22, 38], NAVY1 = [7, 16, 29], NAVY2 = [27, 58, 96], GRUEN = [108, 180, 59],
        GRUEN1 = [74, 140, 38], GRUEN2 = [150, 206, 96], TEXT = [22, 33, 44], GRAU = [107, 119, 135],
        LINIE = [216, 221, 228], HELL = [246, 248, 250], WEISS = [255, 255, 255];
  const F = FIRMENDATEN, k = kunde || {}, blanko = !kunde;
  const logo = "data:image/jpeg;base64," + LOGO_PDF;
  const fl = (c) => doc.setFillColor(c[0], c[1], c[2]);
  const st = (c) => doc.setDrawColor(c[0], c[1], c[2]);
  const fa = (c) => doc.setTextColor(c[0], c[1], c[2]);
  const schrift = (g, fett) => { doc.setFont("helvetica", fett ? "bold" : "normal"); doc.setFontSize(g); };
  const mische = (a, b, t) => a.map((c, i) => Math.round(c + (b[i] - c) * t));
  const dk = (o) => doc.setGState(new doc.GState({ opacity: o, "stroke-opacity": o }));
  const verlauf = (x, y, w, h, f1, f2, { r = 0, quer = true, n = 80 } = {}) => {
    doc.saveGraphicsState();
    if (r) doc.roundedRect(x, y, w, h, r, r, null); else doc.rect(x, y, w, h, null);
    doc.clip(); doc.discardPath();
    for (let i = 0; i < n; i++) {
      fl(mische(f1, f2, i / (n - 1)));
      if (quer) doc.rect(x + (i * w) / n, y, w / n + 0.25, h, "F"); else doc.rect(x, y + (i * h) / n, w, h / n + 0.25, "F");
    }
    doc.restoreGraphicsState();
  };
  const kringel = (x, y, r, c, o, art = "F") => {
    dk(o); if (art === "F") { fl(c); doc.circle(x, y, r, "F"); } else { st(c); doc.setLineWidth(0.6); doc.circle(x, y, r, "S"); } dk(1);
  };
  const kopf = () => {
    verlauf(0, 0, W, 24, NAVY1, NAVY2);
    doc.saveGraphicsState(); doc.rect(0, 0, W, 24, null); doc.clip(); doc.discardPath();
    kringel(W - 22, -4, 22, GRUEN, 0.16); kringel(W - 8, -8, 28, WEISS, 0.08, "S");
    doc.restoreGraphicsState();
    doc.addImage(logo, "JPEG", RA, 5.5, (420 / 196) * 12, 12);
    schrift(12.5, true); fa(WEISS); doc.text("VERSCHWIEGENHEITSERKLÄRUNG", W - RA, 14.8, { align: "right" });
    verlauf(0, 24, W, 1.2, GRUEN1, GRUEN2);
    pdfFussFirma(doc, W, H, RA);
    return 36;
  };
  let y = kopf();
  const platz = (h) => { if (y + h > UNTEN) { doc.addPage(); y = kopf(); } };
  const absatz = (t, x = RA, breite = BR) => {
    const z = (schrift(8.6), doc.splitTextToSize(String(t), breite));
    z.forEach((zt) => { platz(3.85); schrift(8.6); fa(TEXT); doc.text(zt, x, y); y += 3.85; });
  };
  const ueberschrift = (t) => {
    platz(12);
    verlauf(RA, y - 3.6, 1.6, 4.8, GRUEN2, GRUEN1, { r: 0.8, quer: false, n: 20 });
    schrift(9.6, true); fa(NAVY); doc.text(t, RA + 4, y); y += 5;
  };

  schrift(18, true); fa(NAVY); doc.text("Verschwiegenheitserklärung", RA, y + 3);
  schrift(10.5); fa(GRAU); doc.text(gegenseitig ? "Gegenseitige Vertraulichkeit (NDA)" : "Vertraulicher Umgang mit Kundendaten (NDA)", RA, y + 9.5);
  verlauf(RA, y + 12.5, 30, 1.2, GRUEN1, GRUEN2, { r: 0.65, n: 30 });
  y += 18;

  const partei = (rolle, zeilen, leer, h = 30) => {
    fl(HELL); doc.roundedRect(RA, y, BR, h, 2.5, 2.5, "F");
    doc.saveGraphicsState(); doc.roundedRect(RA, y, BR, h, 2.5, 2.5, null); doc.clip(); doc.discardPath();
    verlauf(RA, y, 2.2, h, GRUEN2, GRUEN1, { quer: false, n: 30 });
    doc.restoreGraphicsState();
    schrift(8, true); fa(GRAU); doc.text(rolle, RA + 7, y + 6.5, { charSpace: 0.5 });
    const x = RA + 52;
    zeilen.forEach(([wert, platzhalter], i) => {
      const yy = y + 6.5 + i * 5.2;
      if (leer) { schrift(7); fa(GRAU); doc.text(platzhalter, x, yy + 3.6); st(LINIE); doc.setLineWidth(0.3); doc.line(x, yy + 0.8, W - RA - 6, yy + 0.8); }
      else { schrift(i === 0 ? 10.5 : 9.2, i === 0); fa(TEXT); doc.text(wert || "", x, yy); }
    });
    y += h + 3;
  };
  partei("KUNDE", [[k.firma, "Firma"], [k.strasse, "Straße, Hausnummer"], [[k.plz, k.ort].filter(Boolean).join(" "), "PLZ, Ort"]], blanko, blanko ? 21 : 19);
  partei("EGC", [["EGC Energie"], [F.vertreter ? "vertreten durch " + F.vertreter + " (Geschäftsführung)" : ""], [[F.strasse, F.ort].filter(Boolean).join(", ")]], false, 19);
  y += 2;
  absatz(gegenseitig ? "Der oben genannte Kunde und EGC Energie (gemeinsam „die Parteien“) vereinbaren Folgendes:"
    : "EGC Energie verpflichtet sich gegenüber dem oben genannten Kunden wie folgt:");
  y += 1.5;

  ndaZiffern(gegenseitig).forEach(([titel, teile]) => {
    ueberschrift(titel);
    teile.forEach((t) => {
      if (t && t.punkte) {
        t.punkte.forEach((p) => {
          schrift(8.6); const z = doc.splitTextToSize(p, BR - 7);
          platz(z.length * 3.85);
          fl(GRUEN); doc.circle(RA + 2, y - 1.2, 0.8, "F");
          schrift(8.6); fa(TEXT); z.forEach((zt) => { doc.text(zt, RA + 6, y); y += 3.85; });
        });
        y += 1; return;
      }
      absatz(t); y += 1.8;
    });
    y += 1.5;
  });

  /* Unterschriften: Geschäftsführung immer, Kunde zur Kenntnis */
  platz(44);
  y += 4;
  schrift(10.5, true); fa(NAVY); doc.text("Unterschriften", RA, y); y += 6;
  const halb = (BR - 14) / 2, x2 = RA + halb + 14;
  const ort = (F.ort || "").replace(/^\d+\s*/, "");
  schrift(8); fa(GRAU);
  doc.text("Für EGC Energie (Geschäftsführung)", RA, y);
  doc.text(gegenseitig ? "Für den Kunden" : "Kunde (zur Kenntnis genommen)", x2, y);
  y += 4;
  if (unterschrift && unterschrift.bild) {
    try {
      const b = unterschrift.bild;
      const url = b.url || (await dateiInhalt(b));
      const hh = 13, bb = Math.min(halb, (hh * (b.breite || 600)) / (b.hoehe || 200));
      doc.addImage(url, /png/.test(String(url).slice(0, 30)) ? "PNG" : "JPEG", RA, y, bb, hh);
    } catch (e) { /* ohne Bild bleibt die Linie */ }
  }
  y += 15;
  st(TEXT); doc.setLineWidth(0.3); doc.line(RA, y, RA + halb, y); doc.line(x2, y, x2 + halb, y);
  schrift(8); fa(GRAU);
  /* voller Name aus den Firmendaten, wenn der Zugang nur den Vornamen trägt (z. B. „Karsten“) */
  const gfName = unterschrift && unterschrift.name;
  doc.text(F.vertreter && (!gfName || F.vertreter.startsWith(gfName)) ? F.vertreter + " (Geschäftsführung)" : gfName || "", RA, y + 4.5);
  doc.text("Unterschrift, Name in Druckbuchstaben", x2, y + 4.5);
  y += 9;
  schrift(8.6); fa(TEXT);
  doc.text(ort + ", " + (unterschrift && unterschrift.datum ? datum(unterschrift.datum) : "____________"), RA, y);
  doc.text("Ort, Datum: ______________________", x2, y);

  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) { doc.setPage(i); schrift(7); fa(GRAU); doc.text("Seite " + i + " von " + n, W - RA, H - 6.4, { align: "right" }); }
  const roh = doc.output("datauristring");
  const art = gegenseitig ? "_gegenseitig" : "_einseitig";
  const name = blanko ? "Verschwiegenheitserklaerung" + art + "_Blanko.pdf"
    : "Verschwiegenheitserklaerung" + art + "_" + String(k.firma || "Kunde").replace(/[^\wäöüÄÖÜß]+/g, "_") + ".pdf";
  return { name, typ: "application/pdf", groesse: Math.round(roh.length * 0.75), url: "data:application/pdf;base64," + roh.split(",")[1] };
}

/* ------------------------------------------------------------------ */
/*  Visitenkarte im EGC-Design, 85 × 55 mm mit 3 mm Beschnitt          */
/*  Die Geschäftsführung pflegt Berufsbezeichnung, Telefon, Mobil und  */
/*  E-Mail; jeder lädt seine Karte selbst herunter.                    */
/* ------------------------------------------------------------------ */
let qrLaden = null;
const ladeQr = () => {
  if (window.QRCode) return Promise.resolve(window.QRCode);
  if (!qrLaden)
    qrLaden = new Promise((fertig, fehler) => {
      const s = document.createElement("script");
      s.src = "/assets/qrcode-1.5.4.min.js";
      s.onload = () => fertig(window.QRCode);
      s.onerror = () => { qrLaden = null; fehler(new Error("QR-Baustein konnte nicht geladen werden.")); };
      document.head.appendChild(s);
    });
  return qrLaden;
};
const bildAlsDataUrl = async (pfad) => {
  const r = await fetch(pfad);
  if (!r.ok) throw new Error("Bild nicht gefunden: " + pfad);
  const b = await r.blob();
  return await new Promise((ok, f) => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.onerror = f; fr.readAsDataURL(b); });
};
/* Visitenkarten, Flyer, Broschüre und Signatur: Vertrieb und Geschäftsführung (nicht der Innendienst) */
const VISITENKARTE_ROLLEN = ["Vertriebspartner", "Teamleiter", "Leitung Vertrieb", "Geschäftsführung"];

async function visitenkartePdf(m) {
  const p = visitenkartenDaten(m);
  const F = FIRMENDATEN;
  const [jsPDF, QR, logoT] = await Promise.all([ladeJsPdf(), ladeQr(), bildAlsDataUrl("/assets/logo-weiss.png")]);
  const teile = p.name.trim().split(/\s+/);
  const nach = teile.length > 1 ? teile[teile.length - 1] : p.name, vor = teile.length > 1 ? teile.slice(0, -1).join(" ") : "";
  const plzOrt = /^(\d{5})\s+(.*)$/.exec(F.ort || "") || [null, "", F.ort || ""];
  const vcard = ["BEGIN:VCARD", "VERSION:3.0", "N:" + nach + ";" + vor + ";;;", "FN:" + p.name, "ORG:EGC Energie",
    p.titel ? "TITLE:" + p.titel : "", p.telefon ? "TEL;TYPE=WORK:" + p.telefon.replace(/\s/g, "") : "",
    p.mobil ? "TEL;TYPE=CELL:" + p.mobil.replace(/\s/g, "") : "", p.email ? "EMAIL:" + p.email : "",
    F.website ? "URL:https://" + F.website.replace(/^https?:\/\//, "") : "",
    "ADR;TYPE=WORK:;;" + (F.strasse || "") + ";" + plzOrt[2] + ";;" + plzOrt[1] + ";Deutschland", "END:VCARD"]
    .filter(Boolean).join("\n");
  const qr = await QR.toDataURL(vcard, { margin: 0, width: 600, errorCorrectionLevel: "M", color: { dark: "#0A1626", light: "#FFFFFF" } });

  const B = 3, CW = 85, CH = 55, W = CW + 2 * B, H = CH + 2 * B;
  const doc = new jsPDF({ unit: "mm", format: [W, H], orientation: "landscape", compress: true });
  const NAVY1 = [7, 16, 29], NAVY2 = [27, 58, 96], GRUEN = [108, 180, 59], GRUEN1 = [74, 140, 38], GRUEN2 = [150, 206, 96],
        WEISS = [255, 255, 255], TEXT = [22, 33, 44], GRAU = [107, 119, 135];
  const fl = (c) => doc.setFillColor(c[0], c[1], c[2]);
  const st = (c) => doc.setDrawColor(c[0], c[1], c[2]);
  const fa = (c) => doc.setTextColor(c[0], c[1], c[2]);
  const mische = (a, b, t) => a.map((c, i) => Math.round(c + (b[i] - c) * t));
  const dk = (o) => doc.setGState(new doc.GState({ opacity: o, "stroke-opacity": o }));
  const verlauf = (x, y, w, h, f1, f2, { quer = true, n = 90, r = 0 } = {}) => {
    doc.saveGraphicsState(); if (r) doc.roundedRect(x, y, w, h, r, r, null); else doc.rect(x, y, w, h, null); doc.clip(); doc.discardPath();
    for (let i = 0; i < n; i++) { fl(mische(f1, f2, i / (n - 1))); if (quer) doc.rect(x + (i * w) / n, y, w / n + 0.2, h, "F"); else doc.rect(x, y + (i * h) / n, w, h / n + 0.2, "F"); }
    doc.restoreGraphicsState();
  };
  const kringel = (x, y, r, c, o, art = "F", lw = 0.4) => {
    dk(o); if (art === "F") { fl(c); doc.circle(x, y, r, "F"); } else { st(c); doc.setLineWidth(lw); doc.circle(x, y, r, "S"); } dk(1);
  };
  const X = (v) => B + v, Y = (v) => B + v;
  const passend = (t, breite, gr) => { let g = gr; doc.setFontSize(g); while (g > 5 && doc.getTextWidth(String(t)) > breite) doc.setFontSize(g -= 0.25); };

  /* Vorderseite */
  verlauf(0, 0, W, H, NAVY1, NAVY2, { quer: false });
  doc.saveGraphicsState(); doc.rect(0, 0, W, H, null); doc.clip(); doc.discardPath();
  kringel(X(80), Y(2), 34, WEISS, 0.08, "S"); kringel(X(80), Y(2), 41, WEISS, 0.05, "S");
  doc.restoreGraphicsState();
  doc.addImage(logoT, "PNG", X(9), Y(15), (420 / 196) * 15, 15);
  verlauf(X(9), Y(35), 18, 0.9, GRUEN1, GRUEN2, { n: 30, r: 0.45 });
  doc.setFont("helvetica", "normal"); doc.setFontSize(6.8); fa([196, 208, 222]);
  doc.text(F.website || "", X(9), Y(42));

  /* Rückseite */
  doc.addPage([W, H], "landscape");
  fl(WEISS); doc.rect(0, 0, W, H, "F");
  verlauf(0, 0, X(3.2), H, GRUEN2, GRUEN1, { quer: false, n: 40 });
  doc.saveGraphicsState(); doc.rect(0, 0, W, H, null); doc.clip(); doc.discardPath();
  kringel(X(86), Y(56), 16, GRUEN, 0.08); kringel(X(86), Y(56), 22, GRUEN, 0.12, "S", 0.3);
  doc.restoreGraphicsState();
  doc.setFont("helvetica", "bold"); fa(NAVY1); passend(p.name, 48, 11); doc.text(p.name, X(9), Y(12));
  doc.setFont("helvetica", "normal"); fa(GRUEN1); passend(p.titel, 48, 7.2); doc.text(p.titel, X(9), Y(16.6));
  /* Zusatztitel (z. B. staatlich geprüfter Techniker): nur wenn eingetragen, höchstens zwei Zeilen */
  let yz = 16.6;
  if (p.zusatz) {
    doc.setFont("helvetica", "normal"); doc.setFontSize(5.4); fa(GRAU);
    doc.splitTextToSize(p.zusatz, 66).slice(0, 2).forEach((z) => { yz += 2.7; doc.text(z, X(9), Y(yz)); });
  }
  const linieY = p.zusatz ? yz + 2.4 : 19.6;
  verlauf(X(9), Y(linieY), 12, 0.7, GRUEN1, GRUEN2, { n: 20, r: 0.35 });
  const sym = (art, x, y) => {
    fl(GRUEN); doc.circle(x, y - 0.95, 1.55, "F"); st(WEISS); doc.setLineWidth(0.22);
    if (art === "tel") doc.roundedRect(x - 0.45, y - 1.85, 0.9, 1.8, 0.2, 0.2, "S");
    if (art === "mail") { doc.rect(x - 0.8, y - 1.5, 1.6, 1.1, "S"); doc.line(x - 0.8, y - 1.5, x, y - 0.85); doc.line(x + 0.8, y - 1.5, x, y - 0.85); }
    if (art === "web") { doc.circle(x, y - 0.95, 0.8, "S"); doc.line(x - 0.8, y - 0.95, x + 0.8, y - 0.95); }
    if (art === "ort") { doc.circle(x, y - 1.2, 0.5, "S"); doc.line(x - 0.45, y - 1, x, y - 0.1); doc.line(x + 0.45, y - 1, x, y - 0.1); }
  };
  const zeilen = [p.mobil ? ["tel", "Mobil " + p.mobil] : null, p.telefon ? ["tel", "Tel. " + p.telefon] : null,
    p.email ? ["mail", p.email] : null, F.website ? ["web", F.website] : null,
    ["ort", [F.strasse, F.ort].filter(Boolean).join(", ")]].filter(Boolean);
  const start = Math.max(27.5, linieY + 6.6);
  /* letzte Zeile spätestens 6 mm über der Schnittkante */
  const abstand = Math.min(5.2, (49 - start) / Math.max(1, zeilen.length - 1));
  zeilen.forEach(([a, t], i) => {
    const yy = Y(start + i * abstand); sym(a, X(10.5), yy);
    doc.setFont("helvetica", "normal"); fa(TEXT); passend(t, 44, 6.6); doc.text(t, X(14), yy);
  });
  fl([246, 248, 250]); doc.roundedRect(X(60), Y(23.5), 19, 22.5, 1.5, 1.5, "F");
  doc.addImage(qr, "PNG", X(61.5), Y(25), 16, 16);
  doc.setFontSize(4.6); fa(GRAU); doc.text("Kontakt speichern", X(69.5), Y(44), { align: "center" });

  const roh = doc.output("datauristring");
  return { name: "Visitenkarte_" + p.name.replace(/[^\wäöüÄÖÜß]+/g, "_") + "_Druckdatei.pdf", typ: "application/pdf",
           groesse: Math.round(roh.length * 0.75), url: "data:application/pdf;base64," + roh.split(",")[1] };
}

/* ------------------------------------------------------------------ */
/*  Portfolio-Flyer (2 Seiten A4) im EGC-Design, je Vertriebsmitarbeiter */
/*  Kontaktblock aus den Visitenkartendaten und dem Profilfoto.         */
/* ------------------------------------------------------------------ */
const FLYER = {
  intro: "EGC Energie ist Ihr unabhängiger Partner für die strategische Beschaffung von Strom und Erdgas. Wir entwickeln für Ihr Unternehmen eine passende Beschaffungsstrategie, setzen sie am Markt um und bewirtschaften sie über die gesamte Laufzeit, bundesweit für Industrie, Gewerbe und Mittelstand.",
  ziel: "Ihre externe Energieeinkaufsabteilung: Wir übernehmen den Energieeinkauf für Ihr Unternehmen und sind Ihr zentraler Ansprechpartner für Strom, Gas, Verträge und Energiekosten.",
  ziel2: "Unser Ziel: Energie zum richtigen Zeitpunkt einkaufen, Preisrisiken steuern und Ihre Energiekosten dauerhaft planbar machen.",
  beschaffung: [
    ["Individuelle Beschaffungsmodelle", [
      ["Strukturierte Tranchenbeschaffung", "Mengen in Teilschritten zu gezielten Zeitpunkten einkaufen"],
      ["Spotmarkt mit Absicherung", "Börsennähe kombiniert mit Preisgrenzen"],
      ["Festpreis und Terminmarkt", "Planungssicherheit für Ihr Budget"],
      ["PPA und Direktbezug", "Strom direkt aus Erzeugungsanlagen"],
      ["Portfolio für Unternehmensgruppen", "mehrere Standorte, ein Beschaffungskonzept"]]],
    ["Bewirtschaftung & Marktbeobachtung", [
      ["Individueller Beschaffungsplan", "Mengen, Zeitpunkte und Preisziele je Modell"],
      ["Laufende Marktüberwachung", "Strom- und Gasmärkte laufend im Blick"],
      ["Kaufempfehlungen bei Marktchancen", "günstige Marktphasen gezielt nutzen"],
      ["Zielpreise und Limits", "vereinbart, überwacht und umgesetzt"],
      ["Individuelle Kundenbetreuung", "ein persönlicher Ansprechpartner, zugeschnitten auf Ihr Unternehmen"]]],
  ],
  management: [
    ["Lastganganalyse (RLM)", "Grundlage für Beschaffungsplan und Lastspitzen"],
    ["Reporting und Budgetplanung", "Preise, Mengen und Kosten transparent je Standort"],
    ["Energierechnungsprüfung", "Abrechnungsfehler und versteckte Kosten aufdecken"],
    ["Netzentgelte und Blindarbeit", "netzbezogene Auffälligkeiten klären"]],
  technik: [
    ["Photovoltaik", "Dach- und Freiflächenanlagen über Partnerunternehmen oder Ausschreibung"],
    ["Batteriespeicher", "eigenen Strom speichern, Lastspitzen kappen"],
    ["Smartmeter", "digitale Messung über unsere Partner"],
    ["E-Ladesäulen", "Ladeinfrastruktur für Fuhrpark und Kunden"],
    ["Fördermittelberatung", "Zugang zu erfahrenen Fördermittelberatern"]],
  schritte: [
    ["Analyse", "Lastgang, Verträge und Ihr Risikoprofil auswerten."],
    ["Strategie", "Beschaffungsmodell und Beschaffungsplan festlegen."],
    ["Umsetzung", "Ausschreibung bei den Versorgern und Vertragsabschluss."],
    ["Bewirtschaftung", "Markt überwachen, Tranchen kaufen, laufend anpassen."],
    ["Nebenkosten", "Energienebenkosten senken, Erstattungen sichern."]],
  nebenkosten: [
    ["Strom- & Energiesteuer", "Rückerstattung und Entlastung"],
    ["Konzessionsabgabe", "prüfen und korrigieren lassen"],
    ["Netzentgelte", "atypische und individuelle Netzentgelte"],
    ["CO2-Kompensation", "Entlastungswege nutzen, wo möglich"]],
  vorteile: [
    ["WIRTSCHAFTLICHKEIT", "& PLANBARKEIT", [
      ["Bessere Einkaufspreise", "durch Einkauf zum richtigen Zeitpunkt statt zum Stichtag"],
      ["Planbare Budgets", "Preisrisiken gezielt steuern und absichern"],
      ["Volle Transparenz", "Reporting zu Mengen, Preisen und Kosten"],
      ["Entlastung Ihres Einkaufs", "wir übernehmen Beschaffung und Vertragsmanagement"]]],
    ["INDIVIDUELL", "& PERSÖNLICH", [
      ["Ein zentraler Ansprechpartner", "für alle Energiethemen, der Ihr Unternehmen und Ihre Verträge kennt"],
      ["Bundesweit für Sie da", "persönliche Betreuung in ganz Deutschland, vor Ort und digital"],
      ["Konzepte für Ihre Branche", "für Industrie, Produktion, Logistik, Handel und Gewerbe"]]],
    ["UNABHÄNGIG", "& FLEXIBEL", [
      ["Versorgerunabhängige Beratung", "wir empfehlen, was zu Ihrem Unternehmen passt"],
      ["Schnelle Reaktion auf den Markt", "wir passen Ihre Strategie an Preise und Regeln an"]]],
    ["NACHHALTIG", "& ZUKUNFTSSICHER", [
      ["Ökostrom mit Herkunftsnachweis", "auf Wunsch für Ihren gesamten Bedarf"],
      ["Eigene Erzeugung und Speicher", "PV, Batteriespeicher und Ladesäulen über geprüfte Partner, Ausschreibungen und unser Netzwerk"],
      ["Fördermittel nutzen", "über unseren Zugang zu Fördermittelberatern"],
      ["Digitale Messung", "Smartmeter über unsere Partner"]]],
  ],
};

/* Imagebroschüre zum Versenden, 12 Seiten A4, hinten mit den Kontaktdaten des Vertriebspartners.
   Aufbau gemeinsam mit der Druckdatei in druckvorlagen/broschuere/broschuere.js; Stand wie in build.mjs. */
const BROSCHUERE_PFAD = "/assets/broschuere-1/";
const BROSCHUERE_BILDER = ["titel.jpg", "beratung.jpg", "speicher.jpg", "umspannwerk.jpg", "carport.jpg", "produktion.jpg", "rueckseite.jpg"];
let broschuereLaden = null;
const ladeBroschuere = () => {
  if (window.EGCBroschuere) return Promise.resolve(window.EGCBroschuere);
  if (!broschuereLaden)
    broschuereLaden = new Promise((fertig, fehler) => {
      const s = document.createElement("script");
      s.src = BROSCHUERE_PFAD + "broschuere.js";
      s.onload = () => fertig(window.EGCBroschuere);
      s.onerror = () => { broschuereLaden = null; fehler(new Error("Broschüren-Baustein konnte nicht geladen werden.")); };
      document.head.appendChild(s);
    });
  return broschuereLaden;
};
async function imagebroschuerePdf(m) {
  const p = visitenkartenDaten(m);
  const base64 = async (pfad) => (await bildAlsDataUrl(pfad)).split(",")[1];
  const [jsPDF, QR, baustein, logoT, regular, fett, ...bilder] = await Promise.all([
    ladeJsPdf(), ladeQr(), ladeBroschuere(), bildAlsDataUrl("/assets/logo-weiss.png"),
    base64(BROSCHUERE_PFAD + "LiberationSans-Regular.ttf"), base64(BROSCHUERE_PFAD + "LiberationSans-Bold.ttf"),
    ...BROSCHUERE_BILDER.map((b) => bildAlsDataUrl(BROSCHUERE_PFAD + b))]);
  const bild = (f) => {
    const i = BROSCHUERE_BILDER.indexOf(f);
    if (i < 0) throw new Error("Bild fehlt: " + f);
    /* bildAlsDataUrl liefert je nach Server einen anderen Typ; jsPDF braucht image/jpeg */
    return "data:image/jpeg;base64," + bilder[i].split(",")[1];
  };
  const doc = await baustein.baue({ jsPDF, QR, bild, logoT, schriften: { regular, fett }, D: baustein.D, P: p, versand: true });
  const roh = doc.output("datauristring");
  return { name: "Imagebroschuere_EGC_" + p.name.replace(/[^\wäöüÄÖÜß]+/g, "_") + ".pdf", typ: "application/pdf",
           groesse: Math.round(roh.length * 0.75), url: "data:application/pdf;base64," + roh.split(",")[1] };
}

async function portfolioFlyerPdf(m) {
  const p = visitenkartenDaten(m);
  const F = FIRMENDATEN;
  const [jsPDF, logoT] = await Promise.all([ladeJsPdf(), bildAlsDataUrl("/assets/logo-weiss.png")]);
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const W = 210, H = 297, RA = 15, BR = W - 2 * RA;
  const NAVY = [10, 22, 38], NAVY1 = [7, 16, 29], NAVY2 = [27, 58, 96], GRUEN = [108, 180, 59], GRUEN1 = [74, 140, 38],
        GRUEN2 = [150, 206, 96], WEISS = [255, 255, 255], TEXT = [22, 33, 44], GRAU = [107, 119, 135],
        HELL = [246, 248, 250], HELLBLAU = [196, 208, 222], LINIE = [216, 221, 228];
  const fl = (c) => doc.setFillColor(c[0], c[1], c[2]);
  const st = (c) => doc.setDrawColor(c[0], c[1], c[2]);
  const fa = (c) => doc.setTextColor(c[0], c[1], c[2]);
  const schrift = (g, fett) => { doc.setFont("helvetica", fett ? "bold" : "normal"); doc.setFontSize(g); };
  const mische = (a, b, t) => a.map((c, i) => Math.round(c + (b[i] - c) * t));
  const dk = (o) => doc.setGState(new doc.GState({ opacity: o, "stroke-opacity": o }));
  const verlauf = (x, y, w, h, f1, f2, { quer = true, n = 90, r = 0, kreis = false } = {}) => {
    doc.saveGraphicsState();
    if (kreis) doc.circle(x + w / 2, y + h / 2, w / 2, null); else if (r) doc.roundedRect(x, y, w, h, r, r, null); else doc.rect(x, y, w, h, null);
    doc.clip(); doc.discardPath();
    for (let i = 0; i < n; i++) { fl(mische(f1, f2, i / (n - 1))); if (quer) doc.rect(x + (i * w) / n, y, w / n + 0.2, h, "F"); else doc.rect(x, y + (i * h) / n, w, h / n + 0.2, "F"); }
    doc.restoreGraphicsState();
  };
  const ring = (x, y, r, o) => { dk(o); st(WEISS); doc.setLineWidth(0.5); doc.circle(x, y, r, "S"); dk(1); };
  const haken = (x, y, f = GRUEN) => {
    fl(f); doc.circle(x, y - 1.1, 1.7, "F"); st(WEISS); doc.setLineWidth(0.4);
    doc.line(x - 0.75, y - 1.1, x - 0.2, y - 0.5); doc.line(x - 0.2, y - 0.5, x + 0.85, y - 1.75);
  };
  /* Überschrift in zwei Farben: erster Teil navy, zweiter grün */
  const kopfzeile = (a, b, x, y, gr = 10, hell = false) => {
    schrift(gr, true); fa(hell ? WEISS : NAVY); doc.text(a, x, y);
    if (b) { const w = doc.getTextWidth(a + " "); fa(hell ? GRUEN2 : GRUEN1); doc.text(b, x + w, y); }
  };
  /* Punkt mit fettem Titel und grauer Zeile darunter; gibt die neue y-Position zurück */
  const punkt = (titel, unter, x, y, breite, gr = 8.8, hell = false) => {
    haken(x + 1.7, y);
    schrift(gr, true); fa(hell ? WEISS : TEXT);
    const t = doc.splitTextToSize(titel, breite - 6); doc.text(t, x + 5.4, y); y += t.length * gr * 0.42;
    if (unter) { schrift(gr - 0.9); fa(hell ? HELLBLAU : GRAU); const u = doc.splitTextToSize(unter, breite - 6); doc.text(u, x + 5.4, y); y += u.length * (gr - 0.9) * 0.42; }
    return y + gr * 0.3;
  };
  const kopf = (kicker, a, b) => {
    const hk = 52;
    verlauf(0, 0, W, hk, NAVY1, NAVY2, { quer: false });
    doc.saveGraphicsState(); doc.rect(0, 0, W, hk, null); doc.clip(); doc.discardPath();
    ring(W - 20, 6, 30, 0.09); ring(W - 20, 6, 40, 0.06); ring(W - 20, 6, 50, 0.04);
    doc.restoreGraphicsState();
    doc.addImage(logoT, "PNG", W - RA - (420 / 196) * 11, 9, (420 / 196) * 11, 11);
    schrift(7, true); fa(GRUEN2); doc.text(kicker, RA, 15, { charSpace: 0.9 });
    schrift(21, true); fa(WEISS); doc.text(a, RA, 29);
    schrift(21, true); fa(GRUEN2); doc.text(b, RA, 38.5);
    verlauf(0, hk, W, 1.3, GRUEN1, GRUEN2);
    return hk;
  };
  const fuss = () => {
    schrift(6.6); fa(GRAU);
    doc.text(["EGC Energie", [F.strasse, F.ort].filter(Boolean).join(", "), F.telefon ? "Tel. " + F.telefon : "", F.website].filter(Boolean).join("  ·  "),
      W / 2, H - 6, { align: "center" });
  };

  /* ---------- Seite 1: Leistungsportfolio ---------- */
  let y = kopf("UNSER LEISTUNGSPORTFOLIO IM ÜBERBLICK", "Strategische Energiebeschaffung", "für den Mittelstand");
  y += 9;
  schrift(8.6); fa(TEXT);
  const li = doc.splitTextToSize(FLYER.intro + " " + FLYER.ziel2, 108); doc.text(li, RA, y, { lineHeightFactor: 1.4 });
  fl(HELL); doc.roundedRect(RA + 115, y - 4.5, BR - 115, 28, 2.5, 2.5, "F");
  verlauf(RA + 115, y - 4.5, 1.6, 28, GRUEN2, GRUEN1, { quer: false, n: 20 });
  schrift(8.3, true); fa(NAVY); doc.text(doc.splitTextToSize(FLYER.ziel, BR - 123), RA + 120, y + 0.5, { lineHeightFactor: 1.4 });
  y += Math.max(li.length * 4.2, 24) + 7;

  kopfzeile("BESCHAFFUNGSSTRATEGIE", "& BEWIRTSCHAFTUNG", RA, y, 10.5); y += 6;
  const spB = (BR - 6) / 2;
  const y0 = y;
  let yEnde = y;
  FLYER.beschaffung.forEach(([titel, punkte], i) => {
    const x = RA + i * (spB + 6);
    fl(HELL); doc.roundedRect(x, y0, spB, 70, 2.5, 2.5, "F");
    schrift(8.6, true); fa(GRUEN1); doc.text(titel, x + 4, y0 + 7);
    let yy = y0 + 13;
    punkte.forEach(([t, u]) => { yy = punkt(t, u, x + 3, yy, spB - 5); });
    yEnde = Math.max(yEnde, yy);
  });
  y = y0 + 70 + 9;

  const sp2 = (BR - 8) / 2;
  kopfzeile("ENERGIEMANAGEMENT", "& ANALYSEN", RA, y, 10.5);
  kopfzeile("TECHNISCHE LÖSUNGEN", "& PARTNER", RA + sp2 + 8, y, 10.5);
  y += 4.8;
  schrift(7.4); fa(GRAU);
  doc.text("Umsetzung über Partnerunternehmen, Ausschreibungen und unser Netzwerk", RA + sp2 + 8, y);
  y += 5.2;
  let ya = y, yb = y;
  FLYER.management.forEach(([t, u]) => { ya = punkt(t, u, RA, ya, sp2); });
  FLYER.technik.forEach(([t, u]) => { yb = punkt(t, u, RA + sp2 + 8, yb, sp2); });
  y = Math.max(ya, yb) + 4;

  /* Nebenkosten als dunkles Band, fest am unteren Rand */
  const bh = 44;
  y = H - 12 - bh;
  verlauf(0, y, W, bh, NAVY1, NAVY2, { quer: false });
  doc.saveGraphicsState(); doc.rect(0, y, W, bh, null); doc.clip(); doc.discardPath();
  ring(18, y + bh + 6, 22, 0.07); ring(18, y + bh + 6, 30, 0.05);
  doc.restoreGraphicsState();
  kopfzeile("NEBENKOSTENOPTIMIERUNG", "& ERSTATTUNGEN", RA, y + 9, 10.5, true);
  const kb = (BR - 9) / 4;
  FLYER.nebenkosten.forEach(([t, u], i) => {
    const x = RA + i * (kb + 3), yy = y + 15;
    dk(0.08); fl(WEISS); doc.roundedRect(x, yy, kb, bh - 20, 2.2, 2.2, "F"); dk(1);
    verlauf(x, yy, kb, 1.2, GRUEN1, GRUEN2, { n: 20 });
    schrift(8.6, true); fa(WEISS); const tt = doc.splitTextToSize(t, kb - 6); doc.text(tt, x + 3, yy + 7);
    schrift(7.6); fa(HELLBLAU); doc.text(doc.splitTextToSize(u, kb - 6), x + 3, yy + 7 + tt.length * 3.7 + 0.8);
  });
  fuss();

  /* ---------- Seite 2: Vorteile und Kontakt ---------- */
  doc.addPage();
  y = kopf("KUNDENVORTEILE IM ÜBERBLICK", "Ihre Vorteile mit EGC Energie", "auf einen Blick");
  y += 11;
  const sp = (BR - 10) / 2;
  const spalten = [[FLYER.vorteile[0], FLYER.vorteile[2]], [FLYER.vorteile[1], FLYER.vorteile[3]]];
  let yMax = y;
  spalten.forEach((bloecke, i) => {
    const x = RA + i * (sp + 10);
    let yy = y;
    bloecke.forEach(([a, b, punkte]) => {
      kopfzeile(a, b, x, yy, 10.5); yy += 7;
      punkte.forEach(([t, u]) => { yy = punkt(t, u, x, yy, sp, 9.2); });
      yy += 6;
    });
    yMax = Math.max(yMax, yy);
  });

  /* So einfach geht's: vier Schritte zwischen Vorteilen und Kontakt */
  const kh = 62, ky = H - kh - 12;
  /* Schritte mittig zwischen Vorteilen und Kontaktblock */
  const sy = yMax + Math.max(1, (ky - yMax - 49) / 2);
  kopfzeile("SO EINFACH", "GEHT'S", RA, sy, 10.5);
  const ns = FLYER.schritte.length, sb = (BR - 3 * (ns - 1)) / ns;
  FLYER.schritte.forEach(([t, u], i) => {
    const x = RA + i * (sb + 3), yy = sy + 6;
    fl(HELL); doc.roundedRect(x, yy, sb, 37, 2.5, 2.5, "F");
    verlauf(x + 4, yy + 4, 8, 8, GRUEN2, GRUEN1, { kreis: true, quer: false, n: 24 });
    schrift(10, true); fa(WEISS); doc.text(String(i + 1), x + 8, yy + 9.6, { align: "center" });
    if (i < ns - 1) { st(GRUEN2); doc.setLineWidth(0.5); doc.setLineDashPattern([0.8, 0.9], 0); doc.line(x + 13, yy + 8, x + sb + 1, yy + 8); doc.setLineDashPattern([], 0); }
    schrift(8.8, true); fa(NAVY); doc.text(t, x + 4, yy + 18);
    schrift(7.4); fa(GRAU); doc.text(doc.splitTextToSize(u, sb - 7), x + 4, yy + 22.5);
  });

  /* Kontaktblock */
  verlauf(RA, ky, BR, kh, NAVY1, NAVY2, { r: 4, n: 60 });
  doc.saveGraphicsState(); doc.roundedRect(RA, ky, BR, kh, 4, 4, null); doc.clip(); doc.discardPath();
  ring(W - RA - 30, ky + 4, 34, 0.08); ring(W - RA - 30, ky + 4, 44, 0.05);
  verlauf(RA, ky, BR, 1.4, GRUEN1, GRUEN2, { n: 40 });
  doc.restoreGraphicsState();
  schrift(17, true); fa(WEISS); doc.text("So erreichen Sie", RA + 9, ky + 14);
  const w1 = doc.getTextWidth("So erreichen Sie ");
  fa(GRUEN2); doc.text("uns!", RA + 9 + w1, ky + 14);
  schrift(11.5, true); fa(GRUEN2); doc.text(p.name, RA + 9, ky + 25);
  schrift(8.4); fa(HELLBLAU); doc.text(p.titel, RA + 9, ky + 30);
  if (p.zusatz) { schrift(7); doc.text(doc.splitTextToSize(p.zusatz, 110)[0], RA + 9, ky + 34); }
  const zeilen = [p.mobil ? "Mobil " + p.mobil : null, p.telefon ? "Tel. " + p.telefon : null, p.email, F.website].filter(Boolean);
  zeilen.forEach((t, i) => {
    const yy = ky + 41 + i * 5;
    fl(GRUEN); doc.circle(RA + 10.6, yy - 1.1, 1.5, "F");
    schrift(8.6); fa(WEISS); doc.text(t, RA + 14.5, yy);
  });
  /* Foto rund, sonst Initialen */
  const cx = W - RA - 30, cy = ky + kh / 2 + 2, r = 17;
  const bild = typeof m.bild === "string" && /^data:image\/(jpeg|png)/.test(m.bild) ? m.bild : null;
  if (bild) {
    doc.saveGraphicsState(); doc.circle(cx, cy, r, null); doc.clip(); doc.discardPath();
    doc.addImage(bild, /png/.test(bild.slice(0, 20)) ? "PNG" : "JPEG", cx - r, cy - r, 2 * r, 2 * r);
    doc.restoreGraphicsState();
  } else {
    verlauf(cx - r, cy - r, 2 * r, 2 * r, NAVY2, [48, 88, 134], { kreis: true, quer: false, n: 40 });
    const ini = String(p.name || "EGC").split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
    schrift(20, true); fa(WEISS); doc.text(ini, cx, cy + 3.5, { align: "center" });
  }
  st(GRUEN); doc.setLineWidth(1.1); doc.circle(cx, cy, r + 0.8, "S");
  fuss();

  const roh = doc.output("datauristring");
  return { name: "Portfolio-Flyer_EGC_" + p.name.replace(/[^\wäöüÄÖÜß]+/g, "_") + ".pdf", typ: "application/pdf",
           groesse: Math.round(roh.length * 0.75), url: "data:application/pdf;base64," + roh.split(",")[1] };
}

/* Erzeugt das Angebot als PDF. Gibt ein Dateiobjekt zurück wie ein Upload. */
async function egcAngebotPdf(a, v, { mitarbeiter, vorversorger = {}, spotVorversorger = null, vollmachtBemerkung = "", blanko = false, smartmeter = null }) {
  const jsPDF = await ladeJsPdf();
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const W = 210, H = 297, RA = 16, BR = W - 2 * RA;
  const NAVY = [10, 22, 38], GRUEN = [108, 180, 59], TEXT = [22, 33, 44], GRAU = [107, 119, 135],
        LINIE = [216, 221, 228], HELL = [246, 248, 250], GRUENHELL = [238, 246, 232];
  const F = FIRMENDATEN;
  const kunde = a.kunde || {};
  const berater = mitarbeiter.find((m) => m.id === a.partnerId) || {};
  const ansprech = kunde.ansprechpartner || "";
  const heuteD = datum(a.kalkulation && a.kalkulation.datum || heute());
  const gueltig = v.gueltigBis ? datum(v.gueltigBis) : "";
  const ende = blanko ? null : enddatum(v);
  const zahl = (x, d = 2) => num(x, d);
  const ct = (x) => (x == null || isNaN(x) ? "–" : zahl(x, 4) + " ct/kWh");
  const ct3 = (x) => (x == null || isNaN(x) ? "–" : zahl(x, 4) + " ct/kWh");
  const eurx = (x) => (x == null || isNaN(x) ? "–" : zahl(x, 2) + " €");
  const logo = "data:image/jpeg;base64," + LOGO_PDF;
  let smTitel = 0; /* Seitennummer der Smartmeter-Titelseite: ohne Seitenzahl */

  const farbe = (f) => doc.setTextColor(f[0], f[1], f[2]);
  const flaeche = (f) => doc.setFillColor(f[0], f[1], f[2]);
  const strich = (f) => doc.setDrawColor(f[0], f[1], f[2]);
  const schrift = (gr, fett) => { doc.setFont("helvetica", fett ? "bold" : "normal"); doc.setFontSize(gr); };
  const text = (t, x, y, opt) => doc.text(String(t == null ? "" : t), x, y, opt);
  const absatz = (t, x, y, breite, gr = 8.5, zeile = 4) => {
    schrift(gr); const z = doc.splitTextToSize(String(t), breite); doc.text(z, x, y, { lineHeightFactor: 1.35 });
    return y + z.length * zeile;
  };
  const fuss = () => pdfFussFirma(doc, W, H, RA);
  /* Schrift verkleinern, bis der Text in die Breite passt */
  const passend = (t, breite, gr) => { let g = gr; doc.setFontSize(g); while (g > 6 && doc.getTextWidth(String(t)) > breite) doc.setFontSize(g -= 0.5); };

  /* Gestaltung: Verläufe, Transparenz, abgerundete Karten (alles als Vektor, keine Bilder) */
  const NAVY1 = [7, 16, 29], NAVY2 = [27, 58, 96], GRUEN1 = [74, 140, 38], GRUEN2 = [150, 206, 96],
        WEISS = [255, 255, 255], GRUENMITTEL = [218, 236, 204];
  const mische = (f1, f2, t) => f1.map((c, i) => Math.round(c + (f2[i] - c) * t));
  const deckkraft = (o) => doc.setGState(new doc.GState({ opacity: o, "stroke-opacity": o }));
  /* Verlaufsfläche, wahlweise mit runden Ecken (r) oder als Kreis (kreis) */
  const verlauf = (x, y, w, h, f1, f2, { r = 0, quer = true, kreis = false, stufen = 90 } = {}) => {
    doc.saveGraphicsState();
    if (kreis) doc.circle(x + w / 2, y + h / 2, w / 2, null);
    else if (r) doc.roundedRect(x, y, w, h, r, r, null);
    else doc.rect(x, y, w, h, null);
    doc.clip(); doc.discardPath();
    for (let i = 0; i < stufen; i++) {
      flaeche(mische(f1, f2, i / (stufen - 1)));
      if (quer) doc.rect(x + (i * w) / stufen, y, w / stufen + 0.25, h, "F");
      else doc.rect(x, y + (i * h) / stufen, w, h / stufen + 0.25, "F");
    }
    doc.restoreGraphicsState();
  };
  /* weicher Schatten unter einer Karte */
  const schatten = (x, y, w, h, r = 2.5) => {
    flaeche(NAVY);
    [[1.6, 0.025], [1.0, 0.035], [0.5, 0.05]].forEach(([d, o]) => {
      deckkraft(o); doc.roundedRect(x - d * 0.3, y + d * 0.6, w + d * 0.6, h + d * 0.5, r + d * 0.4, r + d * 0.4, "F");
    });
    deckkraft(1);
  };
  const karte = (x, y, w, h, { r = 2.5, fuellung = WEISS, rand = LINIE, mitSchatten = true } = {}) => {
    if (mitSchatten) schatten(x, y, w, h, r);
    flaeche(fuellung); doc.roundedRect(x, y, w, h, r, r, "F");
    if (rand) { strich(rand); doc.setLineWidth(0.25); doc.roundedRect(x, y, w, h, r, r, "S"); }
  };
  /* durchscheinender Kreis als Schmuck */
  const kringel = (x, y, r, f, o, art = "F") => {
    deckkraft(o);
    if (art === "F") { flaeche(f); doc.circle(x, y, r, "F"); }
    else { strich(f); doc.setLineWidth(0.6); doc.circle(x, y, r, "S"); }
    deckkraft(1);
  };
  const kopf = (titel) => {
    verlauf(0, 0, W, 26, NAVY1, NAVY2);
    doc.saveGraphicsState(); doc.rect(0, 0, W, 26, null); doc.clip(); doc.discardPath();
    kringel(W - 22, -4, 24, GRUEN, 0.16); kringel(W - 52, 30, 16, WEISS, 0.05);
    kringel(W - 8, -8, 30, WEISS, 0.08, "S");
    doc.restoreGraphicsState();
    doc.addImage(logo, "JPEG", RA, 6, (420 / 196) * 13, 13);
    schrift(15, true); farbe(WEISS); text(titel, W - RA, 16, { align: "right" });
    verlauf(0, 26, W, 1.3, GRUEN1, GRUEN2);
    fuss();
    return 36;
  };
  const neueSeite = (titel) => { doc.addPage(); return kopf(titel); };
  const ueberschrift = (t, x, y) => {
    verlauf(x, y - 3.6, 1.6, 4.8, GRUEN2, GRUEN1, { r: 0.8, quer: false, stufen: 20 });
    schrift(10, true); farbe(NAVY); text(t.toUpperCase(), x + 4, y); return y + 6;
  };
  const haken = (x, y) => {
    flaeche(GRUEN); doc.circle(x + 1.6, y - 1.2, 2, "F");
    strich(WEISS); doc.setLineWidth(0.45);
    doc.line(x + 0.7, y - 1.2, x + 1.35, y - 0.5); doc.line(x + 1.35, y - 0.5, x + 2.6, y - 2.0);
  };
  /* Ausfüllbare Felder (PDF-Formular): am iPhone in der Dateien-App oder in jedem PDF-Editor
     direkt beschreibbar. Nur dort, wo noch nichts eingedruckt ist. Namen ohne Umlaute. */
  const feldZahl = {}, formFelder = [];
  const feldName = (name) => { const n = feldZahl[name] = (feldZahl[name] || 0) + 1; return n > 1 ? name + " " + n : name; };
  const seiteJetzt = () => doc.internal.getCurrentPageInfo().pageNumber;
  const feld = (name, x, y, w, h = 4.4, { mehrzeilig = false, gr = 8.5 } = {}) =>
    formFelder.push({ art: "text", name: feldName(name), seite: seiteJetzt(), x, y, w, h, gr, mehrzeilig });
  const ankreuzen = (name, x, y, s = 2.8) =>
    formFelder.push({ art: "kreuz", name: feldName(name), seite: seiteJetzt(), x, y, w: s, h: s });
  /* mitFeldern: Ort/Datum und Name werden ausfüllbar; die Unterschrift bleibt frei zum Zeichnen */
  const unterschriften = (y, felder, einzug = 0, mitFeldern = null, hoehe = 10.6) => {
    const b = (BR - 2 * einzug - 8 * (felder.length - 1)) / felder.length;
    strich(TEXT); doc.setLineWidth(0.3);
    felder.forEach((f, i) => {
      const x = RA + einzug + i * (b + 8);
      doc.line(x, y, x + b, y); schrift(7.5); farbe(GRAU); text(f, x, y + 4);
      if (mitFeldern && /^(Ort|Name)/.test(f))
        feld(mitFeldern + (/^Ort/.test(f) ? " Ort Datum" : " Name"), x, y - 6, b, 5.4, { gr: 10 });
      if (mitFeldern && /^Unterschrift/.test(f))
        formFelder.push({ art: "unterschrift", name: feldName("Unterschrift " + mitFeldern), seite: seiteJetzt(), x, y: y - hoehe - 0.4, w: b, h: hoehe });
    });
    return y + 10;
  };

  let y;
  if (!blanko) {
  /* ---------- Deckblatt ---------- */
  /* großer Kopfbereich mit Verlauf und schräger Unterkante */
  const HK = 158;
  verlauf(0, 0, W, HK, NAVY1, NAVY2, { quer: false });
  doc.saveGraphicsState(); doc.rect(0, 0, W, HK, null); doc.clip(); doc.discardPath();
  kringel(W - 18, 22, 58, GRUEN, 0.13); kringel(W - 18, 22, 40, NAVY1, 0.18);
  kringel(W - 18, 22, 70, WEISS, 0.07, "S"); kringel(W - 18, 22, 82, WEISS, 0.04, "S");
  kringel(18, HK - 10, 34, GRUEN, 0.08); kringel(W - 70, HK - 12, 12, WEISS, 0.06);
  /* Punkteraster */
  flaeche(WEISS); deckkraft(0.16);
  for (let i = 0; i < 9; i++) for (let k = 0; k < 5; k++) doc.circle(W - RA - 2 - i * 4.2, 96 + k * 4.2, 0.45, "F");
  deckkraft(1);
  /* zwei geschwungene Linien wie eine Lastkurve */
  [[0.35, 0.9, 0], [0.18, 0.6, 7]].forEach(([o, lw, dy]) => {
    deckkraft(o); strich(GRUEN2); doc.setLineWidth(lw);
    doc.lines([[30, -22, 60, 18, 92, -6], [32, -24, 62, 10, 118, -20]], 0, 128 + dy, [1, 1], "S");
  });
  deckkraft(1);
  doc.restoreGraphicsState();
  /* schräge Kante: grüner Streifen mit Verlauf, darunter weiß */
  const vieleck = (p, stil) => doc.lines(p.slice(1).map((q, i) => [q[0] - p[i][0], q[1] - p[i][1]]),
    p[0][0], p[0][1], [1, 1], stil, true);
  doc.saveGraphicsState();
  vieleck([[0, HK], [W, HK - 26], [W, HK - 22.4], [0, HK + 3.6]], null); doc.clip(); doc.discardPath();
  verlauf(0, HK - 26, W, 30, GRUEN1, GRUEN2, { stufen: 60 });
  doc.restoreGraphicsState();
  flaeche(WEISS); vieleck([[0, HK + 3.6], [W, HK - 22.4], [W, HK + 8], [0, HK + 8]], "F");

  doc.addImage(logo, "JPEG", RA, 22, (420 / 196) * 22, 22);
  schrift(8, true); farbe(GRUEN2); text("ENERGIEBERATUNG & VERTRIEB", RA, 54, { charSpace: 0.8 });
  schrift(17); farbe([196, 208, 222]); text("Ihr individuelles", RA, 80);
  schrift(36, true); farbe(WEISS); text("Energieangebot", RA, 95);
  verlauf(RA, 100, 34, 1.4, GRUEN1, GRUEN2, { r: 0.7, stufen: 30 });
  doc.setFont("helvetica", "italic"); doc.setFontSize(10.5); farbe([196, 208, 222]);
  text("Persönlich zusammengestellt für " + (kunde.firma || ""), RA, 110, { maxWidth: BR - 20 });

  /* Karte mit den Eckdaten des Angebots */
  y = 182;
  const kh = 64;
  karte(RA, y, BR, kh, { r: 3.5, rand: null });
  doc.saveGraphicsState(); doc.roundedRect(RA, y, BR, kh, 3.5, 3.5, null); doc.clip(); doc.discardPath();
  verlauf(RA, y, 3, kh, GRUEN2, GRUEN1, { quer: false, stufen: 40 });
  kringel(W - RA - 6, y + kh - 4, 22, GRUEN, 0.07);
  doc.restoreGraphicsState();
  strich(LINIE); doc.setLineWidth(0.25); doc.roundedRect(RA, y, BR, kh, 3.5, 3.5, "S");
  const felder = [["Angebot für", [ansprech, kunde.firma].filter(Boolean).join(", ")], ["Ihr Berater", berater.name || ""],
    ["Erstellt am", heuteD], ["Gültig bis", gueltig || "–"]];
  felder.forEach(([k, w], i) => {
    const sx = RA + 12 + (i % 2) * (BR / 2), sy = y + 15 + Math.floor(i / 2) * 26;
    flaeche(GRUENHELL); doc.circle(sx + 2.4, sy - 1.6, 4.2, "F");
    flaeche(GRUEN); doc.circle(sx + 2.4, sy - 1.6, 1.5, "F");
    schrift(7, true); farbe(GRAU); text(k.toUpperCase(), sx + 9.5, sy - 3, { charSpace: 0.4 });
    schrift(11, true); farbe(TEXT); passend(w, BR / 2 - 24, 11); text(w, sx + 9.5, sy + 3);
  });
  strich(LINIE); doc.setLineWidth(0.2);
  doc.line(RA + 12, y + kh / 2 + 0.5, W - RA - 10, y + kh / 2 + 0.5);
  doc.line(RA + BR / 2 + 2, y + 7, RA + BR / 2 + 2, y + kh - 7);
  /* drei Versprechen aus den Leistungen als runde Plaketten */
  [EGC_LEISTUNGEN[0], EGC_LEISTUNGEN[4], EGC_LEISTUNGEN[3]].forEach((t, i) => {
    const pb = (BR - 8) / 3, px = RA + i * (pb + 4), py = y + kh + 14;
    flaeche(GRUENHELL); doc.roundedRect(px, py, pb, 11, 5.5, 5.5, "F");
    haken(px + 3.2, py + 6.9);
    schrift(8, true); farbe(NAVY); passend(t, pb - 13, 8); text(t, px + 9.5, py + 6.8);
  });

  /* Fußband */
  verlauf(0, H - 16, W, 16, NAVY1, NAVY2);
  doc.saveGraphicsState(); doc.rect(0, H - 16, W, 16, null); doc.clip(); doc.discardPath();
  kringel(W - 20, H + 4, 22, GRUEN, 0.18); kringel(W - 20, H + 4, 30, WEISS, 0.07, "S");
  doc.restoreGraphicsState();
  verlauf(0, H - 16, W, 1.2, GRUEN1, GRUEN2);
  schrift(8.5, true); farbe(WEISS);
  text([F.vertreter, "EGC Energie"].filter(Boolean).join(" · "), RA, H - 6.5);
  schrift(8); farbe([196, 208, 222]); text([F.telefon ? "Tel. " + F.telefon : "", F.website].filter(Boolean).join("  ·  "), W - RA - 22, H - 6.5, { align: "right" });

  /* ---------- Angebot je Sparte ---------- */
  const sparten = (v.sparte && v.sparte !== "beide") ? [v.sparte]
    : ["strom", "gas"].filter((s) => stellenVon(a, v).some((l) => l.medium === s));
  let summeAlt = 0, summeNeu = 0, mitVergleich = false;
  const ausgleiche = []; /* je Lieferstelle mit älterer Abrechnung: Umlagen-Ausgleich für den Hinweis */

  for (const sparte of sparten) {
    const stellen = stellenVon(a, v).filter((l) => l.medium === sparte);
    if (!stellen.length) continue;
    const name = sparte === "gas" ? "Erdgas" : "Strom";
    y = neueSeite(sparte === "gas" ? "GASANGEBOT" : "STROMANGEBOT");

    /* Kopfangaben rechts, Kundenkontakt */
    /* Kopfangaben als drei kleine Kacheln */
    const kopfK = [["Ihr Berater", berater.name || "–"], ["Angebotsdatum", heuteD], ["Angebot gültig bis", gueltig || "–"]];
    const kkb = (BR - 6) / 3;
    kopfK.forEach(([k, w], i) => {
      const x = RA + i * (kkb + 3);
      flaeche(HELL); doc.roundedRect(x, y - 4, kkb, 11, 2, 2, "F");
      schrift(6.6); farbe(GRAU); text(k.toUpperCase(), x + 3, y, { charSpace: 0.3 });
      schrift(8.8, true); farbe(i === 2 ? GRUEN1 : TEXT); passend(w, kkb - 5, 8.8); text(w, x + 3, y + 4.6);
    });
    y += 12;
    /* Kundenkontakt als Karte mit grüner Kante */
    const kkH = 27;
    karte(RA, y, BR, kkH, { r: 2.5, rand: null });
    doc.saveGraphicsState(); doc.roundedRect(RA, y, BR, kkH, 2.5, 2.5, null); doc.clip(); doc.discardPath();
    verlauf(RA, y, 2.2, kkH, GRUEN2, GRUEN1, { quer: false, stufen: 30 });
    verlauf(RA + 2.2, y, BR, 7, GRUENHELL, WEISS, { stufen: 50 });
    doc.restoreGraphicsState();
    schrift(8, true); farbe(NAVY); text("KUNDENKONTAKT", RA + 6, y + 4.8, { charSpace: 0.4 });
    const kx = [RA + 6, RA + 33, RA + BR / 2 + 4, RA + BR / 2 + 25];
    [["Firma:", kunde.firma, "PLZ + Ort:", [kunde.plz, kunde.ort].filter(Boolean).join(" ")],
     ["Ansprechpartner:", ansprech, "E-Mail:", kunde.email],
     ["Straße + Hausnr.:", kunde.strasse, "Telefon:", kunde.telefon]].forEach((r, i) => {
      const yy = y + 12.5 + i * 4.9;
      schrift(8); farbe(GRAU); text(r[0], kx[0], yy); text(r[2], kx[2], yy);
      schrift(8, true); farbe(TEXT); text(r[1] || "–", kx[1], yy); text(r[3] || "–", kx[3], yy);
    });
    y += kkH + 8;

    /* Begrüßung und Eckdaten */
    farbe(TEXT);
    y = absatz((ansprech ? "Guten Tag " + ansprech + ", h" : "H") + "erzlichen Dank für Ihre Anfrage. Gerne unterbreiten wir Ihnen nachfolgend ein individuelles Angebot für die Belieferung " +
      (stellen.length > 1 ? "Ihrer Standorte" : "Ihres Standortes") + " mit " + name + ". Unser Ziel ist es, Ihnen nicht nur einen attraktiven Preis, sondern auch eine langfristige und verlässliche Partnerschaft zu bieten.",
      RA, y, BR, 8.5, 3.9) + 2;
    /* Eigene Werte je Lieferstelle: oben „je Lieferstelle“, die Werte stehen dann bei jeder Lieferstelle */
    const je = (k) => new Set(stellen.map((l) => {
      const sv = stelleIn(v, l);
      return k === "ende" ? String(enddatum(sv) || laufzeitMonate(sv)) : String(sv[k] || "");
    })).size > 1;
    const jeEnde = je("ende");
    const eck = [["Neuer Versorger", je("versorger") ? "je Lieferstelle" : (stellen[0] ? stelleIn(v, stellen[0]).versorger : v.versorger) || "–"],
      ["Beschaffungsmodell", v.produkt || "–"],
      ["Lieferbeginn", je("lieferbeginn") ? "je Lieferstelle" : (() => { const b = stellen[0] ? stelleIn(v, stellen[0]).lieferbeginn : v.lieferbeginn; return b ? datum(b) : "–"; })()],
      ["Laufzeit bis", jeEnde ? "je Lieferstelle" : (() => { const sv = stellen[0] ? stelleIn(v, stellen[0]) : v; const e = enddatum(sv) || ende;
        return e ? datum(e) : (laufzeitMonate(sv) || sv.laufzeit) + " Monate"; })()]];
    const ekb = (BR - 9) / 4;
    eck.forEach(([k, w], i) => {
      const x = RA + i * (ekb + 3);
      verlauf(x, y, ekb, 13, i % 2 ? NAVY2 : NAVY1, i % 2 ? [38, 74, 116] : NAVY2, { r: 2.2, stufen: 40 });
      doc.saveGraphicsState(); doc.roundedRect(x, y, ekb, 13, 2.2, 2.2, null); doc.clip(); doc.discardPath();
      kringel(x + ekb - 2, y + 1, 7, GRUEN, 0.22);
      doc.restoreGraphicsState();
      schrift(6.4); farbe(GRUEN2); text(k.toUpperCase(), x + 3, y + 4.6, { charSpace: 0.3 });
      schrift(9, true); farbe(WEISS); passend(w, ekb - 5, 9); text(w, x + 3, y + 9.6);
    });
    y += 18;
    /* ohne bisherigen Versorger nur „Unser Angebot“, ohne leere Vergleichsspalten */
    const vergleich = stellen.some((l) => altPreis(vorversorger[l.id]));
    y = ueberschrift(vergleich ? "Ihr aktueller Tarif im Vergleich zu unserem Angebot" : "Unser Angebot für Ihre Lieferstellen", RA, y + 2);

    /* je Lieferstelle ein Vergleich */
    const sp = vergleich ? [RA, RA + 62, RA + 104, RA + 146] : [RA, null, RA + 100, null];
    for (const l of stellen) {
      const pr = (v.preise || {})[l.id] || {};
      const ohneGP = !!pr.ohneGrundpreis; /* Grundpreis steckt im Energiepreis (ct/kWh) */
      const neuA = zahlLesen(pr.arbeit), neuE = zahlLesen(pr.energie), neuG = ohneGP ? 0 : zahlLesen(pr.grundpreis);
      const vv = vorversorger[l.id] || {};
      const altRoh = altPreis(vv);
      /* Ältere Abrechnung: bisherigen Arbeitspreis um die gestiegenen Umlagen erhöhen, damit der Vergleich fair ist */
      const aus = altRoh ? umlagenAusgleich(vv, l, v.umlagen) : null;
      const alt = altRoh && aus ? { ...altRoh, arbeitAbrechnung: altRoh.arbeit, arbeit: altRoh.arbeit + aus.diff } : altRoh;
      if (aus) ausgleiche.push(aus);
      const menge = zahlLesen(l.verbrauch) || 0;
      /* ohne neuen Arbeitspreis keine Kosten und keine Ersparnis für diese Lieferstelle */
      const kostenNeu = isNaN(neuA) ? null : (isNaN(neuG) ? 0 : neuG) + neuA / 100 * menge;
      const kostenAlt = alt ? alt.grundpreis + alt.arbeit / 100 * menge : null;
      if (kostenNeu != null) {
        summeNeu += kostenNeu;
        if (alt) { summeAlt += kostenAlt; mitVergleich = true; } else summeAlt += kostenNeu;
      }
      const teile = preisTeile(l, pr, v.umlagen);
      const sv = stelleIn(v, l);
      const zeilen = [
        ["Versorger", vv.versorger || l.versorger || "–", sv.versorger || "–", "–"],
        ["Arbeitspreis (ct/kWh)", alt ? ct(alt.arbeit) : "–", ct(neuA), alt && !isNaN(neuA) ? ct(alt.arbeit - neuA) : "–"],
        ...(aus ? [["      laut Abrechnung " + aus.jahr, ct(alt.arbeitAbrechnung), "–", "–"],
          ["      + Umlagen " + aus.ziel + " statt " + aus.jahr, (aus.diff >= 0 ? "+" : "") + ct3(aus.diff), "–", "–"]] : []),
        ...(!isNaN(neuE) ? [[ohneGP ? "davon Energiepreis inkl. Grundpreis (ct/kWh)" : "davon Energiepreis (ct/kWh)", "–", ct(neuE), "–"]] : []),
        ...(!isNaN(neuE) && !isNaN(teile.umlage) ? [["davon staatl. Umlagen und Abgaben (ct/kWh)", "–", ct3(teile.umlage), "–"],
          ...(teile.umlagenTeile.length > 1 ? teile.umlagenTeile.map((x) => ["      " + x.name, "–", ct3(zahlLesen(x.wert)), "–"]) : [])] : []),
        ...(!isNaN(teile.netz) ? [["davon Netzentgelte (ct/kWh)", "–", ct3(teile.netz), "–"]] : []),
        ...(teile.rlm && !isNaN(teile.leistungKosten) ? [["Leistungspreis Netz (" + num(teile.kw, 1) + " kW × " + num(teile.leistungspreis, 2) + " €/kW)", "–", eurx(teile.leistungKosten), "–"]] : []),
        /* ohne Grundpreis: Zeile entfällt; im Vergleich bleibt der bisherige Grundpreis stehen */
        ...(ohneGP && !alt ? [] : [["Grundpreis (€/Jahr)", alt ? eurx(alt.grundpreis) : "–",
          ohneGP ? "im Energiepreis enthalten" : isNaN(neuA) && isNaN(neuG) ? "–" : eurx(isNaN(neuG) ? 0 : neuG),
          alt && !isNaN(neuA) ? eurx(alt.grundpreis - (isNaN(neuG) ? 0 : neuG)) : "–"]]),
        ["Jahresverbrauch", num(menge) + " kWh", num(menge) + " kWh", "–"],
        ["Lieferbeginn", "–", sv.lieferbeginn ? datum(sv.lieferbeginn) : "–", "–"],
        ...(jeEnde ? [["Laufzeit bis", "–", enddatum(sv) ? datum(enddatum(sv)) : (laufzeitMonate(sv) || sv.laufzeit) + " Monate", "–"]] : []),
        ["Kosten pro Jahr", alt ? eurx(kostenAlt) : "–", kostenNeu == null ? "–" : eurx(kostenNeu),
          alt && kostenNeu != null ? eurx(kostenAlt - kostenNeu) : "–"],
        /* RLM: Leistungspreis des Netzbetreibers extra ausweisen, Ersparnis nur auf Arbeit und Grundpreis */
        ...(teile.rlm && !isNaN(teile.leistungKosten) && kostenNeu != null ? [
          ["zzgl. Leistungspreis Netz", "–", eurx(teile.leistungKosten), "–"],
          ["Gesamtkosten pro Jahr", "–", eurx(kostenNeu + teile.leistungKosten), "–"]] : []),
      ];
      const hoehe = 17 + zeilen.length * 5.8;
      if (y + hoehe > H - 22) y = neueSeite(sparte === "gas" ? "GASANGEBOT" : "STROMANGEBOT");
      schrift(8.5, true); farbe(NAVY);
      text((l.bezeichnung || name) + (l.zaehlerart ? " (" + l.zaehlerart + ")" : ""), RA, y);
      schrift(7.5); farbe(GRAU);
      text(["MaLo " + (l.maloId || "–"), "Zähler " + (l.zaehlernummer || "–"),
        [l.strasse, [l.plz, l.ort].filter(Boolean).join(" ")].filter(Boolean).join(", ")].filter(Boolean).join("  ·  "),
        W - RA, y, { align: "right" });
      y += 2.5;
      /* Tabelle als abgerundete Karte: Kopf mit Verlauf, Spalte „Unser Angebot“ grün hinterlegt */
      const ZH = 5.8, KH = 7, th = KH + zeilen.length * ZH, sb = vergleich ? 42 : RA + BR - sp[2];
      schatten(RA, y, BR, th, 2.5);
      doc.saveGraphicsState(); doc.roundedRect(RA, y, BR, th, 2.5, 2.5, null); doc.clip(); doc.discardPath();
      flaeche(WEISS); doc.rect(RA, y, BR, th, "F");
      verlauf(RA, y, BR, KH, NAVY1, NAVY2, { stufen: 60 });
      zeilen.forEach((r, i) => {
        const zy = y + KH + i * ZH, letzte = i === zeilen.length - 1;
        if (letzte) { flaeche(GRUENHELL); doc.rect(RA, zy, BR, ZH, "F"); }
        else if (i % 2) { flaeche(HELL); doc.rect(RA, zy, BR, ZH, "F"); }
      });
      flaeche(GRUENHELL); deckkraft(0.85); doc.rect(sp[2], y + KH, sb, th - KH - ZH, "F"); deckkraft(1);
      flaeche(GRUENMITTEL); doc.rect(sp[2], y + th - ZH, sb, ZH, "F");
      verlauf(sp[2], y, sb, KH, GRUEN1, GRUEN2, { stufen: 40 });
      doc.restoreGraphicsState();
      strich(LINIE); doc.setLineWidth(0.25); doc.roundedRect(RA, y, BR, th, 2.5, 2.5, "S");
      schrift(7.6, true); farbe(WEISS);
      ["Position", "Ihr aktueller Tarif", "Unser Angebot", "Ersparnis"].forEach((t, i) => { if (sp[i] != null) text(t, sp[i] + 3, y + 4.7); });
      y += KH;
      zeilen.forEach((r, i) => {
        const letzte = i === zeilen.length - 1;
        schrift(8, letzte); farbe(TEXT);
        r.forEach((t, k) => {
          if (sp[k] == null) return;
          if (k === 3 && t !== "–") { farbe(GRUEN1); schrift(8, true); }
          if (k === 2 && letzte) farbe(NAVY);
          text(t, sp[k] + 3, y + 4); farbe(TEXT); schrift(8, letzte);
        });
        y += ZH;
      });
      y += 7;
    }

    /* Ergebnis */
    const seite = () => neueSeite(sparte === "gas" ? "GASANGEBOT" : "STROMANGEBOT");
    if (y + 30 > H - 22) y = seite();
    const spar = summeAlt - summeNeu;
    /* großer Ergebniskasten mit Verlauf */
    const bh = 22;
    schatten(RA, y, BR, bh, 3.5);
    verlauf(RA, y, BR, bh, GRUEN1, GRUEN2, { r: 3.5 });
    doc.saveGraphicsState(); doc.roundedRect(RA, y, BR, bh, 3.5, 3.5, null); doc.clip(); doc.discardPath();
    kringel(W - RA - 70, y - 10, 22, WEISS, 0.1); kringel(W - RA - 70, y - 10, 30, WEISS, 0.16, "S");
    kringel(W - RA + 2, y + bh + 4, 16, WEISS, 0.1); kringel(RA - 4, y + bh + 6, 14, GRUEN1, 0.25);
    doc.restoreGraphicsState();
    flaeche(WEISS); doc.circle(RA + 11, y + bh / 2, 6.5, "F");
    schrift(15, true); farbe(GRUEN1); text("€", RA + 11, y + bh / 2 + 2.6, { align: "center" });
    schrift(10.5, true); farbe(WEISS);
    text(mitVergleich ? "IHRE ERSPARNIS PRO JAHR" : "IHRE ENERGIEKOSTEN PRO JAHR", RA + 21, y + 9.6, { charSpace: 0.3 });
    schrift(7.8); text(mitVergleich ? (summeAlt > 0 ? "entspricht ca. " + num(spar / summeAlt * 100, 1) + " % Ersparnis" : "")
      : "ohne Vergleich mit dem bisherigen Versorger", RA + 21, y + 15);
    schrift(21, true); text(eurx(mitVergleich ? spar : summeNeu), W - RA - 6, y + 14, { align: "right" });
    y += bh + 7;
    summeAlt = 0; summeNeu = 0; mitVergleich = false;

    /* Hinweis zu den staatlichen Umlagen: immer, sobald das Angebot im Jahr der hinterlegten Umlagen liefert */
    const qU = v.umlagen || UMLAGEN, zielJ = umlagenJahr(qU);
    const ausSp = ausgleiche.filter((x) => x.sparte === sparte);
    const lieferJ = v.lieferbeginn ? Number(String(v.lieferbeginn).slice(0, 4)) : Number(zielJ);
    const uSumme = umlageSumme(qU, sparte);
    const umlagenText = (ausSp.length || lieferJ >= Number(zielJ)) && !isNaN(uSumme)
      ? "Dieses Angebot berücksichtigt bereits die ab dem 01.01." + zielJ + " geltenden staatlichen Umlagen und Abgaben für " + name
        + " von zusammen " + ct3(uSumme) + " netto."
        + (ausSp.length
          ? " Ihre Abrechnung aus " + [...new Set(ausSp.map((x) => x.jahr))].join(" bzw. ") + " enthält noch die damals gültigen Umlagen und Abgaben ("
            + [...new Set(ausSp.map((x) => ct3(x.alt)))].join(" bzw. ") + "). Für einen fairen Vergleich haben wir Ihren bisherigen Arbeitspreis um die Differenz von "
            + [...new Set(ausSp.map((x) => (x.diff >= 0 ? "+" : "") + ct3(x.diff)))].join(" bzw. ") + " angepasst."
          : "")
        + " Der Gesamtjahresbetrag kann deshalb von Ihrer aktuellen Abrechnung abweichen, da "
        + (ausSp.length && ausSp.every((x) => x.diff > 0) ? "die staatlichen Umlagen und Abgaben gestiegen sind." : "sich die staatlichen Umlagen und Abgaben geändert haben.")
      : "";
    const hinweise = [v.bemerkung, umlagenText].filter(Boolean);
    if (hinweise.length) {
      if (y + 20 > H - 22) y = seite();
      y = ueberschrift("Hinweise zum Angebot", RA, y + 2); farbe(TEXT);
      hinweise.forEach((h) => { y = absatz(h, RA, y, BR) + 2; });
    }

    /* Leistungen, Hinweis, Ansprechpartner, Annahme */
    if (y + 38 > H - 22) y = seite();
    const yl = ueberschrift("Leistungen inklusive", RA, y + 2);
    schrift(8.5); farbe(TEXT);
    EGC_LEISTUNGEN.forEach((t, i) => { haken(RA + 1, yl + i * 5.2); schrift(8.5); farbe(TEXT); text(t, RA + 7, yl + i * 5.2); });
    ueberschrift("Hinweis", RA + BR / 2 + 4, y + 2);
    flaeche(HELL); doc.roundedRect(RA + BR / 2 + 4, yl - 4.2, BR / 2 - 4, EGC_LEISTUNGEN.length * 5.2 + 0.5, 2.5, 2.5, "F");
    farbe(TEXT); absatz("Die Preisangaben verstehen sich zzgl. der gesetzlichen Umsatzsteuer. Änderungen der gesetzlichen Umlagen, Steuern und Abgaben bleiben vorbehalten.",
      RA + BR / 2 + 8, yl, BR / 2 - 12);
    y = yl + EGC_LEISTUNGEN.length * 5.2 + 4;

    if (y + 72 > H - 22) y = seite();
    y = ueberschrift("Ihr persönlicher Ansprechpartner", RA, y);
    const bild = typeof berater.bild === "string" && /^data:image\/(jpeg|png)/.test(berater.bild) ? berater.bild : null;
    const ah = 26, cx = RA + 15, cy = y - 1 + ah / 2;
    karte(RA, y - 1, BR, ah, { r: 3 });
    doc.saveGraphicsState(); doc.roundedRect(RA, y - 1, BR, ah, 3, 3, null); doc.clip(); doc.discardPath();
    kringel(W - RA - 6, y + ah - 2, 20, GRUEN, 0.09); kringel(W - RA - 6, y + ah - 2, 27, GRUEN, 0.14, "S");
    doc.restoreGraphicsState();
    if (bild) {
      doc.saveGraphicsState(); doc.circle(cx, cy, 9.5, null); doc.clip(); doc.discardPath();
      doc.addImage(bild, /png/.test(bild.slice(0, 20)) ? "PNG" : "JPEG", cx - 9.5, cy - 9.5, 19, 19);
      doc.restoreGraphicsState();
    } else {
      verlauf(cx - 9.5, cy - 9.5, 19, 19, NAVY1, NAVY2, { kreis: true, stufen: 30 });
      const ini = String(berater.name || "EGC").split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
      schrift(12, true); farbe(WEISS); text(ini, cx, cy + 1.6, { align: "center" });
    }
    strich(GRUEN); doc.setLineWidth(0.9); doc.circle(cx, cy, 10.2, "S");
    const bx = RA + 31;
    schrift(10.5, true); farbe(NAVY); text(berater.name || "", bx, y + 5.5);
    schrift(8.3); farbe(GRAU);
    [berater.email, berater.telefon, berater.rolle].filter(Boolean).forEach((t, i) => text(t, bx, y + 11 + i * 4.4));
    y += ah + 6;

    const nh = 32;
    flaeche(HELL); doc.roundedRect(RA, y, BR, nh, 3, 3, "F");
    strich(GRUEN); doc.setLineWidth(0.4); doc.setLineDashPattern([1.6, 1.2], 0);
    doc.roundedRect(RA, y, BR, nh, 3, 3, "S"); doc.setLineDashPattern([], 0);
    haken(RA + 4, y + 7.4);
    schrift(9.5, true); farbe(NAVY); text("Angebot angenommen:", RA + 9.5, y + 7);
    schrift(8.5); farbe(TEXT);
    text("Hiermit akzeptiere ich das oben stehende Angebot und beauftrage EGC Energie mit dem Abschluss des Energieliefervertrags.",
      RA + 4, y + 12.5, { maxWidth: BR - 8 });
    unterschriften(y + 24, ["Ort, Datum", "Name, Vorname Kunde (leserlich)", "Unterschrift & Stempel"], 4, "Angebot", 6);
  }

  /* ---------- Spotmarkt: Vergleich mit dem Lieferjahr 2025 ---------- */
  if (!blanko && v.produkt === "Spotmarkt" && v.spot) {
    const zeilenSpot = spotVergleich(a, v, spotVorversorger || (a.kalkulation && a.kalkulation.vorversorger) || vorversorger, v.umlagen)
      .filter((z) => !isNaN(z.kostenSpot));
    if (zeilenSpot.length) {
      y = neueSeite("SPOTMARKT-VERGLEICH 2025");
      y = ueberschrift("Was Sie 2025 am Spotmarkt bezahlt hätten", RA, y + 4);
      farbe(TEXT);
      y = absatz("Wir haben Ihr Lieferjahr 2025 nachgerechnet: mit dem durchschnittlichen Börsenpreis (Day-Ahead) des Jahres 2025, " +
        "unserem Aufschlag sowie den Netzentgelten und staatlichen Umlagen von 2025. Daneben steht, was Sie mit Ihrem bisherigen Vertrag bezahlt haben.",
        RA, y, BR) + 3;
      const sp4 = [RA, RA + 92, RA + 140];
      let sAlt = 0, sSpot = 0, alleVoll = true;
      for (const z of zeilenSpot) {
        const reihen = [
          ["Durchschnittlicher Börsenpreis 2025", "", ct(z.boerse)],
          ["Aufschlag", "", ct(z.aufschlag)],
          ["Netzentgelte 2025", "", ct(z.netz)],
          ["Staatliche Umlagen und Abgaben 2025", "", ct(z.umlage)],
          ["Arbeitspreis", z.alt ? ct(z.alt.arbeit) : "–", ct(z.arbeit)],
          ["Grundpreis (€/Jahr)", z.alt ? eurx(z.alt.grundpreis) : "–", "–"],
          ["Jahresverbrauch", num(z.menge) + " kWh", num(z.menge) + " kWh"],
          ["Kosten 2025", z.vollstaendig ? eurx(z.kostenAlt) : "–", eurx(z.kostenSpot)],
        ];
        const ZH = 5.6, KH = 7, th = KH + reihen.length * ZH;
        if (y + th + 14 > H - 22) y = neueSeite("SPOTMARKT-VERGLEICH 2025");
        schrift(8.5, true); farbe(NAVY);
        text((z.l.bezeichnung || (z.sparte === "gas" ? "Erdgas" : "Strom")) + "  ·  " + (z.sparte === "gas" ? "Erdgas" : "Strom"), RA, y);
        y += 2.5;
        schatten(RA, y, BR, th, 2.5);
        doc.saveGraphicsState(); doc.roundedRect(RA, y, BR, th, 2.5, 2.5, null); doc.clip(); doc.discardPath();
        flaeche(WEISS); doc.rect(RA, y, BR, th, "F");
        verlauf(RA, y, BR, KH, NAVY1, NAVY2, { stufen: 60 });
        reihen.forEach((r, i) => { if (i === reihen.length - 1) { flaeche(GRUENHELL); doc.rect(RA, y + KH + i * ZH, BR, ZH, "F"); }
          else if (i % 2) { flaeche(HELL); doc.rect(RA, y + KH + i * ZH, BR, ZH, "F"); } });
        doc.restoreGraphicsState();
        strich(LINIE); doc.setLineWidth(0.25); doc.roundedRect(RA, y, BR, th, 2.5, 2.5, "S");
        schrift(7.6, true); farbe(WEISS);
        ["Position", "Ihr Vertrag 2025", "Spotmarkt 2025"].forEach((tt, i) => text(tt, sp4[i] + 3, y + 4.7));
        y += KH;
        reihen.forEach((r, i) => { const fett = i === reihen.length - 1; schrift(8, fett); farbe(fett ? NAVY : TEXT);
          r.forEach((tt, k) => text(tt || "", sp4[k] + 3, y + 3.9)); y += ZH; });
        y += 6;
        if (z.vollstaendig) { sAlt += z.kostenAlt; sSpot += z.kostenSpot; } else alleVoll = false;
      }
      if (sAlt > 0 && alleVoll) {
        if (y + 22 > H - 22) y = neueSeite("SPOTMARKT-VERGLEICH 2025");
        const diff = sAlt - sSpot;
        verlauf(RA, y, BR, 16, diff >= 0 ? GRUEN1 : NAVY1, diff >= 0 ? GRUEN2 : NAVY2, { r: 3, stufen: 50 });
        schrift(9, true); farbe(WEISS);
        text(diff >= 0 ? "AM SPOTMARKT HÄTTEN SIE 2025 WENIGER BEZAHLT" : "AM SPOTMARKT HÄTTEN SIE 2025 MEHR BEZAHLT", RA + 5, y + 6.5);
        schrift(7.5); text("Bisheriger Vertrag " + eurx(sAlt) + "  ·  Spotmarkt " + eurx(sSpot), RA + 5, y + 11.5);
        schrift(15, true); text(eurx(Math.abs(diff)), W - RA - 5, y + 10.5, { align: "right" });
        y += 22;
      }
      schrift(7.2); farbe(GRAU);
      y = absatz("Grundlage: durchschnittlicher Day-Ahead-Börsenpreis des Lieferjahres 2025 (Strom " + num(SPOT_2025.strom, 4) + " ct/kWh, Mittel aller Stunden, " +
        "Energy-Charts/Fraunhofer ISE; Erdgas " + num(SPOT_2025.gas, 4) + " ct/kWh, Mittel aller Tage, THE Day-Ahead/EEX), Netzentgelte und Umlagen 2025, alle Preise netto. " +
        "Die Rechnung zeigt die Vergangenheit; künftige Börsenpreise können höher oder niedriger sein.", RA, y, BR, 7.2, 3.3);
    }
  }

  /* ---------- Lastgang-Analyse für RLM-Lieferstellen mit Lastgang ---------- */
  const rlm = stellenVon(a, v).filter((l) => l.zaehlerart === "RLM" && l.lastgang);
  for (const [l, lg] of rlm.flatMap((l) => dateienVon(l.lastgang).map((d) => [l, d]))) {
    let stand;
    try { stand = await lastgangAuswerten({ ...lg, url: await dateiInhalt(lg) }); }
    catch (e) { continue; }
    if (!stand.verlaeufe) continue;
    const bilder = lastgangGrafiken(stand);
    y = neueSeite("LASTGANG-ANALYSE");
    schrift(8); farbe(GRAU);
    text("Zusatzblatt für Kunden mit RLM-Zähler (registrierende Leistungsmessung)", W - RA, y - 2, { align: "right" });
    y = ueberschrift("Ihr Lastprofil " + stand.verlaeufe.jahr + (l.bezeichnung ? " · " + l.bezeichnung : ""), RA, y + 6);
    farbe(TEXT);
    y = absatz("Der folgende Jahresverlauf zeigt Ihren Verbrauch aus " + (stand.verlaeufe.schrittMin === 15 ? "15-Minuten-Werten" : "den Messwerten") +
      " – so erkennen Sie auf einen Blick, wann Ihre Lastspitzen auftreten.", RA, y, BR) + 2;
    const sz = stand.verlaeufe.spitzeZeit;
    const kz = [["Jahresverbrauch", num(stand.summe) + " kWh", ""],
      ["Spitzenlast", num(stand.spitze, 1) + " kW", sz ? "am " + String(sz.getDate()).padStart(2, "0") + "." + String(sz.getMonth() + 1).padStart(2, "0") + "." + sz.getFullYear() + " " +
        String(sz.getHours()).padStart(2, "0") + ":" + String(sz.getMinutes()).padStart(2, "0") + " Uhr" : ""],
      ["Ø Last", num(stand.schnitt * (stand.spitze / stand.max || 1), 1) + " kW", ""],
      ["Jahresbenutzungsstunden", num(stand.benutzung, 0) + " h", ""]];
    const kb = (BR - 9) / 4;
    kz.forEach(([k, w, u], i) => {
      const x = RA + i * (kb + 3);
      karte(x, y, kb, 18, { r: 2.5 });
      doc.saveGraphicsState(); doc.roundedRect(x, y, kb, 18, 2.5, 2.5, null); doc.clip(); doc.discardPath();
      verlauf(x, y, kb, 1.6, GRUEN1, GRUEN2, { stufen: 30 });
      kringel(x + kb - 1, y + 18, 8, GRUEN, 0.08);
      doc.restoreGraphicsState();
      schrift(6.8); farbe(GRAU); text(k, x + 3, y + 6);
      schrift(11.5, true); farbe(NAVY); text(w, x + 3, y + 12.2);
      if (u) { schrift(6.2); farbe(GRAU); text(u, x + 3, y + 16); }
    });
    y += 23;
    const gh = BR * (430 / 1400);
    doc.addImage(bilder.jahr, "PNG", RA, y, BR, gh); y += gh + 3;
    if (y + gh + 8 > H - 18) y = neueSeite("LASTGANG-ANALYSE");
    schrift(7.5); farbe(GRAU);
    text("Durchschnittlicher Lastverlauf je Wochentag, aus allen Wochen des Jahres gemittelt.", RA, y + 2); y += 3.5;
    doc.addImage(bilder.woche, "PNG", RA, y, BR, gh); y += gh + 3;
    if (y + gh + 8 > H - 18) y = neueSeite("LASTGANG-ANALYSE");
    schrift(7.5); farbe(GRAU);
    text("Durchschnittlicher Tagesverlauf an Werktagen (Montag bis Freitag).", RA, y + 2); y += 3.5;
    doc.addImage(bilder.werktag, "PNG", RA, y, BR, gh);
  }

  /* ---------- Smartmeter-Angebot: Titelseite mit Bild und Seite mit Vorteilen und Preisen ---------- */
  /* Smartmeter nur für die Lieferstellen dieser Variante */
  const smIds = new Set(stellenVon(a, v).map((l) => l.id));
  const smPos = ((smartmeter && smartmeter.positionen) || []).filter((p) => String(p.bezeichnung || "").trim() && (!p.lieferstelle || smIds.has(p.lieferstelle)));
  if (smPos.length) {
    const tx = { ...SMARTMETER, ...(smartmeter.texte || {}) };
    const HELLBLAU = [196, 208, 222], HELLGRAU = [244, 247, 250];
    const zeilen = (t, x, yy, b, gr, f, zl = 1.38, fett = false) => {
      schrift(gr, fett); farbe(f); const z = doc.splitTextToSize(String(t || ""), b);
      doc.text(z, x, yy, { lineHeightFactor: zl }); return yy + z.length * gr * 0.3528 * zl;
    };
    /* Titelseite */
    doc.addPage(); smTitel = doc.getNumberOfPages();
    let bild = null;
    try {
      const r = await fetch("/assets/smartmeter-2/titel.jpg");
      if (r.ok) {
        const blob = await r.blob();
        bild = await new Promise((ok, f) => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.onerror = f; fr.readAsDataURL(blob); });
      }
    } catch (e) { bild = null; }
    flaeche(NAVY1); doc.rect(0, 0, W, H, "F");
    if (bild && /^data:image\/jpe?g/.test(bild)) {
      const bw = H * 880 / 1168;
      doc.addImage(bild, "JPEG", (W - bw) / 2, 0, bw, H);
    } else verlauf(0, 0, W, H, NAVY1, NAVY2, { quer: false });
    doc.saveGraphicsState();
    for (let i = 0; i < 100; i++) { deckkraft(0.92 * Math.pow(1 - i / 99, 1.6)); flaeche(NAVY1); doc.rect(0, i * 1.2, W, 1.25, "F"); }
    doc.restoreGraphicsState(); deckkraft(1);
    doc.addImage(logo, "JPEG", RA, 16, (420 / 196) * 15, 15);
    flaeche(GRUEN); doc.roundedRect(RA, 40, 44, 8, 4, 4, "F");
    schrift(7.8, true); farbe(NAVY1); text("SMARTMETER", RA + 5.5, 45.2, { charSpace: 0.8 });
    schrift(30, true); farbe(WEISS); text(tx.titel1, RA, 63); farbe(GRUEN2); text(tx.titel2, RA, 76);
    zeilen(tx.unterzeile, RA, 87, 120, 11, HELLBLAU, 1.4);
    doc.saveGraphicsState(); deckkraft(0.9); flaeche(NAVY1); doc.rect(0, H - 34, W, 34, "F"); doc.restoreGraphicsState(); deckkraft(1);
    flaeche(GRUEN); doc.rect(0, H - 34, W, 1.2, "F");
    const anzahlSm = new Set(smPos.map((p) => p.lieferstelle)).size;
    schrift(7, true); farbe(GRUEN2); text("ANGEBOT FÜR", RA, H - 24, { charSpace: 0.5 });
    schrift(13, true); farbe(WEISS); passend(kunde.firma || "–", 110, 13); text(kunde.firma || "–", RA, H - 17.5);
    schrift(8.5); farbe(HELLBLAU); text(anzahlSm + (anzahlSm === 1 ? " Lieferstelle" : " Lieferstellen") + " · Angebot vom " + heuteD, RA, H - 12);
    schrift(7, true); farbe(GRUEN2); text("IHR ANSPRECHPARTNER", W - RA, H - 24, { align: "right", charSpace: 0.5 });
    schrift(10, true); farbe(WEISS); text(berater.name || "EGC Energie", W - RA, H - 17.5, { align: "right" });
    schrift(8.5); farbe(HELLBLAU); text(berater.email || F.email || "", W - RA, H - 12, { align: "right" });
    schrift(6.5); farbe([170, 182, 198]); text("Abbildung ähnlich", W - RA, H - 37, { align: "right" });

    /* Vorteile und Preise */
    let ys = neueSeite("SMARTMETER-ANGEBOT");
    schrift(8, true); farbe(GRUEN1); text("IHRE VORTEILE", RA, ys, { charSpace: 1 }); ys += 4;
    const kach = (tx.kacheln || []).filter((k) => String(k.t || "").trim()).slice(0, 6);
    const eng = kach.length > 4, khh = eng ? 22 : 34, abst = eng ? 3 : 5;
    /* Bei ungerader Anzahl steht die erste Kachel hervorgehoben über die volle Breite (Vorgabe: Live-Börsenpreise) */
    const ungerade = kach.length % 2 === 1;
    kach.forEach((k, i) => {
      const voll = ungerade && i === 0;
      const pos = ungerade ? i + 1 : i;
      const kb = voll ? BR : (BR - 5) / 2;
      const x = RA + (voll ? 0 : (pos % 2) * (kb + 5)), yy = ys + Math.floor(pos / 2) * (khh + abst);
      if (voll) verlauf(x, yy, kb, khh, GRUEN1, GRUEN, { r: 2, stufen: 60 });
      else verlauf(x, yy, kb, khh, i % 3 ? NAVY1 : NAVY2, i % 3 ? NAVY2 : [38, 74, 116], { r: 2, stufen: 50 });
      const oy = eng ? -3 : 0, tg = eng ? 11.5 : 13;
      flaeche(voll ? WEISS : GRUEN); doc.circle(x + 9, yy + 10 + oy, 4.2, "F"); strich(voll ? GRUEN1 : WEISS); doc.setLineWidth(0.9);
      doc.line(x + 7.1, yy + 10 + oy, x + 8.5, yy + 11.5 + oy); doc.line(x + 8.5, yy + 11.5 + oy, x + 11.1, yy + 8.4 + oy);
      schrift(tg, true); farbe(WEISS); const tz = doc.splitTextToSize(String(k.t || ""), kb - 22);
      doc.text(tz, x + 17, yy + 11.5 + oy, { lineHeightFactor: 1.15 });
      zeilen(k.s, x + 6, yy + 11.5 + oy + tz.length * tg * 0.4 + (eng ? 1.5 : 3), kb - 12, eng ? 8 : 8.6, voll ? WEISS : HELLBLAU, 1.25);
    });
    ys += Math.ceil(kach.length / 2) * (khh + abst) + 1;
    /* Klarstellung: EGC baut nicht selbst ein */
    if (String(tx.einbau || "").trim()) {
      schrift(8.6); const ez = doc.splitTextToSize(String(tx.einbau), BR - 16);
      const eh = 11 + ez.length * 8.4 * 0.3528 * 1.35;
      flaeche(GRUENHELL); doc.roundedRect(RA, ys, BR, eh, 2, 2, "F");
      verlauf(RA, ys, 1.8, eh, GRUEN2, GRUEN1, { quer: false, stufen: 20 });
      schrift(8.6, true); farbe(NAVY); text("Einbau und Betrieb durch den Smartmeter-Messstellenbetreiber", RA + 6, ys + 5.5);
      zeilen(tx.einbau, RA + 6, ys + 10, BR - 12, 8.4, TEXT, 1.35);
      ys += eh + 5;
    } else ys += 5;
    schrift(8, true); farbe(GRUEN1); text("IHRE PREISE", RA, ys, { charSpace: 1 }); ys += 4;
    const sp1 = RA + 3, sp2 = RA + 112;
    const tabKopf = () => {
      flaeche(NAVY); doc.roundedRect(RA, ys, BR, 8, 1.5, 1.5, "F");
      schrift(7.5, true); farbe(WEISS); text("Leistung", sp1, ys + 5.3); text("Abrechnung", sp2, ys + 5.3);
      text("Preis netto", RA + BR - 3, ys + 5.3, { align: "right" }); ys += 8;
    };
    tabKopf();
    let zeile = 0;
    stellenVon(a, v).forEach((l, i) => {
      const lp = smPos.filter((p) => p.lieferstelle === l.id);
      lp.forEach((p, j) => {
        const h = j === 0 ? 12 : 7.5;
        if (ys + h > H - 40) { ys = neueSeite("SMARTMETER-ANGEBOT"); tabKopf(); }
        flaeche(zeile++ % 2 ? WEISS : HELLGRAU); doc.rect(RA, ys, BR, h, "F");
        let yy = ys + 5;
        if (j === 0) {
          schrift(7, true); farbe(GRUEN1);
          text((l.bezeichnung || "Lieferstelle " + (i + 1)) + (l.meloId ? " · MeLo " + l.meloId : ""), sp1, ys + 4.2); yy = ys + 9.2;
        }
        schrift(8.6); farbe(TEXT); passend(p.bezeichnung, sp2 - sp1 - 4, 8.6); text(p.bezeichnung, sp1, yy);
        schrift(8.6); text(p.art === "monatlich" ? "monatlich" : "einmalig", sp2, yy);
        const pr = zahlLesen(p.preis);
        schrift(8.6, true); text(isNaN(pr) ? "auf Anfrage" : eurx(pr) + (p.art === "monatlich" ? " / Monat" : ""), RA + BR - 3, yy, { align: "right" });
        ys += h;
      });
    });
    const su = smartmeterSummen({ positionen: smPos });
    ys += 4;
    if (ys + 32 > H - 22) ys = neueSeite("SMARTMETER-ANGEBOT");
    const sb = (BR - 8) / 3;
    [["EINMALIG GESAMT", eurx(su.einmalig)], ["MONATLICH GESAMT", eurx(su.monatlich)], ["PRO JAHR (12 × MONATLICH)", eurx(su.jahr)]].forEach(([k, w], i) => {
      const x = RA + i * (sb + 4);
      if (i === 2) verlauf(x, ys, sb, 17, GRUEN1, GRUEN, { r: 2, stufen: 40 }); else { flaeche(GRUENHELL); doc.roundedRect(x, ys, sb, 17, 2, 2, "F"); }
      schrift(6.6, true); farbe(i === 2 ? WEISS : GRUEN1); text(k, x + 4, ys + 6, { charSpace: 0.3 });
      schrift(14, true); farbe(i === 2 ? WEISS : NAVY); text(w, x + 4, ys + 13.5);
    });
    ys += 22;
    ys = zeilen(tx.hinweis, RA, ys, BR, 7.8, GRAU, 1.35) + 4;
    /* Annahme des Smartmeter-Angebots durch den Kunden, eigene Unterschrift */
    const nhS = 40;
    if (ys + nhS > H - 19) ys = neueSeite("SMARTMETER-ANGEBOT");
    flaeche(HELL); doc.roundedRect(RA, ys, BR, nhS, 3, 3, "F");
    strich(GRUEN); doc.setLineWidth(0.4); doc.setLineDashPattern([1.6, 1.2], 0);
    doc.roundedRect(RA, ys, BR, nhS, 3, 3, "S"); doc.setLineDashPattern([], 0);
    haken(RA + 4, ys + 7.4);
    schrift(10, true); farbe(NAVY); text("Smartmeter-Angebot angenommen:", RA + 9.5, ys + 7);
    schrift(8.8); farbe(TEXT);
    text(String(tx.annahme || SMARTMETER_VORGABE.annahme), RA + 4, ys + 12.5, { maxWidth: BR - 8 });
    unterschriften(ys + 33, ["Ort, Datum", "Name, Vorname Kunde (leserlich)", "Unterschrift & Stempel"], 4, "Smartmeter");
    ys += nhS + 7;
    if (ys + 38 < H - 18) {
      schrift(8, true); farbe(GRUEN1); text("SO GEHT ES WEITER", RA, ys, { charSpace: 1 }); ys += 5;
      const schritte = [["1", "Auftrag", "Sie bestätigen das Angebot."], ["2", "Termin", "Der Smartmeter-Messstellenbetreiber meldet sich bei Ihnen."],
        ["3", "Einbau", "Einbau, Inbetriebnahme und Wechsel vom bisherigen Messstellenbetreiber."], ["4", "Portal", "Sie erhalten Ihren Zugang zur Verbrauchsanalyse."]];
      const sw = (BR - 9) / 4;
      schritte.forEach(([n2, t2, s2], i) => {
        const x = RA + i * (sw + 3);
        flaeche(HELLGRAU); doc.roundedRect(x, ys, sw, 27, 2, 2, "F");
        flaeche(NAVY); doc.circle(x + 7, ys + 7.5, 3.6, "F"); schrift(8.5, true); farbe(WEISS); text(n2, x + 7, ys + 8.8, { align: "center" });
        schrift(9.5, true); farbe(NAVY); text(t2, x + 13, ys + 8.8);
        zeilen(s2, x + 4, ys + 16, sw - 8, 7.6, TEXT, 1.3);
      });
    }
  }

  } /* Ende: nicht blanko */

  /* ---------- Service- & Beratungsauftrag (nur wenn der Vertriebspartner ihn angehängt haben will) ---------- */
  if (blanko || a.vollmachtAnhaengen !== false) {
  y = blanko ? kopf("SERVICE- & BERATUNGSAUFTRAG") : neueSeite("SERVICE- & BERATUNGSAUFTRAG");
  const halb = BR / 2;
  schrift(8, true); farbe(GRAU); text("ZWISCHEN", RA, y);
  schrift(9, true); farbe(TEXT); text("EGC Energie", RA, y + 5);
  schrift(9); [F.vertreter ? "vertreten durch " + F.vertreter : "", F.strasse, F.ort, F.telefon ? "Tel. " + F.telefon : ""].filter(Boolean)
    .forEach((t, i) => text(t, RA, y + 9.5 + i * 4.4));
  schrift(8); farbe(GRAU);
  [["Berater:", berater.name], ["E-Mail:", berater.email], ["Kontakt:", berater.telefon]].forEach(([k, w], i) => {
    text(k, RA + halb + 4, y + 5 + i * 4.6); schrift(8.5, true); farbe(TEXT);
    if (blanko) { strich(LINIE); doc.setLineWidth(0.2); doc.line(RA + halb + 22, y + 5.5 + i * 4.6, W - RA, y + 5.5 + i * 4.6);
      feld(["Berater Name", "Berater E-Mail", "Berater Telefon"][i], RA + halb + 22, y + 1.6 + i * 4.6, halb - 22, 3.9, { gr: 8 }); }
    else text(w || "–", RA + halb + 22, y + 5 + i * 4.6);
    schrift(8); farbe(GRAU);
  });
  y += 31;
  schrift(8, true); farbe(GRAU); text("UND", RA, y); y += 3;
  [["Firma / Herr / Frau", (kunde.firma || "") + (ansprech ? " · " + ansprech : "")], ["Straße, Hausnummer", kunde.strasse],
   ["PLZ, Ort", [kunde.plz, kunde.ort].filter(Boolean).join(" ")],
   ["Telefon / E-Mail", [kunde.telefon, kunde.email].filter(Boolean).join(" · ")], ["Geburtsdatum", ""]].forEach(([k, w], i) => {
    if (i % 2 === 0) { flaeche(HELL); doc.rect(RA, y, BR, 5.1, "F"); }
    schrift(8); farbe(GRAU); text(k, RA + 2, y + 3.6); schrift(8.5); farbe(TEXT); text(w || "", RA + 50, y + 3.6);
    if (!w) feld(["Kunde Firma", "Kunde Strasse", "Kunde PLZ Ort", "Kunde Telefon E-Mail", "Kunde Geburtsdatum"][i],
      RA + 49, y + 0.35, (i === 4 ? halb - 2 : BR - 1) - 49, 4.4);
    /* letzte Zeile geteilt: rechts Steuernummer bzw. USt-IdNr. (nur manche Versorger), damit es bei zwei Seiten bleibt */
    if (i === 4) {
      const xs = RA + halb + 4;
      schrift(8); farbe(GRAU); text("Steuer-Nr. / USt-IdNr.", xs, y + 3.6);
      if (blanko || !kunde.steuernummer) { strich(LINIE); doc.setLineWidth(0.2); doc.line(xs + 33, y + 4.1, W - RA - 2, y + 4.1);
        feld("Kunde Steuernummer", xs + 32, y + 0.35, W - RA - 2 - xs - 32, 4.4); }
      else { schrift(8.5); farbe(TEXT); text(String(kunde.steuernummer), xs + 33, y + 3.6); }
    }
    y += 5.1;
  });
  y += 4;
  y = ueberschrift("Lieferadressen", RA, y);
  if (blanko) {
    strich(TEXT); doc.setLineWidth(0.3); doc.rect(RA, y - 2.8, 2.8, 2.8, "S"); ankreuzen("Lieferstellenliste", RA, y - 2.8);
    schrift(8); farbe(TEXT); text("siehe Lieferstellenliste (Anlage)", RA + 4, y); y += 5;
  }
  /* im Auftrag stehen genau die Lieferstellen dieser Angebotsvariante */
  for (const l of (blanko ? a.lieferstellen : stellenVon(a, v))) {
    if (y + 20 > H - 22) y = neueSeite("SERVICE- & BERATUNGSAUFTRAG");
    const vv = vorversorger[l.id] || {};
    schrift(8.5, true); farbe(NAVY);
    if (blanko) {
      strich(TEXT); doc.setLineWidth(0.3);
      doc.rect(RA, y - 2.6, 2.8, 2.8, "S"); text("Strom", RA + 4, y); ankreuzen("Strom", RA, y - 2.6);
      doc.rect(RA + 18, y - 2.6, 2.8, 2.8, "S"); text("Erdgas", RA + 22, y); ankreuzen("Erdgas", RA + 18, y - 2.6);
      schrift(7.8); farbe(GRAU); text("Lieferadresse:", RA + 40, y);
      strich(LINIE); doc.line(RA + 60, y + 0.5, W - RA, y + 0.5); feld("Lieferadresse", RA + 59, y - 3.4, BR - 59, 4.2);
    } else
    text((l.medium === "gas" ? "Erdgas" : "Strom") + (l.bezeichnung ? " · " + l.bezeichnung : "") + "  ·  " +
      [l.strasse, [l.plz, l.ort].filter(Boolean).join(" ")].filter(Boolean).join(", "), RA, y);
    y += 1.5;
    [["akt. Versorger", vv.versorger || l.versorger, "Kundennummer", l.kundennummer],
     ["Verbrauch", l.verbrauch ? num(zahlLesen(l.verbrauch) || 0) + " kWh" : "", "Zählernummer", l.zaehlernummer],
     ["Lieferbeginn", (() => { const b = v.preise ? stelleIn(v, l).lieferbeginn : v.lieferbeginn; return b ? datum(b) : ""; })(), "MaLo", l.maloId]].forEach((r, i) => {
      if (i % 2 === 0) { flaeche(HELL); doc.rect(RA, y, BR, 4.8, "F"); }
      schrift(7.8); farbe(GRAU); text(r[0], RA + 2, y + 3.4); text(r[2], RA + halb + 2, y + 3.4);
      farbe(TEXT); text(blanko ? "" : r[1] || "", RA + 32, y + 3.4); text(blanko ? "" : r[3] || "", RA + halb + 32, y + 3.4);
      const fn = [["Versorger", "Kundennummer"], ["Verbrauch kWh", "Zaehlernummer"], ["Lieferbeginn", "MaLo"]][i];
      if (blanko || !r[1]) feld(fn[0], RA + 31, y + 0.25, halb - 33, 4.3, { gr: 8 });
      if (blanko || !r[3]) feld(fn[1], RA + halb + 31, y + 0.25, halb - 31, 4.3, { gr: 8 });
      y += 4.8;
    });
    y += 4;
  }
  schrift(8.5, true); farbe(TEXT); text("IBAN:", RA, y + 4);
  strich(TEXT); doc.setLineWidth(0.3); doc.line(RA + 14, y + 4.5, W - RA, y + 4.5);
  feld("IBAN", RA + 13, y + 0.2, BR - 13, 4.2, { gr: 9 });
  y += 10;

  /* Zusatzbemerkungen: vorgefüllter Text der Kalkulation, darunter Linien zum Ausfüllen von Hand */
  if (y + 26 > H - 22) y = neueSeite("SERVICE- & BERATUNGSAUFTRAG");
  schrift(8.5, true); farbe(TEXT); text("Zusatzbemerkungen:", RA, y); y += 2;
  const zb = String(vollmachtBemerkung || "").trim();
  strich(LINIE); doc.setLineWidth(0.3);
  const boxH = Math.max(16, zb ? doc.splitTextToSize(zb, BR - 6).length * 3.8 + 9 : 16);
  doc.rect(RA, y, BR, boxH, "S");
  let yb = y + 5;
  if (zb) { farbe(TEXT); yb = absatz(zb, RA + 3, yb, BR - 6, 8.5, 3.8) + 1; }
  strich(LINIE); doc.setLineWidth(0.2);
  for (let yy = yb + 3; yy < y + boxH - 1; yy += 6) doc.line(RA + 3, yy, W - RA - 3, yy);
  feld("Zusatzbemerkungen", RA + 1.5, yb - 3, BR - 3, y + boxH - 1 - (yb - 3), { mehrzeilig: true });
  y += boxH + 6;
  if (y + 74 > H - 22) y = neueSeite("SERVICE- & BERATUNGSAUFTRAG");
  strich(TEXT); doc.setLineWidth(0.3); doc.rect(RA, y - 3, 3.4, 3.4, "S");
  strich(GRUEN); doc.setLineWidth(0.6); doc.line(RA + 0.6, y - 1.3, RA + 1.4, y - 0.4); doc.line(RA + 1.4, y - 0.4, RA + 2.9, y - 2.5);
  schrift(8.5, true); farbe(NAVY); text(EGC_AUFTRAG.einleitung, RA + 5.5, y); y += 5;
  EGC_AUFTRAG.abschnitte.forEach(([t, inhalt]) => {
    schrift(8.3, true); farbe(TEXT); text(t, RA, y); y += 3.9;
    farbe(TEXT); y = absatz(inhalt, RA, y, BR, 7.8, 3.75) + 2.5;
  });
  y += 4;
  y = ueberschrift("Unterschriften Vollmacht / Lastschriftmandat / Datenschutz", RA, y);
  unterschriften(y + 12, ["Ort, Datum", "Name, Vorname (Klarschrift)", "Unterschrift & Firmenstempel"], 0, "Vollmacht");

  y = neueSeite("DATENSCHUTZ");
  EGC_AUFTRAG.datenschutz.forEach(([t, inhalt]) => {
    if (y + 26 > H - 22) y = neueSeite("DATENSCHUTZ");
    schrift(8.5, true); farbe(NAVY); text(t, RA, y); y += 4;
    farbe(TEXT); y = absatz(inhalt, RA, y, BR, 8, 3.6) + 3;
  });
  if (y + 24 > H - 22) y = neueSeite("DATENSCHUTZ");
  y = ueberschrift("Unterschrift Einwilligung", RA, y + 4);
  y = unterschriften(y + 14, ["Ort, Datum", "Name, Vorname (Klarschrift)", "Unterschrift & Firmenstempel"], 0, "Datenschutz");
  } /* Ende Service- & Beratungsauftrag */

  /* ---------- Nächste Schritte ---------- */
  if (!blanko) {
  doc.addPage();
  verlauf(0, 0, W, 46, NAVY1, NAVY2);
  doc.saveGraphicsState(); doc.rect(0, 0, W, 46, null); doc.clip(); doc.discardPath();
  kringel(W - 26, 8, 34, GRUEN, 0.14); kringel(W - 26, 8, 44, WEISS, 0.07, "S"); kringel(W - 80, 50, 14, WEISS, 0.05);
  doc.restoreGraphicsState();
  doc.addImage(logo, "JPEG", RA, 14, (420 / 196) * 16, 16);
  verlauf(0, 46, W, 1.3, GRUEN1, GRUEN2);
  schrift(14); farbe(GRAU); text("Ihre", RA, 64);
  schrift(26, true); farbe(NAVY); text("nächsten Schritte", RA, 75);
  verlauf(RA, 79, 30, 1.3, GRUEN1, GRUEN2, { r: 0.65, stufen: 30 });
  doc.setFont("helvetica", "italic"); doc.setFontSize(9); farbe(GRAU);
  text("So geht es nach Ihrem Energieangebot weiter:", RA, 86);
  y = 100;
  EGC_SCHRITTE.forEach(([t, inhalt], i) => {
    schrift(8.5); const zl = doc.splitTextToSize(inhalt, BR - 24);
    const ch = 10 + zl.length * 3.9;
    if (i < EGC_SCHRITTE.length - 1) {
      strich(GRUEN2); doc.setLineWidth(0.7); doc.setLineDashPattern([1, 1.2], 0);
      doc.line(RA + 5, y + 5.5, RA + 5, y + 27); doc.setLineDashPattern([], 0);
    }
    flaeche(HELL); doc.roundedRect(RA + 13, y - 5, BR - 13, ch, 2.5, 2.5, "F");
    verlauf(RA + 0.2, y - 4.8, 9.6, 9.6, GRUEN2, GRUEN1, { kreis: true, quer: false, stufen: 30 });
    schrift(10.5, true); farbe(WEISS); text(String(i + 1), RA + 5, y + 1.6, { align: "center" });
    schrift(10.5, true); farbe(NAVY); text(t, RA + 17, y + 1);
    farbe(TEXT); doc.setFont("helvetica", "normal"); doc.setFontSize(8.5);
    doc.text(zl, RA + 17, y + 6, { lineHeightFactor: 1.35 });
    y += 29;
  });
  verlauf(0, H - 22, W, 22, NAVY1, NAVY2);
  doc.saveGraphicsState(); doc.rect(0, H - 22, W, 22, null); doc.clip(); doc.discardPath();
  kringel(18, H + 6, 24, GRUEN, 0.14); kringel(W - 18, H - 26, 18, WEISS, 0.05);
  doc.restoreGraphicsState();
  verlauf(0, H - 22, W, 1.3, GRUEN1, GRUEN2);
  schrift(8); farbe([196, 208, 222]);
  text(firmenzeile(), W / 2, H - 10, { align: "center" });
  }

  /* Seitenzahlen (beim Angebot ohne Deckblatt und Schlussseite) */
  const n = doc.getNumberOfPages();
  for (let i = blanko ? 1 : 2; i <= (blanko ? n : n - 1); i++) {
    if (i === smTitel) continue;
    doc.setPage(i); schrift(7); farbe(GRAU); text("Seite " + i + " von " + n, W - RA, H - 6.4, { align: "right" });
  }

  /* Vollmacht ausfüllbar machen; misslingt das, bleibt es beim PDF zum Ausfüllen von Hand */
  let pdfBytes = new Uint8Array(doc.output("arraybuffer"));
  try { pdfBytes = pdfMitFeldern(pdfBytes, formFelder); } catch (e) { console.warn("Formularfelder nicht gesetzt", e); }
  const url = bytesAlsDataUrl(pdfBytes);
  if (blanko)
    return { name: "Service-und-Beratungsauftrag_Blanko.pdf", typ: "application/pdf", groesse: pdfBytes.length, url };
  const name = "Angebot_" + (kunde.firma || a.id).replace(/[^\wäöüÄÖÜß]+/g, "_") + "_" +
    (v.produkt || "").replace(/[^\wäöüÄÖÜß]+/g, "") + ".pdf";
  return { name, typ: "application/pdf", groesse: pdfBytes.length, url };
}

/* Anfrage-PDF für den Versorger */
async function individualAnfragePdf(a, mitarbeiter, anlagen) {
  const jsPDF = await ladeJsPdf();
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const W = 210, H = 297, RA = 16, BR = W - 2 * RA;
  const NAVY = [10, 22, 38], GRUEN = [108, 180, 59], TEXT = [22, 33, 44], GRAU = [107, 119, 135],
        LINIE = [216, 221, 228], HELL = [246, 248, 250];
  const F = FIRMENDATEN;
  const k = a.kunde || {};
  const partner = mitarbeiter.find((m) => m.id === a.partnerId) || {};
  const farbe = (f) => doc.setTextColor(f[0], f[1], f[2]);
  const flaeche = (f) => doc.setFillColor(f[0], f[1], f[2]);
  const schrift = (gr, fett) => { doc.setFont("helvetica", fett ? "bold" : "normal"); doc.setFontSize(gr); };
  const text = (t, x, y, o) => doc.text(String(t == null ? "" : t), x, y, o);
  const kopf = () => {
    flaeche(NAVY); doc.rect(0, 0, W, 26, "F");
    doc.addImage("data:image/jpeg;base64," + LOGO_PDF, "JPEG", RA, 6, (420 / 196) * 13, 13);
    schrift(15, true); farbe([255, 255, 255]); text("INDIVIDUALANFRAGE", W - RA, 16, { align: "right" });
    flaeche(GRUEN); doc.rect(0, 26, W, 1.2, "F");
    pdfFussFirma(doc, W, H, RA);
    return 36;
  };
  const titel = (t, y) => { flaeche(GRUEN); doc.rect(RA, y - 3.4, 1.2, 4.4, "F"); schrift(10, true); farbe(NAVY); text(t.toUpperCase(), RA + 3.5, y); return y + 6; };
  const tabelle = (zeilen, y, links = 52) => {
    zeilen.forEach(([kk, vv], i) => {
      if (i % 2 === 0) { flaeche(HELL); doc.rect(RA, y, BR, 5.6, "F"); }
      schrift(8); farbe(GRAU); text(kk, RA + 2, y + 3.9);
      schrift(8.5); farbe(TEXT); text(doc.splitTextToSize(String(vv || "–"), BR - links - 4)[0], RA + links, y + 3.9);
      y += 5.6;
    });
    return y + 4;
  };

  let y = kopf();
  schrift(8); farbe(GRAU);
  text("Vorgang " + a.id + "  ·  Anfrage vom " + datum(heute()), RA, y);
  y += 8;
  farbe(TEXT);
  schrift(9);
  const intro = doc.splitTextToSize("Wir bitten um ein individuelles Angebot für den nachstehenden Kunden. Die Lastgänge der RLM-Lieferstellen liegen als Excel-Dateien bei.", BR);
  doc.text(intro, RA, y); y += intro.length * 4.4 + 4;

  y = titel("Angefragt von", y);
  y = tabelle([["Vermittler", [F.vertreter, "EGC Energie"].filter(Boolean).join(" · ")],
    ["Anschrift", [F.strasse, F.ort].filter(Boolean).join(", ")], ["Telefon", F.telefon], ["E-Mail", F.email],
    ["Vertriebspartner", partner.name]], y);

  y = titel("Kunde", y);
  y = tabelle([["Firma", k.firma], ["Anschrift", [k.strasse, [k.plz, k.ort].filter(Boolean).join(" ")].filter(Boolean).join(", ")],
    ["Ansprechpartner", k.ansprechpartner], ["Branche", k.branche]], y);

  y = titel("Angebotswunsch", y);
  const strom = verbrauchMedium(a, "strom") > 0, gas = verbrauchMedium(a, "gas") > 0;
  y = tabelle([
    ...(strom ? [["Produkt Strom", a.produkt]] : []),
    ...(gas ? [["Produkt Erdgas", a.produktGas || a.produkt]] : []),
    ["Gewünschter Lieferbeginn", a.wunschLieferbeginn ? datum(a.wunschLieferbeginn) : "offen"],
    ["Gewünschte Laufzeit", a.laufzeitArt === "ende" ? "fest bis " + (a.wunschLieferende ? datum(a.wunschLieferende) : "offen") : a.laufzeit + " Monate"],
    ["Gewünschter Aufschlag", num(a.aufschlag || 0, 3) + " ct/kWh"],
    ["Gesamtmenge", num(verbrauchGesamt(a)) + " kWh/Jahr"],
  ], y);
  if (a.beratungHinweis) {
    schrift(8.5, true); farbe(TEXT); text("Hinweis zum Kunden:", RA, y); y += 4;
    schrift(8.5); const h = doc.splitTextToSize(a.beratungHinweis, BR); doc.text(h, RA, y); y += h.length * 4 + 4;
  }

  y = titel("Lieferstellen", y);
  a.lieferstellen.forEach((l, i) => {
    if (y + 40 > H - 20) { doc.addPage(); y = kopf(); }
    schrift(9, true); farbe(NAVY);
    text((i + 1) + ". " + (l.medium === "gas" ? "Erdgas" : "Strom") + (l.bezeichnung ? " · " + l.bezeichnung : ""), RA, y); y += 2;
    const anl = anlagen.filter((x) => x.lieferstelle === l.id);
    y = tabelle([
      ["Lieferanschrift", [l.strasse, [l.plz, l.ort].filter(Boolean).join(" ")].filter(Boolean).join(", ")],
      ["Jahresverbrauch", num(zahlLesen(l.verbrauch) || 0) + " kWh"],
      ["Zählerart", l.zaehlerart], ["Zählernummer", l.zaehlernummer], ["Marktlokations-ID", l.maloId],
      ["Aktueller Versorger", l.neueinzug ? "Neueinzug, kein Vorversorger" : l.versorger],
      ...(l.vertragsendeAlt ? [["Vertrag läuft bis", datum(l.vertragsendeAlt)]] : []),
      ...(l.kuendigungsfrist ? [["Kündigungsfrist", l.kuendigungsfrist]] : []),
      ["Lastgang", anl.length ? "Anlage: " + anl.map((x) => x.name).join(", ") : (l.zaehlerart === "RLM" ? "liegt nicht vor" : "–")],
    ], y);
  });

  if (anlagen.length) {
    if (y + 10 + anlagen.length * 5 > H - 20) { doc.addPage(); y = kopf(); }
    y = titel("Anlagen", y);
    schrift(8.5); farbe(TEXT);
    anlagen.forEach((x) => { text("• " + x.name, RA + 2, y); y += 4.6; });
  }
  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) { doc.setPage(i); schrift(7); farbe(GRAU); text("Seite " + i + " von " + n, W - RA, H - 6.4, { align: "right" }); }
  return new Uint8Array(doc.output("arraybuffer"));
}

/* Paket: Anfrage-PDF und Lastgänge als XLSX, zusammen als ZIP */
async function individualPaket(a, mitarbeiter) {
  const anlagen = [];
  for (const l of a.lieferstellen) {
   const lgs = dateienVon(l.lastgang);
   for (const [nr, lg] of lgs.entries()) {
    const basis = "Lastgang_" + dateiName(l.bezeichnung || (l.medium === "gas" ? "Erdgas" : "Strom")) + "_" + dateiName(l.maloId || l.id)
      + (lgs.length > 1 ? "_" + (nr + 1) : "");
    const url = await dateiInhalt(lg);
    if (!url) continue;
    const name = String(lg.name || "");
    let bytes, endung;
    if (/\.xlsx$/i.test(name)) { bytes = dataUrlBytes(url); endung = ".xlsx"; }
    else if (/\.(csv|txt)$/i.test(name) || /text\/csv/.test(url.slice(0, 30))) {
      bytes = xlsxAusZeilen(await csvLesen({ ...lg, url })); endung = ".xlsx";
    } else { bytes = dataUrlBytes(url); endung = (name.match(/\.\w+$/) || [".pdf"])[0]; }
    anlagen.push({ lieferstelle: l.id, name: basis + endung, bytes });
   }
  }
  const pdf = await individualAnfragePdf(a, mitarbeiter, anlagen);
  const firma = dateiName(a.kunde && a.kunde.firma || a.id);
  const inhalt = { ["Individualanfrage_" + firma + ".pdf"]: pdf };
  anlagen.forEach((x) => { inhalt[x.name] = x.bytes; });
  const zip = zipSync(inhalt, { level: 6 });
  return { pdf: { name: "Individualanfrage_" + firma + ".pdf", typ: "application/pdf", groesse: pdf.length,
                  url: bytesDataUrl(pdf, "application/pdf") },
           zip: { name: "Individualanfrage_" + firma + ".zip", typ: "application/zip", groesse: zip.length,
                  url: bytesDataUrl(zip, "application/zip") } };
}

const HV_PARAGRAFEN = [
 { h: "§ 1 Vertragsverhältnis", n: [
  "Der Handelsvertreter wird für EGC als selbstständiger Handelsvertreter im Sinne von § 84 Abs. 1 HGB tätig. Er ist in der Gestaltung seiner Tätigkeit und Arbeitszeit frei und an keinen festen Arbeitsort gebunden.",
  "Gegenstand der Tätigkeit ist die Vermittlung von Verträgen über die Energiebeschaffungsberatung von EGC sowie über Strom- und Erdgaslieferverträge gewerblicher Kunden, die EGC mit Energieversorgern abschließt.",
  "Der Handelsvertreter ist Vermittlungsvertreter. Er ist nicht berechtigt, Verträge im Namen von EGC oder eines Energieversorgers abzuschließen, Erklärungen für sie abzugeben oder Zahlungen entgegenzunehmen.",
  "Ein Anstellungsverhältnis wird durch diesen Vertrag nicht begründet."] },
 { h: "§ 2 Pflichten des Handelsvertreters", n: [
  "Der Handelsvertreter wahrt die Interessen von EGC mit der Sorgfalt eines ordentlichen Kaufmanns (§ 86 HGB).",
  "Er reicht Anfragen vollständig über das Vertriebsportal von EGC ein, insbesondere mit Versorger, Zählernummer, Marktlokations-ID, Jahresverbrauch und Lastgang bei RLM-Kunden, sowie der Maklervollmacht des Kunden.",
  "Er legt Kunden nur Angebote vor, die die Kalkulation von EGC erstellt und freigegeben hat. Zusagen zu Preisen, Einsparungen oder Leistungen darüber hinaus macht er nicht.",
  "Er verwendet Namen, Logo und Unterlagen von EGC nur in der von EGC bereitgestellten oder freigegebenen Form.",
  "Er informiert EGC unverzüglich über alle Umstände, die für die Kundenbeziehung wesentlich sind, insbesondere über Beschwerden und Kündigungsabsichten von Kunden."] },
 { h: "§ 3 Pflichten von EGC", n: [
  "EGC stellt dem Handelsvertreter die erforderlichen Unterlagen, Schulungen und einen Zugang zum Vertriebsportal zur Verfügung (§ 86a HGB).",
  "EGC informiert den Handelsvertreter über das Zustandekommen oder Scheitern vermittelter Verträge sowie über Kündigungen durch Energieversorger.",
  "Ob und mit welchem Inhalt EGC oder ein Energieversorger einen Vertrag mit einem Kunden schließt, entscheidet EGC bzw. der Energieversorger frei."] },
 { h: "§ 4 Kundenschutz", n: [
  "Ein Gebietsschutz besteht nicht. Ein Anspruch auf Bezirksprovision nach § 87 Abs. 2 HGB ist ausgeschlossen.",
  "Ein Kunde ist dem Handelsvertreter für 12 Monate ab seiner Registrierung im Vertriebsportal zugeordnet (Kundenschutz). Maßgeblich ist der Zeitpunkt der Registrierung. Kommt innerhalb dieser Frist ein Vertrag mit dem Kunden zustande, steht die Provision dem Handelsvertreter zu.",
  "Kein Kundenschutz besteht für Kunden, die bereits Kunde von EGC sind oder mit denen EGC oder ein anderer Vertriebspartner in den letzten 12 Monaten vor der Registrierung nachweislich in Kontakt stand."] },
 { h: "§ 5 Provision", n: [
  /* angepasst: Gesamtprovision ist die vereinbarte, nicht die bei EGC eingehende Provision */
  "Der Handelsvertreter erhält für jeden von ihm vermittelten Vertrag eine Provision von {P} der Gesamtprovision je Lieferjahr. Gesamtprovision ist die für den Vertrag vereinbarte Provision, in der Regel Aufschlag in ct/kWh × Jahresverbrauch (ohne Umsatzsteuer).",
  "Der Provisionsanspruch für das erste Lieferjahr entsteht, sobald der Energieversorger den Vertragsabschluss bestätigt hat. Für jedes weitere Lieferjahr entsteht er, sobald der Energieversorger die Provision für dieses Lieferjahr an EGC gezahlt hat.",
  "Die Provision für das erste Lieferjahr wird in der Regel innerhalb von 8 Wochen nach der Bestätigung durch den Energieversorger ausgezahlt, für jedes weitere Lieferjahr nach Zahlungseingang bei EGC. EGC rechnet monatlich über die entstandenen Provisionen ab. Die Rechte des Handelsvertreters nach § 87c HGB bleiben unberührt.",
  "Provision fällt auch für Verlängerungen und Folgeverträge der vermittelten Kunden an, solange EGC hieraus Provision vom Energieversorger erhält.",
  "Kündigt der Energieversorger den Liefervertrag des Kunden, entfällt der Provisionsanspruch für diesen Kunden ab dem Zeitpunkt der Kündigung.",
  "Muss EGC eine erhaltene Provision an den Energieversorger zurückzahlen (z. B. durch Storno oder Rückbelastung), entfällt der darauf entfallende Provisionsanspruch des Handelsvertreters. Bereits gezahlte Beträge werden mit der nächsten Abrechnung verrechnet oder sind zurückzuzahlen.",
  "Ist der Handelsvertreter umsatzsteuerpflichtig, zahlt EGC die Provision zuzüglich der gesetzlichen Umsatzsteuer im Gutschriftverfahren. Kleinunternehmer nach § 19 UStG erhalten die Provision ohne Umsatzsteuer."],
  extra: "Bankverbindung des Handelsvertreters (IBAN): {IBAN}" },
 { h: "§ 6 Vertriebsstruktur und Overhead", n: [
  "Der Handelsvertreter kann mit vorheriger Zustimmung von EGC in Textform weitere Vertriebspartner gewinnen. Diese schließen einen eigenen Vertrag mit EGC und werden der Struktur des Handelsvertreters zugeordnet.",
  "Für Verträge, die Vertriebspartner seiner Struktur vermitteln, erhält der Handelsvertreter als Overhead die Differenz zwischen seinem eigenen Provisionssatz und dem Provisionssatz des jeweiligen Vertriebspartners, bezogen auf die Gesamtprovision nach § 5. Für den Overhead gelten § 5 Nr. 2 bis 7 entsprechend.",
  "Die Provisionssätze der Vertriebspartner und ihre Zuordnung zur Struktur legt die Geschäftsführung von EGC fest. Ist der Satz eines Vertriebspartners gleich hoch oder höher als der des Handelsvertreters, entsteht kein Overhead."] },
 { h: "§ 7 Wettbewerbsverbot", n: [
  "Während der Laufzeit dieses Vertrags vermittelt der Handelsvertreter weder unmittelbar noch mittelbar Strom- oder Erdgaslieferverträge oder Energieberatungsleistungen für andere Unternehmen. Er beteiligt sich auch nicht an Unternehmen, die mit EGC in diesem Bereich im Wettbewerb stehen.",
  "Tätigkeiten in anderen Branchen bleiben erlaubt. Der Handelsvertreter zeigt EGC eine weitere Vertretung vor deren Aufnahme in Textform an.",
  "Ein nachvertragliches Wettbewerbsverbot wird nicht vereinbart."] },
 { h: "§ 8 Kosten, Steuern und Sozialversicherung", n: [
  "Der Handelsvertreter trägt die Kosten seiner Tätigkeit selbst (§ 87d HGB), sofern nichts anderes in Textform vereinbart ist.",
  "Er ist für Gewerbeanmeldung, Versteuerung seiner Einkünfte und seine soziale Absicherung selbst verantwortlich."] },
 { h: "§ 9 Vertraulichkeit, Datenschutz und Unterlagen", n: [
  "Beide Parteien behandeln Geschäftsgeheimnisse, Konditionen und Kundendaten vertraulich, auch nach Vertragsende.",
  "Personenbezogene Daten werden nur zur Durchführung dieses Vertrags und nach den Vorgaben der DSGVO verarbeitet. Kundendaten werden im Vertriebsportal von EGC geführt.",
  "Bei Vertragsende gibt der Handelsvertreter alle Unterlagen und Daten von EGC zurück bzw. löscht sie, soweit keine gesetzliche Aufbewahrungspflicht besteht. Der Zugang zum Vertriebsportal wird beendet."] },
 { h: "§ 10 Laufzeit und Kündigung", n: [
  "Der Vertrag beginnt mit Unterzeichnung und läuft auf unbestimmte Zeit.",
  "Er kann im ersten Vertragsjahr mit einer Frist von 1 Monat, im zweiten mit 2 Monaten und im dritten bis fünften mit 3 Monaten gekündigt werden; danach beträgt die Frist 6 Monate. Die Kündigung ist jeweils nur zum Ende eines Kalendermonats und in Textform möglich (§ 89 HGB).",
  "Das Recht zur fristlosen Kündigung aus wichtigem Grund (§ 89a HGB) bleibt unberührt, insbesondere bei einem Verstoß gegen § 2, § 7 oder § 9.",
  "Für Verträge, die während der Vertragslaufzeit vermittelt wurden, zahlt EGC die Provision nach § 5 auch nach Vertragsende fort. Der Ausgleichsanspruch nach § 89b HGB bleibt unberührt."] },
 { h: "§ 11 Schlussbestimmungen", n: [
  "Änderungen und Ergänzungen bedürfen der Textform. Das gilt auch für die Aufhebung dieser Klausel.",
  "Mündliche Nebenabreden bestehen nicht.",
  "Ist eine Bestimmung unwirksam, bleiben die übrigen wirksam. An ihre Stelle tritt eine Regelung, die dem wirtschaftlichen Zweck am nächsten kommt.",
  "Es gilt deutsches Recht. Gerichtsstand ist, soweit gesetzlich zulässig, der Sitz von EGC."] },
];

async function vertragPdf(m, mitarbeiter) {
  const v = m.vertrag || {};
  const sd = m.stammdaten || {};
  const leer = "______________________";
  const bild = async (d) => {
    if (!d) return null;
    try { return { bild: await dateiInhalt(d), breite: d.breite, hoehe: d.hoehe }; }
    catch (e) { return null; }
  };
  const gf = await bild(v.gfUnterschrift);
  const vp = await bild(v.partnerUnterschrift);
  const satz = num(parseFloat(v.satz) || 0, 0) + " %";
  const steuer = sd.ustId || sd.steuernummer;
  const z = vertragsZeilen("Handelsvertretervertrag", [
    "Handelsvertreter: " + (sd.firma ? sd.firma + " (" + m.name + ")" : m.name) + ", "
      + (sd.strasse || leer) + ", " + ([sd.plz, sd.ort].filter(Boolean).join(" ") || leer)
      + (steuer ? ", St.-Nr./USt-IdNr.: " + steuer : "") + ", nachfolgend \"Handelsvertreter\"",
  ], HV_PARAGRAFEN, (t) => t.replace("{P}", satz)
    .replace("{IBAN}", sd.iban || "________________________________"));
  z.push(" ");
  z.push({ text: "Unterschriften", gross: true });
  z.push("Für EGC Energie, " + (v.gfName || FIRMENDATEN.vertreter || leer) + ":");
  if (gf && gf.bild) z.push(gf); else z.push(" ");
  z.push("Ort, Datum: " + (FIRMENDATEN.ort ? FIRMENDATEN.ort.replace(/^\d+\s*/, "") + ", " : "")
    + (v.gfDatum ? datum(v.gfDatum) : leer));
  z.push(" ");
  z.push("Handelsvertreter, " + m.name + ":");
  if (vp && vp.bild) z.push(vp); else z.push(" ");
  z.push("Ort, Datum: " + (v.partnerDatum ? (sd.ort ? sd.ort + ", " : "") + datum(v.partnerDatum) : leer));
  const pdf = erzeugePdf("Handelsvertretervertrag_" + m.name.replace(/\W+/g, "_") + ".pdf",
    "Handelsvertretervertrag", z);
  if (pdf) dateiLaden(pdf);
}

/* ---------- Strukturanfragen ----------
   Der Teamleiter schlägt einen neuen Vertriebspartner für seine Struktur vor.
   Die Geschäftsführung gibt frei, unterschreibt und erzeugt die Einladung. */

export {
  BROSCHUERE_BILDER, BROSCHUERE_PFAD, FLYER, HV_PARAGRAFEN, VISITENKARTE_ROLLEN, bildAlsDataUrl, broschuereLaden, dienstleistungsvertragPdf,
  dlvText, egcAngebotPdf, imagebroschuerePdf, individualAnfragePdf, individualPaket, ladeBroschuere, ladeQr, ndaPdf,
  ndaZiffern, portfolioFlyerPdf, qrLaden, vertragPdf, visitenkartePdf,
};
