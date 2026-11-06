const path0 = require('path');
const { jsPDF } = require(path0.join(__dirname, '..', '..', 'node_modules', 'jspdf', 'dist', 'jspdf.node.min.js'));
const fs = require('fs');
/* Aufruf aus dem Repository-Wurzelverzeichnis:
   node druckvorlagen/broschuere/bau.js && python3 druckvorlagen/broschuere/aufraeumen.py \
     druckvorlagen/broschuere/roh.pdf druckvorlagen/broschuere/EGC_Imagebroschuere_A4_Druckdatei.pdf */
const path = require('path');
const HIER = __dirname, WURZEL = path.join(__dirname, '..', '..');
const QR = require(path.join(WURZEL, 'node_modules', 'qrcode'));
const D = JSON.parse(fs.readFileSync(path.join(HIER, 'daten.json'), 'utf8'));
/* Zwei Fassungen:
   Druck   (Vorgabe): 3 mm Beschnitt, Bilder in voller Auflösung, Hinweis auf die beiliegende Visitenkarte.
   Versand (ART=versand PARTNER=datei.json AUSGABE=datei.pdf): Endformat A4 ohne Beschnitt, kleinere Bilder
            zum Versenden per E-Mail, auf der Rückseite die Kontaktdaten des Vertriebspartners. */
const VERSAND = process.env.ART === 'versand';
const P = VERSAND ? JSON.parse(fs.readFileSync(process.env.PARTNER, 'utf8')) : null;
const AUSGABE = process.env.AUSGABE || path.join(HIER, 'roh.pdf');
const baueBroschuere = require(path.join(HIER, 'broschuere.js'));
(async () => {
const bild = (f) => 'data:image/jpeg;base64,' + fs.readFileSync(path.join(HIER, 'bilder', VERSAND ? 'klein' : '', f)).toString('base64');
const logoT = 'data:image/png;base64,' + fs.readFileSync(path.join(WURZEL, 'logo-weiss.png')).toString('base64');
const ttf = (f) => fs.readFileSync(path.join(HIER, 'schrift', f)).toString('base64');
const doc = await baueBroschuere({ jsPDF, QR, bild, logoT, D, P, versand: VERSAND, log: console.log,
  schriften: { regular: ttf('LiberationSans-Regular.ttf'), fett: ttf('LiberationSans-Bold.ttf') } });
fs.writeFileSync(AUSGABE, Buffer.from(doc.output('arraybuffer')));
})();
