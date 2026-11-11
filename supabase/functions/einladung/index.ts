/* Zugänge zum Vertriebsportal. Läuft mit Dienstschlüssel, weil nur der Server Zugänge anlegen darf.

   Aktionen ohne Anmeldung:
   - pruefen     Einladungs- oder Rücksetzcode prüfen, liefert Name, E-Mail, Rolle und Art
   - einloesen   Code einlösen: Zugang anlegen oder Passwort neu setzen
   - vergessen   „Passwort vergessen“: schickt einen Link zum Neusetzen an die hinterlegte E-Mail.
                 Antwortet immer gleich, damit niemand herausfinden kann, welche Adressen es gibt.

   Aktionen nur für die Geschäftsführung (Portalsteuerung, Anmeldung im Kopf „Authorization“):
   - zugang_setzen   Zugang eines Mitarbeiters anlegen oder dessen Passwort setzen.
                     Gibt es den Mitarbeiter-Datensatz noch nicht, wird er aus `daten` angelegt.

   Geheimnisse: SMTP_PASSWORT (Postfach portal@egc-energie.de), optional SMTP_BENUTZER. */
import { createClient } from "npm:@supabase/supabase-js@2.118.0";
import nodemailer from "npm:nodemailer@6.9.16";

const PORTAL = "https://egc-vertriebsportal.netlify.app";
const ROLLEN = ["Vertriebspartner", "Teamleiter", "Leitung Vertrieb", "Kalkulation", "Vertragsmanagement",
  "Leadmanagement", "Finanzbuchhaltung", "Beschaffung", "Geschäftsführung"];

const KOPF = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

const antwort = (status: number, inhalt: unknown) =>
  new Response(JSON.stringify(inhalt), { status, headers: KOPF });

