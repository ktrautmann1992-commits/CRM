/* Angebot an den Kunden: Versand mit persönlichem Link, Öffnen messen, Annahme mit Fingerunterschrift.
   Läuft mit Dienstschlüssel. Der Kunde braucht keinen Zugang: Sein Link enthält ein zufälliges
   Geheimnis (Zeile in `kundenlinks`, Migration 20261117_14). Er sieht nur Firma, Ansprechpartner,
   die Angebots-PDFs und die Felder, die der Vertriebspartner angehakt hat, nie Provision oder Aufschlag.

   Aktionen mit Anmeldung (Vertriebspartner, im Kopf „Authorization“):
   - senden     { anfrageId, an, satz, felder }  legt den Link an und schickt die Mail an den Kunden
   Aktionen ohne Anmeldung (Kunde, mit dem Geheimnis aus dem Link):
   - laden      { link }                        Angebot zeigen; zählt als „geöffnet“
   - ansehen    { link, variante }              frischer Link auf das PDF; zählt als „angesehen“
   - annehmen   { link, variante, name, funktion, iban, geburtsdatum, steuernummer, unterschrift }
                setzt Angaben und Unterschrift fest ins PDF, legt es am Vorgang ab und schickt
                dem Kunden eine Kopie und dem Vertriebspartner eine Nachricht.
   Der Vorgang selbst wird nicht verändert: Die Annahme bestätigt der Vertriebspartner im Portal
   (vorausgefüllt), damit seine Angaben wie Tippgeber erhalten bleiben.

   Geheimnisse: SMTP_PASSWORT (Postfach portal@egc-energie.de), optional SMTP_BENUTZER. */
import { createClient } from "npm:@supabase/supabase-js@2.118.0";
import nodemailer from "npm:nodemailer@6.9.16";
import { mailkopf } from "./mailkopf.ts";
import { stempeln, unterschriftPruefen, unterschriftsstellen } from "./stempel.js";

const PORTAL = "https://egc-vertriebsportal.netlify.app";
const GUELTIG_TAGE = 90;
const KOPF = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};
const antwort = (status: number, inhalt: unknown) => new Response(JSON.stringify(inhalt), { status, headers: KOPF });
const esc = (t: unknown) =>
  String(t ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
const mailOk = (m: unknown) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(m || "").trim());
const datumDe = (iso: string) => /^\d{4}-\d{2}-\d{2}/.test(iso || "") ? iso.slice(0, 10).split("-").reverse().join(".") : "";
const jetztDe = (d = new Date()) => {
  const f = new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
    .formatToParts(d).reduce((o: Record<string, string>, p) => ({ ...o, [p.type]: p.value }), {});
  return { datum: `${f.day}.${f.month}.${f.year}`, uhr: `${f.hour}:${f.minute}` };
};
const SPARTE: Record<string, string> = { strom: "Strom", gas: "Erdgas", beide: "Strom und Erdgas" };
const FELDER = ["iban", "funktion", "geburtsdatum", "steuernummer"];

/* IBAN-Prüfsumme (Modulo 97) */
function ibanOk(roh: string) {
  const i = roh.replace(/\s+/g, "").toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(i)) return false;
  if (i.startsWith("DE") && i.length !== 22) return false;
  const z = (i.slice(4) + i.slice(0, 4)).replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  let r = 0;
  for (const c of z) r = (r * 10 + +c) % 97;
  return r === 1;
}
const ibanSchoen = (i: string) => i.replace(/\s+/g, "").toUpperCase().replace(/(.{4})/g, "$1 ").trim();

/* Varianten wie varianten() in App.jsx; nur solche mit abgelegtem Angebots-PDF */
function varianten(a: any) {
  const k = a.kalkulation;
  if (!k) return [];
  const liste = k.varianten && k.varianten.length ? k.varianten
    : [{ id: "v1", sparte: "beide", produkt: a.produkt, lieferbeginn: k.lieferbeginn || "", gueltigBis: k.gueltigBis || "", angebot: k.angebot || null }];
  return liste.filter((v: any) => v && v.angebot && v.angebot.pfad);
}
const variantenTitel = (v: any) =>
  [v.produkt || "Angebot", SPARTE[v.sparte || "beide"], v.lieferbeginn ? "Lieferbeginn " + datumDe(v.lieferbeginn) : ""].filter(Boolean).join(" · ");
