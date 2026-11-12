/* Zielpreisauftrag (Fixierung zum Wunschpreis), Anlage zum Service- und Beratungsauftrag (Vollmacht).
   Eine Seite A4 zum Ausfüllen und Unterschreiben, EGC-Design.
   Aufruf aus dem Repository-Wurzelverzeichnis: node druckvorlagen/zielpreis/formular.js [ausgabe.pdf]
   Rechtstexte vor dem ersten Einsatz anwaltlich prüfen lassen. */
const path = require('path');
const fs = require('fs');
const W0 = path.join(__dirname, '..', '..');
const BR0 = path.join(W0, 'druckvorlagen', 'broschuere');
const { jsPDF } = require(path.join(W0, 'node_modules', 'jspdf', 'dist', 'jspdf.node.min.js'));
const AUSGABE = process.argv[2] || path.join(__dirname, 'EGC_Zielpreisauftrag.pdf');

const W = 210, H = 297, RA = 16, BR = W - 2 * RA;
const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
const ttf = (f) => fs.readFileSync(path.join(BR0, 'schrift', f)).toString('base64');
doc.addFileToVFS('LS-R.ttf', ttf('LiberationSans-Regular.ttf')); doc.addFont('LS-R.ttf', 'LS', 'normal');
doc.addFileToVFS('LS-B.ttf', ttf('LiberationSans-Bold.ttf')); doc.addFont('LS-B.ttf', 'LS', 'bold');
doc.setProperties({ title: 'Zielpreisauftrag – EGC Energie', author: 'EGC Energie' });
const logoT = 'data:image/png;base64,' + fs.readFileSync(path.join(W0, 'logo-weiss.png')).toString('base64');

const NAVY1 = [7, 16, 29], NAVY2 = [27, 58, 96], NAVY = [10, 22, 38], GRUEN = [108, 180, 59], GRUEN1 = [74, 140, 38], GRUEN2 = [150, 206, 96],
  WEISS = [255, 255, 255], TEXT = [22, 33, 44], GRAU = [107, 119, 135], HELL = [244, 247, 250], LINIE = [200, 207, 216], GRUENHELL = [236, 246, 228];
const fl = (c) => doc.setFillColor(...c), st = (c) => doc.setDrawColor(...c), fa = (c) => doc.setTextColor(...c);
const schrift = (g, fett) => { doc.setFont('LS', fett ? 'bold' : 'normal'); doc.setFontSize(g); };
const mische = (a, b, t) => a.map((c, i) => Math.round(c + (b[i] - c) * t));
const verlauf = (x, y, w, h, f1, f2, n = 70) => { for (let i = 0; i < n; i++) { fl(mische(f1, f2, i / (n - 1))); doc.rect(x + i * w / n, y, w / n + 0.15, h, 'F'); } };
const absatz = (t, x, y, b, g = 8.2, f = TEXT, zl = 1.35, fett = false) => { schrift(g, fett); fa(f); const z = doc.splitTextToSize(t, b); doc.text(z, x, y, { lineHeightFactor: zl }); return y + z.length * g * 0.3528 * zl; };
/* Eingabefeld: Beschriftung klein darüber, Linie darunter */
const feld = (label, x, y, w) => { schrift(6.6); fa(GRAU); doc.text(label, x, y); st(LINIE); doc.setLineWidth(0.3); doc.line(x, y + 6, x + w, y + 6); };
const kasten = (x, y, label) => { st(NAVY2); doc.setLineWidth(0.35); doc.rect(x, y - 3, 3.4, 3.4); schrift(8.2); fa(TEXT); doc.text(label, x + 5.2, y); return x + 5.2 + doc.getTextWidth(label) + 6; };
const abschnitt = (nr, t, y) => {
  fl(GRUEN); doc.circle(RA + 2.8, y - 1.4, 2.8, 'F'); schrift(8, true); fa(WEISS); doc.text(String(nr), RA + 2.8, y - 0.2, { align: 'center' });
  schrift(10.5, true); fa(NAVY); doc.text(t, RA + 8, y); return y + 6;
};

