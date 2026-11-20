/* Vorgang ansehen und bearbeiten, neue Angebotsanfrage (Assistent), Angebot an den Kunden senden.
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
  ABLEHNUNGSGRUENDE, AKQUISE_ART, Abrechnung, AbrechnungAuslesen, BONUS_EIGENAKQUISE, Btn, C, Datei,
  DateiChip, EMPFEHLUNG, ERWAEHNBAR, FEHLGRUENDE, Feld, HERKUNFT, INDIVIDUAL_PRODUKTE, KUNDENFELDER,
  Kunden, Kurzinfo, LAUFZEITEN, Lastganganalyse, Lieferbestaetigung, Liste, MediumIcon, PDF_ZEIGEN,
  PRODUKTE, PRODUKTWUNSCH, Provisionen, Provisionsblock, ROLLENFARBE, SPARTEN, Select, StatusPunkt,
  Tippgeber, UMLAGEN, Unterschrift, VERLAENGERUNG_VORLAUF, VERTRIEB_SICHT_ROLLEN, abrechnungsJahrVon, aktiveVariante, altPreis,
  anlegenFuer, bestaetigteMenge, beteiligte, brauchtIndividualanfrage, dateiLaden, dateiLesen, dateiOeffnen, dateienVon,
  datum, dubletten, eigenerSatzVon, enddatum, erwaehnungenAus, erzeugePdf, eur, fruehesterBeginn,
  gesamtprovision, gewaehlte, heute, istBeteiligt, istGFRolle, jahreText, jetzt, laufzeitAbweichend,
  laufzeitFuer, laufzeitMonate, laufzeitVon, leereAnfrage, leereLieferstelle, leereVariante, lieferbeginnAusVertrag, liegezeit,
  monateBis, monateDazu, monateZwischen, naechsterSchritt, naechsterSchrittInnen, num, preisTeile, smartmeterStart,
  smartmeterSummen, statusVon, tippgeberFuer, tippgeberLabel, tippgeberMomentaufnahme, uid, umlagenAusgleich, umlagenJahr,
  umlagenVorjahre, varianten, verbrauchGesamt, verbrauchMedium, vertragsende, zahlLesen, zeitDe,
  csvLesen, xlsxLesen, VERTRIEB_BEARBEITBAR, ctZahl, mitVerdecktemAufschlag, stelleIn, stelleAbweichend, stellenVon, provisionsStellen, aufschlagText,
} from "./App.jsx";
import { BeschaffungKarte } from "./beschaffung.jsx";
import { Smartmeter, SmartmeterKalk, UmlagenPflege } from "./innendienst.jsx";
import { dienstleistungsvertragPdf, egcAngebotPdf, individualPaket, ndaPdf } from "./pdf.jsx";
import { Akquise } from "./vertrieb.jsx";

/* ------------------------------------------------------------------ */
const hatWertK = (x) => x !== undefined && x !== null && String(x).trim() !== "";

/* ---------- Kunde aus einer CSV- oder Excel-Datei anlegen ----------
   Eine Datei = ein Kunde. Je Zeile eine Lieferstelle; die Kundendaten stehen in der ersten Zeile
   (in weiteren Zeilen dürfen sie fehlen oder gleich sein). Das Ergebnis füllt nur den Assistenten vor:
   Der Vertriebspartner prüft, lädt die Rechnungen hoch und sendet wie gewohnt. */
const KUNDE_CSV_SPALTEN = [
  ["firma", "Firma", "Musterbetrieb GmbH"],
  ["strasse", "Straße und Hausnummer", "Musterstraße 12"],
  ["plz", "PLZ", "12345"],
  ["ort", "Ort", "Musterstadt"],
  ["ansprechpartner", "Ansprechpartner", "Max Mustermann"],
  ["telefon", "Telefon", "0123 456789"],
  ["email", "E-Mail", "info@musterbetrieb.de"],
  ["branche", "Branche", "Bäckerei"],
  ["steuernummer", "Steuernummer oder USt-IdNr.", ""],
  ["sparte", "Sparte (Strom oder Erdgas)", "Strom", "Erdgas"],
  ["bezeichnung", "Bezeichnung der Lieferstelle", "Backstube", "Backstube"],
  ["lStrasse", "Lieferstelle Straße", "", ""],
  ["lPlz", "Lieferstelle PLZ", "", ""],
  ["lOrt", "Lieferstelle Ort", "", ""],
  ["versorger", "Aktueller Versorger", "Beispiel-Energie AG", "Muster-Gas GmbH"],
  ["kundennummer", "Kundennummer beim Versorger", "4711081523", "GV778812"],
  ["zaehlernummer", "Zählernummer", "1ESY1160123456", "7GMT00987654"],
  ["maloId", "Marktlokation (MaLo)", "51238947561", "50812345678"],
  ["meloId", "Messlokation (MeLo)", "", ""],
  ["verbrauch", "Jahresverbrauch in kWh", "42380", "82203"],
  ["zaehlerart", "Zählerart (SLP oder RLM)", "SLP", "SLP"],
  ["vertragsendeAlt", "Vertrag läuft bis", "31.12.2026", "30.09.2026"],
  ["kuendigungsfrist", "Kündigungsfrist", "3 Monate zum Vertragsende", "6 Wochen zum Vertragsende"],
  ["produkt", "Produkt Strom", "Festpreis", ""],
  ["produktGas", "Produkt Erdgas", "", "Festpreis"],
  ["laufzeit", "Laufzeit in Monaten", "24", ""],
  ["wunschLieferbeginn", "Gewünschter Lieferbeginn", "01.01.2027", ""],
  ["bemerkung", "Bemerkung für die Kalkulation", "Kunde wünscht Festpreis, plant PV 2027", ""],
];
const KUNDE_CSV_BEISPIEL = "Musterbetrieb GmbH";
/* weitere Schreibweisen in Kopfzeilen, die ein Kunde oder ein anderes Programm liefern könnte */
const KUNDE_CSV_ALIAS = {
  firma: ["firmenname", "kunde", "kundenname", "unternehmen", "name der firma"],
  strasse: ["straße", "strasse", "anschrift", "adresse"],
  plz: ["postleitzahl"], ort: ["stadt", "wohnort"],
  ansprechpartner: ["kontakt", "kontaktperson", "ansprechperson"],
  telefon: ["tel", "telefonnummer", "mobil", "handy"], email: ["mail", "e-mail-adresse", "email"],
  steuernummer: ["steuernummer", "ust-idnr", "ustidnr", "umsatzsteuer-id"],
  sparte: ["sparte", "medium", "energie", "energieart"],
  bezeichnung: ["lieferstelle", "bezeichnung", "standort"],
  lStrasse: ["lieferadresse", "lieferstelle strasse", "lieferstelle straße und hausnummer"],
  versorger: ["versorger", "lieferant", "energieversorger", "bisheriger versorger"],
  kundennummer: ["kundennummer", "kundennr", "vertragskonto"],
  zaehlernummer: ["zählernummer", "zaehlernummer", "zählernr", "zaehlernr"],
  maloId: ["malo", "malo-id", "marktlokation", "marktlokations-id"],
  meloId: ["melo", "melo-id", "messlokation", "messlokations-id", "zählpunkt", "zaehlpunkt"],
  verbrauch: ["jahresverbrauch", "verbrauch", "verbrauch kwh", "kwh"],
  zaehlerart: ["zählerart", "zaehlerart", "messart"],
  vertragsendeAlt: ["vertragsende", "lieferende", "vertrag bis"],
  laufzeit: ["laufzeit"], wunschLieferbeginn: ["lieferbeginn", "wunschlieferbeginn"],
  bemerkung: ["bemerkung", "bemerkungen", "notiz", "hinweis"],
};
const csvSchluessel = (t) => String(t || "").replace(/^﻿/, "").toLowerCase().replace(/\s*\(.*?\)\s*/g, " ").replace(/\s+/g, " ").trim();

/* Vorlage mit zwei Beispielzeilen (Strom und Erdgas desselben Kunden) */
function kundeCsvVorlage() {
  const feld = (t) => (/[;"\n]/.test(t) ? '"' + String(t).replace(/"/g, '""') + '"' : t);
  const zeilen = [KUNDE_CSV_SPALTEN.map((s) => s[1]), KUNDE_CSV_SPALTEN.map((s) => s[2] || ""), KUNDE_CSV_SPALTEN.map((s) => s[3] || "")];
  const text = "\ufeff" + zeilen.map((z) => z.map(feld).join(";")).join("\r\n") + "\r\n";
  const bytes = new TextEncoder().encode(text);
  let bin = ""; bytes.forEach((b) => { bin += String.fromCharCode(b); });
  return { name: "EGC_Kunde_anlegen_Vorlage.csv", typ: "text/csv", groesse: bytes.length, url: "data:text/csv;base64," + btoa(bin) };
}

/* Datum: 31.12.2026, 31.12.26 oder 2026-12-31 → ISO */
function csvDatum(t) {
  const s = String(t || "").trim();
  let m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2}|\d{4})$/);
  if (m) {
    const j = m[3].length === 2 ? "20" + m[3] : m[3];
    const iso = j + "-" + m[2].padStart(2, "0") + "-" + m[1].padStart(2, "0");
    return isNaN(new Date(iso + "T12:00:00")) ? null : iso;
  }
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? m[0] : null;
}
/* kWh: „42.380“ ist hier immer eine Tausenderzahl, kein Komma (Zählerstände sind ganze kWh) */
function csvKwh(t) {
  const s = String(t || "").replace(/\s|kwh/gi, "");
  if (!s) return NaN;
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) return zahlLesen(s.replace(/\./g, ""));
  return zahlLesen(s);
}
function csvProdukt(t) {
  const s = String(t || "").trim().toLowerCase();
  if (!s) return null;
  if (s.startsWith("spot")) return "Spotmarkt";
  if (s.startsWith("fest")) return "Festpreis";
  if (s.startsWith("tranche")) return "Tranchenmodell";
  if (s.startsWith("ppa")) return "PPA-Modell";
  if (s.includes("empfehl")) return EMPFEHLUNG;
  return undefined;
}

/* Tabelle (Zeilen inkl. Kopfzeile) → vorausgefüllte Anfrage und Hinweise für den Vertriebspartner */
function kundeAusTabelle(zeilen, basis) {
  const hinweise = [];
  if (!zeilen || zeilen.length < 2) throw new Error("Die Datei enthält keine Daten. In der ersten Zeile stehen die Spaltennamen, darunter die Lieferstellen.");
  const kopf = zeilen[0].map(csvSchluessel);
  const idx = {};
  KUNDE_CSV_SPALTEN.forEach(([k, titel]) => { idx[k] = kopf.indexOf(csvSchluessel(titel)); });
  Object.entries(KUNDE_CSV_ALIAS).forEach(([k, al]) => {
    if (idx[k] >= 0) return;
    const i = kopf.findIndex((h, n) => al.includes(h) && !Object.values(idx).includes(n));
    if (i >= 0) idx[k] = i;
  });
  if (idx.firma < 0) throw new Error("Keine Spalte „Firma“ gefunden. Bitte die Vorlage verwenden; die erste Zeile muss die Spaltennamen enthalten.");
  const unbekannt = zeilen[0].filter((h, n) => String(h || "").trim() && !Object.values(idx).includes(n));
  if (unbekannt.length) hinweise.push("Nicht übernommen (Spalte unbekannt): " + unbekannt.join(", "));
  const w = (z, k) => (idx[k] >= 0 ? String(z[idx[k]] === undefined ? "" : z[idx[k]]).trim() : "");
  const daten = zeilen.slice(1).filter((z) => z.some((x) => String(x || "").trim()));
  const erste = daten.find((z) => w(z, "firma"));
  if (!erste) throw new Error("In der Spalte „Firma“ steht kein Name.");
  const firmen = [...new Set(daten.map((z) => w(z, "firma")).filter(Boolean))];
  if (firmen.length > 1) throw new Error("Die Datei enthält mehrere Kunden (" + firmen.join(", ") + "). Bitte je Kunde eine eigene Datei hochladen.");
  if (firmen[0] === KUNDE_CSV_BEISPIEL) hinweise.push("Das sind noch die Beispieldaten aus der Vorlage. Bitte die Daten des Kunden eintragen.");

  const kunde = { ...basis.kunde };
  /* Excel macht aus langen Nummern gern „5,12389E+10“ und streicht führende Nullen */
  const exp = daten.some((z) => ["maloId", "zaehlernummer", "kundennummer", "meloId"].some((k) => /\d[.,]?\d*e\+\d+$/i.test(w(z, k))));
  if (exp) hinweise.push("Excel hat lange Nummern verkürzt (zum Beispiel „5,12389E+10“). Bitte MaLo, Zählernummer und Kundennummer prüfen; in Excel die Spalten vorher als „Text“ formatieren.");
  ["firma", "strasse", "plz", "ort", "ansprechpartner", "telefon", "email", "branche", "steuernummer"].forEach((k) => {
    if (w(erste, k)) kunde[k] = w(erste, k);
  });
  if (/^\d{4}$/.test(kunde.plz)) { kunde.plz = "0" + kunde.plz; hinweise.push("PLZ um die führende Null ergänzt: " + kunde.plz + "."); }

  const lieferstellen = [];
  daten.forEach((z, n) => {
    const zeile = "Zeile " + (zeilen.indexOf(z) + 1);
    const hat = ["versorger", "kundennummer", "zaehlernummer", "maloId", "meloId", "verbrauch", "bezeichnung", "sparte", "lStrasse"].some((k) => w(z, k));
    if (!hat) return;
    const sp = w(z, "sparte").toLowerCase();
    const medium = /gas/.test(sp) ? "gas" : "strom";
    if (sp && !/gas|strom/.test(sp)) hinweise.push(zeile + ": Sparte „" + w(z, "sparte") + "“ unbekannt, als Strom übernommen.");
    const l = { ...leereLieferstelle(medium) };
    l.bezeichnung = w(z, "bezeichnung");
    const eigene = w(z, "lStrasse") || w(z, "lPlz") || w(z, "lOrt");
    if (eigene) {
      l.strasse = w(z, "lStrasse"); l.plz = w(z, "lPlz").replace(/^(\d{4})$/, "0$1"); l.ort = w(z, "lOrt");
      l.adresseVon = l.strasse === kunde.strasse && l.plz === kunde.plz && l.ort === kunde.ort ? "kunde" : "manuell";
    } else {
      l.adresseVon = "kunde"; l.strasse = kunde.strasse; l.plz = kunde.plz; l.ort = kunde.ort;
    }
    l.versorger = w(z, "versorger"); l.versorgerVon = "manuell";
    l.kundennummer = w(z, "kundennummer");
    l.zaehlernummer = w(z, "zaehlernummer");
    l.maloId = w(z, "maloId").replace(/\s/g, "");
    if (l.maloId && !/^\d{11}$/.test(l.maloId)) hinweise.push(zeile + ": Die MaLo „" + l.maloId + "“ hat nicht 11 Ziffern. Bitte prüfen.");
    l.meloId = w(z, "meloId").replace(/\s/g, "").toUpperCase();
    if (l.meloId && !/^DE[0-9A-Z]{31}$/.test(l.meloId)) hinweise.push(zeile + ": Die MeLo „" + l.meloId + "“ hat nicht das übliche Format (DE und 31 Zeichen). Bitte prüfen.");
    if (w(z, "verbrauch")) {
      const v = csvKwh(w(z, "verbrauch"));
      if (isNaN(v) || v <= 0) hinweise.push(zeile + ": Jahresverbrauch „" + w(z, "verbrauch") + "“ nicht lesbar.");
      else l.verbrauch = String(Math.round(v));
    }
    const za = w(z, "zaehlerart").toUpperCase();
    if (za === "RLM" || za === "SLP") l.zaehlerart = za;
    else if (za) hinweise.push(zeile + ": Zählerart „" + w(z, "zaehlerart") + "“ unbekannt, SLP übernommen.");
    if (w(z, "vertragsendeAlt")) {
      const d = csvDatum(w(z, "vertragsendeAlt"));
      if (d) l.vertragsendeAlt = d; else hinweise.push(zeile + ": Datum „" + w(z, "vertragsendeAlt") + "“ bei „Vertrag läuft bis“ nicht lesbar.");
    }
    l.kuendigungsfrist = w(z, "kuendigungsfrist");
    lieferstellen.push(l);
  });
  if (!lieferstellen.length) hinweise.push("Keine Lieferstelle in der Datei. Bitte im Schritt „Lieferstellen“ ergänzen.");

  const neu = { ...basis, kunde, lieferstellen: lieferstellen.length ? lieferstellen : basis.lieferstellen };
  const ersterWert = (k) => { const z = daten.find((x) => w(x, k)); return z ? w(z, k) : ""; };
  [["produkt", "Produkt Strom"], ["produktGas", "Produkt Erdgas"]].forEach(([k, titel]) => {
    const roh = ersterWert(k); const p = csvProdukt(roh);
    if (p) neu[k] = p; else if (p === undefined) hinweise.push(titel + " „" + roh + "“ unbekannt, Festpreis übernommen.");
  });
  if (ersterWert("laufzeit")) {
    const roh = ersterWert("laufzeit"); const n = parseInt(roh, 10);
    const monate = /jahr/i.test(roh) ? n * 12 : n;
    if (monate > 0 && monate <= 120) { neu.laufzeit = monate; neu.laufzeitArt = "monate"; }
    else hinweise.push("Laufzeit „" + roh + "“ nicht lesbar.");
  }
  if (ersterWert("wunschLieferbeginn")) {
    const d = csvDatum(ersterWert("wunschLieferbeginn"));
    if (d) { neu.wunschLieferbeginn = d; neu.lieferbeginnVon = "manuell"; }
    else hinweise.push("Lieferbeginn „" + ersterWert("wunschLieferbeginn") + "“ nicht lesbar.");
  }
  if (ersterWert("bemerkung")) {
    const b = daten.map((z) => w(z, "bemerkung")).filter(Boolean).join("\n");
    neu.bemerkungVertrieb = [basis.bemerkungVertrieb, b].filter(Boolean).join("\n");
  }
  return { anfrage: neu, hinweise };
}

