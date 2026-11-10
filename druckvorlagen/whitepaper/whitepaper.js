/* Whitepaper „Energieeinkauf 2027“ von EGC Energie, A4, Versandfassung ohne Beschnitt.
   Gestaltung wie die Imagebroschüre (Farben, Schrift Liberation Sans, Logo, Bilder).
   Parameter:
     jsPDF, QR      Bibliotheken
     bild(name)     Bild als data:-Adresse (bilder/klein der Broschüre)
     logoT          weißes Logo als data:-Adresse
     schriften      { regular, fett } Liberation Sans als Base64
     D              Beispiel-Lastgang (daten.json der Broschüre)
   Rückgabe: das jsPDF-Dokument.
   Zahlen 2027: Stand 10.11.2026, Quellen auf der letzten Seite. Vor jeder Neuauflage prüfen. */
module.exports = async function baueWhitepaper({ jsPDF, QR, bild, logoT, schriften, D, log = () => {} }) {
const W = 210, H = 297, RA = 18, BR = W - 2 * RA;
const doc = new jsPDF({ unit: 'mm', format: [W, H], compress: true });
doc.addFileToVFS('LS-R.ttf', schriften.regular); doc.addFont('LS-R.ttf', 'LS', 'normal');
doc.addFileToVFS('LS-B.ttf', schriften.fett); doc.addFont('LS-B.ttf', 'LS', 'bold');
doc.setProperties({ title: 'Energieeinkauf 2027 – Leitfaden für Unternehmen', author: 'EGC Energie', subject: 'Strom und Erdgas wirtschaftlich einkaufen' });
const NAVY = [10, 22, 38], NAVY1 = [7, 16, 29], NAVY2 = [27, 58, 96], GRUEN = [108, 180, 59], GRUEN1 = [74, 140, 38],
  GRUEN2 = [150, 206, 96], WEISS = [255, 255, 255], TEXT = [22, 33, 44], GRAU = [107, 119, 135], HELL = [244, 247, 250],
  HELLBLAU = [196, 208, 222], LINIE = [216, 221, 228], GRUENHELL = [236, 246, 228], ROT = [196, 70, 60], NAVYKARTE = [20, 40, 64];
const F = { strasse: 'In den Erlenwiesen 11', ort: '66914 Waldmohr', tel: '06373 8920114', mail: 'anfrage@egc-energie.de', web: 'www.egc-energie.de' };
/* Eine allgemeine Fassung für alle: Kontakt immer EGC, damit das Dokument frei weitergegeben werden kann */
const kontakt = { name: 'EGC Energie', titel: 'Anfrage und Beratung, bundesweit', tel: F.tel, mail: F.mail };
const qr = await QR.toDataURL('https://' + F.web,
  { margin: 0, width: 500, color: { dark: '#0A1626', light: '#FFFFFF' } });

const fl = (c) => doc.setFillColor(...c), st = (c) => doc.setDrawColor(...c), fa = (c) => doc.setTextColor(...c);
const schrift = (g, fett) => { doc.setFont('LS', fett ? 'bold' : 'normal'); doc.setFontSize(g); };
const mische = (a, b, t) => a.map((c, i) => Math.round(c + (b[i] - c) * t));
const dk = (o) => doc.setGState(new doc.GState({ opacity: o, 'stroke-opacity': o }));
const num = (v, d = 0) => v.toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d });
const verlauf = (x, y, w, h, f1, f2, { quer = true, n = 100, r = 0, kreis = false } = {}) => {
  doc.saveGraphicsState();
  if (kreis) doc.circle(x + w / 2, y + h / 2, w / 2, null); else if (r) doc.roundedRect(x, y, w, h, r, r, null); else doc.rect(x, y, w, h, null);
  doc.clip(); doc.discardPath();
  for (let i = 0; i < n; i++) { fl(mische(f1, f2, i / (n - 1))); if (quer) doc.rect(x + i * w / n, y, w / n + 0.2, h, 'F'); else doc.rect(x, y + i * h / n, w, h / n + 0.2, 'F'); }
  doc.restoreGraphicsState();
};
const ring = (x, y, r, o, c = WEISS, lw = 0.5) => { dk(o); st(c); doc.setLineWidth(lw); doc.circle(x, y, r, 'S'); dk(1); };
const zh = (gr, zl) => gr * 0.3528 * zl;
const absatz = (t, x, y, breite, gr = 9.5, farbe = TEXT, zl = 1.45, fett = false) => {
  schrift(gr, fett); fa(farbe); const z = doc.splitTextToSize(t, breite); doc.text(z, x, y, { lineHeightFactor: zl });
  return y + z.length * zh(gr, zl);
};
const hoehe = (t, breite, gr, zl = 1.45, fett = false) => { schrift(gr, fett); return doc.splitTextToSize(t, breite).length * zh(gr, zl); };
const haken = (x, y, f = GRUEN) => { fl(f); doc.circle(x, y - 1.2, 1.9, 'F'); st(WEISS); doc.setLineWidth(0.45);
  doc.line(x - 0.85, y - 1.2, x - 0.25, y - 0.55); doc.line(x - 0.25, y - 0.55, x + 0.95, y - 1.95); };
const kaestchen = (x, y, dunkel) => { st(dunkel ? GRUEN2 : GRUEN1); doc.setLineWidth(0.4); doc.roundedRect(x, y - 3.4, 4, 4, 0.8, 0.8, 'S'); };
const karte = (x, y, w, h, f = HELL, r = 3) => { fl(f); doc.roundedRect(x, y, w, h, r, r, 'F'); };
const rahmen = (x, y, w, h, f = LINIE, r = 3) => { st(f); doc.setLineWidth(0.3); doc.roundedRect(x, y, w, h, r, r, 'S'); };
const navyKarte = (x, y, w, h, r = 3, ringe = true) => {
  verlauf(x, y, w, h, NAVY1, NAVY2, { r, n: 60 });
  if (ringe) { doc.saveGraphicsState(); doc.roundedRect(x, y, w, h, r, r, null); doc.clip(); doc.discardPath();
    ring(x + w - 10, y + 6, 30, 0.08); ring(x + w - 10, y + 6, 42, 0.05); doc.restoreGraphicsState(); }
};
const bildRund = (f, x, y, w, h, r = 3) => { doc.saveGraphicsState(); doc.roundedRect(x, y, w, h, r, r, null); doc.clip(); doc.discardPath(); doc.addImage(bild(f), 'JPEG', x, y, w, h); doc.restoreGraphicsState(); };

let seite = 0, dunkleSeite = false;
const fuss = () => {
  schrift(7); fa(dunkleSeite ? HELLBLAU : GRAU);
  doc.text('Energieeinkauf 2027  ·  EGC Energie  ·  www.egc-energie.de', RA, H - 9);
  doc.text(String(seite).padStart(2, '0'), W - RA, H - 9, { align: 'right' });
  st(dunkleSeite ? NAVY2 : LINIE); doc.setLineWidth(0.2); doc.line(RA, H - 13.5, W - RA, H - 13.5);
};
const neueSeite = (dunkel = false) => {
  if (seite) { fuss(); doc.addPage([W, H]); }
  seite++; dunkleSeite = dunkel;
  if (dunkel) { verlauf(0, 0, W, H, NAVY1, NAVY, { quer: false, n: 80 }); ring(W + 10, -10, 90, 0.05); ring(W + 10, -10, 120, 0.035); }
  else { fl(WEISS); doc.rect(0, 0, W, H, 'F'); verlauf(0, 0, 5, H, NAVY1, NAVY2, { quer: false, n: 60 }); verlauf(5, 0, 1.2, H, GRUEN2, GRUEN1, { quer: false, n: 40 }); }
  /* kleines Logo oben rechts */
  if (dunkel) doc.addImage(logoT, 'PNG', W - RA - 22, 14, 22, 22 * 196 / 420);
  else { fl(NAVY); doc.roundedRect(W - RA - 26, 12, 26, 14, 2, 2, 'F'); doc.addImage(logoT, 'PNG', W - RA - 24, 14, 22, 22 * 196 / 420); }
};
const titel = (kicker, a, b, y = 30, unter) => {
  const hell = dunkleSeite;
  schrift(7.5, true); fa(hell ? GRUEN2 : GRUEN1); doc.text(kicker, RA, y, { charSpace: 1 });
  schrift(22, true); fa(hell ? WEISS : NAVY); doc.text(a, RA, y + 11);
  if (b) { fa(hell ? GRUEN2 : GRUEN1); doc.text(b, RA, y + 20.5); }
  let yy = y + (b ? 25 : 15.5);
  verlauf(RA, yy, 26, 1.3, GRUEN1, GRUEN2, { n: 30, r: 0.65 });
  yy += 9;
  if (unter) yy = absatz(unter, RA, yy, BR, 11, hell ? HELLBLAU : GRAU, 1.4) + 3;
  return yy;
};
const zwischen = (t, y, hell = dunkleSeite) => { fl(GRUEN); doc.roundedRect(RA, y - 3.8, 1.6, 5, 0.8, 0.8, 'F'); schrift(11.5, true); fa(hell ? WEISS : NAVY); doc.text(t, RA + 4.5, y); return y + 7; };
/* Tabelle: spalten [{t, w, fett, farbe, rechts}], zeilen [[...]]; Rückgabe Ende y */
const tabelle = (x, y, spalten, zeilen, { gr = 8.6, kopf = true, dunkel = false, markiere = [] } = {}) => {
  const w = spalten.reduce((s, c) => s + c.w, 0);
  if (kopf) {
    verlauf(x, y, w, 8.5, NAVY1, NAVY2, { r: 2, n: 40 }); fl(NAVY2); doc.rect(x, y + 4, w, 4.5, 'F');
    schrift(7.4, true); fa(WEISS); let xx = x;
    spalten.forEach((c) => { doc.text(c.t, c.rechts ? xx + c.w - 3 : xx + 3, y + 5.6, c.rechts ? { align: 'right' } : {}); xx += c.w; });
    y += 8.5;
  }
  zeilen.forEach((z, j) => {
    const hz = Math.max(...z.map((t, i) => hoehe(String(t), spalten[i].w - 6, gr, 1.32, spalten[i].fett))) + 4.6;
    if (markiere.includes(j)) { fl(GRUENHELL); doc.rect(x, y, w, hz, 'F'); }
    else if (j % 2 === 1) { fl(dunkel ? NAVYKARTE : HELL); doc.rect(x, y, w, hz, 'F'); }
    let xx = x;
    z.forEach((t, i) => {
      const c = spalten[i];
      schrift(gr, c.fett || markiere.includes(j) && i === 0); fa(c.farbe || (dunkel ? WEISS : TEXT));
      const zz = doc.splitTextToSize(String(t), c.w - 6);
      doc.text(zz, c.rechts ? xx + c.w - 3 : xx + 3, y + 4.6, { lineHeightFactor: 1.32, ...(c.rechts ? { align: 'right' } : {}) });
      xx += c.w;
    });
    st(dunkel ? NAVY2 : LINIE); doc.setLineWidth(0.15); doc.line(x, y + hz, x + w, y + hz);
    y += hz;
  });
  return y;
};
/* Hinweisband unten auf der Seite */
const hinweis = (kicker, text, y, dunkel = true) => {
  const hgt = hoehe(text, BR - 12, 9.2, 1.4) + 15;
  if (dunkel) navyKarte(RA, y, BR, hgt); else { karte(RA, y, BR, hgt, GRUENHELL); }
  schrift(7.2, true); fa(dunkel ? GRUEN2 : GRUEN1); doc.text(kicker, RA + 6, y + 8, { charSpace: 0.8 });
  absatz(text, RA + 6, y + 14, BR - 12, 9.2, dunkel ? WEISS : TEXT, 1.4);
  return y + hgt;
};
/* Zahlenkachel */
const kachel = (x, y, w, h, kopf, wert, unter, { dunkel = false, betont = false } = {}) => {
  if (betont) verlauf(x, y, w, h, GRUEN1, GRUEN2, { r: 3, n: 40 }); else if (dunkel) karte(x, y, w, h, NAVYKARTE); else karte(x, y, w, h, HELL);
  const hell = betont || dunkel;
  schrift(7.4, true); fa(betont ? NAVY : hell ? HELLBLAU : GRAU); doc.text(doc.splitTextToSize(kopf, w - 8), x + 4, y + 7);
  schrift(17, true); fa(betont ? NAVY1 : hell ? WEISS : NAVY); doc.text(wert, x + 4, unter ? y + 18 : y + h / 2 + 5);
  if (unter) absatz(unter, x + 4, y + 25, w - 8, 7.4, betont ? NAVY : hell ? HELLBLAU : GRAU, 1.3);
};
const diagramm = (werte, x, y, w, h, { max, achse = [], linien = [], farbe = NAVY2, beschriftung = 'kW', flaecheO = 0.85, hervor = null } = {}) => {
  const mx = max || Math.max(...werte) * 1.08;
  const schrittW = [10, 20, 25, 50, 100, 200].find((s) => mx / s <= 5) || 100;
  st(LINIE); doc.setLineWidth(0.15); schrift(6.5); fa(GRAU);
  for (let v = 0; v <= mx; v += schrittW) { const yy = y + h - (v / mx) * h; doc.line(x, yy, x + w, yy); doc.text(num(v), x - 1.5, yy + 0.9, { align: 'right' }); }
  doc.text(beschriftung, x - 1.5, y - 2.5, { align: 'right' });
  const px = (i) => x + (i / (werte.length - 1)) * w, py = (v) => y + h - (Math.min(v, mx) / mx) * h;
  const pts = werte.map((v, i) => [px(i), py(v)]);
  doc.saveGraphicsState();
  const lines = []; let lx = pts[0][0], ly = y + h;
  lines.push([pts[0][0] - lx, pts[0][1] - ly]); lx = pts[0][0]; ly = pts[0][1];
  for (let i = 1; i < pts.length; i++) { lines.push([pts[i][0] - lx, pts[i][1] - ly]); lx = pts[i][0]; ly = pts[i][1]; }
  lines.push([0, y + h - ly]);
  doc.lines(lines, pts[0][0], y + h, [1, 1], null, true); doc.clip(); doc.discardPath();
  verlauf(x, y, w, h, mische(WEISS, farbe, flaecheO), WEISS, { quer: false, n: 60 });
  doc.restoreGraphicsState();
  st(farbe); doc.setLineWidth(0.35);
  for (let i = 1; i < pts.length; i++) doc.line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]);
  linien.forEach(([v, text, f, links]) => { st(f); doc.setLineWidth(0.5); doc.setLineDashPattern([1.2, 1], 0); doc.line(x, py(v), x + w, py(v)); doc.setLineDashPattern([], 0);
    schrift(7, true); fa(f); if (links) doc.text(text, x + 2, py(v) - 1.3); else doc.text(text, x + w, py(v) - 1.3, { align: 'right' }); });
  if (hervor !== null) { fl(GRUEN); doc.circle(px(hervor), py(werte[hervor]), 1.4, 'F'); }
  schrift(6.5); fa(GRAU); achse.forEach(([i, t]) => doc.text(t, px(i), y + h + 4, { align: 'center' }));
  return { px, py };
};

