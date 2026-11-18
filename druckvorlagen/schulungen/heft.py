"""Schulungsheft für Vertriebspartner: Umschlag, Inhaltsverzeichnis, Schulung 1–4 als DIN A4 Hochformat
(je zwei Folien pro Seite, Vektor), Notizseiten bis zur durch 4 teilbaren Seitenzahl (Klammerheftung), Rückseite.
Aufruf: python3 druckvorlagen/schulungen/heft.py titelbild.png ausgabe.pdf
"""
import io, sys, glob
from PIL import Image, ImageFilter
from pypdf import PdfReader, PdfWriter, Transformation
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

GRUND = "/home/user/CRM/"
pdfmetrics.registerFont(TTFont("Carlito", "/usr/share/fonts/truetype/crosextra/Carlito-Regular.ttf"))
pdfmetrics.registerFont(TTFont("Carlito-Bold", "/usr/share/fonts/truetype/crosextra/Carlito-Bold.ttf"))
W, H = A4
NAVY, NAVY2, GRUEN, GRAU, HELL = (10/255, 22/255, 38/255), (24/255, 41/255, 63/255), (108/255, 180/255, 59/255), (107/255, 119/255, 135/255), (0.85, 0.87, 0.89)
RAND = 34
SCHULUNGEN = [
    (1, "Wie der Energiemarkt funktioniert", "Marktlogik, Marktrollen, kW und kWh, Zählerarten und Messkonzepte"),
    (2, "Wie Energiepreise entstehen", "Merit Order, Spot- und Terminmarkt, Börse und OTC"),
    (3, "Beschaffungsmodelle und Kundenpassung", "Festpreis, Spot, Index, Tranchen, Hybrid, Cap/Floor, Zielpreis, Portfolio und PPA"),
    (4, "Energienebenkosten verstehen und senken", "Woraus sich ein Energiepreis zusammensetzt und welche Hebel es gibt"),
]

def neue_ebene():
    puffer = io.BytesIO()
    return puffer, canvas.Canvas(puffer, pagesize=A4)

def fertig(puffer, c):
    c.showPage(); c.save()
    return PdfReader(io.BytesIO(puffer.getvalue())).pages[0]

def logo(c, x, y, breite):
    c.drawImage(ImageReader(GRUND + "logo-weiss.png"), x, y, width=breite, height=breite * 196 / 420, mask="auto")

# ---------- Umschlag ----------
def umschlag(bild):
    p, c = neue_ebene()
    im = Image.open(bild).convert("RGB")
    # auf A4-Verhältnis zuschneiden (unten behalten, oben Himmel kürzen) und für den Druck vergrößern
    soll = im.width * H / W
    if im.height > soll:
        oben = int((im.height - soll) * 0.35)
        im = im.crop((0, oben, im.width, oben + int(soll)))
    im = im.resize((2480, int(2480 * H / W)), Image.LANCZOS).filter(ImageFilter.UnsharpMask(radius=2, percent=60, threshold=2))
    b = io.BytesIO(); im.save(b, "JPEG", quality=92); b.seek(0)
    c.drawImage(ImageReader(b), 0, 0, width=W, height=H)
    # dunkler Verlauf oben für den Titel
    schritte = 80
    for i in range(schritte):
        hoehe = 470 / schritte
        a = 0.92 * (1 - i / schritte) ** 1.6
        c.setFillColorRGB(*NAVY, alpha=a); c.rect(0, H - (i + 1) * hoehe, W, hoehe + 0.5, fill=1, stroke=0)
    c.setFillAlpha(1)
    logo(c, 48, H - 120, 128)
    c.setFillColorRGB(*GRUEN); c.setFont("Carlito-Bold", 11); c.drawString(50, H - 190, "SCHULUNGSUNTERLAGEN FÜR VERTRIEBSPARTNER")
    c.setFillColorRGB(1, 1, 1); c.setFont("Carlito-Bold", 44)
    c.drawString(48, H - 240, "Grundlagen der"); c.drawString(48, H - 286, "Energiewirtschaft")
    c.setFillColorRGB(*GRUEN); c.rect(50, H - 310, 70, 4, fill=1, stroke=0)
    c.setFillColorRGB(0.85, 0.89, 0.93); c.setFont("Carlito", 13)
    c.drawString(50, H - 336, "Die vier Grundlagenschulungen in einem Heft:")
    c.drawString(50, H - 353, "Energiemarkt · Preisbildung · Beschaffungsmodelle · Energienebenkosten")
    # Fußleiste
    c.setFillColorRGB(*NAVY, alpha=0.92); c.rect(0, 0, W, 58, fill=1, stroke=0)
    c.setFillAlpha(1)
    c.setFillColorRGB(*GRUEN); c.rect(0, 58, W, 3, fill=1, stroke=0)
    c.setFillColorRGB(1, 1, 1); c.setFont("Carlito-Bold", 11); c.drawString(50, 26, "EGC Energie")
    c.setFont("Carlito", 10); c.setFillColorRGB(0.75, 0.8, 0.86)
    c.drawRightString(W - 50, 26, "Unabhängige Energieberatung für Gewerbe und Industrie · bundesweit")
    return fertig(p, c)

