/* Whitepaper „Energieeinkauf 2027“ erzeugen, aus dem Repository-Wurzelverzeichnis:
     node druckvorlagen/whitepaper/bau.js        (optional AUSGABE=datei.pdf)
   Bewusst nur eine allgemeine Fassung, als frei weitergebbares Dokument für Interessenten.
   Bilder, Schrift und Beispiel-Lastgang kommen aus der Imagebroschüre. */
const path = require('path');
const fs = require('fs');
const WURZEL = path.join(__dirname, '..', '..');
const BR = path.join(WURZEL, 'druckvorlagen', 'broschuere');
const { jsPDF } = require(path.join(WURZEL, 'node_modules', 'jspdf', 'dist', 'jspdf.node.min.js'));
const QR = require(path.join(WURZEL, 'node_modules', 'qrcode'));
const baue = require(path.join(__dirname, 'whitepaper.js'));
const AUSGABE = process.env.AUSGABE || path.join(__dirname, 'EGC_Leitfaden_Energieeinkauf_2027.pdf');
(async () => {
  const bild = (f) => 'data:image/jpeg;base64,' + fs.readFileSync(path.join(BR, 'bilder', 'klein', f)).toString('base64');
  const logoT = 'data:image/png;base64,' + fs.readFileSync(path.join(WURZEL, 'logo-weiss.png')).toString('base64');
  const ttf = (f) => fs.readFileSync(path.join(BR, 'schrift', f)).toString('base64');
  const D = JSON.parse(fs.readFileSync(path.join(BR, 'daten.json'), 'utf8'));
  const doc = await baue({ jsPDF, QR, bild, logoT, D, log: console.log,
    schriften: { regular: ttf('LiberationSans-Regular.ttf'), fett: ttf('LiberationSans-Bold.ttf') } });
  fs.writeFileSync(AUSGABE, Buffer.from(doc.output('arraybuffer')));
  console.log('geschrieben:', AUSGABE);
})();
