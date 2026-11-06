/* Imagebroschüre EGC Energie, 12 Seiten A4.
   Gemeinsamer Baustein für die Druckdatei (bau.js, Node) und die Versandfassung im Portal
   (Unterlagen → Marketing, App.jsx lädt ihn bei Bedarf als /assets/broschuere-STAND/broschuere.js).
   Parameter:
     jsPDF, QR      Bibliotheken
     bild(name)     liefert das Bild als data:-Adresse (Druck: volle Auflösung, Versand: bilder/klein)
     logoT          weißes Logo als data:-Adresse
     schriften      { regular, fett } Liberation Sans als Base64
     D              Lastgang-Beispieldaten (daten.json)
     P              Ansprechpartner { name, titel, zusatz, mobil, telefon, email } oder null
     versand        true: Endformat ohne Beschnitt, Telefon/E-Mail/Website anklickbar
   Rückgabe: das jsPDF-Dokument. */
module.exports = async function baueBroschuere({ jsPDF, QR, bild, logoT, schriften, D, P = null, versand = false, log = () => {} }) {
const VERSAND = versand;
const qr = await QR.toDataURL('https://www.egc-energie.de', { margin: 0, width: 500, color: { dark: '#0A1626', light: '#FFFFFF' } });
const B = VERSAND ? 0 : 3, W = 210, H = 297, PW = W + 2 * B, PH = H + 2 * B, RA = 18, BR = W - 2 * RA;
const doc = new jsPDF({ unit: 'mm', format: [PW, PH], compress: true });
/* Schrift fest einbetten: Druckereien verlangen eingebettete Schriften */
doc.addFileToVFS('LS-R.ttf', schriften.regular); doc.addFont('LS-R.ttf', 'LS', 'normal');
doc.addFileToVFS('LS-B.ttf', schriften.fett); doc.addFont('LS-B.ttf', 'LS', 'bold');
const NAVY = [10, 22, 38], NAVY1 = [7, 16, 29], NAVY2 = [27, 58, 96], GRUEN = [108, 180, 59], GRUEN1 = [74, 140, 38],
  GRUEN2 = [150, 206, 96], WEISS = [255, 255, 255], TEXT = [22, 33, 44], GRAU = [107, 119, 135], HELL = [244, 247, 250],
  HELLBLAU = [196, 208, 222], LINIE = [216, 221, 228], GRUENHELL = [236, 246, 228];
const X = (v) => B + v, Y = (v) => B + v;
const fl = (c) => doc.setFillColor(...c), st = (c) => doc.setDrawColor(...c), fa = (c) => doc.setTextColor(...c);
const schrift = (g, fett) => { doc.setFont('LS', fett ? 'bold' : 'normal'); doc.setFontSize(g); };
const mische = (a, b, t) => a.map((c, i) => Math.round(c + (b[i] - c) * t));
const dk = (o) => doc.setGState(new doc.GState({ opacity: o, 'stroke-opacity': o }));
const verlauf = (x, y, w, h, f1, f2, { quer = true, n = 100, r = 0, kreis = false } = {}) => {
  doc.saveGraphicsState();
  if (kreis) doc.circle(x + w / 2, y + h / 2, w / 2, null); else if (r) doc.roundedRect(x, y, w, h, r, r, null); else doc.rect(x, y, w, h, null);
  doc.clip(); doc.discardPath();
  for (let i = 0; i < n; i++) { fl(mische(f1, f2, i / (n - 1))); if (quer) doc.rect(x + i * w / n, y, w / n + 0.2, h, 'F'); else doc.rect(x, y + i * h / n, w, h / n + 0.2, 'F'); }
  doc.restoreGraphicsState();
};
const ring = (x, y, r, o, c = WEISS, lw = 0.5) => { dk(o); st(c); doc.setLineWidth(lw); doc.circle(x, y, r, 'S'); dk(1); };
const num = (v, d = 0) => v.toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d });
const absatz = (t, x, y, breite, gr = 9.5, farbe = TEXT, zl = 1.45) => {
  schrift(gr); fa(farbe); const z = doc.splitTextToSize(t, breite); doc.text(z, x, y, { lineHeightFactor: zl });
  return y + z.length * gr * 0.3528 * zl;
};
const haken = (x, y, f = GRUEN) => { fl(f); doc.circle(x, y - 1.2, 1.9, 'F'); st(WEISS); doc.setLineWidth(0.45);
  doc.line(x - 0.85, y - 1.2, x - 0.25, y - 0.55); doc.line(x - 0.25, y - 0.55, x + 0.95, y - 1.95); };
const punkt = (titel, unter, x, y, breite, gr = 9.5) => {
  haken(x + 1.9, y);
  schrift(gr, true); fa(TEXT); const t = doc.splitTextToSize(titel, breite - 7); doc.text(t, x + 6, y); y += t.length * gr * 0.42;
  if (unter) { schrift(gr - 1); fa(GRAU); const u = doc.splitTextToSize(unter, breite - 7); doc.text(u, x + 6, y); y += u.length * (gr - 1) * 0.42; }
  return y + gr * 0.32;
};
let seite = 0;
const fuss = (dunkel = false) => {
  schrift(7); fa(dunkel ? HELLBLAU : GRAU);
  doc.text('EGC Energie  ·  www.egc-energie.de', X(RA), Y(H - 9));
  doc.text(String(seite), X(W - RA), Y(H - 9), { align: 'right' });
};
const neueSeite = () => { if (seite) doc.addPage([PW, PH]); seite++; fl(WEISS); doc.rect(0, 0, PW, PH, 'F'); };
/* Seitenkopf: Kicker, zweifarbiger Titel, Linie */
const titel = (kicker, a, b, y = 26) => {
  schrift(7.5, true); fa(GRUEN1); doc.text(kicker, X(RA), Y(y), { charSpace: 1 });
  schrift(22, true); fa(NAVY); doc.text(a, X(RA), Y(y + 11));
  if (b) { fa(GRUEN1); doc.text(b, X(RA), Y(y + 20.5)); }
  verlauf(X(RA), Y(y + (b ? 25 : 15.5)), 26, 1.3, GRUEN1, GRUEN2, { n: 30, r: 0.65 });
  return y + (b ? 34 : 25);
};
const seitenband = () => { verlauf(0, 0, X(5), PH, NAVY1, NAVY2, { quer: false, n: 60 }); verlauf(X(5), 0, 1.2, PH, GRUEN2, GRUEN1, { quer: false, n: 40 }); };
const karte = (x, y, w, h, f = HELL, r = 3) => { fl(f); doc.roundedRect(X(x), Y(y), w, h, r, r, 'F'); };
const bildRund = (f, x, y, w, h, r = 3) => { doc.saveGraphicsState(); doc.roundedRect(X(x), Y(y), w, h, r, r, null); doc.clip(); doc.discardPath(); doc.addImage(bild(f), 'JPEG', X(x), Y(y), w, h); doc.restoreGraphicsState(); };
const kopfFarbe = (a, b, x, y, gr = 11) => { schrift(gr, true); fa(NAVY); doc.text(a, X(x), Y(y)); if (b) { const w = doc.getTextWidth(a + ' '); fa(GRUEN1); doc.text(b, X(x) + w, Y(y)); } };