# ---------- Kopf und Fuß der Innenseiten ----------
def innen(c, nr, links):
    c.setFillColorRGB(*NAVY); c.rect(0, H - 34, W, 34, fill=1, stroke=0)
    c.setFillColorRGB(*GRUEN); c.rect(0, H - 37, W, 3, fill=1, stroke=0)
    logo(c, RAND, H - 28, 46)
    c.setFillColorRGB(1, 1, 1); c.setFont("Carlito", 9.5); c.drawRightString(W - RAND, H - 22, links)
    c.setFillColorRGB(*GRAU); c.setFont("Carlito", 8.5)
    c.drawString(RAND, 24, "EGC Energie · Schulungsunterlagen für Vertriebspartner · nur für den internen Gebrauch")
    c.drawRightString(W - RAND, 24, str(nr))

def inhalt(seiten_ab, gesamt):
    p, c = neue_ebene()
    innen(c, 2, "Schulungsunterlagen")
    c.setFillColorRGB(*GRUEN); c.setFont("Carlito-Bold", 10); c.drawString(50, H - 100, "INHALT")
    c.setFillColorRGB(*NAVY); c.setFont("Carlito-Bold", 28); c.drawString(50, H - 134, "Ihr Weg durch den Energiemarkt")
    c.setFillColorRGB(*GRAU); c.setFont("Carlito", 11.5)
    for i, z in enumerate(["Vier Schulungen, die aufeinander aufbauen. Jede Seite zeigt zwei Folien der Schulungen,",
                           "am Ende ist Platz für eigene Notizen."]):
        c.drawString(50, H - 160 - i * 15, z)
    y = H - 225
    for (n, t, u), ab in zip(SCHULUNGEN, seiten_ab):
        c.setFillColorRGB(*NAVY); c.roundRect(50, y - 62, W - 100, 74, 6, fill=1, stroke=0)
        c.setFillColorRGB(*GRUEN); c.setFont("Carlito-Bold", 30); c.drawString(70, y - 28, str(n))
        c.setFillColorRGB(1, 1, 1); c.setFont("Carlito-Bold", 15); c.drawString(110, y - 14, "Schulung " + str(n) + " · " + t)
        c.setFillColorRGB(0.75, 0.8, 0.86); c.setFont("Carlito", 10.5); c.drawString(110, y - 32, u)
        c.setFillColorRGB(*GRUEN); c.setFont("Carlito-Bold", 12); c.drawRightString(W - 70, y - 22, "Seite " + str(ab))
        y -= 96
    y -= 40
    c.setFillColorRGB(*GRUEN); c.rect(50, y - 6, 4, 64, fill=1, stroke=0)
    c.setFillColorRGB(*NAVY); c.setFont("Carlito-Bold", 12); c.drawString(64, y + 42, "So arbeiten Sie mit dem Heft")
    c.setFillColorRGB(*GRAU); c.setFont("Carlito", 10.5)
    for i, z in enumerate(["Erst Schulung 1 und 2: Ohne Marktlogik und Preisbildung lassen sich Beschaffungsmodelle nicht erklären.",
                           "Die Kästen „Für das Kundengespräch“ sind Sätze, die Sie direkt beim Kunden verwenden können.",
                           "Die digitale Fassung finden Sie jederzeit im Vertriebsportal unter Unterlagen → Schulungen."]):
        c.drawString(64, y + 24 - i * 15, z)
    return fertig(p, c)

def folienseite(folien, i0, nr, kopf):
    p, c = neue_ebene()
    innen(c, nr, kopf)
    fb, fh = float(folien[0].mediabox.width), float(folien[0].mediabox.height)
    oben, unten, abstand = 62, 46, 22
    m = min((W - 2 * RAND) / fb, (H - oben - unten - abstand) / 2 / fh)
    bf, hf = fb * m, fh * m
    x0 = (W - bf) / 2
    o = oben + ((H - oben - unten) - (2 * hf + abstand)) / 2
    lagen = []
    c.setStrokeColorRGB(*HELL); c.setLineWidth(0.6)
    for k in range(2):
        if i0 + k < len(folien):
            y = H - o - (k + 1) * hf - k * abstand
            c.rect(x0, y, bf, hf, fill=0, stroke=1); lagen.append((folien[i0 + k], m, x0, y))
    return fertig(p, c), lagen

