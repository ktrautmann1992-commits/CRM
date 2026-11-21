/* Seltener gebrauchte Ansichten des Vertriebs: Ziele, Tippgeber, Unterlagen, Stammdaten, Strukturanfragen, Suche.
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
  interneUnterlageSchluessel,
} from "./datenbank.js";

import {
  ABLAGE_ARTEN, ABLAGE_BEREICHE, Avatar, Btn, C, Datei, DateiBild, EmailSignatur,
  Feld, Kunden, LEAD_STATUS, Leads, LinkKopieren, PartnerStatus, Select, StammdatenFormular,
  StrukturStatus, UNTERLAGEN_FEST, UNTERLAGEN_INTERN, Unterschrift, bildLaden, blankoAuftragPdf, dateiLaden, dateiOeffnen, datum,
  eigenerSatzVon, heute, leadSpalte, leereStammdaten, leererEintrag, num, stammdatenLuecken, stammdatenNachreichen,
  statusVon, uid, visitenkartenDaten,
} from "./App.jsx";
import { Tickets } from "./innendienst.jsx";
import { VISITENKARTE_ROLLEN, dienstleistungsvertragPdf, imagebroschuerePdf, ndaPdf, portfolioFlyerPdf, vertragPdf, visitenkartePdf } from "./pdf.jsx";

/* Eigene Stammdaten: vor der Freigabe editierbar, danach gesperrt */
function MeineStammdaten({ user, mitarbeiter, setMitarbeiter }) {
  const [sd, setSd] = useState(user.stammdaten || leereStammdaten());
  const [telefon, setTelefon] = useState(user.telefon || "");
  const [gesendet, setGesendet] = useState(false);
  const [unterschrift, setUnterschrift] = useState(null);
  /* Von der Geschäftsführung ohne Stammdaten freigeschaltet: Nachtragen bleibt möglich, bis alles vorliegt */
  const nachreichen = stammdatenNachreichen(user);
  const offen = ["registriert", "abgelehnt"].includes(user.status) || nachreichen;
  const vertrag = user.vertrag && user.vertrag.gfUnterschrift ? user.vertrag : null;
  const luecken = [...stammdatenLuecken(sd, !!user.angestellt),
    ...(vertrag && !vertrag.partnerUnterschrift ? ["Unterschrift unter den Handelsvertretervertrag"] : [])];

  const schreib = (aend) =>
    setMitarbeiter(mitarbeiter.map((m) => (m.id === user.id ? { ...m, ...aend } : m)));

  const einreichen = () => {
    schreib({ stammdaten: sd, telefon, status: "pruefung", pruefHinweis: "" });
    setGesendet(true);
  };

  return (
    <div className="space-y-5">
      <div className="rounded p-5" style={{ background: C.card, border: "1px solid " + C.line }}>
        <div className="flex items-center gap-4">
          <Avatar m={user} size={56} />
          <div className="flex-1">
            <div className="text-sm">{user.name}</div>
            <div className="text-xs" style={{ color: C.muted }}>{user.rolle} · {user.email}</div>
          </div>
          <PartnerStatus status={user.status} />
        </div>

        <div className="grid sm:grid-cols-2 gap-4 mt-5">
          <Feld label="Telefonnummer" value={telefon}
            onChange={(v) => { setTelefon(v); schreib({ telefon: v }); }} />
          <div>
            <span className="block text-xs mb-1" style={{ color: C.muted }}>Profilbild</span>
            <label className="flex items-center gap-2 px-3 py-2 rounded text-sm cursor-pointer"
                   style={{ border: "1px dashed " + C.line, color: C.muted, background: "#fff" }}>
              <Upload size={14} /> Bild auswählen
              <input type="file" accept="image/*" className="hidden"
                onChange={(e) => {
                  const f = e.target.files && e.target.files[0];
                  if (f) bildLaden(f, (dataUrl) => schreib({ bild: dataUrl }));
                }} />
            </label>
          </div>
        </div>
        <p className="text-xs mt-2" style={{ color: C.muted }}>
          Telefonnummer und Profilbild kannst du jederzeit selbst ändern.
        </p>
      </div>

      {user.status === "abgelehnt" && user.pruefHinweis && (
        <div className="p-4 rounded" style={{ background: "#FCF3F0", border: "1px solid " + C.warn }}>
          <div className="flex items-center gap-2 mb-1" style={{ color: C.warn }}>
            <AlertTriangle size={15} /><span className="text-sm">Die Geschäftsführung bittet um Nachbesserung</span>
          </div>
          <p className="text-sm ml-6">{user.pruefHinweis}</p>
        </div>
      )}

      {user.status === "pruefung" && (
        <div className="p-4 rounded text-sm" style={{ background: "#F6F8FA", border: "1px solid " + C.strom, color: C.strom }}>
          {gesendet ? "Stammdaten eingereicht. " : ""}
          Die Geschäftsführung prüft deine Unterlagen. Bis zur Freigabe sind die Daten gesperrt.
        </div>
      )}

      {vertrag && !user.angestellt && (
        <div className="rounded p-5" style={{ background: C.card,
             border: "1px solid " + (vertrag.partnerUnterschrift ? C.line : C.gas) }}>
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
            <span className="text-sm">Handelsvertretervertrag</span>
            <button className="text-sm" style={{ color: C.strom }}
              onClick={() => vertragPdf(user, mitarbeiter)}>Als PDF</button>
          </div>
          <div className="text-sm space-y-1 mb-4">
            <div>Provisionssatz: {num(parseFloat(vertrag.satz) || 0, 0)} % der Gesamtprovision je Lieferjahr</div>
            <div style={{ color: C.muted }}>
              Unterschrieben für EGC Energie von {vertrag.gfName} am {datum(vertrag.gfDatum)}
            </div>
          </div>
          {vertrag.partnerUnterschrift ? (
            <div className="text-xs" style={{ color: C.muted }}>
              <DateiBild datei={vertrag.partnerUnterschrift} hoehe={60} />
              <div className="mt-1">Von dir unterschrieben am {datum(vertrag.partnerDatum)}</div>
            </div>
          ) : (
            <>
              <Unterschrift label="Deine Unterschrift" onChange={setUnterschrift} />
              <div className="mt-3">
                <Btn icon={Check} disabled={!unterschrift} onClick={() => {
                  schreib({ vertrag: { ...vertrag, partnerUnterschrift: unterschrift, partnerDatum: heute() } });
                  setUnterschrift(null);
                }}>Vertrag unterschreiben</Btn>
              </div>
              <p className="text-xs mt-2" style={{ color: C.muted }}>
                Deine Unterschrift ist nötig, bevor du deine Stammdaten zur Freigabe einreichst.
              </p>
            </>
          )}
        </div>
      )}

      <div className="rounded p-5" style={{ background: C.card, border: "1px solid " + C.line }}>
        <div className="flex items-baseline justify-between mb-4">
          <span className="text-sm">{user.angestellt ? "Persönliche Daten (angestellt bei EGC)" : "Stammdaten als Handelsvertreter"}</span>
          {!offen && <span className="text-xs" style={{ color: C.muted }}>schreibgeschützt</span>}
        </div>

        <StammdatenFormular sd={sd} setSd={setSd} schreiben={offen} />

        {offen && (
          <div className="mt-6 pt-5" style={{ borderTop: "1px solid " + C.line }}>
            {luecken.length > 0 ? (
              <div className="p-4 rounded mb-4" style={{ background: "#FCF3F0", border: "1px solid " + C.warn }}>
                <div className="text-sm mb-2" style={{ color: C.warn }}>Es fehlt noch</div>
                <ul className="text-sm ml-5 list-disc">{luecken.map((f) => <li key={f}>{f}</li>)}</ul>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3 rounded mb-4 text-sm"
                   style={{ background: "#F1F7F0", border: "1px solid " + C.ok, color: C.ok }}>
                <Check size={15} /> {user.angestellt
                  ? "Du bist bei EGC angestellt: Gewerbeanmeldung, Bank und Ausweis sind nicht nötig."
                  : "Alle Unterlagen liegen vor."}
              </div>
            )}
            {nachreichen ? (
              <>
                <Btn icon={Check} onClick={() => { schreib({ stammdaten: sd, telefon }); setGesendet(true); }}>
                  Stammdaten speichern
                </Btn>
                <p className="text-xs mt-3" style={{ color: C.muted }}>
                  Du bist bereits freigeschaltet. Sobald alle Unterlagen gespeichert sind, werden die Daten
                  gesperrt; Änderungen nimmt dann die Geschäftsführung vor.
                </p>
              </>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  <Btn variante="hell" onClick={() => schreib({ stammdaten: sd })}>Zwischenspeichern</Btn>
                  <Btn icon={Send} onClick={einreichen} disabled={luecken.length > 0}>
                    Zur Freigabe einreichen
                  </Btn>
                </div>
                <p className="text-xs mt-3" style={{ color: C.muted }}>
                  Nach der Freigabe kannst du diese Daten nicht mehr selbst ändern. Änderungen nimmt die
                  Geschäftsführung vor.
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Unterschrift mit dem Finger ----------
   Gezeichnet wird auf einer Fläche; gespeichert wird ein JPEG mit festem Format
   600 × 200, damit es sich ohne Umrechnung ins PDF einsetzen lässt. */
function Strukturanfragen({ anfragen, setAnfragen, user }) {
  const leer = () => ({ name: "", email: "", telefon: "", satz: "", notiz: "" });
  const [neu, setNeu] = useState(null);
  const [auswahl, setAuswahl] = useState(null);
  const meine = anfragen.filter((x) => x.vonId === user.id);
  const gewaehlt = meine.find((x) => x.id === auswahl);
  const eigenerSatz = eigenerSatzVon(user);
  const satz = parseFloat(String((neu || {}).satz || "").replace(",", "."));
  const satzOk = !isNaN(satz) && satz > 0 && satz <= eigenerSatz;
  const mailOk = neu && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(neu.email.trim());

  const senden = () => {
    setAnfragen([{
      id: "SA-" + uid(), vonId: user.id, von: user.name, team: user.team || "-",
      datum: heute(), status: "offen",
      name: neu.name.trim(), email: neu.email.trim(), telefon: neu.telefon.trim(),
      rolle: "Vertriebspartner", satz, upline: user.id, notiz: neu.notiz.trim(),
    }, ...anfragen]);
    setNeu(null);
  };

  if (neu)
    return (
      <div className="rounded p-5" style={{ background: C.card, border: "1px solid " + C.line }}>
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => setNeu(null)} style={{ color: C.muted }}><ArrowLeft size={18} /></button>
          <h2 className="text-lg">Neuen Vertriebspartner anfragen</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Feld label="Name" value={neu.name} onChange={(v) => setNeu({ ...neu, name: v })} />
          <Feld label="E-Mail" value={neu.email} onChange={(v) => setNeu({ ...neu, email: v })} />
          <Feld label="Telefon" value={neu.telefon} onChange={(v) => setNeu({ ...neu, telefon: v })} />
          <Feld label="Provisionssatz in %" value={neu.satz}
            onChange={(v) => setNeu({ ...neu, satz: v.replace(/[^\d,.]/g, "") })}
            fehler={neu.satz !== "" && !satzOk ? "Höchstens dein eigener Satz von " + num(eigenerSatz, 0) + " %" : null} />
          <Feld label="Begründung oder Hinweise für die Geschäftsführung" value={neu.notiz}
            onChange={(v) => setNeu({ ...neu, notiz: v })} breit />
        </div>
        <p className="text-xs mt-3" style={{ color: C.muted, maxWidth: "62ch" }}>
          {neu.satz !== "" && !satzOk && (
            <span className="block mb-1" style={{ color: C.warn }}>
              Der Satz darf höchstens deinem eigenen Satz von {num(eigenerSatz, 0)} % entsprechen.
            </span>
          )}
          Der neue Partner wird dir zugeordnet. Du erhältst die Differenz zwischen deinem Satz
          ({num(eigenerSatz, 0)} %) und seinem Satz
          {satzOk ? ", hier " + num(eigenerSatz - satz, 0) + " Prozentpunkte" : ""}.
          Die Geschäftsführung prüft die Anfrage, unterschreibt den Handelsvertretervertrag und
          erzeugt den Einladungslink.
        </p>
        <div className="flex gap-2 mt-5">
          <Btn icon={Send} onClick={senden} disabled={!neu.name.trim() || !mailOk || !satzOk}>
            An die Geschäftsführung senden
          </Btn>
          <Btn variante="hell" onClick={() => setNeu(null)}>Abbrechen</Btn>
        </div>
      </div>
    );

  if (gewaehlt)
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <button onClick={() => setAuswahl(null)} style={{ color: C.muted }}><ArrowLeft size={18} /></button>
          <div className="flex-1">
            <div className="text-lg">{gewaehlt.name}</div>
            <div className="text-xs" style={{ color: C.muted }}>angefragt am {datum(gewaehlt.datum)}</div>
          </div>
          <StrukturStatus status={gewaehlt.status} />
        </div>
        <div className="rounded p-5 text-sm space-y-1" style={{ background: C.card, border: "1px solid " + C.line }}>
          <div>{gewaehlt.email}{gewaehlt.telefon ? " · " + gewaehlt.telefon : ""}</div>
          <div>Provisionssatz: {num(gewaehlt.satz, 0)} %
            {gewaehlt.freigabe && gewaehlt.freigabe.satz !== gewaehlt.satz
              ? " · von der Geschäftsführung festgelegt: " + num(gewaehlt.freigabe.satz, 0) + " %" : ""}
          </div>
          {gewaehlt.notiz && <div style={{ color: C.muted }}>{gewaehlt.notiz}</div>}
        </div>
        {gewaehlt.status === "abgelehnt" && (
          <div className="p-4 rounded" style={{ background: "#FCF3F0", border: "1px solid " + C.warn }}>
            <div className="text-sm mb-1" style={{ color: C.warn }}>Abgelehnt</div>
            <p className="text-sm">{gewaehlt.ablehnung || "ohne Begründung"}</p>
          </div>
        )}
        {gewaehlt.status === "freigegeben" && gewaehlt.link && (
          <div className="rounded p-5" style={{ background: C.card, border: "1px solid " + C.ok }}>
            <div className="text-sm mb-1">Einladungslink</div>
            <p className="text-xs mb-3" style={{ color: C.muted }}>
              Freigegeben von {gewaehlt.freigabe.von} am {datum(gewaehlt.freigabe.datum)}. Schick
              den Link an {gewaehlt.name}. Er gilt 30 Tage und nur einmal.
            </p>
            <LinkKopieren url={gewaehlt.link} />
          </div>
        )}
        {gewaehlt.status === "offen" && (
          <Btn variante="hell" onClick={() => {
            setAnfragen(anfragen.map((x) => (x.id === gewaehlt.id ? { ...x, status: "zurueckgezogen" } : x)));
            setAuswahl(null);
          }}>Anfrage zurückziehen</Btn>
        )}
      </div>
    );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <p className="text-sm" style={{ color: C.muted, maxWidth: "52ch" }}>
          Neue Vertriebspartner für deine Struktur fragst du hier bei der Geschäftsführung an.
          Nach der Freigabe bekommst du den Einladungslink.
        </p>
        <Btn icon={Plus} onClick={() => setNeu(leer())}>Neuen Partner anfragen</Btn>
      </div>
      {meine.length === 0 ? (
        <div className="rounded p-8 text-center text-sm" style={{ border: "1px dashed " + C.line, color: C.muted }}>
          Noch keine Anfragen.
        </div>
      ) : (
        <div className="rounded overflow-hidden" style={{ background: C.card, border: "1px solid " + C.line }}>
          {meine.map((x, i) => (
            <button key={x.id} onClick={() => setAuswahl(x.id)}
              className="w-full text-left px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-1"
              style={{ borderTop: i ? "1px solid " + C.line : "none" }}>
              <div className="flex-1 min-w-40">
                <div className="text-sm">{x.name}</div>
                <div className="text-xs" style={{ color: C.muted }}>
                  {num(x.satz, 0)} % · angefragt am {datum(x.datum)}
                </div>
              </div>
              <div className="w-48"><StrukturStatus status={x.status} /></div>
              <ChevronRight size={15} style={{ color: C.muted }} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* Schulungen, Dokumente und Marketingunterlagen */
/* Interne Unterlage öffnen: verschlüsselte Datei laden, Schlüssel vom Server holen (nur Kalkulation, GF), entschlüsseln */
async function interneUnterlage(s) {
  const schluessel = await interneUnterlageSchluessel();
  if (!schluessel) throw new Error("Kein Schlüssel erhalten.");
  const antwort = await fetch(s.pfad + s.datei);
  if (!antwort.ok) throw new Error("Datei nicht gefunden.");
  const roh = new Uint8Array(await antwort.arrayBuffer());
  const k = await crypto.subtle.importKey("raw", Uint8Array.from(atob(schluessel), (c) => c.charCodeAt(0)), "AES-GCM", false, ["decrypt"]);
  const klar = new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: roh.slice(0, 12) }, k, roh.slice(12)));
  let bin = "";
  for (let i = 0; i < klar.length; i += 0x8000) bin += String.fromCharCode.apply(null, klar.subarray(i, i + 0x8000));
  return { name: s.name, typ: "application/pdf", groesse: klar.length, url: "data:application/pdf;base64," + btoa(bin) };
}

function Ablage({ ablage, setAblage, user, start }) {
  /* Bereiche mit Rollenvorgabe (Intern) nur für diese Rollen */
  const bereiche = ABLAGE_BEREICHE.filter((b) => !b.rollen || b.rollen.includes(user.rolle));
  const [bereich, setBereich] = useState(start && bereiche.some((b) => b.id === start) ? start : "dokumente");
  const [internLaeuft, setInternLaeuft] = useState("");
  const [entwurf, setEntwurf] = useState(null);
  const darfPflegen = ["Leitung Vertrieb", "Geschäftsführung"].includes(user.rolle);
  const aktuell = ABLAGE_BEREICHE.find((b) => b.id === bereich);
  const drin = ablage.filter((d) => d.bereich === bereich);

  const speichern = () => {
    const vorhanden = ablage.some((d) => d.id === entwurf.id);
    const fertig = { ...entwurf, von: entwurf.von || user.name };
    setAblage(vorhanden ? ablage.map((d) => (d.id === fertig.id ? fertig : d)) : [fertig, ...ablage]);
    setEntwurf(null);
  };

  if (entwurf) {
    const setF = (k, v) => setEntwurf({ ...entwurf, [k]: v });
    return (
      <div>
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => setEntwurf(null)} style={{ color: C.muted }}><ArrowLeft size={18} /></button>
          <h2 className="text-lg">{ablage.some((d) => d.id === entwurf.id) ? "Unterlage bearbeiten" : "Unterlage hinzufügen"}</h2>
        </div>
        <div className="rounded p-5 space-y-4" style={{ background: C.card, border: "1px solid " + C.line }}>
          <div className="grid sm:grid-cols-2 gap-4">
            <Feld label="Titel" value={entwurf.titel} onChange={(v) => setF("titel", v)} breit />
            <Select label="Bereich" value={entwurf.bereich} onChange={(v) => setF("bereich", v)}
              options={ABLAGE_BEREICHE.filter((b) => !b.rollen).map((b) => ({ value: b.id, label: b.label }))} />
            <Select label="Art" value={entwurf.art} onChange={(v) => setF("art", v)} options={ABLAGE_ARTEN} />
          </div>
          <label className="block">
            <span className="block text-xs mb-1" style={{ color: C.muted }}>Beschreibung</span>
            <textarea rows={2} value={entwurf.beschreibung} onChange={(e) => setF("beschreibung", e.target.value)}
              className="w-full px-3 py-2 text-sm rounded outline-none"
              style={{ border: "1px solid " + C.line }} />
          </label>
          <div className="grid sm:grid-cols-2 gap-4">
            <Datei label="Datei" datei={entwurf.datei} onSet={(f) => setF("datei", f)} hinweis="Datei auswählen" />
            <Feld label="Oder Link (z. B. Online-Schulung)" value={entwurf.url}
              onChange={(v) => setF("url", v)} placeholder="https://" />
          </div>
          <div className="flex gap-2 pt-2">
            <Btn icon={Check} onClick={speichern} disabled={!entwurf.titel}>Speichern</Btn>
            <Btn variante="hell" onClick={() => setEntwurf(null)}>Abbrechen</Btn>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex gap-1 flex-wrap">
          {bereiche.map((b) => (
            <button key={b.id} onClick={() => setBereich(b.id)}
              className="px-3 py-1.5 text-sm rounded"
              style={{
                background: bereich === b.id ? C.ink : "transparent",
                color: bereich === b.id ? "#fff" : C.muted,
                border: "1px solid " + (bereich === b.id ? C.ink : C.line),
              }}>
              {b.label} <span style={{ opacity: 0.6 }}>{b.id === "intern" ? UNTERLAGEN_INTERN.length : ablage.filter((d) => d.bereich === b.id).length + (UNTERLAGEN_FEST[b.id] || []).length}</span>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Btn variante="hell" icon={FileSignature} onClick={async () => {
            try { dateiLaden(await blankoAuftragPdf()); }
            catch (e) { alert("Die Vorlage konnte nicht erzeugt werden: " + ((e && e.message) || e)); }
          }}>Vollmacht blanko (PDF)</Btn>
          {["Kalkulation", "Geschäftsführung"].includes(user.rolle) && [
            ["Dienstleistungsvertrag mit Honorar (blanko)", () => dienstleistungsvertragPdf(null, { mit: true, betrag: null, erfolg: null })],
            ["Dienstleistungsvertrag ohne Honorar (blanko)", () => dienstleistungsvertragPdf(null, { mit: false, erfolg: null })],
            ["Verschwiegenheitserklärung einseitig (blanko)", () => ndaPdf(null, null, false)],
            ["Verschwiegenheitserklärung gegenseitig (blanko)", () => ndaPdf(null, null, true)],
          ].map(([label, erzeugen]) => (
            <Btn key={label} variante="hell" icon={FileSignature} onClick={async () => {
              try { dateiLaden(await erzeugen()); }
              catch (e) { alert("Die Vorlage konnte nicht erzeugt werden: " + ((e && e.message) || e)); }
            }}>{label}</Btn>
          ))}
          {darfPflegen && (
            <Btn icon={Plus} onClick={() => setEntwurf(leererEintrag(bereich))}>Unterlage hinzufügen</Btn>
          )}
        </div>
      </div>

      <p className="text-sm mb-5" style={{ color: C.muted, maxWidth: "60ch" }}>{aktuell.text}</p>

      {bereich === "marketing" && VISITENKARTE_ROLLEN.includes(user.rolle) && (
        <div className="rounded p-4 mb-4 flex flex-wrap items-center gap-4" style={{ background: C.card, border: "1px solid " + C.line }}>
          <span className="rounded p-2" style={{ background: "#F6F8FA" }}><FileText size={18} style={{ color: C.gruen }} /></span>
          <div className="flex-1 min-w-48">
            <div className="text-sm">Dein Portfolio-Flyer</div>
            <div className="text-xs" style={{ color: C.muted }}>
              Zwei Seiten A4: Leistungsportfolio und Kundenvorteile, unten mit deinem Namen, Foto und deinen Kontaktdaten.
            </div>
          </div>
          <Btn icon={FileText} onClick={async () => {
            try { dateiLaden(await portfolioFlyerPdf(user)); }
            catch (e) { alert("Der Flyer konnte nicht erzeugt werden: " + ((e && e.message) || e)); }
          }}>Flyer herunterladen (PDF)</Btn>
        </div>
      )}

      {bereich === "marketing" && VISITENKARTE_ROLLEN.includes(user.rolle) && (
        <div className="rounded p-4 mb-4 flex flex-wrap items-center gap-4" style={{ background: C.card, border: "1px solid " + C.line }}>
          <span className="rounded p-2" style={{ background: "#F6F8FA" }}><FileText size={18} style={{ color: C.gruen }} /></span>
          <div className="flex-1 min-w-48">
            <div className="text-sm">Deine Imagebroschüre zum Versenden</div>
            <div className="text-xs" style={{ color: C.muted }}>
              Zwölf Seiten A4, rund 0,7 MB, zum Verschicken per E-Mail. Auf der Rückseite stehen deine Kontaktdaten wie auf deiner
              Visitenkarte, Telefon und E-Mail sind anklickbar. Die gedruckte Broschüre bekommst du von der Geschäftsführung.
            </div>
          </div>
          <Btn icon={FileText} onClick={async () => {
            try { dateiLaden(await imagebroschuerePdf(user)); }
            catch (e) { alert("Die Broschüre konnte nicht erzeugt werden: " + ((e && e.message) || e)); }
          }}>Broschüre herunterladen (PDF)</Btn>
        </div>
      )}

      {bereich === "marketing" && VISITENKARTE_ROLLEN.includes(user.rolle) && <EmailSignatur m={user} />}

      {bereich === "intern" && bereiche.some((b) => b.id === "intern") && (
        <div className="grid sm:grid-cols-2 gap-3 mb-4">
          {UNTERLAGEN_INTERN.map((s) => (
            <div key={s.datei} className="rounded p-4 flex flex-col" style={{ background: C.card, border: "1px solid " + C.line }}>
              <div className="flex items-start gap-3">
                <span className="rounded p-2" style={{ background: "#F6F8FA" }}><FileText size={18} style={{ color: C.gruen }} /></span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm">{s.titel}</div>
                  <div className="text-xs" style={{ color: C.muted }}>PDF · {s.seiten} Seiten · nur Kalkulation und Geschäftsführung</div>
                </div>
              </div>
              <p className="text-sm mt-3 flex-1" style={{ color: C.muted }}>{s.text}</p>
              <div className="flex items-center gap-2 mt-4 pt-3" style={{ borderTop: "1px solid " + C.line }}>
                {[["oeffnen", "Öffnen"], ["speichern", "Speichern"]].map(([art, text]) => (
                  <button key={art} disabled={!!internLaeuft}
                    onClick={async () => {
                      setInternLaeuft(art);
                      try { const d = await interneUnterlage(s); art === "oeffnen" ? dateiOeffnen(d) : dateiLaden(d); }
                      catch (e) { alert("Die Unterlage konnte nicht geöffnet werden: " + ((e && e.message) || e)); }
                      setInternLaeuft("");
                    }}
                    className="inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded"
                    style={art === "oeffnen" ? { background: C.ink, color: "#fff" } : { border: "1px solid " + C.line, color: C.text }}>
                    <FileText size={14} /> {internLaeuft === art ? "wird geladen …" : text}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {UNTERLAGEN_FEST[bereich] && (
        <div className="grid sm:grid-cols-2 gap-3 mb-4">
          {UNTERLAGEN_FEST[bereich].map((s) => (
            <div key={s.datei || s.url} className="rounded p-4 flex flex-col" style={{ background: C.card, border: "1px solid " + C.line }}>
              <div className="flex items-start gap-3">
                <span className="rounded p-2" style={{ background: "#F6F8FA" }}><FileText size={18} style={{ color: C.gruen }} /></span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm">{s.titel}</div>
                  <div className="text-xs" style={{ color: C.muted }}>{s.url ? "Link · " + s.url.replace(/^https?:\/\//, "").replace(/\/$/, "") : "PDF · " + s.seiten + " Seiten"}</div>
                </div>
              </div>
              <p className="text-sm mt-3 flex-1" style={{ color: C.muted }}>{s.text}</p>
              <div className="flex items-center gap-2 mt-4 pt-3" style={{ borderTop: "1px solid " + C.line }}>
                <a href={s.url || s.pfad + s.datei} target="_blank" rel="noreferrer"
                   className="inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded" style={{ background: C.ink, color: "#fff" }}>
                  {s.url ? <Send size={14} /> : <FileText size={14} />} Öffnen
                </a>
                {!s.url && <a href={s.pfad + s.datei} download={s.datei}
                   className="inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded" style={{ border: "1px solid " + C.line, color: C.text }}>
                  <Upload size={14} style={{ transform: "rotate(180deg)" }} /> Speichern
                </a>}
              </div>
            </div>
          ))}
        </div>
      )}

      {bereich === "marketing" && VISITENKARTE_ROLLEN.includes(user.rolle) && (() => {
        const d = visitenkartenDaten(user);
        const frei = !!(user.visitenkarte && user.visitenkarte.freigegeben);
        return (
          <div className="rounded p-4 mb-4" style={{ background: C.card, border: "1px solid " + (frei ? C.gruen : C.line) }}>
            <div className="text-sm mb-3">Deine Visitenkarte</div>
            {frei ? (
              <div className="flex flex-wrap items-center gap-4">
                <div className="rounded overflow-hidden flex shrink-0" style={{ width: 230, height: 149, border: "1px solid " + C.line }}>
                  <div style={{ width: 8, background: "linear-gradient(#96CE60,#4A8C26)" }} />
                  <div className="p-3 flex-1 min-w-0" style={{ background: "#fff" }}>
                    <div className="text-sm truncate" style={{ fontWeight: 600, color: C.ink }}>{d.name}</div>
                    <div className="text-xs truncate" style={{ color: "#4A8C26" }}>{d.titel}</div>
                    {d.zusatz && <div className="truncate" style={{ fontSize: 9, color: C.muted }}>{d.zusatz}</div>}
                    <div className="mt-2 space-y-0.5" style={{ fontSize: 10, color: C.text }}>
                      {d.mobil && <div className="truncate">Mobil {d.mobil}</div>}
                      {d.telefon && <div className="truncate">Tel. {d.telefon}</div>}
                      <div className="truncate">{d.email}</div>
                    </div>
                  </div>
                </div>
                <div className="flex-1 min-w-48">
                  <p className="text-xs mb-3" style={{ color: C.muted }}>
                    Druckdatei 85 × 55 mm mit 3 mm Beschnitt, Vorder- und Rückseite, mit QR-Code zum
                    Speichern deines Kontakts. Bei jeder Online-Druckerei hochladbar.
                  </p>
                  <Btn icon={FileText} onClick={async () => {
                    try { dateiLaden(await visitenkartePdf(user)); }
                    catch (e) { alert("Die Visitenkarte konnte nicht erzeugt werden: " + ((e && e.message) || e)); }
                  }}>Druckdatei herunterladen (PDF)</Btn>
                </div>
              </div>
            ) : (
              <p className="text-xs" style={{ color: C.muted }}>
                Deine Visitenkarte wird von der Geschäftsführung erstellt und erscheint hier, sobald sie freigegeben ist.
              </p>
            )}
          </div>
        );
      })()}

      {drin.length === 0 && (UNTERLAGEN_FEST[bereich] || bereich === "intern") ? null : drin.length === 0 ? (
        <div className="rounded p-8 text-center text-sm"
             style={{ border: "1px dashed " + C.line, color: C.muted }}>
          {bereich === "schulung"
            ? "Die Schulungsunterlagen werden hier eingestellt, sobald sie fertig sind."
            : "Noch keine Unterlagen in diesem Bereich."}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {drin.map((d) => (
            <div key={d.id} className="rounded p-4 flex flex-col"
                 style={{ background: C.card, border: "1px solid " + C.line }}>
              <div className="flex items-start gap-3">
                <span className="rounded p-2" style={{ background: "#F6F8FA" }}>
                  <FileText size={18} style={{ color: d.url ? C.gruen : C.strom }} />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm">{d.titel}</div>
                  <div className="text-xs" style={{ color: C.muted }}>
                    {d.art}{d.datei ? " · " + d.datei.name : ""}
                  </div>
                </div>
              </div>

              {d.beschreibung && (
                <p className="text-sm mt-3" style={{ color: C.muted }}>{d.beschreibung}</p>
              )}

              <div className="flex items-center gap-2 mt-4 pt-3"
                   style={{ borderTop: "1px solid " + C.line }}>
                {d.url ? (
                  <a href={d.url} target="_blank" rel="noreferrer"
                     className="inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded"
                     style={{ background: C.ink, color: "#fff" }}>
                    <Send size={14} /> Öffnen
                  </a>
                ) : d.datei && (d.datei.url || d.datei.pfad) ? (
                  <div className="flex gap-2">
                    <button onClick={() => dateiOeffnen(d.datei)}
                            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded"
                            style={{ background: C.ink, color: "#fff" }}>
                      <FileText size={14} /> Öffnen
                    </button>
                    <button onClick={() => dateiLaden(d.datei)}
                            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded"
                            style={{ border: "1px solid " + C.line, color: C.text }}>
                      <Upload size={14} style={{ transform: "rotate(180deg)" }} /> Speichern
                    </button>
                  </div>
                ) : (
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded"
                        style={{ border: "1px solid " + C.line, color: C.muted }}>
                    <Paperclip size={14} /> keine Datei hinterlegt
                  </span>
                )}
                <span className="flex-1" />
                {darfPflegen && (
                  <>
                    <button className="text-xs" style={{ color: C.strom }}
                      onClick={() => setEntwurf(d)}>bearbeiten</button>
                    <button className="text-xs" style={{ color: C.muted }}
                      onClick={() => setAblage(ablage.filter((x) => x.id !== d.id))}>entfernen</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* Globale Suche über Kunden, Vorgänge, Leads, Kontakte und Tickets */
function Suche({ anfragen, leads, tickets, akquise, mitarbeiter, user, aufSprung }) {
  const [text, setText] = useState("");
  const suche = text.trim().toLowerCase();

  const treffer = [];
  if (suche.length >= 2) {
    const passt = (...felder) =>
      felder.some((f) => String(f || "").toLowerCase().includes(suche));

    anfragen.forEach((a) => {
      const malo = a.lieferstellen.map((l) => l.maloId).join(" ");
      const zaehler = a.lieferstellen.map((l) => l.zaehlernummer).join(" ");
      if (passt(a.kunde.firma, a.id, a.kunde.ansprechpartner, a.kunde.ort, a.kunde.branche, malo, zaehler))
        treffer.push({ art: "Vorgang", titel: a.kunde.firma,
          unten: a.id + " · " + statusVon(a).label + " · " + a.partnerName,
          ziel: { ansicht: "alle", vorgang: a.id } });
    });

    (leads || []).forEach((l) => {
      if (passt(l.firma, l.id, l.ansprechpartner, l.ort, l.telefon))
        treffer.push({ art: "Lead", titel: l.firma,
          unten: l.id + " · " + (LEAD_STATUS[leadSpalte(l)] || {}).label,
          ziel: { ansicht: "leads" } });
    });

    (akquise || []).forEach((li) =>
      li.eintraege.forEach((e) => {
        if (passt(e.firma, e.ansprechpartner, e.telefon, e.adresse))
          treffer.push({ art: "Kontakt", titel: e.firma,
            unten: li.branche + " · " + (e.telefon || ""), ziel: { ansicht: "akquise" } });
      }));

    (tickets || []).forEach((t) => {
      if (passt(t.betreff, "#" + t.nummer, t.von))
        treffer.push({ art: "Ticket", titel: t.betreff,
          unten: "#" + t.nummer + " · " + t.empfaenger, ziel: { ansicht: "tickets" } });
    });

    mitarbeiter.forEach((m) => {
      if (passt(m.name, m.email, m.rolle))
        treffer.push({ art: "Person", titel: m.name, unten: m.rolle + " · " + m.email,
          ziel: { ansicht: user.rolle === "Geschäftsführung" ? "partner" : "dashboard" } });
    });
  }

  return (
    <div className="relative mb-3">
      <input value={text} onChange={(e) => setText(e.target.value)}
        placeholder="Suchen: Kunde, Vorgang, MaLo, Zähler …"
        className="w-full px-3 py-2 text-sm rounded outline-none"
        style={{ background: C.inkSoft, color: "#fff", border: "1px solid " + C.inkLine }} />

      {suche.length >= 2 && (
        <div className="mt-2 rounded overflow-hidden"
             style={{ background: "#fff", border: "1px solid " + C.line, maxHeight: 320, overflowY: "auto" }}>
          {treffer.length === 0 ? (
            <p className="text-sm px-3 py-3" style={{ color: C.muted }}>Nichts gefunden.</p>
          ) : (
            treffer.slice(0, 25).map((t, i) => (
              <button key={i} onClick={() => { aufSprung(t.ziel); setText(""); }}
                className="w-full text-left px-3 py-2 flex items-start gap-2"
                style={{ borderTop: i ? "1px solid " + C.line : "none", color: C.text }}>
                <span className="text-xs px-1.5 py-0.5 rounded mt-0.5"
                      style={{ border: "1px solid " + C.line, color: C.muted }}>{t.art}</span>
                <span className="flex-1 min-w-0">
                  <span className="text-sm block truncate">{t.titel}</span>
                  <span className="text-xs block truncate" style={{ color: C.muted }}>{t.unten}</span>
                </span>
              </button>
            ))
          )}
          {treffer.length > 25 && (
            <p className="text-xs px-3 py-2" style={{ color: C.muted, borderTop: "1px solid " + C.line }}>
              {treffer.length - 25} weitere Treffer, Suche eingrenzen.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export {
  Ablage, MeineStammdaten, Strukturanfragen, Suche,
};