/* ============ 1 Titel ============ */
neueSeite(true);
doc.addImage(bild('umspannwerk.jpg'), 'JPEG', -1, 0, W + 2, H * 0.62);
/* weicher Übergang vom Bild in das Navy */
doc.saveGraphicsState();
/* Verlauf über die unteren 80 mm des Bildes, am Bildrand vollständig deckend */
const ende1 = H * 0.62, n1 = 40, st1 = 80 / n1;
for (let i = 0; i < n1; i++) { dk(Math.pow((i + 1) / n1, 1.6)); fl(NAVY1); doc.rect(-1, ende1 - 80 + i * st1, W + 2, st1 + 0.15, 'F'); }
dk(1); doc.restoreGraphicsState();
fl(NAVY1); doc.rect(-1, ende1 - 0.2, W + 2, H, 'F');
doc.addImage(logoT, 'PNG', RA, 22, (420 / 196) * 22, 22);
fl(NAVY1); dk(0.55); doc.roundedRect(RA, 118, 82, 9, 4.5, 4.5, 'F'); dk(1);
fl(GRUEN); doc.circle(RA + 5, 122.5, 1.3, 'F');
schrift(8, true); fa(WEISS); doc.text('Für Unternehmen in ganz Deutschland', RA + 9, 123.7);
schrift(36, true); fa(WEISS); doc.text('Energieeinkauf', RA, 148); fa(GRUEN2); doc.text('2027', RA, 162);
schrift(13); fa(HELLBLAU);
doc.text(['Der Leitfaden für Unternehmen:', 'Strom und Erdgas wirtschaftlich einkaufen,', 'Kosten verstehen, Fristen im Griff behalten.'], RA, 176, { lineHeightFactor: 1.45 });
verlauf(RA, 199, 34, 1.6, GRUEN1, GRUEN2, { n: 30, r: 0.8 });
schrift(8, true); fa(GRUEN2); doc.text('RECHENBEISPIEL BEI 250.000 KWH JAHRESVERBRAUCH', RA, 222, { charSpace: 0.8 });
schrift(54, true); fa(WEISS); doc.text('1 ct', RA, 246);
fa(GRUEN2); doc.text('= 2.500 €', RA + doc.getTextWidth('1 ct  '), 246);
absatz('pro Jahr. So viel ist jeder Cent pro Kilowattstunde wert, und das über jedes Jahr der Laufzeit.', RA, 256, 120, 10, HELLBLAU, 1.4);

/* ============ 2 Die Rechnung vorab ============ */
neueSeite(true);
let y = titel('DIE RECHNUNG VORAB', 'Ein Cent klingt nach wenig.', 'Hochgerechnet ist er ein Budget.', 30,
  'Strom und Erdgas werden in Kilowattstunden abgerechnet. Jeder Cent Unterschied pro kWh wirkt deshalb auf die gesamte Jahresmenge und auf jedes Jahr der Laufzeit.');
schrift(8.5, true); fa(HELLBLAU); doc.text('Mehrkosten pro Jahr bei 1 ct/kWh Preisunterschied', RA, y + 2); y += 6;
const mengen = [100000, 250000, 500000, 1000000, 5000000];
const kbw = (BR - 4 * 3) / 5;
mengen.forEach((m, i) => kachel(RA + i * (kbw + 3), y, kbw, 26, num(m) + ' kWh', num(m / 100) + ' €', '', { dunkel: true, betont: i === 1 }));
y += 34;
schrift(8.5, true); fa(HELLBLAU); doc.text('Und über die Laufzeit gerechnet', RA, y); y += 4;
y = tabelle(RA, y, [{ t: 'Jahresverbrauch', w: 44, fett: true }, { t: '1 ct/kWh, 1 Jahr', w: 42, rechts: true }, { t: '1 ct/kWh, 3 Jahre', w: 44, rechts: true }, { t: '2 ct/kWh, 3 Jahre', w: 44, rechts: true, farbe: GRUEN2 }],
  mengen.map((m) => [num(m) + ' kWh', num(m / 100) + ' €', num(m * 3 / 100) + ' €', num(m * 6 / 100) + ' €']), { dunkel: true });
y += 8;
y = absatz('Die Rechnung ist bewusst einfach: Verbrauch in kWh × Preisunterschied in Cent ÷ 100 = Euro pro Jahr. Sie gilt für den Energiepreis, also den Teil Ihres Arbeitspreises, den Sie verhandeln können. Netzentgelte, Steuern und Umlagen sind bei allen Versorgern gleich, dazu mehr auf Seite 8.', RA, y, BR, 9.5, HELLBLAU, 1.45);
hinweis('LIEBER PRÜFEN LASSEN?', 'Mit dem Energiekosten-Check von EGC wissen Sie, wo Ihr Vertrag im Markt steht. Ohne Wechselpflicht. Kontakt auf Seite 21.', 232);

/* ============ 3 Inhalt ============ */
neueSeite();
y = titel('INHALT', 'Was Sie in diesem', 'Leitfaden erwartet', 30);
const teile = [
  ['TEIL 1 · DIE AUSGANGSLAGE', [['2027 auf einen Blick', 4], ['Wer wir sind', 5], ['Für wen dieser Leitfaden ist', 6], ['Sieben Kostenfallen im Energieeinkauf', 7]]],
  ['TEIL 2 · VERSTEHEN', [['Ihre Rechnung lesen: was verhandelbar ist', 8], ['Lastgang und Leistungspreis', 9], ['Die Unterlagen-Checkliste', 10]]],
  ['TEIL 3 · ENTSCHEIDEN', [['Gesamtkosten statt Arbeitspreis', 11], ['Das passende Beschaffungsmodell', 12], ['Entlastungen, die Ihnen zustehen können', 13], ['Erdgas: was anders ist', 14], ['Drei Praxisbeispiele', 15]]],
  ['TEIL 4 · UMSETZEN', [['So läuft es mit EGC', 17], ['Häufige Fragen', 18], ['Ihr Fristenkalender', 19], ['Glossar', 20], ['Ihr Energiekosten-Check', 21], ['Quellen und Hinweise', 22]]]];
