/* Verkaufsskript „Spotmarkt mit Festpreis-Option“ für Vertriebspartner, Schwerpunkt kleine Gewerbekunden (SLP).
   Aufruf aus dem Repository-Wurzelverzeichnis: node druckvorlagen/skript_spot/skript.js [ausgabe.pdf]
   Schrift, Bilder und Logo aus der Imagebroschüre. Nur für den internen Gebrauch. */
const path = require('path');
const fs = require('fs');
const W0 = path.join(__dirname, '..', '..');
const BR0 = path.join(W0, 'druckvorlagen', 'broschuere');
const { jsPDF } = require(path.join(W0, 'node_modules', 'jspdf', 'dist', 'jspdf.node.min.js'));
const AUSGABE = process.argv[2] || path.join(__dirname, 'EGC_Verkaufsskript_Spotmarkt.pdf');

const W = 210, H = 297, RA = 18, BR = W - 2 * RA;
const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
const ttf = (f) => fs.readFileSync(path.join(BR0, 'schrift', f)).toString('base64');
doc.addFileToVFS('LS-R.ttf', ttf('LiberationSans-Regular.ttf')); doc.addFont('LS-R.ttf', 'LS', 'normal');
doc.addFileToVFS('LS-B.ttf', ttf('LiberationSans-Bold.ttf')); doc.addFont('LS-B.ttf', 'LS', 'bold');
doc.setProperties({ title: 'Verkaufsskript Spotmarkt mit Festpreis-Option – EGC Energie', author: 'EGC Energie' });
const bild = (f) => 'data:image/jpeg;base64,' + fs.readFileSync(path.join(BR0, 'bilder', 'klein', f)).toString('base64');
const logoT = 'data:image/png;base64,' + fs.readFileSync(path.join(W0, 'logo-weiss.png')).toString('base64');

const NAVY = [10, 22, 38], NAVY1 = [7, 16, 29], NAVY2 = [27, 58, 96], GRUEN = [108, 180, 59], GRUEN1 = [74, 140, 38],
  GRUEN2 = [150, 206, 96], WEISS = [255, 255, 255], TEXT = [22, 33, 44], GRAU = [107, 119, 135], HELL = [244, 247, 250],
  HELLBLAU = [196, 208, 222], LINIE = [216, 221, 228], GRUENHELL = [236, 246, 228], ROT = [176, 58, 46], ROTHELL = [251, 236, 233];
const fl = (c) => doc.setFillColor(...c), st = (c) => doc.setDrawColor(...c), fa = (c) => doc.setTextColor(...c);
const schrift = (g, fett) => { doc.setFont('LS', fett ? 'bold' : 'normal'); doc.setFontSize(g); };
const mische = (a, b, t) => a.map((c, i) => Math.round(c + (b[i] - c) * t));
const dk = (o) => doc.setGState(new doc.GState({ opacity: o }));
const zh = (g, zl) => g * 0.3528 * zl;
const hoehe = (t, b, g, zl = 1.4, fett = false) => { schrift(g, fett); return doc.splitTextToSize(t, b).length * zh(g, zl); };
const absatz = (t, x, y, b, g = 9.5, f = TEXT, zl = 1.4, fett = false) => { schrift(g, fett); fa(f); const z = doc.splitTextToSize(t, b); doc.text(z, x, y, { lineHeightFactor: zl }); return y + z.length * zh(g, zl); };
const verlauf = (x, y, w, h, f1, f2, { quer = true, n = 70, r = 0, kreis = false } = {}) => {
  doc.saveGraphicsState();
  if (kreis) doc.circle(x + w / 2, y + h / 2, w / 2, null); else if (r) doc.roundedRect(x, y, w, h, r, r, null); else doc.rect(x, y, w, h, null);
  doc.clip(); doc.discardPath();
  for (let i = 0; i < n; i++) { fl(mische(f1, f2, i / (n - 1))); if (quer) doc.rect(x + i * w / n, y, w / n + 0.15, h, 'F'); else doc.rect(x, y + i * h / n, w, h / n + 0.15, 'F'); }
  doc.restoreGraphicsState();
};
const haken = (x, y, f = GRUEN) => { fl(f); doc.circle(x, y - 1.2, 1.9, 'F'); st(WEISS); doc.setLineWidth(0.45);
  doc.line(x - 0.85, y - 1.2, x - 0.25, y - 0.55); doc.line(x - 0.25, y - 0.55, x + 0.95, y - 1.95); };
