"""Vertriebsheft für neue Vertriebspartner: Gewerbekunden bis 250.000 kWh selbst gewinnen und abschließen.
DIN A4 Hochformat im Design des Schulungshefts (Navy/Grün, Carlito). Seitenzahl auf Vielfache von 4 (Klammerheftung).
Aufruf: python3 druckvorlagen/vertriebsheft/heft.py titelbild.png ausgabe.pdf
Börsenpreise 2025/2026 werden aus daten/strom-de-lu.json berechnet (Energy-Charts, CC BY 4.0)."""
import io, sys, json, datetime as dt
from PIL import Image, ImageFilter
from pypdf import PdfReader, PdfWriter
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, Table, TableStyle,
                                PageBreak, KeepTogether, Flowable)
from reportlab.graphics.shapes import Drawing, Rect, String, Line
from reportlab.graphics.charts.barcharts import VerticalBarChart

GRUND = "/home/user/CRM/"
pdfmetrics.registerFont(TTFont("Carlito", "/usr/share/fonts/truetype/crosextra/Carlito-Regular.ttf"))
pdfmetrics.registerFont(TTFont("Carlito-Bold", "/usr/share/fonts/truetype/crosextra/Carlito-Bold.ttf"))
pdfmetrics.registerFont(TTFont("Carlito-Italic", "/usr/share/fonts/truetype/crosextra/Carlito-Italic.ttf"))
from reportlab.pdfbase.pdfmetrics import registerFontFamily
registerFontFamily("Carlito", normal="Carlito", bold="Carlito-Bold", italic="Carlito-Italic", boldItalic="Carlito-Bold")
W, H = A4
NAVY, GRUEN, GRAU, TEXT = colors.HexColor("#0A1626"), colors.HexColor("#6CB43B"), colors.HexColor("#6B7787"), colors.HexColor("#16202C")
HELLGRUEN, HELLGRAU, LINIE, WARN = colors.HexColor("#EEF6E8"), colors.HexColor("#F3F5F8"), colors.HexColor("#D8DDE4"), colors.HexColor("#B24328")
RAND = 50

# ---------- Stile ----------
S = {
    "label": ParagraphStyle("label", fontName="Carlito-Bold", fontSize=9.5, textColor=GRUEN, leading=12, spaceAfter=2),
    "h1": ParagraphStyle("h1", fontName="Carlito-Bold", fontSize=24, textColor=NAVY, leading=28, spaceAfter=8),
    "h2": ParagraphStyle("h2", fontName="Carlito-Bold", fontSize=14, textColor=NAVY, leading=17, spaceBefore=10, spaceAfter=4),
    "text": ParagraphStyle("text", fontName="Carlito", fontSize=10.8, textColor=TEXT, leading=14.6, spaceAfter=6),
    "klein": ParagraphStyle("klein", fontName="Carlito", fontSize=9, textColor=GRAU, leading=11.5, spaceAfter=4),
    "intro": ParagraphStyle("intro", fontName="Carlito", fontSize=12, textColor=GRAU, leading=16, spaceAfter=10),
    "zelle": ParagraphStyle("zelle", fontName="Carlito", fontSize=9.8, textColor=TEXT, leading=12.6),
    "zellefett": ParagraphStyle("zellefett", fontName="Carlito-Bold", fontSize=9.8, textColor=NAVY, leading=12.6),
    "kopf": ParagraphStyle("kopf", fontName="Carlito-Bold", fontSize=9.5, textColor=colors.white, leading=12),
    "sagen": ParagraphStyle("sagen", fontName="Carlito", fontSize=11, textColor=colors.white, leading=15),
    "sagenlabel": ParagraphStyle("sagenlabel", fontName="Carlito-Bold", fontSize=8.5, textColor=GRUEN, leading=11),
}
P = lambda t, s="text": Paragraph(t, S[s])
BREITE = W - 2 * RAND

def kasten(inhalt, grund=HELLGRUEN, rand=GRUEN, innen=10):
    t = Table([[inhalt]], colWidths=[BREITE])
    t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), grund), ("LINEBEFORE", (0, 0), (0, -1), 3, rand),
                           ("LEFTPADDING", (0, 0), (-1, -1), innen + 2), ("RIGHTPADDING", (0, 0), (-1, -1), innen),
                           ("TOPPADDING", (0, 0), (-1, -1), innen - 2), ("BOTTOMPADDING", (0, 0), (-1, -1), innen - 2)]))
    return t

def sagen(text, label="SIE SAGEN"):
    t = Table([[[P(label, "sagenlabel"), P(text, "sagen")]]], colWidths=[BREITE])
    t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), NAVY), ("LEFTPADDING", (0, 0), (-1, -1), 14),
                           ("RIGHTPADDING", (0, 0), (-1, -1), 14), ("TOPPADDING", (0, 0), (-1, -1), 9),
                           ("BOTTOMPADDING", (0, 0), (-1, -1), 11)]))
    return t

def tipp(text, label="TIPP"):
    return kasten([P(label, "label"), P(text)])

def tabelle(kopf, zeilen, breiten, fett_erste=True):
    daten = [[P(k, "kopf") for k in kopf]] + [[P(z, "zellefett" if (i == 0 and fett_erste) else "zelle") for i, z in enumerate(r)] for r in zeilen]
    t = Table(daten, colWidths=[BREITE * b for b in breiten], repeatRows=1)
    st = [("BACKGROUND", (0, 0), (-1, 0), NAVY), ("VALIGN", (0, 0), (-1, -1), "TOP"),
          ("LEFTPADDING", (0, 0), (-1, -1), 7), ("RIGHTPADDING", (0, 0), (-1, -1), 7),
          ("TOPPADDING", (0, 0), (-1, -1), 5), ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
          ("LINEBELOW", (0, 1), (-1, -1), 0.5, LINIE)]
    for i in range(1, len(daten)):
        if i % 2 == 0: st.append(("BACKGROUND", (0, i), (-1, i), HELLGRAU))
    t.setStyle(TableStyle(st))
    return t

def liste(punkte, haken=True, breite=None, farbe="#6CB43B"):
    b = breite or BREITE
    zeilen = [[P("<font color='%s'><b>%s</b></font>" % (farbe, "•" if haken else "–"), "text"), P(x)] for x in punkte]
    t = Table(zeilen, colWidths=[14, b - 14])
    t.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 0),
                           ("RIGHTPADDING", (0, 0), (-1, -1), 2), ("TOPPADDING", (0, 0), (-1, -1), 0), ("BOTTOMPADDING", (0, 0), (-1, -1), 0)]))
    return t

def kopfzeile(nr, titel):
    return [P(nr, "label"), P(titel, "h1")]

class Schritte(Flowable):
    """Sieben Schritte als Kette"""
    def __init__(self, schritte): super().__init__(); self.s = schritte; self.height = 64 * len(schritte)
    def wrap(self, aw, ah): return BREITE, self.height
    def draw(self):
        c = self.canv
        for i, (t, u, zeit) in enumerate(self.s):
            y = self.height - (i + 1) * 64 + 8
            c.setFillColor(NAVY); c.roundRect(0, y, BREITE, 54, 6, fill=1, stroke=0)
            c.setFillColor(GRUEN); c.circle(28, y + 27, 16, fill=1, stroke=0)
            c.setFillColor(NAVY); c.setFont("Carlito-Bold", 16); c.drawCentredString(28, y + 21.5, str(i + 1))
            c.setFillColor(colors.white); c.setFont("Carlito-Bold", 13.5); c.drawString(56, y + 32, t)
            c.setFillColor(colors.HexColor("#B9C6D4")); c.setFont("Carlito", 10.2); c.drawString(56, y + 16, u)
            c.setFillColor(GRUEN); c.setFont("Carlito-Bold", 10); c.drawRightString(BREITE - 14, y + 32, zeit)

class Linien(Flowable):
    def __init__(self, hoehe): super().__init__(); self.h = hoehe
    def wrap(self, aw, ah): return BREITE, self.h
    def draw(self):
        self.canv.setStrokeColor(LINIE); self.canv.setLineWidth(0.6)
        y = self.h
        while y > 0: self.canv.line(0, y, BREITE, y); y -= 26

# ---------- Börsenpreise ----------
def monatswerte():
    d = json.load(open(GRUND + "daten/strom-de-lu.json"))
    mon = {}
    for start, schritt, werte in d["segmente"]:
        for i, w in enumerate(werte):
            if w is None: continue
            t = dt.datetime.fromtimestamp(start + i * schritt, dt.timezone.utc) + dt.timedelta(hours=1)
            s = mon.setdefault((t.year, t.month), [0.0, 0.0]); s[0] += w * schritt / 3600; s[1] += schritt / 3600
    jahr = {}
    for (y, m), (a, b) in mon.items():
        s = jahr.setdefault(y, [0.0, 0.0]); s[0] += a; s[1] += b
    return {k: a / b for k, (a, b) in mon.items()}, {y: a / b for y, (a, b) in jahr.items()}, d["stand"]

MON, JAHR, STAND = monatswerte()
STAND_DE = ".".join(reversed(STAND.split("-")))
JAHRE = [("2022", 235.45), ("2023", 95.18), ("2024", 78.51), ("2025", JAHR[2025]), ("2026*", JAHR[2026])]

def balken(werte, titel, breite=BREITE, hoehe=170, farben=None, beschriften=True):
    d = Drawing(breite, hoehe)
    c = VerticalBarChart()
    c.x, c.y, c.width, c.height = 34, 26, breite - 44, hoehe - 52
    c.data = [[v for _, v in werte]]
    c.categoryAxis.categoryNames = [k for k, _ in werte]
    c.categoryAxis.labels.fontName = "Carlito"; c.categoryAxis.labels.fontSize = 8.5; c.categoryAxis.labels.fillColor = GRAU
    c.valueAxis.valueMin = 0; c.valueAxis.valueMax = max(v for _, v in werte) * 1.18
    c.valueAxis.labels.fontName = "Carlito"; c.valueAxis.labels.fontSize = 8; c.valueAxis.labels.fillColor = GRAU
    c.valueAxis.strokeColor = LINIE; c.categoryAxis.strokeColor = LINIE
    c.valueAxis.gridStrokeColor = LINIE; c.valueAxis.visibleGrid = 1
    c.bars[0].fillColor = NAVY; c.bars[0].strokeColor = None; c.barSpacing = 2; c.groupSpacing = 6
    if farben:
        for i, f in enumerate(farben): c.bars[(0, i)].fillColor = f
    if beschriften:
        c.barLabelFormat = lambda v: ("%.0f" % v).replace(".", ","); c.barLabels.fontName = "Carlito-Bold"
        c.barLabels.fontSize = 8.5; c.barLabels.fillColor = NAVY; c.barLabels.nudge = 7
    d.add(c)
    d.add(String(34, hoehe - 14, titel, fontName="Carlito-Bold", fontSize=10.5, fillColor=NAVY))
    return d