/* Diagramm: Fläche mit Verlauf, Achsen; werte in kW */
const diagramm = (werte, x, y, w, h, { max, achse = [], linien = [], farbe = NAVY2, beschriftung = 'kW', flaecheO = 0.85 } = {}) => {
  const mx = max || Math.max(...werte) * 1.08;
  const schrittW = [10, 20, 25, 50, 100, 200].find((s) => mx / s <= 5) || 100;
  st(LINIE); doc.setLineWidth(0.15); schrift(6.5); fa(GRAU);
  for (let v = 0; v <= mx; v += schrittW) { const yy = y + h - (v / mx) * h; doc.line(X(x), Y(yy), X(x + w), Y(yy)); doc.text(num(v), X(x - 1.5), Y(yy + 0.9), { align: 'right' }); }
  doc.text(beschriftung, X(x - 1.5), Y(y - 2.5), { align: 'right' });
  const px = (i) => x + (i / (werte.length - 1)) * w, py = (v) => y + h - (Math.min(v, mx) / mx) * h;
  /* Fläche als Streifen mit Verlauf nach unten */
  const pts = werte.map((v, i) => [px(i), py(v)]);
  doc.saveGraphicsState();
  const seg = [[pts[0][0] - pts[0][0], 0]];
  const lines = []; let lx = X(pts[0][0]), ly = Y(y + h);
  lines.push([X(pts[0][0]) - lx, Y(pts[0][1]) - ly]); lx = X(pts[0][0]); ly = Y(pts[0][1]);
  for (let i = 1; i < pts.length; i++) { lines.push([X(pts[i][0]) - lx, Y(pts[i][1]) - ly]); lx = X(pts[i][0]); ly = Y(pts[i][1]); }
  lines.push([0, Y(y + h) - ly]);
  doc.lines(lines, X(pts[0][0]), Y(y + h), [1, 1], null, true); doc.clip(); doc.discardPath();
  /* Deckkraft über Farbmischung statt Transparenz: keine Streifen im Druck */
  verlauf(X(x), Y(y), w, h, mische(WEISS, farbe, flaecheO), WEISS, { quer: false, n: 60 });
  doc.restoreGraphicsState();
  st(farbe); doc.setLineWidth(0.35);
  for (let i = 1; i < pts.length; i++) doc.line(X(pts[i - 1][0]), Y(pts[i - 1][1]), X(pts[i][0]), Y(pts[i][1]));
  linien.forEach(([v, text, f, links]) => { st(f); doc.setLineWidth(0.5); doc.setLineDashPattern([1.2, 1], 0); doc.line(X(x), Y(py(v)), X(x + w), Y(py(v))); doc.setLineDashPattern([], 0);
    schrift(7, true); fa(f); if (links) doc.text(text, X(x + 2), Y(py(v) - 1.3)); else doc.text(text, X(x + w), Y(py(v) - 1.3), { align: 'right' }); });
  schrift(6.5); fa(GRAU); achse.forEach(([i, t]) => doc.text(t, X(px(i)), Y(y + h + 4), { align: 'center' }));
  return { px, py };
};

/* ================= Seite 1: Titel ================= */
neueSeite();
/* Titelbild über die ganze Seite einschließlich Beschnitt (Higgsfield, KI-generiert) */
doc.addImage(bild('titel.jpg'), 'JPEG', 0, 0, PW, PH);
doc.addImage(logoT, 'PNG', X(RA), Y(26), (420 / 196) * 28, 28);
schrift(8, true); fa(GRUEN2); doc.text('IMAGEBROSCHÜRE', X(RA), Y(118), { charSpace: 1.4 });
schrift(34, true); fa(WEISS); doc.text('Energie', X(RA), Y(134)); doc.text('strategisch', X(RA), Y(147));
fa(GRUEN2); doc.text('beschaffen.', X(RA), Y(160));
verlauf(X(RA), Y(167), 34, 1.6, GRUEN1, GRUEN2, { n: 30, r: 0.8 });
schrift(13); fa(HELLBLAU);
doc.text(['Ihre externe Energieeinkaufsabteilung', 'für Industrie, Gewerbe und Mittelstand'], X(RA), Y(180), { lineHeightFactor: 1.4 });
/* Leistungen als schmale Zeile in Grün, Großbuchstaben, mittig */
(() => {
  const t = 'STROM \u2009·\u2009 ERDGAS \u2009·\u2009 BESCHAFFUNGSSTRATEGIE \u2009·\u2009 ENERGIENEBENKOSTEN \u2009·\u2009 ERZEUGUNG & SPEICHER';
  let g = 9.2, cs = 0.22; schrift(g, true);
  const breite = () => doc.getTextWidth(t) + cs * (t.length - 1);
  while (breite() > BR && g > 6) { g -= 0.2; schrift(g, true); }
  /* selbst zentrieren: jsPDF rechnet den Buchstabenabstand beim Zentrieren nicht mit */
  fa(GRUEN2); doc.text(t, X(W / 2) - breite() / 2, Y(196), { charSpace: cs });
  log('Leistungszeile', g.toFixed(1), 'pt,', breite().toFixed(0), 'mm');
})();