const kreuz = (x, y) => { fl(ROT); doc.circle(x, y - 1.2, 1.9, 'F'); st(WEISS); doc.setLineWidth(0.45);
  doc.line(x - 0.8, y - 2, x + 0.8, y - 0.4); doc.line(x + 0.8, y - 2, x - 0.8, y - 0.4); };

let seite = 0;
const fuss = () => { schrift(7); fa(GRAU); doc.text('EGC Energie  ·  Verkaufsskript Spotmarkt mit Festpreis-Option  ·  nur für den internen Gebrauch', RA, H - 9);
  doc.text(String(seite), W - RA, H - 9, { align: 'right' }); st(LINIE); doc.setLineWidth(0.2); doc.line(RA, H - 13.5, W - RA, H - 13.5); };
const neueSeite = () => {
  if (seite) { fuss(); doc.addPage(); }
  seite++;
  fl(WEISS); doc.rect(0, 0, W, H, 'F');
  verlauf(0, 0, 5, H, NAVY1, NAVY2, { quer: false, n: 50 }); verlauf(5, 0, 1.2, H, GRUEN2, GRUEN1, { quer: false, n: 30 });
  fl(NAVY); doc.roundedRect(W - RA - 26, 12, 26, 14, 2, 2, 'F'); doc.addImage(logoT, 'PNG', W - RA - 24, 14, 22, 22 * 196 / 420);
};
const titel = (kicker, a, b, y = 30) => {
  schrift(7.5, true); fa(GRUEN1); doc.text(kicker, RA, y, { charSpace: 1 });
  schrift(20, true); fa(NAVY); doc.text(a, RA, y + 10);
  if (b) { fa(GRUEN1); doc.text(b, RA, y + 18.5); }
  const yy = y + (b ? 23 : 14.5);
  verlauf(RA, yy, 26, 1.3, GRUEN1, GRUEN2, { n: 25, r: 0.65 });
  return yy + 9;
};
/* Phase mit Nummer, Titel, Dauer und Ziel */
const phase = (nr, t, dauer, ziel, y) => {
  verlauf(RA, y - 5.5, 10, 10, GRUEN2, GRUEN1, { kreis: true, quer: false, n: 25 });
  schrift(11, true); fa(WEISS); doc.text(String(nr), RA + 5, y + 1.1, { align: 'center' });
  schrift(12.5, true); fa(NAVY); doc.text(t, RA + 14, y);
  schrift(8); fa(GRAU); doc.text(dauer, RA + BR, y, { align: 'right' });
  schrift(8.6); fa(GRAU); doc.text('Ziel: ' + ziel, RA + 14, y + 5);
  return y + 10;
};
/* Sprechtext: grüne Kante, kursiv wirkende Anführung */
const sage = (t, y, { sprecher = 'Sie sagen' } = {}) => {
  const h = hoehe('„' + t + '“', BR - 16, 9.6, 1.42) + 10;
  fl(GRUENHELL); doc.roundedRect(RA, y, BR, h, 2.5, 2.5, 'F'); fl(GRUEN); doc.roundedRect(RA, y, 1.6, h, 0.8, 0.8, 'F');
  schrift(6.8, true); fa(GRUEN1); doc.text(sprecher.toUpperCase(), RA + 6, y + 5.2, { charSpace: 0.6 });
  absatz('„' + t + '“', RA + 6, y + 10.5, BR - 16, 9.6, TEXT, 1.42);
  return y + h + 3;
};
const tipp = (t, y) => {
  schrift(8, true); fa(NAVY2); doc.text('TIPP', RA + 1, y);
  return absatz(t, RA + 12, y, BR - 12, 8.6, GRAU, 1.38) + 3;
};
const punkte = (liste, x, y, b, g = 9.2, zeichen = haken) => {
  liste.forEach((t) => { zeichen(x + 2, y); y = absatz(t, x + 7, y, b - 7, g, TEXT, 1.36) + 2; });
  return y;
};