# ---------- Musterrechnungen (frei erfunden) ----------
def de(x, n=2):
    s = ("{:,.%df}" % n).format(x)
    return s.replace(",", "X").replace(".", ",").replace("X", ".")

def posten_rechnen(menge, liste):
    """liste: (gruppe, name, mengentext, preistext, betrag oder ('kwh', ct) oder ('monat', euro), marker)"""
    aus = []
    for g, name, art, wert, mk in liste:
        if art == "kwh":
            betrag = round(menge * wert / 100, 2); mt, pt = de(menge, 0) + " kWh", de(wert, 3 if round(wert * 1000) % 10 else 2) + " ct/kWh"
        else:
            betrag = round(12 * wert, 2); mt, pt = "12 Monate", de(wert) + " €/Monat"
        aus.append((g, name, mt, pt, betrag, mk))
    return aus

STROM_VERBRAUCH = 225830 - 183450
GAS_M3 = 48870 - 41250
GAS_KWH = round(GAS_M3 * 0.9632 * 11.2)
RECHNUNGEN = {
    "strom": dict(
        versorger="Beispiel-Energie AG", vzeile="Postfach 10 00 00 · 10000 Musterhausen · www.beispiel-energie.de",
        akzent=colors.HexColor("#2F5D8A"), titel="Jahresverbrauchsabrechnung Strom", zeitraum="01.01.2025 bis 31.12.2025",
        info=[("Kundennummer", "4711 0815 23", 1), ("Vertragskonto", "2000 3456 78", None), ("Rechnungsnummer", "R-2026-0012345", None),
              ("Rechnungsdatum", "14.01.2026", None)],
        stelle=[("Lieferstelle", "Musterstraße 12, 12345 Musterstadt", None), ("Marktlokation (MaLo)", "5123 8947 561", 2),
                ("Messlokation", "DE00012345678900000000000000B5X21", 3), ("Zählernummer", "1ESY 1160 1234 56", 3),
                ("Netzbetreiber", "Musternetz GmbH", None)],
        zaehler=[("01.01.2025", "183.450"), ("31.12.2025", "225.830")], einheit="kWh", verbrauch=STROM_VERBRAUCH,
        umrechnung=None, vorjahr="Vorjahr: 44.120 kWh",
        posten=posten_rechnen(STROM_VERBRAUCH, [
            ("Energie", "Arbeitspreis Energie", "kwh", 19.50, 5), ("Energie", "Grundpreis", "monat", 12.90, None),
            ("Netz", "Netzentgelt Arbeitspreis", "kwh", 8.20, 6), ("Netz", "Netzentgelt Grundpreis", "monat", 8.33, 6),
            ("Netz", "Messstellenbetrieb", "monat", 2.50, None),
            ("Abgaben", "Konzessionsabgabe", "kwh", 0.11, None), ("Abgaben", "KWKG-Umlage", "kwh", 0.277, None),
            ("Abgaben", "Offshore-Netzumlage", "kwh", 0.816, None), ("Abgaben", "Aufschlag für besondere Netznutzung", "kwh", 1.558, None),
            ("Abgaben", "Stromsteuer", "kwh", 2.05, None)]),
        abschlag=1350.0, neuer_abschlag="1.400,00 €",
        vertrag=[("Tarif", "Gewerbe Fix 24", None), ("Vertragsbeginn", "01.01.2025", None), ("Erstlaufzeit bis", "31.12.2026", 8),
                 ("Kündigungsfrist", "3 Monate zum Ende der Laufzeit, sonst Verlängerung um 12 Monate", 9)]),
    "gas": dict(
        versorger="Muster-Gas Versorgung GmbH", vzeile="Gasstraße 1 · 20000 Gasstadt · Kundenservice 0800 000000",
        akzent=colors.HexColor("#9A4A21"), titel="Jahresabrechnung Erdgas", zeitraum="01.10.2024 bis 30.09.2025",
        info=[("Kunden-Nr.", "GV-778 812", 1), ("Belegnummer", "9100 2233 44", None), ("Datum", "21.10.2025", None)],
        stelle=[("Verbrauchsstelle", "Musterstraße 12, 12345 Musterstadt", None), ("Marktlokations-ID", "5081 2345 678", 2),
                ("Zählpunkt", "DE00098765432100000000000004711AB", 3), ("Gaszähler-Nr.", "7GMT 0098 7654", 3),
                ("Netzbetreiber", "Mustergasnetz GmbH", None)],
        zaehler=[("01.10.2024", "41.250"), ("30.09.2025", "48.870")], einheit="m³", verbrauch=GAS_KWH,
        umrechnung="%s m³ × Zustandszahl 0,9632 × Brennwert 11,200 kWh/m³ = %s kWh" % (de(GAS_M3, 0), de(GAS_KWH, 0)),
        vorjahr="Vorjahr: 86.940 kWh",
        posten=posten_rechnen(GAS_KWH, [
            ("Energie", "Arbeitspreis Erdgas", "kwh", 6.40, 5), ("Energie", "Grundpreis", "monat", 14.90, None),
            ("Netz", "Netzentgelt Arbeitspreis", "kwh", 1.45, 6), ("Netz", "Netzentgelt Grundpreis", "monat", 12.50, 6),
            ("Netz", "Messstellenbetrieb", "monat", 1.80, None),
            ("Abgaben", "Konzessionsabgabe", "kwh", 0.03, None), ("Abgaben", "CO2-Preis (BEHG)", "kwh", 1.10, None),
            ("Abgaben", "Gasspeicherumlage", "kwh", 0.29, None), ("Abgaben", "Energiesteuer", "kwh", 0.55, None)]),
        abschlag=800.0, neuer_abschlag="840,00 €",
        vertrag=[("Produkt", "Gas Business 12", None), ("Lieferbeginn", "01.10.2024", None), ("Vertragsende", "30.09.2026", 8),
                 ("Kündigung", "spätestens 6 Wochen vor Vertragsende in Textform", 9)]),
}

