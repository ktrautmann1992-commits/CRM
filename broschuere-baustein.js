/* Imagebroschüre (Versandfassung): wird beim Bau einzeln gepackt und erst bei Bedarf geladen.
   Der eigentliche Aufbau liegt in druckvorlagen/broschuere/broschuere.js und wird auch für die Druckdatei verwendet. */
import baue from "./druckvorlagen/broschuere/broschuere.js";
import D from "./druckvorlagen/broschuere/daten.json";
window.EGCBroschuere = { baue, D };
