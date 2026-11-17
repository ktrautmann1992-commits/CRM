/* Kopf der E-Mails: Original-Logo von EGC Energie auf dunkelblauem Grund mit grüner Linie
   (mail-kopf.png im Portal, aus logo-weiss.png, 1120 x 176 Pixel). Das Bild wird beim Versand geladen
   und in die Mail eingebettet (cid:egc-kopf), damit Mailprogramme es ohne „Bilder laden“ zeigen.
   Der Grund ist Teil des Bildes, so färbt der Dunkelmodus ihn nicht um.
   Ist das Bild nicht erreichbar, steht der bisherige Schriftzug im Kopf. */
const QUELLE = "https://egc-vertriebsportal.netlify.app/assets/mail-kopf.png";
let bild: Uint8Array | null = null, versucht = 0;

const BILD = `<tr><td style="padding:0;background:#0A1626;line-height:0"><img src="cid:egc-kopf" width="560" alt="EGC Energie" style="display:block;width:100%;max-width:560px;height:auto;border:0"></td></tr>`;
const TEXT = `<tr><td style="background:#0A1626;padding:18px 24px;color:#ffffff;font-size:18px;font-weight:bold">EGC <span style="color:#6CB43B">Energie</span></td></tr>
<tr><td style="height:4px;background:#6CB43B"></td></tr>`;

export async function mailkopf(): Promise<{ html: string; anhaenge: any[] }> {
  if (!bild && Date.now() - versucht > 600000) {
    versucht = Date.now();
    try {
      const r = await fetch(QUELLE);
      if (r.ok && (r.headers.get("content-type") || "").includes("image/png")) bild = new Uint8Array(await r.arrayBuffer());
    } catch (_) { /* später noch einmal versuchen */ }
  }
  return bild
    ? { html: BILD, anhaenge: [{ filename: "egc-energie.png", content: bild, cid: "egc-kopf", contentType: "image/png" }] }
    : { html: TEXT, anhaenge: [] };
}