class Rechnung(Flowable):
    """Fiktive Jahresabrechnung mit grünen Markierungen und Nummern"""
    def __init__(self, art, hoehe=600):
        super().__init__(); self.d = RECHNUNGEN[art]; self.art = art; self.h = hoehe; self.w = BREITE
    def wrap(self, aw, ah): return self.w, self.h
    def marke(self, x, y, n):
        c = self.canv
        c.setFillColor(GRUEN); c.circle(x, y, 7.2, fill=1, stroke=0)
        c.setFillColor(colors.white); c.setFont("Carlito-Bold", 9); c.drawCentredString(x, y - 3.1, str(n))
    def feld(self, x, y, w, h):
        c = self.canv
        c.setFillColor(colors.HexColor("#E3F2D6")); c.setStrokeColor(GRUEN); c.setLineWidth(1.1)
        c.roundRect(x, y, w, h, 2, fill=1, stroke=1)
    def draw(self):
        c, d, w, h = self.canv, self.d, self.w - 14, self.h
        x0 = 14; R = x0 + w               # links Platz für Nummern
        marken = []
        c.saveState()
        c.setFillColor(colors.HexColor("#E6E9EE")); c.rect(x0 + 3, -3, w, h, fill=1, stroke=0)
        c.setFillColor(colors.white); c.setStrokeColor(LINIE); c.setLineWidth(0.6); c.rect(x0, 0, w, h, fill=1, stroke=1)
        # Wasserzeichen
        c.saveState(); c.translate(x0 + w / 2, h / 2); c.rotate(35); c.setFillColor(colors.HexColor("#EEF0F3"))
        c.setFont("Carlito-Bold", 120); c.drawCentredString(0, -40, "MUSTER"); c.restoreState()
        L = x0 + 18; y = h - 30
        c.setFillColor(d["akzent"]); c.rect(x0, h - 6, w, 6, fill=1, stroke=0)
        c.setFont("Carlito-Bold", 15); c.drawString(L, y, d["versorger"])
        c.setFillColor(GRAU); c.setFont("Carlito", 7); c.drawString(L, y - 11, d["vzeile"])
        # Anschrift
        c.setFillColor(TEXT); c.setFont("Carlito", 8.6)
        for i, z in enumerate(["Bäckerei Sonnenkorn GmbH", "Herrn Max Mustermann", "Musterstraße 12", "12345 Musterstadt"]):
            c.drawString(L, y - 36 - i * 11, z)
        # Infoblock rechts
        bx, bw = R - 190, 172
        for i, (k, v, mk) in enumerate(d["info"]):
            yy = y - 34 - i * 12
            if mk: self.feld(bx - 3, yy - 3.5, bw + 6, 12); marken.append((yy + 2.5, mk))
            c.setFillColor(GRAU); c.setFont("Carlito", 8); c.drawString(bx, yy, k)
            c.setFillColor(TEXT); c.setFont("Carlito-Bold", 8.4); c.drawRightString(bx + bw, yy, v)
        # Titel
        y -= 100
        c.setFillColor(d["akzent"]); c.setFont("Carlito-Bold", 13.5); c.drawString(L, y, d["titel"])
        c.setFillColor(TEXT); c.setFont("Carlito", 8.6); c.drawString(L, y - 13, "Abrechnungszeitraum " + d["zeitraum"])
        # Lieferstelle
        y -= 30
        c.setFillColor(HELLGRAU); c.rect(L - 6, y - 64, R - L - 12, 72, fill=1, stroke=0)
        for i, (k, v, mk) in enumerate(d["stelle"]):
            yy = y - i * 13
            if mk: self.feld(L - 3, yy - 3.5, 300, 12.5); marken.append((yy + 2.5, mk))
            c.setFillColor(GRAU); c.setFont("Carlito", 8); c.drawString(L, yy, k)
            c.setFillColor(TEXT); c.setFont("Carlito-Bold", 8.4); c.drawString(L + 95, yy, v)
        # Zählerstände
        y -= 84
        c.setFillColor(d["akzent"]); c.setFont("Carlito-Bold", 9.2); c.drawString(L, y, "Ihr Verbrauch")
        y -= 13
        c.setFont("Carlito", 8); c.setFillColor(GRAU)
        sp = [L, L + 110, L + 220, R - 30]
        for t, xx in zip(["Ablesung alt", "Ablesung neu", "Differenz"], sp[:3]): c.drawString(xx, y, t)
        c.drawRightString(sp[3], y, "Verbrauch")
        y -= 12
        if d["umrechnung"] is None: self.feld(L - 3, y - 3.5, R - 30 - L + 6 + 3, 12.5); marken.append((y + 2.5, 4))
        c.setFillColor(TEXT); c.setFont("Carlito", 8.4)
        (da, za), (dn, zn) = d["zaehler"]
        c.drawString(sp[0], y, "%s: %s %s" % (da, za, d["einheit"])); c.drawString(sp[1], y, "%s: %s %s" % (dn, zn, d["einheit"]))
        diff = int(zn.replace(".", "")) - int(za.replace(".", ""))
        c.drawString(sp[2], y, de(diff, 0) + " " + d["einheit"])
        c.setFont("Carlito-Bold", 8.6); c.drawRightString(sp[3], y, de(d["verbrauch"], 0) + " kWh")
        if d["umrechnung"]:
            y -= 13; self.feld(L - 3, y - 3.5, R - 30 - L + 6 + 3, 12.5); marken.append((y + 2.5, 4))
            c.setFillColor(TEXT); c.setFont("Carlito", 8.2); c.drawString(L, y, "Umrechnung: " + d["umrechnung"])
        c.setFillColor(GRAU); c.setFont("Carlito", 7.6); y -= 12; c.drawString(L, y, d["vorjahr"])
        # Posten
        y -= 20
        c.setFillColor(d["akzent"]); c.setFont("Carlito-Bold", 9.2); c.drawString(L, y, "Ihre Kosten im Einzelnen")
        y -= 13
        kx = [L, L + 205, L + 300, R - 30]
        c.setFillColor(GRAU); c.setFont("Carlito", 7.8)
        for t, xx in zip(["Position", "Menge", "Preis netto"], kx[:3]): c.drawString(xx, y, t)
        c.drawRightString(kx[3], y, "Betrag netto")
        c.setStrokeColor(LINIE); c.setLineWidth(0.5); c.line(L, y - 3, R - 30, y - 3)
        gruppe = None; summe = 0
        namen = {"Energie": "Energielieferung", "Netz": "Netznutzung und Messung", "Abgaben": "Steuern, Abgaben und Umlagen"}
        for g, name, mt, pt, betrag, mk in d["posten"]:
            if g != gruppe:
                y -= 12; gruppe = g; c.setFillColor(NAVY); c.setFont("Carlito-Bold", 7.9); c.drawString(L, y, namen[g])
            y -= 10.5
            if mk: self.feld(L - 3, y - 3, R - 30 - L + 6 + 3, 10.5); marken.append((y + 2.2, mk))
            c.setFillColor(TEXT); c.setFont("Carlito", 7.9)
            c.drawString(L + 6, y, name); c.drawString(kx[1], y, mt); c.drawString(kx[2], y, pt)
            c.drawRightString(kx[3], y, de(betrag) + " €"); summe += betrag
        mwst = round(summe * 0.19, 2); brutto = round(summe + mwst, 2); bez = round(12 * d["abschlag"], 2); rest = round(brutto - bez, 2)
        y -= 6; c.line(L + 260, y + 2, R - 30, y + 2)
        for t, v, fett in [("Summe netto", summe, False), ("Umsatzsteuer 19 %", mwst, False), ("Rechnungsbetrag", brutto, True)]:
            y -= 11; c.setFont("Carlito-Bold" if fett else "Carlito", 8.2); c.setFillColor(TEXT)
            c.drawString(L + 260, y, t); c.drawRightString(kx[3], y, de(v) + " €")
        y -= 12; self.feld(L + 257, y - 14.5, R - 30 - L - 257 + 3, 23); marken.append((y - 3, 7))
        c.setFillColor(TEXT); c.setFont("Carlito", 8.2)
        c.drawString(L + 260, y, "abzüglich Abschläge 12 × " + de(d["abschlag"]) + " €"); c.drawRightString(kx[3], y, "− " + de(bez) + " €")
        y -= 11; c.setFont("Carlito-Bold", 8.4)
        c.drawString(L + 260, y, "Nachzahlung" if rest > 0 else "Guthaben"); c.drawRightString(kx[3], y, de(abs(rest)) + " €")
        c.setFont("Carlito", 7.6); c.setFillColor(GRAU)
        c.drawString(L, y + 11, "Ihr neuer monatlicher Abschlag: " + d["neuer_abschlag"])
        c.drawString(L, y, "Der Betrag wird am 05. des Folgemonats abgebucht.")
        # Vertrag
        y -= 26
        c.setFillColor(d["akzent"]); c.setFont("Carlito-Bold", 9.2); c.drawString(L, y, "Ihr Vertrag")
        for i, (k, v, mk) in enumerate(d["vertrag"]):
            yy = y - 13 - i * 12
            if mk: self.feld(L - 3, yy - 3.5, R - 30 - L + 6 + 3, 12); marken.append((yy + 2.5, mk))
            c.setFillColor(GRAU); c.setFont("Carlito", 8); c.drawString(L, yy, k)
            c.setFillColor(TEXT); c.setFont("Carlito-Bold", 8.3); c.drawString(L + 95, yy, v)
        c.setFillColor(GRAU); c.setFont("Carlito-Italic", 7); c.drawCentredString(x0 + w / 2, 8, "MUSTER · Versorger, Kunde, Nummern und Beträge sind frei erfunden")
        # Nummern links am Rand
        for yy, n in marken: self.marke(x0 - 3, yy, n)
        c.restoreState()
        self.ergebnis = (summe, brutto, rest)

class Abschlagsplan(Flowable):
    """Kleines Muster einer Abschlagsmitteilung"""
    def __init__(self): super().__init__(); self.w, self.h = BREITE, 178
    def wrap(self, aw, ah): return self.w, self.h
    def draw(self):
        c, w, h = self.canv, self.w, self.h
        c.saveState()
        c.setFillColor(colors.HexColor("#E6E9EE")); c.rect(3, -3, w * 0.62, h, fill=1, stroke=0)
        c.setFillColor(colors.white); c.setStrokeColor(LINIE); c.setLineWidth(0.6); c.rect(0, 0, w * 0.62, h, fill=1, stroke=1)
        c.setFillColor(colors.HexColor("#2F5D8A")); c.rect(0, h - 5, w * 0.62, 5, fill=1, stroke=0)
        c.setFont("Carlito-Bold", 11); c.drawString(14, h - 24, "Beispiel-Energie AG")
        c.setFont("Carlito-Bold", 10.5); c.drawString(14, h - 44, "Abschlagsplan 2026")
        c.setFillColor(TEXT); c.setFont("Carlito", 8); c.drawString(14, h - 57, "Kundennummer 4711 0815 23 · Bäckerei Sonnenkorn GmbH")
        zeilen = [("Februar bis Juni 2026", "je 1.400,00 €"), ("Juli bis Dezember 2026", "je 1.400,00 €"), ("Fälligkeit", "jeweils am 05. des Monats")]
        for i, (a, b) in enumerate(zeilen):
            c.setFillColor(GRAU); c.drawString(14, h - 78 - i * 13, a); c.setFillColor(TEXT); c.drawRightString(w * 0.62 - 14, h - 78 - i * 13, b)
        c.setFillColor(GRAU); c.setFont("Carlito-Italic", 7); c.drawString(14, 10, "MUSTER · frei erfunden")
        # Stempel
        c.translate(w * 0.62 - 90, 32); c.rotate(8)
        c.setStrokeColor(WARN); c.setLineWidth(1.6); c.roundRect(-58, -14, 136, 30, 4, fill=0, stroke=1)
        c.setFillColor(WARN); c.setFont("Carlito-Bold", 10.5); c.drawCentredString(10, 3, "KEIN VERBRAUCH,")
        c.drawCentredString(10, -9, "KEINE MALO")
        c.restoreState()
        # Text rechts
        c.saveState(); c.setFillColor(NAVY); c.setFont("Carlito-Bold", 10.5); x = w * 0.62 + 18
        c.drawString(x, h - 20, "Daran erkennen Sie sie:")
        c.setFont("Carlito", 9.6); c.setFillColor(TEXT)
        for i, t in enumerate(["Titel „Abschlag“, „Abschlagsplan“", "oder „Abschlagsmitteilung“", "nur künftige Monatsbeträge", "keine Zählerstände", "kein Jahresverbrauch in kWh", "keine Preise im Einzelnen"]):
            c.drawString(x, h - 38 - i * 13.5, ("• " if i != 1 else "  ") + t)
        c.restoreState()

# ---------- Seitenrahmen ----------
def innen(c, doc):
    c.saveState()
    c.setFillColor(NAVY); c.rect(0, H - 34, W, 34, fill=1, stroke=0)
    c.setFillColor(GRUEN); c.rect(0, H - 37, W, 3, fill=1, stroke=0)
    c.drawImage(ImageReader(GRUND + "logo-weiss.png"), RAND, H - 28, width=46, height=46 * 196 / 420, mask="auto")
    c.setFillColor(colors.white); c.setFont("Carlito", 9.5); c.drawRightString(W - RAND, H - 22, "Vertriebsheft · Gewerbekunden bis 250.000 kWh")
    c.setFillColor(GRAU); c.setFont("Carlito", 8.5)
    c.drawString(RAND, 24, "EGC Energie · Vertriebsheft für Vertriebspartner · nur für den internen Gebrauch")
    c.drawRightString(W - RAND, 24, str(doc.page + 1))
    c.restoreState()

