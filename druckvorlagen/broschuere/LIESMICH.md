# Imagebroschüre EGC Energie (Druckvorlage)

Nicht Teil des Portals. Wird nicht von Netlify gebaut.

Erzeugen, im Wurzelverzeichnis des Repositorys:

```
npm install
node druckvorlagen/broschuere/bau.js
python3 druckvorlagen/broschuere/aufraeumen.py druckvorlagen/broschuere/roh.pdf druckvorlagen/broschuere/EGC_Imagebroschuere_A4_Druckdatei.pdf
```

`aufraeumen.py` braucht `pip install pikepdf`. Es entfernt ungenutzte Standardschriften und setzt Endformat (TrimBox) und Beschnitt (BleedBox, 3 mm).

- `bau.js`: Inhalt und Gestaltung der 12 Seiten
- `daten.json`: Beispiel-Lastgang (anonymisiert) für die Grafiken auf Seite 4 und 7
- `schrift/`: Liberation Sans, eingebettet (SIL Open Font License 1.1)
- Logo: `logo-weiss.png` im Wurzelverzeichnis
