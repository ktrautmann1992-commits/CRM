/* Verwaltung der Geschäftsführung: Portalsteuerung, Vertriebsmitarbeiter, Verträge, Export, Auswertungen.
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
  AKQUISE_ART, Abrechnung, Avatar, Btn, C, Datei, DateiBild, FIRMENANTEIL,
  Feld, Kunden, Leads, Liste, PORTAL_ADRESSE, PartnerStatus, Provisionen, ROLLENFARBE,
  Registrierung, Select, StammdatenFormular, TG_FIRMA, TIPPGEBER_VORSCHLAG_KWH, Tippgeber, TippgeberStatus, Unterschrift,
  VERSION, Ziele, aktiveVariante, bestaetigteMenge, beteiligte, dateiLaden, dateiLesen, datum,
  erzeugePdf, erzeugeXlsx, eur, gesamtprovision, heute, istBeteiligt, jetzt, laufzeitVon,
  leereStammdaten, leererTippgeber, num, passwortRegeln, stammdatenLuecken, statusVon, strukturUnter, tgZahl,
  tippgeberFrei, tippgeberText, tippgeberVertragPdf, uid, utf8Binaer, verbrauchGesamt, verbrauchMedium, verteilung,
  vertragsende, visitenkartenDaten, zahlweiseVon,
} from "./App.jsx";
import { Beschaffung } from "./beschaffung.jsx";
import { Smartmeter, StrukturFreigabe, Tickets } from "./innendienst.jsx";
import { VISITENKARTE_ROLLEN, imagebroschuerePdf, portfolioFlyerPdf, vertragPdf, visitenkartePdf } from "./pdf.jsx";
import { Strukturanfragen } from "./selten.jsx";
import { Akquise } from "./vertrieb.jsx";
import { Detail } from "./vorgang.jsx";

const ALLE_ROLLEN = ["Vertriebspartner", "Teamleiter", "Leitung Vertrieb", "Kalkulation", "Vertragsmanagement",
  "Leadmanagement", "Finanzbuchhaltung", "Beschaffung", "Geschäftsführung"];
const VERTRIEBSROLLEN = ["Vertriebspartner", "Teamleiter", "Leitung Vertrieb"];
const passwortVorschlag = () => {
  const z = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789", sz = "!#+?-";
  const r = crypto.getRandomValues(new Uint32Array(12));
  const t = Array.from(r, (x) => z[x % z.length]);
  t[3] = sz[r[3] % sz.length]; t[8] = String(2 + (r[8] % 8));
  return t.join("");
};
const zugangsText = (name, email, pw) =>
  "Dein Zugang zum EGC-Vertriebsportal\n" + "Name: " + name + "\nAdresse: " + PORTAL_ADRESSE + "\nE-Mail: " + email + "\nPasswort: " + pw
  + "\n\nDas Passwort kannst du nach der Anmeldung im Menü unter „Passwort ändern“ selbst ändern.";

function PasswortFeld({ label, value, onChange }) {
  const regeln = passwortRegeln(value);
  return (
    <div>
      <div className="flex items-end gap-2">
        <div className="flex-1"><Feld label={label} value={value} onChange={onChange} /></div>
        <Btn variante="hell" onClick={() => onChange(passwortVorschlag())}>Vorschlag</Btn>
      </div>
      <div className="mt-1 flex flex-wrap gap-x-4">
        {regeln.map((x) => (
          <span key={x.text} className="text-xs inline-flex items-center gap-1" style={{ color: x.ok ? C.ok : C.muted }}>
            {x.ok ? <Check size={12} /> : <X size={12} />} {x.text}
          </span>
        ))}
      </div>
    </div>
  );
}

function ZugangKopieren({ titel, name, email, pw, onFertig }) {
  const [kopiert, setKopiert] = useState(false);
  const text = zugangsText(name, email, pw);
  return (
    <div className="rounded p-4" style={{ background: "#F1F7F0", border: "1px solid " + C.gruen }}>
      <div className="text-sm flex items-center gap-2 mb-2" style={{ color: C.ok }}><Check size={16} /> {titel}</div>
      <pre className="text-xs whitespace-pre-wrap p-3 rounded mb-3" style={{ background: "#fff", border: "1px solid " + C.line, fontFamily: "inherit" }}>{text}</pre>
      <div className="flex flex-wrap gap-2">
        <Btn icon={Check} onClick={async () => { try { await navigator.clipboard.writeText(text); setKopiert(true); } catch (e) { /* von Hand */ } }}>
          {kopiert ? "Kopiert" : "Zugangsdaten kopieren"}
        </Btn>
        <Btn variante="hell" onClick={onFertig}>Fertig</Btn>
      </div>
      <p className="text-xs mt-2" style={{ color: C.muted }}>Das Passwort wird nirgends gespeichert. Gib es der Person direkt weiter.</p>
    </div>
  );
}