/* ================= Seite 2: Wer wir sind ================= */
neueSeite(); seitenband();
let y = titel('ÜBER UNS', 'Ihre externe', 'Energieeinkaufsabteilung');
/* Bild rechts (Beratungsgespräch, Higgsfield), Text links daneben */
const bw2 = 76, bh2 = bw2 / 1.6;
bildRund('beratung.jpg', RA + BR - bw2, y - 4, bw2, bh2);
let yt2 = absatz('EGC Energie ist ein versorgerunabhängiger Energiedienstleister mit Sitz in Waldmohr. Wir übernehmen für Unternehmen in ganz Deutschland den Einkauf von Strom und Erdgas: von der Analyse Ihres Verbrauchs über die Beschaffungsstrategie bis zur laufenden Bewirtschaftung Ihrer Verträge.', X(RA), Y(y), BR - bw2 - 7, 9.8) + 3;
yt2 = absatz('Für Sie bedeutet das: ein zentraler Ansprechpartner für alle Energiethemen, eine Beschaffung, die zu Ihrem Unternehmen passt, und Energiekosten, die Sie planen und steuern können, statt ihnen ausgeliefert zu sein.', X(RA), Y(yt2), BR - bw2 - 7, 9.8);
y = Math.max(yt2 - B, y - 4 + bh2) + 8;
log('Seite 2 Text bis', (yt2 - B).toFixed(1), 'Bild bis', (y - 8).toFixed(1));
const kacheln = [
  ['Versorgerunabhängig', 'Wir arbeiten mit vielen Energieversorgern und empfehlen, was zu Ihnen passt, nicht, was am meisten bringt.'],
  ['Strategisch statt Stichtag', 'Wir kaufen Energie nach einem Beschaffungsplan zu gezielten Zeitpunkten ein und nutzen Marktchancen.'],
  ['Ein Ansprechpartner', 'Beschaffung, Verträge, Nebenkosten und Technik: alles über eine Person, die Ihr Unternehmen kennt.'],
  ['Bundesweit', 'Persönliche Betreuung in ganz Deutschland, vor Ort und digital, für einzelne Standorte und ganze Gruppen.']];
const kw2 = (BR - 6) / 2;
kacheln.forEach(([t, u], i) => {
  const x = RA + (i % 2) * (kw2 + 6), yy = y + Math.floor(i / 2) * 52;
  karte(x, yy, kw2, 46);
  verlauf(X(x + 6), Y(yy + 7), 9, 9, GRUEN2, GRUEN1, { kreis: true, quer: false, n: 30 });
  schrift(11, true); fa(WEISS); doc.text(String(i + 1), X(x + 10.5), Y(yy + 13.1), { align: 'center' });
  schrift(11, true); fa(NAVY); doc.text(t, X(x + 6), Y(yy + 24));
  absatz(u, X(x + 6), Y(yy + 29), kw2 - 12, 9.2, GRAU, 1.38);
});
y += 108;
karte(RA, y, BR, 46, NAVY);
verlauf(X(RA), Y(y), BR, 46, NAVY1, NAVY2, { r: 3, n: 60 });
doc.saveGraphicsState(); doc.roundedRect(X(RA), Y(y), BR, 46, 3, 3, null); doc.clip(); doc.discardPath(); ring(X(RA + BR - 10), Y(y + 6), 30, 0.08); ring(X(RA + BR - 10), Y(y + 6), 40, 0.05); doc.restoreGraphicsState();
schrift(8, true); fa(GRUEN2); doc.text('WAS WIR FÜR SIE ÜBERNEHMEN', X(RA + 8), Y(y + 10), { charSpace: 0.8 });
['Verbrauchs- und Lastganganalyse', 'Beschaffungsstrategie und -plan', 'Ausschreibung bei Energieversorgern', 'Marktüberwachung und Tranchenkäufe',
 'Vertragsmanagement und Fristen', 'Nebenkostenoptimierung und Erstattungen'].forEach((t, i) => {
  const x = RA + 8 + (i % 2) * 82, yy = y + 20 + Math.floor(i / 2) * 8;
  haken(X(x + 1.9), Y(yy)); schrift(9.5); fa(WEISS); doc.text(t, X(x + 6), Y(yy));
});
fuss();

/* ================= Seite 3: So arbeiten wir ================= */
neueSeite(); seitenband();
y = titel('UNSERE ARBEITSWEISE', 'In fünf Schritten zu', 'Ihrer Beschaffungsstrategie');
const schritte = [
  ['Analyse', 'Wir werten Ihren Lastgang, Ihre Verträge und Rechnungen aus und klären mit Ihnen Ihr Risikoprofil: Wie viel Preisrisiko darf es sein, wie wichtig ist Planbarkeit?'],
  ['Strategie', 'Wir wählen das passende Beschaffungsmodell und erstellen einen Beschaffungsplan mit Mengen, Zeitpunkten, Zielpreisen und Limits.'],
  ['Umsetzung', 'Wir schreiben Ihren Bedarf bei den Energieversorgern aus, vergleichen die Angebote transparent und begleiten den Vertragsabschluss.'],
  ['Bewirtschaftung', 'Wir überwachen die Strom- und Gasmärkte, kaufen Tranchen zum richtigen Zeitpunkt und passen die Strategie an Markt und Regeln an.'],
  ['Nebenkosten', 'Wir prüfen Netzentgelte, Steuern und Abgaben, sichern Erstattungen und senken so den Teil Ihrer Kosten, der nichts mit dem Energiepreis zu tun hat.']];
schritte.forEach(([t, u], i) => {
  const yy = y + i * 39;
  if (i < schritte.length - 1) { st(GRUEN2); doc.setLineWidth(0.8); doc.setLineDashPattern([1.2, 1.4], 0); doc.line(X(RA + 8), Y(yy + 10), X(RA + 8), Y(yy + 37)); doc.setLineDashPattern([], 0); }
  verlauf(X(RA), Y(yy - 2), 16, 16, GRUEN2, GRUEN1, { kreis: true, quer: false, n: 40 });
  schrift(15, true); fa(WEISS); doc.text(String(i + 1), X(RA + 8), Y(yy + 8.4), { align: 'center' });
  karte(RA + 24, yy - 4, BR - 24, 33);
  schrift(13, true); fa(NAVY); doc.text(t, X(RA + 31), Y(yy + 4.5));
  absatz(u, X(RA + 31), Y(yy + 11), BR - 38, 9.5, TEXT, 1.4);
});
fuss();

/* ================= Seite 4: Lastgang ================= */
neueSeite(); seitenband();
y = titel('ANALYSE', 'Ihr Lastgang:', 'der Fingerabdruck Ihres Verbrauchs');
y = absatz('Bei Kunden mit registrierender Leistungsmessung (RLM) wird der Verbrauch alle 15 Minuten erfasst. Dieser Lastgang zeigt, wann und wie viel Energie Ihr Betrieb braucht. Er ist die Grundlage für Beschaffungsplan, Lastspitzenkappung und die Prüfung der Netzentgelte.', X(RA), Y(y), BR, 9.8) + 5;
const kpi = [['Jahresverbrauch', num(D.summe) + ' kWh'], ['Spitzenlast', num(D.spitze, 1) + ' kW'], ['Grundlast', 'ca. ' + num(D.grund) + ' kW'], ['Benutzungsstunden', num(D.benutzung) + ' h']];
const kb4 = (BR - 9) / 4;
kpi.forEach(([k, v], i) => { const x = RA + i * (kb4 + 3); karte(x, y, kb4, 19); verlauf(X(x), Y(y), kb4, 1.4, GRUEN1, GRUEN2, { n: 20 });
  schrift(7.5); fa(GRAU); doc.text(k, X(x + 4), Y(y + 7.5)); schrift(12.5, true); fa(NAVY); doc.text(v, X(x + 4), Y(y + 14.5)); });
