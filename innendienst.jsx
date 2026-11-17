/* Ansichten des Innendienstes: Arbeitsübersicht, Kalkulationen, Abrechnung, Smartmeter, Problemfälle, Tickets, Kunden.
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
  Abrechnung, Aufgaben, Balken, Btn, C, Datei, DateiChip, Feld,
  Kalender, Kunden, LEAD_STATUS, Leads, LinkKopieren, Liste, MediumIcon, PIPELINE,
  PROBLEM_ARTEN, PROBLEM_STATUS, Provisionen, ROLLENFARBE, SMARTMETER, SM_STATUS, SPARTEN, Select,
  StrukturStatus, TICKET_EMPFAENGER, TICKET_STATUS, UMLAGEN, UMLAGEN_VORGABE, Unterschrift, VERLAENGERUNG_VORLAUF, VM_SCHRITTE,
  ZuTunKarte, anteilVon, auszahlungsZeilen, dateiLesen, datum, enddatum, eur, gesamtprovision,
  gesamtverteilung, gewaehlte, heute, istBeteiligt, jetzt, laufzeitMonate, leadSpalte, leereStammdaten,
  liegezeit, monateBis, num, setzeSmartmeter, setzeUmlagen, smartmeterStart, smartmeterSummen, statusVon,
  strukturUnter, tageZwischen, uid, umlageSumme, umlageTeile, umlagenJahr, umlagenVorjahre, varianten,
  verbrauchGesamt, vertragsende, zahlLesen,
} from "./App.jsx";
import { Beschaffung } from "./beschaffung.jsx";
import { Strukturanfragen, Suche } from "./selten.jsx";
import { Portalsteuerung } from "./verwaltung.jsx";

function SmartmeterKalk({ a, sm, setSm, user }) {
  const [textOffen, setTextOffen] = useState(false);
  const [meldung, setMeldung] = useState("");
  const darfVorlage = ["Kalkulation", "Geschäftsführung"].includes(user.rolle);
  if (!sm) {
    return (
      <div className="p-4 rounded flex flex-wrap items-center justify-between gap-3" style={{ background: C.card, border: "1px solid " + C.line }}>
        <span className="flex items-center gap-2 text-sm"><Gauge size={18} style={{ color: C.ok }} />
          {a.smartmeter ? "Smartmeter gewünscht, noch kein Smartmeter-Angebot" : "Kein Smartmeter-Angebot"}</span>
        <Btn variante="ok" icon={Plus} onClick={() => setSm(smartmeterStart(a))}>Smartmeter-Angebot hinzufügen</Btn>
      </div>
    );
  }
  const pos = sm.positionen || [];
  const setPos = (id, k, w) => setSm({ ...sm, positionen: pos.map((p) => (p.id === id ? { ...p, [k]: w } : p)) });
  const neuPos = (lid, v = { bezeichnung: "", art: "einmalig", preis: "" }) =>
    setSm({ ...sm, positionen: [...pos, { id: uid(), lieferstelle: lid, ...v }] });
  const aufAlle = (lid) => {
    const quelle = pos.filter((p) => p.lieferstelle === lid);
    setSm({ ...sm, positionen: [...quelle, ...a.lieferstellen.filter((l) => l.id !== lid)
      .flatMap((l) => quelle.map((p) => ({ ...p, id: uid(), lieferstelle: l.id })))] });
  };
  const t = sm.texte || {};
  const setT = (k, w) => setSm({ ...sm, texte: { ...t, [k]: w } });
  const setKachel = (i, k, w) => setT("kacheln", (t.kacheln || []).map((x, j) => (j === i ? { ...x, [k]: w } : x)));
  const sum = smartmeterSummen(sm);
  const speichernAlsStandard = async (teil) => {
    setMeldung("");
    const wert = { ...SMARTMETER };
    if (teil === "vorlagen") {
      const gesehen = new Set();
      wert.vorlagen = pos.filter((p) => p.bezeichnung.trim()).map(({ bezeichnung, art, preis }) => ({ bezeichnung: bezeichnung.trim(), art, preis }))
        .filter((p) => { const k = p.bezeichnung + "|" + p.art; if (gesehen.has(k)) return false; gesehen.add(k); return true; });
    } else Object.assign(wert, { titel1: t.titel1, titel2: t.titel2, unterzeile: t.unterzeile, kacheln: t.kacheln, einbau: t.einbau, annahme: t.annahme, hinweis: t.hinweis });
    const f = await einstellungSpeichern("smartmeter", wert);
    if (f) setMeldung("Nicht gespeichert: " + f);
    else { setzeSmartmeter(wert); setMeldung(teil === "vorlagen" ? "Positionen als Vorlage gespeichert." : "Texte als Standard gespeichert."); }
  };
  const eur2 = (x) => num(x, 2) + " €";
  const leiste = { border: "1px solid " + C.line, background: "#fff" };
  return (
    <div className="rounded overflow-hidden" style={{ border: "1px solid " + C.line, background: C.card }}>
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3" style={{ background: C.ink, color: "#fff" }}>
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center rounded" style={{ width: 34, height: 34, background: C.ok }}><Gauge size={18} /></span>
          <div>
            <div className="text-sm">Smartmeter-Angebot</div>
            <div className="text-xs" style={{ opacity: 0.7 }}>zwei Seiten im Angebots-PDF · alle Preise netto</div>
          </div>
        </div>
        <button onClick={() => setSm(null)} className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded"
          style={{ background: "rgba(255,255,255,0.12)", color: "#fff" }}><Trash2 size={14} /> Entfernen</button>
      </div>
      <div className="p-4 space-y-4">
        {a.lieferstellen.map((l, i) => (
          <div key={l.id} className="rounded overflow-hidden" style={{ border: "1px solid " + C.line, background: "#fff" }}>
            <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5" style={{ background: "#F6F8FA", borderBottom: "1px solid " + C.line }}>
              <span className="flex items-center gap-2 text-sm"><MediumIcon medium={l.medium} />{l.bezeichnung || "Lieferstelle " + (i + 1)}</span>
              <span className="text-xs px-2.5 py-1 rounded-full"
                style={{ background: l.meloId ? "#EAF4E4" : "#FCF3F0", color: l.meloId ? C.ok : C.warn }}>
                {l.meloId ? "MeLo " + l.meloId : "MeLo-ID fehlt"}
              </span>
            </div>
            <div className="p-3 space-y-3">
              {pos.filter((p) => p.lieferstelle === l.id).map((p) => (
                <div key={p.id} className="grid grid-cols-12 gap-2 items-end pb-3" style={{ borderBottom: "1px dashed " + C.line }}>
                  <div className="col-span-12 sm:col-span-6">
                    <Feld label="Position" value={p.bezeichnung} onChange={(w) => setPos(p.id, "bezeichnung", w)} />
                  </div>
                  <div className="col-span-6 sm:col-span-3">
                    <Select label="Abrechnung" value={p.art} onChange={(w) => setPos(p.id, "art", w)}
                      options={[{ value: "einmalig", label: "einmalig" }, { value: "monatlich", label: "monatlich" }]} />
                  </div>
                  <div className="col-span-4 sm:col-span-2">
                    <Feld label="Preis netto €" value={p.preis} onChange={(w) => setPos(p.id, "preis", w)} />
                  </div>
                  <div className="col-span-2 sm:col-span-1 flex justify-end">
                    <button title="Position entfernen" aria-label="Position entfernen" className="flex items-center justify-center rounded"
                      style={{ width: 40, height: 40, border: "1px solid " + C.line, color: C.warn, background: "#fff" }}
                      onClick={() => setSm({ ...sm, positionen: pos.filter((x) => x.id !== p.id) })}><Trash2 size={16} /></button>
                  </div>
                </div>
              ))}
              <div className="flex flex-wrap gap-2">
                <Btn variante="ok" icon={Plus} onClick={() => neuPos(l.id)}>Position</Btn>
                {(SMARTMETER.vorlagen || []).length > 0 && (
                  <label className="inline-flex items-center gap-2 pl-3.5 pr-2 py-2 text-sm rounded cursor-pointer max-w-full" style={{ background: C.strom, color: "#fff", border: "1px solid " + C.strom }}>
                    <Copy size={15} />
                    <select className="bg-transparent outline-none text-sm max-w-full" style={{ color: "#fff" }} value=""
                      onChange={(e) => { const v = SMARTMETER.vorlagen[Number(e.target.value)]; if (v) neuPos(l.id, { ...v }); }}>
                      <option value="" style={{ color: C.text }}>Aus Vorlage</option>
                      {SMARTMETER.vorlagen.map((v, j) => <option key={j} value={j} style={{ color: C.text }}>{v.bezeichnung} ({v.art})</option>)}
                    </select>
                  </label>
                )}
                {a.lieferstellen.length > 1 && (
                  <Btn variante="primär" icon={Layers} onClick={() => aufAlle(l.id)}>Auf alle Lieferstellen übertragen</Btn>
                )}
              </div>
            </div>
          </div>
        ))}
        <div className="grid grid-cols-3 gap-2">
          {[["Einmalig", sum.einmalig, false], ["Monatlich", sum.monatlich, false], ["Pro Jahr", sum.jahr, true]].map(([k, w, gruen]) => (
            <div key={k} className="rounded px-3 py-2.5"
              style={{ background: gruen ? "linear-gradient(90deg, #4A8C26, #6CB43B)" : "#ECF6E4", color: gruen ? "#fff" : C.ink }}>
              <div className="text-xs" style={{ color: gruen ? "rgba(255,255,255,0.85)" : C.ok }}>{k}</div>
              <div className="text-sm sm:text-base whitespace-nowrap">{eur2(w)}</div>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Btn variante="blau" icon={Pencil} onClick={() => setTextOffen(!textOffen)}>
            {textOffen ? "Texte schließen" : "Texte im Angebot bearbeiten"}
          </Btn>
          {darfVorlage && <Btn variante="ok" icon={Save} onClick={() => speichernAlsStandard("vorlagen")}>Positionen als Vorlage speichern</Btn>}
        </div>
        {textOffen && (
          <div className="space-y-3 p-3 rounded" style={{ background: "#F6F8FA", border: "1px solid " + C.line }}>
            <div className="grid sm:grid-cols-2 gap-3">
              <Feld label="Titel Zeile 1" value={t.titel1 || ""} onChange={(w) => setT("titel1", w)} />
              <Feld label="Titel Zeile 2 (grün)" value={t.titel2 || ""} onChange={(w) => setT("titel2", w)} />
            </div>
            <Feld label="Unterzeile" value={t.unterzeile || ""} onChange={(w) => setT("unterzeile", w)} />
            {(t.kacheln || []).map((k, i) => (
              <div key={i} className="grid sm:grid-cols-3 gap-3">
                <Feld label={"Vorteil " + (i + 1) + ": Überschrift"} value={k.t} onChange={(w) => setKachel(i, "t", w)} />
                <div className="sm:col-span-2"><Feld label="Text" value={k.s} onChange={(w) => setKachel(i, "s", w)} /></div>
              </div>
            ))}
            <label className="block">
              <span className="block text-xs mb-1" style={{ color: C.muted }}>Kasten „Einbau und Betrieb durch den Smartmeter-Messstellenbetreiber“</span>
              <textarea rows={3} value={t.einbau || ""} onChange={(e) => setT("einbau", e.target.value)}
                className="w-full px-3 py-2 text-sm rounded outline-none" style={{ border: "1px solid " + C.line }} />
            </label>
            <label className="block">
              <span className="block text-xs mb-1" style={{ color: C.muted }}>Annahme-Text über der Unterschrift des Kunden</span>
              <textarea rows={2} value={t.annahme || ""} onChange={(e) => setT("annahme", e.target.value)}
                className="w-full px-3 py-2 text-sm rounded outline-none" style={{ border: "1px solid " + C.line }} />
            </label>
            <label className="block">
              <span className="block text-xs mb-1" style={{ color: C.muted }}>Hinweis unter den Preisen</span>
              <textarea rows={3} value={t.hinweis || ""} onChange={(e) => setT("hinweis", e.target.value)}
                className="w-full px-3 py-2 text-sm rounded outline-none" style={{ border: "1px solid " + C.line }} />
            </label>
            {darfVorlage && <Btn variante="ok" icon={Save} onClick={() => speichernAlsStandard("texte")}>Texte als Standard speichern</Btn>}
          </div>
        )}
        {meldung && <p className="text-xs" style={{ color: /^Nicht/.test(meldung) ? C.warn : C.ok }}>{meldung}</p>}
      </div>
    </div>
  );
}

/* Staatliche Umlagen und Abgaben (ct/kWh) je Sparte, jeder Bestandteil einzeln, einmal hinterlegt für alle Kalkulationen */
function UmlagenPflege({ user }) {
  const darf = ["Kalkulation", "Geschäftsführung"].includes(user.rolle);
  const start = () => ({
    strom: (umlageTeile(UMLAGEN, "strom").length && UMLAGEN.teile ? umlageTeile(UMLAGEN, "strom") : UMLAGEN_VORGABE.strom.map(([name, wert]) => ({ name, wert }))).map((t) => ({ ...t, id: uid() })),
    gas: (umlageTeile(UMLAGEN, "gas").length && UMLAGEN.teile ? umlageTeile(UMLAGEN, "gas") : UMLAGEN_VORGABE.gas.map(([name, wert]) => ({ name, wert }))).map((t) => ({ ...t, id: uid() })),
    notiz: UMLAGEN.notiz || "",
    jahr: umlagenJahr(UMLAGEN),
    vorjahre: JSON.parse(JSON.stringify(umlagenVorjahre(UMLAGEN))),
  });
  const [w, setW] = useState(start);
  const [offen, setOffen] = useState(false);
  const [hinweis, setHinweis] = useState("");
  const [laeuft, setLaeuft] = useState(false);
  const ok = (x) => !isNaN(zahlLesen(x));
  const alleOk = ["strom", "gas"].every((sp) => w[sp].every((t) => t.name.trim() && ok(t.wert)))
    && /^\d{4}$/.test(String(w.jahr)) && Object.values(w.vorjahre || {}).every((x) => ok(x.strom) && ok(x.gas));
  const summe = (sp) => w[sp].reduce((t, x) => t + (zahlLesen(x.wert) || 0), 0);
  const setTeil = (sp, id, k, v) => setW({ ...w, [sp]: w[sp].map((t) => (t.id === id ? { ...t, [k]: v } : t)) });
  const speichern = async () => {
    setLaeuft(true); setHinweis("");
    const teile = { strom: w.strom.map(({ name, wert }) => ({ name: name.trim(), wert: String(wert).trim() })),
                    gas: w.gas.map(({ name, wert }) => ({ name: name.trim(), wert: String(wert).trim() })) };
    const wert = { teile, strom: num(summe("strom"), 3), gas: num(summe("gas"), 3), notiz: String(w.notiz || "").trim(),
                   jahr: String(w.jahr), vorjahre: w.vorjahre, stand: heute(), von: user.name };
    const f = await einstellungSpeichern("umlagen", wert);
    if (f) setHinweis("Nicht gespeichert: " + f);
    else { setzeUmlagen(wert); setHinweis("Gespeichert. Gilt ab jetzt für jede neue Kalkulation."); }
    setLaeuft(false);
  };
  const ct3 = (x) => (isNaN(x) ? "–" : num(x, 3) + " ct/kWh");
  return (
    <div className="p-4 rounded" style={{ background: "#F6F8FA", border: "1px solid " + C.line }}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-sm">Staatliche Umlagen und Abgaben</span>
        <span className="text-xs" style={{ color: C.muted }}>
          gilt für jede Kalkulation{UMLAGEN.stand ? " · Stand " + datum(UMLAGEN.stand) + (UMLAGEN.von ? ", " + UMLAGEN.von : "") : ""}
        </span>
      </div>
      <div className="text-sm mt-1">
        Strom {ct3(umlageSumme(UMLAGEN, "strom"))} · Erdgas {ct3(umlageSumme(UMLAGEN, "gas"))}
        {darf && <button className="text-xs underline ml-3" style={{ color: C.strom }}
          onClick={() => { if (!offen) setW(start()); setOffen(!offen); setHinweis(""); }}>{offen ? "Zuklappen" : "Bestandteile ansehen und ändern"}</button>}
      </div>
      {!darf && UMLAGEN.notiz && <p className="text-xs mt-1 whitespace-pre-line" style={{ color: C.muted }}>{UMLAGEN.notiz}</p>}
      {darf && offen && (
        <div className="mt-3 space-y-4">
          {[["strom", "Strom"], ["gas", "Erdgas"]].map(([sp, titel]) => (
            <div key={sp}>
              <div className="text-xs mb-1" style={{ color: C.muted }}>{titel} · Summe {num(summe(sp), 3)} ct/kWh</div>
              <div className="space-y-2">
                {w[sp].map((t) => (
                  <div key={t.id} className="flex items-center gap-2">
                    <input value={t.name} onChange={(e) => setTeil(sp, t.id, "name", e.target.value)} placeholder="Bezeichnung"
                      className="flex-1 min-w-0 px-3 py-2 text-sm rounded outline-none" style={{ border: "1px solid " + C.line, background: "#fff" }} />
                    <input value={t.wert} onChange={(e) => setTeil(sp, t.id, "wert", e.target.value)} placeholder="ct/kWh" inputMode="decimal"
                      className="w-24 px-3 py-2 text-sm rounded outline-none text-right"
                      style={{ border: "1px solid " + (ok(t.wert) ? C.line : C.warn), background: "#fff" }} />
                    <button title="Bestandteil entfernen" style={{ color: C.muted }}
                      onClick={() => setW({ ...w, [sp]: w[sp].filter((x) => x.id !== t.id) })}><X size={16} /></button>
                  </div>
                ))}
              </div>
              <button className="text-xs underline mt-2" style={{ color: C.strom }}
                onClick={() => setW({ ...w, [sp]: [...w[sp], { id: uid(), name: "", wert: "" }] })}>+ Bestandteil hinzufügen</button>
            </div>
          ))}
          <div>
            <div className="text-xs mb-1" style={{ color: C.muted }}>
              Diese Umlagen gelten ab dem Lieferjahr
            </div>
            <input value={w.jahr} inputMode="numeric" maxLength={4} onChange={(e) => setW({ ...w, jahr: e.target.value.replace(/\D/g, "") })}
              className="w-24 px-3 py-2 text-sm rounded outline-none" style={{ border: "1px solid " + C.line, background: "#fff" }} />
          </div>
          <div>
            <div className="text-xs mb-1" style={{ color: C.muted }}>
              Umlagen früherer Jahre (Summe ct/kWh) für den Vergleich mit älteren Abrechnungen. Vorgabewerte bitte prüfen.
            </div>
            <div className="space-y-2">
              {Object.keys(w.vorjahre || {}).sort().map((j) => (
                <div key={j} className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="w-12">{j}</span>
                  {[["strom", "Strom"], ["gas", "Erdgas"]].map(([sp, t]) => (
                    <label key={sp} className="flex items-center gap-1">
                      <span className="text-xs" style={{ color: C.muted }}>{t}</span>
                      <input value={w.vorjahre[j][sp]} inputMode="decimal"
                        onChange={(e) => setW({ ...w, vorjahre: { ...w.vorjahre, [j]: { ...w.vorjahre[j], [sp]: e.target.value } } })}
                        className="w-20 px-2 py-1.5 text-sm rounded outline-none text-right"
                        style={{ border: "1px solid " + (ok(w.vorjahre[j][sp]) ? C.line : C.warn), background: "#fff" }} />
                    </label>
                  ))}
                </div>
              ))}
            </div>
          </div>
          <label className="block">
            <span className="block text-xs mb-1" style={{ color: C.muted }}>Hinweise (für die Kalkulation, nicht im Angebot)</span>
            <textarea rows={3} value={w.notiz} onChange={(e) => setW({ ...w, notiz: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded outline-none" style={{ border: "1px solid " + C.line, background: "#fff" }} />
          </label>
          <Btn icon={Check} onClick={speichern} disabled={!alleOk || laeuft}>{laeuft ? "Einen Moment …" : "Speichern"}</Btn>
          {!alleOk && <p className="text-xs" style={{ color: C.warn }}>Jeder Bestandteil braucht eine Bezeichnung und eine Zahl, das Lieferjahr vier Ziffern.</p>}
        </div>
      )}
      {hinweis && <p className="text-xs mt-2" style={{ color: /^Nicht/.test(hinweis) ? C.warn : C.ok }}>{hinweis}</p>}
      <p className="text-xs mt-2" style={{ color: C.muted }}>
        Im Angebot steht jeder Bestandteil einzeln. Netzentgelte = Arbeitspreis − Energiepreis − Summe der Umlagen.
        Fertige Angebote behalten den Stand, mit dem sie erzeugt wurden.
      </p>
    </div>
  );
}

/* Freigabe einer Strukturanfrage durch die Geschäftsführung */
function StrukturFreigabe({ anfrage, mitarbeiter, setMitarbeiter, strukturanfragen, setStrukturanfragen,
                            user, notieren, onZurueck }) {
  const [satz, setSatz] = useState(String(anfrage.satz));
  const [unterschrift, setUnterschrift] = useState(null);
  const [grund, setGrund] = useState("");
  const [fertig, setFertig] = useState(null);
  const tl = mitarbeiter.find((m) => m.id === anfrage.vonId);
  const s = parseFloat(String(satz).replace(",", "."));
  const satzOk = !isNaN(s) && s > 0 && s <= 50;
  const schonDa = mitarbeiter.some((m) => (m.email || "").toLowerCase() === anfrage.email.toLowerCase());

  const setzAnfrage = (aend) =>
    setStrukturanfragen(strukturanfragen.map((x) => (x.id === anfrage.id ? { ...x, ...aend } : x)));

  const freigeben = () => {
    const code = uid().toUpperCase() + uid().toUpperCase();
    const url = window.location.origin + "/?code=" + code;
    const id = "vp-" + uid();
    const m = {
      id, name: anfrage.name, rolle: "Vertriebspartner", team: anfrage.team || "-",
      satz: s, upline: anfrage.upline || anfrage.vonId, email: anfrage.email,
      telefon: anfrage.telefon || "", status: "eingeladen", passwort: "", bild: null, einladung: code,
      stammdaten: leereStammdaten(),
      vertrag: {
        art: "Handelsvertretervertrag", rolle: "Vertriebspartner", satz: s,
        upline: anfrage.upline || anfrage.vonId, team: anfrage.team || "-",
        anfrageId: anfrage.id, anfrageVon: anfrage.von, anfrageDatum: anfrage.datum,
        gfName: user.name, gfDatum: heute(), gfUnterschrift: unterschrift,
        partnerUnterschrift: null, partnerDatum: null,
      },
    };
    setMitarbeiter([...mitarbeiter, m]);
    setzAnfrage({ status: "freigegeben", mitarbeiterId: id, link: url,
                  freigabe: { von: user.name, datum: heute(), satz: s } });
    if (notieren) notieren("Mitarbeiter", m.name + " auf Anfrage von " + anfrage.von +
      " angelegt mit " + num(s, 0) + " %, Vertrag unterschrieben von " + user.name);
    setFertig(url);
  };

  const ablehnen = () => {
    setzAnfrage({ status: "abgelehnt", ablehnung: grund.trim(), entschieden: { von: user.name, datum: heute() } });
    if (notieren) notieren("Struktur", "Anfrage für " + anfrage.name + " von " + anfrage.von + " abgelehnt");
    onZurueck();
  };

  if (fertig)
    return (
      <div className="rounded p-5" style={{ background: C.card, border: "1px solid " + C.ok }}>
        <div className="flex items-center gap-2 mb-3" style={{ color: C.ok }}>
          <Check size={16} /><span className="text-sm">{anfrage.name} wurde angelegt</span>
        </div>
        <p className="text-sm mb-3" style={{ color: C.muted, maxWidth: "60ch" }}>
          Der Handelsvertretervertrag ist von dir unterschrieben. {anfrage.von} sieht den Link
          ebenfalls in seinen Strukturanfragen. Der neue Partner unterschreibt, bevor er seine
          Stammdaten zur Freigabe einreicht.
        </p>
        <LinkKopieren url={fertig} />
        <div className="mt-3"><Btn variante="hell" onClick={onZurueck}>Fertig</Btn></div>
      </div>
    );

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={onZurueck} style={{ color: C.muted }}><ArrowLeft size={18} /></button>
        <div className="flex-1">
          <div className="text-lg">Strukturanfrage: {anfrage.name}</div>
          <div className="text-xs" style={{ color: C.muted }}>
            von {anfrage.von} (Satz {tl ? num(tl.satz, 0) : "?"} %) am {datum(anfrage.datum)}
          </div>
        </div>
        <StrukturStatus status={anfrage.status} />
      </div>

      <div className="rounded p-5" style={{ background: C.card, border: "1px solid " + C.line }}>
        <div className="text-sm space-y-1 mb-4">
          <div>{anfrage.email}{anfrage.telefon ? " · " + anfrage.telefon : ""}</div>
          <div style={{ color: C.muted }}>Vertriebspartner · Team {anfrage.team} · zugeordnet an {anfrage.von}</div>
          {anfrage.notiz && <div className="pt-2">{anfrage.notiz}</div>}
        </div>
        {schonDa && (
          <p className="text-xs mb-3" style={{ color: C.warn }}>
            Mit dieser E-Mail gibt es bereits einen Mitarbeiter.
          </p>
        )}
        {anfrage.status === "offen" ? (
          <>
            <div className="sm:max-w-xs">
              <Feld label="Provisionssatz in %" value={satz}
                onChange={(v) => setSatz(v.replace(/[^\d,.]/g, ""))}
                fehler={!satzOk ? "Zwischen 1 und 50 %" : null} />
            </div>
            <p className="text-xs mt-1 mb-4" style={{ color: C.muted }}>
              Vorgeschlagen: {num(anfrage.satz, 0)} %.
              {tl && satzOk ? " " + anfrage.von + " erhält " + num(Math.max(0, (tl.satz || 0) - s), 0) + " Prozentpunkte Overhead." : ""}
            </p>
            <Unterschrift label="Unterschrift Geschäftsführung unter den Handelsvertretervertrag"
              onChange={setUnterschrift} />
            <div className="flex flex-wrap gap-2 mt-5">
              <Btn variante="ok" icon={Check} onClick={freigeben} disabled={!unterschrift || !satzOk || schonDa}>
                Unterschreiben und Einladung erzeugen
              </Btn>
            </div>
            <div className="mt-6 pt-5" style={{ borderTop: "1px solid " + C.line }}>
              <Feld label="Begründung bei Ablehnung" value={grund} onChange={setGrund} breit />
              <div className="mt-2">
                <Btn variante="gefahr" onClick={ablehnen} disabled={!grund.trim()}>Ablehnen</Btn>
              </div>
            </div>
          </>
        ) : anfrage.status === "freigegeben" && anfrage.link ? (
          <LinkKopieren url={anfrage.link} />
        ) : (
          <p className="text-sm" style={{ color: C.muted }}>{anfrage.ablehnung || ""}</p>
        )}
      </div>
    </div>
  );
}

/* Portalsteuerung (nur Geschäftsführung): Zugänge für alle Rollen anlegen und Passwörter setzen.
   Den Zugang legt der Server an (Server-Funktion „einladung“, Aktion zugang_setzen). */
function Pipeline({ anfragen, mitarbeiter, user, onOeffnen, onListe }) {
  const vollsicht = ["Geschäftsführung", "Finanzbuchhaltung", "Leitung Vertrieb"].includes(user.rolle);
  const meineIds = user.rolle === "Teamleiter"
    ? [user.id, ...strukturUnter(user.id, mitarbeiter).map((m) => m.id)]
    : [user.id];
  const menge = vollsicht ? anfragen : anfragen.filter((a) => meineIds.some((id) => istBeteiligt(a, id)));

  const wert = (a) => (vollsicht ? gesamtprovision(a) : anteilVon(a, user.id, mitarbeiter));
  const spalten = PIPELINE.map((sp) => {
    const drin = menge.filter(sp.f);
    return { ...sp, drin,
      summe: drin.reduce((t, a) => t + wert(a), 0),
      kwh: drin.reduce((t, a) => t + verbrauchGesamt(a), 0) };
  });
  const forecast = spalten.reduce((t, sp) => t + sp.summe * sp.chance, 0);
  const gesamt = spalten.reduce((t, sp) => t + sp.summe, 0);

  return (
    <div>
      <div className="grid sm:grid-cols-3 gap-3 mb-5">
        {[["Vorgänge in der Pipeline", spalten.reduce((t, sp) => t + sp.drin.length, 0), C.text],
          ["Provision unverrechnet", eur(gesamt), C.text],
          ["Erwartet nach Gewichtung", eur(forecast), C.ok]].map(([k, v, f]) => (
          <button key={k} onClick={() => onListe && onListe("Pipeline gesamt",
            spalten.flatMap((sp) => sp.drin))}
            className="rounded p-4 text-left w-full" style={{ background: C.card, border: "1px solid " + C.line }}>
            <div className="text-xs mb-2" style={{ color: C.muted }}>{k}</div>
            <div className="text-2xl" style={{ color: f, fontVariantNumeric: "tabular-nums" }}>{v}</div>
          </button>
        ))}
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="flex gap-3" style={{ minWidth: PIPELINE.length * 236 }}>
          {spalten.map((sp) => (
            <div key={sp.id} className="flex-1 rounded p-2"
                 style={{ minWidth: 224, background: "#F6F8FA", border: "1px solid " + C.line }}>
              <button className="px-2 py-2 mb-1 w-full text-left"
                onClick={() => onListe && onListe(sp.label, sp.drin)}>
                <div className="flex items-center gap-2">
                  <span className="text-sm flex-1">{sp.label}</span>
                  <span className="text-xs" style={{ color: C.muted }}>{sp.drin.length}</span>
                </div>
                <div className="text-xs mt-1" style={{ color: C.muted, fontVariantNumeric: "tabular-nums" }}>
                  {eur(sp.summe)} · {num(sp.chance * 100)} % Chance
                </div>
                <div className="mt-2"><Balken anteil={sp.chance} farbe={C.strom} /></div>
              </button>

              {sp.drin.length === 0 && (
                <div className="rounded px-2 py-5 text-center text-xs"
                     style={{ border: "1px dashed " + C.line, color: C.muted }}>leer</div>
              )}
              {sp.drin.map((a) => (
                <button key={a.id} onClick={() => onOeffnen(a.id)}
                  className="w-full text-left rounded p-3 mb-2"
                  style={{ background: "#fff", border: "1px solid " + C.line }}>
                  <div className="text-sm">{a.kunde.firma}</div>
                  <div className="text-xs mt-1" style={{ color: C.muted }}>
                    {a.id} · {num(verbrauchGesamt(a))} kWh
                  </div>
                  <div className="flex items-center justify-between mt-2 text-xs">
                    <span style={{ color: C.muted }}>{a.partnerName}</span>
                    <span style={{ fontVariantNumeric: "tabular-nums" }}>{eur(wert(a))}</span>
                  </div>
                  {liegezeit(a) > 7 && (
                    <div className="text-xs mt-1" style={{ color: liegezeit(a) > 14 ? C.warn : C.gas }}>
                      seit {num(liegezeit(a))} Tagen unbewegt
                    </div>
                  )}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs mt-3" style={{ color: C.muted, maxWidth: "68ch" }}>
        Die Prognose gewichtet die Provision jeder Phase mit ihrer Abschlusswahrscheinlichkeit.
        Die Werte sind Erfahrungswerte und lassen sich anpassen, sobald genug eigene Abschlüsse
        vorliegen.
      </p>
    </div>
  );
}

function Problemfaelle({ probleme, setProbleme, anfragen, mitarbeiter, user, nurStorno }) {
  const [neuOffen, setNeuOffen] = useState(false);
  const [auswahl, setAuswahl] = useState(null);
  const [antwort, setAntwort] = useState("");
  const [f, setF] = useState({ anfrageId: "", art: "Mahnung", text: "", dateien: [], rueck: {} });

  const istVM = ["Vertragsmanagement", "Geschäftsführung"].includes(user.rolle);
  const alleSehen = ["Vertragsmanagement", "Geschäftsführung", "Leitung Vertrieb", "Finanzbuchhaltung"]
    .includes(user.rolle);
  const meineIds = user.rolle === "Teamleiter"
    ? [user.id, ...strukturUnter(user.id, mitarbeiter).map((m) => m.id)]
    : [user.id];

  const sichtbar = probleme
    .filter((p) => (nurStorno ? p.art === "Storno" : true))
    .filter((p) => alleSehen || p.betroffene.some((b) => meineIds.includes(b.id)));

  const kunden = anfragen.filter((a) =>
    ["bestaetigt", "abgeschlossen", "uebermittelt"].includes(a.status));
  const gewaehlterKunde = anfragen.find((a) => a.id === f.anfrageId);
  const problem = probleme.find((p) => p.id === auswahl);

  /* Wer ist betroffen? Der Partner und alle Stufen darüber */
  const betroffeneVon = (a) => {
    if (!a) return [];
    const v = gesamtverteilung(a, mitarbeiter);
    return v.anteile.map((x) => ({ id: x.id, name: x.name, rolle: x.rolle, provision: x.betrag }));
  };

  const anlegen = () => {
    const a = gewaehlterKunde;
    const betroffene = betroffeneVon(a).map((b) => ({
      ...b, rueckzahlung: f.art === "Storno" ? (parseFloat(f.rueck[b.id]) || b.provision) : 0,
    }));
    const p = {
      id: "P-" + new Date().getFullYear() + "-" + Math.floor(100 + Math.random() * 899),
      anfrageId: a.id, kunde: a.kunde.firma, art: f.art, text: f.text, dateien: f.dateien,
      betroffene, angelegt: heute(), zeit: jetzt(), von: user.name, status: "offen",
      beitraege: [],
    };
    setProbleme([p, ...probleme]);
    setF({ anfrageId: "", art: "Mahnung", text: "", dateien: [], rueck: {} });
    setNeuOffen(false);
  };

  const setz = (id, aend) => setProbleme(probleme.map((p) => (p.id === id ? { ...p, ...aend } : p)));

  if (problem) {
    const st = PROBLEM_STATUS[problem.status];
    return (
      <div>
        <div className="flex items-center flex-wrap gap-3 mb-1">
          <button onClick={() => setAuswahl(null)} style={{ color: C.muted }}><ArrowLeft size={18} /></button>
          <h2 className="text-lg">{problem.kunde}</h2>
          <span className="text-xs px-2 py-0.5 rounded"
                style={{ border: "1px solid " + C.line, color: problem.art === "Storno" ? C.warn : C.gas }}>
            {problem.art}
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: st.color }}>
            <span className="w-2 h-2 rounded-full" style={{ background: st.color }} />{st.label}
          </span>
        </div>
        <p className="text-sm mb-5 ml-8" style={{ color: C.muted }}>
          {problem.id} · {problem.anfrageId} · gemeldet von {problem.von} am {datum(problem.angelegt)}
        </p>

        <div className="space-y-5">
          <div className="rounded p-5" style={{ background: C.card, border: "1px solid " + C.line }}>
            <p className="text-sm" style={{ whiteSpace: "pre-wrap" }}>{problem.text}</p>
            {problem.dateien.length > 0 && (
              <div className="space-y-2 mt-4">
                {problem.dateien.map((d, i) => <DateiChip key={i} datei={d} />)}
              </div>
            )}
          </div>

          {problem.art === "Storno" && (
            <div className="rounded p-5" style={{ background: C.card, border: "1px solid " + C.warn }}>
              <div className="text-sm mb-1" style={{ color: C.warn }}>Rückzahlung der Provision</div>
              <p className="text-sm mb-4" style={{ color: C.muted, maxWidth: "62ch" }}>
                Die Rechnung über den zurückzuzahlenden Betrag wird gesondert per E-Mail zugestellt.
              </p>
              {problem.betroffene.map((b) => (
                <div key={b.id} className="flex items-center gap-4 py-2 text-sm"
                     style={{ borderTop: "1px solid " + C.line }}>
                  <span className="flex-1">{b.name}
                    <span className="block text-xs" style={{ color: C.muted }}>{b.rolle}</span>
                  </span>
                  <span style={{ fontVariantNumeric: "tabular-nums", color: C.warn }}>
                    {eur(b.rueckzahlung)}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="rounded" style={{ background: C.card, border: "1px solid " + C.line }}>
            <div className="px-4 py-3 text-sm" style={{ borderBottom: "1px solid " + C.line }}>
              Rückmeldungen
            </div>
            <div className="px-4 py-3 space-y-3">
              {problem.beitraege.length === 0 && (
                <p className="text-sm" style={{ color: C.muted }}>Noch keine Rückmeldung.</p>
              )}
              {problem.beitraege.map((b) => (
                <div key={b.id} className="rounded p-3" style={{ background: "#F6F8FA",
                     borderLeft: "3px solid " + (ROLLENFARBE[b.rolle] || C.muted) }}>
                  <div className="flex flex-wrap items-baseline gap-x-2 mb-1">
                    <span className="text-sm">{b.von}</span>
                    <span className="text-xs" style={{ color: ROLLENFARBE[b.rolle] || C.muted }}>{b.rolle}</span>
                    <span className="flex-1" />
                    <span className="text-xs" style={{ color: C.muted }}>{datum(b.datum)}, {b.zeit} Uhr</span>
                  </div>
                  <p className="text-sm" style={{ whiteSpace: "pre-wrap" }}>{b.text}</p>
                </div>
              ))}
            </div>
            {problem.status !== "erledigt" && (
              <div className="px-4 py-3" style={{ borderTop: "1px solid " + C.line }}>
                <textarea rows={2} value={antwort} onChange={(e) => setAntwort(e.target.value)}
                  placeholder="Rückmeldung schreiben"
                  className="w-full px-3 py-2 text-sm rounded outline-none"
                  style={{ border: "1px solid " + C.line }} />
                <div className="flex flex-wrap gap-2 mt-2">
                  <Btn icon={Send} disabled={!antwort.trim()}
                    onClick={() => {
                      setz(problem.id, { status: "bearbeitung",
                        beitraege: [...problem.beitraege, { id: uid(), text: antwort.trim(),
                          von: user.name, rolle: user.rolle, datum: heute(), zeit: jetzt() }] });
                      setAntwort("");
                    }}>Antworten</Btn>
                  {istVM && (
                    <Btn variante="ok" icon={Check}
                      onClick={() => { setz(problem.id, { status: "erledigt" }); setAuswahl(null); }}>
                      Als erledigt schließen
                    </Btn>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (neuOffen) {
    const betroffene = betroffeneVon(gewaehlterKunde);
    return (
      <div>
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => setNeuOffen(false)} style={{ color: C.muted }}><ArrowLeft size={18} /></button>
          <h2 className="text-lg">Problemfall melden</h2>
        </div>
        <div className="rounded p-5 space-y-4" style={{ background: C.card, border: "1px solid " + C.line }}>
          <Select label="Kunde" value={f.anfrageId} onChange={(v) => setF({ ...f, anfrageId: v })}
            options={[{ value: "", label: "Bitte wählen" },
              ...kunden.map((a) => ({ value: a.id, label: a.kunde.firma + " · " + a.partnerName }))]} />
          <Select label="Worum geht es?" value={f.art} onChange={(v) => setF({ ...f, art: v })}
            options={PROBLEM_ARTEN} />
          <label className="block">
            <span className="block text-xs mb-1" style={{ color: C.muted }}>Beschreibung</span>
            <textarea rows={4} value={f.text} onChange={(e) => setF({ ...f, text: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded outline-none"
              style={{ border: "1px solid " + C.line }} />
          </label>

          <div>
            <span className="block text-xs mb-2" style={{ color: C.muted }}>Dateien</span>
            <div className="space-y-2 mb-2">
              {f.dateien.map((d, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="flex-1 min-w-0"><DateiChip datei={d} /></div>
                  <button onClick={() => setF({ ...f, dateien: f.dateien.filter((_, x) => x !== i) })}
                    style={{ color: C.muted }}><X size={15} /></button>
                </div>
              ))}
            </div>
            <label className="flex items-center gap-2 px-3 py-2 rounded text-sm cursor-pointer"
                   style={{ border: "1px dashed " + C.line, color: C.muted, background: "#fff" }}>
              <Upload size={14} /> Dateien hinzufügen
              <input type="file" multiple className="hidden"
                onChange={(e) => Array.from(e.target.files || []).forEach((x) =>
                  dateiLesen(x, (d) => setF((v) => ({ ...v, dateien: [...v.dateien, d] }))))} />
            </label>
          </div>

          {f.art === "Storno" && gewaehlterKunde && (
            <div className="p-4 rounded" style={{ background: "#FCF3F0", border: "1px solid " + C.warn }}>
              <div className="text-sm mb-3" style={{ color: C.warn }}>Zurückzuzahlende Provision</div>
              {betroffene.map((b) => (
                <div key={b.id} className="grid sm:grid-cols-2 gap-3 items-end mb-3">
                  <div className="text-sm">{b.name}
                    <span className="block text-xs" style={{ color: C.muted }}>
                      {b.rolle} · erhalten {eur(b.provision)}
                    </span>
                  </div>
                  <Feld label="Rückzahlung in €"
                    value={f.rueck[b.id] != null ? f.rueck[b.id] : String(Math.round(b.provision * 100) / 100)}
                    onChange={(v) => setF({ ...f, rueck: { ...f.rueck, [b.id]: v } })} />
                </div>
              ))}
              <p className="text-xs" style={{ color: C.muted }}>
                Alle Betroffenen erhalten den Hinweis, dass die Rechnung gesondert per E-Mail zugeht.
              </p>
            </div>
          )}

          <Btn icon={Send} onClick={anlegen} disabled={!f.anfrageId || !f.text.trim()}>
            Melden und Beteiligte informieren
          </Btn>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <p className="text-sm" style={{ color: C.muted, maxWidth: "54ch" }}>
          {nurStorno
            ? "Vom Versorger stornierte Kunden."
            : istVM
            ? "Mahnungen, Probleme und Stornierungen. Der zuständige Partner und sein Teamleiter werden informiert."
            : "Fälle, um die du dich kümmern musst."}
        </p>
        {istVM && !nurStorno && (
          <Btn icon={Plus} onClick={() => setNeuOffen(true)}>Problemfall melden</Btn>
        )}
      </div>

      {sichtbar.length === 0 ? (
        <div className="rounded p-8 text-center text-sm"
             style={{ border: "1px dashed " + C.line, color: C.muted }}>
          {nurStorno ? "Keine Stornierungen." : "Keine offenen Problemfälle."}
        </div>
      ) : (
        <div className="rounded overflow-hidden" style={{ background: C.card, border: "1px solid " + C.line }}>
          {sichtbar.map((p, i) => {
            const st = PROBLEM_STATUS[p.status];
            const meins = p.betroffene.find((b) => b.id === user.id);
            return (
              <button key={p.id} onClick={() => setAuswahl(p.id)}
                className="w-full text-left px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-1"
                style={{ borderTop: i ? "1px solid " + C.line : "none",
                         background: p.status === "offen" && meins ? "#FCF3F0" : "transparent" }}>
                <div className="flex-1 min-w-40">
                  <div className="text-sm">{p.kunde}</div>
                  <div className="text-xs" style={{ color: C.muted }}>
                    {p.id} · {datum(p.angelegt)} · {p.betroffene.map((b) => b.name).join(", ")}
                  </div>
                </div>
                <span className="text-xs px-2 py-0.5 rounded w-24 text-center"
                      style={{ border: "1px solid " + C.line,
                               color: p.art === "Storno" ? C.warn : C.gas }}>{p.art}</span>
                {meins && meins.rueckzahlung > 0 && (
                  <span className="text-sm w-28 text-right" style={{ color: C.warn, fontVariantNumeric: "tabular-nums" }}>
                    -{eur(meins.rueckzahlung)}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 text-xs w-32" style={{ color: st.color }}>
                  <span className="w-2 h-2 rounded-full" style={{ background: st.color }} />{st.label}
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

function Smartmeter({ vorgaenge, setVorgaenge, anfragen, mitarbeiter, user }) {
  const [auswahl, setAuswahl] = useState(null);
  const [neuKunde, setNeuKunde] = useState("");
  const [nachricht, setNachricht] = useState("");
  const [smDateien, setSmDateien] = useState([]);
  const [eingangSm, setEingangSm] = useState({ betrag: "", partner: "", datum: heute() });
  const [fehlend, setFehlend] = useState("");
  const [modus, setModus] = useState(null);

  const istKalk = user.rolle === "Kalkulation";
  const eigene = istKalk ? vorgaenge : vorgaenge.filter((v) => v.partnerId === user.id);
  const offen = vorgaenge.find((v) => v.id === auswahl);

  /* Bestandskunden des Partners, für die noch kein Smartmeter-Vorgang läuft */
  const kunden = anfragen.filter((a) =>
    istBeteiligt(a, user.id) && ["bestaetigt", "abgeschlossen"].includes(a.status) &&
    !vorgaenge.some((v) => v.anfrageId === a.id));

  const anlegen = () => {
    const a = anfragen.find((x) => x.id === neuKunde);
    if (!a) return;
    const v = {
      id: "SM-" + new Date().getFullYear() + "-" + Math.floor(100 + Math.random() * 899),
      anfrageId: a.id, kunde: a.kunde.firma, ort: a.kunde.ort,
      partnerId: a.partnerId, partnerName: a.partnerName,
      angelegt: heute(), status: "entwurf", bemerkung: "", fehlendText: "",
      stellen: a.lieferstellen.map((l) => ({
        id: l.id, medium: l.medium, bezeichnung: l.bezeichnung,
        zaehlerart: l.zaehlerart, verbrauch: l.verbrauch, zaehlernummer: l.zaehlernummer,
        meloId: "", messstellenbetreiber: "", foto: null,
      })),
      verlauf: [{ d: heute(), t: "Smartmeter-Vorgang angelegt", w: user.name }],
    };
    setVorgaenge([v, ...vorgaenge]);
    setNeuKunde(""); setAuswahl(v.id);
  };

  const setz = (id, aend) => setVorgaenge(vorgaenge.map((v) => (v.id === id ? { ...v, ...aend } : v)));
  const setStelle = (vid, sid, k, w) =>
    setVorgaenge(vorgaenge.map((v) => v.id !== vid ? v
      : { ...v, stellen: v.stellen.map((st) => (st.id === sid ? { ...st, [k]: w } : st)) }));

  const luecken = (v) => {
    const f = [];
    v.stellen.forEach((st, i) => {
      const n = (st.bezeichnung || "Lieferstelle " + (i + 1)) + ": ";
      if (!st.zaehlernummer) f.push(n + "Zählernummer");
      if (!st.meloId) f.push(n + "Messlokations-ID");
      if (!st.messstellenbetreiber) f.push(n + "Messstellenbetreiber");
      if (!st.verbrauch) f.push(n + "Verbrauch");
    });
    return f;
  };

  /* ---------- Einzelvorgang ---------- */
  if (offen) {
    const st = SM_STATUS[offen.status];
    const bearbeitbar = !istKalk && ["entwurf", "klaerfall"].includes(offen.status);
    const fehlt = luecken(offen);
    return (
      <div>
        <div className="flex items-center gap-3 mb-1">
          <button onClick={() => { setAuswahl(null); setModus(null); }} style={{ color: C.muted }}>
            <ArrowLeft size={18} />
          </button>
          <h2 className="text-lg">{offen.kunde}</h2>
          <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: st.color }}>
            <span className="w-2 h-2 rounded-full" style={{ background: st.color }} />{st.label}
          </span>
        </div>
        <p className="text-sm mb-5 ml-8" style={{ color: C.muted }}>
          {offen.id} · {offen.ort} · {offen.partnerName} · angelegt {datum(offen.angelegt)}
        </p>

        {offen.status === "klaerfall" && offen.fehlendText && (
          <div className="rounded p-4 mb-5" style={{ background: "#FCF3F0", border: "1px solid " + C.warn }}>
            <div className="flex items-center gap-2 mb-1" style={{ color: C.warn }}>
              <AlertTriangle size={15} /><span className="text-sm">Die Kalkulation braucht noch etwas</span>
            </div>
            <p className="text-sm ml-6">{offen.fehlendText}</p>
          </div>
        )}

        {offen.status === "msb_abgelehnt" && offen.ablehnungText && (
          <div className="rounded p-4 mb-5" style={{ background: "#FCF3F0", border: "1px solid " + C.warn }}>
            <div className="flex items-center gap-2 mb-1" style={{ color: C.warn }}>
              <AlertTriangle size={15} />
              <span className="text-sm">Vom Messstellenbetreiber abgelehnt</span>
            </div>
            <p className="text-sm ml-6">{offen.ablehnungText}</p>
          </div>
        )}

        {/* Nachrichten zwischen Vertrieb und Kalkulation, für beide sichtbar */}
        <div className="rounded p-4 mb-5" style={{ background: C.card, border: "1px solid " + C.line }}>
          <div className="text-sm mb-3">Nachrichten</div>
          {(offen.nachrichten || []).length === 0 && (
            <p className="text-sm mb-3" style={{ color: C.muted }}>Noch keine Nachrichten.</p>
          )}
          <div className="space-y-3 mb-4">
            {(offen.nachrichten || []).map((n) => (
              <div key={n.id} className="p-3 rounded"
                   style={{ background: "#F6F8FA", borderLeft: "3px solid " + (ROLLENFARBE[n.rolle] || C.line) }}>
                <div className="flex flex-wrap items-baseline gap-2 mb-1">
                  <span className="text-sm">{n.von}</span>
                  <span className="text-xs" style={{ color: ROLLENFARBE[n.rolle] || C.muted }}>{n.rolle}</span>
                  <span className="text-xs" style={{ color: C.muted }}>{datum(n.datum)}, {n.zeit}</span>
                </div>
                <p className="text-sm" style={{ whiteSpace: "pre-wrap" }}>{n.text}</p>
                {(n.dateien || []).length > 0 && (
                  <div className="space-y-2 mt-2">
                    {n.dateien.map((d, i) => <DateiChip key={i} datei={d} />)}
                  </div>
                )}
              </div>
            ))}
          </div>

          <textarea rows={2} value={nachricht} onChange={(e) => setNachricht(e.target.value)}
            placeholder="Nachricht schreiben"
            className="w-full px-3 py-2 text-sm rounded outline-none"
            style={{ border: "1px solid " + C.line }} />
          <div className="space-y-2 mt-2">
            {smDateien.map((d, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="flex-1 min-w-0"><DateiChip datei={d} /></div>
                <button onClick={() => setSmDateien(smDateien.filter((_, x) => x !== i))}
                  style={{ color: C.muted }}><X size={15} /></button>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            <label className="flex items-center gap-2 px-3 py-2 rounded text-sm cursor-pointer"
                   style={{ border: "1px dashed " + C.line, color: C.muted, background: "#fff" }}>
              <Upload size={14} /> Datei anhängen
              <input type="file" multiple className="hidden"
                onChange={(e) => Array.from(e.target.files || []).forEach((f) =>
                  dateiLesen(f, (d) => setSmDateien((v) => [...v, d])))} />
            </label>
            <Btn icon={Send} disabled={!nachricht.trim() && smDateien.length === 0}
              onClick={() => {
                setz(offen.id, {
                  nachrichten: [...(offen.nachrichten || []), {
                    id: uid(), text: nachricht.trim(), von: user.name, rolle: user.rolle,
                    datum: heute(), zeit: jetzt(), dateien: smDateien,
                  }],
                });
                setNachricht(""); setSmDateien([]);
              }}>Senden</Btn>
          </div>
        </div>

        <div className="space-y-4">
          {offen.stellen.map((s2, i) => (
            <div key={s2.id} className="rounded overflow-hidden" style={{ border: "1px solid " + C.line }}>
              <div className="flex items-center gap-2 px-4 py-2"
                   style={{ background: "#F6F8FA", borderBottom: "1px solid " + C.line,
                            borderLeft: "3px solid " + (s2.medium === "strom" ? C.strom : C.gas) }}>
                <MediumIcon medium={s2.medium} />
                <span className="text-sm">{s2.bezeichnung || "Lieferstelle " + (i + 1)}</span>
              </div>
              <div className="p-4 grid sm:grid-cols-2 gap-4">
                {bearbeitbar ? (
                  <>
                    <Select label="Zählerart" value={s2.zaehlerart}
                      onChange={(v) => setStelle(offen.id, s2.id, "zaehlerart", v)} options={["SLP", "RLM"]} />
                    <Feld label="Jahresverbrauch in kWh" value={s2.verbrauch} zahl
                      onChange={(v) => setStelle(offen.id, s2.id, "verbrauch", v)} />
                    <Feld label="Zählernummer" value={s2.zaehlernummer}
                      onChange={(v) => setStelle(offen.id, s2.id, "zaehlernummer", v)} />
                    <Feld label="Messlokations-ID (MeLo)" value={s2.meloId}
                      onChange={(v) => setStelle(offen.id, s2.id, "meloId", v)} placeholder="11-stellig" />
                    <Feld label="Messstellenbetreiber" value={s2.messstellenbetreiber}
                      onChange={(v) => setStelle(offen.id, s2.id, "messstellenbetreiber", v)} breit />
                    <div className="sm:col-span-2">
                      <Datei mehrere label="Foto des Zählers" datei={s2.foto} bild
                        onSet={(f) => setStelle(offen.id, s2.id, "foto", f)} hinweis="Bild auswählen" />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-sm"><span style={{ color: C.muted }}>Zählerart </span>{s2.zaehlerart}</div>
                    <div className="text-sm"><span style={{ color: C.muted }}>Verbrauch </span>
                      {num(parseFloat(s2.verbrauch) || 0)} kWh</div>
                    <div className="text-sm"><span style={{ color: C.muted }}>Zählernummer </span>{s2.zaehlernummer || "–"}</div>
                    <div className="text-sm"><span style={{ color: C.muted }}>MeLo-ID </span>{s2.meloId || "–"}</div>
                    <div className="text-sm sm:col-span-2">
                      <span style={{ color: C.muted }}>Messstellenbetreiber </span>{s2.messstellenbetreiber || "–"}</div>
                    <div className="sm:col-span-2">
                      {s2.foto ? <DateiChip datei={s2.foto} label="Zählerfoto" />
                        : <span className="text-xs" style={{ color: C.warn }}>kein Zählerfoto hinterlegt</span>}
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {bearbeitbar && (
          <div className="rounded p-5 mt-5" style={{ background: C.card, border: "1px solid " + C.line }}>
            <label className="block mb-4">
              <span className="block text-xs mb-1" style={{ color: C.muted }}>Bemerkung an die Kalkulation</span>
              <textarea rows={2} value={offen.bemerkung}
                onChange={(e) => setz(offen.id, { bemerkung: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded outline-none"
                style={{ border: "1px solid " + C.line }} />
            </label>
            {fehlt.length > 0 && (
              <div className="p-3 rounded mb-4 text-sm" style={{ background: "#FCF3F0", color: C.warn }}>
                Es fehlt noch: {fehlt.join(", ")}
              </div>
            )}
            <Btn icon={Send} disabled={fehlt.length > 0}
              onClick={() => { setz(offen.id, { status: "eingereicht", fehlendText: "",
                verlauf: [...offen.verlauf, { d: heute(), t: "An die Kalkulation übermittelt", w: user.name }] });
                setAuswahl(null); }}>
              An die Kalkulation übermitteln
            </Btn>
          </div>
        )}

        {istKalk && ["eingereicht", "uebermittelt"].includes(offen.status) && (
          <div className="rounded p-5 mt-5" style={{ background: C.card, border: "1px solid " + C.strom }}>
            <div className="flex flex-wrap gap-2 mb-4">
              <Btn variante={modus === "rueck" ? "gefahr" : "hell"} icon={RotateCcw}
                onClick={() => setModus("rueck")}>Unterlagen nachfordern</Btn>
              {offen.status === "eingereicht" && (
                <Btn icon={Send} onClick={() => { setz(offen.id, { status: "uebermittelt",
                  verlauf: [...offen.verlauf, { d: heute(), t: "An den Messstellenbetreiber übermittelt", w: user.name }] });
                  setAuswahl(null); }}>
                  An Messstellenbetreiber übermittelt
                </Btn>
              )}
              {offen.status === "uebermittelt" && (
                <>
                  <Btn variante="ok" icon={Check} onClick={() => { setz(offen.id, { status: "bestaetigt",
                    verlauf: [...offen.verlauf, { d: heute(),
                      t: "Vom Messstellenbetreiber bestätigt", w: user.name }] });
                    setAuswahl(null); }}>
                    Vom Messstellenbetreiber bestätigt
                  </Btn>
                  <Btn variante={modus === "abgelehnt" ? "gefahr" : "hell"} icon={X}
                    onClick={() => setModus("abgelehnt")}>
                    Vom Messstellenbetreiber abgelehnt
                  </Btn>
                </>
              )}
            </div>
            {modus === "rueck" && (
              <div className="space-y-3">
                <label className="block">
                  <span className="block text-xs mb-1" style={{ color: C.muted }}>Was fehlt?</span>
                  <textarea rows={3} value={fehlend} onChange={(e) => setFehlend(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded outline-none"
                    style={{ border: "1px solid " + C.line }} />
                </label>
                <div className="space-y-2">
                  {smDateien.map((d, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="flex-1 min-w-0"><DateiChip datei={d} /></div>
                      <button onClick={() => setSmDateien(smDateien.filter((_, x) => x !== i))}
                        style={{ color: C.muted }}><X size={15} /></button>
                    </div>
                  ))}
                </div>
                <label className="inline-flex items-center gap-2 px-3 py-2 rounded text-sm cursor-pointer"
                       style={{ border: "1px dashed " + C.line, color: C.muted, background: "#fff" }}>
                  <Upload size={14} /> Datei anhängen
                  <input type="file" multiple className="hidden"
                    onChange={(e) => Array.from(e.target.files || []).forEach((f) =>
                      dateiLesen(f, (d) => setSmDateien((v) => [...v, d])))} />
                </label>
                <Btn variante="gefahr" icon={RotateCcw} disabled={!fehlend.trim()}
                  onClick={() => { setz(offen.id, { status: "klaerfall", fehlendText: fehlend,
                    nachrichten: [...(offen.nachrichten || []), {
                      id: uid(), text: "Unterlagen nachgefordert: " + fehlend,
                      von: user.name, rolle: user.rolle, datum: heute(), zeit: jetzt(),
                      dateien: smDateien }],
                    verlauf: [...offen.verlauf, { d: heute(), t: "Zurück an den Vertrieb", w: user.name }] });
                    setFehlend(""); setSmDateien([]); setAuswahl(null); }}>
                  An den Vertriebspartner zurücksenden
                </Btn>
              </div>
            )}

            {modus === "abgelehnt" && (
              <div className="space-y-3">
                <label className="block">
                  <span className="block text-xs mb-1" style={{ color: C.muted }}>
                    Begründung des Messstellenbetreibers
                  </span>
                  <textarea rows={3} value={fehlend} onChange={(e) => setFehlend(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded outline-none"
                    style={{ border: "1px solid " + C.line }} />
                </label>
                <Btn variante="gefahr" icon={X} disabled={!fehlend.trim()}
                  onClick={() => { setz(offen.id, { status: "msb_abgelehnt", ablehnungText: fehlend,
                    verlauf: [...offen.verlauf, { d: heute(),
                      t: "Vom Messstellenbetreiber abgelehnt", w: user.name }] });
                    setFehlend(""); setAuswahl(null); }}>
                  Ablehnung erfassen
                </Btn>
              </div>
            )}
          </div>
        )}

        {user.rolle === "Geschäftsführung" && offen.status === "bestaetigt" && (
          <div className="rounded p-5 mt-5" style={{ background: C.card, border: "1px solid " + C.ok }}>
            <div className="text-sm mb-1">Provisionseingang erfassen</div>
            <p className="text-xs mb-4" style={{ color: C.muted, maxWidth: "62ch" }}>
              Beim Smartmeter wird der Betrag für den Vertriebspartner direkt eingetragen, nicht
              prozentual berechnet.
            </p>
            <div className="grid sm:grid-cols-3 gap-4 mb-4">
              <Feld label="Eingegangene Provision in €" value={eingangSm.betrag}
                onChange={(v) => setEingangSm({ ...eingangSm, betrag: v })} />
              <Feld label="Davon an den Partner in €" value={eingangSm.partner}
                onChange={(v) => setEingangSm({ ...eingangSm, partner: v })} />
              <Feld label="Eingegangen am" type="date" value={eingangSm.datum}
                onChange={(v) => setEingangSm({ ...eingangSm, datum: v })} />
            </div>
            <Btn variante="ok" icon={Check}
              onClick={() => {
                const anPartner = parseFloat(String(eingangSm.partner).replace(",", ".")) || 0;
                setz(offen.id, {
                  status: "abgeschlossen",
                  vermerk: "Smartmeter verbaut",
                  provision: {
                    gesamt: parseFloat(String(eingangSm.betrag).replace(",", ".")) || 0,
                    partner: anPartner, datum: eingangSm.datum || heute(), von: user.name,
                  },
                  verlauf: [...offen.verlauf, { d: heute(),
                    t: "Provisionseingang bestätigt, " + eur(anPartner) + " für den Partner",
                    w: user.name }],
                });
                setEingangSm({ betrag: "", partner: "", datum: heute() });
                setAuswahl(null);
              }}>
              Eingang bestätigen und an das Vertragsmanagement geben
            </Btn>
          </div>
        )}

        {offen.provision && (() => {
          const Zeile = ({ k, v }) => (
            <div className="flex justify-between gap-4 py-1.5 text-sm" style={{ borderBottom: "1px solid " + C.line }}>
              <span style={{ color: C.muted }}>{k}</span>
              <span className="text-right" style={{ fontVariantNumeric: "tabular-nums" }}>{v || "–"}</span>
            </div>
          );
          return (
          <div className="rounded p-4 mt-5" style={{ background: "#F1F7F0", border: "1px solid " + C.ok }}>
            <div className="text-sm mb-2" style={{ color: C.ok }}>
              {offen.vermerk || "Abgeschlossen"}
            </div>
            <div className="grid sm:grid-cols-3 gap-4 text-sm">
              <Zeile k="Provision gesamt" v={eur(offen.provision.gesamt)} />
              <Zeile k="Für den Vertriebspartner" v={eur(offen.provision.partner)} />
              <Zeile k="Eingegangen am" v={datum(offen.provision.datum)} />
            </div>
          </div>
          );
        })()}

        <div className="rounded p-4 mt-5" style={{ background: C.card, border: "1px solid " + C.line }}>
          <div className="text-sm mb-3">Verlauf</div>
          {offen.verlauf.map((v, i) => (
            <div key={i} className="flex gap-3 py-2 text-sm" style={{ borderTop: i ? "1px solid " + C.line : "none" }}>
              <span style={{ color: C.muted, fontVariantNumeric: "tabular-nums" }}>{datum(v.d)}</span>
              <span className="flex-1">{v.t}<span className="block text-xs" style={{ color: C.muted }}>{v.w}</span></span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ---------- Liste ---------- */
  return (
    <div>
      <p className="text-sm mb-5" style={{ color: C.muted, maxWidth: "62ch" }}>
        {istKalk
          ? "Smartmeter-Anfragen aus dem Vertrieb. Prüfen, an den Messstellenbetreiber übermitteln oder Unterlagen nachfordern."
          : "Zusatzgeschäft bei Bestandskunden. Wähle einen Kunden, prüfe die Zählerdaten je Lieferstelle und übermittle sie an die Kalkulation."}
      </p>

      {!istKalk && (
        <div className="rounded p-4 mb-5" style={{ background: C.card, border: "1px solid " + C.line }}>
          {kunden.length === 0 ? (
            <p className="text-sm" style={{ color: C.muted }}>
              Keine Bestandskunden ohne laufenden Smartmeter-Vorgang.
            </p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4 items-end">
              <Select label="Kunde auswählen" value={neuKunde} onChange={setNeuKunde}
                options={[{ value: "", label: "Bitte wählen" },
                  ...kunden.map((a) => ({ value: a.id, label: a.kunde.firma + " · " + a.kunde.ort }))]} />
              <Btn icon={Plus} onClick={anlegen} disabled={!neuKunde}>Smartmeter erfassen</Btn>
            </div>
          )}
        </div>
      )}

      {eigene.length === 0 ? (
        <div className="rounded p-8 text-center text-sm"
             style={{ border: "1px dashed " + C.line, color: C.muted }}>
          Noch keine Smartmeter-Vorgänge.
        </div>
      ) : (
        <div className="rounded overflow-hidden" style={{ background: C.card, border: "1px solid " + C.line }}>
          {eigene.map((v, i) => {
            const st = SM_STATUS[v.status];
            return (
              <button key={v.id} onClick={() => setAuswahl(v.id)}
                className="w-full text-left px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-1"
                style={{ borderTop: i ? "1px solid " + C.line : "none" }}>
                <div className="flex-1 min-w-40">
                  <div className="text-sm">{v.kunde}</div>
                  <div className="text-xs" style={{ color: C.muted }}>
                    {v.id} · {v.stellen.length} Lieferstellen
                    {istKalk ? " · " + v.partnerName : ""}
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 text-xs w-56" style={{ color: st.color }}>
                  <span className="w-2 h-2 rounded-full" style={{ background: st.color }} />{st.label}
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

function Tickets({ tickets, setTickets, user, mitarbeiter }) {
  const [neuOffen, setNeuOffen] = useState(false);
  const [empfaenger, setEmpfaenger] = useState(TICKET_EMPFAENGER[0]);
  const [betreff, setBetreff] = useState("");
  const [text, setText] = useState("");
  const [auswahl, setAuswahl] = useState(null);
  const [antwort, setAntwort] = useState("");
  const [anhaenge, setAnhaenge] = useState([]);
  const [neuDateien, setNeuDateien] = useState([]);

  const zustaendig = TICKET_EMPFAENGER.includes(user.rolle);
  const meine = tickets.filter((t) => t.vonId === user.id);
  const anMich = tickets.filter((t) => t.empfaenger === user.rolle);
  const liste = [...new Set([...meine, ...anMich])]
    .sort((a, b) => b.nummer - a.nummer);
  const ticket = tickets.find((t) => t.id === auswahl);

  const naechsteNummer = () =>
    tickets.reduce((m, t) => Math.max(m, t.nummer || 0), 1000) + 1;

  const anlegen = () => {
    const t = {
      id: "T" + uid(), nummer: naechsteNummer(), empfaenger, betreff,
      vonId: user.id, von: user.name, vonRolle: user.rolle,
      datum: heute(), zeit: jetzt(), status: "offen",
      beitraege: [{ id: uid(), text, von: user.name, rolle: user.rolle,
                    datum: heute(), zeit: jetzt(), dateien: neuDateien }],
    };
    setTickets([t, ...tickets]);
    setBetreff(""); setText(""); setNeuDateien([]); setNeuOffen(false);
  };

  const setz = (id, aend) => setTickets(tickets.map((t) => (t.id === id ? { ...t, ...aend } : t)));

  const antworten = () => {
    if (!antwort.trim()) return;
    setz(ticket.id, {
      status: ticket.status === "offen" ? "bearbeitung" : ticket.status,
      beitraege: [...ticket.beitraege, {
        id: uid(), text: antwort.trim(), von: user.name, rolle: user.rolle,
        datum: heute(), zeit: jetzt(), dateien: anhaenge,
      }],
    });
    setAntwort("");
    setAnhaenge([]);
  };

  if (ticket) {
    const st = TICKET_STATUS[ticket.status];
    const darfStatus = ticket.empfaenger === user.rolle;
    return (
      <div>
        <div className="flex items-center gap-3 mb-1">
          <button onClick={() => setAuswahl(null)} style={{ color: C.muted }}><ArrowLeft size={18} /></button>
          <h2 className="text-lg">{ticket.betreff}</h2>
          <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: st.color }}>
            <span className="w-2 h-2 rounded-full" style={{ background: st.color }} />{st.label}
          </span>
        </div>
        <p className="text-sm mb-5 ml-8" style={{ color: C.muted }}>
          Ticket {ticket.nummer} · an {ticket.empfaenger} · von {ticket.von} am {datum(ticket.datum)}
        </p>

        <div className="rounded" style={{ background: C.card, border: "1px solid " + C.line }}>
          <div className="px-4 py-3 space-y-3">
            {ticket.beitraege.map((b) => {
              const farbe = ROLLENFARBE[b.rolle] || C.muted;
              return (
                <div key={b.id} className="rounded p-3"
                     style={{ background: "#F6F8FA", borderLeft: "3px solid " + farbe }}>
                  <div className="flex flex-wrap items-baseline gap-x-2 mb-1">
                    <span className="text-sm">{b.von}</span>
                    <span className="text-xs" style={{ color: farbe }}>{b.rolle}</span>
                    <span className="flex-1" />
                    <span className="text-xs" style={{ color: C.muted }}>
                      {datum(b.datum)}, {b.zeit} Uhr
                    </span>
                  </div>
                  <p className="text-sm" style={{ whiteSpace: "pre-wrap" }}>{b.text}</p>
                  {(b.dateien || []).length > 0 && (
                    <div className="space-y-2 mt-3">
                      {b.dateien.map((d, i) => <DateiChip key={i} datei={d} />)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {ticket.status !== "abgeschlossen" && (
            <div className="px-4 py-3" style={{ borderTop: "1px solid " + C.line }}>
              <textarea rows={3} value={antwort} onChange={(e) => setAntwort(e.target.value)}
                placeholder="Antwort schreiben"
                className="w-full px-3 py-2 text-sm rounded outline-none"
                style={{ border: "1px solid " + C.line }} />

              <div className="space-y-2 mt-2">
                {anhaenge.map((d, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="flex-1 min-w-0"><DateiChip datei={d} /></div>
                    <button onClick={() => setAnhaenge(anhaenge.filter((_, x) => x !== i))}
                      style={{ color: C.muted }}><X size={15} /></button>
                  </div>
                ))}
              </div>
              <label className="flex items-center gap-2 px-3 py-2 rounded text-sm cursor-pointer mt-2"
                     style={{ border: "1px dashed " + C.line, color: C.muted, background: "#fff" }}>
                <Upload size={14} /> Datei anhängen
                <input type="file" multiple className="hidden"
                  onChange={(e) => Array.from(e.target.files || []).forEach((f) =>
                    dateiLesen(f, (d) => setAnhaenge((v) => [...v, d])))} />
              </label>

              <div className="flex flex-wrap gap-2 mt-2">
                <Btn icon={Send} onClick={antworten}
                  disabled={!antwort.trim() && anhaenge.length === 0}>Antworten</Btn>
                {darfStatus && (
                  <>
                    {ticket.status === "offen" && (
                      <Btn variante="hell" onClick={() => setz(ticket.id, { status: "bearbeitung" })}>
                        In Bearbeitung nehmen
                      </Btn>
                    )}
                    <Btn variante="ok" icon={Check}
                      onClick={() => { setz(ticket.id, { status: "abgeschlossen" }); setAuswahl(null); }}>
                      Ticket abschließen
                    </Btn>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (neuOffen)
    return (
      <div>
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => setNeuOffen(false)} style={{ color: C.muted }}><ArrowLeft size={18} /></button>
          <h2 className="text-lg">Neues Ticket</h2>
        </div>
        <div className="rounded p-5 space-y-4" style={{ background: C.card, border: "1px solid " + C.line }}>
          <Select label="An welche Abteilung?" value={empfaenger} onChange={setEmpfaenger}
            options={TICKET_EMPFAENGER} />
          <Feld label="Betreff" value={betreff} onChange={setBetreff}
            placeholder="Kurz und eindeutig" />
          <label className="block">
            <span className="block text-xs mb-1" style={{ color: C.muted }}>Dein Anliegen</span>
            <textarea rows={5} value={text} onChange={(e) => setText(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded outline-none"
              style={{ border: "1px solid " + C.line }} />
          </label>
          <div>
            <span className="block text-xs mb-2" style={{ color: C.muted }}>Dateien</span>
            <div className="space-y-2 mb-2">
              {neuDateien.map((d, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="flex-1 min-w-0"><DateiChip datei={d} /></div>
                  <button onClick={() => setNeuDateien(neuDateien.filter((_, x) => x !== i))}
                    style={{ color: C.muted }}><X size={15} /></button>
                </div>
              ))}
            </div>
            <label className="flex items-center gap-2 px-3 py-2 rounded text-sm cursor-pointer"
                   style={{ border: "1px dashed " + C.line, color: C.muted, background: "#fff" }}>
              <Upload size={14} /> Datei anhängen
              <input type="file" multiple className="hidden"
                onChange={(e) => Array.from(e.target.files || []).forEach((f) =>
                  dateiLesen(f, (d) => setNeuDateien((v) => [...v, d])))} />
            </label>
          </div>

          <Btn icon={Send} onClick={anlegen} disabled={!betreff.trim() || !text.trim()}>
            Ticket eröffnen
          </Btn>
        </div>
      </div>
    );

  const offeneAnMich = anMich.filter((t) => t.status !== "abgeschlossen").length;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <p className="text-sm" style={{ color: C.muted, maxWidth: "52ch" }}>
          {zustaendig
            ? "An dich gerichtete Tickets und deine eigenen Anfragen."
            : "Deine Tickets an Vertragsmanagement, Kalkulation, Geschäftsführung und Finanzbuchhaltung."}
          {offeneAnMich > 0 ? " " + offeneAnMich + " warten auf dich." : ""}
        </p>
        <Btn icon={Plus} onClick={() => setNeuOffen(true)}>Ticket eröffnen</Btn>
      </div>

      {liste.length === 0 ? (
        <div className="rounded p-8 text-center text-sm"
             style={{ border: "1px dashed " + C.line, color: C.muted }}>
          Noch keine Tickets.
        </div>
      ) : (
        <div className="rounded overflow-hidden" style={{ background: C.card, border: "1px solid " + C.line }}>
          {liste.map((t, i) => {
            const st = TICKET_STATUS[t.status];
            const anMichOffen = t.empfaenger === user.rolle && t.status !== "abgeschlossen";
            return (
              <button key={t.id} onClick={() => setAuswahl(t.id)}
                className="w-full text-left px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-1"
                style={{ borderTop: i ? "1px solid " + C.line : "none",
                         background: anMichOffen ? "#FCF6F4" : "transparent" }}>
                <span className="text-sm w-16" style={{ color: C.muted, fontVariantNumeric: "tabular-nums" }}>
                  #{t.nummer}
                </span>
                <div className="flex-1 min-w-40">
                  <div className="text-sm">{t.betreff}</div>
                  <div className="text-xs" style={{ color: C.muted }}>
                    {t.vonId === user.id ? "an " + t.empfaenger : "von " + t.von}
                    {" · " + datum(t.datum) + " · " + t.beitraege.length + " Beiträge"}
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 text-xs w-36" style={{ color: st.color }}>
                  <span className="w-2 h-2 rounded-full" style={{ background: st.color }} />{st.label}
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

/* Provisionsabrechnung mit Fälligkeiten je Lieferjahr.
   1. Lieferjahr: sobald die Geschäftsführung den Provisionseingang bestätigt
   hat, unabhängig vom Lieferbeginn. Jedes weitere Lieferjahr: erst wenn der
   Kunde dort angekommen ist, ausgezahlt im Monat danach.
   Beispiel: Abschluss 11/2026, Lieferbeginn 1.1.2029 → Jahr 1 nach Eingang,
   Jahr 2 am 1.2.2030, Jahr 3 am 1.2.2031. */
/* ------------------------------------------------------------------ */
/*  Alle bisher erstellten Kalkulationen, je Kunde mit allen Varianten */
/* ------------------------------------------------------------------ */
function Kalkulationen({ anfragen, onOeffnen, user }) {
  const [suche, setSuche] = useState("");
  const [filter, setFilter] = useState("alle");
  const GRUPPE = {
    offen: { label: "Beim Kunden", st: ["angebot", "klaerfall", "ruecksprache"] },
    auftrag: { label: "Auftrag erteilt", st: ["uebermittelt", "einreichung", "bestaetigt", "abgeschlossen"] },
    abgelehnt: { label: "Nicht abgeschlossen", st: ["abgelehnt"] },
  };
  const norm = (t) => String(t || "").toLowerCase();
  const alle = anfragen.filter((a) => a.kalkulation)
    .sort((x, y) => (y.kalkulation.datum || "").localeCompare(x.kalkulation.datum || ""));
  const treffer = alle.filter((a) => {
    if (filter !== "alle" && !GRUPPE[filter].st.includes(a.status)) return false;
    if (!suche.trim()) return true;
    const t = norm(suche);
    return [a.kunde.firma, a.kunde.ort, a.id, a.partnerName, a.kalkulation.bearbeiter,
      ...varianten(a).flatMap((v) => [v.versorger, v.produkt]),
      ...a.lieferstellen.flatMap((l) => [l.maloId, l.zaehlernummer, l.ort])].some((x) => norm(x).includes(t));
  });
  const anzahl = (id) => id === "alle" ? alle.length : alle.filter((a) => GRUPPE[id].st.includes(a.status)).length;
  const gewaehltIds = (a) => gewaehlte(a).map((v) => v.id);

  return (
    <div className="space-y-4">
      {user && <UmlagenPflege user={user} />}
      <div className="rounded p-3 space-y-3" style={{ background: C.card, border: "1px solid " + C.line }}>
        <Feld label="Suchen: Kunde, Ort, Versorger, Vertriebspartner, MaLo, Zähler" value={suche} onChange={setSuche} />
        <div className="flex flex-wrap gap-2">
          {[["alle", "Alle"], ...Object.entries(GRUPPE).map(([id, g]) => [id, g.label])].map(([id, label]) => (
            <button key={id} onClick={() => setFilter(id)} className="px-3 py-1.5 rounded text-sm"
              style={filter === id ? { background: C.ink, color: "#fff" }
                : { background: "#fff", color: C.text, border: "1px solid " + C.line }}>
              {label} ({anzahl(id)})
            </button>
          ))}
        </div>
      </div>

      {treffer.length === 0 ? (
        <div className="rounded p-8 text-center text-sm" style={{ border: "1px dashed " + C.line, color: C.muted }}>
          {alle.length === 0 ? "Noch keine Kalkulationen erstellt." : "Keine Kalkulation passt zur Suche."}
        </div>
      ) : (
        <div className="space-y-3">
          {treffer.map((a) => {
            const k = a.kalkulation, gw = gewaehltIds(a);
            return (
              <div key={a.id} className="rounded p-4" style={{ background: C.card, border: "1px solid " + C.line }}>
                <button className="w-full text-left" onClick={() => onOeffnen(a.id)}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-sm">{a.kunde.firma || a.id}</span>
                    <span className="text-xs px-2 py-0.5 rounded"
                      style={{ color: (statusVon(a) || {}).color, border: "1px solid " + C.line }}>
                      {(statusVon(a) || {}).label}
                    </span>
                  </div>
                  <div className="text-xs mt-1" style={{ color: C.muted }}>
                    {[a.id, a.kunde.ort, "Vertrieb: " + (a.partnerName || "–"),
                      "kalkuliert " + datum(k.datum) + (k.bearbeiter ? " von " + k.bearbeiter : ""),
                      num(verbrauchGesamt(a)) + " kWh/Jahr"].filter(Boolean).join(" · ")}
                  </div>
                </button>
                <div className="mt-3 space-y-2">
                  {varianten(a).map((v, i) => (
                    <div key={v.id || i} className="rounded px-3 py-2 text-sm"
                      style={{ background: gw.includes(v.id) ? "#F1F7F0" : "#F6F8FA",
                               border: "1px solid " + (gw.includes(v.id) ? C.ok : C.line) }}>
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <span>Variante {i + 1}: {[v.versorger, v.produkt].filter(Boolean).join(" · ") || "–"}</span>
                        {gw.includes(v.id) && <span className="text-xs" style={{ color: C.ok }}>vom Kunden gewählt</span>}
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: C.muted }}>
                        {[SPARTEN.find((x) => x.value === (v.sparte || "beide"))?.label,
                          laufzeitMonate(v) ? laufzeitMonate(v) + " Monate" : "",
                          v.lieferbeginn ? "ab " + datum(v.lieferbeginn) : "",
                          enddatum(v) ? "bis " + datum(enddatum(v)) : "",
                          "Aufschlag " + num(parseFloat(v.aufschlag) || 0, 3) + " ct/kWh",
                          v.gueltigBis ? "gültig bis " + datum(v.gueltigBis) : ""].filter(Boolean).join(" · ")}
                      </div>
                      {(v.angebot || v.individualangebot) && (
                        <div className="space-y-2 mt-2 min-w-0">
                          {v.angebot && <DateiChip datei={v.angebot} klein />}
                          {v.individualangebot && <DateiChip datei={v.individualangebot} klein />}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Beschaffung: Lastgang, Preiskurve, Bewertung und Tranchenplan      */
/*                                                                     */
/*  Alles rechnet im Browser. Eingaben sind der Lastgang des Kunden    */
/*  und die Terminmarktpreise, die die Beschaffung je Bewertung von    */
/*  Hand einträgt (Cal Base/Peak, wahlweise Quartale).                 */
/*  Aus diesen Preisen entsteht eine stündliche Preiskurve (HPFC):     */
/*  Jahr → Quartal → Monat → Peak/Offpeak → Stunde. Der Mittelwert     */
/*  jeder Stufe trifft den eingegebenen Preis genau (arbitragefrei).   */
/*  Ein Stundenprofil aus Day-Ahead-Preisen ist optional.              */
/* ------------------------------------------------------------------ */

/* Feiertage, die im Lastgang wie Sonntage wirken: bundesweit und, falls gewählt, die des Bundeslandes.
   Fronleichnam gilt in Teilen von Sachsen und Thüringen, Mariä Himmelfahrt nur in Teilen Bayerns;
   gerechnet wird mit der Regel, die für den größten Teil des Landes gilt. */
function ArbeitsUebersicht({ anfragen, mitarbeiter, user, leads, probleme, smartmeter, termine,
                             aufgaben, setAufgaben, onOeffnen, onListe }) {
  const rolle = user.rolle;
  const seit = (d) => { const t = tageZwischen(d, heute()); return t == null ? "" : t === 0 ? "seit heute" : "seit " + t + (t === 1 ? " Tag" : " Tagen"); };
  const st = (x) => anfragen.filter((a) => a.status === x);
  const offeneProbleme = (probleme || []).filter((p) => p.status !== "erledigt");

  /* Kachel: Zahl, Farbe, Ziel (Ansicht oder Liste); 0 wird blass dargestellt */
  const Kachel = ({ k, v, farbe, klick, klein }) => (
    <button onClick={klick} disabled={!klick} className="rounded p-4 text-left w-full"
      style={{ background: C.card, border: "1px solid " + (v && farbe === C.warn ? C.warn : C.line),
               cursor: klick ? "pointer" : "default" }}>
      <div className="text-xs mb-2" style={{ color: C.muted }}>{k}</div>
      <div className="text-2xl" style={{ color: v ? (farbe || C.text) : C.muted, fontVariantNumeric: "tabular-nums" }}>{v}</div>
      {klein && <div className="text-xs mt-1" style={{ color: C.muted }}>{klein}</div>}
    </button>
  );
  const Karte = ({ titel, rechts, children }) => (
    <div className="rounded overflow-hidden" style={{ background: C.card, border: "1px solid " + C.line }}>
      <div className="flex items-baseline justify-between gap-3 px-4 py-3" style={{ borderBottom: "1px solid " + C.line }}>
        <span className="text-sm">{titel}</span>{rechts}
      </div>
      {children}
    </div>
  );
  const Reihe = ({ i, links, unten, rechts, klick }) => (
    <button onClick={klick} disabled={!klick} className="w-full text-left flex items-center gap-4 px-4 py-3 text-sm"
      style={{ borderTop: i ? "1px solid " + C.line : "none", cursor: klick ? "pointer" : "default" }}>
      <span className="flex-1 min-w-0">{links}
        {unten && <span className="block text-xs" style={{ color: C.muted }}>{unten}</span>}
      </span>
      <span className="text-xs" style={{ color: C.muted, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>{rechts}</span>
    </button>
  );
  const Leer = ({ text }) => <div className="px-4 py-4 text-sm" style={{ color: C.muted }}>{text}</div>;
  const liste = (titel, l) => () => onListe(titel, l);
  const ansicht = (id) => () => onOeffnen(null, id);

  /* zuTun: { n, text, farbe, klick } – nur Einträge mit n > 0 erscheinen oben auf der Startseite */
  let kacheln = [], arbeit = null, hinweis = "", zuTun = [];

  if (rolle === "Kalkulation") {
    hinweis = "Anfragen kalkulieren, Angebote zurückgeben, Aufträge beim Versorger einreichen und bestätigen.";
    const neu = st("eingereicht"), angefragt = st("angefragt"), klaer = st("klaerfall"),
          auftraege = st("uebermittelt"), eingereicht = st("einreichung");
    const sm = (smartmeter || []).filter((v) => v.status === "eingereicht");
    kacheln = [
      { k: "Neue Anfragen", v: neu.length, farbe: C.strom, klick: liste("Neue Anfragen", neu) },
      { k: "Beim Versorger angefragt", v: angefragt.length, farbe: C.gas, klick: liste("Beim Versorger angefragt", angefragt) },
      { k: "Angebote beim Vertriebspartner", v: st("angebot").length, farbe: C.ok, klick: liste("Angebote beim Vertriebspartner", st("angebot")) },
      { k: "Neue Aufträge einreichen", v: auftraege.length, farbe: C.warn, klick: ansicht("auftraege") },
      { k: "Bestätigung vom Versorger offen", v: eingereicht.length, farbe: C.gas, klick: ansicht("versorger") },
      { k: "Unterlagen beim Vertrieb angefordert", v: klaer.length, klick: liste("Unterlagen angefordert", klaer) },
      { k: "Smartmeter zu prüfen", v: sm.length, farbe: C.strom, klick: ansicht("smartmeter") },
      { k: "Kalkulationen bisher", v: anfragen.filter((a) => a.kalkulation).length, farbe: C.ink, klick: ansicht("kalkulationen") },
    ];
    zuTun = [
      { n: auftraege.length, text: "Aufträge beim Versorger einreichen", farbe: C.warn, klick: ansicht("auftraege") },
      { n: neu.length, text: "Neue Anfragen kalkulieren", farbe: C.strom, klick: liste("Neue Anfragen", neu) },
      { n: eingereicht.length, text: "Bestätigung des Versorgers erfassen, sobald sie da ist", farbe: C.gas, klick: ansicht("versorger") },
      { n: sm.length, text: "Smartmeter-Anträge prüfen", farbe: C.strom, klick: ansicht("smartmeter") },
    ];
    const reihe = [...auftraege, ...neu, ...angefragt].sort((x, y) => (x.angelegt || "").localeCompare(y.angelegt || ""));
    arbeit = (
      <Karte titel="Als Nächstes" rechts={<span className="text-xs" style={{ color: C.muted }}>älteste zuerst</span>}>
        {reihe.length === 0 ? <Leer text="Nichts offen. Alle Anfragen sind bearbeitet." /> :
          reihe.slice(0, 12).map((a, i) => (
            <Reihe key={a.id} i={i} links={a.kunde.firma}
              unten={statusVon(a).label + " · " + a.partnerName + " · " + a.id}
              rechts={seit(a.angelegt)} klick={() => onOeffnen(a.id)} />
          ))}
      </Karte>
    );
  }

  if (rolle === "Vertragsmanagement") {
    hinweis = "Abgeschlossene Verträge an den Versorger weiterleiten und bis zur Lieferung begleiten.";
    const vertraege = st("abgeschlossen");
    const schritt = (a) => VM_SCHRITTE.includes(a.vertragsStatus) ? a.vertragsStatus : "Vertrag zu erstellen";
    const je = (x) => vertraege.filter((a) => schritt(a) === x);
    const laufenAus = vertraege.filter((a) => {
      const rest = monateBis(vertragsende(a));
      return rest != null && rest >= 0 && rest <= VERLAENGERUNG_VORLAUF[1];
    });
    const stornos = offeneProbleme.filter((p) => p.art === "Storno");
    const neueLb = vertraege.filter((a) => !a.lieferbestaetigung);
    kacheln = [
      { k: "Neue Lieferbestätigungen", v: neueLb.length, farbe: C.gold, klick: liste("Neue Lieferbestätigungen", neueLb) },
      { k: "Neu: Vertrag zu erstellen", v: je("Vertrag zu erstellen").length, farbe: C.warn,
        klick: liste("Vertrag zu erstellen", je("Vertrag zu erstellen")) },
      { k: "Vertrag versendet", v: je("Vertrag versendet").length, farbe: C.gas,
        klick: liste("Vertrag versendet", je("Vertrag versendet")) },
      { k: "Unterschrieben, an Versorger weiterleiten", v: je("Vertrag unterschrieben").length, farbe: C.warn,
        klick: liste("Unterschrieben, an den Versorger weiterleiten", je("Vertrag unterschrieben")) },
      { k: "Beim Versorger eingereicht", v: je("Beim Versorger eingereicht").length, farbe: C.strom,
        klick: liste("Beim Versorger eingereicht", je("Beim Versorger eingereicht")) },
      { k: "Lieferung aktiv", v: je("Lieferung aktiv").length, farbe: C.ok,
        klick: liste("Lieferung aktiv", je("Lieferung aktiv")) },
      { k: "Laufen in 6 Monaten aus", v: laufenAus.length, farbe: C.gas, klick: liste("Laufen in 6 Monaten aus", laufenAus) },
      { k: "Problemfälle offen", v: offeneProbleme.filter((p) => p.art !== "Storno").length, farbe: C.warn, klick: ansicht("probleme") },
      { k: "Stornierungen offen", v: stornos.length, farbe: C.warn, klick: ansicht("stornos") },
    ];
    zuTun = [
      { n: neueLb.length, text: "Lieferbestätigung erfassen", farbe: C.gas, klick: liste("Neue Lieferbestätigungen", neueLb) },
      { n: je("Vertrag unterschrieben").length, text: "Unterschriebene Verträge an den Versorger weiterleiten", farbe: C.warn,
        klick: liste("Unterschrieben, an den Versorger weiterleiten", je("Vertrag unterschrieben")) },
      { n: je("Vertrag zu erstellen").length, text: "Vertrag erstellen und versenden", farbe: C.warn,
        klick: liste("Vertrag zu erstellen", je("Vertrag zu erstellen")) },
      { n: offeneProbleme.filter((p) => p.art !== "Storno").length, text: "Problemfälle bearbeiten", farbe: C.warn, klick: ansicht("probleme") },
      { n: stornos.length, text: "Stornierungen bearbeiten", farbe: C.warn, klick: ansicht("stornos") },
    ];
    const reihe = vertraege.filter((a) => ["Vertrag zu erstellen", "Vertrag versendet", "Vertrag unterschrieben"].includes(schritt(a)))
      .sort((x, y) => VM_SCHRITTE.indexOf(schritt(y)) - VM_SCHRITTE.indexOf(schritt(x))
        || ((x.provisionErhalten || {}).datum || x.angelegt || "").localeCompare((y.provisionErhalten || {}).datum || y.angelegt || ""));
    arbeit = (
      <Karte titel="Noch nicht beim Versorger" rechts={<span className="text-xs" style={{ color: C.muted }}>{reihe.length} {reihe.length === 1 ? "Vertrag" : "Verträge"}</span>}>
        {reihe.length === 0 ? <Leer text="Alle abgeschlossenen Verträge sind beim Versorger." /> :
          reihe.slice(0, 12).map((a, i) => (
            <Reihe key={a.id} i={i} links={a.kunde.firma}
              unten={schritt(a) + " · " + a.partnerName + " · " + a.id}
              rechts={a.provisionErhalten ? "abgeschlossen " + datum(a.provisionErhalten.datum) : ""}
              klick={() => onOeffnen(a.id)} />
          ))}
      </Karte>
    );
  }

  if (rolle === "Finanzbuchhaltung") {
    hinweis = "Provisionen auszahlen, Fälligkeiten im Blick behalten, Stornierungen verrechnen.";
    const zeilen = auszahlungsZeilen(anfragen, mitarbeiter);
    const offen = zeilen.filter((z) => !z.bezahlt), faellig = offen.filter((z) => z.ueberfaellig);
    const jahr = String(new Date().getFullYear());
    const bezahltJahr = zeilen.filter((z) => z.bezahlt && String(z.datum || "").startsWith(jahr));
    const summe = (l) => l.reduce((t, z) => t + z.person.betrag, 0);
    const wartetVersorger = st("bestaetigt");
    const stornos = offeneProbleme.filter((p) => p.art === "Storno");
    kacheln = [
      { k: "Auszahlungen fällig", v: faellig.length, farbe: C.warn, klein: eur(summe(faellig)), klick: ansicht("abrechnung") },
      { k: "Offen, noch nicht fällig", v: offen.length - faellig.length, farbe: C.gas,
        klein: eur(summe(offen) - summe(faellig)), klick: ansicht("abrechnung") },
      { k: "Ausgezahlt " + jahr, v: bezahltJahr.length, farbe: C.ok, klein: eur(summe(bezahltJahr)), klick: ansicht("abrechnung") },
      { k: "Zahlung vom Versorger ausstehend", v: wartetVersorger.length, farbe: C.strom,
        klick: liste("Vom Versorger bestätigt, Provision noch nicht eingegangen", wartetVersorger) },
      { k: "Stornierungen offen", v: stornos.length, farbe: C.warn, klick: ansicht("stornos") },
    ];
    zuTun = [
      { n: faellig.length, text: "Fällige Auszahlungen überweisen", farbe: C.warn, klick: ansicht("abrechnung") },
      { n: stornos.length, text: "Stornierungen verrechnen", farbe: C.warn, klick: ansicht("stornos") },
    ];
    const reihe = [...faellig].sort((x, y) => (x.faellig || "").localeCompare(y.faellig || ""));
    arbeit = (
      <Karte titel="Fällige Auszahlungen"
        rechts={<button className="text-xs" style={{ color: C.strom }} onClick={ansicht("abrechnung")}>zur Abrechnung</button>}>
        {reihe.length === 0 ? <Leer text="Keine fälligen Auszahlungen." /> :
          reihe.slice(0, 12).map((z, i) => (
            <Reihe key={z.key} i={i} links={z.person.name + " · " + eur(z.person.betrag)}
              unten={z.anfrage.kunde.firma + " · Lieferjahr " + z.jahr + " · " + z.person.rolle
                + ((mitarbeiter.find((m) => m.id === z.person.id) || {}).angestellt ? " · über die Lohnabrechnung" : "")}
              rechts={"fällig " + datum(z.faellig)} klick={ansicht("abrechnung")} />
          ))}
      </Karte>
    );
  }

  if (rolle === "Leadmanagement") {
    hinweis = "Leads aufnehmen, an den Vertrieb verteilen und nachhalten.";
    const alle = leads || [];
    const sp = (x) => alle.filter((l) => leadSpalte(l) === x);
    const frei = alle.filter((l) => !l.zugewiesen && !["auftrag", "verloren"].includes(leadSpalte(l)));
    const wv = alle.filter((l) => leadSpalte(l) === "wiedervorlage");
    kacheln = [
      { k: "Neue Leads", v: sp("neu").length, farbe: C.ok, klick: ansicht("leads") },
      { k: "Noch keinem Partner zugewiesen", v: frei.length, farbe: C.warn, klick: ansicht("leads") },
      { k: "Im Erstgespräch", v: sp("erstgespraech").length, farbe: C.strom, klick: ansicht("leads") },
      { k: "Angebot und Verhandlung", v: sp("angebot").length + sp("verhandlung").length, farbe: C.gas, klick: ansicht("leads") },
      { k: "Wiedervorlage", v: wv.length, farbe: C.gas, klick: ansicht("leads") },
      { k: "Zum Auftrag geworden", v: sp("auftrag").length, farbe: C.ok, klick: ansicht("leads") },
    ];
    zuTun = [
      { n: frei.length, text: "Leads einem Vertriebspartner zuweisen", farbe: C.warn, klick: ansicht("leads") },
      { n: wv.length, text: "Wiedervorlagen nachhalten", farbe: C.gas, klick: ansicht("leads") },
      { n: sp("neu").length, text: "Neue Leads sichten", farbe: C.ok, klick: ansicht("leads") },
    ];
    arbeit = (
      <Karte titel="Noch zu verteilen" rechts={<span className="text-xs" style={{ color: C.muted }}>{frei.length} {frei.length === 1 ? "Lead" : "Leads"}</span>}>
        {frei.length === 0 ? <Leer text="Alle Leads sind verteilt." /> :
          frei.sort((x, y) => (x.angelegt || "").localeCompare(y.angelegt || "")).slice(0, 12).map((l, i) => (
            <Reihe key={l.id} i={i} links={l.firma || l.ansprechpartner || l.id}
              unten={(LEAD_STATUS[leadSpalte(l)] || {}).label + (l.ort ? " · " + l.ort : "")}
              rechts={seit(l.angelegt)} klick={ansicht("leads")} />
          ))}
      </Karte>
    );
  }

  const wocheEnde = (() => { const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().slice(0, 10); })();
  const meineTermine = (termine || []).filter((t) => t.fuerId === user.id && t.datum >= heute() && t.datum <= wocheEnde)
    .sort((a, b) => (a.datum + (a.zeit || "")).localeCompare(b.datum + (b.zeit || "")));

  return (
    <div className="space-y-5">
      <div>
        <div className="text-lg">Guten Tag, {String(user.name || "").replace(/^Team\s+/, "Team ")}</div>
        <div className="text-sm" style={{ color: C.muted }}>{hinweis}</div>
      </div>
      <ZuTunKarte eintraege={zuTun} />
      {kacheln.some((x) => x.v) && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {kacheln.filter((x) => x.v).map((x) => <Kachel key={x.k} {...x} />)}
        </div>
      )}
      {arbeit}
      <Aufgaben aufgaben={aufgaben} setAufgaben={setAufgaben} user={user}
        mitarbeiter={mitarbeiter} kompakt onOeffnen={onOeffnen} />
      <Karte titel="Termine"
        rechts={<button className="text-xs" style={{ color: C.strom }} onClick={ansicht("kalender")}>Kalender öffnen</button>}>
        {meineTermine.length === 0 ? <Leer text="Diese Woche steht nichts an." /> :
          meineTermine.map((t, i) => (
            <Reihe key={t.id} i={i} links={t.titel} unten={(t.zeit ? t.zeit + " Uhr · " : "") + (t.ort || "")}
              rechts={t.datum === heute() ? "heute" : datum(t.datum)} klick={ansicht("kalender")} />
          ))}
      </Karte>
    </div>
  );
}

export {
  ArbeitsUebersicht, Kalkulationen, Pipeline, Problemfaelle, Smartmeter, SmartmeterKalk, StrukturFreigabe, Tickets,
  UmlagenPflege,
};