function Assistent({ user, mitarbeiter, alleAnfragen, tippgeber, entwurf, onSpeichern, onSenden, onAbbrechen }) {
  const [a, setA] = useState(entwurf || leereAnfrage(user));
  const [schritt, setSchritt] = useState(1);
  const [geprueft, setGeprueft] = useState(false);
  const [csv, setCsv] = useState(null); /* { name, hinweise, fehler, laedt } nach dem Hochladen einer Kundendatei */
  const kundeEinlesen = (file) => {
    if (!file) return;
    const vorhanden = a.kunde.firma || a.lieferstellen.some((l) => l.versorger || l.zaehlernummer || l.maloId || l.verbrauch);
    if (vorhanden && !window.confirm("Die bisher eingetragenen Kunden- und Lieferstellendaten werden durch die Datei ersetzt. Fortfahren?")) return;
    setCsv({ name: file.name, laedt: true, hinweise: [] });
    dateiLesen(file, async (d) => {
      try {
        const zeilen = /\.xlsx?$/i.test(file.name) ? await xlsxLesen(d) : await csvLesen(d);
        const { anfrage, hinweise } = kundeAusTabelle(zeilen, a);
        setA(anfrage);
        setGeprueft(true); /* fehlende Pflichtfelder sofort rot markieren */
        setCsv({ name: file.name, hinweise, ls: anfrage.lieferstellen.length, firma: anfrage.kunde.firma });
      } catch (e) {
        setCsv({ name: file.name, fehler: (e && e.message) || "Die Datei konnte nicht gelesen werden.", hinweise: [] });
      }
    });
  };

  const setK = (k, v) =>
    setA((z) => {
      const kunde = { ...z.kunde, [k]: v };
      /* Lieferstellen, die die Kundenanschrift übernehmen, ziehen automatisch mit */
      const lieferstellen = ["strasse", "plz", "ort"].includes(k)
        ? z.lieferstellen.map((l) => (l.adresseVon === "kunde" ? { ...l, [k]: v } : l))
        : z.lieferstellen;
      return { ...z, kunde, lieferstellen };
    });
  const setL = (id, k, v) =>
    setA((z) => ({ ...z, lieferstellen: z.lieferstellen.map((l) => (l.id === id ? { ...l, [k]: v } : l)) }));
  /* Lieferbeginn folgt dem Vertragsende, solange er nicht von Hand geändert wurde */
  const autoBeginn = lieferbeginnAusVertrag(a);
  useEffect(() => {
    if (autoBeginn && a.lieferbeginnVon !== "manuell" && a.wunschLieferbeginn !== autoBeginn.beginn)
      setA((z) => ({ ...z, wunschLieferbeginn: autoBeginn.beginn }));
  }, [autoBeginn && autoBeginn.beginn, a.lieferbeginnVon]);
  const adresseSetzen = (id, quelle) => {
    setA((v) => ({
      ...v,
      lieferstellen: v.lieferstellen.map((l) => {
        if (l.id !== id) return l;
        if (quelle === "manuell") return { ...l, adresseVon: "manuell" };
        const q = quelle === "kunde" ? v.kunde : v.lieferstellen.find((x) => x.id === quelle);
        if (!q) return { ...l, adresseVon: "manuell" };
        return { ...l, adresseVon: quelle, strasse: q.strasse || "", plz: q.plz || "", ort: q.ort || "" };
      }),
    }));
  };

  const versorgerSetzen = (id, quelle) => {
    setA((v) => ({
      ...v,
      lieferstellen: v.lieferstellen.map((l) => {
        if (l.id !== id) return l;
        if (quelle === "manuell") return { ...l, versorgerVon: "manuell" };
        const q = v.lieferstellen.find((x) => x.id === quelle);
        if (!q) return { ...l, versorgerVon: "manuell" };
        return { ...l, versorgerVon: quelle, versorger: q.versorger || "", kundennummer: q.kundennummer || "" };
      }),
    }));
  };

  const addL = (medium) =>
    setA((z) => ({
      ...z,
      lieferstellen: [...z.lieferstellen,
        { ...leereLieferstelle(medium), adresseVon: "kunde",
          strasse: z.kunde.strasse, plz: z.kunde.plz, ort: z.kunde.ort }],
    }));
  const delL = (id) =>
    setA((z) => ({ ...z, lieferstellen: z.lieferstellen.filter((l) => l.id !== id) }));

  const luecken = useMemo(() => {
    const f = [];
    if (!a.kunde.firma) f.push("Firmenname");
    if (!a.kunde.strasse || !a.kunde.plz || !a.kunde.ort) f.push("Kundenanschrift");
    if (!a.kunde.ansprechpartner) f.push("Ansprechpartner");
    a.lieferstellen.forEach((l, i) => {
      const n = (l.bezeichnung || "Lieferstelle " + (i + 1)) + ": ";
      if (!l.neueinzug && !l.versorger) f.push(n + "Versorger");
      if (!l.maloId) f.push(n + "Marktlokations-ID");
      if (!l.verbrauch) f.push(n + "Jahresverbrauch");
      if (l.zaehlerart === "RLM" && !l.lastgang) f.push(n + "Lastgang");
      if (l.auslesung && !l.auslesung.bestaetigt) f.push(n + "aus der Abrechnung gelesene Daten bestätigen");
    });
    return f;
  }, [a]);

  /* Ohne diese Angaben ist ein Senden gesperrt */
  const sperren = useMemo(() => {
    const f = [];
    a.lieferstellen.forEach((l, i) => {
      const n = (l.bezeichnung || "Lieferstelle " + (i + 1)) + ": ";
      if (l.neueinzug && !l.gewerbeanmeldung) f.push(n + "Gewerbeanmeldung (Neueinzug)");
      if (l.neueinzug && !l.pachtvertrag) f.push(n + "Pachtvertrag (Neueinzug)");
      if (a.smartmeter && !l.meloId) f.push(n + "Messlokations-ID (MeLo-ID) für den Smartmeter");
    });
    if (a.wunschLieferbeginn && a.wunschLieferbeginn < fruehesterBeginn())
      f.push("Lieferbeginn frühestens am " + datum(fruehesterBeginn()));
    return f;
  }, [a]);

  const optionen = anlegenFuer(user, mitarbeiter);
  const stromStellen = a.lieferstellen.filter((l) => l.medium === "strom");
  const gasStellen = a.lieferstellen.filter((l) => l.medium === "gas");
  /* Wofür soll angeboten werden? Bestimmt, welche Lieferstellen gezeigt werden */
  const sparte = stromStellen.length && gasStellen.length ? "beide" : gasStellen.length ? "gas" : "strom";
  const brauchtSparte = (m) => sparte === "beide" || sparte === m;
  const leerL = (l) => !l.versorger && !l.zaehlernummer && !l.maloId && !l.verbrauch && !dateienVon(l.abrechnung).length;
  const sparteWaehlen = (neu) => {
    const behalten = (m) => neu === "beide" || neu === m;
    const weg = a.lieferstellen.filter((l) => !behalten(l.medium));
    if (weg.some((l) => !leerL(l)) && !window.confirm("Es gibt schon ausgefüllte " + (neu === "gas" ? "Strom" : "Erdgas")
      + "-Lieferstellen. Sollen sie entfernt werden?")) return;
    let ls = a.lieferstellen.filter((l) => behalten(l.medium));
    ["strom", "gas"].forEach((m) => {
      if (behalten(m) && !ls.some((l) => l.medium === m))
        ls = [...ls, { ...leereLieferstelle(m), adresseVon: "kunde", strasse: a.kunde.strasse, plz: a.kunde.plz, ort: a.kunde.ort }];
    });
    setA({ ...a, lieferstellen: ls });
  };

  const Schritte = ["Kunde", "Lieferstellen", "Angebotswunsch", "Prüfen & senden"];
  /* fehlende Pflichtangaben je Schritt (für die rote Zahl am Reiter) */
  const imKunden = luecken.filter((f) => ["Firmenname", "Kundenanschrift", "Ansprechpartner"].includes(f)).length;
  const fehltIn = [imKunden, luecken.length - imKunden, 0, luecken.length];

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <h2 className="text-lg" style={{ letterSpacing: "-0.01em" }}>
          {entwurf ? "Anfrage " + a.id + " ergänzen" : "Neue Angebotsanfrage"}
        </h2>
      </div>

      <div className="flex flex-wrap gap-1 mb-6">
        {Schritte.map((s, i) => (
          <button
            key={s}
            onClick={() => setSchritt(i + 1)}
            className="px-3 py-1.5 text-sm rounded"
            style={{
              background: schritt === i + 1 ? C.ink : "transparent",
              color: schritt === i + 1 ? "#fff" : C.muted,
              border: "1px solid " + (schritt === i + 1 ? C.ink : C.line),
            }}
          >
            {i + 1}. {s}
            {geprueft && fehltIn[i] > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center rounded-full text-xs"
                style={{ background: C.warn, color: "#fff", minWidth: 18, height: 18, padding: "0 5px" }}
                title="fehlende Pflichtangaben">{fehltIn[i]}</span>
            )}
          </button>
        ))}
      </div>

      {a.fehlend && a.fehlend.length > 0 && (
        <div className="mb-5 p-4 rounded" style={{ background: "#FCF3F0", border: "1px solid " + C.warn }}>
          <div className="flex items-center gap-2 mb-2" style={{ color: C.warn }}>
            <AlertTriangle size={15} />
            <span className="text-sm">Die Kalkulation benötigt noch folgende Angaben</span>
          </div>
          <ul className="text-sm ml-6 list-disc" style={{ color: C.text }}>
            {a.fehlend.map((f) => <li key={f}>{f}</li>)}
          </ul>
          {a.fehlendText && <p className="text-sm mt-2 ml-6" style={{ color: C.muted }}>{a.fehlendText}</p>}
        </div>
      )}

      <div className="rounded p-5" style={{ background: C.card, border: "1px solid " + C.line }}>
        {schritt === 1 && (
          <div className="grid sm:grid-cols-2 gap-4">
            {!entwurf && (
              <div className="sm:col-span-2 p-4 rounded" style={{ background: "#F6F8FA", border: "1px solid " + C.line }}>
                <div className="flex items-center gap-2 text-sm"><Upload size={15} /> Kunde aus einer Datei übernehmen (freiwillig)</div>
                <p className="text-xs mt-1" style={{ color: C.muted }}>
                  Vorlage laden, Kunde und Lieferstellen eintragen (eine Zeile je Lieferstelle) und als CSV hochladen.
                  Das Portal füllt die Anfrage aus; du prüfst sie danach und lädst je Lieferstelle die Rechnung hoch.
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <Btn variante="hell" icon={FileText} onClick={() => dateiLaden(kundeCsvVorlage())}>Vorlage herunterladen (CSV)</Btn>
                  <label className="inline-flex items-center gap-2 px-3 py-2 rounded text-sm cursor-pointer"
                    style={{ background: C.ink, color: "#fff" }}>
                    <Upload size={14} /> Datei hochladen
                    <input type="file" className="hidden" accept=".csv,.txt,.xlsx,text/csv,text/plain,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                      onChange={(e) => { const f = e.target.files && e.target.files[0]; e.target.value = ""; kundeEinlesen(f); }} />
                  </label>
                </div>
                {csv && csv.laedt && <p className="text-sm mt-3" style={{ color: C.muted }}>„{csv.name}“ wird gelesen …</p>}
                {csv && csv.fehler && (
                  <div className="mt-3 p-3 rounded text-sm" style={{ background: "#FCF3F0", border: "1px solid " + C.warn, color: C.text }}>
                    <span style={{ color: C.warn }}>„{csv.name}“ konnte nicht übernommen werden.</span> {csv.fehler}
                  </div>
                )}
                {csv && csv.firma && (
                  <div className="mt-3 p-3 rounded text-sm" style={{ background: "#F1F7F0", border: "1px solid " + C.ok, color: C.text }}>
                    <div style={{ color: C.ok }}><Check size={14} className="inline mr-1" />Übernommen: {csv.firma} mit {csv.ls} {csv.ls === 1 ? "Lieferstelle" : "Lieferstellen"}.</div>
                    <div className="text-xs mt-1" style={{ color: C.muted }}>Bitte alle Schritte durchsehen und je Lieferstelle die Rechnung hochladen.</div>
                    {luecken.length > 0 ? (
                      <div className="mt-2 p-2 rounded text-xs" style={{ background: "#FCF3F0", border: "1px solid " + C.warn }}>
                        <div style={{ color: C.warn }}><AlertTriangle size={12} className="inline mr-1" />Noch auszufüllen (in den Schritten rot markiert):</div>
                        <ul className="ml-4 mt-1 list-disc" style={{ color: C.text }}>{luecken.map((f) => <li key={f}>{f}</li>)}</ul>
                      </div>
                    ) : (
                      <div className="text-xs mt-2" style={{ color: C.ok }}>Alle Pflichtangaben sind ausgefüllt.</div>
                    )}
                    {csv.hinweise.length > 0 && (
                      <ul className="text-xs mt-2 ml-4 list-disc" style={{ color: C.warn }}>{csv.hinweise.map((h, i) => <li key={i}>{h}</li>)}</ul>
                    )}
                  </div>
                )}
              </div>
            )}
            {optionen.length > 1 && (
              <div className="sm:col-span-2 p-3 rounded" style={{ background: "#F6F8FA", border: "1px solid " + C.line }}>
                <Select label="Kunde anlegen für" value={a.partnerId}
                  onChange={(v) => {
                    const m = optionen.find((o) => o.id === v);
                    setA({ ...a, partnerId: m.id, partnerName: m.name, team: m.team });
                  }}
                  options={optionen.map((o) => ({
                    value: o.id,
                    label: o.id === user.id ? o.name + " (für mich)" : o.name + " · " + o.rolle,
                  }))} />
                <p className="text-xs mt-2" style={{ color: C.muted }}>
                  Der Kunde wird diesem Vertriebspartner zugeordnet. Provision und Struktur richten sich danach.
                </p>
              </div>
            )}
            <p className="sm:col-span-2 text-xs" style={{ color: C.muted }}>Felder mit * braucht die Kalkulation für ein Angebot.</p>
            <Feld label="Firma / Kunde *" value={a.kunde.firma} onChange={(v) => setK("firma", v)}
              placeholder="Musterbetrieb GmbH" fehler={geprueft && !a.kunde.firma} breit />
            <Feld label="Straße und Hausnummer *" value={a.kunde.strasse} onChange={(v) => setK("strasse", v)}
              fehler={geprueft && !a.kunde.strasse} breit />
            <Feld label="PLZ *" value={a.kunde.plz} onChange={(v) => setK("plz", v)} fehler={geprueft && !a.kunde.plz} />
            <Feld label="Ort *" value={a.kunde.ort} onChange={(v) => setK("ort", v)} fehler={geprueft && !a.kunde.ort} />
            <Feld label="Ansprechpartner *" value={a.kunde.ansprechpartner}
              onChange={(v) => setK("ansprechpartner", v)} fehler={geprueft && !a.kunde.ansprechpartner} />
            <Feld label="Telefon" value={a.kunde.telefon} onChange={(v) => setK("telefon", v)} />
            <Feld label="E-Mail" value={a.kunde.email} onChange={(v) => setK("email", v)} breit />
            <div className="sm:col-span-2 p-4 rounded"
                 style={{ background: "#F6F8FA", border: "1px solid " + C.line }}>
              <span className="block text-xs mb-2" style={{ color: C.muted }}>Wie kam der Kunde zustande?</span>
              <div className="flex flex-wrap gap-2 mb-4">
                {AKQUISE_ART.map((x) => (
                  <button key={x.value} onClick={() => setA({ ...a, akquiseArt: x.value })}
                    className="px-3 py-2 rounded text-sm text-left"
                    style={{
                      background: a.akquiseArt === x.value ? C.ink : "#fff",
                      color: a.akquiseArt === x.value ? "#fff" : C.text,
                      border: "1px solid " + (a.akquiseArt === x.value ? C.ink : C.line),
                    }}>
                    {x.label}
                    <span className="block text-xs mt-0.5"
                          style={{ color: a.akquiseArt === x.value ? "#8B9BB0" : C.muted }}>
                      {x.text}
                    </span>
                  </button>
                ))}
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <Select label="Herkunft des Kunden" value={a.herkunft || "Eigenes Netzwerk"}
                  onChange={(v) => setA({ ...a, herkunft: v,
                    ...(v !== "Tippgeber" ? { tippgeberId: null, tippgeber: null } : {}) })}
                  options={HERKUNFT} />
                {a.herkunft === "Tippgeber" ? (
                  tippgeberFuer(tippgeber, user.id, user.rolle === "Geschäftsführung").length > 0 ? (
                    <Select label="Welcher Tippgeber?" value={a.tippgeberId || ""}
                      onChange={(v) => {
                        const t = (tippgeber || []).find((x) => x.id === v);
                        setA({ ...a, tippgeberId: v || null, tippgeber: tippgeberMomentaufnahme(t, user.id),
                               herkunftDetail: t ? (t.firma || t.name) : "" });
                      }}
                      options={[{ value: "", label: "Bitte wählen" },
                        ...tippgeberFuer(tippgeber, user.id, user.rolle === "Geschäftsführung")
                          .map((t) => ({ value: t.id, label: t.firma || t.name }))]} />
                  ) : (
                    <div>
                      <Feld label="Name des Tippgebers" value={a.herkunftDetail || ""}
                        onChange={(v) => setA({ ...a, herkunftDetail: v })} />
                      <p className="text-xs mt-1" style={{ color: C.muted }}>
                        Lege deine Tippgeber unter „Tippgeber" an. Nach der Freigabe durch die
                        Geschäftsführung rechnet das Portal deren Vergütung automatisch mit.
                      </p>
                    </div>
                  )
                ) : (
                  <Feld
                    label={a.herkunft === "Veranstaltung" ? "Welche Veranstaltung?"
                      : a.herkunft === "Netzwerk" ? "Welches Netzwerk?"
                      : "Nähere Angabe"}
                    value={a.herkunftDetail || ""} onChange={(v) => setA({ ...a, herkunftDetail: v })} />
                )}
              </div>
            </div>

            <details className="sm:col-span-2 rounded" style={{ border: "1px solid " + C.line }}
              open={!!(a.kunde.branche || a.kunde.steuernummer)}>
              <summary className="px-4 py-3 text-sm cursor-pointer" style={{ color: C.text }}>
                Weitere Angaben (freiwillig): Branche, Steuernummer
              </summary>
              <div className="px-4 pb-4 grid gap-4">
                <div>
                  <Feld label="Branche" value={a.kunde.branche || ""} onChange={(v) => setK("branche", v)}
                    placeholder="z. B. Hotellerie, Metallverarbeitung, Pflege" breit />
                  <p className="text-xs mt-1" style={{ color: C.muted }}>
                    Hilft der Kalkulation sehr: nicht jeder Versorger nimmt jede Branche.
                  </p>
                </div>
                <div>
                  <Feld label="Steuernummer oder USt-IdNr." value={a.kunde.steuernummer || ""} onChange={(v) => setK("steuernummer", v)}
                    placeholder="z. B. DE123456789 oder 12/345/67890" />
                  <p className="text-xs mt-1" style={{ color: C.muted }}>Manche Versorger verlangen sie auf der Vollmacht; sie wird dort mit eingedruckt.</p>
                </div>
              </div>
            </details>
          </div>
        )}

        {schritt === 2 && (
          <div className="space-y-6">
            <div>
              <span className="block text-sm mb-2">Wofür soll angeboten werden?</span>
              <div className="grid grid-cols-3 gap-2">
                {[["strom", "Strom", Zap, C.strom], ["gas", "Erdgas", Flame, C.gas], ["beide", "Strom und Erdgas", Layers, C.ink]].map(([w, t, Icon, farbe]) => (
                  <button key={w} onClick={() => sparte !== w && sparteWaehlen(w)}
                    className="flex flex-col items-center justify-center gap-1 px-2 py-3 rounded text-sm"
                    style={{ background: sparte === w ? farbe : "#fff", color: sparte === w ? "#fff" : C.text,
                             border: "2px solid " + (sparte === w ? farbe : C.line), minHeight: 64 }}>
                    <Icon size={18} /> {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="p-4 rounded"
                 style={{ background: a.smartmeter ? "#F1F7F0" : "#F6F8FA", border: "1px solid " + (a.smartmeter ? C.ok : C.line) }}>
              <label className="flex items-start gap-3 text-sm">
                <input type="checkbox" className="mt-0.5" checked={!!a.smartmeter}
                  onChange={(e) => setA({ ...a, smartmeter: e.target.checked })} style={{ accentColor: C.ok }} />
                <span>
                  Smartmeter gewünscht
                  <span className="block text-xs mt-0.5" style={{ color: C.muted }}>
                    Das Angebot bekommt ein Smartmeter-Angebot dazu. Du brauchst je Lieferstelle die MeLo-ID von der Abrechnung.
                  </span>
                  {a.smartmeter && (
                    <span className="block text-xs mt-1" style={{ color: C.muted }}>
                      Für das Kundengespräch: EGC Energie baut keine Smartmeter ein. Einbau und Betrieb übernimmt ein
                      zugelassener Smartmeter-Messstellenbetreiber; er ersetzt den bisherigen und regelt den Wechsel selbst.
                    </span>
                  )}
                </span>
              </label>
            </div>
            <div className="p-4 rounded"
                 style={{ background: a.lieferstellenListe ? "#F1F5FA" : "#F6F8FA",
                          border: "1px solid " + (a.lieferstellenListe ? C.strom : C.line) }}>
              <label className="flex items-start gap-3 text-sm">
                <input type="checkbox" className="mt-0.5" checked={!!a.lieferstellenListe}
                  onChange={(e) => setA({ ...a, lieferstellenListe: e.target.checked,
                    lieferstellenDatei: e.target.checked ? a.lieferstellenDatei : null })}
                  style={{ accentColor: C.strom }} />
                <span>
                  Lieferstellenliste hochladen
                  <span className="block text-xs mt-0.5" style={{ color: C.muted }}>
                    Bei vielen Lieferstellen statt Einzeleingabe (Vorlage unter Unterlagen → Dokumente).
                  </span>
                </span>
              </label>
              {a.lieferstellenListe && (
                <div className="mt-4">
                  <Datei mehrere label="Lieferstellenliste (Excel oder CSV)" datei={a.lieferstellenDatei}
                    onSet={(f) => setA({ ...a, lieferstellenDatei: f })} hinweis="Datei auswählen" />
                  <p className="text-xs mt-2" style={{ color: C.muted }}>
                    Freiwillig. Erfasse unten trotzdem mindestens eine Lieferstelle, damit Menge und
                    Zählerart für die Kalkulation vorliegen.
                  </p>
                </div>
              )}
            </div>
            {[
              { medium: "strom", titel: "Strom", stellen: stromStellen },
              { medium: "gas", titel: "Erdgas", stellen: gasStellen },
            ].filter(({ medium }) => brauchtSparte(medium)).map(({ medium, titel, stellen }) => (
              <div key={medium}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <MediumIcon medium={medium} size={16} />
                    <span className="text-sm">{titel}</span>
                    <span className="text-xs" style={{ color: C.muted }}>
                      {stellen.length} Lieferstelle{stellen.length === 1 ? "" : "n"}
                    </span>
                  </div>
                  <button
                    onClick={() => addL(medium)}
                    className="inline-flex items-center gap-1 text-sm"
                    style={{ color: medium === "strom" ? C.strom : C.gas }}
                  >
                    <Plus size={14} /> Lieferstelle hinzufügen
                  </button>
                </div>

                {stellen.length === 0 && (
                  <p className="text-sm mb-3 px-3 py-3 rounded"
                     style={{ color: C.muted, border: "1px dashed " + C.line }}>
                    Noch keine {titel}-Lieferstelle erfasst.
                  </p>
                )}

                <div className="space-y-4">
                  {stellen.map((l, i) => (
                    <div key={l.id} className="rounded overflow-hidden" style={{ border: "1px solid " + C.line }}>
                      <div className="flex items-center justify-between px-4 py-2"
                        style={{ background: "#F7F9F8", borderBottom: "1px solid " + C.line,
                                 borderLeft: "3px solid " + (medium === "strom" ? C.strom : C.gas) }}>
                        <span className="text-sm">{l.bezeichnung || titel + "-Lieferstelle " + (i + 1)}</span>
                        {a.lieferstellen.length > 1 && (
                          <button onClick={() => delL(l.id)} style={{ color: C.muted }}><Trash2 size={14} /></button>
                        )}
                      </div>
                      <div className="p-4 grid sm:grid-cols-2 gap-4">
                        {/* Rechnung zuerst: bei einer PDF-Rechnung liest das Portal Zählernummer, MaLo und Verbrauch selbst */}
                        {!l.neueinzug && (
                          <div className="sm:col-span-2 p-3 rounded space-y-3"
                               style={{ background: "#EEF6E8", border: "1px solid " + C.ok }}>
                            <div className="text-sm">Am schnellsten: letzte Versorgerabrechnung hochladen</div>
                            <p className="text-xs" style={{ color: C.muted }}>
                              Bei einer PDF-Rechnung liest das Portal Zählernummer, MaLo, Versorger und Verbrauch aus. Du prüfst nur noch.
                            </p>
                            <Datei mehrere label="Versorgerabrechnung (PDF oder Foto)" datei={l.abrechnung} annehmen="application/pdf,image/*"
                              onSet={(f) => setL(l.id, "abrechnung", f)} hinweis="PDF oder Foto hochladen" />
                            <AbrechnungAuslesen l={l} setL={setL} user={user} />
                            <div className="sm:w-1/2">
                              <Select label="Abrechnung aus dem Jahr" value={l.abrechnungJahr || ""}
                                onChange={(v) => setL(l.id, "abrechnungJahr", v)}
                                options={[{ value: "", label: "bitte wählen" }, { value: "2025", label: "2025" },
                                          { value: "2026", label: "2026" }, { value: "2027", label: "2027" }]} />
                            </div>
                          </div>
                        )}
                        <Feld label="Bezeichnung" value={l.bezeichnung}
                          onChange={(v) => setL(l.id, "bezeichnung", v)} placeholder="Haupthaus, Werk 1 …" />
                        <div />

                        <div className="sm:col-span-2 p-3 rounded"
                             style={{ background: "#F6F8FA", border: "1px solid " + C.line }}>
                          {a.lieferstellen.indexOf(l) === 0 ? (
                            <label className="flex items-center gap-3 text-sm">
                              <input type="checkbox" checked={l.adresseVon === "kunde"}
                                onChange={(e) => adresseSetzen(l.id, e.target.checked ? "kunde" : "manuell")}
                                style={{ accentColor: C.ink }} />
                              Lieferadresse entspricht der Kundenanschrift
                            </label>
                          ) : (
                            <Select label="Lieferadresse übernehmen von" value={l.adresseVon || "manuell"}
                              onChange={(v) => adresseSetzen(l.id, v)}
                              options={[
                                { value: "kunde", label: "Kundenanschrift" },
                                ...a.lieferstellen
                                  .filter((x) => x.id !== l.id && (x.strasse || x.plz || x.ort))
                                  .map((x, i) => ({
                                    value: x.id,
                                    label: (x.bezeichnung || "Lieferstelle " + (i + 1)) + ": " +
                                           [x.strasse, x.plz, x.ort].filter(Boolean).join(" "),
                                  })),
                                { value: "manuell", label: "Andere Adresse eingeben" },
                              ]} />
                          )}
                        </div>

                        <Feld label="Straße und Hausnummer" value={l.strasse}
                          onChange={(v) => setL(l.id, "strasse", v)} breit
                          gesperrt={(l.adresseVon || "manuell") !== "manuell"} />
                        <Feld label="PLZ" value={l.plz} onChange={(v) => setL(l.id, "plz", v)}
                          gesperrt={(l.adresseVon || "manuell") !== "manuell"} />
                        <Feld label="Ort" value={l.ort} onChange={(v) => setL(l.id, "ort", v)}
                          gesperrt={(l.adresseVon || "manuell") !== "manuell"} />

                        <div className="sm:col-span-2 p-3 rounded"
                             style={{ background: l.neueinzug ? "#FDF6EE" : "#F6F8FA",
                                      border: "1px solid " + (l.neueinzug ? C.gas : C.line) }}>
                          <label className="flex items-center gap-3 text-sm">
                            <input type="checkbox" checked={!!l.neueinzug}
                              onChange={(e) => setL(l.id, "neueinzug", e.target.checked)}
                              style={{ accentColor: C.gas }} />
                            Neueinzug, es gibt keinen Vorversorger
                          </label>
                          {l.neueinzug && (
                            <div className="grid sm:grid-cols-2 gap-4 mt-3">
                              <Datei mehrere label="Gewerbeanmeldung – erforderlich" datei={l.gewerbeanmeldung}
                                onSet={(f) => setL(l.id, "gewerbeanmeldung", f)} hinweis="Datei auswählen" />
                              <Datei mehrere label="Pachtvertrag – erforderlich" datei={l.pachtvertrag}
                                onSet={(f) => setL(l.id, "pachtvertrag", f)} hinweis="Datei auswählen" />
                            </div>
                          )}
                        </div>

                        {!l.neueinzug && a.lieferstellen.indexOf(l) > 0 &&
                          a.lieferstellen.some((x) => x.id !== l.id && x.versorger) && (
                          <div className="sm:col-span-2 p-3 rounded"
                               style={{ background: "#F6F8FA", border: "1px solid " + C.line }}>
                            <Select label="Versorger und Kundennummer übernehmen von"
                              value={l.versorgerVon || "manuell"}
                              onChange={(v) => versorgerSetzen(l.id, v)}
                              options={[
                                ...a.lieferstellen
                                  .filter((x) => x.id !== l.id && x.versorger)
                                  .map((x, i) => ({
                                    value: x.id,
                                    label: (x.bezeichnung || "Lieferstelle " + (i + 1)) + ": " + x.versorger +
                                           (x.kundennummer ? " · " + x.kundennummer : ""),
                                  })),
                                { value: "manuell", label: "Neu eintragen" },
                              ]} />
                          </div>
                        )}

                        <Feld label="Aktueller Versorger *" value={l.neueinzug ? "" : l.versorger}
                          onChange={(v) => { setL(l.id, "versorger", v); setL(l.id, "versorgerVon", "manuell"); }}
                          gesperrt={!!l.neueinzug}
                          placeholder={l.neueinzug ? "entfällt bei Neueinzug" : ""}
                          fehler={geprueft && !l.neueinzug && !l.versorger} />
                        <Feld label="Kundennummer beim Versorger" value={l.neueinzug ? "" : (l.kundennummer || "")}
                          onChange={(v) => { setL(l.id, "kundennummer", v); setL(l.id, "versorgerVon", "manuell"); }}
                          gesperrt={!!l.neueinzug}
                          placeholder={l.neueinzug ? "entfällt bei Neueinzug" : ""} />
                        {!l.neueinzug && (
                          <>
                            <Feld label="Vertrag beim aktuellen Versorger läuft bis" type="date" value={l.vertragsendeAlt || ""}
                              onChange={(v) => setL(l.id, "vertragsendeAlt", v)} />
                            <Feld label="Kündigungsfrist" value={l.kuendigungsfrist || ""}
                              onChange={(v) => setL(l.id, "kuendigungsfrist", v)} placeholder="z. B. 3 Monate zum Vertragsende" />
                          </>
                        )}
                        <Feld label="Zählernummer" value={l.zaehlernummer}
                          onChange={(v) => setL(l.id, "zaehlernummer", v)} />
                        <Feld label="Marktlokations-ID (MaLo) *" value={l.maloId}
                          onChange={(v) => setL(l.id, "maloId", v)} placeholder="11-stellig"
                          fehler={geprueft && !l.maloId} />
                        {a.smartmeter && (
                          <Feld label="Messlokations-ID (MeLo-ID) * für den Smartmeter" value={l.meloId || ""}
                            onChange={(v) => setL(l.id, "meloId", v.replace(/\s/g, "").toUpperCase())}
                            placeholder="DE und 31 weitere Zeichen" fehler={geprueft && !l.meloId} />
                        )}
                        <Feld label="Jahresverbrauch in kWh *" value={l.verbrauch} zahl
                          onChange={(v) => setL(l.id, "verbrauch", v)}
                          fehler={geprueft && !l.verbrauch} />
                        <Select label="Zählerart" value={l.zaehlerart}
                          onChange={(v) => setL(l.id, "zaehlerart", v)} options={["SLP", "RLM"]} />
                        <div className="sm:col-span-2 p-3 rounded"
                             style={{ background: "#F6F8FA", border: "1px solid " + C.line }}>
                          <label className="flex items-center gap-3 text-sm">
                            <input type="checkbox" checked={!!l.zaehlerfotoVorhanden}
                              onChange={(e) => setL(l.id, "zaehlerfotoVorhanden", e.target.checked)}
                              style={{ accentColor: C.ink }} />
                            Zählerfoto vorhanden
                          </label>
                          {l.zaehlerfotoVorhanden && (
                            <div className="mt-3">
                              <Datei mehrere label="Foto des Zählers" datei={l.zaehlerfoto} bild
                                onSet={(f) => setL(l.id, "zaehlerfoto", f)} hinweis="Bild auswählen" />
                            </div>
                          )}
                        </div>
                        {l.zaehlerart === "RLM" && (
                          <div className="sm:col-span-2 p-3 rounded"
                               style={{ background: "#F7F9F8", border: "1px solid " + C.line }}>
                            <Datei mehrere
                              label="Lastgang / Lastprofil (Excel oder CSV) – bei RLM erforderlich"
                              datei={l.lastgang}
                              onSet={(f) => setL(l.id, "lastgang", f)}
                              hinweis="XLSX oder CSV hochladen"
                            />
                            <div className="mt-3 sm:w-1/2">
                              <Feld label="Lastspitze in kW (steht auf der Rechnung, falls bekannt)" value={l.lastspitze || ""}
                                onChange={(v) => setL(l.id, "lastspitze", v)} placeholder="z. B. 190" />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {schritt === 3 && (
          <div className="space-y-6">
            <div className="grid sm:grid-cols-2 gap-4">
              {stromStellen.length > 0 && (
                <Select label="Gewünschtes Produkt Strom" value={a.produkt}
                  onChange={(v) => setA({ ...a, produkt: v })} options={PRODUKTWUNSCH} />
              )}
              {gasStellen.length > 0 && (
                <Select label="Gewünschtes Produkt Erdgas" value={a.produktGas}
                  onChange={(v) => setA({ ...a, produktGas: v })} options={PRODUKTWUNSCH} />
              )}
            </div>

            {(a.produkt === EMPFEHLUNG || (gasStellen.length > 0 && a.produktGas === EMPFEHLUNG)) && (
              <div className="p-4 rounded" style={{ background: "#F6F8FA", border: "1px solid " + C.line }}>
                <label className="block">
                  <span className="block text-xs mb-1" style={{ color: C.muted }}>
                    Worum geht es dem Kunden? Hilft der Kalkulation bei der Empfehlung
                  </span>
                  <textarea rows={3} value={a.beratungHinweis || ""}
                    onChange={(e) => setA({ ...a, beratungHinweis: e.target.value })}
                    placeholder="z. B. Kunde will Planungssicherheit, ist aber offen für Spot bei deutlichem Preisvorteil"
                    className="w-full px-3 py-2 text-sm rounded outline-none"
                    style={{ border: "1px solid " + C.line }} />
                </label>
                <p className="text-xs mt-2" style={{ color: C.muted }}>
                  Die Kalkulation stimmt sich bei Bedarf mit der Geschäftsführung ab und schlägt
                  passende Varianten vor.
                </p>
              </div>
            )}

            <label className="flex items-start gap-3 text-sm p-3 rounded"
                   style={{ background: "#F6F8FA", border: "1px solid " + C.line }}>
              <input type="checkbox" className="mt-0.5" checked={a.vollmachtAnhaengen !== false}
                onChange={(e) => setA({ ...a, vollmachtAnhaengen: e.target.checked })}
                style={{ accentColor: C.ink, width: 18, height: 18 }} />
              <span>
                Service- & Beratungsauftrag (Vollmacht) an das Angebot anhängen
                <span className="block text-xs mt-0.5" style={{ color: C.muted }}>
                  Dann enthält das Angebots-PDF die Vollmacht mit Datenschutzseite zum Unterschreiben.
                </span>
              </span>
            </label>

            <div>
              <span className="block text-xs mb-2" style={{ color: C.muted }}>Vertragsdauer</span>
              <div className="flex gap-1 mb-4">
                {[["monate", "Laufzeit in Monaten"], ["ende", "festes Lieferende"]].map(([id, label]) => (
                  <button key={id} onClick={() => setA({ ...a, laufzeitArt: id })}
                    className="px-3 py-1.5 text-sm rounded"
                    style={{
                      background: a.laufzeitArt === id ? C.ink : "transparent",
                      color: a.laufzeitArt === id ? "#fff" : C.muted,
                      border: "1px solid " + (a.laufzeitArt === id ? C.ink : C.line),
                    }}>
                    {label}
                  </button>
                ))}
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <Feld label="Gewünschter Lieferbeginn" type="date" value={a.wunschLieferbeginn || ""}
                  min={fruehesterBeginn()}
                  fehler={!!a.wunschLieferbeginn && a.wunschLieferbeginn < fruehesterBeginn()}
                  onChange={(v) => setA({ ...a, wunschLieferbeginn: v, lieferbeginnVon: "manuell" })} />
                {a.laufzeitArt === "ende" ? (
                  <Feld label="Gewünschtes Lieferende" type="date" value={a.wunschLieferende || ""}
                    onChange={(v) => setA({ ...a, wunschLieferende: v })} />
                ) : (
                  <Select label="Gewünschte Vertragslaufzeit" value={String(a.laufzeit)}
                    onChange={(v) => setA({ ...a, laufzeit: parseInt(v) })}
                    options={LAUFZEITEN.map((l) => ({ value: String(l), label: l + " Monate" }))} />
                )}
              </div>
              <p className="text-xs mt-2"
                 style={{ color: a.wunschLieferbeginn && a.wunschLieferbeginn < fruehesterBeginn() ? C.warn : C.muted }}>
                Frühestmöglicher Lieferbeginn ist der {datum(fruehesterBeginn())}, es sind 14 Tage Vorlauf nötig.{" "}
                {a.laufzeitArt === "ende"
                  ? "Für Verträge, die unabhängig vom Beginn zu einem festen Datum enden, üblicherweise zum 31.12."
                  : "Der Lieferbeginn kann unterjährig liegen, die Laufzeit zählt ab diesem Tag."}
                {a.laufzeitArt === "ende" && a.wunschLieferbeginn && a.wunschLieferende
                  ? " Ergibt " + num(monateZwischen(a.wunschLieferbeginn, a.wunschLieferende) || 0) + " Monate."
                  : ""}
              </p>
              {autoBeginn && (
                <p className="text-xs mt-2" style={{ color: autoBeginn.verschieden ? C.gas : C.muted }}>
                  {a.lieferbeginnVon === "manuell" && a.wunschLieferbeginn !== autoBeginn.beginn ? (
                    <>
                      Von dir geändert. Nach dem Vertragsende ({datum(autoBeginn.ende)}) wäre der Lieferbeginn der {datum(autoBeginn.beginn)}.{" "}
                      <button className="underline" style={{ color: C.strom }}
                        onClick={() => setA({ ...a, wunschLieferbeginn: autoBeginn.beginn, lieferbeginnVon: "" })}>Wieder automatisch</button>
                    </>
                  ) : (
                    <>Automatisch gesetzt: ein Tag nach dem Vertragsende beim aktuellen Versorger ({datum(autoBeginn.ende)}).</>
                  )}
                  {autoBeginn.verschieden && " Achtung: Die Lieferstellen haben unterschiedliche Vertragsenden; maßgeblich ist hier das früheste. Bitte bei der Anfrage vermerken."}
                </p>
              )}
            </div>

            <div>
              <div className="flex items-end justify-between mb-3">
                <span className="text-xs" style={{ color: C.muted }}>Gewünschter Aufschlag</span>
                <span className="text-3xl" style={{ fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}>
                  {num(a.aufschlag, 3)}
                  <span className="text-sm ml-1" style={{ color: C.muted }}>ct/kWh</span>
                </span>
              </div>
              <input
                type="range" min="0" max="3" step="0.025" value={a.aufschlag}
                onChange={(e) => setA({ ...a, aufschlag: parseFloat(e.target.value) })}
                className="w-full" style={{ accentColor: C.ink }}
              />
              <div className="flex justify-between text-xs mt-1" style={{ color: C.muted }}>
                <span>0,000</span><span>1,500</span><span>3,000</span>
              </div>

              <div className="mt-4 p-4 rounded flex flex-wrap gap-8"
                   style={{ background: "#F6F8FA", border: "1px solid " + C.line }}>
                <div>
                  <div className="text-xs mb-1" style={{ color: C.muted }}>Gesamtmenge</div>
                  <div className="text-lg" style={{ fontVariantNumeric: "tabular-nums" }}>
                    {num(verbrauchGesamt(a))} kWh
                  </div>
                </div>
                <div>
                  <div className="text-xs mb-1" style={{ color: C.muted }}>
                    {istGFRolle(user) ? "Firmenanteil je Lieferjahr" : "Deine Provision je Lieferjahr"} ({num(eigenerSatzVon(user), 0)} %
                    {!istGFRolle(user) && (a.akquiseArt || "eigen") === "eigen" && BONUS_EIGENAKQUISE > 0
                      ? " + " + num(BONUS_EIGENAKQUISE, 0) + " % Bonus" : ""})
                  </div>
                  <div className="text-lg" style={{ fontVariantNumeric: "tabular-nums", color: C.ok }}>
                    {eur((verbrauchGesamt(a) * a.aufschlag *
                      (eigenerSatzVon(user) + (!istGFRolle(user) && (a.akquiseArt || "eigen") === "eigen" ? BONUS_EIGENAKQUISE : 0)))
                      / 10000)}
                  </div>
                </div>
              </div>
              <p className="text-xs mt-2" style={{ color: C.muted }}>
                Vorschau auf Basis deines Provisionssatzes und des eingetragenen Jahresverbrauchs. Verbindlich sind der bestätigte Aufschlag und die vom Versorger bestätigte Liefermenge; verbraucht der Kunde weniger, sinkt die Provision.
              </p>
            </div>
          </div>
        )}

        {schritt === 4 && (
          <div>
            <div className="grid sm:grid-cols-2 gap-x-8 gap-y-3 text-sm mb-5">
              <div><span style={{ color: C.muted }}>Kunde</span><div>{a.kunde.firma || "–"}</div></div>
              <div><span style={{ color: C.muted }}>Anschrift</span>
                <div>{[a.kunde.strasse, [a.kunde.plz, a.kunde.ort].filter(Boolean).join(" ")].filter(Boolean).join(", ") || "fehlt"}</div></div>
              <div><span style={{ color: C.muted }}>Produktwunsch</span>
                <div>
                  {stromStellen.length > 0 ? "Strom: " + a.produkt : ""}
                  {stromStellen.length > 0 && gasStellen.length > 0 ? " · " : ""}
                  {gasStellen.length > 0 ? "Erdgas: " + a.produktGas : ""}
                </div></div>
              <div><span style={{ color: C.muted }}>Vertragsdauer</span>
                <div>{a.laufzeitArt === "ende"
                  ? "bis " + (a.wunschLieferende ? datum(a.wunschLieferende) : "offen")
                  : a.laufzeit + " Monate"}</div></div>
              <div><span style={{ color: C.muted }}>Wunsch-Lieferbeginn</span>
                <div>{a.wunschLieferbeginn ? datum(a.wunschLieferbeginn) : "offen"}</div></div>
              <div><span style={{ color: C.muted }}>Aufschlag</span>
                <div>{num(a.aufschlag, 3)} ct/kWh</div></div>
              <div><span style={{ color: C.muted }}>Zugeordnet an</span>
                <div>{a.partnerName}</div></div>
              <div><span style={{ color: C.muted }}>Akquise</span>
                <div>
                  {(AKQUISE_ART.find((x) => x.value === (a.akquiseArt || "eigen")) || {}).label}
                  {a.herkunft ? " · " + a.herkunft : ""}
                  {a.herkunftDetail ? " · " + a.herkunftDetail : ""}
                </div></div>
            </div>

            <div className="rounded overflow-hidden mb-5" style={{ border: "1px solid " + C.line }}>
              {a.lieferstellen.map((l) => (
                <div key={l.id} className="flex items-center gap-3 px-4 py-3 text-sm"
                     style={{ borderBottom: "1px solid " + C.line,
                              borderLeft: "3px solid " + (l.medium === "strom" ? C.strom : C.gas) }}>
                  <MediumIcon medium={l.medium} />
                  <span className="flex-1">{l.bezeichnung || "Ohne Bezeichnung"} · {l.zaehlerart}</span>
                  <span style={{ fontVariantNumeric: "tabular-nums" }}>{num(parseFloat(l.verbrauch) || 0)} kWh</span>
                </div>
              ))}
            </div>

            <div className="p-4 rounded mb-5"
                 style={{ background: verbrauchGesamt(a) >= 100000 ? "#F6F8FA" : "#F1F3F5",
                          border: "1px solid " + C.line }}>
              <label className="flex items-start gap-3 text-sm"
                     style={{ opacity: verbrauchGesamt(a) >= 100000 ? 1 : 0.55 }}>
                <input type="checkbox" className="mt-0.5"
                  disabled={verbrauchGesamt(a) < 100000}
                  checked={!!a.dienstleistungsvertrag && verbrauchGesamt(a) >= 100000}
                  onChange={(e) => setA({ ...a, dienstleistungsvertrag: e.target.checked })}
                  style={{ accentColor: C.ink }} />
                <span>
                  Dienstleistungsvertrag gewünscht
                  <span className="block text-xs mt-0.5" style={{ color: C.muted }}>
                    {verbrauchGesamt(a) >= 100000
                      ? "Die Kalkulation hängt den Vertrag dem Angebot bei."
                      : "Erst ab 100.000 kWh möglich, aktuell " + num(verbrauchGesamt(a)) + " kWh."}
                  </span>
                </span>
              </label>
            </div>

            {(() => {
              const treffer = dubletten(a, alleAnfragen, mitarbeiter);
              if (!treffer.length) return null;
              return (
                <div className="p-4 rounded mb-5" style={{ background: "#FDF6EE", border: "1px solid " + C.gas }}>
                  <div className="flex items-center gap-2 mb-2" style={{ color: C.gas }}>
                    <AlertTriangle size={15} />
                    <span className="text-sm">Dieser Kunde ist möglicherweise schon erfasst</span>
                  </div>
                  {treffer.map((t) => (
                    <div key={t.vorgang.id} className="text-sm py-1">
                      {t.vorgang.kunde.firma} · {t.vorgang.id} · {statusVon(t.vorgang).label}
                      <span className="block text-xs" style={{ color: C.muted }}>
                        betreut von {t.inhaber} · {t.gruende.join(", ")}
                      </span>
                    </div>
                  ))}
                  <p className="text-xs mt-2" style={{ color: C.muted }}>
                    Kläre vor dem Senden, ob es sich wirklich um denselben Kunden handelt. Senden ist
                    weiterhin möglich.
                  </p>
                </div>
              );
            })()}

            <label className="block mb-5">
              <span className="block text-xs mb-1" style={{ color: C.muted }}>
                Bemerkung an das Team Kalkulation
              </span>
              <textarea rows={3} value={a.bemerkungVertrieb || ""}
                onChange={(e) => setA({ ...a, bemerkungVertrieb: e.target.value })}
                placeholder="Weitere Informationen zum Kunden, zur Menge oder zum gewünschten Vorgehen"
                className="w-full px-3 py-2 text-sm rounded outline-none"
                style={{ border: "1px solid " + C.line }} />
            </label>

            {sperren.length > 0 && (
              <div className="p-4 rounded mb-5" style={{ background: "#FCF3F0", border: "1px solid " + C.warn }}>
                <div className="flex items-center gap-2 mb-2" style={{ color: C.warn }}>
                  <AlertTriangle size={15} />
                  <span className="text-sm">Senden ist erst möglich, wenn das erledigt ist</span>
                </div>
                <ul className="text-sm ml-6 list-disc">{sperren.map((f) => <li key={f}>{f}</li>)}</ul>
              </div>
            )}

            {luecken.length > 0 ? (
              <div className="p-4 rounded mb-5" style={{ background: "#FCF3F0", border: "1px solid " + C.warn }}>
                <div className="flex items-center gap-2 mb-2" style={{ color: C.warn }}>
                  <AlertTriangle size={15} />
                  <span className="text-sm">Diese Angaben fehlen noch</span>
                </div>
                <ul className="text-sm ml-6 list-disc">{luecken.map((f) => <li key={f}>{f}</li>)}</ul>
                <p className="text-xs mt-2 ml-6" style={{ color: C.muted }}>
                  Du kannst trotzdem einreichen. Die Kalkulation sendet unvollständige Anfragen zurück.
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-4 rounded mb-5 text-sm"
                   style={{ background: "#F1F7F4", border: "1px solid " + C.ok, color: C.ok }}>
                <Check size={15} /> Alle Pflichtangaben liegen vor.
              </div>
            )}
          </div>
        )}

        {/* fest am unteren Rand: am Handy ohne Scrollen weiter */}
        <div className="flex flex-wrap gap-2 mt-6 py-3 sticky bottom-0 z-10"
             style={{ borderTop: "1px solid " + C.line, background: C.paper, boxShadow: "0 -6px 12px -10px rgba(10,22,38,0.25)" }}>
          {schritt > 1 && <Btn variante="hell" icon={ArrowLeft} onClick={() => { setSchritt(schritt - 1); window.scrollTo(0, 0); }}>Zurück</Btn>}
          {schritt < 4 && <Btn variante="ok" onClick={() => { setSchritt(schritt + 1); window.scrollTo(0, 0); }} icon={ChevronRight}>Weiter</Btn>}
          {schritt === 4 && a.status && !["entwurf", "klaerfall"].includes(a.status) && (
            <Btn icon={Check} onClick={() => onSpeichern(a)}>Änderungen speichern</Btn>
          )}
          {schritt === 4 && (!a.status || ["entwurf", "klaerfall"].includes(a.status)) && (
            <Btn icon={Send} disabled={sperren.length > 0}
              onClick={() => { setGeprueft(true); onSenden(a); }}>
              Anfrage an Kalkulation senden
            </Btn>
          )}
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          <Btn variante="hell" onClick={() => onSpeichern(a)}>
            {a.status && !["entwurf", "klaerfall"].includes(a.status) ? "Zwischenspeichern" : "Als Entwurf speichern"}
          </Btn>
          <Btn variante="hell" onClick={onAbbrechen}>Abbrechen</Btn>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Anfrage-Detail                                                     */
/* ------------------------------------------------------------------ */
/* Vertragsmanagement: Lieferbestätigung des Versorgers erfassen. Erst danach sieht der Vertrieb
   „Vom Versorger bestätigt“ und seine Provision. */
function KundenVersand({ a, user, onUpdate, onAnnahmeUebernehmen, nurStatus }) {
  const [links, setLinks] = useState([]);
  const [offen, setOffen] = useState(false);
  const [form, setForm] = useState(() => ({
    an: (a.kunde && a.kunde.email) || "", satz: "",
    felder: { iban: true, funktion: false, geburtsdatum: false, steuernummer: false, ...(a.kundenFelder || {}) },
  }));
  const [sendet, setSendet] = useState(false);
  const [meldung, setMeldung] = useState("");

  const neuLaden = () => kundenlinksLaden(a.id).then(setLinks).catch(() => {});
  useEffect(() => {
    neuLaden();
    /* solange die Ansicht offen ist, alle 30 Sekunden nachsehen, ob der Kunde geöffnet oder unterschrieben hat */
    const t = setInterval(neuLaden, 30000);
    return () => clearInterval(t);
  }, [a.id]);

  const senden = async () => {
    setSendet(true); setMeldung("");
    try {
      await kundenangebot({ aktion: "senden", anfrageId: a.id, an: form.an.trim(), satz: form.satz, felder: form.felder });
      onUpdate({ ...a, angebotVersendet: { datum: heute(), von: user.name, perLink: true, an: form.an.trim() },
        kundenFelder: form.felder,
        verlauf: [...a.verlauf, { d: heute(), t: "Angebot per E-Mail mit persönlichem Link an " + form.an.trim() + " gesendet", w: user.name }] });
      setOffen(false); setForm({ ...form, satz: "" });
      neuLaden();
    } catch (e) { setMeldung(e.message || "Senden hat nicht geklappt."); }
    setSendet(false);
  };

  const angenommen = links.map((l) => l.daten && l.daten.angenommen ? { ...l.daten.angenommen, an: l.daten.an } : null).find(Boolean);
  const v = angenommen && varianten(a).find((x) => x.id === angenommen.variante);
  const mailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.an.trim());

  const verlaufListe = links.length > 0 && (
    <div className="space-y-2 mt-3">
      {links.slice(0, 3).map((l) => {
        const d = l.daten || {}, g = d.geoeffnet || [], s = d.angesehen || [];
        return (
          <div key={l.id} className="text-sm p-3 rounded" style={{ background: C.paper }}>
            <div>Gesendet {zeitDe(d.gesendet || l.erstellt)} an {d.an}{d.von ? " (" + d.von + ")" : ""}</div>
            <div className="mt-1" style={{ color: g.length ? C.ok : C.muted }}>
              {g.length ? "Geöffnet: " + g.length + "×, zuletzt " + zeitDe(g[g.length - 1]) : "Noch nicht geöffnet"}
              {s.length ? " · Angebots-PDF angesehen: " + s.length + "×" : ""}
            </div>
            {d.angenommen && <div className="mt-1" style={{ color: C.ok }}>Unterschrieben {zeitDe(d.angenommen.zeit)} von {d.angenommen.name}{d.angenommen.funktion ? " (" + d.angenommen.funktion + ")" : ""}</div>}
          </div>
        );
      })}
    </div>
  );

  if (nurStatus) return links.length ? <div>{verlaufListe}</div> : null;

  return (
    <div>
      {angenommen && a.status === "angebot" && (
        <div className="rounded p-4 mb-3" style={{ background: "#EEF6E8", border: "1px solid " + C.ok }}>
          <div className="flex items-center gap-2 text-sm" style={{ color: C.ok }}><FileSignature size={16} /> Der Kunde hat unterschrieben</div>
          <p className="text-sm mt-1">
            {angenommen.name}{angenommen.funktion ? " (" + angenommen.funktion + ")" : ""} hat am {zeitDe(angenommen.zeit)}
            {v ? " das Angebot „" + (v.produkt || "Angebot") + "“" : " das Angebot"} angenommen.
          </p>
          {angenommen.datei && <div className="mt-2"><DateiChip datei={angenommen.datei} label="Unterschriebene Unterlagen" /></div>}
          <div className="mt-3">
            <Btn variante="ok" icon={Check} onClick={() => onAnnahmeUebernehmen(v, angenommen.datei)}>Annahme übernehmen und Auftrag bestätigen</Btn>
          </div>
          <p className="text-xs mt-2" style={{ color: C.muted }}>Variante und Unterlagen sind dann schon eingetragen. Du prüfst nur noch die übrigen Angaben.</p>
        </div>
      )}

      {!offen && !angenommen && (
        <div className="flex flex-wrap gap-2">
          <Btn variante="ok" icon={Mail} onClick={() => setOffen(true)}>{links.length ? "Erneut an den Kunden senden" : "Angebot an den Kunden senden"}</Btn>
        </div>
      )}

      {offen && (
        <div className="rounded p-4 mt-1 space-y-4" style={{ background: C.paper, border: "1px solid " + C.line }}>
          <Feld label="E-Mail des Kunden" type="email" value={form.an} onChange={(x) => setForm({ ...form, an: x })}
            fehler={form.an && !mailOk} />
          <label className="block">
            <span className="block text-xs mb-1" style={{ color: C.muted }}>Persönlicher Satz (optional, steht oben in der Mail)</span>
            <textarea value={form.satz} onChange={(e) => setForm({ ...form, satz: e.target.value })} rows={3} maxLength={600}
              placeholder="z. B. vielen Dank für das nette Gespräch gestern. Wie besprochen …"
              className="w-full px-3 py-2 rounded outline-none" style={{ fontSize: 16, border: "1px solid " + C.line, background: "#fff" }} />
          </label>
          <div>
            <span className="block text-xs mb-2" style={{ color: C.muted }}>Was muss der Kunde eintragen?</span>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm" style={{ color: C.muted }}>
                <span className="rounded flex items-center justify-center shrink-0" style={{ width: 20, height: 20, background: C.muted }}><Check size={14} color="#fff" /></span>
                Vor- und Nachname und Unterschrift (immer)
              </div>
              {KUNDENFELDER.map(([k, label]) => (
                <button key={k} onClick={() => setForm({ ...form, felder: { ...form.felder, [k]: !form.felder[k] } })}
                  className="flex items-center gap-2 text-sm text-left">
                  <span className="rounded flex items-center justify-center shrink-0"
                    style={{ width: 20, height: 20, background: form.felder[k] ? C.ok : "#fff", border: "2px solid " + (form.felder[k] ? C.ok : "#9AA5B3") }}>
                    {form.felder[k] && <Check size={14} color="#fff" />}
                  </span>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="text-xs p-3 rounded" style={{ background: "#fff", border: "1px solid " + C.line, color: C.muted, lineHeight: 1.6 }}>
            <div className="mb-1" style={{ color: C.text }}>So kommt die Mail an</div>
            Von: {user.name} · EGC Energie (über portal@egc-energie.de) · Antworten gehen an dich, du bekommst eine Kopie.<br />
            Betreff: Ihr Angebot – {(a.kunde && a.kunde.firma) || "Kunde"}<br />
            {a.kunde && a.kunde.ansprechpartner ? "Guten Tag " + a.kunde.ansprechpartner + "," : "Sehr geehrte Damen und Herren,"}
            {form.satz.trim() && <><br /><span style={{ color: C.text }}>{form.satz.trim()}</span></>}
            <br />anbei erhalten Sie Ihr Angebot … Knopf „Angebot ansehen und annehmen“, danach deine Kontaktdaten.
          </div>
          {meldung && <p className="text-sm" style={{ color: C.warn }}>{meldung}</p>}
          <div className="flex flex-wrap gap-2">
            <Btn variante="ok" icon={Send} onClick={senden} disabled={sendet || !mailOk}>{sendet ? "Wird gesendet …" : "Jetzt senden"}</Btn>
            <Btn variante="hell" onClick={() => setOffen(false)}>Abbrechen</Btn>
          </div>
        </div>
      )}
      {verlaufListe}
    </div>
  );
}

function Detail({ a, user, mitarbeiter, versorger, alleAnfragen, onZurueck, onUpdate,
                 onBearbeiten, onVerlaengern, onNotieren, tippgeber, beschaffung, setBeschaffung, onBeschaffung, onLoeschen }) {
  /* Kalkulation: gesendetes Angebot wieder öffnen und neu senden */
  const [ueberarbeiten, setUeberarbeiten] = useState(false);
  const [vars, setVars] = useState(
    a.kalkulation && a.kalkulation.varianten && a.kalkulation.varianten.length
      ? a.kalkulation.varianten
      : [leereVariante(a)]
  );
  const [vollmacht, setVollmacht] = useState(a.kalkulation ? a.kalkulation.vollmacht : null);
  const [dlv, setDlv] = useState(a.kalkulation ? a.kalkulation.dienstleistungsvertrag : null);
  /* Dienstleistungsvertrag: vom Vertrieb gewünscht oder von der Kalkulation festgelegt */
  const [dlvNoetig, setDlvNoetig] = useState(!!a.dienstleistungsvertrag || !!(a.kalkulation && a.kalkulation.dienstleistungsvertrag));
  const [dlvLaeuft, setDlvLaeuft] = useState(false);
  const [dlvHonorar, setDlvHonorar] = useState({ erfolg: "20", ...((a.kalkulation && a.kalkulation.dienstleistungsHonorar) || { mit: true, betrag: "300" }) });
  /* „mit Honorar“ und 0 € gilt als ohne Honorar */
  const dlvHonorarWert = () => {
    const b = zahlLesen(dlvHonorar.betrag);
    const ew = zahlLesen(dlvHonorar.erfolg);
    const erfolg = isNaN(ew) || ew < 0 ? 20 : ew;
    const ref = dlvHonorar.referenz || "komplett";
    const rb = zahlLesen(dlvHonorar.rabattBetrag);
    return dlvHonorar.mit && b > 0
      ? { mit: true, betrag: b, referenz: ref, rabattBetrag: ref === "rabatt" && !isNaN(rb) && rb > 0 ? rb : null, erfolg }
      : { mit: false, erfolg };
  };
  const dlvErzeugen = async () => {
    setDlvLaeuft(true);
    try { const d = await dienstleistungsvertragPdf(a.kunde || {}, dlvHonorarWert()); setDlv(d); dateiLaden(d); }
    catch (e) { alert("Der Dienstleistungsvertrag konnte nicht erzeugt werden: " + ((e && e.message) || e)); }
    setDlvLaeuft(false);
  };
  const [fehlend, setFehlend] = useState([]);
  const [fehlendText, setFehlendText] = useState("");
  /* „Sonstiges“: eigene Nachforderung als Freitext, wird als eigener Punkt in die Liste übernommen */
  const [sonstiges, setSonstiges] = useState({ an: false, text: "" });
  const [modus, setModus] = useState(null);

  const istKalk = user.rolle === "Kalkulation";
  const istPartner = istBeteiligt(a, user.id);
  /* Reihenfolge im Vorgang für alle Rollen: Handlung der eigenen Rolle oben, dann Angebot und Lieferstellen,
     Nachrichten und Zielpreis unten. Die Blöcke stehen im Code weiter in ihrer gewohnten Reihenfolge. */
  const reihe = (n) => ({ order: n });
  const istVM = user.rolle === "Vertragsmanagement";
  /* Verschwiegenheitserklärung: nur Kalkulation und Geschäftsführung, unterschreibt immer die Geschäftsführung */
  const ndaSicht = ["Kalkulation", "Geschäftsführung"].includes(user.rolle);
  const [ndaBild, setNdaBild] = useState(null);
  const [ndaArt, setNdaArt] = useState((a.nda && a.nda.art) || "einseitig");
  const [ndaLaeuft, setNdaLaeuft] = useState(false);
  const ndaLaden = async () => {
    setNdaLaeuft(true);
    try { dateiLaden(await ndaPdf(a.kunde || {}, a.nda && a.nda.gf, (a.nda && a.nda.art) === "gegenseitig")); }
    catch (e) { alert("Die Verschwiegenheitserklärung konnte nicht erzeugt werden: " + ((e && e.message) || e)); }
    setNdaLaeuft(false);
  };

  /* bisheriger Versorger je Lieferstelle, für den Vergleich im Angebot */
  const [vorv, setVorv] = useState((a.kalkulation && a.kalkulation.vorversorger) || {});
  const setVorvFeld = (lid, k, w) => setVorv((alt) => ({ ...alt, [lid]: { ...(alt[lid] || {}), [k]: w } }));
  const [vmBemerkung, setVmBemerkung] = useState((a.kalkulation && a.kalkulation.vollmachtBemerkung) || "");
  const [hinweisPartner, setHinweisPartner] = useState((a.kalkulation && a.kalkulation.hinweisPartner) || "");
  /* Smartmeter: hat die Kalkulation das Angebot entfernt, wird es nicht wieder automatisch angelegt */
  const [sm, setSm] = useState(() => (a.kalkulation && a.kalkulation.smartmeter)
    || (a.smartmeter && !(a.kalkulation && a.kalkulation.smartmeterEntfernt) ? smartmeterStart(a) : null));
  const [erzeugt, setErzeugt] = useState(null);
  const [kurz, setKurz] = useState(false);
  const [paketLaeuft, setPaketLaeuft] = useState(false);
  const paketLaden = async (art) => {
    setPaketLaeuft(true);
    try { const p = await individualPaket(a, mitarbeiter); dateiLaden(art === "pdf" ? p.pdf : p.zip); }
    catch (e) { alert("Die Individualanfrage konnte nicht erstellt werden: " + ((e && e.message) || e)); }
    setPaketLaeuft(false);
  };
  const angebotErzeugen = async (v, mitVergleich = true) => {
    setErzeugt(v.id + (mitVergleich ? ":mit" : ":ohne"));
    try {
      const vu = v.umlagen || JSON.parse(JSON.stringify({ strom: UMLAGEN.strom, gas: UMLAGEN.gas, teile: UMLAGEN.teile || null,
        jahr: umlagenJahr(UMLAGEN), vorjahre: umlagenVorjahre(UMLAGEN) }));
      if (!v.umlagen) setVar(v.id, "umlagen", vu);
      const pdf = await egcAngebotPdf(a, { ...v, umlagen: vu },
        { mitarbeiter, vorversorger: mitVergleich ? vorv : {}, vollmachtBemerkung: vmBemerkung, smartmeter: sm });
      setVar(v.id, "angebot", pdf);
      setVar(v.id, "angebotMitVergleich", mitVergleich);
      /* gleich anzeigen, damit die Kalkulation es prüfen kann */
      if (PDF_ZEIGEN) PDF_ZEIGEN(pdf);
    }
    catch (e) { alert("Das Angebot konnte nicht erzeugt werden: " + ((e && e.message) || e)); }
    setErzeugt(null);
  };

  const setVar = (id, k, v) => setVars((alle) => alle.map((x) => (x.id === id ? { ...x, [k]: v } : x)));
  const setVarPreis = (id, lid, art, v) =>
    setVars(vars.map((x) => x.id === id
      ? { ...x, preise: { ...x.preise, [lid]: { ...(x.preise[lid] || {}), [art]: v } } } : x));
  const varLoeschen = (id) => setVars(vars.filter((x) => x.id !== id));

  const bereit = vars.length > 0 && vars.every((v) => v.angebot || v.individualangebot);

  const angebotSenden = () => {
    onUpdate({
      ...a,
      status: "angebot",
      fehlend: [],
      fehlendText: "",
      kalkulation: {
        bearbeiter: user.name,
        datum: heute(),
        vollmacht,
        dienstleistungsvertrag: dlvNoetig ? dlv : null,
        dienstleistungsHonorar: dlvNoetig ? dlvHonorar : null,
        vorversorger: vorv,
        vollmachtBemerkung: vmBemerkung,
        hinweisPartner: hinweisPartner.trim(),
        smartmeter: sm,
        smartmeterEntfernt: !!(a.smartmeter && !sm),
        gewaehlt: null,
        varianten: vars.map((v) => ({
          ...v,
          sparte: v.sparte || "beide",
          laufzeitArt: v.laufzeitArt || "monate",
          aufschlag: parseFloat(String(v.aufschlag).replace(",", ".")) || 0,
          aufschlagEcht: hatWertK(v.aufschlagEcht) ? ctZahl(v.aufschlagEcht) : "",
          laufzeit: parseInt(v.laufzeit) || a.laufzeit,
        })),
      },
      verlauf: [...a.verlauf, {
        d: heute(),
        t: vars.length > 1
          ? vars.length + " Angebotsvarianten " + (a.status === "angebot" ? "überarbeitet und erneut gesendet" : "kalkuliert und zurückgesendet")
          : a.status === "angebot" ? "Angebot überarbeitet und erneut gesendet" : "Angebot kalkuliert und zurückgesendet",
        w: user.name,
      }],
      /* überarbeitetes Angebot muss der Partner erneut an den Kunden schicken */
      ...(a.status === "angebot" ? { angebotVersendet: null } : {}),
    });
    setUeberarbeiten(false);
    /* im Vorgang bleiben: oben erscheint der Hinweis, dass das Angebot beim Vertriebspartner liegt */
    try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch (e) { /* egal */ }
  };

  const zurueckAnVertrieb = () => {
    onUpdate({
      ...a,
      status: "klaerfall",
      fehlend: [...fehlend, ...(sonstiges.an && sonstiges.text.trim() ? ["Sonstiges: " + sonstiges.text.trim()] : [])],
      fehlendText,
      verlauf: [...a.verlauf, { d: heute(), t: "Zurück an Vertrieb: Unterlagen unvollständig", w: user.name }],
    });
    onZurueck();
  };

  const [frage, setFrage] = useState("");
  const [eingang, setEingang] = useState({ betrag: "", datum: heute(), notiz: "" });
  const [antwort, setAntwort] = useState("");
  const istGF = user.rolle === "Geschäftsführung";
  const intern = ["Kalkulation", "Geschäftsführung", "Leitung Vertrieb"].includes(user.rolle);

  const rueckspracheStellen = () => {
    onUpdate({
      ...a,
      status: "ruecksprache",
      ruecksprache: { frage, von: user.name, datum: heute(), antwort: "", antwortVon: "", antwortDatum: "" },
      verlauf: [...a.verlauf, { d: heute(), t: "Rücksprache mit der Geschäftsführung angefragt", w: user.name }],
    });
    onZurueck();
  };

  const rueckspracheBeantworten = () => {
    onUpdate({
      ...a,
      status: "eingereicht",
      ruecksprache: { ...a.ruecksprache, antwort, antwortVon: user.name, antwortDatum: heute() },
      verlauf: [...a.verlauf, { d: heute(), t: "Geschäftsführung hat geantwortet, zurück an Kalkulation", w: user.name }],
    });
    onZurueck();
  };

  const [ablehnung, setAblehnung] = useState({ offen: false, grund: "Kunde hat kein Interesse", wiedervorlage: "", notiz: "" });

  const [teilhaber, setTeilhaber] = useState(
    beteiligte(a).map((b) => ({ id: b.id, anteil: String(b.anteil ?? 100) }))
  );

  /* Zielpreis bei Spotmarkt */
  const [zielpreis, setZielpreis] = useState(a.zielpreis || "");
  const [zielNotiz, setZielNotiz] = useState(a.zielpreisNotiz || "");
  const istSpot =
    a.produkt === "Spotmarkt" || a.produktGas === "Spotmarkt" ||
    varianten(a).some((v) => v.produkt === "Spotmarkt");
  const darfZielpreis = istPartner || ["Kalkulation", "Geschäftsführung"].includes(user.rolle);

  /* Verlauf als PDF */
  const darfProtokoll = ["Kalkulation", "Vertragsmanagement", "Geschäftsführung"].includes(user.rolle);
  const protokollLaden = () => {
    const z = [];
    z.push({ text: a.kunde.firma || "Vorgang", gross: true });
    z.push(a.id + "  ·  angelegt " + datum(a.angelegt) + "  ·  " + statusVon(a).label);
    z.push("Vertriebspartner: " + a.partnerName + " (Team " + a.team + ")");
    if (a.kunde.branche) z.push("Branche: " + a.kunde.branche);
    z.push("Anschrift: " + [a.kunde.strasse, a.kunde.plz + " " + a.kunde.ort].filter(Boolean).join(", "));
    z.push("Ansprechpartner: " + [a.kunde.ansprechpartner, a.kunde.telefon, a.kunde.email].filter(Boolean).join("  ·  "));
    z.push("Gesamtmenge: " + num(verbrauchGesamt(a)) + " kWh");
    if (a.zielpreis) z.push("Zielpreis Spotmarkt: " + a.zielpreis + " ct/kWh"
      + (a.zielpreisNotiz ? "  ·  " + a.zielpreisNotiz : ""));
    if (a.bestaetigung) {
      z.push({ text: "Versorgerbestätigung", gross: true });
      z.push("Versorger: " + ([...new Set(provisionsStellen(a).map((s) => s.versorger).filter(Boolean))].join(" / ") || a.bestaetigung.versorger));
      z.push("Bestätigte Menge: " + num(bestaetigteMenge(a)) + " kWh");
      z.push("Gesamtaufschlag: " + aufschlagText(a));
      if (parseFloat(a.bestaetigung.bonus) > 0)
        z.push("Bonus: " + eur(parseFloat(a.bestaetigung.bonus)) + " ("
          + (a.bestaetigung.bonusArt === "jaehrlich" ? "pro Lieferjahr" : "einmalig") + ")");
    }

    z.push({ text: "Verlauf", gross: true });
    if (!a.verlauf.length) z.push("keine Einträge");
    a.verlauf.forEach((v) => z.push(datum(v.d) + "   " + v.t + "   (" + v.w + ")"));

    z.push({ text: "Nachrichten", gross: true });
    if (!(a.nachrichten || []).length) z.push("keine Nachrichten");
    (a.nachrichten || []).forEach((n) => {
      z.push(datum(n.datum) + ", " + n.zeit + " Uhr   " + n.von + " (" + n.rolle + ")");
      z.push("     " + n.text);
    });

    z.push({ text: " ", gross: false });
    z.push("Erstellt am " + datum(heute()) + " um " + jetzt() + " Uhr von " + user.name + ", EGC Energie Vertriebsportal");

    const pdf = erzeugePdf("verlauf_" + a.id + ".pdf",
      "Vorgangsprotokoll " + a.id, z);
    if (pdf) dateiLaden(pdf);
  };

  /* Nachrichtenverlauf am Vorgang */
  const [nachricht, setNachricht] = useState("");
  const nachrichtSenden = () => {
    if (!nachricht.trim()) return;
    onUpdate({
      ...a,
      nachrichten: [...(a.nachrichten || []), {
        id: uid(), text: nachricht.trim(), von: user.name, rolle: user.rolle,
        datum: heute(), zeit: jetzt(),
        erwaehnt: erwaehnungenAus(nachricht),
      }],
    });
    setNachricht("");
  };

  /* Aufgabe 10: Versorgerbestätigung, Klärfall und Ablehnung */
  const [vModus, setVModus] = useState(null);
  const [best, setBest] = useState(
    a.bestaetigung || (() => {
      /* eigene Werte je Lieferstelle aus dem angenommenen Angebot vorbelegen */
      const stellen = {};
      const vs = gewaehlte(a).length ? gewaehlte(a) : varianten(a).slice(0, 1);
      vs.forEach((x) => stellenVon(a, x).forEach((l) => {
        const sv = stelleIn(x, l);
        const s = {};
        if (sv.eigen.versorger) s.versorger = sv.versorger;
        if (sv.eigen.aufschlag) { s.aufschlag = String(sv.aufschlag); if (ctZahl(sv.aufschlagEcht) !== ctZahl(sv.aufschlag)) s.aufschlagEcht = String(sv.aufschlagEcht); }
        if (sv.eigen.lieferbeginn) s.beginn = sv.lieferbeginn;
        if (sv.eigen.laufzeit && enddatum(sv)) s.ende = enddatum(sv);
        if (Object.keys(s).length) stellen[l.id] = s;
      }));
      return { versorger: (vs[0] || {}).versorger || "", stellen, aufschlag: (aktiveVariante(a) || {}).aufschlag || a.aufschlag,
               aufschlagEcht: hatWertK((aktiveVariante(a) || {}).aufschlagEcht) ? String(aktiveVariante(a).aufschlagEcht) : "",
               bonus: "", bonusArt: "keine" };
    })()
  );
  const [vKlaer, setVKlaer] = useState({ text: "", dateien: [] });
  const [vAbl, setVAbl] = useState({ text: "", dokument: null, alternativ: false, alternativAngebot: null });

  const setBestStelle = (id, k, v) =>
    setBest({ ...best, stellen: { ...best.stellen, [id]: { ...(best.stellen[id] || {}), [k]: v } } });

  const auftragBestaetigen = () => {
    onUpdate({
      ...a,
      status: "bestaetigt",
      einreichung: false,
      vertragsStatus: "Provision offen",
      bestaetigung: { ...best, von: user.name, datum: heute() },
      verlauf: [...a.verlauf, {
        d: heute(), t: "Auftrag beim Versorger bestätigt: " + (best.versorger || "Versorger"), w: user.name,
      }],
    });
    onZurueck();
  };

  const versorgerKlaerfall = () => {
    onUpdate({
      ...a,
      status: "klaerfall",
      einreichung: false,
      fehlend: ["Klärung durch den Versorger nötig"],
      fehlendText: vKlaer.text,
      klaerung: { stufe: "versorger", art: "klaerfall", text: vKlaer.text, dateien: vKlaer.dateien,
                  von: user.name, datum: heute() },
      verlauf: [...a.verlauf, { d: heute(), t: "Klärfall beim Versorger, zurück an den Vertrieb", w: user.name }],
    });
    onZurueck();
  };

  const versorgerAblehnung = () => {
    onUpdate({
      ...a,
      status: "klaerfall",
      einreichung: false,
      fehlend: [vAbl.alternativ ? "Vom Versorger abgelehnt, Alternativangebot liegt vor" : "Vom Versorger abgelehnt"],
      fehlendText: vAbl.text,
      klaerung: {
        stufe: "versorger", art: "ablehnung", text: vAbl.text,
        dateien: [...dateienVon(vAbl.dokument), ...(vAbl.alternativ ? dateienVon(vAbl.alternativAngebot) : [])],
        alternativ: vAbl.alternativ, von: user.name, datum: heute(),
      },
      verlauf: [...a.verlauf, {
        d: heute(),
        t: vAbl.alternativ ? "Vom Versorger abgelehnt, Alternativangebot bereitgestellt" : "Vom Versorger abgelehnt",
        w: user.name,
      }],
    });
    onZurueck();
  };

  /* Aufgabe 8: Klärfall vom Vertriebspartner beantworten */
  const [klaerText, setKlaerText] = useState("");
  const [klaerDateien, setKlaerDateien] = useState([]);

  const klaerfallZurueck = () => {
    const zurueckNach = a.klaerung && a.klaerung.stufe === "versorger" ? "uebermittelt" : "eingereicht";
    onUpdate({
      ...a,
      status: zurueckNach,
      fehlend: [],
      fehlendText: "",
      klaerung: null,
      nachreichung: {
        text: klaerText,
        dateien: klaerDateien,
        von: user.name,
        datum: heute(),
        vorher: a.fehlend || [],
      },
      verlauf: [...a.verlauf, {
        d: heute(),
        t: "Unterlagen ergänzt und erneut an die Kalkulation gesendet",
        w: user.name,
      }],
    });
    onZurueck();
  };

  /* Aufgabe 9: Angebot annehmen mit Unterlagen */
  const [annahme, setAnnahme] = useState({
    variante: null, angebotUnterschrieben: null, vollmacht: null, unterlagen: null, umfang: "alle",
    /* abweichende Laufzeit in Monaten; leer = wie im Angebot */
    laufzeitMonate: "",
    kundeInformiert: false, wieBeschrieben: false, abweichung: "", weitere: [],
    /* über einen Tippgeber gewonnen? leer = nein (Vorgabe) */
    tippgeberId: (a.tippgeber && a.tippgeber.id) || a.tippgeberId || "",
  });
  /* zur Auswahl stehen nur eigene, von der Geschäftsführung freigegebene Tippgeber */
  const meineTippgeber = tippgeberFuer(tippgeber, user.id, user.rolle === "Geschäftsführung");
  const fragtTippgeber = istBeteiligt(a, user.id);

  const abschlussSenden = () => {
    const tgNeu = !fragtTippgeber ? null
      : annahme.tippgeberId
      ? (a.tippgeber && a.tippgeber.id === annahme.tippgeberId ? a.tippgeber
         : tippgeberMomentaufnahme(meineTippgeber.find((t) => t.id === annahme.tippgeberId), user.id))
      : null;
    const { tippgeberId, ...annahmeDaten } = annahme;
    /* Teilannahme: nur Strom oder nur Erdgas. Nicht angenommene Lieferstellen werden beiseitegelegt,
       damit Mengen, Lieferstellen und Provision nur noch mit der angenommenen Sparte rechnen. */
    const umfang = annahme.umfang || "alle";
    const nichtAngenommen = umfang === "alle" ? [] : a.lieferstellen.filter((l) => l.medium !== umfang);
    onUpdate({
      ...a,
      ...(fragtTippgeber ? {
        tippgeber: tgNeu, tippgeberId: tgNeu ? tgNeu.id : null,
        ...(tgNeu ? { herkunft: "Tippgeber", herkunftDetail: tgNeu.name }
          : a.herkunft === "Tippgeber" ? { herkunft: "Eigenes Netzwerk", herkunftDetail: "" } : {}),
      } : {}),
      status: "uebermittelt",
      ...(nichtAngenommen.length ? {
        lieferstellen: a.lieferstellen.filter((l) => l.medium === umfang),
        lieferstellenNichtAngenommen: [...(a.lieferstellenNichtAngenommen || []), ...nichtAngenommen],
      } : {}),
      kalkulation: { ...a.kalkulation, gewaehlt: annahmeGewaehlt(annahme.variante) },
      annahme: { ...annahmeDaten, vollmacht: annahmeDaten.unterlagen || annahmeDaten.vollmacht,
                 angebotUnterschrieben: annahmeDaten.unterlagen || annahmeDaten.angebotUnterschrieben,
                 wieBeschrieben: umfang === "alle",
                 von: user.name, datum: heute(),
                 tippgeber: fragtTippgeber ? (tgNeu ? "ja" : "nein") : undefined },
      verlauf: [...a.verlauf, {
        d: heute(),
        t: "Auftrag an die Kalkulation gesendet, bereit zum Einreichen"
          + (umfang === "strom" ? " (nur Strom angenommen)" : umfang === "gas" ? " (nur Erdgas angenommen)" : "")
          + (parseInt(annahme.laufzeitMonate) ? " · abweichende Laufzeit " + jahreText(parseInt(annahme.laufzeitMonate)) : ""),
        w: user.name,
      }],
    });
    onZurueck();
  };

  const annahmeGewaehlt = (v) => {
    if (!v) return a.kalkulation ? a.kalkulation.gewaehlt : null;
    const bisher = gewaehlte(a).map((x) => x.id);
    const behalten = varianten(a)
      .filter((x) => bisher.includes(x.id) && !stellenVon(a, x).some((l) => stellenVon(a, v).some((y) => y.id === l.id)))
      .map((x) => x.id);
    return [...behalten, v.id];
  };

  const annehmen = (v) => setAnnahme({ ...annahme, variante: v });

  const Zeile = ({ k, v }) => (
    <div className="flex justify-between gap-4 py-1.5 text-sm" style={{ borderBottom: "1px solid " + C.line }}>
      <span style={{ color: C.muted }}>{k}</span>
      <span className="text-right" style={{ fontVariantNumeric: "tabular-nums" }}>{v || "–"}</span>
    </div>
  );

  return (
    <div>
      <div className="flex items-center flex-wrap gap-3 mb-1">
        <h2 className="text-lg" style={{ letterSpacing: "-0.01em" }}>{a.kunde.firma}</h2>
        {a.kunde.branche && (
          <span className="text-xs px-2 py-0.5 rounded"
                style={{ border: "1px solid " + C.line, color: C.gas, background: "#FDF6EE" }}>
            {a.kunde.branche}
          </span>
        )}
        <StatusPunkt status={a.status} a={a} />
        {["Kalkulation", "Geschäftsführung"].includes(user.rolle) && (
          <button className="text-xs px-2 py-1 rounded" onClick={() => setKurz(!kurz)}
            style={{ border: "1px solid " + C.line, background: kurz ? C.ink : C.card, color: kurz ? "#fff" : C.text }}>
            Kurzinfo
          </button>
        )}
      </div>
      <p className="text-sm mb-5" style={{ color: C.muted }}>
        {a.id} · angelegt {datum(a.angelegt)} ·{" "}
        {liegezeit(a) != null && !["abgeschlossen", "abgelehnt"].includes(a.status) &&
          "seit " + num(liegezeit(a)) + " Tagen in diesem Status · "}
        {beteiligte(a).length > 1
          ? beteiligte(a).map((b) => {
              const m = mitarbeiter.find((x) => x.id === b.id);
              return (m ? m.name : "?") + " " + b.anteil + " %";
            }).join(" · ")
          : a.partnerName + " (Team " + a.team + ")"}
      </p>
      {kurz && <Kurzinfo a={a} onSchliessen={() => setKurz(false)} />}

      {(istPartner ? naechsterSchritt(a) : naechsterSchrittInnen(a, user.rolle)) && (() => {
        const n = istPartner ? naechsterSchritt(a) : naechsterSchrittInnen(a, user.rolle);
        const farbe = n.art === "dringend" ? C.warn : n.art === "tun" ? C.ok : C.muted;
        const grund = n.art === "dringend" ? "#FCF3F0" : n.art === "tun" ? "#F1F7F0" : "#F6F8FA";
        return (
          <div className="rounded px-4 py-3 mb-5 flex items-start gap-3"
               style={{ background: grund, borderLeft: "4px solid " + farbe }}>
            <div className="min-w-0">
              <div className="text-xs mb-0.5" style={{ color: farbe, letterSpacing: "0.04em" }}>
                {n.art === "warten" ? (istPartner ? "GERADE BEI UNS" : "WARTET AUF ANDERE") : n.art === "fertig" ? "STAND" : "DEIN NÄCHSTER SCHRITT"}
              </div>
              <div className="text-sm">{n.text}</div>
            </div>
          </div>
        );
      })()}

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 flex flex-col gap-5 min-w-0">
          {/* Nachrichten zum Vorgang (beim Vertriebspartner unter Angebot und Lieferstellen) */}
          <div className="rounded" style={{ background: C.card, border: "1px solid " + C.line, ...reihe(30) }}>
            <div className="flex items-baseline justify-between px-4 py-3"
                 style={{ borderBottom: "1px solid " + C.line }}>
              <span className="text-sm">Nachrichten zum Vorgang</span>
              <span className="text-xs" style={{ color: C.muted }}>
                {(a.nachrichten || []).length} Einträge · bleiben dauerhaft erhalten
              </span>
            </div>

            <div className="px-4 py-3 space-y-3" style={{ maxHeight: 380, overflowY: "auto" }}>
              {(a.nachrichten || []).length === 0 && (
                <p className="text-sm py-4 text-center" style={{ color: C.muted }}>
                  Noch keine Nachrichten. Schreib die erste, alle Beteiligten am Vorgang lesen mit.
                </p>
              )}
              {(a.nachrichten || []).map((n) => {
                const eigen = n.von === user.name;
                const farbe = ROLLENFARBE[n.rolle] || C.muted;
                return (
                  <div key={n.id} className="rounded p-3"
                       style={{ background: eigen ? "#F1F5FA" : "#F6F8FA",
                                borderLeft: "3px solid " + farbe }}>
                    <div className="flex flex-wrap items-baseline gap-x-2 mb-1">
                      <span className="text-sm">{n.von}</span>
                      <span className="text-xs" style={{ color: farbe }}>{n.rolle}</span>
                      <span className="flex-1" />
                      <span className="text-xs" style={{ color: C.muted, fontVariantNumeric: "tabular-nums" }}>
                        {datum(n.datum)}, {n.zeit} Uhr
                      </span>
                    </div>
                    <p className="text-sm" style={{ whiteSpace: "pre-wrap" }}>{n.text}</p>
                    {(n.erwaehnt || []).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {n.erwaehnt.map((r) => (
                          <span key={r} className="text-xs px-1.5 py-0.5 rounded"
                                style={{ background: "#fff", border: "1px solid " + C.line,
                                         color: ROLLENFARBE[r] || C.muted }}>
                            {r} angesprochen
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="px-4 py-3" style={{ borderTop: "1px solid " + C.line }}>
              <textarea rows={2} value={nachricht} onChange={(e) => setNachricht(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) nachrichtSenden();
                }}
                placeholder={"Nachricht als " + user.rolle + " schreiben. Mit @ jemanden ansprechen."}
                className="w-full px-3 py-2 text-sm rounded outline-none"
                style={{ border: "1px solid " + C.line }} />

              <div className="flex flex-wrap gap-1 mt-2">
                {ERWAEHNBAR.map((e) => (
                  <button key={e.kuerzel}
                    onClick={() => setNachricht((nachricht + " @" + e.kuerzel + " ").replace(/^ /, ""))}
                    className="text-xs px-2 py-1 rounded"
                    style={{ border: "1px solid " + C.line,
                             color: ROLLENFARBE[e.rolle] || C.muted }}>
                    @{e.kuerzel}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3 mt-2">
                <Btn icon={Send} onClick={nachrichtSenden} disabled={!nachricht.trim()}>Senden</Btn>
                <span className="text-xs" style={{ color: C.muted }}>
                  Wird mit deinem Namen, deiner Rolle und dem Zeitpunkt gespeichert.
                </span>
              </div>
            </div>
          </div>
          {/* Vertragsverlängerung */}
          {["bestaetigt", "abgeschlossen"].includes(a.status) &&
           (istPartner || istVM || user.rolle === "Geschäftsführung") && (() => {
            const ende = vertragsende(a);
            const rest = monateBis(ende);
            const faellig = rest != null && rest <= VERLAENGERUNG_VORLAUF[0];
            const nachfolger = (alleAnfragen || []).find((x) => x.verlaengerungVon === a.id);
            return (
              <div className="rounded p-4"
                   style={{ background: C.card,
                            border: "1px solid " + (nachfolger ? C.line : faellig ? C.gas : C.line) }}>
                <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
                  <span className="text-sm">Vertragsverlängerung</span>
                  <span className="text-xs" style={{ color: faellig ? C.gas : C.muted }}>
                    {ende
                      ? "Vertragsende " + datum(ende) +
                        (rest != null ? " · noch " + num(Math.max(0, rest)) + " Monate" : "")
                      : "Vertragsende nicht hinterlegt"}
                  </span>
                </div>

                {nachfolger ? (
                  <p className="text-sm" style={{ color: C.ok }}>
                    Verlängerung läuft bereits: {nachfolger.id} · {statusVon(nachfolger).label}
                  </p>
                ) : (
                  <>
                    <p className="text-sm mb-3" style={{ color: C.muted, maxWidth: "62ch" }}>
                      Erzeugt eine neue Anfrage mit allen Lieferstellen, Zählernummern und
                      Marktlokations-IDs dieses Kunden. Der Lieferbeginn wird auf den Tag nach
                      Vertragsende gesetzt.
                    </p>
                    <Btn variante={faellig ? "primär" : "hell"} icon={RotateCcw}
                      onClick={() => onVerlaengern && onVerlaengern(a)}>
                      Verlängerung anfragen
                    </Btn>
                  </>
                )}
              </div>
            );
          })()}

          {/* Angaben aus dem Vorvertrag */}
          {a.verlaengerungVon && (() => {
            const alt = (alleAnfragen || []).find((x) => x.id === a.verlaengerungVon);
            if (!alt) return null;
            const v = aktiveVariante(alt);
            return (
              <div className="rounded p-4" style={{ background: "#F6F8FA", border: "1px solid " + C.strom }}>
                <div className="text-sm mb-2" style={{ color: C.strom }}>
                  Verlängerung von {alt.id}
                </div>
                <div className="grid sm:grid-cols-2 gap-x-8 text-sm">
                  <Zeile k="Bisheriger Versorger"
                    v={alt.bestaetigung ? alt.bestaetigung.versorger : "–"} />
                  <Zeile k="Bisheriges Produkt" v={v ? v.produkt : alt.produkt} />
                  <Zeile k="Bisheriger Aufschlag"
                    v={num(alt.bestaetigung ? alt.bestaetigung.aufschlag : (v ? v.aufschlag : alt.aufschlag), 3) + " ct/kWh"} />
                  <Zeile k="Bisherige Laufzeit" v={laufzeitVon(alt) + " Monate"} />
                  <Zeile k="Bisheriges Vertragsende" v={datum(vertragsende(alt))} />
                  <Zeile k="Bestätigte Menge"
                    v={alt.bestaetigung ? num(bestaetigteMenge(alt)) + " kWh" : "–"} />
                </div>
              </div>
            );
          })()}

          {/* Betreuung und Provisionsaufteilung */}
          {(istVM || user.rolle === "Geschäftsführung") && (
            <div className="rounded p-5" style={{ background: C.card, border: "1px solid " + C.line }}>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                <span className="text-sm">Betreuung und Provisionsaufteilung</span>
                <Btn variante="hell" onClick={() => onBearbeiten && onBearbeiten(a)}>
                  Alle Angaben bearbeiten
                </Btn>
              </div>
              <p className="text-xs mb-4" style={{ color: C.muted, maxWidth: "62ch" }}>
                Wird ein Kunde von mehreren Partnern betreut, teile die Vertriebsprovision prozentual
                auf. Jeder Beteiligte sieht den Kunden danach mit seinem Anteil.
              </p>

              <div className="space-y-3">
                {teilhaber.map((b, i) => (
                  <div key={i} className="grid sm:grid-cols-3 gap-3 items-end">
                    <div className="sm:col-span-2">
                      <Select label={i === 0 ? "Vertriebspartner" : "Weiterer Vertriebspartner"}
                        value={b.id}
                        onChange={(v) => setTeilhaber(teilhaber.map((x, j) => (j === i ? { ...x, id: v } : x)))}
                        options={mitarbeiter
                          .filter((m) => ["Vertriebspartner", "Teamleiter", "Leitung Vertrieb"].includes(m.rolle))
                          .map((m) => ({ value: m.id, label: m.name + " · " + m.rolle }))} />
                    </div>
                    <div className="flex items-end gap-2">
                      <div className="flex-1">
                        <Feld label="Anteil in %" value={b.anteil}
                          onChange={(v) => setTeilhaber(teilhaber.map((x, j) =>
                            (j === i ? { ...x, anteil: v.replace(/[^\d]/g, "") } : x)))} />
                      </div>
                      {teilhaber.length > 1 && (
                        <button className="mb-2" style={{ color: C.muted }}
                          onClick={() => setTeilhaber(teilhaber.filter((_, j) => j !== i))}>
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-3 mt-4">
                <Btn variante="hell" icon={Plus}
                  onClick={() => setTeilhaber([...teilhaber, { id: mitarbeiter.find((m) =>
                    m.rolle === "Vertriebspartner" && !teilhaber.some((t) => t.id === m.id))?.id || "", anteil: "0" }])}>
                  Partner hinzufügen
                </Btn>
                <Btn icon={Check} onClick={() => {
                  const gesamtAnteil = teilhaber.reduce((t, x) => t + (parseFloat(x.anteil) || 0), 0);
                  const erster = teilhaber[0];
                  const m = mitarbeiter.find((x) => x.id === erster.id);
                  onUpdate({
                    ...a,
                    beteiligte: teilhaber.filter((x) => x.id && parseFloat(x.anteil) > 0),
                    partnerId: erster.id,
                    partnerName: m ? m.name : a.partnerName,
                    team: m ? m.team : a.team,
                    verlauf: [...a.verlauf, {
                      d: heute(),
                      t: "Betreuung angepasst: " + teilhaber.filter((x) => x.id).map((x) => {
                        const p = mitarbeiter.find((y) => y.id === x.id);
                        return (p ? p.name : "?") + " " + (x.anteil || 0) + " %";
                      }).join(", "),
                      w: user.name,
                    }],
                  });
                  if (onNotieren) onNotieren("Betreuung",
                    a.kunde.firma + ": " + teilhaber.filter((x) => x.id).map((x) => {
                      const pp = mitarbeiter.find((y) => y.id === x.id);
                      return (pp ? pp.name : "?") + " " + (x.anteil || 0) + " %";
                    }).join(", "));
                }} disabled={teilhaber.reduce((t, x) => t + (parseFloat(x.anteil) || 0), 0) !== 100}>
                  Aufteilung speichern
                </Btn>
                <span className="text-xs"
                      style={{ color: teilhaber.reduce((t, x) => t + (parseFloat(x.anteil) || 0), 0) === 100
                               ? C.ok : C.warn }}>
                  Summe {teilhaber.reduce((t, x) => t + (parseFloat(x.anteil) || 0), 0)} % · muss 100 % ergeben
                </span>
              </div>
            </div>
          )}

          {/* Zielpreis bei Spotmarkt */}
          {istSpot && (
            <div className="rounded p-4"
                 style={{ background: C.card, border: "1px solid " + (a.zielpreis ? C.gruen : C.line), ...reihe(31) }}>
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-sm">Zielpreis Spotmarkt</span>
                {a.zielpreis && (
                  <span className="text-lg" style={{ fontVariantNumeric: "tabular-nums" }}>
                    {a.zielpreis} ct/kWh
                  </span>
                )}
              </div>
              <p className="text-xs mb-3" style={{ color: C.muted, maxWidth: "60ch" }}>
                Preis, zu dem für den Kunden fixiert werden soll. Wird in der Kundeninfo angezeigt.
              </p>

              {darfZielpreis ? (
                <>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Feld label="Zielpreis in ct/kWh" value={zielpreis} onChange={setZielpreis}
                      placeholder="z. B. 9,80" />
                    <Feld label="Notiz" value={zielNotiz} onChange={setZielNotiz}
                      placeholder="Tranche, Zeitfenster, Absprache mit dem Kunden" />
                  </div>
                  <div className="mt-3">
                    <Btn variante="hell" icon={Check}
                      onClick={() => onUpdate({ ...a, zielpreis, zielpreisNotiz: zielNotiz })}>
                      Zielpreis speichern
                    </Btn>
                  </div>
                </>
              ) : a.zielpreis ? (
                a.zielpreisNotiz && <p className="text-sm">{a.zielpreisNotiz}</p>
              ) : (
                <p className="text-sm" style={{ color: C.muted }}>Noch kein Zielpreis hinterlegt.</p>
              )}
            </div>
          )}

          {/* Lieferstellen */}
          <div className="rounded" style={{ background: C.card, border: "1px solid " + C.line, ...reihe(20) }}>
            <div className="px-4 py-3 text-sm" style={{ borderBottom: "1px solid " + C.line }}>
              Lieferstellen ({a.lieferstellen.length})
            </div>
            {a.lieferstellen.map((l) => (
              <div key={l.id} className="p-4" style={{ borderBottom: "1px solid " + C.line,
                   borderLeft: "3px solid " + (l.medium === "strom" ? C.strom : C.gas) }}>
                <div className="flex items-center gap-2 mb-3">
                  <MediumIcon medium={l.medium} />
                  <span className="text-sm">{l.bezeichnung || "Lieferstelle"}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded"
                        style={{ border: "1px solid " + C.line, color: C.muted }}>{l.zaehlerart}</span>
                  <span className="text-xs" style={{ color: C.muted }}>
                    {[l.strasse, [l.plz, l.ort].filter(Boolean).join(" ")].filter(Boolean).join(", ")}
                  </span>
                </div>
                <div className="grid sm:grid-cols-2 gap-x-8">
                  <Zeile k="Lieferanschrift"
                    v={[l.strasse, [l.plz, l.ort].filter(Boolean).join(" ")].filter(Boolean).join(", ")} />
                  <Zeile k="Versorger" v={l.versorger} />
                  <Zeile k="Kundennummer" v={l.kundennummer} />
                  {l.vertragsendeAlt && <Zeile k="Vertrag läuft bis" v={datum(l.vertragsendeAlt)} />}
                  {l.kuendigungsfrist && <Zeile k="Kündigungsfrist" v={l.kuendigungsfrist} />}
                  {l.abrechnungJahr && <Zeile k="Abrechnung aus" v={l.abrechnungJahr} />}
                  {(a.smartmeter || l.meloId) && <Zeile k="Messlokations-ID (Smartmeter)" v={l.meloId || "fehlt"} />}
                  <Zeile k="Jahresverbrauch" v={num(parseFloat(l.verbrauch) || 0) + " kWh"} />
                  <Zeile k="Zählernummer" v={l.zaehlernummer} />
                  <Zeile k="Marktlokations-ID" v={l.maloId} />
                </div>
                <div className="space-y-2 mt-3">
                  {l.abrechnung
                    ? <DateiChip datei={l.abrechnung} label="Versorgerabrechnung" />
                    : !l.neueinzug && (
                      <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: C.warn }}>
                        <X size={13} /> keine Versorgerabrechnung
                      </span>
                    )}
                  {l.zaehlerart === "RLM" && (l.lastgang
                    ? <><DateiChip datei={l.lastgang} label="Lastgang" />
                        {dateienVon(l.lastgang).map((d, i) => <Lastganganalyse key={i} datei={d} />)}</>
                    : <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: C.warn }}>
                        <X size={13} /> kein Lastgang
                      </span>)}
                  {l.zaehlerfoto && <DateiChip datei={l.zaehlerfoto} label="Zählerfoto" />}
                  {l.neueinzug && (
                    <>
                      <div className="text-xs" style={{ color: C.gas }}>Neueinzug, kein Vorversorger</div>
                      {l.gewerbeanmeldung && <DateiChip datei={l.gewerbeanmeldung} label="Gewerbeanmeldung" />}
                      {l.pachtvertrag && <DateiChip datei={l.pachtvertrag} label="Pachtvertrag" />}
                    </>
                  )}
                </div>
                <div className="flex flex-wrap gap-4 mt-3 text-xs">
                  {l.energiepreis && (
                    <span style={{ color: C.text, fontVariantNumeric: "tabular-nums" }}>
                      Energiepreis {l.energiepreis} ct/kWh
                    </span>
                  )}
                  {l.preis && (
                    <span style={{ color: C.text, fontVariantNumeric: "tabular-nums" }}>
                      Arbeitspreis {l.preis} ct/kWh
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Kalkulationsbereich */}
          {istKalk && (["eingereicht", "angefragt", "ruecksprache"].includes(a.status) || (a.status === "angebot" && ueberarbeiten)) && (
            <div className="rounded p-5" style={{ background: C.card, border: "1px solid " + C.line, ...reihe(-2) }}>
              {a.status === "angebot" && (
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4 p-3 rounded text-sm"
                     style={{ background: "#FBF6EE", border: "1px solid " + C.gas }}>
                  <span>Du überarbeitest das gesendete Angebot. Erst mit „An Vertriebspartner senden“ sieht der Partner die neue Fassung.</span>
                  <Btn variante="hell" onClick={() => setUeberarbeiten(false)}>Abbrechen</Btn>
                </div>
              )}
              {a.status !== "angebot" && (
              <label className="flex items-center gap-3 text-sm mb-4 p-3 rounded"
                     style={{ background: a.status === "angefragt" ? "#FDF6EE" : "#F6F8FA",
                              border: "1px solid " + (a.status === "angefragt" ? C.gas : C.line) }}>
                <input type="checkbox" checked={a.status === "angefragt"}
                  onChange={(e) => onUpdate({
                    ...a,
                    status: e.target.checked ? "angefragt" : "eingereicht",
                    verlauf: [...a.verlauf, { d: heute(),
                      t: e.target.checked ? "Angebot beim Versorger angefragt" : "Anfrage zurück in Bearbeitung",
                      w: user.name }],
                  })}
                  style={{ accentColor: C.gas }} />
                Angebot in Bearbeitung, beim Versorger angefragt
              </label>
              )}

              <div className="flex flex-wrap gap-2 mb-5">
                <Btn variante={modus === "kalk" ? "primär" : "hell"} onClick={() => setModus("kalk")} icon={Calculator}>
                  Angebot kalkulieren
                </Btn>
                <Btn variante={modus === "rueck" ? "gefahr" : "hell"} onClick={() => setModus("rueck")} icon={RotateCcw}>
                  Unterlagen nachfordern
                </Btn>
                <Btn variante={modus === "gf" ? "primär" : "hell"} onClick={() => setModus("gf")} icon={Users}>
                  Rücksprache Geschäftsführung
                </Btn>
              </div>

              {modus === "kalk" && (
                <div className="space-y-5">
                  <p className="text-sm" style={{ color: C.muted, maxWidth: "60ch" }}>
                    Du kannst mehrere Varianten zurückgeben, etwa Festpreis und Spotmarkt nebeneinander.
                    Der Vertriebspartner wählt daraus aus. Preisangaben sind optional, das Angebots-PDF
                    ist je Variante erforderlich.
                  </p>

                  <div className="rounded p-4" style={{ background: brauchtIndividualanfrage(a) ? "#FDF6EE" : "#FAFBFC",
                       border: "1px solid " + (brauchtIndividualanfrage(a) ? C.gas : C.line) }}>
                    <div className="text-sm mb-1">Individualanfrage an den Versorger</div>
                    <p className="text-xs mb-3" style={{ color: C.muted }}>
                      {brauchtIndividualanfrage(a)
                        ? "Der Vertriebspartner wünscht " + [a.produkt, a.produktGas].filter((x) => INDIVIDUAL_PRODUKTE.includes(x)).join(" und ") +
                          ". Dafür braucht es ein Angebot direkt vom Versorger. Das Paket enthält die Anfrage als PDF mit allen Kunden- und Lieferstellendaten und die Lastgänge als Excel-Dateien."
                        : "Falls ein Angebot direkt beim Versorger angefragt werden muss: Anfrage als PDF mit allen Kunden- und Lieferstellendaten, Lastgänge als Excel-Dateien."}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Btn icon={FileText} variante={brauchtIndividualanfrage(a) ? "primär" : "hell"} disabled={paketLaeuft}
                        onClick={() => paketLaden("zip")}>{paketLaeuft ? "wird erstellt …" : "Paket laden (ZIP)"}</Btn>
                      <Btn variante="hell" disabled={paketLaeuft} onClick={() => paketLaden("pdf")}>Nur Anfrage-PDF</Btn>
                    </div>
                  </div>

                  <div className="rounded p-4" style={{ border: "1px solid " + C.line, background: "#FAFBFC" }}>
                    <div className="text-sm mb-1">Bisheriger Versorger</div>
                    <p className="text-xs mb-3" style={{ color: C.muted }}>
                      Für den Vergleich im Angebot. Arbeitspreis direkt eintragen oder aus der Rechnung
                      berechnen lassen. Alle Werte netto.
                    </p>
                    <div className="space-y-3">
                      {a.lieferstellen.map((l) => {
                        const vv = vorv[l.id] || {};
                        const modus = vv.modus || "preis";
                        const ergebnis = altPreis(vv);
                        return (
                          <div key={l.id} className="p-3 rounded" style={{ background: "#fff",
                               border: "1px solid " + C.line, borderLeft: "3px solid " + (l.medium === "strom" ? C.strom : C.gas) }}>
                            <div className="flex items-center gap-2 mb-2 text-sm">
                              <MediumIcon medium={l.medium} />
                              {l.bezeichnung || (l.medium === "strom" ? "Strom" : "Erdgas")}
                              <span className="text-xs" style={{ color: C.muted }}>
                                {num(zahlLesen(l.verbrauch) || 0)} kWh/Jahr
                              </span>
                            </div>
                            <div className="grid sm:grid-cols-2 gap-3 mb-2">
                              <Feld label="Bisheriger Versorger" value={vv.versorger ?? (l.versorger || "")}
                                onChange={(x) => setVorvFeld(l.id, "versorger", x)} />
                              <Select label="Abrechnung aus dem Jahr" value={abrechnungsJahrVon(vv, l)}
                                onChange={(x) => setVorvFeld(l.id, "jahr", x)}
                                options={[{ value: "", label: "unbekannt, kein Ausgleich" }, { value: "2025", label: "2025" },
                                          { value: "2026", label: "2026" }, { value: umlagenJahr(UMLAGEN), label: umlagenJahr(UMLAGEN) + " (schon neue Umlagen)" }]} />
                              <Select label="Preis ermitteln" value={modus}
                                onChange={(x) => setVorvFeld(l.id, "modus", x)}
                                options={[{ value: "preis", label: "Arbeitspreis eintragen" },
                                          { value: "rechnung", label: "Aus der Rechnung berechnen" }]} />
                            </div>
                            {modus === "preis" ? (
                              <div className="grid grid-cols-2 gap-3">
                                <Feld label="Arbeitspreis (ct/kWh)" value={vv.arbeit || ""}
                                  onChange={(x) => setVorvFeld(l.id, "arbeit", x)} />
                                <Feld label="Grundpreis (€/Jahr)" value={vv.grundpreis || ""}
                                  onChange={(x) => setVorvFeld(l.id, "grundpreis", x)} />
                              </div>
                            ) : (
                              <div className="grid grid-cols-2 gap-3">
                                <Feld label="Abrechnung von" type="date" value={vv.von || ""}
                                  onChange={(x) => setVorvFeld(l.id, "von", x)} />
                                <Feld label="Abrechnung bis" type="date" value={vv.bis || ""}
                                  onChange={(x) => setVorvFeld(l.id, "bis", x)} />
                                <Feld label="Rechnungsbetrag netto (€)" value={vv.betrag || ""}
                                  onChange={(x) => setVorvFeld(l.id, "betrag", x)} />
                                <Feld label="Verbrauch laut Rechnung (kWh)" value={vv.verbrauch || ""}
                                  placeholder={l.verbrauch ? "z. B. " + num(zahlLesen(l.verbrauch) || 0) : ""}
                                  onChange={(x) => setVorvFeld(l.id, "verbrauch", x)} />
                                <Feld label="Grundpreis (€/Jahr), falls bekannt" value={vv.grundpreis || ""}
                                  onChange={(x) => setVorvFeld(l.id, "grundpreis", x)} breit />
                              </div>
                            )}
                            {ergebnis && umlagenAusgleich(vv, l) && (() => {
                              const au = umlagenAusgleich(vv, l);
                              return (
                                <p className="text-xs mt-2" style={{ color: C.strom }}>
                                  Umlagen {au.jahr}: {num(au.alt, 3)} ct/kWh, {au.ziel}: {num(au.neu, 3)} ct/kWh.
                                  Im Vergleich wird der Arbeitspreis um {(au.diff >= 0 ? "+" : "") + num(au.diff, 3)} ct/kWh
                                  auf {num(ergebnis.arbeit + au.diff, 4)} ct/kWh angepasst, mit Hinweis im Angebot.
                                </p>
                              );
                            })()}
                            {ergebnis && (
                              <p className="text-xs mt-2" style={{ color: C.ok }}>
                                Arbeitspreis bisher: {num(ergebnis.arbeit, 4)} ct/kWh
                                {ergebnis.aufgerechnet ? " (aus " + num(ergebnis.tage || 0) + " Tagen Abrechnung" +
                                  (ergebnis.grundpreis ? ", ohne anteiligen Grundpreis" : "") + ")" : ""}
                                {ergebnis.grundpreis ? " · Grundpreis " + num(ergebnis.grundpreis, 2) + " €/Jahr" : ""}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <p className="text-xs" style={{ color: a.vollmachtAnhaengen === false ? C.gas : C.ok }}>
                    {a.vollmachtAnhaengen === false
                      ? "Der Vertriebspartner möchte die Vollmacht nicht im Angebot. Das PDF enthält sie dann nicht."
                      : "Der Vertriebspartner möchte die Vollmacht im Angebot. Das PDF enthält den Service- & Beratungsauftrag."}
                  </p>
                  <label className="block">
                    <span className="block text-xs mb-1" style={{ color: C.muted }}>
                      Zusatzbemerkungen im Service- & Beratungsauftrag (frei, optional)
                    </span>
                    <textarea rows={3} value={vmBemerkung} onChange={(e) => setVmBemerkung(e.target.value)}
                      placeholder="z. B. Kündigung beim bisherigen Versorger zum 31.12. bereits erfolgt"
                      className="w-full px-3 py-2 text-sm rounded outline-none"
                      style={{ border: "1px solid " + C.line }} />
                    <span className="block text-xs mt-1" style={{ color: C.muted }}>
                      Erscheint im PDF in einem eigenen Feld. Darunter bleiben Linien frei, damit der Kunde
                      von Hand ergänzen kann.
                    </span>
                  </label>

                  <SmartmeterKalk a={a} sm={sm} setSm={setSm} user={user} />

                  <label className="block">
                    <span className="block text-xs mb-1" style={{ color: C.muted }}>
                      Hinweis an den Vertriebspartner (nur intern, steht nicht im Angebot)
                    </span>
                    <textarea rows={3} value={hinweisPartner} onChange={(e) => setHinweisPartner(e.target.value)}
                      placeholder="z. B. Preise nur bis Freitag haltbar, Kunde vorher auf die Vollmacht ansprechen"
                      className="w-full px-3 py-2 text-sm rounded outline-none"
                      style={{ border: "1px solid " + C.line }} />
                    <span className="block text-xs mt-1" style={{ color: C.muted }}>
                      Erscheint beim Vertriebspartner gut sichtbar über den Angeboten.
                    </span>
                  </label>

                  <UmlagenPflege user={user} />

                  {vars.map((v, i) => (
                    <div key={v.id} className="rounded overflow-hidden" style={{ border: "1px solid " + C.line }}>
                      <div className="flex items-center justify-between px-4 py-2"
                           style={{ background: "#F6F8FA", borderBottom: "1px solid " + C.line }}>
                        <span className="text-sm">
                          Variante {i + 1}: {v.produkt} · {laufzeitMonate(v) || v.laufzeit} Monate
                          {v.sparte && v.sparte !== "beide" ? " · " + (v.sparte === "gas" ? "Erdgas" : "Strom") : ""}
                          {Array.isArray(v.lieferstellenIds) && v.lieferstellenIds.length ? " · " + stellenVon(a, v).map((l) => l.bezeichnung || "Lieferstelle").join(", ") : ""}
                        </span>
                        {vars.length > 1 && (
                          <button onClick={() => varLoeschen(v.id)} style={{ color: C.muted }}>
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                      <div className="p-4 space-y-4">
                        <div className="grid sm:grid-cols-2 gap-4">
                          <div>
                            <Select label="Gilt für" value={v.sparte || "beide"}
                              onChange={(x) => setVars(vars.map((y) => y.id === v.id ? { ...y, sparte: x, lieferstellenIds: null } : y))} options={SPARTEN} />
                            {(() => {
                              /* einzelne Lieferstellen für diese Variante wählen (ohne Auswahl: alle der Sparte) */
                              const moeglich = stellenVon(a, { sparte: v.sparte });
                              if (moeglich.length < 2) return null;
                              const ids = Array.isArray(v.lieferstellenIds) && v.lieferstellenIds.length ? v.lieferstellenIds : moeglich.map((l) => l.id);
                              const umschalten = (id) => {
                                const neu = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
                                if (!neu.length) return;
                                setVar(v.id, "lieferstellenIds", neu.length === moeglich.length ? null : neu);
                              };
                              return (
                                <div className="mt-2 p-2 rounded" style={{ background: "#F6F8FA", border: "1px solid " + C.line }}>
                                  <span className="block text-xs mb-1" style={{ color: C.muted }}>Lieferstellen in dieser Variante</span>
                                  {moeglich.map((l) => (
                                    <label key={l.id} className="flex items-center gap-2 text-sm py-0.5">
                                      <input type="checkbox" checked={ids.includes(l.id)} onChange={() => umschalten(l.id)} />
                                      <MediumIcon medium={l.medium} />
                                      {l.bezeichnung || (l.medium === "gas" ? "Erdgas" : "Strom")}
                                      <span className="text-xs" style={{ color: C.muted }}>{num(parseFloat(l.verbrauch) || 0)} kWh</span>
                                    </label>
                                  ))}
                                </div>
                              );
                            })()}
                          </div>
                          <Select label="Neuer Versorger" value={v.versorger || ""}
                            onChange={(x) => setVar(v.id, "versorger", x)}
                            options={[{ value: "", label: "Bitte wählen" },
                              ...(versorger || []).map((x) => ({ value: x.name, label: x.name }))]} />
                          <Select label="Beschaffungsmodell" value={v.produkt}
                            onChange={(x) => setVar(v.id, "produkt", x)} options={PRODUKTE} />
                          <Feld label="Aufschlag für den Vertriebspartner (ct/kWh)" value={v.aufschlag}
                            onChange={(x) => setVar(v.id, "aufschlag", x)}
                            placeholder={"Wunsch: " + num(a.aufschlag, 3)} />
                          <div>
                            <Feld label="Tatsächlicher Aufschlag (ct/kWh), sieht der Vertrieb nicht" value={v.aufschlagEcht || ""}
                              onChange={(x) => setVar(v.id, "aufschlagEcht", x)}
                              placeholder={"leer = wie oben (" + num(ctZahl(v.aufschlag), 3) + ")"} />
                            {hatWertK(v.aufschlagEcht) && ctZahl(v.aufschlagEcht) < ctZahl(v.aufschlag) && (
                              <p className="text-xs mt-1" style={{ color: C.warn }}>Der tatsächliche Aufschlag ist kleiner als der mitgeteilte.</p>
                            )}
                          </div>
                          <Feld label="Lieferbeginn" type="date" value={v.lieferbeginn || ""}
                            onChange={(x) => setVar(v.id, "lieferbeginn", x)} />
                          <Select label="Vertragsdauer festlegen über" value={v.laufzeitArt || "monate"}
                            onChange={(x) => setVar(v.id, "laufzeitArt", x)}
                            options={[{ value: "monate", label: "Laufzeit in Monaten" },
                                      { value: "ende", label: "festes Lieferende" }]} />
                          {(v.laufzeitArt || "monate") === "ende" ? (
                            <Feld label="Lieferende" type="date" value={v.lieferende || ""}
                              onChange={(x) => setVar(v.id, "lieferende", x)} />
                          ) : (
                            <Select label="Vertragslaufzeit" value={String(v.laufzeit)}
                              onChange={(x) => setVar(v.id, "laufzeit", parseInt(x))}
                              options={LAUFZEITEN.map((l) => ({ value: String(l), label: l + " Monate" }))} />
                          )}
                          <Feld label="Angebot gültig bis" type="date" value={v.gueltigBis || ""}
                            onChange={(x) => setVar(v.id, "gueltigBis", x)} breit />
                        </div>
                        {(v.laufzeitArt || "monate") === "ende" && v.lieferbeginn && v.lieferende && (
                          <p className="text-xs" style={{ color: C.muted }}>
                            Ergibt {num(monateZwischen(v.lieferbeginn, v.lieferende) || 0)} Monate Laufzeit.
                          </p>
                        )}

                        <div>
                          <div className="flex items-baseline justify-between mb-2">
                            <span className="text-sm">Preise des neuen Versorgers je Lieferstelle</span>
                            <span className="text-xs" style={{ color: C.muted }}>netto</span>
                          </div>
                          <div className="space-y-3">
                            {stellenVon(a, v)
                              .map((l) => (
                              <div key={l.id} className="p-3 rounded"
                                   style={{ border: "1px solid " + C.line,
                                            borderLeft: "3px solid " + (l.medium === "strom" ? C.strom : C.gas) }}>
                                <div className="flex items-center gap-2 mb-2 text-sm">
                                  <MediumIcon medium={l.medium} />
                                  {l.bezeichnung || (l.medium === "strom" ? "Strom" : "Erdgas")}
                                </div>
                                <div className="grid sm:grid-cols-3 gap-4">
                                  <Feld label="Arbeitspreis (ct/kWh)"
                                    value={(v.preise[l.id] || {}).arbeit || ""}
                                    onChange={(x) => setVarPreis(v.id, l.id, "arbeit", x)} />
                                  <Feld label={(v.preise[l.id] || {}).ohneGrundpreis ? "davon Energiepreis inkl. Grundpreis (ct/kWh)" : "davon Energiepreis (ct/kWh)"}
                                    value={(v.preise[l.id] || {}).energie || ""}
                                    onChange={(x) => setVarPreis(v.id, l.id, "energie", x)} />
                                  {!(v.preise[l.id] || {}).ohneGrundpreis && (
                                    <Feld label="Grundpreis (€/Jahr)"
                                      value={(v.preise[l.id] || {}).grundpreis || ""}
                                      onChange={(x) => setVarPreis(v.id, l.id, "grundpreis", x)} />
                                  )}
                                </div>
                                {/* Manche Versorger haben keinen Grundpreis: er steckt im Energiepreis (ct/kWh) */}
                                <label className="flex items-start gap-2 text-sm mt-2">
                                  <input type="checkbox" className="mt-0.5" checked={!!(v.preise[l.id] || {}).ohneGrundpreis}
                                    onChange={(e) => setVar(v.id, "preise", { ...v.preise, [l.id]: { ...(v.preise[l.id] || {}),
                                      ohneGrundpreis: e.target.checked, ...(e.target.checked ? { grundpreis: "" } : {}) } })} />
                                  <span>Ohne Grundpreis
                                    <span className="block text-xs" style={{ color: C.muted }}>
                                      Der Versorger nennt Energiepreis und Grundpreis zusammen in ct/kWh. Im Angebot steht dann kein Grundpreis,
                                      der Energiepreis heißt „inkl. Grundpreis“.
                                    </span>
                                  </span>
                                </label>
                                <div className="grid sm:grid-cols-3 gap-4 mt-3">
                                  <Feld label="Netzentgelte laut Versorger (ct/kWh), freiwillig"
                                    value={(v.preise[l.id] || {}).netz || ""}
                                    onChange={(x) => setVarPreis(v.id, l.id, "netz", x)}
                                    placeholder="leer = berechnet" />
                                  <p className="sm:col-span-2 text-xs self-end" style={{ color: C.muted }}>
                                    Eingetragen übernimmt das Angebot die Aufteilung des Versorgers: Netzentgelte wie hier,
                                    Umlagen und Abgaben = Arbeitspreis − Energiepreis − Netzentgelte.
                                  </p>
                                </div>
                                {l.zaehlerart === "RLM" && (
                                  <div className="grid sm:grid-cols-3 gap-4 mt-3">
                                    <Feld label="Lastspitze (kW)"
                                      value={(v.preise[l.id] || {}).leistung !== undefined ? (v.preise[l.id] || {}).leistung : (l.lastspitze || "")}
                                      onChange={(x) => setVarPreis(v.id, l.id, "leistung", x)} />
                                    <Feld label="Leistungspreis (€/kW)"
                                      value={(v.preise[l.id] || {}).leistungspreis || ""}
                                      onChange={(x) => setVarPreis(v.id, l.id, "leistungspreis", x)} />
                                  </div>
                                )}
                                {(() => {
                                  /* eigene Werte dieser Lieferstelle; leer = wie die Variante */
                                  const pr = v.preise[l.id] || {};
                                  const sv = stelleIn(v, l);
                                  const art = pr.laufzeitArt || "monate";
                                  return (
                                    <details className="mt-3 rounded" open={stelleAbweichend(v, l)}
                                      style={{ border: "1px solid " + (stelleAbweichend(v, l) ? C.gas : C.line), background: "#fff" }}>
                                      <summary className="px-3 py-2 text-sm cursor-pointer">
                                        Abweichend für diese Lieferstelle: Versorger, Lieferzeit, Aufschläge
                                        {stelleAbweichend(v, l) && <span className="text-xs ml-2" style={{ color: C.gas }}>eigene Werte</span>}
                                      </summary>
                                      <div className="px-3 pb-3 grid sm:grid-cols-2 gap-4">
                                        <Select label="Neuer Versorger" value={pr.versorger || ""}
                                          onChange={(x) => setVarPreis(v.id, l.id, "versorger", x)}
                                          options={[{ value: "", label: "wie Variante" + (v.versorger ? " (" + v.versorger + ")" : "") },
                                            ...(versorger || []).map((x) => ({ value: x.name, label: x.name }))]} />
                                        <Feld label="Aufschlag für den Vertriebspartner (ct/kWh)" value={pr.aufschlag || ""}
                                          onChange={(x) => setVarPreis(v.id, l.id, "aufschlag", x)}
                                          placeholder={"wie Variante: " + num(ctZahl(v.aufschlag), 3)} />
                                        <Feld label="Tatsächlicher Aufschlag (ct/kWh)" value={pr.aufschlagEcht || ""}
                                          onChange={(x) => setVarPreis(v.id, l.id, "aufschlagEcht", x)}
                                          placeholder={"wie " + (hatWertK(v.aufschlagEcht) ? "Variante: " + num(ctZahl(v.aufschlagEcht), 3) : "für den Vertriebspartner")} />
                                        <Feld label={"Lieferbeginn" + (pr.lieferbeginn ? "" : " (leer = wie Variante)")} type="date" value={pr.lieferbeginn || ""}
                                          onChange={(x) => setVarPreis(v.id, l.id, "lieferbeginn", x)} />
                                        <Select label="Laufzeit" value={art === "ende" ? "ende" : String(pr.laufzeit || "")}
                                          onChange={(x) => x === "ende"
                                            ? setVar(v.id, "preise", { ...v.preise, [l.id]: { ...pr, laufzeitArt: "ende", laufzeit: "" } })
                                            : setVar(v.id, "preise", { ...v.preise, [l.id]: { ...pr, laufzeitArt: "monate", laufzeit: x ? parseInt(x) : "", lieferende: "" } })}
                                          options={[{ value: "", label: "wie Variante (" + (laufzeitMonate(v) || v.laufzeit || "–") + " Monate)" },
                                            ...LAUFZEITEN.map((m) => ({ value: String(m), label: m + " Monate" })),
                                            { value: "ende", label: "festes Lieferende" }]} />
                                        {art === "ende" && (
                                          <Feld label="Lieferende" type="date" value={pr.lieferende || ""}
                                            onChange={(x) => setVarPreis(v.id, l.id, "lieferende", x)} />
                                        )}
                                        <p className="sm:col-span-2 text-xs" style={{ color: C.muted }}>
                                          Gilt für diese Lieferstelle: {sv.versorger || "Versorger offen"} · Beginn {sv.lieferbeginn ? datum(sv.lieferbeginn) : "offen"}
                                          {" · "}{laufzeitMonate(sv) ? jahreText(laufzeitMonate(sv)) : "Laufzeit offen"}
                                          {enddatum(sv) ? " bis " + datum(enddatum(sv)) : ""} · Aufschlag Vertrieb {num(ctZahl(sv.aufschlag), 3)}
                                          {ctZahl(sv.aufschlagEcht) !== ctZahl(sv.aufschlag) ? ", tatsächlich " + num(ctZahl(sv.aufschlagEcht), 3) : ""} ct/kWh
                                        </p>
                                      </div>
                                    </details>
                                  );
                                })()}
                                {(() => {
                                  const t = preisTeile(l, v.preise[l.id], v.umlagen);
                                  const ct3 = (x) => isNaN(x) ? "–" : num(x, 4) + " ct/kWh";
                                  return (
                                    <div className="mt-3 text-xs space-y-0.5" style={{ color: C.muted }}>
                                      <div>Staatliche Umlagen und Abgaben {ct3(t.umlage)}
                                        {isNaN(t.umlage) ? " · bitte oben einmal für " + (l.medium === "gas" ? "Erdgas" : "Strom") + " hinterlegen"
                                          : t.umlagenTeile.length > 1 ? " (" + t.umlagenTeile.map((x) => x.name + " " + x.wert).join(", ") + ")" : ""}</div>
                                      <div style={{ color: !isNaN(t.netz) && t.netz < 0 ? C.warn : C.muted }}>
                                        {t.netzVomVersorger ? "Netzentgelte laut Versorger " : "Netzentgelte (Arbeitspreis − Energiepreis − Umlagen) "}{ct3(t.netz)}
                                        {!isNaN(t.netz) && t.netz < 0 ? " · negativ, bitte Preise prüfen" : ""}</div>
                                      {t.rlm && <div>Leistungspreis Netz {isNaN(t.leistungKosten) ? "–"
                                        : num(t.kw, 1) + " kW × " + num(t.leistungspreis, 2) + " €/kW = " + eur(t.leistungKosten) + " pro Jahr"}</div>}
                                    </div>
                                  );
                                })()}
                              </div>
                            ))}
                          </div>
                        </div>

                        <Provisionsblock a={a} mitarbeiter={mitarbeiter} user={user}
                          laufzeit={laufzeitFuer(a, v)}
                          variante={{ ...v, aufschlag: parseFloat(String(v.aufschlag).replace(",", ".")) || 0 }} />

                        <label className="block">
                          <span className="block text-xs mb-1" style={{ color: C.muted }}>Hinweis im Angebot (steht im PDF, sieht der Kunde)</span>
                          <textarea rows={2} value={v.bemerkung}
                            onChange={(e) => setVar(v.id, "bemerkung", e.target.value)}
                            className="w-full px-3 py-2 text-sm rounded outline-none"
                            style={{ border: "1px solid " + C.line }} />
                        </label>

                        <Datei mehrere label="Angebot als PDF" datei={v.angebot}
                          onSet={(f) => setVar(v.id, "angebot", f)} hinweis="Angebot anhängen" />
                        <Datei mehrere label="Individualangebot vom Versorger (z. B. Tranchen oder PPA)" datei={v.individualangebot}
                          onSet={(f) => setVar(v.id, "individualangebot", f)} hinweis="Individualangebot anhängen" />
                        <div className="flex flex-wrap gap-2">
                          <Btn icon={FileText} onClick={() => angebotErzeugen(v, true)} disabled={!!erzeugt}>
                            {erzeugt === v.id + ":mit" ? "Angebot wird erzeugt …" : "Angebot mit Vorversorger-Vergleich"}
                          </Btn>
                          <Btn variante="hell" icon={FileText} onClick={() => angebotErzeugen(v, false)} disabled={!!erzeugt}>
                            {erzeugt === v.id + ":ohne" ? "Angebot wird erzeugt …" : "Angebot ohne Vorversorger-Vergleich"}
                          </Btn>
                        </div>
                        {v.angebot && (
                          <div className="flex flex-wrap items-center gap-2">
                            <Btn variante="ok" icon={FileText} onClick={() => dateiOeffnen(dateienVon(v.angebot)[0])}>Angebot ansehen</Btn>
                            <span className="text-xs" style={{ color: C.muted }}>
                              {v.angebotMitVergleich === false ? "ohne Vorversorger-Vergleich" : v.angebotMitVergleich ? "mit Vorversorger-Vergleich" : ""}
                            </span>
                          </div>
                        )}
                        <p className="text-xs" style={{ color: C.muted }}>
                          Deckblatt, Angebot (wahlweise mit Vergleich zum bisherigen Versorger), Lastgang-Analyse bei RLM,
                          Service- & Beratungsauftrag und nächste Schritte. Das PDF wird an diese Variante angehängt und gleich angezeigt.
                          Zum Nachbearbeiten Preise ändern und neu erzeugen.
                        </p>
                      </div>
                    </div>
                  ))}

                  <Btn variante="hell" icon={Plus} onClick={() => setVars([...vars, leereVariante(a)])}>
                    Weitere Variante hinzufügen
                  </Btn>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <Datei mehrere label="Maklervollmacht (PDF) – gilt für alle Varianten" datei={vollmacht}
                      onSet={setVollmacht} hinweis="PDF anhängen" />
                  </div>

                  <div className="rounded p-4 space-y-3" style={{ background: "#F6F8FA",
                       border: "1px solid " + (dlvNoetig ? C.strom : C.line) }}>
                    <label className="flex items-start gap-3 text-sm">
                      <input type="checkbox" className="mt-0.5" checked={dlvNoetig}
                        onChange={(e) => setDlvNoetig(e.target.checked)} style={{ accentColor: C.ink }} />
                      <span>
                        Dienstleistungsvertrag wird benötigt
                        <span className="block text-xs mt-0.5" style={{ color: C.muted }}>
                          {a.dienstleistungsvertrag ? "Vom Vertriebspartner angefordert. " : ""}
                          Energiebeschaffung und Erstattungsprüfung, gilt für alle Kunden. Wird mit dem Angebot an den Vertriebspartner gesendet.
                        </span>
                      </span>
                    </label>
                    {dlvNoetig && (
                      <div className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                          {[[true, "Mit Honorar"], [false, "Ohne Honorar"]].map(([w, label]) => (
                            <button key={label} onClick={() => setDlvHonorar({ ...dlvHonorar, mit: w })}
                              className="px-3 py-2 rounded text-sm flex items-center gap-2"
                              style={dlvHonorar.mit === w ? { background: C.ink, color: "#fff" }
                                : { background: "#fff", color: C.text, border: "1px solid " + C.line }}>
                              <span className="w-3.5 h-3.5 rounded-full inline-block"
                                style={{ border: "2px solid " + (dlvHonorar.mit === w ? "#fff" : C.muted),
                                         background: dlvHonorar.mit === w ? C.gruen : "transparent" }} />
                              {label}
                            </button>
                          ))}
                        </div>
                        {dlvHonorar.mit ? (
                          <div className="space-y-3">
                            <div className="sm:max-w-xs">
                              <Feld label="Honorar in € pro Monat (zzgl. USt.)" value={dlvHonorar.betrag}
                                onChange={(v) => setDlvHonorar({ ...dlvHonorar, betrag: v })} />
                            </div>
                            <div>
                              <span className="block text-xs mb-1" style={{ color: C.muted }}>Wenn der Kunde die Referenzfreigabe erteilt:</span>
                              <div className="flex flex-wrap gap-2">
                                {[["komplett", "Komplett erlassen"], ["jahr", "Nur im ersten Jahr erlassen"], ["rabatt", "Vergünstigt"]].map(([w, label]) => (
                                  <button key={w} onClick={() => setDlvHonorar({ ...dlvHonorar, referenz: w })}
                                    className="px-3 py-1.5 rounded text-sm"
                                    style={(dlvHonorar.referenz || "komplett") === w ? { background: C.ink, color: "#fff" }
                                      : { background: "#fff", color: C.text, border: "1px solid " + C.line }}>{label}</button>
                                ))}
                              </div>
                            </div>
                            {dlvHonorar.referenz === "rabatt" && (
                              <div className="sm:max-w-xs">
                                <Feld label="Vergünstigte Servicepauschale in € pro Monat" value={dlvHonorar.rabattBetrag || ""}
                                  onChange={(v) => setDlvHonorar({ ...dlvHonorar, rabattBetrag: v })}
                                  fehler={dlvHonorar.rabattBetrag && zahlLesen(dlvHonorar.rabattBetrag) >= zahlLesen(dlvHonorar.betrag)
                                    ? "Muss unter dem Honorar liegen" : null} />
                              </div>
                            )}
                          </div>
                        ) : null}
                        <p className="text-xs" style={{ color: C.muted }}>
                          {dlvHonorarWert().mit
                            ? "Servicepauschale " + num(dlvHonorarWert().betrag, 2) + " € pro Monat. Bei Referenzfreigabe "
                              + ({ komplett: "entfällt sie ganz", jahr: "entfällt sie im ersten Jahr",
                                   rabatt: "kostet sie " + (dlvHonorarWert().rabattBetrag ? num(dlvHonorarWert().rabattBetrag, 2) + " €" : "den eingetragenen Betrag") }[dlvHonorarWert().referenz])
                              + ". Laufzeit 12 Monate mit Verlängerung."
                            : "Ohne Honorar: Die Leistungen gelten, solange die Energiebeschaffung über einen von EGC Energie vermittelten Vertrag läuft. So lange läuft auch der Dienstleistungsvertrag."}
                        </p>
                        <div className="sm:max-w-xs">
                          <Feld label="Erfolgshonorar auf Erstattungen in % (0 = keins)" value={dlvHonorar.erfolg}
                            onChange={(v) => setDlvHonorar({ ...dlvHonorar, erfolg: v })} />
                        </div>
                        <Btn icon={FileSignature} onClick={dlvErzeugen} disabled={dlvLaeuft}>
                          {dlvLaeuft ? "Wird erzeugt …" : dlv ? "Dienstleistungsvertrag neu erzeugen" : "Dienstleistungsvertrag erzeugen (PDF)"}
                        </Btn>
                        <p className="text-xs" style={{ color: C.muted }}>
                          Mit Firma und Anschrift des Kunden ausgefüllt, wird angehängt und zum Herunterladen angeboten.
                          Stimmt die Anschrift nicht, zuerst im Vorgang korrigieren.
                        </p>
                        <Datei mehrere label="Dienstleistungsvertrag (PDF)" datei={dlv} onSet={setDlv}
                          hinweis="oder eigenes PDF anhängen" />
                      </div>
                    )}
                  </div>

                  <div>
                    <Btn icon={Send} onClick={angebotSenden} disabled={!bereit}>
                      {vars.length > 1 ? vars.length + " Angebote an Vertriebspartner senden" : "Angebot an Vertriebspartner senden"}
                    </Btn>
                    {!bereit && (
                      <p className="text-xs mt-2" style={{ color: C.muted }}>
                        Jede Variante braucht ein Angebot: erzeugt, als PDF angehängt oder als Individualangebot vom Versorger.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {modus === "rueck" && (
                <div className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-2">
                    {FEHLGRUENDE.map((f) => (
                      <label key={f} className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={fehlend.includes(f)}
                          onChange={() => setFehlend(fehlend.includes(f)
                            ? fehlend.filter((x) => x !== f) : [...fehlend, f])}
                          style={{ accentColor: C.warn }} />
                        {f}
                      </label>
                    ))}
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={sonstiges.an}
                        onChange={(e) => setSonstiges({ ...sonstiges, an: e.target.checked })}
                        style={{ accentColor: C.warn }} />
                      Sonstiges
                    </label>
                  </div>
                  {sonstiges.an && (
                    <Feld label="Was fehlt noch? (erscheint beim Vertriebspartner als eigener Punkt)" value={sonstiges.text}
                      onChange={(x) => setSonstiges({ ...sonstiges, text: x })}
                      placeholder="z. B. Pachtvertrag der zweiten Filiale, Handelsregisterauszug" breit />
                  )}
                  <label className="block">
                    <span className="block text-xs mb-1" style={{ color: C.muted }}>Ergänzender Hinweis</span>
                    <textarea rows={3} value={fehlendText} onChange={(e) => setFehlendText(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded outline-none"
                      style={{ border: "1px solid " + C.line }} />
                  </label>
                  <Btn variante="gefahr" icon={RotateCcw} disabled={fehlend.length === 0 && !(sonstiges.an && sonstiges.text.trim())}
                    onClick={zurueckAnVertrieb}>
                    Anfrage an Vertriebspartner zurücksenden
                  </Btn>
                </div>
              )}

              {modus === "gf" && (
                <div className="space-y-4">
                  <p className="text-sm" style={{ color: C.muted, maxWidth: "60ch" }}>
                    Der Vorgang geht zur Abstimmung an die Geschäftsführung und ist so lange für die
                    Kalkulation gesperrt. Nach der Antwort landet er wieder im Eingang.
                  </p>
                  <label className="block">
                    <span className="block text-xs mb-1" style={{ color: C.muted }}>Frage an die Geschäftsführung</span>
                    <textarea rows={4} value={frage} onChange={(e) => setFrage(e.target.value)}
                      placeholder="z. B. Kunde ist offen für Spot. Bei 2,4 GWh Jahresmenge: welchen Aufschlag geben wir frei?"
                      className="w-full px-3 py-2 text-sm rounded outline-none"
                      style={{ border: "1px solid " + C.line }} />
                  </label>
                  <Btn icon={Send} onClick={rueckspracheStellen} disabled={!frage.trim()}>
                    Rücksprache anfragen
                  </Btn>
                </div>
              )}
            </div>
          )}

          {a.nachreichung && (
            <div className="rounded p-4" style={{ background: C.card, border: "1px solid " + C.ok }}>
              <div className="text-sm mb-2">Nachgereicht vom Vertriebspartner</div>
              {a.nachreichung.text && <p className="text-sm mb-3">{a.nachreichung.text}</p>}
              <div className="space-y-2">
                {(a.nachreichung.dateien || []).map((d, i) => <DateiChip key={i} datei={d} />)}
              </div>
              <p className="text-xs mt-3" style={{ color: C.muted }}>
                {a.nachreichung.von} · {datum(a.nachreichung.datum)}
              </p>
            </div>
          )}

          {istKalk && ["eingereicht", "angefragt", "ruecksprache", "uebermittelt"].includes(a.status) && (
            <div className="rounded p-4" style={{ background: C.card, border: "1px solid " + C.line }}>
              <div className="flex flex-wrap items-baseline gap-2 mb-3">
                <span className="text-sm">Branche und Versorger</span>
                <span className="text-sm px-2 py-0.5 rounded"
                      style={{ background: "#FDF6EE", color: C.gas, border: "1px solid " + C.line }}>
                  {a.kunde.branche || "keine Branche angegeben"}
                </span>
              </div>
              {(versorger || []).filter((v) => v.branchen).length === 0 ? (
                <p className="text-sm" style={{ color: C.muted }}>
                  Bei den Versorgern sind noch keine Branchenangaben hinterlegt. Die Geschäftsführung
                  kann sie unter Versorger ergänzen.
                </p>
              ) : (
                <div className="space-y-1">
                  {(versorger || []).filter((v) => v.branchen).map((v) => (
                    <div key={v.id} className="flex flex-wrap gap-x-2 text-sm py-1"
                         style={{ borderTop: "1px solid " + C.line }}>
                      <span>{v.name}</span>
                      <span style={{ color: C.muted }}>{v.branchen}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {a.absage && (
            <div className="rounded p-4" style={{ background: "#F6F8FA", border: "1px solid " + C.muted }}>
              <div className="text-sm mb-1">Absage: {a.absage.grund}</div>
              {a.absage.wiedervorlage && (
                <p className="text-sm" style={{ color: C.gas }}>
                  Wiedervorlage am {datum(a.absage.wiedervorlage)}
                </p>
              )}
              {a.absage.notiz && <p className="text-sm mt-1" style={{ color: C.muted }}>{a.absage.notiz}</p>}
            </div>
          )}

          {a.lieferstellenDatei && (
            <div className="rounded p-4" style={{ background: C.card, border: "1px solid " + C.line }}>
              <div className="text-sm mb-2">Lieferstellenliste des Kunden</div>
              <DateiChip datei={a.lieferstellenDatei} label="Liste" />
            </div>
          )}

          {a.dienstleistungsvertrag && (
            <div className="rounded p-4" style={{ background: "#F6F8FA", border: "1px solid " + C.strom }}>
              <div className="text-sm" style={{ color: C.strom }}>Dienstleistungsvertrag gewünscht</div>
              <p className="text-sm mt-1" style={{ color: C.muted }}>
                Der Vertriebspartner hat einen Dienstleistungsvertrag angefordert. Gesamtmenge{" "}
                {num(verbrauchGesamt(a))} kWh.
              </p>
            </div>
          )}

          {a.bemerkungVertrieb && (
            <div className="rounded p-4" style={{ background: C.card, border: "1px solid " + C.line }}>
              <div className="text-sm mb-2">Bemerkung des Vertriebspartners</div>
              <p className="text-sm">{a.bemerkungVertrieb}</p>
            </div>
          )}

          {(a.produkt === EMPFEHLUNG || a.produktGas === EMPFEHLUNG) && (
            <div className="rounded p-4" style={{ background: "#F1F7F0", border: "1px solid " + C.gruen }}>
              <div className="text-sm mb-1" style={{ color: C.ok }}>Produktempfehlung angefragt</div>
              <p className="text-sm">
                Der Vertriebspartner möchte eine Empfehlung für
                {a.produkt === EMPFEHLUNG && verbrauchMedium(a, "strom") > 0 ? " Strom" : ""}
                {a.produkt === EMPFEHLUNG && a.produktGas === EMPFEHLUNG && verbrauchMedium(a, "gas") > 0 ? " und" : ""}
                {a.produktGas === EMPFEHLUNG && verbrauchMedium(a, "gas") > 0 ? " Erdgas" : ""}.
              </p>
              {a.beratungHinweis && (
                <p className="text-sm mt-2 p-3 rounded" style={{ background: "#fff" }}>{a.beratungHinweis}</p>
              )}
            </div>
          )}

          {/* Rücksprache mit der Geschäftsführung */}
          {intern && a.ruecksprache && (
            <div className="rounded p-5" style={{ background: C.card,
                 border: "1px solid " + (a.status === "ruecksprache" ? C.gruen : C.line), ...reihe(a.status === "ruecksprache" ? -2 : 0) }}>
              <div className="text-sm mb-3">Rücksprache Geschäftsführung</div>
              <div className="p-3 rounded text-sm" style={{ background: "#F6F8FA" }}>
                {a.ruecksprache.frage}
                <span className="block text-xs mt-1" style={{ color: C.muted }}>
                  {a.ruecksprache.von} · {datum(a.ruecksprache.datum)}
                </span>
              </div>

              {a.ruecksprache.antwort ? (
                <div className="p-3 rounded text-sm mt-3" style={{ background: "#F1F7F0" }}>
                  {a.ruecksprache.antwort}
                  <span className="block text-xs mt-1" style={{ color: C.muted }}>
                    {a.ruecksprache.antwortVon} · {datum(a.ruecksprache.antwortDatum)}
                  </span>
                </div>
              ) : istGF ? (
                <div className="mt-4 space-y-3">
                  <label className="block">
                    <span className="block text-xs mb-1" style={{ color: C.muted }}>Antwort und Freigabe</span>
                    <textarea rows={4} value={antwort} onChange={(e) => setAntwort(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded outline-none"
                      style={{ border: "1px solid " + C.line }} />
                  </label>
                  <Btn variante="ok" icon={Send} onClick={rueckspracheBeantworten} disabled={!antwort.trim()}>
                    Antwort an Kalkulation senden
                  </Btn>
                </div>
              ) : (
                <p className="text-sm mt-3" style={{ color: C.muted }}>
                  Wartet auf Antwort der Geschäftsführung.
                </p>
              )}
            </div>
          )}

          {/* Aufgabe 10: Bearbeitung durch das Kalkulationsteam nach dem Abschluss */}
          {istKalk && ["uebermittelt", "einreichung"].includes(a.status) && (
            <div className="rounded p-5"
                 style={{ background: a.einreichung ? "#FDF9EC" : C.card,
                          border: "1px solid " + (a.einreichung ? C.gold : C.strom), ...reihe(-2) }}>
              <div className="text-sm mb-3">
                {a.status === "uebermittelt" ? "Auftrag vom Vertriebspartner: bereit zum Einreichen" : "An Versorger übermittelt, Bestätigung ausstehend"}
              </div>

              {a.annahme && a.annahme.umfang && a.annahme.umfang !== "alle" && (
                <p className="text-sm px-3 py-2 rounded mb-3" style={{ background: "#FDF6EE" }}>
                  Der Kunde nimmt nur {a.annahme.umfang === "gas" ? "Erdgas" : "Strom"} an.
                  {(a.lieferstellenNichtAngenommen || []).length > 0 && " Nicht angenommen: " +
                    a.lieferstellenNichtAngenommen.map((l) => l.bezeichnung || (l.medium === "gas" ? "Erdgas" : "Strom")).join(", ") + "."}
                </p>
              )}
              {laufzeitAbweichend(a) > 0 && (
                <p className="text-sm px-3 py-2 rounded mb-3" style={{ background: "#FDF6EE" }}>
                  Abweichende Laufzeit: {jahreText(laufzeitAbweichend(a))}
                  {aktiveVariante(a) ? " statt " + jahreText(laufzeitMonate(aktiveVariante(a))) + " laut Angebot" : ""}
                  {vertragsende(a) ? ", Lieferende " + datum(vertragsende(a)) : ""}. Bitte so beim Versorger einreichen.
                </p>
              )}
              {a.annahme && a.annahme.unterlagen && (
                <div className="space-y-2 mb-4">
                  <DateiChip datei={a.annahme.unterlagen} label="Maklervollmacht und Angebot" />
                  {(a.annahme.weitere || []).map((d, i) => <DateiChip key={i} datei={d} label="weiteres Dokument" />)}
                  {a.annahme.abweichung && (
                    <p className="text-sm p-3 rounded" style={{ background: "#FDF6EE" }}>
                      Abweichungswunsch: {a.annahme.abweichung}
                    </p>
                  )}
                </div>
              )}
              {a.annahme && !a.annahme.unterlagen && (
                <div className="space-y-2 mb-4">
                  {a.annahme.angebotUnterschrieben
                    ? <DateiChip datei={a.annahme.angebotUnterschrieben} label="Angebot unterschrieben" />
                    : a.annahme.kundeInformiert && (
                      <p className="text-sm px-3 py-2 rounded" style={{ background: "#F6F8FA" }}>
                        Kunde ist informiert und einverstanden, kein unterschriebenes Angebot beigefügt.
                      </p>
                    )}
                  {a.annahme.vollmacht && <DateiChip datei={a.annahme.vollmacht} label="Maklervollmacht" />}
                  {(a.annahme.weitere || []).map((d, i) => <DateiChip key={i} datei={d} label="weiteres Dokument" />)}
                  {a.annahme.abweichung && (
                    <p className="text-sm p-3 rounded" style={{ background: "#FDF6EE" }}>
                      Abweichungswunsch: {a.annahme.abweichung}
                    </p>
                  )}
                </div>
              )}

              {a.status === "uebermittelt" ? (
                <div className="mb-5">
                  <Btn icon={Send} onClick={() => onUpdate({ ...a, einreichung: true, status: "einreichung",
                    verlauf: [...a.verlauf, { d: heute(), t: "Auftrag an den Versorger übermittelt", w: user.name }] })}>
                    An Versorger übermittelt
                  </Btn>
                  <p className="text-xs mt-2" style={{ color: C.muted }}>
                    Erst damit sieht der Vertriebspartner „An Versorger übermittelt“. Bis dahin steht der Auftrag bei ihm unter „Bereit zum Einreichen“.
                  </p>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-3 mb-5 text-sm">
                  <span className="flex items-center gap-2" style={{ color: C.gold }}><Check size={15} /> An Versorger übermittelt</span>
                  <button className="text-xs underline" style={{ color: C.muted }}
                    onClick={() => onUpdate({ ...a, einreichung: false, status: "uebermittelt",
                      verlauf: [...a.verlauf, { d: heute(), t: "Übermittlung an den Versorger zurückgenommen", w: user.name }] })}>
                    Zurücknehmen
                  </button>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Btn variante={vModus === "best" ? "ok" : "hell"} icon={Check} onClick={() => setVModus("best")}>
                  Auftrag bestätigt
                </Btn>
                <Btn variante={vModus === "klaer" ? "primär" : "hell"} icon={AlertTriangle} onClick={() => setVModus("klaer")}>
                  Klärfall
                </Btn>
                <Btn variante={vModus === "abl" ? "gefahr" : "hell"} icon={X} onClick={() => setVModus("abl")}>
                  Abgelehnt
                </Btn>
              </div>

              {vModus === "best" && (
                <div className="mt-5 space-y-4 pt-5" style={{ borderTop: "1px solid " + C.line }}>
                  <Select label="Versorger" value={best.versorger}
                    onChange={(v) => setBest({ ...best, versorger: v })}
                    options={[{ value: "", label: "Bitte wählen" },
                      ...(versorger || []).map((x) => ({ value: x.name, label: x.name })),
                      ...((versorger || []).some((x) => x.name === best.versorger) || !best.versorger
                        ? [] : [{ value: best.versorger, label: best.versorger }])]} />

                  <div className="space-y-3">
                    {a.lieferstellen.map((l) => (
                      <div key={l.id} className="p-3 rounded"
                           style={{ border: "1px solid " + C.line,
                                    borderLeft: "3px solid " + (l.medium === "strom" ? C.strom : C.gas) }}>
                        <div className="flex items-center gap-2 mb-2 text-sm">
                          <MediumIcon medium={l.medium} />
                          {l.bezeichnung || (l.medium === "strom" ? "Strom" : "Erdgas")}
                          <span className="text-xs" style={{ color: C.muted }}>
                            angefragt {num(parseFloat(l.verbrauch) || 0)} kWh
                          </span>
                        </div>
                        <div className="grid sm:grid-cols-3 gap-4">
                          <Feld label="Bestätigte kWh" value={(best.stellen[l.id] || {}).kwh || ""} zahl
                            onChange={(v) => setBestStelle(l.id, "kwh", v)} />
                          <Feld label="Lieferbeginn" type="date" value={(best.stellen[l.id] || {}).beginn || ""}
                            onChange={(v) => setBestStelle(l.id, "beginn", v)} />
                          <Feld label="Lieferende" type="date" value={(best.stellen[l.id] || {}).ende || ""}
                            onChange={(v) => setBestStelle(l.id, "ende", v)} />
                          <Select label="Versorger dieser Lieferstelle" value={(best.stellen[l.id] || {}).versorger || ""}
                            onChange={(v) => setBestStelle(l.id, "versorger", v)}
                            options={[{ value: "", label: "wie oben" + (best.versorger ? " (" + best.versorger + ")" : "") },
                              ...(versorger || []).map((x) => ({ value: x.name, label: x.name }))]} />
                          <Feld label="Aufschlag Vertrieb dieser Lieferstelle (ct/kWh)" value={(best.stellen[l.id] || {}).aufschlag || ""}
                            onChange={(v) => setBestStelle(l.id, "aufschlag", v)}
                            placeholder={"wie unten: " + num(ctZahl(best.aufschlag), 3)} />
                          <Feld label="Tatsächlicher Aufschlag dieser Lieferstelle (ct/kWh)" value={(best.stellen[l.id] || {}).aufschlagEcht || ""}
                            onChange={(v) => setBestStelle(l.id, "aufschlagEcht", v)}
                            placeholder="wie unten" />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="grid sm:grid-cols-3 gap-4">
                    <Feld label="Aufschlag für den Vertriebspartner (ct/kWh), für alle Lieferstellen ohne eigenen" value={best.aufschlag}
                      onChange={(v) => setBest({ ...best, aufschlag: v })} />
                    <Feld label="Tatsächlicher Aufschlag (ct/kWh), leer = wie für den Vertriebspartner" value={best.aufschlagEcht || ""}
                      onChange={(v) => setBest({ ...best, aufschlagEcht: v })} />
                    <Select label="Bonuszahlung" value={best.bonusArt}
                      onChange={(v) => setBest({ ...best, bonusArt: v, bonus: v === "keine" ? "" : best.bonus })}
                      options={[{ value: "keine", label: "Keine" },
                                { value: "einmalig", label: "einmalig" },
                                { value: "jaehrlich", label: "pro Lieferjahr" }]} />
                    {best.bonusArt !== "keine" && (
                      <Feld label="Bonus in €" value={best.bonus}
                        onChange={(v) => setBest({ ...best, bonus: v })} />
                    )}
                  </div>

                  <Provisionsblock a={{ ...a, bestaetigung: { ...best,
                    aufschlag: parseFloat(String(best.aufschlag).replace(",", ".")) || 0 } }}
                    mitarbeiter={mitarbeiter} user={user} laufzeit={laufzeitVon(a)} />

                  <Btn variante="ok" icon={Check} onClick={auftragBestaetigen}
                    disabled={!best.versorger || bestaetigteMenge({ ...a, bestaetigung: best }) === 0}>
                    Auftrag final bestätigen
                  </Btn>
                </div>
              )}

              {vModus === "klaer" && (
                <div className="mt-5 space-y-4 pt-5" style={{ borderTop: "1px solid " + C.line }}>
                  <label className="block">
                    <span className="block text-xs mb-1" style={{ color: C.muted }}>Was ist zu klären?</span>
                    <textarea rows={3} value={vKlaer.text}
                      onChange={(e) => setVKlaer({ ...vKlaer, text: e.target.value })}
                      className="w-full px-3 py-2 text-sm rounded outline-none"
                      style={{ border: "1px solid " + C.line }} />
                  </label>
                  <div className="space-y-2">
                    {vKlaer.dateien.map((d, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="flex-1 min-w-0"><DateiChip datei={d} /></div>
                        <button onClick={() => setVKlaer({ ...vKlaer,
                          dateien: vKlaer.dateien.filter((_, x) => x !== i) })}
                          style={{ color: C.muted }}><X size={15} /></button>
                      </div>
                    ))}
                  </div>
                  <label className="flex items-center gap-2 px-3 py-2 rounded text-sm cursor-pointer"
                         style={{ border: "1px dashed " + C.line, color: C.muted, background: "#fff" }}>
                    <Upload size={14} /> Dokumente anhängen
                    <input type="file" multiple className="hidden"
                      onChange={(e) => Array.from(e.target.files || []).forEach((f) =>
                        dateiLesen(f, (d) => setVKlaer((v) => ({ ...v, dateien: [...v.dateien, d] }))))} />
                  </label>
                  <Btn icon={RotateCcw} onClick={versorgerKlaerfall} disabled={!vKlaer.text.trim()}>
                    Auftrag an den Vertriebspartner zurücksenden
                  </Btn>
                </div>
              )}

              {vModus === "abl" && (
                <div className="mt-5 space-y-4 pt-5" style={{ borderTop: "1px solid " + C.line }}>
                  <Datei mehrere label="Ablehnungsbegründung des Versorgers" datei={vAbl.dokument}
                    onSet={(f) => setVAbl({ ...vAbl, dokument: f })} hinweis="Datei auswählen" />
                  <label className="block">
                    <span className="block text-xs mb-1" style={{ color: C.muted }}>Weitere Informationen</span>
                    <textarea rows={3} value={vAbl.text}
                      onChange={(e) => setVAbl({ ...vAbl, text: e.target.value })}
                      className="w-full px-3 py-2 text-sm rounded outline-none"
                      style={{ border: "1px solid " + C.line }} />
                  </label>
                  <div className="p-4 rounded" style={{ background: "#F6F8FA", border: "1px solid " + C.line }}>
                    <label className="flex items-center gap-3 text-sm">
                      <input type="checkbox" checked={vAbl.alternativ}
                        onChange={(e) => setVAbl({ ...vAbl, alternativ: e.target.checked })}
                        style={{ accentColor: C.ink }} />
                      Alternativangebot vorhanden
                    </label>
                    {vAbl.alternativ && (
                      <div className="mt-3">
                        <Datei mehrere label="Alternatives Angebot" datei={vAbl.alternativAngebot}
                          onSet={(f) => setVAbl({ ...vAbl, alternativAngebot: f })} hinweis="Datei auswählen" />
                      </div>
                    )}
                  </div>
                  <Btn variante="gefahr" icon={RotateCcw} onClick={versorgerAblehnung}
                    disabled={!vAbl.dokument && !vAbl.text.trim()}>
                    Ablehnung an den Vertriebspartner senden
                  </Btn>
                </div>
              )}
            </div>
          )}

          {/* Geschäftsführung: Provisionseingang erfassen und bestätigen */}
          {user.rolle === "Geschäftsführung" && a.status === "bestaetigt" && (
            <div className="rounded p-5" style={{ background: C.card, border: "1px solid " + C.ok, ...reihe(-2) }}>
              <div className="text-sm mb-3">Provisionseingang erfassen</div>
              <div className="grid sm:grid-cols-2 gap-x-8 mb-4">
                <Zeile k="Versorger" v={a.bestaetigung && ([...new Set(provisionsStellen(a).map((s) => s.versorger).filter(Boolean))].join(" / ") || a.bestaetigung.versorger)} />
                <Zeile k="Bestätigte Menge" v={num(bestaetigteMenge(a)) + " kWh"} />
                <Zeile k="Gesamtaufschlag" v={a.bestaetigung ? (VERTRIEB_SICHT_ROLLEN.includes(user.rolle) ? aufschlagText(a)
                  : aufschlagText(a, undefined, true) + (mitVerdecktemAufschlag(a) ? " (Vertrieb: " + aufschlagText(a) + ")" : "")) : "–"} />
                <Zeile k="Erwartete Provision" v={eur(gesamtprovision(a))} />
              </div>
              <div className="grid sm:grid-cols-2 gap-4 mb-4">
                <Feld label="Eingegangener Betrag in €" value={eingang.betrag}
                  onChange={(v) => setEingang({ ...eingang, betrag: v })}
                  placeholder={num(gesamtprovision(a), 2)} />
                <Feld label="Eingegangen am" type="date" value={eingang.datum}
                  onChange={(v) => setEingang({ ...eingang, datum: v })} />
              </div>
              <label className="block mb-4">
                <span className="block text-xs mb-1" style={{ color: C.muted }}>Bemerkung</span>
                <textarea rows={2} value={eingang.notiz}
                  onChange={(e) => setEingang({ ...eingang, notiz: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded outline-none"
                  style={{ border: "1px solid " + C.line }} />
              </label>
              <Btn variante="ok" icon={Check}
                onClick={() => { onUpdate({
                  ...a, status: "abgeschlossen", vertragsStatus: a.vertragsStatus || "Lieferung aktiv",
                  provisionErhalten: { von: user.name, datum: eingang.datum || heute(),
                    betrag: parseFloat(String(eingang.betrag).replace(",", ".")) || gesamtprovision(a),
                    notiz: eingang.notiz },
                  verlauf: [...a.verlauf, { d: heute(),
                    t: "Provisionseingang bestätigt" + (eingang.betrag ? ": " + eur(parseFloat(String(eingang.betrag).replace(",", ".")) || 0) : ""),
                    w: user.name }],
                }); onZurueck(); }}>
                Provisionseingang bestätigen
              </Btn>
              <p className="text-xs mt-3" style={{ color: C.muted, maxWidth: "62ch" }}>
                Erst danach erscheint der Kunde beim Vertriebspartner in seiner Provisionsliste und
                beim Vertragsmanagement in der Vertragsbetreuung.
              </p>
            </div>
          )}

          {/* Aufgabe 8: Klärfall beim Vertriebspartner */}
          {istPartner && a.status === "klaerfall" && (
            <div className="rounded p-5" style={{ background: C.card, border: "1px solid " + C.warn, ...reihe(-2) }}>
              <div className="flex items-center gap-2 mb-3" style={{ color: C.warn }}>
                <AlertTriangle size={16} />
                <span className="text-sm">Das Team Kalkulation braucht noch etwas von dir</span>
              </div>

              {(a.fehlend || []).length > 0 && (
                <ul className="text-sm ml-5 list-disc mb-3">
                  {a.fehlend.map((f) => <li key={f}>{f}</li>)}
                </ul>
              )}
              {a.fehlendText && (
                <p className="text-sm p-3 rounded mb-3" style={{ background: "#F6F8FA" }}>{a.fehlendText}</p>
              )}
              {a.klaerung && a.klaerung.dateien && a.klaerung.dateien.length > 0 && (
                <div className="space-y-2 mb-3">
                  {a.klaerung.dateien.map((d, i) => <DateiChip key={i} datei={d} label="von der Kalkulation" />)}
                </div>
              )}

              <label className="block mb-4">
                <span className="block text-xs mb-1" style={{ color: C.muted }}>
                  Deine Rückmeldung an die Kalkulation
                </span>
                <textarea rows={3} value={klaerText} onChange={(e) => setKlaerText(e.target.value)}
                  placeholder="Welche Angaben reichst du nach, was hast du geklärt?"
                  className="w-full px-3 py-2 text-sm rounded outline-none"
                  style={{ border: "1px solid " + C.line }} />
              </label>

              <div className="space-y-2 mb-3">
                {klaerDateien.map((d, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="flex-1 min-w-0"><DateiChip datei={d} /></div>
                    <button onClick={() => setKlaerDateien(klaerDateien.filter((_, x) => x !== i))}
                      style={{ color: C.muted }}><X size={15} /></button>
                  </div>
                ))}
              </div>
              <label className="flex items-center gap-2 px-3 py-2 rounded text-sm cursor-pointer mb-4"
                     style={{ border: "1px dashed " + C.line, color: C.muted, background: "#fff" }}>
                <Upload size={14} /> Unterlagen nachreichen
                <input type="file" multiple className="hidden"
                  onChange={(e) => Array.from(e.target.files || []).forEach((f) =>
                    dateiLesen(f, (d) => setKlaerDateien((v) => [...v, d])))} />
              </label>

              <div className="flex flex-wrap gap-2">
                <Btn icon={Send} onClick={klaerfallZurueck} disabled={!klaerText.trim() && klaerDateien.length === 0}>
                  An die Kalkulation zurücksenden
                </Btn>
                <Btn variante="hell" onClick={() => onBearbeiten && onBearbeiten(a)}>
                  Anfrage bearbeiten
                </Btn>
              </div>
            </div>
          )}

          {/* Aufgabe 9: Abschlussmaske nach Annahme */}
          {istPartner && annahme.variante && (
            <div id="annahme-formular" className="rounded p-5" style={{ background: C.card, border: "1px solid " + C.ok, ...reihe(-2) }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm">Abschluss vorbereiten</span>
                <button onClick={() => setAnnahme({ ...annahme, variante: null })} style={{ color: C.muted }}>
                  <X size={16} />
                </button>
              </div>
              <p className="text-sm mb-5" style={{ color: C.muted, maxWidth: "60ch" }}>
                Angenommen wird {annahme.variante.produkt} über{" "}
                {laufzeitMonate(annahme.variante) || annahme.variante.laufzeit} Monate. Lade die
                unterschriebenen Unterlagen hoch, danach geht der Auftrag an die Kalkulation.
              </p>

              <div className="space-y-4">
                {(() => {
                  /* Teilannahme nur, wenn das Angebot Strom und Erdgas umfasst */
                  const v = annahme.variante || {};
                  const beide = a.lieferstellen.some((l) => l.medium === "strom") && a.lieferstellen.some((l) => l.medium === "gas")
                    && (!v.sparte || v.sparte === "beide");
                  if (!beide) return null;
                  return (
                    <div className="p-4 rounded space-y-2" style={{ background: "#F6F8FA", border: "1px solid " + C.line }}>
                      <div className="text-sm mb-1">Was nimmt der Kunde an?</div>
                      {[["alle", "Angebot wie kalkuliert (Strom und Erdgas)"], ["strom", "nur Strom"], ["gas", "nur Erdgas"]].map(([id, text]) => (
                        <label key={id} className="flex items-center gap-3 text-sm">
                          <input type="checkbox" checked={annahme.umfang === id} style={{ accentColor: C.ink }}
                            onChange={() => setAnnahme({ ...annahme, umfang: id })} />
                          {text}
                        </label>
                      ))}
                      {annahme.umfang !== "alle" && (
                        <p className="text-xs pt-1" style={{ color: C.muted }}>
                          Weiter gerechnet wird nur mit den {annahme.umfang === "gas" ? "Erdgas" : "Strom"}-Lieferstellen,
                          ihren Mengen und der Provision dafür. Die anderen Lieferstellen bleiben im Vorgang vermerkt.
                        </p>
                      )}
                    </div>
                  );
                })()}

                {(() => {
                  /* Abweichende Laufzeit: der Kunde nimmt z. B. nur 2 statt 3 Lieferjahre */
                  const v = annahme.variante || {};
                  const angebot = laufzeitMonate(v) || parseInt(v.laufzeit) || 0;
                  const abw = parseInt(annahme.laufzeitMonate) || 0;
                  const wahl = [12, 24, 36, 48, 60].filter((m) => m !== angebot);
                  const ende = abw && v.lieferbeginn ? monateDazu(v.lieferbeginn, abw) : null;
                  return (
                    <div className="p-4 rounded space-y-2" style={{ background: "#F6F8FA", border: "1px solid " + C.line }}>
                      <div className="text-sm mb-1">Laufzeit</div>
                      <label className="flex items-center gap-3 text-sm">
                        <input type="checkbox" checked={!abw} style={{ accentColor: C.ink }}
                          onChange={() => setAnnahme({ ...annahme, laufzeitMonate: "" })} />
                        wie im Angebot{angebot ? " (" + jahreText(angebot) + ")" : ""}
                      </label>
                      <label className="flex items-center gap-3 text-sm">
                        <input type="checkbox" checked={!!abw} style={{ accentColor: C.ink }}
                          onChange={() => setAnnahme({ ...annahme, laufzeitMonate: abw ? "" : String(wahl[0]) })} />
                        abweichende Laufzeit
                      </label>
                      {!!abw && (
                        <div className="pl-7 space-y-2">
                          <select value={abw} onChange={(e) => setAnnahme({ ...annahme, laufzeitMonate: e.target.value })}
                            className="w-full px-3 py-2 text-sm rounded outline-none bg-white"
                            style={{ border: "1px solid " + C.line }}>
                            {wahl.map((m) => <option key={m} value={m}>{jahreText(m)}</option>)}
                          </select>
                          <p className="text-xs" style={{ color: C.muted }}>
                            {ende ? "Lieferende dann " + datum(ende) + ". " : ""}
                            Die Kalkulation sieht die Änderung beim Einreichen. Provision und Fälligkeiten rechnen mit{" "}
                            {jahreText(abw)}; endgültig bestätigen Vertragsmanagement und Geschäftsführung.
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })()}

                <Datei mehrere label="Maklervollmacht (Service- und Beratungsauftrag) und unterschriebenes Angebot – erforderlich"
                  datei={annahme.unterlagen} onSet={(f) => setAnnahme({ ...annahme, unterlagen: f })}
                  hinweis="Eine PDF mit beidem hochladen" />

                <label className="block">
                  <span className="block text-xs mb-1" style={{ color: C.muted }}>Abweichungswünsche</span>
                  <textarea rows={2} value={annahme.abweichung}
                    onChange={(e) => setAnnahme({ ...annahme, abweichung: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded outline-none"
                    style={{ border: "1px solid " + C.line }} />
                </label>

                <div>
                  <span className="block text-xs mb-2" style={{ color: C.muted }}>Weitere Dokumente</span>
                  <div className="space-y-2 mb-2">
                    {annahme.weitere.map((d, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="flex-1 min-w-0"><DateiChip datei={d} /></div>
                        <button onClick={() => setAnnahme({ ...annahme,
                          weitere: annahme.weitere.filter((_, x) => x !== i) })}
                          style={{ color: C.muted }}><X size={15} /></button>
                      </div>
                    ))}
                  </div>
                  <label className="flex items-center gap-2 px-3 py-2 rounded text-sm cursor-pointer"
                         style={{ border: "1px dashed " + C.line, color: C.muted, background: "#fff" }}>
                    <Upload size={14} /> Dokumente hinzufügen
                    <input type="file" multiple className="hidden"
                      onChange={(e) => Array.from(e.target.files || []).forEach((f) =>
                        dateiLesen(f, (d) => setAnnahme((v) => ({ ...v, weitere: [...v.weitere, d] }))))} />
                  </label>
                </div>

                {fragtTippgeber && (
                  <div>
                    <Select label="Über einen Tippgeber gewonnen?" value={annahme.tippgeberId}
                      onChange={(v) => setAnnahme({ ...annahme, tippgeberId: v })}
                      options={[{ value: "", label: "Nein" },
                        ...meineTippgeber.map((t) => ({ value: t.id,
                          label: "Ja, über " + tippgeberLabel(t) }))]} />
                    <p className="text-xs mt-1" style={{ color: C.muted }}>
                      {annahme.tippgeberId
                        ? "Die Vergütung des Tippgebers wird von deiner Provision abgezogen."
                        : meineTippgeber.length
                        ? "Nur wenn der Kunde über einen Tippgeber kam, hier auswählen."
                        : "Hier erscheinen deine Tippgeber, sobald die Geschäftsführung sie freigegeben hat."}
                    </p>
                  </div>
                )}

                <div className="pt-2">
                  <Btn variante="ok" icon={Send} onClick={abschlussSenden} disabled={!annahme.unterlagen}>
                    Auftrag an das Kalkulationsteam senden
                  </Btn>
                  {!annahme.unterlagen && (
                    <p className="text-xs mt-2" style={{ color: C.muted }}>
                      Pflicht ist eine Datei mit der unterschriebenen Maklervollmacht (Service- und Beratungsauftrag)
                      und dem unterschriebenen Angebot. Meist ist beides eine PDF.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {istKalk && a.status === "angebot" && (
            <div className="rounded p-4 flex items-start gap-3" style={{ background: "#F1F7F0", border: "1px solid " + C.ok, ...reihe(-2) }}>
              <Check size={18} style={{ color: C.ok }} className="shrink-0 mt-0.5" />
              <div className="text-sm">
                Angebot an den Vertriebspartner gesendet{a.kalkulation && a.kalkulation.datum ? " am " + datum(a.kalkulation.datum) : ""}.
                <span className="block text-xs mt-1" style={{ color: C.muted }}>
                  {a.angebotVersendet ? "Der Vertriebspartner hat es am " + datum(a.angebotVersendet.datum) + " an den Kunden versendet."
                    : "In der Übersicht steht der Vorgang jetzt unter „Angebote beim Vertriebspartner“."}
                </span>
                {!ueberarbeiten && (
                  <div className="mt-3">
                    <Btn variante="hell" icon={Calculator} onClick={() => { setUeberarbeiten(true); setModus("kalk"); }}>
                      Angebot überarbeiten
                    </Btn>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Kalkulation: Kundendaten, Lieferstellen, MaLo, Zähler und Verbrauch jederzeit korrigieren */}
          {istKalk && a.status !== "entwurf" && (
            <div className="rounded p-4 flex flex-wrap items-center justify-between gap-3"
                 style={{ background: C.card, border: "1px solid " + C.line, ...reihe(-2) }}>
              <span className="text-sm" style={{ color: C.muted, maxWidth: "52ch" }}>
                Firmenname (wie bei Creditreform), Anschrift, Lieferstellen, MaLo, Zählernummer oder Verbrauch korrigieren.
              </span>
              <Btn variante="hell" onClick={() => onBearbeiten && onBearbeiten(a)}>Kunden- und Lieferstellendaten bearbeiten</Btn>
            </div>
          )}

          {/* Vertrieb: eingereichte Anfrage bis zum Angebot selbst ändern, z. B. eine vergessene Lieferstelle */}
          {istPartner && VERTRIEB_BEARBEITBAR.includes(a._echterStatus || a.status) && (
            <div className="rounded p-4 flex flex-wrap items-center justify-between gap-3"
                 style={{ background: C.card, border: "1px solid " + C.line }}>
              <span className="text-sm" style={{ color: C.muted, maxWidth: "52ch" }}>
                Etwas vergessen? Kundendaten, Verbräuche und Lieferstellen kannst du ändern, ergänzen oder löschen,
                bis die Kalkulation das Angebot erstellt hat. Die Kalkulation sieht, dass du geändert hast.
              </span>
              <Btn variante="hell" icon={Pencil} onClick={() => onBearbeiten && onBearbeiten(a)}>Anfrage bearbeiten</Btn>
            </div>
          )}
          {/* Kalkulation: Hinweis, dass der Vertrieb nach dem Einreichen geändert hat */}
          {istKalk && a.aenderungVertrieb && VERTRIEB_BEARBEITBAR.includes(a.status) && (
            <div className="rounded p-4 text-sm" style={{ background: "#FFF8EC", border: "1px solid " + C.gas, color: C.text }}>
              <AlertTriangle size={15} className="inline mr-1" style={{ color: C.gas }} />
              {a.aenderungVertrieb.von} hat die Anfrage am {datum(a.aenderungVertrieb.datum)} um {a.aenderungVertrieb.zeit} Uhr geändert
              {a.aenderungVertrieb.vorher !== a.aenderungVertrieb.nachher
                ? " (Lieferstellen: " + a.aenderungVertrieb.vorher + " → " + a.aenderungVertrieb.nachher + ")" : ""}.
              Bitte Kundendaten und Lieferstellen vor dem Angebot prüfen.
            </div>
          )}
          {/* Neues Angebot: erst an den Kunden schicken, dann hier markieren */}
          {istPartner && a.status === "angebot" && (
            <div className="rounded p-5" style={{ background: C.card, border: "1px solid " + (a.angebotVersendet ? C.line : C.ok), ...reihe(-2) }}>
              {a.angebotVersendet ? (
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <span className="text-sm flex items-center gap-2" style={{ color: C.ok }}>
                    <Check size={16} /> An den Kunden versendet am {datum(a.angebotVersendet.datum)}
                    {a.angebotVersendet.perLink ? " per E-Mail mit persönlichem Link" : ""}
                  </span>
                  {!a.angebotVersendet.perLink && (
                    <button className="text-xs underline" style={{ color: C.muted }}
                      onClick={() => onUpdate({ ...a, angebotVersendet: null,
                        verlauf: [...a.verlauf, { d: heute(), t: "Versand an den Kunden zurückgenommen", w: user.name }] })}>
                      Zurücknehmen
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <div className="text-sm mb-1">Neues Angebot von der Kalkulation</div>
                  <p className="text-sm mb-4" style={{ color: C.muted, maxWidth: "60ch" }}>
                    Prüfe das Angebot unten. Am einfachsten schickst du es dem Kunden direkt von hier: Er bekommt eine
                    E-Mail mit persönlichem Link, sieht das Angebot an und unterschreibt am Handy. Du siehst, wann er es öffnet.
                    Du kannst das PDF unten auch herunterladen, selbst schicken oder ausdrucken und danach „Selbst versendet“ tippen.
                  </p>
                </>
              )}
              <KundenVersand a={a} user={user} onUpdate={onUpdate}
                onAnnahmeUebernehmen={(v, datei) => {
                  setAnnahme({ ...annahme, variante: v || annahme.variante, unterlagen: datei ? [datei] : annahme.unterlagen });
                  setTimeout(() => { const z = document.getElementById("annahme-formular"); if (z) z.scrollIntoView({ behavior: "smooth" }); }, 50);
                }} />
              {!a.angebotVersendet && (
                <div className="mt-3">
                  <Btn variante="hell" icon={Check} onClick={() => onUpdate({ ...a, angebotVersendet: { datum: heute(), von: user.name },
                    verlauf: [...a.verlauf, { d: heute(), t: "Angebot an den Kunden versendet", w: user.name }] })}>
                    Selbst versendet
                  </Btn>
                </div>
              )}
            </div>
          )}

          {/* Angebotsansicht */}
          {a.kalkulation && (
            <div className="rounded p-5" style={{ background: C.card, border: "1px solid " + C.line, ...reihe(-1) }}>
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-sm">
                  {varianten(a).length > 1 ? varianten(a).length + " Angebote" : "Angebot"} vom {datum(a.kalkulation.datum)}
                </span>
                <span className="text-xs" style={{ color: C.muted }}>{a.kalkulation.bearbeiter}</span>
              </div>
              {a.kalkulation.hinweisPartner && (
                <div className="p-3 rounded text-sm mt-3 mb-1" style={{ background: "#FBF6EE", border: "1px solid " + C.gas }}>
                  <div className="text-xs mb-1" style={{ color: C.gas }}>
                    Hinweis der Kalkulation an dich{a.kalkulation.bearbeiter ? " (" + a.kalkulation.bearbeiter + ")" : ""}
                  </div>
                  <p className="whitespace-pre-line">{a.kalkulation.hinweisPartner}</p>
                </div>
              )}
              {a.smartmeter && a.kalkulation.smartmeterEntfernt && !a.kalkulation.smartmeter && (
                <div className="rounded p-3 text-sm flex items-center gap-2" style={{ background: "#F6F8FA", border: "1px solid " + C.line, color: C.muted }}>
                  <Gauge size={15} /> Kein Smartmeter-Angebot möglich. Die Kalkulation hat es aus dem Angebot genommen.
                </div>
              )}
              {a.kalkulation.smartmeter && smartmeterSummen(a.kalkulation.smartmeter).anzahl > 0 && (() => {
                const su = smartmeterSummen(a.kalkulation.smartmeter);
                return (
                  <div className="p-3 rounded text-sm mt-3" style={{ background: "#F1F7F0", border: "1px solid " + C.ok }}>
                    <span style={{ color: C.ok }}>Smartmeter-Angebot im PDF enthalten:</span>{" "}
                    einmalig {num(su.einmalig, 2)} €, monatlich {num(su.monatlich, 2)} € netto
                  </div>
                );
              })()}
              {varianten(a).length > 1 && a.status === "angebot" && (
                <p className="text-sm mb-4" style={{ color: C.muted }}>
                  Der Kunde wählt aus. Je Sparte wird eine Variante angenommen, bei Strom und Erdgas
                  können es also zwei sein.
                </p>
              )}

              <div className="space-y-4 mt-4">
                {varianten(a).map((v, i) => {
                  const gewaehlt = gewaehlte(a).some((x) => x.id === v.id);
                  const verworfen = a.status === "abgeschlossen" && !gewaehlt && varianten(a).length > 1;
                  const ende = enddatum(v);
                  return (
                    <div key={v.id} className="rounded overflow-hidden"
                         style={{ border: "1px solid " + (gewaehlt ? C.ok : C.line), opacity: verworfen ? 0.5 : 1 }}>
                      <div className="flex items-center justify-between px-4 py-2"
                           style={{ background: gewaehlt ? "#F1F7F0" : "#F6F8FA", borderBottom: "1px solid " + C.line }}>
                        <span className="text-sm">
                          {varianten(a).length > 1 ? "Variante " + (i + 1) + ": " : ""}{v.produkt}
                          {" · " + (laufzeitMonate(v) || v.laufzeit) + " Monate"}
                          {laufzeitFuer(a, v) !== laufzeitMonate(v) ? " · angenommen: " + jahreText(laufzeitFuer(a, v)) : ""}
                          {v.sparte && v.sparte !== "beide" ? " · " + (v.sparte === "gas" ? "Erdgas" : "Strom") : ""}
                          {Array.isArray(v.lieferstellenIds) && v.lieferstellenIds.length ? " · " + stellenVon(a, v).map((l) => l.bezeichnung || "Lieferstelle").join(", ") : ""}
                        </span>
                        {gewaehlt && (
                          <span className="inline-flex items-center gap-1 text-xs" style={{ color: C.ok }}>
                            <Check size={13} /> angenommen
                          </span>
                        )}
                      </div>

                      <div className="p-4">
                        <div className="grid sm:grid-cols-2 gap-x-8">
                          <Zeile k="Lieferbeginn" v={v.lieferbeginn ? datum(v.lieferbeginn) : "offen"} />
                          <Zeile k="Vertragsende" v={(ende ? datum(ende) : "offen")
                            + ((v.laufzeitArt === "ende") ? " (fest)" : "")} />
                          <Zeile k="Aufschlag" v={num(v.aufschlag, 3) + " ct/kWh"} />
                          <Zeile k="Gültig bis" v={datum(v.gueltigBis)} />
                        </div>
                        {stellenVon(a, v).some((l) => stelleAbweichend(v, l)) && (
                          <div className="mt-3 rounded p-3 text-xs space-y-1" style={{ background: "#FFF8EC", border: "1px solid " + C.line }}>
                            <div className="text-sm mb-1" style={{ color: C.text }}>Je Lieferstelle unterschiedlich</div>
                            {stellenVon(a, v).map((l) => {
                              const sv = stelleIn(v, l);
                              return (
                                <div key={l.id} className="flex flex-wrap gap-x-2" style={{ color: C.text }}>
                                  <span style={{ minWidth: 120 }}>{l.bezeichnung || (l.medium === "gas" ? "Erdgas" : "Strom")}</span>
                                  <span style={{ color: C.muted }}>
                                    {sv.versorger || "Versorger offen"} · {sv.lieferbeginn ? datum(sv.lieferbeginn) : "Beginn offen"}
                                    {enddatum(sv) ? " bis " + datum(enddatum(sv)) : ""} · {num(ctZahl(sv.aufschlag), 3)} ct/kWh
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {stellenVon(a, v).some((l) => v.preise && v.preise[l.id] &&
                          ((v.preise[l.id].energie) || (v.preise[l.id].arbeit))) && (
                          <div className="mt-3 space-y-1">
                            {stellenVon(a, v).map((l) => {
                              const pr = (v.preise || {})[l.id] || {};
                              if (!pr.energie && !pr.arbeit) return null;
                              return (
                                <div key={l.id} className="flex items-center gap-3 text-sm py-1">
                                  <MediumIcon medium={l.medium} />
                                  <span className="flex-1">{l.bezeichnung || (l.medium === "strom" ? "Strom" : "Erdgas")}</span>
                                  <span style={{ color: C.muted, fontVariantNumeric: "tabular-nums" }}>
                                    {pr.energie ? (pr.ohneGrundpreis ? "Energie inkl. Grundpreis " : "Energie ") + pr.energie : ""}
                                    {pr.energie && pr.arbeit ? " · " : ""}
                                    {pr.arbeit ? "Arbeitspreis " + pr.arbeit : ""} ct/kWh
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        <div className="mt-3">
                          <Provisionsblock a={a} mitarbeiter={mitarbeiter} user={user}
                            laufzeit={laufzeitFuer(a, v)} variante={v} ohneHinweis={varianten(a).length > 1} />
                        </div>

                        {v.bemerkung && (
                          <p className="text-sm mt-3 p-3 rounded" style={{ background: "#F6F8FA" }}>{v.bemerkung}</p>
                        )}

                        {v.angebot && (
                          <div className="mt-3"><DateiChip datei={v.angebot} label="Angebot" /></div>
                        )}
                        {v.individualangebot && (
                          <div className="mt-2"><DateiChip datei={v.individualangebot} label="Individualangebot" /></div>
                        )}

                        {istPartner && a.status === "angebot" && !a.angebotVersendet && !gewaehlt && (
                          <p className="text-xs mt-4" style={{ color: C.muted }}>
                            Die Annahme erfasst du, sobald das Angebot an den Kunden versendet ist.
                          </p>
                        )}
                        {istPartner && ["angebot", "abgeschlossen"].includes(a.status) && !gewaehlt
                          && (a.status !== "angebot" || a.angebotVersendet) && (
                          <div className="mt-4">
                            <Btn variante="ok" icon={Check} onClick={() => annehmen(v)}>
                              {varianten(a).length > 1 ? "Diese Variante annehmen" : "Angebot angenommen"}
                            </Btn>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* bei mehreren Varianten den Hinweis zur Liefermenge nur einmal */}
              {varianten(a).length > 1 && !a.bestaetigung && VERTRIEB_SICHT_ROLLEN.includes(user.rolle) && (
                <div className="text-xs mt-3 px-2 py-1.5 rounded" style={{ background: "#FFF8EC", color: C.gas }}>
                  Die Provision gilt bei bestätigter Liefermenge. Berechnet aus dem Jahresverbrauch laut Anfrage; bestätigt der Versorger
                  weniger, sinkt die Provision entsprechend. Endgültig bestätigen Vertragsmanagement und Geschäftsführung.
                </div>
              )}

              <div className="mt-4 space-y-2">
                {a.kalkulation.vollmacht && (
                  <DateiChip datei={a.kalkulation.vollmacht} label="Maklervollmacht" />
                )}
                {a.kalkulation.dienstleistungsvertrag && (
                  <DateiChip datei={a.kalkulation.dienstleistungsvertrag} label="Dienstleistungsvertrag" />
                )}
              </div>

              {istPartner && a.status === "angebot" && !ablehnung.offen && (
                <div className="mt-4">
                  <Btn variante="hell" icon={X} onClick={() => setAblehnung({ ...ablehnung, offen: true })}>
                    Kein Angebot angenommen
                  </Btn>
                </div>
              )}

              {istPartner && ablehnung.offen && (
                <div className="mt-4 p-4 rounded" style={{ background: "#F6F8FA", border: "1px solid " + C.line }}>
                  <div className="text-sm mb-3">Warum kam es nicht zum Abschluss?</div>
                  <Select label="Grund" value={ablehnung.grund}
                    onChange={(v) => setAblehnung({ ...ablehnung, grund: v })}
                    options={ABLEHNUNGSGRUENDE} />
                  {ablehnung.grund === "Falsches Zeitfenster" && (
                    <div className="mt-4 p-3 rounded" style={{ background: "#fff", border: "1px solid " + C.gas }}>
                      <Feld label="Kunden erneut kontaktieren am" type="date" value={ablehnung.wiedervorlage}
                        onChange={(v) => setAblehnung({ ...ablehnung, wiedervorlage: v })} />
                      <p className="text-xs mt-2" style={{ color: C.muted }}>
                        Der Vorgang erscheint an diesem Tag in deiner Übersicht zur Wiedervorlage.
                      </p>
                    </div>
                  )}
                  <label className="block mt-4">
                    <span className="block text-xs mb-1" style={{ color: C.muted }}>Notiz</span>
                    <textarea rows={2} value={ablehnung.notiz}
                      onChange={(e) => setAblehnung({ ...ablehnung, notiz: e.target.value })}
                      className="w-full px-3 py-2 text-sm rounded outline-none"
                      style={{ border: "1px solid " + C.line }} />
                  </label>
                  <div className="flex flex-wrap gap-2 mt-4">
                    <Btn icon={Check}
                      disabled={ablehnung.grund === "Falsches Zeitfenster" && !ablehnung.wiedervorlage}
                      onClick={() => {
                        onUpdate({ ...a, status: "abgelehnt",
                          absage: { grund: ablehnung.grund, wiedervorlage: ablehnung.wiedervorlage,
                                    notiz: ablehnung.notiz, von: user.name, datum: heute() },
                          verlauf: [...a.verlauf, { d: heute(),
                            t: "Nicht abgeschlossen: " + ablehnung.grund +
                               (ablehnung.wiedervorlage ? ", Wiedervorlage " + datum(ablehnung.wiedervorlage) : ""),
                            w: user.name }] });
                        onZurueck();
                      }}>
                      Absage speichern
                    </Btn>
                    <Btn variante="hell" onClick={() => setAblehnung({ ...ablehnung, offen: false })}>Abbrechen</Btn>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Verschwiegenheitserklärung (NDA) */}
          {ndaSicht && (
            <div className="rounded p-5" style={{ background: C.card,
                 border: "1px solid " + (a.nda && a.nda.status === "angefordert" ? C.gas : C.line) }}>
              <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
                <span className="text-sm">Verschwiegenheitserklärung (NDA){a.nda && a.nda.status === "unterschrieben" ? " · " + (a.nda.art === "gegenseitig" ? "gegenseitig" : "einseitig") : ""}</span>
                {a.nda && <span className="text-xs" style={{ color: a.nda.status === "unterschrieben" ? C.ok : C.gas }}>
                  {a.nda.status === "unterschrieben"
                    ? "unterschrieben von " + a.nda.gf.name + " am " + datum(a.nda.gf.datum)
                    : "wartet auf Unterschrift der Geschäftsführung"}
                </span>}
              </div>
              <p className="text-xs mb-3" style={{ color: C.muted, maxWidth: "62ch" }}>
                Falls der Kunde sie verlangt: EGC wertet seine Daten aus und gibt sie zur Angebotseinholung an
                Versorger, aber nicht an Dritte. Unterschreibt immer die Geschäftsführung. Sichtbar nur für
                Kalkulation und Geschäftsführung.
              </p>
              {(!a.nda || a.nda.status !== "unterschrieben") && (istKalk || istGF) && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {[["einseitig", "Einseitig (nur EGC verpflichtet)"], ["gegenseitig", "Gegenseitig"]].map(([w, label]) => (
                    <button key={w} onClick={() => { setNdaArt(w); if (a.nda) onUpdate({ ...a, nda: { ...a.nda, art: w } }); }}
                      className="px-3 py-1.5 rounded text-sm"
                      style={ndaArt === w ? { background: C.ink, color: "#fff" }
                        : { background: "#fff", color: C.text, border: "1px solid " + C.line }}>{label}</button>
                  ))}
                </div>
              )}
              {!a.nda && istKalk && (
                <Btn variante="hell" icon={FileSignature}
                  onClick={() => onUpdate({ ...a, nda: { status: "angefordert", art: ndaArt, von: user.name, datum: heute() } })}>
                  Bei der Geschäftsführung anfordern
                </Btn>
              )}
              {istGF && (!a.nda || a.nda.status === "angefordert") && (
                <div className="space-y-3">
                  {a.nda && <p className="text-sm">Angefordert von {a.nda.von} am {datum(a.nda.datum)}.</p>}
                  <Unterschrift label="Unterschrift Geschäftsführung" onChange={setNdaBild} />
                  <Btn icon={Check} disabled={!ndaBild} onClick={() => {
                    onUpdate({ ...a, nda: { ...(a.nda || { von: user.name, datum: heute() }), art: ndaArt, status: "unterschrieben",
                      gf: { name: user.name, datum: heute(), bild: ndaBild } } });
                    setNdaBild(null);
                  }}>Unterschreiben</Btn>
                </div>
              )}
              {a.nda && a.nda.status === "unterschrieben" && (
                <div className="flex flex-wrap gap-2">
                  <Btn icon={FileText} onClick={ndaLaden} disabled={ndaLaeuft}>
                    {ndaLaeuft ? "Wird erzeugt …" : "Verschwiegenheitserklärung als PDF"}
                  </Btn>
                  {istGF && (
                    <Btn variante="hell" onClick={() => onUpdate({ ...a, nda: { ...a.nda, status: "angefordert", gf: null } })}>
                      Neu unterschreiben
                    </Btn>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Vertragsmanagement */}
          {(istVM || user.rolle === "Geschäftsführung") && a.status === "abgeschlossen" && !a.lieferbestaetigung && (
            <div style={reihe(-2)}><Lieferbestaetigung a={a} user={user} onUpdate={onUpdate} /></div>
          )}
          {setBeschaffung && (
            <BeschaffungKarte a={a} user={user} mitarbeiter={mitarbeiter} beschaffung={beschaffung}
              setBeschaffung={setBeschaffung} onOeffnen={onBeschaffung} />
          )}
          {istVM && a.status === "abgeschlossen" && a.lieferbestaetigung && (
            <div className="rounded p-5" style={{ background: C.card, border: "1px solid " + C.line }}>
              <p className="text-sm mb-4 flex items-center gap-2" style={{ color: C.ok }}>
                <Check size={15} /> Lieferbestätigung erfasst am {datum(a.lieferbestaetigung.datum)} von {a.lieferbestaetigung.von}
              </p>
              <Select label="Vertragsstatus" value={a.vertragsStatus || "Vertrag zu erstellen"}
                onChange={(v) => onUpdate({ ...a, vertragsStatus: v })}
                options={["Vertrag zu erstellen", "Vertrag versendet", "Vertrag unterschrieben",
                          "Beim Versorger eingereicht", "Lieferung aktiv"]} />
            </div>
          )}
        </div>

        {/* Seitenspalte */}
        <div className="space-y-5 min-w-0">
          <div className="rounded p-4" style={{ background: C.card, border: "1px solid " + C.line }}>
            <div className="text-sm mb-3">Kunde</div>
            <Zeile k="Ansprechpartner" v={a.kunde.ansprechpartner} />
            <Zeile k="Telefon" v={a.kunde.telefon} />
            <Zeile k="E-Mail" v={a.kunde.email} />
            {a.kunde.steuernummer && <Zeile k="Steuer-Nr. / USt-IdNr." v={a.kunde.steuernummer} />}
            <Zeile k="Branche" v={a.kunde.branche} />
            <Zeile k="Akquise" v={(AKQUISE_ART.find((x) => x.value === (a.akquiseArt || "eigen")) || {}).label} />
            <Zeile k="Herkunft" v={[a.herkunft, a.herkunftDetail].filter(Boolean).join(" · ")} />
            {istSpot && (
              <Zeile k="Zielpreis Spotmarkt" v={a.zielpreis ? a.zielpreis + " ct/kWh" : "offen"} />
            )}
            <Zeile k="Straße" v={a.kunde.strasse} />
            <Zeile k="Anschrift" v={[a.kunde.plz, a.kunde.ort].filter(Boolean).join(" ")} />
          </div>

          <div className="rounded p-4" style={{ background: C.card, border: "1px solid " + C.line }}>
            <div className="text-sm mb-3">Angebotswunsch</div>
            {verbrauchMedium(a, "strom") > 0 && <Zeile k="Produkt Strom" v={a.produkt} />}
            {verbrauchMedium(a, "gas") > 0 && <Zeile k="Produkt Erdgas" v={a.produktGas || a.produkt} />}
            <Zeile k="Vertragsdauer" v={a.laufzeitArt === "ende"
              ? "fest bis " + (a.wunschLieferende ? datum(a.wunschLieferende) : "offen")
              : a.laufzeit + " Monate"} />
            <Zeile k="Aufschlag" v={num(a.aufschlag, 3) + " ct/kWh"} />
            <Zeile k="Wunsch-Lieferbeginn" v={a.wunschLieferbeginn ? datum(a.wunschLieferbeginn) : "offen"} />
            <Zeile k="Gesamtmenge" v={num(verbrauchGesamt(a)) + " kWh"} />
            <Zeile k="Vollmacht im Angebot" v={a.vollmachtAnhaengen === false ? "nein" : "ja"} />
            {a.vertragsStatus && <Zeile k="Vertrag" v={a.vertragsStatus} />}
            {a.bestaetigung && <Zeile k="Versorger" v={a.bestaetigung.versorger} />}
            {a.bestaetigung && <Zeile k="Bestätigte Menge" v={num(bestaetigteMenge(a)) + " kWh"} />}
            {a.provisionErhalten && <Zeile k="Provision erhalten" v={datum(a.provisionErhalten.datum)} />}
          </div>

          <div className="rounded p-4" style={{ background: C.card, border: "1px solid " + C.line }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm">Verlauf</span>
              {darfProtokoll && (
                <button onClick={protokollLaden} className="text-xs px-2 py-1 rounded"
                        style={{ border: "1px solid " + C.line, color: C.strom }}>
                  als PDF
                </button>
              )}
            </div>
            {a.verlauf.length === 0 && <p className="text-sm" style={{ color: C.muted }}>Noch keine Einträge.</p>}
            {a.verlauf.map((v, i) => (
              <div key={i} className="flex gap-3 py-2 text-sm" style={{ borderTop: i ? "1px solid " + C.line : "none" }}>
                <span style={{ color: C.muted, fontVariantNumeric: "tabular-nums" }}>{datum(v.d)}</span>
                <span className="flex-1">{v.t}<span className="block text-xs" style={{ color: C.muted }}>{v.w}</span></span>
              </div>
            ))}
          </div>

          {/* Nur die Geschäftsführung: Vorgang endgültig löschen, z. B. Testkunden */}
          {onLoeschen && user.rolle === "Geschäftsführung" && (
            <div className="rounded p-4" style={{ background: C.card, border: "1px solid " + C.warn }}>
              <div className="text-sm mb-1">Vorgang löschen</div>
              <p className="text-xs mb-3" style={{ color: C.muted }}>
                Für Testkunden und Fehleingaben, auch wenn sie schon bestätigt oder abgeschlossen sind. Der Kunde verschwindet
                komplett aus dem Portal: mit allen Dateien, Angeboten, Provisionsangaben, Smartmeter-Aufträgen, Problemfällen und
                Beschaffungsaufträgen, für alle Rollen. Das lässt sich nicht rückgängig machen.
              </p>
              <Btn variante="gefahr" icon={Trash2} onClick={() => {
                const name = (a.kunde && a.kunde.firma) || a.id;
                if (!window.confirm("„" + name + "“ (" + a.id + ") endgültig löschen?")) return;
                if (["uebermittelt", "einreichung", "bestaetigt", "abgeschlossen"].includes(a.status)
                    && !window.confirm("Achtung: Dieser Vorgang ist schon beim Versorger" + (a.status === "abgeschlossen" ? " und abgeschlossen" : "")
                      + ". Provisionen und Abrechnungen dazu gehen mit verloren. Wirklich löschen?")) return;
                onLoeschen(a);
              }}>Vorgang endgültig löschen</Btn>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export {
  Assistent, Detail, KundenVersand,
};
