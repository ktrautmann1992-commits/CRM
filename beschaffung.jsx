/* Beschaffung: Lastgang, Preiskurve, Hedge, Tranchenplan, Spotpreise und die Ansichten der Beschaffung.
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
  Abrechnung, Abschnitt, Balken, Btn, C, Datei, DateiChip, Feld,
  INDIVIDUAL_PRODUKTE, Kalender, Kunden, Liste, MONATE_KURZ, MediumIcon, PDF_ZEIGEN, Select,
  dateiLaden, dateienVon, datum, erzeugePdf, gewaehlte, heute, istBeteiligt, lastgangAuswerten,
  lastgangGrafiken, lastgangVerlaeufe, num, uid, varianten, zahlLesen, zeitLesen,
} from "./App.jsx";

const BUNDESLAENDER = [
  ["", "nicht gewählt (nur bundesweite Feiertage)"], ["BW", "Baden-Württemberg"], ["BY", "Bayern"], ["BE", "Berlin"],
  ["BB", "Brandenburg"], ["HB", "Bremen"], ["HH", "Hamburg"], ["HE", "Hessen"], ["MV", "Mecklenburg-Vorpommern"],
  ["NI", "Niedersachsen"], ["NW", "Nordrhein-Westfalen"], ["RP", "Rheinland-Pfalz"], ["SL", "Saarland"], ["SN", "Sachsen"],
  ["ST", "Sachsen-Anhalt"], ["SH", "Schleswig-Holstein"], ["TH", "Thüringen"]];
function ostersonntag(j) {
  const a = j % 19, b = Math.floor(j / 100), c = j % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const monat = Math.floor((h + l - 7 * m + 114) / 31), tag = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(j, monat - 1, tag));
}
const FEIERTAGE_CACHE = {};
function feiertage(j, land = "") {
  const schl = j + (land || "");
  if (FEIERTAGE_CACHE[schl]) return FEIERTAGE_CACHE[schl];
  const os = ostersonntag(j).getTime(), T = 86400000;
  /* bundesweit */
  const tage = [Date.UTC(j, 0, 1), os - 2 * T, os + T, Date.UTC(j, 4, 1), os + 39 * T, os + 50 * T,
    Date.UTC(j, 9, 3), Date.UTC(j, 11, 25), Date.UTC(j, 11, 26)];
  const in_ = (...l) => l.includes(land);
  if (in_("BW", "BY", "ST")) tage.push(Date.UTC(j, 0, 6));                                   /* Heilige Drei Könige */
  if ((land === "BE" && j >= 2019) || (land === "MV" && j >= 2023)) tage.push(Date.UTC(j, 2, 8)); /* Frauentag */
  if (in_("BW", "BY", "HE", "NW", "RP", "SL")) tage.push(os + 60 * T);                        /* Fronleichnam */
  if (in_("BY", "SL")) tage.push(Date.UTC(j, 7, 15));                                         /* Mariä Himmelfahrt */
  if (land === "TH" && j >= 2019) tage.push(Date.UTC(j, 8, 20));                              /* Weltkindertag */
  if (in_("BB", "MV", "SN", "ST", "TH") || (in_("HB", "HH", "NI", "SH") && j >= 2018)) tage.push(Date.UTC(j, 9, 31)); /* Reformationstag */
  if (in_("BW", "BY", "NW", "RP", "SL")) tage.push(Date.UTC(j, 10, 1));                       /* Allerheiligen */
  if (land === "SN") { const w = new Date(Date.UTC(j, 10, 22)).getUTCDay(); tage.push(Date.UTC(j, 10, 22 - ((w - 3 + 7) % 7))); } /* Buß- und Bettag */
  return (FEIERTAGE_CACHE[schl] = new Set(tage.map((t) => new Date(t).toISOString().slice(0, 10))));
}
/* Tagesart für die Lastform: 0 Werktag, 1 Samstag, 2 Sonn- und Feiertag */
function tagesart(jahr, monat, tag, land = "") {
  const d = new Date(Date.UTC(jahr, monat, tag));
  const w = d.getUTCDay();
  if (w === 0 || feiertage(jahr, land).has(d.toISOString().slice(0, 10))) return 2;
  return w === 6 ? 1 : 0;
}

/* Zeitschritte eines Lieferjahres (ohne Zeitumstellung): 24 Stunden oder 96 Viertelstunden je Tag.
   q = Schritt im Tag, h = Stunde. Peak nach Börsendefinition: Montag bis Freitag 8 bis 20 Uhr, auch an Feiertagen. */
const JAHRES_CACHE = {};
function jahresStunden(jahr, land = "", proTag = 24) {
  const schl = jahr + "|" + (land || "") + "|" + proTag;
  if (JAHRES_CACHE[schl]) return JAHRES_CACHE[schl];
  const raus = [], proH = proTag / 24;
  for (let m = 0; m < 12; m++) {
    const tageImMonat = new Date(Date.UTC(jahr, m + 1, 0)).getUTCDate();
    for (let t = 1; t <= tageImMonat; t++) {
      const w = new Date(Date.UTC(jahr, m, t)).getUTCDay();
      const art = tagesart(jahr, m, t, land);
      for (let q = 0; q < proTag; q++) {
        const h = Math.floor(q / proH);
        raus.push({ m, t, h, q, art, peak: w >= 1 && w <= 5 && h >= 8 && h < 20 });
      }
    }
  }
  return (JAHRES_CACHE[schl] = raus);
}

/* Lage der Zeitstempel: Beginn oder Ende des Intervalls. Beginnt die Reihe um 00:00, gilt Beginn;
   um 00:15 (Viertelstunden) bzw. 01:00 (Stunden) gilt Ende; sonst entscheidet, ob die Reihe um Mitternacht endet. */
function zeitstempelAmEnde(zeiten, proStunde, zeitLesenFn) {
  let erst = null, letzt = null;
  for (let i = 0; i < zeiten.length && !erst; i++) erst = zeitLesenFn(zeiten[i]);
  for (let i = zeiten.length - 1; i >= 0 && !letzt; i--) letzt = zeitLesenFn(zeiten[i]);
  if (!erst) return true;
  const min = erst.getHours() * 60 + erst.getMinutes(), schritt = 60 / proStunde;
  if (min === 0) return false;
  if (min === schritt) return true;
  return !!letzt && letzt.getHours() === 0 && letzt.getMinutes() === 0;
}

/* Lastgang (Werte und Zeitpunkte aus lastgangAuswerten) → Lastform:
   mittlere kWh je Zeitschritt für Monat × Tagesart × Schritt im Tag, dazu die Jahresmenge.
   Viertelstundenwerte bleiben Viertelstunden (96 je Tag), sonst Stunden (24 je Tag).
   ist: tatsächliche kWh je Zeitschritt mit Zeitpunkt, für die Ausgleichsenergie (nur im Speicher). */
function lastform(werte, zeiten, proStunde, zeitLesenFn, land = "") {
  const proTag = proStunde >= 4 ? 96 : 24, proH = proTag / 24, schrittMs = 3600000 / proH;
  const leer = () => Array.from({ length: 12 }, () => Array.from({ length: 3 }, () => Array(proTag).fill(0)));
  const summe = leer(), zahl = leer();
  const amEnde = zeitstempelAmEnde(zeiten, proStunde, zeitLesenFn);
  const versatz = amEnde ? 3600000 / proStunde : 0;
  const proSchritt = new Map(); /* Werte je Zeitschritt aufsummieren (z. B. Viertelstunden → Stunde) */
  let start = null, ohneDatum = 0;
  werte.forEach((w, i) => {
    let t = zeitLesenFn(zeiten[i]);
    if (!t) {
      ohneDatum++;
      if (!start) start = new Date(new Date().getFullYear() - 1, 0, 1);
      t = new Date(start.getTime() + (i / proStunde) * 3600000 + versatz);
    }
    const k = new Date(t.getTime() - versatz);
    const q = k.getHours() * proH + Math.floor(k.getMinutes() / (60 / proH));
    const ab = new Date(k.getFullYear(), k.getMonth(), k.getDate()).getTime() + q * schrittMs;
    const alt = proSchritt.get(ab);
    if (alt) alt.kwh += w; else proSchritt.set(ab, { j: k.getFullYear(), m: k.getMonth(), t: k.getDate(), q, kwh: w });
  });
  let gesamt = 0;
  for (const s of proSchritt.values()) {
    const art = tagesart(s.j, s.m, s.t, land);
    s.art = art;
    summe[s.m][art][s.q] += s.kwh;
    zahl[s.m][art][s.q] += 1;
    gesamt += s.kwh;
  }
  /* fehlende Felder: erst andere Tagesart desselben Monats, dann Jahresmittel des Schritts */
  const mittel = summe.map((mo, m) => mo.map((ar, a) => ar.map((x, q) => (zahl[m][a][q] ? x / zahl[m][a][q] : null))));
  for (let m = 0; m < 12; m++) for (let a = 0; a < 3; a++) for (let q = 0; q < proTag; q++) {
    if (mittel[m][a][q] != null) continue;
    const ersatz = [0, 1, 2].map((b) => mittel[m][b][q]).find((x) => x != null);
    if (ersatz != null) { mittel[m][a][q] = ersatz; continue; }
    const andere = [];
    for (let n = 0; n < 12; n++) if (mittel[n][a][q] != null) andere.push(mittel[n][a][q]);
    mittel[m][a][q] = andere.length ? andere.reduce((x, y) => x + y, 0) / andere.length : 0;
  }
  const schritte = proSchritt.size;
  const ist = [...proSchritt.entries()].sort((x, y) => x[0] - y[0]).map(([t, s]) => ({ t, m: s.m, art: s.art, q: s.q, kwh: s.kwh }));
  return { mittel, gesamt, proTag, land, ist, stunden: schritte / proH, ohneDatum,
           jahresmenge: schritte ? (gesamt / schritte) * 8760 * proH : 0 };
}

/* Viertelstundenform auf Stunden verdichten (für das Zusammenlegen mit Stundenwerten) */
function formAufStunden(f) {
  if (f.proTag === 24) return f;
  const mittel = f.mittel.map((mo) => mo.map((ar) => Array.from({ length: 24 }, (_, h) => ar[4 * h] + ar[4 * h + 1] + ar[4 * h + 2] + ar[4 * h + 3])));
  const ist = [], zus = new Map();
  (f.ist || []).forEach((x) => { const t = x.t - (x.q % 4) * 900000; const a = zus.get(t);
    if (a) a.kwh += x.kwh; else { const n = { t, m: x.m, art: x.art, q: Math.floor(x.q / 4), kwh: x.kwh }; zus.set(t, n); ist.push(n); } });
  return { ...f, mittel, proTag: 24, ist };
}

/* Last eines Lieferjahres in MWh je Zeitschritt, auf die Jahresmenge (kWh) skaliert; dt = Stunden je Schritt */
function jahresLast(form, jahr, mengeKwh) {
  const proTag = form.proTag || 24;
  const st = jahresStunden(jahr, form.land || "", proTag);
  const roh = st.map((s) => form.mittel[s.m][s.art][s.q]);
  const sum = roh.reduce((x, y) => x + y, 0) || 1;
  const faktor = (mengeKwh || form.jahresmenge) / sum / 1000;
  return { stunden: st, last: roh.map((x) => x * faktor), dt: 24 / proTag };
}

/* Standardverteilung der Monate, falls keine Quartalspreise vorliegen.
   Grobe Saisonform am deutschen Terminmarkt; wird an die Eingaben kalibriert. */
const MONATSFORM_BASE = [1.17, 1.12, 1.01, 0.9, 0.84, 0.86, 0.9, 0.9, 0.97, 1.04, 1.12, 1.16];
const MONATSFORM_PEAK = [1.15, 1.1, 1.0, 0.88, 0.82, 0.86, 0.92, 0.91, 0.98, 1.05, 1.13, 1.18];

/* Terminprodukte Strom: Zeiträume eines Lieferjahres (Monate 0–11).
   Saison wie am Gasmarkt auf das Kalenderjahr bezogen: Sommer April–September, Winter Januar–März und Oktober–Dezember. */
const STROM_PRODUKTE = [
  ...Array.from({ length: 12 }, (_, m) => ({ ebene: "mo", i: m, monate: [m] })),
  ...[0, 1, 2, 3].map((q) => ({ ebene: "q", i: q, monate: [3 * q, 3 * q + 1, 3 * q + 2] })),
  { ebene: "sommer", monate: [3, 4, 5, 6, 7, 8] }, { ebene: "winter", monate: [0, 1, 2, 9, 10, 11] },
  { ebene: "cal", monate: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] }];
const produktName = (pr, jahr) => pr.ebene === "mo" ? MONATE_KURZ[pr.i] + " " + jahr : pr.ebene === "q" ? "Q" + (pr.i + 1) + " " + jahr
  : pr.ebene === "sommer" ? "Sommer " + jahr : pr.ebene === "winter" ? "Winter " + jahr : "Cal " + jahr;

/* Eingaben eines Lieferjahres (Strom) → { cal, sommer, winter, q[4], mo[12] } mit je { base, peak, offpeak } in €/MWh */
function preiseStromAus(j) {
  const z = (v) => zahlOder(v);
  const bpo = (x) => ({ base: z(x && x.base), peak: z(x && x.peak), offpeak: z(x && x.offpeak) });
  return { cal: bpo(j), sommer: bpo(j.sommer), winter: bpo(j.winter),
    q: [0, 1, 2, 3].map((i) => bpo((j.q || [])[i])), mo: Array.from({ length: 12 }, (_, i) => bpo((j.mo || [])[i])) };
}

/* Preiskurve für ein Lieferjahr.
   p = preiseStromAus(...) (ältere Form { base, peak, q } wird übernommen), alles €/MWh.
   Vorrang: Monat → Quartal → Saison → Cal. Jede Stufe trifft ihren Preis genau, freie Monate werden
   verschoben, bis die gröbere Stufe stimmt (arbitragefrei). Offpeak ergibt sich aus Base und Peak;
   wer zwei der drei Preise einträgt, bekommt den dritten gerechnet, drei widersprüchliche werden gemeldet.
   profil (optional): Faktoren je Monat × Tagesart × Stunde für Peak- und Offpeakstunden.
   opt: { land, proTag } muss zur Last passen. */
function preiskurve(jahr, p, profil, opt = {}) {
  if (!p.cal) p = { cal: { base: zahlOder(p.base), peak: zahlOder(p.peak) }, q: (p.q || []).map((x) => ({ base: zahlOder(x && x.base), peak: zahlOder(x && x.peak) })) };
  const st = jahresStunden(jahr, opt.land || "", opt.proTag || 24);
  const hM = Array(12).fill(0), hPM = Array(12).fill(0);
  st.forEach((s) => { hM[s.m]++; if (s.peak) hPM[s.m]++; });
  const hinweise = [];
  /* Vorgaben je Produkt: Base und Peak, notfalls aus Offpeak gerechnet */
  const vorgaben = [];
  STROM_PRODUKTE.forEach((pr) => {
    const e = pr.ebene === "cal" ? p.cal : pr.ebene === "q" ? (p.q || [])[pr.i] : pr.ebene === "mo" ? (p.mo || [])[pr.i] : p[pr.ebene];
    if (!e) return;
    const ok = (v) => v != null && isFinite(v) && v !== 0;
    let B = ok(e.base) ? +e.base : null, P = ok(e.peak) ? +e.peak : null;
    const O = ok(e.offpeak) ? +e.offpeak : null;
    const h = pr.monate.reduce((x, m) => x + hM[m], 0), hp = pr.monate.reduce((x, m) => x + hPM[m], 0), ho = h - hp;
    const name = produktName(pr, jahr);
    if (O != null) {
      if (B != null && P != null) {
        const soll = (B * h - P * hp) / ho;
        if (Math.abs(soll - O) > 0.05) hinweise.push(name + ": Base, Peak und Offpeak passen nicht zusammen (Offpeak rechnerisch " + num(soll, 2) + ")");
      } else if (B != null) P = (B * h - O * ho) / hp;
      else if (P != null) B = (P * hp + O * ho) / h;
      else hinweise.push(name + ": Offpeak allein reicht nicht, bitte Base oder Peak dazu eintragen");
    }
    if (B != null || P != null) vorgaben.push({ ...pr, name, B, P });
  });
  const startwert = (feld) => {
    const c = vorgaben.find((v) => v.ebene === "cal" && v[feld] != null);
    if (c) return c[feld];
    const alle = vorgaben.filter((v) => v[feld] != null);
    return alle.length ? alle.reduce((x, v) => x + v[feld], 0) / alle.length : null;
  };
  const kalibriere = (form, feld, stundenM) => {
    const s0 = startwert(feld);
    if (s0 == null) throw new Error("Für " + jahr + " fehlt der " + (feld === "B" ? "Base" : "Peak") + "preis (Cal oder Saison, Quartale, Monate).");
    const mp = form.map((f) => f * s0);
    const fest = new Set();
    vorgaben.filter((v) => v[feld] != null).forEach((v) => {   /* Reihenfolge der Liste: fein vor grob */
      const frei = v.monate.filter((m) => !fest.has(m));
      const H = v.monate.reduce((x, m) => x + stundenM[m], 0);
      const summeFest = v.monate.filter((m) => fest.has(m)).reduce((x, m) => x + mp[m] * stundenM[m], 0);
      if (!frei.length) {
        const d = summeFest / H - v[feld];
        if (Math.abs(d) > 0.05) hinweise.push(v.name + " " + (feld === "B" ? "Base" : "Peak") + ": feinere Preise ergeben " + num(summeFest / H, 2)
          + " statt " + num(v[feld], 2) + " €/MWh");
      } else {
        const summeFrei = frei.reduce((x, m) => x + mp[m] * stundenM[m], 0);
        const f = summeFrei ? (v[feld] * H - summeFest) / summeFrei : 1;
        frei.forEach((m) => { mp[m] *= f; });
      }
      v.monate.forEach((m) => fest.add(m));
    });
    if (fest.size < 12) {
      const fehlt = [...Array(12).keys()].filter((m) => !fest.has(m)).map((m) => MONATE_KURZ[m]);
      throw new Error("Für " + jahr + " fehlen " + (feld === "B" ? "Base" : "Peak") + "preise für " + fehlt.join(", ") + " (oder ein Cal-Preis).");
    }
    return mp;
  };
  const baseM = kalibriere(MONATSFORM_BASE, "B", hM);
  const peakM = kalibriere(MONATSFORM_PEAK, "P", hPM);
  const offpeak = baseM.map((b, m) => (b * hM[m] - peakM[m] * hPM[m]) / (hM[m] - hPM[m]));

  /* Preise je Zeitschritt: Peak/Offpeak-Monatswert × Profilfaktor der Stunde, danach je Monat und Zeitzone
     auf den Monatswert zurückgeführt, damit die Kurve arbitragefrei bleibt */
  const preis = st.map((s) => (s.peak ? peakM[s.m] : offpeak[s.m])
    * (profil ? profil[s.peak ? 1 : 0][s.m][s.art][s.h] || 1 : 1));
  if (profil) {
    for (let m = 0; m < 12; m++) for (const pk of [true, false]) {
      let sum = 0, n = 0;
      st.forEach((s, i) => { if (s.m === m && s.peak === pk) { sum += preis[i]; n++; } });
      const ziel = pk ? peakM[m] : offpeak[m];
      const f = n && sum ? (ziel * n) / sum : 1;
      st.forEach((s, i) => { if (s.m === m && s.peak === pk) preis[i] *= f; });
    }
  }
  return { stunden: st, preis, monate: { base: baseM, peak: peakM, offpeak }, hinweise,
           quartalAbweichung: { base: 0, peak: 0 } };
}

/* Spot-PFC oder Ausgleichsenergiepreise (Reihe [{ t: Date, preis }]) → Preis je Zeitschritt eines Jahres.
   Deckt die Reihe das Jahr ab (mindestens 90 %), gelten die Preise zum selben Zeitpunkt; sonst der Mittelwert
   je Monat × Tagesart × Schritt im Tag aus der Reihe (Form eines anderen Jahres). */
function preiseAufJahr(reihe, jahr, land = "", proTag = 24) {
  const st = jahresStunden(jahr, land, proTag), proH = proTag / 24;
  const genau = new Map(), form = new Map(), formM = new Map();
  let summe = 0, n = 0;
  reihe.forEach(({ t, preis }) => {
    if (!t || !isFinite(preis)) return;
    const q = t.getHours() * proH + Math.floor(t.getMinutes() / (60 / proH));
    const add = (map, k) => { const a = map.get(k); if (a) { a[0] += preis; a[1]++; } else map.set(k, [preis, 1]); };
    if (t.getFullYear() === jahr) add(genau, t.getMonth() + "-" + t.getDate() + "-" + q);
    add(form, t.getMonth() + "-" + tagesart(t.getFullYear(), t.getMonth(), t.getDate(), land) + "-" + q);
    add(formM, t.getMonth() + "-" + q);
    summe += preis; n++;
  });
  if (!n) throw new Error("Die Datei enthält keine Preise mit Zeitpunkt.");
  const mw = (a) => a[0] / a[1];
  const treffer = st.filter((s) => genau.has(s.m + "-" + s.t + "-" + s.q)).length;
  const exakt = treffer >= st.length * 0.9;
  const preis = st.map((s) => {
    const g = exakt && genau.get(s.m + "-" + s.t + "-" + s.q);
    if (g) return mw(g);
    const f = form.get(s.m + "-" + s.art + "-" + s.q) || formM.get(s.m + "-" + s.q);
    return f ? mw(f) : summe / n;
  });
  return { stunden: st, preis, exakt, mittel: summe / n };
}

/* Spot- oder Ausgleichsenergiepreise aus einer Datei (CSV/Excel mit Zeit und €/MWh), Viertelstunden bleiben erhalten */
async function preisreiheRohAusDatei(d) {
  const stand = await lastgangAuswerten(d);
  const r = stand.werte.map((w, i) => ({ t: zeitLesen(stand.zeitpunkte[i]), preis: w })).filter((x) => x.t && isFinite(x.preis));
  if (r.length < 24 * 28) throw new Error("In " + d.name + " wurden nur " + r.length + " Preise mit Zeitpunkt gefunden.");
  return r;
}

/* Stundenprofil aus Day-Ahead-Preisen: Faktor je Monat × Tagesart × Stunde,
   getrennt für Peak- und Offpeakstunden, jeweils relativ zum Monatsmittel der Zeitzone. */
function profilAusPreisen(reihe /* [{ t: Date, preis }] */, land = "") {
  const roh = [0, 1].map(() => Array.from({ length: 12 }, () => Array.from({ length: 3 }, () => Array(24).fill(null).map(() => [0, 0]))));
  const mon = [0, 1].map(() => Array.from({ length: 12 }, () => [0, 0]));
  reihe.forEach(({ t, preis }) => {
    if (!t || !isFinite(preis)) return;
    const j = t.getFullYear(), m = t.getMonth(), tg = t.getDate(), h = t.getHours(), w = t.getDay();
    const pk = w >= 1 && w <= 5 && h >= 8 && h < 20 ? 1 : 0;
    const art = tagesart(j, m, tg, land);
    roh[pk][m][art][h][0] += preis; roh[pk][m][art][h][1]++;
    mon[pk][m][0] += preis; mon[pk][m][1]++;
  });
  return roh.map((z, pk) => z.map((mo, m) => mo.map((ar) => ar.map(([s, n]) => {
    const mm = mon[pk][m][1] ? mon[pk][m][0] / mon[pk][m][1] : 0;
    /* Faktoren nur bei sinnvollem Monatsmittel; negative und sehr kleine Mittel ergäben Unsinn */
    return n && mm > 5 ? Math.max(-1, Math.min(4, s / n / mm)) : 1;
  }))));
}

/* Hedgearten (Strom), Definitionen der Beschaffung. Je Zeitraum des gewählten Produkts (Cal, Quartal, Monat)
   entsteht eine Leistung für die Offpeak- und eine für die Peakstunden. Sie wird in Börsenprodukte zerlegt:
   Base = die kleinere der beiden, dazu Peak (Mehrleistung in den Peakstunden) oder Offpeak (Mehrleistung in den
   übrigen Stunden). Liegt die Last tagsüber unter der Nachtlast, wird also mit Base + Offpeak abgesichert, nicht Peak 0.
   menge:      Menge der offenen Positionen = Menge der geschlossenen: je Zone Short-Menge = Long-Menge, kein Preisbezug
   preis:      Werthedge: Wert der offenen = Wert der geschlossenen Positionen, je Zone zur Preiskurve
   preismenge: Long und Short preislich ausgeglichen (über den Zeitraum), dabei so nah wie möglich am Mengenhedge
   bottomup:   bis zur kleinsten Last mit Base und Peak auffüllen, keine Long-Position; alles darüber bleibt offen */
const HEDGE_ARTEN = [
  { id: "menge", name: "Mengenhedge", text: "Menge der offenen Positionen = Menge der geschlossenen Positionen (Short-Menge = Long-Menge je Zeitzone), ohne Preisbezug." },
  { id: "preis", name: "Preishedge (Werthedge)", text: "Wert der offenen Positionen = Wert der geschlossenen Positionen, je Zeitzone zur Preiskurve; die Mengen können abweichen." },
  { id: "preismenge", name: "Preis-Mengen-Hedge", text: "Long und Short sind preislich ausgeglichen, und unter dieser Bedingung liegt die Absicherung so nah wie möglich am Mengenhedge: der Sweet Spot zwischen beiden." },
  { id: "bottomup", name: "Bottom-up-Hedge", text: "Die Last wird bis zur kleinsten Last mit Base und Peak aufgefüllt, „bis unters Dach“, ohne dass Long-Positionen entstehen. Alles darüber bleibt offene Position." }];
/* Skalierungen für den Vergleich (Prozent des gewählten Hedges) */
const HEDGE_STUFEN = [80, 90, 100, 110, 120];
const HEDGE_PRODUKTE = [{ id: "cal", name: "Cal (ein Jahresband)" }, { id: "quartal", name: "Quartale" }, { id: "monat", name: "Monate" }];
const hedgeVon = (h) => ({ art: "menge", produkt: "cal", prozent: "100", ...(h || {}) });

