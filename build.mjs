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
