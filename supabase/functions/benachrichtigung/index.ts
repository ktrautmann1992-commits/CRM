/* E-Mail-Benachrichtigungen aus dem Vertriebsportal.
   Die Datenbank ruft diese Funktion auf, wenn sich an einem Vorgang etwas
   Wichtiges ändert (siehe Migration 20261030_02_benachrichtigungen.sql).
   Versand über das Strato-Postfach portal@egc-energie.de (SMTP, Port 465)
   an die im CRM hinterlegte E-Mail-Adresse.

   Aufrufe prüft die Funktion gegen das Geheimnis im Tresor der Datenbank
   (public.benachrichtigung_geheimnis_ok).

   Geheimnisse der Funktion:
   - SMTP_PASSWORT               Passwort des Postfachs portal@egc-energie.de
   - SMTP_BENUTZER               optional, Vorgabe portal@egc-energie.de */
import { createClient } from "npm:@supabase/supabase-js@2.118.0";
import nodemailer from "npm:nodemailer@6.9.16";

const PORTAL = "https://portal.egc-energie.de";
const VERTRIEB = ["Vertriebspartner", "Teamleiter", "Leitung Vertrieb"];

type Mitarbeiter = { id: string; daten: Record<string, any> };
type Ereignis = { art: string; schluessel?: string };

const antwort = (status: number, inhalt: unknown) =>
  new Response(JSON.stringify(inhalt), { status, headers: { "Content-Type": "application/json" } });

