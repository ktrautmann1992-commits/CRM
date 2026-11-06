"""Schulungsfolien (PDF aus LibreOffice Impress) ins EGC-Design bringen, ohne die Texte anzufassen.

- Farben: Petrol/Orange der Vorlage werden auf EGC-Navy und -Grün abgebildet.
- Überschriften: die Serifenschrift Caladea wird durch Carlito Fett ersetzt (gleiche Familie wie der
  Fließtext). Die Zeichen werden über die ToUnicode-Tabelle gelesen und neu kodiert, der Text bleibt gleich.
- Logo: kleines EGC-Logo oben rechts auf jeder Seite, weiß auf dunklen, navy auf hellen Seiten.

Aufruf: python3 umgestalten.py eingabe.pdf ausgabe.pdf
"""
import io, re, sys, zlib, subprocess, tempfile, os
import pikepdf
from pikepdf import Name, Dictionary, Array, Stream, String
from fontTools.ttLib import TTFont
from fontTools import subset
from PIL import Image

HIER = os.path.dirname(os.path.abspath(__file__))
WURZEL = os.path.join(HIER, '..', '..')
CARLITO_FETT = '/usr/share/fonts/truetype/crosextra/Carlito-Bold.ttf'

FARBEN = {  # Vorlage -> EGC
    '0e2a33': '0a1626', '25383d': '16212c', '5c6e73': '6b7787', 'f1f5f6': 'f4f7fa', 'd5dfe1': 'd8dde4',
    'e8a33d': '6cb43b', 'a9c4ca': 'c4d0de', '12616f': '1b3a60', '4a8c99': '4a8c26', 'b9d0d5': 'c4d0de',
    'b9781f': '4a8c26', '17434f': '12294a', '7c989f': '8a9bb0', '9fbfc6': 'b6c4d6', '3e7c5a': '4a8c26',
    # b4543a (Warnrot) und Grautöne bleiben
}
def hex3(vals): return '%02x%02x%02x' % tuple(round(float(v) * 255) for v in vals)
def rgb(h): return [round(int(h[i:i + 2], 16) / 255, 4) for i in (0, 2, 4)]

def tounicode(font):
    """Code -> Unicode aus der ToUnicode-CMap (bfchar und bfrange)."""
    m = {}
    if '/ToUnicode' not in font: return m
    t = font.ToUnicode.read_bytes().decode('latin-1')
    for block in re.findall(r'beginbfchar(.*?)endbfchar', t, re.S):
        for a, b in re.findall(r'<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>', block):
            m[int(a, 16)] = bytes.fromhex(b).decode('utf-16-be')
    for block in re.findall(r'beginbfrange(.*?)endbfrange', t, re.S):
        for a, b, c in re.findall(r'<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>', block):
            s = int(c, 16)
            for i, code in enumerate(range(int(a, 16), int(b, 16) + 1)):
                m[code] = chr(s + i)
    return m

