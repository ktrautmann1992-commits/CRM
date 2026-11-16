/* Setzt die Angaben und die Unterschrift des Kunden fest in ein Angebots-PDF des Portals.
   Ohne Fremdbaustein: Das PDF bleibt unverändert, geänderte Seiten, Bilder und eine
   Bestätigungsseite werden als Ergänzung angehängt (wie beim Speichern in einem PDF-Editor).
   Die Formularfelder werden dabei entfernt, das Ergebnis ist ein festes, unterschriebenes PDF.

   Gefunden werden die Felder über ihre Namen, wie sie egcAngebotPdf in App.jsx anlegt
   ("Vollmacht Name", "Unterschrift Angebot", "IBAN" …). Fehlen sie (ältere Angebote),
   steht alles auf der Bestätigungsseite am Ende.

   stempeln(bytes, {
     texte: { "Feldname": "Wert", … },            Textfelder, die gefüllt werden
     unterschrift: { striche: [[[x, y], …], …] },  Fingerunterschrift als Linienzüge (Bildschirmpunkte,
                                                    y nach unten), für alle Unterschriftsfelder
     hinweis: "elektronisch unterschrieben am …",   klein unter jeder Unterschrift
     bestaetigung: { titel, zeilen: [[Bezeichnung, Wert], …], fuss }
   }) → { bytes, stellen: ["Unterschrift Angebot", …] }                                   */

const latin = (u8) => {
  let s = "";
  for (let i = 0; i < u8.length; i += 8192) s += String.fromCharCode.apply(null, u8.subarray(i, i + 8192));
  return s;
};

/* Text für die Standardschrift Helvetica (WinAnsi): Umlaute bleiben, alles andere wird ersetzt */
const WIN = { "€": 128, "‚": 130, "„": 132, "…": 133, "–": 150, "—": 151, "‘": 145, "’": 146, "“": 147, "”": 148, "•": 149 };
const pdfText = (t) => "(" + Array.from(String(t ?? "")).map((c) => {
  const k = c.charCodeAt(0);
  const b = WIN[c] ?? (k >= 32 && k <= 255 ? k : 63);
  const z = String.fromCharCode(b);
  return z === "(" || z === ")" || z === "\\" ? "\\" + z : z;
}).join("") + ")";