const abgelaufen = (v: any) => !!v.gueltigBis && new Date(v.gueltigBis + "T23:59:59+01:00").getTime() < Date.now();

/* ---------- E-Mail ---------- */
type Anhang = { filename: string; content: Uint8Array; contentType: string };
async function mailSenden(m: { an: string; von?: string; antwortAn?: string; kopie?: string; betreff: string; html: string; anhaenge?: Anhang[] }) {
  const benutzer = Deno.env.get("SMTP_BENUTZER") || "portal@egc-energie.de";
  const passwort = Deno.env.get("SMTP_PASSWORT");
  if (!passwort) throw new Error("SMTP_PASSWORT fehlt");
  const post = nodemailer.createTransport({ host: "smtp.strato.de", port: 465, secure: true, auth: { user: benutzer, pass: passwort } });
  const kopf = await mailkopf();
  await post.sendMail({
    from: `"${String(m.von || "EGC Energie").replace(/["\r\n]/g, "")}" <${benutzer}>`,
    to: m.an, ...(m.antwortAn ? { replyTo: m.antwortAn } : {}), ...(m.kopie ? { cc: m.kopie } : {}),
    subject: m.betreff, html: m.html.replace("<!--EGC-KOPF-->", kopf.html), attachments: [...kopf.anhaenge, ...(m.anhaenge || [])],
  });
}

/* Mail im EGC-Design; teile = fertige HTML-Absätze */
function mailHtml(titel: string, teile: string[], knopf: { text: string; url: string } | null, fuss: string) {
  const p = (t: string) => `<p style="font-size:15px;line-height:1.5;margin:0 0 12px">${t}</p>`;
  return `<!doctype html><html><body style="margin:0;background:#EFF1F4;font-family:Helvetica,Arial,sans-serif;color:#16202C">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EFF1F4;padding:20px 10px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:8px;overflow:hidden">
<!--EGC-KOPF-->
<tr><td style="padding:24px">
<h1 style="font-size:19px;margin:0 0 14px;color:#0A1626">${esc(titel)}</h1>
${teile.map((t) => (t.startsWith("<table") || t.startsWith("<div") ? t : p(t))).join("\n")}
${knopf ? `<p style="margin:18px 0 8px"><a href="${knopf.url}" style="display:inline-block;background:#6CB43B;color:#ffffff;text-decoration:none;padding:13px 20px;border-radius:6px;font-size:16px;font-weight:bold">${esc(knopf.text)}</a></p>
<p style="font-size:12px;color:#6B7787;margin:8px 0 0;word-break:break-all">Falls der Knopf nicht funktioniert: ${esc(knopf.url)}</p>` : ""}
</td></tr>
<tr><td style="padding:14px 24px;border-top:1px solid #D8DDE4;font-size:12px;line-height:1.5;color:#6B7787">${fuss}</td></tr>
</table></td></tr></table></body></html>`;
}