class NeueSchrift:
    """Carlito Fett als Type0/Identity-H; wird am Ende auf die benutzten Zeichen verkleinert."""
    def __init__(self, pdf):
        self.pdf, self.tt = pdf, TTFont(CARLITO_FETT)
        self.cmap = self.tt.getBestCmap(); self.order = self.tt.getGlyphOrder()
        self.gid = {g: i for i, g in enumerate(self.order)}
        self.benutzt = {}  # gid -> unicode
        self.obj = pdf.make_indirect(Dictionary(Type=Name.Font, Subtype=Name.Type0, BaseFont=Name('/EGCAAA+Carlito-Bold'),
                                                Encoding=Name('/Identity-H')))
    def kodiere(self, text):
        out = bytearray()
        for ch in text:
            g = self.gid.get(self.cmap.get(ord(ch), '.notdef'), 0)
            if g == 0 and ch not in '  ': print('  Zeichen fehlt in Carlito:', repr(ch))
            self.benutzt[g] = ch; out += g.to_bytes(2, 'big')
        return bytes(out)
    def fertig(self):
        sub = subset.Subsetter(subset.Options(retain_gids=True, notdef_outline=True, name_IDs=['*'], drop_tables=[]))
        sub.populate(gids=sorted(set(self.benutzt) | {0})); tt = TTFont(CARLITO_FETT); sub.subset(tt)
        buf = io.BytesIO(); tt.save(buf); prog = buf.getvalue()
        einheit = 1000 / self.tt['head'].unitsPerEm; hmtx = self.tt['hmtx']
        w = Array()
        for g in sorted(self.benutzt): w.extend([g, Array([round(hmtx[self.order[g]][0] * einheit)])])
        h = self.tt['hhea']; os2 = self.tt['OS/2']
        desc = Dictionary(Type=Name.FontDescriptor, FontName=Name('/EGCAAA+Carlito-Bold'), Flags=32,
                          FontBBox=Array([round(v * einheit) for v in (self.tt['head'].xMin, self.tt['head'].yMin, self.tt['head'].xMax, self.tt['head'].yMax)]),
                          ItalicAngle=0, Ascent=round(h.ascent * einheit), Descent=round(h.descent * einheit),
                          CapHeight=round(getattr(os2, 'sCapHeight', 650) * einheit), StemV=120,
                          FontFile2=self.pdf.make_stream(prog))
        cid = Dictionary(Type=Name.Font, Subtype=Name.CIDFontType2, BaseFont=Name('/EGCAAA+Carlito-Bold'),
                         CIDSystemInfo=Dictionary(Registry=String('Adobe'), Ordering=String('Identity'), Supplement=0),
                         FontDescriptor=self.pdf.make_indirect(desc), W=w, CIDToGIDMap=Name.Identity, DW=500)
        zeilen = ''.join('<%04X> <%s>\n' % (g, u.encode('utf-16-be').hex().upper()) for g, u in sorted(self.benutzt.items()))
        cm = ('/CIDInit /ProcSet findresource begin\n12 dict begin\nbegincmap\n/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def\n'
              '/CMapName /Adobe-Identity-UCS def\n/CMapType 2 def\n1 begincodespacerange\n<0000> <FFFF>\nendcodespacerange\n'
              '%d beginbfchar\n%sendbfchar\nendcmap\nCMapName currentdict /CMap defineresource pop\nend\nend\n' % (len(self.benutzt), zeilen))
        self.obj.DescendantFonts = Array([self.pdf.make_indirect(cid)]); self.obj.ToUnicode = self.pdf.make_stream(cm.encode())

def bearbeite_strom(pdf, strom, res, schrift, zaehler):
    if res is None: return
    fonts = res.get('/Font', Dictionary())
    caladea = {}
    for k, f in fonts.items():
        if 'Caladea' in str(f.get('/BaseFont', '')): caladea[k] = tounicode(f)
    ops = pikepdf.parse_content_stream(strom)
    neu, aktuell = [], None
    for operanden, op in ops:
        o = str(op)
        if o in ('rg', 'RG') and len(operanden) == 3:
            h = hex3(operanden)
            if h in FARBEN: operanden = [pikepdf.Object.parse(str(v).encode()) if False else v for v in rgb(FARBEN[h])]; zaehler['farbe'] += 1
        elif o == 'Tf':
            aktuell = str(operanden[0]) if str(operanden[0]) in caladea else None
            if aktuell:
                operanden = [Name('/FEGC'), operanden[1]]; zaehler['schrift'] += 1
        elif aktuell and o in ('Tj', "'", '"', 'TJ'):
            m = caladea[aktuell]
            def um(s): return String(schrift.kodiere(''.join(m.get(b, '?') for b in bytes(s))))
            if o == 'TJ': operanden = [Array([um(x) if isinstance(x, String) else x for x in operanden[0]])]
            else: operanden = list(operanden[:-1]) + [um(operanden[-1])]
        neu.append((operanden, op))
    if caladea:
        fonts[Name('/FEGC')] = schrift.obj; res.Font = fonts
    return pikepdf.unparse_content_stream(neu)