/* Helvetica-Breiten (1/1000 em) für Umbruch und rechtsbündige Angaben, grob genug */
const breite = (t, gr) => Array.from(String(t)).reduce((s, c) =>
  s + (/[il.,:;|!'’]/.test(c) ? 250 : /[ ]/.test(c) ? 278 : /[mwMW]/.test(c) ? 850 : /[A-ZÄÖÜ]/.test(c) ? 680 : 556), 0) * gr / 1000;

/* Prüft die Linienzüge und liefert ihren Umriss; leere oder unsinnige Unterschriften → null */
export function unterschriftPruefen(u) {
  const striche = (u && Array.isArray(u.striche) ? u.striche : [])
    .filter((z) => Array.isArray(z) && z.length)
    .map((z) => z.filter((p) => Array.isArray(p) && isFinite(p[0]) && isFinite(p[1])).map((p) => [+p[0], +p[1]]))
    .filter((z) => z.length);
  const punkte = striche.flat();
  if (punkte.length < 6 || punkte.length > 20000) return null;
  const xs = punkte.map((p) => p[0]), ys = punkte.map((p) => p[1]);
  const box = { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
  if (box.x1 - box.x0 < 20) return null;
  return { striche, box };
}

export function stempeln(bytes, { texte = {}, unterschrift = null, hinweis = "", bestaetigung = null } = {}) {
  const roh = latin(bytes);
  const sx = roh.lastIndexOf("startxref");
  const prev = parseInt(roh.slice(sx + 9), 10);
  const tr = roh.slice(roh.lastIndexOf("trailer"), sx);
  const groesse = +tr.match(/\/Size (\d+)/)[1], wurzel = +tr.match(/\/Root (\d+) 0 R/)[1];
  const info = tr.match(/\/Info (\d+) 0 R/), kennung = tr.match(/\/ID\s*(\[[^\]]*\])/);
  /* jüngste Fassung eines Objekts (das PDF kann schon Ergänzungen haben) */
  const objekt = (n) => {
    const re = new RegExp("(?:^|[\\r\\n])" + n + " 0 obj\\s*(<<[\\s\\S]*?>>)\\s*endobj", "g");
    let m, letzte = null;
    while ((m = re.exec(roh))) letzte = m[1];
    if (!letzte) throw new Error("PDF-Objekt " + n + " nicht gefunden");
    return letzte;
  };
  const katalog = objekt(wurzel);
  const seitenNr = +katalog.match(/\/Pages (\d+) 0 R/)[1];
  const seitenDict = objekt(seitenNr);
  const seiten = seitenDict.match(/\/Kids\s*\[([^\]]*)\]/)[1].match(/\d+ 0 R/g).map((r) => +r.split(" ")[0]);

  const neu = [], ersetzt = [];
  let naechste = groesse;
  const anlegen = (inhalt) => { const n = naechste++; neu.push([n, inhalt]); return n; };
  const strom = (kopf, inhalt) => kopf.replace(/>>$/, "/Length " + inhalt.length + ">>") + "\nstream\n" + inhalt + "\nendstream";
  const f2 = (z) => (Math.round(z * 100) / 100).toString();

  const helv = anlegen("<</Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding>>");
  const helvB = anlegen("<</Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding>>");
  const sig = unterschrift ? unterschriftPruefen(unterschrift) : null;
  if (unterschrift && !sig) throw new Error("Die Unterschrift ist leer.");
  /* Linienzüge in das Feld einpassen (links unten), dunkelblau, runde Enden */
  const unterschriftZeichnen = (x, y, w, h) => {
    if (!sig) return "";
    const { box } = sig, bw = Math.max(box.x1 - box.x0, 1), bh = Math.max(box.y1 - box.y0, 1);
    const s = Math.min(w / bw, h / bh), dicke = Math.max(0.6, Math.min(1.4, 2.6 * s));
    const px = (p) => f2(x + (p[0] - box.x0) * s) + " " + f2(y + (box.y1 - p[1]) * s);
    let z = "q 0.04 0.12 0.31 RG " + f2(dicke) + " w 1 J 1 j\n";
    sig.striche.forEach((st) => {
      z += px(st[0]) + " m ";
      (st.length > 1 ? st.slice(1) : [[st[0][0] + 0.5, st[0][1]]]).forEach((p) => { z += px(p) + " l "; });
      z += "S\n";
    });
    return z + "Q\n";
  };

  const stellen = [];
  seiten.forEach((sNr) => {
    const alt = objekt(sNr);
    const am = alt.match(/\/Annots\s*\[([^\]]*)\]/);
    if (!am) return;
    const widgets = (am[1].match(/\d+ 0 R/g) || []).map((r) => +r.split(" ")[0])
      .map((n) => ({ n, d: objekt(n) })).filter((x) => /\/Subtype\s*\/Widget/.test(x.d));
    if (!widgets.length) return;
    let inhalt = "";
    widgets.forEach(({ d }) => {
      const tm = d.match(/\/T\s*\(((?:\\.|[^\\)])*)\)/), rm = d.match(/\/Rect\s*\[([^\]]*)\]/);
      if (!tm || !rm) return;
      const name = tm[1].replace(/\\(.)/g, "$1");
      const [x1, y1, x2, y2] = rm[1].trim().split(/\s+/).map(Number);
      const w = x2 - x1, h = y2 - y1;
      if (/\/FT\s*\/Sig/.test(d)) {
        stellen.push(name);
        /* Bild über der Linie, darf nach oben etwas über das Feld hinausragen */
        inhalt += unterschriftZeichnen(x1 + 1, y1 + 1, w - 2, Math.max(h, 22) - 2);
        if (hinweis) inhalt += "BT /EgcF 5.5 Tf 0.42 0.47 0.53 rg " + f2(x1) + " " + f2(y1 - 19) + " Td " + pdfText(hinweis) + " Tj ET\n";
      } else if (/\/FT\s*\/Tx/.test(d) && texte[name] != null && String(texte[name]).trim()) {
        let t = String(texte[name]).replace(/\s+/g, " ").trim();
        let gr = Math.min(10, h * 0.62);
        while (gr > 6 && breite(t, gr) > w - 2) gr -= 0.25;
        while (breite(t, gr) > w - 2 && t.length > 3) t = t.slice(0, -2) + "…";
        inhalt += "BT /EgcF " + f2(gr) + " Tf 0.09 0.13 0.17 rg " + f2(x1 + 1) + " " + f2(y1 + (h - gr * 0.7) / 2) + " Td " + pdfText(t) + " Tj ET\n";
      }
    });
    /* eigene Schrift der Seite ergänzen */
    const resRef = alt.match(/\/Resources\s+(\d+) 0 R/);
    const resAlt = resRef ? objekt(+resRef[1]) : (alt.match(/\/Resources\s*(<<[\s\S]*?>>)\s*\/(?:MediaBox|Contents|Parent|Type)/) || [])[1];
    if (!resAlt) throw new Error("Seitenmittel nicht lesbar");
    let res = /\/Font\s*<</.test(resAlt) ? resAlt.replace(/\/Font\s*<</, "/Font <<\n/EgcF " + helv + " 0 R")
      : resAlt.replace(/>>\s*$/, "/Font <</EgcF " + helv + " 0 R>>\n>>");
    const resNeu = anlegen(res);
    const zusatz = anlegen(strom("<<>>", "q\n" + inhalt + "Q"));
    const cm = alt.match(/\/Contents\s*(\[[^\]]*\]|\d+ 0 R)/);
    const inhalte = cm[1].startsWith("[") ? cm[1].slice(1, -1).trim() : cm[1];
    let seite = alt.replace(/\/Annots\s*\[[^\]]*\]/, "")
      .replace(/\/Contents\s*(\[[^\]]*\]|\d+ 0 R)/, "/Contents [" + inhalte + " " + zusatz + " 0 R]");
    seite = resRef ? seite.replace(/\/Resources\s+\d+ 0 R/, "/Resources " + resNeu + " 0 R")
      : seite.replace(/\/Resources\s*<<[\s\S]*?>>(\s*\/(?:MediaBox|Contents|Parent|Type))/, "/Resources " + resNeu + " 0 R$1");
    ersetzt.push([sNr, seite]);
  });

  /* Bestätigungsseite am Ende */
  let kidsNeu = seiten.map((n) => n + " 0 R");
  if (bestaetigung) {
    const mb = (objekt(seiten[seiten.length - 1]).match(/\/MediaBox\s*\[([^\]]*)\]/) || [0, "0 0 595.28 841.89"])[1];
    const [, , W, H] = mb.trim().split(/\s+/).map(Number);
    const RA = 45.35;
    let y = H - 70, s = "";
    s += "0.04 0.09 0.15 rg 0 " + f2(H - 46) + " " + f2(W) + " 46 re f 0.42 0.71 0.23 rg 0 " + f2(H - 49) + " " + f2(W) + " 3 re f\n";
    s += "BT /EgcB 13 Tf 1 1 1 rg " + f2(RA) + " " + f2(H - 29) + " Td " + pdfText("EGC Energie") + " Tj ET\n";
    s += "BT /EgcB 15 Tf 0.04 0.09 0.15 rg " + f2(RA) + " " + f2(y - 20) + " Td " + pdfText(bestaetigung.titel || "Bestätigung der Annahme") + " Tj ET\n";
    y -= 48;
    (bestaetigung.zeilen || []).forEach(([k, v]) => {
      s += "BT /EgcF 9 Tf 0.42 0.47 0.53 rg " + f2(RA) + " " + f2(y) + " Td " + pdfText(k) + " Tj ET\n";
      s += "BT /EgcF 10 Tf 0.09 0.13 0.17 rg " + f2(RA + 150) + " " + f2(y) + " Td " + pdfText(v || "–") + " Tj ET\n";
      s += "0.85 0.87 0.89 RG 0.4 w " + f2(RA) + " " + f2(y - 6) + " m " + f2(W - RA) + " " + f2(y - 6) + " l S\n";
      y -= 21;
    });
    if (sig) {
      y -= 14;
      s += "BT /EgcF 9 Tf 0.42 0.47 0.53 rg " + f2(RA) + " " + f2(y) + " Td " + pdfText("Unterschrift") + " Tj ET\n";
      s += unterschriftZeichnen(RA + 150, y - 50, 200, 60);
      s += "0.09 0.13 0.17 RG 0.6 w " + f2(RA + 150) + " " + f2(y - 52) + " m " + f2(RA + 350) + " " + f2(y - 52) + " l S\n";
      y -= 80;
    }
    let fy = 70;
    String(bestaetigung.fuss || "").split("\n").reverse().forEach((z) => {
      s += "BT /EgcF 8 Tf 0.42 0.47 0.53 rg " + f2(RA) + " " + f2(fy) + " Td " + pdfText(z) + " Tj ET\n"; fy += 11;
    });
    const res = anlegen("<</Font <</EgcF " + helv + " 0 R /EgcB " + helvB + " 0 R>>" + ">>");
    const inh = anlegen(strom("<<>>", s));
    const seite = anlegen("<</Type /Page /Parent " + seitenNr + " 0 R /MediaBox [" + mb.trim() + "] /Resources " + res + " 0 R /Contents " + inh + " 0 R>>");
    kidsNeu = [...kidsNeu, seite + " 0 R"];
    ersetzt.push([seitenNr, seitenDict.replace(/\/Kids\s*\[[^\]]*\]/, "/Kids [" + kidsNeu.join(" ") + "]")
      .replace(/\/Count\s+\d+/, "/Count " + kidsNeu.length)]);
  }
  /* Formular entfernen: das Ergebnis ist fest */
  ersetzt.push([wurzel, katalog.replace(/\/AcroForm\s*\d+ 0 R/, "")]);

  let anhang = "\n", pos = roh.length + 1;
  const xref = [];
  [...ersetzt, ...neu].forEach(([n, inh]) => {
    const teil = n + " 0 obj\n" + inh + "\nendobj\n";
    xref.push([n, pos]); anhang += teil; pos += teil.length;
  });
  anhang += "xref\n" + xref.sort((a, b) => a[0] - b[0]).map(([n, o]) => n + " 1\n" + String(o).padStart(10, "0") + " 00000 n \n").join("") +
    "trailer\n<<\n/Size " + naechste + "\n/Root " + wurzel + " 0 R\n" + (info ? "/Info " + info[1] + " 0 R\n" : "") +
    (kennung ? "/ID " + kennung[1] + "\n" : "") + "/Prev " + prev + "\n>>\nstartxref\n" + pos + "\n%%EOF\n";
  const aus = new Uint8Array(bytes.length + anhang.length);
  aus.set(bytes);
  for (let i = 0; i < anhang.length; i++) aus[bytes.length + i] = anhang.charCodeAt(i) & 255;
  return { bytes: aus, stellen };
}

/* Namen der Unterschriftsfelder eines PDFs, in Seitenfolge (für die Führung des Kunden) */
export function unterschriftsstellen(bytes) {
  const roh = latin(bytes), namen = [];
  const re = /\/FT\s*\/Sig[^>]*?\/T\s*\(((?:\\.|[^\\)])*)\)|\/T\s*\(((?:\\.|[^\\)])*)\)[^>]*?\/FT\s*\/Sig/g;
  let m;
  while ((m = re.exec(roh))) {
    const n = (m[1] ?? m[2]).replace(/\\(.)/g, "$1");
    if (!namen.includes(n)) namen.push(n);
  }
  return namen;
}
