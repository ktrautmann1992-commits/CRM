"""Anleitung für die Kalkulation: So arbeitet die Kalkulation im EGC-Vertriebsportal (Stand v5.43).
DIN A4 Hochformat im Design des Vertriebshefts. Bildschirmfotos aus der Testumgebung (Demodaten).
Aufruf: python3 druckvorlagen/kalkulation/anleitung.py bilderordner ausgabe.pdf"""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "vertriebsheft"))
import heft as h
from reportlab.platypus import (BaseDocTemplate, PageTemplate, Frame, Spacer, PageBreak, Image, KeepTogether, NextPageTemplate)
from reportlab.lib import colors
from PIL import Image as PILImage

P, S, kasten, tipp, tabelle, liste, kopfzeile, sagen = h.P, h.S, h.kasten, h.tipp, h.tabelle, h.liste, h.kopfzeile, h.sagen
W, H, RAND, BREITE = h.W, h.H, h.RAND, h.BREITE
NAVY, GRUEN, GRAU = h.NAVY, h.GRUEN, h.GRAU
STAND = "Stand: Portal v5.43 · 20.11.2026"

def bild(ordner, name, breite=None, max_hoehe=430):
    pfad = os.path.join(ordner, name)
    with PILImage.open(pfad) as im:
        w, hh = im.size
    b = breite or BREITE
    hoehe = b * hh / w
    if hoehe > max_hoehe:
        hoehe = max_hoehe; b = hoehe * w / hh
    i = Image(pfad, width=b, height=hoehe)
    i.hAlign = "LEFT"
    return i

def unterschrift(t):
    return P(t, "klein")

def innen(c, doc):
    c.saveState()
    c.setFillColor(NAVY); c.rect(0, H - 34, W, 34, fill=1, stroke=0)
    c.setFillColor(GRUEN); c.rect(0, H - 37, W, 3, fill=1, stroke=0)
    c.drawImage(h.ImageReader(h.GRUND + "logo-weiss.png"), RAND, H - 28, width=46, height=46 * 196 / 420, mask="auto")
    c.setFillColor(colors.white); c.setFont("Carlito", 9.5); c.drawRightString(W - RAND, H - 22, "Anleitung Kalkulation · Vertriebsportal")
    c.setFillColor(GRAU); c.setFont("Carlito", 8.5)
    c.drawString(RAND, 24, "EGC Energie · Anleitung für die Kalkulation · nur für den internen Gebrauch · " + STAND)
    c.drawRightString(W - RAND, 24, str(doc.page))
    c.restoreState()

def titel(c, doc):
    c.saveState()
    c.setFillColor(NAVY); c.rect(0, 0, W, H, fill=1, stroke=0)
    c.setFillColor(GRUEN); c.rect(0, H - 8, W, 8, fill=1, stroke=0)
    c.drawImage(h.ImageReader(h.GRUND + "logo-weiss.png"), 50, H - 130, width=128, height=128 * 196 / 420, mask="auto")
    c.setFillColor(GRUEN); c.setFont("Carlito-Bold", 11); c.drawString(50, H - 210, "ANLEITUNG FÜR DIE KALKULATION")
    c.setFillColor(colors.white); c.setFont("Carlito-Bold", 40)
    c.drawString(48, H - 258, "So arbeitet die"); c.drawString(48, H - 302, "Kalkulation im Portal")
    c.setFillColor(GRUEN); c.rect(50, H - 326, 70, 4, fill=1, stroke=0)
    c.setFillColorRGB(0.85, 0.89, 0.93); c.setFont("Carlito", 13)
    for i, z in enumerate(["Anfragen prüfen · Angebote kalkulieren · Preise je Lieferstelle",
                           "Aufschläge · Spotmarkt-Vergleich · Versorgerbestätigung"]):
        c.drawString(50, H - 352 - i * 18, z)
    c.setFillColorRGB(0.55, 0.62, 0.7); c.setFont("Carlito", 10)
    c.drawString(50, 60, STAND + " · Bildschirmfotos mit Demodaten · nur für den internen Gebrauch")
    c.restoreState()

