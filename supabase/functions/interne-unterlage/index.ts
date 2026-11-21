// Interne Unterlagen (v5.43): Die Dateien liegen verschlüsselt im Portal (unterlagen/intern).
// Den Schlüssel bekommt nur, wer angemeldet, freigeschaltet und Kalkulation oder Geschäftsführung ist.
// Der Schlüssel steht als Geheimnis INTERNE_UNTERLAGEN_SCHLUESSEL in den Einstellungen der Funktionen,
// nie im Repository.
import { createClient } from "npm:@supabase/supabase-js@2.118.0";

const ERLAUBT = ["Kalkulation", "Geschäftsführung"];
const KOPF = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};
const antwort = (status: number, daten: unknown) => new Response(JSON.stringify(daten), { status, headers: KOPF });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: KOPF });
  if (req.method !== "POST") return antwort(405, { fehler: "Nur POST" });
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return antwort(401, { fehler: "Nicht angemeldet" });

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
  const { data: nutzer, error } = await db.auth.getUser(token);
  if (error || !nutzer?.user) return antwort(401, { fehler: "Nicht angemeldet" });
  const { data: ma } = await db.from("mitarbeiter").select("rolle, status").eq("auth_id", nutzer.user.id).maybeSingle();
  if (!ma || ma.status !== "aktiv" || !ERLAUBT.includes(ma.rolle)) return antwort(403, { fehler: "Keine Berechtigung" });

  const schluessel = Deno.env.get("INTERNE_UNTERLAGEN_SCHLUESSEL");
  if (!schluessel) return antwort(500, { fehler: "Schlüssel fehlt" });
  return antwort(200, { schluessel });
});
