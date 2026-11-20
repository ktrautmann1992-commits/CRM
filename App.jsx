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
  passwortVergessen, zugangSetzen, kundenangebot, kundenlinksLaden, kundenlinksFuer,
} from "./datenbank.js";


/* ---------- Programmteile, die erst bei Bedarf geladen werden (v5.40) ----------
   Beschaffung, PDF-Erzeugung und Verwaltung liegen in eigenen Dateien. Ein Vertriebspartner lädt sie
   nur, wenn er sie wirklich braucht; das verkürzt die Ladezeit am Handy. */
const TEIL_LADER = {
  beschaffung: () => import("./beschaffung.jsx"),
  innendienst: () => import("./innendienst.jsx"),
  kunde: () => import("./kunde.jsx"),
  pdf: () => import("./pdf.jsx"),
  selten: () => import("./selten.jsx"),
  vertrieb: () => import("./vertrieb.jsx"),
  verwaltung: () => import("./verwaltung.jsx"),
  vorgang: () => import("./vorgang.jsx"),
};
const teilGeladen = {};
/* Bautest und bereits geladene Teile: sofort verfügbar, ohne Ladeanzeige */
export const teilRegistrieren = (name, m) => { teilGeladen[name] = m; };
const teilLaden = (name) => (teilGeladen[name] ? Promise.resolve(teilGeladen[name])
  : TEIL_LADER[name]().then((m) => (teilGeladen[name] = m)));
function TeilLaedt() {
  return <div className="py-10 text-center text-sm" style={{ color: "#6B7787" }}>Wird geladen …</div>;
}
/* Platzhalter für eine Ansicht aus einem Teil */
function teilKomponente(name, k) {
  let Lazy = null;
  const Teil = (props) => {
    const m = teilGeladen[name];
    if (m) return React.createElement(m[k], props);
    if (!Lazy) Lazy = React.lazy(() => teilLaden(name).then((mm) => ({ default: mm[k] })));
    return <React.Suspense fallback={<TeilLaedt />}><Lazy {...props} /></React.Suspense>;
  };
  Teil.displayName = k;
  return Teil;
}
/* Platzhalter für eine async-Funktion aus einem Teil */
const teilFunktion = (name, k) => (...args) => teilLaden(name).then((m) => m[k](...args));

/* ------------------------------------------------------------------ */
/*  Design-Token                                                       */
/* ------------------------------------------------------------------ */
const C = {
  ink: "#0A1626",
  inkSoft: "#18293F",
  inkLine: "#26384F",
  paper: "#EFF1F4",
  card: "#FFFFFF",
  line: "#D8DDE4",
  text: "#16202C",
  muted: "#6B7787",
  strom: "#2F5FE0",
  gas: "#BE6A16",
  ok: "#4A9130",
  warn: "#B24328",
  gruen: "#6CB43B",
};

const LOGO = "data:image/png;base64,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";

const FONT =
  'Inter, "Helvetica Neue", Helvetica, ui-sans-serif, system-ui, sans-serif';

const STATUS = {
  entwurf: { label: "Entwurf", color: C.muted },
  eingereicht: { label: "Bei Kalkulation", color: C.strom },
  klaerfall: { label: "Daten fehlen", color: C.warn },
  ruecksprache: { label: "Rücksprache Geschäftsführung", color: C.gruen },
  angefragt: { label: "Angebot beim Versorger angefragt", color: "#BE6A16" },
  angebot: { label: "Angebot liegt vor", color: C.ok },
  uebermittelt: { label: "Auftrag erteilt, bereit zum Einreichen", color: "#2F5FE0" },
  einreichung: { label: "An Versorger übermittelt", color: C.gold },
  bestaetigt: { label: "Vom Versorger bestätigt, Provision offen", color: C.ok },
  abgeschlossen: { label: "Abgeschlossen", color: C.ink },
  abgelehnt: { label: "Abgelehnt", color: C.muted },
};

/* Was der Vertriebspartner als Nächstes tun muss, je Status. art: tun (Handlung nötig) oder warten */
function naechsterSchritt(a) {
  const st = a.status;
  if (st === "entwurf") return { art: "tun", text: "Anfrage vervollständigen und an die Kalkulation senden." };
  if (st === "klaerfall") return { art: "dringend", text: "Die Kalkulation braucht noch Unterlagen oder Angaben von dir. Was fehlt, steht direkt darunter." };
  if (st === "angebot" && !a.angebotVersendet) return { art: "tun", text: "Angebot prüfen, an den Kunden schicken und danach „An Kunde versendet“ tippen." };
  if (st === "angebot" && a.angebotVersendet.perLink) return { art: "tun", text: "Der Kunde hat einen Link zum Unterschreiben. Sobald er unterschreibt, bekommst du eine Mail und bestätigst hier den Auftrag. Nachfassen lohnt sich, sobald er das Angebot geöffnet hat. Sagt er ab: „Kein Angebot angenommen“." };
  if (st === "angebot") return { art: "tun", text: "Sobald der Kunde zusagt: „Angebot angenommen“ tippen, Umfang wählen und Vollmacht mit Angebot hochladen. Sagt er ab: „Kein Angebot angenommen“." };
  if (["eingereicht", "angefragt", "ruecksprache"].includes(st)) return { art: "warten", text: "Nichts zu tun. Die Kalkulation erstellt dein Angebot, du bekommst eine Mail." };
  if (st === "uebermittelt") return { art: "warten", text: "Nichts zu tun. Die Kalkulation reicht den Auftrag beim Versorger ein." };
  if (st === "einreichung" || st === "bestaetigt") return { art: "warten", text: "Nichts zu tun. Wir warten auf die Bestätigung des Versorgers, du bekommst eine Mail." };
  if (st === "abgeschlossen") return { art: "fertig", text: "Abgeschlossen. Deine Provision findest du unter „Meine Provisionen“." };
  if (st === "abgelehnt") return { art: "fertig", text: "Kein Abschluss. Den Vorgang kannst du über die Wiedervorlage später wieder aufnehmen." };
  return null;
}

/* Nächster Schritt für die Innendienst-Rollen und die Geschäftsführung (ohne eigene Beteiligung) */
function naechsterSchrittInnen(a, rolle) {
  const st = a._echterStatus || a.status;
  if (rolle === "Kalkulation") {
    if (st === "eingereicht") return { art: "tun", text: "Anfrage prüfen: kalkulieren, beim Versorger anfragen, Rücksprache halten oder fehlende Unterlagen beim Vertrieb anfordern." };
    if (st === "angefragt") return { art: "tun", text: "Preise des Versorgers abwarten, dann das Angebot kalkulieren und an den Vertriebspartner senden." };
    if (st === "ruecksprache") return { art: "warten", text: "Wartet auf die Antwort der Geschäftsführung zur Rücksprache." };
    if (st === "klaerfall") return { art: "warten", text: "Wartet auf Unterlagen oder Angaben vom Vertriebspartner." };
    if (st === "angebot") return { art: "warten", text: a.angebotVersendet ? "Das Angebot liegt beim Kunden. Wartet auf dessen Zusage." : "Das Angebot liegt beim Vertriebspartner." };
    if (st === "uebermittelt") return { art: "dringend", text: "Auftrag beim Versorger einreichen und danach „An Versorger übermittelt“ tippen." };
    if (st === "einreichung") return { art: "tun", text: "Sobald der Versorger antwortet: Auftrag bestätigen, Klärfall melden oder Ablehnung erfassen." };
    if (st === "bestaetigt") return { art: "warten", text: "Bestätigt. Wartet auf den Provisionseingang, den die Geschäftsführung erfasst." };
  }
  if (rolle === "Vertragsmanagement" && st === "abgeschlossen") {
    if (!a.lieferbestaetigung) return { art: "dringend", text: "Lieferbestätigung erfassen: bestätigter Lieferbeginn, Vertrags- oder Kundennummer und Dokument des Versorgers." };
    return { art: "tun", text: "Vertrag betreuen: Stand „" + (a.vertragsStatus || "Vertrag zu erstellen") + "“. Fristen und Verlängerung im Blick behalten." };
  }
  if (rolle === "Geschäftsführung") {
    if (st === "bestaetigt") return { art: "dringend", text: "Provisionseingang des Versorgers erfassen und bestätigen (Provision ausstehend)." };
    if (st === "ruecksprache") return { art: "dringend", text: "Die Kalkulation bittet um Rücksprache. Antwort unten im Vorgang geben." };
    if (st === "abgeschlossen" && !a.lieferbestaetigung) return { art: "warten", text: "Abgeschlossen. Die Lieferbestätigung erfasst das Vertragsmanagement." };
  }
  if (rolle === "Finanzbuchhaltung" && st === "abgeschlossen")
    return { art: "tun", text: "Auszahlungen je Lieferjahr über die Provisionsabrechnung." };
  return null;
}

/* Rollen, in denen die Geschäftsführung arbeiten kann, ohne sich neu anzumelden */
const ARBEITEN_ALS = ["Kalkulation", "Vertragsmanagement", "Leadmanagement", "Finanzbuchhaltung", "Beschaffung"];

/* Wer gerade schaut: der Vertrieb sieht einen bestätigten Auftrag erst nach der Lieferbestätigung
   durch das Vertragsmanagement als „Vom Versorger bestätigt“, vorher als „An Versorger übermittelt“. */
const VERTRIEB_SICHT_ROLLEN = ["Vertriebspartner", "Teamleiter", "Leitung Vertrieb"];
/* Bis zum Angebot darf der Vertrieb eine eingereichte Anfrage selbst bearbeiten (Kundendaten, Verbräuche, Lieferstellen) */
const VERTRIEB_BEARBEITBAR = ["eingereicht", "angefragt"];
let SICHT_ROLLE = null;
const imVertriebNochOffen = (a) => a.status === "bestaetigt" || (a.status === "abgeschlossen" && !a.lieferbestaetigung);
/* Darstellung für den Vertrieb: gespeichert wird immer der echte Status (siehe speichern) */
const vertriebsSicht = (a) => imVertriebNochOffen(a) ? { ...a, status: "einreichung", _echterStatus: a.status } : a;
function statusVon(a, rolle) {
  rolle = rolle || SICHT_ROLLE;
  if (!a) return { label: "–", color: C.muted };
  const vertrieb = VERTRIEB_SICHT_ROLLEN.includes(rolle);
  const st = a._echterStatus || a.status;
  if (st === "angebot")
    return a.angebotVersendet ? { label: "Angebot beim Kunden", color: C.ok }
      : { label: vertrieb ? "Neues Angebot" : "Angebot beim Vertriebspartner", color: C.ok };
  if (vertrieb && imVertriebNochOffen({ ...a, status: st })) return STATUS.einreichung;
  if (st === "abgeschlossen")
    return a.lieferbestaetigung ? (vertrieb ? { label: "Vom Versorger bestätigt", color: C.ok } : STATUS.abgeschlossen)
      : { label: rolle === "Vertragsmanagement" ? "Neue Lieferbestätigung" : "Abgeschlossen, Lieferbestätigung offen", color: C.gold };
  return STATUS[st] || { label: st, color: C.muted };
}

const PRODUKTE = ["Festpreis", "Spotmarkt", "Tranchenmodell", "PPA-Modell"];
const EMPFEHLUNG = "Empfehlung der Kalkulation";
const PRODUKTWUNSCH = [...PRODUKTE, EMPFEHLUNG];
const LAUFZEITEN = [12, 18, 24, 30, 36, 48, 60];
const SPARTEN = [
  { value: "beide", label: "Strom und Erdgas" },
  { value: "strom", label: "nur Strom" },
  { value: "gas", label: "nur Erdgas" },
];

const AKQUISE_ART = [
  { value: "eigen", label: "Eigenakquise", text: "Vom Vertriebspartner selbst gewonnen" },
  { value: "unternehmen", label: "Unternehmenslead", text: "Vom Unternehmen zugewiesen" },
];

const HERKUNFT = [
  "Tippgeber", "Netzwerk", "Veranstaltung", "Eigenes Netzwerk",
  "Kaltakquise", "Social Media", "Bestandskunde", "Sonstiges",
];

const LEAD_QUELLEN = ["Tippgeber", "Social Media", "Kaltakquise", "Eigenakquise", "Sonstiges"];

const ZEITRAEUME = [
  { value: "alle", label: "Gesamter Zeitraum" },
  { value: "heute", label: "Heute" },
  { value: "tag", label: "Bestimmter Tag" },
  { value: "woche", label: "Letzte 7 Tage" },
  { value: "monat", label: "Laufender Monat" },
  { value: "quartal", label: "Laufendes Quartal" },
  { value: "jahr", label: "Laufendes Jahr" },
];

/* Prüft, ob ein Datum im gewählten Zeitraum liegt */
function imZeitraum(iso, art, tag) {
  if (!iso || art === "alle") return art === "alle";
  if (art === "heute") return iso === heute();
  if (art === "tag") return !!tag && iso === tag;
  const d = new Date(iso), n = new Date();
  if (isNaN(d)) return false;
  if (art === "woche") {
    const g = new Date(); g.setDate(g.getDate() - 7);
    return d >= g;
  }
  if (art === "monat") return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth();
  if (art === "quartal")
    return d.getFullYear() === n.getFullYear() && Math.floor(d.getMonth() / 3) === Math.floor(n.getMonth() / 3);
  if (art === "jahr") return d.getFullYear() === n.getFullYear();
  return true;
}

const tageZwischen = (von, bis) => {
  if (!von || !bis) return null;
  const a = new Date(von), b = new Date(bis);
  if (isNaN(a) || isNaN(b)) return null;
  return Math.max(0, Math.round((b - a) / 86400000));
};
const TERMINARTEN = ["Vor Ort", "Microsoft Teams", "Zoom", "Telefonkonferenz"];
const LEAD_SPALTEN = [
  { id: "neu", label: "Neuer Lead", color: "#4A9130" },
  { id: "erstgespraech", label: "Erstgespräch", color: "#2F5FE0" },
  { id: "angebot", label: "Angebotsphase", color: "#2F5FE0" },
  { id: "verhandlung", label: "Verhandlung", color: "#BE6A16" },
  { id: "auftrag", label: "Auftrag", color: "#0A1626" },
  { id: "verloren", label: "Verloren", color: "#6B7787" },
  { id: "wiedervorlage", label: "Wiedervorlage", color: "#BE6A16" },
];

const LEAD_STATUS = LEAD_SPALTEN.reduce((o, s) => ({ ...o, [s.id]: s }), {});

/* Ältere Leads auf die Kanban-Spalten abbilden */
const leadSpalte = (l) =>
  LEAD_STATUS[l.status]
    ? l.status
    : ({ bearbeitung: "erstgespraech", termin: "erstgespraech", anfrage: "angebot" }[l.status] || "neu");

const leererLead = () => ({
  id: "L-" + new Date().getFullYear() + "-" + Math.floor(100 + Math.random() * 899),
  angelegt: heute(), status: "neu", gelesen: false,
  firma: "", strasse: "", plz: "", ort: "",
  ansprechpartner: "", position: "", telefon: "", email: "",
  verbrauchStrom: "", verbrauchGas: "",
  laufzeitStrom: "", laufzeitGas: "",
  beschaffung: "", dienstleister: false, dienstleisterName: "",
  quelle: "Kaltakquise", quelleDetail: "",
  terminDatum: "", terminZeit: "", terminArt: "Vor Ort",
  bemerkung: "", dateien: [],
  zugewiesen: null, zugewiesenVon: "", zugewiesenAm: "", abschlussAm: "",
});

const ABLAGE_BEREICHE = [
  { id: "schulung", label: "Schulungen", text: "Unterlagen und Trainings zur Einarbeitung und Weiterbildung." },
  { id: "dokumente", label: "Dokumente", text: "Vollmachten, Formulare und Vorlagen für den Kundentermin." },
  { id: "marketing", label: "Marketing", text: "Flyer und Verkaufsunterlagen zum Weitergeben an Kunden." },
];

const ABLAGE_ARTEN = ["PDF", "PowerPoint", "Word", "Excel", "Video", "Online-Schulung", "Sonstiges"];

const leererEintrag = (bereich) => ({
  id: "D-" + uid(), bereich, titel: "", beschreibung: "", art: "PDF",
  datei: null, url: "", von: "", datum: heute(),
});

function seedAblage() {
  const e = (bereich, titel, art, dateiname, beschreibung, url) => ({
    id: "D-" + uid(), bereich, titel, art, beschreibung,
    datei: dateiname ? demoPdf(dateiname, [titel, beschreibung]) : null, url: url || "",
    von: "Karsten", datum: "2026-06-02",
  });
  return [
    e("dokumente", "Datenabfrage Netzbetreiber", "PDF", "datenabfrage_netzbetreiber.pdf",
      "Formular für Lastgangdaten bei RLM-Zählern."),
    e("dokumente", "Kündigungsschreiben Altvertrag", "Word", "kuendigung_vorlage.docx",
      "Vorlage zur fristgerechten Kündigung beim bisherigen Versorger."),
    e("dokumente", "Datenschutzhinweise", "PDF", "datenschutz_kunden.pdf",
      "Aushändigen beim Erstkontakt, Stand Mai 2026."),
    { id: "D-" + uid(), bereich: "dokumente", titel: "Lieferstellenliste, Blankovorlage",
      art: "Excel", beschreibung:
        "Vorlage zum Ausfüllen durch den Kunden bei vielen Lieferstellen. Ausgefüllt bei der Angebotsanfrage hochladen.",
      datei: erzeugeXlsx("lieferstellenliste_vorlage.xlsx", "Lieferstellen", [
        ["Bezeichnung", "Sparte", "Straße", "PLZ", "Ort", "Versorger", "Kundennummer",
         "Zählernummer", "Marktlokations-ID", "Jahresverbrauch kWh", "Zählerart SLP/RLM", "Bemerkung"],
        ["Beispiel: Haupthaus", "Strom", "Musterstraße 1", "66111", "Saarbrücken",
         "Stadtwerke", "1234567", "1ESY1160892344", "51238106877", 120000, "SLP", ""],
      ]),
      url: "", von: "Karsten", datum: "2026-06-02" },
    e("marketing", "Flyer Hotellerie und Gastronomie", "PDF", "flyer_hotel_gastro.pdf",
      "Vierseitig, für Erstgespräche im Gastgewerbe."),
    e("marketing", "Flyer Produktion und Gewerbe", "PDF", "flyer_produktion.pdf",
      "Schwerpunkt RLM, Lastgangoptimierung und Tranchen."),
    e("marketing", "Imagebroschüre EGC Energie", "PDF", "imagebroschuere.pdf",
      "Unternehmensvorstellung zum Hinterlassen beim Kunden."),
    e("schulung", "Grundlagen Energiebeschaffung", "PDF", "schulung_grundlagen.pdf",
      "Einstieg: Marktrollen, Preisbestandteile, Netzentgelte."),
    e("schulung", "SLP und RLM richtig erkennen", "PowerPoint", "schulung_slp_rlm.pptx",
      "Wann welcher Zählertyp vorliegt und welche Unterlagen du brauchst."),
  ];
}

const VERSORGER = [
  { id: "v-eon", name: "E.ON Energie", notiz: "Rahmenvertrag, Abrechnung monatlich",
    branchen: "breites Spektrum, keine Gastronomie unter 100.000 kWh" },
  { id: "v-enbw", name: "EnBW", notiz: "" },
  { id: "v-vattenfall", name: "Vattenfall", notiz: "" },
  { id: "v-rwe", name: "RWE", notiz: "" },
  { id: "v-swsb", name: "Stadtwerke Saarbrücken", notiz: "regionaler Schwerpunkt Saarland",
    branchen: "Hotellerie, Gastronomie, Handel, öffentliche Einrichtungen" },
  { id: "v-swt", name: "SWT Trier", notiz: "" },
  { id: "v-pfalz", name: "Pfalzwerke", notiz: "gute Konditionen bei RLM",
    branchen: "Produktion und Industrie, kein Bauträgergewerbe" },
  { id: "v-rhein", name: "Rheinenergie", notiz: "" },
  { id: "v-mvv", name: "MVV Energie", notiz: "" },
  { id: "v-entega", name: "Entega", notiz: "" },
  { id: "v-lichtblick", name: "Lichtblick", notiz: "Ökostromprodukte" },
];

/* Gespeicherte Daten aus älteren Versionen auf das aktuelle Format heben.
   Fehlende Felder werden ergänzt, vorhandene niemals überschrieben. */
function migriereAnfragen(liste) {
  return (liste || []).map((a) => ({
    laufzeitArt: "monate", wunschLieferbeginn: "", wunschLieferende: "",
    produktGas: a.produkt || "Festpreis", beratungHinweis: "", bemerkungVertrieb: "",
    dienstleistungsvertrag: false, lieferstellenListe: false, lieferstellenDatei: null,
    akquiseArt: "eigen", herkunft: "Eigenes Netzwerk", herkunftDetail: "", tippgeberId: null,
    zielpreis: "", zielpreisNotiz: "",
    fehlend: [], fehlendText: "", nachrichten: [], verlauf: [], ausgezahlt: {},
    annahme: null, einreichung: false, bestaetigung: null, klaerung: null,
    provisionErhalten: null, vertragsStatus: null, ruecksprache: null, absage: null,
    verlaengerungVon: null,
    ...a,
    kunde: { firma: "", strasse: "", plz: "", ort: "", branche: "",
             ansprechpartner: "", email: "", telefon: "", ...(a.kunde || {}) },
    lieferstellen: (a.lieferstellen || []).map((l) => ({
      adresseVon: "manuell", kundennummer: "", versorgerVon: "manuell",
      neueinzug: false, gewerbeanmeldung: null, pachtvertrag: null,
      zaehlerfotoVorhanden: false, zaehlerfoto: null, energiepreis: "", preis: "",
      ...l,
    })),
  }));
}

function migriereMitarbeiter(liste) {
  return (liste || []).map((m) => ({
    telefon: "", bild: null, status: "aktiv", satz: 0, upline: null,
    ...m,
    stammdaten: { ...leereStammdaten(), ...(m.stammdaten || {}) },
  }));
}

function migriereLeads(liste) {
  return (liste || []).map((l) => ({
    dateien: [], abschlussAm: "", quelleDetail: "", ...l,
  }));
}

const ABLEHNUNGSGRUENDE = [
  "Falsches Zeitfenster",
  "Kunde hat sich für anderes Angebot entschieden",
  "Kunde hat kein Interesse",
  "Sonstiges",
];

const FEHLGRUENDE = [
  "Versorgerabrechnung fehlt",
  "Lastgang (RLM) fehlt",
  "Marktlokations-ID fehlt",
  "Zählernummer fehlt",
  "Jahresverbrauch unplausibel",
  "Kundenanschrift unvollständig",
  "Ansprechpartner / Kontaktdaten fehlen",
];

const PARTNER_STATUS = {
  eingeladen: { label: "Eingeladen", color: "#6B7787" },
  registriert: { label: "Stammdaten offen", color: "#B24328" },
  pruefung: { label: "Zur Prüfung", color: "#2F5FE0" },
  aktiv: { label: "Freigeschaltet", color: "#4A9130" },
  abgelehnt: { label: "Nachbesserung nötig", color: "#B24328" },
};

const leereStammdaten = () => ({
  firma: "", strasse: "", plz: "", ort: "", steuernummer: "",
  kontoinhaber: "", iban: "", bic: "", bank: "",
  ustBerechtigt: false, ustId: "",
  gewerbe: null, ausweisVorne: null, ausweisHinten: null, ustNachweis: null,
});

const passwortRegeln = (pw) => [
  { ok: (pw || "").length >= 8, text: "mindestens 8 Zeichen" },
  { ok: /[^A-Za-z0-9]/.test(pw || ""), text: "mindestens ein Sonderzeichen" },
];

/* Angestellte: Provision wird nur angezeigt, abgerechnet wird über die Lohnabrechnung.
   Firmierung, Gewerbe, Bank und Ausweis sind dann keine Pflicht. */
const stammdatenLuecken = (sd, angestellt = false) => {
  const f = [];
  if (angestellt) return f;
  if (!sd.firma) f.push("Firmierung");
  if (!sd.strasse || !sd.plz || !sd.ort) f.push("Anschrift");
  if (!sd.gewerbe) f.push("Gewerbeanmeldung");
  if (!sd.kontoinhaber || !sd.iban) f.push("Bankverbindung");
  if (!sd.ausweisVorne) f.push("Personalausweis Vorderseite");
  if (!sd.ausweisHinten) f.push("Personalausweis Rückseite");
  if (sd.ustBerechtigt && !sd.ustId) f.push("Umsatzsteuer-Identifikationsnummer");
  return f;
};

const VERSION = "v5.42 · 19.11.2026 · Angebot je Lieferstelle: eigener Versorger, Lieferbeginn, Laufzeit und Aufschlag (Provision je Lieferstelle, auch bei der Versorgerbestätigung), Anfrage bis zum Angebot durch den Vertrieb änderbar (Lieferstellen ergänzen oder löschen), Smartmeter-Angebot bleibt entfernt, Unterlagen nachfordern mit „Sonstiges“, Angebot ohne Grundpreis (Energiepreis inkl. Grundpreis in ct/kWh), Varianten für einzelne Lieferstellen, tatsächlicher und dem Vertrieb mitgeteilter Aufschlag, Preise mit 4 Nachkommastellen, Zählernummer kein Pflichtfeld, Service- und Beratungsauftrag nur mit den Lieferstellen der Variante, kein Eigenakquise-Bonus mehr";
/* angezeigt werden nur Versionsnummer und Datum, nicht die Beschreibung */
const VERSION_ANZEIGE = VERSION.split(" · ").slice(0, 2).join(" · ");

const USERS = [
  { id: "vp-weber", name: "Marco Weber", rolle: "Vertriebspartner", team: "Süd", satz: 25, upline: "tl-sued",
    email: "m.weber@egc-energie.de", telefon: "0681 3390211", status: "aktiv",
    bild: null, freigabe: { von: "Karsten", datum: "2025-11-04" },
    stammdaten: { ...leereStammdaten(), firma: "Weber Energievertrieb e.K.", strasse: "Talstraße 9",
      plz: "66424", ort: "Homburg", steuernummer: "040/123/45678", kontoinhaber: "Marco Weber",
      iban: "DE21 5905 0101 0012 3456 78", bic: "SAKSDE55XXX", bank: "Sparkasse Saarbrücken",
      ustBerechtigt: true, ustId: "DE812345678",
      gewerbe: { name: "gewerbeanmeldung_weber.pdf" }, ausweisVorne: { name: "ausweis_vorne.jpg" },
      ausweisHinten: { name: "ausweis_hinten.jpg" }, ustNachweis: { name: "ust_bescheinigung.pdf" } } },
  { id: "vp-klein", name: "Sandra Klein", rolle: "Vertriebspartner", team: "Süd", satz: 30, upline: "tl-sued",
    email: "s.klein@egc-energie.de", telefon: "0621 449012", status: "pruefung",
    bild: null, freigabe: null,
    stammdaten: { ...leereStammdaten(), firma: "Klein Consulting", strasse: "Rheinallee 44",
      plz: "67061", ort: "Ludwigshafen", steuernummer: "27/456/78901", kontoinhaber: "Sandra Klein",
      iban: "DE44 5455 0010 0098 7654 32", bic: "LUHSDE6AXXX", bank: "Sparkasse Vorderpfalz",
      ustBerechtigt: false,
      gewerbe: { name: "gewerbe_klein.pdf" }, ausweisVorne: { name: "perso_v.jpg" },
      ausweisHinten: { name: "perso_h.jpg" } } },
  { id: "kalk", name: "Team Kalkulation", rolle: "Kalkulation", team: "-", satz: 0, upline: null,
    email: "kalkulation@egc-energie.de", telefon: "", status: "aktiv",
    bild: null, stammdaten: leereStammdaten() },
  { id: "tl-sued", name: "Jörg Adam", rolle: "Teamleiter", team: "Süd", satz: 50, upline: "lv",
    email: "j.adam@egc-energie.de", telefon: "0681 3390200", status: "aktiv",
    bild: null, freigabe: { von: "Karsten", datum: "2025-06-12" },
    stammdaten: { ...leereStammdaten(), firma: "Adam Vertrieb GmbH", strasse: "Bahnhofstraße 2",
      plz: "66111", ort: "Saarbrücken", kontoinhaber: "Adam Vertrieb GmbH",
      iban: "DE68 5905 0101 0087 6543 21", ustBerechtigt: true, ustId: "DE998877665",
      gewerbe: { name: "handelsregister_adam.pdf" }, ausweisVorne: { name: "ausweis_v.jpg" },
      ausweisHinten: { name: "ausweis_h.jpg" }, ustNachweis: { name: "ust_adam.pdf" } } },
  { id: "lv", name: "Katrin Roth", rolle: "Leitung Vertrieb", team: "-", satz: 0, upline: null,
    email: "k.roth@egc-energie.de", telefon: "0681 3390100", status: "aktiv",
    bild: null, stammdaten: leereStammdaten() },
  { id: "vm", name: "Nadine Petry", rolle: "Vertragsmanagement", team: "-", satz: 0, upline: null,
    email: "n.petry@egc-energie.de", telefon: "", status: "aktiv",
    bild: null, stammdaten: leereStammdaten() },
  { id: "lead", name: "Timo Bauer", rolle: "Leadmanagement", team: "-", satz: 0, upline: null,
    email: "leads@egc-energie.de", telefon: "", status: "aktiv",
    bild: null, stammdaten: leereStammdaten() },
  { id: "fibu", name: "Petra Simon", rolle: "Finanzbuchhaltung", team: "-", satz: 0, upline: null,
    email: "buchhaltung@egc-energie.de", telefon: "", status: "aktiv",
    bild: null, stammdaten: leereStammdaten() },
  { id: "gf", name: "Karsten", rolle: "Geschäftsführung", team: "-", satz: 0, upline: null,
    email: "karsten@egc-energie.de", telefon: "", status: "aktiv",
    bild: null, stammdaten: leereStammdaten() },
];

/* ------------------------------------------------------------------ */
/*  Hilfsfunktionen                                                    */
/* ------------------------------------------------------------------ */
const num = (n, dec = 0) =>
  isFinite(n)
    ? Number(n).toLocaleString("de-DE", {
        minimumFractionDigits: dec,
        maximumFractionDigits: dec,
      })
    : "–";
const eur = (n) => num(n, 2) + " €";
const heute = () => new Date().toISOString().slice(0, 10);
const jetzt = () => new Date().toTimeString().slice(0, 5);

/* Farbe je Rolle, damit im Nachrichtenverlauf sofort erkennbar ist, wer schreibt */
/* Rollen, die im Nachrichtenfenster mit @ angesprochen werden können */
const ERWAEHNBAR = [
  { kuerzel: "Kalkulation", rolle: "Kalkulation" },
  { kuerzel: "Vertragsmanagement", rolle: "Vertragsmanagement" },
  { kuerzel: "Geschaeftsfuehrung", rolle: "Geschäftsführung" },
  { kuerzel: "Vertrieb", rolle: "Vertriebspartner" },
];

const erwaehnungenAus = (text) =>
  ERWAEHNBAR.filter((e) =>
    new RegExp("@" + e.kuerzel, "i").test(String(text || ""))).map((e) => e.rolle);

const ROLLENFARBE = {
  Vertriebspartner: "#2F5FE0",
  Teamleiter: "#4A9130",
  "Leitung Vertrieb": "#4A9130",
  Kalkulation: "#BE6A16",
  Vertragsmanagement: "#6B7787",
  Finanzbuchhaltung: "#7A5AA8",
  Leadmanagement: "#1F8A8A",
  Beschaffung: "#0E7C66",
  "Geschäftsführung": "#0A1626",
};
/* frühestmöglicher Lieferbeginn: 14 Tage Vorlauf */
/* Tag nach einem ISO-Datum (ohne Zeitzonenfehler) */
const tagDanach = (iso) => {
  const [j, m, t] = String(iso).split("-").map(Number);
  return new Date(Date.UTC(j, m - 1, t + 1)).toISOString().slice(0, 10);
};
/* Automatischer Lieferbeginn: Tag nach dem frühesten Vertragsende beim bisherigen Versorger */
const lieferbeginnAusVertrag = (a) => {
  const enden = (a.lieferstellen || []).filter((l) => !l.neueinzug && /^\d{4}-\d{2}-\d{2}$/.test(l.vertragsendeAlt || ""))
    .map((l) => l.vertragsendeAlt).sort();
  if (!enden.length) return null;
  const ziel = tagDanach(enden[0]);
  return { beginn: ziel < fruehesterBeginn() ? fruehesterBeginn() : ziel, ende: enden[0], verschieden: new Set(enden).size > 1 };
};

const fruehesterBeginn = () => {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d.toISOString().slice(0, 10);
};
const datum = (s) => (s ? s.split("-").reverse().join(".") : "–");
const uid = () => Math.random().toString(36).slice(2, 9);

/* ---------- Excel- und CSV-Dateien einlesen ---------- */
async function entpacken(bytes, methode, start, groesse) {
  const teil = bytes.slice(start, start + groesse);
  if (methode === 0) return teil;
  if (typeof DecompressionStream === "undefined")
    throw new Error("Dieser Browser kann keine Excel-Dateien entpacken.");
  const strom = new Blob([teil]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(strom).arrayBuffer());
}

async function zipOeffnen(bytes) {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let eocd = -1;
  for (let i = bytes.length - 22; i >= 0 && i > bytes.length - 66000; i--) {
    if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("Das ist keine gültige Excel-Datei.");
  const anzahl = dv.getUint16(eocd + 10, true);
  let off = dv.getUint32(eocd + 16, true);
  const dateien = {};
  for (let n = 0; n < anzahl; n++) {
    const methode = dv.getUint16(off + 10, true);
    const groesse = dv.getUint32(off + 20, true);
    const nameLen = dv.getUint16(off + 28, true);
    const extraLen = dv.getUint16(off + 30, true);
    const kommLen = dv.getUint16(off + 32, true);
    const lokal = dv.getUint32(off + 42, true);
    const name = new TextDecoder().decode(bytes.slice(off + 46, off + 46 + nameLen));
    dateien[name] = { methode, groesse, lokal };
    off += 46 + nameLen + extraLen + kommLen;
  }
  return { dv, bytes, dateien };
}

async function zipText(z, name) {
  const e = z.dateien[name];
  if (!e) return null;
  const nameLen = z.dv.getUint16(e.lokal + 26, true);
  const extraLen = z.dv.getUint16(e.lokal + 28, true);
  const start = e.lokal + 30 + nameLen + extraLen;
  return new TextDecoder().decode(await entpacken(z.bytes, e.methode, start, e.groesse));
}

const spalteZuIndex = (ref) => {
  const buchstaben = (ref.match(/[A-Z]+/) || ["A"])[0];
  let n = 0;
  for (let i = 0; i < buchstaben.length; i++) n = n * 26 + (buchstaben.charCodeAt(i) - 64);
  return n - 1;
};

async function xlsxLesen(datei) {
  const roh = atob(String(await dateiInhalt(datei)).split(",")[1]);
  const bytes = new Uint8Array(roh.length);
  for (let i = 0; i < roh.length; i++) bytes[i] = roh.charCodeAt(i);
  const z = await zipOeffnen(bytes);

  const parser = new DOMParser();
  let texte = [];
  const shared = await zipText(z, "xl/sharedStrings.xml");
  if (shared) {
    const doc = parser.parseFromString(shared, "application/xml");
    texte = Array.from(doc.getElementsByTagName("si")).map((si) =>
      Array.from(si.getElementsByTagName("t")).map((t) => t.textContent).join(""));
  }

  const blattName = Object.keys(z.dateien).find((n) => /^xl\/worksheets\/sheet\d+\.xml$/.test(n));
  const blatt = await zipText(z, blattName);
  if (!blatt) throw new Error("Kein Tabellenblatt gefunden.");
  const doc = parser.parseFromString(blatt, "application/xml");

  return Array.from(doc.getElementsByTagName("row")).map((row) => {
    const zeile = [];
    Array.from(row.getElementsByTagName("c")).forEach((c) => {
      const i = spalteZuIndex(c.getAttribute("r") || "A1");
      const typ = c.getAttribute("t");
      let wert = "";
      if (typ === "s") {
        const v = c.getElementsByTagName("v")[0];
        wert = v ? texte[parseInt(v.textContent)] || "" : "";
      } else if (typ === "inlineStr") {
        wert = Array.from(c.getElementsByTagName("t")).map((t) => t.textContent).join("");
      } else {
        const v = c.getElementsByTagName("v")[0];
        wert = v ? v.textContent : "";
      }
      zeile[i] = String(wert).trim();
    });
    return zeile;
  }).filter((z2) => z2.some((w) => w));
}

async function csvLesen(datei) {
  /* UTF-8, sonst Windows-1252 (so speichert Excel unter Windows oft „CSV“); Byte-Order-Mark entfernen */
  const bin = atob(String(await dateiInhalt(datei)).split(",")[1] || "");
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  let roh;
  try { roh = new TextDecoder("utf-8", { fatal: true }).decode(bytes); }
  catch (e) { roh = new TextDecoder("windows-1252").decode(bytes); }
  roh = roh.replace(/^\ufeff/, "");
  const trenner = (roh.split("\n")[0].match(/;/g) || []).length >=
                  (roh.split("\n")[0].match(/,/g) || []).length ? ";" : ",";
  return roh.split(/\r?\n/).filter((z) => z.trim()).map((z) => {
    const felder = [];
    let feld = "", inAnf = false;
    for (let i = 0; i < z.length; i++) {
      const c = z[i];
      if (c === '"') { if (inAnf && z[i + 1] === '"') { feld += '"'; i++; } else inAnf = !inAnf; }
      else if (c === trenner && !inAnf) { felder.push(feld.trim()); feld = ""; }
      else feld += c;
    }
    felder.push(feld.trim());
    return felder;
  });
}

/* Spalten anhand der Kopfzeile zuordnen, sonst nach Position */
function spaltenZuordnen(kopf) {
  const k = kopf.map((h) => String(h || "").replace(/^\ufeff/, "").trim().toLowerCase());
  /* Erst genaue Übereinstimmung, dann Teilwort. So landet „Ort“ nicht in „Standort“,
     und „Name“ des Ansprechpartners nicht in der Firma. */
  const finde = (...begriffe) => {
    const genau = k.findIndex((h) => begriffe.includes(h));
    if (genau >= 0) return genau;
    const sucheMail = begriffe.some((b) => b.includes("mail"));
    return k.findIndex((h) => (sucheMail || !h.includes("mail")) && begriffe.some((b) => b.length > 3 && h.includes(b)));
  };
  const strasse = finde("straße", "strasse", "str.", "street");
  const adresse = finde("adresse", "address", "anschrift");
  return {
    firma: finde("firma", "unternehmen", "firmenname", "company", "name", "title"),
    ansprechpartner: finde("ansprechpartner", "ansprechpartnerin", "ansprech", "kontaktperson", "contact", "inhaber", "geschäftsführer", "geschaeftsfuehrer"),
    position: finde("position", "funktion", "rolle"),
    telefon: finde("telefon", "telefonnummer", "tel", "tel.", "phone", "mobil"),
    email: finde("e-mail", "email", "mail"),
    adresse: adresse >= 0 ? adresse : strasse,
    strasse,
    plz: finde("plz", "postleitzahl", "zip"),
    ort: finde("ort", "stadt", "city", "gemeinde"),
    branche: finde("branche", "industry", "kategorie", "sparte"),
    website: finde("website", "webseite", "url", "homepage", "internet"),
  };
}

/* Gleiche Firma erkennen: Rechtsform, Satzzeichen und Groß-/Kleinschreibung zählen nicht */
const firmaSchluessel = (firma) => String(firma || "").toLowerCase()
  .replace(/\b(gmbh|mbh|ag|kg|ohg|gbr|ug|e\.?\s?k\.?|e\.?\s?v\.?|co|und|&|haftungsbeschränkt)\b/g, " ")
  .replace(/[^a-zäöüß0-9]/g, "");

/* Erzeugt eine echte Excel-Datei (xlsx). Der Inhalt wird als ZIP ohne
   Komprimierung zusammengesetzt, damit keine Fremdbibliothek nötig ist. */
function crc32(text) {
  let c, tabelle = crc32.tabelle;
  if (!tabelle) {
    tabelle = crc32.tabelle = [];
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      tabelle[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (let i = 0; i < text.length; i++)
    crc = (crc >>> 8) ^ tabelle[(crc ^ (text.charCodeAt(i) & 0xff)) & 0xff];
  return (crc ^ 0xffffffff) >>> 0;
}

/* Text in eine Bytefolge umwandeln, damit Umlaute korrekt in der Datei landen */
function utf8Binaer(text) {
  const bytes = new TextEncoder().encode(text);
  let raus = "";
  for (let i = 0; i < bytes.length; i++) raus += String.fromCharCode(bytes[i]);
  return raus;
}

function zipBauen(dateien) {
  const wort = (n) => String.fromCharCode(n & 0xff, (n >>> 8) & 0xff);
  const lang = (n) => wort(n & 0xffff) + wort((n >>> 16) & 0xffff);
  let inhalt = "";
  let verzeichnis = "";
  dateien.forEach((d) => {
    const daten = utf8Binaer(d.inhalt);
    const pruef = crc32(daten);
    const kopf = "\x50\x4b\x03\x04" + wort(20) + wort(0) + wort(0) + wort(0) + wort(0) +
      lang(pruef) + lang(daten.length) + lang(daten.length) + wort(d.name.length) + wort(0);
    verzeichnis += "\x50\x4b\x01\x02" + wort(20) + wort(20) + wort(0) + wort(0) + wort(0) + wort(0) +
      lang(pruef) + lang(daten.length) + lang(daten.length) + wort(d.name.length) +
      wort(0) + wort(0) + wort(0) + wort(0) + lang(0) + lang(inhalt.length) + d.name;
    inhalt += kopf + d.name + daten;
  });
  const ende = "\x50\x4b\x05\x06" + wort(0) + wort(0) + wort(dateien.length) + wort(dateien.length) +
    lang(verzeichnis.length) + lang(inhalt.length) + wort(0);
  return inhalt + verzeichnis + ende;
}

function erzeugeXlsx(dateiname, blatt, zeilen) {
  const esc = (t) => String(t == null ? "" : t)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const spalte = (i) => {
    let n = i + 1, s2 = "";
    while (n > 0) { const r = (n - 1) % 26; s2 = String.fromCharCode(65 + r) + s2; n = Math.floor((n - 1) / 26); }
    return s2;
  };
  const reihen = zeilen.map((z, i) => {
    const zellen = z.map((w, j) => {
      const pos = spalte(j) + (i + 1);
      if (typeof w === "number" && isFinite(w))
        return '<c r="' + pos + '"><v>' + w + "</v></c>";
      return '<c r="' + pos + '" t="inlineStr"><is><t xml:space="preserve">' + esc(w) + "</t></is></c>";
    }).join("");
    return '<row r="' + (i + 1) + '">' + zellen + "</row>";
  }).join("");

  const dateien = [
    { name: "[Content_Types].xml", inhalt:
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
      '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>' },
    { name: "_rels/.rels", inhalt:
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>' },
    { name: "xl/workbook.xml", inhalt:
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
      '<sheets><sheet name="' + esc(blatt).slice(0, 28) + '" sheetId="1" r:id="rId1"/></sheets></workbook>' },
    { name: "xl/_rels/workbook.xml.rels", inhalt:
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>' },
    { name: "xl/worksheets/sheet1.xml", inhalt:
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      "<sheetData>" + reihen + "</sheetData></worksheet>" },
  ];

  const roh = zipBauen(dateien);
  let b64 = "";
  try { b64 = btoa(roh); } catch (e) { return null; }
  return {
    name: dateiname, groesse: roh.length,
    typ: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    url: "data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64," + b64,
  };
}

/* Logo als JPEG für die Einbettung in PDF-Dokumente */
const LOGO_PDF = "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";
const LOGO_PDF_BREITE = 420;
const LOGO_PDF_HOEHE = 196;

/* Erzeugt ein mehrseitiges PDF im EGC-Design aus Textzeilen.
   Eine Zeile kann auch ein Bild sein: { bild: "data:image/jpeg;base64,…", breite, hoehe }
   (nur JPEG, z. B. eine Unterschrift). Es wird 40 Punkt hoch eingesetzt. */
function erzeugePdf(dateiname, titel, zeilen) {
  /* Zeichen auf die Schriftbelegung des Dokuments abbilden.
     Das Eurozeichen liegt dort auf Position 128. */
  const sauber = (t) =>
    String(t)
      .replace(/\\/g, "/")
      .replace(/€/g, String.fromCharCode(128))
      .replace(/[„""]/g, '"')
      .replace(/[–—]/g, "-")
      .replace(/[‚'']/g, "'")
      .replace(/…/g, "...")
      .split("")
      .filter((z) => z.charCodeAt(0) < 256)
      .join("");
  /* Klammern im PDF-Text maskieren statt löschen */
  const pdfText = (t) => sauber(t).replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  const umbrechen = (t, breite) => {
    const worte = sauber(t).split(" ");
    const raus = [];
    let zeile = "";
    worte.forEach((w) => {
      if ((zeile + " " + w).trim().length > breite) { raus.push(zeile); zeile = w; }
      else zeile = (zeile + " " + w).trim();
    });
    raus.push(zeile);
    return raus;
  };

  const alle = [];
  const bilder = [];
  zeilen.forEach((z) => {
    if (z && typeof z === "object" && z.bild) {
      const roh = atob(String(z.bild).split(",")[1] || "");
      bilder.push({ roh, breite: z.breite || 600, hoehe: z.hoehe || 200 });
      /* ein Bild belegt drei Zeilen Platz */
      alle.push({ bildNr: bilder.length }, { text: "" }, { text: "" });
      return;
    }
    const text = typeof z === "string" ? z : z.text;
    const gross = typeof z === "object" && z.gross;
    umbrechen(text, gross ? 58 : 88).forEach((t, i) => alle.push({ text: t, gross: gross && i === 0 }));
  });

  const proSeite = 38;
  const seiten = [];
  for (let i = 0; i < alle.length; i += proSeite) seiten.push(alle.slice(i, i + proSeite));
  if (!seiten.length) seiten.push([]);

  /* Farben: Navy #0A1626, Grün #6CB43B, Grau #6B7787 */
  const navy = "0.039 0.086 0.149";
  const gruen = "0.424 0.706 0.231";
  const grau = "0.42 0.467 0.529";

  const inhalte = seiten.map((zs, nr) => {
    let c = "";
    /* Kopfbereich in Navy */
    c += "q " + navy + " rg 0 752 595 90 re f Q\n";
    /* Logo, Höhe 26 Punkt */
    const h = 26, b = (LOGO_PDF_BREITE / LOGO_PDF_HOEHE) * h;
    c += "q " + b.toFixed(2) + " 0 0 " + h + " 48 796 cm /Im0 Do Q\n";
    /* Titel in Weiß */
    c += "BT 1 1 1 rg /F1 15 Tf 48 770 Td (" + pdfText(titel) + ") Tj ET\n";
    /* Grüne Linie unter dem Kopf */
    c += "q " + gruen + " rg 0 748 595 4 re f Q\n";

    let y = 712;
    zs.forEach((z) => {
      if (z.bildNr) {
        const bb = bilder[z.bildNr - 1];
        const h = 40, b = Math.min(200, (bb.breite / bb.hoehe) * h);
        c += "q " + b.toFixed(2) + " 0 0 " + h + " 48 " + (y - 28) + " cm /Im" + z.bildNr + " Do Q\n";
        y -= 15;
        return;
      }
      if (z.gross) {
        y -= 12;
        c += "q " + gruen + " rg 48 " + (y + 15) + " 52 2 re f Q\n";
        c += "BT 0.086 0.129 0.173 rg /F1 12.5 Tf 48 " + y + " Td (" + pdfText(z.text) + ") Tj ET\n";
        y -= 6;
      } else {
        c += "BT 0.086 0.129 0.173 rg /F1 9.5 Tf 48 " + y + " Td (" + pdfText(z.text) + ") Tj ET\n";
      }
      y -= 15;
    });

    /* Fußzeile */
    c += "q 0.85 0.87 0.89 rg 48 52 499 0.8 re f Q\n";
    c += "BT " + grau + " rg /F1 7 Tf 48 38 Td (" + pdfText(firmenzeile()) + ") Tj ET\n";
    c += "BT " + grau + " rg /F1 8 Tf 470 38 Td (Seite " + (nr + 1) + " von " + seiten.length + ") Tj ET\n";
    return c;
  });

  /* Objekte: 1 Katalog, 2 Seitenbaum, 3 Schrift, 4 Bild, danach je Seite zwei */
  const bildRoh = atob(LOGO_PDF);
  const objekte = [
    "<</Type/Catalog/Pages 2 0 R>>",
    null,   // wird unten gesetzt, sobald die Seitenkennungen feststehen
    "<</Type/Font/Subtype/Type1/BaseFont/Helvetica/Encoding/WinAnsiEncoding>>",
    "<</Type/XObject/Subtype/Image/Width " + LOGO_PDF_BREITE + "/Height " + LOGO_PDF_HOEHE +
      "/ColorSpace/DeviceRGB/BitsPerComponent 8/Filter/DCTDecode/Length " + bildRoh.length +
      ">>\nstream\n" + bildRoh + "\nendstream",
  ];
  /* weitere Bilder liegen hinter den Seiten */
  const erstesBild = 5 + seiten.length * 2;
  const bildRefs = bilder.map((_, i) => "/Im" + (i + 1) + " " + (erstesBild + i) + " 0 R").join("");
  const kids = seiten.map((_, i) => 5 + i * 2 + " 0 R").join(" ");
  objekte[1] = "<</Type/Pages/Kids[" + kids + "]/Count " + seiten.length + ">>";

  inhalte.forEach((c, i) => {
    objekte.push("<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Contents " + (6 + i * 2) +
      " 0 R/Resources<</Font<</F1 3 0 R>>/XObject<</Im0 4 0 R" + bildRefs + ">>>>>>");
    objekte.push("<</Length " + c.length + ">>\nstream\n" + c + "\nendstream");
  });
  bilder.forEach((bb) => objekte.push(
    "<</Type/XObject/Subtype/Image/Width " + bb.breite + "/Height " + bb.hoehe +
    "/ColorSpace/DeviceRGB/BitsPerComponent 8/Filter/DCTDecode/Length " + bb.roh.length +
    ">>\nstream\n" + bb.roh + "\nendstream"));

  let pdf = "%PDF-1.4\n";
  const stellen = [];
  objekte.forEach((o, i) => {
    stellen.push(pdf.length);
    pdf += i + 1 + " 0 obj\n" + o + "\nendobj\n";
  });
  const xref = pdf.length;
  pdf += "xref\n0 " + (objekte.length + 1) + "\n0000000000 65535 f \n";
  stellen.forEach((st) => { pdf += String(st).padStart(10, "0") + " 00000 n \n"; });
  pdf += "trailer\n<</Size " + (objekte.length + 1) + "/Root 1 0 R>>\nstartxref\n" + xref + "\n%%EOF";

  let b64 = "";
  try { b64 = btoa(pdf); } catch (e) { return null; }
  return { name: dateiname, typ: "application/pdf", groesse: pdf.length,
           url: "data:application/pdf;base64," + b64 };
}

/* Erzeugt ein kleines, gültiges PDF als Datenlink – nur für die Demodateien */
function demoPdf(name, zeilen) {
  const text = (zeilen || ["EGC Energie", name])
    .map((z, i) => "BT /F1 " + (i ? 12 : 18) + " Tf 60 " + (760 - i * 26) + " Td (" +
      String(z).replace(/[()\\]/g, "") + ") Tj ET")
    .join("\n");
  const objekte = [
    "<</Type/Catalog/Pages 2 0 R>>",
    "<</Type/Pages/Kids[3 0 R]/Count 1>>",
    "<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>",
    "<</Length " + text.length + ">>\nstream\n" + text + "\nendstream",
    "<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>",
  ];
  let pdf = "%PDF-1.4\n";
  const stellen = [];
  objekte.forEach((o, i) => {
    stellen.push(pdf.length);
    pdf += i + 1 + " 0 obj\n" + o + "\nendobj\n";
  });
  const xref = pdf.length;
  pdf += "xref\n0 " + (objekte.length + 1) + "\n0000000000 65535 f \n";
  stellen.forEach((st) => { pdf += String(st).padStart(10, "0") + " 00000 n \n"; });
  pdf += "trailer\n<</Size " + (objekte.length + 1) + "/Root 1 0 R>>\nstartxref\n" + xref + "\n%%EOF";
  let b64 = "";
  try { b64 = btoa(pdf); } catch (e) { return null; }
  return { name, typ: "application/pdf", groesse: pdf.length, url: "data:application/pdf;base64," + b64 };
}

const leereLieferstelle = (medium) => ({
  id: uid(),
  medium,
  bezeichnung: "",
  strasse: "",
  plz: "",
  ort: "",
  versorger: "",
  zaehlernummer: "",
  maloId: "",
  meloId: "", /* Messlokation, Pflicht wenn ein Smartmeter gewünscht ist */
  verbrauch: "",
  zaehlerart: "SLP",
  abrechnung: null,
  lastgang: null,
  preis: "",
  energiepreis: "",
  adresseVon: "kunde",
  kundennummer: "",
  versorgerVon: "manuell",
  vertragsendeAlt: "", /* Vertrag beim bisherigen Versorger läuft bis (ISO-Datum) */
  kuendigungsfrist: "",
  abrechnungJahr: "", /* Jahr der hochgeladenen Abrechnung, für den Umlagen-Ausgleich im Vergleich */
  neueinzug: false,
  gewerbeanmeldung: null,
  pachtvertrag: null,
  zaehlerfotoVorhanden: false,
  zaehlerfoto: null,
});

const leereAnfrage = (user) => ({
  id: "A-" + new Date().getFullYear() + "-" + Math.floor(1000 + Math.random() * 8999),
  angelegt: heute(),
  partnerId: user.id,
  partnerName: user.name,
  team: user.team,
  status: "entwurf",
  kunde: {
    firma: "", strasse: "", plz: "", ort: "", branche: "",
    ansprechpartner: "", email: "", telefon: "",
  },
  bemerkungVertrieb: "",
  akquiseArt: "eigen",
  herkunft: "Eigenes Netzwerk",
  herkunftDetail: "",
  tippgeberId: null,
  vollmachtAnhaengen: true,
  lieferstellenListe: false,
  lieferstellenDatei: null,
  dienstleistungsvertrag: false,
  zielpreis: "",
  zielpreisNotiz: "",
  lieferstellen: [leereLieferstelle("strom")],
  laufzeit: 24,
  laufzeitArt: "monate",
  wunschLieferbeginn: "",
  wunschLieferende: "",
  produkt: "Festpreis",
  produktGas: "Festpreis",
  beratungHinweis: "",
  ruecksprache: null,
  aufschlag: 0.5,
  kalkulation: null,
  fehlend: [],
  fehlendText: "",
  vertragsStatus: null,
  nachrichten: [],
  annahme: null,
  einreichung: false,
  bestaetigung: null,
  klaerung: null,
  provisionErhalten: null,
  absage: null,
  verlaengerungVon: null,
  ausgezahlt: {},
  verlauf: [],
});

const verbrauchGesamt = (a) =>
  a.lieferstellen.reduce((s, l) => s + (parseFloat(l.verbrauch) || 0), 0);

/* Zahl aus Text lesen, deutsche und englische Schreibweise */
function zahlLesen(roh) {
  let t = String(roh === undefined || roh === null ? "" : roh).trim().replace(/\s/g, "");
  if (!t) return NaN;
  if (t.includes(",") && t.includes(".")) t = t.replace(/\./g, "").replace(",", ".");
  else if (t.includes(",")) t = t.replace(",", ".");
  return parseFloat(t);
}

const istDatum = (t) => /\d{1,4}[.\-/]\d{1,2}[.\-/]\d{1,4}/.test(String(t || ""));

/* ---------- Versorgerabrechnung auslesen ----------
   Sucht im Text einer Abrechnung (PDF-Text oder Texterkennung eines Fotos) nach Marktlokation,
   Zählernummer, Jahresverbrauch, Kundennummer und Versorger. Das Ergebnis ist nur ein Vorschlag:
   Der Vertriebspartner muss die Werte mit der Abrechnung vergleichen und bestätigen. */
const ABRECHNUNG_FELDER = [
  { k: "versorger", label: "Aktueller Versorger" },
  { k: "kundennummer", label: "Kundennummer beim Versorger" },
  { k: "zaehlernummer", label: "Zählernummer" },
  { k: "maloId", label: "Marktlokations-ID (MaLo)" },
  { k: "verbrauch", label: "Jahresverbrauch in kWh" },
  { k: "vertragsendeAlt", label: "Vertrag läuft bis" },
  { k: "kuendigungsfrist", label: "Kündigungsfrist" },
  { k: "abrechnungJahr", label: "Abrechnung aus dem Jahr" },
];
function abrechnungAuswerten(roh, versorgerNamen = []) {
  const text = String(roh || "").replace(/\u00a0/g, " ").replace(/[ \t]+/g, " ");
  const flach = text.replace(/\s+/g, " ");
  const w = {};
  /* Marktlokation: 11 Ziffern nach der Beschriftung (auch mit Leerzeichen geschrieben) */
  const malo = flach.match(/(?:Marktlokation(?:s[- ]?(?:ID|Identifikationsnummer|nummer))?|MaLo(?:[- ]?ID)?)\s*[:.]?\s*((?:\d ?){11})(?!\d)/i);
  if (malo) w.maloId = malo[1].replace(/\s/g, "");
  /* Zählernummer: Ziffern und Buchstaben nach „Zählernummer“, nicht „Zählerstand“ */
  const zn = flach.match(/Z(?:ä|ae)hler(?:-?nummer|-?nr\.?|nummer)\s*[:.]?\s*([0-9A-Z][0-9A-Z\-]{3,23}(?: [0-9A-Z]{1,8}){0,3})/i);
  if (zn) {
    const kandidat = zn[1].split(" ").filter((t, i) => i === 0 || /\d/.test(t)).join(" ").trim();
    if (/\d{3}/.test(kandidat)) w.zaehlernummer = kandidat;
  }
  /* Kundennummer oder Vertragskonto */
  const kn = flach.match(/(?:Kunden-?(?:nummer|nr\.?)|Vertragskonto(?:nummer)?)\s*[:.]?\s*([0-9A-Z][0-9A-Z\-\/]{2,20}(?: \d{1,8}){0,4})(?![0-9A-Za-z])/i);
  if (kn && /\d{3}/.test(kn[1])) w.kundennummer = kn[1].trim();
  /* Jahresverbrauch: größter kWh-Wert mit Verbrauchsbeschriftung in der Nähe */
  const werte = [];
  const re = /(\d{1,3}(?:[.\s]\d{3})+|\d+)(?:,\d+)?\s*kWh/gi;
  let m;
  while ((m = re.exec(flach))) {
    const davor = flach.slice(Math.max(0, m.index - 90), m.index);
    if (/verbrauch|prognose|abrechnungsmenge|menge/i.test(davor) && !/ct\s*\/|€\s*\/|preis/i.test(flach.slice(m.index, m.index + m[0].length + 4)))
      werte.push(Math.round(zahlLesen(m[1].replace(/[.\s]/g, ""))));
  }
  const gross = werte.filter((x) => x > 0 && x < 1e9);
  if (gross.length) w.verbrauch = String(Math.max(...gross));
  /* Vertragsende: Versorger schreiben es sehr unterschiedlich. Gesucht wird ein Datum nach einer
     Laufzeit-Beschriftung, nicht nach Preisgarantie oder Preisbindung. */
  const iso = (t, m, j) => (j.length === 2 ? "20" + j : j) + "-" + m.padStart(2, "0") + "-" + t.padStart(2, "0");
  const DATUM = "(\\d{1,2})\\.(\\d{1,2})\\.(\\d{2,4})";
  const ENDE_WORT = "Vertragsende|Vertragsablauf|Vertragslaufzeit|Vertragsdauer|Vertragsbindung|Laufzeitende|Erstlaufzeit"
    + "|Mindest(?:vertrags)?laufzeit|Festlaufzeit|Grundlaufzeit|Laufzeit|Lieferende|Belieferung|Liefervertrag|Vertrag endet"
    + "|Vertrag läuft|Ende der (?:Vertrags)?laufzeit|gebunden|Ablauf|(?:nächst(?:möglich)?er |frühestmöglicher )?Kündigungstermin"
    + "|(?:frühestens |erstmals )?kündbar|Kündigung (?:ist )?(?:frühestens )?möglich";
  const endeRe = new RegExp("(?:" + ENDE_WORT + ")(?:(?!Preisgarantie|Preisbindung|Preisfixierung|Preisgarantiezeit)(?:[^.;]|\\.(?=\\d))){0,60}?"
    + "(?:bis(?: zum| einschließlich| einschl\\.)?|zum|am|endet am|:)\\s*" + DATUM, "i");
  /* Datum direkt hinter der Beschriftung („Lieferende 31.03.2027“), bei Zeiträumen das Enddatum */
  const direktRe = new RegExp("(?:" + ENDE_WORT + ")\\s*[:\\-]?\\s*(?:vom\\s*)?" + DATUM + "(?:\\s*(?:-|–|bis)\\s*" + DATUM + ")?", "i");
  const ende = flach.match(endeRe);
  const direkt = flach.match(direktRe);
  if (direkt && (!ende || direkt.index <= ende.index))
    w.vertragsendeAlt = direkt[4] ? iso(direkt[4], direkt[5], direkt[6]) : iso(direkt[1], direkt[2], direkt[3]);
  else if (ende) w.vertragsendeAlt = iso(ende[1], ende[2], ende[3]);
  else {
    /* Laufzeit in Monaten ab Vertrags- oder Lieferbeginn */
    const monate = flach.match(/(?:Vertrags)?(?:laufzeit|dauer)|Erstlaufzeit|Mindestlaufzeit/i)
      && flach.match(/(?:Vertragslaufzeit|Laufzeit|Erstlaufzeit|Mindest(?:vertrags)?laufzeit|Vertragsdauer)\s*[:.]?\s*(?:von\s*|beträgt\s*)?(\d{1,2})\s*Monat/i);
    const beginn = flach.match(new RegExp("(?:Vertragsbeginn|Lieferbeginn|Beginn der Belieferung|Belieferung seit|Lieferung ab|beliefert seit)\\s*(?:am|ab|:)?\\s*" + DATUM, "i"));
    const ab = flach.match(new RegExp("(\\d{1,2})\\s*Monat(?:e|en)?\\s*(?:ab|beginnend am|seit)\\s*(?:dem\\s*)?" + DATUM, "i"));
    const [anzahl, t0, m0, j0] = ab ? [ab[1], ab[2], ab[3], ab[4]] : monate && beginn ? [monate[1], beginn[1], beginn[2], beginn[3]] : [];
    if (anzahl) {
      const j = Number(j0.length === 2 ? "20" + j0 : j0);
      const d = new Date(Date.UTC(j, Number(m0) - 1 + Number(anzahl), Number(t0) - 1));
      w.vertragsendeAlt = d.toISOString().slice(0, 10);
    }
  }
  /* Kündigungsfrist in ihren üblichen Formulierungen, Zahlwörter werden zu Ziffern */
  const ZAHL = { ein: 1, einem: 1, einen: 1, einer: 1, eines: 1, zwei: 2, drei: 3, vier: 4, fünf: 5, sechs: 6, acht: 8, zwölf: 12 };
  const frist = flach.match(/(?:K(?:ü|ue|u)ndigungsfrist|Einhaltung einer Frist von|mit einer Frist von|Frist von|K(?:ü|ue|u)ndigung[^.;]{0,50}?spätestens|Frist)\s*[:.]?\s*(?:von\s*|beträgt\s*|jeweils\s*)?(\d{1,2}|ein(?:em|en|er|es)?|zwei|drei|vier|fünf|sechs|acht|zwölf)\s*(Monat(?:e|en)?|Woche(?:n)?|Tag(?:e|en)?)((?:\s*(?:zum|vor(?: dem| Ablauf(?: der)?)?)\s*(?:Vertragsende|Monatsende|Ende der (?:Vertrags|Erst)?laufzeit|Laufzeitende|Ablauf(?: der (?:Vertrags)?laufzeit)?|Lieferende|Vertragsablauf|jeweiligen Vertragsende))?)/i);
  if (frist) {
    const n = /^\d+$/.test(frist[1]) ? Number(frist[1]) : ZAHL[frist[1].toLowerCase()] || frist[1];
    let einheit = frist[2].toLowerCase().startsWith("monat") ? (n === 1 ? "Monat" : "Monate")
      : frist[2].toLowerCase().startsWith("woche") ? (n === 1 ? "Woche" : "Wochen") : (n === 1 ? "Tag" : "Tage");
    w.kuendigungsfrist = (n + " " + einheit + (frist[3] ? " " + frist[3].trim() : "")).replace(/\s+/g, " ");
  }
  /* Jahr der Abrechnung: Ende des Abrechnungszeitraums (bestimmt die darin enthaltenen Umlagen) */
  const zr = flach.match(/(?:Abrechnungszeitraum|Abrechnungsperiode|Rechnungszeitraum|Verbrauchszeitraum|Abrechnung für den Zeitraum)\s*[:.]?\s*(?:vom\s*)?\d{1,2}\.\d{1,2}\.(\d{2,4})\s*(?:-|–|bis)\s*\d{1,2}\.\d{1,2}\.(\d{2,4})/i);
  if (zr) { const j = zr[2].length === 2 ? "20" + zr[2] : zr[2]; if (Number(j) >= 2020 && Number(j) <= 2040) w.abrechnungJahr = j; }
  /* Automatische Verlängerung gehört zur Frist dazu */
  const verl = flach.match(/verlängert sich[^.;]{0,40}?um (?:jeweils )?(?:weitere )?(\d{1,2}|ein(?:en)?|zwölf) (Monat(?:e)?|Jahr(?:e)?)/i)
    || flach.match(/verlängert sich[^.;]{0,40}?(auf unbestimmte Zeit)/i);
  if (verl) {
    const txt = verl[2] ? "verlängert sich um " + (/^\d+$/.test(verl[1]) ? verl[1] : ZAHL[verl[1].toLowerCase()] || verl[1]) + " " + verl[2] : "verlängert sich auf unbestimmte Zeit";
    w.kuendigungsfrist = w.kuendigungsfrist ? w.kuendigungsfrist + "; " + txt : txt;
  }
  /* Versorger: bekannter Name aus der Versorgerliste, sonst „Stadtwerke …“ */
  const klein = flach.toLowerCase();
  const bekannt = versorgerNamen.filter(Boolean)
    .map((n) => ({ n, i: klein.indexOf(n.toLowerCase()) })).filter((x) => x.i >= 0).sort((x, y) => x.i - y.i)[0];
  if (bekannt) w.versorger = bekannt.n;
  else {
    const sw = flach.match(/Stadtwerke [A-ZÄÖÜ][\wäöüß\-]+(?: (?:GmbH|AG))?/);
    if (sw) w.versorger = sw[0];
  }
  return w;
}

/* Fotos: Texterkennung im Gerät ist noch nicht eingebaut (Bibliothek fehlt). Bis dahin klarer Hinweis. */
async function fotoText() {
  throw new Error("Fotos kann das Portal noch nicht auslesen. Bitte die Werte von Hand eintragen oder die Abrechnung als PDF hochladen; das Foto bleibt als Unterlage gespeichert.");
}

/* Text aller PDF-Seiten einer Datei (über die im Portal liegende PDF-Bibliothek) */
async function pdfText(datei) {
  const pdfjs = await ladePdfjs();
  const url = datei.url || (await dateiInhalt(datei));
  const roh = atob(String(url).split(",")[1] || "");
  const bytes = new Uint8Array(roh.length);
  for (let i = 0; i < roh.length; i++) bytes[i] = roh.charCodeAt(i);
  const pdf = await pdfjs.getDocument({ data: bytes }).promise;
  let t = "";
  for (let s = 1; s <= Math.min(pdf.numPages, 8); s++) {
    const inhalt = await (await pdf.getPage(s)).getTextContent();
    t += inhalt.items.map((x) => x.str + (x.hasEOL ? "\n" : " ")).join("") + "\n";
  }
  return t;
}

/* Lastgang auswerten: Menge, Spitzenlast, Benutzungsstunden, Monatsverlauf */
async function lastgangAuswerten(datei) {
  const zeilen = /\.xlsx?$/i.test(datei.name) ? await xlsxLesen(datei) : await csvLesen(datei);
  if (!zeilen.length) throw new Error("Die Datei ist leer.");

  /* Spalte mit den meisten Zahlen suchen */
  const proben = zeilen.slice(0, 200);
  const breite = Math.max(...proben.map((z) => z.length));
  let beste = -1, meiste = 0;
  for (let i = 0; i < breite; i++) {
    const gefuellt = proben.filter((z) => z[i] !== undefined && z[i] !== "");
    /* Spalten mit Datumsangaben scheiden aus, auch Excel-Seriennummern */
    if (gefuellt.filter((z) => istDatum(z[i]) || istSeriennummer(z[i])).length > gefuellt.length / 2) continue;
    const treffer = gefuellt.filter((z) => !isNaN(zahlLesen(z[i]))).length;
    if (treffer > meiste) { meiste = treffer; beste = i; }
  }
  if (beste < 0) throw new Error("Keine Zahlenspalte gefunden.");

  const werte = [];
  const zeitpunkte = [];
  zeilen.forEach((z) => {
    const w = zahlLesen(z[beste]);
    if (isNaN(w)) return;
    werte.push(w);
    zeitpunkte.push(z.find((f) => istDatum(f)) || z.find((f) => istSeriennummer(f)) || null);
  });
  if (werte.length < 10) throw new Error("Zu wenige Messwerte gefunden.");

  const summe = werte.reduce((x, y) => x + y, 0);
  const max = Math.max(...werte);
  const schnitt = summe / werte.length;
  /* Viertelstundenwerte in kWh ergeben Leistung in kW mal vier */
  const proStunde = werte.length > 30000 ? 4 : werte.length > 15000 ? 2 : 1;
  const spitze = max * proStunde;
  const benutzung = spitze > 0 ? summe / spitze : 0;

  /* Monatsprofil, sonst gleichmäßige Abschnitte */
  const monate = Array(12).fill(0);
  let mitDatum = 0;
  werte.forEach((w, i) => {
    const t = zeitLesen(zeitpunkte[i]);
    if (t) { monate[t.getMonth()] += w; mitDatum++; }
  });
  const profil = mitDatum > werte.length / 2 ? monate : (() => {
    const teile = Array(12).fill(0);
    werte.forEach((w, i) => { teile[Math.min(11, Math.floor((i / werte.length) * 12))] += w; });
    return teile;
  })();

  return { anzahl: werte.length, summe, max, schnitt, spitze, benutzung, profil,
           datiert: mitDatum > werte.length / 2, werte, zeitpunkte, proStunde,
           verlaeufe: lastgangVerlaeufe(werte, zeitpunkte, proStunde) };
}

function Lastganganalyse({ datei }) {
  const [stand, setStand] = useState(null);
  const [fehler, setFehler] = useState("");
  const [laedt, setLaedt] = useState(false);

  const starten = async () => {
    setLaedt(true); setFehler("");
    try { setStand(await lastgangAuswerten(datei)); }
    catch (e) { setFehler(e.message || "Auswertung nicht möglich."); }
    setLaedt(false);
  };

  if (!stand)
    return (
      <div className="mt-2">
        <button onClick={starten} disabled={laedt} className="text-xs px-2 py-1 rounded"
          style={{ border: "1px solid " + C.line, color: C.strom }}>
          {laedt ? "wird ausgewertet …" : "Lastgang auswerten"}
        </button>
        {fehler && <p className="text-xs mt-1" style={{ color: C.warn }}>{fehler}</p>}
      </div>
    );

  const maxProfil = Math.max(...stand.profil, 1);
  const monatsnamen = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
  const bilder = stand.verlaeufe ? (stand.bilder || (stand.bilder = lastgangGrafiken(stand))) : null;

  return (
    <div className="mt-3 p-3 rounded" style={{ background: "#F6F8FA", border: "1px solid " + C.line }}>
      <div className="flex items-baseline justify-between mb-3">
        <span className="text-sm">Auswertung des Lastgangs</span>
        <button className="text-xs" style={{ color: C.muted }} onClick={() => setStand(null)}>schließen</button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
        {[["Jahresmenge", num(stand.summe) + " kWh"],
          ["Spitzenlast", num(stand.spitze, 1) + " kW"],
          ["Benutzungsstunden", num(stand.benutzung, 0) + " h"],
          ["Messwerte", num(stand.anzahl)]].map(([k, v]) => (
          <div key={k}>
            <div className="text-xs mb-1" style={{ color: C.muted }}>{k}</div>
            <div className="text-sm" style={{ fontVariantNumeric: "tabular-nums" }}>{v}</div>
          </div>
        ))}
      </div>
      <div className="flex items-end gap-1" style={{ height: 70 }}>
        {stand.profil.map((w, i) => (
          <div key={i} className="flex-1 rounded-t" title={num(w) + " kWh"}
               style={{ height: Math.max(3, (w / maxProfil) * 70) + "px", background: C.strom }} />
        ))}
      </div>
      <div className="flex justify-between text-xs mt-1" style={{ color: C.muted }}>
        {monatsnamen.map((m, i) => <span key={i}>{m}</span>)}
      </div>
      {bilder && (
        <div className="space-y-3 mt-4">
          {[bilder.jahr, bilder.woche, bilder.werktag].map((b, i) => (
            <img key={i} src={b} alt="" className="w-full rounded" style={{ border: "1px solid " + C.line }} />
          ))}
        </div>
      )}
      <p className="text-xs mt-2" style={{ color: C.muted }}>
        {stand.datiert ? "Monatsverlauf aus den Zeitstempeln der Datei."
          : "Kein Datum erkannt, die Datei wurde in zwölf gleich große Abschnitte geteilt."}
        {" "}Benutzungsstunden über 4.000 sprechen für gleichmäßigen Bezug.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Angebot im EGC-Design                                              */
/*  Nach der bisherigen Excel-Vorlage: Deckblatt, Strom- und           */
/*  Gasangebot mit Vergleich zum bisherigen Versorger, Lastgang-       */
/*  Analyse, Service- & Beratungsauftrag, nächste Schritte.            */
/*  Alle Preise netto.                                                 */
/* ------------------------------------------------------------------ */

/* Bisheriger Versorger je Lieferstelle: Arbeitspreis direkt oder aus der Rechnung.
   Aus der Rechnung: (Betrag − anteiliger Grundpreis) ÷ Verbrauch. */
/* Abrechnungstage einschließlich erstem und letztem Tag */
const abrechnungstage = (von, bis) => {
  const t = tageZwischen(von, bis);
  return t == null ? 0 : t + 1;
};
function altPreis(vv) {
  if (!vv) return null;
  const z = (x) => zahlLesen(x);
  const grund = z(vv.grundpreis);
  if ((vv.modus || "preis") === "rechnung") {
    const betrag = z(vv.betrag), menge = z(vv.verbrauch);
    if (isNaN(betrag) || isNaN(menge) || menge <= 0) return null;
    const tage = abrechnungstage(vv.von, vv.bis);
    const grundAnteil = !isNaN(grund) && tage ? (grund * tage) / 365 : 0;
    return { arbeit: ((betrag - grundAnteil) / menge) * 100, grundpreis: isNaN(grund) ? 0 : grund,
             tage, aufgerechnet: true };
  }
  const arbeit = z(vv.arbeit);
  if (isNaN(arbeit)) return null;
  return { arbeit, grundpreis: isNaN(grund) ? 0 : grund };
}

/* Zeitstempel aus Lastgangdateien: 01.01.2025 00:15 · 2025-01-01T00:15 · Excel-Seriennummer */
function zeitLesen(f) {
  if (f == null || f === "") return null;
  const s = String(f).trim();
  let m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})(?:[ T,]+(\d{1,2}):(\d{2}))?/);
  if (m) {
    const j = m[3].length === 2 ? 2000 + parseInt(m[3]) : parseInt(m[3]);
    return new Date(j, parseInt(m[2]) - 1, parseInt(m[1]), parseInt(m[4] || 0), parseInt(m[5] || 0));
  }
  m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2}))?/);
  if (m) return new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]), parseInt(m[4] || 0), parseInt(m[5] || 0));
  if (/^\d{5}([.,]\d+)?$/.test(s)) {
    const z = parseFloat(s.replace(",", "."));
    if (z > 20000 && z < 80000) {
      const d = new Date(Math.round((z - 25569) * 86400000));
      return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes());
    }
  }
  return null;
}
const istSeriennummer = (t) => /^\d{5}[.,]\d+$/.test(String(t || "").trim());

/* Verläufe für Grafiken und Kennzahlen aus einem ausgewerteten Lastgang */
function lastgangVerlaeufe(werte, zeiten, proStunde) {
  const schritt = 60 / proStunde;
  const gelesen = zeiten.map(zeitLesen);
  const mitZeit = gelesen.filter(Boolean).length > werte.length / 2;
  const start = mitZeit ? gelesen.find(Boolean) : new Date(new Date().getFullYear() - 1, 0, 1);
  const zeit = (i) => (mitZeit && gelesen[i]) ? gelesen[i] : new Date(start.getTime() + i * schritt * 60000);

  const tage = new Map();
  const slots = 24 * proStunde;
  const woche = Array(7 * slots).fill(0), wocheN = Array(7 * slots).fill(0);
  const werktag = Array(slots).fill(0), werktagN = Array(slots).fill(0);
  let imax = 0;
  werte.forEach((w, i) => {
    const kw = w * proStunde;
    if (w > werte[imax]) imax = i;
    const t = zeit(i);
    const tag = t.getFullYear() + "-" + (t.getMonth() + 1) + "-" + t.getDate();
    tage.set(tag, Math.max(tage.get(tag) || 0, kw));
    const wt = (t.getDay() + 6) % 7;
    const s = Math.min(slots - 1, t.getHours() * proStunde + Math.floor(t.getMinutes() / schritt));
    woche[wt * slots + s] += kw; wocheN[wt * slots + s]++;
    if (wt < 5) { werktag[s] += kw; werktagN[s]++; }
  });
  const jahre = {};
  werte.forEach((_, i) => { const j = zeit(i).getFullYear(); jahre[j] = (jahre[j] || 0) + 1; });
  return {
    tagesSpitze: [...tage.values()],
    woche: woche.map((x, i) => (wocheN[i] ? x / wocheN[i] : 0)),
    werktag: werktag.map((x, i) => (werktagN[i] ? x / werktagN[i] : 0)),
    spitzeZeit: zeit(imax),
    jahr: Object.entries(jahre).sort((x, y) => y[1] - x[1])[0][0],
    schrittMin: schritt,
  };
}

/* Verlaufsgrafik: Fläche oben dunkelblau, nach unten heller und durchsichtiger */
function lastgangGrafik(werte, { breite = 1400, hoehe = 430, titel = "", achse = [], einheit = "kW" } = {}) {
  const c = document.createElement("canvas");
  c.width = breite; c.height = hoehe;
  const g = c.getContext("2d");
  g.fillStyle = "#fff"; g.fillRect(0, 0, breite, hoehe);
  const L = 92, R = 24, T = titel ? 62 : 20, B = 54;
  const w = breite - L - R, h = hoehe - T - B;
  const roh = Math.max(...werte, 0.001);
  const stufe = Math.pow(10, Math.floor(Math.log10(roh / 5)));
  const schritt = [1, 2, 2.5, 5, 10].map((f) => f * stufe).find((s) => roh / s <= 6) || stufe * 10;
  const max = Math.ceil(roh / schritt) * schritt;
  const x = (i) => L + (werte.length < 2 ? 0 : (i * w) / (werte.length - 1));
  const y = (v) => T + h - (v / max) * h;

  g.font = "600 30px Helvetica, Arial, sans-serif"; g.fillStyle = "#0A1626"; g.textAlign = "left";
  if (titel) g.fillText(titel, L, 38);
  g.font = "22px Helvetica, Arial, sans-serif"; g.textAlign = "right";
  for (let v = 0; v <= max + 1e-9; v += schritt) {
    g.strokeStyle = "#E3E7EC"; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(L, y(v)); g.lineTo(L + w, y(v)); g.stroke();
    g.fillStyle = "#6B7787";
    g.fillText(v.toLocaleString("de-DE", { maximumFractionDigits: 1 }), L - 12, y(v) + 7);
  }
  g.save(); g.translate(26, T + h / 2); g.rotate(-Math.PI / 2); g.textAlign = "center";
  g.fillText(einheit, 0, 0); g.restore();

  const verlauf = g.createLinearGradient(0, T, 0, T + h);
  verlauf.addColorStop(0, "rgba(10,22,38,0.9)");
  verlauf.addColorStop(0.5, "rgba(38,92,110,0.45)");
  verlauf.addColorStop(1, "rgba(108,180,59,0.08)");
  g.beginPath(); g.moveTo(x(0), y(0));
  werte.forEach((v, i) => g.lineTo(x(i), y(v)));
  g.lineTo(x(werte.length - 1), y(0)); g.closePath();
  g.fillStyle = verlauf; g.fill();
  g.beginPath(); werte.forEach((v, i) => (i ? g.lineTo(x(i), y(v)) : g.moveTo(x(i), y(v))));
  g.strokeStyle = "#0A1626"; g.lineWidth = 2.5; g.stroke();

  g.fillStyle = "#6B7787"; g.textAlign = "center"; g.font = "22px Helvetica, Arial, sans-serif";
  achse.forEach(({ i, text }) => g.fillText(text, x(i), T + h + 34));
  return c.toDataURL("image/png");
}

const MONATE_KURZ = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
const WOCHENTAGE = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

/* die drei Grafiken der Lastgang-Analyse */
function lastgangGrafiken(stand) {
  const vl = stand.verlaeufe;
  const n = vl.tagesSpitze.length;
  return {
    jahr: lastgangGrafik(vl.tagesSpitze, { titel: "Tagesspitzenlast " + vl.jahr,
      achse: MONATE_KURZ.map((m, k) => ({ i: Math.round((k + 0.5) * (n - 1) / 12), text: m })) }),
    woche: lastgangGrafik(vl.woche, { titel: "Eine durchschnittliche Woche",
      achse: WOCHENTAGE.map((t, k) => ({ i: Math.round((k + 0.5) * vl.woche.length / 7), text: t })) }),
    werktag: lastgangGrafik(vl.werktag, { titel: "Ein typischer Werktag",
      achse: [0, 4, 8, 12, 16, 20].map((s) => ({ i: Math.round((s * vl.werktag.length) / 24),
        text: String(s).padStart(2, "0") + ":00" })) }),
  };
}

/* Texte aus der Vorlage, auf EGC Energie umgestellt */
const EGC_LEISTUNGEN = ["Persönliche Betreuung und Beratung", "Transparente und faire Vertragsbedingungen",
  "Sichere und zuverlässige Energieversorgung", "Keine versteckten Kosten", "Versorgerunabhängig"];
const EGC_SCHRITTE = [
  ["Angebot vorstellen", "Wir stellen Ihnen Ihr individuelles Energieangebot vor und beantworten alle offenen Fragen."],
  ["Angebot und Service- & Beratungsauftrag unterzeichnen", "Sie bestätigen das Angebot sowie den Service- und Beratungsauftrag – schnell und unkompliziert."],
  ["Versorgerwechsel durch EGC Energie", "Wir übernehmen die komplette Abwicklung Ihres Versorgerwechsels – Sie müssen sich um nichts kümmern."],
  ["Bewirtschaftung des Energievertrages und laufende Portfolioanpassung", "Wir kümmern uns kontinuierlich um Ihren Energievertrag und passen Ihr Portfolio laufend an die Marktentwicklung an. Sie haben einen Ansprechpartner für Ihre Energielieferverträge."],
  ["Energienebenkosten-Optimierung", "Wir unterstützen Sie bei der Stromsteuer-Rückerstattung, der Reduzierung der Energienebenkosten sowie bei der Planung von PV-Anlage, Batteriespeicher und E-Ladesäulen. Sowie beim Einsatz von Smartmetern."],
  ["Dauerhafte Partnerschaft", "Auch nach dem Wechsel bleiben wir an Ihrer Seite – persönliche Betreuung, langfristig und verlässlich. Bei uns haben Sie einen festen persönlichen Ansprechpartner und keine Warteschleife."],
];
const EGC_AUFTRAG = {
  einleitung: "Einwilligung in die Datenverarbeitung zu Maklerzwecken laut Beiblatt",
  abschnitte: [
    ["Vertragsoptimierung", "Hiermit erteilt der Unterzeichner den Auftrag und die Vollmacht, in seinem Namen Verhandlungen über die von ihm genutzten und gewollten Energieprodukte zu führen und Aufträge (gem. Produktanlagen) auszuführen und ihn dabei sowohl bei bisherigen Versorgern als auch bei anderen Versorgungsunternehmen umfassend zu vertreten, Verträge zu kündigen und neue abzuschließen, die Installation von Smart-Meter-Messstellen zu beauftragen sowie sämtliche hierzu notwendigen Willenserklärungen abzugeben und entgegenzunehmen (unter Einschluss der Möglichkeit, Untervollmachten zu erteilen). Der Kunde stimmt hiermit einer Bestandsfreigabe/Übertragung seiner Versorgungsverträge auf das o. g. Beratungsunternehmen zu. Dieser Auftrag gilt für sämtliche aktuellen und zukünftigen Abnahmestellen des Kunden. Ebenso erteile ich die Vollmacht zur Nutzung meiner Bankverbindung für entsprechende Lastschriften des Energieanbieters."],
    ["Laufzeit", "Diese Vollmacht läuft 12 Monate und verlängert sich automatisch um weitere 12 Monate, wenn sie nicht 6 Wochen vor Ablauf gekündigt wird."],
  ],
  datenschutz: [
    ["Einwilligung", "Ja, ich bin damit einverstanden, dass das Unternehmen (ggf. unter Einschaltung eines beauftragten Dienstleisters) meine personenbezogenen Daten zum Zweck der Verhandlung über Energieprodukte bis auf Widerruf verwenden darf. Zu den vorgenannten Zwecken darf ich per Post, E-Mail, Telefon, Fax, SMS oder vergleichbaren Kommunikationsmitteln kontaktiert werden. Mir ist bewusst, dass diese Einwilligung freiwillig erfolgt und jederzeit widerrufbar ist. Meine in folgenden Abschnitten dargestellten Datenschutzrechte habe ich zur Kenntnis genommen. Eine darüber hinausgehende Verarbeitung personenbezogener Daten, die im folgenden Abschnitt beschrieben ist, erfolgt nur mit Ihrer Einwilligung (freiwillig)."],
    ["Datenverarbeitung", "Das Unternehmen nimmt den Schutz der Daten der Kunden ernst. Grundsätzlich gilt, dass der Schutz Ihrer individuellen Privat- und Persönlichkeitssphäre für uns von höchster Bedeutung ist. Deshalb ist das Einhalten der gesetzlichen Bestimmungen zum Datenschutz für uns selbstverständlich. Darüber hinaus ist es uns wichtig, dass unsere Kunden jederzeit wissen, wann wir welche Daten speichern und wie wir diese verwenden."],
    ["Einsatz von KI-gestützten Verarbeitungssystemen", "Zur effizienten Bearbeitung von Anfragen, der Erstellung von Angeboten sowie der Analyse von Energie-, Verbrauchs-, Lastgang- und Vertragsdaten können wir moderne KI-gestützte Softwarelösungen (z. B. ChatGPT, Claude oder vergleichbare Systeme) einsetzen. Dabei werden ausschließlich die zur Bearbeitung Ihres Anliegens erforderlichen Daten verarbeitet. Der Einsatz erfolgt unter Beachtung der geltenden datenschutzrechtlichen Bestimmungen und ausschließlich zu den vereinbarten Beratungs- und Dienstleistungszwecken. Sofern eine Übermittlung an externe KI-Dienstleister erfolgt, geschieht diese ausschließlich im Rahmen der gesetzlichen Vorgaben der Datenschutz-Grundverordnung (DSGVO) und unter Anwendung geeigneter Datenschutzgarantien. Auf Wunsch stellen wir Ihnen jederzeit einen ausführlichen Auszug über unsere KI-gestützte Datenverarbeitung einschließlich der eingesetzten Systeme, Verarbeitungszwecke und Datenschutzmaßnahmen zur Verfügung."],
    ["Datenverarbeitung zur Vertragsabwicklung", "Die Verarbeitung der von Ihnen angegebenen personenbezogenen Daten (wie Name, Adresse, Geburtsdatum, Telefonnummer) durch uns ist zur ordnungsgemäßen Abwicklung des zugrunde liegenden Vertragsverhältnisses und soweit wir zu deren Erhebung gesetzlich verpflichtet sind, z. B. zur Einhaltung von Vorhaltefristen gegenüber dem Finanzamt, erforderlich. Sie beruht auf Art. 6 Abs. 1 Buchstabe b und c DSGVO. Die Daten werden gelöscht, sobald sie für die vorgenannten Zwecke nicht mehr erforderlich sind. Wir speichern Ihre personenbezogenen Daten jedoch, solange wir gesetzlich dazu verpflichtet sind, beispielsweise aufgrund von Aufbewahrungspflichten oder Verjährungsfristen noch nicht abgelaufener potenzieller Rechtsansprüche."],
    ["Datenschutzrechte des Kunden und Kontaktdaten", "Sie können von uns jederzeit Auskunft über Ihre gespeicherten personenbezogenen Daten erhalten (Art. 15 DSGVO), deren Berichtigung (Art. 16 DSGVO), Löschung (Art. 17 DSGVO) oder Einschränkung der Verarbeitung (Art. 18 DSGVO) verlangen sowie Ihr Recht auf Datenübertragbarkeit (Art. 20 DSGVO) geltend machen. Zudem können Sie Ihre Einwilligungserklärung jederzeit ohne Angabe von Gründen mit Wirkung für die Zukunft ändern oder widerrufen (Art. 21 DSGVO). Bitte beachten Sie dabei, dass Datenverarbeitungen, die vor dem Widerruf erfolgt sind, hiervon nicht betroffen sind. Zu den vorgenannten Zwecken wenden Sie sich bitte an eine der nachfolgenden Kontaktadressen."],
    ["Kosten der Beratung", "Dieser Serviceauftrag ist für den Endkunden kostenfrei. Sollten weitere Serviceleistungen erbracht werden, so werden diese sondervertraglich geregelt."],
  ],
};

/* Der PDF-Baustein (jsPDF) wird erst geladen, wenn ein Angebot erzeugt wird.
   Er liegt beim Bau unter /assets/jspdf-4.2.1.min.js. */
let jsPdfLaden = null;
const ladeJsPdf = () => {
  if (window.jspdf) return Promise.resolve(window.jspdf.jsPDF);
  if (!jsPdfLaden)
    jsPdfLaden = new Promise((fertig, fehler) => {
      const s = document.createElement("script");
      s.src = "/assets/jspdf-4.2.1.min.js";
      s.onload = () => fertig(window.jspdf.jsPDF);
      s.onerror = () => { jsPdfLaden = null; fehler(new Error("PDF-Baustein konnte nicht geladen werden.")); };
      document.head.appendChild(s);
    });
  return jsPdfLaden;
};

/* Ausfüllbare Felder (PDF-Formular) in ein fertiges PDF setzen, ohne zusätzlichen Baustein.
   Das PDF bleibt unverändert; Felder, Seiten mit Feldverweisen und der Katalog werden als
   Ergänzung angehängt (wie beim Speichern in einem PDF-Editor). jsPDFs eigene Formularfelder
   sind unvollständig (keine Schriftangabe, Kästchen vorab angekreuzt), darum von Hand.
   felder: [{ art: "text" | "kreuz", name, seite (ab 1), x, y, w, h (mm, von oben links), gr, mehrzeilig }] */
function pdfMitFeldern(bytes, felder) {
  if (!felder || !felder.length) return bytes;
  let roh = "";
  for (let i = 0; i < bytes.length; i += 8192) roh += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
  const sx = roh.lastIndexOf("startxref");
  const prev = parseInt(roh.slice(sx + 9), 10);
  const tr = roh.slice(roh.lastIndexOf("trailer"), sx);
  const groesse = +tr.match(/\/Size (\d+)/)[1], wurzel = +tr.match(/\/Root (\d+) 0 R/)[1];
  const info = tr.match(/\/Info (\d+) 0 R/), kennung = tr.match(/\/ID\s*(\[[^\]]*\])/);
  const objekt = (n) => {
    const m = roh.match(new RegExp("(?:^|[\\r\\n])" + n + " 0 obj\\s*(<<[\\s\\S]*?>>)\\s*endobj"));
    if (!m) throw new Error("PDF-Objekt " + n + " nicht gefunden");
    return m[1];
  };
  const katalog = objekt(wurzel);
  const seiten = objekt(+katalog.match(/\/Pages (\d+) 0 R/)[1]).match(/\/Kids\s*\[([^\]]*)\]/)[1]
    .match(/\d+ 0 R/g).map((r) => +r.split(" ")[0]);
  const neu = [];                       /* [nummer, inhalt] */
  let naechste = groesse;
  const anlegen = (inhalt) => { const n = naechste++; neu.push([n, inhalt]); return n; };
  const str = (t) => "(" + String(t).replace(/[\\()]/g, (c) => "\\" + c).replace(/[^\x20-\x7e]/g, "_") + ")";
  const strom = (kopf, inhalt) => kopf.replace(/>>$/, "/Length " + inhalt.length + ">>") + "\nstream\n" + inhalt + "\nendstream";
  const helv = anlegen("<</Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding>>");
  const zadb = anlegen("<</Type /Font /Subtype /Type1 /BaseFont /ZapfDingbats>>");
  const k = 72 / 25.4, f2 = (z) => z.toFixed(2);
  const jeSeite = {}, alle = [];
  felder.forEach((f) => {
    const sNr = seiten[f.seite - 1];
    if (!sNr) return;
    const mb = (objekt(sNr).match(/\/MediaBox\s*\[([^\]]*)\]/) || [0, "0 0 595.28 841.89"])[1].trim().split(/\s+/).map(Number);
    const ph = mb[3];
    const r = [f.x * k, ph - (f.y + f.h) * k, (f.x + f.w) * k, ph - f.y * k];
    const rect = "/Rect [" + r.map(f2).join(" ") + "]";
    let n;
    if (f.art === "unterschrift") {
      /* echtes Unterschriftsfeld: DocuSign, Adobe Sign und Acrobat erkennen es als Stelle zum Unterschreiben */
      n = anlegen("<</Type /Annot /Subtype /Widget /FT /Sig /F 4 /T " + str(f.name) + " " + rect + " /P " + sNr + " 0 R /MK <<>>>>");
    } else if (f.art === "kreuz") {
      const b = f2(r[2] - r[0]), h = f2(r[3] - r[1]);
      /* Häkchen als Linie im EGC-Grün, nicht als Schriftzeichen: sieht in jedem Programm gleich aus */
      const bw = r[2] - r[0], bh = r[3] - r[1];
      const ja = anlegen(strom("<</Type /XObject /Subtype /Form /BBox [0 0 " + b + " " + h + "]>>",
        "q 0.42 0.71 0.23 RG " + f2(bh * 0.16) + " w 1 J 1 j " + f2(bw * 0.2) + " " + f2(bh * 0.52) + " m " +
        f2(bw * 0.42) + " " + f2(bh * 0.26) + " l " + f2(bw * 0.84) + " " + f2(bh * 0.8) + " l S Q"));
      const aus = anlegen(strom("<</Type /XObject /Subtype /Form /BBox [0 0 " + b + " " + h + "]>>", ""));
      n = anlegen("<</Type /Annot /Subtype /Widget /FT /Btn /F 4 /T " + str(f.name) + " " + rect + " /P " + sNr + " 0 R" +
        " /V /Off /AS /Off /AP <</N <</Yes " + ja + " 0 R /Off " + aus + " 0 R>>>>>>");
    } else {
      n = anlegen("<</Type /Annot /Subtype /Widget /FT /Tx /F 4 /T " + str(f.name) + " " + rect + " /P " + sNr + " 0 R" +
        " /V () /DA (/Helv " + f2(f.gr || 9) + " Tf 0.09 0.13 0.17 rg)" + (f.mehrzeilig ? " /Ff 4096" : "") + " /MK <<>>>>");
    }
    (jeSeite[sNr] = jeSeite[sNr] || []).push(n); alle.push(n);
  });
  const ersetzt = [];
  Object.entries(jeSeite).forEach(([sNr, liste]) => {
    const alt = objekt(sNr), refs = liste.map((n) => n + " 0 R").join(" ");
    ersetzt.push([+sNr, /\/Annots\s*\[/.test(alt) ? alt.replace(/\/Annots\s*\[/, "/Annots [" + refs + " ")
      : alt.replace(/>>\s*$/, "/Annots [" + refs + "]\n>>")]);
  });
  const form = anlegen("<</Fields [" + alle.map((n) => n + " 0 R").join(" ") + "] /NeedAppearances true" +
    " /DA (/Helv 0 Tf 0 g) /DR <</Font <</Helv " + helv + " 0 R /ZaDb " + zadb + " 0 R>>>>>>");
  ersetzt.push([wurzel, katalog.replace(/\/AcroForm\s*\d+ 0 R/, "").replace(/>>\s*$/, "/AcroForm " + form + " 0 R\n>>")]);
  let anhang = "\n", pos = roh.length + 1;
  const xref = [];
  [...ersetzt, ...neu].forEach(([n, inhalt]) => {
    const teil = n + " 0 obj\n" + inhalt + "\nendobj\n";
    xref.push([n, pos]); anhang += teil; pos += teil.length;
  });
  anhang += "xref\n" + xref.sort((a, b) => a[0] - b[0]).map(([n, o]) => n + " 1\n" + String(o).padStart(10, "0") + " 00000 n \n").join("") +
    "trailer\n<<\n/Size " + naechste + "\n/Root " + wurzel + " 0 R\n" + (info ? "/Info " + info[1] + " 0 R\n" : "") +
    (kennung ? "/ID " + kennung[1] + "\n" : "") + "/Prev " + prev + "\n>>\nstartxref\n" + pos + "\n%%EOF\n";
  const aus = new Uint8Array(bytes.length + anhang.length);
  aus.set(bytes);
  for (let i = 0; i < anhang.length; i++) aus[bytes.length + i] = anhang.charCodeAt(i) & 255;
  return aus;
}
const bytesAlsDataUrl = (u8) => {
  let s = "";
  for (let i = 0; i < u8.length; i += 8192) s += String.fromCharCode.apply(null, u8.subarray(i, i + 8192));
  return "data:application/pdf;base64," + btoa(s);
};

const BERUF_VORGABE = {
  Vertriebspartner: "Energieberater", Teamleiter: "Teamleiter Vertrieb", "Leitung Vertrieb": "Leitung Vertrieb",
  Kalkulation: "Kalkulation", Vertragsmanagement: "Vertragsmanagement", Finanzbuchhaltung: "Finanzbuchhaltung",
  Leadmanagement: "Leadmanagement", Beschaffung: "Beschaffung", "Geschäftsführung": "Geschäftsführer",
};
/* was auf der Karte steht: Eintrag der Geschäftsführung, sonst die Angaben aus dem Profil */
const visitenkartenDaten = (m) => {
  const v = (m && m.visitenkarte) || {};
  return {
    name: m.name || "",
    titel: v.titel || BERUF_VORGABE[m.rolle] || m.rolle || "",
    zusatz: v.zusatz || "",
    telefon: v.telefon || FIRMENDATEN.telefon || "",
    mobil: v.mobil || m.telefon || "",
    email: v.email || m.email || "",
  };
};
/* Service- & Beratungsauftrag ohne Kundendaten, zum Ausfüllen von Hand */
const blankoAuftragPdf = () => egcAngebotPdf(
  { kunde: {}, partnerId: null,
    lieferstellen: [1, 2].map((i) => ({ id: "leer" + i, medium: "strom" })) },
  {}, { mitarbeiter: [], blanko: true });

const egcAngebotPdf = teilFunktion("pdf", "egcAngebotPdf");   /* in pdf.jsx */
/* ------------------------------------------------------------------ */
/*  Individualanfrage an den Versorger                                 */
/*  Bei Tranchen- oder PPA-Wunsch braucht es ein Angebot direkt vom    */
/*  Versorger. Die Kalkulation lädt ein Paket: Anfrage-PDF mit allen   */
/*  Kunden- und Lieferstellendaten, dazu die Lastgänge als XLSX.        */
/* ------------------------------------------------------------------ */
const INDIVIDUAL_PRODUKTE = ["Tranchenmodell", "PPA-Modell"];
const brauchtIndividualanfrage = (a) =>
  INDIVIDUAL_PRODUKTE.includes(a.produkt) || INDIVIDUAL_PRODUKTE.includes(a.produktGas);

const dataUrlBytes = (url) => {
  const roh = atob(String(url).split(",")[1] || "");
  const b = new Uint8Array(roh.length);
  for (let i = 0; i < roh.length; i++) b[i] = roh.charCodeAt(i);
  return b;
};
const bytesDataUrl = (bytes, typ) => {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return "data:" + typ + ";base64," + btoa(s);
};
const dateiName = (t) => String(t || "Datei").replace(/[^\wäöüÄÖÜß.-]+/g, "_").replace(/^_+|_+$/g, "");

/* Kleine XLSX-Datei aus Zeilen (Zahlen bleiben Zahlen, deutsche Schreibweise wird erkannt) */
function xlsxAusZeilen(zeilen, blatt = "Lastgang") {
  const x = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const spalte = (i) => { let s = ""; i++; while (i) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };
  const reihen = zeilen.map((z, r) => '<row r="' + (r + 1) + '">' + z.map((f, c) => {
    const ref = spalte(c) + (r + 1);
    const s = String(f == null ? "" : f).trim();
    if (s === "") return "";
    const n = /^-?[\d.]+(,\d+)?$|^-?\d+(\.\d+)?$/.test(s) ? zahlLesen(s) : NaN;
    return isNaN(n) ? '<c r="' + ref + '" t="inlineStr"><is><t>' + x(s) + "</t></is></c>"
      : '<c r="' + ref + '"><v>' + n + "</v></c>";
  }).join("") + "</row>").join("");
  const dateien = {
    "[Content_Types].xml": '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',
    "_rels/.rels": '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    "xl/workbook.xml": '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="' + x(blatt.slice(0, 31)) + '" sheetId="1" r:id="rId1"/></sheets></workbook>',
    "xl/_rels/workbook.xml.rels": '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
    "xl/worksheets/sheet1.xml": '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>' + reihen + "</sheetData></worksheet>",
  };
  const z = {};
  Object.entries(dateien).forEach(([k, v]) => { z[k] = strToU8(v); });
  return zipSync(z, { level: 6 });
}

/* Erzeugt ein Angebotsdokument aus den erfassten Daten */
function angebotPdf(a, v) {
  const z = [];
  z.push({ text: a.kunde.firma, gross: true });
  z.push([a.kunde.strasse, [a.kunde.plz, a.kunde.ort].filter(Boolean).join(" ")].filter(Boolean).join(", "));
  if (a.kunde.ansprechpartner) z.push("Zu Händen " + a.kunde.ansprechpartner);
  z.push(" ");
  z.push({ text: "Angebot " + v.produkt, gross: true });
  z.push("Vorgang " + a.id + "   ·   Angebotsdatum " + datum(heute()) +
         (v.gueltigBis ? "   ·   gültig bis " + datum(v.gueltigBis) : ""));
  z.push("Laufzeit " + (laufzeitMonate(v) || v.laufzeit) + " Monate" +
         (v.lieferbeginn ? ", Lieferbeginn " + datum(v.lieferbeginn) : "") +
         (enddatum(v) ? ", Lieferende " + datum(enddatum(v)) : ""));
  z.push("Sparte: " + (v.sparte === "gas" ? "Erdgas" : v.sparte === "strom" ? "Strom" : "Strom und Erdgas"));
  z.push(" ");
  z.push({ text: "Lieferstellen und Preise", gross: true });
  stellenVon(a, v)
    .forEach((l) => {
      const pr = (v.preise || {})[l.id] || {};
      z.push((l.bezeichnung || (l.medium === "strom" ? "Strom" : "Erdgas")) +
        "  ·  " + [l.strasse, l.plz + " " + l.ort].filter(Boolean).join(", "));
      z.push("     Zählernummer " + (l.zaehlernummer || "-") +
             "   MaLo " + (l.maloId || "-") + "   " + l.zaehlerart +
             "   " + num(parseFloat(l.verbrauch) || 0) + " kWh/Jahr");
      if (pr.energie || pr.arbeit)
        z.push("     " + [pr.energie && (pr.ohneGrundpreis ? "Energiepreis inkl. Grundpreis " : "Energiepreis ") + pr.energie + " ct/kWh",
                          pr.arbeit && "Arbeitspreis " + pr.arbeit + " ct/kWh"]
                          .filter(Boolean).join("   "));
    });
  z.push(" ");
  z.push("Gesamtmenge " + num(stellenVon(a, v).reduce((s, l) => s + (parseFloat(l.verbrauch) || 0), 0)) + " kWh je Lieferjahr");
  if (v.bemerkung) { z.push(" "); z.push({ text: "Hinweise", gross: true }); z.push(v.bemerkung); }
  z.push(" ");
  z.push("Alle Preise netto zuzüglich Steuern, Abgaben, Umlagen und Netzentgelten,");
  z.push("soweit nicht anders angegeben. Angebot freibleibend.");
  z.push(" ");
  z.push("EGC Energie · " + [FIRMENDATEN.strasse, FIRMENDATEN.ort].filter(Boolean).join(", "));
  return erzeugePdf("angebot_" + a.id + "_" + (v.produkt || "").toLowerCase().replace(/[^a-z]/g, "") + ".pdf",
    "Angebot " + a.id, z);
}

/* Angebotsvarianten: die Kalkulation kann mehrere Angebote zurückgeben
   (z. B. Festpreis 24 Monate und Spotmarkt 12 Monate, oder je Sparte eines).
   Ältere Vorgänge ohne Varianten werden auf eine einzelne Variante umgerechnet. */
function varianten(a) {
  const k = a.kalkulation;
  if (!k) return [];
  if (k.varianten && k.varianten.length) return k.varianten;
  return [{
    id: "v1", sparte: "beide", produkt: a.produkt, laufzeitArt: "monate",
    laufzeit: a.laufzeit, lieferende: "", aufschlag: k.aufschlag ?? a.aufschlag,
    lieferbeginn: k.lieferbeginn || "", gueltigBis: k.gueltigBis || "",
    bemerkung: k.bemerkung || "", angebot: k.angebot || null, preise: {},
  }];
}

/* angenommene Varianten – bei zwei Sparten können es zwei sein */
function gewaehlte(a) {
  const k = a.kalkulation;
  if (!k || !k.gewaehlt) return [];
  const ids = Array.isArray(k.gewaehlt) ? k.gewaehlt : [k.gewaehlt];
  return varianten(a).filter((v) => ids.includes(v.id));
}

const aktiveVariante = (a) => {
  const g = gewaehlte(a);
  if (g.length) return g[0];
  const v = varianten(a);
  return v.length ? v[0] : null;
};

/* Laufzeit entweder in Monaten oder über ein festes Lieferende */
const laufzeitMonate = (v) =>
  v.laufzeitArt === "ende"
    ? monateZwischen(v.lieferbeginn, v.lieferende) || 0
    : parseInt(v.laufzeit) || 0;

/* „2 Lieferjahre“ oder „18 Monate“ */
const jahreText = (m) => !m ? "–" : m % 12 === 0 ? (m === 12 ? "1 Lieferjahr" : m / 12 + " Lieferjahre") : m + " Monate";

const enddatum = (v) =>
  v.laufzeitArt === "ende" ? v.lieferende || null : monateDazu(v.lieferbeginn, parseInt(v.laufzeit) || 0);

/* Vorlaufzeiten für die Erinnerung an auslaufende Verträge, in Monaten */
const VERLAENGERUNG_VORLAUF = [12, 6, 3];

/* Abweichende Laufzeit, die der Kunde bei der Annahme gewählt hat (in Monaten), sonst 0 */
const laufzeitAbweichend = (a) => parseInt(a && a.annahme && a.annahme.laufzeitMonate) || 0;

const vertragsende = (a) => {
  const v = aktiveVariante(a);
  if (!v) return null;
  const abw = laufzeitAbweichend(a);
  /* Lieferstellen mit eigenem Lieferbeginn oder eigener Laufzeit: das früheste Ende zählt (für die Erinnerung) */
  const vars = gewaehlte(a).length ? gewaehlte(a) : [v];
  const enden = vars.flatMap((x) => stellenVon(a, x).filter((l) => stelleAbweichend(x, l)).map((l) => {
    const sv = stelleIn(x, l);
    return abw && x.id === v.id && sv.lieferbeginn ? monateDazu(sv.lieferbeginn, abw) : enddatum(sv);
  })).filter(Boolean);
  const normal = abw && v.lieferbeginn ? monateDazu(v.lieferbeginn, abw) : enddatum(v);
  if (!enden.length) return normal;
  const ohne = vars.some((x) => stellenVon(a, x).some((l) => !stelleAbweichend(x, l)));
  return [...enden, ...(ohne && normal ? [normal] : [])].sort()[0];
};

const monateBis = (iso) => {
  if (!iso) return null;
  const d = new Date(iso), n = new Date();
  if (isNaN(d)) return null;
  return (d.getFullYear() - n.getFullYear()) * 12 + (d.getMonth() - n.getMonth());
};

/* Mögliche Doppelerfassung eines Kunden erkennen */
function dubletten(a, alle, mitarbeiter) {
  const norm = (t) => String(t || "").toLowerCase().replace(/[^a-zäöüß0-9]/g, "");
  const maloIds = a.lieferstellen.map((l) => String(l.maloId || "").replace(/\s/g, "")).filter(Boolean);
  const treffer = [];
  (alle || []).forEach((x) => {
    if (x.id === a.id || ["abgelehnt", "entwurf"].includes(x.status)) return;
    const gruende = [];
    const fremdeMalo = x.lieferstellen.map((l) => String(l.maloId || "").replace(/\s/g, "")).filter(Boolean);
    if (maloIds.some((m) => fremdeMalo.includes(m))) gruende.push("gleiche Marktlokations-ID");
    if (norm(a.kunde.firma) && norm(a.kunde.firma) === norm(x.kunde.firma)) gruende.push("gleicher Firmenname");
    else if (norm(a.kunde.firma) && norm(a.kunde.strasse) &&
             norm(a.kunde.strasse) === norm(x.kunde.strasse) && a.kunde.plz === x.kunde.plz)
      gruende.push("gleiche Anschrift");
    if (gruende.length) {
      const inhaber = (mitarbeiter || []).find((m) => m.id === x.partnerId);
      treffer.push({ vorgang: x, gruende, inhaber: inhaber ? inhaber.name : x.partnerName });
    }
  });
  return treffer;
}

/* Liegezeiten aus dem Verlauf ableiten */
const tageSeit = (iso) => tageZwischen(iso, heute());

function liegezeit(a) {
  const letzter = a.verlauf && a.verlauf.length ? a.verlauf[a.verlauf.length - 1] : null;
  return letzter ? tageSeit(letzter.d) : null;
}

function phasenDauer(a) {
  const finde = (teil) => {
    const e = (a.verlauf || []).find((v) => v.t.toLowerCase().includes(teil));
    return e ? e.d : null;
  };
  const eingereicht = finde("anfrage eingereicht");
  const kalkuliert = finde("kalkuliert");
  const abschluss = finde("abschluss an die kalkulation");
  const bestaetigt = finde("beim versorger bestätigt");
  return {
    kalkulation: tageZwischen(eingereicht, kalkuliert),
    kunde: tageZwischen(kalkuliert, abschluss),
    versorger: tageZwischen(abschluss, bestaetigt),
    gesamt: tageZwischen(eingereicht, bestaetigt),
  };
}

/* Laufzeit einer Variante; für die angenommene Variante gilt eine abweichende Laufzeit aus der Annahme */
const laufzeitFuer = (a, v) =>
  laufzeitAbweichend(a) && aktiveVariante(a) && aktiveVariante(a).id === v.id ? laufzeitAbweichend(a) : laufzeitMonate(v);

const laufzeitVon = (a) => {
  if (laufzeitAbweichend(a)) return laufzeitAbweichend(a);
  const v = aktiveVariante(a);
  return v ? laufzeitMonate(v) : a.laufzeit;
};

/* ---------- Werte je Lieferstelle ----------
   Die Kalkulation kann im Angebot je Lieferstelle einen eigenen Versorger, Lieferbeginn, eine eigene
   Laufzeit und einen eigenen Aufschlag eintragen (in v.preise[l.id]). Leer heißt: wie die Variante. */
const ctZahl = (x) => { const n = parseFloat(String(x === undefined || x === null ? "" : x).replace(",", ".")); return isNaN(n) ? 0 : n; };
const hatWert = (x) => x !== undefined && x !== null && String(x).trim() !== "";
/* Lieferstellen einer Variante: nach Sparte, und wenn die Kalkulation einzelne gewählt hat, nur diese */
const stellenVon = (a, v) => a.lieferstellen.filter((l) => (!v || !v.sparte || v.sparte === "beide" || l.medium === v.sparte)
  && (!v || !Array.isArray(v.lieferstellenIds) || !v.lieferstellenIds.length || v.lieferstellenIds.includes(l.id)));
function stelleIn(v, l) {
  const p = ((v && v.preise) || {})[l.id] || {};
  const art = p.laufzeitArt || "monate";
  const eigeneLaufzeit = art === "ende" ? hatWert(p.lieferende) : hatWert(p.laufzeit);
  return {
    versorger: hatWert(p.versorger) ? p.versorger : (v && v.versorger) || "",
    lieferbeginn: hatWert(p.lieferbeginn) ? p.lieferbeginn : (v && v.lieferbeginn) || "",
    laufzeitArt: eigeneLaufzeit ? art : (v && v.laufzeitArt) || "monate",
    laufzeit: eigeneLaufzeit ? p.laufzeit : v && v.laufzeit,
    lieferende: eigeneLaufzeit ? p.lieferende : (v && v.lieferende) || "",
    aufschlag: hatWert(p.aufschlag) ? p.aufschlag : v && v.aufschlag,
    /* tatsächlicher Aufschlag der Firma; leer = wie der dem Vertrieb mitgeteilte */
    aufschlagEcht: hatWert(p.aufschlagEcht) ? p.aufschlagEcht
      : v && hatWert(v.aufschlagEcht) ? v.aufschlagEcht
      : hatWert(p.aufschlag) ? p.aufschlag : v && v.aufschlag,
    eigen: { versorger: hatWert(p.versorger), lieferbeginn: hatWert(p.lieferbeginn), laufzeit: eigeneLaufzeit, aufschlag: hatWert(p.aufschlag) || hatWert(p.aufschlagEcht) },
  };
}
const stelleAbweichend = (v, l) => Object.values(stelleIn(v, l).eigen).some(Boolean);
const lieferjahreAus = (monate) => Math.max(1, Math.round((parseInt(monate) || 12) / 12));

/* Je Lieferstelle, was für die Provision gilt: Menge, Aufschlag, Versorger, Lieferbeginn, Laufzeit.
   Mit Variante: diese Variante. Ohne: nach der Versorgerbestätigung deren Mengen und Aufschläge,
   sonst die angenommene(n) Variante(n), sonst die erste Variante. */
function provisionsStellen(a, v) {
  const alle = varianten(a);
  const vars = v ? [v] : (gewaehlte(a).length ? gewaehlte(a) : alle.slice(0, 1));
  const aktiv = aktiveVariante(a);
  const abw = laufzeitAbweichend(a);
  const monateVon = (x, sv) => (abw && aktiv && x && x.id === aktiv.id ? abw : laufzeitMonate(sv) || parseInt(sv.laufzeit) || 0);
  const varFuer = (l) => vars.find((x) => stellenVon(a, x).some((y) => y.id === l.id)) || (v ? null : alle.find((x) => stellenVon(a, x).some((y) => y.id === l.id)));
  if (!v && a.bestaetigung) {
    const b = a.bestaetigung;
    return a.lieferstellen.map((l) => {
      const s = (b.stellen || {})[l.id] || {};
      const x = varFuer(l);
      const sv = x ? stelleIn(x, l) : { lieferbeginn: "", laufzeit: a.laufzeit };
      const mit = hatWert(s.aufschlag) ? ctZahl(s.aufschlag) : ctZahl(b.aufschlag);
      return { l, menge: parseFloat(s.kwh) || 0, aufschlag: mit,
               aufschlagEcht: hatWert(s.aufschlagEcht) ? ctZahl(s.aufschlagEcht) : hatWert(b.aufschlagEcht) ? ctZahl(b.aufschlagEcht) : mit,
               versorger: s.versorger || b.versorger || "", beginn: s.beginn || sv.lieferbeginn || "", monate: monateVon(x, sv) };
    }).filter((s) => s.menge > 0);
  }
  if (!vars.length) return [];
  return vars.flatMap((x) => stellenVon(a, x).map((l) => {
    const sv = stelleIn(x, l);
    return { l, menge: parseFloat(l.verbrauch) || 0, aufschlag: ctZahl(sv.aufschlag), aufschlagEcht: ctZahl(sv.aufschlagEcht), versorger: sv.versorger,
             beginn: sv.lieferbeginn, monate: monateVon(x, sv) };
  }));
}
/* Provision in einem Lieferjahr: nur Lieferstellen, deren Laufzeit dieses Jahr noch umfasst */
const imJahr = (s, jahr) => !jahr || lieferjahreAus(s.monate) >= jahr;
/* Gesamtprovision der Firma: tatsächlicher Aufschlag. Grundlage für den Vertrieb: der mitgeteilte Aufschlag */
const provisionAus = (stellen, jahr, mitgeteilt) => stellen.filter((s) => imJahr(s, jahr))
  .reduce((t, s) => t + (s.menge * (mitgeteilt ? s.aufschlag : (s.aufschlagEcht ?? s.aufschlag))) / 100, 0);
/* größte Zahl Lieferjahre über alle Lieferstellen */
const lieferjahreVon = (a, v) => {
  const st = provisionsStellen(a, v);
  return st.length ? Math.max(...st.map((s) => lieferjahreAus(s.monate))) : lieferjahreAus(laufzeitVon(a));
};
/* Aufschlag als Text: ein Wert, oder „je Lieferstelle 0,400–0,600“ */
const aufschlagText = (a, v, echt) => {
  const w = [...new Set(provisionsStellen(a, v).map((s) => (echt ? s.aufschlagEcht ?? s.aufschlag : s.aufschlag)))];
  if (!w.length) return num((v ? ctZahl(v.aufschlag) : ctZahl(a.aufschlag)), 3) + " ct/kWh";
  return w.length === 1 ? num(w[0], 3) + " ct/kWh" : "je Lieferstelle " + num(Math.min(...w), 3) + "–" + num(Math.max(...w), 3) + " ct/kWh";
};

/* Aufschlag in ct/kWh × Menge je Lieferstelle = Gesamtprovision der Firma in € je Lieferjahr */
const provisionVariante = (a, v, jahr) => provisionAus(provisionsStellen(a, v), jahr);

/* Nach der Versorgerbestätigung zählen die bestätigten Mengen und der Gesamtaufschlag */
const bestaetigteMenge = (a) =>
  a.bestaetigung
    ? Object.values(a.bestaetigung.stellen || {}).reduce((t, x) => t + (parseFloat(x.kwh) || 0), 0)
    : 0;

const gesamtprovision = (a, v, jahr) => {
  if (v || a.bestaetigung || varianten(a).length) return provisionAus(provisionsStellen(a, v), jahr);
  return (verbrauchGesamt(a) * ctZahl(a.aufschlag)) / 100;
};
/* Provision auf Basis des dem Vertrieb mitgeteilten Aufschlags; darauf rechnen Partner und Struktur */
const vertriebsprovision = (a, v, jahr) => {
  if (v || a.bestaetigung || varianten(a).length) return provisionAus(provisionsStellen(a, v), jahr, true);
  return (verbrauchGesamt(a) * ctZahl(a.aufschlag)) / 100;
};
/* Unterscheiden sich tatsächlicher und mitgeteilter Aufschlag? */
const mitVerdecktemAufschlag = (a, v) => provisionsStellen(a, v).some((s) => Math.abs((s.aufschlagEcht ?? s.aufschlag) - s.aufschlag) > 1e-9);

/* Differenzprovision: der Partner erhält seinen Satz, jede Stufe darüber
   die Differenz zum bereits vergebenen Satz. Der Rest bleibt in der Firma. */
function verteilung(gesamt, partnerId, mitarbeiter) {
  const p = mitarbeiter.find((m) => m.id === partnerId);
  if (!p) return { anteile: [], firma: gesamt };
  const anteile = [
    { id: p.id, name: p.name, rolle: p.rolle, satz: p.satz || 0, betrag: (gesamt * (p.satz || 0)) / 100 },
  ];
  let vergeben = p.satz || 0;
  const gesehen = new Set([p.id]);
  let oben = mitarbeiter.find((m) => m.id === p.upline);
  while (oben && !gesehen.has(oben.id)) {
    gesehen.add(oben.id);
    const diff = Math.max(0, (oben.satz || 0) - vergeben);
    if (diff > 0)
      anteile.push({ id: oben.id, name: oben.name, rolle: oben.rolle, satz: diff,
                     betrag: (gesamt * diff) / 100, overhead: true });
    vergeben = Math.max(vergeben, oben.satz || 0);
    oben = mitarbeiter.find((m) => m.id === oben.upline);
  }
  return { anteile, firma: gesamt - anteile.reduce((s, x) => s + x.betrag, 0) };
}

/* alle, die direkt oder indirekt unter jemandem hängen */
function strukturUnter(id, mitarbeiter) {
  const direkt = mitarbeiter.filter((m) => m.upline === id);
  return direkt.reduce((alle, m) => [...alle, m, ...strukturUnter(m.id, mitarbeiter)], []);
}

/* für wen darf jemand eine Anfrage anlegen? */
function anlegenFuer(user, mitarbeiter) {
  const vertrieb = ["Vertriebspartner", "Teamleiter", "Leitung Vertrieb"];
  if (user.rolle === "Leitung Vertrieb")
    return [user, ...mitarbeiter.filter((m) => m.id !== user.id && vertrieb.includes(m.rolle))];
  if (user.rolle === "Teamleiter")
    return [user, ...strukturUnter(user.id, mitarbeiter).filter((m) => vertrieb.includes(m.rolle))];
  return [user];
}

const verbrauchMedium = (a, medium) =>
  a.lieferstellen.filter((l) => l.medium === medium)
    .reduce((sm, l) => sm + (parseFloat(l.verbrauch) || 0), 0);

const mengeSparte = (a, sparte) =>
  !sparte || sparte === "beide" ? verbrauchGesamt(a)
    : verbrauchMedium(a, sparte === "gas" ? "gas" : "strom");

const monateZwischen = (von, bis) => {
  if (!von || !bis) return null;
  const v = new Date(von), b = new Date(bis);
  if (isNaN(v) || isNaN(b)) return null;
  const m = (b.getFullYear() - v.getFullYear()) * 12 + (b.getMonth() - v.getMonth());
  return Math.max(0, b.getDate() >= v.getDate() ? m : m - 1);
};

const monateDazu = (iso, monate) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d)) return null;
  d.setMonth(d.getMonth() + monate);
  return d.toISOString().slice(0, 10);
};

/* Zusatzprovision für selbst gewonnene Kunden, in Prozentpunkten.
   Sie geht zulasten des Firmenanteils, die Struktur bleibt unberührt. */
/* Einen Bonus für Eigenakquise gibt es nicht mehr (Vorgabe der Geschäftsführung, v5.42).
   Ältere Einstellungen und eigene Sätze je Person werden nicht mehr berücksichtigt. */
const BONUS_EIGENAKQUISE = 0;
const setzeBonus = () => {};

/* Anteil der Gesamtprovision, der tatsächlich bei EGC ankommt.
   Die Sätze der Vertriebspartner rechnen auf die volle Gesamtprovision,
   ausgezahlt wird aber aus diesem Anteil. Je Versorger überschreibbar.
   Der Wert steht bewusst nicht im Code: Er kommt nur aus der Datenbank, und
   die gibt ihn ausschließlich an die Geschäftsführung heraus. Solange er
   fehlt, bleibt er NaN und die Firmenbeträge erscheinen als „–“. */
let FIRMENANTEIL = NaN;
let FIRMENANTEIL_JE_VERSORGER = {};
const setzeFirmenanteil = (wert, jeVersorger) => {
  FIRMENANTEIL = parseFloat(wert);
  FIRMENANTEIL_JE_VERSORGER = jeVersorger || {};
};
const firmenanteilVon = (versorgerName) => {
  const eigen = FIRMENANTEIL_JE_VERSORGER[versorgerName];
  const w = parseFloat(eigen);
  /* fehlt die Einstellung, gilt die Vorgabe 75 % */
  return eigen !== undefined && eigen !== "" && !isNaN(w) ? w : (isNaN(FIRMENANTEIL) ? 75 : FIRMENANTEIL);
};

/* Eigener Satz in Prozent der Gesamtprovision. Die Geschäftsführung erhält immer den Firmenanteil (Vorgabe 75 %),
   nicht einen Vertriebssatz; ein Eigenakquise-Bonus kommt für sie nicht hinzu. */
const istGFRolle = (m) => !!m && m.rolle === "Geschäftsführung";
const eigenerSatzVon = (m) => istGFRolle(m) ? (isNaN(FIRMENANTEIL) ? 75 : FIRMENANTEIL) : (parseFloat(m && m.satz) || 0);

/* Welcher Eigenakquise-Satz gilt für diese Person? */
const eigenBonusVon = () => 0;

/* Ein Kunde kann von mehreren Vertriebspartnern betreut werden.
   beteiligte hält je Partner den prozentualen Anteil an der Vertriebsprovision. */
const beteiligte = (a) =>
  (a.beteiligte && a.beteiligte.length ? a.beteiligte : [{ id: a.partnerId, anteil: 100 }])
    .filter((b) => b && b.id);

const istBeteiligt = (a, id) => beteiligte(a).some((b) => b.id === id);

/* Tippgeber-Vergütung eines Vorgangs. Grundlage ist die Vergütung, die der Server beim
   Auswählen am Vorgang ablegt (a.tippgeber: art, wert, traegerId) – so bleiben alte
   Abschlüsse unverändert und es rechnet auch für Partner, die sie nicht sehen dürfen.
   - prozent (jährlich): Anteil an der Provision des Trägers, je Lieferjahr.
   - kwh (einmalig): Betrag je 100.000 kWh, im 1. Lieferjahr voll an den Tippgeber.
     Vom Träger wird je Lieferjahr höchstens seine Provision abgezogen; der Rest geht
     ins nächste Lieferjahr. Was nach dem letzten Jahr offen ist, trägt EGC.
   - Ohne Vertriebspartner am Vorgang (Kunde der Geschäftsführung) zahlt EGC;
     prozentual dann auf die Gesamtprovision. */
const tgZahl = (w) => parseFloat(String(w ?? "").replace(",", ".")) || 0;
const tippgeberMenge = (a) => bestaetigteMenge(a) || verbrauchGesamt(a);

/* wer trägt den Tippgeber? der Partner, der ihn gewählt hat, sonst der erste Vertriebspartner */
const TG_FIRMA = "EGC";
function tippgeberTraeger(a, mitarbeiter) {
  const tg = a && a.tippgeber;
  if (!tg) return null;
  /* Tippgeber der Firma: die Vergütung trägt EGC, kein Vertriebspartner */
  if (tg.besitzerId === TG_FIRMA) return null;
  const vertrieb = beteiligte(a).filter((b) => {
    const m = mitarbeiter.find((x) => x.id === b.id);
    return m && ["Vertriebspartner", "Teamleiter", "Leitung Vertrieb"].includes(m.rolle);
  });
  const gewaehlt = vertrieb.find((b) => b.id === tg.traegerId);
  return (gewaehlt || vertrieb[0] || {}).id || null;
}

/* Firmenanteil eines Vorgangs: nach der Versorgerbestätigung je Lieferstelle nach deren Versorger gewichtet */
function firmenanteilVorgang(a, jahr) {
  if (!a || !a.bestaetigung) return firmenanteilVon(null);
  const st = provisionsStellen(a).filter((s) => imJahr(s, jahr));
  const e = (s) => s.menge * (s.aufschlagEcht ?? s.aufschlag);
  const summe = st.reduce((t, s) => t + e(s), 0);
  if (!summe) return firmenanteilVon(a.bestaetigung.versorger || null);
  return st.reduce((t, s) => t + e(s) * firmenanteilVon(s.versorger || null), 0) / summe;
}

function gesamtverteilung(a, mitarbeiter, betrag, jahr, variante) {
  const g = betrag != null ? betrag : gesamtprovision(a, variante, jahr);
  /* Partner und Struktur bekommen ihre Sätze auf die Provision zum mitgeteilten Aufschlag;
     bei der Firma kommt die Provision zum tatsächlichen Aufschlag an */
  const echtG = gesamtprovision(a, variante, jahr), mitG = vertriebsprovision(a, variante, jahr);
  const gV = echtG > 0 ? g * (mitG / echtG) : g;
  const quote = firmenanteilVorgang(a, jahr);
  const beiEgc = (g * quote) / 100;
  const teile = beteiligte(a);
  const summe = teile.reduce((t, b) => t + (parseFloat(b.anteil) || 0), 0) || 1;
  const map = {};
  let bonusGesamt = 0;
  const eigen = (a.akquiseArt || "eigen") === "eigen";

  teile.forEach((b) => {
    const anteilG = (gV * (parseFloat(b.anteil) || 0)) / summe;
    const v = verteilung(anteilG, b.id, mitarbeiter);
    v.anteile.forEach((x) => {
      if (!map[x.id]) map[x.id] = { ...x, betrag: 0, bonus: 0 };
      map[x.id].betrag += x.betrag;
      if (x.overhead) map[x.id].overhead = true;
    });
    /* Der Bonus geht an den Partner selbst, nicht an seine Struktur.
       Ist für die Person ein eigener Satz hinterlegt, gilt dieser. */
    /* Die Geschäftsführung bekommt keinen Bonus an sich selbst: ihr gehört ohnehin der Firmenanteil */
    if (eigen && BONUS_EIGENAKQUISE > 0 && !istGFRolle(mitarbeiter.find((x) => x.id === b.id))) {
      const satz = BONUS_EIGENAKQUISE;
      const bonus = (anteilG * satz) / 100;
      if (!map[b.id]) map[b.id] = { id: b.id, name: "", rolle: "", satz: 0, betrag: 0, bonus: 0 };
      map[b.id].bonus += bonus;
      map[b.id].betrag += bonus;
      bonusGesamt += bonus;
    }
  });

  /* Tippgeber: geht vom Anteil des Trägers ab, nicht von der Struktur darüber.
     Ausgezahlt wird er von EGC; ohne Träger trägt ihn EGC selbst. */
  let tippgeber = null;
  const tg = a && a.tippgeber;
  if (tg && tg.art) {
    const j = jahr || 1;
    const wert = tgZahl(tg.wert);
    const traeger = tippgeberTraeger(a, mitarbeiter);
    const p = traeger && map[traeger];
    const basis = p ? p.betrag : 0;
    let auszahlung = 0, abzug = 0;
    if (tg.art === "prozent") {
      auszahlung = ((p ? basis : tg.besitzerId === TG_FIRMA ? beiEgc : gV) * wert) / 100;
      abzug = p ? Math.min(auszahlung, basis) : 0;
    } else if (tg.art === "kwh") {
      const gesamtTG = (wert * tippgeberMenge(a)) / 100000;
      auszahlung = j === 1 ? gesamtTG : 0;
      /* bei gleich hoher Provision je Jahr: bisher abgezogen (j-1) × basis */
      abzug = p ? Math.max(0, Math.min(basis, gesamtTG - (j - 1) * basis)) : 0;
    }
    if (p && abzug > 0) { p.betrag -= abzug; p.tippgeberAbzug = abzug; }
    tippgeber = { ...tg, betrag: auszahlung, abzug, traegerId: p ? traeger : null };
  }

  const ausgeschuettet = Object.values(map).reduce((t, x) => t + x.betrag, 0)
    + (tippgeber ? tippgeber.betrag : 0);
  return {
    anteile: Object.values(map).sort((x, y) => y.betrag - x.betrag),
    /* Was der Firma bleibt: ihr Anteil an der Gesamtprovision abzüglich
       aller Auszahlungen, die auf die volle Gesamtprovision gerechnet werden. */
    firma: beiEgc - ausgeschuettet,
    beiEgc, quote, ausgeschuettet, vertriebBasis: gV,
    bonus: bonusGesamt, eigenakquise: eigen, tippgeber,
  };
}

const anteilVon = (a, id, mitarbeiter, variante) => {
  const v = gesamtverteilung(a, mitarbeiter, gesamtprovision(a, variante), undefined, variante);
  const t = v.anteile.find((x) => x.id === id);
  return t ? t.betrag : 0;
};

/* Staatliche Umlagen und Abgaben in ct/kWh je Sparte. Pflegt die Kalkulation (Einstellung „umlagen“),
   sie gelten für jede Kalkulation. Beim Erzeugen eines Angebots wird der Stand an der Variante festgehalten. */
let UMLAGEN = { strom: "", gas: "" };
const setzeUmlagen = (w) => { UMLAGEN = { strom: "", gas: "", ...(w || {}) }; };
/* Vorgabe der Bestandteile, falls noch keine einzeln hinterlegt sind (Stand Lieferjahr 2027) */
const UMLAGEN_VORGABE = {
  strom: [["KWKG-Umlage", "0,451"], ["Offshore-Netzumlage", "1,143"], ["Aufschlag für besondere Netznutzung", "2,027"],
          ["Stromsteuer", "2,05"], ["Konzessionsabgabe", "0,11"]],
  gas: [["Energiesteuer", "0,55"], ["Konvertierungsumlage", "0,018"], ["Konzessionsabgabe", "0,03"]],
};
/* Smartmeter-Angebot: Texte und Positionsvorlagen. Pflegen Kalkulation und GF (Einstellung „smartmeter“),
   je Angebot änderbar. Titelbild liegt unter /assets/smartmeter-2/titel.jpg (Abbildung ähnlich). */
const SMARTMETER_VORGABE = {
  titel1: "Ihre Energie.", titel2: "Jederzeit im Blick.",
  unterzeile: "Intelligente Messsysteme für Ihre Lieferstellen, mit digitalem Portal zur Verbrauchsanalyse.",
  kacheln: [
    { t: "Zugang zu Live-Börsenpreisen", s: "Mit dem Smartmeter ist eine Belieferung zu aktuellen Spotmarktpreisen möglich. Sie zahlen den Börsenpreis, ohne die Risikoaufschläge, die Versorger für Festpreise am Terminmarkt einrechnen." },
    { t: "Kein Ablesen mehr", s: "Zählerstände werden automatisch übermittelt. Sie müssen nichts mehr ablesen und nichts mehr melden." },
    { t: "Bisherige Messkosten entfallen", s: "Ihr bisheriger Messstellenbetreiber wird abgelöst, seine Kosten für den Messstellenbetrieb entfallen." },
    { t: "Digitales Portal", s: "Verbrauchsanalyse online: Verläufe, Spitzen und Auffälligkeiten jederzeit im Blick." },
    { t: "Alle Verbrauchsstellen", s: "Auswertung aller Lieferstellen gebündelt in einem Portal, übersichtlich und vergleichbar." },
  ],
  einbau: "EGC Energie baut keine Smartmeter ein und betreibt sie nicht. Einbau und Betrieb übernimmt ein zugelassener Smartmeter-Messstellenbetreiber. Er löst Ihren bisherigen Messstellenbetreiber ab und regelt den Wechsel direkt mit ihm, für Sie ist dabei nichts zu tun. EGC Energie berät Sie und koordiniert den Auftrag.",
  annahme: "Hiermit nehme ich das oben stehende Smartmeter-Angebot an. EGC Energie leitet den Auftrag an den Smartmeter-Messstellenbetreiber weiter und koordiniert ihn.",
  hinweis: "Alle Preise netto zuzüglich der gesetzlichen Umsatzsteuer. Der Einbau erfolgt nach Terminabsprache. Voraussetzung ist die Angabe der Messlokation (MeLo-ID) je Lieferstelle.",
  vorlagen: [
    { bezeichnung: "Einbau und Inbetriebnahme intelligentes Messsystem (durch den Smartmeter-Messstellenbetreiber)", art: "einmalig", preis: "" },
    { bezeichnung: "Messstellenbetrieb durch den Smartmeter-Messstellenbetreiber inklusive Portalzugang", art: "monatlich", preis: "" },
  ],
};
let SMARTMETER = SMARTMETER_VORGABE;
const setzeSmartmeter = (w) => { SMARTMETER = { ...SMARTMETER_VORGABE, ...(w || {}) }; };
/* Summen der Positionen: einmalig, monatlich, je Jahr */
const smartmeterSummen = (sm) => {
  const p = ((sm && sm.positionen) || []).filter((x) => !isNaN(zahlLesen(x.preis)));
  const einmalig = p.filter((x) => x.art !== "monatlich").reduce((t, x) => t + zahlLesen(x.preis), 0);
  const monatlich = p.filter((x) => x.art === "monatlich").reduce((t, x) => t + zahlLesen(x.preis), 0);
  return { einmalig, monatlich, jahr: monatlich * 12, anzahl: p.length };
};

/* Umlagen früherer Jahre, damit eine alte Abrechnung fair mit dem Angebot verglichen werden kann.
   Vorgabewerte (Summen ct/kWh netto); die Kalkulation prüft und pflegt sie unter „Staatliche Umlagen“.
   Strom 2025: KWKG 0,277 + Offshore 0,816 + bes. Netznutzung 1,558 + Stromsteuer 2,05 + KA 0,11
   Strom 2026: KWKG 0,446 + Offshore 0,941 + bes. Netznutzung 1,559 + Stromsteuer 2,05 + KA 0,11
   Erdgas 2025: Energiesteuer 0,55 + Gasspeicherumlage 0,299 + KA 0,03; Erdgas 2026: ohne Gasspeicherumlage */
const UMLAGEN_JAHR_VORGABE = "2027";
const UMLAGEN_VORJAHRE_VORGABE = { "2025": { strom: "4,811", gas: "0,879" }, "2026": { strom: "5,106", gas: "0,58" } };
const umlagenJahr = (q) => String((q && q.jahr) || UMLAGEN_JAHR_VORGABE);
const umlagenVorjahre = (q) => ({ ...UMLAGEN_VORJAHRE_VORGABE, ...((q && q.vorjahre) || {}) });
/* Jahr der Abrechnung einer Lieferstelle: von der Kalkulation gesetzt, sonst vom Vertriebspartner angegeben */
const abrechnungsJahrVon = (vv, l) => (vv && vv.jahr !== undefined ? vv.jahr : (l && l.abrechnungJahr) || "");
/* Ausgleich: Umlagen des Angebotsjahres minus Umlagen des Abrechnungsjahres (ct/kWh) */
function umlagenAusgleich(vv, l, umlagen) {
  const q = umlagen || UMLAGEN;
  const jahr = abrechnungsJahrVon(vv, l), ziel = umlagenJahr(q);
  if (!jahr || Number(jahr) >= Number(ziel)) return null;
  const sparte = l.medium === "gas" ? "gas" : "strom";
  const neu = umlageSumme(q, sparte), alt = zahlLesen((umlagenVorjahre(q)[jahr] || {})[sparte]);
  if (isNaN(neu) || isNaN(alt)) return null;
  return { jahr, ziel, alt, neu, diff: neu - alt, sparte };
}

/* Bestandteile einer Sparte: einzeln hinterlegt, sonst ein Sammelwert, sonst leer */
const umlageTeile = (quelle, sparte) => {
  const q = quelle || {};
  if (q.teile && Array.isArray(q.teile[sparte])) return q.teile[sparte].filter((t) => t && (t.name || t.wert !== ""));
  if (q[sparte] !== undefined && q[sparte] !== "") return [{ name: "Staatliche Umlagen und Abgaben", wert: q[sparte] }];
  return [];
};
const umlageSumme = (quelle, sparte) => {
  const t = umlageTeile(quelle, sparte);
  if (!t.length || t.some((x) => isNaN(zahlLesen(x.wert)))) return NaN;
  return t.reduce((s, x) => s + zahlLesen(x.wert), 0);
};

/* Preisbestandteile einer Lieferstelle:
   Netzentgelte = Arbeitspreis − Energiepreis − staatliche Umlagen und Abgaben.
   RLM zusätzlich: Leistungsspitze (kW) × Leistungspreis (€/kW) = Betrag in € je Jahr. */
function preisTeile(l, pr, umlagen) {
  pr = pr || {};
  const quelle = umlagen || UMLAGEN;
  const arbeit = zahlLesen(pr.arbeit), energie = zahlLesen(pr.energie);
  const sparte = l.medium === "gas" ? "gas" : "strom";
  const umlage = umlageSumme(quelle, sparte);
  const umlagenTeile = umlageTeile(quelle, sparte);
  /* Netzentgelte laut Versorger (freiwillig): dann sind die Abgaben der Rest, wie in der Aufteilung des Versorgers */
  const netzVersorger = zahlLesen(pr.netz);
  if (!isNaN(netzVersorger) && !isNaN(arbeit) && !isNaN(energie)) {
    const rlm0 = l.zaehlerart === "RLM";
    const kw0 = zahlLesen(pr.leistung !== undefined && pr.leistung !== "" ? pr.leistung : l.lastspitze);
    const lp0 = zahlLesen(pr.leistungspreis);
    return { arbeit, energie, umlage: arbeit - energie - netzVersorger, umlagenTeile: [], netz: netzVersorger, netzVomVersorger: true,
             rlm: rlm0, kw: kw0, leistungspreis: lp0, leistungKosten: rlm0 && !isNaN(kw0) && !isNaN(lp0) ? kw0 * lp0 : NaN };
  }
  const netz = !isNaN(arbeit) && !isNaN(energie) && !isNaN(umlage) ? arbeit - energie - umlage : NaN;
  const rlm = l.zaehlerart === "RLM";
  const kw = zahlLesen(pr.leistung !== undefined && pr.leistung !== "" ? pr.leistung : l.lastspitze);
  const leistungspreis = zahlLesen(pr.leistungspreis);
  const leistungKosten = rlm && !isNaN(kw) && !isNaN(leistungspreis) ? kw * leistungspreis : NaN;
  return { arbeit, energie, umlage, umlagenTeile, netz, rlm, kw, leistungspreis, leistungKosten };
}

const leereVariante = (a) => ({
  id: uid(), sparte: verbrauchMedium(a, "gas") && verbrauchMedium(a, "strom") ? "beide"
    : verbrauchMedium(a, "gas") ? "gas" : "strom",
  produkt: PRODUKTE.includes(a.produkt) ? a.produkt : "Festpreis",
  laufzeitArt: a.laufzeitArt || "monate",
  laufzeit: a.laufzeit, lieferende: a.wunschLieferende || "",
  aufschlag: a.aufschlag, lieferbeginn: a.wunschLieferbeginn || "",
  gueltigBis: "", bemerkung: "", angebot: null, preise: {},
});

/* ------------------------------------------------------------------ */
/*  Demodaten                                                          */
/* ------------------------------------------------------------------ */
function seed() {
  const a1 = leereAnfrage(USERS[0]);
  a1.id = "A-2026-1042";
  a1.angelegt = "2026-08-19";
  a1.status = "angebot";
  a1.kunde = {
    firma: "Hotel Saarblick GmbH", strasse: "Uferstraße 14", plz: "66111",
    ort: "Saarbrücken", ansprechpartner: "Frau Dr. Lorenz",
    email: "lorenz@hotel-saarblick.de", telefon: "0681 449021",
  };
  a1.lieferstellen = [
    { ...leereLieferstelle("strom"), id: "s1", bezeichnung: "Haupthaus", strasse: "Uferstraße 14",
      plz: "66111", ort: "Saarbrücken", versorger: "Stadtwerke Saarbrücken",
      zaehlernummer: "1ESY1160892344", maloId: "51238106877", verbrauch: "412000",
      zaehlerart: "RLM", abrechnung: demoPdf("abrechnung_strom_2025.pdf", ["Jahresabrechnung Strom 2025", "Hotel Saarblick GmbH", "Beispieldokument aus der Demo"]),
      lastgang: demoPdf("lastgang_haupthaus_2025.pdf", ["Lastgang Haupthaus 2025", "Viertelstundenwerte, Auszug"]) },
    { ...leereLieferstelle("gas"), id: "s2", bezeichnung: "Haupthaus", strasse: "Uferstraße 14",
      plz: "66111", ort: "Saarbrücken", versorger: "E.ON Energie",
      zaehlernummer: "G4-778120", maloId: "44118902355", verbrauch: "890000",
      zaehlerart: "SLP", abrechnung: demoPdf("abrechnung_gas_2025.pdf", ["Jahresabrechnung Erdgas 2025", "Hotel Saarblick GmbH"]) },
  ];
  a1.laufzeit = 24;
  a1.aufschlag = 0.6;
  a1.wunschLieferbeginn = "2026-11-01";
  a1.laufzeitArt = "ende";
  a1.wunschLieferende = "2028-12-31";
  a1.produktGas = "Festpreis";
  a1.kalkulation = {
    bearbeiter: "Team Kalkulation", datum: "2026-08-22",
    vollmacht: demoPdf("maklervollmacht_saarblick.pdf", ["Maklervollmacht", "Hotel Saarblick GmbH"]),
    gewaehlt: null,
    varianten: [
      { id: "v1", sparte: "beide", produkt: "Festpreis", laufzeitArt: "ende", laufzeit: 24,
        lieferende: "2028-12-31", aufschlag: 0.6,
        lieferbeginn: "2026-11-01", gueltigBis: "2026-09-12",
        bemerkung: "Preise indikativ auf Basis Schlusskurse 21.08. Bindefrist 3 Werktage nach Kundenannahme.",
        angebot: demoPdf("angebot_saarblick_festpreis_24m.pdf", ["Angebot Festpreis 24 Monate", "Hotel Saarblick GmbH", "Aufschlag 0,600 ct/kWh"]),
        preise: { s1: { energie: "18,40", arbeit: "24,60" }, s2: { energie: "4,20", arbeit: "6,85" } } },
      { id: "v2", sparte: "beide", produkt: "Spotmarkt", laufzeitArt: "monate", laufzeit: 12,
        lieferende: "", aufschlag: 0.45,
        lieferbeginn: "2026-11-01", gueltigBis: "2026-09-12",
        bemerkung: "Spotbezug mit monatlicher Abrechnung, kein Preisrisiko-Hedge. Wechsel in Festpreis jederzeit möglich.",
        angebot: demoPdf("angebot_saarblick_spot_12m.pdf", ["Angebot Spotmarkt 12 Monate", "Hotel Saarblick GmbH", "Aufschlag 0,450 ct/kWh"]),
        preise: {} },
    ],
  };
  a1.nachrichten = [
    { id: "n1", text: "Kunde braucht die Preise bis Freitag, er hat noch ein Vergleichsangebot liegen.",
      von: "Marco Weber", rolle: "Vertriebspartner", datum: "2026-08-19", zeit: "14:20" },
    { id: "n2", text: "Verstanden. Der Lastgang ist sauber, wir rechnen Festpreis und Spot parallel und schicken beides.",
      von: "Team Kalkulation", rolle: "Kalkulation", datum: "2026-08-20", zeit: "09:05" },
    { id: "n3", text: "Beide Varianten sind raus. Beim Spot bitte auf die monatliche Abrechnung hinweisen.",
      von: "Team Kalkulation", rolle: "Kalkulation", datum: "2026-08-22", zeit: "11:40" },
  ];
  a1.verlauf = [
    { d: "2026-08-19", t: "Anfrage eingereicht", w: "Marco Weber" },
    { d: "2026-08-22", t: "Angebot kalkuliert und zurückgesendet", w: "Team Kalkulation" },
  ];

  const a2 = leereAnfrage(USERS[0]);
  a2.id = "A-2026-1055";
  a2.angelegt = "2026-08-28";
  a2.status = "klaerfall";
  a2.kunde = {
    firma: "Gasthaus Zum Anker e.K.", strasse: "Marktplatz 3", plz: "54290",
    ort: "Trier", ansprechpartner: "Herr Bremer",
    email: "info@zum-anker.de", telefon: "0651 220188",
  };
  a2.lieferstellen = [
    { ...leereLieferstelle("strom"), bezeichnung: "Gaststätte", strasse: "Marktplatz 3",
      plz: "54290", ort: "Trier", versorger: "SWT Trier",
      zaehlernummer: "1SWT0099231", maloId: "", verbrauch: "96000",
      zaehlerart: "SLP", abrechnung: null },
  ];
  a2.produkt = "Spotmarkt";
  a2.produktGas = "Festpreis";
  a2.aufschlag = 0.4;
  a2.fehlend = ["Versorgerabrechnung fehlt", "Marktlokations-ID fehlt"];
  a2.fehlendText =
    "Bitte die letzte Jahresabrechnung des Versorgers hochladen, ohne MaLo-ID keine Netzentgelt-Zuordnung möglich.";
  a2.nachrichten = [
    { id: "n4", text: "Die MaLo-ID bekomme ich erst vom Netzbetreiber, das dauert ein paar Tage.",
      von: "Marco Weber", rolle: "Vertriebspartner", datum: "2026-08-29", zeit: "16:12" },
    { id: "n5", text: "Kein Problem, wir legen den Vorgang so lange auf Wiedervorlage.",
      von: "Team Kalkulation", rolle: "Kalkulation", datum: "2026-08-29", zeit: "16:48" },
  ];
  a2.verlauf = [
    { d: "2026-08-28", t: "Anfrage eingereicht", w: "Marco Weber" },
    { d: "2026-08-29", t: "Zurück an Vertrieb: Unterlagen unvollständig", w: "Team Kalkulation" },
  ];

  const a3 = leereAnfrage(USERS[1]);
  a3.id = "A-2026-1061";
  a3.angelegt = "2026-09-01";
  a3.status = "eingereicht";
  a3.kunde = {
    firma: "Kunststofftechnik Pfalz GmbH", strasse: "Industriering 8", plz: "67065",
    ort: "Ludwigshafen", ansprechpartner: "Herr Sancak",
    email: "einkauf@kt-pfalz.de", telefon: "0621 887400",
  };
  a3.lieferstellen = [
    { ...leereLieferstelle("strom"), bezeichnung: "Werk 1", strasse: "Industriering 8",
      plz: "67065", ort: "Ludwigshafen", versorger: "Pfalzwerke",
      zaehlernummer: "1PFW4410023", maloId: "51009923114", verbrauch: "2450000",
      zaehlerart: "RLM", abrechnung: demoPdf("pfalzwerke_2025.pdf", ["Jahresabrechnung Strom 2025", "Kunststofftechnik Pfalz GmbH"]),
      lastgang: demoPdf("lastgang_werk1.pdf", ["Lastgang Werk 1", "Dreischichtbetrieb"]) },
    { ...leereLieferstelle("strom"), bezeichnung: "Werk 2 / Lager", strasse: "Industriering 12",
      plz: "67065", ort: "Ludwigshafen", versorger: "Pfalzwerke",
      zaehlernummer: "1PFW4410088", maloId: "51009923400", verbrauch: "310000",
      zaehlerart: "SLP", abrechnung: demoPdf("pfalzwerke_lager_2025.pdf", ["Jahresabrechnung Lager 2025"]) },
  ];
  a3.produkt = EMPFEHLUNG;
  a3.produktGas = "Festpreis";
  a3.laufzeit = 36;
  a3.laufzeitArt = "ende";
  a3.wunschLieferbeginn = "2027-07-15";
  a3.wunschLieferende = "2029-12-31";
  a3.beratungHinweis =
    "Kunde hat bisher immer Festpreis gemacht, fragt jetzt nach Tranchen. Produktion läuft im Dreischichtbetrieb, Lastgang ist sehr gleichmäßig. Was empfehlen wir bei 2,45 GWh?";
  a3.aufschlag = 0.25;
  a3.verlauf = [{ d: "2026-09-01", t: "Anfrage eingereicht", w: "Sandra Klein" }];

  const a4 = leereAnfrage(USERS[1]);
  a4.id = "A-2026-0987";
  a4.angelegt = "2026-07-14";
  a4.status = "abgeschlossen";
  a4.vertragsStatus = "Vertrag unterschrieben";
  a4.kunde = {
    firma: "Landhotel Eifelblick", strasse: "Am Hang 2", plz: "54578",
    ort: "Wiesbaum", ansprechpartner: "Familie Krämer",
    email: "kontakt@eifelblick.de", telefon: "06593 90210",
  };
  a4.lieferstellen = [
    { ...leereLieferstelle("gas"), id: "g1", bezeichnung: "Hotel", strasse: "Am Hang 2",
      plz: "54578", ort: "Wiesbaum", versorger: "RWE", zaehlernummer: "G6-220914",
      maloId: "44120088731", verbrauch: "640000", zaehlerart: "SLP",
      abrechnung: demoPdf("rwe_2025.pdf", ["Jahresabrechnung Erdgas 2025", "Landhotel Eifelblick"]) },
  ];
  a4.aufschlag = 0.55;
  a4.wunschLieferbeginn = "2026-10-01";
  a4.kalkulation = {
    bearbeiter: "Team Kalkulation", datum: "2026-07-17",
    vollmacht: demoPdf("maklervollmacht_eifelblick.pdf", ["Maklervollmacht", "Landhotel Eifelblick"]),
    gewaehlt: ["v1"],
    varianten: [
      { id: "v1", sparte: "gas", produkt: "Festpreis", laufzeitArt: "ende", laufzeit: 24,
        lieferende: "2028-12-31", aufschlag: 0.55,
        lieferbeginn: "2026-10-01", gueltigBis: "2026-08-01",
        bemerkung: "Bestandskunde, Wechsel zum Lieferbeginn.",
        angebot: demoPdf("angebot_eifelblick_gas.pdf", ["Angebot Erdgas Festpreis", "Landhotel Eifelblick"]),
        preise: { g1: { energie: "4,45", arbeit: "7,10" } } },
    ],
  };
  a4.verlauf = [
    { d: "2026-07-14", t: "Anfrage eingereicht", w: "Sandra Klein" },
    { d: "2026-07-17", t: "Angebot kalkuliert", w: "Team Kalkulation" },
    { d: "2026-07-23", t: "Angebot vom Kunden angenommen", w: "Sandra Klein" },
  ];

  return [a3, a2, a1, a4];
}

function seedLeads() {
  const l1 = leererLead();
  l1.id = "L-2026-118";
  l1.angelegt = "2026-09-01";
  l1.status = "neu";
  l1.firma = "Brauhaus am Staden GmbH";
  l1.strasse = "Stadenstraße 21"; l1.plz = "66121"; l1.ort = "Saarbrücken";
  l1.ansprechpartner = "Herr Thiel"; l1.position = "Geschäftsführer";
  l1.telefon = "0681 776540"; l1.email = "thiel@brauhaus-staden.de";
  l1.verbrauchStrom = "285000"; l1.verbrauchGas = "410000";
  l1.laufzeitStrom = "2027-03-31"; l1.laufzeitGas = "2027-03-31";
  l1.beschaffung = "Festpreis über Stadtwerke, seit 2024";
  l1.dienstleister = false;
  l1.quelle = "Social Media"; l1.quelleDetail = "LinkedIn-Kampagne Gastronomie";
  l1.terminDatum = "2026-09-11"; l1.terminZeit = "10:00"; l1.terminArt = "Vor Ort";
  l1.bemerkung = "Zeigt sich offen, klagt über die letzte Preisrunde. Braut selbst, hoher Gasanteil.";
  l1.dateien = [demoPdf("abrechnung_strom_2025.pdf", ["Jahresabrechnung Strom", "Brauhaus am Staden"]),
                demoPdf("abrechnung_gas_2025.pdf", ["Jahresabrechnung Erdgas", "Brauhaus am Staden"])];
  l1.zugewiesen = "vp-weber"; l1.zugewiesenVon = "Katrin Roth"; l1.zugewiesenAm = "2026-09-01";

  const l2 = leererLead();
  l2.id = "L-2026-121";
  l2.angelegt = "2026-09-03";
  l2.status = "erstgespraech";
  l2.gelesen = true;
  l2.firma = "Pflegeheim St. Elisabeth e.V.";
  l2.strasse = "Kirchweg 5"; l2.plz = "54290"; l2.ort = "Trier";
  l2.ansprechpartner = "Frau Bender"; l2.position = "Verwaltungsleitung";
  l2.telefon = "0651 330012"; l2.email = "bender@st-elisabeth-trier.de";
  l2.verbrauchStrom = "640000"; l2.verbrauchGas = "1250000";
  l2.laufzeitStrom = "2026-12-31"; l2.laufzeitGas = "2027-12-31";
  l2.beschaffung = "Rahmenvertrag über Caritas-Verbund";
  l2.dienstleister = true; l2.dienstleisterName = "Energiekontor Rhein-Mosel";
  l2.quelle = "Tippgeber"; l2.quelleDetail = "Empfehlung durch Landhotel Eifelblick";
  l2.terminDatum = "2026-09-16"; l2.terminZeit = "14:30"; l2.terminArt = "Microsoft Teams";
  l2.bemerkung = "Bestehender Dienstleister, Vertrag Strom läuft zum Jahresende aus. Ausschreibungspflicht prüfen.";
  l2.dateien = [demoPdf("lastgang_2025.pdf", ["Lastgang 2025", "Pflegeheim St. Elisabeth"])];
  l2.zugewiesen = "tl-sued"; l2.zugewiesenVon = "Karsten"; l2.zugewiesenAm = "2026-09-03";

  const bau = (id, tag, firma, ort, strom, gas, quelle, status, wem, termin) => {
    const l = leererLead();
    l.id = id; l.angelegt = tag; l.status = status; l.gelesen = true;
    l.firma = firma; l.ort = ort; l.plz = ""; l.strasse = "";
    l.verbrauchStrom = strom; l.verbrauchGas = gas;
    l.quelle = quelle; l.zugewiesen = wem; l.zugewiesenVon = "Katrin Roth"; l.zugewiesenAm = tag;
    l.terminDatum = termin || ""; l.terminArt = "Microsoft Teams";
    if (status === "auftrag") l.abschlussAm = "2026-08-20";
    return l;
  };

  return [
    l2, l1,
    bau("L-2026-104", "2026-08-12", "Autohaus Neunkirchen GmbH", "Neunkirchen", "180000", "220000",
        "Kaltakquise", "angebot", "vp-weber", "2026-08-26"),
    bau("L-2026-097", "2026-08-04", "Wäscherei Mosel GmbH", "Bernkastel", "520000", "1400000",
        "Tippgeber", "verhandlung", "vp-klein", "2026-08-28"),
    bau("L-2026-088", "2026-07-22", "Seniorenresidenz Sonnenhang", "Homburg", "310000", "780000",
        "Social Media", "auftrag", "vp-weber", "2026-08-05"),
    bau("L-2026-076", "2026-07-02", "Metallbau Krämer e.K.", "Zweibrücken", "95000", "0",
        "Kaltakquise", "verloren", "vp-klein", "2026-07-15"),
    bau("L-2026-069", "2026-06-18", "Camping Bostalsee Betriebs GmbH", "Nohfelden", "140000", "60000",
        "Social Media", "wiedervorlage", "tl-sued", "2027-01-15"),
  ];
}

/* ------------------------------------------------------------------ */
/*  Kleine UI-Bausteine                                                */
/* ------------------------------------------------------------------ */
/* Passende Tastatur am Handy aus der Beschriftung des Feldes:
   E-Mail mit @, Telefon mit Ziffernblock, Preise und Mengen mit Zahlentastatur (mit Komma, wo Dezimalstellen vorkommen).
   Felder mit Buchstaben (Zählernummer, Kundennummer, IBAN) behalten die normale Tastatur. */
const tastaturFuer = (label, type) => {
  if (type && type !== "text") return {};
  const l = typeof label === "string" ? label : "";
  if (!l) return {};
  if (/e-?mail/i.test(l)) return { type: "email", inputMode: "email", autoComplete: "email" };
  if (/telefon|mobil|handy|fax/i.test(l)) return { type: "tel", inputMode: "tel", autoComplete: "tel" };
  if (/zählernummer|kundennummer|vertragsnummer|iban|bic|ust|steuer-?nr|bezeichnung|name/i.test(l)) return {};
  if (/\bplz\b|postleitzahl/i.test(l)) return { inputMode: "numeric", autoComplete: "postal-code" };
  if (/marktlokation|\bmalo\b/i.test(l)) return { inputMode: "numeric" };
  if (/ct\/kwh|€|eur\b|\bkw\b|\(kw\)|prozent|%|preis|aufschlag|satz|bonus|betrag|leistung|lastspitze|anteil/i.test(l)) return { inputMode: "decimal" };
  if (/kwh|mwh|monate|laufzeit|anzahl|jahr|stunden|menge|verbrauch|stück|tage/i.test(l)) return { inputMode: "numeric" };
  return {};
};

const Feld = ({ label, value, onChange, placeholder, type = "text", fehler, breit, min, gesperrt, zahl }) => (
  <label className={"block " + (breit ? "sm:col-span-2" : "")}>
    <span className="block text-xs mb-1" style={{ color: C.muted }}>{label}</span>
    <input
      {...(zahl ? {} : tastaturFuer(label, type))}
      type={zahl ? "text" : (tastaturFuer(label, type).type || type)}
      inputMode={zahl ? "numeric" : tastaturFuer(label, type).inputMode}
      value={zahl
        ? (String(value ?? "") === "" ? "" : Number(String(value).replace(/\D/g, "")).toLocaleString("de-DE"))
        : value}
      placeholder={placeholder}
      onChange={(e) => onChange(zahl ? e.target.value.replace(/\D/g, "") : e.target.value)}
      min={min}
      disabled={gesperrt}
      className="w-full px-3 py-2 text-sm rounded outline-none"
      style={{
        border: "1px solid " + (fehler ? C.warn : C.line),
        background: gesperrt ? "#F1F3F5" : fehler ? "#FCF3F0" : "#fff",
        color: gesperrt ? C.muted : C.text,
      }}
    />
  </label>
);

const Select = ({ label, value, onChange, options, breit }) => (
  <label className={"block " + (breit ? "sm:col-span-2" : "")}>
    <span className="block text-xs mb-1" style={{ color: C.muted }}>{label}</span>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 text-sm rounded outline-none"
      style={{ border: "1px solid " + C.line, background: "#fff", color: C.text }}
    >
      {options.map((o) => (
        <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>
      ))}
    </select>
  </label>
);

const Btn = ({ children, onClick, variante = "primär", icon: Icon, disabled }) => {
  const s =
    variante === "primär"
      ? { background: C.ink, color: "#fff", border: "1px solid " + C.ink }
      : variante === "gefahr"
      ? { background: "#fff", color: C.warn, border: "1px solid " + C.warn }
      : variante === "ok"
      ? { background: C.ok, color: "#fff", border: "1px solid " + C.ok }
      : variante === "blau"
      ? { background: C.strom, color: "#fff", border: "1px solid " + C.strom }
      : { background: "#fff", color: C.text, border: "1px solid " + C.line };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-2 px-3.5 py-2 text-sm rounded"
      style={{ ...s, opacity: disabled ? 0.45 : 1, cursor: disabled ? "not-allowed" : "pointer" }}
    >
      {Icon && <Icon size={15} />}
      {children}
    </button>
  );
};

const StatusPunkt = ({ status, a, umbrechen }) => {
  const s = a ? statusVon(a) : (STATUS[status] || { label: status, color: C.muted });
  return (
    <span className={"inline-flex items-" + (umbrechen ? "start" : "center") + " gap-1.5 text-xs" + (umbrechen ? "" : " whitespace-nowrap")} style={{ color: s.color }}>
      <span className={"w-2 h-2 rounded-full flex-shrink-0" + (umbrechen ? " mt-1" : "")} style={{ background: s.color }} />
      {s.label}
    </span>
  );
};

const MediumIcon = ({ medium, size = 14 }) =>
  medium === "strom" ? (
    <Zap size={size} style={{ color: C.strom }} />
  ) : (
    <Flame size={size} style={{ color: C.gas }} />
  );

/* Datei vollständig einlesen, damit sie später geöffnet und heruntergeladen werden kann */
/* Ein Dateifeld kann eine einzelne Datei (ältere Vorgänge) oder eine Liste enthalten.
   dateienVon liefert immer eine Liste, leer wenn nichts hinterlegt ist. */
const dateienVon = (x) => (!x ? [] : Array.isArray(x) ? x.filter(Boolean) : [x]);

function dateiLesen(file, fertig) {
  const r = new FileReader();
  r.onload = () =>
    fertig({ name: file.name, typ: file.type || "", groesse: file.size, url: r.result });
  r.readAsDataURL(file);
}

/* Safari blockiert Links auf Daten-URLs. Deshalb wird die Datei in ein
   Blob-Objekt umgewandelt und darüber geöffnet oder gespeichert. */
function blobVon(datei) {
  const teile = String(datei.url || "").split(",");
  const typ = (teile[0].match(/data:([^;]+)/) || [])[1] || "application/octet-stream";
  const roh = atob(teile[1] || "");
  const feld = new Uint8Array(roh.length);
  for (let i = 0; i < roh.length; i++) feld[i] = roh.charCodeAt(i);
  return new Blob([feld], { type: typ });
}

/* Dateien aus dem Dateispeicher erst holen. Das Fenster wird sofort geöffnet,
   sonst blockiert Safari es nach dem Warten als Werbefenster. */
async function abgelegteOeffnen(datei) {
  const fenster = window.open("", "_blank");
  try {
    const voll = { ...datei, url: await dateiInhalt(datei) };
    const url = URL.createObjectURL(blobVon(voll));
    if (fenster) fenster.location.href = url; else location.href = url;
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (e) {
    if (fenster) fenster.close();
    alert("Die Datei konnte nicht geladen werden: " + ((e && e.message) || e));
  }
}

/* PDFs öffnen im eigenen Betrachter im Portal. In der iPhone-App vom Home-Bildschirm gibt es keine
   neuen Fenster: ein Blob-Fenster ersetzt dort das ganze Portal und es gibt keinen Weg zurück. */
let PDF_ZEIGEN = null;
const istPdf = (d) => !!d && (/pdf/i.test(d.typ || "") || /\.pdf$/i.test(d.name || ""));

function dateiOeffnen(datei) {
  if (istPdf(datei) && PDF_ZEIGEN) { PDF_ZEIGEN(datei); return; }
  if (!datei.url && datei.pfad) return abgelegteOeffnen(datei);
  try {
    const url = URL.createObjectURL(blobVon(datei));
    const fenster = window.open(url, "_blank");
    if (!fenster) location.href = url;
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (e) { /* Datei nicht lesbar */ }
}

function dateiLaden(datei) {
  if (!datei.url && datei.pfad) return abgelegteOeffnen(datei);
  try {
    const url = URL.createObjectURL(blobVon(datei));
    const a = document.createElement("a");
    a.href = url;
    a.download = datei.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (e) { /* Datei nicht lesbar */ }
}

const kb = (n) => (!n ? "" : n > 1048576 ? num(n / 1048576, 1) + " MB" : num(n / 1024, 0) + " KB");

let pdfjsLaden = null;
const ladePdfjs = () => {
  if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
  if (!pdfjsLaden)
    pdfjsLaden = new Promise((fertig, fehler) => {
      const s = document.createElement("script");
      s.src = "/assets/pdfjs-3.11.174/pdf.min.js";
      s.onload = () => {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = "/assets/pdfjs-3.11.174/pdf.worker.min.js";
        fertig(window.pdfjsLib);
      };
      s.onerror = () => { pdfjsLaden = null; fehler(new Error("PDF-Anzeige konnte nicht geladen werden.")); };
      document.head.appendChild(s);
    });
  return pdfjsLaden;
};

/* PDF im Portal anzeigen: jede Seite als Bild, mit Herunterladen und Schließen */
function PdfBetrachter({ datei, onSchliessen }) {
  const flaeche = React.useRef(null);
  const [stand, setStand] = useState("Wird geladen …");
  const [seiten, setSeiten] = useState(0);
  const [fehler, setFehler] = useState(false);
  /* Ausweg, wenn die Anzeige im Portal scheitert: mit dem PDF-Programm des Geräts öffnen */
  const imGeraetOeffnen = () => {
    if (!datei.url && datei.pfad) { abgelegteOeffnen(datei); return; }
    try { const u = URL.createObjectURL(blobVon(datei)); if (!window.open(u, "_blank")) location.href = u; } catch (e) { dateiLaden(datei); }
  };
  useEffect(() => {
    let abbruch = false;
    (async () => {
      try {
        const [pdfjs, url] = await Promise.all([ladePdfjs(), datei.url ? Promise.resolve(datei.url) : dateiInhalt(datei)]);
        const roh = atob(String(url).split(",")[1] || "");
        const bytes = new Uint8Array(roh.length);
        for (let i = 0; i < roh.length; i++) bytes[i] = roh.charCodeAt(i);
        const pdf = await pdfjs.getDocument({ data: bytes }).promise;
        if (abbruch) return;
        setSeiten(pdf.numPages); setStand("");
        const ziel = flaeche.current;
        const breite = Math.min(ziel.clientWidth - 16, 900);
        const dichte = Math.min(window.devicePixelRatio || 1, 2);
        for (let n = 1; n <= pdf.numPages && !abbruch; n++) {
          const seite = await pdf.getPage(n);
          const v1 = seite.getViewport({ scale: 1 });
          const vp = seite.getViewport({ scale: (breite / v1.width) * dichte });
          const c = document.createElement("canvas");
          c.width = vp.width; c.height = vp.height;
          Object.assign(c.style, { width: breite + "px", height: (vp.height / dichte) + "px", display: "block",
            margin: "0 auto 12px", background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,.25)" });
          ziel.appendChild(c);
          await seite.render({ canvasContext: c.getContext("2d"), viewport: vp }).promise;
        }
      } catch (e) {
        if (!abbruch) {
          setFehler(true);
          setStand("Die PDF konnte im Portal nicht angezeigt werden (" + ((e && (e.name || e.message)) || e) + ")."
            + " Die Datei ist trotzdem gespeichert. Öffne sie mit dem PDF-Programm des Geräts oder lade sie herunter.");
        }
      }
    })();
    return () => { abbruch = true; };
  }, [datei]);
  return createPortal(
    <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, left: 0, zIndex: 60, background: "#3B4654",
                  display: "flex", flexDirection: "column", fontFamily: FONT }}>
      <div className="flex items-center gap-2 px-3 py-2"
           style={{ background: C.ink, color: "#fff", paddingTop: "max(8px, env(safe-area-inset-top))" }}>
        <button onClick={onSchliessen} className="flex items-center gap-1 text-sm px-2 py-1.5 rounded" style={{ background: C.inkSoft }}>
          <ArrowLeft size={16} /> Zurück
        </button>
        <span className="flex-1 min-w-0 truncate text-sm px-1">{datei.name}{seiten ? " · " + seiten + " Seiten" : ""}</span>
        <button onClick={() => dateiLaden(datei)} className="text-sm px-2 py-1.5 rounded" style={{ background: C.inkSoft }}>
          Herunterladen
        </button>
      </div>
      <div ref={flaeche} style={{ flex: 1, overflowY: "auto", padding: "12px 8px", WebkitOverflowScrolling: "touch" }}>
        {stand && <p className="text-sm text-center mt-10 mx-auto" style={{ color: "#fff", maxWidth: "46ch" }}>{stand}</p>}
        {fehler && (
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            <button onClick={imGeraetOeffnen} className="px-4 py-2 rounded text-sm" style={{ background: "#fff", color: C.ink }}>
              Mit dem Gerät öffnen
            </button>
            <button onClick={() => dateiLaden(datei)} className="px-4 py-2 rounded text-sm" style={{ background: C.inkSoft, color: "#fff" }}>
              Herunterladen
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

/* Anzeige einer Datei mit Öffnen und Herunterladen */
function DateiChip({ datei, label, klein }) {
  if (Array.isArray(datei)) {
    const liste = dateienVon(datei);
    if (!liste.length) return null;
    if (liste.length === 1) return <DateiChip datei={liste[0]} label={label} klein={klein} />;
    return (
      <div className="space-y-1.5">
        {liste.map((d, i) => <DateiChip key={i} datei={d} label={label ? label + " " + (i + 1) : ""} klein={klein} />)}
      </div>
    );
  }
  if (!datei) return null;
  const inhalt = (
    <>
      <FileText size={klein ? 14 : 15} style={{ color: datei.url || datei.pfad ? C.strom : C.muted }} />
      <span className="flex-1 min-w-0 truncate">{datei.name}</span>
      {datei.groesse ? (
        <span className="text-xs" style={{ color: C.muted }}>{kb(datei.groesse)}</span>
      ) : null}
      {label && <span className="text-xs" style={{ color: C.muted }}>{label}</span>}
    </>
  );
  const stil = {
    border: "1px solid " + C.line,
    background: "#F6F8FA",
    textDecoration: "none",
    color: C.text,
  };
  if (!datei.url && !datei.pfad)
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded text-sm" style={stil}>
        {inhalt}
      </div>
    );
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded text-sm" style={stil}>
      {inhalt}
      <button onClick={() => dateiOeffnen(datei)} className="text-xs px-2 py-1 rounded"
              style={{ border: "1px solid " + C.line, background: "#fff", color: C.strom }}>öffnen</button>
      <button onClick={() => dateiLaden(datei)} className="text-xs px-2 py-1 rounded"
              style={{ border: "1px solid " + C.line, background: "#fff", color: C.strom }}>laden</button>
    </div>
  );
}

const Datei = ({ label, datei, onSet, hinweis, bild, mehrere, annehmen }) => {
  const liste = dateienVon(datei);
  const accept = annehmen || (bild ? "image/*" : undefined);
  /* Mehrere Dateien: Liste mit Entfernen je Datei und „+ Weitere Datei“. Leere Liste wird zu null,
     damit Pflichtprüfungen (!feld) unverändert greifen. */
  if (mehrere || Array.isArray(datei)) {
    const setzen = (neu) => onSet(neu.length ? neu : null);
    const hinzu = async (files) => {
      const neu = await Promise.all([...files].map((f) => new Promise((ok) => dateiLesen(f, ok))));
      setzen([...liste, ...neu]);
    };
    return (
      <div>
        <span className="block text-xs mb-1" style={{ color: C.muted }}>{label}</span>
        <div className="space-y-1.5">
          {liste.map((d, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="flex-1 min-w-0"><DateiChip datei={d} /></div>
              <button onClick={() => setzen(liste.filter((_, x) => x !== i))} style={{ color: C.muted }}
                      title="Datei entfernen" aria-label="Datei entfernen">
                <X size={15} />
              </button>
            </div>
          ))}
          <label className="flex items-center gap-2 px-3 py-2 rounded text-sm cursor-pointer"
                 style={{ border: "1px dashed " + C.line, color: liste.length ? C.strom : C.muted, background: "#fff" }}>
            {liste.length ? <Plus size={14} /> : <Upload size={14} />}
            <span>{liste.length ? "Weitere Datei hinzufügen" : (hinweis || "Datei auswählen")}</span>
            <input type="file" multiple className="hidden" accept={accept}
              onChange={(e) => { const f = e.target.files; if (f && f.length) hinzu(f); e.target.value = ""; }} />
          </label>
        </div>
      </div>
    );
  }
  return (
  <div>
    <span className="block text-xs mb-1" style={{ color: C.muted }}>{label}</span>
    {datei ? (
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0"><DateiChip datei={datei} /></div>
        <button onClick={() => onSet(null)} style={{ color: C.muted }}>
          <X size={15} />
        </button>
      </div>
    ) : (
      <label
        className="flex items-center gap-2 px-3 py-2 rounded text-sm cursor-pointer"
        style={{ border: "1px dashed " + C.line, color: C.muted, background: "#fff" }}
      >
        <Upload size={14} />
        <span>{hinweis || "Datei auswählen"}</span>
        <input
          type="file"
          className="hidden"
          accept={accept}
          onChange={(e) => {
            const f = e.target.files && e.target.files[0];
            if (f) dateiLesen(f, onSet);
          }}
        />
      </label>
    )}
  </div>
  );
};

/* Provisionsaufteilung – zeigt je nach Rolle alles oder nur den eigenen Anteil */
function Provisionsblock({ a, mitarbeiter, user, laufzeit, variante, ohneHinweis }) {
  const gesamt = gesamtprovision(a, variante);
  const v = gesamtverteilung(a, mitarbeiter, gesamt, undefined, variante);
  /* Die gesamte ausgeschüttete Provision sehen nur Geschäftsführung und Finanzbuchhaltung.
     Teamleiter und Vertriebsleitung sehen ausschließlich ihren eigenen Anteil. */
  const sichtStruktur = ["Geschäftsführung", "Finanzbuchhaltung"].includes(user.rolle);
  const sichtGesamt = sichtStruktur;
  const sichtFirma = user.rolle === "Geschäftsführung";
  /* Die Kalkulation sieht den Anteil des Vertriebspartners und den Aufschlag,
     nicht die Gesamtprovision und nicht die Aufteilung in der Struktur. */
  const istKalkSicht = user.rolle === "Kalkulation";
  const zeilen = sichtStruktur ? v.anteile : v.anteile.filter((x) => x.id === user.id);
  /* Lieferjahre: bei Lieferstellen mit eigener Laufzeit die längste; je Jahr zählen nur die Lieferstellen, die noch laufen */
  const stellenP = provisionsStellen(a, variante);
  const einheitlich = new Set(stellenP.map((s) => lieferjahreAus(s.monate))).size <= 1;
  const jahre = laufzeit ? (einheitlich ? laufzeit / 12 : lieferjahreVon(a, variante)) : 0;
  const mengeP = stellenP.length ? stellenP.reduce((t, s) => t + s.menge, 0) : verbrauchGesamt(a);
  const eigen = v.anteile.find((x) => x.id === user.id);
  const partner = v.anteile.find((x) => beteiligte(a).some((b) => b.id === x.id));
  const kopfVon = (vv) => {
    const e = vv.anteile.find((x) => x.id === user.id);
    const p = vv.anteile.find((x) => beteiligte(a).some((b) => b.id === x.id));
    return sichtGesamt ? gesamt : istKalkSicht ? (p ? p.betrag : 0) : e ? e.betrag : 0;
  };
  const kopfBetrag = kopfVon(v);
  /* über die Laufzeit: ein einmaliger Tippgeber fällt nur im 1. Lieferjahr an */
  const kopfGesamt = jahre
    ? Array.from({ length: Math.max(1, Math.round(jahre)) }, (_, i) =>
        kopfVon(i ? gesamtverteilung(a, mitarbeiter, gesamtprovision(a, variante, i + 1), i + 1, variante) : v)).reduce((t, x) => t + x, 0)
    : 0;
  /* Vor der Bestätigung des Versorgers ist die Provision nur eine Vorschau: maßgeblich ist
     die bestätigte Liefermenge. Verbraucht der Kunde weniger, sinkt die Provision. */
  const mitMenge = !!a.bestaetigung && !variante;
  const vorlaeufig = !sichtStruktur && !istKalkSicht && !mitMenge;
  const tg = v.tippgeber;
  const sichtTippgeber = tg && (sichtStruktur || tg.besitzerId === user.id || tg.traegerId === user.id);

  return (
    <div className="rounded p-4" style={{ background: "#F6F8FA", border: "1px solid " + C.line }}>
      <div className="flex items-baseline justify-between mb-3">
        <span className="text-xs" style={{ color: C.muted }}>
          {sichtGesamt ? "Gesamtprovision je Lieferjahr"
            : istKalkSicht ? "Provision des Vertriebspartners je Lieferjahr"
            : vorlaeufig ? "Deine voraussichtliche Provision je Lieferjahr"
            : "Deine Provision je Lieferjahr"}
        </span>
        <span className="text-2xl whitespace-nowrap ml-3" style={{ fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}>
          {eur(kopfBetrag)}
        </span>
      </div>
      {(a.akquiseArt || "eigen") === "eigen" && BONUS_EIGENAKQUISE > 0 && (
        <div className="text-xs mb-2 px-2 py-1 rounded inline-block"
             style={{ background: "#F1F7F0", color: C.ok }}>
          Eigenakquise · {num(BONUS_EIGENAKQUISE, 0)} Prozentpunkte Bonus
        </div>
      )}
      <div className="text-xs mb-3" style={{ color: C.muted }}>
        {istKalkSicht
          ? (partner ? partner.name + " · " + num(partner.satz, 0) + " % · " : "") +
            "Aufschlag für den Vertrieb " + aufschlagText(a, variante)
            + (mitVerdecktemAufschlag(a, variante) ? " · tatsächlich " + aufschlagText(a, variante, true) : "")
          : a.bestaetigung && sichtGesamt && !variante
          ? "bestätigt: " + num(bestaetigteMenge(a)) + " kWh × " + aufschlagText(a, undefined, true)
            + (mitVerdecktemAufschlag(a) ? " (dem Vertrieb mitgeteilt " + aufschlagText(a) + ")" : "")
          : sichtGesamt
          ? num(mengeP) + " kWh × " + aufschlagText(a, variante, true)
            + (mitVerdecktemAufschlag(a, variante) ? " (dem Vertrieb mitgeteilt " + aufschlagText(a, variante) + ")" : "")
          : num(eigenerSatzVon(user), 0) + " % Provisionssatz auf " + (mitMenge
              ? num(bestaetigteMenge(a)) + " kWh bestätigte Liefermenge"
              : num(mengeP) + " kWh laut Anfrage")}
        {jahre ? " · über " + (einheitlich ? jahreText(laufzeit) : "bis zu " + jahreText(jahre * 12) + " (je Lieferstelle)") + " " + eur(kopfGesamt) : ""}
      </div>

      {vorlaeufig && eigen && !ohneHinweis && (
        <div className="text-xs mb-3 px-2 py-1.5 rounded" style={{ background: "#FFF8EC", color: C.gas }}>
          Gilt bei bestätigter Liefermenge. Berechnet aus dem Jahresverbrauch laut Anfrage; bestätigt der Versorger
          weniger, sinkt die Provision entsprechend. Endgültig bestätigen Vertragsmanagement und Geschäftsführung.
        </div>
      )}

      {sichtTippgeber && (
        <div className="text-xs mb-3 px-2 py-1.5 rounded" style={{ background: "#FFF8EC", color: C.gas }}>
          Über Tippgeber gewonnen: {tg.name}{tg.art ? " · " + tippgeberText(tg) : ""}
          {tg.art === "kwh" && tg.betrag > 0 && <> · erhält einmalig {eur(tg.betrag)}</>}
          {tg.art === "prozent" && tg.betrag > 0 && <> · erhält {eur(tg.betrag)} je Lieferjahr</>}
          {tg.traegerId
            ? (tg.abzug > 0 ? <>. Vom Anteil des Vertriebspartners abgezogen: {eur(tg.abzug)} im 1. Lieferjahr
                {tg.art === "kwh" && tg.abzug < tg.betrag ? ", der Rest in den folgenden Lieferjahren" : ""}.</> : ".")
            : ". Kein Vertriebspartner am Vorgang: EGC trägt die Vergütung."}
        </div>
      )}

      {sichtStruktur && zeilen.map((z) => istGFRolle(z) ? (
        /* Geschäftsführung am Vorgang: ihr steht der Firmenanteil zu, nach allen Auszahlungen */
        <div key={z.id} className="flex items-center gap-3 py-1.5 text-sm" style={{ borderTop: "1px solid " + C.line }}>
          <span className="flex-1">{z.name}
            <span className="block text-xs" style={{ color: C.muted }}>
              Geschäftsführung · Firmenanteil {num(firmenanteilVorgang(a), 0)} %{sichtFirma ? " abzüglich aller Auszahlungen" : ""}
            </span>
          </span>
          <span className="text-right" style={{ fontVariantNumeric: "tabular-nums", color: z.id === user.id ? C.ok : C.text }}>
            {sichtFirma ? eur(v.firma) : "–"}
          </span>
        </div>
      ) : (
        <div key={z.id} className="flex items-center gap-3 py-1.5 text-sm"
             style={{ borderTop: "1px solid " + C.line }}>
          <span className="flex-1">
            {z.name}
            <span className="block text-xs" style={{ color: C.muted }}>
              {z.overhead ? "Overhead-Provision · " : ""}{z.rolle} · {num(z.satz, 0)} Prozentpunkte
              {z.bonus > 0 ? " + " + num(BONUS_EIGENAKQUISE, 0) + " Bonus Eigenakquise" : ""}
            </span>
            {z.bonus > 0 && (
              <span className="block text-xs" style={{ color: C.gruen }}>
                davon {eur(z.bonus)} Bonus für selbst gewonnenen Kunden
              </span>
            )}
            {z.tippgeberAbzug > 0 && (
              <span className="block text-xs" style={{ color: C.gas }}>
                abzüglich {eur(z.tippgeberAbzug)} für den Tippgeber
              </span>
            )}
          </span>
          <span className="text-right">
            <span className="block" style={{ fontVariantNumeric: "tabular-nums",
                  color: z.id === user.id ? C.ok : C.text }}>{eur(z.betrag)}</span>
            {(() => {
              const aus = a.ausgezahlt || {};
              const bezahlt = Object.keys(aus).filter((k) =>
                k === z.id || k.startsWith(z.id + ":")).length;
              return bezahlt ? (
                <span className="text-xs" style={{ color: C.ok }}>
                  {bezahlt} von {faelligkeiten(a).length} Lieferjahren ausgezahlt
                </span>
              ) : null;
            })()}
          </span>
        </div>
      ))}

      {sichtStruktur && tg && tg.betrag > 0 && (
        <div className="flex items-center gap-3 py-1.5 text-sm" style={{ borderTop: "1px solid " + C.line }}>
          <span className="flex-1">{tg.name}
            <span className="block text-xs" style={{ color: C.muted }}>Tippgeber · {tippgeberText(tg)}</span>
          </span>
          <span style={{ fontVariantNumeric: "tabular-nums" }}>{eur(tg.betrag)}</span>
        </div>
      )}

      {a.bestaetigung && a.bestaetigung.bonusArt !== "keine" && parseFloat(a.bestaetigung.bonus) > 0 && (
        <div className="flex items-center gap-3 py-1.5 text-sm" style={{ borderTop: "1px solid " + C.line }}>
          <span className="flex-1">Bonuszahlung Versorger
            <span className="block text-xs" style={{ color: C.muted }}>
              {a.bestaetigung.bonusArt === "jaehrlich" ? "pro Lieferjahr" : "einmalig"}
            </span>
          </span>
          <span style={{ fontVariantNumeric: "tabular-nums" }}>
            {eur(parseFloat(a.bestaetigung.bonus) || 0)}
          </span>
        </div>
      )}

      {sichtFirma && !(sichtStruktur && zeilen.some(istGFRolle)) && (
        <div className="flex items-center gap-3 py-1.5 text-sm" style={{ borderTop: "1px solid " + C.line }}>
          <span className="flex-1">Verbleibt in der Firma</span>
          <span style={{ fontVariantNumeric: "tabular-nums" }}>{eur(v.firma)}</span>
        </div>
      )}

      {!sichtStruktur && !istKalkSicht && !eigen && (
        <p className="text-sm" style={{ color: C.muted }}>Für dich fällt bei diesem Vorgang keine Provision an.</p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Anfrage-Assistent                                                  */
/* Abrechnung auslesen: Vorschlag übernehmen, danach muss der Partner bestätigen.
   Die Werte bleiben in den Feldern jederzeit änderbar. */
function AbrechnungAuslesen({ l, setL, user }) {
  const [laeuft, setLaeuft] = useState(false);
  const [meldung, setMeldung] = useState("");
  const dateien = dateienVon(l.abrechnung);
  const au = l.auslesung;
  if (!dateien.length && !au) return null;

  const auslesen = async () => {
    setLaeuft(true); setMeldung("");
    try {
      let text = "";
      const pdfs = dateien.filter(istPdf);
      for (const d of pdfs) text += (await pdfText(d)) + "\n";
      if (!pdfs.length) await fotoText();
      const werte = abrechnungAuswerten(text, VERSORGER.map((v) => v.name));
      const gefunden = ABRECHNUNG_FELDER.filter((f) => werte[f.k]);
      if (!gefunden.length) {
        setMeldung("In der Abrechnung wurden keine Werte erkannt. Bitte die Felder von Hand ausfüllen.");
      } else {
        gefunden.forEach((f) => setL(l.id, f.k, werte[f.k]));
        if (werte.versorger) setL(l.id, "versorgerVon", "manuell");
        setL(l.id, "auslesung", { datum: heute(), werte, bestaetigt: false });
        setMeldung("");
      }
    } catch (e) {
      setMeldung((e && e.message) || "Die Abrechnung konnte nicht gelesen werden.");
    }
    setLaeuft(false);
  };

  const offen = au && !au.bestaetigt;
  return (
    <div className="sm:col-span-2 space-y-2">
      {dateien.length > 0 && (!au || au.bestaetigt) && (
        <button onClick={auslesen} disabled={laeuft}
          className="inline-flex items-center gap-2 px-3 py-2 rounded text-sm"
          style={{ border: "1px solid " + C.strom, color: C.strom, background: "#fff", opacity: laeuft ? 0.6 : 1 }}>
          <FileText size={15} /> {laeuft ? "Abrechnung wird gelesen …" : au ? "Abrechnung erneut auslesen" : "Daten aus der Abrechnung auslesen"}
        </button>
      )}
      {meldung && <p className="text-xs" style={{ color: laeuft ? C.muted : C.warn }}>{meldung}</p>}
      {offen && (
        <div className="p-3 rounded text-sm" style={{ background: "#FBF6EE", border: "1px solid " + C.gas }}>
          <div className="mb-2" style={{ color: C.gas }}>
            <strong>Bitte prüfen:</strong> Diese Werte hat das Portal aus der Abrechnung gelesen und in die Felder
            eingetragen. Vergleiche sie mit der Abrechnung und korrigiere sie bei Bedarf in den Feldern.
          </div>
          <ul className="space-y-1 mb-3">
            {ABRECHNUNG_FELDER.filter((f) => au.werte[f.k]).map((f) => (
              <li key={f.k} className="flex flex-wrap gap-x-2">
                <span style={{ color: C.muted }}>{f.label}:</span>
                <strong>{f.k === "verbrauch" && zahlLesen(l[f.k]) > 0 ? num(zahlLesen(l[f.k]), 0)
                  : f.k === "vertragsendeAlt" && l[f.k] ? datum(l[f.k]) : String(l[f.k] || "")}</strong>
                {String(l[f.k] || "") !== String(au.werte[f.k]) && (
                  <span className="text-xs" style={{ color: C.muted }}>(von dir geändert, gelesen: {au.werte[f.k]})</span>
                )}
              </li>
            ))}
          </ul>
          <Btn variante="ok" icon={Check}
            onClick={() => setL(l.id, "auslesung", { ...au, bestaetigt: true, bestaetigtVon: user ? user.name : "", bestaetigtAm: heute() })}>
            Daten geprüft und richtig
          </Btn>
        </div>
      )}
      {au && au.bestaetigt && (
        <p className="text-xs" style={{ color: C.muted }}>
          Aus der Abrechnung gelesen und bestätigt{au.bestaetigtVon ? " von " + au.bestaetigtVon : ""}
          {au.bestaetigtAm ? " am " + datum(au.bestaetigtAm) : ""}. Die Werte kannst du oben jederzeit ändern.
        </p>
      )}
    </div>
  );
}

/* Kalkulation: Smartmeter-Angebot mit Positionen je Lieferstelle, Vorlagen und Texten */
const smartmeterStart = (a) => ({
  positionen: (a.lieferstellen || []).flatMap((l) => (SMARTMETER.vorlagen || []).map((v) => ({ id: uid(), lieferstelle: l.id, ...v }))),
  texte: { titel1: SMARTMETER.titel1, titel2: SMARTMETER.titel2, unterzeile: SMARTMETER.unterzeile,
           kacheln: (SMARTMETER.kacheln || []).map((k) => ({ ...k })), einbau: SMARTMETER.einbau, annahme: SMARTMETER.annahme, hinweis: SMARTMETER.hinweis },
});
const Assistent = teilKomponente("vorgang", "Assistent");   /* in vorgang.jsx */
function Lieferbestaetigung({ a, user, onUpdate }) {
  const stellen = (a.bestaetigung && a.bestaetigung.stellen) || {};
  const ersterBeginn = Object.values(stellen).map((x) => x && x.beginn).filter(Boolean).sort()[0] || "";
  const [lb, setLb] = useState({ lieferbeginn: ersterBeginn, vertragsnummer: "", dokument: null, notiz: "" });
  return (
    <div className="rounded p-5" style={{ background: "#FDF9EC", border: "1px solid " + C.gold }}>
      <div className="text-sm mb-1">Neue Lieferbestätigung</div>
      <p className="text-sm mb-4" style={{ color: C.muted, maxWidth: "62ch" }}>
        Der Versorger hat den Auftrag bestätigt{a.bestaetigung && a.bestaetigung.versorger ? " (" + a.bestaetigung.versorger + ")" : ""},
        die Geschäftsführung hat den Provisionseingang erfasst. Erfasse jetzt die Lieferbestätigung. Erst danach sieht der
        Vertriebspartner „Vom Versorger bestätigt“ und seine Provision.
      </p>
      <div className="grid sm:grid-cols-2 gap-4">
        <Feld label="Bestätigter Lieferbeginn" type="date" value={lb.lieferbeginn} onChange={(v) => setLb({ ...lb, lieferbeginn: v })} />
        <Feld label="Vertrags- oder Kundennummer beim Versorger" value={lb.vertragsnummer} onChange={(v) => setLb({ ...lb, vertragsnummer: v })} />
      </div>
      <div className="mt-4">
        <Datei mehrere label="Lieferbestätigung des Versorgers (freiwillig)" datei={lb.dokument}
          onSet={(f) => setLb({ ...lb, dokument: f })} hinweis="PDF hochladen" />
      </div>
      <div className="mt-4">
        <Btn variante="ok" icon={Check} disabled={!lb.lieferbeginn}
          onClick={() => onUpdate({ ...a, lieferbestaetigung: { ...lb, von: user.name, datum: heute() },
            vertragsStatus: a.vertragsStatus || "Lieferung aktiv",
            verlauf: [...a.verlauf, { d: heute(), t: "Lieferbestätigung erfasst, Lieferbeginn " + datum(lb.lieferbeginn), w: user.name }] })}>
          Lieferbestätigung erfassen
        </Btn>
      </div>
    </div>
  );
}

const UmlagenPflege = teilKomponente("innendienst", "UmlagenPflege");   /* in innendienst.jsx */
/* Kurzinfo zur Angebotsanfrage für die Kalkulation */
function kurzinfoZeilen(a) {
  const st = a.lieferstellen || [];
  const summe = (m) => st.filter((l) => l.medium === m).reduce((t, l) => t + (zahlLesen(l.verbrauch) || 0), 0);
  const hatGas = st.some((l) => l.medium === "gas"), hatStrom = st.some((l) => l.medium === "strom");
  const k = a.kunde || {};
  const modell = [hatStrom ? "Strom: " + (a.produkt || "–") : null, hatGas ? "Erdgas: " + (a.produktGas || a.produkt || "–") : null].filter(Boolean).join(" · ");
  return {
    kopf: [
      ["Kunde", k.firma || "–"],
      ["Anschrift", [k.strasse, [k.plz, k.ort].filter(Boolean).join(" ")].filter(Boolean).join(", ") || "–"],
      ["Branche", k.branche || "–"],
      ["Lieferbeginn", a.wunschLieferbeginn ? datum(a.wunschLieferbeginn) : "offen"],
      ["Lieferende", a.laufzeitArt === "ende" ? (a.wunschLieferende ? datum(a.wunschLieferende) : "offen")
        : (a.wunschLieferende ? datum(a.wunschLieferende) : a.laufzeit ? a.laufzeit + " Monate Laufzeit" : "offen")],
      ["Beschaffungsmodell", modell || "–"],
      ...(a.smartmeter ? [["Smartmeter", "gewünscht, MeLo-ID je Lieferstelle angegeben"]] : []),
      ["Aufschlag", num(zahlLesen(a.aufschlag) || 0, 3) + " ct/kWh"],
      ...(hatStrom ? [["Verbrauch Strom gesamt", num(summe("strom")) + " kWh"]] : []),
      ...(hatGas ? [["Verbrauch Erdgas gesamt", num(summe("gas")) + " kWh"]] : []),
    ],
    stellen: st.map((l) => ({
      titel: (l.medium === "gas" ? "Erdgas" : "Strom") + (l.bezeichnung ? " · " + l.bezeichnung : "") + " · " + (l.zaehlerart || "SLP"),
      adresse: [l.strasse, [l.plz, l.ort].filter(Boolean).join(" ")].filter(Boolean).join(", ") || "–",
      verbrauch: num(zahlLesen(l.verbrauch) || 0) + " kWh",
      spitze: l.zaehlerart === "RLM" ? (l.lastspitze ? num(zahlLesen(l.lastspitze), 1) + " kW" : "nicht angegeben") : null,
    })),
  };
}
function Kurzinfo({ a, onSchliessen }) {
  const [kopiert, setKopiert] = useState(false);
  const z = kurzinfoZeilen(a);
  const text = [a.id, ...z.kopf.map(([k, v]) => k + ": " + v), "", "Lieferstellen:",
    ...z.stellen.map((l) => "- " + l.titel + ", " + l.adresse + ", " + l.verbrauch + (l.spitze ? ", Lastspitze " + l.spitze : ""))].join("\n");
  return (
    <div className="rounded p-4 mb-5" style={{ background: C.card, border: "1px solid " + C.gruen }}>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <span className="text-sm">Kurzinfo zur Anfrage</span>
        <span className="flex gap-3">
          <button className="text-xs underline" style={{ color: C.strom }}
            onClick={async () => { try { await navigator.clipboard.writeText(text); setKopiert(true); } catch (e) { /* von Hand */ } }}>
            {kopiert ? "Kopiert" : "Kopieren"}</button>
          <button className="text-xs underline" style={{ color: C.muted }} onClick={onSchliessen}>Schließen</button>
        </span>
      </div>
      <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
        {z.kopf.map(([k, v]) => (
          <div key={k} className="flex gap-2"><span className="w-40 shrink-0" style={{ color: C.muted }}>{k}</span><span>{v}</span></div>
        ))}
      </div>
      <div className="mt-3 pt-3 space-y-2" style={{ borderTop: "1px solid " + C.line }}>
        {z.stellen.map((l, i) => (
          <div key={i} className="text-sm">
            <div>{l.titel}</div>
            <div className="text-xs" style={{ color: C.muted }}>{l.adresse} · {l.verbrauch}{l.spitze ? " · Lastspitze " + l.spitze : ""}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* Angebot an den Kunden senden (persönlicher Link) und verfolgen: geöffnet, angesehen, unterschrieben.
   Name und Unterschrift fragt die Kundenseite immer ab; die übrigen Felder hakt der Vertriebspartner an. */
const KUNDENFELDER = [
  ["iban", "IBAN (Lastschriftmandat)"],
  ["funktion", "Funktion im Unternehmen"],
  ["geburtsdatum", "Geburtsdatum"],
  ["steuernummer", "Steuernummer oder USt-IdNr."],
];
const zeitDe = (iso) => {
  try {
    return new Date(iso).toLocaleString("de-DE", { timeZone: "Europe/Berlin", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) + " Uhr";
  } catch (e) { return iso || ""; }
};

const Detail = teilKomponente("vorgang", "Detail");   /* in vorgang.jsx */
/* ------------------------------------------------------------------ */
/*  Listen                                                             */
/* ------------------------------------------------------------------ */
function Liste({ anfragen, onOeffnen, leerText }) {
  if (anfragen.length === 0)
    return (
      <div className="rounded p-8 text-center text-sm"
           style={{ border: "1px dashed " + C.line, color: C.muted }}>{leerText}</div>
    );
  return (
    <div className="rounded overflow-hidden" style={{ background: C.card, border: "1px solid " + C.line }}>
      {anfragen.map((a, i) => (
        <button key={a.id} onClick={() => onOeffnen(a.id)}
          className="w-full text-left px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-1"
          style={{ borderTop: i ? "1px solid " + C.line : "none",
                   background: a.einreichung ? "#FDF9EC" : "transparent" }}>
          <div className="flex gap-1 w-10">
            {a.lieferstellen.some((l) => l.medium === "strom") && <MediumIcon medium="strom" />}
            {a.lieferstellen.some((l) => l.medium === "gas") && <MediumIcon medium="gas" />}
          </div>
          <div className="flex-1 min-w-40">
            <div className="text-sm">{a.kunde.firma || "Neue Anfrage"}</div>
            <div className="text-xs" style={{ color: C.muted }}>
              {a.kunde.branche ? a.kunde.branche + " · " : ""}
              {a.id} · {aktiveVariante(a) ? aktiveVariante(a).produkt : a.produkt} · {laufzeitVon(a)} Mon. · {a.partnerName}
            </div>
          </div>
          <div className="text-sm text-right w-28" style={{ fontVariantNumeric: "tabular-nums" }}>
            {num(verbrauchGesamt(a))} kWh
          </div>
          <div className="w-44 min-w-0">
            <StatusPunkt status={a.status} a={a} umbrechen />
            {liegezeit(a) > 3 && !["abgeschlossen", "abgelehnt"].includes(a.status) && (
              <span className="block text-xs"
                    style={{ color: liegezeit(a) > 10 ? C.warn : C.muted }}>
                seit {num(liegezeit(a))} Tagen
              </span>
            )}
            {a.einreichung && (
              <span className="block text-xs" style={{ color: C.gold }}>in Einreichung</span>
            )}
          </div>
          <ChevronRight size={15} style={{ color: C.muted }} />
        </button>
      ))}
    </div>
  );
}

/* „Alle Vorgänge“ mit Reitern je Status. Der Vertrieb sieht die Status so, wie sie bei ihm heißen (statusVon). */
const STATUS_REITER = [
  { id: "eingereicht", label: "Bei Kalkulation", f: (a) => a.status === "eingereicht" },
  { id: "angefragt", label: "Beim Versorger angefragt", f: (a) => a.status === "angefragt" },
  { id: "ruecksprache", label: "Rücksprache Geschäftsführung", f: (a) => a.status === "ruecksprache" },
  { id: "klaerfall", label: "Daten fehlen", f: (a) => a.status === "klaerfall" },
  { id: "angebotVP", label: "Angebot beim Vertriebspartner", f: (a) => a.status === "angebot" && !a.angebotVersendet },
  { id: "angebotKunde", label: "Angebot beim Kunden", f: (a) => a.status === "angebot" && !!a.angebotVersendet },
  { id: "uebermittelt", label: "Bereit zum Einreichen", f: (a) => a.status === "uebermittelt" },
  { id: "einreichung", label: "An Versorger übermittelt", f: (a) => a.status === "einreichung" },
  { id: "bestaetigt", label: "Bestätigt, Provision offen", f: (a) => a.status === "bestaetigt" },
  { id: "lb", label: "Lieferbestätigung offen", f: (a) => a.status === "abgeschlossen" && !a.lieferbestaetigung },
  { id: "abgeschlossen", label: "Abgeschlossen", f: (a) => a.status === "abgeschlossen" && !!a.lieferbestaetigung },
  { id: "abgelehnt", label: "Abgelehnt", f: (a) => a.status === "abgelehnt" },
  { id: "entwurf", label: "Entwurf", f: (a) => a.status === "entwurf" },
];
/* Spalten der Kanban-Tafel: der Weg eines Vorgangs von der Anfrage bis zur Bestätigung */
const BOARD_SPALTEN = ["eingereicht", "angefragt", "ruecksprache", "klaerfall", "angebotVP", "angebotKunde", "uebermittelt", "einreichung", "bestaetigt", "lb"];
const ANSICHT_SPEICHER = "egc-alle-vorgaenge-ansicht";

function VorgaengeBoard({ anfragen, onOeffnen }) {
  const spalten = BOARD_SPALTEN.map((id) => STATUS_REITER.find((r) => r.id === id));
  return (
    <div className="overflow-x-auto pb-3 -mx-1 px-1" style={{ WebkitOverflowScrolling: "touch" }}>
      <div className="flex gap-3 items-start" style={{ minWidth: "min-content" }}>
        {spalten.map((sp) => {
          const drin = anfragen.filter(sp.f).sort((x, y) => (liegezeit(y) || 0) - (liegezeit(x) || 0));
          const kwh = drin.reduce((t, a) => t + verbrauchGesamt(a), 0);
          const farbe = (statusVon(drin[0] || { status: sp.id === "angebotVP" || sp.id === "angebotKunde" ? "angebot" : sp.id === "lb" ? "abgeschlossen" : sp.id, angebotVersendet: sp.id === "angebotKunde" }) || {}).color || C.muted;
          return (
            <div key={sp.id} className="rounded flex-shrink-0" style={{ width: 236, background: "#F6F8FA", border: "1px solid " + C.line }}>
              <div className="px-3 py-2.5" style={{ borderBottom: "1px solid " + C.line }}>
                <div className="flex items-center gap-2 text-sm">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: farbe }} />
                  <span className="flex-1 min-w-0">{sp.label}</span>
                  <span className="text-xs" style={{ color: C.muted }}>{drin.length}</span>
                </div>
                <div className="text-xs mt-0.5 ml-4" style={{ color: C.muted }}>{num(kwh)} kWh</div>
              </div>
              <div className="p-2 space-y-2">
                {drin.length === 0 && (
                  <div className="text-xs text-center py-4 rounded" style={{ color: C.muted, border: "1px dashed " + C.line }}>leer</div>
                )}
                {drin.map((a) => {
                  const lz = liegezeit(a);
                  return (
                    <button key={a.id} onClick={() => onOeffnen(a.id)} className="w-full text-left rounded p-3"
                      style={{ background: C.card, border: "1px solid " + C.line }}>
                      <div className="flex items-start gap-2">
                        <span className="flex-1 min-w-0 text-sm">{a.kunde.firma || "Neue Anfrage"}</span>
                        <span className="flex gap-0.5 flex-shrink-0">
                          {a.lieferstellen.some((l) => l.medium === "strom") && <MediumIcon medium="strom" size={12} />}
                          {a.lieferstellen.some((l) => l.medium === "gas") && <MediumIcon medium="gas" size={12} />}
                        </span>
                      </div>
                      <div className="text-xs mt-1" style={{ color: C.muted }}>{a.id} · {num(verbrauchGesamt(a))} kWh</div>
                      <div className="flex items-center justify-between gap-2 text-xs mt-2 pt-2" style={{ borderTop: "1px solid " + C.line }}>
                        <span className="truncate" style={{ color: C.muted }}>{a.partnerName}</span>
                        {lz != null && (
                          <span className="flex-shrink-0" style={{ color: lz > 10 ? C.warn : C.muted }}>
                            {lz === 0 ? "heute" : "seit " + num(lz) + (lz === 1 ? " Tag" : " Tagen")}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function VorgaengeNachStatus({ anfragen, onOeffnen, rolle }) {
  const [reiter, setReiter] = useState("alle");
  /* Kalkulation startet mit der Tafel, alle anderen mit den Reitern; die Wahl merkt sich das Gerät */
  const [modus, setModusRoh] = useState(() => {
    try { const m = localStorage.getItem(ANSICHT_SPEICHER + ":" + rolle); if (m === "board" || m === "reiter") return m; } catch (e) { /* egal */ }
    return rolle === "Kalkulation" ? "board" : "reiter";
  });
  const setModus = (m) => { setModusRoh(m); try { localStorage.setItem(ANSICHT_SPEICHER + ":" + rolle, m); } catch (e) { /* egal */ } };
  const zahl = (r) => anfragen.filter(r.f).length;
  /* Reiter ohne Vorgänge bleiben sichtbar, aber blass; Entwurf nur, wenn es welche gibt */
  const reiterListe = STATUS_REITER.filter((r) => r.id !== "entwurf" || zahl(r) > 0);
  const aktiv = reiterListe.find((r) => r.id === reiter);
  const liste = aktiv ? anfragen.filter(aktiv.f) : anfragen;
  const knopf = (id, label, n) => (
    <button key={id} onClick={() => setReiter(id)} className="px-3 py-1.5 text-sm rounded"
      style={{ background: reiter === id ? C.ink : "transparent", color: reiter === id ? "#fff" : n > 0 ? C.text : C.muted,
               border: "1px solid " + (reiter === id ? C.ink : C.line), opacity: reiter === id || n > 0 ? 1 : 0.55 }}>
      {label} {n > 0 && <span style={{ opacity: 0.7 }}>{n}</span>}
    </button>
  );
  const umschalter = (
    <div className="flex gap-1 mb-4">
      {[["board", "Board"], ["reiter", "Reiter"]].map(([id, label]) => (
        <button key={id} onClick={() => setModus(id)} className="px-3 py-1.5 text-sm rounded"
          style={{ background: modus === id ? C.ink : "transparent", color: modus === id ? "#fff" : C.muted,
                   border: "1px solid " + (modus === id ? C.ink : C.line) }}>{label}</button>
      ))}
    </div>
  );
  if (modus === "board") return <div>{umschalter}<VorgaengeBoard anfragen={anfragen} onOeffnen={onOeffnen} /></div>;
  return (
    <div>
      {umschalter}
      <div className="flex flex-wrap gap-1 mb-5">
        {knopf("alle", "Alle", anfragen.length)}
        {reiterListe.map((r) => knopf(r.id, r.label, zahl(r)))}
      </div>
      <Liste anfragen={liste} onOeffnen={onOeffnen}
        leerText={aktiv ? "Kein Vorgang mit dem Status „" + aktiv.label + "“." : "Keine Vorgänge."} />
    </div>
  );
}

function Provisionen({ anfragen, mitarbeiter, user, onOeffnen, onListe }) {
  const vollsicht = ["Geschäftsführung", "Finanzbuchhaltung"].includes(user.rolle);
  const sichtFirma = user.rolle === "Geschäftsführung";
  const rel = anfragen.filter((a) => {
    if (!a.kalkulation) return false;
    if (vollsicht) return true;
    return anteilVon(a, user.id, mitarbeiter) > 0;
  });
  const offen = rel.filter((a) => ["angebot", "uebermittelt", "einreichung", "bestaetigt"].includes(a.status));
  const fix = rel.filter((a) => a.status === "abgeschlossen");

  const eigen = (a) => anteilVon(a, user.id, mitarbeiter);
  const firma = (a) => gesamtverteilung(a, mitarbeiter).firma;
  const summe = (l, f) => l.reduce((s, a) => s + f(a), 0);
  /* Firmenanteil, Ausschüttung und Rest über eine Liste von Vorgängen */
  const firmaVon = (l) => l.reduce((t, a) => {
    const v = gesamtverteilung(a, mitarbeiter);
    return { beiEgc: t.beiEgc + v.beiEgc, aus: t.aus + v.ausgeschuettet, rest: t.rest + v.firma };
  }, { beiEgc: 0, aus: 0, rest: 0 });
  const kopf = (l) => (vollsicht ? summe(l, gesamtprovision) : summe(l, eigen));

  const Block = ({ titel, liste, farbe }) => (
    <div className="rounded overflow-hidden mb-5" style={{ background: C.card, border: "1px solid " + C.line }}>
      <button onClick={() => onListe && onListe(titel, liste)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
        style={{ borderBottom: "1px solid " + C.line }}>
        <span className="text-sm">{titel}</span>
        <span className="text-lg" style={{ color: farbe, fontVariantNumeric: "tabular-nums" }}>{eur(kopf(liste))}</span>
      </button>
      {liste.length === 0 && <div className="px-4 py-4 text-sm" style={{ color: C.muted }}>Keine Einträge.</div>}
      {liste.map((a, i) => {
        const v = gesamtverteilung(a, mitarbeiter);
        const meins = v.anteile.find((x) => x.id === user.id);
        return (
          <button key={a.id} onClick={() => onOeffnen && onOeffnen(a.id)}
               className="w-full text-left flex items-center gap-4 px-4 py-2.5 text-sm"
               style={{ borderTop: i ? "1px solid " + C.line : "none" }}>
            <span className="flex-1">{a.kunde.firma}
              <span className="block text-xs" style={{ color: C.muted }}>
                {a.id} · {a.partnerName} · {a.laufzeit} Monate
                {meins && meins.overhead ? " · Overhead" : ""}
              </span>
            </span>
            {vollsicht ? (
              <>
                <span className="w-28 text-right" style={{ fontVariantNumeric: "tabular-nums", color: C.muted }}>
                  {eur(v.anteile.reduce((s, x) => s + x.betrag, 0))}
                </span>
                {sichtFirma && (
                  <span className="w-28 text-right" style={{ fontVariantNumeric: "tabular-nums" }}>{eur(firma(a))}</span>
                )}
              </>
            ) : (
              <span className="text-right">
                <span className="block" style={{ fontVariantNumeric: "tabular-nums" }}>{eur(eigen(a))}</span>
                {(() => {
                  const aus = a.ausgezahlt || {};
                  const jahre = faelligkeiten(a).length;
                  const bezahlt = Object.keys(aus).filter((k) =>
                    k === user.id || k.startsWith(user.id + ":")).length;
                  if (!bezahlt) return null;
                  return (
                    <span className="text-xs" style={{ color: C.ok }}>
                      {bezahlt} von {jahre} Lieferjahren ausgezahlt
                    </span>
                  );
                })()}
              </span>
            )}
          </button>
        );
      })}
      {vollsicht && liste.length > 0 && (
        <div className="flex items-center gap-4 px-4 py-2 text-xs" style={{ borderTop: "1px solid " + C.line, color: C.muted }}>
          <span className="flex-1" />
          <span className="w-28 text-right">ausgeschüttet</span>
          {sichtFirma && <span className="w-28 text-right">Firma</span>}
        </div>
      )}
    </div>
  );

  return (
    <div>
      <button onClick={() => onListe && onListe("Abgeschlossene Verträge", fix)}
        className="w-full text-left mb-6 p-5 rounded" style={{ background: C.ink, color: "#fff" }}>
        <div className="text-xs mb-1" style={{ color: "#8B9BB0" }}>
          {vollsicht
            ? "Gesamtprovision aus abgeschlossenen Verträgen, je Lieferjahr"
            : "Deine Provision aus abgeschlossenen Verträgen, je Lieferjahr"}
        </div>
        <div className="text-4xl" style={{ fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}>
          {eur(kopf(fix))}
        </div>
        {vollsicht && (
          <div className="text-sm mt-2" style={{ color: "#8B9BB0" }}>
            ausgeschüttet {eur(firmaVon(fix).aus)}
            {sichtFirma ? " · verbleibt in der Firma " + eur(summe(fix, firma)) : ""}
          </div>
        )}
        {!vollsicht && user.rolle !== "Vertriebspartner" && (
          <div className="text-sm mt-2" style={{ color: "#8B9BB0" }}>
            Differenz zu deinem Satz von {num(user.satz || 0, 0)} % aus der eigenen Struktur
          </div>
        )}
      </button>
      {sichtFirma && (() => {
        const f = firmaVon(fix);
        return (
          <div className="rounded p-4 mb-5" style={{ background: C.card, border: "1px solid " + C.gruen }}>
            <div className="text-sm mb-3">Was der Firma bleibt, abgeschlossene Verträge</div>
            <div className="grid sm:grid-cols-3 gap-4">
              {[["Anteil EGC an der Gesamtprovision", f.beiEgc, C.text],
                ["Ausgeschüttet an den Vertrieb", f.aus, C.gas],
                ["Verbleibt bei EGC Energie", f.rest, C.ok]].map(([k, w, farbe]) => (
                <div key={k}>
                  <div className="text-xs mb-1" style={{ color: C.muted }}>{k}</div>
                  <div className="text-xl" style={{ color: farbe, fontVariantNumeric: "tabular-nums" }}>
                    {eur(w)}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs mt-3" style={{ color: C.muted }}>
              Die Sätze der Vertriebspartner rechnen auf die volle Gesamtprovision. Ausgezahlt wird
              aus dem Anteil, der tatsächlich bei EGC ankommt.
            </p>
          </div>
        );
      })()}

      <Block titel="Abgeschlossen" liste={fix} farbe={C.ok} />
      <Block titel="In Aussicht (Angebot liegt beim Kunden)" liste={offen} farbe={C.muted} />
    </div>
  );
}

/* Profilbild oder Initialen */
function Avatar({ m, size = 36 }) {
  const initialen = (m.name || "?").split(" ").map((t) => t[0]).slice(0, 2).join("");
  if (m.bild)
    return <img src={m.bild} alt="" className="rounded-full object-cover"
                style={{ width: size, height: size }} />;
  return (
    <span className="rounded-full inline-flex items-center justify-center"
          style={{ width: size, height: size, background: C.inkSoft, color: "#fff",
                   fontSize: size / 2.8 }}>{initialen}</span>
  );
}

/* Bild auf 160 px verkleinern, damit es in den Browserspeicher passt */
function bildLaden(file, fertig) {
  const leser = new FileReader();
  leser.onload = () => {
    const img = new Image();
    img.onload = () => {
      const k = 160 / Math.max(img.width, img.height);
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * k);
      c.height = Math.round(img.height * k);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      fertig(c.toDataURL("image/jpeg", 0.8));
    };
    img.src = leser.result;
  };
  leser.readAsDataURL(file);
}

const PartnerStatus = ({ status }) => {
  const st = PARTNER_STATUS[status] || PARTNER_STATUS.eingeladen;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs whitespace-nowrap" style={{ color: st.color }}>
      <span className="w-2 h-2 rounded-full" style={{ background: st.color }} />
      {st.label}
    </span>
  );
};

/* Formular für die Stammdaten eines Handelsvertreters.
   schreiben=false zeigt dieselben Daten schreibgeschützt. */
function StammdatenFormular({ sd, setSd, schreiben }) {
  const setz = (k, v) => setSd({ ...sd, [k]: v });
  const Anzeige = ({ k, v }) => (
    <div>
      <div className="text-xs mb-1" style={{ color: C.muted }}>{k}</div>
      <div className="text-sm">{v || "–"}</div>
    </div>
  );
  const DateiZeile = ({ label, datei }) =>
    datei ? <DateiChip datei={datei} label={label} /> : (
      <div className="flex items-center gap-2 px-3 py-2 rounded text-sm"
           style={{ border: "1px solid " + C.line, background: "#F6F8FA", color: C.muted }}>
        <FileText size={15} /><span className="flex-1">nicht hinterlegt</span>
        <span className="text-xs">{label}</span>
      </div>
    );

  if (!schreiben)
    return (
      <div className="space-y-5">
        <div className="grid sm:grid-cols-2 gap-4">
          <Anzeige k="Firmierung" v={sd.firma} />
          <Anzeige k="Steuernummer" v={sd.steuernummer} />
          <Anzeige k="Anschrift" v={[sd.strasse, [sd.plz, sd.ort].filter(Boolean).join(" ")].filter(Boolean).join(", ")} />
          <Anzeige k="Kontoinhaber" v={sd.kontoinhaber} />
          <Anzeige k="IBAN" v={sd.iban} />
          <Anzeige k="Bank / BIC" v={[sd.bank, sd.bic].filter(Boolean).join(" · ")} />
          <Anzeige k="Umsatzsteuer" v={sd.ustBerechtigt ? "vorsteuerabzugsberechtigt" : "nicht vorsteuerabzugsberechtigt"} />
          <Anzeige k="USt-IdNr." v={sd.ustBerechtigt ? sd.ustId : "–"} />
        </div>
        <div className="space-y-2">
          <DateiZeile label="Gewerbeanmeldung" datei={sd.gewerbe} />
          <DateiZeile label="Ausweis Vorderseite" datei={sd.ausweisVorne} />
          <DateiZeile label="Ausweis Rückseite" datei={sd.ausweisHinten} />
          {sd.ustBerechtigt && <DateiZeile label="Nachweis Umsatzsteuer" datei={sd.ustNachweis} />}
        </div>
      </div>
    );

  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-4">
        <Feld label="Firmierung" value={sd.firma} onChange={(v) => setz("firma", v)}
          placeholder="Mustermann Energievertrieb e.K." breit />
        <Feld label="Straße und Hausnummer" value={sd.strasse} onChange={(v) => setz("strasse", v)} breit />
        <Feld label="PLZ" value={sd.plz} onChange={(v) => setz("plz", v)} />
        <Feld label="Ort" value={sd.ort} onChange={(v) => setz("ort", v)} />
        <Feld label="Steuernummer" value={sd.steuernummer} onChange={(v) => setz("steuernummer", v)} breit />
      </div>

      <div>
        <div className="text-sm mb-3">Bankverbindung</div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Feld label="Kontoinhaber" value={sd.kontoinhaber} onChange={(v) => setz("kontoinhaber", v)} breit />
          <Feld label="IBAN" value={sd.iban} onChange={(v) => setz("iban", v)} breit />
          <Feld label="Bank" value={sd.bank} onChange={(v) => setz("bank", v)} />
          <Feld label="BIC" value={sd.bic} onChange={(v) => setz("bic", v)} />
        </div>
      </div>

      <div>
        <div className="text-sm mb-3">Nachweise</div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Datei mehrere label="Gewerbeanmeldung (PDF oder Bild)" datei={sd.gewerbe}
            onSet={(f) => setz("gewerbe", f)} hinweis="Datei auswählen" />
          <div />
          <Datei label="Personalausweis Vorderseite" datei={sd.ausweisVorne}
            onSet={(f) => setz("ausweisVorne", f)} hinweis="Datei auswählen" />
          <Datei label="Personalausweis Rückseite" datei={sd.ausweisHinten}
            onSet={(f) => setz("ausweisHinten", f)} hinweis="Datei auswählen" />
        </div>
      </div>

      <div className="p-4 rounded" style={{ background: "#F6F8FA", border: "1px solid " + C.line }}>
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" checked={!!sd.ustBerechtigt} className="mt-0.5"
            onChange={(e) => setz("ustBerechtigt", e.target.checked)} style={{ accentColor: C.ink }} />
          <span>
            Ich bin zum Vorsteuerabzug berechtigt und weise Umsatzsteuer aus
            <span className="block text-xs mt-0.5" style={{ color: C.muted }}>
              Bestimmt, ob Provisionen mit oder ohne Umsatzsteuer abgerechnet werden.
            </span>
          </span>
        </label>
        {sd.ustBerechtigt && (
          <div className="grid sm:grid-cols-2 gap-4 mt-4">
            <Feld label="Umsatzsteuer-Identifikationsnummer" value={sd.ustId}
              onChange={(v) => setz("ustId", v)} placeholder="DE123456789" />
            <Datei mehrere label="Nachweis (Bescheinigung Finanzamt)" datei={sd.ustNachweis}
              onSet={(f) => setz("ustNachweis", f)} hinweis="Datei auswählen" />
          </div>
        )}
      </div>
    </div>
  );
}

/* Freigeschaltet, aber Stammdaten noch unvollständig (Freigabe durch die GF ohne Einreichung) */
const stammdatenNachreichen = (m) =>
  !!m && m.status === "aktiv" && !!(m.freigabe && m.freigabe.ohneStammdaten)
  && stammdatenLuecken(m.stammdaten || {}, !!m.angestellt).length > 0;

const MeineStammdaten = teilKomponente("selten", "MeineStammdaten");   /* in selten.jsx */
const UNTERSCHRIFT_B = 600, UNTERSCHRIFT_H = 200;

function DateiBild({ datei, hoehe = 80 }) {
  const [src, setSrc] = useState(datei && datei.url);
  useEffect(() => {
    let aktiv = true;
    if (datei && !datei.url && datei.pfad)
      dateiInhalt(datei).then((u) => { if (aktiv) setSrc(u); }).catch(() => {});
    else setSrc(datei && datei.url);
    return () => { aktiv = false; };
  }, [datei && (datei.url || datei.pfad)]);
  if (!src) return <div className="text-xs" style={{ color: C.muted }}>wird geladen …</div>;
  return <img src={src} alt="Unterschrift" style={{ height: hoehe, background: "#fff" }} />;
}

function Unterschrift({ onChange, label = "Unterschrift", onStriche = null, hoehe = 130 }) {
  /* Am iPhone zuverlässig: echte Touch-Ereignisse mit passive:false (verhindert das Scrollen der Seite),
     dazu Maus für den Rechner. Zeigerereignisse brach Safari ab, sobald es ein Scrollen vermutete. */
  const ref = React.useRef(null);
  const zieht = React.useRef(false);
  const gemalt = React.useRef(false);
  const meldung = React.useRef(onChange);
  meldung.current = onChange;
  /* zusätzlich als Linienzüge (Bildschirmpunkte), für das scharfe Einsetzen ins PDF */
  const striche = React.useRef([]);
  const melde2 = React.useRef(onStriche);
  melde2.current = onStriche;
  const [leer, setLeer] = useState(true);

  const vorbereiten = () => {
    const c = ref.current;
    if (!c) return;
    const r = c.getBoundingClientRect();
    if (!r.width) return;
    const f = window.devicePixelRatio || 1;
    c.width = Math.round(r.width * f);
    c.height = Math.round(r.height * f);
    const g = c.getContext("2d");
    g.setTransform(f, 0, 0, f, 0, 0);
    g.fillStyle = "#fff";
    g.fillRect(0, 0, r.width, r.height);
    g.lineWidth = 2.2; g.lineCap = "round"; g.lineJoin = "round"; g.strokeStyle = "#0A1626";
  };

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    vorbereiten();
    const pos = (x, y) => { const r = c.getBoundingClientRect(); return [x - r.left, y - r.top]; };
    const start = (x, y) => {
      /* Feld war beim Laden noch unsichtbar oder hat die Größe geändert: jetzt einrichten */
      const f = window.devicePixelRatio || 1;
      if (!gemalt.current && Math.round(c.getBoundingClientRect().width * f) !== c.width) vorbereiten();
      zieht.current = true;
      const g = c.getContext("2d");
      const [px, py] = pos(x, y);
      g.beginPath(); g.moveTo(px, py); g.lineTo(px + 0.1, py + 0.1); g.stroke();
      striche.current.push([[Math.round(px * 10) / 10, Math.round(py * 10) / 10]]);
    };
    const weiter = (x, y) => {
      if (!zieht.current) return;
      const g = c.getContext("2d");
      const [px, py] = pos(x, y);
      g.lineTo(px, py); g.stroke();
      gemalt.current = true;
      const z = striche.current[striche.current.length - 1];
      if (z) z.push([Math.round(px * 10) / 10, Math.round(py * 10) / 10]);
    };
    const ende = () => {
      if (!zieht.current) return;
      zieht.current = false;
      gemalt.current = true;
      setLeer(false);
      if (melde2.current) melde2.current({ striche: striche.current.map((z) => z.slice()) });
      if (!meldung.current) return;
      /* in festes Format übertragen und als JPEG ablegen */
      const aus = document.createElement("canvas");
      aus.width = UNTERSCHRIFT_B; aus.height = UNTERSCHRIFT_H;
      const g = aus.getContext("2d");
      g.fillStyle = "#fff"; g.fillRect(0, 0, UNTERSCHRIFT_B, UNTERSCHRIFT_H);
      /* seitenrichtig einpassen, damit die Unterschrift bei schmalem Feld nicht verzerrt */
      const m = Math.min(UNTERSCHRIFT_B / c.width, UNTERSCHRIFT_H / c.height);
      const dw = c.width * m, dh = c.height * m;
      g.drawImage(c, (UNTERSCHRIFT_B - dw) / 2, (UNTERSCHRIFT_H - dh) / 2, dw, dh);
      const url = aus.toDataURL("image/jpeg", 0.85);
      if (meldung.current) meldung.current({ name: "unterschrift.jpg", typ: "image/jpeg", groesse: Math.round(url.length * 0.75),
        breite: UNTERSCHRIFT_B, hoehe: UNTERSCHRIFT_H, url });
    };
    const tStart = (e) => { e.preventDefault(); const t = e.touches[0]; if (t) start(t.clientX, t.clientY); };
    const tWeiter = (e) => { e.preventDefault(); const t = e.touches[0]; if (t) weiter(t.clientX, t.clientY); };
    const tEnde = (e) => { e.preventDefault(); ende(); };
    const mStart = (e) => { if (e.button !== 0) return; e.preventDefault(); start(e.clientX, e.clientY); };
    const mWeiter = (e) => weiter(e.clientX, e.clientY);
    const mEnde = () => ende();
    c.addEventListener("touchstart", tStart, { passive: false });
    c.addEventListener("touchmove", tWeiter, { passive: false });
    c.addEventListener("touchend", tEnde, { passive: false });
    c.addEventListener("touchcancel", tEnde, { passive: false });
    c.addEventListener("mousedown", mStart);
    window.addEventListener("mousemove", mWeiter);
    window.addEventListener("mouseup", mEnde);
    return () => {
      c.removeEventListener("touchstart", tStart); c.removeEventListener("touchmove", tWeiter);
      c.removeEventListener("touchend", tEnde); c.removeEventListener("touchcancel", tEnde);
      c.removeEventListener("mousedown", mStart);
      window.removeEventListener("mousemove", mWeiter); window.removeEventListener("mouseup", mEnde);
    };
  }, []);

  const loeschen = () => {
    gemalt.current = false; striche.current = []; vorbereiten(); setLeer(true);
    if (onChange) onChange(null);
    if (onStriche) onStriche(null);
  };

  return (
    <div>
      <span className="block text-xs mb-1" style={{ color: C.muted }}>{label}</span>
      <canvas ref={ref}
        className="w-full rounded"
        style={{ height: hoehe, maxWidth: 480, display: "block", touchAction: "none", WebkitUserSelect: "none",
                 userSelect: "none", WebkitTouchCallout: "none", background: "#fff", border: "1px solid " + C.line }} />
      <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: C.muted }}>
        <span>{leer ? "Mit dem Finger im Feld unterschreiben." : "Unterschrift erfasst."}</span>
        {!leer && <button onClick={loeschen} style={{ color: C.strom }}>Neu unterschreiben</button>}
      </div>
    </div>
  );
}

/* ---------- Vertragstexte ----------
   Wortlaut der Geschäftsführung (Handelsvertretervertrag, Tippgebervertrag).
   Platzhalter in geschweiften Klammern werden beim Erzeugen ersetzt.
   Die Firmendaten von EGC (vertreten durch, Anschrift) pflegt die Geschäftsführung. */
/* Offizielle Angaben von EGC Energie. Die Geschäftsführung kann sie unter
   „Verträge“ ändern; leere Felder in der Datenbank überschreiben die Vorgabe nicht. */
const FIRMENDATEN_VORGABE = {
  vertreter: "Karsten Trautmann", strasse: "In den Erlenwiesen 11", ort: "66914 Waldmohr",
  telefon: "06373 8920114", email: "anfrage@egc-energie.de", website: "www.egc-energie.de",
  ustId: "DE365107489", bank: "Qonto", iban: "DE97 1001 0123 9973 1963 88", bic: "QNTODEB2XXX",
};
/* dreispaltige Fußzeile mit den Pflichtangaben (für jsPDF-Dokumente, Maße in mm) */
function pdfFussFirma(doc, W, H, RA) {
  const F = FIRMENDATEN;
  doc.setDrawColor(216, 221, 228); doc.setLineWidth(0.3); doc.line(RA, H - 17, W - RA, H - 17);
  doc.setFont("helvetica", "normal"); doc.setFontSize(6.6); doc.setTextColor(107, 119, 135);
  const spalten = [
    ["EGC Energie" + (F.vertreter ? " · " + F.vertreter : ""), F.strasse, F.ort],
    [F.telefon ? "Tel. " + F.telefon : "", F.email, F.website],
    [F.iban ? (F.bank ? F.bank + " · " : "") + "IBAN " + F.iban : "", F.bic ? "BIC " + F.bic : "", F.ustId ? "USt-IdNr. " + F.ustId : ""],
  ];
  const x = [RA, RA + 62, RA + 112];
  spalten.forEach((z, i) => z.filter(Boolean).forEach((t, k) => doc.text(String(t), x[i], H - 12.6 + k * 3.1)));
}
const firmendatenMit = (f) => {
  const z = { ...FIRMENDATEN_VORGABE };
  Object.entries(f || {}).forEach(([k, v]) => { if (v != null && String(v).trim() !== "") z[k] = v; });
  return z;
};
let FIRMENDATEN = firmendatenMit();
const setzeFirmendaten = (f) => { FIRMENDATEN = firmendatenMit(f); };
/* eine Zeile für Fußzeilen: Name · Anschrift · Telefon · E-Mail · USt-IdNr. */
const firmenzeile = () => {
  const F = FIRMENDATEN;
  return ["EGC Energie", [F.strasse, F.ort].filter(Boolean).join(", "), F.telefon ? "Tel. " + F.telefon : "",
    F.email, F.ustId ? "USt-IdNr. " + F.ustId : ""].filter(Boolean).join("  |  ");
};

/* § 3 des Tippgebervertrags hängt von der Vergütungsart ab */
const TG_VERGUETUNG = {
  prozent: {
    /* angepasst: Grundlage ist die Provision des zuständigen Vertriebspartners */
    n1: "Der Tippgeber erhält für jeden Kunden aus einem erfolgreichen Tipp eine jährliche Vergütung von {W} der Provision, die der zuständige Vertriebspartner von EGC ({PARTNER}) für diesen Kunden im jeweiligen Lieferjahr erhält (ohne Umsatzsteuer).",
    n2: "Die Vergütung wird je Lieferjahr einmal jährlich ausgeschüttet. Für das erste Lieferjahr erfolgt die Auszahlung in der Regel innerhalb von 8 Wochen nach der Bestätigung durch den Energieversorger. Für jedes weitere Lieferjahr zahlt EGC aus, nachdem der Energieversorger die Vergütung für dieses Lieferjahr an EGC ausgezahlt hat. EGC erstellt dazu jeweils eine Abrechnung.",
    n3: "Der Anspruch besteht für die gesamte Laufzeit der Lieferverträge des Kunden, einschließlich Verlängerungen und Folgeverträgen, solange EGC hieraus Vergütung erhält. Er besteht auch nach Beendigung dieses Vertrags für Kunden fort, deren Tipp während der Vertragslaufzeit gemeldet wurde und innerhalb der Schutzfrist erfolgreich war.",
    n4: "Kündigt der Energieversorger den Liefervertrag des Kunden, entfällt der Anspruch auf Vergütung für diesen Kunden ab dem Zeitpunkt der Kündigung.",
  },
  kwh: {
    n1: "Der Tippgeber erhält für jeden Kunden aus einem erfolgreichen Tipp eine einmalige Vergütung von {W} je 100.000 kWh Jahresverbrauch des Kunden. Maßgeblich ist der im Liefervertrag für das erste Lieferjahr zugrunde gelegte Jahresverbrauch aller Lieferstellen des Kunden (Strom und Erdgas). Die Vergütung wird anteilig berechnet: Jahresverbrauch in kWh ÷ 100.000 × {W}. Beispiel: Bei einem Jahresverbrauch von 10.000 kWh beträgt die Vergütung {BSP}.",
    n2: "Die Vergütung wird einmalig gezahlt, in der Regel innerhalb von 8 Wochen nach der Bestätigung durch den Energieversorger. EGC erstellt dazu eine Abrechnung.",
    n3: "Mit der einmaligen Vergütung ist der Tipp vollständig abgegolten. Für weitere Lieferjahre, Verlängerungen und Folgeverträge des Kunden besteht kein weiterer Vergütungsanspruch.",
    n4: "Kündigt der Energieversorger den Liefervertrag des Kunden vor der Auszahlung, entfällt der Anspruch auf Vergütung für diesen Kunden.",
  },
};

/* Tippgeber der Firma, prozentual: Grundlage ist, was EGC vom Versorger erhält */
const TG_N1_FIRMA = "Der Tippgeber erhält für jeden Kunden aus einem erfolgreichen Tipp eine jährliche Vergütung von {W} der Provision, die EGC für diesen Kunden im jeweiligen Lieferjahr vom Energieversorger erhält (ohne Umsatzsteuer).";

const TG_PARAGRAFEN = [
 { h: "§ 1 Vertragsgegenstand", n: [
  "EGC berät gewerbliche Kunden bei der Beschaffung von Strom und Erdgas und übernimmt die Versorgerauswahl.",
  "Der Tippgeber benennt EGC potenzielle Kunden, die an einer Energiebeschaffungsberatung interessiert sein könnten (\"Tipp\").",
  "Der Tippgeber führt keine Beratung, Verhandlung oder Vermittlung durch. Er ist nicht berechtigt, EGC zu vertreten oder Erklärungen in deren Namen abzugeben.",
  "Der Tippgeber ist weder Arbeitnehmer noch Handelsvertreter von EGC. Er ist in der Gestaltung seiner Tätigkeit frei und nicht verpflichtet, eine bestimmte Anzahl an Tipps zu liefern."] },
 { h: "§ 2 Tipp-Meldung und Abschluss", n: [
  "Der Tippgeber meldet einen Tipp in Textform (E-Mail oder Vertriebsportal) mit Firmenname, Ansprechpartner und Kontaktdaten des potenziellen Kunden.",
  "Ein Tipp gilt als erfolgreich, sobald der Kunde einen Vertrag über EGC abgeschlossen hat und der Energieversorger den Abschluss bestätigt hat. EGC informiert den Tippgeber darüber in Textform.",
  "Ein Vergütungsanspruch entsteht nicht, wenn der Kunde bereits Kunde von EGC ist oder EGC in den letzten 12 Monaten vor der Meldung bereits nachweislich in Kontakt mit ihm stand.",
  "Ein gemeldeter Tipp ist für 12 Monate ab Meldung dem Tippgeber zugeordnet (Schutzfrist). Kommt innerhalb dieser Frist ein Vertrag zustande, entsteht der Vergütungsanspruch nach § 3.",
  "Ob und mit welchem Inhalt ein Vertrag mit dem Kunden geschlossen wird, entscheidet EGC frei."] },
 { h: "§ 3 Vergütung", n: [
  "{N1}", "{N2}", "{N3}", "{N4}",
  "Erstattet EGC eine bereits vereinnahmte Vergütung zurück (z. B. durch Storno oder Rückbelastung des Versorgers), wird der darauf entfallende Anteil mit der nächsten Abrechnung verrechnet oder ist vom Tippgeber zurückzuzahlen.",
  "Ist der Tippgeber umsatzsteuerpflichtig, zahlt EGC die Vergütung zuzüglich der gesetzlichen Umsatzsteuer gegen ordnungsgemäße Rechnung oder Gutschrift. Kleinunternehmer nach § 19 UStG erhalten die Vergütung ohne Umsatzsteuer.",
  "Mit der Vergütung sind alle Aufwendungen des Tippgebers abgegolten."],
  extra: "Bankverbindung des Tippgebers (IBAN): ________________________________" },
 { h: "§ 4 Pflichten des Tippgebers", n: [
  "Der Tippgeber gibt Kontaktdaten nur weiter, wenn der potenzielle Kunde damit einverstanden ist, von EGC kontaktiert zu werden.",
  "Er macht gegenüber Dritten keine Zusagen zu Preisen, Einsparungen oder Leistungen von EGC.",
  "Er tritt nicht unter dem Namen oder Logo von EGC auf, sofern EGC dem nicht in Textform zugestimmt hat."] },
 { h: "§ 5 Steuern und Sozialversicherung", p:
  "Der Tippgeber ist für die Versteuerung seiner Vergütung und etwaige Sozialversicherungsbeiträge selbst verantwortlich. Bei einer gewerblichen Tätigkeit sorgt er selbst für eine erforderliche Gewerbeanmeldung." },
 { h: "§ 6 Vertraulichkeit und Datenschutz", n: [
  "Beide Parteien behandeln Geschäftsgeheimnisse und Kundendaten, die sie aus diesem Vertrag erfahren, vertraulich. Dies gilt auch nach Vertragsende.",
  "Personenbezogene Daten werden nur zur Durchführung dieses Vertrags und nach den Vorgaben der DSGVO verarbeitet."] },
 { h: "§ 7 Laufzeit und Kündigung", n: [
  "Der Vertrag beginnt mit Unterzeichnung und läuft auf unbestimmte Zeit.",
  "Jede Partei kann ihn mit einer Frist von 3 Monaten zum Monatsende in Textform kündigen.",
  "Das Recht zur fristlosen Kündigung aus wichtigem Grund bleibt unberührt, insbesondere bei einem Verstoß gegen § 4 oder § 6."] },
 { h: "§ 8 Schlussbestimmungen", n: [
  "Änderungen und Ergänzungen bedürfen der Textform. Das gilt auch für die Aufhebung dieser Klausel.",
  "Mündliche Nebenabreden bestehen nicht.",
  "Ist eine Bestimmung unwirksam, bleiben die übrigen wirksam. An ihre Stelle tritt eine Regelung, die dem wirtschaftlichen Zweck am nächsten kommt.",
  "Es gilt deutsches Recht. Gerichtsstand ist, soweit gesetzlich zulässig, der Sitz von EGC."] },
];

/* Paragrafen in PDF-Zeilen umsetzen; `ersetze` füllt die Platzhalter */
function vertragsZeilen(titel, parteiZeilen, paragrafen, ersetze) {
  const leer = "______________________";
  const f = FIRMENDATEN;
  const z = [];
  z.push("Auftraggeber: EGC Energie, vertreten durch " + (f.vertreter || leer) + ", "
    + (f.strasse || leer) + ", " + (f.ort || leer) + (f.ustId ? ", USt-IdNr. " + f.ustId : "")
    + ", nachfolgend \"EGC\"");
  z.push("und");
  parteiZeilen.forEach((x) => z.push(x));
  z.push("schließen folgenden " + titel + ".");
  paragrafen.forEach((s) => {
    z.push(" ");
    z.push({ text: s.h, gross: true });
    if (s.p) z.push(ersetze(s.p));
    if (s.n) s.n.forEach((t, i) => z.push((i + 1) + ". " + ersetze(t)));
    if (s.extra) { z.push(" "); z.push(ersetze(s.extra)); }
  });
  return z;
}

/* ---------- Handelsvertretervertrag ----------
   Liegt beim Mitarbeiter unter `vertrag` und damit in den geschützten Stammdaten.
   Anschrift, Steuernummer und IBAN kommen aus den Stammdaten des Partners. */
const ANFRAGE_STATUS = {
  offen: { label: "Wartet auf Geschäftsführung", farbe: C.gas },
  freigegeben: { label: "Freigegeben", farbe: C.ok },
  abgelehnt: { label: "Abgelehnt", farbe: C.warn },
  zurueckgezogen: { label: "Zurückgezogen", farbe: C.muted },
};

const StrukturStatus = ({ status }) => {
  const st = ANFRAGE_STATUS[status] || ANFRAGE_STATUS.offen;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: st.farbe }}>
      <span className="w-2 h-2 rounded-full" style={{ background: st.farbe }} />{st.label}
    </span>
  );
};

function LinkKopieren({ url }) {
  const [kopiert, setKopiert] = useState(false);
  return (
    <div>
      <div className="p-3 rounded text-sm break-all"
           style={{ background: "#F6F8FA", border: "1px solid " + C.line }}>{url}</div>
      <div className="mt-2">
        <Btn icon={Check} onClick={() => {
          try { navigator.clipboard.writeText(url); setKopiert(true); } catch (e) { /* manuell kopieren */ }
        }}>{kopiert ? "Kopiert" : "Link kopieren"}</Btn>
      </div>
    </div>
  );
}

const Strukturanfragen = teilKomponente("selten", "Strukturanfragen");   /* in selten.jsx */
const Portalsteuerung = teilKomponente("verwaltung", "Portalsteuerung");   /* in verwaltung.jsx */
const Partnerverwaltung = teilKomponente("verwaltung", "Partnerverwaltung");   /* in verwaltung.jsx */
/* Eigenes Passwort ändern, für jede Rolle (Seitenleiste unten) */
function PasswortDialog({ onSchliessen }) {
  const [alt, setAlt] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [fehler, setFehler] = useState("");
  const [laeuft, setLaeuft] = useState(false);
  const [fertig, setFertig] = useState(false);
  const regeln = passwortRegeln(pw);
  const passt = alt && regeln.every((x) => x.ok) && pw === pw2;
  const absenden = async () => {
    setLaeuft(true); setFehler("");
    try { await passwortAendern(alt, pw); setFertig(true); }
    catch (e) { setFehler((e && e.message) || String(e)); }
    setLaeuft(false);
  };
  return createPortal(
    <div className="flex items-start sm:items-center justify-center px-4"
         style={{ position: "fixed", top: 0, right: 0, bottom: 0, left: 0, zIndex: 50, overflowY: "auto",
                  background: "rgba(10,22,38,0.55)", paddingTop: "max(2rem, env(safe-area-inset-top))", paddingBottom: "2rem" }}
         onClick={(e) => { if (e.target === e.currentTarget && !laeuft) onSchliessen(); }}>
      <div className="w-full max-w-md rounded p-6" style={{ background: C.card, color: C.text, fontFamily: FONT }}>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg">Passwort ändern</h2>
          <button onClick={onSchliessen} style={{ color: C.muted }} title="Schließen"><X size={18} /></button>
        </div>
        {fertig ? (
          <div>
            <p className="text-sm mt-3 flex items-center gap-2" style={{ color: C.ok }}><Check size={16} /> Dein Passwort ist geändert.</p>
            <p className="text-sm mt-2" style={{ color: C.muted }}>Ab sofort meldest du dich mit dem neuen Passwort an, auf allen Geräten.</p>
            <div className="mt-5"><Btn icon={Check} onClick={onSchliessen}>Fertig</Btn></div>
          </div>
        ) : (
          <div>
            <p className="text-sm mb-5" style={{ color: C.muted }}>Zur Sicherheit brauchen wir zuerst dein bisheriges Passwort.</p>
            <div className="space-y-4">
              <Feld label="Bisheriges Passwort" type="password" value={alt} onChange={setAlt} />
              <Feld label="Neues Passwort" type="password" value={pw} onChange={setPw} />
              <Feld label="Neues Passwort wiederholen" type="password" value={pw2} onChange={setPw2} />
            </div>
            <div className="mt-4 space-y-1">
              {regeln.map((x) => (
                <div key={x.text} className="flex items-center gap-2 text-xs" style={{ color: x.ok ? C.ok : C.muted }}>
                  {x.ok ? <Check size={13} /> : <X size={13} />} {x.text}
                </div>
              ))}
              {pw2 && (
                <div className="flex items-center gap-2 text-xs" style={{ color: pw === pw2 ? C.ok : C.muted }}>
                  {pw === pw2 ? <Check size={13} /> : <X size={13} />} Passwörter stimmen überein
                </div>
              )}
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <Btn icon={Check} onClick={absenden} disabled={!passt || laeuft}>{laeuft ? "Einen Moment …" : "Passwort ändern"}</Btn>
              <Btn variante="hell" onClick={onSchliessen} disabled={laeuft}>Abbrechen</Btn>
            </div>
            {fehler && <p className="text-sm mt-4" style={{ color: C.warn }}>{fehler}</p>}
            <p className="text-xs mt-5" style={{ color: C.muted }}>
              Bisheriges Passwort vergessen? Dann melde dich bei der Geschäftsführung, du bekommst einen neuen Zugangslink.
            </p>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

/* Registrierung über den Einladungslink: Passwort vergeben */
function Registrierung({ einladung, onFertig, onAbbruch }) {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [fehler, setFehler] = useState("");
  const [laeuft, setLaeuft] = useState(false);
  const regeln = passwortRegeln(pw);
  const passt = regeln.every((r) => r.ok) && pw === pw2;

  const absenden = async () => {
    setLaeuft(true); setFehler("");
    try { await onFertig(pw); } catch (e) { setFehler((e && e.message) || String(e)); }
    setLaeuft(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
         style={{ background: C.ink, fontFamily: FONT, paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="w-full max-w-md">
        <img src={LOGO} alt="EGC Energie" className="w-44 mx-auto mb-8" />
        <div className="rounded p-6" style={{ background: C.card }}>
          <h1 className="text-lg mb-1">{einladung.art === "reset" ? "Neues Passwort, " + einladung.name : "Willkommen, " + einladung.name}</h1>
          <p className="text-sm mb-1" style={{ color: C.muted }}>
            {einladung.art === "reset" ? "Vergib ein neues Passwort für deinen Zugang. Das bisherige gilt danach nicht mehr."
              : "Vergib ein Passwort für deinen Zugang zum Vertriebsportal."}
          </p>
          <p className="text-sm mb-5" style={{ color: C.muted }}>
            Deine Anmeldung: <span style={{ color: C.text }}>{einladung.email}</span>
          </p>

          <div className="space-y-4">
            <Feld label="Passwort" type="password" value={pw} onChange={setPw} />
            <Feld label="Passwort wiederholen" type="password" value={pw2} onChange={setPw2} />
          </div>

          <div className="mt-4 space-y-1">
            {regeln.map((r) => (
              <div key={r.text} className="flex items-center gap-2 text-xs"
                   style={{ color: r.ok ? C.ok : C.muted }}>
                {r.ok ? <Check size={13} /> : <X size={13} />} {r.text}
              </div>
            ))}
            {pw2 && (
              <div className="flex items-center gap-2 text-xs" style={{ color: pw === pw2 ? C.ok : C.muted }}>
                {pw === pw2 ? <Check size={13} /> : <X size={13} />} Passwörter stimmen überein
              </div>
            )}
          </div>

          <div className="mt-6">
            <Btn icon={Check} onClick={absenden} disabled={!passt || laeuft}>
              {laeuft ? "Einen Moment …" : einladung.art === "reset" ? "Neues Passwort speichern und anmelden" : "Passwort setzen und anmelden"}
            </Btn>
          </div>
          {fehler && <p className="text-sm mt-4" style={{ color: C.warn }}>{fehler}</p>}
          <button className="text-xs mt-4" style={{ color: C.muted }} onClick={onAbbruch}>
            Zurück zur Anmeldung
          </button>
        </div>
      </div>
    </div>
  );
}

/* Anmeldemaske: Anmeldung über Supabase, Einladung über die Server-Funktion */
function Login({ onAngemeldet, onEinladung, startCode }) {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [code, setCode] = useState(startCode || "");
  const [fehler, setFehler] = useState("");
  const [laeuft, setLaeuft] = useState(false);
  const [modus, setModus] = useState(startCode ? "code" : "login");

  const einloggen = async () => {
    setLaeuft(true); setFehler("");
    try {
      await anmelden(email, pw);
      await onAngemeldet();
    } catch (e) {
      const t = (e && e.message) || "";
      setFehler(/invalid login credentials/i.test(t) ? "E-Mail oder Passwort stimmt nicht."
        : /fetch|network/i.test(t) ? "Keine Verbindung zum Server. Bitte Netz prüfen."
        : "Anmeldung nicht möglich: " + t);
    }
    setLaeuft(false);
  };

  const [gesendet, setGesendet] = useState(false);
  const vergessen = async () => {
    setLaeuft(true); setFehler("");
    try { await passwortVergessen(email); setGesendet(true); }
    catch (e) { setFehler(/fetch|network/i.test((e && e.message) || "") ? "Keine Verbindung zum Server. Bitte Netz prüfen." : (e && e.message) || String(e)); }
    setLaeuft(false);
  };

  const einloesen = async () => {
    setLaeuft(true); setFehler("");
    try {
      const c = code.trim().toUpperCase();
      const info = await einladungPruefen(c);
      onEinladung({ ...info, code: c });
    } catch (e) { setFehler((e && e.message) || String(e)); }
    setLaeuft(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
         style={{ background: C.ink, fontFamily: FONT, paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="w-full max-w-md">
        <img src={LOGO} alt="EGC Energie" className="w-44 mx-auto mb-8" />
        <div className="rounded p-6" style={{ background: C.card }}>
          <div className="flex gap-1 mb-5">
            {[["login", "Anmelden"], ["code", "Einladung einlösen"]].map(([id, label]) => (
              <button key={id} onClick={() => { setModus(id); setFehler(""); }}
                className="px-3 py-1.5 text-sm rounded"
                style={{
                  background: (modus === id || (id === "login" && modus === "vergessen")) ? C.ink : "transparent",
                  color: (modus === id || (id === "login" && modus === "vergessen")) ? "#fff" : C.muted,
                  border: "1px solid " + ((modus === id || (id === "login" && modus === "vergessen")) ? C.ink : C.line),
                }}>{label}</button>
            ))}
          </div>

          {modus === "login" ? (
            <div className="space-y-4">
              <Feld label="E-Mail" value={email} onChange={setEmail} placeholder="name@egc-energie.de" />
              <Feld label="Passwort" type="password" value={pw} onChange={setPw} />
              <Btn onClick={einloggen} disabled={!email || !pw || laeuft}>
                {laeuft ? "Einen Moment …" : "Anmelden"}
              </Btn>
              <button className="block text-sm underline" style={{ color: C.muted }}
                onClick={() => { setModus("vergessen"); setFehler(""); setGesendet(false); }}>Passwort vergessen?</button>
            </div>
          ) : modus === "vergessen" ? (
            gesendet ? (
              <div className="space-y-3">
                <p className="text-sm flex items-start gap-2" style={{ color: C.ok }}><Check size={16} className="shrink-0 mt-0.5" />
                  Wenn diese Adresse im Portal hinterlegt ist, kommt gleich eine E-Mail mit einem Link.</p>
                <p className="text-sm" style={{ color: C.muted }}>
                  Über den Link vergibst du dein neues Passwort selbst. Er gilt zwei Stunden. Schau auch im Spam-Ordner nach.
                </p>
                <button className="text-sm underline" style={{ color: C.muted }} onClick={() => setModus("login")}>Zurück zur Anmeldung</button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm" style={{ color: C.muted }}>Gib deine E-Mail-Adresse ein. Wir schicken dir einen Link, mit dem du ein neues Passwort vergibst.</p>
                <Feld label="E-Mail" value={email} onChange={setEmail} placeholder="name@egc-energie.de" />
                <Btn onClick={vergessen} disabled={!/\S+@\S+\.\S+/.test(email) || laeuft}>
                  {laeuft ? "Einen Moment …" : "Link zum Neusetzen anfordern"}
                </Btn>
                <button className="block text-sm underline" style={{ color: C.muted }} onClick={() => setModus("login")}>Zurück zur Anmeldung</button>
              </div>
            )
          ) : (
            <div className="space-y-4">
              <Feld label="Einladungscode aus deinem Link" value={code} onChange={setCode}
                placeholder="Code hinter ?code= im Link" />
              <Btn onClick={einloesen} disabled={!code || laeuft}>
                {laeuft ? "Einen Moment …" : "Weiter zur Registrierung"}
              </Btn>
            </div>
          )}

          {fehler && <p className="text-sm mt-4" style={{ color: C.warn }}>{fehler}</p>}

          <div className="mt-6 pt-4" style={{ borderTop: "1px solid " + C.line }}>
            <p className="text-xs" style={{ color: C.muted }}>{VERSION_ANZEIGE}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Leads aus Social Media, Tippgebern oder Kaltakquise */
function Leads({ leads, setLeads, mitarbeiter, user, onUebernehmen, onGelesen }) {
  const [auswahl, setAuswahl] = useState(null);
  const [entwurf, setEntwurf] = useState(null);
  const [zieht, setZieht] = useState(null);
  const [ueber, setUeber] = useState(null);

  const [modus, setModus] = useState("kanban");
  const [zeitraum, setZeitraum] = useState("alle");
  const [tag, setTag] = useState(heute());
  const [quelle, setQuelle] = useState("alle");

  /* Sehen alle Leads: Leitung und Geschäftsführung.
     Anlegen darf jeder im Vertrieb, zuweisen an andere nur ab Teamleiter aufwärts. */
  const sichtAlle = ["Leitung Vertrieb", "Geschäftsführung", "Leadmanagement"].includes(user.rolle);
  const darfAnlegen = ["Vertriebspartner", "Teamleiter", "Leitung Vertrieb", "Geschäftsführung",
    "Leadmanagement"].includes(user.rolle);
  const darfZuweisen = ["Teamleiter", "Leitung Vertrieb", "Geschäftsführung", "Leadmanagement"]
    .includes(user.rolle);
  const meineIds = user.rolle === "Teamleiter"
    ? [user.id, ...strukturUnter(user.id, mitarbeiter).map((m) => m.id)]
    : [user.id];
  const eigene = sichtAlle ? leads : leads.filter((l) => meineIds.includes(l.zugewiesen));
  const sichtbar = eigene.filter((l) =>
    imZeitraum(l.angelegt, zeitraum, tag) && (quelle === "alle" || l.quelle === quelle));
  const empfaenger = (sichtAlle
    ? mitarbeiter.filter((m) =>
        ["Vertriebspartner", "Teamleiter", "Leitung Vertrieb"].includes(m.rolle))
    : [user, ...strukturUnter(user.id, mitarbeiter)]
  ).filter((m) => m.status === "aktiv");
  const lead = leads.find((l) => l.id === auswahl);

  const setz = (id, aend) => setLeads(leads.map((l) => {
    if (l.id !== id) return l;
    const neu = { ...l, ...aend };
    if (aend.status === "auftrag" && !neu.abschlussAm) neu.abschlussAm = heute();
    if (aend.status && aend.status !== "auftrag") neu.abschlussAm = "";
    return neu;
  }));
  const oeffnen = (l) => {
    setAuswahl(l.id);
    if (!l.gelesen && l.zugewiesen === user.id) onGelesen(l.id);
  };

  const speichern = () => {
    const vorhanden = leads.some((l) => l.id === entwurf.id);
    const fertig = { ...entwurf };
    /* Wer nicht zuweisen darf, legt Leads für sich selbst an */
    if (!darfZuweisen && !fertig.zugewiesen) {
      fertig.zugewiesen = user.id;
      fertig.zugewiesenVon = user.name;
      fertig.zugewiesenAm = heute();
      fertig.gelesen = true;
    }
    if (fertig.zugewiesen === user.id) fertig.gelesen = true;
    if (fertig.zugewiesen && !fertig.zugewiesenAm) {
      fertig.zugewiesenVon = user.name;
      fertig.zugewiesenAm = heute();
      fertig.gelesen = false;
    }
    setLeads(vorhanden ? leads.map((l) => (l.id === fertig.id ? fertig : l)) : [fertig, ...leads]);
    setEntwurf(null);
  };

  /* ---------- Formular ---------- */
  if (entwurf) {
    const setF = (k, v) => setEntwurf({ ...entwurf, [k]: v });
    return (
      <div>
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => setEntwurf(null)} style={{ color: C.muted }}><ArrowLeft size={18} /></button>
          <h2 className="text-lg">{leads.some((l) => l.id === entwurf.id) ? "Lead bearbeiten" : "Neuen Lead einspielen"}</h2>
        </div>

        <div className="space-y-5">
          <div className="rounded p-5" style={{ background: C.card, border: "1px solid " + C.line }}>
            <div className="text-sm mb-4">Unternehmen und Ansprechpartner</div>
            <div className="grid sm:grid-cols-2 gap-4">
              <Feld label="Firma" value={entwurf.firma} onChange={(v) => setF("firma", v)} breit />
              <Feld label="Straße und Hausnummer" value={entwurf.strasse} onChange={(v) => setF("strasse", v)} breit />
              <Feld label="PLZ" value={entwurf.plz} onChange={(v) => setF("plz", v)} />
              <Feld label="Ort" value={entwurf.ort} onChange={(v) => setF("ort", v)} />
              <Feld label="Ansprechpartner" value={entwurf.ansprechpartner} onChange={(v) => setF("ansprechpartner", v)} />
              <Feld label="Position" value={entwurf.position} onChange={(v) => setF("position", v)} />
              <Feld label="Telefon" value={entwurf.telefon} onChange={(v) => setF("telefon", v)} />
              <Feld label="E-Mail" value={entwurf.email} onChange={(v) => setF("email", v)} />
            </div>
          </div>

          <div className="rounded p-5" style={{ background: C.card, border: "1px solid " + C.line }}>
            <div className="text-sm mb-4">Verbrauch und aktuelle Versorgung</div>
            <div className="grid sm:grid-cols-2 gap-4">
              <Feld label="Jahresverbrauch Strom in kWh" value={entwurf.verbrauchStrom} zahl
                onChange={(v) => setF("verbrauchStrom", v)} />
              <Feld label="Jahresverbrauch Erdgas in kWh" value={entwurf.verbrauchGas} zahl
                onChange={(v) => setF("verbrauchGas", v)} />
              <Feld label="Vertrag Strom läuft bis" type="date" value={entwurf.laufzeitStrom}
                onChange={(v) => setF("laufzeitStrom", v)} />
              <Feld label="Vertrag Erdgas läuft bis" type="date" value={entwurf.laufzeitGas}
                onChange={(v) => setF("laufzeitGas", v)} />
              <Feld label="Aktuelle Beschaffung" value={entwurf.beschaffung}
                onChange={(v) => setF("beschaffung", v)}
                placeholder="z. B. Festpreis über Stadtwerke seit 2024" breit />
            </div>
            <label className="flex items-center gap-3 text-sm mt-4">
              <input type="checkbox" checked={!!entwurf.dienstleister}
                onChange={(e) => setF("dienstleister", e.target.checked)} style={{ accentColor: C.ink }} />
              Kunde arbeitet bereits mit einem Energiedienstleister
            </label>
            {entwurf.dienstleister && (
              <div className="mt-4">
                <Feld label="Welcher Dienstleister?" value={entwurf.dienstleisterName}
                  onChange={(v) => setF("dienstleisterName", v)} />
              </div>
            )}
          </div>

          <div className="rounded p-5" style={{ background: C.card, border: "1px solid " + C.line }}>
            <div className="text-sm mb-4">Herkunft und Termin</div>
            <div className="grid sm:grid-cols-2 gap-4">
              <Select label="Lead generiert über" value={entwurf.quelle}
                onChange={(v) => setF("quelle", v)} options={LEAD_QUELLEN} />
              <Feld label="Details zur Herkunft" value={entwurf.quelleDetail}
                onChange={(v) => setF("quelleDetail", v)}
                placeholder="Kampagne, Tippgeber, Kontaktanlass" />
              <Feld label="Termin am" type="date" value={entwurf.terminDatum}
                onChange={(v) => setF("terminDatum", v)} />
              <Feld label="Uhrzeit" value={entwurf.terminZeit}
                onChange={(v) => setF("terminZeit", v)} placeholder="14:30" />
              <Select label="Terminform" value={entwurf.terminArt}
                onChange={(v) => setF("terminArt", v)} options={TERMINARTEN} breit />
            </div>
            <label className="block mt-4">
              <span className="block text-xs mb-1" style={{ color: C.muted }}>Bemerkungen</span>
              <textarea rows={3} value={entwurf.bemerkung} onChange={(e) => setF("bemerkung", e.target.value)}
                className="w-full px-3 py-2 text-sm rounded outline-none"
                style={{ border: "1px solid " + C.line }} />
            </label>
          </div>

          <div className="rounded p-5" style={{ background: C.card, border: "1px solid " + C.line }}>
            <div className="text-sm mb-1">Unterlagen</div>
            <p className="text-xs mb-4" style={{ color: C.muted }}>
              Versorgerabrechnungen, Lastgänge und alles Weitere als PDF, Excel oder CSV.
            </p>
            <div className="space-y-2 mb-3">
              {entwurf.dateien.map((d, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="flex-1 min-w-0"><DateiChip datei={d} /></div>
                  <button onClick={() => setF("dateien", entwurf.dateien.filter((_, x) => x !== i))}
                    style={{ color: C.muted }}><X size={15} /></button>
                </div>
              ))}
            </div>
            <label className="flex items-center gap-2 px-3 py-2 rounded text-sm cursor-pointer"
                   style={{ border: "1px dashed " + C.line, color: C.muted, background: "#fff" }}>
              <Upload size={14} /> Dateien hinzufügen
              <input type="file" multiple className="hidden"
                onChange={(e) => {
                  Array.from(e.target.files || []).forEach((f) =>
                    dateiLesen(f, (d) => setEntwurf((v) => ({ ...v, dateien: [...v.dateien, d] }))));
                }} />
            </label>
          </div>

          <div className="rounded p-5" style={{ background: C.card, border: "1px solid " + C.line }}>
            <div className="text-sm mb-4">Zuweisung</div>
            {!darfZuweisen ? (
              <p className="text-sm" style={{ color: C.muted }}>
                Der Lead läuft auf dich. Teamleiter und Vertriebsleitung sehen ihn in ihren Übersichten mit.
              </p>
            ) : (
            <Select label="Lead zuweisen an" value={entwurf.zugewiesen || ""}
              onChange={(v) => setF("zugewiesen", v || null)}
              options={[{ value: "", label: "Noch nicht zuweisen" },
                        ...empfaenger.map((m) => ({
                          value: m.id,
                          label: (m.id === user.id ? m.name + " (ich)" : m.name) + " · " + m.rolle + " · Team " + m.team,
                        }))]} />
            )}
            {darfZuweisen && (
              <p className="text-xs mt-2" style={{ color: C.muted }}>
                Der Empfänger sieht den Lead sofort in seiner Übersicht, markiert als neu.
                {!sichtAlle ? " Du kannst innerhalb deiner Struktur zuweisen." : ""}
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <Btn icon={Check} onClick={speichern} disabled={!entwurf.firma}>Lead speichern</Btn>
            <Btn variante="hell" onClick={() => setEntwurf(null)}>Abbrechen</Btn>
          </div>
        </div>
      </div>
    );
  }

  /* ---------- Einzelansicht ---------- */
  if (lead) {
    const inhaber = mitarbeiter.find((m) => m.id === lead.zugewiesen);
    const st = LEAD_STATUS[leadSpalte(lead)];
    const Zeile = ({ k, v }) => (
      <div className="flex justify-between gap-4 py-1.5 text-sm" style={{ borderBottom: "1px solid " + C.line }}>
        <span style={{ color: C.muted }}>{k}</span>
        <span className="text-right" style={{ fontVariantNumeric: "tabular-nums" }}>{v || "–"}</span>
      </div>
    );
    return (
      <div>
        <div className="flex items-center gap-3 mb-1">
          <button onClick={() => setAuswahl(null)} style={{ color: C.muted }}><ArrowLeft size={18} /></button>
          <h2 className="text-lg">{lead.firma}</h2>
          <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: st.color }}>
            <span className="w-2 h-2 rounded-full" style={{ background: st.color }} />{st.label}
          </span>
        </div>
        <p className="text-sm mb-4 ml-8" style={{ color: C.muted }}>
          {lead.id} · {lead.quelle}{lead.quelleDetail ? " · " + lead.quelleDetail : ""} · eingespielt {datum(lead.angelegt)}
        </p>

        <div className="rounded p-4 mb-5" style={{ background: C.card, border: "1px solid " + st.color }}>
          <div className="sm:max-w-xs">
            <Select label="Aktuelle Phase" value={leadSpalte(lead)}
              onChange={(v) => setz(lead.id, { status: v })}
              options={LEAD_SPALTEN.map((sp) => ({ value: sp.id, label: sp.label }))} />
          </div>
          {lead.abschlussAm && (
            <p className="text-xs mt-2" style={{ color: C.muted }}>
              Abschluss am {datum(lead.abschlussAm)} · {num(tageZwischen(lead.angelegt, lead.abschlussAm) || 0)} Tage nach Eingang
            </p>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5 min-w-0">
            <div className="rounded p-5" style={{ background: C.card, border: "1px solid " + C.line }}>
              <div className="text-sm mb-3">Verbrauch und Versorgung</div>
              <div className="grid sm:grid-cols-2 gap-x-8">
                <Zeile k="Strom" v={lead.verbrauchStrom ? num(parseFloat(lead.verbrauchStrom)) + " kWh" : "–"} />
                <Zeile k="Erdgas" v={lead.verbrauchGas ? num(parseFloat(lead.verbrauchGas)) + " kWh" : "–"} />
                <Zeile k="Vertrag Strom bis" v={datum(lead.laufzeitStrom)} />
                <Zeile k="Vertrag Erdgas bis" v={datum(lead.laufzeitGas)} />
                <Zeile k="Aktuelle Beschaffung" v={lead.beschaffung} />
                <Zeile k="Dienstleister" v={lead.dienstleister ? (lead.dienstleisterName || "ja") : "keiner"} />
              </div>
            </div>

            <div className="rounded p-5" style={{ background: C.card, border: "1px solid " + C.line }}>
              <div className="text-sm mb-3">Termin</div>
              <div className="grid sm:grid-cols-2 gap-x-8">
                <Zeile k="Datum" v={lead.terminDatum ? datum(lead.terminDatum) + (lead.terminZeit ? ", " + lead.terminZeit + " Uhr" : "") : "noch offen"} />
                <Zeile k="Form" v={lead.terminArt} />
              </div>
              {lead.bemerkung && (
                <p className="text-sm mt-4 p-3 rounded" style={{ background: "#F6F8FA" }}>{lead.bemerkung}</p>
              )}
            </div>

            {lead.dateien.length > 0 && (
              <div className="rounded p-5" style={{ background: C.card, border: "1px solid " + C.line }}>
                <div className="text-sm mb-3">Unterlagen</div>
                <div className="space-y-2">
                  {lead.dateien.map((d, i) => <DateiChip key={i} datei={d} />)}
                </div>
              </div>
            )}

            <div className="rounded p-5" style={{ background: C.card, border: "1px solid " + C.line }}>
              <div className="flex flex-wrap gap-2">
                <Btn icon={Plus} onClick={() => { setz(lead.id, { status: "angebot" }); onUebernehmen(lead); }}>
                  Angebotsanfrage aus Lead erstellen
                </Btn>
                {(sichtAlle || lead.zugewiesen === user.id) && (
                  <Btn variante="hell" onClick={() => setEntwurf(lead)}>Lead bearbeiten</Btn>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-5 min-w-0">
            <div className="rounded p-4" style={{ background: C.card, border: "1px solid " + C.line }}>
              <div className="text-sm mb-3">Kontakt</div>
              <Zeile k="Ansprechpartner" v={lead.ansprechpartner} />
              <Zeile k="Position" v={lead.position} />
              <Zeile k="Telefon" v={lead.telefon} />
              <Zeile k="E-Mail" v={lead.email} />
              <Zeile k="Anschrift" v={[lead.strasse, lead.plz + " " + lead.ort].filter(Boolean).join(", ")} />
            </div>

            <div className="rounded p-4" style={{ background: C.card, border: "1px solid " + C.line }}>
              <div className="text-sm mb-3">Zuweisung</div>
              {inhaber ? (
                <div className="flex items-center gap-3">
                  <Avatar m={inhaber} size={34} />
                  <div>
                    <div className="text-sm">{inhaber.name}</div>
                    <div className="text-xs" style={{ color: C.muted }}>
                      {inhaber.rolle} · von {lead.zugewiesenVon} am {datum(lead.zugewiesenAm)}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm" style={{ color: C.muted }}>Noch niemandem zugewiesen.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ---------- Kanban ---------- */
  const Karte = ({ l }) => {
    const inhaber = mitarbeiter.find((m) => m.id === l.zugewiesen);
    const neu = !l.gelesen && l.zugewiesen === user.id;
    const menge = (parseFloat(l.verbrauchStrom) || 0) + (parseFloat(l.verbrauchGas) || 0);
    return (
      <div
        draggable
        onDragStart={(e) => { setZieht(l.id); e.dataTransfer.effectAllowed = "move"; }}
        onDragEnd={() => setZieht(null)}
        className="rounded p-3 mb-2"
        style={{
          background: neu ? "#F1F7F0" : "#fff",
          border: "1px solid " + (neu ? C.ok : C.line),
          opacity: zieht === l.id ? 0.4 : 1,
          cursor: "grab",
        }}>
        <button onClick={() => oeffnen(l)} className="w-full text-left">
          <div className="text-sm flex items-start gap-2">
            <span className="flex-1">{l.firma}</span>
            {neu && <span className="text-xs px-1.5 rounded" style={{ background: C.ok, color: "#fff" }}>neu</span>}
          </div>
          <div className="text-xs mt-1" style={{ color: C.muted }}>
            {l.ort} · {l.quelle}
          </div>
          <div className="flex items-center justify-between mt-2 text-xs" style={{ color: C.muted }}>
            <span style={{ fontVariantNumeric: "tabular-nums" }}>{num(menge)} kWh</span>
            {l.terminDatum && <span>{datum(l.terminDatum)}</span>}
          </div>
          {inhaber && (sichtAlle || inhaber.id !== user.id) && (
            <div className="flex items-center gap-2 mt-2 pt-2" style={{ borderTop: "1px solid " + C.line }}>
              <Avatar m={inhaber} size={20} />
              <span className="text-xs truncate" style={{ color: C.muted }}>{inhaber.name}</span>
            </div>
          )}
        </button>

        <div className="mt-2">
          <select
            value={leadSpalte(l)}
            onChange={(e) => setz(l.id, { status: e.target.value })}
            className="w-full px-2 py-1 text-xs rounded outline-none"
            style={{ border: "1px solid " + C.line, color: C.muted, background: "#F6F8FA" }}>
            {LEAD_SPALTEN.map((sp) => (
              <option key={sp.id} value={sp.id}>{sp.label}</option>
            ))}
          </select>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex gap-1">
          {[["kanban", "Board"], ["liste", "Liste"], ["auswertung", "Auswertung"]].map(([id, label]) => (
            <button key={id} onClick={() => setModus(id)}
              className="px-3 py-1.5 text-sm rounded"
              style={{
                background: modus === id ? C.ink : "transparent",
                color: modus === id ? "#fff" : C.muted,
                border: "1px solid " + (modus === id ? C.ink : C.line),
              }}>{label}</button>
          ))}
        </div>
        {darfAnlegen && (
          <Btn icon={Plus} onClick={() => setEntwurf({
            ...leererLead(),
            quelle: darfZuweisen ? "Kaltakquise" : "Eigenakquise",
            zugewiesen: darfZuweisen ? null : user.id,
          })}>Lead anlegen</Btn>
        )}
      </div>

      <div className="rounded p-3 mb-5 grid sm:grid-cols-3 gap-3"
           style={{ background: C.card, border: "1px solid " + C.line }}>
        <Select label="Eingespielt im Zeitraum" value={zeitraum} onChange={setZeitraum} options={ZEITRAEUME} />
        {zeitraum === "tag" ? (
          <Feld label="Tag" type="date" value={tag} onChange={setTag} />
        ) : (
          <div className="hidden sm:block" />
        )}
        <Select label="Herkunft des Leads" value={quelle} onChange={setQuelle}
          options={[{ value: "alle", label: "Alle Quellen" }, ...LEAD_QUELLEN]} />
      </div>

      {modus === "auswertung" ? (
        <LeadAuswertung leads={sichtbar} mitarbeiter={mitarbeiter} user={user} darfAlles={sichtAlle} />
      ) : sichtbar.length === 0 ? (
        <div className="rounded p-8 text-center text-sm"
             style={{ border: "1px dashed " + C.line, color: C.muted }}>
          Keine Leads im gewählten Zeitraum.
        </div>
      ) : modus === "liste" ? (
        <div className="rounded overflow-hidden" style={{ background: C.card, border: "1px solid " + C.line }}>
          {[...sichtbar].sort((a, b) => (b.angelegt || "").localeCompare(a.angelegt || "")).map((l, i) => {
            const sp = LEAD_STATUS[leadSpalte(l)];
            const inhaber = mitarbeiter.find((m) => m.id === l.zugewiesen);
            const neuL = !l.gelesen && l.zugewiesen === user.id;
            return (
              <button key={l.id} onClick={() => oeffnen(l)}
                className="w-full text-left px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-1"
                style={{ borderTop: i ? "1px solid " + C.line : "none",
                         background: neuL ? "#F1F7F0" : "transparent" }}>
                <div className="flex-1 min-w-40">
                  <div className="text-sm flex items-center gap-2">
                    {l.firma}
                    {neuL && <span className="text-xs px-1.5 rounded" style={{ background: C.ok, color: "#fff" }}>neu</span>}
                  </div>
                  <div className="text-xs" style={{ color: C.muted }}>
                    {l.ort} · {l.quelle} · eingespielt {datum(l.angelegt)}
                    {inhaber && inhaber.id !== user.id ? " · " + inhaber.name : ""}
                  </div>
                </div>
                <div className="text-sm text-right w-28" style={{ fontVariantNumeric: "tabular-nums" }}>
                  {num((parseFloat(l.verbrauchStrom) || 0) + (parseFloat(l.verbrauchGas) || 0))} kWh
                </div>
                <span className="inline-flex items-center gap-1.5 text-xs w-36" style={{ color: sp.color }}>
                  <span className="w-2 h-2 rounded-full" style={{ background: sp.color }} />{sp.label}
                </span>
                <ChevronRight size={15} style={{ color: C.muted }} />
              </button>
            );
          })}
        </div>
      ) : (
        <div className="overflow-x-auto pb-2">
          <div className="flex gap-3" style={{ minWidth: LEAD_SPALTEN.length * 244 }}>
            {LEAD_SPALTEN.map((sp) => {
              const drin = sichtbar.filter((l) => leadSpalte(l) === sp.id);
              const menge = drin.reduce((t, l) =>
                t + (parseFloat(l.verbrauchStrom) || 0) + (parseFloat(l.verbrauchGas) || 0), 0);
              return (
                <div key={sp.id} className="flex-1 rounded p-2"
                  style={{
                    minWidth: 232,
                    background: ueber === sp.id ? "#E8EDF3" : "#F6F8FA",
                    border: "1px solid " + (ueber === sp.id ? sp.color : C.line),
                  }}
                  onDragOver={(e) => { e.preventDefault(); setUeber(sp.id); }}
                  onDragLeave={() => setUeber((x) => (x === sp.id ? null : x))}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (zieht) setz(zieht, { status: sp.id });
                    setZieht(null); setUeber(null);
                  }}>
                  <div className="px-2 py-2 mb-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: sp.color }} />
                      <span className="text-sm flex-1">{sp.label}</span>
                      <span className="text-xs" style={{ color: C.muted, fontVariantNumeric: "tabular-nums" }}>
                        {drin.length}
                      </span>
                    </div>
                    <div className="text-xs mt-1 ml-4" style={{ color: C.muted, fontVariantNumeric: "tabular-nums" }}>
                      {menge > 0 ? num(menge) + " kWh" : "–"}
                    </div>
                  </div>

                  {drin.map((l) => <Karte key={l.id} l={l} />)}

                  {drin.length === 0 && (
                    <div className="rounded px-2 py-6 text-center text-xs"
                         style={{ border: "1px dashed " + C.line, color: C.muted }}>
                      hierher ziehen
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* Auswertung: Termine, Abschlüsse, Quote und Dauer je Vertriebsmitarbeiter */
function LeadAuswertung({ leads, mitarbeiter, user, darfAlles }) {
  const kennzahlen = (menge) => {
    const termine = menge.filter((l) => l.terminDatum && l.terminDatum <= heute()).length;
    const auftrag = menge.filter((l) => leadSpalte(l) === "auftrag");
    const verloren = menge.filter((l) => leadSpalte(l) === "verloren").length;
    const dauern = auftrag.map((l) => tageZwischen(l.angelegt, l.abschlussAm)).filter((x) => x != null);
    return {
      leads: menge.length,
      termine,
      abschluesse: auftrag.length,
      verloren,
      quote: termine > 0 ? (auftrag.length / termine) * 100 : 0,
      dauer: dauern.length ? dauern.reduce((a, b) => a + b, 0) / dauern.length : null,
      menge: menge.reduce((t, l) =>
        t + (parseFloat(l.verbrauchStrom) || 0) + (parseFloat(l.verbrauchGas) || 0), 0),
    };
  };

  const personen = darfAlles
    ? mitarbeiter.filter((m) => ["Vertriebspartner", "Teamleiter", "Leitung Vertrieb"].includes(m.rolle))
    : user.rolle === "Teamleiter"
      ? [user, ...strukturUnter(user.id, mitarbeiter)]
      : [user];

  const zeilen = personen
    .map((m) => ({ m, k: kennzahlen(leads.filter((l) => l.zugewiesen === m.id)) }))
    .filter((z) => z.k.leads > 0)
    .sort((a, b) => b.k.abschluesse - a.k.abschluesse || b.k.quote - a.k.quote);

  const gesamt = kennzahlen(leads);

  const Kachel = ({ k, v, farbe }) => (
    <div className="rounded p-4" style={{ background: C.card, border: "1px solid " + C.line }}>
      <div className="text-xs mb-2" style={{ color: C.muted }}>{k}</div>
      <div className="text-2xl" style={{ color: farbe || C.text, fontVariantNumeric: "tabular-nums" }}>{v}</div>
    </div>
  );

  const Kopf = ({ children, rechts }) => (
    <th className={"px-3 py-2 text-xs font-normal " + (rechts ? "text-right" : "text-left")}
        style={{ color: C.muted, whiteSpace: "nowrap" }}>{children}</th>
  );
  const Zelle = ({ children, rechts, dick }) => (
    <td className={"px-3 py-2.5 text-sm " + (rechts ? "text-right" : "")}
        style={{ fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap",
                 borderTop: "1px solid " + C.line, fontWeight: dick ? 500 : 400 }}>{children}</td>
  );

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kachel k="Termine wahrgenommen" v={gesamt.termine} />
        <Kachel k="Abschlüsse" v={gesamt.abschluesse} farbe={C.ok} />
        <Kachel k="Verloren" v={gesamt.verloren} farbe={gesamt.verloren ? C.warn : C.text} />
        <Kachel k="Abschlussquote auf Termin" v={num(gesamt.quote, 0) + " %"} />
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <Kachel k="Ø Tage von Eingang bis Abschluss"
          v={gesamt.dauer != null ? num(gesamt.dauer, 0) : "–"} />
        <Kachel k="Menge in den Leads (kWh/Jahr)" v={num(gesamt.menge)} />
      </div>

      {zeilen.length > 0 && (
        <div className="rounded overflow-x-auto" style={{ background: C.card, border: "1px solid " + C.line }}>
          <table className="w-full" style={{ minWidth: 720 }}>
            <thead>
              <tr>
                <Kopf>Vertriebsmitarbeiter</Kopf>
                <Kopf rechts>Leads</Kopf>
                <Kopf rechts>Termine</Kopf>
                <Kopf rechts>Abschlüsse</Kopf>
                <Kopf rechts>Verloren</Kopf>
                <Kopf rechts>Quote</Kopf>
                <Kopf rechts>Ø Tage</Kopf>
              </tr>
            </thead>
            <tbody>
              {zeilen.map(({ m, k }) => (
                <tr key={m.id}>
                  <Zelle>
                    <span className="inline-flex items-center gap-2">
                      <Avatar m={m} size={26} />
                      <span>{m.name}
                        <span className="block text-xs" style={{ color: C.muted }}>
                          {m.rolle} · Team {m.team}
                        </span>
                      </span>
                    </span>
                  </Zelle>
                  <Zelle rechts>{k.leads}</Zelle>
                  <Zelle rechts>{k.termine}</Zelle>
                  <Zelle rechts>{k.abschluesse}</Zelle>
                  <Zelle rechts>{k.verloren}</Zelle>
                  <Zelle rechts dick>{num(k.quote, 0)} %</Zelle>
                  <Zelle rechts>{k.dauer != null ? num(k.dauer, 0) : "–"}</Zelle>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs" style={{ color: C.muted, maxWidth: "68ch" }}>
        Als Termin zählt ein Lead mit Termindatum, das nicht in der Zukunft liegt. Die Quote setzt
        Abschlüsse ins Verhältnis zu wahrgenommenen Terminen. Die Dauer misst die Tage vom Einspielen
        des Leads bis zum Verschieben in die Spalte Auftrag.
      </p>
    </div>
  );
}

/* Versorger, mit denen zusammengearbeitet wird */
function Versorgerliste({ versorger, setVersorger, user, standard, setStandard }) {
  const [name, setName] = useState("");
  const [notiz, setNotiz] = useState("");
  const [branchen, setBranchen] = useState("");
  const darfAendern = user.rolle === "Geschäftsführung";

  const anlegen = () => {
    const sauber = name.trim();
    if (!sauber) return;
    if (versorger.some((v) => v.name.toLowerCase() === sauber.toLowerCase())) return;
    setVersorger([...versorger, { id: "v-" + uid(), name: sauber, notiz: notiz.trim(), branchen: branchen.trim() }]);
    setName(""); setNotiz(""); setBranchen("");
  };

  return (
    <div>
      <p className="text-sm mb-5" style={{ color: C.muted, maxWidth: "60ch" }}>
        Diese Liste erscheint beim Kalkulationsteam im Auswahlfeld, wenn ein Auftrag bestätigt wird.
        {darfAendern ? "" : " Ändern darf sie nur die Geschäftsführung."}
      </p>
      <div className="mb-5"><UmlagenPflege user={user} /></div>

      {darfAendern && (
        <div className="rounded p-4 mb-5" style={{ background: C.card, border: "1px solid " + C.strom }}>
          <div className="text-sm mb-1">Anteil an der Gesamtprovision</div>
          <p className="text-xs mb-3" style={{ color: C.muted, maxWidth: "64ch" }}>
            Welcher Anteil der ausgewiesenen Gesamtprovision tatsächlich bei EGC ankommt. Der Wert
            gilt für alle Versorger, sofern beim einzelnen Versorger unten nichts anderes eingetragen ist.
            Die Sätze der Vertriebspartner rechnen weiterhin auf die volle Gesamtprovision.
            Nur die Geschäftsführung sieht diese Werte.
          </p>
          <div className="sm:max-w-xs">
            <Feld label="Vorgabe in Prozent" value={standard}
              onChange={(v) => setStandard(v.replace(/[^\d]/g, ""))} />
          </div>
        </div>
      )}

      {darfAendern && (
        <div className="rounded p-4 mb-5" style={{ background: C.card, border: "1px solid " + C.line }}>
          <div className="grid sm:grid-cols-2 gap-4">
            <Feld label="Versorger" value={name} onChange={setName} placeholder="Name des Versorgers" />
            <Feld label="Notiz" value={notiz} onChange={setNotiz}
              placeholder="Konditionen, Ansprechpartner, Besonderheiten" />
            <Feld label="Branchen und Ausschlüsse" value={branchen} onChange={setBranchen}
              placeholder="welche Branchen werden angenommen, welche nicht" breit />
          </div>
          <div className="mt-4">
            <Btn icon={Plus} onClick={anlegen} disabled={!name.trim()}>Versorger anlegen</Btn>
          </div>
        </div>
      )}

      <div className="rounded overflow-hidden" style={{ background: C.card, border: "1px solid " + C.line }}>
        <div className="px-4 py-3 text-sm" style={{ borderBottom: "1px solid " + C.line }}>
          {versorger.length} Versorger
        </div>
        {versorger.length === 0 && (
          <div className="px-4 py-4 text-sm" style={{ color: C.muted }}>Noch kein Versorger angelegt.</div>
        )}
        {versorger.map((v, i) => (
          <div key={v.id} className="flex items-center gap-4 px-4 py-3"
               style={{ borderTop: i ? "1px solid " + C.line : "none" }}>
            <div className="flex-1 min-w-0">
              <div className="text-sm">{v.name}</div>
              {v.notiz && <div className="text-xs" style={{ color: C.muted }}>{v.notiz}</div>}
              {v.branchen && (
                <div className="text-xs mt-0.5" style={{ color: C.gas }}>Branchen: {v.branchen}</div>
              )}
            </div>
            {darfAendern && (
              <input value={v.anteil ?? ""} inputMode="numeric" placeholder={(standard || "–") + " %"}
                title="Eigener Anteil an der Gesamtprovision für diesen Versorger, leer = Vorgabe"
                onChange={(e) => {
                  const w = e.target.value.replace(/[^\d]/g, "");
                  setVersorger(versorger.map((x) => (x.id === v.id ? { ...x, anteil: w } : x)));
                }}
                className="w-16 px-2 py-1 text-sm rounded text-right outline-none"
                style={{ border: "1px solid " + C.line }} />
            )}
            {darfAendern && (
              <button onClick={() => setVersorger(versorger.filter((x) => x.id !== v.id))}
                style={{ color: C.muted }} title="Entfernen">
                <Trash2 size={15} />
              </button>
            )}
          </div>
        ))}
      </div>

      {darfAendern && (
        <p className="text-xs mt-4" style={{ color: C.muted, maxWidth: "60ch" }}>
          Ein entfernter Versorger verschwindet nur aus der Auswahl. Bereits bestätigte Aufträge
          behalten ihren Eintrag, damit die Historie stimmt.
        </p>
      )}
    </div>
  );
}

/* E-Mail-Signatur für den Vertrieb: Daten wie auf der Visitenkarte. Das Logo laden die Mailprogramme
   über die volle Adresse, deshalb fest auf das veröffentlichte Portal. */
const PORTAL_ADRESSE = "https://egc-vertriebsportal.netlify.app";
const htmlSicher = (t) => String(t || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
function signaturHtml(m) {
  const p = visitenkartenDaten(m), F = FIRMENDATEN;
  const web = (F.website || "www.egc-energie.de").replace(/^https?:\/\//, "");
  const tel = (t) => "tel:" + String(t).replace(/[^\d+]/g, "");
  const a = (href, t) => '<a href="' + href + '" style="color:#16212C;text-decoration:none">' + htmlSicher(t) + "</a>";
  const zeile = (k, v) => '<tr><td style="padding:0 8px 2px 0;color:#6B7787;font-size:11px">' + k + '</td><td style="padding:0 0 2px 0;font-size:12px;white-space:nowrap">' + v + "</td></tr>";
  const kontakt = [
    p.mobil ? zeile("Mobil", a(tel(p.mobil), p.mobil)) : "",
    p.telefon ? zeile("Telefon", a(tel(p.telefon), p.telefon)) : "",
    p.email ? zeile("E-Mail", a("mailto:" + p.email, p.email)) : "",
    zeile("Web", a("https://" + web, web)),
  ].join("");
  const fuss = ["EGC Energie" + (F.vertreter ? " · vertreten durch " + F.vertreter : ""), [F.strasse, F.ort].filter(Boolean).join(", "),
    F.ustId ? "USt-IdNr. " + F.ustId : ""].filter(Boolean).map(htmlSicher).join(" · ");
  return '<table cellpadding="0" cellspacing="0" border="0" style="font-family:Arial,Helvetica,sans-serif;color:#16212C;font-size:12px;line-height:1.4;border-collapse:collapse">'
    + '<tr><td style="padding:0 0 8px 0">'
    + '<div style="font-size:15px;font-weight:bold;color:#0A1626">' + htmlSicher(p.name) + "</div>"
    + (p.titel ? '<div style="font-size:12px;font-weight:bold;color:#4A8C26">' + htmlSicher(p.titel) + "</div>" : "")
    + (p.zusatz ? '<div style="font-size:11px;color:#6B7787">' + htmlSicher(p.zusatz) + "</div>" : "")
    + "</td></tr>"
    + '<tr><td style="border-top:2px solid #6CB43B;padding:10px 0 0 0">'
    + '<table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse"><tr>'
    + '<td style="padding:0 14px 0 0;vertical-align:middle"><a href="https://' + web + '"><img src="' + PORTAL_ADRESSE + '/assets/signatur-logo.png" width="110" height="51" alt="EGC Energie" style="display:block;border:0;width:110px;height:51px"></a></td>'
    + '<td style="border-left:1px solid #D8DDE4;padding:0 0 0 14px;vertical-align:middle"><table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse">' + kontakt + "</table></td>"
    + "</tr></table></td></tr>"
    + '<tr><td style="padding:10px 0 0 0;font-size:10px;color:#6B7787">' + fuss + "</td></tr></table>";
}
function signaturText(m) {
  const p = visitenkartenDaten(m), F = FIRMENDATEN;
  return [p.name, p.titel, p.zusatz, "", "EGC Energie", p.mobil && "Mobil " + p.mobil, p.telefon && "Telefon " + p.telefon,
    p.email && "E-Mail " + p.email, F.website || "www.egc-energie.de", [F.strasse, F.ort].filter(Boolean).join(", ")]
    .filter((z) => z !== null && z !== undefined && z !== false).join("\n").replace(/\n{3,}/g, "\n\n");
}
async function htmlKopieren(html, text) {
  try {
    if (navigator.clipboard && window.ClipboardItem) {
      await navigator.clipboard.write([new ClipboardItem({
        "text/html": new Blob([html], { type: "text/html" }), "text/plain": new Blob([text], { type: "text/plain" }) })]);
      return true;
    }
  } catch (e) { /* weiter mit dem Ersatzweg */ }
  const div = document.createElement("div");
  div.contentEditable = "true"; div.innerHTML = html;
  Object.assign(div.style, { position: "fixed", left: "-9999px", top: "0" });
  document.body.appendChild(div);
  const bereich = document.createRange(); bereich.selectNodeContents(div);
  const auswahl = window.getSelection(); auswahl.removeAllRanges(); auswahl.addRange(bereich);
  let ok = false; try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
  auswahl.removeAllRanges(); div.remove();
  return ok;
}
function EmailSignatur({ m }) {
  const [hinweis, setHinweis] = useState("");
  const [anleitung, setAnleitung] = useState(false);
  const html = signaturHtml(m);
  const p = visitenkartenDaten(m);
  const datei = () => {
    const voll = '<!doctype html><html><head><meta charset="utf-8"><title>Signatur ' + htmlSicher(p.name) + "</title></head><body>" + html + "</body></html>";
    dateiLaden({ name: "Signatur_EGC_" + p.name.replace(/[^\wäöüÄÖÜß]+/g, "_") + ".htm", typ: "text/html",
      url: "data:text/html;base64," + btoa(unescape(encodeURIComponent(voll))) });
  };
  return (
    <div className="rounded p-4 mb-4" style={{ background: C.card, border: "1px solid " + C.line }}>
      <div className="text-sm">Deine E-Mail-Signatur</div>
      <div className="text-xs mb-3" style={{ color: C.muted }}>
        Mit deinen Daten wie auf der Visitenkarte. Einmal kopieren und in deinem Mailprogramm als Signatur einfügen.
      </div>
      <div className="rounded p-4 mb-3 overflow-x-auto" style={{ background: "#fff", border: "1px solid " + C.line }}
           dangerouslySetInnerHTML={{ __html: html.split(PORTAL_ADRESSE + "/assets/").join("/assets/") }} />
      <div className="flex flex-wrap gap-2">
        <Btn icon={Check} onClick={async () => {
          const ok = await htmlKopieren(html, signaturText(m));
          setHinweis(ok ? "Kopiert. Jetzt im Mailprogramm in das Signaturfeld einfügen." : "Kopieren hat nicht geklappt. Bitte die Datei herunterladen.");
        }}>Signatur kopieren</Btn>
        <Btn variante="hell" icon={FileText} onClick={datei}>Als Datei (.htm)</Btn>
        <Btn variante="hell" onClick={() => setAnleitung(!anleitung)}>{anleitung ? "Anleitung ausblenden" : "So richtest du sie ein"}</Btn>
      </div>
      {hinweis && <p className="text-xs mt-2" style={{ color: C.ok }}>{hinweis}</p>}
      {anleitung && (
        <div className="text-xs mt-3 space-y-2" style={{ color: C.text, maxWidth: "70ch" }}>
          <p><b>Outlook am PC:</b> Datei › Optionen › E-Mail › Signaturen › Neu. Namen vergeben, in das große Feld klicken und einfügen (Strg + V), Speichern.
             Im neuen Outlook: Zahnrad › Konten › Signaturen.</p>
          <p><b>Strato Webmail:</b> Einstellungen (Zahnrad) › E-Mail › Signaturen › neue Signatur anlegen und einfügen.</p>
          <p><b>iPhone (Mail-App):</b> Einstellungen › Apps › Mail › Signatur, lange in das Feld tippen › Einfügen.
             Die Outlook-App am Handy übernimmt nur Text ohne Logo.</p>
          <p style={{ color: C.muted }}>Am einfachsten geht es am PC: Portal dort öffnen, „Signatur kopieren“ und in Outlook einfügen.
             Stimmen Telefonnummer oder Berufsbezeichnung nicht, sag der Geschäftsführung Bescheid, sie pflegt die Daten unter Visitenkarten.</p>
        </div>
      )}
    </div>
  );
}

/* Schulungen im EGC-Design, fest im Portal (Ordner unterlagen/schulungen, Stand wie in build.mjs) */
const SCHULUNGEN_PFAD = "/assets/schulungen-2/";
const SCHULUNGEN_FEST = [
  { datei: "EGC_Schulung_1_Grundlagen_Energiemarkt.pdf", titel: "Schulung 1 · Wie der Energiemarkt funktioniert", seiten: 29,
    text: "Marktlogik, Marktrollen, kW und kWh, Zählerarten und Messkonzepte." },
  { datei: "EGC_Schulung_2_Energiemarkt_Preisbildung.pdf", titel: "Schulung 2 · Wie Energiepreise entstehen", seiten: 19,
    text: "Merit Order, Spot- und Terminmarkt, Börse und OTC." },
  { datei: "EGC_Schulung_3_Beschaffungsmodelle.pdf", titel: "Schulung 3 · Beschaffungsmodelle und Kundenpassung", seiten: 31,
    text: "Festpreis, Spot, Index, Tranchen, Hybrid, Cap/Floor, Zielpreis, Portfolio und PPA." },
  { datei: "EGC_Schulung_4_Energienebenkosten.pdf", titel: "Schulung 4 · Energienebenkosten verstehen und senken", seiten: 26,
    text: "Woraus sich ein Energiepreis zusammensetzt und mit welchen Hebeln sich Nebenkosten senken lassen." },
  { datei: "EGC_Verkaufsskript_Spotmarkt.pdf", titel: "Verkaufsskript · Spotmarkt mit Festpreis-Option", seiten: 4,
    text: "Für kleine Gewerbekunden (SLP): Gespräch in 6 Schritten, Sätze zum Vorlesen, Einwände mit Antworten, Abschluss und Erfassung im Portal." },
].map((x) => ({ ...x, pfad: SCHULUNGEN_PFAD }));
/* feste Unterlagen je Bereich (Schulungen und Dokumente) */
const UNTERLAGEN_FEST = {
  schulung: SCHULUNGEN_FEST,
  dokumente: [{ datei: "EGC_Checkliste_Kundenunterlagen.pdf", titel: "Checkliste Kundenunterlagen (SLP und RLM)", seiten: 2,
    pfad: "/assets/dokumente-3/", text: "Was du vom Kunden brauchst: Firmenname wie bei Creditreform, Lieferstelle, MaLo, Zählertyp, Verbrauch, Vertrag und Kündigungsfrist, bei RLM die Lastgang-Datei." },
    { datei: "EGC_Zielpreisauftrag.pdf", titel: "Zielpreisauftrag (Fixierung zum Wunschpreis)", seiten: 1, pfad: "/assets/dokumente-3/",
      text: "Anlage zum Service- und Beratungsauftrag (Vollmacht) beim Spotmarkt mit Festpreis-Option: Wunschpreis, Lieferjahre, Teilmengen nur bei RLM, Unterschrift." },
    { titel: "Creditreform Firmeneintrag", url: "https://firmeneintrag.creditreform.de/", art: "Link",
      text: "Firmennamen des Kunden hier prüfen. Er muss im Auftrag genau so stehen, sonst lehnen Versorger oft ab. Nicht gefunden: bei Einzelunternehmen die Gewerbeanmeldung mitgeben." }],
  /* Leitfaden für Interessenten, allgemeine Fassung mit Kontakt EGC (druckvorlagen/whitepaper). Bei neuer Fassung MARKETING_STAND in build.mjs und hier erhöhen. */
  marketing: [{ datei: "EGC_Leitfaden_Energieeinkauf_2027.pdf", titel: "Leitfaden „Energieeinkauf 2027“", seiten: 22,
    pfad: "/assets/marketing-2/", text: "Zum Weitergeben an Interessenten: Kostenfallen, Rechnung lesen, Lastgang, Beschaffungsmodelle, Entlastungen, Praxisbeispiele und Fristenkalender. Kontakt EGC, für alle Kunden gleich." },
    { datei: "EGC_Flyer_Spotmarkt_Festpreis.pdf", titel: "Flyer · Spotmarkt mit Festpreis-Option", seiten: 1, pfad: "/assets/marketing-2/",
      text: "One-Pager für Interessenten: Start am Börsenpreis ohne Risikoprämie, Fixierung zum Wunschpreis für alle Lieferjahre, wir kümmern uns." }],
};

const Ablage = teilKomponente("selten", "Ablage");   /* in selten.jsx */
const Datenexport = teilKomponente("verwaltung", "Datenexport");   /* in verwaltung.jsx */
function meldungenFuer(user, mitarbeiter, anfragen, leads, tickets, probleme, smartmeter, akquise, termine) {
  const m = [];
  const zu = (art, id, text, ziel, datum) => m.push({ id: art + ":" + id, art, text, ziel, datum });
  const meineIds = user.rolle === "Teamleiter"
    ? [user.id, ...strukturUnter(user.id, mitarbeiter).map((x) => x.id)]
    : [user.id];

  if (["Vertriebspartner", "Teamleiter", "Leitung Vertrieb"].includes(user.rolle)) {
    anfragen.filter((a) => istBeteiligt(a, user.id)).forEach((a) => {
      if (a.status === "angebot") zu("angebot", a.id, "Angebot liegt vor: " + a.kunde.firma, { ansicht: "anfragen", vorgang: a.id }, a.angelegt);
      if (a.status === "klaerfall") zu("klaerfall", a.id, "Unterlagen fehlen: " + a.kunde.firma, { ansicht: "anfragen", vorgang: a.id }, a.angelegt);
      if (a.status === "angefragt") zu("angefragt", a.id, "Angebot beim Versorger angefragt: " + a.kunde.firma, { ansicht: "anfragen", vorgang: a.id }, a.angelegt);
      if (a.status === "einreichung") zu("einreichung", a.id, "Beim Versorger eingereicht: " + a.kunde.firma, { ansicht: "anfragen", vorgang: a.id }, a.angelegt);
      if (a.status === "bestaetigt") zu("bestaetigt", a.id, "Vom Versorger bestätigt: " + a.kunde.firma + ", Provision noch offen", { ansicht: "anfragen", vorgang: a.id }, a.angelegt);
      if (a.status === "abgeschlossen" && a.provisionErhalten)
        zu("provision", a.id, "Provision eingegangen: " + a.kunde.firma, { ansicht: "provisionen", vorgang: a.id }, a.provisionErhalten.datum);
      if (a.status === "abgelehnt" && a.klaerung && a.klaerung.art === "ablehnung")
        zu("ablehnung", a.id, "Vom Versorger abgelehnt: " + a.kunde.firma, { ansicht: "anfragen", vorgang: a.id }, a.angelegt);
      if (a.status === "abgeschlossen") {
        const ende = vertragsende(a);
        const rest = monateBis(ende);
        if (rest != null && rest >= 0 && rest <= VERLAENGERUNG_VORLAUF[0] &&
            !anfragen.some((x) => x.verlaengerungVon === a.id))
          zu("verlaengerung", a.id,
            "Vertrag läuft aus: " + a.kunde.firma + " am " + datum(ende) +
            " · noch " + rest + " Monate",
            { ansicht: "kunden", vorgang: a.id }, ende);
      }
      if (a.absage && a.absage.wiedervorlage && a.absage.wiedervorlage <= heute())
        zu("wiedervorlage", a.id, "Wiedervorlage fällig: " + a.kunde.firma, { ansicht: "anfragen", vorgang: a.id }, a.absage.wiedervorlage);
    });
    (leads || []).filter((l) => l.zugewiesen === user.id && !l.gelesen)
      .forEach((l) => zu("lead", l.id, "Neuer Lead: " + l.firma, { ansicht: "leads" }, l.angelegt));
    (termine || []).filter((t) => t.vonId === user.id && t.fuerId !== user.id && (t.verlauf || []).length).forEach((t) => {
      const v = t.verlauf[t.verlauf.length - 1];
      const wer = ((mitarbeiter || []).find((m) => m.id === t.fuerId) || {}).name || "Dein Teampartner";
      zu("terminrueck", t.id + ":" + t.verlauf.length, wer + ": " + ((t.kunde || {}).firma || t.titel) + " · "
        + (v.art === "verschoben" ? "verschoben auf " + datum(v.neu.datum) + (v.neu.zeit ? " " + v.neu.zeit : "") : (TERMIN_ERGEBNIS[v.art] || {}).label || v.art)
        + (v.notiz ? " · " + v.notiz.slice(0, 80) : ""), { ansicht: "kalender" }, v.am);
    });
    (termine || []).filter((t) => t.fuerId === user.id && t.vonId && t.vonId !== user.id && !t.erledigt && (t.datum || "") >= heute())
      .forEach((t) => zu("termin", t.id + ":" + (t.datum || "") + (t.zeit || "") + String(t.notiz || "").length,
        "Termin von " + (t.vonName || "deinem Teamleiter") + ": " + ((t.kunde || {}).firma || t.titel)
        + " am " + datum(t.datum) + (t.zeit ? " um " + t.zeit + " Uhr" : "") + (t.notiz ? " · mit Hinweisen" : ""), { ansicht: "kalender" }, t.angelegt || t.datum));
    (akquise || []).filter((l) =>
      (Array.isArray(l.zugewiesen) ? l.zugewiesen : l.zugewiesen ? [l.zugewiesen] : [])
        .includes(user.id)).forEach((l) => {
      const offen = l.eintraege.filter((e) => e.status === "offen").length;
      if (offen > 0)
        zu("akquise", l.id, "Kontaktliste " + l.branche + ": " + offen + " offene Kontakte",
          { ansicht: "akquise" }, l.hochgeladen);
    });
  }

  if (user.rolle === "Kalkulation") {
    anfragen.filter((a) => a.status === "eingereicht")
      .forEach((a) => zu("eingang", a.id, "Neue Anfrage: " + a.kunde.firma, { ansicht: "eingang", vorgang: a.id }, a.angelegt));
    anfragen.filter((a) => a.status === "uebermittelt")
      .forEach((a) => zu("auftrag", a.id, "Neuer Auftrag einzureichen: " + a.kunde.firma, { ansicht: "auftraege", vorgang: a.id }, a.angelegt));
    (smartmeter || []).filter((v) => v.status === "eingereicht")
      .forEach((v) => zu("sm", v.id, "Smartmeter-Anfrage: " + v.kunde, { ansicht: "smartmeter" }, v.angelegt));
    (smartmeter || []).forEach((v) =>
      (v.nachrichten || []).forEach((n) => {
        if (n.rolle !== "Kalkulation")
          zu("sm-antwort", v.id + ":" + n.id,
            "Smartmeter, Antwort von " + n.von + ": " + v.kunde,
            { ansicht: "smartmeter" }, n.datum);
      }));
  }

  if (user.rolle === "Geschäftsführung") {
    anfragen.filter((a) => a.status === "ruecksprache")
      .forEach((a) => zu("ruecksprache", a.id, "Rücksprache erbeten: " + a.kunde.firma, { ansicht: "ruecksprachen", vorgang: a.id }, a.angelegt));
    mitarbeiter.filter((x) => x.status === "pruefung")
      .forEach((x) => zu("stammdaten", x.id, "Stammdaten zur Freigabe: " + x.name, { ansicht: "partner" }, heute()));
    anfragen.filter((a) => a.nda && a.nda.status === "angefordert")
      .forEach((a) => zu("nda", a.id, "Verschwiegenheitserklärung unterschreiben: " + a.kunde.firma,
        { ansicht: "alle", vorgang: a.id }, a.nda.datum));
  }

  if (user.rolle === "Vertragsmanagement") {
    anfragen.filter((a) => a.status === "abgeschlossen" &&
        (!a.vertragsStatus || a.vertragsStatus === "Vertrag zu erstellen"))
      .forEach((a) => zu("vertrag", a.id, "Vertrag zu erstellen: " + a.kunde.firma,
        { ansicht: "vertraege", vorgang: a.id }, a.angelegt));
  }

  /* Smartmeter-Meldungen für den Vertrieb */
  (smartmeter || [])
    .filter((v) => v.partnerId === user.id ||
      (user.rolle === "Teamleiter" &&
       strukturUnter(user.id, mitarbeiter).some((m) => m.id === v.partnerId)))
    .forEach((v) => {
      if (v.status === "klaerfall")
        zu("sm-klaerfall", v.id, "Smartmeter, Daten fehlen: " + v.kunde,
          { ansicht: "smartmeter" }, v.angelegt);
      if (v.status === "uebermittelt")
        zu("sm-uebermittelt", v.id, "Smartmeter an Messstellenbetreiber übermittelt: " + v.kunde,
          { ansicht: "smartmeter" }, v.angelegt);
      if (v.status === "msb_abgelehnt")
        zu("sm-abgelehnt", v.id, "Smartmeter abgelehnt: " + v.kunde,
          { ansicht: "smartmeter" }, v.angelegt);
      if (v.status === "abgeschlossen")
        zu("sm-fertig", v.id, "Smartmeter abgeschlossen: " + v.kunde +
          (v.provision ? " · " + eur(v.provision.partner) : ""),
          { ansicht: "smartmeter" }, v.angelegt);
      /* Antworten der Kalkulation im Nachrichtenfenster */
      (v.nachrichten || []).forEach((n) => {
        if (n.von !== user.name && n.rolle !== user.rolle)
          zu("sm-nachricht", v.id + ":" + n.id,
            "Smartmeter, Antwort von " + n.von + ": " + v.kunde,
            { ansicht: "smartmeter" }, n.datum);
      });
    });

  if (user.rolle === "Geschäftsführung") {
    anfragen.filter((a) => a.status === "bestaetigt")
      .forEach((a) => zu("ausstehend", a.id,
        "Provision ausstehend: " + a.kunde.firma + " · " + eur(gesamtprovision(a)),
        { ansicht: "ausstehend", vorgang: a.id }, (a.bestaetigung || {}).datum));
  }

  /* Erwähnungen im Nachrichtenfenster eines Vorgangs */
  anfragen.forEach((a) => {
    (a.nachrichten || []).forEach((n) => {
      const gemeint = (n.erwaehnt || []).includes(user.rolle) &&
        n.von !== user.name &&
        (user.rolle !== "Vertriebspartner" || istBeteiligt(a, user.id));
      if (gemeint)
        zu("erwaehnung", a.id + ":" + n.id,
          n.von + " hat dich bei " + a.kunde.firma + " angesprochen",
          { ansicht: "alle", vorgang: a.id }, n.datum);
    });
  });

  (tickets || []).forEach((t) => {
    if (t.empfaenger === user.rolle && t.status !== "abgeschlossen")
      zu("ticket", t.id, "Ticket " + (t.nummer || t.id) + ": " + (t.betreff || "ohne Betreff"), { ansicht: "tickets" }, t.datum);
    const bt = Array.isArray(t.beitraege) ? t.beitraege : [];
    const letzter = bt[bt.length - 1];
    if (t.vonId === user.id && letzter && letzter.von !== user.name)
      zu("ticketantwort", t.id + ":" + letzter.id, "Antwort auf Ticket " + t.nummer, { ansicht: "tickets" }, letzter.datum);
  });

  (probleme || []).forEach((p) => {
    if (p.status !== "erledigt" && (p.betroffene || []).some((b) => meineIds.includes(b.id)))
      zu("problem", p.id, p.art + ": " + p.kunde, { ansicht: p.art === "Storno" ? "stornos" : "probleme" }, p.angelegt);
  });

  return m.sort((a, b) => (b.datum || "").localeCompare(a.datum || ""));
}

function Glocke({ meldungen, gelesen, aufGelesen, aufSpringen }) {
  const [offen, setOffen] = useState(false);
  const neue = meldungen.filter((m) => !gelesen.includes(m.id));
  return (
    <div className="relative">
      <button onClick={() => setOffen(!offen)}
        className="flex items-center gap-2 px-3 py-2 rounded text-sm w-full"
        style={{ background: offen ? C.inkSoft : "transparent", color: "#93A4B8" }}>
        <Bell size={15} />
        <span className="flex-1 text-left">Benachrichtigungen</span>
        {neue.length > 0 && (
          <span className="text-xs px-1.5 rounded-full" style={{ background: C.warn, color: "#fff" }}>
            {neue.length}
          </span>
        )}
      </button>

      {offen && (
        <div className="mt-2 rounded overflow-hidden" style={{ background: "#fff", border: "1px solid " + C.line }}>
          <div className="flex items-center justify-between px-3 py-2"
               style={{ borderBottom: "1px solid " + C.line }}>
            <span className="text-xs" style={{ color: C.muted }}>{meldungen.length} Meldungen</span>
            <button className="text-xs" style={{ color: C.strom }}
              onClick={() => aufGelesen(meldungen.map((m) => m.id))}>
              alle gelesen
            </button>
          </div>
          <div style={{ maxHeight: 300, overflowY: "auto" }}>
            {meldungen.length === 0 && (
              <p className="text-sm px-3 py-4" style={{ color: C.muted }}>Nichts Neues.</p>
            )}
            {meldungen.map((m) => {
              const istNeu = !gelesen.includes(m.id);
              return (
                <button key={m.id}
                  onClick={() => { aufSpringen(m); aufGelesen([m.id]); setOffen(false); }}
                  className="w-full text-left px-3 py-2 flex items-start gap-2"
                  style={{ borderTop: "1px solid " + C.line,
                           background: istNeu ? "#F1F7F0" : "#fff", color: C.text }}>
                  <span className="w-2 h-2 rounded-full mt-1.5"
                        style={{ background: istNeu ? C.ok : "transparent" }} />
                  <span className="flex-1 text-sm">{m.text}
                    <span className="block text-xs" style={{ color: C.muted }}>{datum(m.datum)}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* Umkreissuche: Mittelpunkte aller deutschen Postleitzahlen (GeoNames, CC BY 4.0), erst bei Bedarf geladen.
   PLZ_STAND hier und in build.mjs gleich halten. */
const PLZ_STAND = "1";
let plzLaden = null;
const ladePlz = () => {
  if (!plzLaden)
    plzLaden = fetch("/assets/plz-de-" + PLZ_STAND + ".json").then((r) => {
      if (!r.ok) throw new Error("Die Postleitzahlen konnten nicht geladen werden.");
      return r.json();
    }).then((j) => j.plz).catch((e) => { plzLaden = null; throw e; });
  return plzLaden;
};
const plzVon = (e) => String(e.plz || (String(e.adresse || "").match(/\b\d{5}\b/) || [""])[0]).trim();
/* Luftlinie in km zwischen zwei Punkten [Breite, Länge] */
const luftlinie = (a, b) => {
  const r = Math.PI / 180, dLat = (b[0] - a[0]) * r, dLon = (b[1] - a[1]) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dLon / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
};

/* Akquise-Tool: Kontaktlisten je Branche abtelefonieren */
/* Listen können mehreren Partnern zugewiesen sein.
   Ältere Listen mit einer einzelnen Zuweisung werden mitgelesen. */
const zugewiesenAn = (l) =>
  Array.isArray(l.zugewiesen) ? l.zugewiesen : l.zugewiesen ? [l.zugewiesen] : [];

const AKQ_STATUS = {
  offen: { label: "Offen", color: "#6B7787" },
  kontakt: { label: "In Kontakt", color: "#2F5FE0" },
  termin: { label: "Termin ausgemacht", color: "#4A9130" },
  wiedervorlage: { label: "Wiedervorlage", color: "#BE6A16" },
  kein: { label: "Kein Interesse", color: "#B24328" },
  kunde: { label: "Als Kunde übernommen", color: "#0A1626" },
};
const TERMINFORM = ["Telefonisch", "Vor Ort", "Video"];

const Akquise = teilKomponente("vertrieb", "Akquise");   /* in vertrieb.jsx */
const Suche = teilKomponente("selten", "Suche");   /* in selten.jsx */
/* Pipeline der Vorgänge mit Umsatzprognose */
const PIPELINE = [
  { id: "eingereicht", label: "Anfrage", chance: 0.2, f: (a) => ["eingereicht", "ruecksprache"].includes(a.status) },
  { id: "angefragt", label: "In Kalkulation", chance: 0.3, f: (a) => a.status === "angefragt" },
  { id: "klaerfall", label: "Klärfall", chance: 0.25, f: (a) => a.status === "klaerfall" },
  { id: "angebot", label: "Angebot beim Kunden", chance: 0.5, f: (a) => a.status === "angebot" },
  { id: "uebermittelt", label: "Beim Versorger", chance: 0.85, f: (a) => a.status === "uebermittelt" },
  { id: "bestaetigt", label: "Bestätigt", chance: 1, f: (a) => a.status === "bestaetigt" },
];

const Pipeline = teilKomponente("innendienst", "Pipeline");   /* in innendienst.jsx */
const Kundenpruefung = teilKomponente("verwaltung", "Kundenpruefung");   /* in verwaltung.jsx */
/* Tippgeber des Vertriebspartners */
/* Zwei Varianten wie im Tippgebervertrag: Festbetrag einmalig, prozentual jährlich */
const VERGUETUNG = [
  { value: "kwh", label: "Festbetrag je 100.000 kWh, einmalig",
    text: "Richtet sich nach dem Jahresverbrauch des Kunden, nur für das erste Lieferjahr",
    einheit: "€ je 100.000 kWh", zahlweise: "einmal" },
  { value: "prozent", label: "Prozentual an deiner Provision, jährlich",
    text: "Anteil an deiner eigenen Provision, für jedes Lieferjahr", einheit: "%", zahlweise: "jaehrlich" },
];
const zahlweiseVon = (art) => (VERGUETUNG.find((v) => v.value === art) || VERGUETUNG[0]).zahlweise;
const TIPPGEBER_VORSCHLAG_KWH = "250";

const leererTippgeber = (besitzer) => ({
  id: "TG" + uid(), besitzerId: besitzer,
  name: "", firma: "", telefon: "", email: "", adresse: "",
  art: "kwh", wert: TIPPGEBER_VORSCHLAG_KWH, zahlweise: "einmal", notiz: "", aktiv: true,
  angelegt: heute(), status: "wartet", freigabe: null, zugeordnet: [],
});

/* Jeder Tippgeber braucht die Freigabe der Geschäftsführung, bevor er auswählbar ist.
   Ändert der Partner die Vergütung, ist eine neue Freigabe nötig. */
const tippgeberFrei = (t) => !!t && t.status === "freigegeben";
const TIPPGEBER_STATUS = {
  wartet: { label: "Wartet auf Freigabe durch Geschäftsführung", farbe: C.gas },
  freigegeben: { label: "Freigegeben", farbe: C.ok },
  abgelehnt: { label: "Von der Geschäftsführung abgelehnt", farbe: C.warn },
};
const TippgeberStatus = ({ t }) => {
  const st = TIPPGEBER_STATUS[t.status] || TIPPGEBER_STATUS.wartet;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: st.farbe }}>
      <span className="w-2 h-2 rounded-full" style={{ background: st.farbe }} />{st.label}
    </span>
  );
};

/* kurze Beschreibung der Vergütung, z. B. „250 € je 100.000 kWh, einmalig" */
const tippgeberText = (t) => {
  if (!t) return "";
  const w = num(parseFloat(String(t.wert || "").replace(",", ".")) || 0, t.art === "prozent" ? 0 : 2);
  const was = t.art === "prozent" ? w + " % der Provision" : w + " € je 100.000 kWh";
  return was + (t.zahlweise === "jaehrlich" ? ", jährlich" : ", einmalig");
};

/* Was im Vorgang festgehalten wird. Die Vergütung (art, wert) trägt der Server
   beim Speichern aus tippgeber_intern ein; spätere Änderungen am Tippgeber ändern
   bestehende Abschlüsse nicht. Träger ist, wer ihn auswählt. */
const tippgeberMomentaufnahme = (t, traegerId) => t ? ({
  id: t.id, name: t.firma || t.name, besitzerId: t.besitzerId, traegerId: traegerId || null,
  datum: heute(),
}) : null;

/* auswählbar: eigene oder von der Geschäftsführung zugeordnete, jeweils freigegeben */
const tippgeberFuer = (liste, userId, gf = false) => (liste || []).filter((t) => tippgeberFrei(t)
  && (t.besitzerId === userId || (t.zugeordnet || []).includes(userId) || (gf && t.besitzerId === TG_FIRMA)));
const tippgeberLabel = (t) => (t.firma || t.name) + (t.art ? " · " + tippgeberText(t) : "");

/* Tippgebervertrag zwischen EGC und dem Tippgeber, mit der freigegebenen Vergütung */
function tippgeberVertragPdf(t, mitarbeiter, user) {
  const firma = t.besitzerId === TG_FIRMA;
  const partner = firma ? { name: "EGC Energie" } : mitarbeiter.find((m) => m.id === t.besitzerId) || user;
  const leer = "______________________";
  const wert = parseFloat(String(t.wert || "").replace(",", ".")) || 0;
  const art = t.art === "prozent" ? "prozent" : "kwh";
  const W = art === "prozent" ? num(wert, wert % 1 ? 1 : 0) + " %" : num(wert, wert % 1 ? 2 : 0) + " €";
  const BSP = num(wert / 10, 2) + " €";
  const vg = firma && art === "prozent" ? { ...TG_VERGUETUNG.prozent, n1: TG_N1_FIRMA } : TG_VERGUETUNG[art];
  const fuell = (x) => x.replace(/\{W\}/g, W).replace("{BSP}", BSP).replace("{PARTNER}", partner.name);
  const z = vertragsZeilen("Tippgebervertrag", [
    "Tippgeber: " + (t.firma ? t.firma + (t.name ? " (" + t.name + ")" : "") : t.name) + ", "
      + (t.adresse || leer) + ", nachfolgend \"Tippgeber\"",
  ], TG_PARAGRAFEN, (x) => fuell(x === "{N1}" ? vg.n1 : x === "{N2}" ? vg.n2
    : x === "{N3}" ? vg.n3 : x === "{N4}" ? vg.n4 : x));
  z.push(" ");
  z.push({ text: "Unterschriften", gross: true });
  z.push(" ");
  z.push("______________________________          ______________________________");
  z.push("Ort, Datum                                            Ort, Datum");
  z.push(" ");
  z.push(" ");
  z.push("______________________________          ______________________________");
  z.push("EGC Energie, " + (FIRMENDATEN.vertreter || "") + "                       Tippgeber, " + (t.name || t.firma));
  z.push(" ");
  z.push(firma ? "Betreuung durch EGC Energie" : "Zuständiger Vertriebspartner: " + partner.name);
  const pdf = erzeugePdf("Tippgebervertrag_" + (t.firma || t.name).replace(/\W+/g, "_") + ".pdf",
    "Tippgebervertrag", z);
  if (pdf) dateiLaden(pdf);
}

function Tippgeber({ tippgeber, setTippgeber, anfragen, mitarbeiter, user }) {
  const [auswahl, setAuswahl] = useState(null);
  const [entwurf, setEntwurf] = useState(null);

  const meine = tippgeber.filter((t) => t.besitzerId === user.id);
  const gewaehlt = tippgeber.find((t) => t.id === auswahl);

  const kundenVon = (t) => anfragen.filter((a) =>
    ((a.tippgeber && a.tippgeber.id === t.id) || a.tippgeberId === t.id)
    && ["bestaetigt", "abgeschlossen"].includes(a.status));

  /* Betrag im 1. Lieferjahr und über die gesamte Laufzeit */
  const betragVon = (a) => {
    const v = gesamtverteilung(a, mitarbeiter, undefined, 1);
    const erst = v.tippgeber ? v.tippgeber.betrag : 0;
    const jahre = faelligkeiten(a).length;
    const tg = a.tippgeber || {};
    return { erst, gesamt: tg.zahlweise === "jaehrlich" ? erst * jahre : erst, jahre };
  };
  const summe = (t) => kundenVon(t).reduce((x, a) => x + betragVon(a).gesamt, 0);

  const speichern = () => {
    const alt = tippgeber.find((t) => t.id === entwurf.id);
    /* neue Tippgeber und geänderte Vergütung gehen erneut zur Freigabe */
    const neuPruefen = !alt || alt.status !== "freigegeben"
      || ["art", "wert", "zahlweise", "firma", "name"].some((k) => String(alt[k] ?? "") !== String(entwurf[k] ?? ""));
    const geprueft = { ...entwurf, zahlweise: zahlweiseVon(entwurf.art) };
    const fertig = neuPruefen
      ? { ...geprueft, status: "wartet", freigabe: null, ablehnung: "" } : geprueft;
    setTippgeber(alt ? tippgeber.map((t) => (t.id === entwurf.id ? fertig : t))
                     : [...tippgeber, fertig]);
    setEntwurf(null);
  };

  const vertragPdfTippgeber = (t) => tippgeberVertragPdf(t, mitarbeiter, user);

  /* Auswertung: bewusst ohne Vertragsdaten */
  const auswertungPdf = (t) => {
    const kunden = kundenVon(t);
    const z = [];
    z.push({ text: t.firma || t.name, gross: true });
    if (t.firma && t.name) z.push("Ansprechpartner: " + t.name);
    if (t.adresse) z.push(t.adresse);
    z.push(" ");
    z.push("Vermittelt über " + (t.besitzerId === TG_FIRMA ? "EGC Energie"
      : (mitarbeiter.find((m) => m.id === t.besitzerId) || {}).name));
    z.push("Vergütung: " + tippgeberText(t));
    z.push(" ");
    z.push({ text: "Vermittelte Kunden", gross: true });
    if (!kunden.length) z.push("Noch keine abgeschlossenen Kunden.");
    kunden.forEach((a) => {
      const b = betragVon(a);
      z.push(a.kunde.firma + "   " + eur(b.erst) +
             ((a.tippgeber || {}).zahlweise === "jaehrlich" ? "  je Lieferjahr, " + b.jahre + " Jahre" : "  einmalig"));
    });
    z.push(" ");
    z.push({ text: "Gesamt " + eur(summe(t)), gross: true });
    z.push(" ");
    z.push("Erstellt am " + datum(heute()) + " · EGC Energie");
    const pdf = erzeugePdf("tippgeber_" + (t.firma || t.name).replace(/\W+/g, "_") + ".pdf",
      "Tippgeberabrechnung", z);
    if (pdf) dateiLaden(pdf);
  };

  /* ---------- Formular ---------- */
  if (entwurf) {
    const setF = (k, v) => setEntwurf({ ...entwurf, [k]: v });
    const art = VERGUETUNG.find((v) => v.value === entwurf.art) || VERGUETUNG[0];
    const Wahl = ({ liste, feld }) => (
      <div className="space-y-2">
        {liste.map((v) => (
          <button key={v.value}
            onClick={() => setEntwurf({ ...entwurf, [feld]: v.value,
              ...(feld === "art" && v.value !== entwurf.art
                ? { wert: v.value === "kwh" ? TIPPGEBER_VORSCHLAG_KWH : "10", zahlweise: v.zahlweise } : {}) })}
            className="w-full text-left px-3 py-2 rounded"
            style={{
              background: entwurf[feld] === v.value ? "#F1F5FA" : "#fff",
              border: "1px solid " + (entwurf[feld] === v.value ? C.strom : C.line),
            }}>
            <span className="text-sm">{v.label}</span>
            <span className="block text-xs" style={{ color: C.muted }}>{v.text}</span>
          </button>
        ))}
      </div>
    );
    return (
      <div>
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => setEntwurf(null)} style={{ color: C.muted }}><ArrowLeft size={18} /></button>
          <h2 className="text-lg">
            {tippgeber.some((t) => t.id === entwurf.id) ? "Tippgeber bearbeiten" : "Neuer Tippgeber"}
          </h2>
        </div>
        <div className="rounded p-5 space-y-5" style={{ background: C.card, border: "1px solid " + C.line }}>
          <div className="grid sm:grid-cols-2 gap-4">
            <Feld label="Firma" value={entwurf.firma} onChange={(v) => setF("firma", v)} />
            <Feld label="Ansprechpartner" value={entwurf.name} onChange={(v) => setF("name", v)} />
            <Feld label="Telefon" value={entwurf.telefon} onChange={(v) => setF("telefon", v)} />
            <Feld label="E-Mail" value={entwurf.email} onChange={(v) => setF("email", v)} />
            <Feld label="Anschrift" value={entwurf.adresse} onChange={(v) => setF("adresse", v)} breit />
          </div>

          <div>
            <span className="block text-xs mb-2" style={{ color: C.muted }}>Wie wird vergütet?</span>
            <Wahl liste={VERGUETUNG} feld="art" />
            <div className="sm:max-w-xs mt-4">
              <Feld label={"Wert in " + art.einheit} value={entwurf.wert}
                onChange={(v) => setF("wert", v)} />
            </div>
            <p className="text-xs mt-2" style={{ color: C.muted }}>
              {entwurf.art === "kwh"
                ? "Vorschlag: 250 € je 100.000 kWh, einmalig. Bei 400.000 kWh sind das 1.000 €."
                : "Beispiel: Bei 10 % und 2.000 € Provision im Jahr erhält der Tippgeber 200 € je Lieferjahr."}
              {" "}Der Betrag wird von deiner Provision abgezogen.
            </p>
          </div>

          <Feld label="Notiz" value={entwurf.notiz} onChange={(v) => setF("notiz", v)} breit />

          <div className="flex gap-2">
            <Btn icon={Check} onClick={speichern} disabled={!entwurf.firma && !entwurf.name}>
              Speichern
            </Btn>
            <Btn variante="hell" onClick={() => setEntwurf(null)}>Abbrechen</Btn>
          </div>
          <p className="text-xs" style={{ color: C.muted }}>
            Neue Tippgeber und Änderungen an Name oder Vergütung gibt die Geschäftsführung frei.
            Bis dahin kannst du den Tippgeber nicht auswählen. Bereits gemeldete Kunden behalten
            die Vergütung, die beim Abschluss galt.
          </p>
        </div>
      </div>
    );
  }

  /* ---------- Einzelansicht ---------- */
  if (gewaehlt) {
    const kunden = kundenVon(gewaehlt);
    return (
      <div>
        <div className="flex items-center gap-3 mb-1">
          <button onClick={() => setAuswahl(null)} style={{ color: C.muted }}><ArrowLeft size={18} /></button>
          <h2 className="text-lg">{gewaehlt.firma || gewaehlt.name}</h2>
        </div>
        <p className="text-sm mb-2 ml-8" style={{ color: C.muted }}>
          {[gewaehlt.name, gewaehlt.telefon, gewaehlt.email].filter(Boolean).join(" · ")}
        </p>
        <div className="ml-8 mb-5">
          <TippgeberStatus t={gewaehlt} />
          {gewaehlt.status === "abgelehnt" && gewaehlt.ablehnung && (
            <p className="text-sm mt-1">{gewaehlt.ablehnung}</p>
          )}
          {gewaehlt.status === "freigegeben" && gewaehlt.freigabe && (
            <span className="text-xs ml-2" style={{ color: C.muted }}>
              von {gewaehlt.freigabe.von} am {datum(gewaehlt.freigabe.datum)}
            </span>
          )}
        </div>

        <div className="grid sm:grid-cols-3 gap-3 mb-5">
          <div className="rounded p-4" style={{ background: C.card, border: "1px solid " + C.line }}>
            <div className="text-xs mb-2" style={{ color: C.muted }}>Vergütung</div>
            <div className="text-sm">{tippgeberText(gewaehlt)}</div>
          </div>
          <div className="rounded p-4" style={{ background: C.card, border: "1px solid " + C.line }}>
            <div className="text-xs mb-2" style={{ color: C.muted }}>Vermittelte Kunden</div>
            <div className="text-2xl" style={{ fontVariantNumeric: "tabular-nums" }}>{kunden.length}</div>
          </div>
          <div className="rounded p-4" style={{ background: C.card, border: "1px solid " + C.ok }}>
            <div className="text-xs mb-2" style={{ color: C.muted }}>Summe über die Laufzeit</div>
            <div className="text-2xl" style={{ color: C.ok, fontVariantNumeric: "tabular-nums" }}>
              {num(summe(gewaehlt), 2)} €
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-5">
          {tippgeberFrei(gewaehlt) && (
            <Btn icon={FileSignature} onClick={() => vertragPdfTippgeber(gewaehlt)}>Tippgebervertrag als PDF</Btn>
          )}
          <Btn variante="hell" icon={FileText} onClick={() => auswertungPdf(gewaehlt)}>Auswertung als PDF</Btn>
          <Btn variante="hell" onClick={() => setEntwurf({ ...gewaehlt, zahlweise: zahlweiseVon(gewaehlt.art) })}>Bearbeiten</Btn>
          <Btn variante="gefahr" icon={Trash2}
            onClick={() => { setTippgeber(tippgeber.filter((t) => t.id !== gewaehlt.id)); setAuswahl(null); }}>
            Entfernen
          </Btn>
        </div>

        <div className="rounded overflow-hidden" style={{ background: C.card, border: "1px solid " + C.line }}>
          <div className="px-4 py-3 text-sm" style={{ borderBottom: "1px solid " + C.line }}>
            Vermittelte Kunden
          </div>
          {kunden.length === 0 && (
            <div className="px-4 py-4 text-sm" style={{ color: C.muted }}>
              Noch keine bestätigten Kunden über diesen Tippgeber.
            </div>
          )}
          {kunden.map((a, i) => {
            const b = betragVon(a);
            return (
              <div key={a.id} className="flex items-center gap-4 px-4 py-3 text-sm"
                   style={{ borderTop: i ? "1px solid " + C.line : "none" }}>
                <span className="flex-1">{a.kunde.firma}
                  <span className="block text-xs" style={{ color: C.muted }}>
                    {[a.kunde.ort, tippgeberText(a.tippgeber)].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <span className="text-right" style={{ fontVariantNumeric: "tabular-nums", color: C.ok }}>
                  {eur(b.erst)}
                  <span className="block text-xs" style={{ color: C.muted }}>
                    {(a.tippgeber || {}).zahlweise === "jaehrlich" ? "je Lieferjahr" : "einmalig"}
                  </span>
                </span>
              </div>
            );
          })}
        </div>

        <p className="text-xs mt-4" style={{ color: C.muted, maxWidth: "62ch" }}>
          Die Auswertung als PDF enthält ausschließlich Firmennamen und den Betrag für den
          Tippgeber. Verbrauch, Laufzeit, Versorger und Aufschlag stehen nicht darin. Den
          Tippgebervertrag gibt es, sobald die Geschäftsführung den Tippgeber freigegeben hat.
        </p>
      </div>
    );
  }

  const zugeordnete = tippgeber.filter((t) => t.besitzerId !== user.id && (t.zugeordnet || []).includes(user.id));

  /* ---------- Liste ---------- */
  return (
    <div>
      {zugeordnete.length > 0 && (
        <div className="rounded overflow-hidden mb-5" style={{ background: C.card, border: "1px solid " + C.line }}>
          <div className="px-4 py-3 text-xs" style={{ color: C.muted, borderBottom: "1px solid " + C.line }}>
            Dir von der Geschäftsführung zugeordnet
          </div>
          {zugeordnete.map((t, i) => (
            <div key={t.id} className="px-4 py-3" style={{ borderTop: i ? "1px solid " + C.line : "none" }}>
              <div className="text-sm">{t.firma || t.name}</div>
              <div className="text-xs" style={{ color: C.muted }}>
                {[t.firma && t.name ? t.name : null, t.telefon, t.email].filter(Boolean).join(" · ")}
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <p className="text-sm" style={{ color: C.muted, maxWidth: "52ch" }}>
          Deine Tippgeber und was sie für vermittelte Kunden erhalten. Die Vergütung legst du je
          Tippgeber selbst fest; sie wird von deiner Provision abgezogen.
        </p>
        <Btn icon={Plus} onClick={() => setEntwurf(leererTippgeber(user.id))}>Tippgeber anlegen</Btn>
      </div>

      {meine.length === 0 ? (
        <div className="rounded p-8 text-center text-sm"
             style={{ border: "1px dashed " + C.line, color: C.muted }}>
          Noch keine Tippgeber angelegt.
        </div>
      ) : (
        <div className="rounded overflow-hidden" style={{ background: C.card, border: "1px solid " + C.line }}>
          {meine.map((t, i) => {
            const anzahl = kundenVon(t).length;
            return (
              <button key={t.id} onClick={() => setAuswahl(t.id)}
                className="w-full text-left px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-1"
                style={{ borderTop: i ? "1px solid " + C.line : "none" }}>
                <div className="flex-1 min-w-40">
                  <div className="text-sm">{t.firma || t.name}</div>
                  <div className="text-xs" style={{ color: C.muted }}>
                    {[t.name && t.firma ? t.name : null, t.telefon].filter(Boolean).join(" · ")}
                    {t.notiz ? " · " + t.notiz : ""}
                  </div>
                </div>
                <span className="text-xs w-44" style={{ color: C.muted }}>
                  {tippgeberText(t)}
                  <span className="block mt-0.5"><TippgeberStatus t={t} /></span>
                </span>
                <span className="text-sm w-24 text-right" style={{ fontVariantNumeric: "tabular-nums" }}>
                  {anzahl} {anzahl === 1 ? "Kunde" : "Kunden"}
                </span>
                <span className="text-sm w-28 text-right"
                      style={{ color: C.ok, fontVariantNumeric: "tabular-nums" }}>
                  {eur(summe(t))}
                </span>
                <ChevronRight size={15} style={{ color: C.muted }} />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* Verträge (Geschäftsführung): Tippgeber freigeben und Partnern zuordnen,
   Handelsvertreterverträge und Struktur, Firmendaten für die Verträge */
const Vertraege = teilKomponente("verwaltung", "Vertraege");   /* in verwaltung.jsx */
const ProvisionAusstehend = teilKomponente("verwaltung", "ProvisionAusstehend");   /* in verwaltung.jsx */
const Branchen = teilKomponente("verwaltung", "Branchen");   /* in verwaltung.jsx */
/* Persönliche Aufgaben mit Fälligkeit */
const PRIO = { hoch: { label: "Hoch", color: "#B24328" }, normal: { label: "Normal", color: "#6B7787" } };

function Aufgaben({ aufgaben, setAufgaben, user, mitarbeiter, kompakt, onOeffnen }) {
  const [titel, setTitel] = useState("");
  const [faellig, setFaellig] = useState(heute());
  const [prio, setPrio] = useState("normal");
  const [zeigeErledigte, setZeigeErledigte] = useState(false);

  const meine = aufgaben.filter((a) => a.fuerId === user.id);
  const offen = meine.filter((a) => !a.erledigt)
    .sort((a, b) => (a.faellig || "").localeCompare(b.faellig || ""));
  const erledigt = meine.filter((a) => a.erledigt).slice(0, 20);
  const heuteFaellig = offen.filter((a) => a.faellig <= heute());

  const anlegen = () => {
    if (!titel.trim()) return;
    setAufgaben([...aufgaben, {
      id: "AU" + uid(), titel: titel.trim(), faellig, prio, erledigt: false,
      fuerId: user.id, angelegt: heute(), bezug: null,
    }]);
    setTitel(""); setPrio("normal");
  };

  const umschalten = (id) =>
    setAufgaben(aufgaben.map((a) => (a.id === id ? { ...a, erledigt: !a.erledigt,
      erledigtAm: a.erledigt ? null : heute() } : a)));

  const Zeile = ({ a, i }) => {
    const spaet = !a.erledigt && a.faellig < heute();
    return (
      <div className="flex items-start gap-3 px-4 py-3"
           style={{ borderTop: i ? "1px solid " + C.line : "none",
                    background: spaet ? "#FCF3F0" : "transparent" }}>
        <input type="checkbox" checked={!!a.erledigt} onChange={() => umschalten(a.id)}
          className="mt-1" style={{ accentColor: C.ok }} />
        <div className="flex-1 min-w-0">
          <div className="text-sm" style={{ textDecoration: a.erledigt ? "line-through" : "none",
               color: a.erledigt ? C.muted : C.text }}>{a.titel}</div>
          <div className="text-xs" style={{ color: spaet ? C.warn : C.muted }}>
            {a.faellig ? (spaet ? "überfällig seit " : "fällig ") + datum(a.faellig) : "ohne Termin"}
            {a.prio === "hoch" ? " · Hoch" : ""}
            {a.bezug ? " · " + a.bezug.text : ""}
          </div>
        </div>
        {a.bezug && a.bezug.art === "vorgang" && onOeffnen && (
          <button className="text-xs" style={{ color: C.strom }}
            onClick={() => onOeffnen(a.bezug.id)}>öffnen</button>
        )}
        {!kompakt && (
          <button onClick={() => setAufgaben(aufgaben.filter((x) => x.id !== a.id))}
            style={{ color: C.muted }}><Trash2 size={14} /></button>
        )}
      </div>
    );
  };

  if (kompakt)
    return (
      <div className="rounded overflow-hidden" style={{ background: C.card, border: "1px solid " + C.line }}>
        <div className="flex items-baseline justify-between px-4 py-3" style={{ borderBottom: "1px solid " + C.line }}>
          <span className="text-sm">Meine Aufgaben</span>
          <span className="text-xs" style={{ color: heuteFaellig.length ? C.warn : C.muted }}>
            {heuteFaellig.length} fällig · {offen.length} offen
          </span>
        </div>
        {offen.length === 0 && (
          <div className="px-4 py-4 text-sm" style={{ color: C.muted }}>Nichts offen.</div>
        )}
        {offen.slice(0, 5).map((a, i) => <Zeile key={a.id} a={a} i={i} />)}
      </div>
    );

  return (
    <div className="space-y-5">
      <div className="rounded p-4" style={{ background: C.card, border: "1px solid " + C.line }}>
        <div className="grid sm:grid-cols-3 gap-4 items-end">
          <div className="sm:col-span-1">
            <Feld label="Neue Aufgabe" value={titel} onChange={setTitel}
              placeholder="z. B. Herrn Thiel zurückrufen" />
          </div>
          <Feld label="Fällig am" type="date" value={faellig} onChange={setFaellig} />
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Select label="Priorität" value={prio} onChange={setPrio}
                options={[{ value: "normal", label: "Normal" }, { value: "hoch", label: "Hoch" }]} />
            </div>
            <div className="pb-0.5"><Btn icon={Plus} onClick={anlegen} disabled={!titel.trim()}>Anlegen</Btn></div>
          </div>
        </div>
      </div>

      <div className="rounded overflow-hidden" style={{ background: C.card, border: "1px solid " + C.line }}>
        <div className="flex items-baseline justify-between px-4 py-3" style={{ borderBottom: "1px solid " + C.line }}>
          <span className="text-sm">Offen</span>
          <span className="text-xs" style={{ color: heuteFaellig.length ? C.warn : C.muted }}>
            {heuteFaellig.length} fällig oder überfällig
          </span>
        </div>
        {offen.length === 0 && (
          <div className="px-4 py-6 text-sm text-center" style={{ color: C.muted }}>
            Keine offenen Aufgaben.
          </div>
        )}
        {offen.map((a, i) => <Zeile key={a.id} a={a} i={i} />)}
      </div>

      {erledigt.length > 0 && (
        <div className="rounded overflow-hidden" style={{ background: C.card, border: "1px solid " + C.line }}>
          <button className="w-full flex items-baseline justify-between px-4 py-3"
            onClick={() => setZeigeErledigte(!zeigeErledigte)}
            style={{ borderBottom: zeigeErledigte ? "1px solid " + C.line : "none" }}>
            <span className="text-sm">Erledigt ({erledigt.length})</span>
            <span className="text-xs" style={{ color: C.strom }}>{zeigeErledigte ? "ausblenden" : "anzeigen"}</span>
          </button>
          {zeigeErledigte && erledigt.map((a, i) => <Zeile key={a.id} a={a} i={i} />)}
        </div>
      )}
    </div>
  );
}

const Protokoll = teilKomponente("verwaltung", "Protokoll");   /* in verwaltung.jsx */
/* Ringdiagramm für Zielerreichung und Kennzahlen */
function Ring({ anteil, gross = 120, farbe = "#4A9130", beschriftung, wert }) {
  const r = gross / 2 - 10;
  const umfang = 2 * Math.PI * r;
  const gefuellt = Math.min(1, Math.max(0, anteil)) * umfang;
  return (
    <div className="flex flex-col items-center">
      <svg width={gross} height={gross}>
        <circle cx={gross / 2} cy={gross / 2} r={r} fill="none" stroke="#E6EAF0" strokeWidth="10" />
        <circle cx={gross / 2} cy={gross / 2} r={r} fill="none" stroke={farbe} strokeWidth="10"
          strokeDasharray={gefuellt + " " + umfang} strokeLinecap="round"
          transform={"rotate(-90 " + gross / 2 + " " + gross / 2 + ")"} />
        <text x="50%" y="50%" textAnchor="middle" dy="0.35em"
              style={{ fontSize: gross / 5, fontVariantNumeric: "tabular-nums", fill: C.text }}>
          {num(Math.round(anteil * 100))} %
        </text>
      </svg>
      {beschriftung && <div className="text-xs mt-1" style={{ color: C.muted }}>{beschriftung}</div>}
      {wert && <div className="text-sm" style={{ fontVariantNumeric: "tabular-nums" }}>{wert}</div>}
    </div>
  );
}

function Balken({ anteil, farbe = "#4A9130" }) {
  return (
    <div className="h-2 rounded" style={{ background: "#E6EAF0" }}>
      <div className="h-2 rounded"
           style={{ width: Math.min(100, Math.max(2, anteil * 100)) + "%", background: farbe }} />
    </div>
  );
}

/* Punkt 7: Monats- und Quartalsziele in kWh */
function Ziele({ mitarbeiter, setMitarbeiter, anfragen, user, bonusziele, setBonusziele }) {
  const darfSetzen = user.rolle === "Geschäftsführung";
  const darfZiele = ["Teamleiter", "Leitung Vertrieb", "Geschäftsführung"].includes(user.rolle);
  const kandidaten = darfZiele
    ? (user.rolle === "Teamleiter"
        ? [user, ...strukturUnter(user.id, mitarbeiter)]
        : mitarbeiter.filter((m) => ["Vertriebspartner", "Teamleiter", "Leitung Vertrieb"].includes(m.rolle)))
    : [user];

  const setz = (id, k, v) =>
    setMitarbeiter(mitarbeiter.map((m) => (m.id === id ? { ...m, [k]: v.replace(/\D/g, "") } : m)));

  const istGF = user.rolle === "Geschäftsführung";
  const [offenFuer, setOffenFuer] = useState(null);
  const ziele = bonusziele || BONUSZIELE_START;

  /* Individuelle Bonusstufe für eine Person hinterlegen */
  const eigenesZiel = (m, art, feld, wert) => {
    const stand = bonusStand(m, anfragen, mitarbeiter, ziele).find((x) => x.id === art) || {};
    setMitarbeiter(mitarbeiter.map((x) => x.id !== m.id ? x : {
      ...x,
      bonusziele: {
        ...(x.bonusziele || {}),
        [art]: {
          ziel: feld === "ziel" ? String(wert).replace(/[^\d]/g, "")
                : String((x.bonusziele && x.bonusziele[art] ? x.bonusziele[art].ziel : stand.ziel) || 0),
          betrag: feld === "betrag" ? String(wert).replace(/[^\d]/g, "")
                : String((x.bonusziele && x.bonusziele[art] ? x.bonusziele[art].betrag : stand.wert) || 0),
          art: feld === "art" ? wert
                : (x.bonusziele && x.bonusziele[art] ? x.bonusziele[art].art : stand.bonusArt) || "euro",
        },
      },
    }));
  };

  const zielZuruecksetzen = (m, art) =>
    setMitarbeiter(mitarbeiter.map((x) => {
      if (x.id !== m.id) return x;
      const rest = { ...(x.bonusziele || {}) };
      delete rest[art];
      return { ...x, bonusziele: rest };
    }));
  const setzZiel = (rolle, art, feld, wert) =>
    setBonusziele({
      ...ziele,
      [rolle]: { ...ziele[rolle],
        [art]: { ...ziele[rolle][art],
                 [feld]: feld === "art" ? wert : String(wert).replace(/[^\d]/g, "") } },
    });

  return (
    <div className="space-y-5">
      <p className="text-sm" style={{ color: C.muted, maxWidth: "62ch" }}>
        Persönliche Ziele in Kilowattstunden sowie die Bonusstufen. Gezählt wird die Menge aus
        abgeschlossenen Verträgen im laufenden Zeitraum.
      </p>

      {istGF && (
        <div className="rounded p-5" style={{ background: C.card, border: "1px solid " + C.strom }}>
          <div className="text-sm mb-1">Bonusstufen festlegen</div>
          <p className="text-xs mb-4" style={{ color: C.muted, maxWidth: "62ch" }}>
            Je Rolle und Zeitraum eine Zielmenge und der Bonus, der bei Erreichen ausgezahlt wird.
            Beim Vertriebspartner zählt die eigene Menge, beim Teamleiter die des Teams
            einschließlich eigener Abschlüsse, bei der Vertriebsleitung die des ganzen Hauses.
          </p>

          {[["vertriebspartner", "Vertriebspartner"],
            ["teamleiter", "Teamleiter"],
            ["leitung_vertrieb", "Leitung Vertrieb"]].map(([schluessel, titel]) => (
            <div key={schluessel} className="mb-5">
              <div className="text-sm mb-2">{titel}</div>
              <div className="space-y-3">
                {ZEITRAEUME_BONUS.map((z) => {
                  const v = ziele[schluessel][z.id];
                  const art = BONUSART.find((x) => x.value === (v.art || "euro")) || BONUSART[0];
                  return (
                    <div key={z.id} className="grid sm:grid-cols-4 gap-3 items-end">
                      <div className="text-sm pb-2">{z.label}</div>
                      <Feld label="Zielmenge in kWh" zahl value={v.ziel}
                        onChange={(x) => setzZiel(schluessel, z.id, "ziel", x)} />
                      <Select label="Bonusart" value={v.art || "euro"}
                        onChange={(x) => setzZiel(schluessel, z.id, "art", x)}
                        options={BONUSART.map((b) => ({ value: b.value, label: b.label }))} />
                      <Feld label={"Bonus in " + art.einheit} zahl value={v.betrag}
                        onChange={(x) => setzZiel(schluessel, z.id, "betrag", x)} />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
      {kandidaten.map((m) => {
        const z = zielstand(m, anfragen, mitarbeiter);
        return (
          <div key={m.id} className="rounded p-5" style={{ background: C.card, border: "1px solid " + C.line }}>
            <div className="flex items-center gap-3 mb-4">
              <Avatar m={m} size={34} />
              <div className="flex-1">
                <div className="text-sm">{m.name}</div>
                <div className="text-xs" style={{ color: C.muted }}>{m.rolle} · Team {m.team}</div>
              </div>
            </div>

            <div className="rounded p-3 mb-4" style={{ background: "#F6F8FA", border: "1px solid " + C.line }}>
              <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
                <span className="text-xs" style={{ color: C.muted }}>Bonusstufen</span>
                {darfSetzen && (
                  <button className="text-xs" style={{ color: C.strom }}
                    onClick={() => setOffenFuer(offenFuer === m.id ? null : m.id)}>
                    {offenFuer === m.id ? "Bearbeitung schließen" : "individuell festlegen"}
                  </button>
                )}
              </div>

              <div className="grid sm:grid-cols-3 gap-3">
                {bonusStand(m, anfragen, mitarbeiter, ziele).map((b) => (
                  <div key={b.id} className="p-3 rounded"
                       style={{ background: "#fff",
                                border: "1px solid " + (b.erreicht ? C.ok : C.line) }}>
                    <div className="flex items-baseline justify-between">
                      <span className="text-sm">{b.label}</span>
                      <span className="text-sm"
                            style={{ color: b.erreicht ? C.ok : C.muted, fontVariantNumeric: "tabular-nums" }}>
                        {eur(b.betrag)}
                      </span>
                    </div>
                    {b.bonusArt === "prozent" && (
                      <div className="text-xs" style={{ color: C.muted }}>
                        {num(b.wert, 0)} Prozentpunkte der Provision
                      </div>
                    )}
                    <div className="text-xs mt-1 mb-2"
                         style={{ color: C.muted, fontVariantNumeric: "tabular-nums" }}>
                      {num(b.ist)} von {num(b.ziel)} kWh
                      {b.individuell && (
                        <span className="ml-1 px-1 rounded"
                              style={{ border: "1px solid " + C.line, color: C.strom }}>individuell</span>
                      )}
                    </div>
                    <Balken anteil={b.anteil} farbe={b.erreicht ? C.ok : C.strom} />
                    <div className="text-xs mt-1"
                         style={{ color: b.erreicht ? C.ok : C.muted }}>
                      {b.erreicht ? "Bonus erreicht"
                        : b.ziel > 0 ? "noch " + num(b.ziel - b.ist) + " kWh"
                        : "kein Ziel hinterlegt"}
                    </div>

                    {darfSetzen && offenFuer === m.id && (
                      <div className="mt-3 pt-3 space-y-3" style={{ borderTop: "1px solid " + C.line }}>
                        <Feld label="Zielmenge kWh" zahl
                          value={(m.bonusziele && m.bonusziele[b.id] ? m.bonusziele[b.id].ziel : b.ziel)}
                          onChange={(v) => eigenesZiel(m, b.id, "ziel", v)} />
                        <Select label="Bonusart"
                          value={(m.bonusziele && m.bonusziele[b.id] ? m.bonusziele[b.id].art : b.bonusArt) || "euro"}
                          onChange={(v) => eigenesZiel(m, b.id, "art", v)}
                          options={BONUSART.map((x) => ({ value: x.value, label: x.label }))} />
                        <Feld label={"Bonus in " +
                            ((BONUSART.find((x) => x.value ===
                              ((m.bonusziele && m.bonusziele[b.id] ? m.bonusziele[b.id].art : b.bonusArt) || "euro"))
                              || BONUSART[0]).einheit)} zahl
                          value={(m.bonusziele && m.bonusziele[b.id] ? m.bonusziele[b.id].betrag : b.wert)}
                          onChange={(v) => eigenesZiel(m, b.id, "betrag", v)} />
                        {b.individuell && (
                          <button className="text-xs" style={{ color: C.muted }}
                            onClick={() => zielZuruecksetzen(m, b.id)}>
                            auf Rollenvorgabe zurücksetzen
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {darfSetzen && offenFuer === m.id && (
                <p className="text-xs mt-3" style={{ color: C.muted }}>
                  Individuelle Werte gelten nur für {m.name} und überschreiben die Vorgabe der Rolle.
                </p>
              )}
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
              {[["Monat", z.monat, m.zielMonat, "zielMonat"], ["Quartal", z.quartal, m.zielQuartal, "zielQuartal"]]
                .map(([titel, stand, ziel, feld]) => (
                <div key={titel} className="flex items-center gap-4">
                  <Ring anteil={stand.anteil} gross={96}
                        farbe={stand.anteil >= 1 ? C.ok : C.strom} />
                  <div className="flex-1">
                    <div className="text-sm mb-1">{titel}</div>
                    <div className="text-xs mb-2" style={{ color: C.muted, fontVariantNumeric: "tabular-nums" }}>
                      {num(stand.ist)} von {num(stand.ziel)} kWh
                      <span className="block">
                        {stand.ziel > stand.ist
                          ? "noch " + num(stand.ziel - stand.ist) + " kWh"
                          : "Ziel erreicht"}
                      </span>
                    </div>
                    {(darfZiele || m.id === user.id) && (
                      <Feld label={"Ziel " + titel + " in kWh"} value={ziel || ""} zahl
                        onChange={(v) => setz(m.id, feld, v)} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* Bonusziele: je Rolle und Zeitraum eine Zielmenge und ein Betrag.
   Die Vorgaben sind Startwerte und von der Geschäftsführung änderbar. */
const BONUSZIELE_START = {
  vertriebspartner: {
    monat:   { ziel: 3500000,   betrag: 500,   art: "euro" },
    quartal: { ziel: 10500000,  betrag: 5,     art: "prozent" },
    jahr:    { ziel: 42000000,  betrag: 5000,  art: "euro" },
  },
  teamleiter: {
    monat:   { ziel: 12000000,  betrag: 1000,  art: "euro" },
    quartal: { ziel: 36000000,  betrag: 3000,  art: "euro" },
    jahr:    { ziel: 144000000, betrag: 10000, art: "euro" },
  },
  leitung_vertrieb: {
    monat:   { ziel: 30000000,  betrag: 1500,  art: "euro" },
    quartal: { ziel: 90000000,  betrag: 5000,  art: "euro" },
    jahr:    { ziel: 360000000, betrag: 15000, art: "euro" },
  },
};

const BONUSART = [
  { value: "euro", label: "Fester Betrag in Euro", einheit: "€" },
  { value: "prozent", label: "Prozentpunkte der Provision", einheit: "%" },
];

const ZEITRAEUME_BONUS = [
  { id: "monat", label: "Monat" },
  { id: "quartal", label: "Quartal" },
  { id: "jahr", label: "Jahr" },
];

const bonusSchluessel = (rolle) =>
  rolle === "Teamleiter" ? "teamleiter"
  : rolle === "Leitung Vertrieb" ? "leitung_vertrieb"
  : "vertriebspartner";

/* Welche Menge zählt für wen: eigene, Team oder gesamt */
function bonusZeitraum(m, anfragen, mitarbeiter, art) {
  const n = new Date();
  const ids = m.rolle === "Leitung Vertrieb"
    ? null
    : m.rolle === "Teamleiter"
      ? [m.id, ...strukturUnter(m.id, mitarbeiter).map((x) => x.id)]
      : [m.id];

  return anfragen
    .filter((a) => a.status === "abgeschlossen" && a.kalkulation)
    .filter((a) => (ids ? ids.some((id) => istBeteiligt(a, id)) : true))
    .reduce((t, a) => {
      const v = aktiveVariante(a);
      const d = new Date((v && v.lieferbeginn) || a.angelegt);
      if (isNaN(d)) return t;
      const passt =
        art === "monat"
          ? d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth()
          : art === "quartal"
            ? d.getFullYear() === n.getFullYear() &&
              Math.floor(d.getMonth() / 3) === Math.floor(n.getMonth() / 3)
            : d.getFullYear() === n.getFullYear();
      if (!passt) return t;
      /* Beim eigenen Bereich zählt nur der eigene Anteil */
      const q = ids && ids.length === 1
        ? ((beteiligte(a).find((x) => x.id === m.id) || {}).anteil || 100) / 100
        : 1;
      return {
        menge: t.menge + verbrauchGesamt(a) * q,
        provision: t.provision + vertriebsprovision(a) * q,
      };
    }, { menge: 0, provision: 0 });
}

function bonusStand(m, anfragen, mitarbeiter, ziele) {
  const satz = (ziele || BONUSZIELE_START)[bonusSchluessel(m.rolle)] || {};
  const eigen = m.bonusziele || {};   // individuelle Vorgabe, falls hinterlegt
  return ZEITRAEUME_BONUS.map((z) => {
    const vorgabe = eigen[z.id] || satz[z.id] || { ziel: 0, betrag: 0, art: "euro" };
    const individuell = !!eigen[z.id];
    const stand = bonusZeitraum(m, anfragen, mitarbeiter, z.id);
    const ist = stand.menge;
    const ziel = parseFloat(vorgabe.ziel) || 0;
    const wert = parseFloat(vorgabe.betrag) || 0;
    const bonusArt = vorgabe.art || "euro";
    const betrag = bonusArt === "prozent" ? (stand.provision * wert) / 100 : wert;
    return {
      id: z.id, label: z.label, ist, ziel, individuell,
      betrag, wert, bonusArt, provision: stand.provision,
      anteil: ziel > 0 ? ist / ziel : 0,
      erreicht: ziel > 0 && ist >= ziel,
    };
  });
}

/* Zielstand berechnen */
function zielstand(m, anfragen, mitarbeiter) {
  const n = new Date();
  const eigen = anfragen.filter((a) =>
    a.status === "abgeschlossen" && istBeteiligt(a, m.id) && a.kalkulation);
  const menge = (pruef) => eigen.reduce((t, a) => {
    const v = aktiveVariante(a);
    const tag = (v && v.lieferbeginn) || a.angelegt;
    const d = new Date(tag);
    if (isNaN(d) || !pruef(d)) return t;
    const anteil = beteiligte(a).find((b) => b.id === m.id);
    const q = anteil ? (parseFloat(anteil.anteil) || 100) / 100 : 1;
    return t + verbrauchGesamt(a) * q;
  }, 0);

  const istMonat = menge((d) => d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth());
  const istQuartal = menge((d) => d.getFullYear() === n.getFullYear() &&
    Math.floor(d.getMonth() / 3) === Math.floor(n.getMonth() / 3));
  const zm = parseFloat(m.zielMonat) || 0;
  const zq = parseFloat(m.zielQuartal) || 0;
  return {
    monat: { ist: istMonat, ziel: zm, anteil: zm > 0 ? istMonat / zm : 0 },
    quartal: { ist: istQuartal, ziel: zq, anteil: zq > 0 ? istQuartal / zq : 0 },
  };
}

/* Punkt 11: Kalender mit Terminen */
/* Kundendaten eines Termins als eine Zeile (für Liste, Google Kalender und ICS) */
const terminKunde = (t) => {
  const k = t.kunde || {};
  return [k.firma, k.ansprechpartner, [k.strasse, [k.plz, k.ort].filter(Boolean).join(" ")].filter(Boolean).join(", "),
    k.telefon ? "Tel. " + k.telefon : "", k.email].filter(Boolean).join(" · ");
};
const leererTermin = () => ({ titel: "", datum: heute(), zeit: "09:00", dauer: "60", ort: "", notiz: "",
  kunde: { firma: "", ansprechpartner: "", strasse: "", plz: "", ort: "", telefon: "", email: "" } });

/* Ergebnis eines Termins */
const TERMIN_ERGEBNIS = {
  stattgefunden: { label: "Stattgefunden", farbe: "#4A9130", grund: "#ECF6E4" },
  ausgefallen: { label: "Nicht stattgefunden", farbe: "#B24328", grund: "#FBEDEA" },
};

function Kalender({ termine, setTermine, user, leads, mitarbeiter, anfragen, onKundeAnlegen, onOeffnen }) {
  const [neuOffen, setNeuOffen] = useState(false);
  const [f, setF] = useState(leererTermin());
  /* Teamleiter und Leitung Vertrieb vergeben Termine an ihre Struktur */
  const darfZuweisen = ["Teamleiter", "Leitung Vertrieb"].includes(user.rolle);
  const team = darfZuweisen ? strukturUnter(user.id, mitarbeiter || [])
    .filter((m) => ["Vertriebspartner", "Teamleiter"].includes(m.rolle) && m.status === "aktiv") : [];
  const [fuer, setFuer] = useState(user.id);
  const name = (id) => ((mitarbeiter || []).find((m) => m.id === id) || {}).name || "–";
  const setK = (feld, w) => setF({ ...f, kunde: { ...f.kunde, [feld]: w } });

  const meine = termine.filter((t) => t.fuerId === user.id)
    .sort((a, b) => (a.datum + a.zeit).localeCompare(b.datum + b.zeit));
  /* vom mir an das Team vergebene Termine */
  const vergeben = termine.filter((t) => t.vonId === user.id && t.fuerId !== user.id)
    .sort((a, b) => (a.datum + a.zeit).localeCompare(b.datum + b.zeit));

  /* Termine aus Leads mit Termindatum ergänzen */
  const ausLeads = (leads || [])
    .filter((l) => l.zugewiesen === user.id && l.terminDatum)
    .map((l) => ({ id: "lead-" + l.id, titel: "Termin " + l.firma, datum: l.terminDatum,
                   zeit: l.terminZeit || "", ort: l.terminArt, notiz: "", ausLead: true, fuerId: user.id }));

  const alle = [...meine, ...ausLeads].sort((a, b) => (a.datum + a.zeit).localeCompare(b.datum + b.zeit));

  const anlegen = () => {
    const titel = f.titel.trim() || ("Termin " + (f.kunde.firma || "")).trim();
    const t = { id: "TE" + uid(), ...f, titel, fuerId: fuer, angelegt: heute() };
    if (fuer !== user.id) { t.vonId = user.id; t.vonName = user.name; }
    setTermine([...termine, t]);
    setF(leererTermin()); setFuer(user.id);
    setNeuOffen(false);
  };
  const setTermin = (id, teil) => setTermine(termine.map((x) => (x.id === id ? { ...x, ...teil } : x)));
  /* Hinweise eines vergebenen Termins nachträglich ändern */
  const [hinweisEdit, setHinweisEdit] = useState(null); /* { id, text } */
  /* Rückmeldung oder Verschieben eines Termins: { id, art: "stattgefunden" | "ausgefallen" | "verschieben", notiz, datum, zeit } */
  const [aktion, setAktion] = useState(null);
  const aktionSpeichern = (t) => {
    const a = aktion;
    if (a.art === "verschieben") {
      const eintrag = { art: "verschoben", am: heute(), von: user.name, alt: { datum: t.datum, zeit: t.zeit },
        neu: { datum: a.datum, zeit: a.zeit }, notiz: a.notiz.trim() };
      setTermin(t.id, { datum: a.datum, zeit: a.zeit, ergebnis: null, erledigt: false, verlauf: [...(t.verlauf || []), eintrag] });
    } else {
      const ergebnis = { art: a.art, notiz: a.notiz.trim(), am: heute(), von: user.name };
      setTermin(t.id, { ergebnis, erledigt: true, verlauf: [...(t.verlauf || []), { ...ergebnis, art: a.art }] });
    }
    setAktion(null);
  };

  const beschreibung = (t) => [terminKunde(t), t.notiz].filter(Boolean).join("\n");
  const googleLink = (t) => {
    const start = (t.datum || heute()).replace(/-/g, "") + "T" +
      (t.zeit || "09:00").replace(":", "") + "00";
    const endeMin = (parseInt(t.zeit) || 9) * 60 + (parseInt((t.zeit || "").split(":")[1]) || 0) +
      (parseInt(t.dauer) || 60);
    const eh = String(Math.floor(endeMin / 60) % 24).padStart(2, "0");
    const em = String(endeMin % 60).padStart(2, "0");
    const ende = (t.datum || heute()).replace(/-/g, "") + "T" + eh + em + "00";
    const k = t.kunde || {};
    const adresse = [k.strasse, [k.plz, k.ort].filter(Boolean).join(" ")].filter(Boolean).join(", ");
    return "https://calendar.google.com/calendar/render?action=TEMPLATE&text=" +
      encodeURIComponent(t.titel) + "&dates=" + start + "/" + ende +
      "&location=" + encodeURIComponent(adresse || t.ort || "") +
      "&details=" + encodeURIComponent(beschreibung(t));
  };

  const icsLaden = () => {
    const zeilen = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//EGC Energie//Vertriebsportal//DE"];
    alle.forEach((t) => {
      const start = t.datum.replace(/-/g, "") + "T" + (t.zeit || "09:00").replace(":", "") + "00";
      const k = t.kunde || {};
      const adresse = [k.strasse, [k.plz, k.ort].filter(Boolean).join(" ")].filter(Boolean).join(", ");
      zeilen.push("BEGIN:VEVENT", "UID:" + t.id + "@egc-energie", "DTSTART:" + start,
        "SUMMARY:" + t.titel, "LOCATION:" + (adresse || t.ort || ""), "DESCRIPTION:" + beschreibung(t).replace(/\n/g, "\\n"), "END:VEVENT");
    });
    zeilen.push("END:VCALENDAR");
    const url = "data:text/calendar;base64," + btoa(utf8Binaer(zeilen.join("\r\n")));
    dateiLaden({ name: "egc-termine.ics", url });
  };

  /* Eine Terminzeile mit Kundendaten, Anruf- und Kartenlink */
  const Zeile = ({ t, i, vergebenAn }) => {
    const k = t.kunde || {};
    const adresse = [k.strasse, [k.plz, k.ort].filter(Boolean).join(" ")].filter(Boolean).join(", ");
    return (
      <div key={t.id} className="px-4 py-3" style={{ borderTop: i ? "1px solid " + C.line : "none",
           background: t.datum === heute() ? "#F1F7F0" : "transparent", opacity: t.erledigt && !t.ergebnis ? 0.6 : 1 }}>
        <div className="flex flex-wrap items-start gap-x-4 gap-y-1">
          <span className="text-sm w-28 shrink-0" style={{ fontVariantNumeric: "tabular-nums" }}>
            {datum(t.datum)}
            <span className="block text-xs" style={{ color: C.muted }}>{t.zeit} Uhr{t.dauer ? " · " + t.dauer + " Min." : ""}</span>
          </span>
          <div className="flex-1 min-w-[12rem]">
            <div className="text-sm flex flex-wrap items-center gap-2">
              <span>{t.titel}</span>
              {t.ergebnis && TERMIN_ERGEBNIS[t.ergebnis.art] && (
                <span className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background: TERMIN_ERGEBNIS[t.ergebnis.art].grund, color: TERMIN_ERGEBNIS[t.ergebnis.art].farbe }}>
                  {TERMIN_ERGEBNIS[t.ergebnis.art].label}</span>
              )}
              {!t.ergebnis && t.erledigt && <span className="text-xs" style={{ color: C.muted }}>erledigt</span>}
              {(t.verlauf || []).some((v) => v.art === "verschoben") && !t.ergebnis && (
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "#EEF3FB", color: C.strom }}>verschoben</span>
              )}
            </div>
            {(k.firma || k.ansprechpartner) && (
              <div className="text-sm">{[k.firma, k.ansprechpartner].filter(Boolean).join(" · ")}</div>
            )}
            <div className="text-xs" style={{ color: C.muted }}>
              {[t.ort, t.ausLead ? "aus Lead" : "", t.vonId && t.vonId !== user.id ? "von " + (t.vonName || name(t.vonId)) : "",
                vergebenAn ? "für " + name(t.fuerId) : "", t.vonId ? "" : t.notiz].filter(Boolean).join(" · ")}
            </div>
            {hinweisEdit && hinweisEdit.id === t.id && (
              <div className="mt-2 space-y-2">
                <textarea value={hinweisEdit.text} rows={4} onChange={(e) => setHinweisEdit({ ...hinweisEdit, text: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded outline-none" style={{ border: "1px solid " + C.line }} />
                <div className="flex gap-2">
                  <Btn icon={Check} onClick={() => { setTermin(t.id, { notiz: hinweisEdit.text }); setHinweisEdit(null); }}>Speichern und mitteilen</Btn>
                  <Btn variante="hell" onClick={() => setHinweisEdit(null)}>Abbrechen</Btn>
                </div>
              </div>
            )}
            {t.vonId && t.notiz && !(hinweisEdit && hinweisEdit.id === t.id) && (
              <div className="mt-2 rounded px-3 py-2 text-sm whitespace-pre-wrap" style={{ background: "#FFF8E6", border: "1px solid #F0DCA8" }}>
                <span className="block text-xs mb-0.5" style={{ color: C.gas }}>
                  {t.vonId === user.id ? "Deine Hinweise an " + name(t.fuerId) : "Hinweise von " + (t.vonName || name(t.vonId))}
                </span>
                {t.notiz}
              </div>
            )}
            {(t.verlauf || []).length > 0 && (
              <div className="mt-2 space-y-1">
                {(t.verlauf || []).map((v, j) => (
                  <div key={j} className="text-xs rounded px-2.5 py-1.5" style={{ background: "#F6F8FA", border: "1px solid " + C.line }}>
                    <span style={{ color: v.art === "verschoben" ? C.strom : (TERMIN_ERGEBNIS[v.art] || {}).farbe || C.muted }}>
                      {v.art === "verschoben"
                        ? "Verschoben von " + datum(v.alt.datum) + (v.alt.zeit ? " " + v.alt.zeit : "") + " auf " + datum(v.neu.datum) + (v.neu.zeit ? " " + v.neu.zeit : "")
                        : (TERMIN_ERGEBNIS[v.art] || {}).label || v.art}
                    </span>
                    <span style={{ color: C.muted }}> · {datum(v.am)} · {v.von}</span>
                    {v.notiz && <div className="whitespace-pre-wrap mt-0.5" style={{ color: C.text }}>{v.notiz}</div>}
                  </div>
                ))}
              </div>
            )}
            {aktion && aktion.id === t.id && (
              <div className="mt-2 rounded p-3 space-y-2" style={{ background: "#F6F8FA", border: "1px solid " + C.line }}>
                <div className="text-sm">{aktion.art === "verschieben" ? "Termin verschieben" : TERMIN_ERGEBNIS[aktion.art].label}</div>
                {aktion.art === "verschieben" && (
                  <div className="grid grid-cols-2 gap-2">
                    <Feld label="Neues Datum" type="date" value={aktion.datum} onChange={(v) => setAktion({ ...aktion, datum: v })} />
                    <Feld label="Uhrzeit" value={aktion.zeit} onChange={(v) => setAktion({ ...aktion, zeit: v })} placeholder="09:00" />
                  </div>
                )}
                <label className="block">
                  <span className="block text-xs mb-1" style={{ color: C.muted }}>
                    {aktion.art === "verschieben" ? "Notiz (Grund, Absprache mit dem Kunden)" : "Terminnotiz"}
                  </span>
                  <textarea value={aktion.notiz} rows={3} onChange={(e) => setAktion({ ...aktion, notiz: e.target.value })}
                    placeholder={aktion.art === "stattgefunden" ? "z. B. Abrechnungen erhalten, Angebot anfragen, Kunde hat Interesse an PV"
                      : aktion.art === "ausgefallen" ? "z. B. Kunde nicht angetroffen, neuer Termin vereinbart" : "z. B. Kunde krank, neuer Termin telefonisch abgestimmt"}
                    className="w-full px-3 py-2 text-sm rounded outline-none bg-white" style={{ border: "1px solid " + C.line }} />
                </label>
                <div className="flex flex-wrap gap-2">
                  <Btn icon={Check} variante={aktion.art === "ausgefallen" ? "primär" : "ok"} onClick={() => aktionSpeichern(t)}
                    disabled={aktion.art === "verschieben" ? !aktion.datum : aktion.art === "ausgefallen" && !aktion.notiz.trim()}>Speichern</Btn>
                  <Btn variante="hell" onClick={() => setAktion(null)}>Abbrechen</Btn>
                </div>
              </div>
            )}
            {(adresse || k.telefon || k.email) && (
              <div className="flex flex-wrap gap-2 mt-2">
                {adresse && <a href={"https://maps.google.com/?q=" + encodeURIComponent(adresse)} target="_blank" rel="noreferrer"
                  className="text-xs px-2 py-1 rounded inline-flex items-center gap-1" style={{ background: "#EEF3FB", color: C.strom }}>
                  <MapPin size={12} /> {adresse}</a>}
                {k.telefon && <a href={"tel:" + k.telefon.replace(/[^\d+]/g, "")}
                  className="text-xs px-2 py-1 rounded inline-flex items-center gap-1" style={{ background: "#ECF6E4", color: C.ok }}>
                  <Phone size={12} /> {k.telefon}</a>}
                {k.email && <a href={"mailto:" + k.email}
                  className="text-xs px-2 py-1 rounded inline-flex items-center gap-1" style={{ background: "#F3F0FA", color: "#5B4BA0" }}>
                  <Mail size={12} /> {k.email}</a>}
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {vergebenAn && (
              <button onClick={() => setHinweisEdit({ id: t.id, text: t.notiz || "" })} className="text-xs px-2 py-1 rounded"
                style={{ border: "1px solid " + C.line, color: C.gas }}>{t.notiz ? "Hinweise ändern" : "Hinweise ergänzen"}</button>
            )}
            {!t.ausLead && !vergebenAn && !t.ergebnis && (<>
              <button onClick={() => setAktion({ id: t.id, art: "stattgefunden", notiz: "" })} className="text-xs px-2.5 py-1 rounded"
                style={{ background: C.ok, color: "#fff" }}>Stattgefunden</button>
              <button onClick={() => setAktion({ id: t.id, art: "ausgefallen", notiz: "" })} className="text-xs px-2.5 py-1 rounded"
                style={{ background: C.warn, color: "#fff" }}>Nicht stattgefunden</button>
              <button onClick={() => setAktion({ id: t.id, art: "verschieben", notiz: "", datum: t.datum, zeit: t.zeit || "" })} className="text-xs px-2.5 py-1 rounded"
                style={{ background: C.strom, color: "#fff" }}>Verschieben</button>
            </>)}
            {!t.ausLead && !vergebenAn && t.ergebnis && (
              <button onClick={() => setTermin(t.id, { ergebnis: null, erledigt: false })} className="text-xs px-2 py-1 rounded"
                style={{ border: "1px solid " + C.line, color: C.muted }}>Rückmeldung zurücknehmen</button>
            )}
            {!t.ausLead && !vergebenAn && onKundeAnlegen && (t.kunde || {}).firma && (() => {
              const vorgang = t.vorgangId && (anfragen || []).find((x) => x.id === t.vorgangId);
              return vorgang
                ? <button onClick={() => onOeffnen && onOeffnen(vorgang.id)} className="text-xs px-2.5 py-1 rounded"
                    style={{ border: "1px solid " + C.ok, color: C.ok }}>Kunde angelegt · {vorgang.id}</button>
                : <button onClick={() => onKundeAnlegen(t)} className="text-xs px-2.5 py-1 rounded inline-flex items-center gap-1"
                    style={{ background: C.ink, color: "#fff" }}><UserPlus size={12} /> Als Kunde anlegen</button>;
            })()}
            <a href={googleLink(t)} target="_blank" rel="noreferrer" className="text-xs px-2 py-1 rounded"
               style={{ border: "1px solid " + C.line, color: C.strom }}>in Google Kalender</a>
            {!t.ausLead && (!t.vonId || t.vonId === user.id) && (
              <button onClick={() => setTermine(termine.filter((x) => x.id !== t.id))} title="Termin löschen"
                style={{ color: C.muted }}><Trash2 size={15} /></button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm" style={{ color: C.muted, maxWidth: "50ch" }}>
          {darfZuweisen ? "Deine Termine und die, die du deinem Team gegeben hast, ergänzt um die Termine aus deinen Leads."
            : "Deine Termine, ergänzt um die Termine aus deinen Leads."}
        </p>
        <div className="flex flex-wrap gap-2">
          <Btn icon={Plus} onClick={() => setNeuOffen(!neuOffen)}>{darfZuweisen ? "Termin anlegen oder vergeben" : "Termin anlegen"}</Btn>
          <Btn variante="hell" icon={Upload} onClick={icsLaden}>Alle exportieren</Btn>
        </div>
      </div>

      {neuOffen && (
        <div className="rounded p-5 space-y-4" style={{ background: C.card, border: "1px solid " + C.line }}>
          {darfZuweisen && (
            <Select label="Termin für" value={fuer} onChange={setFuer}
              options={[{ value: user.id, label: "mich selbst" }, ...team.map((m) => ({ value: m.id, label: m.name + " (" + m.rolle + ")" }))]} />
          )}
          <div className="grid sm:grid-cols-2 gap-4">
            <Feld label="Titel" value={f.titel} onChange={(v) => setF({ ...f, titel: v })} breit placeholder="z. B. Erstgespräch Strom und Gas" />
            <Feld label="Datum" type="date" value={f.datum} onChange={(v) => setF({ ...f, datum: v })} />
            <Feld label="Uhrzeit" value={f.zeit} onChange={(v) => setF({ ...f, zeit: v })} placeholder="09:00" />
            <Feld label="Dauer in Minuten" value={f.dauer} onChange={(v) => setF({ ...f, dauer: v })} />
            <Feld label="Ort oder Form" value={f.ort} onChange={(v) => setF({ ...f, ort: v })}
              placeholder="Vor Ort, Teams, Telefon" />
          </div>
          <div className="text-sm pt-1">Kunde</div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Feld label="Firma" value={f.kunde.firma} onChange={(v) => setK("firma", v)} />
            <Feld label="Ansprechpartner" value={f.kunde.ansprechpartner} onChange={(v) => setK("ansprechpartner", v)} />
            <Feld label="Straße und Hausnummer" value={f.kunde.strasse} onChange={(v) => setK("strasse", v)} />
            <div className="grid grid-cols-3 gap-3">
              <Feld label="PLZ" value={f.kunde.plz} onChange={(v) => setK("plz", v.replace(/\D/g, "").slice(0, 5))} />
              <div className="col-span-2"><Feld label="Ort" value={f.kunde.ort} onChange={(v) => setK("ort", v)} /></div>
            </div>
            <Feld label="Telefon" type="tel" value={f.kunde.telefon} onChange={(v) => setK("telefon", v)} />
            <Feld label="E-Mail" type="email" value={f.kunde.email} onChange={(v) => setK("email", v)} />
          </div>
          <label className="block">
            <span className="block text-xs mb-1" style={{ color: C.muted }}>
              {fuer === user.id ? "Notiz zum Termin" : "Infos und Hinweise für " + name(fuer)}
            </span>
            <textarea value={f.notiz} rows={4} onChange={(e) => setF({ ...f, notiz: e.target.value })}
              placeholder={fuer === user.id ? "z. B. Abrechnung mitbringen lassen"
                : "z. B. Kunde hat zwei Standorte, Abrechnungen Strom und Gas mitnehmen, Interesse an PV, Chef heißt Herr Muster und ist ab 10 Uhr da"}
              className="w-full px-3 py-2 text-sm rounded outline-none" style={{ border: "1px solid " + C.line }} />
            {fuer !== user.id && (
              <span className="block text-xs mt-1" style={{ color: C.muted }}>
                {name(fuer)} sieht den Termin mit allen Angaben in seinem Kalender, bekommt eine Meldung im Portal und eine E-Mail.
              </span>
            )}
          </label>
          <Btn icon={Check} onClick={anlegen} disabled={!f.titel.trim() && !f.kunde.firma.trim()}>
            {fuer === user.id ? "Termin speichern" : "Termin an " + name(fuer) + " geben"}
          </Btn>
        </div>
      )}

      {alle.length === 0 ? (
        <div className="rounded p-8 text-center text-sm"
             style={{ border: "1px dashed " + C.line, color: C.muted }}>
          Keine Termine eingetragen.
        </div>
      ) : (
        <div className="rounded overflow-hidden" style={{ background: C.card, border: "1px solid " + C.line }}>
          {/* als Funktion aufgerufen, nicht als Baustein: so behalten Eingabefelder beim Tippen den Fokus */}
          {alle.map((t, i) => Zeile({ t, i }))}
        </div>
      )}

      {darfZuweisen && vergeben.length > 0 && (
        <div>
          <div className="text-sm mb-2">An dein Team vergeben</div>
          <div className="rounded overflow-hidden" style={{ background: C.card, border: "1px solid " + C.line }}>
            {vergeben.map((t, i) => Zeile({ t, i, vergebenAn: true }))}
          </div>
        </div>
      )}

      <p className="text-xs" style={{ color: C.muted, maxWidth: "62ch" }}>
        Termine lassen sich einzeln in den Google Kalender übernehmen oder gemeinsam als
        ICS-Datei exportieren, die jeder Kalender einlesen kann. Eine dauerhafte Verknüpfung mit
        Google erfordert eine Anmeldung über Google und kommt mit dem Backend.
      </p>
    </div>
  );
}

/* Problemfälle und Stornierungen */
const PROBLEM_ARTEN = ["Mahnung", "Problem", "Storno", "Sonstiges"];
const PROBLEM_STATUS = {
  offen: { label: "Offen", color: "#B24328" },
  bearbeitung: { label: "In Bearbeitung", color: "#2F5FE0" },
  erledigt: { label: "Erledigt", color: "#4A9130" },
};

const Problemfaelle = teilKomponente("innendienst", "Problemfaelle");   /* in innendienst.jsx */
/* Punkt 4: Smartmeter als Zusatzgeschäft bei Bestandskunden */
const SM_STATUS = {
  entwurf: { label: "In Erfassung", color: "#6B7787" },
  eingereicht: { label: "Bei Kalkulation", color: "#2F5FE0" },
  klaerfall: { label: "Daten fehlen", color: "#B24328" },
  uebermittelt: { label: "An Messstellenbetreiber übermittelt", color: "#BE6A16" },
  msb_abgelehnt: { label: "Vom Messstellenbetreiber abgelehnt", color: "#B24328" },
  bestaetigt: { label: "Bestätigt, Provision offen", color: "#BE6A16" },
  abgeschlossen: { label: "Abgeschlossen, Smartmeter verbaut", color: "#4A9130" },
};

const Smartmeter = teilKomponente("innendienst", "Smartmeter");   /* in innendienst.jsx */
/* Punkt 5: Tickets an die Fachabteilungen */
const TICKET_EMPFAENGER = ["Vertragsmanagement", "Kalkulation", "Geschäftsführung", "Finanzbuchhaltung"];
const TICKET_STATUS = {
  offen: { label: "Offen", color: "#B24328" },
  bearbeitung: { label: "Wird bearbeitet", color: "#2F5FE0" },
  abgeschlossen: { label: "Abgeschlossen", color: "#4A9130" },
};

const Tickets = teilKomponente("innendienst", "Tickets");   /* in innendienst.jsx */
const ersterDesFolgemonats = (iso) => {
  const d = new Date(iso);
  if (isNaN(d)) return null;
  return new Date(Date.UTC(d.getFullYear(), d.getMonth() + 1, 1)).toISOString().slice(0, 10);
};

function faelligkeiten(a) {
  const v = aktiveVariante(a);
  const st = provisionsStellen(a);
  const jahre = st.length ? Math.max(...st.map((s) => lieferjahreAus(s.monate))) : lieferjahreAus(laufzeitVon(a) || 12);
  const beginne = st.map((s) => s.beginn).filter(Boolean).sort();
  const beginn = beginne[0] || (v && v.lieferbeginn) || a.angelegt;
  const eingang = (a.provisionErhalten && a.provisionErhalten.datum)
    || ((a.verlauf || []).filter((x) => /^Provisionseingang bestätigt/.test(x.t || "")).pop() || {}).d
    || (a.bestaetigung && a.bestaetigung.datum) || a.angelegt;
  return Array.from({ length: jahre }, (_, i) => {
    if (i === 0) return { jahr: 1, faellig: eingang, beginnLieferjahr: beginn };
    const start = monateDazu(beginn, i * 12) || beginn;
    const f = ersterDesFolgemonats(start) || start;
    return { jahr: i + 1, faellig: f < eingang ? eingang : f, beginnLieferjahr: start };
  });
}

/* Alle Auszahlungen je Empfänger und Lieferjahr, mit Fälligkeit und ob schon bezahlt.
   Grundlage für die Provisionsabrechnung und die Übersicht der Finanzbuchhaltung. */
function auszahlungsZeilen(anfragen, mitarbeiter, wer = "alle") {
  const abg = anfragen.filter((a) => a.status === "abgeschlossen" && a.kalkulation);
  const zeilen = [];
  abg.forEach((a) => {
    faelligkeiten(a).forEach((f) => {
      /* je Lieferjahr eigens rechnen: ein einmaliger Tippgeber fällt nur im 1. Jahr an */
      const v = gesamtverteilung(a, mitarbeiter, undefined, f.jahr);
      const empfaenger = [...v.anteile];
      if (v.tippgeber && v.tippgeber.betrag > 0)
        empfaenger.push({ id: "tg-" + v.tippgeber.id, name: v.tippgeber.name, rolle: "Tippgeber",
                          betrag: v.tippgeber.betrag, vonPartner: v.tippgeber.besitzerId });
      empfaenger.forEach((x) => {
        if (wer !== "alle" && x.id !== wer && x.vonPartner !== wer) return;
        const schluessel = x.id + ":" + f.jahr;
        const alt = (a.ausgezahlt || {})[x.id];
        const eintrag = (a.ausgezahlt || {})[schluessel] || (f.jahr === 1 ? alt : null);
        zeilen.push({
          key: a.id + "-" + schluessel, anfrage: a, person: x, jahr: f.jahr, faellig: f.faellig,
          schluessel, bezahlt: !!eintrag, datum: (eintrag || {}).datum,
          ueberfaellig: !eintrag && f.faellig <= heute(),
        });
      });
    });
  });
  return zeilen;
}

function Abrechnung({ anfragen, mitarbeiter, user, setAnfragen, notieren, onOeffnen }) {
  const [wer, setWer] = useState("alle");
  const [nurOffen, setNurOffen] = useState(false);
  const zeilen = auszahlungsZeilen(anfragen, mitarbeiter, wer);

  const gefiltert = nurOffen ? zeilen.filter((z) => !z.bezahlt) : zeilen;

  const umschalten = (z) => {
    setAnfragen((alt) => alt.map((a) => {
      if (a.id !== z.anfrage.id) return a;
      const aus = { ...(a.ausgezahlt || {}) };
      if (aus[z.schluessel]) {
        delete aus[z.schluessel];
        if (notieren) notieren("Auszahlung",
          "Auszahlung zurückgenommen: " + z.person.name + ", " + a.kunde.firma + ", Jahr " + z.jahr);
      } else {
        /* Betrag mitspeichern: steht in der E-Mail an den Empfänger */
        aus[z.schluessel] = { datum: heute(), von: user.name, jahr: z.jahr,
                              betrag: Math.round(z.person.betrag * 100) / 100 };
        if (notieren) notieren("Auszahlung",
          eur(z.person.betrag) + " an " + z.person.name + " für " + a.kunde.firma + ", Jahr " + z.jahr);
      }
      if (z.jahr === 1 && aus[z.person.id]) delete aus[z.person.id];
      return { ...a, ausgezahlt: aus };
    }));
  };

  const summe = (l) => l.reduce((t, z) => t + z.person.betrag, 0);
  const offen = zeilen.filter((z) => !z.bezahlt);
  const faellig = offen.filter((z) => z.ueberfaellig);

  return (
    <div>
      <div className="grid sm:grid-cols-4 gap-3 mb-5">
        {[["Fällig und offen", summe(faellig), C.warn, true], ["Offen gesamt", summe(offen), C.gas, true],
          ["Ausgezahlt", summe(zeilen.filter((z) => z.bezahlt)), C.ok, false],
          ["Gesamtvolumen", summe(zeilen), C.text, false]].map(([k, w, f, nurO]) => (
          <button key={k} onClick={() => setNurOffen(nurO)}
            className="rounded p-4 text-left w-full" style={{ background: C.card, border: "1px solid " + C.line }}>
            <div className="text-xs mb-2" style={{ color: C.muted }}>{k} (€)</div>
            <div className="text-2xl" style={{ color: f, fontVariantNumeric: "tabular-nums" }}>{num(w, 2)}</div>
          </button>
        ))}
      </div>

      <div className="rounded p-3 mb-5 grid sm:grid-cols-2 gap-3 items-end"
           style={{ background: C.card, border: "1px solid " + C.line }}>
        <Select label="Empfänger" value={wer} onChange={setWer}
          options={[{ value: "alle", label: "Alle Empfänger" },
            ...mitarbeiter.filter((m) => ["Vertriebspartner", "Teamleiter", "Leitung Vertrieb"].includes(m.rolle))
              .map((m) => ({ value: m.id, label: m.name + " · " + m.rolle }))]} />
        <label className="flex items-center gap-2 text-sm pb-2">
          <input type="checkbox" checked={nurOffen} onChange={(e) => setNurOffen(e.target.checked)}
            style={{ accentColor: C.ink }} />
          Nur offene Fälligkeiten
        </label>
      </div>

      {gefiltert.length === 0 ? (
        <div className="rounded p-8 text-center text-sm"
             style={{ border: "1px dashed " + C.line, color: C.muted }}>
          Keine Fälligkeiten in dieser Auswahl.
        </div>
      ) : (
        <div className="rounded overflow-hidden" style={{ background: C.card, border: "1px solid " + C.line }}>
          {gefiltert
            .sort((x, y) => (x.faellig || "").localeCompare(y.faellig || ""))
            .map((z, i) => (
            <div key={z.key} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3"
                 style={{ borderTop: i ? "1px solid " + C.line : "none",
                          background: z.bezahlt ? "#F4F8F2" : z.ueberfaellig ? "#FCF3F0" : "transparent" }}>
              <button className="flex-1 min-w-40 text-left"
                onClick={() => onOeffnen && onOeffnen(z.anfrage.id)}>
                <div className="text-sm">{z.anfrage.kunde.firma}
                  <span className="text-xs ml-2 px-1.5 py-0.5 rounded"
                        style={{ border: "1px solid " + C.line, color: C.muted }}>
                    Lieferjahr {z.jahr}
                  </span>
                </div>
                <div className="text-xs" style={{ color: C.muted }}>
                  {z.anfrage.id} · {z.person.name} ({z.person.rolle}
                  {z.person.overhead ? ", Overhead" : ""}
                  {(mitarbeiter.find((m) => m.id === z.person.id) || {}).angestellt ? ", angestellt · über die Lohnabrechnung" : ""}
                  {z.person.vonPartner ? ", von " + ((mitarbeiter.find((m) => m.id === z.person.vonPartner) || {}).name || "Partner") : ""})
                  {" · fällig " + datum(z.faellig)}
                </div>
              </button>
              <span className="text-sm w-28 text-right" style={{ fontVariantNumeric: "tabular-nums" }}>
                {eur(z.person.betrag)}
              </span>
              <label className="flex items-center gap-2 text-xs w-44"
                     style={{ color: z.bezahlt ? C.ok : z.ueberfaellig ? C.warn : C.muted }}>
                <input type="checkbox" checked={z.bezahlt} onChange={() => umschalten(z)}
                  style={{ accentColor: C.ok }} />
                {z.bezahlt ? "ausgezahlt " + datum(z.datum)
                  : z.ueberfaellig ? "fällig, noch offen" : "noch nicht fällig"}
              </label>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs mt-4" style={{ color: C.muted, maxWidth: "62ch" }}>
        Je Lieferjahr entsteht eine eigene Fälligkeit. Das erste Lieferjahr wird fällig, sobald der
        Provisionseingang bestätigt ist, auch wenn die Belieferung erst später beginnt. Jedes weitere
        Lieferjahr wird im Monat nach seinem Beginn fällig: Lieferbeginn 1.1.2029 ergibt Februar 2030
        und Februar 2031.
      </p>
    </div>
  );
}

/* Kundenübersicht: laufende Verträge mit Menge und Provision je Sparte */
function Kunden({ anfragen, leads, mitarbeiter, user, onOeffnen, onLead }) {
  const [bereich, setBereich] = useState("meine");
  const istTL = user.rolle === "Teamleiter";
  const vollsicht = ["Geschäftsführung", "Finanzbuchhaltung", "Leitung Vertrieb"].includes(user.rolle);
  const geldVoll = ["Geschäftsführung", "Finanzbuchhaltung"].includes(user.rolle);
  const ids = bereichIds(user, mitarbeiter, bereich);
  const liste = imBereich(anfragen, ids)
    .filter((a) => a.status === "abgeschlossen" && a.kalkulation)
    .sort((x, y) => (x.kunde.firma || "").localeCompare(y.kunde.firma || ""));

  const basis = (a) => (geldVoll ? gesamtprovision(a) : anteilVon(a, user.id, mitarbeiter));
  /* Provision je Sparte: spartenreine Varianten zählen direkt,
     gemischte Varianten werden nach Menge aufgeteilt */
  const jeSparte = (a, medium) => {
    const vs = gewaehlte(a).length ? gewaehlte(a) : varianten(a).slice(0, 1);
    const faktor = geldVoll ? 1 : (gesamtprovision(a) > 0 ? basis(a) / gesamtprovision(a) : 0);
    return vs.reduce((t, v) => {
      const p = provisionVariante(a, v) * faktor;
      if ((v.sparte || "beide") === medium) return t + p;
      if ((v.sparte || "beide") !== "beide") return t;
      const g = verbrauchGesamt(a);
      return t + (g > 0 ? (p * verbrauchMedium(a, medium)) / g : 0);
    }, 0);
  };
  const sum = (f) => liste.reduce((t, a) => t + f(a), 0);

  const Kopf = ({ children, rechts }) => (
    <th className={"px-3 py-2 text-xs font-normal " + (rechts ? "text-right" : "text-left")}
        style={{ color: C.muted, whiteSpace: "nowrap" }}>{children}</th>
  );
  const Zelle = ({ children, rechts, dick }) => (
    <td className={"px-3 py-2.5 text-sm " + (rechts ? "text-right" : "")}
        style={{ fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap",
                 borderTop: "1px solid " + C.line, fontWeight: dick ? 500 : 400 }}>{children}</td>
  );

  return (
    <div>
      {istTL && <Umschalter bereich={bereich} setBereich={setBereich} />}
      <p className="text-sm mb-4" style={{ color: C.muted, maxWidth: "60ch" }}>
        {geldVoll
          ? "Alle laufenden Verträge mit Gesamtprovision je Lieferjahr."
          : "Deine laufenden Verträge mit deiner Provision je Lieferjahr."}
      </p>

      {liste.length === 0 ? (
        <div className="rounded p-8 text-center text-sm"
             style={{ border: "1px dashed " + C.line, color: C.muted }}>
          Noch keine abgeschlossenen Kunden. Angenommene Angebote erscheinen hier.
        </div>
      ) : (
        <div className="rounded overflow-x-auto" style={{ background: C.card, border: "1px solid " + C.line }}>
          <table className="w-full" style={{ minWidth: 860 }}>
            <thead>
              <tr>
                <Kopf>Kunde</Kopf>
                <Kopf>Laufzeit</Kopf>
                <Kopf>Vertragsende</Kopf>
                <Kopf rechts>kWh Strom</Kopf>
                <Kopf rechts>kWh Erdgas</Kopf>
                <Kopf rechts>Provision Strom</Kopf>
                <Kopf rechts>Provision Erdgas</Kopf>
                <Kopf rechts>Gesamt</Kopf>
              </tr>
            </thead>
            <tbody>
              {liste.map((a) => {
                const va = aktiveVariante(a);
                const ende = vertragsende(a);
                return (
                  <tr key={a.id} onClick={() => onOeffnen(a.id)} style={{ cursor: "pointer" }}>
                    <Zelle>
                      {a.kunde.firma}
                      {a.verlaengerungVon && (
                        <span className="text-xs ml-2 px-1.5 py-0.5 rounded"
                              style={{ border: "1px solid " + C.line, color: C.strom }}>Verlängerung</span>
                      )}
                      <span className="block text-xs" style={{ color: C.muted }}>
                        {a.kunde.ort}{vollsicht || bereich === "team" ? " · " + a.partnerName : ""}
                      </span>
                    </Zelle>
                    <Zelle>{laufzeitVon(a)} Monate
                      <span className="block text-xs" style={{ color: C.muted }}>
                        {va && va.lieferbeginn ? "ab " + datum(va.lieferbeginn) : va ? va.produkt : ""}
                      </span>
                    </Zelle>
                    <Zelle>
                      {ende ? datum(ende) : "offen"}
                      {(() => {
                        const rest = monateBis(ende);
                        const laeuft = anfragen.some((x) => x.verlaengerungVon === a.id);
                        if (laeuft) return (
                          <span className="block text-xs" style={{ color: C.ok }}>Verlängerung läuft</span>
                        );
                        if (rest != null && rest >= 0 && rest <= VERLAENGERUNG_VORLAUF[0]) return (
                          <span className="block text-xs" style={{ color: C.gas }}>
                            in {rest} Monaten fällig
                          </span>
                        );
                        return null;
                      })()}
                    </Zelle>
                    <Zelle rechts>{verbrauchMedium(a, "strom") ? num(verbrauchMedium(a, "strom")) : "–"}</Zelle>
                    <Zelle rechts>{verbrauchMedium(a, "gas") ? num(verbrauchMedium(a, "gas")) : "–"}</Zelle>
                    <Zelle rechts>{verbrauchMedium(a, "strom") ? eur(jeSparte(a, "strom")) : "–"}</Zelle>
                    <Zelle rechts>{verbrauchMedium(a, "gas") ? eur(jeSparte(a, "gas")) : "–"}</Zelle>
                    <Zelle rechts dick>{eur(basis(a))}</Zelle>
                  </tr>
                );
              })}
              <tr style={{ background: "#F6F8FA" }}>
                <Zelle dick>{liste.length} Kunden</Zelle>
                <Zelle />
                <Zelle />
                <Zelle rechts>{num(sum((a) => verbrauchMedium(a, "strom")))}</Zelle>
                <Zelle rechts>{num(sum((a) => verbrauchMedium(a, "gas")))}</Zelle>
                <Zelle rechts>{eur(sum((a) => jeSparte(a, "strom")))}</Zelle>
                <Zelle rechts>{eur(sum((a) => jeSparte(a, "gas")))}</Zelle>
                <Zelle rechts dick>{eur(sum(basis))}</Zelle>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {(() => {
        const anbahnung = (leads || [])
          .filter((l) => ["angebot", "verhandlung", "auftrag"].includes(leadSpalte(l)))
          .filter((l) => vollsicht || (ids ? ids.includes(l.zugewiesen) : l.zugewiesen === user.id));
        if (anbahnung.length === 0) return null;
        return (
          <div className="mt-8">
            <div className="flex items-baseline justify-between mb-3">
              <span className="text-sm">In Anbahnung aus Leads</span>
              <span className="text-xs" style={{ color: C.muted }}>
                ab Angebotsphase, noch ohne Vertrag
              </span>
            </div>
            <div className="rounded overflow-hidden" style={{ background: C.card, border: "1px solid " + C.line }}>
              {anbahnung.map((l, i) => {
                const sp = LEAD_STATUS[leadSpalte(l)];
                const inhaber = mitarbeiter.find((m) => m.id === l.zugewiesen);
                return (
                  <button key={l.id} onClick={() => onLead && onLead()}
                    className="w-full text-left px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-1"
                    style={{ borderTop: i ? "1px solid " + C.line : "none" }}>
                    <div className="flex-1 min-w-40">
                      <div className="text-sm">{l.firma}</div>
                      <div className="text-xs" style={{ color: C.muted }}>
                        {l.ort} · {l.quelle}
                        {vollsicht && inhaber ? " · " + inhaber.name : ""}
                      </div>
                    </div>
                    <div className="text-sm text-right w-28" style={{ fontVariantNumeric: "tabular-nums" }}>
                      {num(parseFloat(l.verbrauchStrom) || 0)} kWh
                    </div>
                    <div className="text-sm text-right w-28" style={{ fontVariantNumeric: "tabular-nums" }}>
                      {num(parseFloat(l.verbrauchGas) || 0)} kWh
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-xs w-36" style={{ color: sp.color }}>
                      <span className="w-2 h-2 rounded-full" style={{ background: sp.color }} />{sp.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

/* Welche Vorgänge gehören zum gewählten Bereich? null = alle */
function bereichIds(user, mitarbeiter, bereich) {
  if (["Leitung Vertrieb", "Geschäftsführung", "Kalkulation", "Vertragsmanagement",
       "Finanzbuchhaltung", "Leadmanagement"].includes(user.rolle))
    return null;
  if (user.rolle === "Teamleiter" && bereich === "team")
    return [user.id, ...strukturUnter(user.id, mitarbeiter).map((m) => m.id)];
  return [user.id];
}

const imBereich = (anfragen, ids) =>
  ids ? anfragen.filter((a) => ids.some((x) => istBeteiligt(a, x))) : anfragen;

function Umschalter({ bereich, setBereich }) {
  return (
    <div className="flex gap-1 mb-5">
      {[["meine", "Meine Übersicht"], ["team", "Vertriebsteam"]].map(([id, label]) => (
        <button key={id} onClick={() => setBereich(id)}
          className="px-3 py-1.5 text-sm rounded"
          style={{
            background: bereich === id ? C.ink : "transparent",
            color: bereich === id ? "#fff" : C.muted,
            border: "1px solid " + (bereich === id ? C.ink : C.line),
          }}>
          {label}
        </button>
      ))}
    </div>
  );
}

/* Rangliste nach vermittelter Provision je Lieferjahr */
function Rangliste({ titel, zeilen, hinweis, geld = true }) {
  const max = Math.max(...zeilen.map((z) => z.wert), 1);
  const zeigen = (w) => (geld ? eur(w) : num(w) + " kWh");
  return (
    <div className="rounded overflow-hidden" style={{ background: C.card, border: "1px solid " + C.line }}>
      <div className="flex items-baseline justify-between px-4 py-3" style={{ borderBottom: "1px solid " + C.line }}>
        <span className="text-sm">{titel}</span>
        {hinweis && <span className="text-xs" style={{ color: C.muted }}>{hinweis}</span>}
      </div>
      {zeilen.length === 0 && (
        <div className="px-4 py-4 text-sm" style={{ color: C.muted }}>Noch keine Abschlüsse.</div>
      )}
      {zeilen.map((z, i) => (
        <div key={z.id} className="px-4 py-3" style={{ borderTop: i ? "1px solid " + C.line : "none" }}>
          <div className="flex items-center gap-3">
            <span className="text-sm w-6 text-center"
                  style={{ color: i < 3 ? C.ok : C.muted, fontVariantNumeric: "tabular-nums" }}>
              {i + 1}
            </span>
            {z.person && <Avatar m={z.person} size={30} />}
            <span className="flex-1 min-w-0">
              <span className="text-sm block truncate">{z.name}</span>
              <span className="text-xs" style={{ color: C.muted }}>{z.unten}</span>
            </span>
            <span className="text-sm" style={{ fontVariantNumeric: "tabular-nums" }}>{zeigen(z.wert)}</span>
          </div>
          <div className="mt-2 h-1 rounded" style={{ background: "#EDEFF2" }}>
            <div className="h-1 rounded"
                 style={{ width: Math.max(2, (z.wert / max) * 100) + "%",
                          background: i === 0 ? C.gruen : C.inkSoft }} />
          </div>
        </div>
      ))}
    </div>
  );
}

const Kalkulationen = teilKomponente("innendienst", "Kalkulationen");   /* in innendienst.jsx */
const Beschaffung = teilKomponente("beschaffung", "Beschaffung");   /* in beschaffung.jsx */
function Abschnitt({ titel, children, rechts }) {
  return (
    <div className="rounded p-4 sm:p-5" style={{ background: C.card, border: "1px solid " + C.line }}>
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <span className="text-sm">{titel}</span>{rechts}
      </div>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Übersicht für den Innendienst                                      */
/*  Kalkulation, Vertragsmanagement, Finanzbuchhaltung und             */
/*  Leadmanagement schließen keine Verträge ab und bekommen keine      */
/*  Provision. Sie sehen, was bei ihnen ansteht, nicht Quote, Menge    */
/*  oder Provision des Vertriebs.                                      */
/* ------------------------------------------------------------------ */
const INNENDIENST = ["Kalkulation", "Vertragsmanagement", "Finanzbuchhaltung", "Leadmanagement"];
const VM_SCHRITTE = ["Vertrag zu erstellen", "Vertrag versendet", "Vertrag unterschrieben",
  "Beim Versorger eingereicht", "Lieferung aktiv"];

const ArbeitsUebersicht = teilKomponente("innendienst", "ArbeitsUebersicht");   /* in innendienst.jsx */
/* „Zu tun für dich“ als Zusammenfassung: je Aufgabe Anzahl, Text, Ziel */
function ZuTunKarte({ eintraege, leerText }) {
  const offen = (eintraege || []).filter((x) => x.n > 0);
  return (
    <div className="rounded overflow-hidden" style={{ background: C.card, border: "1px solid " + C.line }}>
      <div className="flex items-baseline justify-between px-4 py-3" style={{ borderBottom: "1px solid " + C.line }}>
        <span className="text-sm">Zu tun für dich</span>
        <span className="text-xs" style={{ color: C.muted }}>{offen.length ? offen.reduce((t, x) => t + x.n, 0) + " offen" : "alles erledigt"}</span>
      </div>
      {offen.length === 0 && (
        <div className="px-4 py-4 text-sm" style={{ color: C.muted }}>{leerText || "Gerade ist nichts von dir gefragt."}</div>
      )}
      {offen.map((x, i) => (
        <button key={x.text} onClick={x.klick} className="w-full text-left flex items-center gap-3 px-4 py-3 text-sm"
          style={{ borderTop: i ? "1px solid " + C.line : "none" }}>
          <span className="min-w-7 h-7 px-2 rounded-full flex items-center justify-center flex-shrink-0 text-xs"
                style={{ background: x.farbe || C.ink, color: "#fff", fontVariantNumeric: "tabular-nums" }}>{x.n}</span>
          <span className="flex-1 min-w-0">{x.text}</span>
          <ChevronRight size={16} color={C.muted} />
        </button>
      ))}
    </div>
  );
}

/* Übersicht: Innendienst und Vertrieb haben je eine eigene */
function Dashboard(props) {
  return INNENDIENST.includes(props.user.rolle)
    ? <ArbeitsUebersicht key={props.user.id} {...props} />
    : <VertriebsUebersicht key={props.user.id} {...props} />;
}

function VertriebsUebersicht({ anfragen, mitarbeiter, user, onOeffnen, onListe, termine, leads,
                    setMitarbeiter, aufgaben, setAufgaben, bonusziele, gfZahlen }) {
  const [bereich, setBereich] = useState("meine");
  const [anpassen, setAnpassen] = useState(false);
  const istTL = user.rolle === "Teamleiter";
  const ids = bereichIds(user, mitarbeiter, bereich);
  const menge_ = imBereich(anfragen, ids);

  const vollsicht = ["Geschäftsführung", "Finanzbuchhaltung"].includes(user.rolle);
  const sichtFirma = user.rolle === "Geschäftsführung";
  const geld = !["Kalkulation", "Vertragsmanagement"].includes(user.rolle);
  const struktur = vollsicht || user.rolle === "Leitung Vertrieb" || (istTL && bereich === "team");
  const vertrieb = ["Vertriebspartner", "Teamleiter", "Leitung Vertrieb"].includes(user.rolle);

  /* Punkt 6: eigene Auswahl der Kacheln und der Darstellung */
  const stil = user.dashboardStil || "liste";
  const aus = user.dashboardAus || [];
  const zeigt = (id) => !aus.includes(id);
  const umschalten = (id) =>
    setMitarbeiter((alt) => alt.map((m) => m.id === user.id
      ? { ...m, dashboardAus: aus.includes(id) ? aus.filter((x) => x !== id) : [...aus, id] } : m));
  const stilSetzen = (v) =>
    setMitarbeiter((alt) => alt.map((m) => (m.id === user.id ? { ...m, dashboardStil: v } : m)));

  const z = {
    eingang: menge_.filter((a) => a.status === "eingereicht").length,
    angefragt: menge_.filter((a) => a.status === "angefragt").length,
    klaer: menge_.filter((a) => a.status === "klaerfall").length,
    angebot: menge_.filter((a) => a.status === "angebot").length,
    auftrag: menge_.filter((a) => a.status === "uebermittelt").length,
    fix: menge_.filter((a) => ["bestaetigt", "abgeschlossen"].includes(a.status)).length,
  };
  const fixe = menge_.filter((a) => a.status === "abgeschlossen" && a.kalkulation);
  const kwh = fixe.reduce((t, a) => t + verbrauchGesamt(a), 0);
  const prov = fixe.reduce(
    (t, a) => t + (vollsicht ? gesamtprovision(a) : anteilVon(a, user.id, mitarbeiter)), 0);
  const beiFirma = fixe.reduce((t, a) => t + gesamtverteilung(a, mitarbeiter).firma, 0);
  const quote = z.angebot + z.fix > 0 ? (z.fix / (z.angebot + z.fix)) * 100 : 0;

  const KACHELN = [
    { id: "eingang", k: "Neue Anfragen", v: z.eingang, farbe: C.strom, f: (a) => a.status === "eingereicht" },
    { id: "angefragt", k: "Angebot in Bearbeitung", v: z.angefragt, farbe: C.gas, f: (a) => a.status === "angefragt" },
    { id: "klaer", k: "Klärfälle", v: z.klaer, farbe: z.klaer ? C.warn : C.text, f: (a) => a.status === "klaerfall" },
    { id: "angebot", k: "Offene Angebote", v: z.angebot, farbe: C.ok, f: (a) => a.status === "angebot" },
    { id: "auftrag", k: "Aufträge beim Versorger", v: z.auftrag, farbe: C.strom, f: (a) => a.status === "uebermittelt" },
    { id: "fix", k: "Abschlüsse", v: z.fix, f: (a) => ["bestaetigt", "abgeschlossen"].includes(a.status) },
  ];
  const abgeschlosseneListe = menge_.filter((a) => a.status === "abgeschlossen");
  const ZAHLEN = [
    { id: "menge", k: "Vermittelte Menge (kWh/Jahr)", v: num(kwh),
      liste: abgeschlosseneListe, titel: "Abgeschlossene Verträge" },
    ...(geld ? [{ id: "prov", k: vollsicht ? "Gesamtprovision (€/Jahr)" : "Deine Provision (€/Jahr)",
                  v: num(prov, 2), farbe: vollsicht ? C.text : C.ok, ziel: "provisionen" }] : []),
    ...(geld && sichtFirma ? [{ id: "firma", k: "davon Firma (€/Jahr)", v: num(beiFirma, 2),
                  farbe: C.ok, ziel: "provisionen" }] : []),
    { id: "quote", k: "Abschlussquote", v: num(quote, 0) + " %",
      liste: menge_.filter((a) => ["angebot", "bestaetigt", "abgeschlossen"].includes(a.status)),
      titel: "Angebote und Abschlüsse" },
  ];

  const Kachel = ({ k, v, farbe, klick }) => (
    <button onClick={klick} disabled={!klick}
      className="rounded p-4 text-left w-full"
      style={{ background: C.card, border: "1px solid " + C.line, cursor: klick ? "pointer" : "default" }}>
      <div className="text-xs mb-2" style={{ color: C.muted }}>{k}</div>
      <div className="text-2xl" style={{ color: farbe || C.text, fontVariantNumeric: "tabular-nums" }}>{v}</div>
    </button>
  );

  const Karte = ({ titel, rechts, children }) => (
    <div className="rounded overflow-hidden" style={{ background: C.card, border: "1px solid " + C.line }}>
      <div className="flex items-baseline justify-between px-4 py-3" style={{ borderBottom: "1px solid " + C.line }}>
        <span className="text-sm">{titel}</span>{rechts}
      </div>
      {children}
    </div>
  );

  const Reihe = ({ i, links, unten, rechts, klick }) => (
    <button onClick={klick} disabled={!klick}
      className="w-full text-left flex items-center gap-4 px-4 py-3 text-sm"
      style={{ borderTop: i ? "1px solid " + C.line : "none", cursor: klick ? "pointer" : "default" }}>
      <span className="flex-1">{links}
        {unten && <span className="block text-xs" style={{ color: C.muted }}>{unten}</span>}
      </span>
      <span style={{ fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{rechts}</span>
    </button>
  );

  const wartend = menge_.filter((a) => ["eingereicht", "angefragt"].includes(a.status))
    .sort((x, y) => x.angelegt.localeCompare(y.angelegt));
  const meineOffen = menge_.filter((a) => ["klaerfall", "angebot", "uebermittelt", "bestaetigt"].includes(a.status));
  const heutigeTermine = (termine || []).filter((t) => t.fuerId === user.id && t.datum === heute());
  const wocheEnde = (() => { const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().slice(0, 10); })();
  const wocheTermine = (termine || []).filter((t) => t.fuerId === user.id && t.datum > heute() && t.datum <= wocheEnde);
  const leadTermine = (leads || []).filter((l) => l.zugewiesen === user.id && l.terminDatum &&
    l.terminDatum >= heute() && l.terminDatum <= wocheEnde);
  const stand = zielstand(user, anfragen, mitarbeiter);

  /* Schnellzugriff: Angebot anfragen und Auftrag einreichen, oben und groß */
  const schnell = vertrieb || user.rolle === "Geschäftsführung";
  /* annehmen kann man erst, wenn das Angebot beim Kunden ist */
  const annehmbar = menge_.filter((a) => a.status === "angebot" && a.angebotVersendet);
  /* Was Kunden mit dem Angebotslink gemacht haben: geöffnet, unterschrieben */
  const [links, setLinks] = useState({});
  const linkIds = menge_.filter((a) => a.status === "angebot" && a.angebotVersendet && a.angebotVersendet.perLink && istBeteiligt(a, user.id)).map((a) => a.id);
  useEffect(() => {
    if (!vertrieb || !linkIds.length) return;
    let aus = false;
    const holen = () => kundenlinksFuer(linkIds).then((zeilen) => {
      if (aus) return;
      const je = {};
      zeilen.forEach((z) => {
        const d = z.daten || {}, alt = je[z.anfrage_id] || {};
        const g = (d.geoeffnet || []).slice(-1)[0];
        je[z.anfrage_id] = { angenommen: alt.angenommen || d.angenommen || null,
          geoeffnet: [alt.geoeffnet, g].filter(Boolean).sort().slice(-1)[0] || null };
      });
      setLinks(je);
    }).catch(() => {});
    holen();
    const t = setInterval(holen, 60000);
    return () => { aus = true; clearInterval(t); };
  }, [vertrieb, linkIds.join(",")]);
  const uhr = (iso) => { try { return new Date(iso).toLocaleString("de-DE", { timeZone: "Europe/Berlin", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) + " Uhr"; } catch (e) { return ""; } };

  /* Zu tun für den Vertriebspartner, das Dringendste zuerst */
  const zuTun = vertrieb ? menge_.filter((a) => istBeteiligt(a, user.id)).map((a) => {
    const l = links[a.id];
    if (a.status === "angebot" && l && l.angenommen) return { a, rang: -1, farbe: C.ok, text: "Kunde hat unterschrieben: Auftrag bestätigen" };
    if (a.status === "angebot" && l && l.geoeffnet) return { a, rang: 1.5, farbe: C.strom, text: "Kunde hat das Angebot geöffnet (" + uhr(l.geoeffnet) + "): jetzt anrufen" };
    if (a.status === "klaerfall") return { a, rang: 0, farbe: C.warn, text: "Unterlagen nachreichen" };
    if (a.status === "angebot" && !a.angebotVersendet) return { a, rang: 1, farbe: C.ok, text: "Angebot an den Kunden schicken" };
    if (a.status === "angebot") return { a, rang: 2, farbe: C.ok, text: "Zusage des Kunden erfassen" };
    if (a.status === "entwurf") return { a, rang: 3, farbe: C.muted, text: "Entwurf fertigstellen und senden" };
    return null;
  }).filter(Boolean).sort((x, y) => x.rang - y.rang) : [];
  const morgen = (() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); })();
  const termineBald = vertrieb ? (termine || [])
    .filter((t) => (t.fuerId || "") === user.id && !t.ergebnis && [heute(), morgen].includes(t.datum))
    .sort((x, y) => (x.datum + (x.zeit || "")).localeCompare(y.datum + (y.zeit || ""))) : [];
  const auftragEinreichen = () => annehmbar.length === 1
    ? onOeffnen(annehmbar[0].id)
    : onListe("Auftrag einreichen: Angebot wählen", annehmbar);

  return (
    <div className="space-y-5">
      {schnell && (
        <div className="grid sm:grid-cols-2 gap-3">
          <button onClick={() => onOeffnen(null, "neu")}
            className="rounded p-4 text-left w-full flex items-center gap-4"
            style={{ background: C.ink, color: "#fff" }}>
            <span className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: C.gruen }}><Plus size={22} color={C.ink} /></span>
            <span>
              <span className="block text-base">Angebot anfragen</span>
              <span className="block text-xs" style={{ color: "#B9C6D4" }}>Neuen Kunden an die Kalkulation geben</span>
            </span>
          </button>
          <button onClick={auftragEinreichen} disabled={!annehmbar.length}
            className="rounded p-4 text-left w-full flex items-center gap-4"
            style={{ background: C.card, border: "2px solid " + (annehmbar.length ? C.ok : C.line),
                     opacity: annehmbar.length ? 1 : 0.6 }}>
            <span className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: annehmbar.length ? C.ok : C.line }}><Check size={22} color="#fff" /></span>
            <span>
              <span className="block text-base">Auftrag einreichen</span>
              <span className="block text-xs" style={{ color: C.muted }}>
                {annehmbar.length === 0 ? "Kein Angebot beim Kunden"
                  : annehmbar.length === 1 ? "Angebot beim Kunden: " + annehmbar[0].kunde.firma
                  : annehmbar.length + " Angebote warten auf die Zusage des Kunden"}
              </span>
            </span>
          </button>
        </div>
      )}

      {user.rolle === "Geschäftsführung" && (() => {
        const g = gfZahlen || {};
        const eigene = menge_.filter((a) => istBeteiligt(a, user.id));
        const eigenKlaer = eigene.filter((a) => a.status === "klaerfall");
        const eigenAngebot = eigene.filter((a) => a.status === "angebot");
        return (
          <ZuTunKarte eintraege={[
            { n: g.provisionOffen || 0, text: "Provisionseingang erfassen und bestätigen", farbe: C.warn, klick: () => onOeffnen(null, "ausstehend") },
            { n: anfragen.filter((a) => a.status === "ruecksprache").length, text: "Rücksprachen der Kalkulation beantworten", farbe: C.gruen, klick: () => onOeffnen(null, "ruecksprachen") },
            { n: g.offeneStrukturanfragen || 0, text: "Strukturanfragen der Teamleiter entscheiden", farbe: C.gas, klick: () => onOeffnen(null, "partner") },
            { n: mitarbeiter.filter((m) => m.status === "pruefung").length, text: "Neue Vertriebsmitarbeiter prüfen und freigeben", farbe: C.gas, klick: () => onOeffnen(null, "partner") },
            { n: g.wartendeTippgeber || 0, text: "Tippgeber freigeben", farbe: C.gas, klick: () => onOeffnen(null, "vertraege-gf") },
            { n: eigenKlaer.length, text: "Eigene Kunden: Unterlagen nachreichen", farbe: C.warn, klick: () => onListe("Eigene Klärfälle", eigenKlaer) },
            { n: eigenAngebot.length, text: "Eigene Kunden: Angebot an den Kunden schicken oder Zusage erfassen", farbe: C.ok, klick: () => onListe("Eigene Angebote", eigenAngebot) },
          ]} />
        );
      })()}

      {vertrieb && (
        <Karte titel="Zu tun für dich"
          rechts={<span className="text-xs" style={{ color: C.muted }}>{zuTun.length + termineBald.length ? (zuTun.length + termineBald.length) + " offen" : "alles erledigt"}</span>}>
          {termineBald.map((t, i) => (
            <button key={t.id} onClick={() => onOeffnen(null, "kalender")}
              className="w-full text-left flex items-center gap-3 px-4 py-3 text-sm"
              style={{ borderTop: i ? "1px solid " + C.line : "none" }}>
              <Calendar size={15} color={C.gas} className="flex-shrink-0" />
              <span className="flex-1 min-w-0">
                <span className="block" style={{ color: C.gas }}>Termin {t.datum === heute() ? "heute" : "morgen"}{t.zeit ? " um " + t.zeit + " Uhr" : ""}</span>
                <span className="block text-xs truncate" style={{ color: C.muted }}>{(t.kunde && t.kunde.firma) || t.titel || "Termin"}{t.ort ? " · " + t.ort : ""}</span>
              </span>
              <ChevronRight size={16} color={C.muted} />
            </button>
          ))}
          {zuTun.length === 0 && termineBald.length === 0 && (
            <div className="px-4 py-4 text-sm" style={{ color: C.muted }}>
              Gerade ist nichts von dir gefragt. Sobald ein Angebot kommt oder Unterlagen fehlen, steht es hier.
            </div>
          )}
          {zuTun.map(({ a, farbe, text }, i) => (
            <button key={a.id} onClick={() => onOeffnen(a.id)}
              className="w-full text-left flex items-center gap-3 px-4 py-3 text-sm"
              style={{ borderTop: i || termineBald.length ? "1px solid " + C.line : "none" }}>
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: farbe }} />
              <span className="flex-1 min-w-0">
                <span className="block" style={{ color: farbe === C.muted ? C.text : farbe }}>{text}</span>
                <span className="block text-xs truncate" style={{ color: C.muted }}>{a.kunde.firma || "ohne Namen"} · {a.id}</span>
              </span>
              <ChevronRight size={16} color={C.muted} />
            </button>
          ))}
        </Karte>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        {istTL ? <Umschalter bereich={bereich} setBereich={setBereich} /> : <span />}
        <button className="text-xs px-2 py-1 rounded" style={{ border: "1px solid " + C.line, color: C.muted }}
          onClick={() => setAnpassen(!anpassen)}>
          {anpassen ? "Anpassen beenden" : "Übersicht anpassen"}
        </button>
      </div>

      {anpassen && (
        <div className="rounded p-4" style={{ background: C.card, border: "1px solid " + C.strom }}>
          <div className="text-sm mb-3">Was möchtest du sehen?</div>
          <div className="grid sm:grid-cols-2 gap-2 mb-4">
            {[...KACHELN, ...ZAHLEN, { id: "ziele", k: "Zielerreichung" },
              { id: "aufgaben", k: "Aufgaben" },
              { id: "termine", k: "Termine" }, { id: "listen", k: "Listen und Ranglisten" }].map((x) => (
              <label key={x.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={zeigt(x.id)} onChange={() => umschalten(x.id)}
                  style={{ accentColor: C.ink }} />
                {x.k}
              </label>
            ))}
          </div>
          <div className="flex gap-1">
            {[["liste", "Als Liste"], ["ring", "Als Ringdiagramm"]].map(([id, label]) => (
              <button key={id} onClick={() => stilSetzen(id)} className="px-3 py-1.5 text-sm rounded"
                style={{ background: stil === id ? C.ink : "transparent",
                         color: stil === id ? "#fff" : C.muted,
                         border: "1px solid " + (stil === id ? C.ink : C.line) }}>{label}</button>
            ))}
          </div>
        </div>
      )}

      {stil === "ring" ? (
        <div className="rounded p-5 flex flex-wrap gap-6 justify-around"
             style={{ background: C.card, border: "1px solid " + C.line }}>
          {KACHELN.filter((x) => zeigt(x.id) && x.v > 0).map((x) => {
            const gesamt = KACHELN.reduce((t, y) => t + y.v, 0) || 1;
            return (
              <button key={x.id} onClick={() => onListe(x.k, menge_.filter(x.f))}>
                <Ring anteil={x.v / gesamt} gross={96} farbe={x.farbe || C.inkSoft}
                  beschriftung={x.k} wert={x.v + " Vorgänge"} />
              </button>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {KACHELN.filter((x) => zeigt(x.id) && x.v > 0).map((x) => (
            <Kachel key={x.id} k={x.k} v={x.v} farbe={x.farbe}
              klick={() => onListe(x.k, menge_.filter(x.f))} />
          ))}
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {ZAHLEN.filter((x) => zeigt(x.id)).map((x) => (
          <Kachel key={x.id} k={x.k} v={x.v} farbe={x.farbe}
            klick={x.ziel ? () => onOeffnen(null, x.ziel)
                   : x.liste ? () => onListe(x.titel, x.liste) : null} />
        ))}
      </div>

      {vertrieb && zeigt("ziele") && (() => {
        const stufen = bonusStand(user, anfragen, mitarbeiter, bonusziele);
        return (
          <Karte titel="Bonusstufen"
            rechts={<span className="text-xs" style={{ color: C.muted }}>
              {stufen.filter((b) => b.erreicht).length} von {stufen.length} erreicht
            </span>}>
            <div className="p-4 grid sm:grid-cols-3 gap-4">
              {stufen.map((b) => (
                <div key={b.id}>
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="text-sm">{b.label}</span>
                    <span className="text-sm"
                          style={{ color: b.erreicht ? C.ok : C.muted, fontVariantNumeric: "tabular-nums" }}>
                      {eur(b.betrag)}
                    </span>
                  </div>
                  <Balken anteil={b.anteil} farbe={b.erreicht ? C.ok : C.strom} />
                  <div className="text-xs mt-1" style={{ color: b.erreicht ? C.ok : C.muted }}>
                    {b.erreicht ? "erreicht"
                      : b.ziel > 0 ? "noch " + num(b.ziel - b.ist) + " kWh" : "kein Ziel"}
                  </div>
                </div>
              ))}
            </div>
          </Karte>
        );
      })()}

      {vertrieb && zeigt("ziele") && (stand.monat.ziel > 0 || stand.quartal.ziel > 0) && (
        <Karte titel="Zielerreichung"
          rechts={<button className="text-xs" style={{ color: C.strom }}
                    onClick={() => onOeffnen(null, "ziele")}>Ziele ändern</button>}>
          <div className="p-4 grid sm:grid-cols-2 gap-6">
            {[["Monat", stand.monat], ["Quartal", stand.quartal]].map(([titel, w]) => (
              <div key={titel} className="flex items-center gap-4">
                <Ring anteil={w.anteil} gross={90} farbe={w.anteil >= 1 ? C.ok : C.strom} />
                <div className="flex-1">
                  <div className="text-sm mb-1">{titel}</div>
                  <div className="text-xs mb-2" style={{ color: C.muted, fontVariantNumeric: "tabular-nums" }}>
                    {num(w.ist)} von {num(w.ziel)} kWh
                  </div>
                  <Balken anteil={w.anteil} farbe={w.anteil >= 1 ? C.ok : C.strom} />
                  <div className="text-xs mt-1" style={{ color: C.muted }}>
                    {w.ziel > w.ist ? "noch " + num(w.ziel - w.ist) + " kWh" : "Ziel erreicht"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Karte>
      )}

      {zeigt("aufgaben") && (
        <Aufgaben aufgaben={aufgaben} setAufgaben={setAufgaben} user={user}
          mitarbeiter={mitarbeiter} kompakt onOeffnen={onOeffnen} />
      )}

      {zeigt("termine") && (
        <Karte titel="Termine"
          rechts={<button className="text-xs" style={{ color: C.strom }}
                    onClick={() => onOeffnen(null, "kalender")}>Kalender öffnen</button>}>
          {heutigeTermine.length + wocheTermine.length + leadTermine.length === 0 ? (
            <div className="px-4 py-4 text-sm" style={{ color: C.muted }}>Diese Woche steht nichts an.</div>
          ) : (
            <>
              {heutigeTermine.map((t, i) => (
                <Reihe key={t.id} i={i} links={t.titel} unten={"heute · " + t.zeit + " Uhr · " + (t.ort || "")}
                  rechts="heute" klick={() => onOeffnen(null, "kalender")} />
              ))}
              {[...wocheTermine, ...leadTermine.map((l) => ({
                id: "l" + l.id, titel: "Termin " + l.firma, datum: l.terminDatum,
                zeit: l.terminZeit, ort: l.terminArt }))]
                .sort((a, b) => (a.datum + a.zeit).localeCompare(b.datum + b.zeit))
                .map((t, i) => (
                <Reihe key={t.id} i={i + heutigeTermine.length} links={t.titel}
                  unten={(t.zeit ? t.zeit + " Uhr · " : "") + (t.ort || "")}
                  rechts={datum(t.datum)} klick={() => onOeffnen(null, "kalender")} />
              ))}
            </>
          )}
        </Karte>
      )}

      {zeigt("listen") && struktur && (() => {
        const kandidaten = mitarbeiter.filter((u) =>
          ids ? ids.includes(u.id) : ["Vertriebspartner", "Teamleiter"].includes(u.rolle));
        const personen = kandidaten.map((u) => {
          const abg = anfragen.filter((a) =>
            istBeteiligt(a, u.id) && a.status === "abgeschlossen" && a.kalkulation);
          const menge = abg.reduce((t, a) => t + verbrauchGesamt(a), 0);
          return {
            id: u.id, person: u, name: u.name,
            wert: vollsicht ? abg.reduce((t, a) => t + gesamtprovision(a), 0) : menge,
            menge, abschluesse: abg.length, team: u.team,
          };
        }).map((x) => ({ ...x, unten: x.abschluesse + " Abschlüsse" }))
          .sort((a, b) => b.wert - a.wert);

        const teams = {};
        personen.forEach((x) => {
          const t = x.team || "-";
          if (!teams[t]) teams[t] = { id: t, name: "Team " + t, wert: 0, menge: 0, abschluesse: 0, koepfe: 0 };
          teams[t].wert += x.wert; teams[t].menge += x.menge;
          teams[t].abschluesse += x.abschluesse; teams[t].koepfe += 1;
        });
        const teamZeilen = Object.values(teams)
          .map((t) => ({ ...t, unten: t.koepfe + " Mitarbeiter · " + t.abschluesse + " Abschlüsse" }))
          .sort((a, b) => b.wert - a.wert);

        return (
          <div className="space-y-5">
            {teamZeilen.length > 1 && (
              <Rangliste titel="Ranking Vertriebsteams" zeilen={teamZeilen} geld={vollsicht}
                hinweis={vollsicht ? "Gesamtprovision je Lieferjahr" : "vermittelte Menge je Jahr"} />
            )}
            <Rangliste titel={istTL ? "Ranking meiner Vertriebspartner" : "Ranking Vertriebsmitarbeiter"}
              zeilen={personen} geld={vollsicht}
              hinweis={vollsicht ? "Gesamtprovision je Lieferjahr" : "vermittelte Menge je Jahr"} />
          </div>
        );
      })()}

      {zeigt("listen") && (vollsicht || user.rolle === "Kalkulation" || user.rolle === "Leitung Vertrieb") && (() => {
        const fertige = menge_.filter((a) => ["bestaetigt", "abgeschlossen"].includes(a.status));
        const mittel = (feld) => {
          const w = fertige.map((a) => phasenDauer(a)[feld]).filter((x) => x != null);
          return w.length ? w.reduce((x, y) => x + y, 0) / w.length : null;
        };
        const langlieger = menge_
          .filter((a) => !["abgeschlossen", "abgelehnt"].includes(a.status) && liegezeit(a) > 7)
          .sort((x, y) => liegezeit(y) - liegezeit(x))
          .slice(0, 6);
        return (
          <Karte titel="Liegezeiten"
            rechts={<span className="text-xs" style={{ color: C.muted }}>
              Durchschnitt in Tagen, {fertige.length} abgeschlossene Vorgänge
            </span>}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4">
              {[["Bei der Kalkulation", mittel("kalkulation")],
                ["Beim Kunden", mittel("kunde")],
                ["Beim Versorger", mittel("versorger")],
                ["Gesamt bis Abschluss", mittel("gesamt")]].map(([k, w]) => (
                <div key={k}>
                  <div className="text-xs mb-1" style={{ color: C.muted }}>{k}</div>
                  <div className="text-xl" style={{ fontVariantNumeric: "tabular-nums" }}>
                    {w == null ? "–" : num(w, 1)}
                  </div>
                </div>
              ))}
            </div>
            {langlieger.length > 0 && (
              <>
                <div className="px-4 py-2 text-xs" style={{ color: C.muted, borderTop: "1px solid " + C.line }}>
                  Vorgänge, die am längsten unbewegt sind
                </div>
                {langlieger.map((a, i) => (
                  <Reihe key={a.id} i={i + 1} links={a.kunde.firma}
                    unten={a.id + " · " + statusVon(a).label + " · " + a.partnerName}
                    rechts={num(liegezeit(a)) + " Tage"} klick={() => onOeffnen(a.id)} />
                ))}
              </>
            )}
          </Karte>
        );
      })()}

      {zeigt("listen") && user.rolle === "Kalkulation" && (
        <Karte titel="Wartet auf Kalkulation">
          {wartend.length === 0 && <div className="px-4 py-4 text-sm" style={{ color: C.muted }}>Nichts offen.</div>}
          {wartend.map((a, i) => (
            <Reihe key={a.id} i={i} links={a.kunde.firma}
              unten={a.id + " · " + a.partnerName + " · " + statusVon(a).label}
              rechts={"seit " + datum(a.angelegt)} klick={() => onOeffnen(a.id)} />
          ))}
        </Karte>
      )}

      {zeigt("listen") && user.rolle === "Vertragsmanagement" && (
        <Karte titel="Verträge nach Status">
          {["Provision offen", "Vertrag zu erstellen", "Vertrag versendet", "Vertrag unterschrieben",
            "Beim Versorger eingereicht", "Lieferung aktiv"].map((st, i) => (
            <Reihe key={st} i={i} links={st}
              rechts={anfragen.filter((a) => ["bestaetigt", "abgeschlossen"].includes(a.status) &&
                (a.vertragsStatus || "Vertrag zu erstellen") === st).length} />
          ))}
        </Karte>
      )}

      {zeigt("listen") && !struktur && geld && (
        <Karte titel="Was gerade offen ist">
          {meineOffen.length === 0 && (
            <div className="px-4 py-4 text-sm" style={{ color: C.muted }}>Nichts offen.</div>
          )}
          {meineOffen.map((a, i) => (
            <Reihe key={a.id} i={i} links={a.kunde.firma}
              unten={a.id + " · " + statusVon(a).label}
              rechts={a.status === "angebot" ? eur(anteilVon(a, user.id, mitarbeiter)) : ""}
              klick={() => onOeffnen(a.id)} />
          ))}
        </Karte>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  App                                                                */
/* ------------------------------------------------------------------ */
/* Notfall: Anmeldung, Zwischenspeicher und Hintergrunddienst entfernen. Ersetzt das Löschen der Browserdaten. */
async function portalZuruecksetzen() {
  try { await sb.auth.signOut({ scope: "local" }); } catch (e) { /* weiter */ }
  try { Object.keys(localStorage).filter((k) => /^sb-|supabase/.test(k)).forEach((k) => localStorage.removeItem(k)); } catch (e) { /* weiter */ }
  try { if (window.caches) for (const k of await caches.keys()) await caches.delete(k); } catch (e) { /* weiter */ }
  try { if (navigator.serviceWorker) for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister(); } catch (e) { /* weiter */ }
  window.location.replace(window.location.pathname);
}

/* Fängt Abstürze der Oberfläche ab: statt einer weißen Seite eine Meldung mit Ausweg */
class Fehlerschutz extends React.Component {
  constructor(props) { super(props); this.state = { fehler: null }; }
  static getDerivedStateFromError(fehler) { return { fehler }; }
  componentDidCatch(fehler, info) { this.setState({ stapel: (info && info.componentStack) || "" }); }
  render() {
    if (!this.state.fehler) return this.props.children;
    const text = String((this.state.fehler && this.state.fehler.message) || this.state.fehler);
    const stelle = String(this.state.stapel || "").split("\n").map((z) => z.trim()).filter(Boolean).slice(0, 3).join(" ‹ ");
    const knopf = { padding: "12px 16px", borderRadius: 6, fontSize: 15, width: "100%", border: "none", cursor: "pointer" };
    return (
      <div style={{ minHeight: "100vh", background: "#0A1626", color: "#C4D0DE", fontFamily: "Inter, Arial, sans-serif",
                    display: "flex", alignItems: "center", justifyContent: "center", padding: "max(24px, env(safe-area-inset-top)) 20px 24px" }}>
        <div style={{ maxWidth: 420, width: "100%" }}>
          <img src={LOGO} alt="EGC Energie" style={{ width: 150, display: "block", margin: "0 auto 28px" }} />
          <div style={{ background: "#fff", color: "#16212C", borderRadius: 8, padding: 22 }}>
            <div style={{ fontSize: 18, marginBottom: 6 }}>Da ist etwas schiefgelaufen</div>
            <div style={{ fontSize: 14, color: "#6B7787", marginBottom: 18 }}>
              Deine Daten sind sicher gespeichert. Versuche zuerst „Neu laden“. Hilft das nicht, setzt „Zurücksetzen“ die Anmeldung
              auf diesem Gerät zurück, danach meldest du dich einfach neu an.
            </div>
            <button style={{ ...knopf, background: "#0A1626", color: "#fff", marginBottom: 8 }} onClick={() => window.location.reload()}>Neu laden</button>
            <button style={{ ...knopf, background: "#F4F7FA", color: "#16212C", border: "1px solid #D8DDE4" }} onClick={portalZuruecksetzen}>Zurücksetzen und neu anmelden</button>
            <div style={{ fontSize: 11, color: "#6B7787", marginTop: 18, wordBreak: "break-word" }}>
              Bitte mach ein Bildschirmfoto davon für die Geschäftsführung:<br />
              <span style={{ color: "#B4543A" }}>{text}</span>{stelle ? <><br />{stelle}</> : null}<br />{VERSION_ANZEIGE}
            </div>
          </div>
        </div>
      </div>
    );
  }
}

const KundenAngebot = teilKomponente("kunde", "KundenAngebot");   /* in kunde.jsx */
/* Beispieldaten für den Bautest */
export const PRUEFDATEN = () => ({ anfragen: seed(), mitarbeiter: USERS, leads: seedLeads() });

export default function App() {
  /* persönlicher Link eines Kunden: eigene Seite ohne Anmeldung */
  const kundenlink = (() => { try { return new URLSearchParams(window.location.search).get("angebot") || ""; } catch (e) { return ""; } })();
  if (/^[0-9a-f]{48}$/.test(kundenlink)) return <Fehlerschutz><KundenAngebot link={kundenlink} /></Fehlerschutz>;
  return <Fehlerschutz><PortalApp /><NeueFassung /></Fehlerschutz>;
}

/* Hinweis bei neuer Fassung: Ein offener Tab behält sonst die alte Fassung, bis jemand neu lädt.
   Prüft beim Zurückkehren zum Tab und alle 10 Minuten, ob die Startseite auf eine andere Programmdatei zeigt. */
function NeueFassung() {
  const [neu, setNeu] = useState(false);
  useEffect(() => {
    const eigene = (() => { const t = document.querySelector('script[src*="/assets/app."]'); return t ? new URL(t.src, location.href).pathname : ""; })();
    if (!/\/assets\/app\.[0-9a-f]+\.js$/.test(eigene)) return;   /* nur in der ausgelieferten Fassung */
    let aus = false;
    const pruefen = () => {
      if (document.visibilityState === "hidden") return;
      fetch("/?fassung=" + Date.now(), { cache: "no-store" }).then((r) => r.ok ? r.text() : "").then((html) => {
        const m = html && html.match(/\/assets\/app\.[0-9a-f]+\.js/);
        if (!aus && m && m[0] !== eigene) setNeu(true);
      }).catch(() => {});
    };
    const t = setInterval(pruefen, 600000);
    document.addEventListener("visibilitychange", pruefen);
    return () => { aus = true; clearInterval(t); document.removeEventListener("visibilitychange", pruefen); };
  }, []);
  if (!neu) return null;
  return (
    <div style={{ position: "fixed", left: 12, right: 12, bottom: 12, zIndex: 60, display: "flex", justifyContent: "center" }}>
      <button onClick={() => location.reload()} className="inline-flex items-center gap-2 px-4 py-3 rounded-lg text-sm shadow-lg"
        style={{ background: C.ink, color: "#fff", border: "2px solid #6CB43B" }}>
        <RotateCcw size={16} /> Neue Fassung des Portals verfügbar – jetzt neu laden
      </button>
    </div>
  );
}

/* `pruefung` nur für den Bautest (pruefung.mjs): rendert eine Ansicht mit Beispieldaten,
   ohne Anmeldung und ohne Datenbank. Im Browser wird PortalApp immer ohne Eigenschaften aufgerufen. */
export function PortalApp({ pruefung } = {}) {
  /* Alle Daten kommen aus der Datenbank; vor der Anmeldung ist alles leer */
  const [anfragen, setAnfragen] = useState(pruefung ? pruefung.anfragen : []);
  const [mitarbeiter, setMitarbeiter] = useState(pruefung ? pruefung.mitarbeiter : []);
  const [leads, setLeads] = useState(pruefung ? pruefung.leads : []);
  const [ablage, setAblage] = useState([]);
  const [versorger, setVersorger] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [smartmeter, setSmartmeter] = useState([]);
  const [probleme, setProbleme] = useState([]);
  const [termine, setTermine] = useState([]);
  const [akquise, setAkquise] = useState(pruefung ? pruefung.akquise || [] : []);
  const [aufgaben, setAufgaben] = useState([]);
  const [protokoll, setProtokoll] = useState([]);
  const [bonusSatz, setBonusSatz] = useState("10");
  const [tippgeber, setTippgeber] = useState([]);
  const [strukturanfragen, setStrukturanfragen] = useState([]);
  const [beschaffung, setBeschaffung] = useState([]);
  const [beschaffungStart, setBeschaffungStart] = useState(null);
  const [firmendaten, setFirmendaten] = useState(firmendatenMit());
  const [bonusziele, setBonusziele] = useState(BONUSZIELE_START);
  const [firmenanteil, setFirmenanteil] = useState("");
  const [listenAnsicht, setListenAnsicht] = useState(null);
  const [userId, setUserId] = useState(pruefung ? pruefung.userId : null);
  const [registriert, setRegistriert] = useState(null);
  const [ansicht, setAnsicht] = useState(pruefung ? pruefung.ansicht : "anfragen");
  const [offen, setOffen] = useState(null);
  const [tab, setTab] = useState("offen");
  /* vom Nutzer bewusst gewählter Reiter: sonst öffnet „Meine Anfragen“ den ersten Reiter mit Einträgen */
  const [tabGewaehlt, setTabGewaehlt] = useState(null);
  const [entwurf, setEntwurf] = useState(null);
  const [geladen, setGeladen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [pwDialog, setPwDialog] = useState(false);
  const [pdfAnsicht, setPdfAnsicht] = useState(null);
  /* PDF-Betrachter mit eigenem Eintrag im Verlauf: Zurück schließt ihn */
  PDF_ZEIGEN = (d) => {
    setPdfAnsicht(d);
    try {
      const st = window.history.state || {};
      window.history.pushState({ ...st, egc: true, pdf: true, n: (st.n || 0) + 1 }, "",
        window.location.hash.replace(/\/pdf$/, "") + "/pdf");
    } catch (e) { /* ohne Verlauf trotzdem anzeigen */ }
  };
  const pdfSchliessen = () => {
    if (window.history.state && window.history.state.pdf) window.history.back(); else setPdfAnsicht(null);
  };
  const verlaufUeberspringen = React.useRef(false);

  /* Die Geschäftsführung kann in der Rolle eines anderen Teams arbeiten, ohne sich neu anzumelden.
     Angezeigt werden Menü, Startseite und Knöpfe dieser Rolle; Verlauf und Nachrichten tragen den echten Namen
     mit dem Zusatz „(als …)“. Die Datenbank prüft weiter die echte Rolle. Gespeichert wird nur auf diesem Gerät. */
  const [arbeitenAls, setArbeitenAlsRoh] = useState(() => {
    if (pruefung) return pruefung.arbeitenAls || "";
    try { return localStorage.getItem("egc-arbeiten-als") || ""; } catch (e) { return ""; }
  });
  const angemeldet = mitarbeiter.find((u) => u.id === userId) || null;
  const darfWechseln = !!angemeldet && angemeldet.rolle === "Geschäftsführung";
  const alsRolle = darfWechseln && ARBEITEN_ALS.includes(arbeitenAls) ? arbeitenAls : "";
  const user = alsRolle
    ? { ...angemeldet, rolle: alsRolle, name: angemeldet.name + " (als " + alsRolle + ")", echteRolle: angemeldet.rolle }
    : angemeldet;

  /* ---------- Anbindung an die Datenbank ---------- */
  const [sitzung, setSitzung] = useState(pruefung ? "aktiv" : "pruefen"); /* pruefen · keine · aktiv */
  const [meldung, setMeldung] = useState("");
  const [einladungStart] = useState(() => {
    try { return new URLSearchParams(window.location.search).get("code") || ""; } catch (e) { return ""; }
  });

  const SETZER = {
    anfragen: setAnfragen, mitarbeiter: setMitarbeiter, leads: setLeads, ablage: setAblage,
    versorger: setVersorger, tickets: setTickets, smartmeter: setSmartmeter, probleme: setProbleme,
    termine: setTermine, akquise: setAkquise, aufgaben: setAufgaben, protokoll: setProtokoll,
    tippgeber: setTippgeber, strukturanfragen: setStrukturanfragen, beschaffung: setBeschaffung,
  };
  /* Unvollständige Datensätze (z. B. aus Tests) dürfen nie die Oberfläche lahmlegen: Listenfelder ergänzen */
  const mitListen = (felder) => (liste) => (liste || []).map((x) => {
    const y = { ...x };
    felder.forEach((f) => { if (!Array.isArray(y[f])) y[f] = []; });
    return y;
  });
  const UMFORMEN = { anfragen: migriereAnfragen, mitarbeiter: migriereMitarbeiter, leads: migriereLeads,
    tickets: (l) => mitListen(["beitraege"])(l).map((t) => ({ ...t,
      status: TICKET_STATUS[t.status] ? t.status : Object.keys(TICKET_STATUS)[0],
      nummer: t.nummer || t.id, betreff: t.betreff || "ohne Betreff", datum: t.datum || "", von: t.von || "unbekannt" })),
    probleme: mitListen(["beitraege", "betroffene"]) };
  const NAMEN = Object.keys(SETZER);

  const datenRef = React.useRef({});
  datenRef.current = { anfragen, mitarbeiter, leads, ablage, versorger, tickets, smartmeter, probleme,
                       termine, akquise, aufgaben, protokoll, tippgeber, strukturanfragen, beschaffung };
  const zuletzt = React.useRef({});   /* zuletzt abgeglichener Stand je Sammlung */
  const zuSpeichern = React.useRef(new Set()); /* noch zu speichern */
  const nachladen = React.useRef(new Set());   /* Änderungen anderer, nach dem Speichern holen */
  const kette = React.useRef(Promise.resolve());
  const speichertGerade = React.useRef(false);

  const einstellungenSetzen = (e) => {
    if (e.bonus != null) { setBonusSatz(String(e.bonus)); setzeBonus(e.bonus); }
    if (e.bonusziele) setBonusziele({ ...BONUSZIELE_START, ...e.bonusziele });
    if (e.firmenanteil != null) setFirmenanteil(String(e.firmenanteil));
    if (e.firmendaten) setFirmendaten(firmendatenMit(e.firmendaten));
    if (e.umlagen) setzeUmlagen(e.umlagen);
    if (e.smartmeter) setzeSmartmeter(e.smartmeter);
  };

  const sammlungLaden = async (n) => {
    const liste = await laden(n, UMFORMEN[n]);
    zuletzt.current[n] = liste;
    SETZER[n](liste);
  };

  /* nach der Anmeldung: wer bin ich, dann alles laden, was meine Rolle sehen darf */
  const allesLaden = async () => {
    const id = await meineId();
    if (!id) throw new Error("Zu dieser Anmeldung gibt es keinen Mitarbeiter-Zugang.");
    const ergebnisse = await Promise.allSettled(NAMEN.map(sammlungLaden));
    const fehler = ergebnisse.filter((x) => x.status === "rejected");
    try { einstellungenSetzen(await einstellungenLaden()); } catch (e) { /* Vorgaben bleiben */ }
    setMeldung(fehler.length ? "Nicht alle Daten konnten geladen werden: " + fehler[0].reason.message : "");
    setUserId(id);
    setGeladen(true);
    setSitzung("aktiv");
  };

  const allesLeeren = () => {
    setGeladen(false);
    setUserId(null);
    setMenu(false); setOffen(null); setEntwurf(null); setListenAnsicht(null); setMeldung("");
    NAMEN.forEach((n) => { zuletzt.current[n] = []; SETZER[n]([]); });
  };

  /* beim Start: noch angemeldet? */
  /* Neue Ansicht oder neuer Vorgang: oben beginnen */
  useEffect(() => {
    try { window.scrollTo(0, 0); } catch (e) { /* ohne Fenster (Bautest) */ }
  }, [ansicht, offen, listenAnsicht]);
  /* Geöffnetes Menü auf dem Handy: die Seite dahinter festhalten */
  useEffect(() => {
    if (typeof document === "undefined" || !document.body || !document.body.style) return;
    const handy = typeof window.matchMedia === "function" ? !window.matchMedia("(min-width: 1024px)").matches : true;
    if (!menu || !handy) return;
    const vorher = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = vorher; };
  }, [menu]);
  useEffect(() => {
    (async () => {
      try {
        const { data } = await sb.auth.getSession();
        if (data.session && !einladungStart) { await allesLaden(); return; }
      } catch (e) {
        setMeldung("Keine Verbindung zum Server: " + ((e && e.message) || e));
      }
      setSitzung("keine");
    })();
    const { data } = sb.auth.onAuthStateChange((ereignis) => {
      if (ereignis === "SIGNED_OUT") { allesLeeren(); setSitzung("keine"); }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const speichernJetzt = () => {
    kette.current = kette.current.then(async () => {
      const namen = [...zuSpeichern.current];
      zuSpeichern.current.clear();
      if (!namen.length) return;
      speichertGerade.current = true;
      const fehler = [];
      for (const n of namen) {
        const f = await abgleichen(n, datenRef.current[n]);
        if (f.length) fehler.push({ n, f });
      }
      speichertGerade.current = false;
      if (fehler.length) {
        const erster = fehler[0].f[0].meldung;
        setMeldung(/fetch|network/i.test(erster)
          ? "Keine Verbindung: Änderungen sind noch nicht gespeichert. Sie werden gespeichert, sobald das Netz wieder da ist."
          : "Nicht gespeichert: " + erster);
        /* bei Ablehnung durch den Server den echten Stand zurückholen */
        if (!/fetch|network/i.test(erster)) fehler.forEach((x) => nachladen.current.add(x.n));
      } else setMeldung("");
      const nach = [...nachladen.current];
      nachladen.current.clear();
      for (const n of nach) await sammlungLaden(n).catch(() => {});
    }).catch(() => { speichertGerade.current = false; });
  };

  /* Nach dem Start im Hintergrund vorladen, was diese Rolle oft braucht: dann öffnet sich alles ohne Wartezeit */
  useEffect(() => {
    if (!geladen || !userId || pruefung) return;
    const rolle = (mitarbeiter.find((m) => m.id === userId) || {}).rolle || "";
    const vorab = ["vorgang", "vertrieb"].concat(
      rolle === "Beschaffung" ? ["beschaffung"] : ["Vertriebspartner", "Teamleiter", "Leitung Vertrieb"].includes(rolle) ? [] : ["innendienst", "pdf"]);
    const t = setTimeout(() => vorab.forEach((n) => teilLaden(n).catch(() => {})), 1200);
    return () => clearTimeout(t);
  }, [geladen, userId]);

  /* Änderungen bemerken und kurz gesammelt speichern */
  useEffect(() => {
    if (!geladen || !userId) return;
    NAMEN.forEach((n) => {
      if (zuletzt.current[n] !== datenRef.current[n]) {
        zuSpeichern.current.add(n);
        zuletzt.current[n] = datenRef.current[n];
      }
    });
    if (!zuSpeichern.current.size) return;
    const t = setTimeout(speichernJetzt, 500);
    return () => clearTimeout(t);
  }, [anfragen, mitarbeiter, leads, ablage, versorger, tickets, smartmeter, probleme, termine,
      akquise, aufgaben, protokoll, tippgeber, strukturanfragen, beschaffung, geladen, userId]);

  /* Einstellungen schreibt nur die Geschäftsführung */
  useEffect(() => {
    if (!geladen || !userId) return;
    const ich = mitarbeiter.find((m) => m.id === userId);
    if (!ich || ich.rolle !== "Geschäftsführung") return;
    const t = setTimeout(async () => {
      const f = (await einstellungSpeichern("bonus", String(bonusSatz)))
        || (await einstellungSpeichern("bonusziele", bonusziele))
        || (firmenanteil !== "" && (await einstellungSpeichern("firmenanteil", String(firmenanteil))))
        || (await einstellungSpeichern("firmendaten", firmendaten));
      if (f) setMeldung("Einstellung nicht gespeichert: " + f);
    }, 500);
    return () => clearTimeout(t);
  }, [bonusSatz, bonusziele, firmenanteil, firmendaten, geladen, userId]);

  useEffect(() => { setzeFirmendaten(firmendaten); }, [firmendaten]);

  /* wieder online: Liegengebliebenes speichern */
  useEffect(() => {
    const wieder = () => { NAMEN.forEach((n) => zuSpeichern.current.add(n)); speichernJetzt(); };
    window.addEventListener("online", wieder);
    return () => window.removeEventListener("online", wieder);
  }, []);

  /* Live-Abgleich: Änderungen anderer erscheinen ohne Neuladen */
  useEffect(() => {
    if (!userId) return;
    const warten = {};
    return liveAbgleich((tabelle, p) => {
      const n = sammlungVon(tabelle);
      if (!n) return;
      if (n === "einstellungen") { einstellungenLaden().then(einstellungenSetzen).catch(() => {}); return; }
      if (schonBekannt(tabelle, p)) return;
      if (n === "mitarbeiter" && p.new && p.new.id === userId && p.eventType === "UPDATE") {
        /* eigener Zugang geändert (z. B. freigeschaltet): Rechte können sich geändert haben */
        clearTimeout(warten.alles);
        warten.alles = setTimeout(() => allesLaden().catch(() => {}), 400);
        return;
      }
      if (speichertGerade.current || zuSpeichern.current.has(n)) { nachladen.current.add(n); return; }
      clearTimeout(warten[n]);
      warten[n] = setTimeout(() => sammlungLaden(n).catch(() => {}), 300);
    });
  }, [userId]);

  const abmeldenUndLeeren = async () => {
    await kette.current;
    await abmelden();
    allesLeeren();
    setSitzung("keine");
  };

  const speichern = (a) => {
    /* Vorgang aus der Vertriebssicht: echten Status zurückholen, nie die Anzeige speichern */
    if (a && a._echterStatus !== undefined) {
      const { _echterStatus, ...rest } = a;
      a = { ...rest, status: rest.status === "einreichung" ? _echterStatus : rest.status };
    }
    setAnfragen((prev) => (prev.some((x) => x.id === a.id)
      ? prev.map((x) => (x.id === a.id ? a : x)) : [a, ...prev]));
  };

  const einreichen = (a) => {
    speichern({
      ...a, status: "eingereicht", fehlend: [], fehlendText: "",
      verlauf: [...a.verlauf, {
        d: heute(),
        t: a.verlauf.length ? "Unterlagen ergänzt und erneut eingereicht" : "Anfrage eingereicht",
        w: user.name,
      }],
    });
    setAnsicht("anfragen"); setTab("offen"); setTabGewaehlt("offen"); setEntwurf(null);
  };

  const neueLeads = user ? leads.filter((l) => l.zugewiesen === user.id && !l.gelesen).length : 0;
  const offeneStrukturanfragen = user && user.rolle === "Geschäftsführung"
    ? strukturanfragen.filter((x) => x.status === "offen").length : 0;
  const wartendeTippgeber = user && user.rolle === "Geschäftsführung"
    ? tippgeber.filter((t) => t.status !== "freigegeben" && t.status !== "abgelehnt").length : 0;
  const offeneTickets = user
    ? tickets.filter((t) => t.empfaenger === user.rolle && t.status !== "abgeschlossen").length : 0;
  const neueAuftraege = anfragen.filter((a) => a.status === "uebermittelt").length;
  /* Beschaffung: neue Bewertungsaufträge (für die Beschaffung nur die eigenen und die ohne Zuständigen) */
  const neueBeschaffung = !user ? 0 : beschaffung.filter((b) => b.status === "offen"
    && (user.rolle !== "Beschaffung" || !b.zustaendigId || b.zustaendigId === user.id)).length;
  const provisionOffen = anfragen.filter((a) => a.status === "bestaetigt").length;
  /* Smartmeter: die Kalkulation sieht eingereichte, der Vertrieb die eigenen Klärfälle */
  const offeneSmartmeter = !user ? 0
    : ["Kalkulation", "Geschäftsführung"].includes(user.rolle)
      ? smartmeter.filter((v) => v.status === "eingereicht").length
      : smartmeter.filter((v) =>
          v.status === "klaerfall" &&
          (v.partnerId === user.id ||
           (user.rolle === "Teamleiter" &&
            strukturUnter(user.id, mitarbeiter).some((m) => m.id === v.partnerId)))).length;
  const offeneAufgaben = user
    ? aufgaben.filter((t) => t.fuerId === user.id && !t.erledigt && t.faellig <= heute()).length : 0;
  const offeneProbleme = user
    ? probleme.filter((p) => p.status !== "erledigt" &&
        (["Vertragsmanagement", "Geschäftsführung"].includes(user.rolle) ||
         p.betroffene.some((b) => b.id === user.id ||
           strukturUnter(user.id, mitarbeiter).some((m) => m.id === b.id)))).length : 0;

  /* Änderungen aufzeichnen */
  const notieren = (art, text) =>
    setProtokoll((alt) => [...alt, {
      id: "PR" + uid(), art, text, wer: user ? user.name : "System",
      rolle: user ? user.rolle : "-", datum: heute(), zeit: jetzt(),
    }]);

  /* Bestandskunden aus einer Tabelle übernehmen */
  const kundenImport = async (datei, partnerId) => {
    const zeilen = /\.xlsx?$/i.test(datei.name) ? await xlsxLesen(datei) : await csvLesen(datei);
    if (zeilen.length < 2) throw new Error("Die Datei enthält keine Daten.");
    const kopf = zeilen[0].map((h) => String(h || "").toLowerCase());
    const sp = (...begriffe) => kopf.findIndex((h) => begriffe.some((b) => h.includes(b)));
    const i = {
      firma: sp("firma", "kunde", "name"), branche: sp("branche"),
      strasse: sp("straße", "strasse"), plz: sp("plz"), ort: sp("ort"),
      ansprech: sp("ansprech"), telefon: sp("telefon"), email: sp("mail"),
      sparte: sp("sparte", "medium"), versorger: sp("versorger"), kundennr: sp("kundennummer"),
      zaehler: sp("zählernummer", "zaehlernummer"), malo: sp("marktlokation", "malo"),
      verbrauch: sp("verbrauch", "kwh"), art: sp("zählerart", "zaehlerart", "slp"),
      beginn: sp("lieferbeginn", "beginn"), ende: sp("lieferende", "ende"),
      aufschlag: sp("aufschlag"),
    };
    if (i.firma < 0) throw new Error("Keine Spalte für die Firma gefunden.");

    const partner = mitarbeiter.find((m) => m.id === partnerId);
    const hol = (z, k) => (i[k] >= 0 ? String(z[i[k]] || "").trim() : "");
    const datumLesen = (t) => {
      const m = String(t).match(/(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{2,4})/);
      if (m) return (m[3].length === 2 ? "20" + m[3] : m[3]) + "-" +
        m[2].padStart(2, "0") + "-" + m[1].padStart(2, "0");
      return /^\d{4}-\d{2}-\d{2}/.test(String(t)) ? String(t).slice(0, 10) : "";
    };

    const kunden = {};
    zeilen.slice(1).forEach((z) => {
      const firma = hol(z, "firma");
      if (!firma) return;
      if (!kunden[firma]) kunden[firma] = { zeilen: [], erste: z };
      kunden[firma].zeilen.push(z);
    });

    const neueVorgaenge = Object.entries(kunden).map(([firma, k]) => {
      const z0 = k.erste;
      const a = leereAnfrage(partner || user);
      a.id = "A-" + new Date().getFullYear() + "-" + Math.floor(1000 + Math.random() * 8999);
      a.status = "abgeschlossen";
      a.vertragsStatus = "Lieferung aktiv";
      a.importiert = true;
      a.kunde = {
        firma, branche: hol(z0, "branche"), strasse: hol(z0, "strasse"),
        plz: hol(z0, "plz"), ort: hol(z0, "ort"), ansprechpartner: hol(z0, "ansprech"),
        telefon: hol(z0, "telefon"), email: hol(z0, "email"),
      };
      a.lieferstellen = k.zeilen.map((z) => {
        const sparte = hol(z, "sparte").toLowerCase();
        const medium = sparte.includes("gas") ? "gas" : "strom";
        return {
          ...leereLieferstelle(medium),
          bezeichnung: hol(z, "ort") || firma,
          strasse: hol(z, "strasse"), plz: hol(z, "plz"), ort: hol(z, "ort"),
          versorger: hol(z, "versorger"), kundennummer: hol(z, "kundennr"),
          zaehlernummer: hol(z, "zaehler"), maloId: hol(z, "malo"),
          verbrauch: String(hol(z, "verbrauch")).replace(/\D/g, ""),
          zaehlerart: hol(z, "art").toUpperCase().includes("RLM") ? "RLM" : "SLP",
          adresseVon: "manuell",
        };
      });
      const beginn = datumLesen(hol(z0, "beginn"));
      const ende = datumLesen(hol(z0, "ende"));
      const aufschlag = parseFloat(String(hol(z0, "aufschlag")).replace(",", ".")) || 0;
      a.aufschlag = aufschlag;
      a.kalkulation = {
        bearbeiter: "Import", datum: heute(), vollmacht: null, gewaehlt: ["v1"],
        varianten: [{
          id: "v1", sparte: "beide", produkt: "Festpreis",
          laufzeitArt: ende ? "ende" : "monate", laufzeit: 24, lieferende: ende,
          aufschlag, lieferbeginn: beginn, gueltigBis: "", bemerkung: "Aus Bestandsdaten übernommen.",
          angebot: null, preise: {},
        }],
      };
      a.bestaetigung = {
        versorger: hol(z0, "versorger"), aufschlag, bonus: "", bonusArt: "keine",
        von: "Import", datum: heute(),
        stellen: a.lieferstellen.reduce((o, l) => ({
          ...o, [l.id]: { kwh: l.verbrauch, beginn, ende } }), {}),
      };
      a.verlauf = [{ d: heute(), t: "Bestandskunde importiert", w: user.name }];
      return a;
    });

    setAnfragen((alt) => [...neueVorgaenge, ...alt]);
    notieren("Import", neueVorgaenge.length + " Bestandskunden importiert für " +
      (partner ? partner.name : "unbekannt"));
    return neueVorgaenge.length + " Kunden mit " +
      neueVorgaenge.reduce((t, x) => t + x.lieferstellen.length, 0) + " Lieferstellen übernommen.";
  };

  /* Verlängerung: übernimmt Kunde und Lieferstellen aus dem Altvertrag */
  const verlaengern = (alt) => {
    const n = leereAnfrage(user);
    const v = aktiveVariante(alt);
    const ende = vertragsende(alt);
    const start = ende ? monateDazu(ende, 0) : "";
    const naechsterTag = (() => {
      if (!start) return "";
      const d = new Date(start); d.setDate(d.getDate() + 1);
      return d.toISOString().slice(0, 10);
    })();

    n.kunde = { ...alt.kunde };
    n.beteiligte = alt.beteiligte ? [...alt.beteiligte] : null;
    n.partnerId = alt.partnerId;
    n.partnerName = alt.partnerName;
    n.team = alt.team;
    n.verlaengerungVon = alt.id;
    n.produkt = v ? v.produkt : alt.produkt;
    n.produktGas = alt.produktGas;
    n.laufzeit = laufzeitVon(alt) || 24;
    n.aufschlag = alt.bestaetigung ? parseFloat(alt.bestaetigung.aufschlag) || alt.aufschlag : alt.aufschlag;
    n.wunschLieferbeginn = naechsterTag < fruehesterBeginn() ? fruehesterBeginn() : naechsterTag;
    n.lieferstellen = alt.lieferstellen.map((l) => ({
      ...l,
      id: uid(),
      abrechnung: null, lastgang: null, zaehlerfoto: null, zaehlerfotoVorhanden: false,
      gewerbeanmeldung: null, pachtvertrag: null, preis: "", energiepreis: "",
      versorger: alt.bestaetigung ? (((alt.bestaetigung.stellen || {})[l.id] || {}).versorger || alt.bestaetigung.versorger) : l.versorger,
      verbrauch: alt.bestaetigung && (alt.bestaetigung.stellen[l.id] || {}).kwh
        ? alt.bestaetigung.stellen[l.id].kwh : l.verbrauch,
    }));
    n.bemerkungVertrieb = "Verlängerung zu " + alt.id + ", bisheriges Vertragsende " +
      (ende ? datum(ende) : "unbekannt") + ".";
    setOffen(null);
    setEntwurf(n);
    setAnsicht("neu");
  };

  const ausLead = (l) => {
    const a = leereAnfrage(user);
    a.kunde = {
      firma: l.firma, strasse: l.strasse, plz: l.plz, ort: l.ort,
      ansprechpartner: l.ansprechpartner, email: l.email, telefon: l.telefon,
    };
    const stellen = [];
    if (parseFloat(l.verbrauchStrom) > 0)
      stellen.push({ ...leereLieferstelle("strom"), bezeichnung: "Hauptstandort",
        strasse: l.strasse, plz: l.plz, ort: l.ort, verbrauch: l.verbrauchStrom });
    if (parseFloat(l.verbrauchGas) > 0)
      stellen.push({ ...leereLieferstelle("gas"), bezeichnung: "Hauptstandort",
        strasse: l.strasse, plz: l.plz, ort: l.ort, verbrauch: l.verbrauchGas });
    if (stellen.length) a.lieferstellen = stellen;
    a.wunschLieferbeginn = l.laufzeitStrom || l.laufzeitGas || "";
    a.beratungHinweis = l.bemerkung || "";
    a.akquiseArt = l.quelle === "Eigenakquise" ? "eigen" : "unternehmen";
    a.herkunft = HERKUNFT.includes(l.quelle) ? l.quelle : "Sonstiges";
    a.herkunftDetail = l.quelleDetail || "";
    setEntwurf(a);
    setAnsicht("neu");
  };

  /* Termin → neuer Vorgang mit den Kundendaten des Termins */
  const ausTermin = (t) => {
    const k = t.kunde || {};
    const a = leereAnfrage(user);
    a.kunde = { ...a.kunde, firma: k.firma || "", strasse: k.strasse || "", plz: k.plz || "", ort: k.ort || "",
      ansprechpartner: k.ansprechpartner || "", email: k.email || "", telefon: k.telefon || "" };
    const notizen = [t.notiz, ...(t.verlauf || []).map((v) => v.notiz)].filter(Boolean);
    a.beratungHinweis = notizen.join("\n");
    if (t.vonId && t.vonId !== user.id) {
      a.akquiseArt = "unternehmen";
      a.herkunft = "Sonstiges";
      a.herkunftDetail = "Termin von " + (t.vonName || "Teamleiter");
    }
    setTermine((alt) => alt.map((x) => (x.id === t.id ? { ...x, vorgangId: a.id } : x)));
    setOffen(null);
    setEntwurf(a);
    setAnsicht("neu");
  };

  /* Rechengrundlagen aktuell halten */
  useEffect(() => {
    const jeVersorger = {};
    versorger.forEach((v) => {
      if (v.anteil !== undefined && v.anteil !== "") jeVersorger[v.name] = v.anteil;
    });
    setzeFirmenanteil(firmenanteil, jeVersorger);
  }, [firmenanteil, versorger]);

  const meldungen = user
    ? meldungenFuer(user, mitarbeiter, anfragen, leads, tickets, probleme, smartmeter, akquise, termine) : [];
  const gelesen = (user && user.gelesen) || [];
  const alsGelesen = (schluessel) =>
    setMitarbeiter((alt) => alt.map((m) => m.id === (user && user.id)
      ? { ...m, gelesen: [...new Set([...(m.gelesen || []), ...schluessel])] } : m));
  const springen = (m) => {
    setListenAnsicht(null);
    if (m.ziel.vorgang) { setAnsicht(m.ziel.ansicht); setOffen(m.ziel.vorgang); }
    else { setOffen(null); setAnsicht(m.ziel.ansicht); }
    setMenu(false);
  };

  SICHT_ROLLE = user ? user.rolle : null;
  /* Anzeige: der Vertrieb sieht bestätigte Aufträge erst nach der Lieferbestätigung als bestätigt */
  const anfragenSicht = user && VERTRIEB_SICHT_ROLLEN.includes(user.rolle) ? anfragen.map(vertriebsSicht) : anfragen;
  const meine = user ? anfragenSicht.filter((a) => istBeteiligt(a, user.id)) : [];
  const rolle = user ? user.rolle : "Vertriebspartner";

  /* Jede Rolle sieht nur, was sie für ihre Arbeit braucht.
     Ziele, Provisionen und Akquise gibt es nur im Vertrieb. */
  const NAV = {
    Vertriebspartner: [
      { id: "dashboard", label: "Übersicht", icon: BarChart3 },
      { id: "neu", label: "Neue Anfrage", icon: Plus },
      { id: "anfragen", label: "Meine Anfragen", icon: Inbox },
      { id: "kunden", label: "Meine Kunden", icon: FileSignature },
      { id: "pruefung", label: "Kunde prüfen", icon: Check },
      { id: "tippgeber", label: "Tippgeber", icon: Users },
      { id: "pipeline", label: "Pipeline", icon: BarChart3 },
      { id: "aufgaben", label: "Aufgaben", icon: Check, badge: offeneAufgaben },
      { id: "leads", label: "Meine Leads", icon: Users, badge: neueLeads },
      { id: "akquise", label: "Akquise-Tool", icon: Target },
      { id: "smartmeter", label: "Smartmeter", icon: Zap, badge: offeneSmartmeter },
      { id: "provisionen", label: "Meine Provisionen", icon: Wallet },
      { id: "ziele", label: "Meine Ziele", icon: Target },
      { id: "probleme", label: "Problemfälle", icon: AlertTriangle, badge: offeneProbleme },
      { id: "stornos", label: "Stornierungen", icon: X },
      { id: "kalender", label: "Kalender", icon: Calendar },
      { id: "tickets", label: "Tickets", icon: Inbox, badge: offeneTickets },
      { id: "unterlagen", label: "Unterlagen", icon: FileText },
      { id: "meine-daten", label: "Meine Stammdaten", icon: Users },
    ],
    Teamleiter: [
      { id: "dashboard", label: "Übersicht", icon: BarChart3 },
      { id: "neu", label: "Neue Anfrage", icon: Plus },
      { id: "anfragen", label: "Meine Anfragen", icon: Inbox },
      { id: "alle", label: "Team-Vorgänge", icon: Users },
      { id: "kunden", label: "Kunden im Team", icon: FileSignature },
      { id: "pruefung", label: "Kunde prüfen", icon: Check },
      { id: "tippgeber", label: "Tippgeber", icon: Users },
      { id: "struktur", label: "Strukturanfragen", icon: Plus },
      { id: "pipeline", label: "Pipeline", icon: BarChart3 },
      { id: "aufgaben", label: "Aufgaben", icon: Check, badge: offeneAufgaben },
      { id: "leads", label: "Meine Leads", icon: Users, badge: neueLeads },
      { id: "akquise", label: "Akquise-Tool", icon: Target },
      { id: "smartmeter", label: "Smartmeter", icon: Zap, badge: offeneSmartmeter },
      { id: "provisionen", label: "Meine Provisionen", icon: Wallet },
      { id: "ziele", label: "Ziele im Team", icon: Target },
      { id: "probleme", label: "Problemfälle", icon: AlertTriangle, badge: offeneProbleme },
      { id: "stornos", label: "Stornierungen", icon: X },
      { id: "kalender", label: "Kalender", icon: Calendar },
      { id: "tickets", label: "Tickets", icon: Inbox, badge: offeneTickets },
      { id: "unterlagen", label: "Unterlagen", icon: FileText },
      { id: "meine-daten", label: "Meine Stammdaten", icon: Users },
    ],
    "Leitung Vertrieb": [
      { id: "dashboard", label: "Übersicht", icon: BarChart3 },
      { id: "alle", label: "Alle Vorgänge", icon: Inbox },
      { id: "kunden", label: "Alle Kunden", icon: FileSignature },
      { id: "pipeline", label: "Pipeline", icon: BarChart3 },
      { id: "aufgaben", label: "Aufgaben", icon: Check, badge: offeneAufgaben },
      { id: "neu", label: "Neue Anfrage", icon: Plus },
      { id: "anfragen", label: "Meine Anfragen", icon: Inbox },
      { id: "leads", label: "Leads", icon: Users, badge: neueLeads },
      { id: "akquise", label: "Akquise-Tool", icon: Target },
      { id: "partner", label: "Vertriebsmitarbeiter", icon: Users },
      { id: "ziele", label: "Ziele", icon: Target },
      { id: "provisionen", label: "Meine Provisionen", icon: Wallet },
      { id: "stornos", label: "Stornierungen", icon: X },
      { id: "kalender", label: "Kalender", icon: Calendar },
      { id: "tickets", label: "Tickets", icon: Inbox, badge: offeneTickets },
      { id: "unterlagen", label: "Unterlagen", icon: FileText },
      { id: "meine-daten", label: "Meine Stammdaten", icon: FileSignature },
    ],

    /* Kalkulation rechnet und reicht beim Versorger ein. Kein Vertrieb, keine Provisionen. */
    Kalkulation: [
      { id: "dashboard", label: "Übersicht", icon: BarChart3 },
      { id: "eingang", label: "Neue Anfragen", icon: Calculator },
      { id: "versorger", label: "Versorgerbestätigung", icon: FileSignature },
      { id: "auftraege", label: "Neue Aufträge", icon: FileSignature, badge: neueAuftraege },
      { id: "smartmeter", label: "Smartmeter", icon: Zap, badge: offeneSmartmeter },
      { id: "kalkulationen", label: "Kalkulationen", icon: Calculator },
      { id: "alle", label: "Alle Vorgänge", icon: Inbox },
      { id: "aufgaben", label: "Aufgaben", icon: Check, badge: offeneAufgaben },
      { id: "versorgerliste", label: "Versorger", icon: Zap },
      { id: "kalender", label: "Kalender", icon: Calendar },
      { id: "tickets", label: "Tickets", icon: Inbox, badge: offeneTickets },
      { id: "unterlagen", label: "Unterlagen", icon: FileText },
    ],

    /* Vertragsmanagement betreut Verträge und Bestandskunden. */
    Vertragsmanagement: [
      { id: "dashboard", label: "Übersicht", icon: BarChart3 },
      { id: "vertraege", label: "Verträge", icon: FileSignature },
      { id: "kunden", label: "Bestandskunden", icon: FileSignature },
      { id: "beschaffung", label: "Beschaffung", icon: Calculator, badge: neueBeschaffung },
      { id: "smartmeter", label: "Smartmeter", icon: Zap },
      { id: "probleme", label: "Problemfälle", icon: AlertTriangle, badge: offeneProbleme },
      { id: "stornos", label: "Stornierungen", icon: X },
      { id: "alle", label: "Alle Vorgänge", icon: Inbox },
      { id: "aufgaben", label: "Aufgaben", icon: Check, badge: offeneAufgaben },
      { id: "kalender", label: "Kalender", icon: Calendar },
      { id: "tickets", label: "Tickets", icon: Inbox, badge: offeneTickets },
      { id: "unterlagen", label: "Unterlagen", icon: FileText },
    ],

    /* Leadmanagement beschafft und verteilt, verkauft aber nicht selbst. */
    Leadmanagement: [
      { id: "dashboard", label: "Übersicht", icon: BarChart3 },
      { id: "leads", label: "Leads", icon: Users, badge: neueLeads },
      { id: "akquise", label: "Akquise-Tool", icon: Target },
      { id: "pruefung", label: "Kunde prüfen", icon: Check },
      { id: "aufgaben", label: "Aufgaben", icon: Check, badge: offeneAufgaben },
      { id: "kalender", label: "Kalender", icon: Calendar },
      { id: "tickets", label: "Tickets", icon: Inbox, badge: offeneTickets },
      { id: "unterlagen", label: "Unterlagen", icon: FileText },
    ],

    /* Beschaffung (extern): bewertet Lastgänge und erstellt Beschaffungspläne. Keine Provisionen, keine Vorgänge. */
    Beschaffung: [
      { id: "beschaffung", label: "Bewertungsaufträge", icon: Calculator, badge: neueBeschaffung },
      { id: "aufgaben", label: "Aufgaben", icon: Check, badge: offeneAufgaben },
      { id: "kalender", label: "Kalender", icon: Calendar },
      { id: "tickets", label: "Tickets", icon: Inbox, badge: offeneTickets },
      { id: "unterlagen", label: "Unterlagen", icon: FileText },
    ],

    /* Finanzbuchhaltung rechnet Provisionen ab. */
    Finanzbuchhaltung: [
      { id: "dashboard", label: "Übersicht", icon: BarChart3 },
      { id: "abrechnung", label: "Provisionsabrechnung", icon: Wallet },
      { id: "provisionen", label: "Provisionen gesamt", icon: Wallet },
      { id: "stornos", label: "Stornierungen", icon: X },
      { id: "kunden", label: "Alle Kunden", icon: FileSignature },
      { id: "aufgaben", label: "Aufgaben", icon: Check, badge: offeneAufgaben },
      { id: "kalender", label: "Kalender", icon: Calendar },
      { id: "tickets", label: "Tickets", icon: Inbox, badge: offeneTickets },
      { id: "unterlagen", label: "Unterlagen", icon: FileText },
    ],

    "Geschäftsführung": [
      { id: "dashboard", label: "Übersicht", icon: BarChart3 },
      { id: "alle", label: "Alle Vorgänge", icon: Inbox },
      { id: "kunden", label: "Alle Kunden", icon: FileSignature },
      { id: "pipeline", label: "Pipeline", icon: BarChart3 },
      { id: "aufgaben", label: "Aufgaben", icon: Check, badge: offeneAufgaben },
      { id: "ausstehend", label: "Provision ausstehend", icon: Wallet, badge: provisionOffen },
      { id: "smartmeter", label: "Smartmeter", icon: Zap, badge: offeneSmartmeter },
      { id: "branchen", label: "Branchenauswertung", icon: BarChart3 },
      { id: "ruecksprachen", label: "Rücksprachen", icon: AlertTriangle },
      { id: "leads", label: "Leads", icon: Users, badge: neueLeads },
      { id: "akquise", label: "Akquise-Tool", icon: Target },
      { id: "partner", label: "Vertriebsmitarbeiter", icon: Users, badge: offeneStrukturanfragen },
      { id: "portal", label: "Portalsteuerung", icon: Settings },
      { id: "vertraege-gf", label: "Verträge", icon: FileSignature, badge: wartendeTippgeber },
      { id: "beschaffung", label: "Beschaffung", icon: Calculator },
      { id: "versorgerliste", label: "Versorger", icon: Zap },
      { id: "provisionen", label: "Provisionen gesamt", icon: Wallet },
      { id: "ziele", label: "Ziele", icon: Target },
      { id: "probleme", label: "Problemfälle", icon: AlertTriangle, badge: offeneProbleme },
      { id: "stornos", label: "Stornierungen", icon: X },
      { id: "kalender", label: "Kalender", icon: Calendar },
      { id: "tickets", label: "Tickets", icon: Inbox, badge: offeneTickets },
      { id: "protokoll", label: "Änderungsprotokoll", icon: FileText },
      { id: "export", label: "Export und Sicherung", icon: Upload },
      { id: "unterlagen", label: "Unterlagen", icon: FileText },
    ],
  }[rolle] || [{ id: "dashboard", label: "Übersicht", icon: BarChart3 }];

  /* Seitenleiste im Vertrieb: Neue Anfrage als Knopf oben, darunter Gruppen,
     jeder Punkt mit eigenem Symbol */
  const navGruppiert = ["Vertriebspartner", "Teamleiter", "Leitung Vertrieb"].includes(rolle);
  const NAV_SYMBOL = {
    dashboard: Gauge, anfragen: Inbox, alle: Briefcase, kunden: Contact, pruefung: Search,
    leads: UserPlus, akquise: Target, tippgeber: Lightbulb, pipeline: BarChart3, struktur: Network,
    partner: Users, provisionen: Wallet, ziele: Trophy, smartmeter: Zap, probleme: AlertTriangle,
    stornos: Ban, aufgaben: ClipboardList, kalender: Calendar, tickets: MessageSquare,
    unterlagen: FolderOpen, "meine-daten": CircleUser,
  };
  const NAV_GRUPPEN = [
    ["", ["dashboard"]],
    ["Kunden und Anfragen", ["anfragen", "alle", "kunden", "pruefung"]],
    ["Akquise", ["leads", "akquise", "tippgeber", "pipeline", "struktur", "partner"]],
    ["Provision und Ziele", ["provisionen", "ziele"]],
    ["Betreuung", ["smartmeter", "probleme", "stornos"]],
    ["Organisation", ["aufgaben", "kalender", "tickets", "unterlagen", "meine-daten"]],
  ];
  const navAbschnitte = (() => {
    if (!navGruppiert) return [["", NAV]];
    const vergeben = new Set(["neu"]);
    const teile = NAV_GRUPPEN.map(([titel, ids]) => {
      const punkte = ids.map((id) => NAV.find((n) => n.id === id)).filter(Boolean);
      punkte.forEach((n) => vergeben.add(n.id));
      return [titel, punkte];
    });
    const rest = NAV.filter((n) => !vergeben.has(n.id));
    return [...teile, ...(rest.length ? [["Weiteres", rest]] : [])].filter(([, p]) => p.length);
  })();

  /* Ansichten, die über Kacheln erreichbar sind und deshalb nicht im Menü stehen */
  const WEITERE_ANSICHTEN = ["neu", "eingang", "auftraege", "versorger", "kalkulationen"];
  useEffect(() => {
    setOffen(null); setEntwurf(null);
    if (!userId) return;
    const m = mitarbeiter.find((x) => x.id === userId);
    const gesperrtM = m && ["registriert", "abgelehnt", "pruefung"].includes(m.status);
    /* Adresse wie #/alle/A-2026-1042: dieselbe Ansicht nach Neuladen wieder öffnen */
    const treffer = window.location.hash.match(/^#\/([a-z-]+)(?:\/([^/]+))?/);
    const h1 = treffer && treffer[1], h2 = treffer && treffer[2] && decodeURIComponent(treffer[2]);
    const erlaubt = h1 && (NAV.some((n) => n.id === h1) || WEITERE_ANSICHTEN.includes(h1));
    const start = gesperrtM ? "meine-daten" : erlaubt ? h1 : NAV[0].id;
    const vorgang = !gesperrtM && erlaubt && h2 && !["liste", "pdf"].includes(h2) && h1 !== "neu" ? h2 : null;
    setAnsicht(start);
    if (vorgang) setOffen(vorgang);
    /* Schutzeintrag davor: Zurück auf der ersten Seite verlässt das Portal nicht */
    try {
      const ziel = "#/" + start + (vorgang ? "/" + encodeURIComponent(vorgang) : "");
      window.history.replaceState({ egc: true, schutz: true, n: 0 }, "", ziel);
      window.history.pushState({ egc: true, ansicht: start, offen: vorgang, n: 1 }, "", ziel);
      verlaufUeberspringen.current = true;
    } catch (e) { /* ohne Verlauf weiter */ }
  }, [userId]);

  /* Jede Ansicht bekommt eine eigene Adresse, damit Zurück im Browser eine Ansicht zurückspringt */
  useEffect(() => {
    if (!user) return;
    if (verlaufUeberspringen.current) { verlaufUeberspringen.current = false; return; }
    const ziel = "#/" + (entwurf ? "neu" + (entwurf.id ? "/" + encodeURIComponent(entwurf.id) : "") : ansicht
      + (offen ? "/" + encodeURIComponent(offen) : listenAnsicht ? "/liste" : ""));
    if (window.location.hash === ziel) return;
    try {
      const n = ((window.history.state && window.history.state.n) || 0) + 1;
      window.history.pushState({ egc: true, ansicht, offen: offen || null, liste: !!listenAnsicht, entwurf: !!entwurf, n }, "", ziel);
    } catch (e) { /* egal */ }
  }, [ansicht, offen, !!listenAnsicht, entwurf ? (entwurf.id || "neu") : null, user && user.id]);

  useEffect(() => {
    const zurueck = (e) => {
      const st = e.state || {};
      setPwDialog(false); setMenu(false);
      if (!st.pdf) setPdfAnsicht(null);
      if (st.pdf) return;
      if (!st.egc || st.schutz) {
        /* ganz am Anfang: auf der Startansicht bleiben statt das Portal zu verlassen */
        const start = NAV[0] ? NAV[0].id : "dashboard";
        try { window.history.pushState({ egc: true, ansicht: start, offen: null, n: 1 }, "", "#/" + start); } catch (x) { /* egal */ }
        verlaufUeberspringen.current = true;
        setListenAnsicht(null); setEntwurf(null); setOffen(null); setAnsicht(start);
        return;
      }
      verlaufUeberspringen.current = true;
      if (!st.liste) setListenAnsicht(null);
      if (!st.entwurf) setEntwurf(null);
      setOffen(st.offen || null);
      if (st.ansicht) setAnsicht(st.ansicht);
    };
    window.addEventListener("popstate", zurueck);
    return () => window.removeEventListener("popstate", zurueck);
  });

  /* Zurück-Knopf im Portal: wie Zurück im Browser */
  const zurueckGehen = () => {
    const st = window.history.state;
    if (st && st.egc && !st.schutz && (st.n || 0) > 1) { window.history.back(); return; }
    setListenAnsicht(null); setEntwurf(null); setOffen(null); setAnsicht(NAV[0] ? NAV[0].id : "dashboard");
  };
  const setArbeitenAls = (r) => {
    setArbeitenAlsRoh(r);
    try { if (r) localStorage.setItem("egc-arbeiten-als", r); else localStorage.removeItem("egc-arbeiten-als"); } catch (e) { /* egal */ }
    setOffen(null); setListenAnsicht(null); setEntwurf(null); setAnsicht(r === "Beschaffung" ? "beschaffung" : "dashboard"); setMenu(false);
  };
  const zeigeZurueck = !!(offen || listenAnsicht || entwurf || (NAV[0] && ansicht !== NAV[0].id));

  const aktuell = anfragenSicht.find((a) => a.id === offen);

  const TABS = [
    { id: "offen", label: "Offene Anfragen", f: (a) => ["entwurf", "eingereicht", "ruecksprache", "angefragt"].includes(a.status) },
    { id: "angebote", label: "Neue Angebote", f: (a) => a.status === "angebot" && !a.angebotVersendet },
    { id: "kunde", label: "Beim Kunden", f: (a) => a.status === "angebot" && !!a.angebotVersendet },
    { id: "klaer", label: "Klärfälle", f: (a) => a.status === "klaerfall" },
    { id: "bereit", label: "Bereit zum Einreichen", f: (a) => a.status === "uebermittelt" },
    { id: "uebermittelt", label: "An Versorger übermittelt", f: (a) => ["einreichung", "bestaetigt"].includes(a.status) },
    { id: "fix", label: "Vom Versorger bestätigt", f: (a) => a.status === "abgeschlossen" },
  ];

  const sichtbar =
    rolle === "Teamleiter" && user ? anfragenSicht.filter((a) => a.team === user.team) : anfragenSicht;

  /* Registrierung über den Einladungslink */
  if (registriert)
    return (
      <Registrierung einladung={registriert}
        onFertig={async (pw) => {
          await einladungEinloesen(registriert.code, pw);
          await abmelden();
          await anmelden(registriert.email, pw);
          try { window.history.replaceState(null, "", window.location.pathname); } catch (e) { /* egal */ }
          setRegistriert(null);
          await allesLaden();
        }}
        onAbbruch={() => setRegistriert(null)} />
    );

  if (sitzung === "pruefen" || (sitzung === "aktiv" && !user))
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 gap-4"
           style={{ background: C.ink, fontFamily: FONT, color: "#8B9BB0", paddingTop: "env(safe-area-inset-top)" }}>
        <img src={LOGO} alt="EGC Energie" className="w-44" />
        <p className="text-sm">{sitzung === "aktiv" ? "Zugang nicht gefunden." : "Daten werden geladen …"}</p>
        {sitzung === "aktiv" && (
          <button className="text-sm underline" onClick={abmeldenUndLeeren}>Abmelden</button>
        )}
      </div>
    );

  /* Anmeldung */
  if (!user)
    return (
      <Login startCode={einladungStart}
        onAngemeldet={allesLaden}
        onEinladung={(info) => setRegistriert(info)} />
    );

  const gesperrt = ["registriert", "abgelehnt", "pruefung"].includes(user.status);

  let inhalt;
  if (gesperrt) {
    inhalt = <MeineStammdaten user={user} mitarbeiter={mitarbeiter} setMitarbeiter={setMitarbeiter} />;
  } else if (aktuell) {
    inhalt = (
      <Detail a={aktuell} user={user} mitarbeiter={mitarbeiter} versorger={versorger} tippgeber={tippgeber}
        beschaffung={beschaffung} setBeschaffung={setBeschaffung}
        onBeschaffung={(id) => { setOffen(null); setBeschaffungStart(id); setAnsicht("beschaffung"); }}
        alleAnfragen={anfragenSicht}
        onZurueck={zurueckGehen} onUpdate={(a) => speichern(a)}
        onBearbeiten={(a) => { setOffen(null); setListenAnsicht(null); setEntwurf(a); }}
        onVerlaengern={verlaengern} onNotieren={notieren}
        onLoeschen={(x) => {
          setAnfragen((l) => l.filter((y) => y.id !== x.id));
          /* alles, was an diesem Kunden hängt, verschwindet mit: Smartmeter-Aufträge, Problemfälle, Beschaffungsaufträge */
          setSmartmeter((l) => (l || []).filter((y) => y.anfrageId !== x.id));
          setProbleme((l) => (l || []).filter((y) => y.anfrageId !== x.id));
          setBeschaffung((l) => (l || []).filter((y) => y.anfrageId !== x.id));
          /* Dateien des Vorgangs im Speicher entfernen (nur die Geschäftsführung darf das) */
          try {
            sb.storage.from("dateien").list("anfragen/" + x.id, { limit: 1000 }).then(({ data }) => {
              const pfade = (data || []).map((d) => "anfragen/" + x.id + "/" + d.name);
              if (pfade.length) sb.storage.from("dateien").remove(pfade);
            }).catch(() => {});
          } catch (e) { /* ohne Dateispeicher (Bautest) */ }
          setOffen(null);
        }} />
    );
  } else if (listenAnsicht) {
    inhalt = (
      <div>
        <div className="flex items-center gap-3 mb-5">
          <h2 className="text-lg">{listenAnsicht.titel}</h2>
        </div>
        <Liste anfragen={listenAnsicht.liste} leerText="Keine Vorgänge in dieser Auswahl."
          onOeffnen={setOffen} />
      </div>
    );
  } else if (ansicht === "neu" || entwurf) {
    inhalt = (
      <Assistent user={user} mitarbeiter={mitarbeiter} alleAnfragen={anfragenSicht}
        tippgeber={tippgeber} entwurf={entwurf}
        onSpeichern={(a) => {
          /* Laufender Vorgang (z. B. Korrektur durch die Kalkulation): Änderung vermerken und zurück in den Vorgang */
          if (a.status && !["entwurf", "klaerfall"].includes(a.status)) {
            /* Vertriebspartner: nur bis zum Angebot. Gespeichert wird auf den aktuellen Stand des Vorgangs,
               damit nichts überschrieben wird, was die Kalkulation inzwischen erfasst hat. */
            if (VERTRIEB_SICHT_ROLLEN.includes(user.rolle)) {
              const aktuell = anfragen.find((x) => x.id === a.id) || a;
              if (!VERTRIEB_BEARBEITBAR.includes(aktuell.status)) {
                alert("Die Kalkulation hat inzwischen ein Angebot erstellt. Deine Änderungen wurden nicht gespeichert. "
                  + "Schreib der Kalkulation bitte im Vorgang, was sich geändert hat.");
                setEntwurf(null); setOffen(a.id);
                return;
              }
              const vorher = aktuell.lieferstellen.length, nachher = a.lieferstellen.length;
              speichern({
                ...aktuell,
                kunde: a.kunde, lieferstellen: a.lieferstellen, smartmeter: a.smartmeter,
                produkt: a.produkt, produktGas: a.produktGas, laufzeit: a.laufzeit, laufzeitArt: a.laufzeitArt,
                wunschLieferbeginn: a.wunschLieferbeginn, wunschLieferende: a.wunschLieferende, lieferbeginnVon: a.lieferbeginnVon,
                aufschlag: a.aufschlag, bemerkungVertrieb: a.bemerkungVertrieb, vollmachtAnhaengen: a.vollmachtAnhaengen,
                zielpreis: a.zielpreis, zielpreisNotiz: a.zielpreisNotiz,
                lieferstellenListe: a.lieferstellenListe, lieferstellenDatei: a.lieferstellenDatei,
                aenderungVertrieb: { datum: heute(), zeit: jetzt(), von: user.name, vorher, nachher },
                verlauf: [...(aktuell.verlauf || []), { d: heute(), w: user.name,
                  t: "Anfrage vom Vertriebspartner geändert" + (vorher !== nachher ? " (Lieferstellen: " + vorher + " → " + nachher + ")" : "") }],
              });
              setEntwurf(null); setOffen(a.id);
              return;
            }
            speichern({ ...a, verlauf: [...(a.verlauf || []), { d: heute(), t: "Kunden- und Lieferstellendaten geändert", w: user.name }] });
            setEntwurf(null); setOffen(a.id);
            return;
          }
          speichern(a); setEntwurf(null); setAnsicht("anfragen"); setTab("offen"); setTabGewaehlt("offen");
        }}
        onSenden={einreichen}
        onAbbrechen={() => { setEntwurf(null); setAnsicht("anfragen"); }} />
    );
  } else if (ansicht === "anfragen") {
    /* Reiter mit Arbeit zuerst: Klärfall vor neuem Angebot vor Angebot beim Kunden */
    const anzahl = (id) => meine.filter(TABS.find((x) => x.id === id).f).length;
    const vorrang = ["klaer", "angebote", "kunde", "offen", "bereit", "uebermittelt", "fix"];
    const tabAktiv = tabGewaehlt === tab || anzahl(tab) > 0 ? tab : (vorrang.find((id) => anzahl(id) > 0) || tab);
    const t = TABS.find((x) => x.id === tabAktiv);
    const anderswo = TABS.filter((x) => x.id !== tabAktiv && anzahl(x.id) > 0).map((x) => anzahl(x.id) + " in „" + x.label + "“");
    inhalt = (
      <div>
        <div className="flex flex-wrap gap-1 mb-5">
          {TABS.map((x) => {
            const n = meine.filter(x.f).length;
            const an = tabAktiv === x.id;
            return (
              <button key={x.id} onClick={() => { setTab(x.id); setTabGewaehlt(x.id); }}
                className="px-3 py-1.5 text-sm rounded"
                style={{
                  background: an ? C.ink : "transparent",
                  color: an ? "#fff" : n > 0 ? C.text : C.muted,
                  border: "1px solid " + (an ? C.ink : C.line),
                  opacity: an || n > 0 ? 1 : 0.55,
                }}>
                {x.label} {n > 0 && <span style={{ opacity: 0.7 }}>{n}</span>}
              </button>
            );
          })}
        </div>
        <Liste
          anfragen={meine.filter(t.f)}
          leerText={(
            tabAktiv === "uebermittelt" ? "Hier stehen Aufträge, die die Kalkulation an den Versorger übermittelt hat."
            : tabAktiv === "bereit" ? "Aufträge, die du an die Kalkulation gesendet hast. Sie reicht sie beim Versorger ein."
            : tabAktiv === "kunde" ? "Angebote, die du an den Kunden versendet hast."
            : tabAktiv === "klaer" ? "Keine offenen Klärfälle. Gut so."
            : tabAktiv === "angebote" ? "Sobald die Kalkulation ein Angebot zurückschickt, erscheint es hier."
            : tabAktiv === "fix" ? "Noch keine vom Versorger bestätigten Kunden."
            : meine.length ? "Hier liegt gerade nichts." : "Noch keine Anfragen. Leg mit „Neue Anfrage“ los.")
            + (anderswo.length ? " Gerade aktuell: " + anderswo.join(", ") + "." : "")}
          onOeffnen={(id) => {
            const a = anfragenSicht.find((x) => x.id === id);
            if (a.status === "entwurf") setEntwurf(a);
            else setOffen(id);
          }}
        />
      </div>
    );
  } else if (ansicht === "eingang") {
    inhalt = (
      <Liste anfragen={anfragenSicht.filter((a) => ["eingereicht", "angefragt"].includes(a.status))}
        leerText="Keine neuen Anfragen im Eingang." onOeffnen={setOffen} />
    );
  } else if (ansicht === "versorger") {
    inhalt = (
      <Liste anfragen={anfragenSicht.filter((a) => ["uebermittelt", "einreichung"].includes(a.status))}
        leerText="Keine Aufträge in der Versorgerbestätigung." onOeffnen={setOffen} />
    );
  } else if (ansicht === "vertraege") {
    inhalt = (
      <div className="space-y-6">
        <div>
          <h3 className="text-sm mb-2">Neue Lieferbestätigungen</h3>
          <Liste anfragen={anfragenSicht.filter((a) => a.status === "abgeschlossen" && !a.lieferbestaetigung)}
            leerText="Keine neuen Lieferbestätigungen." onOeffnen={setOffen} />
        </div>
        <div>
          <h3 className="text-sm mb-2">Verträge</h3>
          <Liste anfragen={anfragenSicht.filter((a) => a.status === "abgeschlossen" && a.lieferbestaetigung)}
            leerText="Noch keine Verträge zu bearbeiten." onOeffnen={setOffen} />
        </div>
      </div>
    );
  } else if (ansicht === "provisionen") {
    inhalt = <Provisionen anfragen={sichtbar} mitarbeiter={mitarbeiter} user={user}
               onOeffnen={(id) => setOffen(id)}
               onListe={(titel, liste) => setListenAnsicht({ titel, liste })} />;
  } else if (ansicht === "dashboard") {
    inhalt = (
      <Dashboard anfragen={anfragenSicht} mitarbeiter={mitarbeiter} user={user}
        termine={termine} leads={leads} setMitarbeiter={setMitarbeiter}
        aufgaben={aufgaben} setAufgaben={setAufgaben} bonusziele={bonusziele}
        probleme={probleme} smartmeter={smartmeter}
        gfZahlen={{ provisionOffen, offeneStrukturanfragen, wartendeTippgeber }}
        onOeffnen={(id, ziel) => {
          if (ziel) { setOffen(null); setAnsicht(ziel); return; }
          const x = anfragenSicht.find((y) => y.id === id);
          if (x && x.status === "entwurf") setEntwurf(x); else setOffen(id);
        }}
        onListe={(titel, liste) => setListenAnsicht({ titel, liste })} />
    );
  } else if (ansicht === "ruecksprachen") {
    inhalt = (
      <Liste anfragen={anfragenSicht.filter((a) => a.status === "ruecksprache")}
        leerText="Keine offenen Rücksprachen." onOeffnen={setOffen} />
    );
  } else if (ansicht === "kunden") {
    inhalt = <Kunden anfragen={anfragenSicht} leads={leads} mitarbeiter={mitarbeiter} user={user}
               onOeffnen={setOffen} onLead={() => setAnsicht("leads")} />;
  } else if (ansicht === "leads") {
    inhalt = (
      <Leads leads={leads} setLeads={setLeads} mitarbeiter={mitarbeiter} user={user}
        onUebernehmen={ausLead}
        onGelesen={(id) => setLeads(leads.map((l) => (l.id === id ? { ...l, gelesen: true } : l)))} />
    );
  } else if (ansicht === "kalkulationen") {
    inhalt = <Kalkulationen anfragen={anfragenSicht} onOeffnen={setOffen} user={user} />;
  } else if (ansicht === "auftraege") {
    inhalt = (
      <Liste anfragen={anfragenSicht.filter((a) => a.status === "uebermittelt")}
        leerText="Keine neuen Aufträge." onOeffnen={setOffen} />
    );
  } else if (ansicht === "probleme") {
    inhalt = <Problemfaelle probleme={probleme} setProbleme={setProbleme} anfragen={anfragenSicht}
               mitarbeiter={mitarbeiter} user={user} />;
  } else if (ansicht === "stornos") {
    inhalt = <Problemfaelle probleme={probleme} setProbleme={setProbleme} anfragen={anfragenSicht}
               mitarbeiter={mitarbeiter} user={user} nurStorno />;
  } else if (ansicht === "ziele") {
    inhalt = <Ziele mitarbeiter={mitarbeiter} setMitarbeiter={setMitarbeiter}
               anfragen={anfragenSicht} user={user}
               bonusziele={bonusziele} setBonusziele={setBonusziele} />;
  } else if (ansicht === "akquise") {
    inhalt = (
      <Akquise listen={akquise} setListen={setAkquise} user={user} mitarbeiter={mitarbeiter} leads={leads} anfragen={anfragen}
        onTermin={(t) => setTermine((alt) => [...alt, { id: "TE" + uid(), fuerId: user.id, ...t }])}
        onKunde={(e) => {
          const a = leereAnfrage(user);
          const teile = String(e.adresse || "").split(",");
          const ortTeil = (teile[1] || "").trim();
          a.kunde = {
            ...a.kunde, firma: e.firma, ansprechpartner: e.ansprechpartner, telefon: e.telefon,
            email: e.email || a.kunde.email || "",
            strasse: e.strasse || (teile[0] || "").trim(),
            plz: e.plz || (ortTeil.match(/\d{5}/) || [""])[0],
            ort: e.ort || ortTeil.replace(/\d{5}/, "").trim(),
            branche: e.branche || "",
          };
          const stellen = [];
          if (parseFloat(e.daten.verbrauchStrom) > 0)
            stellen.push({ ...leereLieferstelle("strom"), bezeichnung: "Hauptstandort",
              versorger: e.daten.versorger || "", verbrauch: e.daten.verbrauchStrom });
          if (parseFloat(e.daten.verbrauchGas) > 0)
            stellen.push({ ...leereLieferstelle("gas"), bezeichnung: "Hauptstandort",
              versorger: e.daten.versorger || "", verbrauch: e.daten.verbrauchGas });
          if (stellen.length) a.lieferstellen = stellen;
          if (e.daten.laufzeit) a.wunschLieferbeginn = e.daten.laufzeit;
          a.bemerkungVertrieb = [e.notiz, e.website].filter(Boolean).join(" · ");
          a.akquiseArt = "unternehmen";
          a.herkunft = "Kaltakquise";
          a.herkunftDetail = "Kontaktliste " + (e.branche || "");
          setEntwurf(a);
          setAnsicht("neu");
        }} />
    );
  } else if (ansicht === "kalender") {
    inhalt = <Kalender termine={termine} setTermine={setTermine} user={user} leads={leads} mitarbeiter={mitarbeiter}
      anfragen={anfragenSicht} onOeffnen={setOffen} onKundeAnlegen={ausTermin} />;
  } else if (ansicht === "branchen") {
    inhalt = <Branchen anfragen={anfragenSicht}
               onListe={(titel, liste) => setListenAnsicht({ titel, liste })} />;
  } else if (ansicht === "ausstehend") {
    inhalt = <ProvisionAusstehend anfragen={anfragenSicht} mitarbeiter={mitarbeiter} user={user}
               onOeffnen={(id) => setOffen(id)} />;
  } else if (ansicht === "tippgeber") {
    inhalt = <Tippgeber tippgeber={tippgeber} setTippgeber={setTippgeber}
               anfragen={anfragenSicht} mitarbeiter={mitarbeiter} user={user} />;
  } else if (ansicht === "pruefung") {
    inhalt = <Kundenpruefung anfragen={anfragenSicht} leads={leads} mitarbeiter={mitarbeiter} user={user} />;
  } else if (ansicht === "aufgaben") {
    inhalt = <Aufgaben aufgaben={aufgaben} setAufgaben={setAufgaben} user={user}
               mitarbeiter={mitarbeiter} onOeffnen={(id) => setOffen(id)} />;
  } else if (ansicht === "pipeline") {
    inhalt = <Pipeline anfragen={anfragenSicht} mitarbeiter={mitarbeiter} user={user}
               onOeffnen={(id) => setOffen(id)}
               onListe={(titel, liste) => setListenAnsicht({ titel, liste })} />;
  } else if (ansicht === "protokoll") {
    inhalt = <Protokoll protokoll={protokoll} mitarbeiter={mitarbeiter} />;
  } else if (ansicht === "export") {
    inhalt = (
      <Datenexport anfragen={anfragenSicht} mitarbeiter={mitarbeiter} leads={leads} ablage={ablage}
        versorger={versorger} tickets={tickets} smartmeter={smartmeter} user={user}
        kundenImport={kundenImport}
        alleSetzen={(d) => {
          if (d.anfragen) setAnfragen(migriereAnfragen(d.anfragen));
          if (d.mitarbeiter) setMitarbeiter(migriereMitarbeiter(d.mitarbeiter));
          if (d.leads) setLeads(migriereLeads(d.leads));
          if (d.ablage) setAblage(d.ablage);
          if (d.versorger) setVersorger(d.versorger);
          if (d.tickets) setTickets(d.tickets);
          if (d.smartmeter) setSmartmeter(d.smartmeter);
        }} />
    );
  } else if (ansicht === "tickets") {
    inhalt = <Tickets tickets={tickets} setTickets={setTickets} user={user} mitarbeiter={mitarbeiter} />;
  } else if (ansicht === "smartmeter") {
    inhalt = <Smartmeter vorgaenge={smartmeter} setVorgaenge={setSmartmeter}
               anfragen={anfragenSicht} mitarbeiter={mitarbeiter} user={user} />;
  } else if (ansicht === "abrechnung") {
    inhalt = <Abrechnung anfragen={anfragenSicht} mitarbeiter={mitarbeiter} user={user}
               setAnfragen={setAnfragen} notieren={notieren} onOeffnen={(id) => setOffen(id)} />;
  } else if (ansicht === "beschaffung" && (NAV.some((n) => n.id === "beschaffung") || ["Leitung Vertrieb", "Kalkulation"].includes(user.rolle))) {
    inhalt = <Beschaffung auftraege={beschaffung} setAuftraege={setBeschaffung} user={user} mitarbeiter={mitarbeiter}
               start={beschaffungStart} onStart={setBeschaffungStart} />;
  } else if (ansicht === "versorgerliste") {
    inhalt = <Versorgerliste versorger={versorger} setVersorger={setVersorger} user={user}
               standard={firmenanteil}
               setStandard={(v) => { setFirmenanteil(v); notieren("Provisionssatz",
                 "Anteil an der Gesamtprovision auf " + v + " % gesetzt"); }} />;
  } else if (ansicht === "unterlagen") {
    inhalt = <Ablage ablage={ablage} setAblage={setAblage} user={user} />;
  } else if (ansicht === "partner") {
    inhalt = <Partnerverwaltung mitarbeiter={mitarbeiter} setMitarbeiter={setMitarbeiter}
               user={user} notieren={notieren} bonus={bonusSatz}
               strukturanfragen={strukturanfragen} setStrukturanfragen={setStrukturanfragen}
               firmendaten={firmendaten} setFirmendaten={setFirmendaten}
               setBonus={(v) => { setBonusSatz(v); setzeBonus(v);
                 notieren("Provisionssatz", "Bonus für Eigenakquise auf " + v + " Prozentpunkte gesetzt"); }} />;
  } else if (ansicht === "portal" && user.rolle === "Geschäftsführung") {
    inhalt = <Portalsteuerung mitarbeiter={mitarbeiter} setMitarbeiter={setMitarbeiter} user={user} notieren={notieren} />;
  } else if (ansicht === "vertraege-gf") {
    inhalt = <Vertraege tippgeber={tippgeber} setTippgeber={setTippgeber} mitarbeiter={mitarbeiter}
               setMitarbeiter={setMitarbeiter} anfragen={anfragenSicht} user={user} notieren={notieren}
               firmendaten={firmendaten} setFirmendaten={setFirmendaten} />;
  } else if (ansicht === "struktur") {
    inhalt = <Strukturanfragen anfragen={strukturanfragen} setAnfragen={setStrukturanfragen} user={user} />;
  } else if (ansicht === "meine-daten") {
    inhalt = <MeineStammdaten user={user} mitarbeiter={mitarbeiter} setMitarbeiter={setMitarbeiter} />;
  } else if (ansicht === "alle") {
    inhalt = <VorgaengeNachStatus anfragen={sichtbar} onOeffnen={setOffen} rolle={user.rolle} />;
  } else {
    inhalt = <Liste anfragen={sichtbar} leerText="Keine Vorgänge." onOeffnen={setOffen} />;
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row"
         style={{ background: C.paper, color: C.text, fontFamily: FONT, paddingBottom: "env(safe-area-inset-bottom)" }}>
      {/* Seitenleiste, auf dem Handy als einklappbare Kopfzeile */}
      {/* Seitenleiste: am Rechner fest am Rand und für sich scrollbar; auf dem Handy legt sich das
          geöffnete Menü über die ganze Seite, scrollt für sich und zieht die Seite nicht mit */}
      <aside className={"lg:w-64 shrink-0 lg:px-4 lg:py-5 lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto lg:self-start"
          + (menu ? " max-lg:fixed max-lg:inset-0 max-lg:z-40 max-lg:overflow-y-auto" : "")}
        style={{ background: C.ink, color: "#fff", overscrollBehavior: "contain", WebkitOverflowScrolling: "touch" }}>
        {/* Als App auf dem iPhone liegt die Statusleiste (Uhrzeit, Akku) über der Seite:
            so viel Platz frei lassen, wie sie hoch ist. Im Browser ist der Wert 0. */}
        <div className="lg:hidden" style={{ height: "env(safe-area-inset-top)" }} />
        {/* Kopfzeile mobil */}
        <div className="flex items-center gap-3 px-4 py-3 lg:px-0 lg:py-0 lg:block lg:mb-6">
          <button title="Zur Übersicht"
            onClick={() => {
              setAnsicht("dashboard");
              setOffen(null); setEntwurf(null); setListenAnsicht(null); setMenu(false);
            }}
            className="text-left">
            <img src={LOGO} alt="EGC Energie" className="w-28 lg:w-48" />
            <div className="hidden lg:block text-xs mt-2" style={{ color: "#8B9BB0" }}>Vertriebsportal</div>
          </button>

          <span className="flex-1 lg:hidden" />

          <button onClick={() => setMenu(!menu)} className="lg:hidden flex items-center gap-2 px-3 py-2 rounded"
            style={{ background: C.inkSoft, color: "#fff" }}>
            {menu ? <X size={18} /> : <Menu size={18} />}
            <span className="text-sm">{menu ? "Schließen" : "Menü"}</span>
            {!menu && meldungen.filter((m) => !gelesen.includes(m.id)).length > 0 && (
              <span className="text-xs px-1.5 rounded-full"
                    style={{ background: C.warn, color: "#fff" }}>
                {meldungen.filter((m) => !gelesen.includes(m.id)).length}
              </span>
            )}
          </button>
        </div>

        {/* Alles Weitere: mobil nur bei geöffnetem Menü */}
        <div className={(menu ? "block" : "hidden") + " lg:block px-4 pb-4 lg:px-0 lg:pb-0"}>
          <div className="flex items-center gap-3 mb-3">
            <Avatar m={angemeldet} size={38} />
            <div className="flex-1 min-w-0">
              <div className="text-sm truncate">{angemeldet.name}</div>
              <div className="text-xs truncate" style={{ color: "#8B9BB0" }}>{angemeldet.rolle}</div>
            </div>
            <button onClick={abmeldenUndLeeren} title="Abmelden" style={{ color: "#8B9BB0" }}>
              <ArrowLeft size={16} />
            </button>
          </div>
          {darfWechseln && (
            <label className="block mb-3">
              <span className="block text-xs mb-1" style={{ color: "#8B9BB0" }}>Arbeiten als</span>
              <select value={alsRolle} onChange={(e) => setArbeitenAls(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded outline-none"
                style={{ background: alsRolle ? C.gruen : "#1B2A3D", color: alsRolle ? C.ink : "#fff", border: "1px solid #2A3B52" }}>
                <option value="">Geschäftsführung</option>
                {ARBEITEN_ALS.map((r) => <option key={r} value={r}>{r === "Kalkulation" ? "Kalkulation (Kalk-Team)" : r}</option>)}
              </select>
            </label>
          )}

          <Suche anfragen={anfragenSicht} leads={leads} tickets={tickets} akquise={akquise}
            mitarbeiter={mitarbeiter} user={user}
            aufSprung={(ziel) => {
              setListenAnsicht(null);
              if (ziel.vorgang) { setAnsicht(ziel.ansicht); setOffen(ziel.vorgang); }
              else { setOffen(null); setAnsicht(ziel.ansicht); }
              setMenu(false);
            }} />

          <div className="mb-2">
            <Glocke meldungen={meldungen} gelesen={gelesen}
              aufGelesen={alsGelesen} aufSpringen={springen} />
          </div>

          <nav className="lg:block">
            {!gesperrt && navGruppiert && NAV.some((n) => n.id === "neu") && (
              <button
                onClick={() => { setAnsicht("neu"); setOffen(null); setEntwurf(null);
                                 setListenAnsicht(null); setMenu(false); }}
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded text-sm w-full mb-3"
                style={{ background: C.gruen, color: "#0A1626" }}>
                <Plus size={16} /> Neue Anfrage
              </button>
            )}
            {(gesperrt ? [] : navAbschnitte).map(([titel, punkte]) => (
              <div key={titel || "start"} className={titel ? "mt-3" : ""}>
                {titel && (
                  <div className="px-3 pb-1 text-xs uppercase tracking-wider" style={{ color: "#5C6E85" }}>
                    {titel}
                  </div>
                )}
                {punkte.map((n) => {
                  const Symbol = (navGruppiert && NAV_SYMBOL[n.id]) || n.icon;
                  return (
                    <button key={n.id}
                      onClick={() => { setAnsicht(n.id); setOffen(null); setEntwurf(null);
                                       setListenAnsicht(null); setMenu(false); }}
                      className="flex items-center gap-2.5 px-3 py-2 rounded text-sm w-full"
                      style={{
                        background: ansicht === n.id && !offen ? C.inkSoft : "transparent",
                        color: ansicht === n.id && !offen ? "#fff" : "#93A4B8",
                      }}>
                      <Symbol size={15} />
                      <span className="flex-1 text-left">{n.label}</span>
                      {n.badge > 0 && (
                        <span className="text-xs px-1.5 rounded-full"
                              style={{ background: C.gruen, color: "#0A1626" }}>{n.badge}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>

          <button onClick={() => { setPwDialog(true); setMenu(false); }}
            className="w-full mt-5 px-3 py-2 text-xs rounded text-left"
            style={{ background: C.inkSoft, color: "#8B9BB0", border: "1px solid " + C.inkLine }}>
            Passwort ändern
          </button>
          <button onClick={abmeldenUndLeeren}
            className="w-full mt-2 px-3 py-2 text-xs rounded text-left"
            style={{ background: C.inkSoft, color: "#8B9BB0", border: "1px solid " + C.inkLine }}>
            Abmelden
          </button>

          <p className="text-xs mt-4" style={{ color: "#5C6E85" }}>{VERSION_ANZEIGE}</p>
          {gesperrt && (
            <p className="text-xs mt-2" style={{ color: "#8B9BB0" }}>
              Das Portal wird freigeschaltet, sobald deine Stammdaten geprüft sind.
            </p>
          )}
        </div>
      </aside>

      {/* Inhalt */}
      <main className="flex-1 px-4 sm:px-8 py-5 lg:py-6 max-w-6xl w-full">
        {pwDialog && <PasswortDialog onSchliessen={() => setPwDialog(false)} />}
        {pdfAnsicht && <PdfBetrachter datei={pdfAnsicht} onSchliessen={pdfSchliessen} />}
        {alsRolle && (
          <div className="flex flex-wrap items-center gap-3 mb-4 px-4 py-2.5 rounded text-sm"
               style={{ background: "#F1F7F0", border: "1px solid " + C.ok }}>
            <span className="w-full sm:w-auto sm:flex-1 min-w-0">
              Du arbeitest gerade als <strong>{alsRolle}</strong>. Alles, was du hier tust, ist echt und erscheint bei allen Beteiligten,
              im Verlauf mit deinem Namen.
            </span>
            <button onClick={() => setArbeitenAls("")} className="px-3 py-1.5 rounded text-sm"
              style={{ background: C.ink, color: "#fff" }}>Zurück zur Geschäftsführung</button>
          </div>
        )}
        {!alsRolle && ansicht !== "meine-daten" && stammdatenNachreichen(user) && (
          <div className="flex flex-wrap items-center gap-3 mb-4 px-4 py-2.5 rounded text-sm"
               style={{ background: "#FBF6EE", border: "1px solid " + C.gas }}>
            <span className="w-full sm:w-auto sm:flex-1 min-w-0">
              Bitte ergänze noch deine Stammdaten:{" "}
              <strong>{stammdatenLuecken(user.stammdaten || {}, !!user.angestellt).join(", ")}</strong>.
              Sie werden für die Provisionsabrechnung gebraucht.
            </span>
            <button onClick={() => setAnsicht("meine-daten")} className="px-3 py-1.5 rounded text-sm"
              style={{ background: C.ink, color: "#fff" }}>Jetzt ergänzen</button>
          </div>
        )}
        {zeigeZurueck && !gesperrt && (
          <button onClick={zurueckGehen}
            className="inline-flex items-center gap-1.5 text-sm mb-4 px-3 py-1.5 rounded"
            style={{ border: "1px solid " + C.line, background: C.card, color: C.text }}>
            <ArrowLeft size={16} /> Zurück
          </button>
        )}
        {meldung && (
          <div className="flex items-start gap-2 p-3 mb-4 rounded text-sm"
               style={{ background: "#FCF3F0", border: "1px solid " + C.warn, color: C.warn }}>
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            <span className="flex-1">{meldung}</span>
            <button onClick={() => setMeldung("")} title="Ausblenden"><X size={15} /></button>
          </div>
        )}
        {inhalt}
      </main>
    </div>
  );
}

/* Gemeinsame Bausteine für die ausgelagerten Programmteile */
export {
  vertriebsprovision, mitVerdecktemAufschlag,
  VERTRIEB_BEARBEITBAR,
  ctZahl, hatWert, stellenVon, stelleIn, stelleAbweichend, provisionsStellen, lieferjahreVon, lieferjahreAus, aufschlagText, firmenanteilVorgang,
  ABLAGE_ARTEN, ABLAGE_BEREICHE, ABLEHNUNGSGRUENDE, AKQUISE_ART, AKQ_STATUS, Abrechnung, AbrechnungAuslesen, Abschnitt,
  Aufgaben, Avatar, BONUS_EIGENAKQUISE, Balken, Btn, C, Datei, DateiBild,
  DateiChip, EGC_AUFTRAG, EGC_LEISTUNGEN, EGC_SCHRITTE, EMPFEHLUNG, ERWAEHNBAR, EmailSignatur, FEHLGRUENDE,
  FIRMENANTEIL, FIRMENDATEN, Feld, HERKUNFT, INDIVIDUAL_PRODUKTE, KUNDENFELDER, Kalender, Kunden,
  Kurzinfo, LAUFZEITEN, LEAD_STATUS, LOGO_PDF, Lastganganalyse, Leads, Lieferbestaetigung, LinkKopieren,
  Liste, MONATE_KURZ, MediumIcon, PDF_ZEIGEN, PIPELINE, PORTAL_ADRESSE, PROBLEM_ARTEN, PROBLEM_STATUS,
  PRODUKTE, PRODUKTWUNSCH, PartnerStatus, Provisionen, Provisionsblock, ROLLENFARBE, Registrierung, SMARTMETER,
  SMARTMETER_VORGABE, SM_STATUS, SPARTEN, Select, StammdatenFormular, StatusPunkt, StrukturStatus, TERMINFORM,
  TG_FIRMA, TICKET_EMPFAENGER, TICKET_STATUS, TIPPGEBER_VORSCHLAG_KWH, Tippgeber, TippgeberStatus, UMLAGEN, UMLAGEN_VORGABE,
  UNTERLAGEN_FEST, Unterschrift, VERLAENGERUNG_VORLAUF, VERSION, VERTRIEB_SICHT_ROLLEN, VM_SCHRITTE, Ziele, ZuTunKarte,
  abrechnungsJahrVon, aktiveVariante, altPreis, anlegenFuer, anteilVon, auszahlungsZeilen, bestaetigteMenge, beteiligte,
  bildLaden, blankoAuftragPdf, brauchtIndividualanfrage, bytesAlsDataUrl, bytesDataUrl, csvLesen, dataUrlBytes, dateiLaden,
  dateiLesen, dateiName, dateiOeffnen, dateienVon, datum, dubletten, eigenerSatzVon, enddatum,
  erwaehnungenAus, erzeugePdf, erzeugeXlsx, eur, firmaSchluessel, firmenzeile, fruehesterBeginn, gesamtprovision,
  gesamtverteilung, gewaehlte, heute, istBeteiligt, istGFRolle, jahreText, jetzt, kb,
  ladeJsPdf, ladePlz, lastgangAuswerten, lastgangGrafiken, lastgangVerlaeufe, laufzeitAbweichend, laufzeitFuer, laufzeitMonate,
  laufzeitVon, leadSpalte, leereAnfrage, leereLieferstelle, leereStammdaten, leereVariante, leererEintrag, leererTippgeber,
  lieferbeginnAusVertrag, liegezeit, luftlinie, monateBis, monateDazu, monateZwischen, naechsterSchritt, naechsterSchrittInnen,
  num, passwortRegeln, pdfFussFirma, pdfMitFeldern, plzVon, preisTeile, setzeSmartmeter, setzeUmlagen,
  smartmeterStart, smartmeterSummen, spaltenZuordnen, stammdatenLuecken, stammdatenNachreichen, statusVon, strukturUnter, tageZwischen,
  tgZahl, tippgeberFrei, tippgeberFuer, tippgeberLabel, tippgeberMomentaufnahme, tippgeberText, tippgeberVertragPdf, uid,
  umlageSumme, umlageTeile, umlagenAusgleich, umlagenJahr, umlagenVorjahre, utf8Binaer, varianten, verbrauchGesamt,
  verbrauchMedium, verteilung, vertragsZeilen, vertragsende, visitenkartenDaten, xlsxAusZeilen, xlsxLesen, zahlLesen,
  zahlweiseVon, zeitDe, zeitLesen, zugewiesenAn,
};