const iw = (BR - 6) / 2;
teile.forEach(([k, punkte], i) => {
  const x = RA + (i % 2) * (iw + 6), yy = y + Math.floor(i / 2) * 78, hh = 72;
  if (i === 1) navyKarte(x, yy, iw, hh); else { karte(x, yy, iw, hh); }
  const hell = i === 1;
  fl(hell ? GRUEN : NAVY); doc.roundedRect(x + 6, yy + 6, doc.getTextWidth(k) * 0 + 54, 7, 1.5, 1.5, 'F');
  schrift(6.8, true); fa(hell ? NAVY1 : WEISS); doc.text(k, x + 8, yy + 10.8, { charSpace: 0.5 });
  punkte.forEach(([t, s], j) => {
    const py = yy + 23 + j * 8.4;
    schrift(9.2, true); fa(GRUEN1); if (hell) fa(GRUEN2); doc.text(String(s).padStart(2, '0'), x + 6, py);
    schrift(9.2, true); fa(hell ? WEISS : NAVY); doc.text(doc.splitTextToSize(t, iw - 22)[0], x + 15, py);
  });
});
y += 160;
[['6', 'Vorlagen zum Mitnehmen: Checklisten, Vergleich, Fristenkalender'], ['3', 'Praxisbeispiele mit vollständigem Rechenweg'], ['5', 'Schritte, mit denen wir für Sie einkaufen']].forEach(([z, t], i) => {
  const x = RA + i * ((BR - 8) / 3 + 4), w3 = (BR - 8) / 3;
  verlauf(x, y, w3, 1, GRUEN1, GRUEN2, { n: 20 });
  schrift(20, true); fa(NAVY); doc.text(z, x, y + 12);
  absatz(t, x, y + 19, w3, 8.5, GRAU, 1.35);
});

/* ============ 4 2027 auf einen Blick ============ */
neueSeite(true);
y = titel('01 · 2027 AUF EINEN BLICK', 'Was sich 2027 ändert', 'und was es für Sie bedeutet', 30,
  'Ein großer Teil Ihrer Energiekosten wird nicht vom Versorger bestimmt, sondern vom Gesetzgeber und den Netzbetreibern. Diese vier Werte sollten Sie für 2027 kennen.');
const k4 = (BR - 6) / 2;
[['Übertragungsnetzentgelt 2027', '3,54 ct/kWh', 'vorläufig, statt 2,86 ct/kWh in 2026. Ohne Bundeszuschuss wären es 6,52 ct/kWh.'],
 ['CO₂-Preis Erdgas und Heizöl 2027', '55–65 €/t', 'Der Preiskorridor aus 2026 soll auch 2027 gelten. Ab 2028 ist der EU-Emissionshandel geplant.'],
 ['Stromsteuer-Entlastung', '20 €/MWh', 'für produzierendes Gewerbe auf Antrag, abzüglich 250 € Sockelbetrag pro Jahr.'],
 ['Antragsfrist Stromsteuer 2025', '31.12.2026', 'Ausschlussfrist beim Hauptzollamt. Danach ist die Entlastung für 2025 verloren.']].forEach(([k, v, u], i) => {
  kachel(RA + (i % 2) * (k4 + 6), y + Math.floor(i / 2) * 44, k4, 38, k, v, u, { dunkel: true, betont: i === 3 });
});
y += 96;
y = zwischen('Was das für Sie heißt', y);
[['Netzentgelte steigen weiter.', 'Die Übertragungsnetzbetreiber haben am 1. Oktober 2026 ihre vorläufigen Entgelte für 2027 veröffentlicht. Sie hängen am Bundeszuschuss von 5,525 Mrd. €, dessen Gesetz Anfang Oktober noch nicht beschlossen war. Die endgültigen Werte stehen ab dem 7. Dezember 2026 fest. Ihr regionaler Netzbetreiber gibt die Erhöhung anteilig weiter.'],
 ['Den Energiepreis können Sie steuern.', 'Netzentgelte, Steuern und Umlagen zahlt jeder gleich. Den Energiepreis, den Einkaufszeitpunkt, das Beschaffungsmodell und die Entlastungen bestimmen Sie. Genau dort setzt dieser Leitfaden an.'],
 ['Erdgas bleibt planbar.', 'Mit dem Korridor von 55 bis 65 € je Tonne kostet CO₂ bei Erdgas rund 1,0 bis 1,2 ct/kWh. Für Verträge über 2027 hinaus sollten Sie klären, wie der Versorger die CO₂-Kosten ab 2028 weitergibt.']].forEach(([k, t]) => {
  schrift(9.8, true); fa(GRUEN2); doc.text(k, RA, y);
  y = absatz(t, RA, y + 5.2, BR, 9.2, HELLBLAU, 1.42) + 5;
});
schrift(6.8); fa(HELLBLAU); doc.text('Stand: 10.11.2026. Quellen auf Seite 22. Regulatorische Werte für 2027 sind teils vorläufig.', RA, H - 18);

/* ============ 5 Wer wir sind ============ */
neueSeite();
y = titel('02 · ÜBER UNS', 'Ihre externe', 'Energieeinkaufsabteilung', 30);
const bw5 = 72, bh5 = bw5 / 1.6;
bildRund('beratung.jpg', RA + BR - bw5, y - 2, bw5, bh5);
let yt5 = absatz('EGC Energie ist ein versorgerunabhängiger Energiedienstleister mit Sitz in Waldmohr. Wir kaufen für Unternehmen in ganz Deutschland Strom und Erdgas ein: von der Analyse Ihrer Rechnungen und Ihres Verbrauchs über die Ausschreibung bei vielen Energieversorgern bis zur Betreuung Ihrer Verträge.', RA, y, BR - bw5 - 7, 9.8) + 3;
yt5 = absatz('Wir sind kein Versorger und verkaufen keine eigene Energie. Deshalb empfehlen wir, was zu Ihrem Unternehmen passt, und bleiben auch nach dem Abschluss Ihr Ansprechpartner.', RA, yt5, BR - bw5 - 7, 9.8);
y = Math.max(yt5, y - 2 + bh5) + 10;
const k5 = (BR - 9) / 4;
[['Versorger', 'unabhängig', 'viele Versorger im Vergleich'], ['Strom & Gas', 'aus einer Hand', 'SLP und RLM, ein Standort oder viele'], ['Bundesweit', 'vor Ort und digital', 'Ihr fester Ansprechpartner'], ['Keine', 'Wechselpflicht', 'Sie entscheiden frei']].forEach(([a, b, c], i) => {
  const x = RA + i * (k5 + 3);
  if (i === 3) verlauf(x, y, k5, 34, GRUEN1, GRUEN2, { r: 3, n: 30 }); else karte(x, y, k5, 34);
  schrift(15, true); fa(i === 3 ? NAVY1 : NAVY); doc.text(a, x + 4, y + 12);
  schrift(9, true); fa(i === 3 ? NAVY1 : GRUEN1); doc.text(b, x + 4, y + 19);
  absatz(c, x + 4, y + 25, k5 - 8, 7.6, i === 3 ? NAVY : GRAU, 1.3);
});
y += 44;
y = zwischen('So arbeiten wir', y);
[['Analyse', 'Rechnungen, Verträge und Lastgang auswerten, Ihr Risikoprofil klären.'],
 ['Strategie', 'Beschaffungsmodell, Laufzeit und Einkaufszeitpunkt festlegen.'],
 ['Umsetzung', 'Bedarf bei vielen Versorgern ausschreiben, Angebote vergleichbar machen.'],
 ['Betreuung', 'Fristen überwachen, Rechnungen prüfen, rechtzeitig neu ausschreiben.'],
 ['Nebenkosten', 'Netzentgelte, Steuern und Abgaben prüfen, Entlastungen sichern.']].forEach(([t, u], i) => {
  const yy = y + i * 13;
  verlauf(RA, yy - 4.5, 8, 8, GRUEN2, GRUEN1, { kreis: true, quer: false, n: 20 });
  schrift(9, true); fa(WEISS); doc.text(String(i + 1), RA + 4, yy + 0.9, { align: 'center' });
  schrift(10, true); fa(NAVY); doc.text(t, RA + 12, yy);
  schrift(9); fa(GRAU); doc.text(u, RA + 42, yy);
});
y += 68;
hinweis('UNABHÄNGIG', 'Wir sind an keinen Energieversorger gebunden und vergleichen für Sie den Markt. Bleibt Ihr bisheriger Versorger der beste, bleiben Sie dort.', y);

/* ============ 6 Für wen ============ */
neueSeite();
y = titel('03 · ZIELGRUPPE', 'Für wen dieser Leitfaden', 'gemacht ist', 30, 'Für Unternehmen, bei denen Energie kein Nebenkostenposten ist, sondern ein Budget.');
const hw = (BR - 6) / 2;
karte(RA, y, hw, 70); karte(RA + hw + 6, y, hw, 70);
schrift(10.5, true); fa(GRUEN1); doc.text('Passt gut, wenn …', RA + 6, y + 10);
let yy6 = y + 18;
['Sie mehr als 50.000 kWh Strom oder Erdgas im Jahr verbrauchen.', 'die Energierechnung bei Geschäftsführung, Einkauf oder Buchhaltung landet.', 'Sie mehrere Standorte oder Zähler mit eigenen Verträgen haben.', 'Ihr Vertrag seit Jahren läuft, ohne Vergleich mit dem Markt.'].forEach((t) => {
  haken(RA + 8, yy6); yy6 = absatz(t, RA + 13, yy6, hw - 19, 9, TEXT, 1.35) + 2.5; });
schrift(10.5, true); fa(GRAU); doc.text('Weniger relevant, wenn …', RA + hw + 12, y + 10);
yy6 = y + 18;
['Sie eine eigene Einkaufsabteilung mit Portfoliomanagement für Energie haben.', 'Ihr Verbrauch sehr klein ist: Die Methoden funktionieren, der Hebel in Euro ist geringer.'].forEach((t) => {
  fl(LINIE); doc.circle(RA + hw + 14, yy6 - 1.2, 1.9, 'F'); yy6 = absatz(t, RA + hw + 19, yy6, hw - 19, 9, GRAU, 1.35) + 2.5; });
y += 80;
navyKarte(RA, y, BR, 88);
schrift(12, true); fa(WEISS); doc.text('Selbsttest:', RA + 7, y + 12); fa(GRUEN2); doc.text('Wie gut kennen Sie Ihre Verträge?', RA + 7 + doc.getTextWidth('Selbsttest: '), y + 12);
schrift(7.5); fa(HELLBLAU); doc.text('Jedes „Nein“ ist ein Kapitel, das sich lohnt.', RA + BR - 7, y + 12, { align: 'right' });
['Ich kenne meinen Energiepreis in ct/kWh, getrennt von Netzentgelten und Steuern.', 'Ich weiß, wann mein Vertrag endet und bis wann ich kündigen muss.', 'Ich habe in den letzten zwei Jahren mehr als ein Vergleichsangebot eingeholt.', 'Ich weiß, ob mir Entlastungen bei Stromsteuer oder Netzentgelten zustehen.', 'Bei RLM: Ich kenne meine Jahreshöchstlast und was sie mich kostet.'].forEach((t, i) => {
  const yy = y + 24 + i * 12.5;
  st(NAVY2); doc.setLineWidth(0.2); doc.line(RA + 7, yy - 5.5, RA + BR - 7, yy - 5.5);
  schrift(9.2); fa(WEISS); doc.text(t, RA + 7, yy);
  ['Ja', 'Nein'].forEach((j, k) => { const bx = RA + BR - 34 + k * 14; st(HELLBLAU); doc.setLineWidth(0.3); doc.roundedRect(bx, yy - 4, 12, 5.6, 1.4, 1.4, 'S'); schrift(7.5, true); fa(HELLBLAU); doc.text(j, bx + 6, yy - 0.1, { align: 'center' }); });
});
y += 96;
schrift(9.5, true); fa(NAVY); doc.text('Typische Branchen', RA, y); y += 4;
let bx6 = RA, by6 = y;
['Produzierendes Gewerbe', 'Handwerk und Bäckereien', 'Logistik und Lager', 'Handel und Filialisten', 'Hotellerie und Gastronomie', 'Immobilien und Hausverwaltung', 'Kliniken und Pflege', 'Landwirtschaft'].forEach((t) => {
  schrift(8.2, true); const w = doc.getTextWidth(t) + 8;
  if (bx6 + w > RA + BR) { bx6 = RA; by6 += 9; }
  rahmen(bx6, by6, w, 7, LINIE, 3.5); fa(NAVY); doc.text(t, bx6 + 4, by6 + 4.8); bx6 += w + 3;
});