/* Kopf */
verlauf(0, 0, W, 30, NAVY1, NAVY2);
fl(GRUEN); doc.rect(0, 30, W, 1.2, 'F');
doc.addImage(logoT, 'PNG', RA, 8, (420 / 196) * 13, 13);
schrift(15, true); fa(WEISS); doc.text('Zielpreisauftrag', W - RA, 15, { align: 'right' });
schrift(8.2); fa(GRUEN2); doc.text('Fixierung zum Wunschpreis · Anlage zum Service- und Beratungsauftrag (Vollmacht)', W - RA, 21.5, { align: 'right' });

let y = 40;
y = absatz('Mit diesem Auftrag legen Sie Ihren Wunschpreis fest. EGC Energie beobachtet den Terminmarkt für Sie und veranlasst die Fixierung beim Versorger, sobald Ihr Wunschpreis erreicht ist. Sie erhalten danach unsere Bestätigung.',
  RA, y, BR, 8.6, TEXT, 1.4) + 4;

/* 1 Auftraggeber */
y = abschnitt(1, 'Auftraggeber', y);
const h2 = (BR - 6) / 2;
feld('Firma (wie im Handelsregister bzw. Gewerbeanmeldung)', RA, y, h2); feld('Ansprechpartner', RA + h2 + 6, y, h2); y += 10.5;
feld('Straße und Hausnummer', RA, y, h2); feld('PLZ und Ort', RA + h2 + 6, y, h2); y += 10.5;
feld('E-Mail für die Bestätigung der Fixierung', RA, y, h2); feld('Telefon', RA + h2 + 6, y, h2 / 2 - 3); feld('Vorgangsnummer EGC', RA + h2 + 6 + h2 / 2 + 3, y, h2 / 2 - 3); y += 13;

/* 2 Lieferstellen */
y = abschnitt(2, 'Lieferstellen', y);
const sp = [{ t: 'Sparte', w: 26 }, { t: 'Marktlokation (MaLo)', w: 52 }, { t: 'Zähler', w: 24 }, { t: 'Jahresmenge (kWh)', w: 36 }, { t: 'Lieferadresse (falls abweichend)', w: BR - 138 }];
let x = RA; fl(HELL); doc.rect(RA, y - 3.8, BR, 6, 'F');
schrift(6.8, true); fa(GRAU); sp.forEach((c) => { doc.text(c.t, x + 2, y); x += c.w; });
y += 2.2;
for (let r = 0; r < 4; r++) {
  x = RA;
  sp.forEach((c, i) => {
    if (i === 0) { schrift(7.6); fa(TEXT); st(NAVY2); doc.setLineWidth(0.3); doc.rect(x + 2, y + 1.6, 2.8, 2.8); doc.text('Strom', x + 6, y + 4.2); doc.rect(x + 15, y + 1.6, 2.8, 2.8); doc.text('Gas', x + 19, y + 4.2); }
    if (i === 2) { schrift(7.6); fa(TEXT); st(NAVY2); doc.setLineWidth(0.3); doc.rect(x + 2, y + 1.6, 2.8, 2.8); doc.text('SLP', x + 6, y + 4.2); doc.rect(x + 13, y + 1.6, 2.8, 2.8); doc.text('RLM', x + 17, y + 4.2); }
    x += c.w;
  });
  st(LINIE); doc.setLineWidth(0.25); doc.line(RA, y + 6.4, RA + BR, y + 6.4);
  y += 6.4;
}
y += 7;