y += 28;
schrift(10, true); fa(NAVY); doc.text('Tagesspitzen im Jahresverlauf', X(RA), Y(y)); y += 7;
const mon = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
diagramm(D.tagmax, RA + 8, y, BR - 8, 46, { achse: mon.map((m, k) => [Math.round((k + 0.5) * (D.tagmax.length - 1) / 12), m]) });
y += 58;
schrift(10, true); fa(NAVY); doc.text('Eine durchschnittliche Woche', X(RA), Y(y)); y += 7;
diagramm(D.woche, RA + 8, y, BR - 8, 40, { achse: ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((t, k) => [k * 96 + 48, t]), farbe: GRUEN1 });
y += 52;
const erkl = [['Grundlast', 'Was auch nachts und am Wochenende läuft. Oft ein Hinweis auf Einsparpotenzial.'],
  ['Lastspitzen', 'Kurze Spitzen bestimmen den Leistungspreis im Netzentgelt, Kappung lohnt sich.'],
  ['Benutzungsstunden', 'Jahresverbrauch geteilt durch Spitzenlast. Entscheidet über die Preisstufe der Netzentgelte.']];
const kb3 = (BR - 8) / 3;
erkl.forEach(([t, u], i) => { const x = RA + i * (kb3 + 4); schrift(9.5, true); fa(GRUEN1); doc.text(t, X(x), Y(y)); absatz(u, X(x), Y(y + 5), kb3, 8.5, GRAU, 1.35); });
schrift(6.8); fa(GRAU); doc.text('Beispiel-Lastgang eines Gewerbekunden (anonymisiert).', X(RA), Y(H - 15));
fuss();

/* ================= Seite 5: Beschaffungsmodelle ================= */
neueSeite(); seitenband();
y = titel('BESCHAFFUNG', 'Beschaffungsmodelle', 'im Vergleich');
y = absatz('Es gibt nicht das eine richtige Modell. Entscheidend sind Ihr Verbrauchsprofil, Ihr Budget und wie viel Preisrisiko Sie tragen möchten. Wir bilden alle gängigen Modelle ab und kombinieren sie bei Bedarf.', X(RA), Y(y), BR, 9.8) + 6;
const modelle = [
  ['Festpreis', 'Ein Preis für die gesamte Laufzeit, Einkauf zu einem Zeitpunkt.', 'Volle Planbarkeit', 'Stichtagsrisiko beim Einkauf', 2],
  ['Tranchenmodell', 'Die Menge wird in mehreren Teilen zu gezielten Zeitpunkten eingekauft.', 'Durchschnittspreis, Marktchancen nutzen', 'Erfordert Marktbeobachtung', 3],
  ['Spotmarkt', 'Einkauf zum jeweiligen Börsenpreis, kurzfristig und flexibel.', 'Niedrige Preise in ruhigen Märkten', 'Preisschwankungen voll spürbar', 5],
  ['Spot mit Absicherung', 'Spotbezug, kombiniert mit Preisgrenzen und Teilabsicherung.', 'Flexibilität mit Sicherheitsnetz', 'Mehr Steuerungsaufwand', 4],
  ['PPA / Direktbezug', 'Strom direkt aus einer Erzeugungsanlage, oft über mehrere Jahre.', 'Langfristige Preise, Grünstrom', 'Lange Bindung, Mengenrisiko', 3]];
const cw = [38, 58, 37, 37];
schrift(7.5, true); fa(GRAU); let xx = RA;
['MODELL', 'PRINZIP', 'CHANCE', 'BEACHTEN'].forEach((t, i) => { doc.text(t, X(xx + 3), Y(y), { charSpace: 0.5 }); xx += cw[i]; });
doc.text('RISIKO', X(RA + BR - 3), Y(y), { align: 'right', charSpace: 0.5 });
y += 3;
modelle.forEach(([m, p, c, r, risiko], i) => {
  const hz = 21;
  karte(RA, y, BR, hz, i % 2 ? WEISS : HELL, 2);
  let x = RA;
  schrift(10, true); fa(NAVY); doc.text(doc.splitTextToSize(m, cw[0] - 5), X(x + 3), Y(y + 7)); x += cw[0];
  schrift(8.4); fa(TEXT); doc.text(doc.splitTextToSize(p, cw[1] - 5), X(x + 3), Y(y + 6.5), { lineHeightFactor: 1.35 }); x += cw[1];
  schrift(8.4); fa(GRUEN1); doc.text(doc.splitTextToSize(c, cw[2] - 5), X(x + 3), Y(y + 6.5), { lineHeightFactor: 1.35 }); x += cw[2];
  fa(GRAU); doc.text(doc.splitTextToSize(r, cw[3] - 5), X(x + 3), Y(y + 6.5), { lineHeightFactor: 1.35 });
  for (let k = 0; k < 5; k++) { fl(k < risiko ? mische(GRUEN, [220, 120, 60], k / 4) : LINIE); doc.roundedRect(X(RA + BR - 3 - (5 - k) * 3.4), Y(y + 12), 2.6, 4, 0.6, 0.6, 'F'); }
  y += hz + 2;
});
y += 6;
karte(RA, y, BR, 30, GRUENHELL);
verlauf(X(RA), Y(y), 2, 30, GRUEN2, GRUEN1, { quer: false, n: 20 });
schrift(10.5, true); fa(NAVY); doc.text('Unsere Rolle', X(RA + 7), Y(y + 8));
absatz('Wir empfehlen nicht einfach ein Produkt. Wir erarbeiten für Ihr Modell einen Beschaffungsplan, setzen ihn um und bewirtschaften ihn: mit Marktüberwachung, Kaufempfehlungen und laufender Anpassung bis zum Ende der Lieferzeit.', X(RA + 7), Y(y + 14), BR - 14, 9.3, TEXT, 1.4);
fuss();