/* ============ 7 Sieben Kostenfallen ============ */
neueSeite(true);
y = titel('04 · KOSTENFALLEN', 'Sieben Kostenfallen,', 'die jedes Jahr Geld kosten', 30, 'Keine davon ist spektakulär. Alle sind vermeidbar. Die Beträge sind Modellrechnungen bei 250.000 kWh Jahresverbrauch.');
const fallen = [
  ['Der Vertrag verlängert sich still', 'Die Kündigungsfrist verstreicht, der Versorger legt die neuen Preise fest. Niemand vergleicht.', 'z. B. 3 ct/kWh über Markt', '7.500 € pro Jahr'],
  ['Nur der Arbeitspreis wird verglichen', 'Grundpreis, Mengentoleranz und Preisanpassungsklauseln bleiben unbeachtet.', 'günstiger Arbeitspreis, höherer Grundpreis', 'mehrere hundert € pro Jahr'],
  ['Eingekauft wird, wenn der Vertrag ausläuft', 'Vier Wochen vor Ablauf zählt nur der Preis dieses einen Tages.', '0,5 ct/kWh durch ungünstigen Zeitpunkt', '1.250 € pro Jahr'],
  ['Ein Angebot gilt als Vergleich', 'Das Verlängerungsangebot des bisherigen Versorgers wird angenommen.', '1,5 ct/kWh Abstand zum Markt', '3.750 € pro Jahr'],
  ['Entlastungen werden nicht beantragt', 'Stromsteuer-Entlastung und Sonderregeln bei Netzentgelten gibt es nur auf Antrag.', 'Stromsteuer, produzierendes Gewerbe', '4.750 € pro Jahr'],
  ['Eine Lastspitze bestimmt das Jahr', 'Bei RLM zählt die höchste Viertelstunde des Jahres für den Leistungspreis.', '20 kW vermeidbare Spitze × 100 €/kW', '2.000 € pro Jahr'],
  ['Jeder Standort kauft für sich ein', 'Unterschiedliche Verträge, Laufzeiten und Preise, keine Übersicht, kein Mengenvorteil.', 'Bündelung und eine Laufzeit für alle', 'Volumen verschenkt']];
fallen.forEach(([t, u, r, b], i) => {
  const yy = y + i * 25.5;
  karte(RA, yy, BR, 22.5, NAVYKARTE);
  schrift(15, true); fa(GRUEN2); doc.text('0' + (i + 1), RA + 5, yy + 13.5);
  schrift(10, true); fa(WEISS); doc.text(t, RA + 20, yy + 8.5);
  absatz(u, RA + 20, yy + 14, 96, 7.8, HELLBLAU, 1.3);
  schrift(11.5, true); fa(GRUEN2); doc.text(b, RA + BR - 5, yy + 10, { align: 'right' });
  schrift(7.3); fa(HELLBLAU); doc.text(r, RA + BR - 5, yy + 15.5, { align: 'right' });
});
schrift(6.8); fa(HELLBLAU); doc.text('Rechenweg: Verbrauch × Preisunterschied. Stromsteuer: 250 MWh × 20 € − 250 € Sockelbetrag. Werte sind Beispiele, keine Zusage.', RA, H - 18);

/* ============ 8 Rechnung lesen ============ */
neueSeite();
y = titel('05 · VERSTEHEN', 'Ihre Rechnung lesen:', 'was verhandelbar ist', 30, 'Ihr Arbeitspreis besteht aus Teilen, die Sie verhandeln können, und Teilen, die für alle gleich sind. Erst wer beides trennt, kann Angebote richtig vergleichen.');
/* Balken: Bestandteile Strom, Beispiel */
const bal = [['Energiepreis', 12.0, GRUEN1, 'verhandelbar'], ['Netzentgelte', 7.5, NAVY2, 'reguliert, teils optimierbar'], ['Umlagen', 3.62, [80, 110, 145], 'gesetzlich'], ['Stromsteuer', 2.05, [120, 145, 175], 'Entlastung möglich'], ['Konzession', 0.11, [160, 180, 200], '']];
const sumb = bal.reduce((s, b) => s + b[1], 0);
let bx8 = RA;
bal.forEach(([t, v, f]) => { const w = v / sumb * BR; fl(f); doc.rect(bx8, y, w, 12, 'F'); if (w > 16) { schrift(7.4, true); fa(WEISS); doc.text(t, bx8 + 2, y + 7.4); } bx8 += w; });
schrift(6.8); fa(GRAU); doc.text('Beispiel Gewerbestrom, Arbeitspreis netto in ct/kWh, schematisch. Energiepreis und Netzentgelte je nach Vertrag und Netzgebiet.', RA, y + 17);
y += 25;
y = tabelle(RA, y, [{ t: 'Bestandteil Strom 2027', w: 70, fett: true }, { t: 'ct/kWh netto', w: 34, rechts: true }, { t: 'Verhandelbar?', w: 70 }], [
  ['Energiepreis (Beschaffung und Marge des Versorgers)', 'je Vertrag', 'Ja, der größte Hebel'],
  ['Grundpreis des Versorgers', '€ pro Monat', 'Ja'],
  ['Netzentgelte (Arbeits- und bei RLM Leistungspreis)', 'je Netzgebiet', 'Nein, aber teils optimierbar (§ 19 StromNEV)'],
  ['KWKG-Umlage', '0,451', 'Nein'],
  ['Offshore-Netzumlage', '1,143', 'Nein'],
  ['Aufschlag für besondere Netznutzung', '2,027', 'Nein'],
  ['Stromsteuer', '2,050', 'Nein, aber Entlastung möglich'],
  ['Konzessionsabgabe (Sondervertragskunden)', '0,110', 'Nein, Satz prüfen'],
  ['Messstellenbetrieb', '€ pro Jahr', 'Nein']], { gr: 7.9, markiere: [0] });
y += 5;
y = tabelle(RA, y, [{ t: 'Bestandteil Erdgas 2027', w: 70, fett: true }, { t: 'ct/kWh netto', w: 34, rechts: true }, { t: 'Verhandelbar?', w: 70 }], [
  ['Energiepreis', 'je Vertrag', 'Ja, der größte Hebel'],
  ['CO₂-Kosten (55–65 €/t)', 'rund 1,0–1,2', 'Nein, Weitergabe ab 2028 prüfen'],
  ['Energiesteuer', '0,550', 'Nein, Entlastung möglich'],
  ['Konvertierungsumlage', '0,018', 'Nein'],
  ['Netzentgelte, Konzessionsabgabe, Messung', 'je Netzgebiet', 'Nein']], { gr: 7.9, markiere: [0] });
y += 5;
hinweis('FAUSTREGEL', 'Nettobetrag der Rechnung in € ÷ Verbrauch in kWh × 100 = Ihr Durchschnittspreis in ct/kWh. Erst mit dieser Zahl wird ein Vergleich aussagekräftig.', y);

/* ============ 9 Lastgang ============ */
neueSeite();
y = titel('06 · LASTGANG', 'Lastgang und Leistungspreis:', 'die unterschätzte Datenquelle', 30, 'Bei registrierender Leistungsmessung (RLM, beim Strom in der Regel ab 100.000 kWh) wird Ihr Verbrauch alle 15 Minuten erfasst. Diese Daten liegen beim Netzbetreiber vor. Kaum jemand wertet sie aus.');
const kpi = [['Jahresverbrauch', num(D.summe) + ' kWh'], ['Höchstlast', num(D.spitze, 1) + ' kW'], ['Grundlast', 'ca. ' + num(D.grund) + ' kW'], ['Benutzungsstunden', num(D.benutzung) + ' h']];
const kb9 = (BR - 9) / 4;
kpi.forEach(([k, v], i) => { const x = RA + i * (kb9 + 3); karte(x, y, kb9, 19); verlauf(x, y, kb9, 1.4, GRUEN1, GRUEN2, { n: 20 });
  schrift(7.5); fa(GRAU); doc.text(k, x + 4, y + 7.5); schrift(12.5, true); fa(NAVY); doc.text(v, x + 4, y + 14.5); });
y += 30;
schrift(10, true); fa(NAVY); doc.text('Der Tag mit der Jahreshöchstlast, Viertelstundenwerte', RA, y); y += 8;
const hi = D.profil.indexOf(Math.max(...D.profil));
diagramm(D.profil, RA + 8, y, BR - 8, 48, { max: 210, achse: [[0, '0 Uhr'], [24, '6 Uhr'], [48, '12 Uhr'], [72, '18 Uhr'], [95, '24 Uhr']],
  linien: [[D.spitze, 'Jahreshöchstlast ' + num(D.spitze, 1) + ' kW', GRUEN1], [D.spitze - 20, 'mit 20 kW weniger', NAVY2, true]], farbe: NAVY2, hervor: hi });
y += 60;
const t9 = [['01', 'Wie hoch ist Ihre Jahreshöchstlast?', 'Sie bestimmt bei RLM den Leistungspreis im Netzentgelt für das ganze Jahr.'],
  ['02', 'War die Spitze vermeidbar?', 'Oft entsteht sie, wenn mehrere große Verbraucher gleichzeitig anlaufen.'],
  ['03', 'Wie gleichmäßig ist Ihr Profil?', 'Gleichmäßige Profile sind günstiger zu beliefern und kommen für Sonderregeln in Frage.']];
const k9 = (BR - 8) / 3;
t9.forEach(([n, t, u], i) => { const x = RA + i * (k9 + 4); karte(x, y, k9, 36);
  schrift(14, true); fa(GRUEN1); doc.text(n, x + 5, y + 10); schrift(9.2, true); fa(NAVY); const tt = doc.splitTextToSize(t, k9 - 10); doc.text(tt, x + 5, y + 17);
  absatz(u, x + 5, y + 17 + tt.length * 4.1 + 1, k9 - 10, 8, GRAU, 1.3); });