def logo_bilder(pdf):
    """Weißes Logo aus dem Projekt und eine Navy-Fassung daraus (Grün bleibt Grün)."""
    weiss = Image.open(os.path.join(WURZEL, 'logo-weiss.png')).convert('RGBA')
    navy = weiss.copy(); px = navy.load()
    for y in range(navy.height):
        for x in range(navy.width):
            r, g, b, a = px[x, y]
            if not (g > r + 30 and g > b + 30): px[x, y] = (10, 22, 38, a)  # alles außer Grün wird navy
    def xobj(im):
        rgbb, alpha = im.convert('RGB').tobytes(), im.getchannel('A').tobytes()
        maske = pdf.make_stream(zlib.compress(alpha), Type=Name.XObject, Subtype=Name.Image, Width=im.width, Height=im.height,
                                ColorSpace=Name.DeviceGray, BitsPerComponent=8, Filter=Name.FlateDecode)
        return pdf.make_stream(zlib.compress(rgbb), Type=Name.XObject, Subtype=Name.Image, Width=im.width, Height=im.height,
                               ColorSpace=Name.DeviceRGB, BitsPerComponent=8, Filter=Name.FlateDecode, SMask=maske)
    return xobj(weiss), xobj(navy), weiss.width / weiss.height

def dunkel_oben_rechts(quelle, n):
    """Hintergrund oben rechts aus einer kleinen Vorschau ablesen."""
    with tempfile.TemporaryDirectory() as d:
        subprocess.run(['pdftoppm', '-r', '12', '-png', quelle, os.path.join(d, 'p')], check=True)
        werte = []
        for i in range(1, n + 1):
            f = [x for x in os.listdir(d) if re.search(r'-0*%d\.png$' % i, x)][0]
            im = Image.open(os.path.join(d, f)).convert('L'); w, h = im.size
            werte.append(im.crop((int(w * .85), 1, w - 2, int(h * .12))).resize((1, 1)).getpixel((0, 0)) < 110)
        return werte

def main(quelle, ziel):
    pdf = pikepdf.open(quelle)
    schrift = NeueSchrift(pdf); z = {'farbe': 0, 'schrift': 0}
    for pg in pdf.pages:
        inhalt = bearbeite_strom(pdf, pg, pg.Resources, schrift, z)
        pg.Contents = pdf.make_stream(inhalt)
    for o in list(pdf.objects):
        if isinstance(o, Stream) and o.get('/Subtype') == '/Form':
            inhalt = bearbeite_strom(pdf, o, o.get('/Resources'), schrift, z)
            if inhalt is not None: o.write(inhalt)
    schrift.fertig()
    dunkel = dunkel_oben_rechts(quelle, len(pdf.pages))
    weiss, navy, seiten = logo_bilder(pdf)
    for i, pg in enumerate(pdf.pages):
        bw = 64; bh = bw / seiten
        x0, y0, x1, y1 = [float(v) for v in pg.MediaBox]
        x = x1 - 44.6 - bw; y = y1 - 26 - bh
        # Seiten teilen sich teils dieselbe XObject-Tabelle: beide Fassungen unter eigenem Namen eintragen
        xo = pg.Resources.get('/XObject', Dictionary()); xo[Name('/EGCLogoW')] = weiss; xo[Name('/EGCLogoN')] = navy; pg.Resources.XObject = xo
        name = 'EGCLogoW' if dunkel[i] else 'EGCLogoN'
        pg.contents_add(pdf.make_stream(('q %.3f 0 0 %.3f %.3f %.3f cm /%s Do Q' % (bw, bh, x, y, name)).encode()), prepend=False)
    pdf.docinfo['/Producer'] = 'EGC Energie'
    pdf.remove_unreferenced_resources(); pdf.save(ziel, compress_streams=True)
    print(os.path.basename(ziel), len(pdf.pages), 'Seiten,', z['farbe'], 'Farben,', z['schrift'], 'Überschriften,',
          sum(dunkel), 'dunkle Seiten')

if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