/* ================= Seite 6: Beschaffungsplan & Marktüberwachung ================= */
neueSeite(); seitenband();
y = titel('BEWIRTSCHAFTUNG', 'Beschaffungsplan &', 'Marktüberwachung');
y = absatz('Ein Beschaffungsplan legt fest, wann welche Menge zu welchem Preisziel eingekauft wird. Wir beobachten den Markt laufend, kaufen Tranchen, wenn Zielpreise erreicht sind, und sichern ab, wenn Limits überschritten werden.', X(RA), Y(y), BR, 9.8) + 7;
/* synthetischer Preisverlauf */
const preis = []; let s = 11;
const zuf = () => { s = (s * 9301 + 49297) % 233280; return s / 233280 - 0.5; };
/* Stützpunkte: Index, Preis; dazwischen geglättet mit leichtem Rauschen */
const stuetz = [[0, 108], [22, 96], [34, 86], [50, 101], [62, 104], [76, 85], [92, 99], [106, 95], [118, 87], [134, 106], [148, 123], [159, 120]];
for (let i = 0; i < 160; i++) {
  const k = stuetz.findIndex((p, j) => j < stuetz.length - 1 && i >= p[0] && i <= stuetz[j + 1][0]);
  const [a0, b0] = stuetz[k], [a1, b1] = stuetz[k + 1], t = (i - a0) / (a1 - a0), w = (1 - Math.cos(Math.PI * t)) / 2;
  preis.push(b0 + (b1 - b0) * w + zuf() * 3.2);
}
const yp = y + 6, hp = 70;
schrift(10, true); fa(NAVY); doc.text('Beispiel: Terminmarktpreis und Tranchenkäufe', X(RA), Y(y));
const ZIEL = 92, LIMIT = 120;
const g = diagramm(preis, RA + 8, yp, BR - 8, hp, { max: 140, beschriftung: '€/MWh', farbe: NAVY2, flaecheO: 0.35,
  achse: ['Jan', 'Mär', 'Mai', 'Jul', 'Sep', 'Nov'].map((t, k) => [Math.round(k * 159 / 5), t]),
  linien: [[ZIEL, 'Zielpreis', GRUEN1, true], [LIMIT, 'Limit (Absicherung)', [200, 90, 50], true]] });
/* Tranchenkäufe an Tiefpunkten unter dem Zielpreis, Absicherung beim Erreichen des Limits */
const kaeufe = [];
for (let i = 4; i < 156; i++) {
  const lokal = preis[i] <= Math.min(...preis.slice(i - 4, i + 5));
  if (preis[i] < ZIEL && lokal && (!kaeufe.length || i - kaeufe[kaeufe.length - 1] > 14)) kaeufe.push(i);
}
const sicher = preis.findIndex((v) => v >= LIMIT);
kaeufe.slice(0, 5).forEach((i, k) => {
  fl(GRUEN); doc.circle(X(g.px(i)), Y(g.py(preis[i])), 2.2, 'F'); st(WEISS); doc.setLineWidth(0.5); doc.circle(X(g.px(i)), Y(g.py(preis[i])), 2.2, 'S');
  schrift(6.5, true); fa(WEISS); doc.text(String(k + 1), X(g.px(i)), Y(g.py(preis[i]) + 0.8), { align: 'center' });
});
if (sicher > 0) { fl([200, 90, 50]); doc.circle(X(g.px(sicher)), Y(g.py(preis[sicher])), 2.2, 'F'); st(WEISS); doc.setLineWidth(0.5); doc.circle(X(g.px(sicher)), Y(g.py(preis[sicher])), 2.2, 'S'); schrift(6.5, true); fa(WEISS); doc.text('!', X(g.px(sicher)), Y(g.py(preis[sicher]) + 0.8), { align: 'center' }); }
y = yp + hp + 12;
schrift(6.8); fa(GRAU); doc.text('Schematische Darstellung mit Beispielwerten, keine echten Marktdaten. Grün: Tranchenkäufe unter dem Zielpreis. Orange: Absicherung am Limit.', X(RA), Y(y - 4));
const plan = [['Mengen', 'Welche Mengen je Lieferjahr, je Standort, Strom und Gas'], ['Zeitpunkte', 'Einkaufsfenster und Anzahl der Tranchen'],
  ['Zielpreise', 'Preisniveaus, bei denen wir kaufen'], ['Limits', 'Obergrenzen, ab denen wir absichern'],
  ['Marktüberwachung', 'Terminmarkt, Spotmarkt und Einflussfaktoren laufend im Blick'], ['Reporting', 'Eingekaufte Mengen, Durchschnittspreis, offene Positionen, Budget']];
const sp2 = (BR - 8) / 2; let ya = y + 4, yb = y + 4;
plan.forEach(([t, u], i) => { if (i % 2 === 0) ya = punkt(t, u, X(RA), ya, sp2); else yb = punkt(t, u, X(RA + sp2 + 8), yb, sp2); });
fuss();

/* ================= Seite 7: Batteriespeicher & Lastspitzenkappung ================= */
neueSeite(); seitenband();
y = titel('SPEICHER', 'Batteriespeicher &', 'Lastspitzenkappung');
/* Bild rechts, Text links daneben */
const bw = 82, bh7 = bw * 9 / 16;
doc.saveGraphicsState(); doc.roundedRect(X(RA + BR - bw), Y(y - 4), bw, bh7, 3, 3, null); doc.clip(); doc.discardPath();
doc.addImage(bild('speicher.jpg'), 'JPEG', X(RA + BR - bw), Y(y - 4), bw, bh7); doc.restoreGraphicsState();
const yt = absatz('Netzbetreiber berechnen bei RLM-Kunden einen Leistungspreis für die höchste Spitze des Jahres. Schon wenige Viertelstunden bestimmen damit die Kosten für das ganze Jahr. Ein Batteriespeicher gibt in diesen Momenten Energie ab und kappt die Spitze.', X(RA), Y(y), BR - bw - 7, 9.8);
y = Math.max(yt - B, y - 4 + bh7) + 7;
const cap = 160;
schrift(10, true); fa(NAVY); doc.text('Spitzentag ' + D.tag.split('-').reverse().join('.') + ': Last mit und ohne Speicher', X(RA), Y(y)); y += 7;
const gg = diagramm(D.profil, RA + 8, y, BR - 8, 46, { max: 220, achse: [0, 4, 8, 12, 16, 20].map((h) => [h * 4, String(h).padStart(2, '0') + ':00']),
  linien: [[cap, 'Kappungsgrenze ' + cap + ' kW', GRUEN1]] });
