import { mkdir, cp, rm, writeFile, readFile } from "node:fs/promises";
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";

await rm("dist", { recursive: true, force: true });
await mkdir("dist/assets", { recursive: true });

execSync(
  "npx tailwindcss -c tailwind.config.js -i styles.css -o dist/assets/styles.css --minify",
  { stdio: "inherit" }
);

execSync(
  'npx esbuild main.jsx --bundle --minify --format=iife --define:process.env.NODE_ENV=\'"production"\' --outfile=dist/assets/app.js',
  { stdio: "inherit" }
);

/* Dateinamen mit Inhaltskennung versehen. Damit dürfen Browser sie dauerhaft
   behalten; nur bei echten Änderungen wird neu geladen. Das senkt das
   übertragene Volumen bei wiederkehrenden Nutzern auf nahezu null. */
const kennung = async (datei) => {
  const inhalt = await readFile("dist/assets/" + datei);
  const kurz = createHash("sha256").update(inhalt).digest("hex").slice(0, 8);
  const neu = datei.replace(/\.(js|css)$/, "." + kurz + ".$1");
  await cp("dist/assets/" + datei, "dist/assets/" + neu);
  await rm("dist/assets/" + datei);
  return neu;
};

const js = await kennung("app.js");
const css = await kennung("styles.css");

let html = await readFile("index.html", "utf8");
html = html.replace("/assets/app.js", "/assets/" + js)
           .replace("/assets/styles.css", "/assets/" + css);
await writeFile("dist/index.html", html);

/* Der Dienst im Hintergrund muss die neuen Namen kennen */
let sw = await readFile("sw.js", "utf8");
sw = sw.replace("/assets/app.js", "/assets/" + js)
       .replace("/assets/styles.css", "/assets/" + css)
       .replace("egc-portal-v1", "egc-portal-" + js.split(".")[1]);
await writeFile("dist/sw.js", sw);

/* PDF-Baustein für Angebote: wird nur bei Bedarf nachgeladen */
await cp("node_modules/jspdf/dist/jspdf.umd.min.js", "dist/assets/jspdf-4.2.1.min.js");

/* QR-Baustein und Logo mit durchsichtigem Hintergrund für die Visitenkarte, ebenfalls nur bei Bedarf */
execSync("npx esbuild qrcode-baustein.js --bundle --minify --format=iife --outfile=dist/assets/qrcode-1.5.4.min.js", { stdio: "inherit" });
await cp("logo-weiss.png", "dist/assets/logo-weiss.png");
/* Logo für die E-Mail-Signatur: wird von den Mailprogrammen über die volle Adresse geladen */
await cp("signatur-logo.png", "dist/assets/signatur-logo.png");
/* PDF-Anzeige im Portal (pdf.js, Fassung für ältere Browser), nur bei Bedarf geladen */
await mkdir("dist/assets/pdfjs-3.11.174", { recursive: true });
await cp("node_modules/pdfjs-dist/legacy/build/pdf.min.js", "dist/assets/pdfjs-3.11.174/pdf.min.js");
await cp("node_modules/pdfjs-dist/legacy/build/pdf.worker.min.js", "dist/assets/pdfjs-3.11.174/pdf.worker.min.js");
/* Schulungen im EGC-Design (Unterlagen → Schulungen). Bei neuen Fassungen SCHULUNGEN_STAND hier und in App.jsx erhöhen. */
const SCHULUNGEN_STAND = "1";
await cp("unterlagen/schulungen", "dist/assets/schulungen-" + SCHULUNGEN_STAND, { recursive: true });
/* Feste Dokumente (Checkliste). Bei neuer Fassung DOKUMENTE_STAND hier und in App.jsx erhöhen. */
const DOKUMENTE_STAND = "2";
await cp("unterlagen/dokumente", "dist/assets/dokumente-" + DOKUMENTE_STAND, { recursive: true });

/* Imagebroschüre zum Versenden: Baustein, verkleinerte Bilder und Schrift, nur bei Bedarf.
   Bei Änderungen an Bildern oder Aufbau BROSCHUERE_STAND hier und in App.jsx erhöhen (Dateien werden dauerhaft zwischengespeichert). */
const BROSCHUERE_STAND = "1";
const bz = "dist/assets/broschuere-" + BROSCHUERE_STAND;
await mkdir(bz, { recursive: true });
execSync("npx esbuild broschuere-baustein.js --bundle --minify --format=iife --outfile=" + bz + "/broschuere.js", { stdio: "inherit" });
await cp("druckvorlagen/broschuere/bilder/klein", bz, { recursive: true });
await cp("druckvorlagen/broschuere/schrift/LiberationSans-Regular.ttf", bz + "/LiberationSans-Regular.ttf");
await cp("druckvorlagen/broschuere/schrift/LiberationSans-Bold.ttf", bz + "/LiberationSans-Bold.ttf");

await cp("manifest.json", "dist/manifest.json");
await cp("icon-192.png", "dist/icon-192.png");
await cp("icon-512.png", "dist/icon-512.png");

/* Zwischenspeicherung steuern:
   Programmdateien dauerhaft, die Einstiegsseite nie. */
await writeFile("dist/_headers",
`/*
  X-Frame-Options: SAMEORIGIN
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin

/assets/*
  Cache-Control: public, max-age=31536000, immutable

/index.html
  Cache-Control: public, max-age=0, must-revalidate

/sw.js
  Cache-Control: public, max-age=0, must-revalidate

/manifest.json
  Cache-Control: public, max-age=86400
`);

console.log("Build fertig: dist/  ·  " + js + "  ·  " + css);
