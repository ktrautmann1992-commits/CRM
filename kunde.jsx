/* Seite für den Kunden: Angebot über den persönlichen Link ansehen und annehmen.
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
  C, FIRMENDATEN, Kunden, Unterschrift, datum, varianten,
} from "./App.jsx";
import { Smartmeter } from "./innendienst.jsx";

/* ------------------------------------------------------------------ */
/*  Seite für den Kunden: Angebot ansehen und annehmen                 */
/*  Aufruf über den persönlichen Link aus der E-Mail (?angebot=…),     */
/*  ohne Anmeldung. Alles läuft über die Server-Funktion               */
/*  „kundenangebot“; der Kunde sieht nur, was sie liefert.             */
/* ------------------------------------------------------------------ */
const FUNKTIONEN_KUNDE = ["Geschäftsführer/in", "Inhaber/in", "Prokurist/in", "Vorstand", "Sonstige"];
const STELLEN_TEXT = {
  "Unterschrift Angebot": "das Angebot",
  "Unterschrift Smartmeter": "das Smartmeter-Angebot",
  "Unterschrift Vollmacht": "den Service- & Beratungsauftrag (Vollmacht und Lastschriftmandat)",
  "Unterschrift Datenschutz": "die Einwilligung zum Datenschutz",
};
const ibanPruefen = (roh) => {
  const i = String(roh || "").replace(/\s+/g, "").toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(i) || (i.startsWith("DE") && i.length !== 22)) return false;
  const z = (i.slice(4) + i.slice(0, 4)).replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  let r = 0;
  for (const c of z) r = (r * 10 + +c) % 97;
  return r === 1;
};

/* außerhalb der Komponente, sonst verlieren Eingaben und Unterschrift bei jedem Tippen ihren Zustand */
const KundeRahmen = ({ children }) => (
  <div style={{ minHeight: "100vh", background: C.paper, color: C.text }}>
    <div style={{ background: C.ink }}>
      <div className="max-w-xl mx-auto px-4 py-4 flex items-center justify-between">
        <img src="/assets/logo-weiss.png" alt="EGC Energie" style={{ height: 30 }} />
        <span className="text-xs" style={{ color: "#B9C3D0" }}>Ihr Angebot</span>
      </div>
      <div style={{ height: 4, background: "#6CB43B" }} />
    </div>
    <div className="max-w-xl mx-auto px-4 py-5 space-y-4">{children}</div>
    <div className="max-w-xl mx-auto px-4 pb-8 text-xs" style={{ color: C.muted, lineHeight: 1.6 }}>
      EGC Energie · {FIRMENDATEN.strasse} · {FIRMENDATEN.ort}<br />
      Ihre Angaben werden nur zur Bearbeitung Ihres Auftrags verwendet. Beim Öffnen dieser Seite und der Angebote
      speichern wir den Zeitpunkt, damit Ihr Ansprechpartner weiß, dass das Angebot angekommen ist.
    </div>
  </div>
);
const KundeKarte = ({ children, rand }) => (
  <div className="rounded-lg p-4" style={{ background: "#fff", border: "1px solid " + (rand || C.line) }}>{children}</div>
);