y += 44;
hinweis('RECHENBEISPIEL', 'Leistungspreis 100 €/kW im Jahr (je Netzgebiet sehr unterschiedlich). Eine vermeidbare Spitze von 20 kW kostet damit 2.000 € pro Jahr, jedes Jahr. Lastspitzenkappung, zeitversetztes Anfahren oder ein Batteriespeicher können sich rechnen.', y);
schrift(6.8); fa(GRAU); doc.text('Beispiel-Lastgang eines Gewerbekunden, anonymisiert.', RA, H - 18);

/* ============ 10 Checkliste ============ */
neueSeite();
y = titel('VORLAGE 1', 'Die Unterlagen-Checkliste', 'für ein belastbares Angebot', 30, 'Je vollständiger die Daten, desto genauer die Angebote und desto weniger Risikoaufschlag rechnen die Versorger ein.');
const liste = (x, y, w, kopf, punkte, dunkel) => {
  const yy0 = y;
  const hp = punkte.reduce((s, t) => s + hoehe(t, w - 18, 8.8, 1.35) + 3.4, 0) + 16;
  if (dunkel) navyKarte(x, y, w, hp); else karte(x, y, w, hp);
  schrift(10, true); fa(dunkel ? WEISS : NAVY); doc.text(kopf, x + 6, y + 9.5);
  y += 17;
  punkte.forEach((t) => { kaestchen(x + 6, y, dunkel); y = absatz(t, x + 13, y, w - 18, 8.8, dunkel ? WEISS : TEXT, 1.35) + 3.4; });
  return yy0 + hp;
};
y = liste(RA, y, BR, 'Für alle Kunden (SLP und RLM)', [
  'Letzte Jahresrechnung Strom und Erdgas, vollständig mit allen Seiten',
  'Firmenname genau wie im Handelsregister bzw. bei Creditreform, Anschrift, Ansprechpartner',
  'Bei Einzelunternehmen: Gewerbeanmeldung',
  'Marktlokations-ID (MaLo) und Zählernummer je Abnahmestelle, stehen auf der Rechnung',
  'Jahresverbrauch der letzten 12 Monate in kWh',
  'Vertragsende, Kündigungsfrist und Art der Verlängerung',
  'Welche Preisbestandteile im aktuellen Vertrag fixiert sind',
  'Wirtschaftszweig des Unternehmens (wichtig für die Stromsteuer-Entlastung)',
  'Geplante Änderungen: neue Maschinen, Standorte, Photovoltaik, E-Mobilität',
  'Bei Neueinzug: Mietvertrag oder Übergabeprotokoll mit Zählerstand'], true) + 6;
y = liste(RA, y, BR, 'Zusätzlich bei registrierender Leistungsmessung (RLM)', [
  'Lastgang der letzten 12 Monate als Viertelstundenwerte (CSV oder Excel)',
  'Jahreshöchstlast in kW und Leistungspreis des Netzbetreibers',
  'Bestehende Vereinbarungen zu individuellen Netzentgelten (§ 19 StromNEV)'], false) + 6;
hinweis('TIPP', 'Den Lastgang bekommen Sie von Ihrem Netz- oder Messstellenbetreiber. Mit Ihrer Vollmacht fordern wir ihn für Sie an.', y, false);

/* ============ 11 Gesamtkosten ============ */
neueSeite();
y = titel('07 · ENTSCHEIDEN', 'Gesamtkosten', 'statt Arbeitspreis', 30, 'Zwei Angebote, das mit dem niedrigeren Cent-Betrag gewinnt? Nicht unbedingt. Entscheidend sind die Kosten pro Jahr unter gleichen Bedingungen.');
navyKarte(RA, y, BR, 34);
schrift(7.2, true); fa(GRUEN2); doc.text('DIE FORMEL', RA + 6, y + 8, { charSpace: 0.8 });
schrift(10.5, true); fa(WEISS);
doc.text('Jahreskosten (€ netto) = Arbeitspreis (ct/kWh) ÷ 100 × Jahresverbrauch (kWh)', RA + 6, y + 17);
doc.text('+ 12 × Grundpreis (€/Monat) + bei RLM Leistungspreis × Höchstlast', RA + 6, y + 24.5);
schrift(7.8); fa(HELLBLAU); doc.text('Gleiche Menge, gleicher Lieferzeitraum, gleiche Preisbestandteile in allen Angeboten.', RA + 6, y + 30.5);
y += 42;
y = zwischen('Vorlage 2: Die Angebotsvergleichsmatrix', y);
y = tabelle(RA, y, [{ t: 'Kriterium', w: 58, fett: true }, { t: 'Bisheriger Vertrag', w: 29 }, { t: 'Angebot A', w: 29 }, { t: 'Angebot B', w: 29 }, { t: 'Angebot C', w: 29 }],
  ['Jahresverbrauch (kWh)', 'Lieferbeginn und Laufzeit', 'Arbeitspreis (ct/kWh)', 'Grundpreis (€/Monat)', 'Fixierte Preisbestandteile', 'Mengentoleranz (± %)', 'Preisanpassungsklausel', 'Kündigungsfrist, Verlängerung', 'Jahresgesamtkosten (€)'].map((k) => [k, '', '', '', '']),
  { gr: 8.4, markiere: [8] });
y += 9;
y = zwischen('Ausgefülltes Beispiel bei 250.000 kWh', y);
y = tabelle(RA, y, [{ t: 'Unterschied', w: 70, fett: true }, { t: 'Rechnung', w: 64 }, { t: 'pro Jahr', w: 40, rechts: true, fett: true }], [
  ['Angebot A: Arbeitspreis 0,3 ct/kWh niedriger', '0,3 ÷ 100 × 250.000 kWh', '− 750 €'],
  ['Angebot A: Grundpreis 90 € pro Monat höher', '12 × 90 €', '+ 1.080 €'],
  ['Angebot A ist insgesamt teurer', '', '+ 330 €']], { gr: 8.6, markiere: [2] });
y += 6;
absatz('Der niedrigere Arbeitspreis ist hier das teurere Angebot. Das zeigt nur die Gesamtkostenrechnung. Unsere Angebote enthalten diesen Vergleich auf Wunsch direkt, gegenüber Ihrem bisherigen Versorger.', RA, y, BR, 9.2, GRAU, 1.42);

/* ============ 12 Beschaffungsmodelle ============ */
neueSeite();
y = titel('08 · BESCHAFFUNG', 'Das passende', 'Beschaffungsmodell', 30, 'Es gibt nicht das eine richtige Modell. Entscheidend sind Ihr Verbrauchsprofil, Ihr Budget und wie viel Preisrisiko Sie tragen möchten.');
verlauf(RA, y, BR, 9, NAVY2, GRUEN1, { r: 4.5, n: 60 });
schrift(8, true); fa(WEISS); doc.text('Festpreis', RA + 5, y + 6); doc.text('Tranchen', RA + BR / 2, y + 6, { align: 'center' }); doc.text('Spotmarkt', RA + BR - 5, y + 6, { align: 'right' });
schrift(7); fa(GRAU); doc.text('← mehr Planungssicherheit', RA, y + 14); doc.text('mehr Marktchance →', RA + BR, y + 14, { align: 'right' });
y += 21;
y = tabelle(RA, y, [{ t: 'Modell', w: 34, fett: true }, { t: 'Prinzip', w: 52 }, { t: 'Passt zu', w: 46 }, { t: 'Beachten', w: 42 }], [
  ['Festpreis', 'Ein Preis für die gesamte Laufzeit, Einkauf zu einem Zeitpunkt.', 'Planungssicherheit, kleinere und mittlere Mengen', 'Preis eines einzigen Tages'],
  ['Tranchenmodell', 'Die Menge wird in mehreren Teilen zu gezielten Zeitpunkten eingekauft.', 'größeren Verbrauchern mit Marktinteresse', 'erfordert Marktbeobachtung'],
  ['Spotmarkt / Index', 'Preis folgt dem Börsenpreis, monatlich oder stündlich.', 'flexiblem Verbrauch, hoher Risikobereitschaft', 'Preisschwankungen voll spürbar'],
  ['Spot mit Absicherung', 'Spotbezug, kombiniert mit Preisgrenzen und Teilabsicherung.', 'Flexibilität mit Sicherheitsnetz', 'mehr Steuerungsaufwand'],
  ['PPA / Direktbezug', 'Strom direkt aus einer Erzeugungsanlage, oft über Jahre.', 'langfristigen Preisen, Grünstrom', 'lange Bindung, Mengenrisiko']], { gr: 8.4 });
y += 9;
const k12 = (BR - 6) / 2;
[['Laufzeit', 'Lassen Sie sich immer zwei Laufzeiten anbieten, zum Beispiel 24 und 36 Monate, und rechnen Sie den Unterschied in Euro aus.'],
 ['Zeitpunkt', 'Planen Sie 6 bis 12 Monate vor Lieferbeginn. Dann entscheiden Sie, wann Sie kaufen, und nicht Ihr Vertragsende.']].forEach(([t, u], i) => {
  const x = RA + i * (k12 + 6); karte(x, y, k12, 32); schrift(10.5, true); fa(NAVY); doc.text(t, x + 6, y + 10); absatz(u, x + 6, y + 17, k12 - 12, 8.8, GRAU, 1.38); });
y += 40;
bildRund('produktion.jpg', RA, y, BR, 52);

/* ============ 13 Entlastungen ============ */
neueSeite();
y = titel('09 · ENTLASTUNGEN', 'Entlastungen, die Ihnen', 'zustehen können', 30, 'Der Versorger reicht Steuern, Netzentgelte und Abgaben nur durch. Ob Ihnen eine Entlastung zusteht, prüft er nicht. Die meisten gibt es nur auf Antrag.');
y = tabelle(RA, y, [{ t: 'Entlastung', w: 38, fett: true }, { t: 'Wer kommt in Frage', w: 46 }, { t: 'Was es bringt', w: 46, farbe: GRUEN1, fett: true }, { t: 'Was zu tun ist', w: 44 }], [
  ['Stromsteuer § 9b StromStG', 'Produzierendes Gewerbe, Land- und Forstwirtschaft', '20 € pro MWh, abzüglich 250 € Sockelbetrag pro Jahr', 'Antrag beim Hauptzollamt bis 31.12. des Folgejahres'],
  ['Energiesteuer auf Erdgas', 'Produzierendes Gewerbe, Land- und Forstwirtschaft', 'Teilerstattung der Energiesteuer, je nach Verwendung', 'Antrag beim Hauptzollamt'],
  ['Atypische Netznutzung § 19 Abs. 2 S. 1 StromNEV', 'RLM-Kunden, deren Höchstlast außerhalb der Hochlastzeitfenster liegt', 'reduziertes individuelles Netzentgelt', 'Lastgang auswerten, Vereinbarung mit dem Netzbetreiber'],
  ['Intensive Netznutzung § 19 Abs. 2 S. 2 StromNEV', 'mind. 7.000 Benutzungsstunden und 10 GWh an einer Abnahmestelle', 'individuelles, reduziertes Netzentgelt', 'Vereinbarung mit dem Netzbetreiber, Anzeige bei der BNetzA'],
  ['Konzessionsabgabe', 'Sondervertragskunden', 'reduzierter Satz, unter Grenzpreisen kann sie entfallen', 'Abrechnung prüfen'],
  ['Blindarbeit', 'RLM-Kunden mit Blindstrom-Kosten', 'Kosten vermeiden durch Kompensation', 'Rechnung prüfen, Kompensationsanlage']], { gr: 8.2 });