/* Bewertung eines Lieferjahres. last.last: MWh je Zeitschritt, kurve.preis: €/MWh je Zeitschritt. */
function jahresBewertung(last, kurve, hedge) {
  const L = last.last, Pr = kurve.preis, st = last.stunden, dt = last.dt || 1;
  const hg = hedgeVon(hedge);
  const quote = Math.max(0, zahlOder(hg.prozent) == null ? 100 : zahlOder(hg.prozent)) / 100;
  let menge = 0, wert = 0, peakMenge = 0, peakSt = 0, spitze = 0;
  for (let i = 0; i < L.length; i++) {
    menge += L[i]; wert += L[i] * Pr[i];
    if (L[i] > spitze) spitze = L[i];
    if (st[i].peak) { peakMenge += L[i]; peakSt++; }
  }
  const gruppe = (s) => hg.produkt === "monat" ? s.m : hg.produkt === "quartal" ? Math.floor(s.m / 3) : 0;
  const anzahl = hg.produkt === "monat" ? 12 : hg.produkt === "quartal" ? 4 : 1;
  const zonen = Array.from({ length: anzahl }, () => [[], []]); /* [offpeak, peak] je Zeitraum: Indizes */
  st.forEach((s, i) => zonen[gruppe(s)][s.peak ? 1 : 0].push(i));
  /* Leistung (MW) je Zone: Offpeak-Stunden x, Peak-Stunden y; Base = x, Peak = y − x */
  const zonenWerte = (idx) => {
    let n = 0, l = 0, lp = 0, sp = 0, min = Infinity;
    idx.forEach((i) => { const v = L[i] / dt; n++; l += v; lp += v * Pr[i]; sp += Pr[i]; if (v < min) min = v; });
    return { n, l, lp, sp, min: n ? min : 0 };
  };
  const perioden = zonen.map(([off, pk], g) => {
    const o = zonenWerte(off), q = zonenWerte(pk);
    let x, y;
    if (hg.art === "preis") {
      x = o.sp > 0 ? o.lp / o.sp : o.l / (o.n || 1);
      y = q.n ? (q.sp > 0 ? q.lp / q.sp : q.l / q.n) : x;
    } else if (hg.art === "preismenge") {
      /* Wertgleichheit über den Zeitraum (a·x + c·y = W), dabei kleinste Mengenabweichung je Zone */
      const a = o.sp, c = q.sp, W = o.lp + q.lp, No = o.n || 1, Np = q.n || 1;
      const nenner = (a * a) / (No * No) + (q.n ? (c * c) / (Np * Np) : 0);
      const mu = nenner > 0 ? (W - (a * o.l) / No - (q.n ? (c * q.l) / Np : 0)) / nenner : 0;
      x = o.l / No + (mu * a) / (No * No);
      y = q.n ? q.l / Np + (mu * c) / (Np * Np) : x;
    } else if (hg.art === "bottomup") {
      x = Math.min(o.min, q.n ? q.min : Infinity);
      y = q.n ? q.min : x;
    } else {
      x = o.l / (o.n || 1);
      y = q.n ? q.l / q.n : x;
    }
    const lo = Math.max(0, x), lp = Math.max(0, y), base = Math.min(lo, lp);
    return { g, baseMW: base * quote, peakMW: (lp - base) * quote, offpeakMW: (lo - base) * quote };
  });
  const hb = new Float64Array(L.length), hp = new Float64Array(L.length);
  let hedgeMenge = 0, hedgeWert = 0, baseSum = 0, peakSum = 0, offSum = 0, offSt = 0, baseEnergie = 0;
  let shortMenge = 0, longMenge = 0, shortWert = 0, longWert = 0;
  st.forEach((s, i) => {
    const pe = perioden[gruppe(s)];
    /* hp: Zusatz über Base in diesem Zeitschritt, Peak in den Peakstunden, sonst Offpeak */
    hb[i] = pe.baseMW; hp[i] = s.peak ? pe.peakMW : pe.offpeakMW;
    const e = (hb[i] + hp[i]) * dt;
    hedgeMenge += e; hedgeWert += e * Pr[i]; baseEnergie += (hb[i] + (s.peak ? 0 : hp[i])) * dt;
    baseSum += hb[i]; if (s.peak) peakSum += hp[i]; else { offSum += hp[i]; offSt++; }
    const d = L[i] - e;
    if (d > 0) { shortMenge += d; shortWert += d * Pr[i]; } else { longMenge -= d; longWert -= d * Pr[i]; }
  });
  /* Kennzahlen je Zeitraum für die Tabelle: Leistung, Menge und Preise der Kurve */
  const periodenInfo = perioden.map((pe) => {
    const [off, pk] = zonen[pe.g];
    const alle = off.concat(pk);
    const mittelP = (idx) => idx.length ? idx.reduce((x, i) => x + Pr[i], 0) / idx.length : 0;
    const e = (pe.baseMW * alle.length + pe.peakMW * pk.length + pe.offpeakMW * off.length) * dt;
    const w = alle.reduce((x, i) => x + (pe.baseMW + (st[i].peak ? pe.peakMW : pe.offpeakMW)) * dt * Pr[i], 0);
    return { name: hg.produkt === "monat" ? MONATE_KURZ[pe.g] : hg.produkt === "quartal" ? "Q" + (pe.g + 1) : "Cal",
      baseMW: pe.baseMW, peakMW: pe.peakMW, offpeakMW: pe.offpeakMW, menge: e, preis: e ? w / e : 0,
      basePreis: mittelP(alle), peakPreis: mittelP(pk), offpeakPreis: mittelP(off),
      last: alle.reduce((x, i) => x + L[i], 0) };
  });
  const rest = wert - hedgeWert;
  return {
    menge, wert, preis: menge ? wert / menge : 0,
    spitze: spitze / dt, benutzung: spitze ? menge / (spitze / dt) : 0, peakAnteil: menge ? peakMenge / menge : 0,
    baseMW: L.length ? baseSum / L.length : 0, peakMW: peakSt ? peakSum / peakSt : 0, offpeakMW: offSt ? offSum / offSt : 0,
    hedgeMenge, hedgeWert, hedgePreis: hedgeMenge ? hedgeWert / hedgeMenge : 0, hedgeQuote: menge ? hedgeMenge / menge : 0,
    struktur: rest, strukturProMWh: menge ? rest / menge : 0,
    gewichtBase: hedgeMenge ? baseEnergie / hedgeMenge : 1,
    perioden: periodenInfo, hedge: hg, hb, hp, dt,
    shortMenge, longMenge, shortWert, longWert,
  };
}
/* Ausgleichsenergie, Näherung nach der Methode der Beschaffung:
   Die typische Last des Lieferjahres (Referenzlastgang) wird um einige Stunden nach vorn und nach hinten verschoben
   und als Ist-Lastgang angenommen; das simuliert die Prognoseunschärfe. Die Deltamengen (Ist − Referenz) werden mit
   der AE-PFC bewertet. Ergebnis = Mittel der Beträge beider Richtungen × Wahrscheinlichkeitsfaktor, je MWh Last. */
function aeNaeherung(last, aePreis, stunden, faktorProzent) {
  const L = last.last, n = L.length, dt = last.dt || 1;
  const k = Math.max(1, Math.round((+stunden || 2) / dt));
  const menge = L.reduce((x, y) => x + y, 0) || 1;
  const richtung = (v) => {
    let kosten = 0, delta = 0;
    for (let i = 0; i < n; i++) {
      const d = L[(i - v + n) % n] - L[i];
      kosten += d * aePreis[i]; delta += Math.abs(d);
    }
    return { kosten, delta };
  };
  const vor = richtung(k), nach = richtung(-k);
  const roh = (Math.abs(vor.kosten) + Math.abs(nach.kosten)) / 2 / menge;
  const f = Math.max(0, zahlOder(faktorProzent) == null ? 100 : zahlOder(faktorProzent)) / 100;
  return { roh, proMWh: roh * f, faktor: f, stunden: k * dt,
           deltaAnteil: (vor.delta + nach.delta) / 2 / menge, vor: vor.kosten / menge, nach: nach.kosten / menge };
}

/* Energiepreis des Lastgangs: Anteil der Absicherung × Hedgepreis + Struktur und offene Menge (je MWh Last) */
const lastgangPreis = (j) => (j.hedgeQuote == null ? 1 : j.hedgeQuote) * j.hedgePreis + j.strukturProMWh;

/* Tranchenplan eines Jahres: gekaufte Anteile mit Preis, offener Rest zum aktuellen Hedgepreis */
function tranchenStand(tranchen, jahr, bew, stress, heuteStr) {
  const t = (tranchen || []).filter((x) => +x.jahr === +jahr);
  const anteil = (x) => Math.max(0, +String(x.anteil).replace(",", ".") || 0) / 100;
  const z = (v) => +String(v || "").replace(",", ".") || 0;
  /* Preis einer Tranche: direkt oder aus Base- und Peakpreis im Verhältnis des Lastgangs */
  const preisVon = (x) => (z(x.preisBase) > 0 && z(x.preisPeak) > 0
    ? bew.gewichtBase * z(x.preisBase) + (1 - bew.gewichtBase) * z(x.preisPeak) : z(x.preis));
  const gekauft = t.filter((x) => x.status === "gekauft" && preisVon(x) > 0);
  const gekauftAnteil = Math.min(1, gekauft.reduce((s, x) => s + anteil(x), 0));
  const gekauftPreis = gekauftAnteil ? gekauft.reduce((s, x) => s + anteil(x) * preisVon(x), 0) / gekauft.reduce((s, x) => s + anteil(x), 0) : 0;
  const offen = 1 - gekauftAnteil;
  const s = (+stress || 0) / 100;
  const quote = bew.hedgeQuote == null ? 1 : bew.hedgeQuote;
  const misch = (aufschlag) => quote * (gekauftAnteil * gekauftPreis + offen * bew.hedgePreis * (1 + aufschlag)) + bew.strukturProMWh * (1 + aufschlag)
    + (bew.aeProMWh || 0) * (1 + aufschlag);
  /* Sollstand: Anteil der geplanten Tranchen, deren Termin schon vorbei ist */
  const geplantBis = t.filter((x) => x.datum && x.datum <= heuteStr).reduce((s, x) => s + anteil(x), 0);
  const geplant = t.reduce((s, x) => s + anteil(x), 0);
  return {
    anzahl: t.length, gekauftAnteil, gekauftPreis, offen, geplant,
    soll: Math.min(1, geplantBis), rueckstand: Math.max(0, Math.min(1, geplantBis) - gekauftAnteil),
    preis: misch(0), preisHoch: misch(s), preisTief: misch(-s),
  };
}

/* Ampel je Lieferjahr */
function ampel(stand, bew, regeln, lieferbeginn, heuteStr) {
  const gruende = [];
  let stufe = 0;
  const hoechst = +String((regeln && regeln.hoechstpreis) || "").replace(",", ".");
  if (hoechst > 0 && stand.preisHoch > hoechst) {
    stufe = Math.max(stufe, stand.preis > hoechst ? 2 : 1);
    gruende.push(stand.preis > hoechst ? "Höchstpreis schon ohne Stresstest überschritten"
      : "Höchstpreis im Stresstest überschritten");
  }
  if (stand.rueckstand > 0.25) { stufe = 2; gruende.push("Mehr als 25 % hinter dem Tranchenplan"); }
  else if (stand.rueckstand > 0.05) { stufe = Math.max(stufe, 1); gruende.push("Hinter dem Tranchenplan"); }
  if (lieferbeginn) {
    const tage = (new Date(lieferbeginn) - new Date(heuteStr)) / 86400000;
    if (tage < 90 && stand.offen > 0.3) { stufe = 2; gruende.push("Weniger als drei Monate bis Lieferbeginn, über 30 % offen"); }
  }
  if (!(regeln && regeln.gas) && bew.benutzung && bew.benutzung < 2500) { stufe = Math.max(stufe, 1); gruende.push("Unruhiger Lastgang, Strukturrisiko beachten"); }
  if (stand.geplant && Math.abs(stand.geplant - 1) > 0.01) { stufe = Math.max(stufe, 1); gruende.push("Tranchen ergeben nicht 100 %"); }
  return { stufe, gruende };
}

/* Gleichmäßiger Tranchenplan: n Tranchen zwischen zwei Daten */
function tranchenVorschlag(jahr, n, von, bis, produkt) {
  const a = new Date(von), b = new Date(bis);
  const raus = [];
  const basisAnteil = Math.floor(10000 / n) / 100;
  for (let i = 0; i < n; i++) {
    const d = n === 1 ? a : new Date(a.getTime() + ((b - a) * i) / (n - 1));
    const anteil = i === n - 1 ? Math.round((100 - basisAnteil * (n - 1)) * 100) / 100 : basisAnteil;
    raus.push({ jahr, datum: d.toISOString().slice(0, 10), anteil: String(anteil).replace(".", ","), produkt, status: "geplant", preis: "" });
  }
  return raus;
}

/* ------------------------------------------------------------------ */
/*  Erdgas                                                             */
/*  Am Terminmarkt THE gibt es nur Bandprodukte (Jahr, Saison,         */
/*  Quartal, Monat), kein Peak. Gerechnet wird je Gastag (6 bis 6 Uhr).*/
/*  Preiskurve: Jahr → Sommer/Winter → Quartal → Monat → Gastag,       */
/*  jede Stufe trifft den eingegebenen Preis genau (arbitragefrei).    */
/*  Absicherung: Monatsbänder (mittlere Tagesmenge je Monat). Daraus   */
/*  ergeben sich der Saisonanteil (Monatsband gegenüber Jahresband)    */
/*  und die Struktur (Abweichung der Tage vom Monatsband).            */
/* ------------------------------------------------------------------ */

/* Gastage eines Lieferjahres (Kalenderjahr), mit Tagesart wie bei Strom */
function gasTage(jahr, land = "") {
  const raus = [];
  for (let m = 0; m < 12; m++) {
    const n = new Date(Date.UTC(jahr, m + 1, 0)).getUTCDate();
    for (let t = 1; t <= n; t++) raus.push({ m, t, h: 0, art: tagesart(jahr, m, t, land), peak: false });
  }
  return raus;
}

/* Datum als Schlüssel JJJJ-MM-TT (Ortszeit) */
const tagSchluessel = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");

/* Gas-Lastgang (Stunden-, Viertelstunden- oder Tageswerte) → Tagesmengen je Gastag.
   Bei Tageswerten gilt das Datum als Gastag. Bei kürzeren Intervallen gehört ein
   Wert zum Gastag, der um 6 Uhr beginnt; Zeitstempel am Intervallende (06:00)
   zählen zum Intervall davor. */
function gasTagesmengen(werte, zeiten, proStunde, einheit) {
  const t = zeiten.map((z) => zeitLesen(z));
  const abst = [];
  for (let i = 1; i < Math.min(t.length, 800); i++)
    if (t[i] && t[i - 1]) { const h = (t[i] - t[i - 1]) / 3600000; if (h > 0) abst.push(h); }
  abst.sort((x, y) => x - y);
  let schritt = abst.length ? abst[Math.floor(abst.length / 2)] : werte.length <= 400 ? 24 : 1 / proStunde;
  if (schritt > 20) schritt = 24;
  const tage = new Map();
  let spitzeKw = 0, ohneDatum = 0;
  const start = new Date(new Date().getFullYear() - 1, 0, 1, schritt === 24 ? 0 : 6);
  werte.forEach((w, i) => {
    let z = t[i];
    if (!z) { ohneDatum++; z = new Date(start.getTime() + i * schritt * 3600000 + (schritt === 24 ? 0 : schritt * 3600000)); }
    const kwh = einheit === "kW" ? w * schritt : w;
    let tag;
    if (schritt === 24) tag = new Date(z.getFullYear(), z.getMonth(), z.getDate());
    else {
      spitzeKw = Math.max(spitzeKw, kwh / schritt);
      const k = new Date(z.getTime() - 60000 - 6 * 3600000);
      tag = new Date(k.getFullYear(), k.getMonth(), k.getDate());
    }
    const s = tagSchluessel(tag);
    tage.set(s, (tage.get(s) || 0) + kwh);
  });
  return { tage, schritt, spitzeKw, ohneDatum };
}

/* Tagesmengen (Map JJJJ-MM-TT → kWh) → Gasform: mittlere kWh je Gastag für Monat × Tagesart */
function gasForm(tage, land = "") {
  const summe = Array.from({ length: 12 }, () => [0, 0, 0]);
  const zahl = Array.from({ length: 12 }, () => [0, 0, 0]);
  let gesamt = 0, n = 0, spitzeTag = 0;
  const monate = Array(12).fill(0);
  for (const [s, kwh] of tage) {
    const [j, m, d] = s.split("-").map(Number);
    const art = tagesart(j, m - 1, d, land);
    summe[m - 1][art] += kwh; zahl[m - 1][art]++;
    monate[m - 1] += kwh;
    gesamt += kwh; n++; spitzeTag = Math.max(spitzeTag, kwh);
  }
  const mittel = summe.map((mo, m) => mo.map((x, a) => (zahl[m][a] ? x / zahl[m][a] : null)));
  for (let m = 0; m < 12; m++) for (let a = 0; a < 3; a++) {
    if (mittel[m][a] != null) continue;
    const ersatz = [0, 1, 2].map((b) => mittel[m][b]).find((x) => x != null);
    if (ersatz != null) { mittel[m][a] = ersatz; continue; }
    const andere = [];
    for (let k = 0; k < 12; k++) if (mittel[k][a] != null) andere.push(mittel[k][a]);
    mittel[m][a] = andere.length ? andere.reduce((x, y) => x + y, 0) / andere.length : 0;
  }
  return { mittel, gesamt, tage: n, spitzeTag, monate, land, jahresmenge: n ? (gesamt / n) * 365 : 0 };
}

/* Tageslast eines Lieferjahres in MWh je Gastag, auf die Jahresmenge (kWh) skaliert */
function gasJahresLast(form, jahr, mengeKwh) {
  const tage = gasTage(jahr, form.land || "");
  const roh = tage.map((d) => form.mittel[d.m][d.art]);
  const sum = roh.reduce((x, y) => x + y, 0) || 1;
  const faktor = (mengeKwh || form.jahresmenge) / sum / 1000;
  return { tage, last: roh.map((x) => x * faktor) };
}

/* Übliche Saisonform am Terminmarkt THE (Winter teurer); wird an die Eingaben kalibriert */
const MONATSFORM_GAS = [1.06, 1.06, 1.03, 0.97, 0.95, 0.95, 0.96, 0.96, 0.97, 0.99, 1.04, 1.06];
const GAS_SOMMER = [3, 4, 5, 6, 7, 8];          /* April bis September */
const GAS_WINTER = [0, 1, 2, 9, 10, 11];        /* Januar bis März und Oktober bis Dezember */

/* Preiskurve Erdgas für ein Lieferjahr.
   p = { cal, sommer, winter, q: [preis × 4] }, alles €/MWh; nur cal ist Pflicht.
   profil (optional): Faktor je Monat × Tagesart aus Day-Ahead-Preisen. */
function gaskurve(jahr, p, profil, land = "") {
  const tage = gasTage(jahr, land);
  const cal = +p.cal;
  if (!(cal > 0)) throw new Error("Für " + jahr + " fehlt der Cal-Preis Erdgas.");
  const dM = Array(12).fill(0);
  tage.forEach((d) => { dM[d.m]++; });
  const mp = MONATSFORM_GAS.map((f) => f * cal);
  const fest = new Set();
  const wert = (v) => (+v > 0 ? +v : null);
  /* Monate einer Gruppe so skalieren, dass ihr Mittel den Gruppenpreis trifft;
     schon festgelegte Monate bleiben, die übrigen werden angepasst */
  const treffe = (monate, ziel) => {
    const frei = monate.filter((m) => !fest.has(m));
    if (!frei.length) return;
    const soll = ziel * monate.reduce((s, m) => s + dM[m], 0);
    const schon = monate.filter((m) => fest.has(m)).reduce((s, m) => s + mp[m] * dM[m], 0);
    const form = frei.reduce((s, m) => s + mp[m] * dM[m], 0);
    const f = form > 0 ? (soll - schon) / form : 1;
    frei.forEach((m) => { mp[m] *= f; fest.add(m); });
  };
  [0, 1, 2, 3].forEach((q) => { const v = wert(p.q && p.q[q]); if (v) treffe([3 * q, 3 * q + 1, 3 * q + 2], v); });
  if (wert(p.sommer)) treffe(GAS_SOMMER, wert(p.sommer));
  if (wert(p.winter)) treffe(GAS_WINTER, wert(p.winter));
  const alle = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  treffe(alle, cal);
  const jahrMittel = alle.reduce((s, m) => s + mp[m] * dM[m], 0) / tage.length;

  /* Tagespreise: Monatspreis × Profilfaktor, je Monat auf den Monatspreis zurückgeführt */
  const preis = tage.map((d) => mp[d.m] * (profil ? (profil[d.m] && profil[d.m][d.art]) || 1 : 1));
  if (profil) for (let m = 0; m < 12; m++) {
    let s = 0, n = 0;
    tage.forEach((d, i) => { if (d.m === m) { s += preis[i]; n++; } });
    const f = s ? (mp[m] * n) / s : 1;
    tage.forEach((d, i) => { if (d.m === m) preis[i] *= f; });
  }
  return { tage, preis, monate: mp, abweichung: jahrMittel - cal };
}

/* Tagesprofil aus Day-Ahead-Preisen Erdgas: Faktor je Monat × Tagesart, relativ zum Monatsmittel */
function profilAusGasPreisen(reihe /* [{ tag: "JJJJ-MM-TT", preis }] */, land = "") {
  const roh = Array.from({ length: 12 }, () => [[0, 0], [0, 0], [0, 0]]);
  const mon = Array.from({ length: 12 }, () => [0, 0]);
  reihe.forEach(({ tag, preis }) => {
    if (!tag || !isFinite(preis)) return;
    const [j, m, d] = String(tag).slice(0, 10).split("-").map(Number);
    if (!j || !m || !d) return;
    const art = tagesart(j, m - 1, d, land);
    roh[m - 1][art][0] += preis; roh[m - 1][art][1]++;
    mon[m - 1][0] += preis; mon[m - 1][1]++;
  });
  return roh.map((mo, m) => mo.map(([s, n]) => {
    const mm = mon[m][1] ? mon[m][0] / mon[m][1] : 0;
    return n && mm > 1 ? Math.max(0.5, Math.min(1.5, s / n / mm)) : 1;
  }));
}

/* Bewertung eines Lieferjahres Erdgas */
function jahresBewertungGas(last, kurve) {
  const L = last.last, P = kurve.preis, tg = last.tage;
  let menge = 0, wert = 0, spitzeTag = 0, winter = 0, preisSumme = 0;
  const mMenge = Array(12).fill(0), mTage = Array(12).fill(0);
  for (let i = 0; i < L.length; i++) {
    menge += L[i]; wert += L[i] * P[i]; preisSumme += P[i];
    mMenge[tg[i].m] += L[i]; mTage[tg[i].m]++;
    if (L[i] > spitzeTag) spitzeTag = L[i];
    if (GAS_WINTER.includes(tg[i].m)) winter += L[i];
  }
  /* Absicherung mit Monatsbändern: je Monat die mittlere Tagesmenge zum Monatspreis */
  const hedgeWert = mMenge.reduce((s, x, m) => s + x * kurve.monate[m], 0);
  /* zum Vergleich ein Jahresband (Cal) über alle Tage */
  const calWert = (menge / L.length) * preisSumme;
  return {
    menge, wert, preis: menge ? wert / menge : 0,
    hedgeWert, hedgeMenge: menge, hedgePreis: menge ? hedgeWert / menge : 0,
    calPreis: menge ? calWert / menge : 0,
    saisonProMWh: menge ? (hedgeWert - calWert) / menge : 0,
    struktur: wert - hedgeWert, strukturProMWh: menge ? (wert - hedgeWert) / menge : 0,
    calMW: L.length ? menge / L.length / 24 : 0,
    monatsMW: mMenge.map((x, m) => (mTage[m] ? x / mTage[m] / 24 : 0)),
    monatsMenge: mMenge, spitzeTag, winterAnteil: menge ? winter / menge : 0,
    gewichtBase: 1, benutzung: null, peakAnteil: 0, baseMW: L.length ? menge / L.length / 24 : 0, peakMW: 0,
  };
}

/* Analyse Erdgas: Tageslast gegen geschlossene Monatsbänder (gleiche Form wie analyseJahr) */
function analyseJahrGas(form, bw, jahr) {
  const j = (bw.jahre || []).find((x) => +x.jahr === +jahr);
  if (!form || !j) return null;
  const menge = zahlOder(j.menge) || form.jahresmenge;
  const last = gasJahresLast(form, jahr, menge);
  const kurve = gaskurve(jahr, gasPreiseAus(j), bw.profil || null, form.land || "");
  const e = jahresBewertungGas(last, kurve);
  const z = (v) => +String(v || "").replace(",", ".") || 0;
  const gekauft = (bw.tranchen || []).filter((t) => +t.jahr === +jahr && t.status === "gekauft");
  let anteil = 0, wertProMWh = 0;
  gekauft.forEach((t) => { const a = Math.max(0, z(t.anteil)) / 100; anteil += a; wertProMWh += a * z(t.preis); });
  const preisZuWert = anteil ? wertProMWh / anteil : 0;
  anteil = Math.min(1, anteil);
  const zu = last.tage.map((d) => anteil * e.monatsMW[d.m] * 24);
  return { j, e, stunden: last.tage, last: last.last, preis: kurve.preis, zu,
           preisZu: last.tage.map(() => preisZuWert), anteil };
}

/* Eingaben eines Lieferjahres Erdgas → Preise für gaskurve */
const gasPreiseAus = (j) => ({ cal: zahlOder(j.cal), sommer: zahlOder(j.sommer), winter: zahlOder(j.winter),
  q: (j.q || []).map((q) => zahlOder(q && q.preis)) });