/* gekappter Teil hervorheben */
D.profil.forEach((v, i) => { if (v > cap && i > 0) { dk(0.55); fl([220, 120, 60]); const x0 = gg.px(i - 0.5), x1 = gg.px(i + 0.5); doc.rect(X(x0), Y(gg.py(v)), x1 - x0, gg.py(cap) - gg.py(v), 'F'); dk(1); } });
y += 58;
schrift(6.8); fa(GRAU); doc.text('Orange: Leistung, die der Speicher übernimmt. Beispiel-Lastgang, anonymisiert.', X(RA), Y(y - 3));
/* Rechenbeispiel */
const rk = 56;
karte(RA, y + 2, BR, rk, NAVY);
verlauf(X(RA), Y(y + 2), BR, rk, NAVY1, NAVY2, { r: 3, n: 60 });
schrift(8, true); fa(GRUEN2); doc.text('RECHENBEISPIEL', X(RA + 8), Y(y + 11), { charSpace: 0.8 });
const zeilen = [['Spitzenlast bisher', num(D.spitze, 0) + ' kW'], ['Spitzenlast mit Speicher', cap + ' kW'], ['Gekappte Leistung', num(D.spitze - cap, 0) + ' kW'],
  ['Benötigter Speicher', 'ca. 60 kWh / 30 kW'], ['Leistungspreis (Beispiel)', '100 € je kW und Jahr'], ['Ersparnis Netzentgelt', 'ca. ' + num(Math.round((D.spitze - cap) / 5) * 5 * 100) + ' € pro Jahr']];
zeilen.forEach(([k, v], i) => { const x = RA + 8 + (i % 2) * 84, yy = y + 21 + Math.floor(i / 2) * 11; schrift(8); fa(HELLBLAU); doc.text(k, X(x), Y(yy)); schrift(11.5, true); fa(i === 5 ? GRUEN2 : WEISS); doc.text(v, X(x), Y(yy + 5.2)); });
y += rk + 9;
schrift(6.8); fa(GRAU); doc.text(doc.splitTextToSize('Der Leistungspreis hängt vom Netzgebiet und von den Benutzungsstunden ab und kann deutlich höher oder niedriger sein. Wir berechnen das für Ihren Lastgang.', BR), X(RA), Y(y));
y += 9;
const nutzen = [['Lastspitzen kappen', 'Leistungspreis dauerhaft senken'], ['Eigenverbrauch erhöhen', 'PV-Strom speichern statt einspeisen'], ['Netzentgelte optimieren', 'Grundlage für atypische Netznutzung']];
nutzen.forEach(([t, u], i) => punkt(t, u, X(RA + i * ((BR) / 3)), y, BR / 3 - 2, 9));
fuss();

/* ================= Seite 8: Energienebenkosten ================= */
neueSeite(); seitenband();
y = titel('NEBENKOSTEN', 'Energienebenkosten', 'gezielt senken');
/* Bild rechts (Umspannwerk mit Leitungslinien, Higgsfield) */
const bw8 = 76, bh8 = bw8 * 9 / 16;
bildRund('umspannwerk.jpg', RA + BR - bw8, y - 4, bw8, bh8);
const yt8 = absatz('Ein großer Teil Ihrer Stromrechnung hat mit dem Energiepreis nichts zu tun: Netzentgelte, Steuern, Abgaben und Umlagen. Hier liegen oft Erstattungen und Entlastungen, die ungenutzt bleiben. Wir prüfen Ihre Rechnungen und Voraussetzungen und kümmern uns um die Anträge.', X(RA), Y(y), BR - bw8 - 7, 9.8);
y = Math.max(yt8 - B, y - 4 + bh8) + 8;
/* Balken Preisbestandteile (schematisch) */
schrift(10, true); fa(NAVY); doc.text('Woraus sich ein Strompreis zusammensetzt', X(RA), Y(y)); y += 6;
const teile = [['Energie (Beschaffung)', 42, NAVY2], ['Netzentgelte & Messung', 28, GRUEN1], ['Steuern, Abgaben, Umlagen', 30, [120, 150, 180]]];
let xb = RA;
teile.forEach(([t, w, f]) => { const ww = BR * w / 100; fl(f); doc.rect(X(xb), Y(y), ww, 13, 'F'); schrift(8, true); fa(WEISS); doc.text(t, X(xb + 3), Y(y + 8)); xb += ww; });
y += 18;
schrift(6.8); fa(GRAU); doc.text('Schematische Aufteilung, je nach Netzgebiet, Verbrauch und Jahr sehr unterschiedlich.', X(RA), Y(y)); y += 9;
const hebel = [
  ['Strom- und Energiesteuer', 'Entlastung und Rückerstattung für Unternehmen des produzierenden Gewerbes, soweit die Voraussetzungen vorliegen.'],
  ['Atypische Netznutzung', 'Individuelle Netzentgelte nach § 19 StromNEV, wenn Ihre Spitzen außerhalb der Hochlastzeiten liegen.'],
  ['Konzessionsabgabe', 'Prüfung, ob die richtige Abgabe berechnet wird, und Korrektur, wo sie zu hoch ist.'],
  ['Blindarbeit', 'Kosten für Blindstrom erkennen und durch Kompensation vermeiden.'],
  ['CO2-Kostenkompensation', 'Entlastungswege für stromintensive Unternehmen nutzen, wo möglich.'],
  ['Rechnungsprüfung', 'Abrechnungsfehler, falsche Messkonzepte und versteckte Kosten aufdecken.']];
const hw = (BR - 6) / 2;
hebel.forEach(([t, u], i) => { const x = RA + (i % 2) * (hw + 6), yy = y + Math.floor(i / 2) * 35; karte(x, yy, hw, 31); verlauf(X(x), Y(yy), hw, 1.2, GRUEN1, GRUEN2, { n: 20 });
  schrift(10.5, true); fa(NAVY); doc.text(t, X(x + 5), Y(yy + 8)); absatz(u, X(x + 5), Y(yy + 13.5), hw - 10, 9.2, GRAU, 1.38); });
y += 109;
karte(RA, y, BR, 20, GRUENHELL);
schrift(10, true); fa(NAVY); doc.text('Erfolgsabhängig', X(RA + 6), Y(y + 8));
absatz('Für Erstattungen und Entlastungen arbeiten wir auf Wunsch erfolgsabhängig: Wir verdienen nur, wenn Sie tatsächlich Geld zurückbekommen.', X(RA + 6), Y(y + 13), BR - 12, 8.8, TEXT, 1.35);
log('Seite 8 Kasten bis', (y + 20).toFixed(1));
fuss();

