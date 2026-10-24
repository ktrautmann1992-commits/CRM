/* ------------------------------------------------------------------ */
/*  Anbindung an Supabase                                              */
/*                                                                     */
/*  Die App hält ihre Daten weiterhin als Listen im React-Zustand.     */
/*  Diese Datei gleicht diese Listen mit der Datenbank ab:             */
/*  - laden: alle Datensätze, die die eigene Rolle sehen darf          */
/*  - abgleichen: geänderte Datensätze schreiben, entfernte löschen    */
/*  - Live-Abgleich: Änderungen anderer kommen sofort an               */
/*  Welche Rolle was sehen und ändern darf, entscheidet der Server     */
/*  (Zeilenrechte in der Datenbank), nicht diese Datei.                */
/* ------------------------------------------------------------------ */
import { createClient } from "@supabase/supabase-js";

export const SUPABASE_URL = "https://elpkrgxooqosfsrlnbcy.supabase.co";
/* Öffentlicher Schlüssel. Er darf im Code stehen; geschützt wird über die Zeilenrechte. */
const SUPABASE_SCHLUESSEL = "sb_publishable_fS2t44dRBAf5wJLjCE8teg_8cj8P6vV";

export const sb = createClient(SUPABASE_URL, SUPABASE_SCHLUESSEL, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
});

const BUCKET = "dateien";

/* ---------- Sammlungen und ihre Tabellen ----------
   Jede Sammlung ist im Zustand eine Liste von Datensätzen mit `id`.
   In der Datenbank steht je Datensatz eine Zeile (id, daten).
   `abspalten`: Felder, die in einer eigenen, strenger geschützten Tabelle liegen. */
export const SAMMLUNGEN = {
  anfragen:   { tabelle: "anfragen", neuOben: true, abspalten: { provisionErhalten: "anfragen_intern" } },
  leads:      { tabelle: "leads", neuOben: true },
  ablage:     { tabelle: "ablage", neuOben: true },
  versorger:  { tabelle: "versorger", abspalten: { anteil: "versorger_intern" } },
  tickets:    { tabelle: "tickets", neuOben: true },
  smartmeter: { tabelle: "smartmeter", neuOben: true },
  probleme:   { tabelle: "probleme", neuOben: true },
  termine:    { tabelle: "termine" },
  akquise:    { tabelle: "akquise", neuOben: true },
  aufgaben:   { tabelle: "aufgaben" },
  protokoll:  { tabelle: "protokoll" },
  tippgeber:  { tabelle: "tippgeber" },
};

/* Mitarbeiter sind auf drei Tabellen verteilt:
   mitarbeiter (für alle sichtbar), mitarbeiter_konditionen (Sätze, Ziele)
   und mitarbeiter_stammdaten (Bank, Ausweis). Die Einladungscodes liegen in `einladungen`. */
const MA_KONDITIONEN = ["satz", "eigenBonus", "ziele"];
const MA_STAMMDATEN = ["stammdaten", "pruefHinweis"];
const MA_EINLADUNG = ["einladung"];
const MA_NICHT_SPEICHERN = ["passwort"];

/* ---------- Dateien ----------
   Hochgeladene Dateien liegen in der App als { name, typ, groesse, url: "data:…" }.
   Vor dem Speichern wandern sie in den Dateispeicher; in der Datenbank steht dann
   { name, typ, groesse, pfad }. Der Pfad beginnt mit Tabelle und Datensatz,
   so gelten für die Datei dieselben Rechte wie für den Datensatz. */
const abgelegt = new Map(); /* data:-URL → abgelegtes Dateiobjekt */

const sichererName = (n) =>
  String(n || "datei").normalize("NFKD").replace(/[^\w.\-]+/g, "_").slice(-80);

const zufall = () => Math.random().toString(36).slice(2, 10);