def notiz(nr):
    p, c = neue_ebene()
    innen(c, nr, "Notizen")
    c.setFillColorRGB(*NAVY); c.setFont("Carlito-Bold", 18); c.drawString(50, H - 90, "Notizen")
    c.setStrokeColorRGB(*HELL); c.setLineWidth(0.6)
    y = H - 125
    while y > 60:
        c.line(50, y, W - 50, y); y -= 26
    return fertig(p, c)

def rueckseite():
    p, c = neue_ebene()
    c.setFillColorRGB(*NAVY); c.rect(0, 0, W, H, fill=1, stroke=0)
    c.setFillColorRGB(*GRUEN); c.rect(0, H - 6, W, 6, fill=1, stroke=0)
    logo(c, (W - 170) / 2, H / 2 + 40, 170)
    c.setFillColorRGB(1, 1, 1); c.setFont("Carlito-Bold", 16)
    c.drawCentredString(W / 2, H / 2 - 10, "Unabhängige Energieberatung für Gewerbe und Industrie")
    c.setFillColorRGB(0.75, 0.8, 0.86); c.setFont("Carlito", 11.5)
    c.drawCentredString(W / 2, H / 2 - 30, "Bundesweit · kein Versorger · auf der Seite des Kunden")
    c.setFillColorRGB(*GRUEN); c.rect(W / 2 - 35, H / 2 - 52, 70, 3, fill=1, stroke=0)
    c.setFillColorRGB(0.85, 0.89, 0.93); c.setFont("Carlito", 11)
    for i, z in enumerate(["EGC Energie · In den Erlenwiesen 11 · 66914 Waldmohr",
                           "Telefon 06373 8920114 · anfrage@egc-energie.de · www.egc-energie.de"]):
        c.drawCentredString(W / 2, 90 - i * 16, z)
    c.setFillColorRGB(0.55, 0.62, 0.7); c.setFont("Carlito", 8.5)
    c.drawCentredString(W / 2, 40, "Schulungsunterlage für Vertriebspartner · nur für den internen Gebrauch · Stand " + "11/2026")
    return fertig(p, c)

# Für das gedruckte Heft weggelassen (Foliennummern je Schulung): Kapitel-Trennfolien, Lernziele,
# „Schulung abgeschlossen“ und der Schulungsweg (steht im Inhaltsverzeichnis). Die Zusammenfassung
# über alle vier Schulungen (Schulung 4, Folie 25) bleibt.
WEGLASSEN = {
    1: [2, 3, 4, 9, 13, 19, 29],
    2: [2, 5, 9, 12, 19],
    3: [4, 9, 13, 18, 22, 25, 31],
    4: [2, 5, 11, 18, 22, 26],
}
if "--alle" in sys.argv:
    WEGLASSEN = {}
    sys.argv.remove("--alle")

# ---------- zusammensetzen ----------
titelbild, ausgabe = sys.argv[1], sys.argv[2]
quellen = [[f for i, f in enumerate(PdfReader(glob.glob(GRUND + f"unterlagen/schulungen/EGC_Schulung_{n}_*.pdf")[0]).pages)
            if i + 1 not in WEGLASSEN.get(n, [])] for n, _, _ in SCHULUNGEN]
je = [(len(q) + 1) // 2 for q in quellen]
ab, s = [], 3
for n in je:
    ab.append(s); s += n
inhaltsseiten = 2 + sum(je)                 # Umschlag, Inhalt, Schulungen
notizen = (-(inhaltsseiten + 1)) % 4         # + Rückseite, auf Vielfache von 4 auffüllen
gesamt = inhaltsseiten + notizen + 1

ziel = PdfWriter()
def anhaengen(seite):
    neu = ziel.add_blank_page(W, H); neu.merge_page(seite); return neu
anhaengen(umschlag(titelbild))
anhaengen(inhalt(ab, gesamt))
nr = 3
for (n, t, _), folien in zip(SCHULUNGEN, quellen):
    for i0 in range(0, len(folien), 2):
        ebene, lagen = folienseite(folien, i0, nr, "Schulung " + str(n) + " · " + t)
        seite = anhaengen(ebene)
        for f, m, x, y in lagen:
            seite.merge_transformed_page(f, Transformation().scale(m).translate(x, y))
        nr += 1
for _ in range(notizen):
    anhaengen(notiz(nr)); nr += 1
anhaengen(rueckseite())
ziel.add_metadata({"/Title": "EGC Schulungsunterlagen · Grundlagen der Energiewirtschaft", "/Author": "EGC Energie"})
ziel.compress_identical_objects(remove_duplicates=True, remove_unreferenced=True)
with open(ausgabe, "wb") as f:
    ziel.write(f)
print(ausgabe, gesamt, "Seiten (", notizen, "Notizseiten ), Schulungen ab Seite", ab)