y += 7;
karte(RA, y, BR, 21, [253, 246, 236]);
fl([214, 140, 60]); doc.circle(RA + 7, y + 7.6, 2.6, 'F'); schrift(8, true); fa(WEISS); doc.text('!', RA + 7, y + 9, { align: 'center' });
absatz('Die Stromsteuer-Entlastung gilt nicht für Handel, Dienstleistung, Logistik oder Gastronomie. Bäckereien und Fleischereien zählen als produzierendes Handwerk. Die Bundesnetzagentur überarbeitet die Netzentgelt-Rabatte nach § 19 StromNEV, wer davon profitiert, sollte die Entwicklung verfolgen.', RA + 13, y + 7, BR - 18, 8.4, TEXT, 1.35);
y += 29;
y = zwischen('Rechenbeispiel Stromsteuer', y);
const k13 = (BR - 16) / 3;
[['Verbrauch', '250 MWh', '= 250.000 kWh'], ['Entlastung', '5.000 €', '250 MWh × 20 €'], ['Nach Sockelbetrag', '4.750 €', '5.000 € − 250 €']].forEach(([k, v, u], i) => {
  const x = RA + i * (k13 + 8);
  if (i === 2) navyKarte(x, y, k13, 32, 3, false); else { karte(x, y, k13, 32, WEISS); rahmen(x, y, k13, 32); }
  schrift(8); fa(i === 2 ? HELLBLAU : GRAU); doc.text(k, x + k13 / 2, y + 8, { align: 'center' });
  schrift(18, true); fa(i === 2 ? GRUEN2 : NAVY); doc.text(v, x + k13 / 2, y + 19, { align: 'center' });
  schrift(7.5); fa(i === 2 ? HELLBLAU : GRAU); doc.text(u, x + k13 / 2, y + 26, { align: 'center' });
  if (i < 2) { schrift(14, true); fa(GRUEN1); doc.text('→', x + k13 + 4, y + 18, { align: 'center' }); }
});
y += 40;
hinweis('FRIST', 'Für den Stromverbrauch 2025 endet die Antragsfrist am 31. Dezember 2026. Es ist eine Ausschlussfrist: Danach ist die Entlastung verloren.', y);

/* ============ 14 Erdgas ============ */
neueSeite();
y = titel('10 · ERDGAS', 'Erdgas:', 'was beim Einkauf anders ist', 30, 'Die Methoden gelten genauso. Vier Unterschiede verändern aber den Vergleich.');
const k14 = (BR - 6) / 2;
[['01', 'Der Verbrauch hängt am Wetter', 'Erdgas dient meist der Wärme. Ein kalter Winter verschiebt die Jahresmenge spürbar. Fragen Sie, was Mehr- und Mindermengen kosten.', false],
 ['02', 'Der Lastgang kommt später', 'Gas wird meist erst ab 1,5 Mio. kWh pro Jahr oder 500 kW stündlich gemessen. Darunter ist Ihre Jahresrechnung die wichtigste Datenquelle.', false],
 ['03', 'CO₂ ist ein eigener Kostenblock', 'Für 2027 soll der nationale CO₂-Preis im Korridor von 55 bis 65 € je Tonne liegen, bei Erdgas rund 1,0 bis 1,2 ct/kWh. Ab 2028 soll der EU-Emissionshandel übernehmen.', true],
 ['04', 'Laufzeiten über 2027 hinaus', 'Klären Sie bei mehrjährigen Verträgen, wie der Versorger die CO₂-Kosten ab 2028 weitergibt: fest eingepreist oder durchgereicht.', false]].forEach(([n, t, u, d], i) => {
  const x = RA + (i % 2) * (k14 + 6), yy = y + Math.floor(i / 2) * 54;
  if (d) navyKarte(x, yy, k14, 48, 3, false); else karte(x, yy, k14, 48);
  schrift(15, true); fa(d ? GRUEN2 : GRUEN1); doc.text(n, x + 6, yy + 12);
  schrift(10, true); fa(d ? WEISS : NAVY); doc.text(t, x + 6, yy + 20);
  absatz(u, x + 6, yy + 26.5, k14 - 12, 8.4, d ? HELLBLAU : GRAU, 1.36);
});
y += 116;
y = liste(RA, y, BR, 'Checkliste Erdgas, zusätzlich zu Vorlage 1', [
  'Jahresverbrauch der letzten drei Jahre, um Witterungseffekte zu erkennen',
  'Mengentoleranz und Kosten für Mehr- und Mindermengen',
  'Regelung zur Weitergabe der CO₂-Kosten ab 2028',
  'Produzierendes Gewerbe: Entlastung bei der Energiesteuer prüfen',
  'Strom und Erdgas gemeinsam ausschreiben, wenn beides gebraucht wird'], false);

/* ============ 15/16 Praxisbeispiele ============ */
const euro = (v) => num(Math.round(v)) + ' €';
const praxis = (y, f) => {
  const sp = [{ t: 'Position', w: 66, fett: true }, { t: 'vorher', w: 30, rechts: true }, { t: 'nachher', w: 30, rechts: true }, { t: 'pro Jahr', w: 48, rechts: true, farbe: GRUEN2, fett: true }];
  /* Kopf */
  navyKarte(RA, y, BR, 30);
  schrift(7.2, true); fa(GRUEN2); doc.text(f.kicker, RA + 6, y + 8, { charSpace: 0.8 });
  schrift(13, true); fa(WEISS); doc.text(f.titel, RA + 6, y + 16);
  schrift(8.4); fa(HELLBLAU); doc.text(f.menge, RA + 6, y + 23);
  schrift(7.2); fa(HELLBLAU); doc.text('Ersparnis pro Jahr', RA + BR - 6, y + 11, { align: 'right' });
  schrift(19, true); fa(GRUEN2); doc.text('− ' + euro(f.summe), RA + BR - 6, y + 22, { align: 'right' });
  y += 34;
  /* Text */
  const tw = BR;
  [['Ausgangslage', f.lage], ['Umgesetzt', f.tat]].forEach(([k, t]) => {
    schrift(8.6, true); fa(NAVY); doc.text(k + ':', RA, y);
    const ww = doc.getTextWidth(k + ': ');
    schrift(8.6); fa(TEXT); const z = doc.splitTextToSize(t, tw - ww); doc.text(z[0], RA + ww, y);
    if (z.length > 1) { const rest = doc.splitTextToSize(z.slice(1).join(' '), tw); doc.text(rest, RA, y + 4.3, { lineHeightFactor: 1.4 }); y += rest.length * 4.25; }
    y += 5.6;
  });
  y = tabelle(RA, y, sp, f.zeilen, { gr: 8.2, markiere: [f.zeilen.length - 1] }) + 3;
  schrift(7); fa(GRAU); const rw = doc.splitTextToSize('Rechenweg: ' + f.rechenweg, BR); doc.text(rw, RA, y + 2, { lineHeightFactor: 1.35 });
  return y + 2 + rw.length * 3.4;
};
const F1 = { kicker: 'FALL 1 · STROM · HANDWERK', titel: 'Bäckerei mit Backstube und drei Filialen', menge: '160.000 kWh Strom pro Jahr · RLM · produzierendes Handwerk',
  lage: 'Der Vertrag beim örtlichen Versorger hatte sich zweimal still verlängert. Energiepreis 17,90 ct/kWh, eine Stromsteuer-Entlastung war nie beantragt worden.',
  tat: 'Ausschreibung bei mehreren Versorgern, Festpreis über 24 Monate, Antrag auf Stromsteuer-Entlastung als produzierendes Handwerk.',
  zeilen: [['Energiepreis (ct/kWh)', '17,90', '13,40', euro(4.5 * 1600)], ['Stromsteuer-Entlastung (§ 9b StromStG)', '–', 'beantragt', euro(160 * 20 - 250)], ['Ersparnis pro Jahr', '', '', '− ' + euro(4.5 * 1600 + 160 * 20 - 250)]],
  rechenweg: '4,50 ct/kWh × 160.000 kWh ÷ 100 = 7.200 €. Stromsteuer: 160 MWh × 20 € − 250 € Sockelbetrag = 2.950 €.',
  summe: 4.5 * 1600 + 160 * 20 - 250 };
const F2 = { kicker: 'FALL 2 · STROM UND ERDGAS · HOTELLERIE', titel: 'Hotel mit Restaurant und Wellnessbereich', menge: '280.000 kWh Strom und 412.000 kWh Erdgas pro Jahr',
  lage: 'Strom und Erdgas liefen bei zwei Versorgern mit unterschiedlichen Laufzeiten. Energiepreise 15,20 ct/kWh (Strom) und 8,10 ct/kWh (Erdgas).',
  tat: 'Laufzeiten synchronisiert, Strom und Erdgas gemeinsam ausgeschrieben, Mengentoleranz für den witterungsabhängigen Gasverbrauch vereinbart.',
  zeilen: [['Strom, Energiepreis (ct/kWh)', '15,20', '12,60', euro(2.6 * 2800)], ['Erdgas, Energiepreis (ct/kWh)', '8,10', '5,60', euro(2.5 * 4120)], ['Ersparnis pro Jahr', '', '', '− ' + euro(2.6 * 2800 + 2.5 * 4120)]],
  rechenweg: 'Strom: 2,60 ct/kWh × 280.000 kWh ÷ 100 = 7.280 €. Erdgas: 2,50 ct/kWh × 412.000 kWh ÷ 100 = 10.300 €.',
  summe: 2.6 * 2800 + 2.5 * 4120 };
const F3 = { kicker: 'FALL 3 · STROM UND ERDGAS · INDUSTRIE', titel: 'Kunststoffverarbeitung im Mehrschichtbetrieb', menge: '6.300.000 kWh Strom (6,3 GWh) und 1.140.000 kWh Erdgas (1,14 GWh) pro Jahr',
  lage: 'Einkauf bisher als Festpreis zu einem Stichtag kurz vor Vertragsende. Eine Lastspitze von 120 kW entstand beim gleichzeitigen Anfahren der Spritzgießmaschinen. Die Stromsteuer-Entlastung wurde beantragt.',
  tat: 'Tranchenbeschaffung über 12 Monate mit Zielpreisen, zeitversetztes Anfahren der Maschinen, Erdgas mit eigener Ausschreibung und geregelter CO₂-Weitergabe ab 2028.',
  zeilen: [['Strom, Energiepreis Durchschnitt (ct/kWh)', '11,80', '10,90', euro(0.9 * 63000)], ['Leistungspreis Netz: 120 kW weniger Spitze', '', '× 110 €/kW', euro(120 * 110)], ['Erdgas, Energiepreis (ct/kWh)', '6,40', '5,30', euro(1.1 * 11400)], ['Ersparnis pro Jahr', '', '', '− ' + euro(0.9 * 63000 + 120 * 110 + 1.1 * 11400)]],
  rechenweg: 'Strom: 0,90 ct/kWh × 6.300.000 kWh ÷ 100 = 56.700 €. Leistungspreis: 120 kW × 110 €/kW = 13.200 €. Erdgas: 1,10 ct/kWh × 1.140.000 kWh ÷ 100 = 12.540 €.',
  summe: 0.9 * 63000 + 120 * 110 + 1.1 * 11400 };