async function dateiHochladen(tabelle, id, d) {
  const schon = abgelegt.get(d.url);
  if (schon) return schon;
  const teile = String(d.url).split(",");
  const typ = (teile[0].match(/data:([^;]+)/) || [])[1] || d.typ || "application/octet-stream";
  const roh = atob(teile[1] || "");
  const feld = new Uint8Array(roh.length);
  for (let i = 0; i < roh.length; i++) feld[i] = roh.charCodeAt(i);
  const pfad = tabelle + "/" + id + "/" + zufall() + "-" + sichererName(d.name);
  const { error } = await sb.storage.from(BUCKET).upload(pfad, new Blob([feld], { type: typ }),
    { contentType: typ, upsert: false });
  if (error) throw error;
  const neu = { name: d.name, typ: d.typ || typ, groesse: d.groesse || feld.length, pfad };
  abgelegt.set(d.url, neu);
  return neu;
}

const istDatei = (x) =>
  x && typeof x === "object" && !Array.isArray(x) && typeof x.url === "string" && x.url.startsWith("data:");

/* ersetzt verschachtelt alle Dateien durch abgelegte; ohne Hochladen, nur aus dem Zwischenspeicher */
function ersetzeBekannte(wert) {
  if (Array.isArray(wert)) return wert.map(ersetzeBekannte);
  if (istDatei(wert)) return abgelegt.get(wert.url) || wert;
  if (wert && typeof wert === "object") {
    const o = {};
    for (const k of Object.keys(wert)) o[k] = ersetzeBekannte(wert[k]);
    return o;
  }
  return wert;
}

async function ablegen(tabelle, id, wert) {
  if (Array.isArray(wert)) {
    const r = [];
    for (const x of wert) r.push(await ablegen(tabelle, id, x));
    return r;
  }
  if (istDatei(wert)) return dateiHochladen(tabelle, id, wert);
  if (wert && typeof wert === "object") {
    const o = {};
    for (const k of Object.keys(wert)) o[k] = await ablegen(tabelle, id, wert[k]);
    return o;
  }
  return wert;
}

/* Inhalt einer abgelegten Datei als data:-URL holen (für Vorschau, PDF, Einlesen) */
const geladen = new Map();
export async function dateiInhalt(datei) {
  if (!datei) return null;
  if (datei.url) return datei.url;
  if (!datei.pfad) return null;
  if (geladen.has(datei.pfad)) return geladen.get(datei.pfad);
  const { data, error } = await sb.storage.from(BUCKET).download(datei.pfad);
  if (error) throw error;
  const url = await new Promise((fertig, fehler) => {
    const r = new FileReader();
    r.onload = () => fertig(r.result);
    r.onerror = fehler;
    r.readAsDataURL(data);
  });
  geladen.set(datei.pfad, url);
  return url;
}

/* ---------- Abgleich ---------- */
const stand = {}; /* tabelle → Map(id → JSON des zuletzt gespeicherten Stands) */
const standVon = (t) => (stand[t] = stand[t] || new Map());

function zerlegeMitarbeiter(m) {
  const basis = {}, kond = {}, stamm = {}, einl = {};
  for (const k of Object.keys(m)) {
    if (MA_NICHT_SPEICHERN.includes(k)) continue;
    if (MA_EINLADUNG.includes(k)) { if (m[k]) einl[k] = m[k]; }
    else if (MA_KONDITIONEN.includes(k)) kond[k] = m[k];
    else if (MA_STAMMDATEN.includes(k)) stamm[k] = m[k];
    else basis[k] = m[k];
  }
  return { basis, kond, stamm, einl };
}

/* Zeilen einer Sammlung in die Teil-Tabellen zerlegen: [{ tabelle, id, daten }] */
function zeilenVon(name, liste) {
  const zeilen = [];
  if (name === "mitarbeiter") {
    for (const m of liste) {
      const { basis, kond, stamm, einl } = zerlegeMitarbeiter(m);
      zeilen.push({ tabelle: "mitarbeiter", id: m.id, daten: basis });
      zeilen.push({ tabelle: "mitarbeiter_konditionen", id: m.id, daten: kond });
      zeilen.push({ tabelle: "mitarbeiter_stammdaten", id: m.id, daten: stamm });
      zeilen.push({ tabelle: "einladungen", id: m.id, daten: einl });
    }
    return zeilen;
  }
  const s = SAMMLUNGEN[name];
  for (const x of liste) {
    if (!x || !x.id) continue;
    const haupt = { ...x };
    for (const [feld, tab] of Object.entries(s.abspalten || {})) {
      const wert = haupt[feld];
      delete haupt[feld];
      zeilen.push({ tabelle: tab, id: x.id, daten: wert == null ? {} : { [feld]: wert } });
    }
    zeilen.unshift({ tabelle: s.tabelle, id: x.id, daten: haupt });
  }
  return zeilen;
}