const passwortOk = (pw: string) => pw.length >= 8 && /[^A-Za-z0-9]/.test(pw);
const esc = (t: unknown) =>
  String(t ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

/* Code ohne verwechselbare Zeichen */
const neuerCode = () => {
  const z = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const b = crypto.getRandomValues(new Uint8Array(20));
  return Array.from(b, (x) => z[x % z.length]).join("");
};

/* Rücksetzlinks gelten 2 Stunden, Einladungen 30 Tage */
const GUELTIG_RESET = 2 * 3600000, GUELTIG_EINLADUNG = 30 * 86400000;

async function mailSenden(an: string, betreff: string, titel: string, absaetze: string[], knopf: { text: string; url: string }) {
  const benutzer = Deno.env.get("SMTP_BENUTZER") || "portal@egc-energie.de";
  const passwort = Deno.env.get("SMTP_PASSWORT");
  if (!passwort) throw new Error("SMTP_PASSWORT fehlt");
  const post = nodemailer.createTransport({ host: "smtp.strato.de", port: 465, secure: true, auth: { user: benutzer, pass: passwort } });
  const html = `<!doctype html><html><body style="margin:0;background:#EFF1F4;font-family:Helvetica,Arial,sans-serif;color:#16202C">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EFF1F4;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:8px;overflow:hidden">
<tr><td style="background:#0A1626;padding:18px 24px;color:#ffffff;font-size:18px;font-weight:bold">EGC <span style="color:#6CB43B">Energie</span></td></tr>
<tr><td style="height:4px;background:#6CB43B"></td></tr>
<tr><td style="padding:24px">
<h1 style="font-size:19px;margin:0 0 14px;color:#0A1626">${esc(titel)}</h1>
${absaetze.map((p) => `<p style="font-size:15px;line-height:1.5;margin:0 0 12px">${p}</p>`).join("\n")}
<p style="margin:20px 0 8px"><a href="${knopf.url}" style="display:inline-block;background:#0A1626;color:#ffffff;text-decoration:none;padding:11px 18px;border-radius:6px;font-size:15px">${esc(knopf.text)}</a></p>
<p style="font-size:12px;color:#6B7787;margin:12px 0 0;word-break:break-all">Falls der Knopf nicht funktioniert: ${esc(knopf.url)}</p>
</td></tr>
<tr><td style="padding:14px 24px;border-top:1px solid #D8DDE4;font-size:12px;color:#6B7787">Automatische Nachricht aus dem Vertriebsportal von EGC Energie.</td></tr>
</table></td></tr></table></body></html>`;
  await post.sendMail({ from: `"EGC Energie Vertriebsportal" <${benutzer}>`, to: an, subject: betreff, html });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: KOPF });
  if (req.method !== "POST") return antwort(405, { fehler: "Nur POST" });

  let eingabe: Record<string, any>;
  try { eingabe = await req.json(); } catch { return antwort(400, { fehler: "Ungültige Anfrage" }); }

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  /* ---------- Passwort vergessen ---------- */
  if (eingabe.aktion === "vergessen") {
    const gleich = antwort(200, { ok: true });
    const email = String(eingabe.email || "").trim().toLowerCase();
    if (!/\S+@\S+\.\S+/.test(email)) return gleich;
    const { data: liste } = await db.from("mitarbeiter").select("id, auth_id, daten");
    const ma = (liste || []).find((m: any) => String(m.daten?.email || "").trim().toLowerCase() === email);
    if (!ma || ["abgelehnt", "gesperrt"].includes(ma.daten?.status)) return gleich;
    /* höchstens ein Link alle zwei Minuten */
    const { data: alt } = await db.from("einladungen").select("daten, erstellt").eq("id", ma.id).maybeSingle();
    if (alt && alt.daten?.art === "reset" && Date.now() - new Date(alt.erstellt).getTime() < 120000) return gleich;
    const code = neuerCode();
    const zeile = { id: ma.id, daten: { einladung: code, art: ma.auth_id ? "reset" : "einladung" }, erstellt: new Date().toISOString() };
    const { error } = alt ? await db.from("einladungen").update(zeile).eq("id", ma.id) : await db.from("einladungen").insert(zeile);
    if (error) return gleich;
    try {
      await mailSenden(email, "Neues Passwort für das Vertriebsportal", "Passwort neu vergeben",
        [`Hallo ${esc(ma.daten?.name || "")},`,
         "für deinen Zugang zum Vertriebsportal wurde ein neues Passwort angefordert. Über den Knopf vergibst du es selbst.",
         "Der Link gilt zwei Stunden. Hast du das nicht angefordert, kannst du diese Mail einfach ignorieren, dein bisheriges Passwort bleibt gültig."],
        { text: "Neues Passwort vergeben", url: `${PORTAL}/?code=${code}` });
    } catch (_) { /* Antwort bleibt gleich */ }
    return gleich;
  }

  /* ---------- Portalsteuerung der Geschäftsführung ---------- */
  if (eingabe.aktion === "zugang_setzen") {
    const jwt = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    const { data: ich } = await db.auth.getUser(jwt);
    if (!ich?.user) return antwort(401, { fehler: "Bitte neu anmelden." });
    const { data: gf } = await db.from("mitarbeiter").select("id, daten").eq("auth_id", ich.user.id).maybeSingle();
    if (!gf || gf.daten?.rolle !== "Geschäftsführung" || gf.daten?.status !== "aktiv")
      return antwort(403, { fehler: "Das darf nur die Geschäftsführung." });

    const id = String(eingabe.id || "");
    const pw = String(eingabe.passwort || "");
    if (!id) return antwort(400, { fehler: "Kein Mitarbeiter angegeben." });
    if (!passwortOk(pw)) return antwort(400, { fehler: "Das Passwort braucht mindestens 8 Zeichen und ein Sonderzeichen." });

    let { data: ma } = await db.from("mitarbeiter").select("id, auth_id, daten").eq("id", id).maybeSingle();
    if (!ma) {
      /* neu aus der Portalsteuerung: Datensatz anlegen, falls die App ihn noch nicht gespeichert hat */
      const d = eingabe.daten || {};
      if (!d.name || !/\S+@\S+\.\S+/.test(String(d.email || "")) || !ROLLEN.includes(d.rolle))
        return antwort(400, { fehler: "Name, E-Mail und Rolle sind nötig." });
      const daten = { ...d, email: String(d.email).trim().toLowerCase() };
      delete daten.satz; delete daten.passwort; delete daten.einladung; delete daten.stammdaten;
      const { error } = await db.from("mitarbeiter").insert({ id, daten });
      if (error && error.code !== "23505") return antwort(500, { fehler: "Mitarbeiter konnte nicht angelegt werden: " + error.message });
      ({ data: ma } = await db.from("mitarbeiter").select("id, auth_id, daten").eq("id", id).maybeSingle());
      if (!ma) return antwort(500, { fehler: "Mitarbeiter konnte nicht angelegt werden." });
    }
    const email = String(ma.daten?.email || "").trim().toLowerCase();
    if (!email) return antwort(400, { fehler: "Für diesen Zugang ist keine E-Mail hinterlegt." });

    let authId = ma.auth_id as string | null;
    if (authId) {
      const { error } = await db.auth.admin.updateUserById(authId, { password: pw, email, email_confirm: true });
      if (error) return antwort(400, { fehler: "Passwort konnte nicht gesetzt werden: " + error.message });
    } else {
      const { data, error } = await db.auth.admin.createUser({ email, password: pw, email_confirm: true });
      if (error) {
        /* gibt es die Adresse schon als Zugang, ohne Verknüpfung: übernehmen */
        const { data: alle } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
        const vorhanden = (alle?.users || []).find((u: any) => String(u.email || "").toLowerCase() === email);
        if (!vorhanden) return antwort(400, { fehler: "Zugang konnte nicht angelegt werden: " + error.message });
        const { data: belegt } = await db.from("mitarbeiter").select("id").eq("auth_id", vorhanden.id).maybeSingle();
        if (belegt && belegt.id !== ma.id) return antwort(400, { fehler: "Diese E-Mail gehört schon zu einem anderen Mitarbeiter." });
        const { error: e3 } = await db.auth.admin.updateUserById(vorhanden.id, { password: pw, email_confirm: true });
        if (e3) return antwort(400, { fehler: "Passwort konnte nicht gesetzt werden: " + e3.message });
        authId = vorhanden.id;
      } else authId = data.user.id;
    }
    const daten = { ...ma.daten };
    if (daten.status === "eingeladen") daten.status = ["aktiv", "registriert"].includes(eingabe.status) ? eingabe.status : "registriert";
    const { error: e2 } = await db.from("mitarbeiter").update({ auth_id: authId, daten }).eq("id", ma.id);
    if (e2) return antwort(500, { fehler: "Zugang angelegt, aber nicht verknüpft: " + e2.message });
    await db.from("einladungen").delete().eq("id", ma.id);
    return antwort(200, { ok: true, email, status: daten.status });
  }

  /* ---------- Einladung oder Rücksetzlink ---------- */
  const code = String(eingabe.code || "").trim().toUpperCase();
  if (code.length < 10) return antwort(400, { fehler: "Dieser Code ist ungültig oder bereits verwendet." });

  const { data: einl } = await db.from("einladungen").select("id, daten, erstellt")
    .eq("daten->>einladung", code).maybeSingle();
  if (!einl) return antwort(404, { fehler: "Dieser Code ist ungültig oder bereits verwendet." });
  const art = einl.daten?.art === "reset" ? "reset" : "einladung";

  if (Date.now() - new Date(einl.erstellt).getTime() > (art === "reset" ? GUELTIG_RESET : GUELTIG_EINLADUNG))
    return antwort(410, { fehler: art === "reset"
      ? "Dieser Link ist abgelaufen. Bitte unter „Passwort vergessen“ einen neuen anfordern."
      : "Diese Einladung ist abgelaufen. Bitte einen neuen Link anfordern." });

  const { data: ma } = await db.from("mitarbeiter").select("id, auth_id, daten").eq("id", einl.id).maybeSingle();
  if (!ma) return antwort(404, { fehler: "Zu diesem Code gibt es keinen Zugang mehr." });

  const email = String(ma.daten?.email || "").trim().toLowerCase();
  if (eingabe.aktion === "pruefen")
    return antwort(200, { id: ma.id, name: ma.daten?.name || "", email, rolle: ma.daten?.rolle || "", art });

  if (eingabe.aktion !== "einloesen") return antwort(400, { fehler: "Unbekannte Aktion" });
  const pw = String(eingabe.passwort || "");
  if (!passwortOk(pw)) return antwort(400, { fehler: "Das Passwort braucht mindestens 8 Zeichen und ein Sonderzeichen." });
  if (!email) return antwort(400, { fehler: "Für diesen Zugang ist keine E-Mail hinterlegt." });

  let authId = ma.auth_id as string | null;
  if (authId) {
    /* bestehender Zugang: Passwort neu setzen */
    const { error } = await db.auth.admin.updateUserById(authId, { password: pw, email, email_confirm: true });
    if (error) return antwort(400, { fehler: "Passwort konnte nicht gesetzt werden: " + error.message });
  } else {
    const { data, error } = await db.auth.admin.createUser({ email, password: pw, email_confirm: true });
    if (error) return antwort(400, { fehler: "Zugang konnte nicht angelegt werden: " + error.message });
    authId = data.user.id;
  }

  const daten = { ...ma.daten };
  if (daten.status === "eingeladen") daten.status = "registriert";
  delete daten.einladung;
  const { error: e2 } = await db.from("mitarbeiter").update({ auth_id: authId, daten }).eq("id", ma.id);
  if (e2) return antwort(500, { fehler: "Zugang angelegt, aber nicht verknüpft: " + e2.message });
  await db.from("einladungen").delete().eq("id", ma.id);

  return antwort(200, { ok: true, email });
});
