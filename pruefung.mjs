/* Bautest: rendert jede Ansicht für jede Rolle mit Beispieldaten (ohne Anmeldung, ohne Datenbank).
   Wirft eine Ansicht beim Rendern einen Fehler, bricht der Bau ab. So geht keine Fassung online,
   die beim Öffnen eine weiße Seite zeigt. Aufruf: node pruefung.mjs (läuft automatisch in build.mjs).
   Geprüft wird der erste Bildschirm jeder Ansicht, nicht jeder Klick darin. */
import { build } from "esbuild";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";

const ordner = await mkdtemp(join(tmpdir(), "egc-pruefung-"));
const ziel = join(ordner, "app.cjs");
await build({
  stdin: {
    contents: `import React from "react";
      import { renderToString } from "react-dom/server";
      import { PortalApp, PRUEFDATEN } from "./App.jsx";
      export const rendern = (pruefung) => renderToString(React.createElement(PortalApp, { pruefung }));
      export { PRUEFDATEN };`,
    resolveDir: process.cwd(), loader: "jsx",
  },
  bundle: true, platform: "node", format: "cjs", outfile: ziel, logLevel: "error",
  define: { "process.env.NODE_ENV": '"production"' },
  /* Browser-Bibliotheken werden beim ersten Bildschirm nicht gebraucht */
  external: ["pdfjs-dist", "jspdf", "canvg", "html2canvas", "dompurify"],
});

/* Mindestumgebung eines Browsers */
const speicher = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), clear: () => m.clear() }; };
const leer = () => {};
globalThis.window = globalThis;
globalThis.localStorage = speicher();
globalThis.sessionStorage = speicher();
globalThis.location = { href: "https://portal.egc-energie.de/", origin: "https://portal.egc-energie.de", pathname: "/", search: "", hash: "", reload: leer };
globalThis.history = { pushState: leer, replaceState: leer, back: leer, state: null };
globalThis.addEventListener = leer; globalThis.removeEventListener = leer;
globalThis.matchMedia = () => ({ matches: false, addEventListener: leer, removeEventListener: leer, addListener: leer, removeListener: leer });
globalThis.document = { title: "", addEventListener: leer, removeEventListener: leer, createElement: () => ({ style: {}, setAttribute: leer, appendChild: leer }), head: { appendChild: leer }, body: { appendChild: leer, style: {} }, documentElement: { style: {} } };
globalThis.storage = { get: async () => null, set: async () => null, delete: async () => null, list: async () => ({ keys: [] }) };
if (!globalThis.navigator) globalThis.navigator = { userAgent: "pruefung", onLine: true };
/* Node 20 (Netlify) hat kein WebSocket; die Datenbankanbindung verlangt es schon beim Laden */
if (!globalThis.WebSocket) globalThis.WebSocket = class { constructor() { this.readyState = 3; } send() {} close() {} addEventListener() {} removeEventListener() {} };

const { rendern, PRUEFDATEN } = createRequire(import.meta.url)(ziel);
const quelle = await readFile("App.jsx", "utf8");
/* Alle Ansichten aus der Navigation, ohne Duplikate */
const navAb = quelle.indexOf("const NAV = {");
const navText = quelle.slice(navAb, quelle.indexOf("\n  };", navAb));
const ansichten = [...new Set([...navText.matchAll(/\{ id: "([a-z0-9-]+)", label: "/g)].map((m) => m[1]))];
if (navAb < 0 || ansichten.length < 10) { console.error("Bautest: Navigation nicht gefunden."); process.exit(1); }

const daten = PRUEFDATEN();
const beschaffer = { id: "beschaffung", name: "Beschaffung", rolle: "Beschaffung", status: "aktiv", email: "beschaffung@egc-energie.de" };
const mitarbeiter = [...daten.mitarbeiter, beschaffer];
const rollen = [...new Map(mitarbeiter.filter((m) => m.status === "aktiv").map((m) => [m.rolle, m])).values()];
const faelle = [
  ...rollen.flatMap((m) => ansichten.map((ansicht) => ({ m, ansicht, als: "" }))),
  ...["Kalkulation", "Vertragsmanagement", "Leadmanagement", "Finanzbuchhaltung", "Beschaffung"]
    .map((als) => ({ m: mitarbeiter.find((x) => x.rolle === "Geschäftsführung"), ansicht: "dashboard", als })),
];

const fehler = [];
const t0 = Date.now();
for (const { m, ansicht, als } of faelle) {
  if (process.env.PRUEF_LOG) console.log(Date.now() - t0, m.rolle, ansicht, als);
  try {
    const html = rendern({ ...daten, mitarbeiter, userId: m.id, ansicht, arbeitenAls: als });
    if (!html || html.length < 200) throw new Error("leere Ausgabe");
    if (html.includes("Da ist etwas schiefgelaufen")) throw new Error("Fehlerseite angezeigt");
  } catch (e) {
    fehler.push(m.rolle + (als ? " als " + als : "") + " · " + ansicht + ": " + String((e && e.message) || e).split("\n")[0]);
  }
}
await rm(ordner, { recursive: true, force: true });

if (fehler.length) {
  console.error("\nBautest fehlgeschlagen (" + fehler.length + " von " + faelle.length + " Ansichten):\n  " + fehler.join("\n  "));
  process.exit(1);
}
console.log("Bautest bestanden: " + faelle.length + " Ansichten in " + rollen.length + " Rollen gerendert.");
process.exit(0); /* offene Zeitgeber der Datenbankanbindung nicht abwarten */