function Portalsteuerung({ mitarbeiter, setMitarbeiter, user, notieren }) {
  const leer = { name: "", email: "", telefon: "", rolle: "Kalkulation", satz: "", upline: "", angestellt: true, frei: true, pw: passwortVorschlag() };
  const [neu, setNeu] = useState(null);
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState("");
  const [ergebnis, setErgebnis] = useState(null);
  const [pwFuer, setPwFuer] = useState(null);
  const [pw, setPw] = useState("");
  const [filter, setFilter] = useState("alle");
  const [suche, setSuche] = useState("");

  const vertrieb = neu && VERTRIEBSROLLEN.includes(neu.rolle);
  const koepfe = mitarbeiter.filter((m) => ["Teamleiter", "Leitung Vertrieb"].includes(m.rolle) && m.status === "aktiv");
  const emailFrei = neu && !mitarbeiter.some((m) => String(m.email || "").trim().toLowerCase() === neu.email.trim().toLowerCase());
  const satzWert = neu ? parseFloat(String(neu.satz).replace(",", ".")) : NaN;
  const neuOk = neu && neu.name.trim() && /\S+@\S+\.\S+/.test(neu.email) && emailFrei && passwortRegeln(neu.pw).every((x) => x.ok)
    && (!vertrieb || (!isNaN(satzWert) && satzWert > 0 && satzWert <= 50));

  const anlegen = async () => {
    setLaeuft(true); setFehler("");
    const status = neu.frei ? "aktiv" : "registriert";
    const m = {
      id: "vp-" + uid(), name: neu.name.trim(), rolle: neu.rolle, team: "-",
      satz: vertrieb ? satzWert : 0, upline: vertrieb ? (neu.upline || null) : null,
      email: neu.email.trim().toLowerCase(), telefon: neu.telefon.trim(), status, passwort: "", bild: null,
      stammdaten: leereStammdaten(), angestellt: !vertrieb || !!neu.angestellt,
      ...(status === "aktiv" ? { freigabe: { von: user.name, datum: heute() } } : {}),
    };
    try {
      const { stammdaten, satz, passwort, ...daten } = m;
      await zugangSetzen({ id: m.id, passwort: neu.pw, status, daten });
      setMitarbeiter(mitarbeiter.some((x) => x.id === m.id) ? mitarbeiter.map((x) => (x.id === m.id ? { ...x, ...m } : x)) : [...mitarbeiter, m]);
      if (notieren) notieren("Mitarbeiter", m.name + " als " + m.rolle + " mit Zugang angelegt (Portalsteuerung)");
      setErgebnis({ titel: "Zugang angelegt", name: m.name, email: m.email, pw: neu.pw });
      setNeu(null);
    } catch (e) { setFehler((e && e.message) || String(e)); }
    setLaeuft(false);
  };

  const pwSetzen = async (m) => {
    setLaeuft(true); setFehler("");
    try {
      const st = VERTRIEBSROLLEN.includes(m.rolle) ? "registriert" : "aktiv";
      const r = await zugangSetzen({ id: m.id, passwort: pw, status: st });
      if (m.status === "eingeladen" && r && r.status) setMitarbeiter(mitarbeiter.map((x) => (x.id === m.id ? { ...x, status: r.status } : x)));
      if (notieren) notieren("Zugang", "Passwort für " + m.name + " neu gesetzt (Portalsteuerung)");
      setErgebnis({ titel: "Passwort gesetzt", name: m.name, email: m.email, pw });
      setPwFuer(null); setPw("");
    } catch (e) { setFehler((e && e.message) || String(e)); }
    setLaeuft(false);
  };

  const liste = mitarbeiter
    .filter((m) => !/^t-/.test(m.id))
    .filter((m) => filter === "alle" || m.rolle === filter)
    .filter((m) => !suche.trim() || (m.name + " " + m.email).toLowerCase().includes(suche.trim().toLowerCase()))
    .sort((a, b) => ALLE_ROLLEN.indexOf(a.rolle) - ALLE_ROLLEN.indexOf(b.rolle) || (a.name || "").localeCompare(b.name || ""));
  const statusText = { aktiv: "aktiv", eingeladen: "eingeladen, noch kein Zugang", registriert: "Stammdaten offen", pruefung: "in Prüfung",
    abgelehnt: "zurückgewiesen", gesperrt: "gesperrt" };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
        <h2 className="text-lg">Portalsteuerung</h2>
        {!neu && !ergebnis && <Btn icon={UserPlus} onClick={() => { setNeu({ ...leer }); setFehler(""); }}>Nutzer anlegen</Btn>}
      </div>
      <p className="text-sm mb-5" style={{ color: C.muted, maxWidth: "65ch" }}>
        Zugänge für alle Rollen anlegen und Passwörter setzen. Vertriebspartner kannst du weiterhin auch über eine Einladung
        unter Vertriebsmitarbeiter anlegen, dann vergeben sie ihr Passwort selbst.
      </p>

      {ergebnis && <div className="mb-5"><ZugangKopieren {...ergebnis} onFertig={() => setErgebnis(null)} /></div>}

      {neu && (
        <div className="rounded p-5 mb-5 space-y-4" style={{ background: C.card, border: "1px solid " + C.line }}>
          <div className="text-sm">Neuer Nutzer</div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Feld label="Name" value={neu.name} onChange={(v) => setNeu({ ...neu, name: v })} />
            <Select label="Rolle" value={neu.rolle} options={ALLE_ROLLEN}
              onChange={(v) => setNeu({ ...neu, rolle: v, frei: !VERTRIEBSROLLEN.includes(v), angestellt: !VERTRIEBSROLLEN.includes(v) })} />
            <Feld label="E-Mail (Anmeldename)" value={neu.email} onChange={(v) => setNeu({ ...neu, email: v })}
              fehler={neu.email && !emailFrei ? "Diese E-Mail gibt es schon im Portal." : null} />
            <Feld label="Telefon (freiwillig)" value={neu.telefon} onChange={(v) => setNeu({ ...neu, telefon: v })} />
            {vertrieb && (
              <>
                <Feld label="Provisionssatz in %" value={neu.satz} onChange={(v) => setNeu({ ...neu, satz: v })}
                  fehler={neu.satz !== "" && !(satzWert > 0 && satzWert <= 50) ? "zwischen 0 und 50 %" : null} />
                <Select label="Struktur (Teamleiter oder Leitung)" value={neu.upline}
                  options={[{ value: "", label: "ohne Strukturkopf" }, ...koepfe.map((k) => ({ value: k.id, label: k.name + " · " + k.rolle }))]}
                  onChange={(v) => setNeu({ ...neu, upline: v })} />
              </>
            )}
          </div>
          <PasswortFeld label="Passwort" value={neu.pw} onChange={(v) => setNeu({ ...neu, pw: v })} />
          {vertrieb && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!!neu.angestellt} onChange={(e) => setNeu({ ...neu, angestellt: e.target.checked })} />
              Angestellt (Provision wird angezeigt, abgerechnet über die Lohnabrechnung)
            </label>
          )}
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-1" checked={!!neu.frei} onChange={(e) => setNeu({ ...neu, frei: e.target.checked })} />
            <span>Sofort freischalten
              <span className="block text-xs" style={{ color: C.muted }}>
                {neu.frei ? "Die Person kann direkt mit dem Portal arbeiten."
                  : "Die Person muss zuerst ihre Stammdaten ausfüllen, du gibst sie danach unter Vertriebsmitarbeiter frei."}
              </span></span>
          </label>
          <div className="flex flex-wrap gap-2">
            <Btn icon={Check} onClick={anlegen} disabled={!neuOk || laeuft}>{laeuft ? "Einen Moment …" : "Nutzer mit Zugang anlegen"}</Btn>
            <Btn variante="hell" onClick={() => setNeu(null)} disabled={laeuft}>Abbrechen</Btn>
          </div>
          {fehler && <p className="text-sm" style={{ color: C.warn }}>{fehler}</p>}
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-3">
        <input value={suche} onChange={(e) => setSuche(e.target.value)} placeholder="Name oder E-Mail suchen"
          className="px-3 py-2 text-sm rounded outline-none flex-1 min-w-48" style={{ border: "1px solid " + C.line, background: C.card }} />
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="px-3 py-2 text-sm rounded"
          style={{ border: "1px solid " + C.line, background: C.card }}>
          <option value="alle">Alle Rollen</option>
          {ALLE_ROLLEN.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>
      <div className="rounded overflow-hidden" style={{ background: C.card, border: "1px solid " + C.line }}>
        {liste.length === 0 && <div className="p-4 text-sm" style={{ color: C.muted }}>Niemand gefunden.</div>}
        {liste.map((m, i) => (
          <div key={m.id} className="px-4 py-3" style={{ borderTop: i ? "1px solid " + C.line : "none" }}>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <div className="flex-1 min-w-48">
                <div className="text-sm">{m.name}{m.id === user.id ? " (du)" : ""}</div>
                <div className="text-xs" style={{ color: C.muted }}>{m.rolle} · {m.email || "keine E-Mail"} · {statusText[m.status] || m.status}</div>
              </div>
              {pwFuer !== m.id && (
                <button className="text-sm underline" style={{ color: C.strom }} disabled={!m.email}
                  onClick={() => { setPwFuer(m.id); setPw(passwortVorschlag()); setFehler(""); setErgebnis(null); }}>
                  {m.status === "eingeladen" ? "Zugang mit Passwort anlegen" : "Passwort setzen"}
                </button>
              )}
            </div>
            {pwFuer === m.id && (
              <div className="mt-3 p-3 rounded space-y-3" style={{ background: "#F6F8FA" }}>
                <PasswortFeld label={"Neues Passwort für " + m.name} value={pw} onChange={setPw} />
                <p className="text-xs" style={{ color: C.muted }}>Das bisherige Passwort gilt danach nicht mehr. Angemeldete Geräte bleiben bis zur nächsten Anmeldung angemeldet.</p>
                <div className="flex flex-wrap gap-2">
                  <Btn icon={Check} onClick={() => pwSetzen(m)} disabled={laeuft || !passwortRegeln(pw).every((x) => x.ok)}>
                    {laeuft ? "Einen Moment …" : "Passwort setzen"}</Btn>
                  <Btn variante="hell" onClick={() => setPwFuer(null)} disabled={laeuft}>Abbrechen</Btn>
                </div>
                {fehler && <p className="text-sm" style={{ color: C.warn }}>{fehler}</p>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* Verwaltung der Vertriebsmitarbeiter: anlegen, einladen, Sätze setzen, freigeben */
function Partnerverwaltung({ mitarbeiter, setMitarbeiter, user, notieren, bonus, setBonus,
                             strukturanfragen = [], setStrukturanfragen, firmendaten, setFirmendaten }) {
  const [auswahl, setAuswahl] = useState(null);
  const [anfrageAuswahl, setAnfrageAuswahl] = useState(null);
  const [gfUnterschrift, setGfUnterschrift] = useState(null);
  const [neu, setNeu] = useState(null);
  const [link, setLink] = useState(null);
  const [hinweis, setHinweis] = useState("");
  const [sd, setSd] = useState(null);
  const [bearbeiten, setBearbeiten] = useState(false);

  const istGF = user.rolle === "Geschäftsführung";
  const vertrieb = mitarbeiter.filter((m) =>
    ["Vertriebspartner", "Teamleiter", "Leitung Vertrieb"].includes(m.rolle));
  const koepfe = mitarbeiter.filter((m) => ["Teamleiter", "Leitung Vertrieb"].includes(m.rolle));
  const gewaehlt = mitarbeiter.find((m) => m.id === auswahl);

  const setz = (id, aend) => {
    const m = mitarbeiter.find((x) => x.id === id);
    if (m && notieren) {
      if (aend.satz != null && aend.satz !== m.satz)
        notieren("Provisionssatz", m.name + ": " + num(m.satz, 0) + " % auf " + num(aend.satz, 0) + " % geändert");
      if (aend.upline !== undefined && aend.upline !== m.upline) {
        const neu = mitarbeiter.find((x) => x.id === aend.upline);
        notieren("Struktur", m.name + " zugeordnet an " + (neu ? neu.name : "niemanden"));
      }
      if (aend.status === "aktiv" && m.status !== "aktiv")
        notieren("Freigabe", m.name + " freigeschaltet"
          + (aend.freigabe && aend.freigabe.ohneStammdaten ? " (Stammdaten werden nachgereicht)" : ""));
    }
    setMitarbeiter(mitarbeiter.map((x) => (x.id === id ? { ...x, ...aend } : x)));
  };

  const anlegen = () => {
    const code = uid().toUpperCase() + uid().toUpperCase();
    const m = {
      id: "vp-" + uid(), name: neu.name, rolle: neu.rolle, team: neu.team || "-",
      satz: parseFloat(String(neu.satz).replace(",", ".")) || 0,
      upline: neu.upline || null, email: neu.email, telefon: "",
      status: "eingeladen", passwort: "", bild: null, einladung: code,
      stammdaten: leereStammdaten(), angestellt: neu.beschaeftigung === "angestellt",
    };
    setMitarbeiter([...mitarbeiter, m]);
    if (notieren) notieren("Mitarbeiter", m.name + " angelegt als " + m.rolle + " mit " + m.satz + " %"
      + (m.angestellt ? " (angestellt)" : ""));
    setLink({ name: m.name, url: window.location.origin + "/?code=" + code });
    setNeu(null);
  };

  const freigeben = () => {
    const fehlt = stammdatenLuecken(gewaehlt.stammdaten || {}, !!gewaehlt.angestellt).length > 0;
    setz(gewaehlt.id, { status: "aktiv", pruefHinweis: "",
      freigabe: { von: user.name, datum: heute(), ...(fehlt ? { ohneStammdaten: true } : {}) } });
    setAuswahl(null);
  };
  const zurueckweisen = () => {
    setz(gewaehlt.id, { status: "abgelehnt", pruefHinweis: hinweis });
    setHinweis(""); setAuswahl(null);
  };

  /* ---------- Strukturanfrage eines Teamleiters ---------- */
  const offeneAnfrage = strukturanfragen.find((x) => x.id === anfrageAuswahl);
  if (offeneAnfrage && istGF)
    return (
      <StrukturFreigabe anfrage={offeneAnfrage} mitarbeiter={mitarbeiter} setMitarbeiter={setMitarbeiter}
        strukturanfragen={strukturanfragen} setStrukturanfragen={setStrukturanfragen}
        user={user} notieren={notieren} onZurueck={() => setAnfrageAuswahl(null)} />
    );

  /* ---------- Einladungslink nach dem Anlegen ---------- */
  if (link)
    return (
      <div className="rounded p-5" style={{ background: C.card, border: "1px solid " + C.ok }}>
        <div className="flex items-center gap-2 mb-3" style={{ color: C.ok }}>
          <Check size={16} /><span className="text-sm">{link.name} wurde angelegt</span>
        </div>
        <p className="text-sm mb-3" style={{ color: C.muted, maxWidth: "60ch" }}>
          Schick diesen Link an den neuen Vertriebspartner. Er vergibt darüber sein Passwort und
          hinterlegt anschließend seine Stammdaten.
        </p>
        <div className="p-3 rounded text-sm break-all"
             style={{ background: "#F6F8FA", border: "1px solid " + C.line }}>{link.url}</div>
        <div className="flex flex-wrap gap-2 mt-4">
          <Btn icon={Check} onClick={() => {
            try { navigator.clipboard.writeText(link.url); } catch (e) { /* manuell kopieren */ }
          }}>Link kopieren</Btn>
          <Btn variante="hell" onClick={() => setLink(null)}>Fertig</Btn>
        </div>
      </div>
    );

  /* ---------- Neuen Partner anlegen ---------- */
  if (neu)
    return (
      <div className="rounded p-5" style={{ background: C.card, border: "1px solid " + C.line }}>
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => setNeu(null)} style={{ color: C.muted }}><ArrowLeft size={18} /></button>
          <h2 className="text-lg">Neuen Vertriebsmitarbeiter anlegen</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Feld label="Name" value={neu.name} onChange={(v) => setNeu({ ...neu, name: v })} />
          <Feld label="E-Mail" value={neu.email} onChange={(v) => setNeu({ ...neu, email: v })} />
          <Select label="Rolle" value={neu.rolle} onChange={(v) => setNeu({ ...neu, rolle: v })}
            options={["Vertriebspartner", "Teamleiter"]} />
          <Feld label="Team" value={neu.team} onChange={(v) => setNeu({ ...neu, team: v })} placeholder="Süd" />
          <Feld label="Provisionssatz in %" value={neu.satz} onChange={(v) => setNeu({ ...neu, satz: v })} />
          <Select label="Beschäftigung" value={neu.beschaeftigung || "selbststaendig"}
            onChange={(v) => setNeu({ ...neu, beschaeftigung: v })}
            options={[{ value: "selbststaendig", label: "Selbstständig (Handelsvertreter)" },
                      { value: "angestellt", label: "Angestellt bei EGC" }]} />
          <Select label="Zugeordnet an (Overhead)" value={neu.upline || ""}
            onChange={(v) => setNeu({ ...neu, upline: v || null })}
            options={[{ value: "", label: "Keine Zuordnung" },
                      ...koepfe.map((k) => ({ value: k.id, label: k.name + " · " + k.rolle }))]} />
        </div>
        <div className="flex gap-2 mt-6">
          <Btn icon={Send} onClick={anlegen} disabled={!neu.name || !neu.email}>
            Anlegen und Einladungslink erzeugen
          </Btn>
          <Btn variante="hell" onClick={() => setNeu(null)}>Abbrechen</Btn>
        </div>
        {neu.beschaeftigung === "angestellt" && (
          <p className="text-xs mt-3" style={{ color: C.muted, maxWidth: "60ch" }}>
            Angestellt: Provision und Ziele werden im Portal angezeigt wie bei allen anderen.
            Abgerechnet wird über eure Lohnabrechnung. Es gibt keinen Handelsvertretervertrag;
            Gewerbeanmeldung, Bankverbindung und Ausweis sind keine Pflicht.
          </p>
        )}
      </div>
    );

  /* ---------- Einzelner Partner ---------- */
  if (gewaehlt) {
    const daten = sd || gewaehlt.stammdaten || leereStammdaten();
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <button onClick={() => { setAuswahl(null); setSd(null); setBearbeiten(false); }} style={{ color: C.muted }}>
            <ArrowLeft size={18} />
          </button>
          <Avatar m={gewaehlt} size={40} />
          <div className="flex-1">
            <div className="text-lg">{gewaehlt.name}</div>
            <div className="text-xs" style={{ color: C.muted }}>
              {gewaehlt.rolle}{gewaehlt.angestellt ? " (angestellt)" : ""} · Team {gewaehlt.team} · {gewaehlt.email}
              {gewaehlt.telefon ? " · " + gewaehlt.telefon : ""}
            </div>
          </div>
          <PartnerStatus status={gewaehlt.status} />
        </div>

        <div className="rounded p-5" style={{ background: C.card, border: "1px solid " + C.line }}>
          <div className="text-sm mb-4">Vergütung und Struktur</div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Feld label="Provisionssatz in %" value={gewaehlt.satz}
              onChange={(v) => setz(gewaehlt.id, { satz: parseFloat(v.replace(",", ".")) || 0 })} />
            {istGF && (
              <Select label="Beschäftigung" value={gewaehlt.angestellt ? "angestellt" : "selbststaendig"}
                onChange={(v) => setz(gewaehlt.id, { angestellt: v === "angestellt" })}
                options={[{ value: "selbststaendig", label: "Selbstständig (Handelsvertreter)" },
                          { value: "angestellt", label: "Angestellt bei EGC" }]} />
            )}
            <Select label="Zugeordnet an (Overhead)" value={gewaehlt.upline || ""}
              onChange={(v) => setz(gewaehlt.id, { upline: v || null })}
              options={[{ value: "", label: "Keine Zuordnung" },
                        ...koepfe.filter((k) => k.id !== gewaehlt.id)
                          .map((k) => ({ value: k.id, label: k.name + " · " + k.rolle }))]} />
          </div>
          {istGF && (
            <div className="mt-4 pt-4" style={{ borderTop: "1px solid " + C.line }}>
              <div className="sm:max-w-xs">
                <Feld label="Eigenakquise-Bonus in Prozentpunkten"
                  value={gewaehlt.eigenBonus !== undefined && gewaehlt.eigenBonus !== ""
                    ? gewaehlt.eigenBonus : ""}
                  placeholder={"Vorgabe: " + num(parseFloat(bonus) || 0, 0)}
                  onChange={(v) => setz(gewaehlt.id, { eigenBonus: v.replace(/[^\d]/g, "") })} />
              </div>
              <p className="text-xs mt-2" style={{ color: C.muted, maxWidth: "60ch" }}>
                Leer lassen, damit die allgemeine Vorgabe gilt. Ein eigener Wert überschreibt sie
                nur für {gewaehlt.name}.
                {gewaehlt.eigenBonus !== undefined && gewaehlt.eigenBonus !== "" && (
                  <button className="ml-2" style={{ color: C.strom }}
                    onClick={() => setz(gewaehlt.id, { eigenBonus: "" })}>zurücksetzen</button>
                )}
              </p>
            </div>
          )}

          {(() => {
            /* Die Sätze rechnen auf die volle Gesamtprovision, bei EGC kommt
               aber nur der Firmenanteil an. Daraus wird ausgezahlt. */
            const v = verteilung(1000, gewaehlt.id, mitarbeiter);
            const beiEgc = (1000 * FIRMENANTEIL) / 100;
            const firma = beiEgc - v.anteile.reduce((t, x) => t + x.betrag, 0);
            return (
              <p className="text-xs mt-3" style={{ color: C.muted }}>
                Bei 1.000 € Gesamtprovision: {v.anteile.map((x) =>
                  x.name + " " + eur(x.betrag)).join(" · ")}
                {istGF ? " · Firma " + eur(firma) + " (von " + eur(beiEgc) + " Firmenanteil, "
                  + num(FIRMENANTEIL, 0) + " %)" : ""}
              </p>
            );
          })()}
        </div>

        {gewaehlt.einladung ? (
          <div className="rounded p-5" style={{ background: C.card, border: "1px solid " + C.line }}>
            <div className="text-sm mb-1">
              {gewaehlt.status === "eingeladen" ? "Einladung offen" : "Zugangslink zum Passwort-Neusetzen offen"}
            </div>
            <p className="text-xs mb-2" style={{ color: C.muted }}>Gilt 30 Tage und nur einmal.</p>
            <div className="p-3 rounded text-sm break-all"
                 style={{ background: "#F6F8FA", border: "1px solid " + C.line }}>
              {window.location.origin}/?code={gewaehlt.einladung}
            </div>
            <div className="mt-3">
              <Btn icon={Check} onClick={() => {
                try { navigator.clipboard.writeText(window.location.origin + "/?code=" + gewaehlt.einladung); }
                catch (e) { /* manuell kopieren */ }
              }}>Link kopieren</Btn>
            </div>
          </div>
        ) : (
          <div className="rounded p-5" style={{ background: C.card, border: "1px solid " + C.line }}>
            <div className="text-sm mb-1">Zugang</div>
            <p className="text-xs mb-3" style={{ color: C.muted, maxWidth: "60ch" }}>
              Passwort vergessen? Ein neuer Zugangslink lässt das Passwort neu vergeben.
            </p>
            <Btn variante="hell" onClick={() =>
              setz(gewaehlt.id, { einladung: uid().toUpperCase() + uid().toUpperCase() })}>
              Neuen Zugangslink erzeugen
            </Btn>
          </div>
        )}

        {istGF && gewaehlt.angestellt && (
          <div className="rounded p-5 text-sm" style={{ background: C.card, border: "1px solid " + C.line, color: C.muted }}>
            Angestellt bei EGC: kein Handelsvertretervertrag, die Provision rechnet ihr über die Lohnabrechnung ab.
          </div>
        )}
        {istGF && !gewaehlt.angestellt && (() => {
          const v = gewaehlt.vertrag || {};
          return (
            <div className="rounded p-5" style={{ background: C.card, border: "1px solid " + C.line }}>
              <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
                <span className="text-sm">Handelsvertretervertrag</span>
                {v.gfUnterschrift && (
                  <button className="text-sm" style={{ color: C.strom }}
                    onClick={() => vertragPdf(gewaehlt, mitarbeiter)}>Als PDF</button>
                )}
              </div>
              {v.gfUnterschrift ? (
                <div className="grid sm:grid-cols-2 gap-4 text-xs" style={{ color: C.muted }}>
                  <div>
                    <DateiBild datei={v.gfUnterschrift} hoehe={60} />
                    <div className="mt-1">EGC Energie: {v.gfName}, {datum(v.gfDatum)}</div>
                  </div>
                  <div>
                    {v.partnerUnterschrift
                      ? <DateiBild datei={v.partnerUnterschrift} hoehe={60} />
                      : <div className="py-5">noch nicht unterschrieben</div>}
                    <div className="mt-1">
                      {gewaehlt.name}{v.partnerDatum ? ", " + datum(v.partnerDatum) : ""}
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    Satz im Vertrag: {num(parseFloat(v.satz) || 0, 0)} %
                    {parseFloat(v.satz) !== parseFloat(gewaehlt.satz)
                      ? " · aktuell " + num(gewaehlt.satz, 0) + " %" : ""}
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-xs mb-3" style={{ color: C.muted }}>
                    Noch nicht von der Geschäftsführung unterschrieben. Satz {num(gewaehlt.satz, 0)} %.
                  </p>
                  <Unterschrift label="Unterschrift Geschäftsführung" onChange={setGfUnterschrift} />
                  <div className="mt-3">
                    <Btn icon={Check} disabled={!gfUnterschrift} onClick={() => {
                      setz(gewaehlt.id, { vertrag: {
                        art: "Handelsvertretervertrag", rolle: gewaehlt.rolle, satz: gewaehlt.satz,
                        upline: gewaehlt.upline || null, team: gewaehlt.team,
                        gfName: user.name, gfDatum: heute(), gfUnterschrift,
                        partnerUnterschrift: v.partnerUnterschrift || null, partnerDatum: v.partnerDatum || null,
                      } });
                      if (notieren) notieren("Vertrag", "Handelsvertretervertrag " + gewaehlt.name + " unterschrieben");
                      setGfUnterschrift(null);
                    }}>Vertrag unterschreiben</Btn>
                  </div>
                </>
              )}
            </div>
          );
        })()}

        {gewaehlt.status !== "eingeladen" && (
          <div className="rounded p-5" style={{ background: C.card, border: "1px solid " + C.line }}>
            <div className="flex items-baseline justify-between mb-4">
              <span className="text-sm">{gewaehlt.angestellt ? "Persönliche Daten (angestellt bei EGC)" : "Stammdaten als Handelsvertreter"}</span>
              {istGF && gewaehlt.status === "aktiv" && (
                <button className="text-sm" style={{ color: C.strom }}
                  onClick={() => { setSd(gewaehlt.stammdaten || leereStammdaten()); setBearbeiten(!bearbeiten); }}>
                  {bearbeiten ? "Bearbeitung beenden" : "Daten ändern"}
                </button>
              )}
            </div>

            <StammdatenFormular sd={daten} setSd={setSd}
              schreiben={istGF && (bearbeiten || gewaehlt.status === "pruefung")} />

            {istGF && (bearbeiten || gewaehlt.status === "pruefung") && (
              <div className="mt-4">
                <Btn variante="hell" onClick={() => { setz(gewaehlt.id, { stammdaten: daten }); setBearbeiten(false); }}>
                  Änderungen speichern
                </Btn>
              </div>
            )}

            {gewaehlt.freigabe && (
              <p className="text-xs mt-4" style={{ color: C.muted }}>
                Freigegeben von {gewaehlt.freigabe.von} am {datum(gewaehlt.freigabe.datum)}
              </p>
            )}
          </div>
        )}

        {istGF && ["pruefung", "registriert"].includes(gewaehlt.status) && (
          <div className="rounded p-5" style={{ background: C.card, border: "1px solid " + C.strom }}>
            <div className="text-sm mb-3">Prüfung und Freigabe</div>
            <p className="text-sm mb-4" style={{ color: C.muted, maxWidth: "60ch" }}>
              {gewaehlt.angestellt
                ? "Angestellt bei EGC: keine Gewerbeanmeldung nötig. Du kannst direkt freischalten."
                : gewaehlt.status === "registriert"
                  ? "Die Stammdaten sind noch nicht eingereicht. Du kannst trotzdem freischalten: Der Partner kann sofort arbeiten, wird bei jeder Anmeldung an die fehlenden Unterlagen erinnert und kann sie selbst nachtragen. Die Freigabe wird im Protokoll vermerkt."
                  : "Prüfe Gewerbeanmeldung, Ausweis und Bankverbindung auf Übereinstimmung mit der Firmierung. Nach der Freigabe kann nur noch die Geschäftsführung diese Daten ändern."}
            </p>
            <label className="block mb-4">
              <span className="block text-xs mb-1" style={{ color: C.muted }}>
                Hinweis bei Nachbesserung
              </span>
              <textarea rows={3} value={hinweis} onChange={(e) => setHinweis(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded outline-none"
                style={{ border: "1px solid " + C.line }} />
            </label>
            <div className="flex flex-wrap gap-2">
              <Btn variante="ok" icon={Check} onClick={freigeben}>
                {gewaehlt.status === "registriert" && !gewaehlt.angestellt ? "Trotzdem freischalten" : "Freischalten"}
              </Btn>
              <Btn variante="gefahr" icon={RotateCcw} onClick={zurueckweisen} disabled={!hinweis.trim()}>
                Zur Nachbesserung zurück
              </Btn>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ---------- Liste ---------- */
  const zurPruefung = vertrieb.filter((m) => m.status === "pruefung");
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <p className="text-sm" style={{ color: C.muted, maxWidth: "52ch" }}>
          Neue Mitarbeiter werden hier angelegt und erhalten einen Einladungslink zur Registrierung.
        </p>
        <Btn icon={Plus} onClick={() => setNeu({ name: "", email: "", rolle: "Vertriebspartner", team: "", satz: 25, upline: null })}>
          Vertriebsmitarbeiter anlegen
        </Btn>
      </div>

      {istGF && (
        <div className="rounded p-4 mb-5" style={{ background: C.card, border: "1px solid " + C.line }}>
          <div className="text-sm mb-1">Bonus für Eigenakquise</div>
          <p className="text-xs mb-3" style={{ color: C.muted, maxWidth: "62ch" }}>
            Zusätzliche Prozentpunkte für Kunden, die ein Partner selbst gewonnen hat. Der Bonus geht
            zulasten des Firmenanteils, die Overhead-Provision der Teamleiter bleibt unverändert.
          </p>
          <div className="sm:max-w-xs">
            <Feld label="Bonus in Prozentpunkten" value={bonus}
              onChange={(v) => setBonus(v.replace(/[^\d]/g, ""))} />
          </div>
          <p className="text-xs mt-2" style={{ color: C.muted }}>
            Beispiel bei 1.000 € Gesamtprovision: Ein Partner mit 25 % erhält bei Eigenakquise{" "}
            {eur(10 * (25 + (parseFloat(bonus) || 0)))} statt {eur(250)}.
          </p>
        </div>
      )}

      {istGF && strukturanfragen.some((x) => x.status === "offen") && (
        <div className="rounded overflow-hidden mb-5" style={{ background: C.card, border: "1px solid " + C.gas }}>
          <div className="px-4 py-3 text-sm" style={{ color: C.gas, borderBottom: "1px solid " + C.line }}>
            Strukturanfragen der Teamleiter
          </div>
          {strukturanfragen.filter((x) => x.status === "offen").map((x, i) => (
            <button key={x.id} onClick={() => setAnfrageAuswahl(x.id)}
              className="w-full text-left px-4 py-3 flex items-center gap-4"
              style={{ borderTop: i ? "1px solid " + C.line : "none" }}>
              <div className="flex-1">
                <div className="text-sm">{x.name}</div>
                <div className="text-xs" style={{ color: C.muted }}>
                  {num(x.satz, 0)} % · angefragt von {x.von} am {datum(x.datum)}
                </div>
              </div>
              <ChevronRight size={15} style={{ color: C.muted }} />
            </button>
          ))}
        </div>
      )}

      {istGF && zurPruefung.length > 0 && (
        <div className="rounded p-4 mb-5" style={{ background: "#F6F8FA", border: "1px solid " + C.strom }}>
          <span className="text-sm" style={{ color: C.strom }}>
            {zurPruefung.length} Stammdatensatz{zurPruefung.length === 1 ? "" : "-Sätze"} wartet auf deine Freigabe
          </span>
        </div>
      )}

      <div className="rounded overflow-hidden" style={{ background: C.card, border: "1px solid " + C.line }}>
        {vertrieb.map((m, i) => {
          const kopf = mitarbeiter.find((x) => x.id === m.upline);
          return (
            <button key={m.id} onClick={() => { setAuswahl(m.id); setSd(null); setBearbeiten(false); }}
              className="w-full text-left px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-2"
              style={{ borderTop: i ? "1px solid " + C.line : "none" }}>
              <Avatar m={m} size={34} />
              <div className="flex-1 min-w-40">
                <div className="text-sm">{m.name}</div>
                <div className="text-xs" style={{ color: C.muted }}>
                  {m.rolle} · {num(m.satz, 0)} % · {kopf ? "Struktur " + kopf.name : "ohne Strukturkopf"}
                </div>
              </div>
              <div className="w-44"><PartnerStatus status={m.status} /></div>
              <ChevronRight size={15} style={{ color: C.muted }} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* Kundenliste exportieren und Datensicherung */
function Datenexport({ anfragen, mitarbeiter, leads, ablage, versorger, tickets, smartmeter,
                       user, alleSetzen, kundenImport }) {
  const [meldung, setMeldung] = useState("");
  const [importMeldung, setImportMeldung] = useState("");
  const [importPartner, setImportPartner] = useState("");

  const kunden = anfragen.filter((a) =>
    ["uebermittelt", "bestaetigt", "abgeschlossen"].includes(a.status));

  const kopf = ["Vorgang", "Kunde", "Branche", "Akquise", "Herkunft", "Herkunft Detail",
    "Straße", "PLZ", "Ort", "Ansprechpartner", "Telefon",
    "E-Mail", "Status", "Vertriebspartner", "Aufteilung", "Team", "Produkt", "Laufzeit Monate",
    "Lieferbeginn", "Vertragsende", "kWh Strom", "kWh Erdgas", "kWh gesamt", "Aufschlag ct/kWh",
    "Gesamtprovision EUR", "Versorger", "Vertragsstatus", "Zielpreis ct/kWh"];

  const zeile = (a) => {
    const v = aktiveVariante(a);
    const teile = beteiligte(a).map((b) => {
      const m = mitarbeiter.find((x) => x.id === b.id);
      return (m ? m.name : "?") + " " + b.anteil + " %";
    });
    return [
      a.id, a.kunde.firma, a.kunde.branche,
      (AKQUISE_ART.find((x) => x.value === (a.akquiseArt || "eigen")) || {}).label || "",
      a.herkunft || "", a.herkunftDetail || "",
      a.kunde.strasse, a.kunde.plz, a.kunde.ort,
      a.kunde.ansprechpartner, a.kunde.telefon, a.kunde.email, statusVon(a).label,
      a.partnerName, teile.join(" / "), a.team,
      v ? v.produkt : a.produkt, laufzeitVon(a),
      v && v.lieferbeginn ? datum(v.lieferbeginn) : "",
      vertragsende(a) ? datum(vertragsende(a)) : "",
      verbrauchMedium(a, "strom"), verbrauchMedium(a, "gas"), verbrauchGesamt(a),
      a.bestaetigung ? Number(a.bestaetigung.aufschlag) : (v ? Number(v.aufschlag) : Number(a.aufschlag)),
      Math.round(gesamtprovision(a) * 100) / 100,
      a.bestaetigung ? a.bestaetigung.versorger : "",
      a.vertragsStatus || "", a.zielpreis || "",
    ];
  };

  const excel = () => {
    const datei = erzeugeXlsx("kundenliste_" + heute() + ".xlsx", "Kunden",
      [kopf, ...kunden.map(zeile)]);
    if (datei) dateiLaden(datei);
  };

  const pdf = () => {
    const z = [];
    kunden.forEach((a) => {
      const r = zeile(a);
      z.push({ text: a.kunde.firma + "  ·  " + a.id, gross: true });
      z.push("Branche: " + (r[2] || "–") + "   Akquise: " + r[3] +
             "   Herkunft: " + [r[4], r[5]].filter(Boolean).join(", "));
      z.push("Anschrift: " + [r[6], r[7] + " " + r[8]].filter(Boolean).join(", "));
      z.push("Kontakt: " + [r[9], r[10], r[11]].filter(Boolean).join("  ·  "));
      z.push("Betreuung: " + r[14] + "   Status: " + r[12]);
      z.push("Produkt: " + r[16] + ", " + r[17] + " Monate   Lieferbeginn " + (r[18] || "offen") +
             "   Ende " + (r[19] || "offen"));
      z.push("Menge: Strom " + num(r[20]) + " kWh, Erdgas " + num(r[21]) + " kWh, gesamt " + num(r[22]) + " kWh");
      z.push("Aufschlag " + num(r[23], 3) + " ct/kWh   Gesamtprovision " + eur(r[24]) +
             (r[25] ? "   Versorger " + r[25] : ""));
      if (r[27]) z.push("Zielpreis Spotmarkt: " + r[27] + " ct/kWh");
      z.push(" ");
    });
    if (!kunden.length) z.push("Keine Kunden erfasst.");
    z.push("Erstellt am " + datum(heute()) + " um " + jetzt() + " Uhr von " + user.name);
    const datei = erzeugePdf("kundenliste_" + heute() + ".pdf",
      "Kundenliste EGC Energie", z);
    if (datei) dateiLaden(datei);
  };

  const sicherung = () => {
    const daten = { version: VERSION, erstellt: new Date().toISOString(),
      anfragen, mitarbeiter, leads, ablage, versorger, tickets, smartmeter };
    const text = JSON.stringify(daten);
    const url = "data:application/json;base64," + btoa(utf8Binaer(text));
    dateiLaden({ name: "egc-sicherung_" + heute() + ".json", url });
  };

  const einlesen = (datei) => {
    try {
      const roh = decodeURIComponent(escape(atob(String(datei.url).split(",")[1])));
      const d = JSON.parse(roh);
      if (!d.anfragen) throw new Error("kein gültiges Format");
      alleSetzen(d);
      setMeldung("Sicherung eingespielt: " + (d.anfragen || []).length + " Vorgänge, " +
        (d.leads || []).length + " Leads, " + (d.mitarbeiter || []).length + " Mitarbeiter.");
    } catch (e) {
      setMeldung("Die Datei konnte nicht gelesen werden.");
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded p-5" style={{ background: C.card, border: "1px solid " + C.line }}>
        <div className="text-sm mb-1">Kundenliste herunterladen</div>
        <p className="text-sm mb-4" style={{ color: C.muted, maxWidth: "62ch" }}>
          Alle {kunden.length} Kunden über sämtliche Vertriebspartner, Teamleiter und die
          Vertriebsleitung hinweg, mit Kontaktdaten, Mengen, Laufzeiten, Aufschlag und Provision.
        </p>
        <div className="flex flex-wrap gap-2">
          <Btn icon={FileText} onClick={excel}>Als Excel-Datei</Btn>
          <Btn variante="hell" icon={FileText} onClick={pdf}>Als PDF</Btn>
        </div>
      </div>

      <div className="rounded p-5" style={{ background: C.card, border: "1px solid " + C.strom }}>
        <div className="text-sm mb-1">Bestandskunden importieren</div>
        <p className="text-sm mb-4" style={{ color: C.muted, maxWidth: "62ch" }}>
          Übernimmt bestehende Kunden mit laufenden Verträgen aus einer Excel-Datei. Erwartet werden
          die Spalten Firma, Branche, Straße, PLZ, Ort, Ansprechpartner, Telefon, E-Mail, Sparte,
          Versorger, Zählernummer, Marktlokations-ID, Jahresverbrauch, Zählerart, Lieferbeginn,
          Lieferende und Aufschlag. Mehrere Zeilen mit derselben Firma werden zu einem Kunden mit
          mehreren Lieferstellen zusammengefasst.
        </p>
        <div className="grid sm:grid-cols-2 gap-4 items-end mb-4">
          <Select label="Kunden zuordnen an" value={importPartner} onChange={setImportPartner}
            options={[{ value: "", label: "Bitte wählen" },
              ...mitarbeiter.filter((m) => ["Vertriebspartner", "Teamleiter", "Leitung Vertrieb"].includes(m.rolle))
                .map((m) => ({ value: m.id, label: m.name + " · " + m.rolle }))]} />
          <label className="inline-flex items-center gap-2 px-3.5 py-2 text-sm rounded cursor-pointer"
                 style={{ border: "1px solid " + C.line, background: importPartner ? "#fff" : "#F1F3F5",
                          opacity: importPartner ? 1 : 0.5 }}>
            <Upload size={15} /> Excel-Datei wählen
            <input type="file" accept=".xlsx,.xls,.csv" className="hidden" disabled={!importPartner}
              onChange={(e) => {
                const f = e.target.files && e.target.files[0];
                if (f) dateiLesen(f, async (d) => {
                  setImportMeldung("Wird eingelesen …");
                  try { setImportMeldung(await kundenImport(d, importPartner)); }
                  catch (fehler) { setImportMeldung(fehler.message || "Die Datei konnte nicht gelesen werden."); }
                });
              }} />
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          <Btn variante="hell" icon={FileText} onClick={() => {
            const v = erzeugeXlsx("bestandskunden_vorlage.xlsx", "Bestandskunden", [
              ["Firma", "Branche", "Straße", "PLZ", "Ort", "Ansprechpartner", "Telefon", "E-Mail",
               "Sparte", "Versorger", "Kundennummer", "Zählernummer", "Marktlokations-ID",
               "Jahresverbrauch kWh", "Zählerart", "Lieferbeginn", "Lieferende", "Aufschlag ct/kWh"],
              ["Beispiel GmbH", "Hotellerie", "Musterstraße 1", "66111", "Saarbrücken", "Herr Muster",
               "0681 123456", "info@beispiel.de", "Strom", "Stadtwerke", "4711", "1ESY116089",
               "51238106877", 120000, "SLP", "01.01.2026", "31.12.2027", 0.6],
            ]);
            if (v) dateiLaden(v);
          }}>Vorlage herunterladen</Btn>
        </div>
        {importMeldung && <p className="text-sm mt-3" style={{ color: C.ok }}>{importMeldung}</p>}
      </div>

      <div className="rounded p-5" style={{ background: C.card, border: "1px solid " + C.gruen }}>
        <div className="text-sm mb-1">Datensicherung</div>
        <p className="text-sm mb-4" style={{ color: C.muted, maxWidth: "62ch" }}>
          Sichert den vollständigen Datenbestand in eine Datei: Vorgänge, Kunden, Leads, Mitarbeiter,
          Tickets, Smartmeter, Versorger und Unterlagen. Lege eine Sicherung an, bevor eine neue
          Programmversion eingespielt wird.
        </p>
        <div className="flex flex-wrap gap-2 items-center">
          <Btn icon={Upload} onClick={sicherung}>Sicherung herunterladen</Btn>
          <label className="inline-flex items-center gap-2 px-3.5 py-2 text-sm rounded cursor-pointer"
                 style={{ border: "1px solid " + C.line, background: "#fff" }}>
            <RotateCcw size={15} /> Sicherung einspielen
            <input type="file" accept=".json,application/json" className="hidden"
              onChange={(e) => {
                const f = e.target.files && e.target.files[0];
                if (f) dateiLesen(f, einlesen);
              }} />
          </label>
        </div>
        {meldung && <p className="text-sm mt-3" style={{ color: C.ok }}>{meldung}</p>}
        <p className="text-xs mt-4" style={{ color: C.muted, maxWidth: "62ch" }}>
          Einspielen ersetzt den aktuellen Bestand vollständig. Vorher am besten eine frische
          Sicherung ziehen.
        </p>
      </div>
    </div>
  );
}

/* Punkt 4: Benachrichtigungen werden aus dem Datenbestand abgeleitet.
   Gelesenes merkt sich der Mitarbeiter über die Schlüssel der Meldungen. */
/* Kundenprüfung: zeigt nur, ob eine Firma schon im Bestand ist */
function Kundenpruefung({ anfragen, leads, mitarbeiter, user }) {
  const [name, setName] = useState("");
  const [plz, setPlz] = useState("");
  const [malo, setMalo] = useState("");
  const [ergebnis, setErgebnis] = useState(null);

  const norm = (t) => String(t || "").toLowerCase().replace(/[^a-zäöüß0-9]/g, "");
  const kurz = (t) => {
    /* Rechtsformen abschneiden, damit "Muster GmbH" und "Muster" zusammenfinden */
    let n = norm(t);
    ["gmbhcokg", "gmbhco", "gmbh", "ohg", "kgaa", "kg", "ag", "ek", "ev", "gbr", "ug", "mbh"]
      .forEach((r) => { if (n.endsWith(r)) n = n.slice(0, -r.length); });
    return n;
  };

  /* Geprüft wird auf dem Server über alle Vorgänge und Leads im Haus.
     Zurück kommt nur die Art des Treffers, nie wer den Kunden betreut. */
  const pruefen = async () => {
    const gesucht = kurz(name);
    if (gesucht.length < 3) { setErgebnis({ art: "kurz" }); return; }
    const eigene = anfragen.filter((a) => istBeteiligt(a, user.id) && a.status !== "abgelehnt" &&
      (kurz(a.kunde.firma) === gesucht || kurz(a.kunde.firma).includes(gesucht)));
    try {
      const { data, error } = await sb.rpc("kunde_pruefen", { p_firma: name, p_plz: plz, p_malo: malo });
      if (error) throw error;
      setErgebnis({ art: data.art, eigene, anzahl: data.anzahl });
    } catch (e) {
      setErgebnis({ art: "fehler", text: (e && e.message) || String(e) });
    }
  };

  const Antwort = () => {
    if (!ergebnis) return null;
    if (ergebnis.art === "kurz")
      return <p className="text-sm" style={{ color: C.muted }}>Bitte mindestens drei Zeichen eingeben.</p>;
    if (ergebnis.art === "fehler")
      return <p className="text-sm mt-5" style={{ color: C.warn }}>Prüfung nicht möglich: {ergebnis.text}</p>;

    const bilder = {
      frei: { farbe: C.ok, hg: "#F1F7F0", titel: "Noch nicht im Bestand",
        text: "Zu dieser Firma ist bei uns nichts erfasst. Du kannst sie ohne Rücksprache angehen." },
      kunde: { farbe: C.warn, hg: "#FCF3F0", titel: "Bereits Kunde",
        text: "Diese Firma ist bereits Kunde bei uns. Bitte kläre vor einem Kontakt mit deinem Teamleiter, wie weiter vorzugehen ist." },
      bearbeitung: { farbe: C.gas, hg: "#FDF6EE", titel: "Wird bereits bearbeitet",
        text: "Zu dieser Firma läuft bereits ein Vorgang. Bitte kläre vor einem Kontakt mit deinem Teamleiter, wie weiter vorzugehen ist." },
      lead: { farbe: C.gas, hg: "#FDF6EE", titel: "Als Lead erfasst",
        text: "Diese Firma ist bereits als Lead im System. Bitte kläre vor einem Kontakt mit deinem Teamleiter, wie weiter vorzugehen ist." },
    };
    const b = bilder[ergebnis.art];

    return (
      <div className="rounded p-5 mt-5" style={{ background: b.hg, border: "1px solid " + b.farbe }}>
        <div className="flex items-center gap-2 mb-2" style={{ color: b.farbe }}>
          {ergebnis.art === "frei" ? <Check size={18} /> : <AlertTriangle size={18} />}
          <span className="text-lg">{b.titel}</span>
        </div>
        <p className="text-sm" style={{ maxWidth: "60ch" }}>{b.text}</p>

        {ergebnis.eigene && ergebnis.eigene.length > 0 && (
          <div className="mt-4 pt-4" style={{ borderTop: "1px solid " + C.line }}>
            <div className="text-sm mb-2">Davon betreust du selbst:</div>
            {ergebnis.eigene.map((a) => (
              <div key={a.id} className="text-sm py-1">
                {a.kunde.firma} · {a.id} · {statusVon(a).label}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <p className="text-sm mb-5" style={{ color: C.muted, maxWidth: "62ch" }}>
        Prüfe vor der Ansprache, ob eine Firma schon bei uns geführt wird. Du erfährst nur, ob sie
        im Bestand ist — nicht, wer sie betreut.
      </p>

      <div className="rounded p-5" style={{ background: C.card, border: "1px solid " + C.line }}>
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <Feld label="Firmenname" value={name} onChange={(v) => { setName(v); setErgebnis(null); }}
              placeholder="z. B. Hotel Saarblick" />
          </div>
          <Feld label="PLZ, freiwillig" value={plz} onChange={(v) => { setPlz(v); setErgebnis(null); }} />
          <div className="sm:col-span-3">
            <Feld label="Marktlokations-ID, freiwillig und am sichersten" value={malo}
              onChange={(v) => { setMalo(v); setErgebnis(null); }} placeholder="11-stellig" />
          </div>
        </div>
        <div className="mt-4">
          <Btn icon={Check} onClick={pruefen} disabled={!name.trim()}>Prüfen</Btn>
        </div>
      </div>

      <Antwort />

      <p className="text-xs mt-5" style={{ color: C.muted, maxWidth: "62ch" }}>
        Geprüft werden alle Vorgänge und Leads im Haus. Rechtsformen wie GmbH oder e.K. werden beim
        Vergleich ausgeblendet. Die sicherste Prüfung ist die Marktlokations-ID, weil Firmennamen sich
        ähneln oder ändern können.
      </p>
    </div>
  );
}

function Vertraege({ tippgeber, setTippgeber, mitarbeiter, setMitarbeiter, anfragen, user, notieren,
                     firmendaten, setFirmendaten }) {
  const [reiter, setReiter] = useState("tippgeber");
  const [grund, setGrund] = useState({});
  const [offenId, setOffenId] = useState(null);
  const [neuTG, setNeuTG] = useState(null);
  const vertrieb = mitarbeiter.filter((m) => ["Vertriebspartner", "Teamleiter", "Leitung Vertrieb"].includes(m.rolle));
  const koepfe = mitarbeiter.filter((m) => ["Teamleiter", "Leitung Vertrieb"].includes(m.rolle));
  const name = (id) => id === TG_FIRMA ? "EGC Energie (Firma)"
    : (mitarbeiter.find((m) => m.id === id) || {}).name || "unbekannt";
  const kunden = (t) => anfragen.filter((a) => a.tippgeber && a.tippgeber.id === t.id
    && ["bestaetigt", "abgeschlossen"].includes(a.status)).length;
  const wartend = tippgeber.filter((t) => t.status !== "freigegeben" && t.status !== "abgelehnt");

  const setTG = (t, aend, text) => {
    setTippgeber(tippgeber.map((x) => (x.id === t.id ? { ...x, ...aend } : x)));
    if (notieren && text) notieren("Tippgeber", text);
  };
  const freigeben = (t, an) => setTG(t,
    an ? { status: "freigegeben", freigabe: { von: user.name, datum: heute() }, ablehnung: "" }
       : { status: "wartet", freigabe: null },
    (t.firma || t.name) + " von " + name(t.besitzerId) + (an ? " freigegeben (" + tippgeberText(t) + ")" : ": Freigabe zurückgenommen"));
  const ablehnen = (t) => setTG(t, { status: "abgelehnt", ablehnung: (grund[t.id] || "").trim(), freigabe: null },
    (t.firma || t.name) + " von " + name(t.besitzerId) + " abgelehnt");
  /* Die Geschäftsführung legt Tippgeber selbst an: für einen Vertriebspartner
     (Vergütung geht von dessen Provision ab) oder für die Firma (EGC trägt sie).
     Was die Geschäftsführung anlegt, ist sofort freigegeben. */
  const tgAnlegen = () => {
    const t = { ...neuTG, zahlweise: zahlweiseVon(neuTG.art), status: "freigegeben",
                freigabe: { von: user.name, datum: heute() }, ablehnung: "" };
    setTippgeber([...tippgeber, t]);
    if (notieren) notieren("Tippgeber", (t.firma || t.name) + " angelegt für " + name(t.besitzerId)
      + " und freigegeben (" + tippgeberText(t) + ")");
    setNeuTG(null);
  };
  const zuordnen = (t, id, an) => {
    const alt = t.zugeordnet || [];
    setTG(t, { zugeordnet: an ? [...new Set([...alt, id])] : alt.filter((x) => x !== id) },
      (t.firma || t.name) + (an ? " zugeordnet an " : " nicht mehr zugeordnet an ") + name(id));
  };
  /* keine Kreise in der Struktur: niemand unter sich selbst oder seinen eigenen Leuten */
  const moeglicheKoepfe = (m) => {
    const unter = new Set(strukturUnter(m.id, mitarbeiter).map((x) => x.id));
    return koepfe.filter((k) => k.id !== m.id && !unter.has(k.id));
  };
  const strukturSetzen = (m, upline) => {
    setMitarbeiter(mitarbeiter.map((x) => (x.id === m.id ? { ...x, upline: upline || null } : x)));
    if (notieren) notieren("Struktur", m.name + " zugeordnet an " + (upline ? name(upline) : "niemanden"));
  };
  const Reiter = ({ id, children }) => (
    <button onClick={() => { setReiter(id); setOffenId(null); }} className="px-3 py-1.5 rounded text-sm"
      style={reiter === id ? { background: C.ink, color: "#fff" } : { background: "#fff", color: C.text, border: "1px solid " + C.line }}>
      {children}
    </button>
  );

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-5">
        <Reiter id="tippgeber">Tippgeber ({tippgeber.length}{wartend.length ? ", " + wartend.length + " offen" : ""})</Reiter>
        <Reiter id="partner">Vertriebsmitarbeiter ({vertrieb.length})</Reiter>
        <Reiter id="firma">Firmendaten</Reiter>
        <Reiter id="visitenkarten">Visitenkarten</Reiter>
      </div>

      {reiter === "tippgeber" && !neuTG && (
        <div className="mb-4">
          <Btn icon={Plus} onClick={() => setNeuTG(leererTippgeber(TG_FIRMA))}>Tippgeber anlegen</Btn>
        </div>
      )}
      {reiter === "tippgeber" && neuTG && (
        <div className="rounded p-5 space-y-5 mb-5" style={{ background: C.card, border: "1px solid " + C.line }}>
          <h3 className="text-base">Neuer Tippgeber</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <Feld label="Firma" value={neuTG.firma} onChange={(v) => setNeuTG({ ...neuTG, firma: v })} />
            <Feld label="Ansprechpartner" value={neuTG.name} onChange={(v) => setNeuTG({ ...neuTG, name: v })} />
            <Feld label="Telefon" value={neuTG.telefon} onChange={(v) => setNeuTG({ ...neuTG, telefon: v })} />
            <Feld label="E-Mail" value={neuTG.email} onChange={(v) => setNeuTG({ ...neuTG, email: v })} />
            <Feld label="Anschrift" value={neuTG.adresse} onChange={(v) => setNeuTG({ ...neuTG, adresse: v })} breit />
            <Select label="Wer betreut den Tippgeber?" value={neuTG.besitzerId} breit
              onChange={(v) => setNeuTG({ ...neuTG, besitzerId: v })}
              options={[{ value: TG_FIRMA, label: "EGC Energie (Firma)" },
                ...vertrieb.map((m) => ({ value: m.id, label: m.name + " (" + m.rolle + ")" }))]} />
            <Select label="Wie wird vergütet?" value={neuTG.art}
              onChange={(v) => setNeuTG({ ...neuTG, art: v, wert: v === "kwh" ? TIPPGEBER_VORSCHLAG_KWH : "10" })}
              options={[{ value: "kwh", label: "Festbetrag je 100.000 kWh, einmalig" },
                        { value: "prozent", label: "Prozentual an der Provision, jährlich" }]} />
            <Feld label={neuTG.art === "kwh" ? "Wert in € je 100.000 kWh" : "Wert in %"} value={neuTG.wert}
              onChange={(v) => setNeuTG({ ...neuTG, wert: v })} />
            <Feld label="Notiz" value={neuTG.notiz} onChange={(v) => setNeuTG({ ...neuTG, notiz: v })} breit />
          </div>
          <p className="text-xs" style={{ color: C.muted, maxWidth: "62ch" }}>
            {neuTG.besitzerId === TG_FIRMA
              ? "Die Vergütung trägt EGC, kein Vertriebspartner wird belastet." +
                (neuTG.art === "prozent" ? " Prozentual heißt hier: Anteil an der Provision, die bei EGC ankommt." : "") +
                " Damit Vertriebspartner den Tippgeber an ihren Vorgängen auswählen können, ordnest du ihn danach über „Zuordnen“ zu."
              : "Die Vergütung geht von der Provision des gewählten Vertriebspartners ab, genau so, als hätte er den Tippgeber selbst angelegt."}
            {" "}Der Tippgeber ist sofort freigegeben; den Tippgebervertrag erzeugst du danach in der Liste.
          </p>
          <div className="flex gap-2">
            <Btn icon={Check} onClick={tgAnlegen} disabled={(!neuTG.firma && !neuTG.name) || !tgZahl(neuTG.wert)}>
              Anlegen und freigeben
            </Btn>
            <Btn variante="hell" onClick={() => setNeuTG(null)}>Abbrechen</Btn>
          </div>
        </div>
      )}
      {reiter === "tippgeber" && !neuTG && (tippgeber.length === 0 ? (
        <div className="rounded p-8 text-center text-sm" style={{ border: "1px dashed " + C.line, color: C.muted }}>
          Noch keine Tippgeber angelegt.
        </div>
      ) : (
        <div className="space-y-3">
          {[...wartend, ...tippgeber.filter((t) => !wartend.includes(t))].map((t) => (
            <div key={t.id} className="rounded p-4" style={{ background: C.card,
                 border: "1px solid " + (wartend.includes(t) ? C.gas : C.line) }}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1 min-w-48">
                  <div className="text-sm">{t.firma || t.name}</div>
                  <div className="text-xs" style={{ color: C.muted }}>
                    {[t.firma && t.name ? t.name : null, t.telefon, t.email, t.adresse].filter(Boolean).join(" · ")}
                  </div>
                  <div className="text-sm mt-1">{t.art ? tippgeberText(t) : "Vergütung nicht hinterlegt"}</div>
                  <div className="text-xs" style={{ color: C.muted }}>
                    angelegt von {name(t.besitzerId)} am {datum(t.angelegt)} · {kunden(t)} Kunden
                    {(t.zugeordnet || []).length ? " · auch bei " + t.zugeordnet.map(name).join(", ") : ""}
                  </div>
                  {t.status === "abgelehnt" && t.ablehnung && (
                    <div className="text-xs mt-1" style={{ color: C.warn }}>Abgelehnt: {t.ablehnung}</div>
                  )}
                </div>
                <div className="text-right space-y-2">
                  <label className="flex items-center justify-end gap-2 text-sm">
                    <input type="checkbox" checked={tippgeberFrei(t)} onChange={(e) => freigeben(t, e.target.checked)}
                      disabled={!t.art} style={{ accentColor: C.ok, width: 18, height: 18 }} />
                    Freigegeben
                  </label>
                  <TippgeberStatus t={t} />
                  <button className="block text-xs ml-auto" style={{ color: C.strom }}
                    onClick={() => tippgeberVertragPdf(t, mitarbeiter, user)}>Tippgebervertrag als PDF</button>
                  <button className="block text-xs ml-auto" style={{ color: C.strom }}
                    onClick={() => setOffenId(offenId === t.id ? null : t.id)}>
                    {offenId === t.id ? "Schließen" : "Zuordnen oder ablehnen"}
                  </button>
                </div>
              </div>
              {offenId === t.id && (
                <div className="mt-4 pt-3 grid sm:grid-cols-2 gap-4" style={{ borderTop: "1px solid " + C.line }}>
                  <div>
                    <div className="text-xs mb-2" style={{ color: C.muted }}>
                      Weiteren Partnern zuordnen (sie sehen nur Name und Kontakt)
                    </div>
                    <div className="space-y-1.5">
                      {vertrieb.filter((m) => m.id !== t.besitzerId).map((m) => (
                        <label key={m.id} className="flex items-center gap-2 text-sm">
                          <input type="checkbox" checked={(t.zugeordnet || []).includes(m.id)}
                            onChange={(e) => zuordnen(t, m.id, e.target.checked)} style={{ accentColor: C.ink }} />
                          {m.name} <span className="text-xs" style={{ color: C.muted }}>{m.rolle}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Feld label="Begründung bei Ablehnung" value={grund[t.id] || ""}
                      onChange={(v) => setGrund({ ...grund, [t.id]: v })} />
                    <div className="mt-2">
                      <Btn variante="gefahr" disabled={!(grund[t.id] || "").trim()} onClick={() => ablehnen(t)}>
                        Ablehnen
                      </Btn>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ))}

      {reiter === "partner" && (
        <div className="rounded overflow-hidden" style={{ background: C.card, border: "1px solid " + C.line }}>
          {vertrieb.map((m, i) => {
            const v = m.vertrag || {};
            return (
              <div key={m.id} className="px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-2"
                   style={{ borderTop: i ? "1px solid " + C.line : "none" }}>
                <div className="flex-1 min-w-40">
                  <div className="text-sm">{m.name}</div>
                  <div className="text-xs" style={{ color: C.muted }}>{m.rolle} · {num(m.satz || 0, 0)} %</div>
                </div>
                {m.angestellt ? (
                  <div className="w-52 text-xs" style={{ color: C.muted }}>
                    Angestellt bei EGC · kein Handelsvertretervertrag, Abrechnung über die Lohnabrechnung
                  </div>
                ) : (
                <div className="w-52 text-xs">
                  <div style={{ color: v.gfUnterschrift ? C.ok : C.warn }}>
                    {v.gfUnterschrift ? "✓ von EGC unterschrieben " + datum(v.gfDatum) : "EGC hat noch nicht unterschrieben"}
                  </div>
                  <div style={{ color: v.partnerUnterschrift ? C.ok : C.muted }}>
                    {v.partnerUnterschrift ? "✓ vom Partner unterschrieben " + datum(v.partnerDatum) : "Partner hat noch nicht unterschrieben"}
                  </div>
                </div>
                )}
                <div className="w-56">
                  <Select label="Struktur" value={m.upline || ""} onChange={(x) => strukturSetzen(m, x)}
                    options={[{ value: "", label: "Keine Zuordnung" },
                      ...moeglicheKoepfe(m).map((k) => ({ value: k.id, label: k.name + " · " + k.rolle }))]} />
                </div>
                {v.gfUnterschrift && !m.angestellt && (
                  <button className="text-xs" style={{ color: C.strom }}
                    onClick={() => vertragPdf(m, mitarbeiter)}>Vertrag als PDF</button>
                )}
              </div>
            );
          })}
          <p className="px-4 py-3 text-xs" style={{ color: C.muted, borderTop: "1px solid " + C.line }}>
            Unterschreiben kannst du unter „Vertriebsmitarbeiter“ beim jeweiligen Partner.
          </p>
        </div>
      )}

      {reiter === "visitenkarten" && (
        <div className="space-y-3">
          <p className="text-xs" style={{ color: C.muted, maxWidth: "62ch" }}>
            Visitenkarten für den Vertrieb. Was du hier einträgst, steht auf der Karte; leere Felder nehmen
            die Angaben aus dem Profil (Mobil aus der Telefonnummer des Partners, Festnetz der Firma). Der Titel
            erscheint nur, wenn er ausgefüllt ist. Nach „Erstellen und freigeben“ sieht der Partner seine Karte
            unter Unterlagen → Marketing und lädt die Druckdatei selbst herunter: Druckdatei 85 × 55 mm mit
            3 mm Beschnitt, Vorder- und Rückseite, mit QR-Code zum Speichern des Kontakts.
          </p>
          {mitarbeiter.filter((m) => VISITENKARTE_ROLLEN.includes(m.rolle) && m.status !== "gesperrt" && !/^t-/.test(m.id))
            .sort((x, y) => (x.name || "").localeCompare(y.name || "")).map((m) => {
            const v = m.visitenkarte || {}, d = visitenkartenDaten(m);
            const setV = (k, w) => setMitarbeiter(mitarbeiter.map((x) => (x.id === m.id
              ? { ...x, visitenkarte: { ...(x.visitenkarte || {}), [k]: w } } : x)));
            return (
              <div key={m.id} className="rounded p-4" style={{ background: C.card, border: "1px solid " + C.line }}>
                <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
                  <span className="text-sm">{m.name} <span className="text-xs" style={{ color: C.muted }}>{m.rolle}</span></span>
                  <span className="flex items-center gap-3">
                    <button className="text-xs" style={{ color: C.strom }} onClick={async () => {
                      try { dateiLaden(await visitenkartePdf(m)); }
                      catch (e) { alert("Die Visitenkarte konnte nicht erzeugt werden: " + ((e && e.message) || e)); }
                    }}>Vorschau (PDF)</button>
                    <button className="text-xs" style={{ color: C.strom }} onClick={async () => {
                      try { dateiLaden(await portfolioFlyerPdf(m)); }
                      catch (e) { alert("Der Flyer konnte nicht erzeugt werden: " + ((e && e.message) || e)); }
                    }}>Flyer (PDF)</button>
                    <button className="text-xs" style={{ color: C.strom }} onClick={async () => {
                      try { dateiLaden(await imagebroschuerePdf(m)); }
                      catch (e) { alert("Die Broschüre konnte nicht erzeugt werden: " + ((e && e.message) || e)); }
                    }}>Broschüre (PDF)</button>
                  </span>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <Feld label="Berufsbezeichnung" value={v.titel || ""} placeholder={d.titel} onChange={(w) => setV("titel", w)} />
                  <Feld label="Titel (freiwillig), z. B. staatl. gepr. Techniker, Energiemanager ISO 50001" value={v.zusatz || ""}
                    onChange={(w) => setV("zusatz", w)} />
                  <Feld label="E-Mail auf der Karte" value={v.email || ""} placeholder={d.email} onChange={(w) => setV("email", w)} />
                  <Feld label="Mobil" value={v.mobil || ""} placeholder={d.mobil || "fehlt noch"} onChange={(w) => setV("mobil", w)}
                    fehler={!d.mobil ? "Mobilnummer fehlt" : null} />
                  <Feld label="Telefon (Festnetz)" value={v.telefon || ""} placeholder={d.telefon} onChange={(w) => setV("telefon", w)} />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  {v.freigegeben ? (
                    <>
                      <span className="text-xs" style={{ color: C.ok }}>✓ freigegeben, {m.name} sieht sie unter Unterlagen → Marketing</span>
                      <button className="text-xs" style={{ color: C.muted }} onClick={() => setV("freigegeben", false)}>Freigabe zurücknehmen</button>
                    </>
                  ) : (
                    <Btn icon={Check} disabled={!d.mobil} onClick={() => {
                      setV("freigegeben", true);
                      if (notieren) notieren("Visitenkarte", "Visitenkarte für " + m.name + " erstellt und freigegeben");
                    }}>Visitenkarte erstellen und freigeben</Btn>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {reiter === "firma" && firmendaten && (
        <div className="rounded p-4" style={{ background: C.card, border: "1px solid " + C.line }}>
          <p className="text-xs mb-3" style={{ color: C.muted, maxWidth: "62ch" }}>
            Erscheinen in den Verträgen unter „Auftraggeber“ und in der Fußzeile der Angebote.
          </p>
          <div className="grid sm:grid-cols-3 gap-3">
            <Feld label="Vertreten durch" value={firmendaten.vertreter}
              onChange={(v) => setFirmendaten({ ...firmendaten, vertreter: v })} />
            <Feld label="Straße und Hausnummer" value={firmendaten.strasse}
              onChange={(v) => setFirmendaten({ ...firmendaten, strasse: v })} />
            <Feld label="PLZ und Ort" value={firmendaten.ort}
              onChange={(v) => setFirmendaten({ ...firmendaten, ort: v })} />
            <Feld label="Telefon" value={firmendaten.telefon || ""}
              onChange={(v) => setFirmendaten({ ...firmendaten, telefon: v })} />
            <Feld label="E-Mail Kundenservice" value={firmendaten.email || ""}
              onChange={(v) => setFirmendaten({ ...firmendaten, email: v })} />
            <Feld label="USt-IdNr." value={firmendaten.ustId || ""}
              onChange={(v) => setFirmendaten({ ...firmendaten, ustId: v })} />
            <Feld label="Website" value={firmendaten.website || ""}
              onChange={(v) => setFirmendaten({ ...firmendaten, website: v })} />
            <Feld label="Bank" value={firmendaten.bank || ""}
              onChange={(v) => setFirmendaten({ ...firmendaten, bank: v })} />
            <Feld label="IBAN" value={firmendaten.iban || ""}
              onChange={(v) => setFirmendaten({ ...firmendaten, iban: v })} />
            <Feld label="BIC" value={firmendaten.bic || ""}
              onChange={(v) => setFirmendaten({ ...firmendaten, bic: v })} />
          </div>
        </div>
      )}
    </div>
  );
}

/* Vom Versorger bestätigte Aufträge, bei denen die Provision noch aussteht */
function ProvisionAusstehend({ anfragen, mitarbeiter, user, onOeffnen }) {
  const [versorgerFilter, setVersorgerFilter] = useState("alle");
  const offen = anfragen.filter((a) => a.status === "bestaetigt");
  const versorger = [...new Set(offen.map((a) => (a.bestaetigung || {}).versorger).filter(Boolean))].sort();
  const liste = offen
    .filter((a) => versorgerFilter === "alle" || (a.bestaetigung || {}).versorger === versorgerFilter)
    .sort((x, y) => ((y.bestaetigung || {}).datum || "").localeCompare((x.bestaetigung || {}).datum || ""));

  const summe = liste.reduce((t, a) => t + gesamtprovision(a), 0);
  const menge = liste.reduce((t, a) => t + bestaetigteMenge(a), 0);

  return (
    <div>
      <p className="text-sm mb-4" style={{ color: C.muted, maxWidth: "62ch" }}>
        Aufträge, die das Kalkulationsteam als vom Versorger bestätigt gemeldet hat. Sobald du den
        Provisionseingang bestätigst, erscheint der Kunde beim Vertriebspartner in der Provisionsliste
        und beim Vertragsmanagement in der Betreuung.
      </p>

      <div className="grid sm:grid-cols-3 gap-3 mb-5">
        {[["Offene Vorgänge", String(liste.length), C.text],
          ["Erwartete Provision", eur(summe), C.gas],
          ["Bestätigte Menge", num(menge) + " kWh", C.text]].map(([k, v, f]) => (
          <div key={k} className="rounded p-4" style={{ background: C.card, border: "1px solid " + C.line }}>
            <div className="text-xs mb-2" style={{ color: C.muted }}>{k}</div>
            <div className="text-2xl" style={{ color: f, fontVariantNumeric: "tabular-nums" }}>{v}</div>
          </div>
        ))}
      </div>

      <div className="rounded p-3 mb-5" style={{ background: C.card, border: "1px solid " + C.line }}>
        <Select label="Versorger" value={versorgerFilter} onChange={setVersorgerFilter}
          options={[{ value: "alle", label: "Alle Versorger" }, ...versorger]} />
      </div>

      {liste.length === 0 ? (
        <div className="rounded p-8 text-center text-sm"
             style={{ border: "1px dashed " + C.line, color: C.muted }}>
          Keine offenen Provisionen.
        </div>
      ) : (
        <div className="rounded overflow-hidden" style={{ background: C.card, border: "1px solid " + C.line }}>
          {liste.map((a, i) => (
            <button key={a.id} onClick={() => onOeffnen(a.id)}
              className="w-full text-left px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-1"
              style={{ borderTop: i ? "1px solid " + C.line : "none" }}>
              <div className="flex-1 min-w-40">
                <div className="text-sm">{a.kunde.firma}</div>
                <div className="text-xs" style={{ color: C.muted }}>
                  {a.id} · {a.partnerName} · bestätigt {datum((a.bestaetigung || {}).datum)}
                </div>
              </div>
              <span className="text-xs w-40" style={{ color: C.muted }}>
                {(a.bestaetigung || {}).versorger}
              </span>
              <span className="text-sm w-28 text-right" style={{ fontVariantNumeric: "tabular-nums" }}>
                {num(bestaetigteMenge(a))} kWh
              </span>
              <span className="text-sm w-28 text-right"
                    style={{ color: C.gas, fontVariantNumeric: "tabular-nums" }}>
                {eur(gesamtprovision(a))}
              </span>
              <ChevronRight size={15} style={{ color: C.muted }} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* Branchenauswertung: welche Branche bringt Menge, Anfragen und Abschlüsse */
const MONATSNAMEN = ["Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember"];

function Branchen({ anfragen, onListe }) {
  const jetztJahr = new Date().getFullYear();
  const [jahr, setJahr] = useState(String(jetztJahr));
  const [monat, setMonat] = useState("alle");
  const [sortierung, setSortierung] = useState("menge");

  const jahre = [...new Set(anfragen.map((a) => String(new Date(a.angelegt).getFullYear()))
    .filter((j) => j !== "NaN"))].sort().reverse();

  const imZeitfenster = (a) => {
    const v = aktiveVariante(a);
    const tag = a.status === "abgeschlossen" && v && v.lieferbeginn ? v.lieferbeginn : a.angelegt;
    const d = new Date(tag);
    if (isNaN(d)) return false;
    if (jahr !== "alle" && String(d.getFullYear()) !== jahr) return false;
    if (monat !== "alle" && d.getMonth() !== parseInt(monat)) return false;
    return true;
  };

  const menge = anfragen.filter(imZeitfenster);
  const gruppen = {};
  menge.forEach((a) => {
    const b = (a.kunde.branche || "").trim() || "ohne Angabe";
    if (!gruppen[b]) gruppen[b] = { name: b, anfragen: 0, abschluesse: 0, verloren: 0, kwh: 0, provision: 0 };
    gruppen[b].anfragen += 1;
    if (a.status === "abgeschlossen") {
      gruppen[b].abschluesse += 1;
      gruppen[b].kwh += bestaetigteMenge(a) || verbrauchGesamt(a);
      gruppen[b].provision += gesamtprovision(a);
    }
    if (a.status === "abgelehnt") gruppen[b].verloren += 1;
  });

  const zeilen = Object.values(gruppen).map((g) => ({
    ...g,
    quote: g.abschluesse + g.verloren > 0 ? (g.abschluesse / (g.abschluesse + g.verloren)) * 100 : 0,
  })).sort((x, y) =>
    sortierung === "menge" ? y.kwh - x.kwh
    : sortierung === "anfragen" ? y.anfragen - x.anfragen
    : sortierung === "quote" ? y.quote - x.quote
    : y.provision - x.provision);

  const maxKwh = Math.max(...zeilen.map((z) => z.kwh), 1);
  const summe = (f) => zeilen.reduce((t, z) => t + f(z), 0);

  const Kopf = ({ children, rechts, aktiv, aufKlick }) => (
    <th onClick={aufKlick}
        className={"px-3 py-2 text-xs font-normal " + (rechts ? "text-right" : "text-left")}
        style={{ color: aktiv ? C.text : C.muted, whiteSpace: "nowrap",
                 cursor: aufKlick ? "pointer" : "default",
                 borderBottom: "1px solid " + (aktiv ? C.ink : C.line) }}>
      {children}{aktiv ? " ↓" : ""}
    </th>
  );
  const Zelle = ({ children, rechts, dick }) => (
    <td className={"px-3 py-2.5 text-sm " + (rechts ? "text-right" : "")}
        style={{ fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap",
                 borderTop: "1px solid " + C.line, fontWeight: dick ? 500 : 400 }}>{children}</td>
  );

  return (
    <div>
      <p className="text-sm mb-4" style={{ color: C.muted, maxWidth: "64ch" }}>
        Welche Branche liefert Menge, Anfragen und Abschlüsse. Über Jahr und Monat lässt sich
        eingrenzen — so wird über die Zeit sichtbar, welche Branchen wann am stärksten sind.
      </p>

      <div className="rounded p-3 mb-5 grid sm:grid-cols-3 gap-3"
           style={{ background: C.card, border: "1px solid " + C.line }}>
        <Select label="Jahr" value={jahr} onChange={setJahr}
          options={[{ value: "alle", label: "Alle Jahre" }, ...jahre]} />
        <Select label="Monat" value={monat} onChange={setMonat}
          options={[{ value: "alle", label: "Ganzes Jahr" },
            ...MONATSNAMEN.map((m, i) => ({ value: String(i), label: m }))]} />
        <Select label="Sortieren nach" value={sortierung} onChange={setSortierung}
          options={[{ value: "menge", label: "Abgeschlossene kWh" },
                    { value: "anfragen", label: "Anfragen" },
                    { value: "quote", label: "Abschlussquote" },
                    { value: "provision", label: "Provision" }]} />
      </div>

      {zeilen.length === 0 ? (
        <div className="rounded p-8 text-center text-sm"
             style={{ border: "1px dashed " + C.line, color: C.muted }}>
          Keine Vorgänge in diesem Zeitraum.
        </div>
      ) : (
        <div className="rounded overflow-x-auto" style={{ background: C.card, border: "1px solid " + C.line }}>
          <table className="w-full" style={{ minWidth: 760 }}>
            <thead>
              <tr>
                <Kopf>Branche</Kopf>
                <Kopf rechts aktiv={sortierung === "anfragen"} aufKlick={() => setSortierung("anfragen")}>Anfragen</Kopf>
                <Kopf rechts>Abschlüsse</Kopf>
                <Kopf rechts>Verloren</Kopf>
                <Kopf rechts aktiv={sortierung === "quote"} aufKlick={() => setSortierung("quote")}>Quote</Kopf>
                <Kopf rechts aktiv={sortierung === "menge"} aufKlick={() => setSortierung("menge")}>kWh abgeschlossen</Kopf>
                <Kopf rechts aktiv={sortierung === "provision"} aufKlick={() => setSortierung("provision")}>Provision</Kopf>
              </tr>
            </thead>
            <tbody>
              {zeilen.map((z) => (
                <tr key={z.name} onClick={() => onListe && onListe("Branche " + z.name,
                      menge.filter((a) => ((a.kunde.branche || "").trim() || "ohne Angabe") === z.name))}
                    style={{ cursor: "pointer" }}>
                  <Zelle>
                    {z.name}
                    <span className="block mt-1" style={{ width: 120 }}>
                      <span className="block h-1 rounded" style={{ background: "#E6EAF0" }}>
                        <span className="block h-1 rounded"
                              style={{ width: Math.max(2, (z.kwh / maxKwh) * 100) + "%", background: C.gruen }} />
                      </span>
                    </span>
                  </Zelle>
                  <Zelle rechts>{z.anfragen}</Zelle>
                  <Zelle rechts>{z.abschluesse}</Zelle>
                  <Zelle rechts>{z.verloren}</Zelle>
                  <Zelle rechts dick>{num(z.quote, 0)} %</Zelle>
                  <Zelle rechts>{num(z.kwh)}</Zelle>
                  <Zelle rechts>{eur(z.provision)}</Zelle>
                </tr>
              ))}
              <tr style={{ background: "#F6F8FA" }}>
                <Zelle dick>{zeilen.length} Branchen</Zelle>
                <Zelle rechts dick>{summe((z) => z.anfragen)}</Zelle>
                <Zelle rechts dick>{summe((z) => z.abschluesse)}</Zelle>
                <Zelle rechts dick>{summe((z) => z.verloren)}</Zelle>
                <Zelle rechts dick>
                  {num(summe((z) => z.abschluesse) + summe((z) => z.verloren) > 0
                    ? (summe((z) => z.abschluesse) /
                       (summe((z) => z.abschluesse) + summe((z) => z.verloren))) * 100 : 0, 0)} %
                </Zelle>
                <Zelle rechts dick>{num(summe((z) => z.kwh))}</Zelle>
                <Zelle rechts dick>{eur(summe((z) => z.provision))}</Zelle>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs mt-4" style={{ color: C.muted, maxWidth: "64ch" }}>
        Abgeschlossene Vorgänge zählen zum Monat des Lieferbeginns, offene und verlorene zum Monat
        der Anfrage. Die Quote setzt Abschlüsse ins Verhältnis zu Abschlüssen plus Absagen; noch
        laufende Vorgänge bleiben unberücksichtigt.
      </p>
    </div>
  );
}

/* Änderungsprotokoll für kritische Vorgänge */
function Protokoll({ protokoll, mitarbeiter }) {
  const [filter, setFilter] = useState("alle");
  const arten = [...new Set(protokoll.map((p) => p.art))];
  const liste = protokoll
    .filter((p) => filter === "alle" || p.art === filter)
    .slice()
    .reverse();

  return (
    <div>
      <p className="text-sm mb-4" style={{ color: C.muted, maxWidth: "62ch" }}>
        Lückenlose Aufzeichnung aller Änderungen an Provisionssätzen, Zuordnungen, Freigaben und
        Auszahlungen. Einträge lassen sich nicht löschen.
      </p>

      <div className="rounded p-3 mb-5" style={{ background: C.card, border: "1px solid " + C.line }}>
        <Select label="Art der Änderung" value={filter} onChange={setFilter}
          options={[{ value: "alle", label: "Alle Änderungen" }, ...arten]} />
      </div>

      {liste.length === 0 ? (
        <div className="rounded p-8 text-center text-sm"
             style={{ border: "1px dashed " + C.line, color: C.muted }}>
          Noch keine Einträge.
        </div>
      ) : (
        <div className="rounded overflow-hidden" style={{ background: C.card, border: "1px solid " + C.line }}>
          {liste.map((p, i) => (
            <div key={p.id} className="flex flex-wrap items-start gap-x-4 gap-y-1 px-4 py-3"
                 style={{ borderTop: i ? "1px solid " + C.line : "none" }}>
              <span className="text-xs w-32" style={{ color: C.muted, fontVariantNumeric: "tabular-nums" }}>
                {datum(p.datum)}, {p.zeit}
              </span>
              <div className="flex-1 min-w-40">
                <div className="text-sm">{p.text}</div>
                <div className="text-xs" style={{ color: ROLLENFARBE[p.rolle] || C.muted }}>
                  {p.wer} · {p.rolle}
                </div>
              </div>
              <span className="text-xs px-2 py-0.5 rounded"
                    style={{ border: "1px solid " + C.line, color: C.muted }}>{p.art}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export {
  ALLE_ROLLEN, Branchen, Datenexport, Kundenpruefung, MONATSNAMEN, Partnerverwaltung, PasswortFeld, Portalsteuerung,
  Protokoll, ProvisionAusstehend, VERTRIEBSROLLEN, Vertraege, ZugangKopieren, passwortVorschlag, zugangsText,
};
