/* Akquise, Leads und Kalender des Vertriebs.
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
  AKQ_STATUS, Btn, C, Datei, Feld, Kalender, Kunden, Leads,
  Liste, Select, TERMINFORM, csvLesen, datum, dubletten, firmaSchluessel, heute,
  ladePlz, luftlinie, plzVon, spaltenZuordnen, strukturUnter, uid, xlsxLesen, zugewiesenAn,
} from "./App.jsx";
import { Branchen } from "./verwaltung.jsx";

function Akquise({ listen, setListen, user, mitarbeiter, onKunde, onTermin, leads = [], anfragen = [] }) {
  const [branche, setBranche] = useState("");
  const [zeigeUebernommene, setZeigeUebernommene] = useState(false);
  const [trotzdem, setTrotzdem] = useState([]);
  const [maske, setMaske] = useState(null);
  const [neuOffen, setNeuOffen] = useState(false);
  const [datei, setDatei] = useState(null);
  const [neuBranche, setNeuBranche] = useState("");
  const [neuName, setNeuName] = useState("");
  const [neuPartner, setNeuPartner] = useState([]);
  const [fehler, setFehler] = useState("");
  const [laedt, setLaedt] = useState(false);
  const [vorschau, setVorschau] = useState(null); /* eingelesene Liste vor der Übernahme */
  const [dublettenMit, setDublettenMit] = useState(false);

  const darfPflegen = ["Leadmanagement", "Geschäftsführung", "Leitung Vertrieb"].includes(user.rolle);
  const meineIds = user.rolle === "Teamleiter"
    ? [user.id, ...strukturUnter(user.id, mitarbeiter).map((m) => m.id)]
    : [user.id];
  /* Vertrieb sieht nur die ihm zugewiesenen Listen */
  const sichtbareListen = darfPflegen ? listen
    : listen.filter((l) => zugewiesenAn(l).some((id) => meineIds.includes(id)));
  const branchen = [...new Set(sichtbareListen.flatMap((l) =>
    l.eintraege.map((e) => e.branche || l.branche)).filter(Boolean))].sort();
  const alleEintraege = sichtbareListen.flatMap((l) =>
    l.eintraege.map((e) => ({ ...e, listeId: l.id, branche: e.branche || l.branche })))
    .filter((e) => !branche || e.branche === branche);
  const uebernommen = alleEintraege.filter((e) => e.status === "kunde");
  const eintraegeOhneUmkreis = zeigeUebernommene ? alleEintraege
    : alleEintraege.filter((e) => e.status !== "kunde");

  /* Umkreis: Mittelpunkt aus PLZ oder Handy-Standort, Entfernung je Kontakt über dessen PLZ */
  const umkreisSchluessel = "egc-umkreis:" + user.id;
  const [umkreis, setUmkreisRoh] = useState(() => {
    try { return JSON.parse(localStorage.getItem(umkreisSchluessel)) || null; } catch (e) { return null; }
  });
  const setUmkreis = (u) => {
    setUmkreisRoh(u);
    try { localStorage.setItem(umkreisSchluessel, JSON.stringify(u)); } catch (e) { /* ohne Speicher weiter */ }
  };
  const [plzDaten, setPlzDaten] = useState(null);
  const [umkreisMeldung, setUmkreisMeldung] = useState("");
  const umkreisAn = !!(umkreis && umkreis.aktiv);
  useEffect(() => {
    if (umkreisAn && !plzDaten) ladePlz().then(setPlzDaten).catch((e) => setUmkreisMeldung(e.message));
  }, [umkreisAn, plzDaten]);
  const mitte = !umkreisAn || !plzDaten ? null
    : umkreis.quelle === "standort" && umkreis.lat ? [umkreis.lat, umkreis.lon]
    : plzDaten[String(umkreis.plz || "").trim()] || null;
  const ohneOrt = mitte ? eintraegeOhneUmkreis.filter((e) => !plzDaten[plzVon(e)]).length : 0;
  const eintraege = !mitte ? eintraegeOhneUmkreis
    : eintraegeOhneUmkreis
      .map((e) => ({ ...e, km: plzDaten[plzVon(e)] ? luftlinie(mitte, plzDaten[plzVon(e)]) : null }))
      .filter((e) => e.km !== null && e.km <= (umkreis.km || 50))
      .sort((x, y) => x.km - y.km);
  const standortHolen = () => {
    setUmkreisMeldung("");
    if (!navigator.geolocation) { setUmkreisMeldung("Dieses Gerät gibt keinen Standort heraus. Bitte die PLZ eingeben."); return; }
    setUmkreisMeldung("Standort wird ermittelt …");
    navigator.geolocation.getCurrentPosition(
      (pos) => { setUmkreis({ ...umkreis, aktiv: true, quelle: "standort", lat: pos.coords.latitude, lon: pos.coords.longitude }); setUmkreisMeldung(""); },
      () => setUmkreisMeldung("Der Standort wurde nicht freigegeben. Bitte die PLZ eingeben oder die Standortfreigabe für den Browser erlauben."),
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 600000 });
  };
  const empfaenger = mitarbeiter.filter((m) =>
    ["Vertriebspartner", "Teamleiter", "Leitung Vertrieb"].includes(m.rolle) && m.status === "aktiv");

  const setzEintrag = (listeId, eintragId, aend) =>
    setListen(listen.map((l) => l.id !== listeId ? l
      : { ...l, eintraege: l.eintraege.map((e) => (e.id === eintragId ? { ...e, ...aend } : e)) }));

  /* Bekannte Firmen für die Dublettenprüfung: Kunden und Vorgänge, Leads, Einträge aller Listen */
  const bekannt = () => {
    const m = new Map();
    const merke = (firma, plz, wo) => {
      const k = firmaSchluessel(firma);
      if (!k) return;
      if (!m.has(k)) m.set(k, []);
      m.get(k).push({ plz: String(plz || "").trim(), wo });
    };
    anfragen.forEach((a) => a.kunde && merke(a.kunde.firma, a.kunde.plz, "Vorgang " + a.id));
    leads.forEach((l) => merke(l.firma, l.plz, "Lead " + l.id));
    listen.forEach((l) => l.eintraege.forEach((e) =>
      merke(e.firma, e.plz || (String(e.adresse || "").match(/\b\d{5}\b/) || [""])[0], "Liste „" + l.name + "“")));
    return m;
  };

  const einlesen = async () => {
    setFehler(""); setLaedt(true);
    try {
      const istExcel = /\.xlsx?$/i.test(datei.name);
      const zeilen = istExcel ? await xlsxLesen(datei) : await csvLesen(datei);
      if (zeilen.length < 2) throw new Error("Die Datei enthält keine Daten.");
      const sp = spaltenZuordnen(zeilen[0]);
      if (sp.firma < 0) throw new Error("Keine Spalte „Firma“ gefunden. Die erste Zeile muss die Spaltennamen enthalten.");
      if (sp.ansprechpartner < 0)
        throw new Error("Keine Spalte „Ansprechpartner“ gefunden. Ohne Ansprechpartner wird keine Liste übernommen.");
      const w = (z, i) => (i >= 0 ? String(z[i] || "").trim() : "");
      const kennt = bekannt();
      const inDatei = new Set();
      const gelesen = zeilen.slice(1).map((z) => {
        const plz = w(z, sp.plz) || (w(z, sp.adresse).match(/\b\d{5}\b/) || [""])[0];
        const ort = w(z, sp.ort);
        const strasse = sp.strasse >= 0 ? w(z, sp.strasse) : "";
        const adresse = sp.adresse >= 0 && sp.adresse !== sp.strasse
          ? w(z, sp.adresse)
          : [strasse, [plz, ort].filter(Boolean).join(" ")].filter(Boolean).join(", ");
        const e = {
          id: uid(), firma: w(z, sp.firma), ansprechpartner: w(z, sp.ansprechpartner), position: w(z, sp.position),
          telefon: w(z, sp.telefon), email: w(z, sp.email), adresse, strasse, plz, ort,
          branche: w(z, sp.branche), website: w(z, sp.website),
          status: "offen", bearbeiterId: null, bearbeiter: "", notiz: "",
          daten: { verbrauchStrom: "", verbrauchGas: "", versorger: "", laufzeit: "" },
          termin: null,
        };
        const k = firmaSchluessel(e.firma);
        const treffer = (kennt.get(k) || []).filter((t) => !t.plz || !plz || t.plz === plz);
        if (inDatei.has(k + "|" + plz)) treffer.push({ wo: "doppelt in dieser Datei" });
        inDatei.add(k + "|" + plz);
        return { e, dublette: treffer.map((t) => t.wo) };
      }).filter((x) => x.e.firma);
      if (!gelesen.length) throw new Error("Keine Firmennamen erkannt.");
      setVorschau({
        gut: gelesen.filter((x) => x.e.ansprechpartner && !x.dublette.length).map((x) => x.e),
        ohneAP: gelesen.filter((x) => !x.e.ansprechpartner).map((x) => x.e),
        dubletten: gelesen.filter((x) => x.e.ansprechpartner && x.dublette.length),
      });
      setDublettenMit(false);
    } catch (e) {
      setFehler(e.message || "Die Datei konnte nicht gelesen werden.");
    }
    setLaedt(false);
  };

  const uebernehmen = () => {
    const eintraegeNeu = [...vorschau.gut, ...(dublettenMit ? vorschau.dubletten.map((x) => x.e) : [])];
    setListen([{
      id: "AK-" + uid(), name: neuName || datei.name, branche: neuBranche.trim() || "Gemischt",
      hochgeladen: heute(), von: user.name, zugewiesen: neuPartner,
      eintraege: eintraegeNeu,
    }, ...listen]);
    setNeuOffen(false); setDatei(null); setNeuBranche(""); setNeuName(""); setNeuPartner([]); setVorschau(null);
  };

  /* ---------- Vorschau vor der Übernahme ---------- */
  if (neuOffen && vorschau) {
    const anzahl = vorschau.gut.length + (dublettenMit ? vorschau.dubletten.length : 0);
    const kurz = (e) => [e.ansprechpartner, e.adresse].filter(Boolean).join(" · ");
    return (
      <div>
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => setVorschau(null)} style={{ color: C.muted }} aria-label="Zurück"><ArrowLeft size={18} /></button>
          <h2 className="text-lg">Liste prüfen</h2>
        </div>
        <div className="space-y-4">
          <div className="rounded p-4" style={{ background: C.card, border: "1px solid " + C.ok }}>
            <div className="text-sm"><strong>{vorschau.gut.length}</strong> {vorschau.gut.length === 1 ? "Kontakt" : "Kontakte"} mit Ansprechpartner {vorschau.gut.length === 1 ? "wird" : "werden"} übernommen.</div>
          </div>
          {vorschau.ohneAP.length > 0 && (
            <div className="rounded p-4" style={{ background: "#FCF3F0", border: "1px solid " + C.warn }}>
              <div className="text-sm mb-2" style={{ color: C.warn }}>
                <strong>{vorschau.ohneAP.length}</strong> {vorschau.ohneAP.length === 1 ? "Zeile" : "Zeilen"} ohne Ansprechpartner {vorschau.ohneAP.length === 1 ? "wird" : "werden"} nicht übernommen.
                Ansprechpartner in der Datei ergänzen und die Liste erneut hochladen.
              </div>
              <ul className="text-xs space-y-1" style={{ color: C.text }}>
                {vorschau.ohneAP.map((e) => <li key={e.id}>{e.firma}{e.adresse ? " · " + e.adresse : ""}</li>)}
              </ul>
            </div>
          )}
          {vorschau.dubletten.length > 0 && (
            <div className="rounded p-4" style={{ background: "#FBF6EE", border: "1px solid " + C.gas }}>
              <div className="text-sm mb-2" style={{ color: C.gas }}>
                <strong>{vorschau.dubletten.length}</strong> {vorschau.dubletten.length === 1 ? "Firma ist schon bekannt und wird" : "Firmen sind schon bekannt und werden"} nicht übernommen,
                damit niemand doppelt anruft.
              </div>
              <ul className="text-xs space-y-1.5 mb-3" style={{ color: C.text }}>
                {vorschau.dubletten.map((x) => (
                  <li key={x.e.id}>{x.e.firma}{kurz(x.e) ? " · " + kurz(x.e) : ""}
                    <span className="block" style={{ color: C.muted }}>bereits vorhanden: {x.dublette.join(", ")}</span>
                  </li>
                ))}
              </ul>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={dublettenMit} onChange={(e) => setDublettenMit(e.target.checked)}
                  style={{ accentColor: C.gas }} />
                Trotzdem übernehmen
              </label>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Btn icon={Check} onClick={uebernehmen} disabled={!anzahl}>{anzahl} {anzahl === 1 ? "Kontakt" : "Kontakte"} übernehmen</Btn>
            <Btn variante="hell" onClick={() => setVorschau(null)}>Andere Datei wählen</Btn>
          </div>
        </div>
      </div>
    );
  }

  /* ---------- Liste hochladen ---------- */
  if (neuOffen)
    return (
      <div>
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => setNeuOffen(false)} style={{ color: C.muted }}><ArrowLeft size={18} /></button>
          <h2 className="text-lg">Kontaktliste hochladen</h2>
        </div>
        <div className="rounded p-5 space-y-4" style={{ background: C.card, border: "1px solid " + C.line }}>
          <p className="text-sm" style={{ color: C.muted, maxWidth: "62ch" }}>
            Die erste Zeile enthält die Spaltennamen. Pflicht sind <strong>Firma</strong> und
            <strong> Ansprechpartner</strong>; außerdem werden Position, Telefon, E-Mail, Straße, PLZ, Ort
            (oder Adresse), Branche und Website erkannt. Zeilen ohne Ansprechpartner und bereits bekannte
            Firmen zeigt das Portal vor der Übernahme an.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <Feld label="Branche (falls die Datei keine Spalte Branche hat)" value={neuBranche} onChange={setNeuBranche}
              placeholder="z. B. Hotellerie, Bäckereien, Autohäuser" />
            <Feld label="Bezeichnung der Liste" value={neuName} onChange={setNeuName}
              placeholder="z. B. Hotels Saarland September" />
          </div>
          <Datei label="Excel- oder CSV-Datei" datei={datei} onSet={setDatei} hinweis="Datei auswählen" />
          <div>
            <span className="block text-xs mb-2" style={{ color: C.muted }}>
              Liste zuweisen an ({neuPartner.length} ausgewählt)
            </span>
            <div className="grid sm:grid-cols-2 gap-2">
              {empfaenger.map((m) => (
                <label key={m.id} className="flex items-center gap-2 text-sm px-3 py-2 rounded"
                       style={{ border: "1px solid " + (neuPartner.includes(m.id) ? C.strom : C.line),
                                background: neuPartner.includes(m.id) ? "#F1F5FA" : "#fff" }}>
                  <input type="checkbox" checked={neuPartner.includes(m.id)}
                    onChange={() => setNeuPartner(neuPartner.includes(m.id)
                      ? neuPartner.filter((x) => x !== m.id) : [...neuPartner, m.id])}
                    style={{ accentColor: C.strom }} />
                  <span className="flex-1 truncate">{m.name}
                    <span className="block text-xs" style={{ color: C.muted }}>{m.rolle} · Team {m.team}</span>
                  </span>
                </label>
              ))}
            </div>
            <p className="text-xs mt-2" style={{ color: C.muted }}>
              Mehrfachauswahl möglich. Alle Zugewiesenen sehen dieselbe Liste; bearbeitete Kontakte
              sind für die anderen sofort als erledigt markiert, damit niemand doppelt anruft.
              Ohne Auswahl bleibt die Liste beim Leadmanagement liegen.
            </p>
          </div>
          {fehler && <p className="text-sm" style={{ color: C.warn }}>{fehler}</p>}
          <Btn icon={Check} onClick={einlesen} disabled={!datei || laedt}>
            {laedt ? "Wird eingelesen …" : "Liste prüfen"}
          </Btn>
        </div>
      </div>
    );

  /* ---------- Maske für Termin oder Wiedervorlage ---------- */
  const Maske = () => {
    const e = maske.eintrag;
    const [f, setF] = useState({
      datum: heute(), zeit: "10:00", art: "Telefonisch",
      verbrauchStrom: e.daten.verbrauchStrom, verbrauchGas: e.daten.verbrauchGas,
      versorger: e.daten.versorger, laufzeit: e.daten.laufzeit, notiz: e.notiz,
    });
    const istTermin = maske.art === "termin";
    return (
      <div className="rounded p-5 mb-5"
           style={{ background: C.card, border: "1px solid " + (istTermin ? C.ok : C.gas) }}>
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm">
            {istTermin ? "Termin ausgemacht" : "Wiedervorlage"} · {e.firma}
          </span>
          <button onClick={() => setMaske(null)} style={{ color: C.muted }}><X size={16} /></button>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <Feld label={istTermin ? "Termin am" : "Wiedervorlage am"} type="date" value={f.datum}
            onChange={(v) => setF({ ...f, datum: v })} />
          <Feld label="Uhrzeit" value={f.zeit} onChange={(v) => setF({ ...f, zeit: v })} placeholder="10:00" />
          {istTermin && (
            <Select label="Terminform" value={f.art} onChange={(v) => setF({ ...f, art: v })}
              options={TERMINFORM} />
          )}
        </div>

        <div className="text-sm mt-5 mb-3">Bereits erfragte Daten</div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Feld label="Jahresverbrauch Strom in kWh" value={f.verbrauchStrom} zahl
            onChange={(v) => setF({ ...f, verbrauchStrom: v })} />
          <Feld label="Jahresverbrauch Erdgas in kWh" value={f.verbrauchGas} zahl
            onChange={(v) => setF({ ...f, verbrauchGas: v })} />
          <Feld label="Aktueller Versorger" value={f.versorger}
            onChange={(v) => setF({ ...f, versorger: v })} />
          <Feld label="Vertrag läuft bis" type="date" value={f.laufzeit}
            onChange={(v) => setF({ ...f, laufzeit: v })} />
        </div>

        <label className="block mt-4">
          <span className="block text-xs mb-1" style={{ color: C.muted }}>Weitere Informationen</span>
          <textarea rows={3} value={f.notiz} onChange={(e2) => setF({ ...f, notiz: e2.target.value })}
            className="w-full px-3 py-2 text-sm rounded outline-none"
            style={{ border: "1px solid " + C.line }} />
        </label>

        <div className="flex flex-wrap gap-2 mt-4">
          <Btn variante={istTermin ? "ok" : "primär"} icon={Check}
            onClick={() => {
              setzEintrag(maske.listeId, e.id, {
                status: istTermin ? "termin" : "wiedervorlage",
                bearbeiterId: user.id, bearbeiter: user.name, notiz: f.notiz,
                daten: { verbrauchStrom: f.verbrauchStrom, verbrauchGas: f.verbrauchGas,
                         versorger: f.versorger, laufzeit: f.laufzeit },
                termin: { datum: f.datum, zeit: f.zeit, art: istTermin ? f.art : "Wiedervorlage" },
              });
              onTermin({
                titel: (istTermin ? "Termin " : "Wiedervorlage ") + e.firma,
                datum: f.datum, zeit: f.zeit, dauer: "60",
                ort: istTermin ? f.art : "Wiedervorlage",
                notiz: [f.versorger && "Versorger " + f.versorger, f.notiz].filter(Boolean).join(" · "),
              });
              setMaske(null);
            }}>
            Speichern und in den Kalender
          </Btn>
          <Btn variante="hell" onClick={() => setMaske(null)}>Abbrechen</Btn>
        </div>
      </div>
    );
  };

  /* ---------- Übersicht ---------- */
  const zahl = (st) => eintraege.filter((e) => e.status === st).length;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <p className="text-sm" style={{ color: C.muted, maxWidth: "50ch" }}>
          {darfPflegen
            ? "Kontaktlisten je Branche einspielen und einem Vertriebspartner zuweisen."
            : "Die dir zugewiesenen Kontaktlisten. Wähle eine Branche und arbeite sie ab."}
        </p>
        {darfPflegen && (
          <Btn icon={Plus} onClick={() => setNeuOffen(true)}>Kontaktliste hochladen</Btn>
        )}
      </div>

      <div className="rounded p-3 mb-5 grid sm:grid-cols-2 gap-3"
           style={{ background: C.card, border: "1px solid " + C.line }}>
        <Select label="Branche" value={branche} onChange={setBranche}
          options={[{ value: "", label: "Alle Branchen" }, ...branchen]} />
        <div className="sm:col-span-2 rounded p-3" style={{ background: "#F6F8FA", border: "1px solid " + C.line }}>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={umkreisAn} style={{ accentColor: C.strom }}
              onChange={(e) => setUmkreis({ km: 50, quelle: "plz", plz: (user.stammdaten && user.stammdaten.plz) || "", ...(umkreis || {}), aktiv: e.target.checked })} />
            Nur Kontakte im Umkreis anzeigen
          </label>
          {umkreisAn && (
            <div className="mt-3 space-y-3">
              <div className="flex flex-wrap items-end gap-2">
                <label className="block">
                  <span className="block text-xs mb-1" style={{ color: C.muted }}>Postleitzahl</span>
                  <input value={umkreis.quelle === "standort" ? "" : (umkreis.plz || "")} inputMode="numeric" maxLength={5}
                    placeholder={umkreis.quelle === "standort" ? "Standort" : "z. B. 76870"}
                    onChange={(e) => setUmkreis({ ...umkreis, quelle: "plz", plz: e.target.value.replace(/\D/g, "").slice(0, 5) })}
                    className="w-28 px-3 py-2 text-sm rounded outline-none" style={{ border: "1px solid " + C.line, background: "#fff" }} />
                </label>
                <button onClick={standortHolen} className="px-3 py-2 rounded text-sm"
                  style={{ border: "1px solid " + (umkreis.quelle === "standort" ? C.strom : C.line), background: "#fff",
                           color: umkreis.quelle === "standort" ? C.strom : C.text }}>
                  Mein Standort
                </button>
              </div>
              <label className="block">
                <span className="block text-xs mb-1" style={{ color: C.muted }}>Umkreis: <strong style={{ color: C.text }}>{umkreis.km || 50} km</strong></span>
                <input type="range" min={5} max={150} step={5} value={umkreis.km || 50} className="w-full"
                  onChange={(e) => setUmkreis({ ...umkreis, km: Number(e.target.value) })} style={{ accentColor: C.strom }} />
              </label>
              <p className="text-xs" style={{ color: umkreisMeldung ? C.warn : C.muted }}>
                {umkreisMeldung
                  || (!plzDaten ? "Postleitzahlen werden geladen …"
                    : !mitte ? "Diese Postleitzahl ist nicht bekannt. Bitte prüfen."
                    : eintraege.length + " Kontakte im Umkreis von " + (umkreis.km || 50) + " km"
                      + (umkreis.quelle === "standort" ? " um deinen Standort" : " um " + umkreis.plz)
                      + ", nach Entfernung sortiert" + (ohneOrt ? "; " + ohneOrt + " ohne erkennbare PLZ ausgeblendet" : "") + ".")}
              </p>
              <p className="text-xs" style={{ color: C.muted }}>
                Luftlinie zum Mittelpunkt der Postleitzahl, auf wenige Kilometer genau. Postleitzahlen: GeoNames (geonames.org), CC BY 4.0.
              </p>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xs" style={{ color: C.muted }}>
          <span>{eintraege.length} Kontakte</span>
          <span style={{ color: C.strom }}>{zahl("kontakt")} in Kontakt</span>
          <span style={{ color: C.ok }}>{zahl("termin")} Termine</span>
          <span style={{ color: C.gas }}>{zahl("wiedervorlage")} Wiedervorlagen</span>
          <span>{zahl("offen")} offen</span>
          {uebernommen.length > 0 && (
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={zeigeUebernommene}
                onChange={(e) => setZeigeUebernommene(e.target.checked)}
                style={{ accentColor: C.ink }} />
              {uebernommen.length} übernommene anzeigen
            </label>
          )}
        </div>
      </div>

      {maske && <Maske />}

      {eintraege.length === 0 ? (
        <div className="rounded p-8 text-center text-sm"
             style={{ border: "1px dashed " + C.line, color: C.muted }}>
          {sichtbareListen.length === 0
            ? (darfPflegen ? "Noch keine Kontaktlisten eingespielt."
               : "Dir wurde noch keine Kontaktliste zugewiesen.")
            : "Keine Kontakte in dieser Branche."}
        </div>
      ) : (
        <div className="space-y-2">
          {eintraege.map((e) => {
            const st = AKQ_STATUS[e.status] || AKQ_STATUS.offen;
            const fremd = e.bearbeiterId && e.bearbeiterId !== user.id;
            const offenLegen = trotzdem.includes(e.id);
            return (
              <div key={e.id} className="rounded p-4"
                   style={{ background: e.status === "kunde" ? "#F4F6F8" : C.card,
                            opacity: fremd ? 0.85 : 1,
                            border: "1px solid " + (e.status === "offen" ? C.line : st.color) }}>
                <div className="flex flex-wrap items-start gap-3">
                  <div className="flex-1 min-w-48">
                    <button onClick={() => onKunde(e)} className="text-left">
                      <span className="text-sm" style={{ color: C.strom }}>{e.firma}</span>
                    </button>
                    <div className="text-xs mt-1" style={{ color: C.muted }}>
                      {[e.km != null && (e.km < 2 ? "unter 2 km" : Math.round(e.km) + " km"), e.ansprechpartner && (e.ansprechpartner + (e.position ? " (" + e.position + ")" : "")), e.adresse, e.branche].filter(Boolean).join(" · ")}
                    </div>
                    <div className="flex flex-wrap gap-3 mt-2">
                      {e.telefon && (
                        <a href={"tel:" + e.telefon.replace(/[^+\d]/g, "")}
                           className="text-sm px-2 py-1 rounded"
                           style={{ border: "1px solid " + C.line, color: C.strom }}>
                          {e.telefon}
                        </a>
                      )}
                      {e.website && (
                        <a href={/^https?:/.test(e.website) ? e.website : "https://" + e.website}
                           target="_blank" rel="noreferrer" className="text-sm px-2 py-1 rounded"
                           style={{ border: "1px solid " + C.line, color: C.muted }}>
                          Website
                        </a>
                      )}
                    </div>
                  </div>
                  <span className="text-right">
                    <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: st.color }}>
                      <span className="w-2 h-2 rounded-full" style={{ background: st.color }} />{st.label}
                    </span>
                    {e.bearbeiter && (
                      <span className="block text-xs mt-0.5" style={{ color: C.muted }}>
                        {e.bearbeiterId === user.id ? "von dir" : e.bearbeiter}
                      </span>
                    )}
                  </span>
                </div>

                {e.termin && (
                  <p className="text-xs mt-2" style={{ color: st.color }}>
                    {e.termin.art} am {datum(e.termin.datum)} um {e.termin.zeit} Uhr
                    {e.bearbeiter ? " · " + e.bearbeiter : ""}
                  </p>
                )}
                {e.notiz && <p className="text-sm mt-2" style={{ color: C.muted }}>{e.notiz}</p>}

                {fremd && (
                  <div className="mt-3 p-2 rounded text-xs"
                       style={{ background: "#FDF6EE", border: "1px solid " + C.gas, color: C.gas }}>
                    {e.status === "kunde"
                      ? e.bearbeiter + " hat diesen Kontakt bereits als Kunden übernommen."
                      : e.bearbeiter + " ist bereits mit diesem Kontakt befasst"
                        + (e.bearbeitetAm ? " seit " + datum(e.bearbeitetAm) : "") + "."}
                    {" "}Bitte nicht doppelt anrufen.
                  </div>
                )}

                <div className="flex flex-wrap gap-2 mt-3 pt-3" style={{ borderTop: "1px solid " + C.line }}>
                  {fremd && !offenLegen ? (
                    <button onClick={() => setTrotzdem([...trotzdem, e.id])}
                      className="text-xs px-2 py-1 rounded"
                      style={{ border: "1px solid " + C.line, color: C.muted }}>
                      trotzdem bearbeiten
                    </button>
                  ) : (
                    <>
                      {e.status === "offen" && (
                        <button onClick={() => setzEintrag(e.listeId, e.id, {
                            status: "kontakt", bearbeiterId: user.id, bearbeiter: user.name,
                            bearbeitetAm: heute() })}
                          className="text-xs px-2 py-1 rounded"
                          style={{ border: "1px solid " + C.strom, color: C.strom }}>
                          Ich kümmere mich
                        </button>
                      )}
                      <button onClick={() => setMaske({ art: "termin", eintrag: e, listeId: e.listeId })}
                        className="text-xs px-2 py-1 rounded"
                        style={{ border: "1px solid " + C.line, color: C.ok }}>Termin ausgemacht</button>
                      <button onClick={() => setMaske({ art: "wiedervorlage", eintrag: e, listeId: e.listeId })}
                        className="text-xs px-2 py-1 rounded"
                        style={{ border: "1px solid " + C.line, color: C.gas }}>Wiedervorlage</button>
                      <button onClick={() => setzEintrag(e.listeId, e.id, {
                          status: "kein", bearbeiterId: user.id, bearbeiter: user.name,
                          bearbeitetAm: heute() })}
                        className="text-xs px-2 py-1 rounded"
                        style={{ border: "1px solid " + C.line, color: C.warn }}>Kein Interesse</button>
                      <span className="flex-1" />
                      {e.status !== "kunde" && (
                        <button onClick={() => {
                            setzEintrag(e.listeId, e.id, { status: "kunde", bearbeiterId: user.id,
                              bearbeiter: user.name, bearbeitetAm: heute() });
                            onKunde(e);
                          }} className="text-xs px-2 py-1 rounded"
                          style={{ border: "1px solid " + C.strom, color: C.strom }}>
                          Als Kunde übernehmen
                        </button>
                      )}
                      {e.status !== "offen" && (
                        <button onClick={() => setzEintrag(e.listeId, e.id, {
                            status: "offen", termin: null, bearbeiterId: null, bearbeiter: "",
                            bearbeitetAm: "" })}
                          className="text-xs px-2 py-1 rounded"
                          style={{ border: "1px solid " + C.line, color: C.muted }}>freigeben</button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {darfPflegen && listen.length > 0 && (
        <div className="rounded overflow-hidden mt-6" style={{ background: C.card, border: "1px solid " + C.line }}>
          <div className="px-4 py-3 text-sm" style={{ borderBottom: "1px solid " + C.line }}>
            Eingespielte Listen
          </div>
          {listen.map((l, i) => (
            <div key={l.id} className="flex flex-wrap items-center gap-4 px-4 py-3 text-sm"
                 style={{ borderTop: i ? "1px solid " + C.line : "none" }}>
              <div className="flex-1 min-w-40">
                <div>{l.name}</div>
                <div className="text-xs" style={{ color: C.muted }}>
                  {l.branche} · {l.eintraege.length} Kontakte · {datum(l.hochgeladen)} · {l.von}
                </div>
              </div>
              <span className="text-xs" style={{ color: C.ok }}>
                {l.eintraege.filter((e) => e.status === "termin").length} Termine
              </span>
              <details className="w-full sm:w-72">
                <summary className="text-xs cursor-pointer" style={{ color: C.strom }}>
                  {zugewiesenAn(l).length === 0
                    ? "nicht zugewiesen"
                    : "zugewiesen an " + zugewiesenAn(l)
                        .map((id) => (mitarbeiter.find((m) => m.id === id) || {}).name || "?")
                        .join(", ")}
                </summary>
                <div className="mt-2 space-y-1">
                  {empfaenger.map((m) => (
                    <label key={m.id} className="flex items-center gap-2 text-xs">
                      <input type="checkbox" checked={zugewiesenAn(l).includes(m.id)}
                        onChange={() => setListen(listen.map((x) => x.id !== l.id ? x : {
                          ...x,
                          zugewiesen: zugewiesenAn(x).includes(m.id)
                            ? zugewiesenAn(x).filter((y) => y !== m.id)
                            : [...zugewiesenAn(x), m.id],
                        }))}
                        style={{ accentColor: C.strom }} />
                      {m.name}
                    </label>
                  ))}
                </div>
              </details>
              <button onClick={() => setListen(listen.filter((x) => x.id !== l.id))}
                style={{ color: C.muted }}><Trash2 size={15} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export {
  Akquise,
};