neueSeite();
y = titel('11 · PRAXIS', 'Drei Praxisbeispiele,', 'vom Handwerk bis zur Industrie', 30, 'Drei typische Ausgangslagen als Modellrechnung, netto und mit vollständigem Rechenweg.');
y = praxis(y, F1) + 9;
y = praxis(y, F2);
neueSeite();
y = titel('11 · PRAXIS', 'Je größer der Verbrauch,', 'desto mehr ist jeder Hebel wert', 30);
y = praxis(y, F3) + 9;
y = zwischen('Was bedeutet das bei Ihrem Verbrauch?', y);
y = tabelle(RA, y, [{ t: 'Fall', w: 58, fett: true }, { t: 'Verbrauch', w: 46, rechts: true }, { t: 'Ersparnis pro Jahr', w: 34, rechts: true }, { t: 'über 3 Jahre', w: 36, rechts: true, fett: true }], [
  ['Fall 1 · Bäckerei', '160.000 kWh', euro(F1.summe), euro(F1.summe * 3)],
  ['Fall 2 · Hotel', '692.000 kWh', euro(F2.summe), euro(F2.summe * 3)],
  ['Fall 3 · Industrie', '7.440.000 kWh', euro(F3.summe), euro(F3.summe * 3)]], { gr: 8.6 }) + 7;
hinweis('MODELLRECHNUNG, KEINE ZUSAGE', 'Die Fälle zeigen typische Ausgangslagen mit gerundeten Marktwerten. Wie viel bei Ihnen möglich ist, zeigt nur Ihre eigene Rechnung: Der Energiekosten-Check auf Seite 21 rechnet es für Sie aus.', y);

/* ============ 17 So läuft es mit EGC ============ */
neueSeite(true);
y = titel('12 · ZUSAMMENARBEIT', 'So läuft es', 'mit EGC Energie', 30, 'Ihr Aufwand: die letzte Jahresrechnung und eine Vollmacht. Den Rest übernehmen wir und stimmen jede Entscheidung mit Ihnen ab.');
const ablauf = [
  ['Unterlagen', 'Sie geben uns Rechnung, Verbrauch und, falls vorhanden, den Lastgang. Fehlt etwas, melden wir uns gezielt.'],
  ['Kalkulation', 'Unser Kalkulationsteam holt Preise bei vielen Versorgern ein, mit identischen Eckdaten für alle.'],
  ['Angebot', 'Sie erhalten ein Angebot mit Jahresgesamtkosten, auf Wunsch im direkten Vergleich zu Ihrem bisherigen Versorger.'],
  ['Entscheidung', 'Sie entscheiden. Auch Teilannahmen sind möglich, etwa nur Strom oder nur Erdgas, oder eine andere Laufzeit.'],
  ['Wechsel', 'Der neue Versorger übernimmt Kündigung und Anmeldung. Ihre Versorgung läuft ohne Unterbrechung weiter.'],
  ['Betreuung', 'Wir prüfen die Lieferbestätigung, behalten Fristen im Blick und melden uns rechtzeitig vor Vertragsende.']];
ablauf.forEach(([t, u], i) => {
  const yy = y + i * 28;
  if (i < ablauf.length - 1) { st(GRUEN2); doc.setLineWidth(0.7); doc.setLineDashPattern([1.2, 1.4], 0); doc.line(RA + 7, yy + 9, RA + 7, yy + 26); doc.setLineDashPattern([], 0); }
  verlauf(RA, yy - 2, 14, 14, GRUEN2, GRUEN1, { kreis: true, quer: false, n: 30 });
  schrift(13, true); fa(NAVY1); doc.text(String(i + 1), RA + 7, yy + 7.3, { align: 'center' });
  karte(RA + 21, yy - 4, BR - 21, 23, NAVYKARTE);
  schrift(11, true); fa(WEISS); doc.text(t, RA + 27, yy + 3.4);
  absatz(u, RA + 27, yy + 9.4, BR - 34, 8.6, HELLBLAU, 1.36);
});
y += 6 * 28 + 2;
hinweis('KEINE WECHSELPFLICHT', 'Bleibt Ihr bisheriger Versorger der beste, bleiben Sie dort. Dann haben Sie Gewissheit statt Bauchgefühl.', y);

/* ============ 16 Häufige Fragen ============ */
neueSeite();
y = titel('13 · HÄUFIGE FRAGEN', 'Was wir im Erstgespräch', 'am häufigsten hören', 30);
const unterschied = [['Lieferant', 'verkauft die Energie', 'frei wählbar', true], ['Netzbetreiber', 'transportiert die Energie', 'bleibt gleich', false], ['Messstellenbetreiber', 'betreibt Ihren Zähler', 'bleibt gleich', false]];
const k16 = (BR - 8) / 3;
unterschied.forEach(([t, u, v, b], i) => { const x = RA + i * (k16 + 4);
  if (b) verlauf(x, y, k16, 24, GRUEN1, GRUEN2, { r: 3, n: 30 }); else karte(x, y, k16, 24);
  schrift(10.5, true); fa(b ? NAVY1 : NAVY); doc.text(t, x + 5, y + 9); schrift(8); fa(b ? NAVY : GRAU); doc.text(u, x + 5, y + 14.5);
  schrift(7.2, true); fa(b ? NAVY1 : GRUEN1); doc.text(v.toUpperCase(), x + 5, y + 20.5, { charSpace: 0.5 }); });
y += 33;
[['„Wir sind seit Jahren beim Stadtwerk, läuft doch alles.“', 'Dass alles läuft, liegt am Netz, nicht am Vertrag. Das Netz bleibt beim Wechsel dasselbe. Treue wird beim Energiepreis selten belohnt.'],
 ['„Wir haben keine Zeit, uns damit zu beschäftigen.“', 'Ihr Aufwand ist die letzte Jahresrechnung und eine Vollmacht. Ausschreibung, Vergleich, Kündigung und Anmeldung übernehmen wir und der neue Versorger.'],
 ['„Zahlen wir beim Wechsel doppelt?“', 'Nein. Der neue Vertrag beginnt, wenn der alte endet, ohne Überschneidung. Der Lieferantenwechsel ist gesetzlich geregelt (§ 20a EnWG).'],
 ['„Wird dann der Zähler getauscht?“', 'Nein. Der Zähler gehört dem Messstellenbetreiber und bleibt. Es werden nur Daten ausgetauscht. Niemand muss in Ihren Betrieb.'],
 ['„Wie lange sind wir dann gebunden?“', 'So lange, wie Sie es entscheiden. Wir lassen uns verschiedene Laufzeiten anbieten, zum Beispiel 24 und 36 Monate, und rechnen den Unterschied in Euro für Sie aus.'],
 ['„Wir haben schon einen Berater.“', 'Dann ist ein Vergleich die einfachste Bestätigung. Sind Ihre Konditionen marktgerecht, wissen Sie es danach schwarz auf weiß.']].forEach(([q, a]) => {
  const ha = hoehe(a, BR - 14, 8.9, 1.4) + 15;
  karte(RA, y, BR, ha); fl(GRUEN); doc.roundedRect(RA, y, 1.8, ha, 0.9, 0.9, 'F');
  schrift(10, true); fa(NAVY); doc.text(q, RA + 7, y + 7.5);
  absatz(a, RA + 7, y + 13.4, BR - 14, 8.9, GRAU, 1.4);
  y += ha + 4;
});

/* ============ 17 Fristenkalender ============ */
neueSeite();
y = titel('VORLAGE 3', 'Ihr Fristenkalender', 'für das Jahr vor dem Vertragsende', 30, 'Beispiel: Vertragsende 31.12.2027, Kündigungsfrist drei Monate. Ersetzen Sie die Termine durch Ihre eigenen.');
const k17 = (BR - 8) / 3;
['Zuständige Person', 'Vertretung', 'Erinnerung am'].forEach((t, i) => { const x = RA + i * (k17 + 4);
  st(HELLBLAU); doc.setLineWidth(0.3); doc.setLineDashPattern([1, 1], 0); doc.roundedRect(x, y, k17, 17, 2.5, 2.5, 'S'); doc.setLineDashPattern([], 0);
  schrift(7.5); fa(GRAU); doc.text(t, x + 4, y + 6); schrift(10, true); fa(GRUEN1); doc.text('[ ' + (i === 2 ? 'Datum' : 'Name') + ' ]', x + 4, y + 13); });
y += 27;
const termine = [
  ['Januar 2027', 'Unterlagen nach Vorlage 1 zusammenstellen, Lastgang 2026 anfordern', 0],
  ['Februar – März 2027', 'Jahresabrechnungen 2026 prüfen, Durchschnittspreis ausrechnen', 0],
  ['April – Juni 2027', 'Beschaffungsmodell und Laufzeitvarianten festlegen, Markt beobachten', 0],
  ['30. Juni 2027', 'Meldefrist bei der Bundesnetzagentur für individuelle Netzentgelte (falls vereinbart)', 1],
  ['Juli – August 2027', 'Angebote einholen und vergleichen (Vorlage 2), Entscheidung vorbereiten', 2],
  ['spätestens 30. September 2027', 'Kündigung des laufenden Vertrags ist beim Versorger eingegangen', 1],
  ['Oktober 2027', 'Vorläufige Netzentgelte 2028 werden veröffentlicht, Budget anpassen', 0],
  ['31. Dezember 2027', 'Frist für den Stromsteuer-Entlastungsantrag für das Verbrauchsjahr 2026', 1],
  ['1. Januar 2028', 'Lieferbeginn des neuen Vertrags, erste Rechnung gegen den Vertrag prüfen', 3]];