/* ================= Seite 9: Erzeugung, Technik & Förderung ================= */
neueSeite(); seitenband();
y = titel('PARTNERNETZWERK', 'Erzeugung, Technik', '& Förderung');
/* Bild rechts (Solar-Carport mit Ladesäulen, Higgsfield) */
const bw9 = 76, bh9 = bw9 * 9 / 16;
bildRund('carport.jpg', RA + BR - bw9, y - 4, bw9, bh9);
const yt9 = absatz('Eigene Erzeugung und moderne Messtechnik machen Unternehmen unabhängiger von den Märkten. Wir setzen diese Projekte nicht selbst um, sondern über geprüfte Partnerunternehmen, Ausschreibungen und unser Netzwerk, und bleiben Ihr zentraler Ansprechpartner.', X(RA), Y(y), BR - bw9 - 7, 9.8);
y = Math.max(yt9 - B, y - 4 + bh9) + 8;
const technik = [
  ['Photovoltaik', 'Dach- und Freiflächenanlagen, von der Planung bis zur Vermarktung, über Partner oder Ausschreibung.'],
  ['Batteriespeicher', 'Lastspitzen kappen, Eigenverbrauch erhöhen, mit Speichergröße passend zu Ihrem Lastgang.'],
  ['Smartmeter & Messkonzepte', 'Digitale Messsysteme über Messstellenbetreiber und Partner, für genaue Verbrauchsdaten.'],
  ['E-Ladesäulen', 'Ladeinfrastruktur für Fuhrpark, Mitarbeitende und Kunden.'],
  ['Fördermittel', 'Zugang zu erfahrenen Fördermittelberatern für Zuschüsse und Förderkredite.'],
  ['Ein Ansprechpartner', 'Wir koordinieren Partner und Angebote und behalten Ihre Gesamtkosten im Blick.']];
technik.forEach(([t, u], i) => { const x = RA + (i % 2) * (hw + 6), yy = y + Math.floor(i / 2) * 46;
  karte(x, yy, hw, 41); verlauf(X(x + 5), Y(yy + 6), 10, 10, NAVY1, NAVY2, { kreis: true, quer: false, n: 30 });
  fl(GRUEN); doc.circle(X(x + 10), Y(yy + 11), 2.2, 'F');
  schrift(11, true); fa(NAVY); doc.text(t, X(x + 19), Y(yy + 12.5)); absatz(u, X(x + 5), Y(yy + 23), hw - 10, 9.2, GRAU, 1.38); });
y += 142;
karte(RA, y, BR, 24, NAVY); verlauf(X(RA), Y(y), BR, 24, NAVY1, NAVY2, { r: 3, n: 50 });
schrift(10.5, true); fa(WEISS); doc.text('Ausschreibung statt Einzelangebot', X(RA + 7), Y(y + 9));
absatz('Für größere Projekte holen wir Angebote mehrerer Anbieter ein und vergleichen sie für Sie, technisch und wirtschaftlich.', X(RA + 7), Y(y + 15), BR - 14, 8.8, HELLBLAU, 1.35);
log('Seite 9 Kasten bis', (y + 24).toFixed(1));
fuss();

/* ================= Seite 10: Branchen ================= */
neueSeite(); seitenband();
y = titel('BRANCHEN', 'Konzepte für', 'Ihre Branche');
/* Breites Bild (Produktionshalle, Higgsfield), auf 3:1 zugeschnitten */
bildRund('produktion.jpg', RA, y - 4, BR, BR / 3);
y += BR / 3 + 4;
const branchen = [
  ['Industrie & Produktion', 'Hohe Mengen, Schichtbetrieb, Lastspitzen durch Maschinen.', ['Tranchen- und Portfoliobeschaffung', 'Lastspitzenkappung und atypische Netznutzung', 'Strom- und Energiesteuer-Entlastung']],
  ['Logistik & Kühlhäuser', 'Durchgehender Betrieb, Kühlung, wachsender Ladebedarf.', ['Planbare Budgets über mehrere Jahre', 'PV und Speicher auf großen Dachflächen', 'Ladeinfrastruktur für E-Fuhrpark']],
  ['Handel & Filialisten', 'Viele Standorte, unterschiedliche Verträge und Laufzeiten.', ['Ein Beschaffungskonzept für alle Standorte', 'Übersicht und Reporting je Filiale', 'Gebündelte Vertragslaufzeiten']],
  ['Gewerbe & Dienstleister', 'Wenig Zeit für Energiethemen, Kosten sollen planbar sein.', ['Ein Ansprechpartner für alles', 'Passendes Modell statt Standardtarif', 'Rechnungsprüfung und Nebenkosten']]];
branchen.forEach(([t, u, p], i) => { const x = RA + (i % 2) * (hw + 6), yy = y + Math.floor(i / 2) * 78;
  karte(x, yy, hw, 72); verlauf(X(x), Y(yy), hw, 16, NAVY1, NAVY2, { r: 3, n: 40 }); fl(NAVY2); doc.rect(X(x), Y(yy + 10), hw, 6, 'F');
  schrift(11.5, true); fa(WEISS); doc.text(t, X(x + 5), Y(yy + 10.5));
  absatz(u, X(x + 5), Y(yy + 24), hw - 10, 9.2, GRAU, 1.38);
  let yy2 = yy + 39; p.forEach((q) => { yy2 = punkt(q, '', X(x + 4), yy2, hw - 8, 9); }); });
log('Seite 10 Karten bis', (y + 78 + 72).toFixed(1));
fuss();

/* ================= Seite 11: Häufige Fragen ================= */
neueSeite(); seitenband();
y = titel('FAQ', 'Häufige', 'Fragen');
const faq = [
  ['Was kostet die Zusammenarbeit?', 'Das hängt vom Umfang ab. Die Betreuung der Energiebeschaffung ist je nach Vereinbarung ohne oder mit monatlicher Servicepauschale möglich. Für Erstattungen arbeiten wir auf Wunsch erfolgsabhängig.'],
  ['Müssen wir unseren Versorger wechseln?', 'Nicht zwingend. Wir schreiben Ihren Bedarf aus und vergleichen. Bleibt Ihr bisheriger Versorger der beste, bleiben Sie dort.'],
  ['Wie viel Aufwand haben wir?', 'Wenig. Sie stellen uns Rechnungen, Verträge und, falls vorhanden, Lastgänge zur Verfügung. Den Rest übernehmen wir und stimmen Entscheidungen mit Ihnen ab.'],
  ['Wer trifft die Entscheidungen?', 'Immer Sie. Wir bereiten Entscheidungen vor, geben Empfehlungen und setzen um, was Sie freigeben.'],
  ['Wie sicher ist die Versorgung beim Wechsel?', 'Ihre Versorgung läuft ohne Unterbrechung weiter. Wichtig ist nur, dass die Unterlagen rechtzeitig vor Lieferbeginn vorliegen.'],
  ['Was passiert mit unseren Daten?', 'Wir verwenden Ihre Daten nur für Ihre Energiebeschaffung und geben sie nur zur Angebotseinholung an Versorger weiter. Auf Wunsch schließen wir eine Verschwiegenheitserklärung.']];
