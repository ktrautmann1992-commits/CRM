# Schulungsfolien im EGC-Design

`umgestalten.py` bringt die aus LibreOffice Impress exportierten Schulungs-PDFs ins EGC-Design,
ohne die Texte zu verändern (Prüfung: `pdftotext -raw` vorher und nachher ist identisch).

- Farben Petrol/Orange → EGC-Navy/Grün (Tabelle `FARBEN`), Warnrot bleibt
- Überschriften Caladea (Serifen) → Carlito Fett, neu kodiert über ToUnicode
- kleines EGC-Logo oben rechts auf jeder Seite, weiß auf dunklen und navy auf hellen Seiten

```bash
pip install fonttools pikepdf pillow
python3 druckvorlagen/schulungen/umgestalten.py eingabe.pdf ausgabe.pdf
```
Benötigt `/usr/share/fonts/truetype/crosextra/Carlito-Bold.ttf` und `pdftoppm`.