/* Tabellen, die zu einer Sammlung gehören (Haupttabelle zuerst) */
function tabellenVon(name) {
  if (name === "mitarbeiter")
    return ["mitarbeiter", "mitarbeiter_konditionen", "mitarbeiter_stammdaten", "einladungen"];
  const s = SAMMLUNGEN[name];
  return [s.tabelle, ...Object.values(s.abspalten || {})];
}

/* leer: nichts drin außer leeren Hüllen (z. B. Stammdaten, die man nicht sehen darf) */
const ohneDaten = (zeile) =>
  !zeile.daten || Object.values(zeile.daten).every((w) =>
    w == null || w === "" || (typeof w === "object" && !Array.isArray(w) && Object.keys(w).length === 0));

/* Vergleicht die Liste mit dem gespeicherten Stand und schreibt die Unterschiede.
   Gibt eine Liste von Fehlermeldungen zurück (leer, wenn alles geklappt hat). */
export async function abgleichen(name, liste) {
  const fehler = [];
  const zeilen = zeilenVon(name, liste || []);
  const haupt = tabellenVon(name)[0];
  const vorhanden = new Set(zeilen.filter((z) => z.tabelle === haupt).map((z) => z.id));

  for (const z of zeilen) {
    const st = standVon(z.tabelle);
    const vorher = st.get(z.id);
    const schnell = JSON.stringify(ersetzeBekannte(z.daten));
    if (vorher === schnell) continue;
    /* Teil-Tabellen nur schreiben, wenn es dort etwas gibt oder vorher etwas gab */
    if (z.tabelle !== haupt && vorher === undefined && ohneDaten(z)) continue;
    try {
      const daten = await ablegen(z.tabelle, z.id, z.daten);
      const json = JSON.stringify(daten);
      if (json === vorher) { continue; }
      const { error } = await sb.from(z.tabelle).upsert({ id: z.id, daten }, { onConflict: "id" });
      if (error) throw error;
      st.set(z.id, json);
    } catch (e) {
      fehler.push({ tabelle: z.tabelle, id: z.id, meldung: (e && e.message) || String(e) });
    }
  }

  /* entfernte Datensätze löschen (nur in der Haupttabelle; Teil-Tabellen hängen per Fremdschlüssel daran) */
  const st = standVon(haupt);
  for (const id of [...st.keys()]) {
    if (vorhanden.has(id)) continue;
    const { error } = await sb.from(haupt).delete().eq("id", id);
    if (error) fehler.push({ tabelle: haupt, id, meldung: error.message });
    else for (const t of tabellenVon(name)) standVon(t).delete(id);
  }
  return fehler;
}

/* Lädt eine Sammlung vollständig. Gibt die Liste zurück (leer, wenn es nichts gibt). */
export async function laden(name) {
  const tabellen = tabellenVon(name);
  const neuOben = !!(SAMMLUNGEN[name] && SAMMLUNGEN[name].neuOben);
  const ergebnisse = await Promise.all(tabellen.map((t) => alleZeilen(t, neuOben)));
  const [haupt, ...teile] = ergebnisse;
  const teilMaps = teile.map((zeilen) => new Map(zeilen.map((z) => [z.id, z.daten || {}])));
  tabellen.forEach((t, i) => {
    const st = standVon(t);
    st.clear();
    for (const z of ergebnisse[i]) st.set(z.id, JSON.stringify(z.daten || {}));
  });
  return haupt
    .map((z) => Object.assign({ id: z.id }, z.daten, ...teilMaps.map((m) => m.get(z.id) || {})));
}

