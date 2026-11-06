import pikepdf, re, sys
src, dst = sys.argv[1], sys.argv[2]
pdf = pikepdf.open(src)
for page in pdf.pages:
    inhalt = b"".join(c.read_bytes() for c in (page.Contents if isinstance(page.Contents, pikepdf.Array) else [page.Contents]))
    benutzt = set(re.findall(rb"/(F\d+)\s+[\d.]+\s+Tf", inhalt))
    fonts = page.Resources.get("/Font")
    if fonts is not None:
        for name in list(fonts.keys()):
            if name[1:].encode() not in benutzt:
                del fonts[name]
# Rand für die Druckerei: Endformat (TrimBox) und Beschnitt (BleedBox) eintragen
mm = 72 / 25.4
for page in pdf.pages:
    w, h = float(page.MediaBox[2]), float(page.MediaBox[3])
    b = 3 * mm
    page.TrimBox = pikepdf.Array([b, b, w - b, h - b])
    page.BleedBox = pikepdf.Array([0, 0, w, h])
pdf.remove_unreferenced_resources()
pdf.save(dst)