/* ================= Seite 1: Überblick ================= */
neueSeite();
doc.addImage(bild('beratung.jpg'), 'JPEG', 0, 0, W, 92);
doc.saveGraphicsState(); for (let i = 0; i < 100; i++) { dk(0.35 + 0.6 * (i / 99)); fl(NAVY1); doc.rect(0, i * 0.92, W, 0.92, 'F'); } doc.restoreGraphicsState(); dk(1);
doc.saveGraphicsState(); for (let i = 0; i < 70; i++) { dk(0.55 * (1 - i / 69)); fl(NAVY1); doc.rect(i * 1.8, 0, 1.8, 92, 'F'); } doc.restoreGraphicsState(); dk(1);
doc.addImage(logoT, 'PNG', RA, 14, (420 / 196) * 13, 13);
schrift(7.8, true); fa(GRUEN2); doc.text('VERKAUFSSKRIPT FÜR VERTRIEBSPARTNER', RA, 44, { charSpace: 0.9 });
schrift(24, true); fa(WEISS); doc.text('Spotmarkt mit', RA, 56); fa(GRUEN2); doc.text('Festpreis-Option', RA, 66.5);
absatz('So erklären und verkaufen Sie das Modell in 10 Minuten. Für kleine und mittlere Gewerbekunden mit Standardlastprofil (SLP).', RA, 76, 150, 10, HELLBLAU, 1.38);
let y = 104;
/* Die Idee in einem Satz */
verlauf(RA, y, BR, 30, NAVY1, NAVY2, { r: 3, n: 60 });
schrift(7.5, true); fa(GRUEN2); doc.text('DIE IDEE IN EINEM SATZ', RA + 7, y + 8, { charSpace: 0.8 });
absatz('Wir starten Ihre Belieferung zum Börsenpreis ohne Risikoaufschlag und sichern Ihren Festpreis genau dann, wenn Ihr Wunschpreis erreicht ist. Sie müssen dafür nichts tun.', RA + 7, y + 15, BR - 14, 11, WEISS, 1.38, true);
y += 38;
schrift(11, true); fa(NAVY); doc.text('Das Gespräch auf einen Blick', RA, y); y += 6;
const ablauf = [['Einstieg', '1 Minute', 'Interesse wecken, Erlaubnis für zwei Fragen holen'], ['Fragen', '3 Minuten', 'Vertrag, Preis, Wunsch nach Sicherheit verstehen'],
  ['Erklären', '2 Minuten', 'Das Modell mit einem einfachen Bild erklären'], ['Nutzen', '1 Minute', 'Was der Kunde konkret davon hat'],
  ['Einwände', 'nach Bedarf', 'Ruhig und ehrlich antworten'], ['Abschluss', '2 Minuten', 'Rechnung, Vollmacht und Wunschpreis mitnehmen']];