/* Gas-Lastgänge einlesen: alle Dateien zu Tagesmengen je Gastag zusammenführen */
async function gasFormAusDateien(dateien, einheit, land = "") {
  const alle = new Map();
  let spitzeKw = 0, ohneDatum = 0, schritt = 24;
  const namen = [];
  for (const d of dateien) {
    const stand = await lastgangAuswerten(d);
    const r = gasTagesmengen(stand.werte, stand.zeitpunkte, stand.proStunde, einheit);
    for (const [s, v] of r.tage) alle.set(s, (alle.get(s) || 0) + v);
    spitzeKw += r.spitzeKw; ohneDatum += r.ohneDatum; schritt = Math.min(schritt, r.schritt);
    namen.push(d.name);
  }
  const f = gasForm(alle, land);
  const reihe = [...alle.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  return { mittel: f.mittel, jahresmenge: f.jahresmenge, gas: true, land,
    info: { gas: true, jahresmenge: f.jahresmenge, spitzeTag: f.spitzeTag, spitzeKw, tage: f.tage, schritt, ohneDatum,
      dateien: namen, grafiken: [{ name: namen.join(", "), profil: f.monate, einheit: "kWh", gasReihe: reihe }] } };
}

/* Erdgas-Spotpreise (THE Day-Ahead) aus der Datenbank, seitenweise */
async function gasSpotLaden(von, bis) {
  const raus = [];
  for (let ab = 0; ab < 20000; ab += 1000) {
    const { data, error } = await sb.from("marktpreise").select("tag,preis").eq("markt", "THE-DA")
      .gte("tag", von).lte("tag", bis).order("tag").range(ab, ab + 999);
    if (error) throw new Error("Erdgaspreise nicht lesbar: " + error.message);
    raus.push(...(data || []).map((x) => ({ tag: x.tag, preis: +x.preis })));
    if (!data || data.length < 1000) break;
  }
  return raus;
}

/* Strom-Spotpreise (Day-Ahead DE-LU): fester Bestand im Portal (Stand STROM_STAND),
   neuere Tage holt der Browser monatsweise von Energy-Charts dazu. */
const STROM_STAND = "2026-11-12";
let stromBestandLaden = null;
const stromBestand = () => {
  if (!stromBestandLaden)
    stromBestandLaden = fetch("/assets/strom-de-lu-" + STROM_STAND + ".json")
      .then((r) => { if (!r.ok) throw new Error("Bestand nicht ladbar"); return r.json(); })
      .then((d) => {
        const reihe = [];
        (d.segmente || []).forEach(([start, schritt, preise]) => preise.forEach((p, i) => reihe.push({ s: start + i * schritt, preis: p })));
        return { reihe, lizenz: d.lizenz || "" };
      })
      .catch((e) => { stromBestandLaden = null; throw e; });
  return stromBestandLaden;
};
async function stromSpotLaden(von, bis, melden) {
  const werte = new Map();
  let lizenz = "", hinweis = "";
  melden && melden("Strompreise werden gelesen …");
  try {
    const b = await stromBestand();
    lizenz = b.lizenz;
    b.reihe.forEach((x) => werte.set(x.s, x.preis));
  } catch (e) { hinweis = "Fester Bestand nicht lesbar, alles wird von Energy-Charts geholt. "; }
  /* letzter vollständiger Tag im Bestand (deutsche Zeit) */
  const letzter = werte.size ? Math.max(...werte.keys()) : 0;
  const bestandBis = letzter ? zeitTeile((letzter - 3600) * 1000).datum.split(".").reverse().join("-") : "";
  const ab = bestandBis && bestandBis >= von ? bestandBis : von;
  if (!bestandBis || bis > bestandBis) {
    const [j1, m1] = ab.split("-").map(Number), [j2, m2] = bis.split("-").map(Number);
    const monate = [];
    for (let j = j1, m = m1; j < j2 || (j === j2 && m <= m2); m === 12 ? (j++, m = 1) : m++) monate.push([j, m]);
    try {
      for (let i = 0; i < monate.length; i++) {
        const [j, m] = monate[i];
        const a = i === 0 ? ab : j + "-" + String(m).padStart(2, "0") + "-01";
        const nj = m === 12 ? j + 1 : j, nm = m === 12 ? 1 : m + 1;
        const e = nj + "-" + String(nm).padStart(2, "0") + "-01";
        melden && melden("Neue Strompreise " + MONATE_KURZ[m - 1] + " " + j + " werden geholt …");
        let r = null;
        for (let versuch = 0; versuch < 6; versuch++) {
          r = await fetch("https://api.energy-charts.info/price?bzn=DE-LU&start=" + a + "&end=" + e);
          if (r.status !== 429) break;
          melden && melden("Energy-Charts bittet um Geduld, neuer Versuch …");
          await new Promise((ok) => setTimeout(ok, 3000 * (versuch + 1)));
        }
        if (!r || !r.ok) throw new Error("Energy-Charts antwortet nicht (" + (r ? r.status : "keine Verbindung") + ")");
        const d = await r.json();
        if (d && d.license_info) lizenz = d.license_info;
        (d.unix_seconds || []).forEach((s, k) => { if (d.price[k] != null && isFinite(+d.price[k])) werte.set(s, +d.price[k]); });
        await new Promise((ok) => setTimeout(ok, 1200));
      }
    } catch (e) {
      if (!werte.size) throw e;
      const grund = /fetch|network|load failed/i.test(String((e && e.message) || e)) ? "keine Verbindung zu Energy-Charts" : (e.message || String(e));
      hinweis += "Neuere Tage nach dem " + datum(bestandBis) + " konnten nicht geholt werden (" + grund + "). Die Datei endet dort.";
    }
  }
  return { reihe: [...werte.entries()].sort((x, y) => x[0] - y[0]).map(([s, preis]) => ({ s, preis })), lizenz, hinweis };
}

/* Datum und Uhrzeit in deutscher Zeit, unabhängig von der Zeitzone des Geräts */
const ZEIT_DE = new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", hourCycle: "h23", weekday: "short", timeZoneName: "short" });
function zeitTeile(ms) {
  const t = {};
  ZEIT_DE.formatToParts(new Date(ms)).forEach((p) => { t[p.type] = p.value; });
  return { datum: t.day + "." + t.month + "." + t.year, zeit: t.hour + ":" + t.minute, tag: t.weekday.replace(".", ""),
           zone: t.timeZoneName, j: +t.year, m: +t.month - 1, h: +t.hour, wt: ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"].indexOf(t.weekday.replace(".", "")) };
}
const WOCHENTAG = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

/* Excel-Mappe mit mehreren Blättern (komprimiert), fette Kopfzeile, Kopf fixiert */
function erzeugeXlsxMappe(dateiname, blaetter /* [{ name, zeilen, breiten, kopf }] */) {
  const esc = (t) => String(t == null ? "" : t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const spalte = (i) => { let n = i + 1, s = ""; while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); } return s; };
  const blattXml = (b) => {
    const kopf = b.kopf == null ? 1 : b.kopf;
    const reihen = b.zeilen.map((z, i) => '<row r="' + (i + 1) + '">' + z.map((w, j) => {
      const pos = spalte(j) + (i + 1);
      const fett = i < kopf ? ' s="1"' : "";
      if (typeof w === "number" && isFinite(w)) return '<c r="' + pos + '"' + (fett || (Number.isInteger(w) ? "" : ' s="2"')) + "><v>" + w + "</v></c>";
      if (w == null || w === "") return "";
      return '<c r="' + pos + '" t="inlineStr"' + fett + '><is><t xml:space="preserve">' + esc(w) + "</t></is></c>";
    }).join("") + "</row>").join("");
    const cols = (b.breiten || []).map((w, i) => '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + w + '" customWidth="1"/>').join("");
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      (kopf ? '<sheetViews><sheetView workbookViewId="0"><pane ySplit="' + kopf + '" topLeftCell="A' + (kopf + 1) + '" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' : "") +
      (cols ? "<cols>" + cols + "</cols>" : "") + "<sheetData>" + reihen + "</sheetData></worksheet>";
  };
  const dateien = {
    "[Content_Types].xml": '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
      '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
      blaetter.map((_, i) => '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>').join("") + "</Types>",
    "_rels/.rels": '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    "xl/workbook.xml": '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' +
      blaetter.map((b, i) => '<sheet name="' + esc(b.name).slice(0, 31) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>').join("") + "</sheets></workbook>",
    "xl/_rels/workbook.xml.rels": '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      blaetter.map((_, i) => '<Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>').join("") +
      '<Relationship Id="rId' + (blaetter.length + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
    "xl/styles.xml": '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>' +
      '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>' +
      '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
      '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
      '<cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
      '<xf numFmtId="4" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs></styleSheet>',
  };
  blaetter.forEach((b, i) => { dateien["xl/worksheets/sheet" + (i + 1) + ".xml"] = blattXml(b); });
  const z = {};
  Object.entries(dateien).forEach(([k, v]) => { z[k] = strToU8(v); });
  const bytes = zipSync(z, { level: 6 });
  let roh = "";
  for (let i = 0; i < bytes.length; i += 0x8000) roh += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return { name: dateiname, groesse: bytes.length, typ: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
           url: "data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64," + btoa(roh) };
}

/* Spotpreise als Excel: eine Mappe Strom, eine Mappe Erdgas, je mit Monatsmitteln, Werten und Quellen */
const r3 = (x) => Math.round(x * 1000) / 1000;
const mittelVon = ([s, n]) => (n ? Math.round((s / n) * 100) / 100 : "");
const datumDe = (dt) => String(dt.getDate()).padStart(2, "0") + "." + String(dt.getMonth() + 1).padStart(2, "0") + "." + dt.getFullYear();

function stromMappe(von, bis, strom) {
  const zeilen = [["Datum", "Wochentag", "von", "bis", "Zeit", "Auflösung", "€/MWh", "ct/kWh"]];
  const mon = new Map();
  strom.reihe.forEach((x, i) => {
    const n = strom.reihe[i + 1];
    const dauer = n && n.s - x.s <= 3600 ? n.s - x.s : i ? Math.min(3600, x.s - strom.reihe[i - 1].s) : 3600;
    const t = zeitTeile(x.s * 1000), e = zeitTeile((x.s + dauer) * 1000);
    const lt = t.datum.split(".").reverse().join("-");
    if (lt < von || lt > bis) return;
    zeilen.push([t.datum, t.tag, t.zeit, e.zeit, t.zone, dauer === 900 ? "15 Min" : "60 Min", r3(x.preis), r3(x.preis / 10)]);
    const k = t.j + "-" + String(t.m + 1).padStart(2, "0");
    if (!mon.has(k)) mon.set(k, { base: [0, 0], peak: [0, 0], off: [0, 0], min: null, max: null, neg: 0 });
    const mo = mon.get(k), g = dauer / 3600, pk = t.wt >= 1 && t.wt <= 5 && t.h >= 8 && t.h < 20;
    mo.base[0] += x.preis * g; mo.base[1] += g;
    (pk ? mo.peak : mo.off)[0] += x.preis * g; (pk ? mo.peak : mo.off)[1] += g;
    mo.min = mo.min == null ? x.preis : Math.min(mo.min, x.preis); mo.max = mo.max == null ? x.preis : Math.max(mo.max, x.preis);
    if (x.preis < 0) mo.neg += g;
  });
  const uebersicht = [["Monat", "Base €/MWh", "Peak €/MWh", "Offpeak €/MWh", "tiefster Preis €/MWh", "höchster Preis €/MWh", "Stunden mit negativem Preis"]];
  [...mon.entries()].sort((a, b) => a[0].localeCompare(b[0])).forEach(([k, v]) => {
    const [j, m] = k.split("-").map(Number);
    uebersicht.push([MONATSNAMEN_LANG[m - 1] + " " + j, mittelVon(v.base), mittelVon(v.peak), mittelVon(v.off), r3(v.min), r3(v.max), Math.round(v.neg * 100) / 100]);
  });
  return erzeugeXlsxMappe("Spotpreise_Strom_" + von + "_bis_" + bis + ".xlsx", [
    { name: "Monatsmittel", zeilen: uebersicht, breiten: [18, 13, 13, 14, 18, 18, 24] },
    { name: "Day-Ahead", zeilen, breiten: [12, 10, 8, 8, 8, 10, 10, 10] },
    { name: "Quellen", zeilen: [["Spotpreise Strom", ""], ["Zeitraum", datum(von) + " bis " + datum(bis)], ["Erstellt", datum(heute()) + " im EGC Vertriebsportal"],
      ["Markt", "Day-Ahead-Auktion, Gebotszone Deutschland-Luxemburg (DE-LU), €/MWh netto. Bis 30.09.2025 je Stunde, seit 01.10.2025 je Viertelstunde. Uhrzeiten in deutscher Zeit (MEZ/MESZ)."],
      ["Peak", "Montag bis Freitag 8 bis 20 Uhr; Offpeak alle übrigen Stunden. Monatsmittel zeitgewichtet."],
      ["Quelle", "Energy-Charts (Fraunhofer ISE), api.energy-charts.info" + (strom.lizenz ? " · " + strom.lizenz : "")],
      ["Hinweis", "Reine Energiepreise ohne Netzentgelte, Steuern, Abgaben, Umlagen und Aufschläge des Versorgers."]], breiten: [16, 110] },
  ]);
}

function gasMappe(von, bis, gas) {
  const zeilen = [["Gastag", "Wochentag", "von", "bis", "€/MWh", "ct/kWh"]];
  const mon = new Map();
  gas.forEach((x) => {
    const [j, m, d] = x.tag.split("-").map(Number);
    const t = new Date(j, m - 1, d), n = new Date(j, m - 1, d + 1);
    zeilen.push([datumDe(t), WOCHENTAG[t.getDay()], datumDe(t) + " 06:00", datumDe(n) + " 06:00", r3(x.preis), r3(x.preis / 10)]);
    const k = j + "-" + String(m).padStart(2, "0");
    if (!mon.has(k)) mon.set(k, { s: [0, 0], min: null, max: null });
    const mo = mon.get(k);
    mo.s[0] += x.preis; mo.s[1]++;
    mo.min = mo.min == null ? x.preis : Math.min(mo.min, x.preis); mo.max = mo.max == null ? x.preis : Math.max(mo.max, x.preis);
  });
  const uebersicht = [["Monat", "THE Day-Ahead €/MWh", "tiefster Preis €/MWh", "höchster Preis €/MWh", "Gastage"]];
  [...mon.entries()].sort((a, b) => a[0].localeCompare(b[0])).forEach(([k, v]) => {
    const [j, m] = k.split("-").map(Number);
    uebersicht.push([MONATSNAMEN_LANG[m - 1] + " " + j, mittelVon(v.s), r3(v.min), r3(v.max), v.s[1]]);
  });
  const letzter = gas.length ? gas[gas.length - 1].tag : bis;
  return erzeugeXlsxMappe("Spotpreise_Erdgas_" + von + "_bis_" + letzter + ".xlsx", [
    { name: "Monatsmittel", zeilen: uebersicht, breiten: [18, 20, 18, 18, 10] },
    { name: "Day-Ahead", zeilen, breiten: [12, 10, 18, 18, 10, 10] },
    { name: "Quellen", zeilen: [["Spotpreise Erdgas", ""], ["Zeitraum", datum(von) + " bis " + datum(letzter)], ["Erstellt", datum(heute()) + " im EGC Vertriebsportal"],
      ["Markt", "THE Day-Ahead, Marktgebiet Trading Hub Europe, je Gastag 06:00 bis 06:00 Uhr, €/MWh netto. Samstag und Sonntag tragen den Preis des Wochenendprodukts."],
      ["Quelle", "EEX Spot THE Day Ahead, nach der Übersicht von ENGIE Deutschland; im Portal ergänzbar. Börsendaten nur intern verwenden."],
      ["Hinweis", "Reine Energiepreise ohne Netzentgelte, Energiesteuer, CO2-Preis, Umlagen und Aufschläge des Versorgers."]], breiten: [16, 110] },
  ]);
}

/* Spotpreise herunterladen; Beschaffung und GF ergänzen Erdgaspreise per Datei */
function SpotpreiseKarte({ user }) {
  const [offen, setOffen] = useState(false);
  const [zeit, setZeit] = useState({ strom: { von: "2025-01-01", bis: heute() }, gas: { von: "2025-01-01", bis: heute() } });
  const [laedt, setLaedt] = useState({});
  const [meldung, setMeldung] = useState({});
  const [stand, setStand] = useState(null);
  const darfPflegen = ["Beschaffung", "Geschäftsführung"].includes(user.rolle);
  const setZ = (art, k) => (v) => setZeit((z) => ({ ...z, [art]: { ...z[art], [k]: v } }));
  const melde = (art, text, fehler) => setMeldung((m) => ({ ...m, [art]: text ? { text, fehler } : null }));
  const standLaden = async () => {
    try {
      const { data } = await sb.from("marktpreise").select("tag").eq("markt", "THE-DA").order("tag", { ascending: false }).limit(1);
      setStand(data && data[0] ? data[0].tag : "");
    } catch (e) { setStand(""); }
  };
  useEffect(() => { if (offen && stand == null) standLaden(); }, [offen]);
  const erstellen = async (art) => {
    const { von, bis } = zeit[art];
    melde(art, "");
    if (!von || !bis || bis < von) { melde(art, "Bitte einen gültigen Zeitraum wählen.", true); return; }
    const status = (t) => setLaedt((l) => ({ ...l, [art]: t }));
    try {
      let d, hinweis = "";
      if (art === "gas") {
        status("Erdgaspreise werden gelesen …");
        const gas = await gasSpotLaden(von, bis);
        if (!gas.length) throw new Error("Für diesen Zeitraum liegen keine Erdgaspreise vor.");
        if (gas[gas.length - 1].tag < bis) hinweis = "Erdgaspreise liegen bis " + datum(gas[gas.length - 1].tag) + " vor.";
        d = gasMappe(von, bis, gas);
      } else {
        const strom = await stromSpotLaden(von, bis, status);
        if (!strom.reihe.length) throw new Error("Für diesen Zeitraum liegen keine Strompreise vor.");
        hinweis = strom.hinweis;
        status("Excel-Datei wird erstellt …");
        await new Promise((ok) => setTimeout(ok, 30));
        d = stromMappe(von, bis, strom);
      }
      dateiLaden(d);
      melde(art, (hinweis ? hinweis + " " : "") + d.name + " wurde erstellt.", !!hinweis);
    } catch (e) { melde(art, (art === "gas" ? "" : "Strompreise nicht geladen: ") + (e.message || String(e)), true); }
    status("");
  };
  const ergaenzen = async (datei) => {
    if (!datei) return;
    melde("gas", ""); setLaedt((l) => ({ ...l, gas: "Erdgaspreise werden übernommen …" }));
    try {
      const s = await lastgangAuswerten(datei);
      const zeilen = [];
      s.werte.forEach((w, i) => {
        const t = zeitLesen(s.zeitpunkte[i]);
        if (t && w > 0 && w < 1000) zeilen.push({ markt: "THE-DA", tag: tagSchluessel(t), preis: Math.round(w * 1000) / 1000,
          quelle: "Datei " + datei.name + " · " + user.name, geaendert: new Date().toISOString() });
      });
      if (!zeilen.length) throw new Error("Keine Zeilen mit Datum und Preis gefunden.");
      for (let i = 0; i < zeilen.length; i += 500) {
        const { error } = await sb.from("marktpreise").upsert(zeilen.slice(i, i + 500), { onConflict: "markt,tag" });
        if (error) throw new Error(error.message);
      }
      setStand(null); standLaden();
      melde("gas", zeilen.length + " Erdgaspreise übernommen.");
    } catch (e) { melde("gas", "Übernahme nicht möglich: " + (e.message || e), true); }
    setLaedt((l) => ({ ...l, gas: "" }));
  };
  const Block = ({ art, titel, Icon, farbe, text, children }) => (
    <div className="rounded p-3 space-y-3" style={{ background: "#F6F8FA", border: "1px solid " + C.line }}>
      <div className="flex items-center gap-2 text-sm"><Icon size={15} style={{ color: farbe }} /> {titel}</div>
      <p className="text-xs" style={{ color: C.muted }}>{text}</p>
      <div className="grid grid-cols-2 gap-3 max-w-md">
        <Feld label="von" type="date" value={zeit[art].von} onChange={setZ(art, "von")} />
        <Feld label="bis" type="date" value={zeit[art].bis} onChange={setZ(art, "bis")} />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Btn icon={FileText} onClick={() => erstellen(art)} disabled={!!laedt[art]}>{"Excel " + titel.split(" ")[0]}</Btn>
        {laedt[art] && <span className="text-sm" style={{ color: C.muted }}>{laedt[art]}</span>}
      </div>
      {meldung[art] && <p className="text-sm" style={{ color: meldung[art].fehler ? C.warn : C.ok }}>{meldung[art].text}</p>}
      {children}
    </div>
  );
  return (
    <div className="rounded" style={{ background: C.card, border: "1px solid " + C.line }}>
      <button onClick={() => setOffen(!offen)} className="w-full text-left px-4 py-3 text-sm flex items-center gap-2">
        <BarChart3 size={15} style={{ color: C.strom }} />
        <span className="flex-1">Spotpreise abrufen: Strom und Erdgas</span>
        <ChevronRight size={15} style={{ color: C.muted, transform: offen ? "rotate(90deg)" : "none" }} />
      </button>
      {offen && (
        <div className="px-4 pb-4 space-y-3">
          {Block({ art: "strom", titel: "Strom Day-Ahead", Icon: Zap, farbe: C.strom,
            text: "Deutschland-Luxemburg je Viertelstunde (bis September 2025 je Stunde), mit Monatsmitteln Base, Peak und Offpeak. "
              + "Ab 01.01.2025 liegen die Preise fest im Portal (Stand " + datum(STROM_STAND) + "), neuere Tage holt das Portal von Energy-Charts dazu." })}
          {Block({ art: "gas", titel: "Erdgas THE Day-Ahead", Icon: Flame, farbe: C.gas,
            text: "Je Gastag von 6 bis 6 Uhr, mit Monatsmitteln" + (stand ? ". Vorhanden bis " + datum(stand) : "") + ".",
            children: darfPflegen && (
              <div className="pt-2" style={{ borderTop: "1px solid " + C.line }}>
                <Datei label="Neue Erdgaspreise ergänzen: Datei mit Datum und Preis in €/MWh (CSV oder Excel)" datei={null} onSet={ergaenzen}
                  hinweis="Datei auswählen" />
                <p className="text-xs mt-1" style={{ color: C.muted }}>Vorhandene Tage werden überschrieben, neue angefügt.</p>
              </div>
            ) })}
        </div>
      )}
    </div>
  );
}

/* Erdgas: Tagesmengen im Jahresverlauf und mittlere Woche */
function GasTagesGrafik({ reihe }) {
  if (!reihe || reihe.length < 7) return null;
  const B = 1100, H = 220, L = 52, R = 10, O = 14, U = 30, breite = B - L - R;
  const werte = reihe.map((x) => x[1]);
  const oben = Math.max(...werte, 1) * 1.08;
  const w = breite / reihe.length;
  const y = (v) => O + (H - O - U) * (1 - v / oben);
  const raster = [0, 0.25, 0.5, 0.75, 1].map((f) => (oben / 1.08) * f);
  const marken = [];
  reihe.forEach(([t], i) => { if (t.slice(8) === "01") marken.push({ i, text: MONATE_KURZ[+t.slice(5, 7) - 1] + (t.slice(5, 7) === "01" ? " " + t.slice(0, 4) : "") }); });
  const woche = [0, 0, 0, 0, 0, 0, 0].map(() => [0, 0]);
  reihe.forEach(([t, v]) => { const [j, m, d] = t.split("-").map(Number); const wt = (new Date(j, m - 1, d).getDay() + 6) % 7; woche[wt][0] += v; woche[wt][1]++; });
  const wm = woche.map(([s, n]) => (n ? s / n : 0)), wmax = Math.max(...wm, 1);
  return (
    <div className="mt-4 space-y-4">
      <div>
        <div className="text-xs mb-2" style={{ color: C.muted }}>Tagesmengen je Gastag (kWh)</div>
        <svg viewBox={"0 0 " + B + " " + H} className="w-full rounded" style={{ background: "#fff", border: "1px solid " + C.line }}>
          {raster.map((v, i) => (
            <g key={i}><line x1={L} x2={B - R} y1={y(v)} y2={y(v)} stroke="#E3E8EE" />
              <text x={L - 6} y={y(v) + 4} fontSize="11" textAnchor="end" fill="#6B7787">{num(v, 0)}</text></g>
          ))}
          {reihe.map(([t, v], i) => <rect key={t} x={L + i * w} y={y(v)} width={Math.max(0.6, w - 0.3)} height={y(0) - y(v)} fill={C.gas} />)}
          {marken.map(({ i, text }) => (
            <g key={i}><line x1={L + i * w} x2={L + i * w} y1={O} y2={H - U} stroke="#D8DDE4" strokeDasharray="2 3" />
              <text x={L + i * w + 3} y={H - 10} fontSize="11" fill="#6B7787">{text}</text></g>
          ))}
        </svg>
      </div>
      <div>
        <div className="text-xs mb-2" style={{ color: C.muted }}>Mittlere Tagesmenge je Wochentag (kWh)</div>
        <div className="flex items-end gap-2" style={{ height: 80 }}>
          {wm.map((v, i) => (
            <div key={i} className="flex-1 rounded-t" title={num(v) + " kWh"} style={{ height: Math.max(3, (v / wmax) * 80) + "px", background: C.gas }} />
          ))}
        </div>
        <div className="flex gap-2 text-xs mt-1" style={{ color: C.muted }}>
          {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((t) => <span key={t} className="flex-1 text-center">{t}</span>)}
        </div>
      </div>
    </div>
  );
}

/* Erdgas: Menge je Monat und Monatspreise des Lieferjahres */
function GasMonatsGrafik({ jahre }) {
  const [jahrIdx, setJahrIdx] = useState(0);
  const j = jahre[Math.min(jahrIdx, jahre.length - 1)];
  if (!j || !j.monatsMenge || !j.monatsPreis) return null;
  const B = 760, H = 240, L = 50, R = 50, O = 16, U = 30;
  const mMax = Math.max(...j.monatsMenge, 0.001) * 1.12;
  const pMin = Math.min(...j.monatsPreis) * 0.9, pMax = Math.max(...j.monatsPreis) * 1.06;
  const x = (m) => L + (m * (B - L - R)) / 12;
  const yM = (v) => O + (H - O - U) * (1 - v / mMax);
  const yP = (v) => O + (H - O - U) * (1 - (v - pMin) / ((pMax - pMin) || 1));
  const bw = (B - L - R) / 12;
  return (
    <div className="mt-5">
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <span className="text-xs" style={{ color: C.muted }}>Menge und Monatspreis</span>
        <span className="flex-1" />
        {jahre.length > 1 && jahre.map((x2, i) => (
          <button key={x2.jahr} onClick={() => setJahrIdx(i)} className="text-xs px-2 py-1 rounded"
            style={{ background: i === jahrIdx ? C.ink : "#fff", color: i === jahrIdx ? "#fff" : C.text, border: "1px solid " + C.line }}>{x2.jahr}</button>
        ))}
      </div>
      <svg viewBox={"0 0 " + B + " " + H} className="w-full rounded" style={{ background: "#fff", border: "1px solid " + C.line }}>
        {[0, 0.25, 0.5, 0.75, 1].map((f, i) => (
          <g key={i}><line x1={L} x2={B - R} y1={yM((mMax / 1.12) * f)} y2={yM((mMax / 1.12) * f)} stroke="#E3E8EE" />
            <text x={L - 6} y={yM((mMax / 1.12) * f) + 4} fontSize="11" textAnchor="end" fill="#6B7787">{num((mMax / 1.12) * f, 0)}</text></g>
        ))}
        {j.monatsMenge.map((v, m) => (
          <rect key={m} x={x(m) + 4} y={yM(v)} width={bw - 8} height={yM(0) - yM(v)} rx="2" fill={C.gas} opacity="0.85">
            <title>{MONATE_KURZ[m] + ": " + num(v, 0) + " MWh · " + num(j.monatsPreis[m], 2) + " €/MWh"}</title>
          </rect>
        ))}
        <path d={j.monatsPreis.map((p, m) => (m ? "L" : "M") + (x(m) + bw / 2) + "," + yP(p)).join(" ")} fill="none" stroke="#0A1626" strokeWidth="2.2" />
        {j.monatsPreis.map((p, m) => <circle key={m} cx={x(m) + bw / 2} cy={yP(p)} r="3" fill="#0A1626" />)}
        <line x1={L} x2={B - R} y1={yP(j.calPreis)} y2={yP(j.calPreis)} stroke="#6CB43B" strokeWidth="1.5" strokeDasharray="5 4" />
        {[pMin, (pMin + pMax) / 2, pMax].map((p, i) => (
          <text key={i} x={B - R + 6} y={yP(p) + 4} fontSize="11" fill="#6B7787">{num(p, 1)}</text>
        ))}
        {MONATE_KURZ.map((t, m) => <text key={t} x={x(m) + bw / 2} y={H - 10} fontSize="11" textAnchor="middle" fill="#6B7787">{t}</text>)}
        <text x={L - 6} y={O - 4} fontSize="11" textAnchor="end" fill="#6B7787">MWh</text>
        <text x={B - R + 6} y={O - 4} fontSize="11" fill="#6B7787">€/MWh</text>
      </svg>
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs mt-2" style={{ color: C.muted }}>
        <span className="inline-flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm" style={{ background: C.gas }} />Menge je Monat {j.jahr}</span>
        <span className="inline-flex items-center gap-1.5"><span className="inline-block w-4" style={{ borderTop: "2px solid #0A1626" }} />Monatspreis aus der Kurve</span>
        <span className="inline-flex items-center gap-1.5"><span className="inline-block w-4" style={{ borderTop: "2px dashed #6CB43B" }} />Cal {num(j.calPreis, 2)} €/MWh</span>
      </div>
      <p className="text-xs mt-1" style={{ color: C.muted }}>
        Viel Menge in den teuren Wintermonaten hebt den Preis über den Cal-Preis: Das ist der Saisonanteil.
      </p>
    </div>
  );
}

/* ---------- Bewertungsauftrag aus einem Vorgang ----------
   Abschrift der Kundendaten für die Beschaffung, ausdrücklich ohne Aufschlag,
   Preise und Provisionsangaben. Die Datenbank entfernt diese Felder zusätzlich. */
const BESCHAFFUNG_STATUS = {
  offen: { label: "Neu", color: C.strom },
  arbeit: { label: "In Bearbeitung", color: C.gas },
  fertig: { label: "Plan steht", color: C.ok },
};
const BESCHAFFUNG_ROLLEN_BEARBEITEN = ["Beschaffung", "Geschäftsführung", "Vertragsmanagement", "Leitung Vertrieb"];

const individuelleProdukte = (a) => {
  const g = gewaehlte(a);
  const p = g.length ? g.map((v) => v.produkt) : [a.produkt, a.produktGas];
  return [...new Set(p.filter((x) => INDIVIDUAL_PRODUKTE.includes(x)))];
};

/* Lieferzeitraum einer Variante: Beginn und Ende als ISO-Datum */
function lieferzeitraum(v, a) {
  const beginn = (v && v.lieferbeginn) || a.wunschLieferbeginn || "";
  let ende = (v && v.laufzeitArt === "ende" && v.lieferende) || (v && v.lieferende) || a.wunschLieferende || "";
  const monate = parseInt((v && v.laufzeit) || a.laufzeit) || 0;
  if (!ende && beginn && monate) {
    const d = new Date(beginn);
    d.setMonth(d.getMonth() + monate);
    d.setDate(d.getDate() - 1);
    ende = d.toISOString().slice(0, 10);
  }
  return { beginn, ende };
}

/* Sparten eines Bewertungsauftrags: Strom, Erdgas oder beide; ältere Aufträge sind Strom */
const SPARTE_NAME = { strom: "Strom", gas: "Erdgas" };
const spartenVon = (b) => (b && b.sparten && b.sparten.length ? b.sparten : ["strom"]);
const leeresJahr = (j, sparte) => (sparte === "gas"
  ? { jahr: j, menge: "", cal: "", sommer: "", winter: "", q: [{}, {}, {}, {}] }
  : { jahr: j, menge: "", base: "", peak: "", q: [{}, {}, {}, {}] });
const leereBewertung = (beginn, ende, sparte, mehr) => ({
  jahre: lieferjahreAus(beginn, ende).map((j) => leeresJahr(j, sparte)),
  marktStand: "", stress: "20", hoechstpreis: "", tranchen: [], quellen: [], ...(mehr || {}) });
/* Bewertung einer Sparte: Strom liegt in „bewertung“, Erdgas in „bewertungGas“ */
const bewertungVon = (b, sparte) => (sparte === "gas" ? b.bewertungGas : b.bewertung) || null;
/* schlechteste Ampel über alle Sparten, für Liste und Vorgang */
const ampelGesamt = (b) => {
  const st = spartenVon(b).map((sp) => ((bewertungVon(b, sp) || {}).ergebnis || {}).ampel).filter((x) => x != null);
  return st.length ? Math.max(...st) : null;
};

function lieferjahreAus(beginn, ende) {
  const j1 = parseInt(String(beginn).slice(0, 4)), j2 = parseInt(String(ende).slice(0, 4));
  if (!j1) return [new Date().getFullYear() + 1];
  const bis = j2 && j2 >= j1 ? Math.min(j2, j1 + 9) : j1;
  const raus = [];
  for (let j = j1; j <= bis; j++) raus.push(j);
  return raus;
}

function beschaffungsAuftragAus(a, user, hinweis, zustaendigId) {
  const g = gewaehlte(a);
  const v = (g.find((x) => INDIVIDUAL_PRODUKTE.includes(x.produkt)) || g[0]) || null;
  const { beginn, ende } = lieferzeitraum(v, a);
  const hatStrom = (a.lieferstellen || []).some((l) => l.medium !== "gas");
  const hatGas = (a.lieferstellen || []).some((l) => l.medium === "gas");
  let sparten = [];
  g.forEach((x) => {
    if (!INDIVIDUAL_PRODUKTE.includes(x.produkt)) return;
    if (x.sparte !== "gas" && hatStrom) sparten.push("strom");
    if (x.sparte !== "strom" && hatGas) sparten.push("gas");
  });
  if (!g.length) {
    if (INDIVIDUAL_PRODUKTE.includes(a.produkt) && hatStrom) sparten.push("strom");
    if (INDIVIDUAL_PRODUKTE.includes(a.produktGas || a.produkt) && hatGas) sparten.push("gas");
  }
  sparten = [...new Set(sparten)];
  if (!sparten.length) sparten = [hatGas && !hatStrom ? "gas" : "strom"];
  return {
    id: "B-" + a.id + "-" + uid(),
    sparten,
    anfrageId: a.id,
    partnerId: a.partnerId,
    partnerName: a.partnerName || "",
    status: "offen",
    uebergeben: { am: heute(), von: user.name, vonId: user.id, rolle: user.rolle, hinweis: hinweis || "" },
    zustaendigId: zustaendigId || "",
    kunde: { ...(a.kunde || {}) },
    lieferstellen: (a.lieferstellen || []).map((l) => ({
      id: l.id, medium: l.medium, bezeichnung: l.bezeichnung, strasse: l.strasse, plz: l.plz, ort: l.ort,
      versorger: l.versorger, zaehlernummer: l.zaehlernummer, maloId: l.maloId, verbrauch: l.verbrauch,
      zaehlerart: l.zaehlerart, lastgang: l.lastgang || null, abrechnung: l.abrechnung || null,
    })),
    produkte: individuelleProdukte(a),
    varianten: (g.length ? g : varianten(a)).map((x) => ({
      sparte: x.sparte, produkt: x.produkt, laufzeitArt: x.laufzeitArt, laufzeit: x.laufzeit,
      lieferbeginn: x.lieferbeginn || "", lieferende: x.lieferende || "", versorger: x.versorger || "",
    })),
    lieferbeginn: beginn, lieferende: ende,
    bewertung: leereBewertung(beginn, ende, "strom"),
    ...(sparten.includes("gas") ? { bewertungGas: leereBewertung(beginn, ende, "gas") } : {}),
    verlauf: [{ d: heute(), t: "An die Beschaffung übergeben", w: user.name }],
  };
}

/* ---------- Freier Auftrag: Kunde ist im Portal nicht angelegt ---------- */
/* Die Beschaffung plant auch Kunden ohne Vorgang: Kundendaten von Hand, Lastgang per Upload.
   Ein freier Auftrag hat keinen Vorgang und keinen Vertriebspartner (die Datenbank setzt frei: true). */
const FREI_LEER = { firma: "", ansprechpartner: "", strasse: "", plz: "", ort: "", telefon: "", email: "", branche: "",
  modell: "Tranchenmodell", lieferbeginn: "", lieferende: "", hinweis: "", lastgang: null, einheit: "kWh",
  sparten: ["strom"], lastgangGas: null, einheitGas: "kWh" };

/* Lieferjahre an einen neuen Lieferzeitraum anpassen; eingetragene Jahre bleiben erhalten */
function jahreAnpassen(jahre, beginn, ende, sparte) {
  return lieferjahreAus(beginn, ende).map((j) => (jahre || []).find((x) => +x.jahr === j) || leeresJahr(j, sparte));
}

function freierBeschaffungsAuftrag(user, f) {
  return {
    id: "B-FREI-" + uid(),
    frei: true,
    sparten: f.sparten && f.sparten.length ? f.sparten : ["strom"],
    status: "offen",
    uebergeben: { am: heute(), von: user.name, vonId: user.id, rolle: user.rolle, hinweis: f.hinweis || "" },
    zustaendigId: "",
    kunde: { firma: f.firma.trim(), ansprechpartner: f.ansprechpartner, strasse: f.strasse, plz: f.plz, ort: f.ort,
             telefon: f.telefon, email: f.email, branche: f.branche },
    lieferstellen: [],
    produkte: [f.modell],
    varianten: [],
    lieferbeginn: f.lieferbeginn, lieferende: f.lieferende,
    bewertung: leereBewertung(f.lieferbeginn, f.lieferende, "strom", { einheit: f.einheit || "kWh",
      eigeneLastgaenge: f.lastgang && f.sparten.includes("strom") ? [f.lastgang] : [],
      quellen: f.lastgang && f.sparten.includes("strom") ? ["eig-0"] : [] }),
    ...(f.sparten.includes("gas") ? { bewertungGas: leereBewertung(f.lieferbeginn, f.lieferende, "gas", { einheit: f.einheitGas || "kWh",
      eigeneLastgaenge: f.lastgangGas ? [f.lastgangGas] : [], quellen: f.lastgangGas ? ["eig-0"] : [] }) } : {}),
    verlauf: [{ d: heute(), t: "Ohne Vorgang angelegt (" + f.sparten.map((x) => SPARTE_NAME[x]).join(" und ") + ")"
      + ((f.lastgang && f.sparten.includes("strom")) || (f.lastgangGas && f.sparten.includes("gas")) ? ", Lastgang hochgeladen" : ""), w: user.name }],
  };
}

/* Formular für Kundendaten und Lieferzeitraum; mit „neu“ zusätzlich Lastgang und Hinweis */
function FreiKundeFormular({ start, neu, knopf, onSpeichern, onAbbrechen }) {
  const [f, setF] = useState({ ...FREI_LEER, ...(start || {}) });
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }));
  const zeitraumFalsch = f.lieferbeginn && f.lieferende && f.lieferende < f.lieferbeginn;
  const sp = f.sparten && f.sparten.length ? f.sparten : [];
  const ok = f.firma.trim() && f.lieferbeginn && f.lieferende && !zeitraumFalsch && sp.length > 0;
  const spWechsel = (x) => set("sparten")(sp.includes(x) ? sp.filter((y) => y !== x) : ["strom", "gas"].filter((y) => y === x || sp.includes(y)));
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Feld label="Firma / Kunde" value={f.firma} onChange={set("firma")} fehler={!f.firma.trim()} breit />
        <Feld label="Ansprechpartner" value={f.ansprechpartner} onChange={set("ansprechpartner")} />
        <Feld label="Branche" value={f.branche} onChange={set("branche")} />
        <Feld label="Straße und Hausnummer" value={f.strasse} onChange={set("strasse")} breit />
        <Feld label="PLZ" value={f.plz} onChange={set("plz")} />
        <Feld label="Ort" value={f.ort} onChange={set("ort")} />
        <Feld label="Telefon" value={f.telefon} onChange={set("telefon")} type="tel" />
        <Feld label="E-Mail" value={f.email} onChange={set("email")} type="email" />
        <Select label="Beschaffungsmodell" value={f.modell} onChange={set("modell")} options={INDIVIDUAL_PRODUKTE} breit />
        <Feld label="Lieferbeginn" value={f.lieferbeginn} onChange={set("lieferbeginn")} type="date" fehler={!f.lieferbeginn} />
        <Feld label="Lieferende" value={f.lieferende} onChange={set("lieferende")} type="date" fehler={!f.lieferende || zeitraumFalsch} />
      </div>
      {zeitraumFalsch && <p className="text-xs" style={{ color: C.warn }}>Das Lieferende liegt vor dem Lieferbeginn.</p>}
      <div>
        <span className="block text-xs mb-1" style={{ color: sp.length ? C.muted : C.warn }}>Sparten (eine oder beide)</span>
        <div className="flex gap-2">
          {[["strom", "Strom", Zap, C.strom], ["gas", "Erdgas", Flame, C.gas]].map(([id, t, Icon, farbe]) => (
            <button key={id} type="button" onClick={() => spWechsel(id)} className="px-3 py-2 text-sm rounded inline-flex items-center gap-2"
              style={{ border: "1px solid " + (sp.includes(id) ? farbe : C.line), background: sp.includes(id) ? farbe : "#fff", color: sp.includes(id) ? "#fff" : C.text }}>
              <Icon size={14} /> {t} {sp.includes(id) && <Check size={14} />}
            </button>
          ))}
        </div>
      </div>
      {neu && sp.includes("strom") && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Datei label="Lastgang Strom (CSV oder Excel)" datei={f.lastgang} onSet={set("lastgang")}
            hinweis="Lastgang auswählen" />
          <Select label="Werte in der Datei" value={f.einheit} onChange={set("einheit")}
            options={[{ value: "kWh", label: "Energie je Intervall (kWh)" }, { value: "kW", label: "Leistung (kW)" }]} />
        </div>
      )}
      {neu && sp.includes("gas") && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Datei label="Lastgang Erdgas (Stunden- oder Tageswerte, CSV oder Excel)" datei={f.lastgangGas} onSet={set("lastgangGas")}
            hinweis="Lastgang auswählen" />
          <Select label="Werte in der Datei" value={f.einheitGas} onChange={set("einheitGas")}
            options={[{ value: "kWh", label: "Energie je Intervall (kWh)" }, { value: "kW", label: "Leistung (kW)" }]} />
        </div>
      )}
      {neu && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block sm:col-span-2">
            <span className="block text-xs mb-1" style={{ color: C.muted }}>Notiz (optional)</span>
            <textarea value={f.hinweis} onChange={(e) => set("hinweis")(e.target.value)} rows={2}
              placeholder="z. B. Anfrage kam direkt, Kunde möchte vier Tranchen"
              className="w-full px-3 py-2 text-sm rounded outline-none" style={{ border: "1px solid " + C.line }} />
          </label>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Btn onClick={() => ok && onSpeichern(f)} disabled={!ok}>{knopf}</Btn>
        <Btn variante="neutral" onClick={onAbbrechen}>Abbrechen</Btn>
      </div>
    </div>
  );
}