/* 3 Wunschpreis */
y = abschnitt(3, 'Ihr Wunschpreis', y);
y = absatz('Der Wunschpreis bezieht sich auf den reinen Energiepreis in ct/kWh netto, ohne Netzentgelte, Messstellenbetrieb, staatliche Umlagen, Abgaben und Steuern.', RA + 8, y, BR - 8, 7.8, GRAU, 1.32) + 2.5;
const zeile = (sparte) => {
  fl(GRUENHELL); doc.roundedRect(RA, y - 1, BR, 21, 2.5, 2.5, 'F');
  schrift(9.5, true); fa(GRUEN1); doc.text(sparte, RA + 4, y + 5);
  const b4 = (BR - 40) / 3;
  feld('Wunschpreis Energiepreis (ct/kWh netto)', RA + 30, y + 3, b4 - 4);
  feld('Lieferjahre: von (Monat/Jahr)', RA + 30 + b4, y + 3, b4 - 4);
  feld('bis (Monat/Jahr)', RA + 30 + 2 * b4, y + 3, b4 - 4);
  let xx = kasten(RA + 30, y + 15.5, 'gesamte Menge');
  xx = kasten(xx, y + 15.5, 'in Teilmengen (nur RLM), Anzahl:');
  st(LINIE); doc.setLineWidth(0.3); doc.line(xx - 4, y + 16, xx + 10, y + 16);
  y += 24;
};
zeile('Strom'); zeile('Erdgas');

/* optionale Angaben */
const b3 = (BR - 12) / 3;
feld('Optional: Obergrenze (ct/kWh). Wird sie erreicht, fixieren wir sofort', RA, y, b3 * 2 - 6);
feld('Auftrag gültig bis (Datum)', RA + b3 * 2 + 6, y, b3 + 6); y += 13;

/* 4 So läuft es */
y = abschnitt(4, 'So läuft es', y);
const regeln = [
  'Bis zur Fixierung werden Sie zum Spotpreis gemäß Ihrem Liefervertrag beliefert.',
  'EGC Energie beobachtet den Terminmarkt und veranlasst die Fixierung beim Versorger, sobald Ihr Wunschpreis erreicht oder unterschritten ist, bei vereinbarter Obergrenze auch bei deren Erreichen.',
  'Fixiert wird der Energiepreis für die angegebenen Lieferjahre. Maßgeblich sind die Bedingungen Ihres Liefervertrags.',
  'Sie erhalten nach der Fixierung eine Bestätigung per E-Mail. Bis dahin können Sie Wunschpreis oder Auftrag jederzeit per E-Mail ändern oder widerrufen.',
  'Wird der Wunschpreis bis zum Gültigkeitsdatum nicht erreicht, besprechen wir mit Ihnen das weitere Vorgehen.',
];
regeln.forEach((t) => { fl(GRUEN); doc.circle(RA + 9.6, y - 1.1, 0.8, 'F'); y = absatz(t, RA + 12, y, BR - 12, 7.9, TEXT, 1.32) + 1.2; });
y += 4;

/* Unterschrift */
const u3 = (BR - 12) / 3;
feld('Ort, Datum', RA, y + 4, u3); feld('Name, Vorname (leserlich)', RA + u3 + 6, y + 4, u3); feld('Unterschrift und Stempel Auftraggeber', RA + 2 * u3 + 12, y + 4, u3);
y += 14;
fl(HELL); doc.roundedRect(RA, y, BR, 13, 2.5, 2.5, 'F');
schrift(7.2, true); fa(GRAU); doc.text('VON EGC ENERGIE AUSZUFÜLLEN', RA + 4, y + 5);
schrift(7.6); fa(TEXT); doc.text('Eingegangen am:', RA + 4, y + 10); doc.text('Bearbeitet von:', RA + 64, y + 10); doc.text('Fixiert am / zu:', RA + 120, y + 10);

schrift(6.6); fa(GRAU);
doc.text('EGC Energie · Karsten Trautmann · In den Erlenwiesen 11 · 66914 Waldmohr · Tel. 06373 8920114 · anfrage@egc-energie.de · www.egc-energie.de', W / 2, H - 7, { align: 'center' });
fs.writeFileSync(AUSGABE, Buffer.from(doc.output('arraybuffer')));
console.log('geschrieben:', AUSGABE, 'Höhe bis', y.toFixed(1));