ablauf.forEach(([t, d, z], i) => {
  const yy = y + i * 13.2;
  fl(i % 2 ? WEISS : HELL); doc.roundedRect(RA, yy, BR, 11.5, 2, 2, 'F');
  verlauf(RA + 3, yy + 2.2, 7, 7, GRUEN2, GRUEN1, { kreis: true, quer: false, n: 20 });
  schrift(8.5, true); fa(WEISS); doc.text(String(i + 1), RA + 6.5, yy + 7.1, { align: 'center' });
  schrift(9.8, true); fa(NAVY); doc.text(t, RA + 14, yy + 7.3);
  schrift(8.6); fa(TEXT); doc.text(z, RA + 44, yy + 7.3);
  schrift(8); fa(GRAU); doc.text(d, RA + BR - 4, yy + 7.3, { align: 'right' });
});
y += 6 * 13.2 + 5;
fl(GRUENHELL); doc.roundedRect(RA, y, BR, 30, 3, 3, 'F');
schrift(7.5, true); fa(GRUEN1); doc.text('FÜR WEN DAS MODELL GUT PASST', RA + 7, y + 8, { charSpace: 0.8 });
punkte(['Bäckereien, Metzgereien, Handwerk, Gastronomie, Praxen, Büros und Läden', 'Kunden mit auslaufendem oder still verlängertem Vertrag', 'Kunden, die heute nicht zu einem teuren Festpreis abschließen möchten'],
  RA + 6, y + 15, BR - 12, 8.8);

/* ================= Seite 2: Einstieg, Fragen, Erklären ================= */
neueSeite();
y = titel('GESPRÄCHSLEITFADEN', 'Einstieg, Fragen', 'und das Modell erklären');
y = phase(1, 'Einstieg', 'ca. 1 Minute', 'Interesse wecken und die Erlaubnis für Fragen bekommen', y);
y = sage('Guten Tag, [Name], mein Name ist [Ihr Name] von EGC Energie. Wir kümmern uns für Betriebe wie Ihren um den Einkauf von Strom und Erdgas. Viele zahlen mehr als nötig, weil der Vertrag einfach weiterläuft. Darf ich Ihnen zwei kurze Fragen stellen?', y);
y += 3;
y = phase(2, 'Fragen', 'ca. 3 Minuten', 'Ausgangslage verstehen. Zuhören, nicht verkaufen.', y);
const fragen = ['Wissen Sie, wann Ihr aktueller Vertrag ausläuft?', 'Wissen Sie ungefähr, was Sie pro Kilowattstunde zahlen?',
  'Wurde Ihr Vertrag zuletzt einfach verlängert oder haben Sie verglichen?', 'Was ist Ihnen wichtiger: ein fester Preis oder ein günstiger Preis?',
  'Wer kümmert sich bei Ihnen um Strom und Gas, wenn Sie gerade im Betrieb stehen?'];
fragen.forEach((f, i) => { schrift(9.4, true); fa(GRUEN1); doc.text(String(i + 1) + '.', RA + 2, y); y = absatz('„' + f + '“', RA + 8, y, BR - 8, 9.4, TEXT, 1.36) + 1.6; });
y = tipp('Die vierte Frage ist die wichtigste. Sagt der Kunde „günstig“ oder „beides“, passt das Modell. Notieren Sie den Satz des Kunden und greifen Sie ihn später wörtlich auf.', y + 1) + 2;
y = phase(3, 'Erklären', 'ca. 2 Minuten', 'Das Modell in einfachen Worten, mit einem Bild', y);
y = sage('Stellen Sie es sich vor wie beim Tanken: Ein Festpreis ist wie ein fester Literpreis für drei Jahre. Dafür schlägt der Anbieter eine Sicherheit obendrauf. Bei uns tanken Sie erst zum Tagespreis, ohne diesen Aufschlag. Und sobald der Preis auf Ihr Wunschniveau kommt, frieren wir ihn für die ganze Laufzeit ein. Darum kümmern wir uns, Sie bekommen nur Bescheid.', y);
schrift(9.2, true); fa(NAVY); doc.text('Die drei Schritte in Kundensprache', RA, y + 3); y += 8;
[['Wir starten am Börsenpreis.', 'Ohne Risikoaufschlag, so wie der Markt gerade steht.'], ['Sie nennen uns Ihren Wunschpreis.', 'Gemeinsam mit unserer Kalkulation legen wir einen realistischen Zielpreis fest.'],
 ['Wir fixieren für Sie.', 'Ist der Wunschpreis erreicht, sichern wir den Festpreis für alle Lieferjahre. Sie erhalten unsere Bestätigung.']].forEach(([a, b]) => {
  haken(RA + 2, y); schrift(9.4, true); fa(NAVY); doc.text(a, RA + 7, y); y = absatz(b, RA + 7, y + 4.4, BR - 7, 8.8, GRAU, 1.34) + 2.4;
});