def inhalt(o):
    f = [NextPageTemplate("innen"), PageBreak()]
    # --- Überblick ---
    f += kopfzeile("ÜBERBLICK", "Was die Kalkulation im Portal macht")
    f.append(P("Die Kalkulation prüft jede Angebotsanfrage des Vertriebs, holt Preise bei den Versorgern ein, erstellt das Angebot "
               "und bestätigt später, dass der Versorger den Kunden angenommen hat. Diese Anleitung zeigt jeden Schritt.", "intro"))
    f.append(P("Ihr Menü", "h2"))
    f.append(tabelle(["Menüpunkt", "Wofür"], [
        ["Übersicht", "Was heute zu tun ist: neue Anfragen, offene Bestätigungen, angeforderte Unterlagen"],
        ["Neue Anfragen", "Eingereichte Anfragen des Vertriebs, die kalkuliert werden müssen"],
        ["Versorgerbestätigung", "Aufträge, die beim Versorger liegen: Bestätigung, Klärfall oder Ablehnung erfassen"],
        ["Neue Aufträge", "Vom Kunden angenommene Angebote, die beim Versorger eingereicht werden"],
        ["Smartmeter", "Smartmeter-Angebote und ihr Ablauf"],
        ["Kalkulationen", "Alle bisherigen Kalkulationen"],
        ["Alle Vorgänge, Aufgaben, Versorger, Kalender, Tickets, Unterlagen", "Nachschlagen und Zusammenarbeit"]], [0.3, 0.7]))
    f.append(PageBreak())
    f += kopfzeile("ÜBERBLICK", "Der Weg eines Vorgangs")
    f.append(h.Schritte([
        ("Anfrage eingereicht", "Der Vertrieb sendet die Anfrage an die Kalkulation", "Vertrieb"),
        ("Prüfen und kalkulieren", "Unterlagen prüfen, Preise einholen, Angebot erzeugen", "Kalkulation"),
        ("Angebot beim Kunden", "Der Vertrieb stellt das Angebot vor, der Kunde unterschreibt", "Vertrieb"),
        ("Beim Versorger einreichen", "Auftrag an den Versorger übermitteln", "Kalkulation"),
        ("Versorger bestätigt", "Bestätigung erfassen: Mengen, Aufschläge, Lieferzeiten", "Kalkulation"),
        ("Provision eingegangen", "Die Geschäftsführung erfasst den Eingang und schließt ab", "Geschäftsführung")]))
    f.append(tipp("Diese Reihenfolge wird nie verkürzt. Erst wenn die Geschäftsführung den Provisionseingang bestätigt hat, sieht der "
                  "Vertriebspartner den Kunden in seiner Provisionsliste.", "WICHTIG"))
    f.append(PageBreak())

    # --- Wer sieht was ---
    f += kopfzeile("VERTRAULICHKEIT", "Wer welche Zahlen sieht")
    f.append(P("Provisionen sind eine Vertrauensfrage im Vertrieb. Das Portal zeigt jeder Rolle nur, was sie braucht.", "intro"))
    f.append(tabelle(["Rolle", "sieht"], [
        ["Vertriebspartner, Teamleiter, Leitung Vertrieb", "nur den eigenen Anteil und den Aufschlag für den Vertrieb"],
        ["Kalkulation", "den Anteil des Vertriebspartners, den Aufschlag für den Vertrieb und den tatsächlichen Aufschlag"],
        ["Finanzbuchhaltung", "alle Anteile und die Gesamtaufteilung"],
        ["Geschäftsführung", "alles, auch den Firmenanteil (80 %)"]], [0.38, 0.62]))
    f.append(Spacer(1, 8))
    f.append(P("Zwei Aufschläge", "h2"))
    f.append(P("Je Variante, je Lieferstelle und bei der Versorgerbestätigung gibt es zwei Aufschläge in ct/kWh:"))
    f.append(liste(["<b>Aufschlag für den Vertriebspartner</b>: Darauf rechnen Vertriebspartner, Teamleiter und Leitung Vertrieb ihre Provision.",
                    "<b>Tatsächlicher Aufschlag</b>: Darauf rechnet die Gesamtprovision der Firma. Leer heißt: gleich wie der Aufschlag für den Vertrieb."]))
    f.append(Spacer(1, 6))
    f.append(tabelle(["Beispiel: 100.000 kWh", "Betrag"], [
        ["Tatsächlicher Aufschlag 3 ct: Gesamtprovision", "3.000 €"],
        ["Aufschlag für den Vertrieb 1,5 ct: Grundlage für den Vertrieb", "1.500 €"],
        ["Vertriebspartner 25 % und Teamleiter 25 % (Differenz) auf 1.500 €", "je 375 €"],
        ["Bei EGC: Firmenanteil 80 % von 3.000 €", "2.400 €"],
        ["Verbleibt in der Firma: 2.400 € − 750 €", "1.650 €"]], [0.72, 0.28]))
    f.append(Spacer(1, 8))
    f.append(tipp("Den tatsächlichen Aufschlag nie dem Vertrieb nennen, auch nicht in Hinweisen oder Nachrichten. Er liegt in einer "
                  "eigenen, geschützten Tabelle, die nur Kalkulation, Geschäftsführung und Finanzbuchhaltung lesen dürfen. "
                  "Einen Bonus für Eigenakquise gibt es nicht mehr.", "VERTRAULICH"))
    f.append(PageBreak())

    # --- Anfrage prüfen ---
    f += kopfzeile("SCHRITT 1", "Anfrage öffnen und prüfen")
    f.append(P("Unter <b>Neue Anfragen</b> den Vorgang öffnen. Oben stehen der nächste Schritt und die Knöpfe für die Bearbeitung, "
               "rechts Kunde und Angebotswunsch des Vertriebs.", "intro"))
    f.append(bild(o, "02_vorgang.jpg", max_hoehe=250))
    f.append(unterschrift("Vorgang aus Sicht der Kalkulation (Demodaten)."))
    f.append(P("Was Sie hier tun können", "h2"))
    f.append(tabelle(["Knopf oder Kasten", "Wofür"], [
        ["Angebot in Bearbeitung, beim Versorger angefragt", "Häkchen setzen, sobald Sie Preise beim Versorger angefragt haben; der Vorgang steht dann auf „beim Versorger angefragt“"],
        ["Angebot kalkulieren", "Varianten, Preise und Aufschläge erfassen und das Angebot erzeugen (Schritt 2 bis 5)"],
        ["Unterlagen nachfordern", "Fehlendes beim Vertriebspartner anfordern (nächste Seite)"],
        ["Rücksprache Geschäftsführung", "Frage an die GF; der Vorgang ist so lange für die Kalkulation gesperrt"],
        ["Kunden- und Lieferstellendaten bearbeiten", "Firmenname, Anschrift, Verbräuche, MaLo ändern, Lieferstellen ergänzen oder löschen"],
        ["Individualanfrage an den Versorger", "Bei Tranchen oder PPA: Paket mit Anfrage-PDF und Lastgängen laden"]], [0.42, 0.58]))
    f.append(Spacer(1, 6))
    f.append(tipp("Der Vertriebspartner darf seine Anfrage selbst ändern, bis Sie das Angebot erstellt haben. Hat er nach dem "
                  "Einreichen etwas geändert, steht oben ein gelber Hinweis mit Datum, Uhrzeit und Anzahl der Lieferstellen. "
                  "Bitte dann Kundendaten und Lieferstellen vor dem Angebot noch einmal prüfen.", "ÄNDERUNGEN DES VERTRIEBS"))
    f.append(PageBreak())

    # --- Unterlagen nachfordern ---
    f += kopfzeile("SCHRITT 1", "Unterlagen nachfordern")
    f.append(P("Fehlt etwas, tippen Sie auf <b>Unterlagen nachfordern</b>, haken an, was fehlt, und senden die Anfrage zurück. "
               "Der Vertriebspartner sieht die Liste als Klärfall oben auf seiner Startseite.", "intro"))
    f.append(bild(o, "03_nachfordern.jpg", breite=BREITE * 0.75))
    f.append(unterschrift("Mit „Sonstiges“ fordern Sie alles an, was nicht in der Liste steht. Der Text erscheint als eigener Punkt."))
    f.append(P("Gut zu wissen", "h2"))
    f.append(liste(["Pflicht ist die <b>Marktlokation (MaLo)</b>. Die Zählernummer ist kein Pflichtfeld.",
                    "Der Vertrieb kann Kunden auch per CSV-Datei anlegen. Prüfen Sie solche Anfragen besonders auf Tippfehler in MaLo und Verbrauch.",
                    "Eine Abschlagsmitteilung reicht für eine Kalkulation nicht. Es braucht die Jahresverbrauchsabrechnung."]))
    f.append(PageBreak())

    # --- Bisheriger Versorger + Umlagen ---
    f += kopfzeile("SCHRITT 2", "Bisheriger Versorger und Umlagen")
    f.append(P("Nach <b>Angebot kalkulieren</b> tragen Sie zuerst je Lieferstelle den bisherigen Tarif ein. Er ist die Grundlage für den "
               "Vergleich im Angebot und für den Spotmarkt-Vergleich.", "intro"))
    f.append(bild(o, "04_bisheriger_versorger.jpg", breite=BREITE * 0.62, max_hoehe=420))
    f.append(liste(["<b>Preis ermitteln:</b> Arbeitspreis und Grundpreis direkt eintragen oder aus Rechnungsbetrag, Verbrauch und Zeitraum berechnen lassen.",
                    "<b>Abrechnung aus dem Jahr:</b> Ist die Rechnung älter, gleicht das Portal den bisherigen Arbeitspreis um die gestiegenen Umlagen aus und weist das im Angebot aus.",
                    "<b>Umlagen:</b> Die staatlichen Umlagen und Abgaben pflegt die Kalkulation einmal im Kasten darüber. Sie gelten ab dann für jede neue Kalkulation."]))
    f.append(PageBreak())

    # --- Variante ---
    f += kopfzeile("SCHRITT 3", "Variante anlegen")
    f.append(P("Jede Variante ist ein eigenes Angebot, zum Beispiel Festpreis 24 Monate und Spotmarkt 12 Monate. "
               "Mit <b>Weitere Variante hinzufügen</b> legen Sie mehrere an.", "intro"))
    f.append(bild(o, "05_variante.jpg", breite=BREITE * 0.62, max_hoehe=380))
    f.append(tabelle(["Feld", "Bedeutung"], [
        ["Gilt für", "Strom, Erdgas oder beides. Darunter einzelne Lieferstellen an- oder abwählen: Die Variante gilt dann nur für diese."],
        ["Neuer Versorger", "Versorger der Variante (je Lieferstelle abweichend möglich)"],
        ["Beschaffungsmodell", "Festpreis, Spotmarkt, Tranchenmodell oder PPA-Modell. Beim Spotmarkt erscheint der Spotmarkt-Vergleich."],
        ["Aufschlag für den Vertriebspartner", "Grundlage der Vertriebsprovision, sieht der Vertrieb"],
        ["Tatsächlicher Aufschlag", "Grundlage der Gesamtprovision, sieht der Vertrieb nicht; leer = wie für den Vertrieb"],
        ["Lieferbeginn, Vertragsdauer", "Laufzeit in Monaten oder festes Lieferende"],
        ["Angebot gültig bis", "Bindefrist des Angebots"]], [0.3, 0.7]))
    f.append(PageBreak())

    # --- Preise je Lieferstelle ---
    f += kopfzeile("SCHRITT 4", "Preise je Lieferstelle")
    f.append(P("Je Lieferstelle tragen Sie die Preise des neuen Versorgers netto ein. Preise in ct/kWh mit bis zu vier Nachkommastellen, "
               "so stehen sie auch im Angebot.", "intro"))
    f.append(bild(o, "06_preise.jpg", breite=BREITE * 0.62, max_hoehe=330))
    f.append(tabelle(["Feld", "Eintrag"], [
        ["Arbeitspreis (ct/kWh)", "Gesamter Arbeitspreis des Versorgers"],
        ["davon Energiepreis (ct/kWh)", "Reiner Energieanteil"],
        ["Grundpreis (€/Jahr)", "Grundpreis des Versorgers"],
        ["Ohne Grundpreis", "Nennt der Versorger Energiepreis und Grundpreis zusammen in ct/kWh: Häkchen setzen. Das Feld Grundpreis verschwindet, "
                            "der Energiepreis heißt „inkl. Grundpreis“, im Angebot steht keine Grundpreis-Zeile."],
        ["Netzentgelte laut Versorger", "Freiwillig. Eingetragen übernimmt das Angebot die Aufteilung des Versorgers: Umlagen und Abgaben = "
                                        "Arbeitspreis − Energiepreis − Netzentgelte. Leer rechnet das Portal: Netzentgelte = Arbeitspreis − Energiepreis − Umlagen."],
        ["Lastspitze, Leistungspreis", "Nur bei RLM: Leistungspreis des Netzbetreibers je kW"]], [0.3, 0.7]))
    f.append(Spacer(1, 6))
    f.append(tipp("Unter jeder Lieferstelle zeigt das Portal zur Kontrolle Umlagen und Netzentgelte. Sind die Netzentgelte negativ, "
                  "stimmt ein Preis nicht."))
    f.append(PageBreak())

    # --- Abweichend je Lieferstelle ---
    f += kopfzeile("SCHRITT 4", "Abweichende Werte je Lieferstelle")
    f.append(P("Jede Lieferstelle kann, egal ob Strom oder Erdgas, einen eigenen Versorger, Lieferbeginn, eine eigene Laufzeit und eigene "
               "Aufschläge bekommen. Leer gilt der Wert der Variante.", "intro"))
    f.append(bild(o, "07_je_lieferstelle.jpg", breite=BREITE * 0.6, max_hoehe=430))
    f.append(unterschrift("Beispiel: Erdgas ohne Grundpreis, mit Netzentgelten laut Versorger und eigenem Versorger, Beginn, 12 Monaten und eigenen Aufschlägen. "
                          "Darunter steht, was für diese Lieferstelle gilt."))
    f.append(PageBreak())
    f += kopfzeile("SCHRITT 4", "So rechnet die Provision")
    f.append(bild(o, "08_provision.jpg", breite=BREITE * 0.75))
    f.append(liste(["Provision je Lieferstelle = Verbrauch × Aufschlag. Die Variante zählt alle ihre Lieferstellen zusammen.",
                    "Läuft eine Lieferstelle länger, zählt sie in den späteren Lieferjahren allein. Der Kasten zeigt dann „über bis zu 3 Lieferjahre (je Lieferstelle)“.",
                    "Sie sehen den Anteil des Vertriebspartners und beide Aufschläge, nicht die Aufteilung in der Struktur."]))
    f.append(PageBreak())

    # --- Spotmarkt-Vergleich ---
    f += kopfzeile("SCHRITT 4", "Spotmarkt-Vergleich 2025")
    f.append(P("Steht das Beschaffungsmodell auf <b>Spotmarkt</b>, erscheint der Kasten Spotmarkt-Vergleich 2025. Er zeigt, was der Kunde "
               "2025 am Spotmarkt bezahlt hätte, und kommt als eigene Seite ins Angebot.", "intro"))
    f.append(bild(o, "11_spot.jpg", breite=BREITE * 0.6, max_hoehe=360))
    f.append(tabelle(["Bestandteil", "Woher"], [
        ["Ø Börsenpreis 2025", "fest im Portal: Strom 8,9322 ct/kWh, Erdgas 3,7178 ct/kWh (Mittel aller Stunden bzw. Tage 2025)"],
        ["+ Aufschlag auf den Börsenpreis", "tragen Sie ein, z. B. 1 ct"],
        ["+ Netzentgelte 2025", "tragen Sie je Lieferstelle ein, von der Rechnung 2025"],
        ["+ Umlagen 2025", "aus den hinterlegten Vorjahreswerten der Umlagen"],
        ["= Arbeitspreis Spotmarkt 2025", "× Verbrauch, verglichen mit dem bisherigen Vertrag 2025"]], [0.38, 0.62]))
    f.append(PageBreak())

    # --- Weitere Angaben, Angebot erzeugen ---
    f += kopfzeile("SCHRITT 5", "Angebot erzeugen und senden")
    f.append(P("Weitere Angaben", "h2"))
    f.append(liste(["<b>Smartmeter-Angebot:</b> hinzufügen oder mit „Entfernen“ herausnehmen. Entfernt bleibt es entfernt, der Vertrieb sieht „Kein Smartmeter-Angebot möglich“.",
                    "<b>Zusatzbemerkungen im Service- & Beratungsauftrag:</b> erscheinen im PDF in einem eigenen Feld.",
                    "<b>Hinweis an den Vertriebspartner:</b> nur intern, steht nicht im Angebot.",
                    "<b>Hinweis im Angebot:</b> je Variante, steht im PDF und sieht der Kunde.",
                    "<b>Dienstleistungsvertrag:</b> anhaken, wenn er benötigt wird; er geht mit dem Angebot an den Vertriebspartner."]))
    f.append(P("Angebot erzeugen", "h2"))
    f.append(bild(o, "09_angebot_erzeugen.jpg", breite=BREITE * 0.75))
    f.append(liste(["<b>Mit Vorversorger-Vergleich:</b> Das Angebot stellt den bisherigen Tarif dem neuen gegenüber.",
                    "<b>Ohne Vorversorger-Vergleich:</b> nur unser Angebot.",
                    "Das PDF wird sofort angezeigt. Zum Nachbessern Preise ändern und neu erzeugen.",
                    "Im Service- & Beratungsauftrag stehen genau die Lieferstellen der Variante."]))
    f.append(bild(o, "10_senden.jpg", breite=BREITE * 0.6))
    f.append(P("Jede Variante braucht ein Angebot: erzeugt, als PDF angehängt oder als Individualangebot vom Versorger. "
               "Dann <b>Angebot an Vertriebspartner senden</b>. Er bekommt eine E-Mail.", "text"))
    f.append(PageBreak())

    # --- Nach der Annahme ---
    f += kopfzeile("SCHRITT 6", "Beim Versorger einreichen und bestätigen")
    f.append(P("Hat der Kunde unterschrieben, reicht der Vertriebspartner den Auftrag ein. Er erscheint bei Ihnen unter <b>Neue Aufträge</b>.", "intro"))
    f.append(liste(["Unterlagen prüfen: unterschriebenes Angebot und Service- & Beratungsauftrag.",
                    "Beim Versorger einreichen und im Vorgang „Auftrag an den Versorger übermittelt“ tippen. Der Vorgang wandert in die Versorgerbestätigung.",
                    "Kommt die Antwort des Versorgers: <b>Auftrag bestätigt</b>, <b>Klärfall</b> oder <b>Abgelehnt</b> erfassen."]))
    f.append(bild(o, "12_bestaetigung.jpg", breite=BREITE * 0.55, max_hoehe=420))
    f.append(unterschrift("Auftrag bestätigt: Versorger, je Lieferstelle bestätigte kWh, Lieferbeginn und -ende, auf Wunsch eigener Versorger und eigene Aufschläge; "
                          "darunter die Aufschläge für alle übrigen Lieferstellen und eine Bonuszahlung des Versorgers."))
    f.append(PageBreak())
    f += kopfzeile("ZUM SCHLUSS", "Das Wichtigste auf einen Blick")
    f.append(tabelle(["Merksatz", "Warum"], [
        ["Den tatsächlichen Aufschlag nie an den Vertrieb geben", "Vertrauensfrage; er ist im Portal geschützt"],
        ["Pflicht ist die MaLo, nicht die Zählernummer", "Die MaLo identifiziert die Lieferstelle eindeutig"],
        ["Bestätigte Mengen genau eintragen", "Die Provision rechnet auf die vom Versorger bestätigte Menge"],
        ["Abweichende Werte nur, wo nötig", "Leer gilt die Variante; so bleibt das Angebot übersichtlich"],
        ["Spotmarkt: Netzentgelte 2025 eintragen", "Sonst fehlt der Vergleich im Angebot"],
        ["Keinen Eigenakquise-Bonus berücksichtigen", "Den gibt es nicht mehr"],
        ["EGC ist kein Versorger", "Wir holen Angebote ein und vermitteln; „wir kaufen ein“ sagen wir nie"]], [0.45, 0.55]))
    f.append(Spacer(1, 10))
    f.append(tipp("Fragen zum Portal, Fehler oder Wünsche bitte als Ticket im Portal unter „Tickets“ melden. "
                  "Die Fassung steht unten in der Seitenleiste; bitte immer mit angeben.", "HILFE"))
    return f

if __name__ == "__main__":
    ordner, ausgabe = sys.argv[1], sys.argv[2]
    doc = BaseDocTemplate(ausgabe, pagesize=h.A4, leftMargin=RAND, rightMargin=RAND, topMargin=62, bottomMargin=48,
                          title="EGC Anleitung Kalkulation", author="EGC Energie")
    rahmen = Frame(RAND, 48, BREITE, H - 62 - 48, id="f", leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
    doc.addPageTemplates([PageTemplate(id="titel", frames=[rahmen], onPage=titel),
                          PageTemplate(id="innen", frames=[rahmen], onPage=innen)])
    doc.build(inhalt(ordner))
    print(ausgabe)
