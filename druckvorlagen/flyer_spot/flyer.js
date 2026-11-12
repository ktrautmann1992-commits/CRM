/* Flyer „Spotmarkt mit Festpreis-Option“, eine Seite A4 im EGC-Design.
   Aufruf aus dem Repository-Wurzelverzeichnis: node druckvorlagen/flyer_spot/flyer.js [ausgabe.pdf]
   Schrift, Bilder und Logo kommen aus der Imagebroschüre. */
const path = require('path');
const fs = require('fs');
const W0 = path.join(__dirname, '..', '..');
const BR0 = path.join(W0, 'druckvorlagen', 'broschuere');
const { jsPDF } = require(path.join(W0, 'node_modules', 'jspdf', 'dist', 'jspdf.node.min.js'));
const QR = require(path.join(W0, 'node_modules', 'qrcode'));
const AUSGABE = process.argv[2] || path.join(__dirname, 'EGC_Flyer_Spotmarkt_Festpreis.pdf');

(async () => {
const W = 210, H = 297, RA = 16, BR = W - 2 * RA;
const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
const ttf = (f) => fs.readFileSync(path.join(BR0, 'schrift', f)).toString('base64');
doc.addFileToVFS('LS-R.ttf', ttf('LiberationSans-Regular.ttf')); doc.addFont('LS-R.ttf', 'LS', 'normal');
doc.addFileToVFS('LS-B.ttf', ttf('LiberationSans-Bold.ttf')); doc.addFont('LS-B.ttf', 'LS', 'bold');
doc.setProperties({ title: 'Spotmarkt mit Festpreis-Option – EGC Energie', author: 'EGC Energie' });
const bild = (f) => 'data:image/jpeg;base64,' + fs.readFileSync(path.join(BR0, 'bilder', 'klein', f)).toString('base64');
const logoT = 'data:image/png;base64,' + fs.readFileSync(path.join(W0, 'logo-weiss.png')).toString('base64');
const qr = await QR.toDataURL('https://www.egc-energie.de', { margin: 0, width: 400, color: { dark: '#0A1626', light: '#FFFFFF' } });

const NAVY = [10, 22, 38], NAVY1 = [7, 16, 29], NAVY2 = [27, 58, 96], GRUEN = [108, 180, 59], GRUEN1 = [74, 140, 38],
  GRUEN2 = [150, 206, 96], WEISS = [255, 255, 255], TEXT = [22, 33, 44], GRAU = [107, 119, 135], HELL = [244, 247, 250],
  HELLBLAU = [196, 208, 222], LINIE = [216, 221, 228], GRUENHELL = [236, 246, 228];
const fl = (c) => doc.setFillColor(...c), st = (c) => doc.setDrawColor(...c), fa = (c) => doc.setTextColor(...c);
const schrift = (g, fett) => { doc.setFont('LS', fett ? 'bold' : 'normal'); doc.setFontSize(g); };
const mische = (a, b, t) => a.map((c, i) => Math.round(c + (b[i] - c) * t));
const dk = (o) => doc.setGState(new doc.GState({ opacity: o, 'stroke-opacity': o }));
const verlauf = (x, y, w, h, f1, f2, { quer = true, n = 80, r = 0, kreis = false } = {}) => {
  doc.saveGraphicsState();
  if (kreis) doc.circle(x + w / 2, y + h / 2, w / 2, null); else if (r) doc.roundedRect(x, y, w, h, r, r, null); else doc.rect(x, y, w, h, null);
  doc.clip(); doc.discardPath();
  for (let i = 0; i < n; i++) { fl(mische(f1, f2, i / (n - 1))); if (quer) doc.rect(x + i * w / n, y, w / n + 0.2, h, 'F'); else doc.rect(x, y + i * h / n, w, h / n + 0.2, 'F'); }
  doc.restoreGraphicsState();
};
const absatz = (t, x, y, b, gr = 9.5, f = TEXT, zl = 1.4, fett = false) => { schrift(gr, fett); fa(f); const z = doc.splitTextToSize(t, b); doc.text(z, x, y, { lineHeightFactor: zl }); return y + z.length * gr * 0.3528 * zl; };
const haken = (x, y, f = GRUEN) => { fl(f); doc.circle(x, y - 1.2, 2, 'F'); st(WEISS); doc.setLineWidth(0.5);
  doc.line(x - 0.9, y - 1.2, x - 0.25, y - 0.5); doc.line(x - 0.25, y - 0.5, x + 1, y - 2); };

/* ---------- Kopf mit Bild ---------- */
const kh = 97;
doc.addImage(bild('umspannwerk.jpg'), 'JPEG', -1, 0, W + 2, kh);
doc.saveGraphicsState();
for (let i = 0; i < 120; i++) { dk(0.25 + 0.75 * Math.pow(i / 119, 1.3)); fl(NAVY1); doc.rect(-1, i * kh / 120, W + 2, kh / 120, 'F'); }
doc.restoreGraphicsState(); dk(1);
/* links zusätzlich abdunkeln, damit der Text gut lesbar ist */
doc.saveGraphicsState(); for (let i = 0; i < 90; i++) { dk(0.5 * (1 - i / 89)); fl(NAVY1); doc.rect(i * 1.4, 0, 1.4, kh, 'F'); } doc.restoreGraphicsState(); dk(1);
doc.addImage(logoT, 'PNG', RA, 13, (420 / 196) * 15, 15);
fl(GRUEN); doc.roundedRect(RA, 34, 76, 8, 4, 4, 'F');
schrift(7.8, true); fa(NAVY1); doc.text('SPOTMARKT MIT FESTPREIS-OPTION', RA + 5, 39.2, { charSpace: 0.6 });
schrift(27, true); fa(WEISS); doc.text('Heute flexibel starten.', RA, 54);
fa(GRUEN2); doc.text('Morgen den besten', RA, 65.5); doc.text('Festpreis sichern.', RA, 77);
absatz('Wir beliefern Sie zuerst zu aktuellen Börsenpreisen und wechseln für Sie in den Festpreis, sobald der Markt günstig ist. Auch mitten im Jahr. Sie müssen sich um nichts kümmern.',
  RA, 85.5, 160, 10, HELLBLAU, 1.38);

/* ---------- Drei Schritte ---------- */
let y = kh + 9;
schrift(8, true); fa(GRUEN1); doc.text('SO FUNKTIONIERT ES', RA, y, { charSpace: 1 });
y += 5;
const schritte = [
  ['Start am Spotmarkt', 'Ihre Belieferung beginnt sofort zu aktuellen Börsenpreisen. Kein Festlegen auf einen ungünstigen Stichtag.'],
  ['Wir beobachten den Markt', 'Täglich, für Strom und Erdgas. Wir erkennen, wann sich ein Festpreis für Sie lohnt.'],
  ['Wechsel in den Festpreis', 'Sobald die Marktlage passt, sichern wir Ihren Preis am Terminmarkt, ganz oder in Teilmengen.'],
];
const sw = (BR - 8) / 3;
schritte.forEach(([t, u], i) => {
  const x = RA + i * (sw + 4);
  fl(HELL); doc.roundedRect(x, y, sw, 41, 3, 3, 'F');
  verlauf(x + 5, y + 5, 11, 11, GRUEN2, GRUEN1, { kreis: true, quer: false, n: 25 });
  schrift(12, true); fa(WEISS); doc.text(String(i + 1), x + 10.5, y + 12.6, { align: 'center' });
  if (i < 2) { st(GRUEN1); doc.setLineWidth(0.7); doc.line(x + sw - 1, y + 10.5, x + sw + 3.2, y + 10.5);
    fl(GRUEN1); doc.triangle(x + sw + 3.6, y + 10.5, x + sw + 2.2, y + 9.4, x + sw + 2.2, y + 11.6, 'F'); }
  schrift(10.5, true); fa(NAVY); doc.text(t, x + 5, y + 22);
  absatz(u, x + 5, y + 27.5, sw - 10, 8.2, GRAU, 1.33);
});
y += 48;

/* ---------- Schaubild: Preisverlauf und Wechselzeitpunkt ---------- */
const gx = RA, gy = y, gw = 98, gh = 47;
fl(WEISS); st(LINIE); doc.setLineWidth(0.3); doc.roundedRect(gx, gy, gw, gh, 3, 3, 'FD');
schrift(8.5, true); fa(NAVY); doc.text('Der richtige Moment zählt', gx + 5, gy + 7);
const px0 = gx + 8, py0 = gy + 14, pw = gw - 16, ph = gh - 23;
st(LINIE); doc.setLineWidth(0.15);
for (let k = 0; k <= 3; k++) doc.line(px0, py0 + k * ph / 3, px0 + pw, py0 + k * ph / 3);
const werte = [0.72, 0.8, 0.76, 0.86, 0.82, 0.7, 0.74, 0.62, 0.66, 0.52, 0.58, 0.46, 0.5, 0.38, 0.42, 0.33, 0.36, 0.3, 0.34, 0.31];
const wechsel = 15;
const pt = (i) => [px0 + i / (werte.length - 1) * pw, py0 + (1 - werte[i]) * ph];
st(NAVY2); doc.setLineWidth(0.7);
for (let i = 1; i <= wechsel; i++) { const [a1, b1] = pt(i - 1), [a2, b2] = pt(i); doc.line(a1, b1, a2, b2); }
/* ab dem Wechsel: fester Preis als grüne Linie */
const [wx, wy] = pt(wechsel);
st(GRUEN1); doc.setLineWidth(1); doc.line(wx, wy, px0 + pw, wy);
fl(GRUEN); doc.circle(wx, wy, 1.8, 'F'); fl(WEISS); doc.circle(wx, wy, 0.7, 'F');
schrift(7, true); fa(GRUEN1); doc.text('Festpreis gesichert', wx + 2, wy - 7.5, { align: 'center' });
st(GRUEN1); doc.setLineWidth(0.3); doc.line(wx, wy - 2.2, wx + 1.5, wy - 6.3);
schrift(6.6); fa(GRAU); doc.text('Spotmarkt', px0, py0 + ph + 4.5); doc.text('Festpreis', px0 + pw, py0 + ph + 4.5, { align: 'right' });
schrift(5.8); fa(GRAU); doc.text('Schematische Darstellung', gx + gw - 5, gy + 7, { align: 'right' });

/* ---------- Vorteile ---------- */
const vx = gx + gw + 6, vw = BR - gw - 6;
schrift(8, true); fa(GRUEN1); doc.text('IHRE VORTEILE', vx, gy + 4, { charSpace: 1 });
let vy = gy + 11;
[['Kein Stichtagsrisiko', 'Sie starten ohne Festlegung auf einen Tag.'],
 ['Unterjährig wechseln', 'In den Festpreis, sobald die Marktlage passt.'],
 ['Ganz oder in Teilmengen', 'Festpreis für alles oder in Tranchen.'],
 ['Strom und Erdgas', 'Für alle Lieferstellen, SLP und RLM.']].forEach(([t, u]) => {
  haken(vx + 2, vy); schrift(9.5, true); fa(NAVY); doc.text(t, vx + 7, vy);
  vy = absatz(u, vx + 7, vy + 4.4, vw - 7, 8.2, GRAU, 1.3) + 3.2;
});
y = gy + gh + 7;

/* ---------- Wir kümmern uns ---------- */
const bh = 41;
verlauf(RA, y, BR, bh, NAVY1, NAVY2, { r: 3, n: 60 });
doc.saveGraphicsState(); doc.roundedRect(RA, y, BR, bh, 3, 3, null); doc.clip(); doc.discardPath();
dk(0.08); st(WEISS); doc.setLineWidth(0.6); doc.circle(RA + BR - 12, y + 6, 30, 'S'); doc.circle(RA + BR - 12, y + 6, 42, 'S'); dk(1);
doc.restoreGraphicsState();
schrift(8, true); fa(GRUEN2); doc.text('SIE MÜSSEN SICH UM NICHTS KÜMMERN', RA + 7, y + 9, { charSpace: 0.8 });
schrift(15, true); fa(WEISS); doc.text('Wir handeln aktiv für Sie.', RA + 7, y + 18);
const leistung = ['Tägliche Marktbeobachtung', 'Kaufempfehlung zum richtigen Zeitpunkt', 'Umsetzung beim Versorger', 'Laufende Betreuung und Übersicht'];
leistung.forEach((t, i) => { const x = RA + 7 + (i % 2) * 86, yy = y + 25.5 + Math.floor(i / 2) * 6.5;
  haken(x + 2, yy); schrift(9.2); fa(WEISS); doc.text(t, x + 7, yy); });
schrift(8.6, true); fa(GRUEN2); doc.text('Ein kurzes Okay von Ihnen genügt, den Rest erledigen wir.', RA + 7, y + bh - 3.5);
y += bh + 6;

/* ---------- Kontakt ---------- */
const ch = H - 11 - y;
fl(GRUENHELL); doc.roundedRect(RA, y, BR, ch, 3, 3, 'F');
schrift(13, true); fa(NAVY); doc.text('Jetzt Marktchance nutzen.', RA + 7, y + 8.5);
absatz('Wir prüfen Ihren Vertrag und zeigen Ihnen, wann der Festpreis für Sie passt.', RA + 7, y + 14, 125, 8.6, TEXT, 1.3);
schrift(6.6); fa(GRAU); doc.text('TELEFON', RA + 7, y + 21); doc.text('E-MAIL', RA + 52, y + 21);
schrift(10, true); fa(NAVY); doc.text('06373 8920114', RA + 7, y + 26); doc.text('anfrage@egc-energie.de', RA + 52, y + 26);
doc.link(RA + 7, y + 22, 38, 5.5, { url: 'tel:063738920114' }); doc.link(RA + 52, y + 22, 50, 5.5, { url: 'mailto:anfrage@egc-energie.de?subject=Spotmarkt%20mit%20Festpreis-Option' });
const qs = ch - 8;
fl(WEISS); doc.roundedRect(RA + BR - qs - 8, y + 2.5, qs + 4, ch - 5, 2.5, 2.5, 'F');
doc.addImage(qr, 'PNG', RA + BR - qs - 6, y + 4, qs, qs);
doc.link(RA + BR - qs - 8, y + 2.5, qs + 4, ch - 5, { url: 'https://www.egc-energie.de' });

schrift(6.8); fa(GRAU);
doc.text('EGC Energie  ·  In den Erlenwiesen 11  ·  66914 Waldmohr  ·  www.egc-energie.de', W / 2, H - 6, { align: 'center' });
fs.writeFileSync(AUSGABE, Buffer.from(doc.output('arraybuffer')));
console.log('geschrieben:', AUSGABE);
})();