/* ---------- Karte im Vorgang: übergeben und Stand ansehen ---------- */
function BeschaffungKarte({ a, user, mitarbeiter, beschaffung, setBeschaffung, onOeffnen }) {
  const [hinweis, setHinweis] = useState("");
  const [zustaendig, setZustaendig] = useState("");
  const echt = a._echterStatus !== undefined ? a._echterStatus : a.status;
  const auftraege = (beschaffung || []).filter((b) => b.anfrageId === a.id);
  const produkte = individuelleProdukte(a);
  const darfUebergeben = echt === "abgeschlossen" && (
    ["Geschäftsführung", "Vertragsmanagement", "Leitung Vertrieb"].includes(user.rolle)
    || (["Vertriebspartner", "Teamleiter"].includes(user.rolle) && istBeteiligt(a, user.id)));
  const darfOeffnen = BESCHAFFUNG_ROLLEN_BEARBEITEN.includes(user.rolle) || user.rolle === "Kalkulation";
  if (!auftraege.length && (!produkte.length || !darfUebergeben)) return null;
  const beschaffer = mitarbeiter.filter((m) => m.rolle === "Beschaffung" && m.status === "aktiv");

  const uebergeben = () => {
    const b = beschaffungsAuftragAus(a, user, hinweis, zustaendig);
    setBeschaffung((l) => [b, ...l]);
    setHinweis("");
  };

  return (
    <div className="rounded p-5" style={{ background: C.card, border: "1px solid " + C.line }}>
      <div className="flex items-center gap-2 mb-3">
        <Calculator size={15} style={{ color: C.strom }} />
        <span className="text-sm">Beschaffung</span>
        {produkte.length > 0 && <span className="text-xs" style={{ color: C.muted }}>{produkte.join(", ")}</span>}
      </div>
      {auftraege.map((b) => {
        const s = BESCHAFFUNG_STATUS[b.status] || BESCHAFFUNG_STATUS.offen;
        const z = mitarbeiter.find((m) => m.id === b.zustaendigId);
        const sp = spartenVon(b);
        return (
          <div key={b.id} className="mb-4 text-sm">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span style={{ color: s.color }}>● {s.label}</span>
              <span className="text-xs" style={{ color: C.muted }}>
                übergeben am {datum(b.uebergeben && b.uebergeben.am)} von {b.uebergeben && b.uebergeben.von}
                {z ? " · zuständig " + z.name : ""}
              </span>
            </div>
            {sp.map((x) => {
              const erg = (bewertungVon(b, x) || {}).ergebnis;
              if (!erg || !erg.jahre) return null;
              return (
                <div key={x} className="mt-3 space-y-1">
                  {sp.length > 1 && <div className="text-xs" style={{ color: x === "gas" ? C.gas : C.strom }}>{SPARTE_NAME[x]}</div>}
                  {erg.jahre.map((j) => (
                    <div key={j.jahr} className="flex flex-wrap justify-between gap-2 text-xs"
                      style={{ fontVariantNumeric: "tabular-nums" }}>
                      <span>Lieferjahr {j.jahr} · {num(j.menge, 0)} MWh</span>
                      <span>{num(j.gesichert * 100, 0)} % gesichert · aktuell {num(j.preis, 2)} €/MWh</span>
                    </div>
                  ))}
                  <p className="text-xs" style={{ color: C.muted }}>Energiepreis ohne Netz, Abgaben und Aufschläge; Stand der Marktpreise {datum(erg.marktStand)}.</p>
                </div>
              );
            })}
            {b.bewertung && b.bewertung.empfehlung && (
              <p className="text-xs mt-2 whitespace-pre-wrap">{b.bewertung.empfehlung}</p>
            )}
            {b.bewertung && (b.bewertung.plaene || []).length > 0 && (
              <div className="mt-3"><PlanFassungen plaene={b.bewertung.plaene} /></div>
            )}
            {darfOeffnen && (
              <button className="text-xs mt-2" style={{ color: C.strom }} onClick={() => onOeffnen(b.id)}>
                Bewertung öffnen
              </button>
            )}
          </div>
        );
      })}
      {darfUebergeben && !auftraege.length && (
        <div className="space-y-3">
          <p className="text-xs" style={{ color: C.muted }}>
            Die Beschaffung erhält Kunde, Lieferstellen, Lastgänge und Lieferzeitraum, keine Provision und keinen Aufschlag,
            und erstellt daraus den Beschaffungsplan für den Kunden.
          </p>
          {beschaffer.length > 1 && (
            <Select label="Zuständig" value={zustaendig} onChange={setZustaendig}
              options={[{ value: "", label: "ganze Beschaffung" }, ...beschaffer.map((m) => ({ value: m.id, label: m.name }))]} />
          )}
          <label className="block">
            <span className="block text-xs mb-1" style={{ color: C.muted }}>Hinweis an die Beschaffung (optional)</span>
            <textarea value={hinweis} onChange={(e) => setHinweis(e.target.value)} rows={3}
              placeholder="z. B. Kunde möchte vier Tranchen, Budgetgrenze 110 €/MWh"
              className="w-full px-3 py-2 text-sm rounded outline-none" style={{ border: "1px solid " + C.line }} />
          </label>
          <Btn icon={Send} onClick={uebergeben}>An Beschaffung übergeben</Btn>
        </div>
      )}
      {darfUebergeben && auftraege.length > 0 && (
        <button className="text-xs" style={{ color: C.muted }} onClick={uebergeben}>weiteren Auftrag übergeben</button>
      )}
    </div>
  );
}

/* ---------- Lastgänge einlesen (mehrere Lieferstellen werden addiert) ---------- */
async function lastformAusDateien(dateien, einheit, land = "") {
  const formen = [];
  const info = { gesamt: 0, jahresmenge: 0, spitze: 0, stunden: 0, ohneDatum: 0, dateien: [], grafiken: [] };
  for (const d of dateien) {
    const stand = await lastgangAuswerten(d);
    const faktor = einheit === "kW" ? 1 / stand.proStunde : 1;
    const werte = stand.werte.map((w) => w * faktor);
    const form = lastform(werte, stand.zeitpunkte, stand.proStunde, zeitLesen, land);
    formen.push(form);
    info.gesamt += form.gesamt; info.jahresmenge += form.jahresmenge;
    info.spitze += stand.spitze * faktor; info.stunden = Math.max(info.stunden, form.stunden);
    info.ohneDatum += form.ohneDatum;
    info.dateien.push(d.name);
    /* Grafiken aus den umgerechneten Werten: bei Leistungswerten (kW) sonst viermal zu hoch */
    let bilder = null;
    try { bilder = stand.verlaeufe ? lastgangGrafiken({ ...stand, verlaeufe: lastgangVerlaeufe(werte, stand.zeitpunkte, stand.proStunde) }) : null; } catch (_) { bilder = null; }
    info.grafiken.push({ name: d.name, bilder, profil: stand.profil.map((x) => x * faktor), einheit: einheit === "kW" ? "kW" : "kWh" });
  }
  /* Viertelstunden nur, wenn alle Lastgänge Viertelstunden haben */
  const viertel = formen.every((f) => f.proTag === 96);
  const fs = viertel ? formen : formen.map(formAufStunden);
  const summe = fs[0].mittel.map((mo) => mo.map((ar) => ar.slice()));
  fs.slice(1).forEach((f) => f.mittel.forEach((mo, m) => mo.forEach((ar, x) => ar.forEach((v, q) => { summe[m][x][q] += v; }))));
  /* tatsächliche Werte je Zeitschritt addieren (für die Ausgleichsenergie) */
  const ist = new Map();
  fs.forEach((f) => f.ist.forEach((x) => { const a = ist.get(x.t); if (a) a.kwh += x.kwh; else ist.set(x.t, { ...x }); }));
  info.proTag = viertel ? 96 : 24;
  return { mittel: summe, jahresmenge: info.jahresmenge, proTag: info.proTag, land, ist: [...ist.values()].sort((a, b) => a.t - b.t), info };
}

/* Day-Ahead-Preise: Datei (CSV/Excel mit Zeit und Preis) oder Energy-Charts im Browser */
async function preisreiheAusDatei(d) {
  const stand = await lastgangAuswerten(d);
  return stundenmittel(stand.werte.map((w, i) => ({ t: zeitLesen(stand.zeitpunkte[i]), preis: w })));
}
async function preisreiheEnergyCharts(jahr) {
  const r = await fetch("https://api.energy-charts.info/price?bzn=DE-LU&start=" + jahr + "-01-01&end=" + jahr + "-12-31");
  if (!r.ok) throw new Error("Energy-Charts antwortet nicht (" + r.status + ").");
  const j = await r.json();
  if (!j || !Array.isArray(j.unix_seconds) || !j.unix_seconds.length) throw new Error("Keine Preise erhalten.");
  return stundenmittel(j.unix_seconds.map((s, i) => ({ t: new Date(s * 1000), preis: +j.price[i] })));
}
function stundenmittel(reihe) {
  const m = new Map();
  reihe.forEach(({ t, preis }) => {
    if (!t || !isFinite(preis)) return;
    const k = new Date(t.getFullYear(), t.getMonth(), t.getDate(), t.getHours());
    const s = k.getTime(), alt = m.get(s);
    if (alt) { alt.summe += preis; alt.n++; } else m.set(s, { t: k, summe: preis, n: 1 });
  });
  return [...m.values()].map((x) => ({ t: x.t, preis: x.summe / x.n }));
}

const rundeTief = (x) => (Array.isArray(x) ? x.map(rundeTief) : Math.round(x * 1000) / 1000);
const zahlOder = (v) => { const z = zahlLesen(v); return isNaN(z) ? null : z; };