st(LINIE); doc.setLineWidth(0.8); doc.line(RA + 58, y - 2, RA + 58, y + termine.length * 13 - 6);
termine.forEach(([d, t, art], i) => {
  const yy = y + i * 13;
  if (art === 1) { fl([253, 246, 236]); doc.roundedRect(RA, yy - 5.2, BR, 9.6, 2, 2, 'F'); }
  schrift(8.8, true); fa(art === 1 ? [214, 140, 60] : NAVY); doc.text(d, RA + 53, yy, { align: 'right' });
  const f = art === 1 ? [214, 140, 60] : art === 2 ? NAVY : art === 3 ? GRUEN1 : HELLBLAU;
  fl(f); if (art === 1) { doc.saveGraphicsState(); doc.lines([[2, 2], [-2, 2], [-2, -2], [2, -2]], RA + 58, yy - 3.4, [1, 1], 'F', true); doc.restoreGraphicsState(); } else doc.circle(RA + 58, yy - 1.3, 1.8, 'F');
  schrift(9, art > 0); fa(TEXT); doc.text(doc.splitTextToSize(t, BR - 66), RA + 64, yy, { lineHeightFactor: 1.3 });
});
y += termine.length * 13 + 4;
hinweis('KLARE ZUSTÄNDIGKEIT', 'Benennen Sie eine Person mit Vertretung, die für Energie verantwortlich ist. Ohne Namen im Kalender verlängert sich der Vertrag wieder still. Als EGC-Kunde übernehmen wir die Fristen für Sie.', y);

/* ============ 18 Glossar ============ */
neueSeite();
y = titel('14 · GLOSSAR', 'Die wichtigsten Begriffe,', 'in einem Satz erklärt', 30);
y = tabelle(RA, y, [{ t: 'Begriff', w: 46, fett: true }, { t: 'Bedeutung', w: 128 }], [
  ['Arbeitspreis', 'Preis pro verbrauchter kWh, setzt sich aus Energiepreis, Netzentgelten, Umlagen und Steuern zusammen.'],
  ['Energiepreis', 'Der Teil des Arbeitspreises, den der Versorger für Beschaffung und Vertrieb berechnet: der verhandelbare Teil.'],
  ['Grundpreis', 'Fester Betrag pro Monat oder Jahr, unabhängig vom Verbrauch.'],
  ['Leistungspreis', 'Netzentgelt für die höchste Leistung im Jahr, bei RLM-Kunden in € pro kW.'],
  ['Lastgang', 'Ihr Verbrauch in Viertelstundenwerten über das ganze Jahr.'],
  ['RLM', 'Registrierende Leistungsmessung, beim Strom in der Regel ab 100.000 kWh pro Jahr.'],
  ['SLP', 'Standardlastprofil für kleinere Verbraucher ohne Viertelstundenmessung.'],
  ['Benutzungsstunden', 'Jahresverbrauch geteilt durch Jahreshöchstlast, bestimmt die Preisstufe der Netzentgelte.'],
  ['Marktlokation (MaLo)', '11-stellige Kennung Ihrer Abnahmestelle, steht auf der Rechnung.'],
  ['Mengentoleranz', 'Spielraum, um den Ihr Verbrauch von der vereinbarten Menge abweichen darf, ohne Zusatzkosten.'],
  ['Tranche', 'Teilmenge, die zu einem bestimmten Zeitpunkt eingekauft wird.'],
  ['Hochlastzeitfenster', 'Zeiten mit der höchsten Netzlast, entscheidend für die atypische Netznutzung.'],
  ['Lieferant', 'Unternehmen, das Ihnen die Energie verkauft, frei wählbar.'],
  ['Netzbetreiber', 'Betreibt die Leitungen in Ihrer Region, nicht wählbar.'],
  ['Messstellenbetreiber', 'Zuständig für Ihren Zähler und die Messdaten.']], { gr: 8.6 });

/* ============ 19 Energiekosten-Check ============ */
neueSeite(true);
doc.addImage(bild('rueckseite.jpg'), 'JPEG', 0, 0, W, H);
doc.addImage(logoT, 'PNG', W - RA - 22, 14, 22, 22 * 196 / 420);
y = titel('IHR NÄCHSTER SCHRITT', 'Ihr persönlicher', 'Energiekosten-Check', 30, 'Sie schicken uns Ihre letzte Jahresrechnung. Wir zeigen Ihnen, wo Ihr Vertrag im Markt steht und was möglich ist.');
const k19 = (BR - 6) / 3;
[['Ihr Markt', 'im Vergleich'], ['Strom & Gas', 'SLP und RLM'], ['Keine', 'Wechselpflicht']].forEach(([a, b], i) => {
  const x = RA + i * (k19 + 3);
  if (i === 0) verlauf(x, y, k19, 26, GRUEN1, GRUEN2, { r: 3, n: 30 }); else { dk(0.85); karte(x, y, k19, 26, NAVYKARTE); dk(1); }
  schrift(16, true); fa(i === 0 ? NAVY1 : WEISS); doc.text(a, x + 5, y + 12); schrift(8.5, true); fa(i === 0 ? NAVY : HELLBLAU); doc.text(b, x + 5, y + 19.5); });
y += 34;
schrift(9.5, true); fa(WEISS); doc.text('Das bekommen Sie', RA, y); y += 6;
[['Ihr Einsparpotenzial in Euro', 'pro Jahr und über die Laufzeit, für Strom und Erdgas'], ['Ihre Preisposition', 'wo Ihre Konditionen im Markt stehen'], ['Das passende Beschaffungsmodell', 'Festpreis, Tranchen oder Spot, passend zu Ihrem Profil'], ['Eine klare Empfehlung', 'ob Handlungsbedarf besteht. Sie entscheiden frei.']].forEach(([t, u], i) => {
  const x = RA + (i % 2) * (k14 + 6), yy = y + Math.floor(i / 2) * 20;
  dk(0.85); karte(x, yy, k14, 17, NAVYKARTE); dk(1);
  haken(x + 6, yy + 7); schrift(9.2, true); fa(WEISS); doc.text(t, x + 11, yy + 7); schrift(7.8); fa(HELLBLAU); doc.text(u, x + 11, yy + 12.5);
});
y += 46;
absatz('Halten Sie bereit: letzte Jahresrechnung Strom und Erdgas, Vertragsende falls bekannt, bei mehreren Standorten eine Zählerliste, bei RLM den Lastgang.', RA, y, BR, 8.8, HELLBLAU, 1.4);
/* Kontaktfeld */
const yk = 205, hk = 52;
fl(WEISS); doc.roundedRect(RA, yk, BR - 50, hk, 3, 3, 'F');
schrift(7.5, true); fa(GRUEN1); doc.text('IHR KONTAKT', RA + 7, yk + 10, { charSpace: 0.8 });
schrift(15, true); fa(NAVY); doc.text(kontakt.name, RA + 7, yk + 20);
if (kontakt.titel) { schrift(9.5, true); fa(GRUEN1); doc.text(kontakt.titel, RA + 7, yk + 26.5); }
[['Telefon', kontakt.tel, 'tel:'], ['E-Mail', kontakt.mail, 'mailto:']].filter((z) => z[1]).forEach(([k, v, art], i) => {
  const yy = yk + 36 + i * 8.5;
  schrift(7); fa(GRAU); doc.text(k.toUpperCase(), RA + 7, yy, { charSpace: 0.5 });
  schrift(10, true); fa(NAVY); doc.text(v, RA + 26, yy);
  doc.link(RA + 26, yy - 4.5, doc.getTextWidth(v), 6, { url: art + (art === 'tel:' ? v.replace(/[^\d+]/g, '') : v) });
});
fl(WEISS); doc.roundedRect(RA + BR - 44, yk, 44, hk, 3, 3, 'F');
doc.addImage(qr, 'PNG', RA + BR - 38, yk + 5, 32, 32);
schrift(7.5, true); fa(NAVY); doc.text('Scannen und anfragen', RA + BR - 22, yk + 44, { align: 'center' });
doc.link(RA + BR - 44, yk, 44, hk, { url: 'https://' + F.web });
verlauf(RA, yk + hk + 5, BR, 12, GRUEN1, GRUEN2, { r: 3, n: 40 });
schrift(10.5, true); fa(NAVY1); doc.text('Energiekosten-Check anfragen  →', RA + 6, yk + hk + 12.8);
schrift(8.5, true); doc.text(kontakt.mail, RA + BR - 6, yk + hk + 12.8, { align: 'right' });
doc.link(RA, yk + hk + 5, BR, 12, { url: 'mailto:' + kontakt.mail + '?subject=Energiekosten-Check' });

/* ============ 20 Quellen ============ */
neueSeite(true);
y = titel('15 · ANHANG', 'Quellen und', 'rechtliche Hinweise', 30);
y = zwischen('Quellen', y, true);
[['Übertragungsnetzbetreiber (50Hertz, Amprion, TenneT, TransnetBW)', 'Vorläufige Netzentgelte 2027, veröffentlicht am 01.10.2026, netztransparenz.de'],
 ['Bundesregierung', 'Bundeszuschuss zu den Übertragungsnetzentgelten 2027, Kabinettsbeschluss September 2026'],
 ['Deutscher Bundestag', 'Änderung des Brennstoffemissionshandelsgesetzes (BEHG): CO₂-Preis 2027 im Korridor 55 bis 65 €/t, bundestag.de'],
 ['Generalzolldirektion', 'Steuerentlastung nach § 9b StromStG, Voraussetzungen und Fristen, zoll.de'],
 ['Bundesnetzagentur', 'Individuelle Netzentgelte nach § 19 StromNEV; Lieferantenwechsel, bundesnetzagentur.de'],
 ['Netztransparenz.de', 'Umlagen 2027: KWKG-Umlage, Offshore-Netzumlage, Aufschlag für besondere Netznutzung'],
 ['Energiewirtschaftsgesetz', '§ 20a EnWG, Lieferantenwechsel']].forEach(([a, b]) => {
  schrift(9, true); fa(WEISS); doc.text(a, RA, y); y = absatz(b, RA, y + 4.8, BR, 8.4, HELLBLAU, 1.35) + 4;
});
y += 4;
y = zwischen('Rechtlicher Hinweis', y, true);
y = absatz('Dieser Leitfaden dient der allgemeinen Information. Er ersetzt keine Rechts-, Steuer- oder Energieberatung im Einzelfall. Alle Angaben wurden sorgfältig recherchiert; eine Gewähr für Vollständigkeit und Aktualität übernehmen wir nicht. Stand aller Angaben: 10. November 2026. Regulatorische Werte für 2027 sind teils vorläufig und können sich bis zum Jahresende ändern. Alle Beträge sind Modellrechnungen und keine Zusage einer Ersparnis. Der Beispiel-Lastgang stammt von einem Gewerbekunden und ist anonymisiert.', RA, y, BR, 8.6, HELLBLAU, 1.45);
doc.addImage(logoT, 'PNG', W / 2 - 22, 222, 44, 44 * 196 / 420);
schrift(13, true); fa(GRUEN2); doc.text('Energie strategisch beschaffen.', W / 2, 250, { align: 'center' });
schrift(8); fa(HELLBLAU); doc.text('EGC Energie  ·  ' + F.strasse + '  ·  ' + F.ort + '  ·  ' + F.web, W / 2, 258, { align: 'center' });
doc.text('vertreten durch Karsten Trautmann  ·  USt-IdNr. DE365107489', W / 2, 263, { align: 'center' });
doc.link(W / 2 - 40, 254, 80, 6, { url: 'https://' + F.web });
fuss();
log('Seiten', seite);
return doc;
};