def inhaltsseiten():
    f = []
    # --- Willkommen ---
    f += kopfzeile("WILLKOMMEN IM TEAM", "Ihr Weg zum ersten eigenen Abschluss")
    f.append(P("Dieses Heft führt Sie Schritt für Schritt vom ersten Anruf bis zum unterschriebenen Auftrag. "
               "Es ist für Gewerbekunden mit einem Jahresverbrauch bis <b>250.000 kWh</b> gemacht: Bäckereien, "
               "Handwerksbetriebe, Praxen, Hotels, Gastronomie, Autohäuser, Büros und kleinere Produktionsbetriebe. "
               "Diese Kunden beraten Sie selbstständig und schließen selbst ab.", "intro"))
    f.append(P("Warum das ein guter Markt für Sie ist", "h2"))
    f.append(liste(["<b>Jeder Betrieb braucht Strom, viele auch Erdgas.</b> Sie verkaufen nichts, was der Kunde nicht ohnehin kauft.",
                    "<b>Viele Verträge laufen einfach weiter.</b> Wer nie vergleicht, zahlt häufig mehr als nötig.",
                    "<b>Der Inhaber hat keine Zeit dafür.</b> Genau das nehmen Sie ihm ab: Sie vergleichen, die Kalkulation rechnet, der Kunde unterschreibt einmal.",
                    "<b>Für den Kunden kostenfrei.</b> Der Service- und Beratungsauftrag kostet den Kunden nichts.",
                    "<b>Wiederkehrend.</b> Ein zufriedener Kunde bleibt über Jahre und empfiehlt Sie weiter."]))
    f.append(Spacer(1, 8))
    f.append(P("Was Sie in diesem Heft finden", "h2"))
    f.append(tabelle(["Kapitel", "Worum es geht", "Seite"], [
        ["Der Markt", "Wie sich die Börsenpreise entwickelt haben und was das für Ihre Kunden heißt", "3"],
        ["Ihre Kunden", "Kleine und mittlere Gewerbekunden erkennen und richtig einordnen", "4"],
        ["Die 7 Schritte", "Vom Erstkontakt bis zur Betreuung nach dem Abschluss", "5–16"],
        ["Die Jahresabrechnung", "Was auf der Rechnung steht, Abschlag und fehlende Rechnung (in Schritt 4)", "9–13"],
        ["Einwände", "Die häufigsten Einwände und wie Sie ruhig und ehrlich antworten", "17–18"],
        ["Rechnen und planen", "Rechenbeispiel, Regeln, Ihr Wochenplan und Ihre Ziele", "19–22"]], [0.22, 0.66, 0.12]))
    f.append(Spacer(1, 10))
    f.append(tipp("Lesen Sie zuerst die sieben Schritte und das Kapitel Einwände. Nehmen Sie das Heft zu Ihren ersten Terminen mit. "
                  "Fachliche Hintergründe zu Marktrollen, Preisbildung und Beschaffungsmodellen finden Sie im Schulungsheft "
                  "„Grundlagen der Energiewirtschaft“.", "SO ARBEITEN SIE MIT DEM HEFT"))
    f.append(PageBreak())

    # --- Markt ---
    f += kopfzeile("DER MARKT", "Was die Börsenpreise Ihnen erzählen")
    f.append(P("Der Großhandelspreis für Strom ist die Grundlage jedes Angebots. Seit der Energiekrise 2022 ist er stark gefallen, "
               "2026 zieht er wieder an. Für Ihre Kunden heißt beides: <b>Jetzt prüfen lohnt sich.</b>", "intro"))
    f.append(balken(JAHRE, "Strom Day-Ahead Deutschland, Jahresmittel in €/MWh", hoehe=185,
                    farben=[WARN, NAVY, NAVY, NAVY, GRUEN]))
    f.append(P("* 2026: 1. Januar bis %s. Quellen: 2022–2024 Bundesnetzagentur / SMARD, 2025 und 2026 berechnet aus Day-Ahead-Preisen "
               "von Energy-Charts (Fraunhofer ISE, Daten SMARD, CC BY 4.0). 100 €/MWh entsprechen 10 ct/kWh reiner Energiepreis "
               "ohne Netzentgelte, Steuern und Abgaben." % STAND_DE, "klein"))
    monate = [((dt.date(y, m, 1).strftime("%m/%y") if m in (1, 4, 7, 10) else ""), v) for (y, m), v in sorted(MON.items()) if (y, m) >= (2025, 1)]
    f.append(balken(monate, "Monatsmittel 2025 (dunkel) und 2026 (grün) in €/MWh, " + ("November 2026 bis %s" % STAND_DE), hoehe=165, beschriften=False,
                    farben=[NAVY if i < 12 else GRUEN for i in range(len(monate))]))
    f.append(Spacer(1, 4))
    f.append(P("Was das im Kundengespräch bedeutet", "h2"))
    f.append(tabelle(["Situation des Kunden", "Ihre Botschaft"], [
        ["Vertrag aus 2022 oder 2023", "Damals wurde oft zu Krisenpreisen abgeschlossen. Ein Vergleich zeigt meist schnell, ob der Kunde zu viel zahlt."],
        ["Vertrag läuft 2027 aus", "Die Preise ziehen seit Mitte 2026 wieder an. Wer rechtzeitig für die Folgejahre absichert, plant sicher."],
        ["Vertrag verlängert sich still", "Automatische Verlängerungen laufen oft zu Listenpreisen. Kündigungsfrist prüfen, vorher vergleichen."]], [0.34, 0.66]))
    f.append(Spacer(1, 6))
    f.append(tipp("Nennen Sie nie eine Preisprognose. Sagen Sie, was war, und lassen Sie die Kalkulation rechnen. "
                  "Der Kundenpreis entsteht am Terminmarkt für die Lieferjahre, nicht aus dem Tagespreis.", "WICHTIG"))
    f.append(PageBreak())

    # --- Kunden ---
    f += kopfzeile("IHRE KUNDEN", "Kleine und mittlere Gewerbekunden")
    f.append(P("Bis 250.000 kWh im Jahr gewinnen und betreuen Sie den Kunden selbst. Darüber, bei Tranchen- und PPA-Modellen "
               "oder vielen Lieferstellen holen Sie Ihren Teamleiter dazu.", "intro"))
    f.append(tabelle(["Kundengröße", "Typisch", "Zähler", "Worauf Sie achten"], [
        ["bis ca. 30.000 kWh", "Laden, Büro, Praxis, kleines Handwerk", "SLP", "Schnell entschieden, Preis und Einfachheit zählen. Ein Termin genügt oft."],
        ["30.000 bis 100.000 kWh", "Bäckerei, Metzgerei, Gastronomie, Werkstatt", "SLP", "Laufzeit und Preissicherheit wichtig. Häufig Strom und Erdgas zusammen."],
        ["100.000 bis 250.000 kWh", "Hotel, Autohaus, kleine Produktion, Pflegeheim", "meist RLM", "Ab 100.000 kWh wird meist viertelstündlich gemessen: Lastgang anfordern."]], [0.22, 0.3, 0.13, 0.35]))
    f.append(Spacer(1, 8))
    f.append(P("SLP und RLM in einem Satz", "h2"))
    f.append(P("<b>SLP</b> (Standardlastprofil): Der Verbrauch wird nur als Jahresmenge gemessen und rechnerisch verteilt. "
               "<b>RLM</b> (registrierende Leistungsmessung): Der Zähler misst jede Viertelstunde, auf der Rechnung steht dann auch "
               "ein Leistungspreis. Für RLM-Kunden braucht die Kalkulation zusätzlich den <b>Lastgang</b>, also die Messwerte des letzten Jahres."))
    f.append(P("Gute Gesprächsanlässe", "h2"))
    f.append(liste(["Vertrag läuft in den nächsten 6 bis 15 Monaten aus",
                    "Neue Jahresabrechnung mit hoher Nachzahlung",
                    "Eigentümerwechsel, Umzug, neue Filiale oder Neueinzug",
                    "Der Betrieb weiß nicht, wann sein Vertrag endet",
                    "Strom und Erdgas laufen bei verschiedenen Versorgern mit verschiedenen Laufzeiten"]))
    f.append(Spacer(1, 8))
    f.append(tipp("Fragen Sie im ersten Gespräch nach dem Vertragsende und notieren Sie es im Portal als Wiedervorlage. "
                  "Ein Kunde mit Vertrag ist kein verlorener Kunde, sondern ein Termin in Ihrem Kalender."))
    f.append(PageBreak())

    # --- 7 Schritte Überblick ---
    f += kopfzeile("DIE 7 SCHRITTE", "Vom ersten Anruf zum Abschluss")
    f.append(P("Jeder Abschluss folgt denselben sieben Schritten. Wer sie einhält, verliert keinen Kunden auf dem Weg.", "intro"))
    f.append(Schritte([
        ("Vorbereiten", "Kunde, Branche und Ansprechpartner kennen, bevor Sie anrufen", "5 Minuten"),
        ("Erstkontakt", "Interesse wecken und einen Termin vereinbaren", "3 Minuten"),
        ("Bedarf verstehen", "Fragen stellen, zuhören, die Lage des Kunden erfassen", "15 Minuten"),
        ("Unterlagen einsammeln", "Rechnung, Vollmacht, bei RLM der Lastgang", "5 Minuten"),
        ("Angebot anfragen", "Im Portal erfassen, die Kalkulation rechnet", "10 Minuten"),
        ("Angebot präsentieren", "Nutzen erklären, Fragen beantworten, Einwände klären", "15 Minuten"),
        ("Abschließen und betreuen", "Unterschrift per Link, Auftrag bestätigen, dranbleiben", "5 Minuten")]))
    f.append(Spacer(1, 6))
    f.append(tipp("Die Zeiten sind Richtwerte für einen kleinen Kunden. Wichtig ist die Reihenfolge: "
                  "Erst verstehen, dann rechnen lassen, dann präsentieren."))
    f.append(PageBreak())

    # --- Schritt 1 und 2 ---
    f += kopfzeile("SCHRITT 1 UND 2", "Vorbereiten und Erstkontakt")
    f.append(P("1 · Vorbereiten", "h2"))
    f.append(liste(["Firmenname genau so, wie er im Handelsregister oder bei Creditreform steht",
                    "Branche und ungefähre Betriebsgröße (Mitarbeiter, Fläche, Öffnungszeiten)",
                    "Wer entscheidet? Inhaber, Geschäftsführer oder Büroleitung",
                    "Gibt es den Kunden schon im Portal? Die Dublettenprüfung zeigt es Ihnen"]))
    f.append(P("2 · Erstkontakt am Telefon oder vor Ort", "h2"))
    f.append(sagen("„Guten Tag, [Name], mein Name ist [Ihr Name] von EGC Energie. Wir kümmern uns für Betriebe wie Ihren um den Einkauf "
                   "von Strom und Erdgas, unabhängig und für Sie kostenfrei. Viele zahlen mehr als nötig, weil der Vertrag einfach "
                   "weiterläuft. Darf ich Ihnen zwei kurze Fragen stellen?“"))
    f.append(Spacer(1, 8))
    f.append(P("Die zwei Einstiegsfragen", "h2"))
    f.append(liste(["„Wissen Sie, wann Ihr aktueller Strom- oder Gasvertrag ausläuft?“",
                    "„Haben Sie zuletzt verglichen, oder wurde der Vertrag einfach verlängert?“"], haken=False))
    f.append(Spacer(1, 8))
    f.append(sagen("„Dann schlage ich vor: Ich komme kurz vorbei, wir schauen gemeinsam auf Ihre letzte Rechnung, und Sie sehen "
                   "schwarz auf weiß, ob sich ein Wechsel lohnt. Passt Ihnen Dienstag oder Donnerstag besser?“", "TERMIN FESTMACHEN"))
    f.append(Spacer(1, 8))
    f.append(tipp("Immer zwei Termine zur Auswahl anbieten: nicht ob, sondern wann. Bitten Sie den Kunden, die letzte Jahresrechnung "
                  "bereitzulegen. Den Termin tragen Sie gleich im Portal-Kalender ein."))
    f.append(PageBreak())

    # --- Schritt 3 ---
    f += kopfzeile("SCHRITT 3", "Bedarf verstehen")
    f.append(P("Zuhören ist hier wichtiger als Reden. Die Antworten des Kunden sind später Ihre besten Argumente.", "intro"))
    f.append(tabelle(["Frage", "Warum Sie sie stellen"], [
        ["„Wann endet Ihr Vertrag, und wie lang ist die Kündigungsfrist?“", "Bestimmt den frühesten Lieferbeginn und den Zeitdruck."],
        ["„Was zahlen Sie ungefähr je Kilowattstunde?“", "Zeigt, ob der Kunde seinen Preis kennt. Meist nicht, dann hilft die Rechnung."],
        ["„Was ist Ihnen wichtiger: ein fester Preis oder ein möglichst günstiger?“", "Die wichtigste Frage. Sie entscheidet zwischen Festpreis und Spotmarkt mit Festpreis-Option."],
        ["„Wie lange möchten Sie planen können?“", "Gibt die Laufzeit vor, meist 12 bis 36 Monate."],
        ["„Plant Ihr Betrieb Veränderungen: Erweiterung, Photovoltaik, E-Autos?“", "Verbrauch kann sich ändern; das gehört ins Angebot und in die Bemerkung."],
        ["„Haben Sie mehrere Standorte oder auch Erdgas?“", "Mehrere Lieferstellen in einer Anfrage sparen Ihnen und dem Kunden Zeit."],
        ["„Wer entscheidet außer Ihnen mit?“", "Damit beim Angebotstermin alle Entscheider da sind."]], [0.5, 0.5], fett_erste=True))
    f.append(Spacer(1, 8))
    f.append(tipp("Schreiben Sie den Satz des Kunden zu Frage 3 wörtlich mit. Sagt er „Ich will einfach Ruhe haben“, beginnen Sie die "
                  "Präsentation später genau damit: „Sie hatten gesagt, Sie wollen Ruhe haben. Deshalb …“"))
    f.append(PageBreak())

    # --- Schritt 4 ---
    f += kopfzeile("SCHRITT 4", "Unterlagen einsammeln")
    f.append(P("Vollständige Unterlagen sind der schnellste Weg zum Angebot. Fehlt etwas, entsteht ein Klärfall und der Kunde wartet.", "intro"))
    f.append(tabelle(["Unterlage", "Wofür", "Pflicht"], [
        ["Letzte Jahresrechnung, alle Seiten (PDF oder Foto)", "Versorger, Zählernummer, MaLo und Verbrauch; bei einer PDF liest das Portal sie aus", "ja"],
        ["Marktlokations-ID (MaLo) und Zählernummer", "Eindeutige Kennung jeder Lieferstelle, steht auf der Rechnung", "ja"],
        ["Jahresverbrauch in kWh", "Grundlage für Preis und Versorgerauswahl", "ja"],
        ["Vertragsende und Kündigungsfrist", "Frühester Lieferbeginn, Kündigung durch uns", "wenn bekannt"],
        ["Lastgang (Excel oder CSV)", "Nur bei RLM: die Viertelstundenwerte des letzten Jahres", "bei RLM"],
        ["Service- und Beratungsauftrag (Vollmacht)", "Erlaubt uns, Angebote einzuholen und Verträge zu kündigen und abzuschließen", "zum Abschluss"],
        ["Gewerbeanmeldung und Pachtvertrag", "Nur bei Neueinzug ohne bisherigen Versorger", "bei Neueinzug"]], [0.36, 0.5, 0.14]))
    f.append(Spacer(1, 8))
    f.append(P("Zeit einplanen", "h2"))
    f.append(P("Der Auftrag sollte spätestens <b>60 Werktage vor dem gewünschten Lieferbeginn</b> vollständig bei uns sein, damit die "
               "Anmeldung beim Versorger fristgerecht klappt. Das sind knapp drei Monate. Für einen Lieferbeginn am 1. Januar also bis Anfang Oktober."))
    f.append(tipp("Lassen Sie sich die Rechnung direkt vor Ort als Foto oder PDF geben. Die Checkliste „Kundenunterlagen“ finden Sie im "
                  "Portal unter Unterlagen → Dokumente."))
    f.append(PageBreak())

    # --- Jahresabrechnung Strom ---
    f += kopfzeile("DIE JAHRESABRECHNUNG LESEN", "Beispiel: Jahresabrechnung Strom")
    f.append(P("So kann eine Jahresverbrauchsabrechnung aussehen. Die grünen Nummern zeigen, was Sie für ein Angebot brauchen; "
               "auf der nächsten Seite steht, was jede Nummer bedeutet.", "intro"))
    f.append(Rechnung("strom", hoehe=625))
    f.append(PageBreak())

    # --- Was steht wo ---
    f += kopfzeile("DIE JAHRESABRECHNUNG LESEN", "Was steht wo?")
    f.append(P("<b>Jede Rechnung sieht anders aus.</b> Jeder Versorger hat sein eigenes Layout und nennt die Dinge manchmal anders. "
               "Suchen Sie deshalb nicht nach einer bestimmten Stelle, sondern nach diesen neun Angaben.", "intro"))
    f.append(tabelle(["Nr.", "Angabe", "Woran Sie sie erkennen, andere Namen", "Wofür wir sie brauchen"], [
        ["1", "Kundennummer", "Meist oben rechts. Auch „Kunden-Nr.“, „Vertragskonto“ oder „Geschäftspartner“.", "Damit der Versorger den Kunden zuordnet, zum Beispiel bei der Kündigung."],
        ["2", "Marktlokation (MaLo)", "11 Ziffern. Auch „Marktlokations-ID“ oder „MaLo-ID“.", "Eindeutige Kennung der Lieferstelle, für Angebot und Anmeldung."],
        ["3", "Messlokation und Zählernummer", "Messlokation: „DE“ und 31 weitere Zeichen, früher „Zählpunkt“. Die Zählernummer steht auch auf dem Zähler.", "Ordnet den Zähler der Lieferstelle zu."],
        ["4", "Jahresverbrauch", "Zählerstand alt und neu, Verbrauch in kWh. Bei Erdgas aus m³ umgerechnet.", "Grundlage für Preis und Versorgerauswahl."],
        ["5", "Energiepreis (Arbeitspreis)", "In ct/kWh, dazu ein Grundpreis in €/Monat.", "Das ist der Teil, den wir vergleichen."],
        ["6", "Netzentgelte", "Eigene Posten, oft zusammen mit dem Messstellenbetrieb.", "Zeigt, was gleich bleibt (siehe unten)."],
        ["7", "Zahlungen und Abschläge", "Geleistete Abschläge, dazu Nachzahlung oder Guthaben.", "Eine hohe Nachzahlung ist ein guter Gesprächsanlass."],
        ["8", "Laufzeit", "Vertragsende oder Erstlaufzeit. Steht manchmal nur im Vertrag oder Kundenportal.", "Bestimmt den frühesten Lieferbeginn."],
        ["9", "Kündigungsfrist", "Zum Beispiel „3 Monate zum Ende der Laufzeit“.", "Wer sie verpasst, verlängert oft still um ein Jahr."]],
        [0.06, 0.22, 0.4, 0.32], fett_erste=False))
    f.append(Spacer(1, 8))
    f.append(tipp("Netzentgelte, Messstellenbetrieb, Steuern, Abgaben und Umlagen sind bei jedem Versorger gleich. Eine Ersparnis "
                  "entsteht beim Arbeitspreis und beim Grundpreis der Energie. Versprechen Sie dem Kunden deshalb keine Ersparnis "
                  "auf den ganzen Rechnungsbetrag.", "WICHTIG FÜR DAS GESPRÄCH"))
    f.append(Spacer(1, 6))
    f.append(tipp("Lassen Sie sich immer <b>alle Seiten</b> geben. Laufzeit und Kündigungsfrist stehen oft auf der letzten Seite oder im "
                  "Kleingedruckten. Bei RLM-Kunden kommt die Rechnung oft monatlich: dann die letzten 12 Monatsrechnungen oder den Lastgang anfordern."))
    f.append(PageBreak())

    # --- Jahresabrechnung Erdgas ---
    f += kopfzeile("DIE JAHRESABRECHNUNG LESEN", "Beispiel: Jahresabrechnung Erdgas")
    f.append(P("Derselbe Kunde, ein anderer Versorger: Aufbau, Begriffe und Vertragsende sind anders. Bei Erdgas misst "
               "der Zähler Kubikmeter, erst die Umrechnung (Nummer 4) ergibt die kWh.", "intro"))
    f.append(Rechnung("gas", hoehe=625))
    f.append(PageBreak())

    # --- Abschlag oder Jahresabrechnung ---
    f += kopfzeile("NICHT VERWECHSELN", "Jahresabrechnung oder Abschlag?")
    f.append(P("Viele Kunden legen Ihnen das falsche Blatt hin: die <b>Abschlagsmitteilung</b> (auch „Abschlagsplan“). Sie zeigt nur, "
               "was der Kunde künftig monatlich zahlt. <b>Damit können wir kein Angebot rechnen.</b>", "intro"))
    f.append(Abschlagsplan())
    f.append(Spacer(1, 12))
    f.append(tabelle(["", "Jahresverbrauchsabrechnung", "Abschlagsmitteilung"], [
        ["Zeitraum", "Rückblick auf die letzten 12 Monate", "Vorschau auf die kommenden Monate"],
        ["Zählerstände und Verbrauch in kWh", "ja", "nein"],
        ["Marktlokation und Zählernummer", "ja", "meist nicht"],
        ["Preise im Einzelnen", "ja, Arbeitspreis, Grundpreis, Netzentgelte", "nein, nur ein Monatsbetrag"],
        ["Kommt", "einmal im Jahr, nach der Ablesung", "nach der Jahresabrechnung, bei Preisänderung oder Vertragsbeginn"],
        ["Für ein Angebot", "<b>brauchen wir sie</b>", "<b>reicht nicht</b>"]], [0.3, 0.37, 0.33]))
    f.append(Spacer(1, 10))
    f.append(sagen("„Das ist Ihr Abschlagsplan, der zeigt leider nur die Monatsbeträge. Für ein Angebot brauche ich die Jahresabrechnung "
                   "mit dem Verbrauch. Liegt die vielleicht im Kundenportal Ihres Versorgers oder in Ihrem E-Mail-Postfach?“"))
    f.append(Spacer(1, 8))
    f.append(tipp("Oft ist der neue Abschlagsplan die letzte Seite der Jahresabrechnung. Dann fehlen nur die Seiten davor: Fragen Sie nach dem ganzen Schreiben."))
    f.append(PageBreak())

    # --- Keine Abrechnung da ---
    f += kopfzeile("WENN DIE RECHNUNG FEHLT", "„Meine Abrechnung habe ich gerade nicht da“")
    f.append(P("Die Rechnung liegt beim Steuerberater, im Büro oder ist nicht auffindbar? Kein Grund, den Termin abzubrechen. "
               "Mit drei Dingen kommen Sie trotzdem zum Angebot: <b>Versorger, Kundennummer und Zählernummer.</b> "
               "Den Rest holen Sie sich mit der Vollmacht selbst.", "intro"))
    f.append(Schritte([
        ("Vollmacht ausfüllen", "Blanko-Vollmacht mit den Kundendaten ausfüllen und unterschreiben lassen", "vor Ort"),
        ("Ins Online-Banking schauen", "Lastschrift suchen: Versorger und Kundennummer stehen im Verwendungszweck", "vor Ort"),
        ("Zähler fotografieren", "Zählernummer und Zählerstand gut lesbar, Strom und Erdgas getrennt", "vor Ort"),
        ("Daten beim Versorger anfordern", "Mit der Vollmacht: Jahresverbrauch, MaLo, Vertragsende und Kündigungsfrist", "danach"),
        ("Angebot anfragen", "Daten im Portal eintragen, die Kalkulation rechnet", "danach")]))
    f.append(Spacer(1, 4))
    f.append(sagen("„Kein Problem, darum kümmern wir uns. Sie unterschreiben mir die Vollmacht, wir schauen kurz in Ihr Online-Banking, "
                   "wer bei Ihnen abbucht, und ich fotografiere den Zähler. Alles Weitere hole ich mir direkt bei Ihrem Versorger.“"))
    f.append(Spacer(1, 8))
    f.append(tipp("Die Blanko-Vollmacht finden Sie im Portal unter <b>Unterlagen → „Vollmacht blanko (PDF)“</b>. In der Angebotsanfrage "
                  "setzen Sie bei der Lieferstelle das Häkchen „Zählerfoto vorhanden“ und laden das Foto hoch. Der Kunde merkt dabei: "
                  "<b>Sie kümmern sich um alles.</b>", "IM PORTAL"))
    f.append(PageBreak())

    # --- Schritt 5 ---
    f += kopfzeile("SCHRITT 5", "Angebot im Portal anfragen")
    f.append(P("Im Portal tippen Sie auf <b>„Angebot anfragen“</b>. Der Assistent führt Sie in vier Schritten durch die Anfrage.", "intro"))
    f.append(tabelle(["Im Portal", "Was Sie eintragen"], [
        ["1 · Kunde", "Firmenname, Anschrift, Ansprechpartner, Telefon und E-Mail. Die E-Mail brauchen Sie später für den Angebotsversand."],
        ["2 · Lieferstellen", "Oben wählen: Strom, Erdgas oder beides. Je Lieferstelle zuerst die Rechnung hochladen; Zählernummer, MaLo und Verbrauch prüfen."],
        ["3 · Angebotswunsch", "Produkt (zum Beispiel Festpreis oder Spotmarkt), gewünschter Lieferbeginn und Laufzeit, Bemerkungen für die Kalkulation."],
        ["4 · Prüfen und senden", "Das Portal zeigt, was noch fehlt. Ist alles grün, an die Kalkulation senden."]], [0.25, 0.75]))
    f.append(Spacer(1, 8))
    f.append(P("Was danach passiert", "h2"))
    f.append(liste(["Die <b>Kalkulation</b> holt Preise bei mehreren Versorgern ein und erstellt das Angebot.",
                    "Sie bekommen eine <b>E-Mail</b>, sobald das Angebot im Portal liegt.",
                    "Fehlt etwas, meldet sich die Kalkulation mit einem <b>Klärfall</b>; er steht oben auf Ihrer Startseite unter „Zu tun für dich“."]))
    f.append(Spacer(1, 8))
    f.append(tipp("Schreiben Sie in die Bemerkung alles, was der Kunde Ihnen erzählt hat: „Will Ruhe, Festpreis wichtiger als letzter Cent“, "
                  "„plant Photovoltaik 2027“. Je besser die Kalkulation den Kunden kennt, desto passender wird das Angebot."))
    f.append(PageBreak())

    # --- Schritt 6 ---
    f += kopfzeile("SCHRITT 6", "Angebot präsentieren")
    f.append(P("Präsentieren Sie nicht Zahlen, sondern die Lösung für das, was der Kunde Ihnen in Schritt 3 gesagt hat.", "intro"))
    f.append(sagen("„Sie hatten mir gesagt, dass Ihnen [Satz des Kunden] wichtig ist. Genau darauf haben wir das Angebot ausgerichtet: "
                   "[Laufzeit] Jahre fester Energiepreis bei [Versorger], Start am [Datum]. Um die Kündigung beim bisherigen Versorger "
                   "kümmern wir uns.“"))
    f.append(Spacer(1, 8))
    f.append(P("So erklären Sie ein Angebot", "h2"))
    f.append(tabelle(["Baustein", "In Kundensprache"], [
        ["Arbeitspreis (ct/kWh)", "Der Preis je Kilowattstunde, die Sie verbrauchen."],
        ["Grundpreis (€/Monat)", "Eine feste Monatspauschale, unabhängig vom Verbrauch."],
        ["Leistungspreis (nur RLM)", "Richtet sich nach Ihrer höchsten Viertelstunde im Jahr: Lastspitzen kosten Geld."],
        ["Laufzeit und Preisgarantie", "Wie lange der Preis gilt und was genau fest ist. Oft ist nur der Energieanteil fest, Netzentgelte und Steuern nicht."],
        ["Gültig bis", "Bis wann das Angebot angenommen werden muss, weil sich Börsenpreise täglich ändern."]], [0.3, 0.7]))
    f.append(Spacer(1, 8))
    f.append(P("Ihre drei stärksten Argumente", "h2"))
    f.append(liste(["<b>Unabhängig:</b> EGC ist kein Versorger. Wir vergleichen viele Anbieter und stehen auf der Seite des Kunden.",
                    "<b>Bequem:</b> Wir übernehmen Vergleich, Kündigung und Wechsel. Der Kunde unterschreibt einmal, auch am Handy.",
                    "<b>Dranbleiben:</b> Wir begleiten den Kunden über die ganze Laufzeit und melden uns rechtzeitig vor Vertragsende."]))
    f.append(PageBreak())

    # --- Schritt 7 ---
    f += kopfzeile("SCHRITT 7", "Abschließen und betreuen")
    f.append(P("Ein gutes Angebot verkauft sich nicht von selbst. Fragen Sie nach dem Auftrag.", "intro"))
    f.append(sagen("„Dann machen wir das so: Ich schicke Ihnen das Angebot gleich per E-Mail. Sie tippen auf den Knopf, tragen Ihren Namen "
                   "ein und unterschreiben mit dem Finger. Um alles Weitere kümmern wir uns.“", "SIE SAGEN ZUM ABSCHLUSS"))
    f.append(Spacer(1, 8))
    f.append(tabelle(["Im Portal", "Was passiert"], [
        ["„Angebot an den Kunden senden“", "Der Kunde bekommt eine E-Mail mit persönlichem Link. Sie können einen eigenen Satz dazuschreiben und festlegen, was er eintragen muss."],
        ["Kunde öffnet", "Sie sehen, wann er das Angebot geöffnet hat, und bekommen eine Mail: der beste Moment für einen kurzen Anruf."],
        ["Kunde unterschreibt", "Name, IBAN und Unterschrift stehen fest im PDF. Sie bekommen eine Nachricht, der Kunde eine Kopie."],
        ["„Annahme übernehmen“", "Variante und Unterlagen sind schon eingetragen. Sie prüfen und senden den Auftrag an die Kalkulation."],
        ["Einreichung und Bestätigung", "Die Kalkulation reicht beim Versorger ein. Nach der Bestätigung erscheint der Kunde in Ihrer Provisionsübersicht."]], [0.3, 0.7]))
    f.append(Spacer(1, 6))
    f.append(P("Lieber persönlich? Das Angebot lässt sich auch ausdrucken oder als PDF schicken und vor Ort unterschreiben. "
               "Danach tippen Sie „Selbst versendet“ und laden die unterschriebenen Unterlagen bei der Annahme hoch.", "klein"))
    f.append(P("Nach dem Abschluss", "h2"))
    f.append(liste(["Kurz danken und den Lieferbeginn bestätigen",
                    "Nach einer Weiterempfehlung fragen: „Kennen Sie einen Betrieb, dem das auch helfen würde?“",
                    "Vertragsende als Wiedervorlage im Portal eintragen, damit Sie sich rechtzeitig wieder melden"]))
    f.append(PageBreak())

    # --- Einwände ---
    EINWAENDE = [
        ("„Ich habe noch einen Vertrag.“",
         "Sehr gut, dann haben wir Zeit, es richtig zu machen. Der neue Vertrag beginnt erst, wenn Ihr jetziger endet, "
         "und den Preis dafür können wir schon heute sichern. Die Kündigung übernehmen wir fristgerecht für Sie. Wann läuft Ihr Vertrag aus?",
         "Vertragsende und Kündigungsfrist notieren, Wiedervorlage im Portal setzen. Mindestens 60 Werktage vor Lieferbeginn anfragen."),
        ("„Ich bin mit meinem Stadtwerk zufrieden.“",
         "Das freut mich, und das Stadtwerk kann gern im Vergleich dabei sein. Zufrieden sein und den besten Preis haben sind "
         "zwei verschiedene Dinge. Lassen Sie uns einfach nachrechnen, dann entscheiden Sie mit Zahlen.",
         "Nicht schlecht über den Versorger reden. Der Vergleich überzeugt, nicht die Kritik."),
        ("„Was kostet mich Ihre Beratung?“",
         "Für Sie ist unser Service- und Beratungsauftrag kostenfrei. Wir werden über die Versorger vergütet, mit denen wir zusammenarbeiten.",
         "Ehrlich und kurz antworten. Unsicherheit bei dieser Frage kostet Vertrauen."),
        ("„Ich warte lieber, bis die Preise fallen.“",
         "Das verstehe ich, nur kennt niemand die Zukunft. Seit Mitte 2026 sind die Börsenpreise wieder gestiegen. "
         "Wer abwartet, trägt das Risiko. Eine Alternative ist der Spotmarkt mit Festpreis-Option: Start am Börsenpreis, "
         "und wir sichern Ihren Wunschpreis, sobald er erreicht ist.",
         "Nie eine Preisprognose abgeben. Fakten nennen und beide Wege rechnen lassen."),
        ("„Ein Wechsel ist mir zu aufwendig.“",
         "Genau das übernehmen wir. Sie geben mir die letzte Rechnung und unterschreiben einmal, auch am Handy. Kündigung, Anmeldung "
         "und Wechsel erledigen wir. Zähler und Leitungen bleiben, wie sie sind.",
         "Den Aufwand für den Kunden konkret benennen: eine Rechnung, eine Unterschrift."),
        ("„Was, wenn beim Wechsel der Strom ausfällt?“",
         "Das kann nicht passieren. Strom und Gas kommen weiter über dasselbe Netz Ihres Netzbetreibers. Es ändert sich nur, "
         "wer Ihnen die Energie in Rechnung stellt. Die Versorgung ist gesetzlich gesichert.",
         "Ruhig und sicher antworten. Diese Sorge ist häufig und leicht auszuräumen."),
        ("„Schicken Sie mir einfach mal was zu.“",
         "Mache ich gern. Damit es für Sie etwas wert ist, rechne ich mit Ihren echten Zahlen. Schicken Sie mir ein Foto Ihrer "
         "letzten Rechnung, dann komme ich mit einem konkreten Angebot auf Sie zu. Passt Ihnen Donnerstag für einen kurzen Rückruf?",
         "Ohne Rechnung kein Angebot. Immer einen festen Rückruftermin vereinbaren."),
        ("„Eine Vollmacht unterschreibe ich nicht.“",
         "Verstehe ich, man soll nicht alles unterschreiben. Die Vollmacht erlaubt uns nur, für Ihre Energieverträge Angebote "
         "einzuholen, zu kündigen und abzuschließen. Sie läuft 12 Monate und ist 6 Wochen vor Ablauf kündbar. "
         "Ohne sie geben uns Versorger keine Daten und Preise.",
         "Den Service- und Beratungsauftrag gemeinsam durchgehen. Offenheit schafft Vertrauen."),
        ("„Ich habe ein günstigeres Angebot.“",
         "Prima, dann vergleichen wir genau: Laufzeit, Grundpreis, was an der Preisgarantie wirklich fest ist und was bei "
         "Mehr- oder Mindermengen passiert. Oft ist das günstigere Angebot nur auf den ersten Blick günstiger.",
         "Das andere Angebot mitnehmen und der Kalkulation geben. Nie schlechtreden, ohne es gesehen zu haben."),
        ("„Das muss ich erst mit meinem Partner oder Steuerberater besprechen.“",
         "Sehr vernünftig. Ich schicke Ihnen das Angebot per E-Mail, dann haben Sie alles schriftlich. Sollen wir einen kurzen Termin zu dritt machen, "
         "damit ich offene Fragen gleich beantworte?",
         "Entscheider einbinden und einen nächsten Termin festmachen, bevor Sie gehen."),
    ]
    f += kopfzeile("EINWÄNDE", "Die zehn häufigsten Einwände")
    f.append(P("Ein Einwand ist kein Nein, sondern eine Frage. Hören Sie zu, zeigen Sie Verständnis, antworten Sie ehrlich, "
               "und führen Sie dann zum nächsten Schritt.", "intro"))
    f.append(kasten([P("DIE FORMEL FÜR JEDEN EINWAND", "label"),
                     P("<b>1. Verständnis zeigen</b> („Das verstehe ich.“) · <b>2. Nachfragen</b> („Was genau meinen Sie?“) · "
                       "<b>3. Ehrlich antworten</b> · <b>4. Nächsten Schritt vorschlagen</b>")], grund=HELLGRAU, rand=NAVY))
    f.append(Spacer(1, 10))
    for i, (e, a, t) in enumerate(EINWAENDE):
        block = Table([[P(e, "h2")], [P(a)], [P("<font color='#6CB43B'><b>Tipp:</b></font> " + t, "klein")]], colWidths=[BREITE])
        block.setStyle(TableStyle([("LINEBEFORE", (0, 0), (0, -1), 3, GRUEN), ("LEFTPADDING", (0, 0), (-1, -1), 12),
                                   ("TOPPADDING", (0, 0), (-1, -1), 1), ("BOTTOMPADDING", (0, 0), (-1, -1), 2)]))
        f.append(KeepTogether([block, Spacer(1, 12)]))
    f.append(PageBreak())

    # --- Rechenbeispiel ---
    f += kopfzeile("RECHNEN", "So machen Sie Ersparnis greifbar")
    f.append(P("Kunden denken in Euro, nicht in Cent je Kilowattstunde. Rechnen Sie den Unterschied immer auf das Jahr und die Laufzeit hoch.", "intro"))
    zeilen = []
    for kwh in (30000, 80000, 150000, 250000):
        for ct in (1, 3):
            e = kwh * ct / 100
            zeilen.append([f"{kwh:,}".replace(",", ".") + " kWh", f"{ct} ct/kWh", f"{e:,.0f} €".replace(",", "."), f"{e * 3:,.0f} €".replace(",", ".")])
    f.append(tabelle(["Jahresverbrauch", "Preisunterschied", "im Jahr", "in 3 Jahren"], zeilen, [0.28, 0.24, 0.24, 0.24]))
    f.append(P("Beispielrechnung netto, ohne Grundpreis. Die tatsächliche Ersparnis steht im Angebot der Kalkulation.", "klein"))
    f.append(Spacer(1, 6))
    f.append(sagen("„Bei Ihren 80.000 Kilowattstunden sind 3 Cent Unterschied 2.400 Euro im Jahr. Über drei Jahre sind das "
                   "7.200 Euro, die in Ihrem Betrieb bleiben.“", "SO KLINGT DAS IM GESPRÄCH"))
    f.append(Spacer(1, 8))
    f.append(P("Faustregeln zum Umrechnen", "h2"))
    f.append(liste(["1 ct/kWh = 10 €/MWh",
                    "Jahresverbrauch ÷ 8.760 Stunden = mittlere Leistung in kW (Beispiel: 87.600 kWh ÷ 8.760 h = 10 kW)",
                    "Ab 100.000 kWh Strom im Jahr wird in der Regel viertelstündlich gemessen (RLM)"], haken=False))
    f.append(PageBreak())

    # --- Regeln ---
    f += kopfzeile("IHRE SPIELREGELN", "So bleiben Sie glaubwürdig")
    regeln = Table([[ [P("SO MACHEN SIE ES RICHTIG", "label"), liste([
        "Den Kunden reden lassen und seinen Satz aufgreifen",
        "Nur Zahlen nennen, die im Angebot stehen",
        "Beide Wege rechnen lassen: Festpreis und Spotmarkt",
        "Unterlagen vollständig erfassen, Rechnung immer hochladen",
        "Vertragsende als Wiedervorlage eintragen",
        "Nach dem Abschluss nach einer Empfehlung fragen"], breite=BREITE / 2 - 28)],
                       [P("DAS SAGEN UND TUN SIE NIE", "label"), liste([
        "„Der Preis fällt bestimmt.“ oder „Sie sparen garantiert.“",
        "„Wir liefern Ihnen den Strom.“ EGC ist kein Versorger.",
        "Den bisherigen Versorger schlechtreden",
        "Preise oder Ersparnisse versprechen, die die Kalkulation nicht bestätigt hat",
        "Ausweiskopien oder Unterlagen per privatem Messenger sammeln",
        "Unterschreiben lassen, ohne den Auftrag zu erklären"], breite=BREITE / 2 - 28, farbe="#B24328")]]],
                   colWidths=[BREITE / 2 - 6, BREITE / 2 - 6], spaceBefore=4)
    regeln.setStyle(TableStyle([("BACKGROUND", (0, 0), (0, 0), HELLGRUEN), ("BACKGROUND", (1, 0), (1, 0), colors.HexColor("#FBEFEC")),
                                ("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 12), ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                                ("TOPPADDING", (0, 0), (-1, -1), 10), ("BOTTOMPADDING", (0, 0), (-1, -1), 12)]))
    f.append(regeln)
    f.append(Spacer(1, 12))
    f.append(P("Richtige Wörter, falsche Wörter", "h2"))
    f.append(tabelle(["Statt", "Besser"], [
        ["„Wir kaufen Ihren Strom ein.“", "„Wir holen für Sie Angebote bei mehreren Versorgern ein.“"],
        ["„Unser Strom ist billiger.“", "„Das Angebot von [Versorger] ist für Sie günstiger.“"],
        ["„Unterschreiben Sie mal hier.“", "„Mit diesem Auftrag dürfen wir Angebote einholen und den Wechsel für Sie erledigen.“"],
        ["„Die Preise steigen bald wieder.“", "„Seit Mitte 2026 sind die Börsenpreise gestiegen. Wie es weitergeht, weiß niemand.“"]], [0.42, 0.58]))
    f.append(Spacer(1, 10))
    f.append(tipp("Datenschutz ist Vertrauenssache: Kundenunterlagen gehören ins Portal, nicht in private Chats oder E-Mail-Postfächer.", "DATENSCHUTZ"))
    f.append(PageBreak())

    # --- Wochenplan ---
    f += kopfzeile("IHR PLAN", "Erfolg ist planbar")
    f.append(P("Abschlüsse sind kein Glück, sondern das Ergebnis regelmäßiger Arbeit. Ein einfaches Beispiel für eine Woche:", "intro"))
    f.append(tabelle(["Aktivität", "Beispiel pro Woche", "Ihr Ziel"], [
        ["Kontakte (Anrufe, Besuche, Empfehlungen)", "25", ""],
        ["Gespräche mit Entscheidern", "8", ""],
        ["Termine vor Ort oder per Video", "4", ""],
        ["Angebotsanfragen im Portal", "2", ""],
        ["Abschlüsse", "1", ""]], [0.5, 0.25, 0.25]))
    f.append(P("Die Zahlen sind ein Beispiel zur Orientierung, keine Vorgabe. Ihre eigene Quote sehen Sie nach einigen Wochen im Portal.", "klein"))
    f.append(Spacer(1, 8))
    f.append(P("Ihr Tagesrhythmus", "h2"))
    f.append(liste(["<b>Morgens:</b> Startseite im Portal öffnen, „Zu tun für dich“ abarbeiten: Klärfälle zuerst, dann geöffnete Angebote nachfassen.",
                    "<b>Vormittags:</b> Anrufzeit, Inhaber erreichen Sie oft zwischen 9 und 11 Uhr.",
                    "<b>Nachmittags:</b> Termine vor Ort, Unterlagen gleich im Portal hochladen.",
                    "<b>Freitags:</b> Woche auswerten, Wiedervorlagen für die nächste Woche planen."]))
    f.append(Spacer(1, 10))
    f.append(kasten([P("MOTIVATION", "label"),
                     P("Jeder Kunde, den Sie gewinnen, bleibt im Idealfall über Jahre und bringt Ihnen jedes Lieferjahr erneut Provision. "
                       "Wer jede Woche einen kleinen Kunden gewinnt, baut sich in einem Jahr einen Bestand von rund 50 Betrieben auf. "
                       "Ihre Provision sehen Sie jederzeit im Portal unter „Meine Provisionen“.", "sagen")], grund=NAVY, rand=GRUEN))
    f.append(PageBreak())

    # --- Ziele ---
    f += kopfzeile("MEINE ZIELE", "Meine ersten 90 Tage")
    for titel in ("Mein Ziel für die ersten 30 Tage", "Mein Ziel nach 90 Tagen", "Die 10 Betriebe, die ich zuerst anspreche"):
        f.append(P(titel, "h2")); f.append(Linien(26 * (4 if titel.startswith("Die 10") else 3)))
    f.append(P("Mein Teamleiter und meine Ansprechpartner", "h2"))
    f.append(tabelle(["Wer", "Name", "Telefon"], [["Teamleiter", "", ""], ["Kalkulation", "", ""], ["Vertragsmanagement", "", ""]], [0.34, 0.36, 0.3]))
    return f

# ---------- Umschlag und Rückseite ----------
def umschlag(bild):
    puffer = io.BytesIO(); c = canvas.Canvas(puffer, pagesize=A4)
    im = Image.open(bild).convert("RGB")
    soll = im.width * H / W
    if im.height > soll:
        oben = int((im.height - soll) * 0.35); im = im.crop((0, oben, im.width, oben + int(soll)))
    im = im.resize((2480, int(2480 * H / W)), Image.LANCZOS).filter(ImageFilter.UnsharpMask(radius=2, percent=60, threshold=2))
    b = io.BytesIO(); im.save(b, "JPEG", quality=92); b.seek(0)
    c.drawImage(ImageReader(b), 0, 0, width=W, height=H)
    for i in range(80):
        hoehe = 470 / 80; a = 0.93 * (1 - i / 80) ** 1.6
        c.setFillColorRGB(10/255, 22/255, 38/255, alpha=a); c.rect(0, H - (i + 1) * hoehe, W, hoehe + 0.5, fill=1, stroke=0)
    c.setFillAlpha(1)
    c.drawImage(ImageReader(GRUND + "logo-weiss.png"), 48, H - 120, width=128, height=128 * 196 / 420, mask="auto")
    c.setFillColor(GRUEN); c.setFont("Carlito-Bold", 11); c.drawString(50, H - 190, "VERTRIEBSHEFT FÜR VERTRIEBSPARTNER")
    c.setFillColor(colors.white); c.setFont("Carlito-Bold", 44)
    c.drawString(48, H - 240, "Erfolgreich beraten,"); c.drawString(48, H - 286, "sicher abschließen")
    c.setFillColor(GRUEN); c.rect(50, H - 310, 70, 4, fill=1, stroke=0)
    c.setFillColorRGB(0.85, 0.89, 0.93); c.setFont("Carlito", 13)
    c.drawString(50, H - 336, "Gewerbekunden bis 250.000 kWh Schritt für Schritt gewinnen:")
    c.drawString(50, H - 353, "Gesprächsleitfaden · Einwände · Portal · Rechenbeispiele")
    c.setFillColorRGB(10/255, 22/255, 38/255, alpha=0.92); c.rect(0, 0, W, 58, fill=1, stroke=0); c.setFillAlpha(1)
    c.setFillColor(GRUEN); c.rect(0, 58, W, 3, fill=1, stroke=0)
    c.setFillColor(colors.white); c.setFont("Carlito-Bold", 11); c.drawString(50, 26, "EGC Energie")
    c.setFont("Carlito", 10); c.setFillColorRGB(0.75, 0.8, 0.86)
    c.drawRightString(W - 50, 26, "Unabhängige Energieberatung für Gewerbe und Industrie · bundesweit")
    c.showPage(); c.save()
    return PdfReader(io.BytesIO(puffer.getvalue())).pages[0]

def leer_seite(art):
    puffer = io.BytesIO(); c = canvas.Canvas(puffer, pagesize=A4)
    if art == "rueck":
        c.setFillColor(NAVY); c.rect(0, 0, W, H, fill=1, stroke=0)
        c.setFillColor(GRUEN); c.rect(0, H - 6, W, 6, fill=1, stroke=0)
        c.drawImage(ImageReader(GRUND + "logo-weiss.png"), (W - 170) / 2, H / 2 + 40, width=170, height=170 * 196 / 420, mask="auto")
        c.setFillColor(colors.white); c.setFont("Carlito-Bold", 16)
        c.drawCentredString(W / 2, H / 2 - 10, "Unabhängige Energieberatung für Gewerbe und Industrie")
        c.setFillColorRGB(0.75, 0.8, 0.86); c.setFont("Carlito", 11.5)
        c.drawCentredString(W / 2, H / 2 - 30, "Bundesweit · kein Versorger · auf der Seite des Kunden")
        c.setFillColor(GRUEN); c.rect(W / 2 - 35, H / 2 - 52, 70, 3, fill=1, stroke=0)
        c.setFillColorRGB(0.85, 0.89, 0.93); c.setFont("Carlito", 11)
        c.drawCentredString(W / 2, 90, "EGC Energie · In den Erlenwiesen 11 · 66914 Waldmohr")
        c.drawCentredString(W / 2, 74, "Telefon 06373 8920114 · anfrage@egc-energie.de · www.egc-energie.de")
        c.setFillColorRGB(0.55, 0.62, 0.7); c.setFont("Carlito", 8.5)
        c.drawCentredString(W / 2, 40, "Vertriebsheft für Vertriebspartner · nur für den internen Gebrauch · Stand 11/2026")
    c.showPage(); c.save()
    return PdfReader(io.BytesIO(puffer.getvalue())).pages[0]

def notizen_flowables(n):
    f = []
    for _ in range(n):
        f += [PageBreak(), P("Notizen", "h1"), Linien(H - 210)]
    return f

if __name__ == "__main__":
    titelbild, ausgabe = sys.argv[1], sys.argv[2]

    def bauen(extra_notizen):
        puffer = io.BytesIO()
        doc = BaseDocTemplate(puffer, pagesize=A4, leftMargin=RAND, rightMargin=RAND, topMargin=62, bottomMargin=48)
        doc.addPageTemplates([PageTemplate(id="innen", frames=[Frame(RAND, 48, BREITE, H - 62 - 48, id="f", leftPadding=0,
                                                                       rightPadding=0, topPadding=0, bottomPadding=0)], onPage=innen)])
        doc.build(inhaltsseiten() + notizen_flowables(extra_notizen))
        return PdfReader(io.BytesIO(puffer.getvalue()))

    innenteil = bauen(0)
    n = len(innenteil.pages)
    extra = (-(n + 2)) % 4                     # + Umschlag und Rückseite, auf Vielfache von 4
    if extra: innenteil = bauen(extra)
    ziel = PdfWriter()
    for seite in [umschlag(titelbild)] + list(innenteil.pages) + [leer_seite("rueck")]:
        neu = ziel.add_blank_page(W, H); neu.merge_page(seite)
    ziel.add_metadata({"/Title": "EGC Vertriebsheft · Erfolgreich beraten, sicher abschließen", "/Author": "EGC Energie"})
    with open(ausgabe, "wb") as fh:
        ziel.write(fh)
    print(ausgabe, len(ziel.pages), "Seiten, davon", n, "Innenseiten ohne Notizen,", extra, "Notizseiten")