async function alleZeilen(tabelle, neuOben) {
  const alle = [];
  for (let von = 0; ; von += 1000) {
    const { data, error } = await sb.from(tabelle).select("id, daten")
      .order("erstellt", { ascending: !neuOben }).order("id").range(von, von + 999);
    if (error) throw error;
    alle.push(...data);
    if (data.length < 1000) break;
  }
  return alle;
}

/* ---------- Einstellungen (Schlüssel → Wert) ---------- */
const einstellungStand = new Map();
export async function einstellungenLaden() {
  const { data, error } = await sb.from("einstellungen").select("schluessel, wert");
  if (error) throw error;
  const o = {};
  for (const z of data) {
    o[z.schluessel] = z.wert;
    einstellungStand.set(z.schluessel, JSON.stringify(z.wert));
  }
  return o;
}

export async function einstellungSpeichern(schluessel, wert) {
  const json = JSON.stringify(wert);
  if (einstellungStand.get(schluessel) === json) return null;
  const { error } = await sb.from("einstellungen").upsert({ schluessel, wert }, { onConflict: "schluessel" });
  if (error) return error.message;
  einstellungStand.set(schluessel, json);
  return null;
}

/* ---------- Live-Abgleich ----------
   meldet geänderte Tabellen; die App lädt die betroffene Sammlung dann neu. */
export function liveAbgleich(beiAenderung) {
  const kanal = sb.channel("egc-live");
  const tabellen = new Set(["einstellungen", ...tabellenVon("mitarbeiter"),
    ...Object.keys(SAMMLUNGEN).flatMap(tabellenVon)]);
  for (const t of tabellen)
    kanal.on("postgres_changes", { event: "*", schema: "public", table: t }, (p) => beiAenderung(t, p));
  kanal.subscribe();
  return () => sb.removeChannel(kanal);
}

/* Zu welcher Sammlung gehört eine Tabelle? */
export function sammlungVon(tabelle) {
  if (tabellenVon("mitarbeiter").includes(tabelle)) return "mitarbeiter";
  if (tabelle === "einstellungen") return "einstellungen";
  return Object.keys(SAMMLUNGEN).find((n) => tabellenVon(n).includes(tabelle)) || null;
}

/* Ist ein Datensatz aus dem Live-Abgleich schon auf unserem Stand? Dann nichts neu laden. */
export function schonBekannt(tabelle, zeile) {
  if (!zeile || !zeile.id) return false;
  if (tabelle === "einstellungen") return einstellungStand.get(zeile.schluessel) === JSON.stringify(zeile.wert);
  return standVon(tabelle).get(zeile.id) === JSON.stringify(zeile.daten || {});
}

/* ---------- Anmeldung ---------- */
export async function anmelden(email, passwort) {
  const { data, error } = await sb.auth.signInWithPassword({ email: email.trim().toLowerCase(), password: passwort });
  if (error) throw error;
  return data.session;
}

export async function abmelden() {
  await sb.auth.signOut();
  for (const k of Object.keys(stand)) stand[k].clear();
  einstellungStand.clear();
}

/* Einladung einlösen oder Passwort neu setzen – läuft über eine Server-Funktion,
   weil nur der Server Zugänge anlegen darf. */
export async function einladungPruefen(code) {
  const { data, error } = await sb.functions.invoke("einladung", { body: { aktion: "pruefen", code } });
  if (error) throw new Error(await fehlertext(error));
  return data;
}

export async function einladungEinloesen(code, passwort) {
  const { data, error } = await sb.functions.invoke("einladung", { body: { aktion: "einloesen", code, passwort } });
  if (error) throw new Error(await fehlertext(error));
  return data;
}

async function fehlertext(error) {
  try {
    const j = await error.context.json();
    if (j && j.fehler) return j.fehler;
  } catch (e) { /* kein JSON */ }
  return error.message || "Unbekannter Fehler";
}