faq.forEach(([q, a]) => {
  schrift(10.5, true); fa(NAVY); const qz = doc.splitTextToSize(q, BR - 10);
  fl(GRUEN); doc.roundedRect(X(RA), Y(y - 3.8), 1.6, 5, 0.8, 0.8, 'F'); doc.text(qz, X(RA + 5), Y(y)); y += qz.length * 4.6 + 1.5;
  y = absatz(a, X(RA + 5), Y(y), BR - 5, 9.3, TEXT, 1.4) + 7;
});
fuss();

/* ================= Seite 12: Rückseite ================= */
neueSeite();
/* Hintergrundbild über die ganze Seite einschließlich Beschnitt (Higgsfield), bereits abgedunkelt */
doc.addImage(bild('rueckseite.jpg'), 'JPEG', 0, 0, PW, PH);
doc.addImage(logoT, 'PNG', X(RA), Y(30), (420 / 196) * 16, 16);
schrift(26, true); fa(WEISS); doc.text('Sprechen wir über', X(RA), Y(92)); fa(GRUEN2); doc.text('Ihre Energie.', X(RA), Y(104));
verlauf(X(RA), Y(110), 30, 1.5, GRUEN1, GRUEN2, { n: 30, r: 0.75 });
absatz('Wir analysieren Ihren Verbrauch und zeigen Ihnen, welches Beschaffungsmodell und welche Entlastungen für Ihr Unternehmen in Frage kommen. Unverbindlich und persönlich.', X(RA), Y(120), 120, 11, HELLBLAU, 1.45);
const F = { strasse: 'In den Erlenwiesen 11', ort: '66914 Waldmohr', tel: '06373 8920114', mail: 'anfrage@egc-energie.de', web: 'www.egc-energie.de' };
[['Telefon', F.tel], ['E-Mail', F.mail], ['Website', F.web], ['Anschrift', F.strasse + ', ' + F.ort]].forEach(([k, v], i) => {
  const yy = 168 + i * 13; fl(GRUEN); doc.circle(X(RA + 2.2), Y(yy - 1.4), 2.2, 'F');
  schrift(7.5); fa(HELLBLAU); doc.text(k.toUpperCase(), X(RA + 8), Y(yy - 3.5), { charSpace: 0.6 }); schrift(12, true); fa(WEISS); doc.text(v, X(RA + 8), Y(yy + 1.8)); });
if (!P) {
/* Druck: Hinweis auf den persönlichen Ansprechpartner, Visitenkarte und Flyer liegen bei */
karte(RA, 228, BR, 22, NAVY2);
dk(0.07); fl(WEISS); doc.roundedRect(X(RA), Y(228), BR, 22, 3, 3, 'F'); dk(1); st(GRUEN1); doc.setLineWidth(0.4); doc.roundedRect(X(RA), Y(228), BR, 22, 3, 3, 'S');
fl(GRUEN); doc.circle(X(RA + 9), Y(239), 4, 'F'); st(WEISS); doc.setLineWidth(0.5); doc.roundedRect(X(RA + 6.6), Y(237.3), 4.8, 3.4, 0.4, 0.4, 'S');
schrift(10.5, true); fa(WEISS); doc.text('Ihr persönlicher Ansprechpartner', X(RA + 17), Y(237.5));
schrift(9); fa(HELLBLAU); doc.text('Kontaktdaten finden Sie auf der beiliegenden Visitenkarte.', X(RA + 17), Y(243));
} else {
/* Versand: gleiches Feld, darin die Daten des Vertriebspartners, Telefon und E-Mail anklickbar */
const yk = 226, hk = 46;
karte(RA, yk, BR, hk, NAVY2);
dk(0.07); fl(WEISS); doc.roundedRect(X(RA), Y(yk), BR, hk, 3, 3, 'F'); dk(1); st(GRUEN1); doc.setLineWidth(0.4); doc.roundedRect(X(RA), Y(yk), BR, hk, 3, 3, 'S');
schrift(7.5, true); fa(GRUEN2); doc.text('IHR PERSÖNLICHER ANSPRECHPARTNER', X(RA + 8), Y(yk + 10), { charSpace: 0.8 });
schrift(16, true); fa(WEISS); doc.text(P.name, X(RA + 8), Y(yk + 21));
if (P.titel) { schrift(10, true); fa(GRUEN2); doc.text(P.titel, X(RA + 8), Y(yk + 28)); }
if (P.zusatz) { schrift(8.5); fa(HELLBLAU); doc.text(P.zusatz, X(RA + 8), Y(yk + 34)); }
const zeilen = [['Mobil', P.mobil, 'tel:'], ['Telefon', P.telefon, 'tel:'], ['E-Mail', P.email, 'mailto:']].filter((z) => z[1]);
const xr = RA + 98;
zeilen.forEach(([k, v, art], i) => {
  const yy = yk + 13 + i * 11;
  fl(GRUEN); doc.circle(X(xr + 1.6), Y(yy - 1.2), 1.6, 'F');
  schrift(6.8); fa(HELLBLAU); doc.text(k.toUpperCase(), X(xr + 6), Y(yy - 3), { charSpace: 0.6 });
  schrift(10.5, true); fa(WEISS); doc.text(v, X(xr + 6), Y(yy + 1.8));
  doc.link(X(xr + 6), Y(yy - 5), doc.getTextWidth(v), 8, { url: art + (art === 'tel:' ? v.replace(/[^\d+]/g, '') : v) });
});
log('Ansprechpartner', P.name, '·', zeilen.map((z) => z[1]).join(' · '));
}
if (VERSAND) {
  /* Firmendaten anklickbar */
  [['tel:' + F.tel.replace(/\D/g, '')], ['mailto:' + F.mail], ['https://' + F.web], [null]].forEach(([u], i) => {
    if (u) doc.link(X(RA + 8), Y(168 + i * 13 - 5), 80, 8, { url: u }); });
  doc.link(X(W - RA - 44), Y(166), 44, 50, { url: 'https://' + F.web });
}
fl(WEISS); doc.roundedRect(X(W - RA - 44), Y(166), 44, 50, 3, 3, 'F');
doc.addImage(qr, 'PNG', X(W - RA - 39), Y(171), 34, 34);
schrift(7); fa(GRAU); doc.text('www.egc-energie.de', X(W - RA - 22), Y(211), { align: 'center' });
schrift(7.5); fa(HELLBLAU); doc.text('EGC Energie  ·  vertreten durch Karsten Trautmann  ·  USt-IdNr. DE365107489', X(RA), Y(H - 14));

log('Seiten', seite);
return doc;
};
