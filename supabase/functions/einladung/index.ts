/* Einladung einlösen: legt den Zugang an (oder setzt das Passwort neu)
   und verknüpft ihn mit dem Mitarbeiter-Datensatz.
   Läuft mit Dienstschlüssel, weil nur der Server Zugänge anlegen darf. */
import { createClient } from "npm:@supabase/supabase-js@2.118.0";

const KOPF = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

const antwort = (status: number, inhalt: unknown) =>
  new Response(JSON.stringify(inhalt), { status, headers: KOPF });

const passwortOk = (pw: string) => pw.length >= 8 && /[^A-Za-z0-9]/.test(pw);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: KOPF });
  if (req.method !== "POST") return antwort(405, { fehler: "Nur POST" });

  let eingabe: { aktion?: string; code?: string; passwort?: string };
  try { eingabe = await req.json(); } catch { return antwort(400, { fehler: "Ungültige Anfrage" }); }

  const code = String(eingabe.code || "").trim().toUpperCase();
  if (code.length < 10) return antwort(400, { fehler: "Dieser Einladungscode ist ungültig oder bereits verwendet." });

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  const { data: einl } = await db.from("einladungen").select("id, daten, erstellt")
    .eq("daten->>einladung", code).maybeSingle();
  if (!einl) return antwort(404, { fehler: "Dieser Einladungscode ist ungültig oder bereits verwendet." });

  /* Einladungen gelten 30 Tage */
  if (Date.now() - new Date(einl.erstellt).getTime() > 30 * 86400000)
    return antwort(410, { fehler: "Diese Einladung ist abgelaufen. Bitte einen neuen Link anfordern." });

  const { data: ma } = await db.from("mitarbeiter").select("id, auth_id, daten").eq("id", einl.id).maybeSingle();
  if (!ma) return antwort(404, { fehler: "Zu dieser Einladung gibt es keinen Zugang mehr." });

  const email = String(ma.daten?.email || "").trim().toLowerCase();
  if (eingabe.aktion === "pruefen")
    return antwort(200, { id: ma.id, name: ma.daten?.name || "", email, rolle: ma.daten?.rolle || "" });

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
  const { error: e2 } = await db.from("mitarbeiter").update({ auth_id: authId, daten }).eq("id", ma.id);
  if (e2) return antwort(500, { fehler: "Zugang angelegt, aber nicht verknüpft: " + e2.message });
  await db.from("einladungen").delete().eq("id", ma.id);

  return antwort(200, { ok: true, email });
});