/* ---------- Ansicht der Beschaffung ---------- */
function Beschaffung({ auftraege, setAuftraege, user, mitarbeiter, start, onStart }) {
  const [offenId, setOffenId] = useState(start || null);
  const [filter, setFilter] = useState("aktiv");
  const [neu, setNeu] = useState(false);
  useEffect(() => { if (start) { setOffenId(start); onStart && onStart(null); } }, [start]);
  const darfFrei = BESCHAFFUNG_ROLLEN_BEARBEITEN.includes(user.rolle);

  const meine = user.rolle === "Beschaffung"
    ? auftraege.filter((b) => !b.zustaendigId || b.zustaendigId === user.id) : auftraege;
  const offen = auftraege.find((b) => b.id === offenId);
  const aendern = (b) => setAuftraege((l) => l.map((x) => (x.id === b.id ? b : x)));

  if (offen)
    return <BeschaffungDetail b={offen} user={user} mitarbeiter={mitarbeiter} onAendern={aendern}
              onZurueck={() => setOffenId(null)}
              onLoeschen={["Geschäftsführung", "Vertragsmanagement"].includes(user.rolle) || (offen.frei && darfFrei)
                ? () => { setAuftraege((l) => l.filter((x) => x.id !== offen.id)); setOffenId(null); } : null} />;

  if (neu)
    return (
      <div className="space-y-4">
        <div>
          <button onClick={() => setNeu(false)} className="text-xs mb-2 inline-flex items-center gap-1" style={{ color: C.muted }}>
            <ArrowLeft size={13} /> Bewertungsaufträge
          </button>
          <h2 className="text-lg">Kunde ohne Vorgang planen</h2>
          <p className="text-sm" style={{ color: C.muted }}>
            Für Kunden, die im Portal nicht angelegt sind: Kundendaten eintragen und den Lastgang hochladen.
            Danach geht es wie bei jedem Auftrag weiter mit Marktpreisen, Bewertung und Tranchenplan.
          </p>
        </div>
        <div className="rounded p-4 sm:p-5" style={{ background: C.card, border: "1px solid " + C.line }}>
          <FreiKundeFormular neu knopf="Auftrag anlegen" onAbbrechen={() => setNeu(false)}
            onSpeichern={(f) => { const b = freierBeschaffungsAuftrag(user, f);
              setAuftraege((l) => [b, ...l]); setNeu(false); setOffenId(b.id); }} />
        </div>
      </div>
    );

  const liste = meine.filter((b) => filter === "alle" ? true : filter === "fertig" ? b.status === "fertig" : b.status !== "fertig")
    .sort((x, y) => String((y.uebergeben || {}).am || "").localeCompare(String((x.uebergeben || {}).am || "")));

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg">Bewertungsaufträge</h2>
        <p className="text-sm" style={{ color: C.muted }}>
          Kunden mit Tranchen- oder PPA-Modell: Lastgang bewerten und den Beschaffungsplan für den Kunden erstellen.
        </p>
      </div>
      {darfFrei && (
        <div><Btn icon={Plus} onClick={() => setNeu(true)}>Kunde ohne Vorgang planen</Btn></div>
      )}
      <SpotpreiseKarte user={user} />
      <div className="flex gap-2 text-sm">
        {[["aktiv", "Offen"], ["fertig", "Plan steht"], ["alle", "Alle"]].map(([id, t]) => (
          <button key={id} onClick={() => setFilter(id)} className="px-3 py-1.5 rounded"
            style={{ background: filter === id ? C.ink : "#fff", color: filter === id ? "#fff" : C.text, border: "1px solid " + C.line }}>
            {t}
          </button>
        ))}
      </div>
      {liste.length === 0 ? (
        <p className="text-sm" style={{ color: C.muted }}>Keine Aufträge in dieser Auswahl.</p>
      ) : (
        <div className="rounded overflow-hidden" style={{ background: C.card, border: "1px solid " + C.line }}>
          {liste.map((b, i) => {
            const s = BESCHAFFUNG_STATUS[b.status] || BESCHAFFUNG_STATUS.offen;
            const st = ampelGesamt(b);
            return (
              <button key={b.id} onClick={() => setOffenId(b.id)} className="w-full text-left px-4 py-3 text-sm flex items-center gap-3"
                style={{ borderTop: i ? "1px solid " + C.line : "none" }}>
                {st != null && <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: AMPEL_FARBE[st] }} />}
                <div className="flex-1 min-w-0">
                  <div className="truncate">{(b.kunde || {}).firma || b.anfrageId}</div>
                  <div className="text-xs truncate" style={{ color: C.muted }}>
                    {spartenVon(b).map((x) => SPARTE_NAME[x]).join(" und ")} · {(b.produkte || []).join(", ") || "Beschaffungsplan"} · Lieferung ab {datum(b.lieferbeginn)} · {b.frei ? "ohne Vorgang" : b.partnerName}
                  </div>
                </div>
                <span className="text-xs whitespace-nowrap" style={{ color: s.color }}>{s.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

const AMPEL_FARBE = ["#4A9130", "#D9A21B", "#B24328"];
const AMPEL_TEXT = ["Im Plan", "Beobachten", "Handlungsbedarf"];

/* Analyse wie im Excel-Werkzeug: Stundenlast des Lieferjahres, geschlossene Positionen
   (gekaufte Tranchen), offene Short- und Long-Mengen mit Marktwert. Rechnet aus dem
   eingelesenen Lastgang und den eingetragenen Preisen, nichts davon wird gespeichert. */
const MONATSNAMEN_LANG = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
function analyseJahr(form, bw, jahr, spot) {
  const j = (bw.jahre || []).find((x) => +x.jahr === +jahr);
  if (!form || !j) return null;
  const menge = zahlOder(j.menge) || form.jahresmenge;
  const last = jahresLast(form, jahr, menge);
  const opt = { land: form.land || "", proTag: form.proTag || 24 };
  const kurve = bw.preisbasis === "spot"
    ? (spot ? { preis: preiseAufJahr(spot, jahr, opt.land, opt.proTag).preis } : null)
    : preiskurve(jahr, preiseStromAus(j), bw.profil || null, opt);
  if (!kurve) return null;
  const e = jahresBewertung(last, kurve, bw.preisbasis === "spot" ? { ...hedgeVon(bw.hedge), prozent: "0" } : bw.hedge);
  /* geschlossene Leistung: Anteil gekaufter Tranchen an der Base- und Peakleistung der Absicherung */
  const z = (v) => +String(v || "").replace(",", ".") || 0;
  const gekauft = (bw.tranchen || []).filter((t) => +t.jahr === +jahr && t.status === "gekauft");
  let anteil = 0, wertBaseProMWh = 0, wertPeakProMWh = 0;
  gekauft.forEach((t) => {
    const a = Math.max(0, z(t.anteil)) / 100;
    const pb = z(t.preisBase) || z(t.preis), pp = z(t.preisPeak) || z(t.preis);
    anteil += a; wertBaseProMWh += a * pb; wertPeakProMWh += a * pp;
  });
  anteil = Math.min(1, anteil);
  const dt = last.dt;
  const zu = last.stunden.map((s, i) => anteil * (e.hb[i] + e.hp[i]) * dt);
  /* Preis je Zeitschritt der geschlossenen Menge: Base-Anteil zum Basepreis, Peak-Anteil zum Peakpreis */
  const preisZu = last.stunden.map((s, i) => {
    const mw = e.hb[i] + e.hp[i];
    return mw && anteil ? (e.hb[i] * wertBaseProMWh + e.hp[i] * (s.peak ? wertPeakProMWh : wertBaseProMWh)) / (anteil * mw) : 0;
  });
  return { j, e, stunden: last.stunden, last: last.last, preis: kurve.preis, zu, preisZu, anteil, dt, proTag: opt.proTag };
}

function analyseSumme(a, passt) {
  let last = 0, lastWert = 0, zu = 0, zuWert = 0, short = 0, shortWert = 0, long = 0, longWert = 0, base = 0, n = 0;
  a.stunden.forEach((s, i) => {
    if (!passt(s)) return;
    const L = a.last[i], Z = a.zu[i], P = a.preis[i];
    last += L; lastWert += L * P; zu += Z; zuWert += Z * a.preisZu[i];
    if (L > Z) { short += L - Z; shortWert += (L - Z) * P; } else { long += Z - L; longWert += (Z - L) * P; }
    if (!s.peak) base += L; n++;
  });
  return { last, lastWert, zu, zuWert, short, shortWert, long, longWert, n };
}

function AnalyseGrafik({ form, bw, gas, spot, spotStand }) {
  const jahre = (bw.jahre || []).map((j) => j.jahr);
  const [jahr, setJahr] = useState(jahre[0]);
  /* Zeitraum: ganzes Jahr, ein Quartal, ein Monat oder ein Tag */
  const [ansicht, setAnsicht] = useState("jahr");
  const [quartal, setQuartal] = useState(0);
  const [monat, setMonat] = useState(0);
  const [tag, setTag] = useState(1);
  const a = useMemo(() => { try { return gas ? analyseJahrGas(form, bw, jahr) : analyseJahr(form, bw, jahr, spot); } catch (_) { return null; } },
    [form, jahr, JSON.stringify(bw.jahre), JSON.stringify(bw.tranchen), bw.profil ? 1 : 0, gas, JSON.stringify(bw.hedge || {}), bw.preisbasis, spotStand]);
  if (!form) return <p className="text-sm" style={{ color: C.muted }}>Zuerst den Lastgang einlesen.</p>;
  if (!a) return <p className="text-sm" style={{ color: C.muted }}>{gas ? "Für " + jahr + " fehlt der Cal-Preis."
    : bw.preisbasis === "spot" ? "Für die Spotbewertung zuerst „Bewerten“ tippen, damit die Spot-PFC geladen ist." : "Für " + jahr + " fehlen Base- und Peakpreis."}</p>;
  const dt = a.dt || 1;   /* Stunden je Zeitschritt: Energie ÷ dt = Leistung */
  const tageImMonat = new Date(jahr, monat + 1, 0).getDate();
  const tagOk = Math.min(tag, tageImMonat);
  const passt = (x) => ansicht === "jahr" ? true : ansicht === "quartal" ? Math.floor(x.m / 3) === quartal
    : ansicht === "monat" ? x.m === monat : x.m === monat && x.t === tagOk;
  const s = analyseSumme(a, passt);
  const idx = a.stunden.map((x, i) => i).filter((i) => passt(a.stunden[i]));
  /* vor und zurück im gewählten Raster */
  const schritt = (r) => {
    if (ansicht === "quartal") setQuartal((quartal + r + 4) % 4);
    else if (ansicht === "monat") setMonat((monat + r + 12) % 12);
    else if (ansicht === "tag") {
      const d = new Date(jahr, monat, tagOk + r);
      if (d.getFullYear() !== jahr) return;
      setMonat(d.getMonth()); setTag(d.getDate());
    }
  };
  const titel = ansicht === "jahr" ? "Jahr " + jahr : ansicht === "quartal" ? "Q" + (quartal + 1) + " " + jahr
    : ansicht === "monat" ? MONATSNAMEN_LANG[monat] + " " + jahr
    : new Date(jahr, monat, tagOk).toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" });

  /* Zeichnung: je Bildpunktspalte Höchst- und Mittelwerte, damit 8.760 Stunden scharf bleiben */
  const B = 1100, H = 300, L = 52, R = 10, O = 14, U = 36, breite = B - L - R;
  const spalten = Math.min(idx.length, breite);
  const proSpalte = idx.length / spalten;
  const col = Array.from({ length: spalten }, (_, c) => {
    const ab = Math.floor(c * proSpalte), bis2 = Math.max(ab + 1, Math.floor((c + 1) * proSpalte));
    let lmax = 0, zmin = Infinity, zmax = 0, lmin = Infinity;
    for (let k = ab; k < bis2; k++) { const i = idx[k]; lmax = Math.max(lmax, a.last[i] / dt); lmin = Math.min(lmin, a.last[i] / dt);
      zmin = Math.min(zmin, a.zu[i] / dt); zmax = Math.max(zmax, a.zu[i] / dt); }
    return { lmax, lmin, zmin: isFinite(zmin) ? zmin : 0, zmax };
  });
  const oben = Math.max(...col.map((c) => Math.max(c.lmax, c.zmax)), 0.001) * 1.08;
  const x = (c) => L + (c * breite) / spalten;
  const y = (v) => O + (H - O - U) * (1 - v / oben);
  const w = breite / spalten;
  const raster = [0, 0.2, 0.4, 0.6, 0.8, 1].map((f) => (oben / 1.08) * f);
  /* Teilstriche: Monate (Jahr, Quartal), Tage (Monat), Stunden (Tag) */
  const marken = [];
  idx.forEach((i, k) => {
    const st = a.stunden[i], vor = k ? a.stunden[idx[k - 1]] : null;
    if (ansicht === "jahr" || ansicht === "quartal") { if (!vor || st.m !== vor.m) marken.push({ k, text: MONATE_KURZ[st.m] }); }
    else if (ansicht === "monat") { if ((!vor || st.t !== vor.t) && (st.t === 1 || st.t % 5 === 0)) marken.push({ k, text: st.t + "." }); }
    else if (st.h % 3 === 0 && (st.q == null || st.q % ((a.proTag || 24) / 24) === 0)) marken.push({ k, text: String(st.h).padStart(2, "0") + ":00" });
  });
  const pr = (wert, menge) => (menge ? wert / menge : 0);
  const zeile = (t, menge, wert, farbe, hell) => (
    <tr key={t} style={{ background: farbe, color: hell ? "#fff" : C.text }}>
      <td className="px-3 py-1.5">{t}</td>
      <td className="px-3 py-1.5 text-right">{num(menge, 2)}</td>
      <td className="px-3 py-1.5 text-right">{wert == null ? "" : num(wert, 0)}</td>
      <td className="px-3 py-1.5 text-right">{wert == null ? "" : num(pr(wert, menge), 2)}</td>
    </tr>
  );
  const sel = "px-2 py-1.5 text-sm rounded outline-none bg-white";
  return (
    <div>
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <label className="block"><span className="block text-xs mb-1" style={{ color: C.muted }}>Lieferjahr</span>
          <select value={jahr} onChange={(e) => setJahr(+e.target.value)} className={sel} style={{ border: "1px solid " + C.line }}>
            {jahre.map((j) => <option key={j} value={j}>{j}</option>)}</select></label>
        <div className="flex rounded overflow-hidden" style={{ border: "1px solid " + C.line }}>
          {[["jahr", "Jahr"], ["quartal", "Quartal"], ["monat", "Monat"], ["tag", "Tag"]].filter(([id]) => !gas || id !== "tag").map(([id, t]) => (
            <button key={id} onClick={() => setAnsicht(id)} className="px-3 py-1.5 text-sm"
              style={{ background: ansicht === id ? C.ink : "#fff", color: ansicht === id ? "#fff" : C.text }}>{t}</button>
          ))}
        </div>
        {ansicht === "quartal" && (
          <select value={quartal} onChange={(e) => setQuartal(+e.target.value)} className={sel} style={{ border: "1px solid " + C.line }}>
            {[0, 1, 2, 3].map((q) => <option key={q} value={q}>Q{q + 1}</option>)}</select>
        )}
        {(ansicht === "monat" || ansicht === "tag") && (
          <select value={monat} onChange={(e) => setMonat(+e.target.value)} className={sel} style={{ border: "1px solid " + C.line }}>
            {MONATSNAMEN_LANG.map((m, i) => <option key={m} value={i}>{m}</option>)}</select>
        )}
        {ansicht === "tag" && (
          <select value={tagOk} onChange={(e) => setTag(+e.target.value)} className={sel} style={{ border: "1px solid " + C.line }}>
            {Array.from({ length: tageImMonat }, (_, i) => <option key={i} value={i + 1}>{i + 1}.</option>)}</select>
        )}
        {ansicht !== "jahr" && (
          <div className="flex gap-1">
            <button onClick={() => schritt(-1)} className="px-2.5 py-1.5 text-sm rounded" style={{ border: "1px solid " + C.line, background: "#fff" }}>‹</button>
            <button onClick={() => schritt(1)} className="px-2.5 py-1.5 text-sm rounded" style={{ border: "1px solid " + C.line, background: "#fff" }}>›</button>
          </div>
        )}
        {!gas && <span className="text-xs pb-2" style={{ color: C.muted }}>
          Base/Peak-Verhältnis {num(a.e.gewichtBase * 100, 1)} % / {num((1 - a.e.gewichtBase) * 100, 1)} %
        </span>}
      </div>

      <div className="text-sm mb-2">{titel}</div>
      <div className="overflow-x-auto mb-4">
        <table className="text-sm min-w-[520px]" style={{ fontVariantNumeric: "tabular-nums" }}>
          <thead><tr className="text-xs" style={{ color: C.muted }}>
            <th className="px-3 py-1 font-normal text-left" /><th className="px-3 py-1 font-normal text-right">Menge MWh</th>
            <th className="px-3 py-1 font-normal text-right">Wert €</th><th className="px-3 py-1 font-normal text-right">Preis €/MWh</th></tr></thead>
          <tbody>
            {zeile("Last (Marktwert)", s.last, s.lastWert, "#B24328", true)}
            {zeile("Geschlossen (Tranchen)", s.zu, s.zuWert, "#4A9130", true)}
            <tr style={{ background: "#E9EDF2" }}><td className="px-3 py-1.5">Abdeckung</td>
              <td className="px-3 py-1.5 text-right">{num(s.last ? (s.zu / s.last) * 100 : 0, 1)} %</td><td /><td /></tr>
            {zeile("Offen, nachzukaufen (Short)", s.short, s.shortWert, "#0A1626", true)}
            {zeile("Überdeckt, zu verkaufen (Long)", s.long, -s.longWert, "#18293F", true)}
          </tbody>
        </table>
      </div>

      <svg viewBox={"0 0 " + B + " " + H} className="w-full rounded" style={{ background: "#fff", border: "1px solid " + C.line }}>
        {raster.map((v, i) => (
          <g key={i}><line x1={L} x2={B - R} y1={y(v)} y2={y(v)} stroke="#E3E8EE" />
            <text x={L - 6} y={y(v) + 4} fontSize="11" textAnchor="end" fill="#6B7787">{num(v, oben < 0.12 ? 3 : 2)}</text></g>
        ))}
        {col.map((c, k) => (
          <g key={k}>
            {/* geschlossen und verbraucht */}
            <rect x={x(k)} y={y(Math.min(c.zmax, c.lmin))} width={w + 0.4} height={y(0) - y(Math.min(c.zmax, c.lmin))} fill="#6CB43B" />
            {/* geschlossen, aber nicht verbraucht: überdeckt (Long) */}
            {c.zmax > c.lmin && <rect x={x(k)} y={y(c.zmax)} width={w + 0.4} height={y(c.lmin) - y(c.zmax)} fill="#6CB43B" opacity="0.35" />}
            {/* Last über den geschlossenen Positionen: offen (Short) */}
            {c.lmax > c.zmax && <rect x={x(k)} y={y(c.lmax)} width={w + 0.4} height={y(c.zmax) - y(c.lmax)} fill="#C0392B" />}
          </g>
        ))}
        {/* Lastlinie, sobald einzelne Stunden sichtbar sind */}
        {proSpalte <= 1.5 && (
          <path d={col.map((c, k) => (k ? "L" : "M") + x(k) + "," + y(c.lmax) + " L" + (x(k) + w) + "," + y(c.lmax)).join(" ")}
            fill="none" stroke="#0A1626" strokeWidth="1.8" />
        )}
        {marken.map(({ k, text }) => {
          const xm = L + (k * breite) / idx.length;
          return (
            <g key={k}><line x1={xm} x2={xm} y1={O} y2={H - U} stroke="#D8DDE4" strokeDasharray="2 3" />
              <text x={xm + 4} y={H - U + 16} fontSize="11" fill="#6B7787">{text}</text></g>
          );
        })}
        <text x={L - 6} y={H - 6} fontSize="11" textAnchor="end" fill="#6B7787">{gas ? "MWh/d" : "MW"}</text>
      </svg>
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs mt-2" style={{ color: C.muted }}>
        <span className="inline-flex items-center gap-1.5"><span className="inline-block w-3 h-3" style={{ background: "#6CB43B" }} />geschlossen und verbraucht</span>
        <span className="inline-flex items-center gap-1.5"><span className="inline-block w-3 h-3" style={{ background: "#6CB43B", opacity: 0.35 }} />geschlossen, nicht verbraucht (Long)</span>
        <span className="inline-flex items-center gap-1.5"><span className="inline-block w-3 h-3" style={{ background: "#C0392B" }} />Last über den Tranchen, offen (Short)</span>
        <span className="inline-flex items-center gap-1.5"><span className="inline-block w-4" style={{ borderTop: "2px solid #0A1626" }} />{gas ? "Tagesmenge (in Quartals- und Monatsansicht)" : "Last (in Monats- und Tagesansicht)"}</span>
        {!gas && a.proTag === 96 && <span>Tagesansicht in Viertelstunden</span>}
      </div>
      <p className="text-xs mt-1" style={{ color: C.muted }}>
        {gas ? "Tagesmengen je Gastag, aus dem Lastgang auf die Jahresmenge hochgerechnet; geschlossen ist der gekaufte Anteil der Monatsbänder. Marktwerte zur heutigen Preiskurve; "
          : (a.proTag === 96 ? "Viertelstundenwerte" : "Stundenwerte") + " des Lieferjahres (Leistung in MW), aus dem Lastgang auf die Jahresmenge hochgerechnet. In der Jahresansicht ist je Bildpunkt der höchste und niedrigste Wert gezeichnet. Marktwerte zur heutigen Preiskurve; "}
        die Long-Menge ist als Erlös negativ ausgewiesen.
      </p>
    </div>
  );
}

/* Abgelegte Beschaffungspläne: neueste Fassung oben, ältere aufklappbar */
function PlanFassungen({ plaene }) {
  const [alle, setAlle] = useState(false);
  const liste = [...(plaene || [])].reverse();
  if (!liste.length) return null;
  const zeile = (pl) => (
    <div key={pl.fassung}>
      <DateiChip datei={pl.datei} label={"Fassung " + pl.fassung} />
      <div className="text-xs mt-1" style={{ color: C.muted }}>
        {datum(pl.am)} · {pl.von}{pl.marktStand ? " · Marktpreise vom " + datum(pl.marktStand) : ""}
      </div>
    </div>
  );
  return (
    <div className="space-y-3">
      {zeile(liste[0])}
      {liste.length > 1 && (
        <button className="text-xs" style={{ color: C.strom }} onClick={() => setAlle(!alle)}>
          {alle ? "ältere Fassungen ausblenden" : "ältere Fassungen (" + (liste.length - 1) + ")"}
        </button>
      )}
      {alle && liste.slice(1).map(zeile)}
    </div>
  );
}

/* Monatsmengen als Balken */
function MonatsBalken({ profil, einheit, farbe }) {
  if (!profil || !profil.length) return null;
  const max = Math.max(...profil, 1);
  const namen = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
  return (
    <div>
      <div className="text-xs mb-2" style={{ color: C.muted }}>Verbrauch je Monat{einheit === "kW" ? " (aus Leistungswerten)" : " (kWh)"}</div>
      <div className="flex items-end gap-1" style={{ height: 90 }}>
        {profil.map((w, i) => (
          <div key={i} className="flex-1 rounded-t" title={namen[i] + ": " + num(w) + " kWh"}
            style={{ height: Math.max(3, (w / max) * 90) + "px", background: farbe || C.strom }} />
        ))}
      </div>
      <div className="flex gap-1 text-xs mt-1" style={{ color: C.muted }}>
        {namen.map((m) => <span key={m} className="flex-1 text-center">{m}</span>)}
      </div>
    </div>
  );
}

/* Typischer Tag des Lieferjahres (MW je Stunde) mit der Base/Peak-Absicherung */
function AbsicherungsGrafik({ jahre, hedge }) {
  const [jahrIdx, setJahrIdx] = useState(0);
  const [art, setArt] = useState(0);
  const j = jahre[Math.min(jahrIdx, jahre.length - 1)];
  const werte = (j.tagesprofil || [])[art] || [];
  if (!werte.length) return null;
  const B = 760, H = 230, L = 46, R = 12, O = 16, U = 30;
  const n = werte.length, proH = n / 24;   /* 24 Stunden oder 96 Viertelstunden */
  const oben = Math.max(...werte, j.baseMW + Math.max(j.peakMW, j.offpeakMW || 0), 0.001) * 1.12;
  const x = (h) => L + (h * (B - L - R)) / 24;
  const y = (v) => O + (H - O - U) * (1 - v / oben);
  const peakTag = art === 0; /* Peak gilt Montag bis Freitag 8 bis 20 Uhr */
  const absich = (h) => j.baseMW + (peakTag && h >= 8 && h < 20 ? j.peakMW : j.offpeakMW || 0);
  const stufen = Array.from({ length: 24 }, (_, h) => "L" + x(h) + "," + y(absich(h)) + " L" + x(h + 1) + "," + y(absich(h))).join(" ");
  const hg = hedgeVon(hedge);
  const mehrere = hg.produkt !== "cal";
  const raster = [0, 0.25, 0.5, 0.75, 1].map((f) => (oben / 1.12) * f);
  const Knopf = ({ an, onClick, children }) => (
    <button onClick={onClick} className="text-xs px-2 py-1 rounded"
      style={{ background: an ? C.ink : "#fff", color: an ? "#fff" : C.text, border: "1px solid " + C.line }}>{children}</button>
  );
  return (
    <div className="mt-5">
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <span className="text-xs" style={{ color: C.muted }}>Typischer Tag und Absicherung</span>
        <span className="flex-1" />
        {jahre.length > 1 && jahre.map((x2, i) => <Knopf key={x2.jahr} an={i === jahrIdx} onClick={() => setJahrIdx(i)}>{x2.jahr}</Knopf>)}
        {["Werktag", "Samstag", "Sonn-/Feiertag"].map((t, i) => <Knopf key={t} an={i === art} onClick={() => setArt(i)}>{t}</Knopf>)}
      </div>
      <svg viewBox={"0 0 " + B + " " + H} className="w-full rounded" style={{ background: "#fff", border: "1px solid " + C.line }}>
        {peakTag && <rect x={x(8)} y={O} width={x(20) - x(8)} height={H - O - U} fill="#F3F6FA" />}
        {raster.map((v, i) => (
          <g key={i}>
            <line x1={L} x2={B - R} y1={y(v)} y2={y(v)} stroke="#E3E8EE" />
            <text x={L - 6} y={y(v) + 4} fontSize="11" textAnchor="end" fill="#6B7787">{num(v * 1000, 0)}</text>
          </g>
        ))}
        {werte.map((v, q) => (
          <rect key={q} x={x(q / proH) + (proH > 1 ? 0.5 : 2)} y={y(v)} width={(B - L - R) / n - (proH > 1 ? 1 : 4)} height={Math.max(0, y(0) - y(v))} rx={proH > 1 ? 0.5 : 2} fill={C.strom} opacity="0.85">
            <title>{String(Math.floor(q / proH)).padStart(2, "0") + ":" + String((q % proH) * (60 / proH)).padStart(2, "0") + " · " + num(v * 1000, 0) + " kW"}</title>
          </rect>
        ))}
        <path d={"M" + x(0) + "," + y(absich(0)) + " " + stufen} fill="none" stroke="#6CB43B" strokeWidth="3" />
        <line x1={L} x2={B - R} y1={y(j.baseMW)} y2={y(j.baseMW)} stroke="#0A1626" strokeWidth="1.5" strokeDasharray="5 4" />
        {[0, 4, 8, 12, 16, 20, 24].map((h) => (
          <text key={h} x={x(h)} y={H - 10} fontSize="11" textAnchor="middle" fill="#6B7787">{String(h).padStart(2, "0") + ":00"}</text>
        ))}
        <text x={L - 6} y={O - 4} fontSize="11" textAnchor="end" fill="#6B7787">kW</text>
      </svg>
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs mt-2" style={{ color: C.muted }}>
        <span className="inline-flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm" style={{ background: C.strom }} />mittlere Last {j.jahr}{proH > 1 ? " je Viertelstunde" : ""}</span>
        <span className="inline-flex items-center gap-1.5"><span className="inline-block w-4" style={{ borderTop: "3px solid #6CB43B" }} />{(HEDGE_ARTEN.find((x2) => x2.id === hg.art) || HEDGE_ARTEN[0]).name} {(j.offpeakMW || 0) > 0.0005 ? "Base + Offpeak" : "Base + Peak"}{mehrere ? " (Jahresmittel der " + (hg.produkt === "monat" ? "Monats" : "Quartals") + "bänder)" : ""}</span>
        <span className="inline-flex items-center gap-1.5"><span className="inline-block w-4" style={{ borderTop: "2px dashed #0A1626" }} />Base {num(j.baseMW * 1000, 0)} kW</span>
        {peakTag && <span className="inline-flex items-center gap-1.5"><span className="inline-block w-3 h-3" style={{ background: "#F3F6FA", border: "1px solid " + C.line }} />Peakzeit 8–20 Uhr</span>}
      </div>
      <p className="text-xs mt-1" style={{ color: C.muted }}>
        Was über der grünen Linie liegt, wird zum Marktpreis nachbeschafft, was darunter liegt, verkauft. Daraus entstehen die Strukturkosten.
      </p>
    </div>
  );
}

const KleinFeld = ({ value, onChange, placeholder, darf }) => (
  <input value={value ?? ""} placeholder={placeholder} inputMode="decimal" disabled={!darf}
    onChange={(e) => onChange(e.target.value)} className="w-full px-2 py-1.5 text-sm rounded outline-none"
    style={{ border: "1px solid " + C.line, fontVariantNumeric: "tabular-nums", background: darf ? "#fff" : "#F1F3F5" }} />
);

function BeschaffungDetail({ b, user, mitarbeiter, onAendern, onZurueck, onLoeschen }) {
  const darf = BESCHAFFUNG_ROLLEN_BEARBEITEN.includes(user.rolle);
  const sparten = spartenVon(b);
  const [sparteWahl, setSparte] = useState(sparten[0]);
  const sparte = sparten.includes(sparteWahl) ? sparteWahl : sparten[0];
  const gas = sparte === "gas";
  const feld = gas ? "bewertungGas" : "bewertung";
  const bw = { jahre: [], tranchen: [], ...(b[feld] || {}) };
  /* Empfehlung und abgelegte Pläne gelten für den ganzen Auftrag und liegen in „bewertung“ */
  const gem = b.bewertung || {};
  const [laedt, setLaedt] = useState("");
  const [fehler, setFehler] = useState("");
  const [lastInfo, setLastInfo] = useState(null);
  const [quartale, setQuartale] = useState({});
  const [kundeAendern, setKundeAendern] = useState(false);
  const lastRef = React.useRef(null);   /* eingelesene Lastform, nur im Speicher */
  const profilRef = React.useRef(null);
  const spotRef = React.useRef(null);   /* Spot-PFC aus der Datei, nur im Speicher */
  const [spotStand, setSpotStand] = useState(0);
  const land = b.bundesland || "";
  const hedge = hedgeVon(bw.hedge);
  const basis = bw.preisbasis === "spot" ? "spot" : "termin";
  const nr = gas ? 0 : 1;   /* Strom hat den zusätzlichen Abschnitt „Preisbasis und Absicherung“ */
  const [periodenJahr, setPeriodenJahr] = useState(null);

  /* Kurzstand (gesichert, Preis, Ampel) in der Zusammenfassung mitführen: Vorgang und Liste lesen ihn */
  /* Lieferbeginn je Lieferjahr: 1. Januar, im ersten Jahr der vereinbarte Beginn */
  const beginnJahr = (jahr) => {
    const s1 = jahr + "-01-01";
    return b.lieferbeginn && b.lieferbeginn > s1 ? b.lieferbeginn : s1;
  };
  const mitKurzstand = (n) => {
    if (!n.ergebnis || !n.ergebnis.jahre) return n;
    const jahre = n.ergebnis.jahre.map((j) => {
      const st = tranchenStand(n.tranchen, j.jahr, j, n.stress, heute());
      const a = ampel(st, j, { hoechstpreis: n.hoechstpreis, gas }, beginnJahr(j.jahr), heute());
      return { ...j, gesichert: st.gekauftAnteil, preis: st.preis, ampelJahr: a.stufe };
    });
    return { ...n, ergebnis: { ...n.ergebnis, jahre, ampel: Math.max(0, ...jahre.map((j) => j.ampelJahr || 0)) } };
  };
  const setBw = (teil, t) => {
    const neu = { ...b, [feld]: mitKurzstand({ ...bw, ...teil }) };
    if (user.rolle === "Beschaffung" && b.status === "offen") neu.status = "arbeit";
    if (t) neu.verlauf = [...(b.verlauf || []), { d: heute(), t: (sparten.length > 1 ? SPARTE_NAME[sparte] + ": " : "") + t, w: user.name }];
    onAendern(neu);
  };
  const setGem = (teil, t) => {
    const neu = { ...b, bewertung: { ...gem, ...teil } };
    if (user.rolle === "Beschaffung" && b.status === "offen") neu.status = "arbeit";
    if (t) neu.verlauf = [...(b.verlauf || []), { d: heute(), t, w: user.name }];
    onAendern(neu);
  };
  const setJahr = (i, teil) => setBw({ jahre: bw.jahre.map((j, k) => (k === i ? { ...j, ...teil } : j)) });

  /* Lastgang-Quellen: RLM-Lieferstellen der Sparte und eigene Uploads */
  const istSparte = (l) => (gas ? l.medium === "gas" : l.medium !== "gas");
  const quellen = [
    ...(b.lieferstellen || []).filter((l) => istSparte(l) && l.lastgang)
      .flatMap((l) => dateienVon(l.lastgang).map((d, i) => ({ id: "ls-" + l.id + (i ? "-" + i : ""),
        name: (l.bezeichnung || l.ort || "Lieferstelle") + " · " + d.name, datei: d }))),
    ...(bw.eigeneLastgaenge || []).map((d, i) => ({ id: "eig-" + i, name: d.name, datei: d })),
  ];
  const gewaehlt = bw.quellen && bw.quellen.length ? bw.quellen : quellen.map((q) => q.id);
  const verbrauchStrom = (b.lieferstellen || []).filter(istSparte)
    .reduce((s, l) => s + (zahlLesen(l.verbrauch) || 0), 0);

  /* Lastgang beim Öffnen und beim Wechsel der Sparte einlesen, damit die Grafiken sofort zu sehen sind */
  useEffect(() => {
    lastRef.current = null; setLastInfo(null); setFehler("");
    setVorschlag((v) => ({ ...v, produkt: gas ? "Cal" : "Base/Peak" }));
    if (quellen.length) einlesen();
  }, [b.id, sparte, land]);

  const einlesen = async () => {
    setFehler(""); setLaedt("Lastgang wird eingelesen …");
    try {
      const d = quellen.filter((q) => gewaehlt.includes(q.id)).map((q) => q.datei);
      if (!d.length) throw new Error("Bitte mindestens einen Lastgang wählen oder hochladen.");
      const r = gas ? await gasFormAusDateien(d, bw.einheit || "kWh", land) : await lastformAusDateien(d, bw.einheit || "kWh", land);
      lastRef.current = r;
      setLastInfo(r.info);
      return r;
    } catch (e) { setFehler(e.message || String(e)); return null; }
    finally { setLaedt(""); }
  };

  const profilLaden = async (art, datei) => {
    setFehler(""); setLaedt("Day-Ahead-Preise werden gelesen …");
    if (gas) {
      try {
        const jahr = new Date().getFullYear() - 1;
        let reihe;
        if (art === "datei") {
          const s2 = await lastgangAuswerten(datei);
          reihe = s2.werte.map((w, i) => { const t = zeitLesen(s2.zeitpunkte[i]); return t ? { tag: tagSchluessel(t), preis: w } : null; }).filter(Boolean);
        } else reihe = await gasSpotLaden(jahr + "-01-01", jahr + "-12-31");
        if (reihe.length < 200) throw new Error("Zu wenige Tagespreise (" + reihe.length + "). Bitte ein ganzes Jahr verwenden.");
        setBw({ profil: rundeTief(profilAusGasPreisen(reihe, land)), profilQuelle: (art === "datei" ? datei.name : "THE Day-Ahead " + jahr)
          + " · " + num(reihe.length) + " Gastage" });
      } catch (e) { setFehler(e.message || String(e)); }
      finally { setLaedt(""); }
      return;
    }
    try {
      const jahr = new Date().getFullYear() - 1;
      const reihe = art === "datei" ? await preisreiheAusDatei(datei) : await preisreiheEnergyCharts(jahr);
      if (reihe.length < 24 * 60) throw new Error("Zu wenige Stundenpreise (" + reihe.length + "). Bitte ein ganzes Jahr verwenden.");
      const profil = profilAusPreisen(reihe, land);
      profilRef.current = profil;
      setBw({ profil: rundeTief(profil), profilQuelle: (art === "datei" ? datei.name : "Energy-Charts Day-Ahead " + jahr)
        + " · " + num(reihe.length) + " Stunden" });
    } catch (e) {
      setFehler((art === "datei" ? "" : "Energy-Charts ist aus dem Portal nicht erreichbar. Lade die Day-Ahead-Preise auf energy-charts.info als CSV herunter und wähle die Datei hier aus. ")
        + (e.message || String(e)));
    } finally { setLaedt(""); }
  };

  /* Bewerten: Lastgang × Preiskurve je Lieferjahr; gespeichert werden nur die Kennzahlen */
  const bewerten = async () => {
    const form = lastRef.current || (await einlesen());
    if (!form) return;
    setLaedt("Bewertung läuft …");
    await new Promise((r) => setTimeout(r, 30));
    try {
      if (gas) {
        const jahre = bw.jahre.map((j) => {
          const menge = zahlOder(j.menge) || form.jahresmenge || verbrauchStrom;
          const last = gasJahresLast(form, j.jahr, menge);
          const kurve = gaskurve(j.jahr, gasPreiseAus(j), bw.profil || null, form.land || "");
          const e = jahresBewertungGas(last, kurve);
          return { jahr: j.jahr, mengeKwh: menge, menge: e.menge, preis: e.preis, hedgePreis: e.hedgePreis,
                   strukturProMWh: Math.abs(e.strukturProMWh) < 1e-6 ? 0 : e.strukturProMWh, calPreis: e.calPreis,
                   saisonProMWh: Math.abs(e.saisonProMWh) < 1e-6 ? 0 : e.saisonProMWh, calMW: e.calMW,
                   baseMW: e.calMW, peakMW: 0, gewichtBase: 1, benutzung: null, peakAnteil: 0, spitzeTag: e.spitzeTag,
                   winterAnteil: e.winterAnteil, abweichung: kurve.abweichung,
                   monatsMenge: rundeTief(e.monatsMenge), monatsPreis: rundeTief(kurve.monate), monatsMW: rundeTief(e.monatsMW) };
        });
        setBw({ ergebnis: { ...(bw.ergebnis || {}), berechnet: heute(), marktStand: bw.marktStand || heute(),
          profil: !!bw.profil, jahre } }, "Bewertung berechnet");
        return;
      }
      /* Spot-PFC und Ausgleichsenergiepreise aus den Dateien */
      let spot = null, ae = null;
      if (bw.spotDatei) { spot = spotRef.current || (spotRef.current = await preisreiheRohAusDatei(bw.spotDatei)); setSpotStand((x) => x + 1); }
      if (basis === "spot" && !spot) throw new Error("Für die Spotbewertung bitte zuerst die Spot-PFC hochladen.");
      if (bw.mitAE) {
        if (!bw.aeDatei) throw new Error("Für die Ausgleichsenergie bitte die AE-PFC hochladen.");
        ae = await preisreiheRohAusDatei(bw.aeDatei);
      }
      const opt = { land: form.land || "", proTag: form.proTag || 24 };
      const jahre = bw.jahre.map((j) => {
        const menge = zahlOder(j.menge) || form.jahresmenge || verbrauchStrom;
        const last = jahresLast(form, j.jahr, menge);
        const sp = spot ? preiseAufJahr(spot, j.jahr, opt.land, opt.proTag) : null;
        const kurve = basis === "spot" ? { preis: sp.preis, hinweise: [] } : preiskurve(j.jahr, preiseStromAus(j), bw.profil || null, opt);
        const e = jahresBewertung(last, kurve, basis === "spot" ? { ...hedge, prozent: "0" } : hedge);
        const spotPreis = sp ? last.last.reduce((x, l, k) => x + l * sp.preis[k], 0) / (e.menge || 1) : null;
        /* Ausgleichsenergie: Näherung über den verschobenen Referenzlastgang, bewertet mit der AE-PFC */
        const aeJ = ae ? aeNaeherung(last, preiseAufJahr(ae, j.jahr, opt.land, opt.proTag).preis, bw.aeStunden, bw.aeFaktor) : null;
        /* Skalierung des gewählten Hedges zum Vergleich: 80 bis 120 % und der eingestellte Wert */
        const stress = (zahlOder(bw.stress) || 0) / 100;
        const gewaehlt = zahlOder(hedge.prozent) == null ? 100 : zahlOder(hedge.prozent);
        const stufen = basis === "spot" ? [] : [...new Set([...HEDGE_STUFEN, Math.round(gewaehlt)])].sort((x, y) => x - y);
        const szenarien = stufen.map((pz) => {
          const x = pz === gewaehlt ? e : jahresBewertung(last, kurve, { ...hedge, prozent: String(pz) });
          const netto = (x.shortWert - x.longWert) / (x.menge || 1);
          return rundeTief([pz, x.hedgeMenge, x.shortMenge, x.longMenge, x.hedgePreis, netto, Math.abs(netto) * stress, lastgangPreis(x)]);
        });
        /* mittlere Leistung (MW) je Schritt des Tages nach Tagesart, für die Grafik */
        const tp = [0, 1, 2].map(() => Array.from({ length: opt.proTag }, () => [0, 0]));
        last.stunden.forEach((x, k) => { tp[x.art][x.q][0] += last.last[k] / last.dt; tp[x.art][x.q][1]++; });
        const tagesprofil = tp.map((a) => a.map(([sum, n]) => (n ? Math.round((sum / n) * 1000) / 1000 : 0)));
        return { jahr: j.jahr, mengeKwh: menge, menge: e.menge, preis: e.preis, hedgePreis: e.hedgePreis, hedgeQuote: e.hedgeQuote,
                 strukturProMWh: e.strukturProMWh, baseMW: e.baseMW, peakMW: e.peakMW, offpeakMW: e.offpeakMW, benutzung: e.benutzung,
                 peakAnteil: e.peakAnteil, gewichtBase: e.gewichtBase, spitze: e.spitze,
                 spotPreis, spotExakt: sp ? sp.exakt : null, aeProMWh: aeJ ? aeJ.proMWh : 0, basis, szenarien,
                 ae: aeJ ? { roh: rundeTief(aeJ.roh), deltaAnteil: rundeTief(aeJ.deltaAnteil), vor: rundeTief(aeJ.vor), nach: rundeTief(aeJ.nach) } : null,
                 hinweise: kurve.hinweise || [], perioden: rundeTief(e.perioden.map((x) => [x.baseMW, x.peakMW, x.menge, x.preis, x.basePreis, x.peakPreis, x.offpeakMW, x.offpeakPreis])),
                 periodenNamen: e.perioden.map((x) => x.name),
                 monate: kurve.monate ? { base: rundeTief(kurve.monate.base), peak: rundeTief(kurve.monate.peak) } : null, tagesprofil };
      });
      setBw({ ergebnis: { ...(bw.ergebnis || {}), berechnet: heute(), marktStand: bw.marktStand || heute(),
        profil: !!bw.profil, basis, hedge, land: opt.land, proTag: opt.proTag,
        ae: ae ? { stunden: zahlOder(bw.aeStunden) || 2, faktor: zahlOder(bw.aeFaktor) == null ? 100 : zahlOder(bw.aeFaktor),
          letzte: (zahlOder(bw.aeLetzteBetrag) && zahlOder(bw.aeLetzteMenge)) ? rundeTief(zahlOder(bw.aeLetzteBetrag) / zahlOder(bw.aeLetzteMenge)) : null } : null,
        stress: zahlOder(bw.stress) || 0,
        jahre } }, "Bewertung berechnet");
    } catch (e) { setFehler(e.message || String(e)); }
    finally { setLaedt(""); }
  };

  /* Stand der Tranchen je Jahr (braucht nur die gespeicherten Kennzahlen) */
  const standVon = (j) => {
    const st = tranchenStand(bw.tranchen, j.jahr, j, bw.stress, heute());
    return { st, a: ampel(st, j, { hoechstpreis: bw.hoechstpreis, gas }, beginnJahr(j.jahr), heute()) };
  };
  const erg = bw.ergebnis;

  const tranchenSetzen = (tranchen, t) => setBw({ tranchen }, t);
  const setTranche = (id, teil) => tranchenSetzen(bw.tranchen.map((x) => (x.id === id ? { ...x, ...teil } : x)),
    teil.status === "gekauft" ? "Tranche als gekauft vermerkt" : null);

  const [vorschlag, setVorschlag] = useState({ anzahl: "4", von: heute(), bis: b.lieferbeginn
    ? new Date(new Date(b.lieferbeginn).getTime() - 30 * 86400000).toISOString().slice(0, 10) : heute(), produkt: "Base/Peak" });
  const vorschlagen = (jahr) => {
    const neu = tranchenVorschlag(jahr, Math.max(1, Math.min(24, parseInt(vorschlag.anzahl) || 4)),
      vorschlag.von, vorschlag.bis, vorschlag.produkt).map((t) => ({ ...t, id: uid() }));
    tranchenSetzen([...(bw.tranchen || []).filter((t) => +t.jahr !== +jahr || t.status === "gekauft"), ...neu],
      "Tranchenplan " + jahr + " erstellt");
  };

  /* PDF erzeugen; wer bearbeiten darf, legt es zugleich als neue Fassung im Auftrag ab.
     Der Vertrieb lädt es dann im Vorgang herunter, ältere Fassungen bleiben erhalten. */
  const pdf = () => {
    const d = beschaffungPdf(b, mitarbeiter);
    if (!d) return;
    if (darf) {
      const n = (gem.plaene || []).length + 1;
      const name = "Beschaffungsplan_" + String((b.kunde || {}).firma || b.anfrageId).replace(/[^\wäöüÄÖÜß]+/g, "_")
        + "_" + heute() + "_Fassung" + n + ".pdf";
      const datei = { ...d, name };
      setGem({ plaene: [...(gem.plaene || []), { fassung: n, am: heute(), von: user.name,
        marktStand: (erg && erg.marktStand) || "", datei }] }, "Beschaffungsplan Fassung " + n + " abgelegt");
      if (PDF_ZEIGEN) PDF_ZEIGEN(datei);
    } else if (PDF_ZEIGEN) PDF_ZEIGEN(d);
  };

  const k = b.kunde || {};
  const s = BESCHAFFUNG_STATUS[b.status] || BESCHAFFUNG_STATUS.offen;
  const tz = { fontVariantNumeric: "tabular-nums" };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <button onClick={onZurueck} className="text-xs mb-2 inline-flex items-center gap-1" style={{ color: C.muted }}>
            <ArrowLeft size={13} /> Bewertungsaufträge
          </button>
          <h2 className="text-lg truncate">{k.firma || b.anfrageId}</h2>
          <p className="text-xs" style={{ color: C.muted }}>
            {b.frei
              ? <>Ohne Vorgang · {(b.produkte || []).join(", ")} · angelegt {datum((b.uebergeben || {}).am)} von {(b.uebergeben || {}).von}</>
              : <>Vorgang {b.anfrageId} · {(b.produkte || []).join(", ")} · übergeben {datum((b.uebergeben || {}).am)} von {(b.uebergeben || {}).von}</>}
          </p>
        </div>
        <span className="text-xs whitespace-nowrap" style={{ color: s.color }}>● {s.label}</span>
      </div>

      {(b.uebergeben || {}).hinweis && (
        <div className="rounded p-3 text-sm whitespace-pre-wrap" style={{ background: "#FFF8E6", border: "1px solid #F0DCA8" }}>
          {b.uebergeben.hinweis}
        </div>
      )}

      <Abschnitt titel={b.frei ? "Kunde" : "Kunde und Lieferstellen"} rechts={
        b.frei && darf && !kundeAendern && <button className="text-xs" style={{ color: C.strom }} onClick={() => setKundeAendern(true)}>ändern</button>}>
        {kundeAendern ? (
          <FreiKundeFormular knopf="Übernehmen" onAbbrechen={() => setKundeAendern(false)}
            start={{ ...k, modell: (b.produkte || [])[0] || "Tranchenmodell", lieferbeginn: b.lieferbeginn || "", lieferende: b.lieferende || "", sparten }}
            onSpeichern={(f) => {
              const { modell, lieferbeginn, lieferende, hinweis, lastgang, einheit, lastgangGas, einheitGas, sparten: sp, ...kunde } = f;
              lastRef.current = null; setLastInfo(null);
              const strom0 = { jahre: [], tranchen: [], stress: "20", ...(b.bewertung || {}) };
              const gas0 = b.bewertungGas || leereBewertung(lieferbeginn, lieferende, "gas");
              onAendern({ ...b, kunde: { ...kunde, firma: kunde.firma.trim() }, produkte: [modell], lieferbeginn, lieferende, sparten: sp,
                bewertung: { ...strom0, jahre: jahreAnpassen(strom0.jahre, lieferbeginn, lieferende, "strom") },
                ...(sp.includes("gas") || b.bewertungGas ? { bewertungGas: { ...gas0, jahre: jahreAnpassen(gas0.jahre, lieferbeginn, lieferende, "gas") } } : {}),
                verlauf: [...(b.verlauf || []), { d: heute(), t: "Kundendaten geändert", w: user.name }] });
              setKundeAendern(false);
            }} />
        ) : (<>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm mb-3">
          <div>{k.firma}</div>
          <div style={{ color: C.muted }}>{[k.strasse, [k.plz, k.ort].filter(Boolean).join(" ")].filter(Boolean).join(", ")}</div>
          {k.ansprechpartner && <div>{k.ansprechpartner}</div>}
          {(k.telefon || k.email) && <div style={{ color: C.muted }}>{[k.telefon, k.email].filter(Boolean).join(" · ")}</div>}
          {k.branche && <div style={{ color: C.muted }}>Branche: {k.branche}</div>}
          <div style={{ color: C.muted }}>Lieferzeitraum {datum(b.lieferbeginn)} bis {datum(b.lieferende)}</div>
          {!b.frei && <div style={{ color: C.muted }}>Vertrieb: {b.partnerName}</div>}
        </div>
        <div className="space-y-2">
          {(b.lieferstellen || []).map((l) => (
            <div key={l.id} className="rounded p-3 text-sm" style={{ background: "#F6F8FA", border: "1px solid " + C.line }}>
              <div className="flex items-center gap-2">
                <MediumIcon medium={l.medium} />
                <span className="truncate">{l.bezeichnung || [l.strasse, l.ort].filter(Boolean).join(", ") || "Lieferstelle"}</span>
                <span className="text-xs ml-auto" style={{ color: C.muted }}>{l.zaehlerart}</span>
              </div>
              <div className="text-xs mt-1" style={{ color: C.muted, ...tz }}>
                {num(zahlLesen(l.verbrauch) || 0)} kWh · MaLo {l.maloId || "–"} · Zähler {l.zaehlernummer || "–"}
                {l.versorger ? " · bisher " + l.versorger : ""}
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {l.lastgang && <DateiChip datei={l.lastgang} label="Lastgang" klein />}
                {l.abrechnung && <DateiChip datei={l.abrechnung} label="Abrechnung" klein />}
              </div>
            </div>
          ))}
        </div>
        {(b.varianten || []).length > 0 && (
          <div className="text-xs mt-3" style={{ color: C.muted }}>
            {(b.varianten || []).map((v, i) => (
              <div key={i}>{v.produkt} · {v.sparte === "gas" ? "Erdgas" : v.sparte === "strom" ? "Strom" : "Strom und Erdgas"}
                {v.versorger ? " · " + v.versorger : ""}{v.lieferbeginn ? " · ab " + datum(v.lieferbeginn) : ""}
                {v.laufzeitArt === "ende" && v.lieferende ? " bis " + datum(v.lieferende) : v.laufzeit ? " · " + v.laufzeit + " Monate" : ""}</div>
            ))}
          </div>
        )}
        </>)}
      </Abschnitt>

      {sparten.length > 1 && (
        <div className="flex rounded overflow-hidden" style={{ border: "1px solid " + C.line, background: "#fff" }}>
          {sparten.map((sp) => {
            const st = ((bewertungVon(b, sp) || {}).ergebnis || {}).ampel;
            const an = sp === sparte;
            return (
              <button key={sp} onClick={() => setSparte(sp)} className="flex-1 px-3 py-2.5 text-sm inline-flex items-center justify-center gap-2"
                style={{ background: an ? (sp === "gas" ? C.gas : C.strom) : "#fff", color: an ? "#fff" : C.text }}>
                {sp === "gas" ? <Flame size={15} /> : <Zap size={15} />} {SPARTE_NAME[sp]}
                {st != null && <span className="w-2.5 h-2.5 rounded-full" style={{ background: AMPEL_FARBE[st], border: "1px solid #fff" }} />}
              </button>
            );
          })}
        </div>
      )}

      <Abschnitt titel={"1 · Lastgang" + (sparten.length > 1 || gas ? " " + SPARTE_NAME[sparte] : "")}>
        {quellen.length === 0 && <p className="text-sm mb-3" style={{ color: C.warn }}>{b.frei ? "Noch kein Lastgang. Bitte den Lastgang des Kunden hochladen." : "Im Vorgang liegt kein Lastgang. Bitte hier hochladen."}</p>}
        <div className="space-y-2 mb-3">
          {quellen.map((q) => (
            <label key={q.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" disabled={!darf} checked={gewaehlt.includes(q.id)}
                onChange={(e) => { lastRef.current = null; setLastInfo(null);
                  setBw({ quellen: e.target.checked ? [...gewaehlt, q.id] : gewaehlt.filter((x) => x !== q.id) }); }} />
              <span className="truncate">{q.name}</span>
            </label>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <Select label="Sitz des Kunden (Bundesland, für die Feiertage)" value={land}
            onChange={(v) => { if (!darf) return; lastRef.current = null; setLastInfo(null);
              onAendern({ ...b, bundesland: v, verlauf: [...(b.verlauf || []), { d: heute(), t: "Bundesland: " + (BUNDESLAENDER.find((x) => x[0] === v) || ["", "–"])[1], w: user.name }] }); }}
            options={BUNDESLAENDER.map(([value, label]) => ({ value, label }))} />
          <p className="text-xs self-end pb-1" style={{ color: C.muted }}>
            Landesfeiertage zählen wie Sonntage, im Lastgang und im Lieferjahr. Schulferien und Wetter sind noch nicht berücksichtigt.
          </p>
        </div>
        {darf && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <Datei label={quellen.length ? "Weiteren Lastgang hochladen (CSV oder Excel)" : "Lastgang hochladen (CSV oder Excel)"} datei={null}
              onSet={(d) => { if (d) { lastRef.current = null; setBw({ eigeneLastgaenge: [...(bw.eigeneLastgaenge || []), d],
                quellen: [...gewaehlt, "eig-" + (bw.eigeneLastgaenge || []).length] }, "Lastgang hochgeladen"); } }} />
            <Select label="Werte in der Datei" value={bw.einheit || "kWh"}
              onChange={(v) => { lastRef.current = null; setLastInfo(null); setBw({ einheit: v }); }}
              options={[{ value: "kWh", label: "Energie je Intervall (kWh)" }, { value: "kW", label: "Leistung (kW)" }]} />
          </div>
        )}
        <Btn variante="neutral" onClick={einlesen} disabled={!!laedt}>Lastgang einlesen</Btn>
        {lastInfo && lastInfo.gas && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-sm" style={tz}>
            {[["Jahresmenge (hochgerechnet)", num(lastInfo.jahresmenge) + " kWh"],
              ["Höchste Tagesmenge", num(lastInfo.spitzeTag) + " kWh"],
              [lastInfo.schritt < 24 ? "Spitzenleistung" : "Werte", lastInfo.schritt < 24 ? num(lastInfo.spitzeKw, 1) + " kW" : "Tageswerte"],
              ["Erfasste Gastage", num(lastInfo.tage)]].map(([t, v]) => (
              <div key={t}><div className="text-xs mb-1" style={{ color: C.muted }}>{t}</div>{v}</div>
            ))}
            {lastInfo.ohneDatum > 0 && <p className="col-span-2 sm:col-span-4 text-xs" style={{ color: C.warn }}>
              Ohne Zeitstempel erkannt: Die Werte wurden ab 1. Januar fortlaufend gelegt.</p>}
          </div>
        )}
        {lastInfo && !lastInfo.gas && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-sm" style={tz}>
            {[["Jahresmenge (hochgerechnet)", num(lastInfo.jahresmenge) + " kWh"],
              ["Spitzenlast", num(lastInfo.spitze, 1) + " kW"],
              ["Benutzungsstunden", num(lastInfo.spitze ? lastInfo.jahresmenge / lastInfo.spitze : 0) + " h"],
              ["Erfasste Stunden", num(lastInfo.stunden) + (lastInfo.proTag === 96 ? " · Viertelstunden" : " · Stundenwerte")]].map(([t, v]) => (
              <div key={t}><div className="text-xs mb-1" style={{ color: C.muted }}>{t}</div>{v}</div>
            ))}
            {lastInfo.ohneDatum > 0 && <p className="col-span-2 sm:col-span-4 text-xs" style={{ color: C.warn }}>
              Ohne Zeitstempel erkannt: Die Werte wurden ab 1. Januar fortlaufend gelegt.</p>}
          </div>
        )}
        {lastInfo && (lastInfo.grafiken || []).map((g, gi) => (
          <div key={gi} className="mt-5">
            {(lastInfo.grafiken || []).length > 1 && <div className="text-xs mb-2" style={{ color: C.muted }}>{g.name}</div>}
            <MonatsBalken profil={g.profil} einheit={g.einheit} farbe={g.gasReihe ? C.gas : C.strom} />
            {g.gasReihe ? <GasTagesGrafik reihe={g.gasReihe} /> : g.bilder ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-4">
                <img src={g.bilder.jahr} alt="Tagesspitzenlast" className="w-full rounded lg:col-span-2" style={{ border: "1px solid " + C.line }} />
                <img src={g.bilder.woche} alt="Durchschnittliche Woche" className="w-full rounded" style={{ border: "1px solid " + C.line }} />
                <img src={g.bilder.werktag} alt="Typischer Werktag" className="w-full rounded" style={{ border: "1px solid " + C.line }} />
              </div>
            ) : (
              <p className="text-xs mt-3" style={{ color: C.muted }}>Ohne Zeitstempel lassen sich Jahres- und Wochenverlauf nicht zeichnen.</p>
            )}
          </div>
        ))}
      </Abschnitt>

      <Abschnitt titel={"2 · Marktpreise " + (gas ? "Erdgas THE (Terminmarkt)" : "(Terminmarkt)")} rechts={
        darf && <button className="text-xs" style={{ color: C.strom }}
          onClick={() => { const n = (bw.jahre[bw.jahre.length - 1] || { jahr: new Date().getFullYear() }).jahr + 1;
            setBw({ jahre: [...bw.jahre, leeresJahr(n, sparte)] }); }}>+ Lieferjahr</button>}>
        {gas ? (<>
        <p className="text-xs mb-3" style={{ color: C.muted }}>
          Settlementpreise in €/MWh eintragen, zum Beispiel von eex.com unter Erdgas, Futures, THE Natural Gas.
          Pflicht ist nur der Cal-Preis. Sommer, Winter und Quartale sind freiwillig; ohne sie verteilt das Portal den
          Jahrespreis nach einer üblichen Saisonform (Winter teurer).
        </p>
        <div className="mb-4 max-w-xs">
          <Feld label="Stand der Preise" type="date" value={bw.marktStand || ""} gesperrt={!darf}
            onChange={(v) => setBw({ marktStand: v })} />
        </div>
        <div className="space-y-4">
          {bw.jahre.map((j, i) => (
            <div key={j.jahr} className="rounded p-3" style={{ background: "#F6F8FA", border: "1px solid " + C.line }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm">Lieferjahr {j.jahr}</span>
                {darf && bw.jahre.length > 1 && (
                  <button className="text-xs" style={{ color: C.muted }}
                    onClick={() => setBw({ jahre: bw.jahre.filter((_, k2) => k2 !== i) })}>entfernen</button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="block"><span className="block text-xs mb-1" style={{ color: C.muted }}>Cal {j.jahr}</span>
                  <KleinFeld darf={darf} value={j.cal} onChange={(v) => setJahr(i, { cal: v })} placeholder="€/MWh" /></label>
                <label className="block"><span className="block text-xs mb-1" style={{ color: C.muted }}>Menge kWh</span>
                  <KleinFeld darf={darf} value={j.menge} onChange={(v) => setJahr(i, { menge: v })}
                    placeholder={num((lastInfo && lastInfo.jahresmenge) || verbrauchStrom)} /></label>
              </div>
              <button className="text-xs mt-2" style={{ color: C.strom }}
                onClick={() => setQuartale({ ...quartale, [j.jahr]: !quartale[j.jahr] })}>
                {quartale[j.jahr] ? "Sommer, Winter und Quartale ausblenden" : "Sommer, Winter und Quartale eintragen"}
              </button>
              {quartale[j.jahr] && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2 text-xs">
                  <label className="block"><span className="block mb-1" style={{ color: C.muted }}>Sommer (Apr–Sep)</span>
                    <KleinFeld darf={darf} value={j.sommer} onChange={(v) => setJahr(i, { sommer: v })} /></label>
                  <label className="block"><span className="block mb-1" style={{ color: C.muted }}>Winter (Jan–Mär, Okt–Dez)</span>
                    <KleinFeld darf={darf} value={j.winter} onChange={(v) => setJahr(i, { winter: v })} /></label>
                  <span className="hidden sm:block" />
                  {[0, 1, 2, 3].map((q) => (
                    <label key={q} className="block"><span className="block mb-1" style={{ color: C.muted }}>Q{q + 1}</span>
                      <KleinFeld darf={darf} value={((j.q || [])[q] || {}).preis}
                        onChange={(v) => setJahr(i, { q: [0, 1, 2, 3].map((x) => (x === q ? { ...((j.q || [])[x] || {}), preis: v } : (j.q || [])[x] || {})) })} /></label>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        </>) : (<>
        <p className="text-xs mb-3" style={{ color: C.muted }}>
          Settlementpreise in €/MWh eintragen, zum Beispiel von eex.com unter Strom, Futures, German Power. Je Produkt reichen
          zwei von Base, Peak und Offpeak, der dritte Preis wird gerechnet. Feinere Produkte haben Vorrang: Monat vor Quartal
          vor Saison vor Cal; was fehlt, verteilt das Portal nach einer üblichen Saisonform. Sind alle Monate eingetragen,
          braucht es keinen Cal-Preis.
        </p>
        <div className="mb-4 max-w-xs">
          <Feld label="Stand der Preise" type="date" value={bw.marktStand || ""} gesperrt={!darf}
            onChange={(v) => setBw({ marktStand: v })} />
        </div>
        <div className="space-y-4">
          {bw.jahre.map((j, i) => {
            const zeile = (name, wert, setze, key) => (
              <React.Fragment key={key}>
                <span className="self-center text-xs">{name}</span>
                {["base", "peak", "offpeak"].map((f) => (
                  <KleinFeld key={f} darf={darf} value={(wert || {})[f]} onChange={(v) => setze({ ...(wert || {}), [f]: v })} />
                ))}
              </React.Fragment>
            );
            const setListe = (feld, n, k, w) => setJahr(i, { [feld]: Array.from({ length: n }, (_, x) => (x === k ? w : (j[feld] || [])[x] || {})) });
            const anzahlWeitere = [j.sommer, j.winter, ...(j.q || []), ...(j.mo || [])].filter((x) => x && (x.base || x.peak || x.offpeak)).length;
            return (
            <div key={j.jahr} className="rounded p-3" style={{ background: "#F6F8FA", border: "1px solid " + C.line }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm">Lieferjahr {j.jahr}</span>
                {darf && bw.jahre.length > 1 && (
                  <button className="text-xs" style={{ color: C.muted }}
                    onClick={() => setBw({ jahre: bw.jahre.filter((_, k2) => k2 !== i) })}>entfernen</button>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <label className="block"><span className="block text-xs mb-1" style={{ color: C.muted }}>Cal Base</span>
                  <KleinFeld darf={darf} value={j.base} onChange={(v) => setJahr(i, { base: v })} placeholder="€/MWh" /></label>
                <label className="block"><span className="block text-xs mb-1" style={{ color: C.muted }}>Cal Peak</span>
                  <KleinFeld darf={darf} value={j.peak} onChange={(v) => setJahr(i, { peak: v })} placeholder="€/MWh" /></label>
                <label className="block"><span className="block text-xs mb-1" style={{ color: C.muted }}>Cal Offpeak</span>
                  <KleinFeld darf={darf} value={j.offpeak} onChange={(v) => setJahr(i, { offpeak: v })} placeholder="€/MWh" /></label>
                <label className="block"><span className="block text-xs mb-1" style={{ color: C.muted }}>Menge kWh</span>
                  <KleinFeld darf={darf} value={j.menge} onChange={(v) => setJahr(i, { menge: v })}
                    placeholder={num((lastInfo && lastInfo.jahresmenge) || verbrauchStrom)} /></label>
              </div>
              <button className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded" style={{ background: C.strom, color: "#fff" }}
                onClick={() => setQuartale({ ...quartale, [j.jahr]: !quartale[j.jahr] })}>
                <Layers size={13} /> {quartale[j.jahr] ? "Weitere Produkte ausblenden" : "Saison, Quartale und Monate" + (anzahlWeitere ? " (" + anzahlWeitere + " eingetragen)" : "")}
              </button>
              {quartale[j.jahr] && (
                <div className="grid gap-x-2 gap-y-1.5 mt-3 text-xs" style={{ gridTemplateColumns: "minmax(52px,auto) 1fr 1fr 1fr" }} data-strom="1">
                  <span /><span style={{ color: C.muted }}>Base</span><span style={{ color: C.muted }}>Peak</span><span style={{ color: C.muted }}>Offpeak</span>
                  {zeile("Sommer", j.sommer, (w) => setJahr(i, { sommer: w }), "so")}
                  {zeile("Winter", j.winter, (w) => setJahr(i, { winter: w }), "wi")}
                  {[0, 1, 2, 3].map((q) => zeile("Q" + (q + 1), (j.q || [])[q], (w) => setListe("q", 4, q, w), "q" + q))}
                  {MONATE_KURZ.map((m, k) => zeile(m, (j.mo || [])[k], (w) => setListe("mo", 12, k, w), "m" + k))}
                  <span className="col-span-4 pt-1" style={{ color: C.muted }}>
                    Sommer = April bis September, Winter = Januar bis März und Oktober bis Dezember des Lieferjahres.
                  </span>
                </div>
              )}
            </div>
            );
          })}
        </div>
        </>)}
      </Abschnitt>

      <Abschnitt titel={gas ? "3 · Tagesprofil (freiwillig)" : "3 · Stundenprofil (freiwillig)"}>
        <p className="text-xs mb-3" style={{ color: C.muted }}>
          {gas ? "Ohne Profil hat jeder Gastag eines Monats denselben Preis. Mit den THE-Day-Ahead-Preisen eines vergangenen Jahres "
            + "bekommen Werktage und Wochenenden ihren üblichen Abstand; die Monatsmittel bleiben genau bei der Kurve."
            : "Ohne Profil rechnet das Portal mit Peak- und Offpeakpreisen je Monat. Mit den Day-Ahead-Preisen eines "
            + "vergangenen Jahres bekommt die Kurve ihren Tagesverlauf; die Mittelwerte bleiben genau bei den eingetragenen Preisen."}
        </p>
        <p className="text-xs mb-3" style={{ color: C.muted }}>
          So entsteht ein späteres Lieferjahr (z. B. 2028): Das Preisniveau kommt aus den Terminpreisen dieses Jahres. Aus dem
          Profil wird nur die Form übernommen (Verhältnis zum Monatsmittel je Tagesart{gas ? "" : " und Stunde"}) und auf den
          Kalender des Lieferjahres gelegt, mit dessen Wochentagen und Feiertagen. Der Lastgang wird ebenso nicht 1:1 übernommen:
          Aus ihm entsteht die typische Last je Monat, Tagesart und {gas ? "Gastag" : "Viertelstunde bzw. Stunde"}, die auf das Lieferjahr gelegt und auf die
          Jahresmenge hochgerechnet wird. Eine Prognose (Wachstum, Wetter, Ferien) rechnet das Portal nicht.
        </p>
        {bw.profilQuelle && (
          <p className="text-sm mb-3 flex items-center gap-2"><Check size={14} style={{ color: C.ok }} /> {bw.profilQuelle}
            {darf && <button className="text-xs ml-2" style={{ color: C.muted }} onClick={() => setBw({ profil: null, profilQuelle: "" })}>entfernen</button>}
          </p>
        )}
        {darf && (
          <div className="flex flex-wrap gap-3 items-end">
            <Btn variante="neutral" onClick={() => profilLaden("api")} disabled={!!laedt}>{gas ? "THE Day-Ahead " : "Day-Ahead "}{new Date().getFullYear() - 1} laden</Btn>
            <div className="flex-1 min-w-[200px]">
              <Datei label={gas ? "oder Datei mit Tagespreisen" : "oder Datei mit Stundenpreisen"} datei={null} onSet={(d) => d && profilLaden("datei", d)} />
            </div>
          </div>
        )}
      </Abschnitt>

      {!gas && (
        <Abschnitt titel="4 · Preisbasis und Absicherung">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select label="Preisbasis der Bewertung" value={basis} onChange={(v) => darf && setBw({ preisbasis: v })}
              options={[{ value: "termin", label: "Terminmarkt (PFC aus den Terminpreisen)" }, { value: "spot", label: "Spotmarkt (Spot-PFC aus Datei)" }]} />
            <div>
              {bw.spotDatei ? (
                <div className="flex flex-wrap items-center gap-2 text-sm min-w-0 pt-5"><DateiChip datei={bw.spotDatei} label="Spot-PFC" klein />
                  {darf && <button className="text-xs" style={{ color: C.muted }} onClick={() => { spotRef.current = null; setBw({ spotDatei: null }, "Spot-PFC entfernt"); }}>entfernen</button>}</div>
              ) : darf ? (
                <Datei label={"Spot-PFC (Stunden oder Viertelstunden, €/MWh)" + (basis === "spot" ? "" : ", freiwillig zum Vergleich")} datei={null}
                  onSet={(d) => { if (d) { spotRef.current = null; setBw({ spotDatei: d }, "Spot-PFC hochgeladen"); } }} />
              ) : <p className="text-xs pt-5" style={{ color: C.muted }}>Keine Spot-PFC hinterlegt.</p>}
            </div>
          </div>
          <p className="text-xs mt-2 mb-4" style={{ color: C.muted }}>
            Terminmarkt: Bewertung zur Kurve aus Abschnitt 2 und 3, mit Absicherung. Spotmarkt: Der Lastgang wird zu den Preisen
            der Spot-PFC bewertet, ohne Absicherung. Deckt die Datei das Lieferjahr ab, gelten die Preise zum selben Zeitpunkt,
            sonst ihre Form je Monat, Tagesart und Viertelstunde.
          </p>
          <label className="flex items-start gap-2 text-sm mb-2">
            <input type="checkbox" className="mt-1" disabled={!darf} checked={!!bw.mitAE} onChange={(e) => setBw({ mitAE: e.target.checked })} />
            <span>Ausgleichsenergie einrechnen
              <span className="block text-xs" style={{ color: C.muted }}>
                Der Referenzlastgang wird um einige Stunden nach vorn und nach hinten verschoben und als Ist-Lastgang angenommen
                (Prognoseunschärfe). Die Deltamengen werden mit der AE-PFC bewertet und mit dem Wahrscheinlichkeitsfaktor skaliert.
              </span></span>
          </label>
          {bw.mitAE && (
            <div className="mb-4 space-y-3">
              {bw.aeDatei ? (
                <div className="flex flex-wrap items-center gap-2 text-sm min-w-0"><DateiChip datei={bw.aeDatei} label="AE-PFC" klein />
                  {darf && <button className="text-xs" style={{ color: C.muted }} onClick={() => setBw({ aeDatei: null }, "AE-PFC entfernt")}>entfernen</button>}</div>
              ) : darf && (
                <Datei label="AE-PFC (Stunden oder Viertelstunden, €/MWh)" datei={null}
                  onSet={(d) => d && setBw({ aeDatei: d }, "AE-PFC hochgeladen")} />
              )}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Feld label="Verschiebung in Stunden" value={bw.aeStunden ?? "2"} gesperrt={!darf} onChange={(v) => setBw({ aeStunden: v })} />
                <Feld label="Wahrscheinlichkeitsfaktor %" value={bw.aeFaktor ?? "100"} gesperrt={!darf} onChange={(v) => setBw({ aeFaktor: v })} />
                <Feld label="Letzte AE-Rechnung €" value={bw.aeLetzteBetrag || ""} gesperrt={!darf} onChange={(v) => setBw({ aeLetzteBetrag: v })} placeholder="freiwillig" />
                <Feld label="dazu Menge MWh" value={bw.aeLetzteMenge || ""} gesperrt={!darf} onChange={(v) => setBw({ aeLetzteMenge: v })} placeholder="freiwillig" />
              </div>
            </div>
          )}
          {basis === "termin" && (<>
            <div className="text-sm mb-2 mt-4">Absicherung (Hedge)</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Select label="Hedgeart" value={hedge.art} onChange={(v) => darf && setBw({ hedge: { ...hedge, art: v } })}
                options={HEDGE_ARTEN.map((x) => ({ value: x.id, label: x.name }))} />
              <Select label="Produkte" value={hedge.produkt} onChange={(v) => darf && setBw({ hedge: { ...hedge, produkt: v } })}
                options={HEDGE_PRODUKTE.map((x) => ({ value: x.id, label: x.name }))} />
              <Feld label="Skalierung des Hedges %" value={hedge.prozent} gesperrt={!darf} onChange={(v) => setBw({ hedge: { ...hedge, prozent: v } })} />
            </div>
            {darf && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {HEDGE_STUFEN.map((pz) => (
                  <button key={pz} onClick={() => setBw({ hedge: { ...hedge, prozent: String(pz) } })} className="text-xs px-2.5 py-1 rounded"
                    style={{ background: String(hedge.prozent) === String(pz) ? C.ink : "#fff", color: String(hedge.prozent) === String(pz) ? "#fff" : C.text, border: "1px solid " + C.line }}>{pz} %</button>
                ))}
              </div>
            )}
            <p className="text-xs mt-2" style={{ color: C.muted }}>
              {(HEDGE_ARTEN.find((x) => x.id === hedge.art) || HEDGE_ARTEN[0]).text} Mit {hedge.produkt === "cal" ? "einem Jahresband" : hedge.produkt === "quartal" ? "vier Quartalsbändern" : "zwölf Monatsbändern"}
              {" "}je Base und Peak; bewertet zur Kurve des jeweiligen Zeitraums. Die Skalierung vergrößert oder verkleinert den Hedge danach
              (z. B. 80 % oder 120 %); die Bewertung zeigt alle Stufen von 80 bis 120 % im Vergleich.
            </p>
          </>)}
        </Abschnitt>
      )}

      {darf && (
        <div className="flex flex-wrap items-center gap-3">
          <Btn icon={Calculator} onClick={bewerten} disabled={!!laedt}>Bewerten</Btn>
          {laedt && <span className="text-sm" style={{ color: C.muted }}>{laedt}</span>}
        </div>
      )}
      {fehler && <p className="text-sm" style={{ color: C.warn }}>{fehler}</p>}

      {erg && erg.jahre && (
        <Abschnitt titel={(4 + nr) + " · Bewertung" + (gas ? " Erdgas" : "")} rechts={<span className="text-xs" style={{ color: C.muted }}>
          berechnet {datum(erg.berechnet)} · Preise vom {datum(erg.marktStand)}{erg.profil ? (gas ? " · mit Tagesprofil" : " · mit Stundenprofil") : ""}</span>}>
          {gas ? (<>
          {erg.jahre.some((j) => Math.abs(j.abweichung || 0) > 0.05) && (
            <p className="text-sm mb-3" style={{ color: C.warn }}>
              Sommer, Winter und Quartale ergeben zusammen nicht den Cal-Preis ({erg.jahre.filter((j) => Math.abs(j.abweichung || 0) > 0.05)
                .map((j) => j.jahr + ": " + (j.abweichung > 0 ? "+" : "") + num(j.abweichung, 2) + " €/MWh").join(", ")}). Bitte die Eingaben prüfen.
            </p>
          )}
          <div className="sm:hidden space-y-3">
            {erg.jahre.map((j) => (
              <div key={j.jahr} className="rounded p-3" style={{ background: "#F6F8FA", border: "1px solid " + C.line }}>
                <div className="text-sm mb-2">Lieferjahr {j.jahr}</div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm" style={tz}>
                  {[["Menge", num(j.menge, 0) + " MWh"], ["Winteranteil", num(j.winterAnteil * 100, 1) + " %"],
                    ["Cal", num(j.calPreis, 2) + " €/MWh"], ["Saisonanteil", (j.saisonProMWh >= 0 ? "+" : "") + num(j.saisonProMWh, 2) + " €/MWh"],
                    ["Struktur", num(j.strukturProMWh, 2) + " €/MWh"], ["Lastgang gesamt", num(j.hedgePreis + j.strukturProMWh, 2) + " €/MWh"]].map(([t, v]) => (
                    <div key={t}><div className="text-xs" style={{ color: C.muted }}>{t}</div>{v}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm" style={tz}>
              <thead>
                <tr className="text-xs text-left" style={{ color: C.muted }}>
                  <th className="py-1 pr-3 font-normal">Lieferjahr</th>
                  <th className="py-1 pr-3 font-normal text-right">Menge MWh</th>
                  <th className="py-1 pr-3 font-normal text-right">Winteranteil</th>
                  <th className="py-1 pr-3 font-normal text-right">Cal €/MWh</th>
                  <th className="py-1 pr-3 font-normal text-right">Saisonanteil €/MWh</th>
                  <th className="py-1 pr-3 font-normal text-right">Struktur €/MWh</th>
                  <th className="py-1 font-normal text-right">Lastgang €/MWh</th>
                </tr>
              </thead>
              <tbody>
                {erg.jahre.map((j) => (
                  <tr key={j.jahr} style={{ borderTop: "1px solid " + C.line }}>
                    <td className="py-2 pr-3">{j.jahr}</td>
                    <td className="py-2 pr-3 text-right">{num(j.menge, 0)}</td>
                    <td className="py-2 pr-3 text-right">{num(j.winterAnteil * 100, 1)} %</td>
                    <td className="py-2 pr-3 text-right">{num(j.calPreis, 2)}</td>
                    <td className="py-2 pr-3 text-right">{(j.saisonProMWh >= 0 ? "+" : "") + num(j.saisonProMWh, 2)}</td>
                    <td className="py-2 pr-3 text-right">{num(j.strukturProMWh, 2)}</td>
                    <td className="py-2 text-right">{num(j.hedgePreis + j.strukturProMWh, 2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <GasMonatsGrafik jahre={erg.jahre} />
          <p className="text-xs mt-3" style={{ color: C.muted }}>
            Absicherung mit Monatsbändern: je Monat die mittlere Tagesmenge zum Monatspreis der Kurve. Saisonanteil: Mehrkosten
            dieser Monatsbänder gegenüber einem gleichmäßigen Jahresband (Cal). Struktur: Wert der Abweichung der einzelnen
            Gastage vom Monatsband. Lastgang gesamt = Cal + Saisonanteil + Struktur.
          </p>
          </>) : (() => {
          const hg = hedgeVon(erg.hedge);
          const spotErg = erg.basis === "spot";
          const mitSpot = erg.jahre.some((j) => j.spotPreis != null);
          const mitAE = !!erg.ae;
          const gesamt = (j) => lastgangPreis(j) + (mitAE ? j.aeProMWh || 0 : 0);
          const hinweise = erg.jahre.flatMap((j) => j.hinweise || []);
          const pj = erg.jahre.find((j) => j.jahr === periodenJahr) || erg.jahre[0];
          const spalten = [
            ["Menge MWh", (j) => num(j.menge, 0)],
            ...(spotErg ? [] : [["Base MW", (j) => num(j.baseMW, 3)], ["Peak MW", (j) => num(j.peakMW, 3)],
              ...(erg.jahre.some((j) => j.offpeakMW > 0) ? [["Offpeak MW", (j) => num(j.offpeakMW || 0, 3)]] : []),
              ["Absicherung", (j) => num((j.hedgeQuote == null ? 1 : j.hedgeQuote) * 100, 0) + " %"], ["Hedge €/MWh", (j) => num(j.hedgePreis, 2)],
              ["Struktur/Rest €/MWh", (j) => num(j.strukturProMWh, 2)]]),
            ...(mitSpot ? [["Spot €/MWh", (j) => j.spotPreis == null ? "–" : num(j.spotPreis, 2)]] : []),
            ...(mitAE ? [["Ausgleichsenergie €/MWh", (j) => num(j.aeProMWh || 0, 2)]] : []),
            ["Lastgang €/MWh", (j) => num(gesamt(j), 2)]];
          return (<>
          {hinweise.length > 0 && (
            <div className="text-sm mb-3 space-y-1" style={{ color: C.warn }}>{hinweise.map((h, i) => <div key={i}>{h}</div>)}</div>
          )}
          <div className="sm:hidden space-y-3">
            {erg.jahre.map((j) => (
              <div key={j.jahr} className="rounded p-3" style={{ background: "#F6F8FA", border: "1px solid " + C.line }}>
                <div className="text-sm mb-2">Lieferjahr {j.jahr}</div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm" style={tz}>
                  {spalten.map(([t, f]) => (
                    <div key={t}><div className="text-xs" style={{ color: C.muted }}>{t}</div>{f(j)}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm" style={tz}>
              <thead>
                <tr className="text-xs text-left" style={{ color: C.muted }}>
                  <th className="py-1 pr-3 font-normal">Lieferjahr</th>
                  {spalten.map(([t]) => <th key={t} className="py-1 pr-3 font-normal text-right">{t}</th>)}
                </tr>
              </thead>
              <tbody>
                {erg.jahre.map((j) => (
                  <tr key={j.jahr} style={{ borderTop: "1px solid " + C.line }}>
                    <td className="py-2 pr-3">{j.jahr}</td>
                    {spalten.map(([t, f]) => <td key={t} className="py-2 pr-3 text-right">{f(j)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {mitAE && (
            <p className="text-xs mt-3" style={{ color: C.text }}>
              Ausgleichsenergie: Referenzlastgang um ± {num(erg.ae.stunden, 1)} h verschoben, Deltamenge {erg.jahre.map((j) => num(((j.ae || {}).deltaAnteil || 0) * 100, 1) + " %").join(" / ")} der Menge,
              bewertet mit der AE-PFC: {erg.jahre.map((j) => num(((j.ae || {}).roh || 0), 2)).join(" / ")} €/MWh, mit Wahrscheinlichkeitsfaktor {num(erg.ae.faktor, 0)} %:
              {" "}{erg.jahre.map((j) => num(j.aeProMWh || 0, 2)).join(" / ")} €/MWh.
              {erg.ae.letzte != null ? " Zum Vergleich letzte AE-Rechnung: " + num(erg.ae.letzte, 2) + " €/MWh." : ""}
            </p>
          )}
          {!spotErg && erg.jahre.some((j) => (j.szenarien || []).length) && (() => {
            const sj = erg.jahre.find((j) => j.jahr === periodenJahr) || erg.jahre[0];
            const gew = zahlOder(hg.prozent) == null ? 100 : zahlOder(hg.prozent);
            return (
              <div className="mt-4">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-xs" style={{ color: C.muted }}>Skalierung des Hedges im Vergleich, Lieferjahr {sj.jahr}</span>
                  <span className="flex-1" />
                  {erg.jahre.length > 1 && erg.jahre.map((j) => (
                    <button key={j.jahr} onClick={() => setPeriodenJahr(j.jahr)} className="text-xs px-2 py-1 rounded"
                      style={{ background: j.jahr === sj.jahr ? C.ink : "#fff", color: j.jahr === sj.jahr ? "#fff" : C.text, border: "1px solid " + C.line }}>{j.jahr}</button>
                  ))}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs min-w-[560px]" style={tz}>
                    <thead><tr style={{ color: C.muted }}>
                      {["Skalierung", "Hedge MWh", "Short (offen) MWh", "Long MWh", "Hedge €/MWh", "Netto offen €/MWh", "Risiko bei ± " + num(erg.stress || 0, 0) + " %", "Lastgang €/MWh"].map((t, i) =>
                        <th key={t} className={"py-1 pr-3 font-normal " + (i ? "text-right" : "text-left")}>{t}</th>)}
                    </tr></thead>
                    <tbody>
                      {(sj.szenarien || []).map((z) => (
                        <tr key={z[0]} style={{ borderTop: "1px solid " + C.line, background: Math.round(z[0]) === Math.round(gew) ? "#F1F7F0" : "transparent" }}>
                          <td className="py-1.5 pr-3">{num(z[0], 0)} %{Math.round(z[0]) === Math.round(gew) ? " · gewählt" : ""}</td>
                          <td className="py-1.5 pr-3 text-right">{num(z[1], 1)}</td><td className="py-1.5 pr-3 text-right">{num(z[2], 1)}</td>
                          <td className="py-1.5 pr-3 text-right">{num(z[3], 1)}</td><td className="py-1.5 pr-3 text-right">{num(z[4], 2)}</td>
                          <td className="py-1.5 pr-3 text-right">{(z[5] >= 0 ? "+" : "") + num(z[5], 2)}</td><td className="py-1.5 pr-3 text-right">± {num(z[6], 2)}</td>
                          <td className="py-1.5 pr-3 text-right">{num(z[7], 2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs mt-1" style={{ color: C.muted }}>
                  Netto offen: Marktwert Short minus Long je MWh Last; positiv = Unterdeckung (Risiko steigender Preise), negativ = Überdeckung
                  (Risiko fallender Preise). Risiko: Wertänderung der offenen Position, wenn sich die Preise um den Stresstest-Wert ändern.
                  Der Lastgangpreis zur heutigen Kurve bleibt gleich, die Skalierung verändert das Risiko.
                </p>
              </div>
            );
          })()}
          {!spotErg && pj && (pj.perioden || []).length > 1 && (
            <div className="mt-4">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="text-xs" style={{ color: C.muted }}>Absicherung je {hg.produkt === "monat" ? "Monat" : "Quartal"}</span>
                <span className="flex-1" />
                {erg.jahre.length > 1 && erg.jahre.map((j) => (
                  <button key={j.jahr} onClick={() => setPeriodenJahr(j.jahr)} className="text-xs px-2 py-1 rounded"
                    style={{ background: j.jahr === pj.jahr ? C.ink : "#fff", color: j.jahr === pj.jahr ? "#fff" : C.text, border: "1px solid " + C.line }}>{j.jahr}</button>
                ))}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs min-w-[680px]" style={tz}>
                  <thead><tr style={{ color: C.muted }}>
                    {["Zeitraum", "Base MW", "Peak MW", "Offpeak MW", "Base €/MWh", "Peak €/MWh", "Offpeak €/MWh", "Hedge MWh", "Hedge €/MWh"].map((t, i) =>
                      <th key={t} className={"py-1 pr-3 font-normal " + (i ? "text-right" : "text-left")}>{t}</th>)}
                  </tr></thead>
                  <tbody>
                    {pj.perioden.map((x, i) => (
                      <tr key={i} style={{ borderTop: "1px solid " + C.line }}>
                        <td className="py-1.5 pr-3">{(pj.periodenNamen || [])[i]} {pj.jahr}</td>
                        <td className="py-1.5 pr-3 text-right">{num(x[0], 3)}</td><td className="py-1.5 pr-3 text-right">{num(x[1], 3)}</td>
                        <td className="py-1.5 pr-3 text-right">{num(x[6] || 0, 3)}</td>
                        <td className="py-1.5 pr-3 text-right">{num(x[4], 2)}</td><td className="py-1.5 pr-3 text-right">{num(x[5], 2)}</td>
                        <td className="py-1.5 pr-3 text-right">{x[7] != null ? num(x[7], 2) : "–"}</td>
                        <td className="py-1.5 pr-3 text-right">{num(x[2], 1)}</td><td className="py-1.5 pr-3 text-right">{num(x[3], 2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {!spotErg && erg.jahre[0] && erg.jahre[0].tagesprofil && <AbsicherungsGrafik jahre={erg.jahre} hedge={hg} />}
          <p className="text-xs mt-3" style={{ color: C.muted }}>
            {spotErg
              ? "Spotbewertung: Lastgang × Spot-PFC, ohne Absicherung."
              : (HEDGE_ARTEN.find((x) => x.id === hg.art) || HEDGE_ARTEN[0]).name + " mit " + (hg.produkt === "monat" ? "Monatsprodukten" : hg.produkt === "quartal" ? "Quartalsprodukten" : "Cal-Produkten")
                + ", Skalierung " + num(zahlOder(hg.prozent) == null ? 100 : zahlOder(hg.prozent), 0) + " %. Struktur/Rest: Marktwert der Last minus Marktwert der Absicherung, je MWh Last"
                + " (Abweichung im Verlauf und nicht abgesicherte Menge). Lastgang = Absicherung × Hedgepreis + Struktur/Rest."}
            {mitAE ? " Dazu die Ausgleichsenergie." : ""} Benutzungsstunden {erg.jahre.map((j) => num(j.benutzung)).join(" / ")} h,
            Peakanteil {erg.jahre.map((j) => num(j.peakAnteil * 100)).join(" / ")} %{erg.proTag === 96 ? ", gerechnet in Viertelstunden" : ""}
            {erg.land ? ", Feiertage " + (BUNDESLAENDER.find((x) => x[0] === erg.land) || ["", ""])[1] : ""}.
          </p>
          </>);
          })()}
        </Abschnitt>
      )}

      {erg && erg.jahre && (
        <Abschnitt titel={(5 + nr) + " · Tranchenplan"}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <Feld label="Höchstpreis (Budgetgrenze) €/MWh" value={bw.hoechstpreis || ""} gesperrt={!darf}
              onChange={(v) => setBw({ hoechstpreis: v })} />
            <Feld label="Stresstest ± %" value={bw.stress || ""} gesperrt={!darf} onChange={(v) => setBw({ stress: v })} />
          </div>
          {darf && (
            <div className="rounded p-3 mb-4" style={{ background: "#F6F8FA", border: "1px solid " + C.line }}>
              <div className="text-xs mb-2" style={{ color: C.muted }}>Gleichmäßigen Plan vorschlagen (gekaufte Tranchen bleiben stehen)</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Feld label="Anzahl Tranchen" value={vorschlag.anzahl} onChange={(v) => setVorschlag({ ...vorschlag, anzahl: v })} />
                <Feld label="erste" type="date" value={vorschlag.von} onChange={(v) => setVorschlag({ ...vorschlag, von: v })} />
                <Feld label="letzte" type="date" value={vorschlag.bis} onChange={(v) => setVorschlag({ ...vorschlag, bis: v })} />
                <Select label="Produkt" value={vorschlag.produkt} onChange={(v) => setVorschlag({ ...vorschlag, produkt: v })}
                  options={gas ? ["Cal", "Saison", "Quartal", "Monat"] : ["Base/Peak", "Base", "Peak"]} />
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {erg.jahre.map((j) => (
                  <Btn key={j.jahr} variante="neutral" onClick={() => vorschlagen(j.jahr)}>Plan für {j.jahr}</Btn>
                ))}
              </div>
            </div>
          )}

          {erg.jahre.map((j) => {
            const { st, a } = standVon(j);
            const tr = (bw.tranchen || []).filter((t) => +t.jahr === +j.jahr).sort((x, y) => String(x.datum).localeCompare(String(y.datum)));
            return (
              <div key={j.jahr} className="mb-5">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-2">
                  <span className="text-sm">Lieferjahr {j.jahr}</span>
                  <span className="text-xs inline-flex items-center gap-1" style={{ color: AMPEL_FARBE[a.stufe] }}>
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: AMPEL_FARBE[a.stufe] }} />{AMPEL_TEXT[a.stufe]}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-2 text-sm" style={tz}>
                  {[["Gesichert", num(st.gekauftAnteil * 100) + " %" + (st.gekauftAnteil ? " zu " + num(st.gekauftPreis, 2) : "")],
                    ["Sollstand heute", num(st.soll * 100) + " %"],
                    ["Energiepreis aktuell", num(st.preis, 2) + " €/MWh"],
                    ["Band bei ± " + (bw.stress || 0) + " %", num(st.preisTief, 2) + " – " + num(st.preisHoch, 2)]].map(([t, v]) => (
                    <div key={t}><div className="text-xs mb-1" style={{ color: C.muted }}>{t}</div>{v}</div>
                  ))}
                </div>
                {a.gruende.length > 0 && <p className="text-xs mb-2" style={{ color: AMPEL_FARBE[a.stufe] }}>{a.gruende.join(" · ")}</p>}
                <div className="space-y-2">
                  {tr.map((t) => (
                    <div key={t.id} className="rounded p-2" style={{ border: "1px solid " + (t.status === "gekauft" ? C.ok : C.line) }}>
                      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 items-end">
                        <Feld label="Termin" type="date" value={t.datum || ""} gesperrt={!darf} onChange={(v) => setTranche(t.id, { datum: v })} />
                        <Feld label="Anteil %" value={t.anteil || ""} gesperrt={!darf} onChange={(v) => setTranche(t.id, { anteil: v })} />
                        <Select label="Status" value={t.status || "geplant"} onChange={(v) => darf && setTranche(t.id, { status: v })}
                          options={[{ value: "geplant", label: "geplant" }, { value: "gekauft", label: "gekauft" }, { value: "ausgesetzt", label: "ausgesetzt" }]} />
                        {gas ? (<>
                          <Select label="Produkt" value={t.produkt || "Cal"} onChange={(v) => darf && setTranche(t.id, { produkt: v })}
                            options={["Cal", "Saison", "Quartal", "Monat"]} />
                          <Feld label="Preis €/MWh" value={t.preis || ""} gesperrt={!darf} onChange={(v) => setTranche(t.id, { preis: v })} />
                        </>) : (<>
                        <Feld label="Preis Base" value={t.preisBase || ""} gesperrt={!darf} onChange={(v) => setTranche(t.id, { preisBase: v })} />
                        <Feld label="Preis Peak" value={t.preisPeak || ""} gesperrt={!darf} onChange={(v) => setTranche(t.id, { preisPeak: v })} />
                        <Feld label="oder Mischpreis" value={t.preis || ""} gesperrt={!darf} onChange={(v) => setTranche(t.id, { preis: v })} />
                        </>)}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <input value={t.notiz || ""} disabled={!darf} placeholder="Notiz, z. B. Signal oder Absprache mit dem Versorger"
                          onChange={(e) => setTranche(t.id, { notiz: e.target.value })}
                          className="flex-1 px-2 py-1.5 text-xs rounded outline-none" style={{ border: "1px solid " + C.line }} />
                        {darf && <button style={{ color: C.muted }} onClick={() => tranchenSetzen(bw.tranchen.filter((x) => x.id !== t.id))}><Trash2 size={14} /></button>}
                      </div>
                    </div>
                  ))}
                </div>
                {darf && (
                  <button className="text-xs mt-2" style={{ color: C.strom }}
                    onClick={() => tranchenSetzen([...(bw.tranchen || []), { id: uid(), jahr: j.jahr, datum: heute(), anteil: "", status: "geplant", produkt: gas ? "Cal" : "Base/Peak", preis: "" }])}>
                    + Tranche
                  </button>
                )}
              </div>
            );
          })}
          <p className="text-xs" style={{ color: C.muted }}>
            {gas ? "Energiepreis aktuell: gekaufte Tranchen zu ihrem Preis, offener Rest zum heutigen Preis der Monatsbänder, dazu die Strukturkosten."
              : "Energiepreis aktuell: gekaufte Tranchen zu ihrem Preis, offener Rest der Absicherung zum heutigen Hedgepreis, dazu Struktur und nicht abgesicherte Menge"
                + (bw.mitAE ? " sowie die Ausgleichsenergie." : ".")}
            Ohne Netzentgelte, Abgaben, Umlagen und Aufschläge des Versorgers.
          </p>
        </Abschnitt>
      )}

      {erg && erg.jahre && (
        <Abschnitt titel={(6 + nr) + " · Analyse: Last und geschlossene Positionen"}>
          <AnalyseGrafik key={sparte} form={lastRef.current} bw={bw} gas={gas} spot={spotRef.current} spotStand={spotStand} />
        </Abschnitt>
      )}

      <Abschnitt titel="Empfehlung an Kunde und Vertrieb">
        <textarea value={gem.empfehlung || ""} disabled={!darf} rows={4} onChange={(e) => setGem({ empfehlung: e.target.value })}
          placeholder={b.frei ? "Kurze Einschätzung und nächste Schritte, erscheint im Beschaffungsplan" : "Kurze Einschätzung und nächste Schritte, sichtbar im Vorgang"}
          className="w-full px-3 py-2 text-sm rounded outline-none" style={{ border: "1px solid " + C.line }} />
        <div className="flex flex-wrap gap-3 mt-3 items-end">
          {darf && (
            <div className="w-48">
              <Select label="Status" value={b.status} onChange={(v) => onAendern({ ...b, status: v,
                verlauf: [...(b.verlauf || []), { d: heute(), t: "Status: " + BESCHAFFUNG_STATUS[v].label, w: user.name }] })}
                options={Object.entries(BESCHAFFUNG_STATUS).map(([value, x]) => ({ value, label: x.label }))} />
            </div>
          )}
          <Btn variante="neutral" icon={FileText} onClick={pdf} disabled={!sparten.some((sp) => (bewertungVon(b, sp) || {}).ergebnis)}>{darf ? "Beschaffungsplan als PDF ablegen" : "Beschaffungsplan als PDF"}</Btn>
          {onLoeschen && <Btn variante="gefahr" icon={Trash2}
            onClick={() => { if (window.confirm("Diesen Bewertungsauftrag löschen?")) onLoeschen(); }}>Löschen</Btn>}
        </div>
      </Abschnitt>

      {(gem.plaene || []).length > 0 && (
        <Abschnitt titel="Abgelegte Beschaffungspläne" rechts={<span className="text-xs" style={{ color: C.muted }}>{b.frei ? "zum Herunterladen und Weitergeben" : "im Vorgang für den Vertrieb sichtbar"}</span>}>
          <PlanFassungen plaene={gem.plaene} />
        </Abschnitt>
      )}

      <Abschnitt titel="Verlauf">
        <div className="space-y-1 text-xs" style={{ color: C.muted }}>
          {(b.verlauf || []).slice().reverse().map((v, i) => <div key={i}>{datum(v.d)} · {v.t} · {v.w}</div>)}
        </div>
      </Abschnitt>
    </div>
  );
}

/* Beschaffungsplan als PDF im EGC-Design */
function beschaffungPdf(b, mitarbeiter) {
  const gem = b.bewertung || {}, k = b.kunde || {};
  const sparten = spartenVon(b).filter((sp) => (bewertungVon(b, sp) || {}).ergebnis);
  const beginnJahr = (jahr) => { const s1 = jahr + "-01-01"; return b.lieferbeginn && b.lieferbeginn > s1 ? b.lieferbeginn : s1; };
  const z = [];
  z.push({ text: "Beschaffungsplan " + (k.firma || ""), gross: true });
  z.push([k.strasse, [k.plz, k.ort].filter(Boolean).join(" ")].filter(Boolean).join(", "));
  z.push("Modell: " + ((b.produkte || []).join(", ") || "Tranchen") + " · " + sparten.map((sp) => SPARTE_NAME[sp]).join(" und ")
    + " · Lieferzeitraum " + datum(b.lieferbeginn) + " bis " + datum(b.lieferende));
  z.push("");
  sparten.forEach((sp) => {
    const gas = sp === "gas";
    const bw = bewertungVon(b, sp), erg = bw.ergebnis || {};
    z.push({ text: SPARTE_NAME[sp], gross: true });
    z.push("Marktpreise vom " + datum(erg.marktStand) + ", Bewertung vom " + datum(erg.berechnet)
      + (erg.profil ? (gas ? ", mit Tagesprofil aus THE Day-Ahead" : ", mit Stundenprofil") : ""));
    (erg.jahre || []).forEach((j) => {
      const st = tranchenStand(bw.tranchen, j.jahr, j, bw.stress, heute());
      const a = ampel(st, j, { hoechstpreis: bw.hoechstpreis, gas }, beginnJahr(j.jahr), heute());
      z.push({ text: SPARTE_NAME[sp] + " · Lieferjahr " + j.jahr, gross: true });
      if (gas) {
        z.push("Menge " + num(j.menge, 0) + " MWh · Winteranteil " + num(j.winterAnteil * 100, 1) + " % · Absicherung mit Monatsbändern");
        z.push("Cal " + num(j.calPreis, 2) + " €/MWh · Saisonanteil " + (j.saisonProMWh >= 0 ? "+" : "") + num(j.saisonProMWh, 2)
          + " €/MWh · Struktur " + num(j.strukturProMWh, 2) + " €/MWh · Lastgang gesamt " + num(j.hedgePreis + j.strukturProMWh, 2) + " €/MWh");
      } else {
        const hg = hedgeVon(erg.hedge);
        if (erg.basis === "spot") {
          z.push("Menge " + num(j.menge, 0) + " MWh · Spotbewertung ohne Absicherung");
          z.push("Lastgang zur Spot-PFC " + num(lastgangPreis(j), 2) + " €/MWh" + (erg.ae ? " · Ausgleichsenergie " + num(j.aeProMWh || 0, 2) + " €/MWh" : "")
            + " · Benutzungsstunden " + num(j.benutzung) + " h");
        } else {
          z.push("Menge " + num(j.menge, 0) + " MWh · " + (HEDGE_ARTEN.find((x) => x.id === hg.art) || HEDGE_ARTEN[0]).name + " mit "
            + (hg.produkt === "monat" ? "Monatsprodukten" : hg.produkt === "quartal" ? "Quartalsprodukten" : "Cal-Produkten") + ", " + num((j.hedgeQuote == null ? 1 : j.hedgeQuote) * 100, 0)
            + " % abgesichert · im Mittel " + num(j.baseMW, 3) + " MW Base, " + num(j.peakMW, 3) + " MW Peak und " + num(j.offpeakMW || 0, 3) + " MW Offpeak");
          z.push("Absicherung heute " + num(j.hedgePreis, 2) + " €/MWh · Struktur/Rest " + num(j.strukturProMWh, 2) + " €/MWh"
            + (erg.ae ? " · Ausgleichsenergie " + num(j.aeProMWh || 0, 2) + " €/MWh" : "") + " · Lastgang gesamt "
            + num(lastgangPreis(j) + (erg.ae ? j.aeProMWh || 0 : 0), 2) + " €/MWh · Benutzungsstunden " + num(j.benutzung) + " h");
        }
      }
      z.push("Gesichert " + num(st.gekauftAnteil * 100) + " %" + (st.gekauftAnteil ? " zu " + num(st.gekauftPreis, 2) + " €/MWh" : "")
        + " · Energiepreis aktuell " + num(st.preis, 2) + " €/MWh (± " + (bw.stress || 0) + " %: " + num(st.preisTief, 2) + " bis " + num(st.preisHoch, 2) + ")");
      z.push("Einschätzung: " + AMPEL_TEXT[a.stufe] + (a.gruende.length ? " – " + a.gruende.join(", ") : ""));
      const tr = (bw.tranchen || []).filter((t) => +t.jahr === +j.jahr).sort((x, y) => String(x.datum).localeCompare(String(y.datum)));
      tr.forEach((t, i) => {
        const preis = t.preis ? t.preis + " €/MWh" : t.preisBase ? "Base " + t.preisBase + " / Peak " + (t.preisPeak || "–") + " €/MWh" : "";
        z.push((i + 1) + ". Tranche " + datum(t.datum) + " · " + (t.anteil || "–") + " %" + (gas && t.produkt ? " · " + t.produkt : "")
          + " · " + (t.status || "geplant") + (preis ? " · " + preis : "") + (t.notiz ? " · " + t.notiz : ""));
      });
      z.push("");
    });
    if (bw.hoechstpreis) { z.push("Budgetgrenze " + SPARTE_NAME[sp] + ": " + bw.hoechstpreis + " €/MWh"); z.push(""); }
  });
  if (gem.empfehlung) { z.push({ text: "Empfehlung", gross: true }); z.push(gem.empfehlung); z.push(""); }
  z.push("Alle Preise netto für die Energie, ohne Netzentgelte, Abgaben, Umlagen und Aufschläge des Versorgers. Die Tranchen werden beim Versorger des Kunden im vereinbarten Beschaffungsmodell abgerufen. Marktpreise sind Momentaufnahmen und können sich täglich ändern."
    + (sparten.includes("gas") ? " Erdgas je Gastag (6 bis 6 Uhr), Marktgebiet THE." : ""));
  return erzeugePdf("beschaffungsplan_" + String(k.firma || b.anfrageId).replace(/[^\wäöüÄÖÜß]+/g, "_") + ".pdf",
    "Beschaffungsplan", z);
}

export {
  AMPEL_FARBE, AMPEL_TEXT, AbsicherungsGrafik, AnalyseGrafik, BESCHAFFUNG_ROLLEN_BEARBEITEN, BESCHAFFUNG_STATUS, BUNDESLAENDER, Beschaffung,
  BeschaffungDetail, BeschaffungKarte, FEIERTAGE_CACHE, FREI_LEER, FreiKundeFormular, GAS_SOMMER, GAS_WINTER, GasMonatsGrafik,
  GasTagesGrafik, HEDGE_ARTEN, HEDGE_PRODUKTE, HEDGE_STUFEN, JAHRES_CACHE, KleinFeld, MONATSFORM_BASE, MONATSFORM_GAS,
  MONATSFORM_PEAK, MONATSNAMEN_LANG, MonatsBalken, PlanFassungen, SPARTE_NAME, STROM_PRODUKTE, STROM_STAND, SpotpreiseKarte,
  WOCHENTAG, ZEIT_DE, aeNaeherung, ampel, ampelGesamt, analyseJahr, analyseJahrGas, analyseSumme,
  beschaffungPdf, beschaffungsAuftragAus, bewertungVon, datumDe, erzeugeXlsxMappe, feiertage, formAufStunden, freierBeschaffungsAuftrag,
  gasForm, gasFormAusDateien, gasJahresLast, gasMappe, gasPreiseAus, gasSpotLaden, gasTage, gasTagesmengen,
  gaskurve, hedgeVon, individuelleProdukte, jahreAnpassen, jahresBewertung, jahresBewertungGas, jahresLast, jahresStunden,
  lastform, lastformAusDateien, lastgangPreis, leereBewertung, leeresJahr, lieferjahreAus, lieferzeitraum, mittelVon,
  ostersonntag, preiseAufJahr, preiseStromAus, preiskurve, preisreiheAusDatei, preisreiheEnergyCharts, preisreiheRohAusDatei, produktName,
  profilAusGasPreisen, profilAusPreisen, r3, rundeTief, spartenVon, stromBestand, stromBestandLaden, stromMappe,
  stromSpotLaden, stundenmittel, tagSchluessel, tagesart, tranchenStand, tranchenVorschlag, zahlOder, zeitTeile,
  zeitstempelAmEnde,
};