const esc = (t: unknown) =>
  String(t ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

const eur = (x: number) =>
  x.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";

/* Schlichte Mail im EGC-Design: Navy-Kopf, grüne Linie, Knopf zum Portal */
function html(titel: string, absaetze: string[], vorgangId: string) {
  return `<!doctype html><html><body style="margin:0;background:#EFF1F4;font-family:Helvetica,Arial,sans-serif;color:#16202C">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EFF1F4;padding:24px 12px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:8px;overflow:hidden">
<tr><td style="background:#0A1626;padding:18px 24px;color:#ffffff;font-size:18px;font-weight:bold">EGC<span style="color:#6CB43B">-</span>Energie</td></tr>
<tr><td style="height:4px;background:#6CB43B"></td></tr>
<tr><td style="padding:24px">
<h1 style="font-size:19px;margin:0 0 14px;color:#0A1626">${esc(titel)}</h1>
${absaetze.map((p) => `<p style="font-size:15px;line-height:1.5;margin:0 0 12px">${p}</p>`).join("\n")}
<p style="margin:20px 0 8px"><a href="${PORTAL}" style="display:inline-block;background:#0A1626;color:#ffffff;text-decoration:none;padding:11px 18px;border-radius:6px;font-size:15px">Im Vertriebsportal öffnen</a></p>
<p style="font-size:13px;color:#6B7787;margin:12px 0 0">Vorgang ${esc(vorgangId)}</p>
</td></tr>
<tr><td style="padding:14px 24px;border-top:1px solid #D8DDE4;font-size:12px;color:#6B7787">
Automatische Nachricht aus dem Vertriebsportal von EGC-Energie.
</td></tr>
</table></td></tr></table></body></html>`;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return antwort(405, { fehler: "Nur POST" });

  let eingabe: { id?: string; ereignisse?: Ereignis[] };
  try { eingabe = await req.json(); } catch { return antwort(400, { fehler: "Ungültige Anfrage" }); }
  const id = String(eingabe.id || "");
  const ereignisse = Array.isArray(eingabe.ereignisse) ? eingabe.ereignisse : [];
  if (!id || !ereignisse.length) return antwort(200, { ok: true, gesendet: 0 });

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
  const { data: ok } = await db.rpc("benachrichtigung_geheimnis_ok", { p: req.headers.get("x-geheimnis") || "" });
  if (ok !== true) return antwort(401, { fehler: "Nicht berechtigt" });
  const { data: vorgang } = await db.from("anfragen").select("id, daten").eq("id", id).maybeSingle();
  if (!vorgang) return antwort(404, { fehler: "Vorgang nicht gefunden" });
  const a = vorgang.daten || {};
  const { data: alle } = await db.from("mitarbeiter").select("id, daten");
  const ma = (alle || []) as Mitarbeiter[];
  const person = (mid: string) => ma.find((m) => m.id === mid);
  const aktivMitMail = (m?: Mitarbeiter) =>
    !!m && m.daten?.status === "aktiv" && /\S+@\S+\.\S+/.test(String(m.daten?.email || ""));

  const kunde = esc(a.kunde?.firma || "Kunde");
  const partnerIds: string[] = (Array.isArray(a.beteiligte) && a.beteiligte.length
    ? a.beteiligte.map((b: any) => b && b.id) : [a.partnerId]).filter(Boolean);
  const partner = partnerIds.map(person).filter((m) => aktivMitMail(m) && VERTRIEB.includes(m!.daten.rolle)) as Mitarbeiter[];
  const kalkulation = ma.filter((m) => aktivMitMail(m) && m.daten.rolle === "Kalkulation");
  const partnerName = esc(person(a.partnerId)?.daten?.name || "Ein Vertriebspartner");

  const mails: { an: string[]; betreff: string; titel: string; text: string[] }[] = [];
  for (const e of ereignisse) {
    if (e.art === "eingereicht" && kalkulation.length)
      mails.push({ an: kalkulation.map((m) => m.daten.email), betreff: "Neue Kalkulationsanfrage: " + (a.kunde?.firma || id),
        titel: "Neue Kalkulationsanfrage",
        text: [`${partnerName} bittet um ein Angebot für <strong>${kunde}</strong>.`,
               "Die Anfrage liegt im Eingang der Kalkulation."] });
    if (e.art === "angebot" && partner.length)
      mails.push({ an: partner.map((m) => m.daten.email), betreff: "Angebot liegt vor: " + (a.kunde?.firma || id),
        titel: "Dein Angebot liegt vor",
        text: [`Die Kalkulation hat das Angebot für <strong>${kunde}</strong> bereitgestellt.`,
               "Du findest es als PDF am Vorgang im Vertriebsportal."] });
    if (e.art === "klaerfall" && partner.length)
      mails.push({ an: partner.map((m) => m.daten.email), betreff: "Unterlagen benötigt: " + (a.kunde?.firma || id),
        titel: "Es fehlen Unterlagen oder Daten",
        text: [`Für <strong>${kunde}</strong> braucht die Kalkulation noch Angaben, bevor sie weiterrechnen kann.`,
               ...(a.fehlendText ? [`Hinweis der Kalkulation: <em>${esc(a.fehlendText)}</em>`] : []),
               "Bitte ergänze die Unterlagen am Vorgang im Vertriebsportal."] });
    if (e.art === "bestaetigt" && partner.length)
      mails.push({ an: partner.map((m) => m.daten.email), betreff: "Abschluss bestätigt: " + (a.kunde?.firma || id),
        titel: "Glückwunsch zum Abschluss",
        text: [`Der Versorger hat den Vertrag für <strong>${kunde}</strong> bestätigt.`,
               "Die Provision ist damit vorgemerkt. Sobald sie fällig ist, wird sie ausgezahlt."] });
    if (e.art === "test" && e.schluessel) {
      const empf = person(e.schluessel);
      if (aktivMitMail(empf))
        mails.push({ an: [empf!.daten.email], betreff: "Testmail aus dem Vertriebsportal",
          titel: "Die E-Mail-Benachrichtigungen funktionieren",
          text: ["Diese Testmail kommt aus dem Vertriebsportal von EGC-Energie.",
                 "Ab jetzt erhalten Kalkulation und Vertriebspartner automatisch eine Nachricht bei neuen Anfragen, " +
                 "Angeboten, fehlenden Unterlagen, Abschlüssen und ausgezahlten Provisionen."] });
    }
    if (e.art === "ausgezahlt" && e.schluessel) {
      const [mid, jahr] = e.schluessel.split(":");
      const empf = person(mid);
      const eintrag = (a.ausgezahlt || {})[e.schluessel] || {};
      if (aktivMitMail(empf) && VERTRIEB.includes(empf!.daten.rolle))
        mails.push({ an: [empf!.daten.email], betreff: "Provision ausgezahlt: " + (a.kunde?.firma || id),
          titel: "Deine Provision wurde ausgezahlt",
          text: [`Für <strong>${kunde}</strong>${jahr ? ", Lieferjahr " + esc(jahr) : ""} wurde deine Provision ausgezahlt` +
                 (typeof eintrag.betrag === "number" ? `: <strong>${eur(eintrag.betrag)}</strong>.` : "."),
                 "Die Abrechnung findest du unter „Meine Provisionen“ im Vertriebsportal."] });
    }
  }

  const benutzer = Deno.env.get("SMTP_BENUTZER") || "portal@egc-energie.de";
  const passwort = Deno.env.get("SMTP_PASSWORT");
  if (!passwort) return antwort(500, { fehler: "SMTP_PASSWORT fehlt" });
  const post = nodemailer.createTransport({
    host: "smtp.strato.de", port: 465, secure: true, auth: { user: benutzer, pass: passwort },
  });

  let gesendet = 0;
  const fehler: string[] = [];
  for (const m of mails) {
    /* jede Person bekommt eine eigene Mail, damit niemand die Adressen der anderen sieht */
    for (const an of [...new Set(m.an)]) {
      try {
        await post.sendMail({ from: `"EGC-Energie Vertriebsportal" <${benutzer}>`, to: an,
          subject: m.betreff, html: html(m.titel, m.text, id) });
        gesendet++;
      } catch (e) { fehler.push(String((e as Error)?.message || e).slice(0, 200)); }
    }
  }
  return antwort(fehler.length ? 207 : 200, { ok: !fehler.length, gesendet, fehler });
});