/* ================= Seite 3: Nutzen und Einwände ================= */
neueSeite();
y = titel('NUTZEN UND EINWÄNDE', 'Was der Kunde davon hat', 'und was Sie antworten');
y = phase(4, 'Nutzen', 'ca. 1 Minute', 'Den Nutzen auf den Betrieb des Kunden beziehen', y);
y = sage('Sie konzentrieren sich auf Ihren Betrieb, wir uns auf Ihren Einkauf. Sie zahlen keinen Risikoaufschlag für einen Festpreis, den Sie heute vielleicht zu teuer abschließen würden. Und wenn Ihr Wunschpreis kommt, ist er für die ganze Laufzeit gesichert, ohne dass Sie anrufen oder unterschreiben müssen.', y);
y += 2;
y = phase(5, 'Einwände', 'nach Bedarf', 'Ruhig bleiben, Verständnis zeigen, ehrlich antworten', y);
const einwaende = [
  ['„Börse klingt mir zu riskant.“', 'Verstehe ich. Börse heißt hier nur: Sie zahlen den Preis, den der Markt gerade hat, ohne Aufschlag. Wir beobachten ihn jeden Tag für Sie und sichern den Festpreis, sobald Ihr Wunschpreis erreicht ist.'],
  ['„Was ist, wenn die Preise steigen?“', 'Dann zahlen Sie in dieser Zeit den Börsenpreis, das gehört ehrlich dazu. Deshalb vereinbaren wir auf Wunsch zusätzlich eine Obergrenze: Wird sie erreicht, fixieren wir sofort. Und Sie können uns jederzeit sagen: Jetzt bitte festmachen.'],
  ['„Ich will lieber gleich einen festen Preis.“', 'Das geht natürlich auch. Ich lasse Ihnen beides rechnen: den Festpreis von heute und den Start am Börsenpreis mit Wunschpreis. Dann entscheiden Sie mit Zahlen.'],
  ['„Ich habe keine Zeit für so etwas.“', 'Genau dafür sind wir da. Von Ihnen brauchen wir einmal die letzte Jahresrechnung und eine Unterschrift. Alles Weitere übernehmen wir.'],
  ['„Muss ich dafür den Zähler wechseln?“', 'Nein. Zähler und Leitungen bleiben, es ändert sich nur, wer Ihnen die Energie liefert und wie der Preis zustande kommt.'],
  ['„Ich bin seit Jahren beim Stadtwerk.“', 'Das Netz bleibt beim Wechsel dasselbe, die Versorgung läuft ohne Unterbrechung. Lassen Sie uns einfach vergleichen, dann sehen Sie es schwarz auf weiß.'],
];
einwaende.forEach(([e, a]) => {
  const h = hoehe(a, BR - 12, 8.9, 1.38) + 11;
  fl(HELL); doc.roundedRect(RA, y, BR, h, 2.5, 2.5, 'F');
  schrift(9.6, true); fa(NAVY); doc.text(e, RA + 6, y + 6.2);
  absatz(a, RA + 6, y + 11.4, BR - 12, 8.9, TEXT, 1.38);
  y += h + 2.8;
});

