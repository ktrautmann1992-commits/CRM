# Whitepaper „Energieeinkauf 2027“ (Leitfaden für Unternehmen)

Nicht Teil des Portals. 20 Seiten A4, Versandfassung ohne Beschnitt, im Design der Imagebroschüre
(Schrift, Bilder und Beispiel-Lastgang kommen aus `druckvorlagen/broschuere`).

```bash
node druckvorlagen/whitepaper/bau.js                                   # allgemeine Fassung
PARTNER=partner.json AUSGABE=Leitfaden_Name.pdf node druckvorlagen/whitepaper/bau.js   # je Vertriebspartner
# partner.json: {"name":"…","titel":"…","mobil":"…","telefon":"…","email":"…"}
```

Zahlen 2027 (Netzentgelte, CO₂-Preis, Stromsteuer, Umlagen): Stand 10.11.2026, teils vorläufig.
Vor jeder Neuauflage an den Quellen auf Seite 20 prüfen.