function visitenkarte(vp: any) {
  const d = vp?.daten || {};
  const tel = String(d.telefon || "").trim();
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #D8DDE4;margin-top:6px">
<tr><td style="padding-top:14px;font-size:14px;line-height:1.6"><strong style="font-size:15px;color:#0A1626">${esc(d.name || "")}</strong><br>
<span style="color:#6B7787">Energieberatung · EGC Energie</span><br>
${tel ? `<a href="tel:${esc(tel.replace(/[^\d+]/g, ""))}" style="color:#0A1626">${esc(tel)}</a><br>` : ""}
${d.email ? `<a href="mailto:${esc(d.email)}" style="color:#0A1626">${esc(d.email)}</a>` : ""}</td></tr></table>`;
}

async function firmenfuss(db: any) {
  const { data } = await db.from("einstellungen").select("wert").eq("schluessel", "firmendaten").maybeSingle();
  const w = data?.wert || {};
  const f = { vertreter: w.vertreter || "Karsten Trautmann", strasse: w.strasse || "In den Erlenwiesen 11", ort: w.ort || "66914 Waldmohr",
    telefon: w.telefon || "06373 8920114", web: w.website || "www.egc-energie.de", ustid: w.ustId || "DE365107489" };
  return ["EGC Energie" + (f.vertreter ? " · vertreten durch " + esc(f.vertreter) : ""),
    [f.strasse, f.ort, f.telefon ? "Tel. " + f.telefon : ""].filter(Boolean).map(esc).join(" · "),
    [f.web, f.ustid ? "USt-IdNr. " + f.ustid : ""].filter(Boolean).map(esc).join(" · ")].join("<br>");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: KOPF });
  if (req.method !== "POST") return antwort(405, { fehler: "Nur POST" });
  let e: Record<string, any>;
  try { e = await req.json(); } catch { return antwort(400, { fehler: "Ungültige Anfrage" }); }

  const URL_ = Deno.env.get("SUPABASE_URL")!;
  const db = createClient(URL_, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

  /* ================= Versand durch den Vertriebspartner ================= */
  if (e.aktion === "senden") {
    const jwt = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    const { data: ich } = await db.auth.getUser(jwt);
    if (!ich?.user) return antwort(401, { fehler: "Bitte neu anmelden." });
    const { data: vp } = await db.from("mitarbeiter").select("id, daten").eq("auth_id", ich.user.id).maybeSingle();
    if (!vp || vp.daten?.status !== "aktiv") return antwort(403, { fehler: "Kein aktiver Zugang." });
    /* Sichtbarkeit mit den Rechten des Absenders prüfen */
    const alsIch = createClient(URL_, Deno.env.get("SUPABASE_ANON_KEY")!, {
      auth: { persistSession: false }, global: { headers: { Authorization: "Bearer " + jwt } } });
    const { data: zeile } = await alsIch.from("anfragen").select("id, daten").eq("id", String(e.anfrageId || "")).maybeSingle();
    if (!zeile) return antwort(404, { fehler: "Vorgang nicht gefunden." });
    const a = zeile.daten || {};
    if (a.status !== "angebot") return antwort(400, { fehler: "Senden geht nur, solange das Angebot beim Vertrieb liegt." });
    const vs = varianten(a);
    if (!vs.length) return antwort(400, { fehler: "Zu diesem Vorgang liegt noch kein Angebots-PDF vor." });
    const an = String(e.an || "").trim();
    if (!mailOk(an)) return antwort(400, { fehler: "Bitte eine gültige E-Mail-Adresse des Kunden angeben." });
    const felder: Record<string, boolean> = {};
    FELDER.forEach((f) => { felder[f] = !!(e.felder && e.felder[f]); });
    const satz = String(e.satz || "").trim().slice(0, 600);

    const link = Array.from(crypto.getRandomValues(new Uint8Array(24)), (b) => b.toString(16).padStart(2, "0")).join("");
    const jetzt = new Date().toISOString();
    const { error } = await db.from("kundenlinks").insert({ id: link, anfrage_id: zeile.id,
      daten: { partnerId: vp.id, von: vp.daten?.name || "", an, satz, felder, gesendet: jetzt, geoeffnet: [], angesehen: [] } });
    if (error) return antwort(500, { fehler: "Link konnte nicht angelegt werden: " + error.message });

    const k = a.kunde || {};
    const url = `${PORTAL}/?angebot=${link}`;
    const gueltig = vs.map((v: any) => v.gueltigBis).filter(Boolean).sort()[0];
    const teile = [
      k.ansprechpartner ? `Guten Tag ${esc(k.ansprechpartner)},` : "Sehr geehrte Damen und Herren,",
      ...(satz ? [esc(satz).replace(/\n/g, "<br>")] : []),
      `anbei erhalten Sie ${vs.length > 1 ? "Ihre Angebote" : "Ihr Angebot"} für <strong>${esc(k.firma || "Ihr Unternehmen")}</strong>. ` +
        "Über den Knopf unten sehen Sie es sich in Ruhe an und können es direkt am Handy oder Rechner annehmen.",
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EEF6E8;border-radius:6px;margin:4px 0 16px"><tr><td style="padding:12px 14px;font-size:14px;line-height:1.6">` +
        vs.map((v: any) => esc(variantenTitel(v))).join("<br>") + (gueltig ? `<br><strong>Gültig bis:</strong> ${esc(datumDe(gueltig))}` : "") + `</td></tr></table>`,
      "Zum Annehmen geben Sie Ihren Namen an und unterschreiben einmal mit dem Finger oder der Maus. " +
        "Die Unterschrift wird an allen nötigen Stellen eingesetzt; eine Kopie erhalten Sie per E-Mail.",
      "Bei Fragen bin ich gern für Sie da.<br><br>Mit freundlichen Grüßen",
      visitenkarte(vp),
    ];
    try {
      await mailSenden({ an, von: `${vp.daten?.name || "EGC Energie"} · EGC Energie`,
        antwortAn: mailOk(vp.daten?.email) ? vp.daten.email : undefined, kopie: mailOk(vp.daten?.email) ? vp.daten.email : undefined,
        betreff: `Ihr Angebot – ${k.firma || "EGC Energie"}`,
        html: mailHtml(vs.length > 1 ? "Ihre persönlichen Angebote" : "Ihr persönliches Angebot", teile,
          { text: "Angebot ansehen und annehmen", url }, await firmenfuss(db)) });
    } catch (err) {
      await db.from("kundenlinks").delete().eq("id", link);
      return antwort(502, { fehler: "Die E-Mail konnte nicht gesendet werden: " + String((err as Error)?.message || err).slice(0, 160) });
    }
    return antwort(200, { ok: true, link: { id: link, anfrage_id: zeile.id } });
  }

  /* ================= Aktionen des Kunden ================= */
  const linkId = String(e.link || "");
  if (!/^[0-9a-f]{48}$/.test(linkId)) return antwort(404, { fehler: "Dieser Link ist ungültig." });
  const { data: lz } = await db.from("kundenlinks").select("id, anfrage_id, daten, erstellt").eq("id", linkId).maybeSingle();
  if (!lz || lz.daten?.gesperrt) return antwort(404, { fehler: "Dieser Link ist ungültig." });
  const { data: az } = await db.from("anfragen").select("id, daten").eq("id", lz.anfrage_id).maybeSingle();
  if (!az) return antwort(404, { fehler: "Dieser Link ist ungültig." });
  const a = az.daten || {}, k = a.kunde || {}, L = lz.daten || {};
  const { data: vp } = await db.from("mitarbeiter").select("id, daten").eq("id", L.partnerId || a.partnerId).maybeSingle();
  const berater = { name: vp?.daten?.name || "", telefon: vp?.daten?.telefon || "", email: vp?.daten?.email || "" };
  /* angenommen über diesen oder einen anderen Link desselben Vorgangs? */
  const { data: alleLinks } = await db.from("kundenlinks").select("id, daten").eq("anfrage_id", az.id);
  const angenommen = (alleLinks || []).map((x: any) => x.daten?.angenommen).find(Boolean) || null;
  const vs = varianten(a);
  const zuAlt = Date.now() - new Date(lz.erstellt).getTime() > GUELTIG_TAGE * 86400000;
  const offen = !angenommen && a.status === "angebot" && !zuAlt;

  const pdfLink = async (pfad: string) => (await db.storage.from("dateien").createSignedUrl(pfad, 3600)).data?.signedUrl || "";
  const merken = async (feld: string, eintrag: unknown) => {
    const { data: frisch } = await db.from("kundenlinks").select("daten").eq("id", linkId).maybeSingle();
    const d = frisch?.daten || {};
    await db.from("kundenlinks").update({ daten: { ...d, [feld]: [...(d[feld] || []), eintrag].slice(-50) } }).eq("id", linkId);
  };

  if (e.aktion === "laden") {
    const erstesMal = !(L.geoeffnet || []).length;
    await merken("geoeffnet", new Date().toISOString());
    /* beim ersten Öffnen: kurzer Hinweis an den Vertriebspartner, jetzt nachzufassen */
    if (erstesMal && offen && mailOk(berater.email)) {
      const z = jetztDe();
      try {
        await mailSenden({ an: berater.email, betreff: `Angebot geöffnet: ${k.firma || az.id}`,
          html: mailHtml("Dein Kunde hat das Angebot geöffnet", [
            `<strong>${esc(k.firma || "Der Kunde")}</strong> hat das Angebot am ${z.datum} um ${z.uhr} Uhr geöffnet.`,
            "Ein guter Zeitpunkt für einen kurzen Anruf." + (k.telefon ? ` Telefon: <a href="tel:${esc(String(k.telefon).replace(/[^\d+]/g, ""))}">${esc(k.telefon)}</a>` : "")],
            { text: "Im Vertriebsportal öffnen", url: PORTAL }, "Automatische Nachricht aus dem Vertriebsportal von EGC Energie.") });
      } catch (_) { /* Hinweis ist nicht wichtig genug, um das Öffnen zu stören */ }
    }
    let unterschrieben = "";
    if (angenommen?.datei?.pfad) unterschrieben = await pdfLink(angenommen.datei.pfad);
    /* Unterschriftsstellen je Angebot einmal ermitteln und am Link merken */
    let stellen: Record<string, string[]> = L.stellen || {};
    if (offen && vs.some((v: any) => !stellen[v.id])) {
      stellen = { ...stellen };
      for (const v of vs) {
        if (stellen[v.id]) continue;
        const { data: b } = await db.storage.from("dateien").download(v.angebot.pfad);
        stellen[v.id] = b ? unterschriftsstellen(new Uint8Array(await b.arrayBuffer())) : [];
      }
      const { data: frisch } = await db.from("kundenlinks").select("daten").eq("id", linkId).maybeSingle();
      await db.from("kundenlinks").update({ daten: { ...(frisch?.daten || {}), stellen } }).eq("id", linkId);
    }
    return antwort(200, {
      firma: k.firma || "", ansprechpartner: k.ansprechpartner || "", berater,
      felder: L.felder || { iban: true }, offen, zuAlt, status: a.status,
      angenommen: angenommen ? { zeit: angenommen.zeit, name: angenommen.name, variante: angenommen.variante, unterschrieben } : null,
      varianten: await Promise.all(vs.map(async (v: any) => ({
        id: v.id, titel: variantenTitel(v), produkt: v.produkt || "", sparte: SPARTE[v.sparte || "beide"],
        lieferbeginn: datumDe(v.lieferbeginn), gueltigBis: datumDe(v.gueltigBis), abgelaufen: abgelaufen(v),
        dateiname: v.angebot.name || "Angebot.pdf", stellen: stellen[v.id] || [],
      }))),
    });
  }

  if (e.aktion === "ansehen") {
    const v = vs.find((x: any) => x.id === e.variante);
    if (!v) return antwort(404, { fehler: "Angebot nicht gefunden." });
    await merken("angesehen", { variante: v.id, zeit: new Date().toISOString() });
    return antwort(200, { url: await pdfLink(v.angebot.pfad) });
  }

  if (e.aktion === "annehmen") {
    if (angenommen) return antwort(409, { fehler: "Dieses Angebot wurde bereits angenommen." });
    if (!offen) return antwort(409, { fehler: "Dieses Angebot kann nicht mehr online angenommen werden. Bitte wenden Sie sich an " + (berater.name || "Ihren Ansprechpartner") + "." });
    const v = vs.find((x: any) => x.id === e.variante);
    if (!v) return antwort(400, { fehler: "Bitte wählen Sie ein Angebot." });
    if (abgelaufen(v)) return antwort(409, { fehler: "Dieses Angebot war nur bis " + datumDe(v.gueltigBis) + " gültig. Bitte wenden Sie sich an " + (berater.name || "Ihren Ansprechpartner") + "." });
    const F = L.felder || {};
    const name = String(e.name || "").replace(/\s+/g, " ").trim().slice(0, 80);
    const funktion = F.funktion ? String(e.funktion || "").trim().slice(0, 60) : "";
    const iban = F.iban ? String(e.iban || "").trim() : "";
    const geburtsdatum = F.geburtsdatum ? String(e.geburtsdatum || "").trim().slice(0, 20) : "";
    const steuernummer = F.steuernummer ? String(e.steuernummer || "").trim().slice(0, 30) : "";
    const fehlt = [];
    if (name.split(" ").length < 2) fehlt.push("Vor- und Nachname");
    if (F.funktion && !funktion) fehlt.push("Funktion im Unternehmen");
    if (F.iban && !ibanOk(iban)) fehlt.push("gültige IBAN");
    if (F.geburtsdatum && !/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(geburtsdatum)) fehlt.push("Geburtsdatum (TT.MM.JJJJ)");
    if (F.steuernummer && steuernummer.length < 6) fehlt.push("Steuernummer oder USt-IdNr.");
    if (!unterschriftPruefen(e.unterschrift)) fehlt.push("Unterschrift");
    if (!e.zustimmung) fehlt.push("Bestätigung");
    if (fehlt.length) return antwort(400, { fehler: "Bitte noch ergänzen: " + fehlt.join(", ") + "." });

    const { data: blob, error: le } = await db.storage.from("dateien").download(v.angebot.pfad);
    if (le || !blob) return antwort(500, { fehler: "Das Angebot konnte nicht geladen werden." });
    const z = jetztDe();
    const unterzeichner = name + (funktion ? " (" + funktion + ")" : "");
    const ortDatum = (k.ort ? k.ort + ", " : "") + z.datum;
    const texte: Record<string, string> = { IBAN: iban ? ibanSchoen(iban) : "", "Kunde Geburtsdatum": geburtsdatum, "Kunde Steuernummer": steuernummer };
    ["Angebot", "Smartmeter", "Vollmacht", "Datenschutz"].forEach((s) => { texte[s + " Name"] = unterzeichner; texte[s + " Ort Datum"] = ortDatum; });
    const STELLE: Record<string, string> = { "Unterschrift Angebot": "Angebot", "Unterschrift Smartmeter": "Smartmeter-Angebot",
      "Unterschrift Vollmacht": "Service- & Beratungsauftrag", "Unterschrift Datenschutz": "Einwilligung Datenschutz" };
    let ergebnis;
    try {
      const vorab = stempeln(new Uint8Array(await blob.arrayBuffer()), {});
      ergebnis = stempeln(new Uint8Array(await blob.arrayBuffer()), {
        texte, unterschrift: e.unterschrift,
        hinweis: `Elektronisch unterschrieben am ${z.datum} um ${z.uhr} Uhr`,
        bestaetigung: { titel: "Bestätigung der elektronischen Annahme", zeilen: [
          ["Kunde", k.firma || ""], ["Angebot", variantenTitel(v)], ["Angenommen von", unterzeichner],
          ...(iban ? [["IBAN", ibanSchoen(iban)]] : []), ...(geburtsdatum ? [["Geburtsdatum", geburtsdatum]] : []),
          ...(steuernummer ? [["Steuer-Nr. / USt-IdNr.", steuernummer]] : []),
          ["Zeitpunkt", `${z.datum}, ${z.uhr} Uhr`], ["Link gesendet an", L.an || ""],
          ["Unterschrieben an", vorab.stellen.map((s: string) => STELLE[s] || s).join(", ") || "dieser Seite"]],
          fuss: "Angenommen über den persönlichen Link aus der E-Mail an " + (L.an || "") + " (einfache elektronische Signatur).\n" +
            "Erzeugt vom Vertriebsportal der EGC Energie. Kennung des Links: " + linkId.slice(0, 8) } });
    } catch (err) {
      return antwort(500, { fehler: "Das unterschriebene Angebot konnte nicht erzeugt werden: " + String((err as Error)?.message || err).slice(0, 160) });
    }
    const dateiname = "Angebot_unterschrieben_" + String(k.firma || az.id).replace(/[^\wäöüÄÖÜß]+/g, "_") + ".pdf";
    const pfad = "anfragen/" + az.id + "/" + crypto.randomUUID().slice(0, 8) + "-" + dateiname.replace(/[^\w.-]+/g, "_");
    const { error: ue } = await db.storage.from("dateien").upload(pfad, ergebnis.bytes, { contentType: "application/pdf" });
    if (ue) return antwort(500, { fehler: "Das unterschriebene Angebot konnte nicht gespeichert werden." });

    const eintrag = { zeit: new Date().toISOString(), variante: v.id, name, funktion, iban: iban ? ibanSchoen(iban) : "",
      geburtsdatum, steuernummer, stellen: ergebnis.stellen,
      datei: { name: dateiname, typ: "application/pdf", groesse: ergebnis.bytes.length, pfad },
      geraet: String(req.headers.get("user-agent") || "").slice(0, 200),
      adresse: String(req.headers.get("x-forwarded-for") || "").split(",")[0].trim().slice(0, 60) };
    const { data: frisch } = await db.from("kundenlinks").select("daten").eq("id", linkId).maybeSingle();
    await db.from("kundenlinks").update({ daten: { ...(frisch?.daten || {}), angenommen: eintrag } }).eq("id", linkId);

    /* Kopie an den Kunden, Nachricht an den Vertriebspartner (ohne Bankdaten) */
    const fuss = await firmenfuss(db);
    try {
      await mailSenden({ an: L.an, von: `${berater.name || "EGC Energie"} · EGC Energie`, antwortAn: mailOk(berater.email) ? berater.email : undefined,
        betreff: `Ihre Annahme – ${k.firma || "EGC Energie"}`,
        html: mailHtml("Vielen Dank für Ihr Vertrauen", [
          `Guten Tag ${esc(name)},`,
          `Sie haben das Angebot <strong>${esc(variantenTitel(v))}</strong> am ${z.datum} um ${z.uhr} Uhr angenommen. Im Anhang finden Sie die unterschriebenen Unterlagen für Ihre Ablage.`,
          "Wir reichen den Auftrag jetzt beim Versorger ein und melden uns, sobald er bestätigt ist. Den Wechsel und die Kündigung beim bisherigen Versorger übernehmen wir für Sie.",
          "Mit freundlichen Grüßen", visitenkarte(vp)], null, fuss),
        anhaenge: [{ filename: dateiname, content: ergebnis.bytes, contentType: "application/pdf" }] });
    } catch (_) { /* die Annahme ist gespeichert; die Kopie kann der Vertriebspartner nachreichen */ }
    if (mailOk(berater.email)) {
      try {
        await mailSenden({ an: berater.email, betreff: `Unterschrieben: ${k.firma || az.id}`,
          html: mailHtml("Dein Kunde hat unterschrieben", [
            `<strong>${esc(k.firma || "Der Kunde")}</strong> hat das Angebot <strong>${esc(variantenTitel(v))}</strong> am ${z.datum} um ${z.uhr} Uhr angenommen.`,
            `Unterschrieben von ${esc(unterzeichner)}.`,
            "Bitte im Portal den Auftrag bestätigen: Die Annahme ist mit den unterschriebenen Unterlagen schon vorausgefüllt."],
            { text: "Im Vertriebsportal öffnen", url: PORTAL }, "Automatische Nachricht aus dem Vertriebsportal von EGC Energie.") });
      } catch (_) { /* wie oben */ }
    }
    return antwort(200, { ok: true, unterschrieben: await pdfLink(pfad), zeit: eintrag.zeit });
  }

  return antwort(400, { fehler: "Unbekannte Aktion" });
});