/* ================= Seite 4: Abschluss, Portal, Regeln ================= */
neueSeite();
y = titel('ABSCHLUSS', 'Abschließen und', 'im Portal erfassen');
y = phase(6, 'Abschluss', 'ca. 2 Minuten', 'Unterlagen mitnehmen und den nächsten Schritt festmachen', y);
y = sage('Dann machen wir es so: Sie geben mir Ihre letzte Jahresrechnung, wir rechnen Ihnen beides durch, und ich komme mit dem Angebot und einem realistischen Wunschpreis zu Ihnen zurück. Passt Ihnen [Tag] oder [Tag] besser?', y);
y = tipp('Immer eine Auswahl zwischen zwei Terminen anbieten, nicht „ob“, sondern „wann“.', y + 1) + 2;
schrift(11, true); fa(NAVY); doc.text('Was Sie vom Kunden mitnehmen', RA, y); y += 6;
y = punkte(['Letzte Jahresrechnung Strom und Erdgas, alle Seiten', 'Unterschriebene Vollmacht (Service- und Beratungsauftrag)', 'Wunschpreis für den reinen Energiepreis und auf Wunsch eine Obergrenze',
  'Bei Einzelunternehmen: Gewerbeanmeldung'], RA, y, BR, 9.2) + 3;
schrift(11, true); fa(NAVY); doc.text('So erfassen Sie es im Portal', RA, y); y += 6;
[['Neue Anfrage', 'Kunde und Lieferstellen eintragen, Rechnung hochladen.'], ['Angebotswunsch', 'Beim Produkt „Spotmarkt“ wählen. In der Bemerkung: „Spotmarkt mit Festpreis-Option, Wunschpreis gewünscht“.'],
 ['Angebot', 'Die Kalkulation schickt Ihnen das Angebot und eine Einschätzung zum Wunschpreis.'], ['Zielpreis', 'Im Vorgang unter „Zielpreis Spotmarkt“ den vereinbarten Wunschpreis eintragen.']].forEach(([a, b], i) => {
  fl(i % 2 ? WEISS : HELL); const h = hoehe(b, BR - 50, 8.8, 1.34) + 6;
  doc.roundedRect(RA, y, BR, h, 2, 2, 'F');
  schrift(9.2, true); fa(GRUEN1); doc.text(String(i + 1) + '  ' + a, RA + 4, y + 5.5);
  absatz(b, RA + 44, y + 5.5, BR - 50, 8.8, TEXT, 1.34);
  y += h + 1.5;
});
y += 4;
const halb = (BR - 6) / 2;
const hR = 52;
fl(GRUENHELL); doc.roundedRect(RA, y, halb, hR, 3, 3, 'F');
fl(ROTHELL); doc.roundedRect(RA + halb + 6, y, halb, hR, 3, 3, 'F');
schrift(9.5, true); fa(GRUEN1); doc.text('So machen Sie es richtig', RA + 5, y + 8);
punkte(['Den Satz des Kunden aufgreifen', 'Wunschpreis mit der Kalkulation abstimmen', 'Beide Wege rechnen lassen: Festpreis und Spot', 'Nach der Fixierung kurz gratulieren'], RA + 4, y + 15, halb - 8, 8.6);
schrift(9.5, true); fa(ROT); doc.text('Das sagen Sie nie', RA + halb + 11, y + 8);
punkte(['„Der Preis fällt bestimmt.“', '„Sie sparen garantiert.“', 'Einen Wunschpreis versprechen, den die Kalkulation nicht bestätigt hat', 'Zahlen nennen, die nicht im Angebot stehen'], RA + halb + 10, y + 15, halb - 8, 8.6, kreuz);
y += hR + 5;
verlauf(RA, y, BR, 18, NAVY1, NAVY2, { r: 3, n: 50 });
schrift(7.5, true); fa(GRUEN2); doc.text('MERKSATZ', RA + 7, y + 7, { charSpace: 0.8 });
schrift(10.5, true); fa(WEISS); doc.text('Börsenpreis ohne Aufschlag, Festpreis zum Wunschpreis, und wir kümmern uns.', RA + 7, y + 13.5);
fuss();
fs.writeFileSync(AUSGABE, Buffer.from(doc.output('arraybuffer')));
console.log('geschrieben:', AUSGABE, seite, 'Seiten');
