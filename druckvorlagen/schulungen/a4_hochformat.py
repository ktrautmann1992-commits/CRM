"""Schulungsfolien (16:9) als DIN A4 Hochformat: je zwei Folien untereinander, mit Kopf- und Fußzeile im EGC-Design.
Die Folien bleiben Vektorgrafik (keine Umwandlung in Bilder).
Aufruf: python3 druckvorlagen/schulungen/a4_hochformat.py eingabe.pdf ausgabe.pdf "Schulung 1 · Titel"
"""
import io, sys
from pypdf import PdfReader, PdfWriter, Transformation
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4

ein, aus, titel = sys.argv[1], sys.argv[2], sys.argv[3]
W, H = A4                      # 595,3 x 841,9 pt
RAND, OBEN, UNTEN, ABSTAND = 34, 62, 46, 22
NAVY, GRUEN, GRAU = (10/255, 22/255, 38/255), (108/255, 180/255, 59/255), (107/255, 119/255, 135/255)

quelle = PdfReader(ein)
folien = quelle.pages
fb, fh = float(folien[0].mediabox.width), float(folien[0].mediabox.height)
breite = W - 2 * RAND
massstab = min(breite / fb, (H - OBEN - UNTEN - ABSTAND) / 2 / fh)
bf, hf = fb * massstab, fh * massstab
x0 = (W - bf) / 2
# senkrecht mittig zwischen Kopf und Fuß
OBEN = OBEN + ((H - OBEN - UNTEN) - (2 * hf + ABSTAND)) / 2
seiten = (len(folien) + 1) // 2

def rahmen(nr):
    """Kopf, Fuß und feine Rahmen um die Folien als eigene Ebene"""
    puffer = io.BytesIO()
    c = canvas.Canvas(puffer, pagesize=A4)
    c.setFillColorRGB(*NAVY); c.rect(0, H - 34, W, 34, fill=1, stroke=0)
    c.setFillColorRGB(*GRUEN); c.rect(0, H - 37, W, 3, fill=1, stroke=0)
    c.setFillColorRGB(1, 1, 1); c.setFont("Helvetica-Bold", 11); c.drawString(RAND, H - 22, "EGC Energie")
    c.setFont("Helvetica", 9); c.drawRightString(W - RAND, H - 22, titel)
    c.setStrokeColorRGB(0.85, 0.87, 0.89); c.setLineWidth(0.6)
    for k in range(2):
        if nr * 2 + k < len(folien):
            y = H - OBEN - (k + 1) * hf - k * ABSTAND
            c.rect(x0, y, bf, hf, fill=0, stroke=1)
    c.setFillColorRGB(*GRAU); c.setFont("Helvetica", 8)
    c.drawString(RAND, 24, "EGC Energie · Schulungsunterlage für Vertriebspartner · nur für den internen Gebrauch")
    c.drawRightString(W - RAND, 24, f"Seite {nr + 1} von {seiten}")
    c.showPage(); c.save()
    return PdfReader(io.BytesIO(puffer.getvalue())).pages[0]

ziel = PdfWriter()
for nr in range(seiten):
    seite = ziel.add_blank_page(W, H)
    seite.merge_page(rahmen(nr))
    for k in range(2):
        i = nr * 2 + k
        if i >= len(folien):
            break
        y = H - OBEN - (k + 1) * hf - k * ABSTAND
        seite.merge_transformed_page(folien[i], Transformation().scale(massstab).translate(x0, y))
ziel.add_metadata({"/Title": titel + " (DIN A4)", "/Author": "EGC Energie"})
ziel.compress_identical_objects(remove_duplicates=True, remove_unreferenced=True)
with open(aus, "wb") as f:
    ziel.write(f)
print(aus, seiten, "Seiten, Folie", round(bf), "x", round(hf), "pt")