function KundenAngebot({ link }) {
  const [daten, setDaten] = useState(null);
  const [fehler, setFehler] = useState("");
  const [wahl, setWahl] = useState("");
  const [f, setF] = useState({ name: "", funktion: "", funktionFrei: "", iban: "", geburtsdatum: "", steuernummer: "" });
  const [sig, setSig] = useState(null);
  const [haken, setHaken] = useState({});
  const [sendet, setSendet] = useState(false);
  const [sendFehler, setSendFehler] = useState("");
  const [fertig, setFertig] = useState(null);
  const [versucht, setVersucht] = useState(false);

  useEffect(() => {
    kundenangebot({ aktion: "laden", link })
      .then((d) => { setDaten(d); if (d.varianten && d.varianten.length === 1) setWahl(d.varianten[0].id); })
      .catch((e) => setFehler(e.message || "Der Link konnte nicht geöffnet werden."));
  }, [link]);

  const ansehen = async (v, url0) => {
    /* Fenster gleich beim Tippen öffnen, sonst blockt das iPhone es als Werbefenster */
    const w = url0 ? null : window.open("", "_blank");
    try {
      const url = url0 || (await kundenangebot({ aktion: "ansehen", link, variante: v.id })).url;
      if (w) w.location.href = url; else window.location.href = url;
    } catch (e) { if (w) w.close(); alert(e.message); }
  };

  const gross = { fontSize: 16 };   /* ab 16 px vergrößert das iPhone beim Tippen nicht */
  const eingabe = (k, label, props = {}) => {
    const ungueltig = versucht && feldFehler[k];
    return (
      <label className="block">
        <span className="block text-sm mb-1" style={{ color: C.muted }}>{label}</span>
        <input value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} {...props}
          className="w-full px-3 py-3 rounded outline-none"
          style={{ ...gross, border: "1px solid " + (ungueltig ? C.warn : C.line), background: ungueltig ? "#FCF3F0" : "#fff", color: C.text }} />
        {ungueltig && <span className="block text-sm mt-1" style={{ color: C.warn }}>{feldFehler[k]}</span>}
      </label>
    );
  };

  if (fehler) return (
    <KundeRahmen><KundeKarte rand={C.warn}>
      <div className="text-lg mb-2" style={{ color: C.ink }}>Dieser Link funktioniert nicht</div>
      <p style={{ color: C.muted }}>{fehler}</p>
      <p className="mt-3" style={{ color: C.muted }}>Bitte wenden Sie sich an Ihren Ansprechpartner bei EGC Energie oder an {FIRMENDATEN.telefon}.</p>
    </KundeKarte></KundeRahmen>
  );
  if (!daten) return <KundeRahmen><KundeKarte><span style={{ color: C.muted }}>Ihr Angebot wird geladen …</span></KundeKarte></KundeRahmen>;

  const b = daten.berater || {};
  const v = (daten.varianten || []).find((x) => x.id === wahl) || null;
  const F = daten.felder || {};
  const stellen = v ? (v.stellen && v.stellen.length ? v.stellen : ["Unterschrift Angebot"]) : [];
  const funktion = f.funktion === "Sonstige" ? f.funktionFrei.trim() : f.funktion;
  const feldFehler = {
    name: f.name.trim().split(/\s+/).length < 2 ? "Bitte Vor- und Nachname angeben." : "",
    funktion: F.funktion && !funktion ? "Bitte Ihre Funktion angeben." : "",
    iban: F.iban && !ibanPruefen(f.iban) ? "Diese IBAN ist nicht gültig. Bitte prüfen." : "",
    geburtsdatum: F.geburtsdatum && !/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(f.geburtsdatum.trim()) ? "Bitte im Format TT.MM.JJJJ." : "",
    steuernummer: F.steuernummer && f.steuernummer.trim().length < 6 ? "Bitte Steuernummer oder USt-IdNr. angeben." : "",
  };
  const fehlt = [
    ...(!v ? ["Angebot auswählen"] : []),
    ...[["name", "Name"], ["funktion", "Funktion"], ["iban", "IBAN"], ["geburtsdatum", "Geburtsdatum"], ["steuernummer", "Steuernummer"]]
      .filter(([k]) => feldFehler[k]).map(([, t]) => t),
    ...(!sig ? ["Unterschrift"] : []),
    ...(stellen.some((s) => !haken[s]) ? ["alle Stellen bestätigen"] : []),
  ];

  const annehmen = async () => {
    setVersucht(true);
    if (fehlt.length) return;
    setSendet(true); setSendFehler("");
    try {
      const r = await kundenangebot({ aktion: "annehmen", link, variante: v.id, name: f.name.trim(), funktion,
        iban: f.iban, geburtsdatum: f.geburtsdatum.trim(), steuernummer: f.steuernummer.trim(),
        unterschrift: sig, zustimmung: true });
      setFertig(r);
      window.scrollTo(0, 0);
    } catch (e) { setSendFehler(e.message || "Das hat nicht geklappt. Bitte versuchen Sie es noch einmal."); }
    setSendet(false);
  };

  const berater = () => (
    <KundeKarte>
      <div className="text-xs mb-1" style={{ color: C.muted }}>Ihr Ansprechpartner</div>
      <div className="text-base" style={{ color: C.ink }}>{b.name || "EGC Energie"}</div>
      <div className="flex flex-wrap gap-2 mt-3">
        {b.telefon && <a href={"tel:" + String(b.telefon).replace(/[^\d+]/g, "")} className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded text-sm"
          style={{ background: C.ink, color: "#fff" }}><Phone size={15} /> {b.telefon}</a>}
        {b.email && <a href={"mailto:" + b.email} className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded text-sm"
          style={{ border: "1px solid " + C.line, color: C.text }}><Mail size={15} /> E-Mail</a>}
      </div>
    </KundeKarte>
  );

  if (fertig || daten.angenommen) {
    const ang = daten.angenommen;
    const url = fertig ? fertig.unterschrieben : ang && ang.unterschrieben;
    return (
      <KundeRahmen>
        <KundeKarte rand={C.ok}>
          <div className="flex items-center gap-2 text-lg mb-2" style={{ color: C.ok }}><Check size={22} /> Vielen Dank!</div>
          <p>{fertig ? "Sie haben das Angebot angenommen." : "Dieses Angebot wurde am " + datum((ang.zeit || "").slice(0, 10)) + (ang.name ? " von " + ang.name : "") + " angenommen."}</p>
          <p className="mt-2" style={{ color: C.muted }}>
            {fertig ? "Eine Kopie der unterschriebenen Unterlagen ist per E-Mail unterwegs. " : ""}
            Wir reichen den Auftrag beim Versorger ein und melden uns, sobald er bestätigt ist.
          </p>
          {url && <div className="mt-4"><button onClick={() => ansehen(null, url)} className="inline-flex items-center gap-2 px-4 py-3 rounded"
            style={{ ...gross, background: C.ink, color: "#fff" }}><FileText size={17} /> Unterschriebene Unterlagen ansehen</button></div>}
        </KundeKarte>
        {berater()}
      </KundeRahmen>
    );
  }

  return (
    <KundeRahmen>
      <div>
        <div className="text-sm" style={{ color: C.muted }}>{daten.ansprechpartner ? "Guten Tag " + daten.ansprechpartner : "Willkommen"}</div>
        <h1 className="text-2xl mt-1" style={{ color: C.ink, lineHeight: 1.25 }}>
          {daten.varianten.length > 1 ? "Ihre Angebote" : "Ihr Angebot"}{daten.firma ? " für " + daten.firma : ""}
        </h1>
      </div>

      {!daten.offen && (
        <KundeKarte rand={C.gas}>
          <p>Dieses Angebot kann nicht mehr online angenommen werden{daten.zuAlt ? ", der Link ist abgelaufen" : ""}.
            Bitte wenden Sie sich an {b.name || "Ihren Ansprechpartner"}, gern auch telefonisch.</p>
        </KundeKarte>
      )}

      <div className="space-y-3">
        <div className="text-sm" style={{ color: C.muted }}>
          {daten.varianten.length > 1 ? "1 · Angebote ansehen und eines auswählen" : "1 · Angebot ansehen"}
        </div>
        {daten.varianten.map((x) => {
          const aktiv = wahl === x.id;
          return (
            <div key={x.id} className="rounded-lg p-4" style={{ background: "#fff", border: "2px solid " + (aktiv && daten.varianten.length > 1 ? C.ok : C.line) }}>
              <div className="text-base" style={{ color: C.ink }}>{x.produkt || "Angebot"}</div>
              <div className="text-sm mt-0.5" style={{ color: C.muted }}>
                {[x.sparte, x.lieferbeginn ? "Lieferbeginn " + x.lieferbeginn : ""].filter(Boolean).join(" · ")}
              </div>
              {x.gueltigBis && <div className="text-sm mt-0.5" style={{ color: x.abgelaufen ? C.warn : C.muted }}>
                {x.abgelaufen ? "Nur gültig bis " + x.gueltigBis + ", bitte neu anfragen" : "Gültig bis " + x.gueltigBis}</div>}
              <div className="flex flex-wrap gap-2 mt-3">
                <button onClick={() => ansehen(x)} className="inline-flex items-center gap-2 px-4 py-3 rounded"
                  style={{ ...gross, background: C.ink, color: "#fff" }}><FileText size={17} /> Angebot ansehen (PDF)</button>
                {daten.varianten.length > 1 && daten.offen && !x.abgelaufen && (
                  <button onClick={() => { setWahl(x.id); setHaken({}); }} className="inline-flex items-center gap-2 px-4 py-3 rounded"
                    style={{ ...gross, background: aktiv ? C.ok : "#fff", color: aktiv ? "#fff" : C.text, border: "1px solid " + (aktiv ? C.ok : C.line) }}>
                    {aktiv ? <><Check size={17} /> Ausgewählt</> : "Dieses annehmen"}</button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {daten.offen && v && !v.abgelaufen && (
        <>
          <div className="text-sm pt-2" style={{ color: C.muted }}>2 · Ihre Angaben</div>
          <KundeKarte>
            <div className="space-y-4">
              {eingabe("name", "Vor- und Nachname (wer unterschreibt)", { autoComplete: "name", autoCapitalize: "words" })}
              {F.funktion && (
                <div>
                  <span className="block text-sm mb-1" style={{ color: C.muted }}>Funktion im Unternehmen</span>
                  <div className="flex flex-wrap gap-2">
                    {FUNKTIONEN_KUNDE.map((x) => (
                      <button key={x} onClick={() => setF({ ...f, funktion: x })} className="px-3 py-2.5 rounded text-sm"
                        style={{ background: f.funktion === x ? C.ink : "#fff", color: f.funktion === x ? "#fff" : C.text,
                                 border: "1px solid " + (f.funktion === x ? C.ink : versucht && feldFehler.funktion ? C.warn : C.line) }}>{x}</button>
                    ))}
                  </div>
                  {f.funktion === "Sonstige" && <div className="mt-2">{eingabe("funktionFrei", "Ihre Funktion")}</div>}
                  {versucht && feldFehler.funktion && f.funktion !== "Sonstige" && <span className="block text-sm mt-1" style={{ color: C.warn }}>{feldFehler.funktion}</span>}
                </div>
              )}
              {F.iban && eingabe("iban", "IBAN für das Lastschriftmandat", { autoComplete: "off", autoCapitalize: "characters", spellCheck: false, placeholder: "DE.. .... .... .... .... .." })}
              {F.geburtsdatum && eingabe("geburtsdatum", "Geburtsdatum", { inputMode: "numeric", placeholder: "TT.MM.JJJJ" })}
              {F.steuernummer && eingabe("steuernummer", "Steuernummer oder USt-IdNr.", { autoCapitalize: "characters", spellCheck: false })}
            </div>
          </KundeKarte>

          <div className="text-sm pt-2" style={{ color: C.muted }}>3 · Unterschreiben</div>
          <KundeKarte rand={versucht && !sig ? C.warn : null}>
            <Unterschrift label="Bitte hier mit dem Finger unterschreiben" hoehe={170} onStriche={setSig} />
            <p className="text-sm mt-3" style={{ color: C.muted }}>Ihre Unterschrift wird an diesen Stellen eingesetzt. Bitte jede Stelle bestätigen:</p>
            <div className="space-y-2 mt-2">
              {stellen.map((s) => (
                <button key={s} onClick={() => setHaken({ ...haken, [s]: !haken[s] })}
                  className="w-full flex items-start gap-3 p-3 rounded text-left"
                  style={{ ...gross, background: haken[s] ? "#EEF6E8" : "#fff", border: "1px solid " + (haken[s] ? C.ok : versucht ? C.warn : C.line) }}>
                  <span className="shrink-0 rounded flex items-center justify-center mt-0.5"
                    style={{ width: 24, height: 24, background: haken[s] ? C.ok : "#fff", border: "2px solid " + (haken[s] ? C.ok : "#9AA5B3") }}>
                    {haken[s] && <Check size={16} color="#fff" />}</span>
                  <span>Ich unterschreibe {STELLEN_TEXT[s] || s}.</span>
                </button>
              ))}
            </div>
          </KundeKarte>

          <div className="space-y-2 pb-2">
            {versucht && fehlt.length > 0 && <p className="text-sm" style={{ color: C.warn }}>Bitte noch ergänzen: {fehlt.join(", ")}.</p>}
            {sendFehler && <p className="text-sm" style={{ color: C.warn }}>{sendFehler}</p>}
            <button onClick={annehmen} disabled={sendet} className="w-full inline-flex items-center justify-center gap-2 px-4 py-4 rounded-lg"
              style={{ fontSize: 17, background: C.ok, color: "#fff", opacity: sendet ? 0.6 : 1 }}>
              <FileSignature size={19} /> {sendet ? "Wird gespeichert …" : "Angebot verbindlich annehmen"}
            </button>
            <p className="text-xs" style={{ color: C.muted }}>
              Mit dem Tippen nehmen Sie das ausgewählte Angebot an und unterschreiben die oben bestätigten Unterlagen elektronisch.
              Sie erhalten sofort eine Kopie per E-Mail.
            </p>
          </div>
        </>
      )}
      {berater()}
    </KundeRahmen>
  );
}

export {
  FUNKTIONEN_KUNDE, KundeKarte, KundeRahmen, KundenAngebot, STELLEN_TEXT, ibanPruefen,
};
