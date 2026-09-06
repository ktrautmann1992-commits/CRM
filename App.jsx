import React, { useState, useEffect, useMemo } from "react";
import {
  Zap, Flame, Plus, Send, ArrowLeft, Upload, FileText, Check, X,
  AlertTriangle, Users, Calculator, FileSignature, BarChart3,
  Wallet, Inbox, Trash2, ChevronRight, Paperclip, RotateCcw, Menu,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Design-Token                                                       */
/* ------------------------------------------------------------------ */
const C = {
  ink: "#0A1626",
  inkSoft: "#18293F",
  inkLine: "#26384F",
  paper: "#EFF1F4",
  card: "#FFFFFF",
  line: "#D8DDE4",
  text: "#16202C",
  muted: "#6B7787",
  strom: "#2F5FE0",
  gas: "#BE6A16",
  ok: "#4A9130",
  warn: "#B24328",
  gruen: "#6CB43B",
};

const LOGO = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAARAAAAB/CAMAAAAQAW0cAAAAwFBMVEX///////7+/////v7+/v/+/v7+/f79/v79/f79/f38/f39/P38/Pz7+/zz9PXj5efa3N/Mz9Kiwo+TsoWRlp1hqDhRlDRsgXE+fS5ianRGYk5FTloySEArNkIbJjUTHi0PGioOGioOGikNGikOGSkNGSkNGSgMGSYNGCgMGCgMGCcMFycLGCYLFygLFycLFyYKFycLFiYKFiYKFiUJFiYJFSUIFCQGEiMFECECDx8BDB4ACxwACRoACBkABhcABBXJQSGKAAAROElEQVR42u1deXOrOBJn3zw2wcthUuz4URhsGOOx7IySsMMN8vf/ViuBD8AcjY/s/uGumql6iaMWP7pbfcqc96QacU8IWgHBV9MtzMsVPh78iCWXr1GA+OHVFFy3SXe1WntBuQBardzt1yOgoFxQlcsOCIi/tK6mhT96m2sHRykhabBc0L9feAkheeytXHxfMBwvyigXv+CyZFyyaJgLA8Qhunw1Gel61EaR46cksoyZpqpTRZYVRVW1mW56JAtd917qs1kFKQnNM5cp42KYAeOyBgDCXUvKMhjzYl2UkKWhqXJzHUnVdCvLPOcOYvLh4pQs2rjIqmYs8vRjhYcA4SX+GpJ4jdgj4MBZMtembGu8JImCwNZ4FURJEgpwNeOLBDdD4np5ZGgKW1E4cRGqXELir4YkRLpKPnjeSDdgZUFZaKgCA2PCX6wkFNtVZwviu7fAscb5l64WYAidXPQV8dwHACJwKtikYjtODLbR8j21wivSX01nmwxyGnRwcdKIwcFLL51cJIrTVA/SdvN6EyASB9YY5BGTblQQByCmv58aWehcqS0+YaCLk2EuqpGH7r0B+YdkJgi0UzsONZkThOE1X+hmNSuzr8HDTlaayE0AXBgk2iK17wuIyKkRzALaORMPEaiIAqcYZLwPjF0yH8GFp6JILtXmFkAkbkYgso0RMWRO4kcgzWlJgEbisaPu1JjnkDhplnvofoD8xslmvIXsNJ+BX9xJSDQ/GoUI8lON4yajuPCcFof4boCIvAqxIPgr0zjhZeR5LnHqYozLh/xYozsazeVt43+2ASJK4liaSJxOVoBYk+LRpi489ZToMhL9P98q0G9wF8fb+ZHW+lJfh7houXsJyP461122ADZ1k7fhITR+JE1+Nrf6qgHgPqGetOExafzo0gUS+VmDCwMER6Z+DRnhMB42mV3slC9elqJqGl1kpmmqUu6tIc7QI535H0Rr4cKVXGbdXHj2UneX4T+OSD6eSArBQ7+QD7ZRFmQl+Z7kZE9IvJjPmEtf3Sw90mMwHnaLEbzkYtFwj6tbd/HnW+a2JYiwew0Nx/2b2JRfXpqmXWLhVRoi13bcFf0PhQmJTOq4VQ4JEXikF/KRGs24hcIra0ZE6OF95IIpl3DOuAiVj+m5+4051S8vUBvnLXMxzDzFDsJVR8XBMbHoZo9CwsMMVGlQg8WUExpcBM0kySWXJDepLyudNEa5OMoeCsiqqdr8hMUQsbtpSxxFe+rO8iUi4g8VnHhy8yaXV8qFxE6LyiE33tNo5yBPbbHYIwHZJPP6YUefVltmDuqMh6OZUL7ryaUs9ygMtQXVaIgKYZDaHVyQnfrUg3stJeQy3/dIQN7jusLwPD3kgh7LsN7tqY8vlLIcwjTm4z++WlMYgZP0vef2JZD2usT+ROCm+O9vrMu4md7Ag+50IMe7JHOFPRIHdkIceq6LNfmQjb2N+1MzDPfX9uzFIyUkUPlJ1S8Q9f1y6G+WuSkzR99IYRqDg4XCVwSEf5ENMsyFIsILvDS/dHUeB8gqrwsIjY2H8WAyYsgiN934VwnID5HTYVz036TW7MXjAMGR+lOsnoTA7NqSBhJgt/3LR9OqgFAuEDyoL7efcXybq/MwQNapwfO19OvOh5lJN3/j5kC3ndmpCh70VI9hmSXMLL71nRLS8EEEAWoVvG1svnl/Q89clZcqSXXZjOGntRa/e98GCA4XCvcyXmFKQ7kEq6Ulc/x1XD6DRXex+xFnrlGRZZ6XzREJMOyDxbBquF94sPfSzeVRgDg1jRG5EckNtleoocrefkrXCUgXl4fZkKDqP/L/mifoAXpJnRDun5XkhhndXBquAuLYQBp+NkTj/rNys3rFXy1e9/sQ/dmgRnMASqonGUs6rr17AkL2QBrODNVNCKtXtMhyvfMm6qLkTOFHI1FWNSEiKMcLB8Rf6TMgGYMGsm5CWn1kz7NMy5wD6VdBVh2RGpf7aMwZkA2NoqE0/CbcrLJVGlUug2YrzKe/+HWi38/07z5qAIKq4fQEXEeEAUIdKVGWQAQ43HB1q9SEXFYUPkLrV51+H4Tl96jmSX397VVSZdLIk2wAEOoMKWXWBFDyH8zdYH/b2Opl0ODPO+HoEpN5tK07f5ZyttzSiCwsAJC6FexvCjGyQUDYVl+qCePVpZ/4azQgi7ri7aLqUTbh9My9HyArosHKmUJLYnbApRZb8oEf4Xw0IA2NYWe7dOYicMYdTt1T427tlQ41yQyqavPdtcjU56/RgDQ0hroh89+4H+dTxriH88cdQ24dWDlnidnNOEBalOxCYyCAOI26NAWktrX5HQGhQQFUY6aAvMagylxoDACQX8m26aiawpkL6E1BAWmE0QMaM2zL6/afuZBNlfnz12hAzIYJacQHAjgPCwCkHkb3aowAEcwi6uo5dj8Cazwg74NySO4GCEpVQRIAJAlq+AnJdUZqn8t0qTHDftmv5M8Lb2dZOQmkkcF/HyBU9sBu+wzElSJ8FjmBU8P6sIP/53iT2nDbS81Uz0cB84fvZVTdTJ9CyQR1KdiNsKuezmVnzKWItKNzxOf31nR0hcsrxEECnzLLJSgZ4tgINh9TN0qXldr394+P4XTI+/v2lAoBxNR38cwOgPiBDyTYAMemkbq5Nu4684VkXe5hRE7B3X1Hyoqk++v53SlWeNfxoEPBouH/TVf+x70AuXvWvWpViyPReQAXHFWsKijs/J8BUq+50pc3aqYOelqsGrl9dYzzjtF3AlKPRAsRGaHfCVC/ULNeamTwVk4/xt9ZhkCJyldEhKdnInQKxrd1YKXq06t1y0w4NfC+oFbO0qPtNwLCDt4Jd00Ryd7rMtQGO/U2WJGb7cFcNPmvFhv8MEBYfMe/VttoAY0shTlO6NEBLSi803OmojT8RDIykPV20rnUaoMf2DBDDV4lYHzlFTMB7BUFO5Xjwdax0YJIrbcVAU4aN1pMf/JtyeHHAbKrvzx2BiyG94r+k6j0CWGDJ2WSqNYpTbn4waC/ug59xqXNO3pgj5nTSNMyROIBDXeDlP3RiD5mVgGqd26pQTjAxQmjt4JLi2Y+EJAttSKvQn2vVrbsOwWW8VcBIj0uQqDPybJEQkNGWofpKlySReE1tsbHj+xCbHZM0n8oxv6zU22QSyy1FCpenCcbuCCK9aSeahLUqTbrLeuYlo7Fz903AlJ41g1EpFmUuq2Pipw41ZXD50cEajhYNVrdRU7Wk6S9YRq5SazLBy5tmvlQQNZJQ5zZxlUjS/Gq8WKw68a5eR6ao6eF6wNdLDc1BPGCyzxPUHPEH69QkhXjw91jpY+9UMW5GB9i3uubEZFo57ioWGCHXAeFecbmQ87ovYxIbvxxUWTjJ5ykzZM8QkcuW8YlytO5JlXmcphmolZAwOmQJgX9TvY6uygIlsP3ZkzyJAr8IIySnKSW/ibXZntg2f1DApeV1qWL+aGJqlsJyc5cElNXxdrkZguXQxliubqOXNv2+yOoL7V12ElWNX1uLZylZZp6ebFFTez/OSaFgsLFtFk14CtcVpTLvI0La/9vmcp0c12ZXkmK0Z/ZXUfW9LIENil3LyuU5GKHYnNoUoAPiBTuvnJRR+HF4ic84yKXV4lccGHXW7RMZd5yocpQr0ixV6ltSPXcP9I2QkoPzwyeIbXTudxSWQJw0VqmMikgr6CqTEuZZljT7dScdpRJef71hed/tk+7S3o8IttjZ3OlncuPkktHHVJutofddqEKqAXBTpm79WPktQKyQUZVWeysE/ceLsqctAwh3nChyhQBUjl/xNRV5gX4urzETc18ZAa9wF18HcGFuiFm1jZz9/ALVdwwpj4XWEiYq7JIRlcU3ChgXMZcQbGJHe+egPACsEcFYWJMgTdECBNOniXhFelz5NPjkuNBfS7skhI9a0kU3AKIQCPtT6Dv5GQLTeT4QUiK23BobHZVlRavcksrIIVcMGORtgHA77hQ5aA2xf0vvVdaFLcyqXoSX12Ac6KMXULED3Mx0sjuKkNcb0PMEScjdpLymiqxfbfUZyic+m2ObijiYzeN+rkUlwLoYbZG3p0BEX+o8aj7tRBKk/LGNV4Sq1EwL4jFTRayang3XmNW3B4XGWzEnxM6uGhGmHcO9p4cs9ex9CK1tJ8ObRYlOY3jlEPe+UD84Vq+mZlm3h2uiHRxSrmoDS7Hy/90M0u7k1Q3XagiXXR9AaTEpZH+wpi9TSsXFcpTdhNiQmJ0h56oIoJyIxpBG5ra5GJQLpHrDtR2cWAZ19Dcv07L3TAlqWfNTwuZSxqmR8jZencjvNowLvjMZW66KclCtMLDxe7PML2GkmsvhcVrZ+1FyWmdyEeOe/d2Cew6yB/N5ZAP2VxDt3V0YXRaZ/uA3pGSPipcYL0tz0uqn4A8AXkC8gTkCcgTkCcgT0CegDwBeQLyBOQJyBOQ/x/C+LGAYHSmXlZfqJLY2g3kRMCrfhw+tFlBvmMGuy4OfDz8fTRDCfxdZX9fNUA+z6mlNI16yk+fQVKpl8dJbxpxzKrlhzKSeYPlczfI89hFMcn/HkjCJnH/7+PK/spx0+Ooe6arZ9KzzpZIlBqqcawQo1hTrai7FOFmM+CqiXH8lGb4Q/PIbm7r2lRR6Ge9vtt/cLBQtbBPPiKtsr+yLHsAxN5r3LmLaJZ3lhdcYrB2cnRAR+XMntpMfVW9Z9Xc4OSiIUkuimp9MoJ3uT5l13GzOoNq9JTKcGhxSi8gsVrZX9kLdQZENPbB4RqkoO/tGKyZ8QuXL1YVrX5AgKtmhqjt/SgKl6bGyUbSgwhKNe5FM/00DUyN5+bdiOBwIU8HABGt9HgdlF+1IexdgibF2btUjr17FBBuABDOgHSKsfFKrZh0CeK9zsaAejYw46bmPmb2Mt4b2rL7agYIIBcXRF4DiK4eBsYeAAje2ETlujv52OiaYpJl8Xtkx3kPdjcDktvDvbgMEMOU5TmzfCBAMsiqJ0CK7wrgu2c42XxM5QrZ3lIfEBBU218FEGOPg4L8IUCoVE8XIYIBQiCrQgFhz1idaP/CNwMS++X+WiQkWRTz7MvtECBJpnFqgjEIENCqFUCWhVi5XefznFMrx3IQ3aoyZrAsx/jxBSDH7zaU+oaOC0CyTagywwoBBLYqAyRfOJTszFK6ZxDpB/lKJ6i/sJb+bYCcvtLx0OtSAUTV3hhpb32nXgnIMrIUaliXAEBgqxYSkhJC9mxaYdZpiEtAjv7MKtflnru6QIAc9vf2drg3sGZDMlJQjAdUJnPtzJAopjFAZY6r9t3LxwBR9eJrT94ETuveQKkyR2RXZNbXAA4CZLkvt0cOhqlqQ9JiBMDtrZAfACm+wURdZBAbAlk1O1/ESF1or8+1UOSTUV0x+3sjIGZgl3MMH9f7IYXJY+ff2/6efojJOkXmynTV9/1l7Kt1TvfD30NCev0Q94tR77D4CRDs+1TZIX4IZNXChtDQuPBT++YrmGMmM8eMPsbHMtXvAMiutr+rJcRbx6YiyZJ5NwmhT4kQu6un996EwnWf7xMfb/1of7vKdEsIDcM+g6DmpHQEdwcvwc4NgU0cDwR3BLJqEdwVrnuwnMpmOhDcUf1CSeKZmtR3eRksuDs6Zof9Vf0Q5Uiq1yngLPw/vnT2dQKD4X9l1aBX7g6O2So1qBvcc7sSDf9ZI2oZ/k+NnsMLFv6fSCvec2uCSOsGhKVyTg3uONHUvkGwxqrdgNDTVJ0dHIo/spmq945puRkyNLVIEH3dlCDCtQTRrJoP8T6jNDtR2pcVDNPz1W44TQdSiPBV4+OquyQbuH7L9XOSeF5CsoEuXz9NBlKMlf3FuJ5k3iBYNx3eVHa7HkoyX7MqGpzpxq679f2tO9hUOJRkRqf9oQ1+liF6yxBPegLyBARC/wVgFt0ktai10QAAAABJRU5ErkJggg==";

const FONT =
  'Inter, "Helvetica Neue", Helvetica, ui-sans-serif, system-ui, sans-serif';

const STATUS = {
  entwurf: { label: "Entwurf", color: C.muted },
  eingereicht: { label: "Bei Kalkulation", color: C.strom },
  klaerfall: { label: "Daten fehlen", color: C.warn },
  ruecksprache: { label: "Rücksprache Geschäftsführung", color: C.gruen },
  angebot: { label: "Angebot liegt vor", color: C.ok },
  uebermittelt: { label: "Auftrag an Versorger übermittelt", color: "#2F5FE0" },
  bestaetigt: { label: "Bestätigter Kunde", color: C.ok },
  abgeschlossen: { label: "Abgeschlossen", color: C.ink },
  abgelehnt: { label: "Abgelehnt", color: C.muted },
};

const PRODUKTE = ["Festpreis", "Spotmarkt", "Tranchenmodell", "PPA-Modell"];
const EMPFEHLUNG = "Empfehlung der Kalkulation";
const PRODUKTWUNSCH = [...PRODUKTE, EMPFEHLUNG];
const LAUFZEITEN = [12, 18, 24, 30, 36, 48, 60];
const SPARTEN = [
  { value: "beide", label: "Strom und Erdgas" },
  { value: "strom", label: "nur Strom" },
  { value: "gas", label: "nur Erdgas" },
];

const LEAD_QUELLEN = ["Tippgeber", "Social Media", "Kaltakquise", "Eigenakquise", "Sonstiges"];

const ZEITRAEUME = [
  { value: "alle", label: "Gesamter Zeitraum" },
  { value: "heute", label: "Heute" },
  { value: "tag", label: "Bestimmter Tag" },
  { value: "woche", label: "Letzte 7 Tage" },
  { value: "monat", label: "Laufender Monat" },
  { value: "quartal", label: "Laufendes Quartal" },
  { value: "jahr", label: "Laufendes Jahr" },
];

/* Prüft, ob ein Datum im gewählten Zeitraum liegt */
function imZeitraum(iso, art, tag) {
  if (!iso || art === "alle") return art === "alle";
  if (art === "heute") return iso === heute();
  if (art === "tag") return !!tag && iso === tag;
  const d = new Date(iso), n = new Date();
  if (isNaN(d)) return false;
  if (art === "woche") {
    const g = new Date(); g.setDate(g.getDate() - 7);
    return d >= g;
  }
  if (art === "monat") return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth();
  if (art === "quartal")
    return d.getFullYear() === n.getFullYear() && Math.floor(d.getMonth() / 3) === Math.floor(n.getMonth() / 3);
  if (art === "jahr") return d.getFullYear() === n.getFullYear();
  return true;
}

const tageZwischen = (von, bis) => {
  if (!von || !bis) return null;
  const a = new Date(von), b = new Date(bis);
  if (isNaN(a) || isNaN(b)) return null;
  return Math.max(0, Math.round((b - a) / 86400000));
};
const TERMINARTEN = ["Vor Ort", "Microsoft Teams", "Zoom", "Telefonkonferenz"];
const LEAD_SPALTEN = [
  { id: "neu", label: "Neuer Lead", color: "#4A9130" },
  { id: "erstgespraech", label: "Erstgespräch", color: "#2F5FE0" },
  { id: "angebot", label: "Angebotsphase", color: "#2F5FE0" },
  { id: "verhandlung", label: "Verhandlung", color: "#BE6A16" },
  { id: "auftrag", label: "Auftrag", color: "#0A1626" },
  { id: "verloren", label: "Verloren", color: "#6B7787" },
  { id: "wiedervorlage", label: "Wiedervorlage", color: "#BE6A16" },
];

const LEAD_STATUS = LEAD_SPALTEN.reduce((o, s) => ({ ...o, [s.id]: s }), {});

/* Ältere Leads auf die Kanban-Spalten abbilden */
const leadSpalte = (l) =>
  LEAD_STATUS[l.status]
    ? l.status
    : ({ bearbeitung: "erstgespraech", termin: "erstgespraech", anfrage: "angebot" }[l.status] || "neu");

const leererLead = () => ({
  id: "L-" + new Date().getFullYear() + "-" + Math.floor(100 + Math.random() * 899),
  angelegt: heute(), status: "neu", gelesen: false,
  firma: "", strasse: "", plz: "", ort: "",
  ansprechpartner: "", position: "", telefon: "", email: "",
  verbrauchStrom: "", verbrauchGas: "",
  laufzeitStrom: "", laufzeitGas: "",
  beschaffung: "", dienstleister: false, dienstleisterName: "",
  quelle: "Kaltakquise", quelleDetail: "",
  terminDatum: "", terminZeit: "", terminArt: "Vor Ort",
  bemerkung: "", dateien: [],
  zugewiesen: null, zugewiesenVon: "", zugewiesenAm: "", abschlussAm: "",
});

const ABLAGE_BEREICHE = [
  { id: "schulung", label: "Schulungen", text: "Unterlagen und Trainings zur Einarbeitung und Weiterbildung." },
  { id: "dokumente", label: "Dokumente", text: "Vollmachten, Formulare und Vorlagen für den Kundentermin." },
  { id: "marketing", label: "Marketing", text: "Flyer und Verkaufsunterlagen zum Weitergeben an Kunden." },
];

const ABLAGE_ARTEN = ["PDF", "PowerPoint", "Word", "Excel", "Video", "Online-Schulung", "Sonstiges"];

const leererEintrag = (bereich) => ({
  id: "D-" + uid(), bereich, titel: "", beschreibung: "", art: "PDF",
  datei: null, url: "", von: "", datum: heute(),
});

function seedAblage() {
  const e = (bereich, titel, art, dateiname, beschreibung, url) => ({
    id: "D-" + uid(), bereich, titel, art, beschreibung,
    datei: dateiname ? demoPdf(dateiname, [titel, beschreibung]) : null, url: url || "",
    von: "Karsten", datum: "2026-06-02",
  });
  return [
    e("dokumente", "Blanko-Maklervollmacht", "PDF", "maklervollmacht_blanko.pdf",
      "Vom Kunden zu unterschreiben, damit wir Verbrauchsdaten beim Versorger abrufen dürfen."),
    e("dokumente", "Datenabfrage Netzbetreiber", "PDF", "datenabfrage_netzbetreiber.pdf",
      "Formular für Lastgangdaten bei RLM-Zählern."),
    e("dokumente", "Kündigungsschreiben Altvertrag", "Word", "kuendigung_vorlage.docx",
      "Vorlage zur fristgerechten Kündigung beim bisherigen Versorger."),
    e("dokumente", "Datenschutzhinweise", "PDF", "datenschutz_kunden.pdf",
      "Aushändigen beim Erstkontakt, Stand Mai 2026."),
    e("marketing", "Flyer Hotellerie und Gastronomie", "PDF", "flyer_hotel_gastro.pdf",
      "Vierseitig, für Erstgespräche im Gastgewerbe."),
    e("marketing", "Flyer Produktion und Gewerbe", "PDF", "flyer_produktion.pdf",
      "Schwerpunkt RLM, Lastgangoptimierung und Tranchen."),
    e("marketing", "Imagebroschüre EGC-Energie", "PDF", "imagebroschuere.pdf",
      "Unternehmensvorstellung zum Hinterlassen beim Kunden."),
    e("schulung", "Grundlagen Energiebeschaffung", "PDF", "schulung_grundlagen.pdf",
      "Einstieg: Marktrollen, Preisbestandteile, Netzentgelte."),
    e("schulung", "SLP und RLM richtig erkennen", "PowerPoint", "schulung_slp_rlm.pptx",
      "Wann welcher Zählertyp vorliegt und welche Unterlagen du brauchst."),
  ];
}

const VERSORGER = [
  { id: "v-eon", name: "E.ON Energie", notiz: "Rahmenvertrag, Abrechnung monatlich" },
  { id: "v-enbw", name: "EnBW", notiz: "" },
  { id: "v-vattenfall", name: "Vattenfall", notiz: "" },
  { id: "v-rwe", name: "RWE", notiz: "" },
  { id: "v-swsb", name: "Stadtwerke Saarbrücken", notiz: "regionaler Schwerpunkt Saarland" },
  { id: "v-swt", name: "SWT Trier", notiz: "" },
  { id: "v-pfalz", name: "Pfalzwerke", notiz: "gute Konditionen bei RLM" },
  { id: "v-rhein", name: "Rheinenergie", notiz: "" },
  { id: "v-mvv", name: "MVV Energie", notiz: "" },
  { id: "v-entega", name: "Entega", notiz: "" },
  { id: "v-lichtblick", name: "Lichtblick", notiz: "Ökostromprodukte" },
];

const FEHLGRUENDE = [
  "Versorgerabrechnung fehlt",
  "Lastgang (RLM) fehlt",
  "Marktlokations-ID fehlt",
  "Zählernummer fehlt",
  "Jahresverbrauch unplausibel",
  "Kundenanschrift unvollständig",
  "Ansprechpartner / Kontaktdaten fehlen",
];

const PARTNER_STATUS = {
  eingeladen: { label: "Eingeladen", color: "#6B7787" },
  registriert: { label: "Stammdaten offen", color: "#B24328" },
  pruefung: { label: "Zur Prüfung", color: "#2F5FE0" },
  aktiv: { label: "Freigeschaltet", color: "#4A9130" },
  abgelehnt: { label: "Nachbesserung nötig", color: "#B24328" },
};

const leereStammdaten = () => ({
  firma: "", strasse: "", plz: "", ort: "", steuernummer: "",
  kontoinhaber: "", iban: "", bic: "", bank: "",
  ustBerechtigt: false, ustId: "",
  gewerbe: null, ausweisVorne: null, ausweisHinten: null, ustNachweis: null,
});

const passwortRegeln = (pw) => [
  { ok: (pw || "").length >= 8, text: "mindestens 8 Zeichen" },
  { ok: /[^A-Za-z0-9]/.test(pw || ""), text: "mindestens ein Sonderzeichen" },
];

const stammdatenLuecken = (sd) => {
  const f = [];
  if (!sd.firma) f.push("Firmierung");
  if (!sd.strasse || !sd.plz || !sd.ort) f.push("Anschrift");
  if (!sd.gewerbe) f.push("Gewerbeanmeldung");
  if (!sd.kontoinhaber || !sd.iban) f.push("Bankverbindung");
  if (!sd.ausweisVorne) f.push("Personalausweis Vorderseite");
  if (!sd.ausweisHinten) f.push("Personalausweis Rückseite");
  if (sd.ustBerechtigt && !sd.ustId) f.push("Umsatzsteuer-Identifikationsnummer");
  return f;
};

const DEMO_PASSWORT = "EGC-demo!2026";
const VERSION = "v2.0 · 06.09.2026 · Zielpreis und Protokoll";

const USERS = [
  { id: "vp-weber", name: "Marco Weber", rolle: "Vertriebspartner", team: "Süd", satz: 25, upline: "tl-sued",
    email: "m.weber@egc-energie.de", telefon: "0681 3390211", status: "aktiv", passwort: DEMO_PASSWORT,
    bild: null, freigabe: { von: "Karsten", datum: "2025-11-04" },
    stammdaten: { ...leereStammdaten(), firma: "Weber Energievertrieb e.K.", strasse: "Talstraße 9",
      plz: "66424", ort: "Homburg", steuernummer: "040/123/45678", kontoinhaber: "Marco Weber",
      iban: "DE21 5905 0101 0012 3456 78", bic: "SAKSDE55XXX", bank: "Sparkasse Saarbrücken",
      ustBerechtigt: true, ustId: "DE812345678",
      gewerbe: { name: "gewerbeanmeldung_weber.pdf" }, ausweisVorne: { name: "ausweis_vorne.jpg" },
      ausweisHinten: { name: "ausweis_hinten.jpg" }, ustNachweis: { name: "ust_bescheinigung.pdf" } } },
  { id: "vp-klein", name: "Sandra Klein", rolle: "Vertriebspartner", team: "Süd", satz: 30, upline: "tl-sued",
    email: "s.klein@egc-energie.de", telefon: "0621 449012", status: "pruefung", passwort: DEMO_PASSWORT,
    bild: null, freigabe: null,
    stammdaten: { ...leereStammdaten(), firma: "Klein Consulting", strasse: "Rheinallee 44",
      plz: "67061", ort: "Ludwigshafen", steuernummer: "27/456/78901", kontoinhaber: "Sandra Klein",
      iban: "DE44 5455 0010 0098 7654 32", bic: "LUHSDE6AXXX", bank: "Sparkasse Vorderpfalz",
      ustBerechtigt: false,
      gewerbe: { name: "gewerbe_klein.pdf" }, ausweisVorne: { name: "perso_v.jpg" },
      ausweisHinten: { name: "perso_h.jpg" } } },
  { id: "kalk", name: "Team Kalkulation", rolle: "Kalkulation", team: "-", satz: 0, upline: null,
    email: "kalkulation@egc-energie.de", telefon: "", status: "aktiv", passwort: DEMO_PASSWORT,
    bild: null, stammdaten: leereStammdaten() },
  { id: "tl-sued", name: "Jörg Adam", rolle: "Teamleiter", team: "Süd", satz: 50, upline: "lv",
    email: "j.adam@egc-energie.de", telefon: "0681 3390200", status: "aktiv", passwort: DEMO_PASSWORT,
    bild: null, freigabe: { von: "Karsten", datum: "2025-06-12" },
    stammdaten: { ...leereStammdaten(), firma: "Adam Vertrieb GmbH", strasse: "Bahnhofstraße 2",
      plz: "66111", ort: "Saarbrücken", kontoinhaber: "Adam Vertrieb GmbH",
      iban: "DE68 5905 0101 0087 6543 21", ustBerechtigt: true, ustId: "DE998877665",
      gewerbe: { name: "handelsregister_adam.pdf" }, ausweisVorne: { name: "ausweis_v.jpg" },
      ausweisHinten: { name: "ausweis_h.jpg" }, ustNachweis: { name: "ust_adam.pdf" } } },
  { id: "lv", name: "Katrin Roth", rolle: "Leitung Vertrieb", team: "-", satz: 0, upline: null,
    email: "k.roth@egc-energie.de", telefon: "0681 3390100", status: "aktiv", passwort: DEMO_PASSWORT,
    bild: null, stammdaten: leereStammdaten() },
  { id: "vm", name: "Nadine Petry", rolle: "Vertragsmanagement", team: "-", satz: 0, upline: null,
    email: "n.petry@egc-energie.de", telefon: "", status: "aktiv", passwort: DEMO_PASSWORT,
    bild: null, stammdaten: leereStammdaten() },
  { id: "gf", name: "Karsten", rolle: "Geschäftsführung", team: "-", satz: 0, upline: null,
    email: "karsten@egc-energie.de", telefon: "", status: "aktiv", passwort: DEMO_PASSWORT,
    bild: null, stammdaten: leereStammdaten() },
];

/* ------------------------------------------------------------------ */
/*  Hilfsfunktionen                                                    */
/* ------------------------------------------------------------------ */
const num = (n, dec = 0) =>
  isFinite(n)
    ? Number(n).toLocaleString("de-DE", {
        minimumFractionDigits: dec,
        maximumFractionDigits: dec,
      })
    : "–";
const eur = (n) => num(n, 2) + " €";
const heute = () => new Date().toISOString().slice(0, 10);
const jetzt = () => new Date().toTimeString().slice(0, 5);

/* Farbe je Rolle, damit im Nachrichtenverlauf sofort erkennbar ist, wer schreibt */
const ROLLENFARBE = {
  Vertriebspartner: "#2F5FE0",
  Teamleiter: "#4A9130",
  "Leitung Vertrieb": "#4A9130",
  Kalkulation: "#BE6A16",
  Vertragsmanagement: "#6B7787",
  "Geschäftsführung": "#0A1626",
};
/* frühestmöglicher Lieferbeginn: 14 Tage Vorlauf */
const fruehesterBeginn = () => {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d.toISOString().slice(0, 10);
};
const datum = (s) => (s ? s.split("-").reverse().join(".") : "–");
const uid = () => Math.random().toString(36).slice(2, 9);

/* Erzeugt ein mehrseitiges PDF aus Textzeilen */
function erzeugePdf(dateiname, titel, zeilen) {
  const sauber = (t) =>
    String(t).replace(/[\\()]/g, "").split("").filter((z) => z.charCodeAt(0) < 256).join("");
  const umbrechen = (t, breite) => {
    const worte = sauber(t).split(" ");
    const raus = [];
    let zeile = "";
    worte.forEach((w) => {
      if ((zeile + " " + w).trim().length > breite) { raus.push(zeile); zeile = w; }
      else zeile = (zeile + " " + w).trim();
    });
    raus.push(zeile);
    return raus;
  };

  const alle = [];
  zeilen.forEach((z) => {
    const text = typeof z === "string" ? z : z.text;
    const gross = typeof z === "object" && z.gross;
    umbrechen(text, gross ? 60 : 92).forEach((t, i) => alle.push({ text: t, gross: gross && i === 0 }));
  });

  const proSeite = 46;
  const seiten = [];
  for (let i = 0; i < alle.length; i += proSeite) seiten.push(alle.slice(i, i + proSeite));
  if (!seiten.length) seiten.push([]);

  const inhalte = seiten.map((zs, nr) => {
    let y = 790;
    let str = "BT /F1 16 Tf 55 812 Td (" + sauber(titel) + ") Tj ET\n";
    zs.forEach((z) => {
      y -= z.gross ? 22 : 15;
      str += "BT /F1 " + (z.gross ? 12 : 9.5) + " Tf 55 " + y + " Td (" + z.text + ") Tj ET\n";
    });
    str += "BT /F1 8 Tf 55 40 Td (Seite " + (nr + 1) + " von " + seiten.length + ") Tj ET\n";
    return str;
  });

  const kids = seiten.map((_, i) => 4 + i * 2 + " 0 R").join(" ");
  const objekte = [
    "<</Type/Catalog/Pages 2 0 R>>",
    "<</Type/Pages/Kids[" + kids + "]/Count " + seiten.length + ">>",
    "<</Type/Font/Subtype/Type1/BaseFont/Helvetica/Encoding/WinAnsiEncoding>>",
  ];
  inhalte.forEach((c, i) => {
    objekte.push("<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Contents " +
      (5 + i * 2) + " 0 R/Resources<</Font<</F1 3 0 R>>>>>>");
    objekte.push("<</Length " + c.length + ">>\nstream\n" + c + "\nendstream");
  });

  let pdf = "%PDF-1.4\n";
  const stellen = [];
  objekte.forEach((o, i) => {
    stellen.push(pdf.length);
    pdf += i + 1 + " 0 obj\n" + o + "\nendobj\n";
  });
  const xref = pdf.length;
  pdf += "xref\n0 " + (objekte.length + 1) + "\n0000000000 65535 f \n";
  stellen.forEach((st) => { pdf += String(st).padStart(10, "0") + " 00000 n \n"; });
  pdf += "trailer\n<</Size " + (objekte.length + 1) + "/Root 1 0 R>>\nstartxref\n" + xref + "\n%%EOF";

  let b64 = "";
  try { b64 = btoa(pdf); } catch (e) { return null; }
  return { name: dateiname, typ: "application/pdf", groesse: pdf.length,
           url: "data:application/pdf;base64," + b64 };
}

/* Erzeugt ein kleines, gültiges PDF als Datenlink – nur für die Demodateien */
function demoPdf(name, zeilen) {
  const text = (zeilen || ["EGC-Energie", name])
    .map((z, i) => "BT /F1 " + (i ? 12 : 18) + " Tf 60 " + (760 - i * 26) + " Td (" +
      String(z).replace(/[()\\]/g, "") + ") Tj ET")
    .join("\n");
  const objekte = [
    "<</Type/Catalog/Pages 2 0 R>>",
    "<</Type/Pages/Kids[3 0 R]/Count 1>>",
    "<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>",
    "<</Length " + text.length + ">>\nstream\n" + text + "\nendstream",
    "<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>",
  ];
  let pdf = "%PDF-1.4\n";
  const stellen = [];
  objekte.forEach((o, i) => {
    stellen.push(pdf.length);
    pdf += i + 1 + " 0 obj\n" + o + "\nendobj\n";
  });
  const xref = pdf.length;
  pdf += "xref\n0 " + (objekte.length + 1) + "\n0000000000 65535 f \n";
  stellen.forEach((st) => { pdf += String(st).padStart(10, "0") + " 00000 n \n"; });
  pdf += "trailer\n<</Size " + (objekte.length + 1) + "/Root 1 0 R>>\nstartxref\n" + xref + "\n%%EOF";
  let b64 = "";
  try { b64 = btoa(pdf); } catch (e) { return null; }
  return { name, typ: "application/pdf", groesse: pdf.length, url: "data:application/pdf;base64," + b64 };
}

const leereLieferstelle = (medium) => ({
  id: uid(),
  medium,
  bezeichnung: "",
  strasse: "",
  plz: "",
  ort: "",
  versorger: "",
  zaehlernummer: "",
  maloId: "",
  verbrauch: "",
  zaehlerart: "SLP",
  abrechnung: null,
  lastgang: null,
  preis: "",
  energiepreis: "",
  adresseVon: "kunde",
  neueinzug: false,
  gewerbeanmeldung: null,
  pachtvertrag: null,
  zaehlerfotoVorhanden: false,
  zaehlerfoto: null,
});

const leereAnfrage = (user) => ({
  id: "A-" + new Date().getFullYear() + "-" + Math.floor(1000 + Math.random() * 8999),
  angelegt: heute(),
  partnerId: user.id,
  partnerName: user.name,
  team: user.team,
  status: "entwurf",
  kunde: {
    firma: "", strasse: "", plz: "", ort: "", branche: "",
    ansprechpartner: "", email: "", telefon: "",
  },
  bemerkungVertrieb: "",
  zielpreis: "",
  zielpreisNotiz: "",
  lieferstellen: [leereLieferstelle("strom")],
  laufzeit: 24,
  laufzeitArt: "monate",
  wunschLieferbeginn: "",
  wunschLieferende: "",
  produkt: "Festpreis",
  produktGas: "Festpreis",
  beratungHinweis: "",
  ruecksprache: null,
  aufschlag: 0.5,
  kalkulation: null,
  fehlend: [],
  fehlendText: "",
  vertragsStatus: null,
  nachrichten: [],
  annahme: null,
  einreichung: false,
  bestaetigung: null,
  klaerung: null,
  provisionErhalten: null,
  verlauf: [],
});

const verbrauchGesamt = (a) =>
  a.lieferstellen.reduce((s, l) => s + (parseFloat(l.verbrauch) || 0), 0);

/* Angebotsvarianten: die Kalkulation kann mehrere Angebote zurückgeben
   (z. B. Festpreis 24 Monate und Spotmarkt 12 Monate, oder je Sparte eines).
   Ältere Vorgänge ohne Varianten werden auf eine einzelne Variante umgerechnet. */
function varianten(a) {
  const k = a.kalkulation;
  if (!k) return [];
  if (k.varianten && k.varianten.length) return k.varianten;
  return [{
    id: "v1", sparte: "beide", produkt: a.produkt, laufzeitArt: "monate",
    laufzeit: a.laufzeit, lieferende: "", aufschlag: k.aufschlag ?? a.aufschlag,
    lieferbeginn: k.lieferbeginn || "", gueltigBis: k.gueltigBis || "",
    bemerkung: k.bemerkung || "", angebot: k.angebot || null, preise: {},
  }];
}

/* angenommene Varianten – bei zwei Sparten können es zwei sein */
function gewaehlte(a) {
  const k = a.kalkulation;
  if (!k || !k.gewaehlt) return [];
  const ids = Array.isArray(k.gewaehlt) ? k.gewaehlt : [k.gewaehlt];
  return varianten(a).filter((v) => ids.includes(v.id));
}

const aktiveVariante = (a) => {
  const g = gewaehlte(a);
  if (g.length) return g[0];
  const v = varianten(a);
  return v.length ? v[0] : null;
};

/* Laufzeit entweder in Monaten oder über ein festes Lieferende */
const laufzeitMonate = (v) =>
  v.laufzeitArt === "ende"
    ? monateZwischen(v.lieferbeginn, v.lieferende) || 0
    : parseInt(v.laufzeit) || 0;

const enddatum = (v) =>
  v.laufzeitArt === "ende" ? v.lieferende || null : monateDazu(v.lieferbeginn, parseInt(v.laufzeit) || 0);

const laufzeitVon = (a) => {
  const v = aktiveVariante(a);
  return v ? laufzeitMonate(v) : a.laufzeit;
};

/* Aufschlag in ct/kWh × Menge der Sparte = Gesamtprovision der Firma in € je Lieferjahr */
const provisionVariante = (a, v) =>
  (mengeSparte(a, v.sparte) * (parseFloat(v.aufschlag) || 0)) / 100;

/* Nach der Versorgerbestätigung zählen die bestätigten Mengen und der Gesamtaufschlag */
const bestaetigteMenge = (a) =>
  a.bestaetigung
    ? Object.values(a.bestaetigung.stellen || {}).reduce((t, x) => t + (parseFloat(x.kwh) || 0), 0)
    : 0;

const gesamtprovision = (a, v) => {
  if (!v && a.bestaetigung)
    return (bestaetigteMenge(a) * (parseFloat(a.bestaetigung.aufschlag) || 0)) / 100;
  if (v) return provisionVariante(a, v);
  const g = gewaehlte(a);
  if (g.length) return g.reduce((t, x) => t + provisionVariante(a, x), 0);
  const alle = varianten(a);
  if (alle.length) return provisionVariante(a, alle[0]);
  return (verbrauchGesamt(a) * a.aufschlag) / 100;
};

/* Differenzprovision: der Partner erhält seinen Satz, jede Stufe darüber
   die Differenz zum bereits vergebenen Satz. Der Rest bleibt in der Firma. */
function verteilung(gesamt, partnerId, mitarbeiter) {
  const p = mitarbeiter.find((m) => m.id === partnerId);
  if (!p) return { anteile: [], firma: gesamt };
  const anteile = [
    { id: p.id, name: p.name, rolle: p.rolle, satz: p.satz || 0, betrag: (gesamt * (p.satz || 0)) / 100 },
  ];
  let vergeben = p.satz || 0;
  const gesehen = new Set([p.id]);
  let oben = mitarbeiter.find((m) => m.id === p.upline);
  while (oben && !gesehen.has(oben.id)) {
    gesehen.add(oben.id);
    const diff = Math.max(0, (oben.satz || 0) - vergeben);
    if (diff > 0)
      anteile.push({ id: oben.id, name: oben.name, rolle: oben.rolle, satz: diff,
                     betrag: (gesamt * diff) / 100, overhead: true });
    vergeben = Math.max(vergeben, oben.satz || 0);
    oben = mitarbeiter.find((m) => m.id === oben.upline);
  }
  return { anteile, firma: gesamt - anteile.reduce((s, x) => s + x.betrag, 0) };
}

/* alle, die direkt oder indirekt unter jemandem hängen */
function strukturUnter(id, mitarbeiter) {
  const direkt = mitarbeiter.filter((m) => m.upline === id);
  return direkt.reduce((alle, m) => [...alle, m, ...strukturUnter(m.id, mitarbeiter)], []);
}

/* für wen darf jemand eine Anfrage anlegen? */
function anlegenFuer(user, mitarbeiter) {
  const vertrieb = ["Vertriebspartner", "Teamleiter", "Leitung Vertrieb"];
  if (user.rolle === "Leitung Vertrieb")
    return [user, ...mitarbeiter.filter((m) => m.id !== user.id && vertrieb.includes(m.rolle))];
  if (user.rolle === "Teamleiter")
    return [user, ...strukturUnter(user.id, mitarbeiter).filter((m) => vertrieb.includes(m.rolle))];
  return [user];
}

const verbrauchMedium = (a, medium) =>
  a.lieferstellen.filter((l) => l.medium === medium)
    .reduce((sm, l) => sm + (parseFloat(l.verbrauch) || 0), 0);

const mengeSparte = (a, sparte) =>
  !sparte || sparte === "beide" ? verbrauchGesamt(a)
    : verbrauchMedium(a, sparte === "gas" ? "gas" : "strom");

const monateZwischen = (von, bis) => {
  if (!von || !bis) return null;
  const v = new Date(von), b = new Date(bis);
  if (isNaN(v) || isNaN(b)) return null;
  const m = (b.getFullYear() - v.getFullYear()) * 12 + (b.getMonth() - v.getMonth());
  return Math.max(0, b.getDate() >= v.getDate() ? m : m - 1);
};

const monateDazu = (iso, monate) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d)) return null;
  d.setMonth(d.getMonth() + monate);
  return d.toISOString().slice(0, 10);
};

const anteilVon = (a, id, mitarbeiter, variante) => {
  const v = verteilung(gesamtprovision(a, variante), a.partnerId, mitarbeiter);
  const t = v.anteile.find((x) => x.id === id);
  return t ? t.betrag : 0;
};

const leereVariante = (a) => ({
  id: uid(), sparte: verbrauchMedium(a, "gas") && verbrauchMedium(a, "strom") ? "beide"
    : verbrauchMedium(a, "gas") ? "gas" : "strom",
  produkt: PRODUKTE.includes(a.produkt) ? a.produkt : "Festpreis",
  laufzeitArt: a.laufzeitArt || "monate",
  laufzeit: a.laufzeit, lieferende: a.wunschLieferende || "",
  aufschlag: a.aufschlag, lieferbeginn: a.wunschLieferbeginn || "",
  gueltigBis: "", bemerkung: "", angebot: null, preise: {},
});

/* ------------------------------------------------------------------ */
/*  Demodaten                                                          */
/* ------------------------------------------------------------------ */
function seed() {
  const a1 = leereAnfrage(USERS[0]);
  a1.id = "A-2026-1042";
  a1.angelegt = "2026-08-19";
  a1.status = "angebot";
  a1.kunde = {
    firma: "Hotel Saarblick GmbH", strasse: "Uferstraße 14", plz: "66111",
    ort: "Saarbrücken", ansprechpartner: "Frau Dr. Lorenz",
    email: "lorenz@hotel-saarblick.de", telefon: "0681 449021",
  };
  a1.lieferstellen = [
    { ...leereLieferstelle("strom"), id: "s1", bezeichnung: "Haupthaus", strasse: "Uferstraße 14",
      plz: "66111", ort: "Saarbrücken", versorger: "Stadtwerke Saarbrücken",
      zaehlernummer: "1ESY1160892344", maloId: "51238106877", verbrauch: "412000",
      zaehlerart: "RLM", abrechnung: demoPdf("abrechnung_strom_2025.pdf", ["Jahresabrechnung Strom 2025", "Hotel Saarblick GmbH", "Beispieldokument aus der Demo"]),
      lastgang: demoPdf("lastgang_haupthaus_2025.pdf", ["Lastgang Haupthaus 2025", "Viertelstundenwerte, Auszug"]) },
    { ...leereLieferstelle("gas"), id: "s2", bezeichnung: "Haupthaus", strasse: "Uferstraße 14",
      plz: "66111", ort: "Saarbrücken", versorger: "E.ON Energie",
      zaehlernummer: "G4-778120", maloId: "44118902355", verbrauch: "890000",
      zaehlerart: "SLP", abrechnung: demoPdf("abrechnung_gas_2025.pdf", ["Jahresabrechnung Erdgas 2025", "Hotel Saarblick GmbH"]) },
  ];
  a1.laufzeit = 24;
  a1.aufschlag = 0.6;
  a1.wunschLieferbeginn = "2026-11-01";
  a1.laufzeitArt = "ende";
  a1.wunschLieferende = "2028-12-31";
  a1.produktGas = "Festpreis";
  a1.kalkulation = {
    bearbeiter: "Team Kalkulation", datum: "2026-08-22",
    vollmacht: demoPdf("maklervollmacht_saarblick.pdf", ["Maklervollmacht", "Hotel Saarblick GmbH"]),
    gewaehlt: null,
    varianten: [
      { id: "v1", sparte: "beide", produkt: "Festpreis", laufzeitArt: "ende", laufzeit: 24,
        lieferende: "2028-12-31", aufschlag: 0.6,
        lieferbeginn: "2026-11-01", gueltigBis: "2026-09-12",
        bemerkung: "Preise indikativ auf Basis Schlusskurse 21.08. Bindefrist 3 Werktage nach Kundenannahme.",
        angebot: demoPdf("angebot_saarblick_festpreis_24m.pdf", ["Angebot Festpreis 24 Monate", "Hotel Saarblick GmbH", "Aufschlag 0,600 ct/kWh"]),
        preise: { s1: { energie: "18,40", arbeit: "24,60" }, s2: { energie: "4,20", arbeit: "6,85" } } },
      { id: "v2", sparte: "beide", produkt: "Spotmarkt", laufzeitArt: "monate", laufzeit: 12,
        lieferende: "", aufschlag: 0.45,
        lieferbeginn: "2026-11-01", gueltigBis: "2026-09-12",
        bemerkung: "Spotbezug mit monatlicher Abrechnung, kein Preisrisiko-Hedge. Wechsel in Festpreis jederzeit möglich.",
        angebot: demoPdf("angebot_saarblick_spot_12m.pdf", ["Angebot Spotmarkt 12 Monate", "Hotel Saarblick GmbH", "Aufschlag 0,450 ct/kWh"]),
        preise: {} },
    ],
  };
  a1.nachrichten = [
    { id: "n1", text: "Kunde braucht die Preise bis Freitag, er hat noch ein Vergleichsangebot liegen.",
      von: "Marco Weber", rolle: "Vertriebspartner", datum: "2026-08-19", zeit: "14:20" },
    { id: "n2", text: "Verstanden. Der Lastgang ist sauber, wir rechnen Festpreis und Spot parallel und schicken beides.",
      von: "Team Kalkulation", rolle: "Kalkulation", datum: "2026-08-20", zeit: "09:05" },
    { id: "n3", text: "Beide Varianten sind raus. Beim Spot bitte auf die monatliche Abrechnung hinweisen.",
      von: "Team Kalkulation", rolle: "Kalkulation", datum: "2026-08-22", zeit: "11:40" },
  ];
  a1.verlauf = [
    { d: "2026-08-19", t: "Anfrage eingereicht", w: "Marco Weber" },
    { d: "2026-08-22", t: "Angebot kalkuliert und zurückgesendet", w: "Team Kalkulation" },
  ];

  const a2 = leereAnfrage(USERS[0]);
  a2.id = "A-2026-1055";
  a2.angelegt = "2026-08-28";
  a2.status = "klaerfall";
  a2.kunde = {
    firma: "Gasthaus Zum Anker e.K.", strasse: "Marktplatz 3", plz: "54290",
    ort: "Trier", ansprechpartner: "Herr Bremer",
    email: "info@zum-anker.de", telefon: "0651 220188",
  };
  a2.lieferstellen = [
    { ...leereLieferstelle("strom"), bezeichnung: "Gaststätte", strasse: "Marktplatz 3",
      plz: "54290", ort: "Trier", versorger: "SWT Trier",
      zaehlernummer: "1SWT0099231", maloId: "", verbrauch: "96000",
      zaehlerart: "SLP", abrechnung: null },
  ];
  a2.produkt = "Spotmarkt";
  a2.produktGas = "Festpreis";
  a2.aufschlag = 0.4;
  a2.fehlend = ["Versorgerabrechnung fehlt", "Marktlokations-ID fehlt"];
  a2.fehlendText =
    "Bitte die letzte Jahresabrechnung des Versorgers hochladen, ohne MaLo-ID keine Netzentgelt-Zuordnung möglich.";
  a2.nachrichten = [
    { id: "n4", text: "Die MaLo-ID bekomme ich erst vom Netzbetreiber, das dauert ein paar Tage.",
      von: "Marco Weber", rolle: "Vertriebspartner", datum: "2026-08-29", zeit: "16:12" },
    { id: "n5", text: "Kein Problem, wir legen den Vorgang so lange auf Wiedervorlage.",
      von: "Team Kalkulation", rolle: "Kalkulation", datum: "2026-08-29", zeit: "16:48" },
  ];
  a2.verlauf = [
    { d: "2026-08-28", t: "Anfrage eingereicht", w: "Marco Weber" },
    { d: "2026-08-29", t: "Zurück an Vertrieb: Unterlagen unvollständig", w: "Team Kalkulation" },
  ];

  const a3 = leereAnfrage(USERS[1]);
  a3.id = "A-2026-1061";
  a3.angelegt = "2026-09-01";
  a3.status = "eingereicht";
  a3.kunde = {
    firma: "Kunststofftechnik Pfalz GmbH", strasse: "Industriering 8", plz: "67065",
    ort: "Ludwigshafen", ansprechpartner: "Herr Sancak",
    email: "einkauf@kt-pfalz.de", telefon: "0621 887400",
  };
  a3.lieferstellen = [
    { ...leereLieferstelle("strom"), bezeichnung: "Werk 1", strasse: "Industriering 8",
      plz: "67065", ort: "Ludwigshafen", versorger: "Pfalzwerke",
      zaehlernummer: "1PFW4410023", maloId: "51009923114", verbrauch: "2450000",
      zaehlerart: "RLM", abrechnung: demoPdf("pfalzwerke_2025.pdf", ["Jahresabrechnung Strom 2025", "Kunststofftechnik Pfalz GmbH"]),
      lastgang: demoPdf("lastgang_werk1.pdf", ["Lastgang Werk 1", "Dreischichtbetrieb"]) },
    { ...leereLieferstelle("strom"), bezeichnung: "Werk 2 / Lager", strasse: "Industriering 12",
      plz: "67065", ort: "Ludwigshafen", versorger: "Pfalzwerke",
      zaehlernummer: "1PFW4410088", maloId: "51009923400", verbrauch: "310000",
      zaehlerart: "SLP", abrechnung: demoPdf("pfalzwerke_lager_2025.pdf", ["Jahresabrechnung Lager 2025"]) },
  ];
  a3.produkt = EMPFEHLUNG;
  a3.produktGas = "Festpreis";
  a3.laufzeit = 36;
  a3.laufzeitArt = "ende";
  a3.wunschLieferbeginn = "2027-07-15";
  a3.wunschLieferende = "2029-12-31";
  a3.beratungHinweis =
    "Kunde hat bisher immer Festpreis gemacht, fragt jetzt nach Tranchen. Produktion läuft im Dreischichtbetrieb, Lastgang ist sehr gleichmäßig. Was empfehlen wir bei 2,45 GWh?";
  a3.aufschlag = 0.25;
  a3.verlauf = [{ d: "2026-09-01", t: "Anfrage eingereicht", w: "Sandra Klein" }];

  const a4 = leereAnfrage(USERS[1]);
  a4.id = "A-2026-0987";
  a4.angelegt = "2026-07-14";
  a4.status = "abgeschlossen";
  a4.vertragsStatus = "Vertrag unterschrieben";
  a4.kunde = {
    firma: "Landhotel Eifelblick", strasse: "Am Hang 2", plz: "54578",
    ort: "Wiesbaum", ansprechpartner: "Familie Krämer",
    email: "kontakt@eifelblick.de", telefon: "06593 90210",
  };
  a4.lieferstellen = [
    { ...leereLieferstelle("gas"), id: "g1", bezeichnung: "Hotel", strasse: "Am Hang 2",
      plz: "54578", ort: "Wiesbaum", versorger: "RWE", zaehlernummer: "G6-220914",
      maloId: "44120088731", verbrauch: "640000", zaehlerart: "SLP",
      abrechnung: demoPdf("rwe_2025.pdf", ["Jahresabrechnung Erdgas 2025", "Landhotel Eifelblick"]) },
  ];
  a4.aufschlag = 0.55;
  a4.wunschLieferbeginn = "2026-10-01";
  a4.kalkulation = {
    bearbeiter: "Team Kalkulation", datum: "2026-07-17",
    vollmacht: demoPdf("maklervollmacht_eifelblick.pdf", ["Maklervollmacht", "Landhotel Eifelblick"]),
    gewaehlt: ["v1"],
    varianten: [
      { id: "v1", sparte: "gas", produkt: "Festpreis", laufzeitArt: "ende", laufzeit: 24,
        lieferende: "2028-12-31", aufschlag: 0.55,
        lieferbeginn: "2026-10-01", gueltigBis: "2026-08-01",
        bemerkung: "Bestandskunde, Wechsel zum Lieferbeginn.",
        angebot: demoPdf("angebot_eifelblick_gas.pdf", ["Angebot Erdgas Festpreis", "Landhotel Eifelblick"]),
        preise: { g1: { energie: "4,45", arbeit: "7,10" } } },
    ],
  };
  a4.verlauf = [
    { d: "2026-07-14", t: "Anfrage eingereicht", w: "Sandra Klein" },
    { d: "2026-07-17", t: "Angebot kalkuliert", w: "Team Kalkulation" },
    { d: "2026-07-23", t: "Angebot vom Kunden angenommen", w: "Sandra Klein" },
  ];

  return [a3, a2, a1, a4];
}

function seedLeads() {
  const l1 = leererLead();
  l1.id = "L-2026-118";
  l1.angelegt = "2026-09-01";
  l1.status = "neu";
  l1.firma = "Brauhaus am Staden GmbH";
  l1.strasse = "Stadenstraße 21"; l1.plz = "66121"; l1.ort = "Saarbrücken";
  l1.ansprechpartner = "Herr Thiel"; l1.position = "Geschäftsführer";
  l1.telefon = "0681 776540"; l1.email = "thiel@brauhaus-staden.de";
  l1.verbrauchStrom = "285000"; l1.verbrauchGas = "410000";
  l1.laufzeitStrom = "2027-03-31"; l1.laufzeitGas = "2027-03-31";
  l1.beschaffung = "Festpreis über Stadtwerke, seit 2024";
  l1.dienstleister = false;
  l1.quelle = "Social Media"; l1.quelleDetail = "LinkedIn-Kampagne Gastronomie";
  l1.terminDatum = "2026-09-11"; l1.terminZeit = "10:00"; l1.terminArt = "Vor Ort";
  l1.bemerkung = "Zeigt sich offen, klagt über die letzte Preisrunde. Braut selbst, hoher Gasanteil.";
  l1.dateien = [demoPdf("abrechnung_strom_2025.pdf", ["Jahresabrechnung Strom", "Brauhaus am Staden"]),
                demoPdf("abrechnung_gas_2025.pdf", ["Jahresabrechnung Erdgas", "Brauhaus am Staden"])];
  l1.zugewiesen = "vp-weber"; l1.zugewiesenVon = "Katrin Roth"; l1.zugewiesenAm = "2026-09-01";

  const l2 = leererLead();
  l2.id = "L-2026-121";
  l2.angelegt = "2026-09-03";
  l2.status = "erstgespraech";
  l2.gelesen = true;
  l2.firma = "Pflegeheim St. Elisabeth e.V.";
  l2.strasse = "Kirchweg 5"; l2.plz = "54290"; l2.ort = "Trier";
  l2.ansprechpartner = "Frau Bender"; l2.position = "Verwaltungsleitung";
  l2.telefon = "0651 330012"; l2.email = "bender@st-elisabeth-trier.de";
  l2.verbrauchStrom = "640000"; l2.verbrauchGas = "1250000";
  l2.laufzeitStrom = "2026-12-31"; l2.laufzeitGas = "2027-12-31";
  l2.beschaffung = "Rahmenvertrag über Caritas-Verbund";
  l2.dienstleister = true; l2.dienstleisterName = "Energiekontor Rhein-Mosel";
  l2.quelle = "Tippgeber"; l2.quelleDetail = "Empfehlung durch Landhotel Eifelblick";
  l2.terminDatum = "2026-09-16"; l2.terminZeit = "14:30"; l2.terminArt = "Microsoft Teams";
  l2.bemerkung = "Bestehender Dienstleister, Vertrag Strom läuft zum Jahresende aus. Ausschreibungspflicht prüfen.";
  l2.dateien = [demoPdf("lastgang_2025.pdf", ["Lastgang 2025", "Pflegeheim St. Elisabeth"])];
  l2.zugewiesen = "tl-sued"; l2.zugewiesenVon = "Karsten"; l2.zugewiesenAm = "2026-09-03";

  const bau = (id, tag, firma, ort, strom, gas, quelle, status, wem, termin) => {
    const l = leererLead();
    l.id = id; l.angelegt = tag; l.status = status; l.gelesen = true;
    l.firma = firma; l.ort = ort; l.plz = ""; l.strasse = "";
    l.verbrauchStrom = strom; l.verbrauchGas = gas;
    l.quelle = quelle; l.zugewiesen = wem; l.zugewiesenVon = "Katrin Roth"; l.zugewiesenAm = tag;
    l.terminDatum = termin || ""; l.terminArt = "Microsoft Teams";
    if (status === "auftrag") l.abschlussAm = "2026-08-20";
    return l;
  };

  return [
    l2, l1,
    bau("L-2026-104", "2026-08-12", "Autohaus Neunkirchen GmbH", "Neunkirchen", "180000", "220000",
        "Kaltakquise", "angebot", "vp-weber", "2026-08-26"),
    bau("L-2026-097", "2026-08-04", "Wäscherei Mosel GmbH", "Bernkastel", "520000", "1400000",
        "Tippgeber", "verhandlung", "vp-klein", "2026-08-28"),
    bau("L-2026-088", "2026-07-22", "Seniorenresidenz Sonnenhang", "Homburg", "310000", "780000",
        "Social Media", "auftrag", "vp-weber", "2026-08-05"),
    bau("L-2026-076", "2026-07-02", "Metallbau Krämer e.K.", "Zweibrücken", "95000", "0",
        "Kaltakquise", "verloren", "vp-klein", "2026-07-15"),
    bau("L-2026-069", "2026-06-18", "Camping Bostalsee Betriebs GmbH", "Nohfelden", "140000", "60000",
        "Social Media", "wiedervorlage", "tl-sued", "2027-01-15"),
  ];
}

/* ------------------------------------------------------------------ */
/*  Kleine UI-Bausteine                                                */
/* ------------------------------------------------------------------ */
const Feld = ({ label, value, onChange, placeholder, type = "text", fehler, breit, min, gesperrt }) => (
  <label className={"block " + (breit ? "sm:col-span-2" : "")}>
    <span className="block text-xs mb-1" style={{ color: C.muted }}>{label}</span>
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      min={min}
      disabled={gesperrt}
      className="w-full px-3 py-2 text-sm rounded outline-none"
      style={{
        border: "1px solid " + (fehler ? C.warn : C.line),
        background: gesperrt ? "#F1F3F5" : fehler ? "#FCF3F0" : "#fff",
        color: gesperrt ? C.muted : C.text,
      }}
    />
  </label>
);

const Select = ({ label, value, onChange, options, breit }) => (
  <label className={"block " + (breit ? "sm:col-span-2" : "")}>
    <span className="block text-xs mb-1" style={{ color: C.muted }}>{label}</span>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 text-sm rounded outline-none"
      style={{ border: "1px solid " + C.line, background: "#fff", color: C.text }}
    >
      {options.map((o) => (
        <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>
      ))}
    </select>
  </label>
);

const Btn = ({ children, onClick, variante = "primär", icon: Icon, disabled }) => {
  const s =
    variante === "primär"
      ? { background: C.ink, color: "#fff", border: "1px solid " + C.ink }
      : variante === "gefahr"
      ? { background: "#fff", color: C.warn, border: "1px solid " + C.warn }
      : variante === "ok"
      ? { background: C.ok, color: "#fff", border: "1px solid " + C.ok }
      : { background: "#fff", color: C.text, border: "1px solid " + C.line };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-2 px-3.5 py-2 text-sm rounded"
      style={{ ...s, opacity: disabled ? 0.45 : 1, cursor: disabled ? "not-allowed" : "pointer" }}
    >
      {Icon && <Icon size={15} />}
      {children}
    </button>
  );
};

const StatusPunkt = ({ status }) => {
  const s = STATUS[status];
  return (
    <span className="inline-flex items-center gap-1.5 text-xs whitespace-nowrap" style={{ color: s.color }}>
      <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
      {s.label}
    </span>
  );
};

const MediumIcon = ({ medium, size = 14 }) =>
  medium === "strom" ? (
    <Zap size={size} style={{ color: C.strom }} />
  ) : (
    <Flame size={size} style={{ color: C.gas }} />
  );

/* Datei vollständig einlesen, damit sie später geöffnet und heruntergeladen werden kann */
function dateiLesen(file, fertig) {
  const r = new FileReader();
  r.onload = () =>
    fertig({ name: file.name, typ: file.type || "", groesse: file.size, url: r.result });
  r.readAsDataURL(file);
}

/* Safari blockiert Links auf Daten-URLs. Deshalb wird die Datei in ein
   Blob-Objekt umgewandelt und darüber geöffnet oder gespeichert. */
function blobVon(datei) {
  const teile = String(datei.url || "").split(",");
  const typ = (teile[0].match(/data:([^;]+)/) || [])[1] || "application/octet-stream";
  const roh = atob(teile[1] || "");
  const feld = new Uint8Array(roh.length);
  for (let i = 0; i < roh.length; i++) feld[i] = roh.charCodeAt(i);
  return new Blob([feld], { type: typ });
}

function dateiOeffnen(datei) {
  try {
    const url = URL.createObjectURL(blobVon(datei));
    const fenster = window.open(url, "_blank");
    if (!fenster) location.href = url;
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (e) { /* Datei nicht lesbar */ }
}

function dateiLaden(datei) {
  try {
    const url = URL.createObjectURL(blobVon(datei));
    const a = document.createElement("a");
    a.href = url;
    a.download = datei.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (e) { /* Datei nicht lesbar */ }
}

const kb = (n) => (!n ? "" : n > 1048576 ? num(n / 1048576, 1) + " MB" : num(n / 1024, 0) + " KB");

/* Anzeige einer Datei mit Öffnen und Herunterladen */
function DateiChip({ datei, label, klein }) {
  if (!datei) return null;
  const inhalt = (
    <>
      <FileText size={klein ? 14 : 15} style={{ color: datei.url ? C.strom : C.muted }} />
      <span className="flex-1 truncate">{datei.name}</span>
      {datei.groesse ? (
        <span className="text-xs" style={{ color: C.muted }}>{kb(datei.groesse)}</span>
      ) : null}
      {label && <span className="text-xs" style={{ color: C.muted }}>{label}</span>}
    </>
  );
  const stil = {
    border: "1px solid " + C.line,
    background: "#F6F8FA",
    textDecoration: "none",
    color: C.text,
  };
  if (!datei.url)
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded text-sm" style={stil}>
        {inhalt}
      </div>
    );
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded text-sm" style={stil}>
      {inhalt}
      <button onClick={() => dateiOeffnen(datei)} className="text-xs px-2 py-1 rounded"
              style={{ border: "1px solid " + C.line, background: "#fff", color: C.strom }}>öffnen</button>
      <button onClick={() => dateiLaden(datei)} className="text-xs px-2 py-1 rounded"
              style={{ border: "1px solid " + C.line, background: "#fff", color: C.strom }}>laden</button>
    </div>
  );
}

const Datei = ({ label, datei, onSet, hinweis, bild }) => (
  <div>
    <span className="block text-xs mb-1" style={{ color: C.muted }}>{label}</span>
    {datei ? (
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0"><DateiChip datei={datei} /></div>
        <button onClick={() => onSet(null)} style={{ color: C.muted }}>
          <X size={15} />
        </button>
      </div>
    ) : (
      <label
        className="flex items-center gap-2 px-3 py-2 rounded text-sm cursor-pointer"
        style={{ border: "1px dashed " + C.line, color: C.muted, background: "#fff" }}
      >
        <Upload size={14} />
        <span>{hinweis || "Datei auswählen"}</span>
        <input
          type="file"
          className="hidden"
          accept={bild ? "image/*" : undefined}
          onChange={(e) => {
            const f = e.target.files && e.target.files[0];
            if (f) dateiLesen(f, onSet);
          }}
        />
      </label>
    )}
  </div>
);

/* Provisionsaufteilung – zeigt je nach Rolle alles oder nur den eigenen Anteil */
function Provisionsblock({ a, mitarbeiter, user, laufzeit, variante }) {
  const gesamt = gesamtprovision(a, variante);
  const v = verteilung(gesamt, a.partnerId, mitarbeiter);
  const sichtGesamt = user.rolle !== "Vertriebspartner";
  const sichtStruktur = ["Geschäftsführung", "Leitung Vertrieb", "Teamleiter"].includes(user.rolle);
  const sichtFirma = user.rolle === "Geschäftsführung";
  const zeilen = sichtStruktur ? v.anteile : v.anteile.filter((x) => x.id === user.id);
  const jahre = laufzeit ? laufzeit / 12 : 0;
  const eigen = v.anteile.find((x) => x.id === user.id);
  const kopfBetrag = sichtGesamt ? gesamt : eigen ? eigen.betrag : 0;

  return (
    <div className="rounded p-4" style={{ background: "#F6F8FA", border: "1px solid " + C.line }}>
      <div className="flex items-baseline justify-between mb-3">
        <span className="text-xs" style={{ color: C.muted }}>
          {sichtGesamt ? "Gesamtprovision je Lieferjahr" : "Deine Provision je Lieferjahr"}
        </span>
        <span className="text-2xl" style={{ fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}>
          {eur(kopfBetrag)}
        </span>
      </div>
      <div className="text-xs mb-3" style={{ color: C.muted }}>
        {a.bestaetigung && sichtGesamt
          ? "bestätigt: " + num(bestaetigteMenge(a)) + " kWh × " + num(a.bestaetigung.aufschlag || 0, 3) + " ct/kWh"
          : sichtGesamt
          ? num(verbrauchGesamt(a)) + " kWh × " + num((variante ? variante.aufschlag : (aktiveVariante(a) ? aktiveVariante(a).aufschlag : a.aufschlag)) || 0, 3) + " ct/kWh"
          : num(user.satz || 0, 0) + " % Provisionssatz auf " + num(verbrauchGesamt(a)) + " kWh"}
        {jahre ? " · über " + num(jahre, 0) + " Lieferjahre " + eur(kopfBetrag * jahre) : ""}
      </div>

      {sichtStruktur && zeilen.map((z) => (
        <div key={z.id} className="flex items-center gap-3 py-1.5 text-sm"
             style={{ borderTop: "1px solid " + C.line }}>
          <span className="flex-1">
            {z.name}
            <span className="block text-xs" style={{ color: C.muted }}>
              {z.overhead ? "Overhead-Provision · " : ""}{z.rolle} · {num(z.satz, 0)} Prozentpunkte
            </span>
          </span>
          <span style={{ fontVariantNumeric: "tabular-nums", color: z.id === user.id ? C.ok : C.text }}>
            {eur(z.betrag)}
          </span>
        </div>
      ))}

      {a.bestaetigung && parseFloat(a.bestaetigung.bonus) > 0 && (
        <div className="flex items-center gap-3 py-1.5 text-sm" style={{ borderTop: "1px solid " + C.line }}>
          <span className="flex-1">Bonuszahlung Versorger
            <span className="block text-xs" style={{ color: C.muted }}>
              {a.bestaetigung.bonusArt === "jaehrlich" ? "pro Lieferjahr" : "einmalig"}
            </span>
          </span>
          <span style={{ fontVariantNumeric: "tabular-nums" }}>
            {eur(parseFloat(a.bestaetigung.bonus) || 0)}
          </span>
        </div>
      )}

      {sichtFirma && (
        <div className="flex items-center gap-3 py-1.5 text-sm" style={{ borderTop: "1px solid " + C.line }}>
          <span className="flex-1">Verbleibt in der Firma</span>
          <span style={{ fontVariantNumeric: "tabular-nums" }}>{eur(v.firma)}</span>
        </div>
      )}

      {!sichtStruktur && !eigen && (
        <p className="text-sm" style={{ color: C.muted }}>Für dich fällt bei diesem Vorgang keine Provision an.</p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Anfrage-Assistent                                                  */
/* ------------------------------------------------------------------ */
function Assistent({ user, mitarbeiter, entwurf, onSpeichern, onSenden, onAbbrechen }) {
  const [a, setA] = useState(entwurf || leereAnfrage(user));
  const [schritt, setSchritt] = useState(1);
  const [geprueft, setGeprueft] = useState(false);

  const setK = (k, v) =>
    setA((z) => {
      const kunde = { ...z.kunde, [k]: v };
      /* Lieferstellen, die die Kundenanschrift übernehmen, ziehen automatisch mit */
      const lieferstellen = ["strasse", "plz", "ort"].includes(k)
        ? z.lieferstellen.map((l) => (l.adresseVon === "kunde" ? { ...l, [k]: v } : l))
        : z.lieferstellen;
      return { ...z, kunde, lieferstellen };
    });
  const setL = (id, k, v) =>
    setA((z) => ({ ...z, lieferstellen: z.lieferstellen.map((l) => (l.id === id ? { ...l, [k]: v } : l)) }));
  const adresseSetzen = (id, quelle) => {
    setA((v) => ({
      ...v,
      lieferstellen: v.lieferstellen.map((l) => {
        if (l.id !== id) return l;
        if (quelle === "manuell") return { ...l, adresseVon: "manuell" };
        const q = quelle === "kunde" ? v.kunde : v.lieferstellen.find((x) => x.id === quelle);
        if (!q) return { ...l, adresseVon: "manuell" };
        return { ...l, adresseVon: quelle, strasse: q.strasse || "", plz: q.plz || "", ort: q.ort || "" };
      }),
    }));
  };

  const addL = (medium) =>
    setA((z) => ({
      ...z,
      lieferstellen: [...z.lieferstellen,
        { ...leereLieferstelle(medium), adresseVon: "kunde",
          strasse: z.kunde.strasse, plz: z.kunde.plz, ort: z.kunde.ort }],
    }));
  const delL = (id) =>
    setA((z) => ({ ...z, lieferstellen: z.lieferstellen.filter((l) => l.id !== id) }));

  const luecken = useMemo(() => {
    const f = [];
    if (!a.kunde.firma) f.push("Firmenname");
    if (!a.kunde.plz || !a.kunde.ort) f.push("Kundenanschrift");
    if (!a.kunde.ansprechpartner) f.push("Ansprechpartner");
    if (!a.kunde.branche) f.push("Branche");
    a.lieferstellen.forEach((l, i) => {
      const n = (l.bezeichnung || "Lieferstelle " + (i + 1)) + ": ";
      if (!l.neueinzug && !l.versorger) f.push(n + "Versorger");
      if (!l.zaehlernummer) f.push(n + "Zählernummer");
      if (!l.maloId) f.push(n + "Marktlokations-ID");
      if (!l.verbrauch) f.push(n + "Jahresverbrauch");
      if (l.zaehlerart === "RLM" && !l.lastgang) f.push(n + "Lastgang");
    });
    return f;
  }, [a]);

  /* Ohne diese Angaben ist ein Senden gesperrt */
  const sperren = useMemo(() => {
    const f = [];
    a.lieferstellen.forEach((l, i) => {
      const n = (l.bezeichnung || "Lieferstelle " + (i + 1)) + ": ";
      if (l.neueinzug && !l.gewerbeanmeldung) f.push(n + "Gewerbeanmeldung (Neueinzug)");
      if (l.neueinzug && !l.pachtvertrag) f.push(n + "Pachtvertrag (Neueinzug)");
    });
    if (a.wunschLieferbeginn && a.wunschLieferbeginn < fruehesterBeginn())
      f.push("Lieferbeginn frühestens am " + datum(fruehesterBeginn()));
    return f;
  }, [a]);

  const optionen = anlegenFuer(user, mitarbeiter);
  const stromStellen = a.lieferstellen.filter((l) => l.medium === "strom");
  const gasStellen = a.lieferstellen.filter((l) => l.medium === "gas");

  const Schritte = ["Kunde", "Lieferstellen", "Angebotswunsch", "Prüfen & senden"];

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <button onClick={onAbbrechen} style={{ color: C.muted }}><ArrowLeft size={18} /></button>
        <h2 className="text-lg" style={{ letterSpacing: "-0.01em" }}>
          {entwurf ? "Anfrage " + a.id + " ergänzen" : "Neue Angebotsanfrage"}
        </h2>
      </div>

      <div className="flex flex-wrap gap-1 mb-6">
        {Schritte.map((s, i) => (
          <button
            key={s}
            onClick={() => setSchritt(i + 1)}
            className="px-3 py-1.5 text-sm rounded"
            style={{
              background: schritt === i + 1 ? C.ink : "transparent",
              color: schritt === i + 1 ? "#fff" : C.muted,
              border: "1px solid " + (schritt === i + 1 ? C.ink : C.line),
            }}
          >
            {i + 1}. {s}
          </button>
        ))}
      </div>

      {a.fehlend && a.fehlend.length > 0 && (
        <div className="mb-5 p-4 rounded" style={{ background: "#FCF3F0", border: "1px solid " + C.warn }}>
          <div className="flex items-center gap-2 mb-2" style={{ color: C.warn }}>
            <AlertTriangle size={15} />
            <span className="text-sm">Die Kalkulation benötigt noch folgende Angaben</span>
          </div>
          <ul className="text-sm ml-6 list-disc" style={{ color: C.text }}>
            {a.fehlend.map((f) => <li key={f}>{f}</li>)}
          </ul>
          {a.fehlendText && <p className="text-sm mt-2 ml-6" style={{ color: C.muted }}>{a.fehlendText}</p>}
        </div>
      )}

      <div className="rounded p-5" style={{ background: C.card, border: "1px solid " + C.line }}>
        {schritt === 1 && (
          <div className="grid sm:grid-cols-2 gap-4">
            {optionen.length > 1 && (
              <div className="sm:col-span-2 p-3 rounded" style={{ background: "#F6F8FA", border: "1px solid " + C.line }}>
                <Select label="Kunde anlegen für" value={a.partnerId}
                  onChange={(v) => {
                    const m = optionen.find((o) => o.id === v);
                    setA({ ...a, partnerId: m.id, partnerName: m.name, team: m.team });
                  }}
                  options={optionen.map((o) => ({
                    value: o.id,
                    label: o.id === user.id ? o.name + " (für mich)" : o.name + " · " + o.rolle,
                  }))} />
                <p className="text-xs mt-2" style={{ color: C.muted }}>
                  Der Kunde wird diesem Vertriebspartner zugeordnet. Provision und Struktur richten sich danach.
                </p>
              </div>
            )}
            <Feld label="Firma / Kunde" value={a.kunde.firma} onChange={(v) => setK("firma", v)}
              placeholder="Musterbetrieb GmbH" fehler={geprueft && !a.kunde.firma} breit />
            <Feld label="Straße und Hausnummer" value={a.kunde.strasse} onChange={(v) => setK("strasse", v)} breit />
            <Feld label="PLZ" value={a.kunde.plz} onChange={(v) => setK("plz", v)} fehler={geprueft && !a.kunde.plz} />
            <Feld label="Ort" value={a.kunde.ort} onChange={(v) => setK("ort", v)} fehler={geprueft && !a.kunde.ort} />
            <Feld label="Ansprechpartner" value={a.kunde.ansprechpartner}
              onChange={(v) => setK("ansprechpartner", v)} fehler={geprueft && !a.kunde.ansprechpartner} />
            <Feld label="Telefon" value={a.kunde.telefon} onChange={(v) => setK("telefon", v)} />
            <Feld label="E-Mail" value={a.kunde.email} onChange={(v) => setK("email", v)} breit />
            <Feld label="Branche" value={a.kunde.branche || ""} onChange={(v) => setK("branche", v)}
              placeholder="z. B. Hotellerie, Metallverarbeitung, Pflege" breit />
          </div>
        )}

        {schritt === 2 && (
          <div className="space-y-6">
            {[
              { medium: "strom", titel: "Strom", stellen: stromStellen },
              { medium: "gas", titel: "Erdgas", stellen: gasStellen },
            ].map(({ medium, titel, stellen }) => (
              <div key={medium}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <MediumIcon medium={medium} size={16} />
                    <span className="text-sm">{titel}</span>
                    <span className="text-xs" style={{ color: C.muted }}>
                      {stellen.length} Lieferstelle{stellen.length === 1 ? "" : "n"}
                    </span>
                  </div>
                  <button
                    onClick={() => addL(medium)}
                    className="inline-flex items-center gap-1 text-sm"
                    style={{ color: medium === "strom" ? C.strom : C.gas }}
                  >
                    <Plus size={14} /> Lieferstelle hinzufügen
                  </button>
                </div>

                {stellen.length === 0 && (
                  <p className="text-sm mb-3 px-3 py-3 rounded"
                     style={{ color: C.muted, border: "1px dashed " + C.line }}>
                    Noch keine {titel}-Lieferstelle erfasst.
                  </p>
                )}

                <div className="space-y-4">
                  {stellen.map((l, i) => (
                    <div key={l.id} className="rounded overflow-hidden" style={{ border: "1px solid " + C.line }}>
                      <div className="flex items-center justify-between px-4 py-2"
                        style={{ background: "#F7F9F8", borderBottom: "1px solid " + C.line,
                                 borderLeft: "3px solid " + (medium === "strom" ? C.strom : C.gas) }}>
                        <span className="text-sm">{l.bezeichnung || titel + "-Lieferstelle " + (i + 1)}</span>
                        {a.lieferstellen.length > 1 && (
                          <button onClick={() => delL(l.id)} style={{ color: C.muted }}><Trash2 size={14} /></button>
                        )}
                      </div>
                      <div className="p-4 grid sm:grid-cols-2 gap-4">
                        <Feld label="Bezeichnung" value={l.bezeichnung}
                          onChange={(v) => setL(l.id, "bezeichnung", v)} placeholder="Haupthaus, Werk 1 …" />
                        <div />

                        <div className="sm:col-span-2 p-3 rounded"
                             style={{ background: "#F6F8FA", border: "1px solid " + C.line }}>
                          {a.lieferstellen.indexOf(l) === 0 ? (
                            <label className="flex items-center gap-3 text-sm">
                              <input type="checkbox" checked={l.adresseVon === "kunde"}
                                onChange={(e) => adresseSetzen(l.id, e.target.checked ? "kunde" : "manuell")}
                                style={{ accentColor: C.ink }} />
                              Lieferadresse entspricht der Kundenanschrift
                            </label>
                          ) : (
                            <Select label="Lieferadresse übernehmen von" value={l.adresseVon || "manuell"}
                              onChange={(v) => adresseSetzen(l.id, v)}
                              options={[
                                { value: "kunde", label: "Kundenanschrift" },
                                ...a.lieferstellen
                                  .filter((x) => x.id !== l.id && (x.strasse || x.plz || x.ort))
                                  .map((x, i) => ({
                                    value: x.id,
                                    label: (x.bezeichnung || "Lieferstelle " + (i + 1)) + ": " +
                                           [x.strasse, x.plz, x.ort].filter(Boolean).join(" "),
                                  })),
                                { value: "manuell", label: "Andere Adresse eingeben" },
                              ]} />
                          )}
                        </div>

                        <Feld label="Straße und Hausnummer" value={l.strasse}
                          onChange={(v) => setL(l.id, "strasse", v)} breit
                          gesperrt={(l.adresseVon || "manuell") !== "manuell"} />
                        <Feld label="PLZ" value={l.plz} onChange={(v) => setL(l.id, "plz", v)}
                          gesperrt={(l.adresseVon || "manuell") !== "manuell"} />
                        <Feld label="Ort" value={l.ort} onChange={(v) => setL(l.id, "ort", v)}
                          gesperrt={(l.adresseVon || "manuell") !== "manuell"} />

                        <div className="sm:col-span-2 p-3 rounded"
                             style={{ background: l.neueinzug ? "#FDF6EE" : "#F6F8FA",
                                      border: "1px solid " + (l.neueinzug ? C.gas : C.line) }}>
                          <label className="flex items-center gap-3 text-sm">
                            <input type="checkbox" checked={!!l.neueinzug}
                              onChange={(e) => setL(l.id, "neueinzug", e.target.checked)}
                              style={{ accentColor: C.gas }} />
                            Neueinzug, es gibt keinen Vorversorger
                          </label>
                          {l.neueinzug && (
                            <div className="grid sm:grid-cols-2 gap-4 mt-3">
                              <Datei label="Gewerbeanmeldung – erforderlich" datei={l.gewerbeanmeldung}
                                onSet={(f) => setL(l.id, "gewerbeanmeldung", f)} hinweis="Datei auswählen" />
                              <Datei label="Pachtvertrag – erforderlich" datei={l.pachtvertrag}
                                onSet={(f) => setL(l.id, "pachtvertrag", f)} hinweis="Datei auswählen" />
                            </div>
                          )}
                        </div>

                        <Feld label="Aktueller Versorger" value={l.neueinzug ? "" : l.versorger}
                          onChange={(v) => setL(l.id, "versorger", v)}
                          gesperrt={!!l.neueinzug}
                          placeholder={l.neueinzug ? "entfällt bei Neueinzug" : ""}
                          fehler={geprueft && !l.neueinzug && !l.versorger} />
                        <div />
                        <Feld label="Zählernummer" value={l.zaehlernummer}
                          onChange={(v) => setL(l.id, "zaehlernummer", v)} fehler={geprueft && !l.zaehlernummer} />
                        <Feld label="Marktlokations-ID (MaLo)" value={l.maloId}
                          onChange={(v) => setL(l.id, "maloId", v)} placeholder="11-stellig"
                          fehler={geprueft && !l.maloId} />
                        <Feld label="Jahresverbrauch in kWh" value={l.verbrauch}
                          onChange={(v) => setL(l.id, "verbrauch", v.replace(/[^\d]/g, ""))}
                          fehler={geprueft && !l.verbrauch} />
                        <Select label="Zählerart" value={l.zaehlerart}
                          onChange={(v) => setL(l.id, "zaehlerart", v)} options={["SLP", "RLM"]} />
                        <Datei label="Versorgerabrechnung (PDF)" datei={l.abrechnung}
                          onSet={(f) => setL(l.id, "abrechnung", f)} hinweis="PDF hochladen" />
                        <div className="sm:col-span-2 p-3 rounded"
                             style={{ background: "#F6F8FA", border: "1px solid " + C.line }}>
                          <label className="flex items-center gap-3 text-sm">
                            <input type="checkbox" checked={!!l.zaehlerfotoVorhanden}
                              onChange={(e) => setL(l.id, "zaehlerfotoVorhanden", e.target.checked)}
                              style={{ accentColor: C.ink }} />
                            Zählerfoto vorhanden
                          </label>
                          {l.zaehlerfotoVorhanden && (
                            <div className="mt-3">
                              <Datei label="Foto des Zählers" datei={l.zaehlerfoto} bild
                                onSet={(f) => setL(l.id, "zaehlerfoto", f)} hinweis="Bild auswählen" />
                            </div>
                          )}
                        </div>
                        {l.zaehlerart === "RLM" && (
                          <div className="sm:col-span-2 p-3 rounded"
                               style={{ background: "#F7F9F8", border: "1px solid " + C.line }}>
                            <Datei
                              label="Lastgang / Lastprofil (Excel oder CSV) – bei RLM erforderlich"
                              datei={l.lastgang}
                              onSet={(f) => setL(l.id, "lastgang", f)}
                              hinweis="XLSX oder CSV hochladen"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {schritt === 3 && (
          <div className="space-y-6">
            <div className="grid sm:grid-cols-2 gap-4">
              {stromStellen.length > 0 && (
                <Select label="Gewünschtes Produkt Strom" value={a.produkt}
                  onChange={(v) => setA({ ...a, produkt: v })} options={PRODUKTWUNSCH} />
              )}
              {gasStellen.length > 0 && (
                <Select label="Gewünschtes Produkt Erdgas" value={a.produktGas}
                  onChange={(v) => setA({ ...a, produktGas: v })} options={PRODUKTWUNSCH} />
              )}
            </div>

            {(a.produkt === EMPFEHLUNG || (gasStellen.length > 0 && a.produktGas === EMPFEHLUNG)) && (
              <div className="p-4 rounded" style={{ background: "#F6F8FA", border: "1px solid " + C.line }}>
                <label className="block">
                  <span className="block text-xs mb-1" style={{ color: C.muted }}>
                    Worum geht es dem Kunden? Hilft der Kalkulation bei der Empfehlung
                  </span>
                  <textarea rows={3} value={a.beratungHinweis || ""}
                    onChange={(e) => setA({ ...a, beratungHinweis: e.target.value })}
                    placeholder="z. B. Kunde will Planungssicherheit, ist aber offen für Spot bei deutlichem Preisvorteil"
                    className="w-full px-3 py-2 text-sm rounded outline-none"
                    style={{ border: "1px solid " + C.line }} />
                </label>
                <p className="text-xs mt-2" style={{ color: C.muted }}>
                  Die Kalkulation stimmt sich bei Bedarf mit der Geschäftsführung ab und schlägt
                  passende Varianten vor.
                </p>
              </div>
            )}

            <div>
              <span className="block text-xs mb-2" style={{ color: C.muted }}>Vertragsdauer</span>
              <div className="flex gap-1 mb-4">
                {[["monate", "Laufzeit in Monaten"], ["ende", "festes Lieferende"]].map(([id, label]) => (
                  <button key={id} onClick={() => setA({ ...a, laufzeitArt: id })}
                    className="px-3 py-1.5 text-sm rounded"
                    style={{
                      background: a.laufzeitArt === id ? C.ink : "transparent",
                      color: a.laufzeitArt === id ? "#fff" : C.muted,
                      border: "1px solid " + (a.laufzeitArt === id ? C.ink : C.line),
                    }}>
                    {label}
                  </button>
                ))}
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <Feld label="Gewünschter Lieferbeginn" type="date" value={a.wunschLieferbeginn || ""}
                  min={fruehesterBeginn()}
                  fehler={!!a.wunschLieferbeginn && a.wunschLieferbeginn < fruehesterBeginn()}
                  onChange={(v) => setA({ ...a, wunschLieferbeginn: v })} />
                {a.laufzeitArt === "ende" ? (
                  <Feld label="Gewünschtes Lieferende" type="date" value={a.wunschLieferende || ""}
                    onChange={(v) => setA({ ...a, wunschLieferende: v })} />
                ) : (
                  <Select label="Gewünschte Vertragslaufzeit" value={String(a.laufzeit)}
                    onChange={(v) => setA({ ...a, laufzeit: parseInt(v) })}
                    options={LAUFZEITEN.map((l) => ({ value: String(l), label: l + " Monate" }))} />
                )}
              </div>
              <p className="text-xs mt-2"
                 style={{ color: a.wunschLieferbeginn && a.wunschLieferbeginn < fruehesterBeginn() ? C.warn : C.muted }}>
                Frühestmöglicher Lieferbeginn ist der {datum(fruehesterBeginn())}, es sind 14 Tage Vorlauf nötig.{" "}
                {a.laufzeitArt === "ende"
                  ? "Für Verträge, die unabhängig vom Beginn zu einem festen Datum enden, üblicherweise zum 31.12."
                  : "Der Lieferbeginn kann unterjährig liegen, die Laufzeit zählt ab diesem Tag."}
                {a.laufzeitArt === "ende" && a.wunschLieferbeginn && a.wunschLieferende
                  ? " Ergibt " + num(monateZwischen(a.wunschLieferbeginn, a.wunschLieferende) || 0) + " Monate."
                  : ""}
              </p>
            </div>

            <div>
              <div className="flex items-end justify-between mb-3">
                <span className="text-xs" style={{ color: C.muted }}>Gewünschter Aufschlag</span>
                <span className="text-3xl" style={{ fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}>
                  {num(a.aufschlag, 3)}
                  <span className="text-sm ml-1" style={{ color: C.muted }}>ct/kWh</span>
                </span>
              </div>
              <input
                type="range" min="0" max="3" step="0.025" value={a.aufschlag}
                onChange={(e) => setA({ ...a, aufschlag: parseFloat(e.target.value) })}
                className="w-full" style={{ accentColor: C.ink }}
              />
              <div className="flex justify-between text-xs mt-1" style={{ color: C.muted }}>
                <span>0,000</span><span>1,500</span><span>3,000</span>
              </div>

              <div className="mt-4 p-4 rounded flex flex-wrap gap-8"
                   style={{ background: "#F6F8FA", border: "1px solid " + C.line }}>
                <div>
                  <div className="text-xs mb-1" style={{ color: C.muted }}>Gesamtmenge</div>
                  <div className="text-lg" style={{ fontVariantNumeric: "tabular-nums" }}>
                    {num(verbrauchGesamt(a))} kWh
                  </div>
                </div>
                <div>
                  <div className="text-xs mb-1" style={{ color: C.muted }}>
                    Deine Provision je Lieferjahr ({num(user.satz || 0, 0)} %)
                  </div>
                  <div className="text-lg" style={{ fontVariantNumeric: "tabular-nums", color: C.ok }}>
                    {eur((verbrauchGesamt(a) * a.aufschlag * (user.satz || 0)) / 10000)}
                  </div>
                </div>
              </div>
              <p className="text-xs mt-2" style={{ color: C.muted }}>
                Vorschau auf Basis deines Provisionssatzes. Verbindlich ist der von der Kalkulation bestätigte Aufschlag.
              </p>
            </div>
          </div>
        )}

        {schritt === 4 && (
          <div>
            <div className="grid sm:grid-cols-2 gap-x-8 gap-y-3 text-sm mb-5">
              <div><span style={{ color: C.muted }}>Kunde</span><div>{a.kunde.firma || "–"}</div></div>
              <div><span style={{ color: C.muted }}>Anschrift</span>
                <div>{a.kunde.strasse}, {a.kunde.plz} {a.kunde.ort}</div></div>
              <div><span style={{ color: C.muted }}>Produktwunsch</span>
                <div>
                  {stromStellen.length > 0 ? "Strom: " + a.produkt : ""}
                  {stromStellen.length > 0 && gasStellen.length > 0 ? " · " : ""}
                  {gasStellen.length > 0 ? "Erdgas: " + a.produktGas : ""}
                </div></div>
              <div><span style={{ color: C.muted }}>Vertragsdauer</span>
                <div>{a.laufzeitArt === "ende"
                  ? "bis " + (a.wunschLieferende ? datum(a.wunschLieferende) : "offen")
                  : a.laufzeit + " Monate"}</div></div>
              <div><span style={{ color: C.muted }}>Wunsch-Lieferbeginn</span>
                <div>{a.wunschLieferbeginn ? datum(a.wunschLieferbeginn) : "offen"}</div></div>
              <div><span style={{ color: C.muted }}>Aufschlag</span>
                <div>{num(a.aufschlag, 3)} ct/kWh</div></div>
              <div><span style={{ color: C.muted }}>Zugeordnet an</span>
                <div>{a.partnerName}</div></div>
            </div>

            <div className="rounded overflow-hidden mb-5" style={{ border: "1px solid " + C.line }}>
              {a.lieferstellen.map((l) => (
                <div key={l.id} className="flex items-center gap-3 px-4 py-3 text-sm"
                     style={{ borderBottom: "1px solid " + C.line,
                              borderLeft: "3px solid " + (l.medium === "strom" ? C.strom : C.gas) }}>
                  <MediumIcon medium={l.medium} />
                  <span className="flex-1">{l.bezeichnung || "Ohne Bezeichnung"} · {l.zaehlerart}</span>
                  <span style={{ fontVariantNumeric: "tabular-nums" }}>{num(parseFloat(l.verbrauch) || 0)} kWh</span>
                </div>
              ))}
            </div>

            <label className="block mb-5">
              <span className="block text-xs mb-1" style={{ color: C.muted }}>
                Bemerkung an das Team Kalkulation
              </span>
              <textarea rows={3} value={a.bemerkungVertrieb || ""}
                onChange={(e) => setA({ ...a, bemerkungVertrieb: e.target.value })}
                placeholder="Weitere Informationen zum Kunden, zur Menge oder zum gewünschten Vorgehen"
                className="w-full px-3 py-2 text-sm rounded outline-none"
                style={{ border: "1px solid " + C.line }} />
            </label>

            {sperren.length > 0 && (
              <div className="p-4 rounded mb-5" style={{ background: "#FCF3F0", border: "1px solid " + C.warn }}>
                <div className="flex items-center gap-2 mb-2" style={{ color: C.warn }}>
                  <AlertTriangle size={15} />
                  <span className="text-sm">Senden ist erst möglich, wenn das erledigt ist</span>
                </div>
                <ul className="text-sm ml-6 list-disc">{sperren.map((f) => <li key={f}>{f}</li>)}</ul>
              </div>
            )}

            {luecken.length > 0 ? (
              <div className="p-4 rounded mb-5" style={{ background: "#FCF3F0", border: "1px solid " + C.warn }}>
                <div className="flex items-center gap-2 mb-2" style={{ color: C.warn }}>
                  <AlertTriangle size={15} />
                  <span className="text-sm">Diese Angaben fehlen noch</span>
                </div>
                <ul className="text-sm ml-6 list-disc">{luecken.map((f) => <li key={f}>{f}</li>)}</ul>
                <p className="text-xs mt-2 ml-6" style={{ color: C.muted }}>
                  Du kannst trotzdem einreichen. Die Kalkulation sendet unvollständige Anfragen zurück.
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-4 rounded mb-5 text-sm"
                   style={{ background: "#F1F7F4", border: "1px solid " + C.ok, color: C.ok }}>
                <Check size={15} /> Alle Pflichtangaben liegen vor.
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-2 mt-6 pt-5" style={{ borderTop: "1px solid " + C.line }}>
          {schritt < 4 && <Btn onClick={() => setSchritt(schritt + 1)} icon={ChevronRight}>Weiter</Btn>}
          {schritt === 4 && (
            <Btn icon={Send} disabled={sperren.length > 0}
              onClick={() => { setGeprueft(true); onSenden(a); }}>
              Anfrage an Kalkulation senden
            </Btn>
          )}
          <Btn variante="hell" onClick={() => onSpeichern(a)}>Als Entwurf speichern</Btn>
          <Btn variante="hell" onClick={onAbbrechen}>Abbrechen</Btn>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Anfrage-Detail                                                     */
/* ------------------------------------------------------------------ */
function Detail({ a, user, mitarbeiter, versorger, onZurueck, onUpdate, onBearbeiten }) {
  const [vars, setVars] = useState(
    a.kalkulation && a.kalkulation.varianten && a.kalkulation.varianten.length
      ? a.kalkulation.varianten
      : [leereVariante(a)]
  );
  const [vollmacht, setVollmacht] = useState(a.kalkulation ? a.kalkulation.vollmacht : null);
  const [fehlend, setFehlend] = useState([]);
  const [fehlendText, setFehlendText] = useState("");
  const [modus, setModus] = useState(null);

  const istKalk = user.rolle === "Kalkulation";
  const istPartner = user.id === a.partnerId;
  const istVM = user.rolle === "Vertragsmanagement";

  const setVar = (id, k, v) => setVars(vars.map((x) => (x.id === id ? { ...x, [k]: v } : x)));
  const setVarPreis = (id, lid, art, v) =>
    setVars(vars.map((x) => x.id === id
      ? { ...x, preise: { ...x.preise, [lid]: { ...(x.preise[lid] || {}), [art]: v } } } : x));
  const varLoeschen = (id) => setVars(vars.filter((x) => x.id !== id));

  const bereit = vars.length > 0 && vars.every((v) => v.angebot);

  const angebotSenden = () => {
    onUpdate({
      ...a,
      status: "angebot",
      fehlend: [],
      fehlendText: "",
      kalkulation: {
        bearbeiter: user.name,
        datum: heute(),
        vollmacht,
        gewaehlt: null,
        varianten: vars.map((v) => ({
          ...v,
          sparte: v.sparte || "beide",
          laufzeitArt: v.laufzeitArt || "monate",
          aufschlag: parseFloat(String(v.aufschlag).replace(",", ".")) || 0,
          laufzeit: parseInt(v.laufzeit) || a.laufzeit,
        })),
      },
      verlauf: [...a.verlauf, {
        d: heute(),
        t: vars.length > 1
          ? vars.length + " Angebotsvarianten kalkuliert und zurückgesendet"
          : "Angebot kalkuliert und zurückgesendet",
        w: user.name,
      }],
    });
    onZurueck();
  };

  const zurueckAnVertrieb = () => {
    onUpdate({
      ...a,
      status: "klaerfall",
      fehlend,
      fehlendText,
      verlauf: [...a.verlauf, { d: heute(), t: "Zurück an Vertrieb: Unterlagen unvollständig", w: user.name }],
    });
    onZurueck();
  };

  const [frage, setFrage] = useState("");
  const [antwort, setAntwort] = useState("");
  const istGF = user.rolle === "Geschäftsführung";
  const intern = ["Kalkulation", "Geschäftsführung", "Leitung Vertrieb"].includes(user.rolle);

  const rueckspracheStellen = () => {
    onUpdate({
      ...a,
      status: "ruecksprache",
      ruecksprache: { frage, von: user.name, datum: heute(), antwort: "", antwortVon: "", antwortDatum: "" },
      verlauf: [...a.verlauf, { d: heute(), t: "Rücksprache mit der Geschäftsführung angefragt", w: user.name }],
    });
    onZurueck();
  };

  const rueckspracheBeantworten = () => {
    onUpdate({
      ...a,
      status: "eingereicht",
      ruecksprache: { ...a.ruecksprache, antwort, antwortVon: user.name, antwortDatum: heute() },
      verlauf: [...a.verlauf, { d: heute(), t: "Geschäftsführung hat geantwortet, zurück an Kalkulation", w: user.name }],
    });
    onZurueck();
  };

  /* Zielpreis bei Spotmarkt */
  const [zielpreis, setZielpreis] = useState(a.zielpreis || "");
  const [zielNotiz, setZielNotiz] = useState(a.zielpreisNotiz || "");
  const istSpot =
    a.produkt === "Spotmarkt" || a.produktGas === "Spotmarkt" ||
    varianten(a).some((v) => v.produkt === "Spotmarkt");
  const darfZielpreis = istPartner || ["Kalkulation", "Geschäftsführung"].includes(user.rolle);

  /* Verlauf als PDF */
  const darfProtokoll = ["Kalkulation", "Vertragsmanagement", "Geschäftsführung"].includes(user.rolle);
  const protokollLaden = () => {
    const z = [];
    z.push({ text: a.kunde.firma || "Vorgang", gross: true });
    z.push(a.id + "  ·  angelegt " + datum(a.angelegt) + "  ·  " + STATUS[a.status].label);
    z.push("Vertriebspartner: " + a.partnerName + " (Team " + a.team + ")");
    if (a.kunde.branche) z.push("Branche: " + a.kunde.branche);
    z.push("Anschrift: " + [a.kunde.strasse, a.kunde.plz + " " + a.kunde.ort].filter(Boolean).join(", "));
    z.push("Ansprechpartner: " + [a.kunde.ansprechpartner, a.kunde.telefon, a.kunde.email].filter(Boolean).join("  ·  "));
    z.push("Gesamtmenge: " + num(verbrauchGesamt(a)) + " kWh");
    if (a.zielpreis) z.push("Zielpreis Spotmarkt: " + a.zielpreis + " ct/kWh"
      + (a.zielpreisNotiz ? "  ·  " + a.zielpreisNotiz : ""));
    if (a.bestaetigung) {
      z.push({ text: "Versorgerbestätigung", gross: true });
      z.push("Versorger: " + a.bestaetigung.versorger);
      z.push("Bestätigte Menge: " + num(bestaetigteMenge(a)) + " kWh");
      z.push("Gesamtaufschlag: " + num(a.bestaetigung.aufschlag, 3) + " ct/kWh");
      if (parseFloat(a.bestaetigung.bonus) > 0)
        z.push("Bonus: " + eur(parseFloat(a.bestaetigung.bonus)) + " ("
          + (a.bestaetigung.bonusArt === "jaehrlich" ? "pro Lieferjahr" : "einmalig") + ")");
    }

    z.push({ text: "Verlauf", gross: true });
    if (!a.verlauf.length) z.push("keine Einträge");
    a.verlauf.forEach((v) => z.push(datum(v.d) + "   " + v.t + "   (" + v.w + ")"));

    z.push({ text: "Nachrichten", gross: true });
    if (!(a.nachrichten || []).length) z.push("keine Nachrichten");
    (a.nachrichten || []).forEach((n) => {
      z.push(datum(n.datum) + ", " + n.zeit + " Uhr   " + n.von + " (" + n.rolle + ")");
      z.push("     " + n.text);
    });

    z.push({ text: " ", gross: false });
    z.push("Erstellt am " + datum(heute()) + " um " + jetzt() + " Uhr von " + user.name + ", EGC-Energie Vertriebsportal");

    const pdf = erzeugePdf("verlauf_" + a.id + ".pdf",
      "Vorgangsprotokoll " + a.id, z);
    if (pdf) dateiLaden(pdf);
  };

  /* Nachrichtenverlauf am Vorgang */
  const [nachricht, setNachricht] = useState("");
  const nachrichtSenden = () => {
    if (!nachricht.trim()) return;
    onUpdate({
      ...a,
      nachrichten: [...(a.nachrichten || []), {
        id: uid(), text: nachricht.trim(), von: user.name, rolle: user.rolle,
        datum: heute(), zeit: jetzt(),
      }],
    });
    setNachricht("");
  };

  /* Aufgabe 10: Versorgerbestätigung, Klärfall und Ablehnung */
  const [vModus, setVModus] = useState(null);
  const [best, setBest] = useState(
    a.bestaetigung || {
      versorger: "", stellen: {}, aufschlag: (aktiveVariante(a) || {}).aufschlag || a.aufschlag,
      bonus: "", bonusArt: "einmalig",
    }
  );
  const [vKlaer, setVKlaer] = useState({ text: "", dateien: [] });
  const [vAbl, setVAbl] = useState({ text: "", dokument: null, alternativ: false, alternativAngebot: null });

  const setBestStelle = (id, k, v) =>
    setBest({ ...best, stellen: { ...best.stellen, [id]: { ...(best.stellen[id] || {}), [k]: v } } });

  const auftragBestaetigen = () => {
    onUpdate({
      ...a,
      status: "bestaetigt",
      einreichung: false,
      vertragsStatus: "Provision offen",
      bestaetigung: { ...best, von: user.name, datum: heute() },
      verlauf: [...a.verlauf, {
        d: heute(), t: "Auftrag beim Versorger bestätigt: " + (best.versorger || "Versorger"), w: user.name,
      }],
    });
    onZurueck();
  };

  const versorgerKlaerfall = () => {
    onUpdate({
      ...a,
      status: "klaerfall",
      einreichung: false,
      fehlend: ["Klärung durch den Versorger nötig"],
      fehlendText: vKlaer.text,
      klaerung: { stufe: "versorger", art: "klaerfall", text: vKlaer.text, dateien: vKlaer.dateien,
                  von: user.name, datum: heute() },
      verlauf: [...a.verlauf, { d: heute(), t: "Klärfall beim Versorger, zurück an den Vertrieb", w: user.name }],
    });
    onZurueck();
  };

  const versorgerAblehnung = () => {
    onUpdate({
      ...a,
      status: "klaerfall",
      einreichung: false,
      fehlend: [vAbl.alternativ ? "Vom Versorger abgelehnt, Alternativangebot liegt vor" : "Vom Versorger abgelehnt"],
      fehlendText: vAbl.text,
      klaerung: {
        stufe: "versorger", art: "ablehnung", text: vAbl.text,
        dateien: [vAbl.dokument, vAbl.alternativ ? vAbl.alternativAngebot : null].filter(Boolean),
        alternativ: vAbl.alternativ, von: user.name, datum: heute(),
      },
      verlauf: [...a.verlauf, {
        d: heute(),
        t: vAbl.alternativ ? "Vom Versorger abgelehnt, Alternativangebot bereitgestellt" : "Vom Versorger abgelehnt",
        w: user.name,
      }],
    });
    onZurueck();
  };

  /* Aufgabe 8: Klärfall vom Vertriebspartner beantworten */
  const [klaerText, setKlaerText] = useState("");
  const [klaerDateien, setKlaerDateien] = useState([]);

  const klaerfallZurueck = () => {
    const zurueckNach = a.klaerung && a.klaerung.stufe === "versorger" ? "uebermittelt" : "eingereicht";
    onUpdate({
      ...a,
      status: zurueckNach,
      fehlend: [],
      fehlendText: "",
      klaerung: null,
      nachreichung: {
        text: klaerText,
        dateien: klaerDateien,
        von: user.name,
        datum: heute(),
        vorher: a.fehlend || [],
      },
      verlauf: [...a.verlauf, {
        d: heute(),
        t: "Unterlagen ergänzt und erneut an die Kalkulation gesendet",
        w: user.name,
      }],
    });
    onZurueck();
  };

  /* Aufgabe 9: Angebot annehmen mit Unterlagen */
  const [annahme, setAnnahme] = useState({
    variante: null, angebotUnterschrieben: null, vollmacht: null,
    kundeInformiert: false, wieBeschrieben: false, abweichung: "", weitere: [],
  });

  const abschlussSenden = () => {
    onUpdate({
      ...a,
      status: "uebermittelt",
      kalkulation: { ...a.kalkulation, gewaehlt: annahmeGewaehlt(annahme.variante) },
      annahme: { ...annahme, von: user.name, datum: heute() },
      verlauf: [...a.verlauf, {
        d: heute(),
        t: "Abschluss an die Kalkulation gesendet, Auftrag an Versorger übermittelt",
        w: user.name,
      }],
    });
    onZurueck();
  };

  const annahmeGewaehlt = (v) => {
    if (!v) return a.kalkulation ? a.kalkulation.gewaehlt : null;
    const bisher = gewaehlte(a).map((x) => x.id);
    const behalten = varianten(a)
      .filter((x) => bisher.includes(x.id) && (x.sparte || "beide") !== (v.sparte || "beide"))
      .map((x) => x.id);
    return [...behalten, v.id];
  };

  const annehmen = (v) => setAnnahme({ ...annahme, variante: v });

  const Zeile = ({ k, v }) => (
    <div className="flex justify-between gap-4 py-1.5 text-sm" style={{ borderBottom: "1px solid " + C.line }}>
      <span style={{ color: C.muted }}>{k}</span>
      <span className="text-right" style={{ fontVariantNumeric: "tabular-nums" }}>{v || "–"}</span>
    </div>
  );

  return (
    <div>
      <div className="flex items-center gap-3 mb-1">
        <button onClick={onZurueck} style={{ color: C.muted }}><ArrowLeft size={18} /></button>
        <h2 className="text-lg" style={{ letterSpacing: "-0.01em" }}>{a.kunde.firma}</h2>
        <StatusPunkt status={a.status} />
      </div>
      <p className="text-sm mb-5 ml-8" style={{ color: C.muted }}>
        {a.id} · angelegt {datum(a.angelegt)} · {a.partnerName} (Team {a.team})
      </p>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          {/* Nachrichten zum Vorgang */}
          <div className="rounded" style={{ background: C.card, border: "1px solid " + C.line }}>
            <div className="flex items-baseline justify-between px-4 py-3"
                 style={{ borderBottom: "1px solid " + C.line }}>
              <span className="text-sm">Nachrichten zum Vorgang</span>
              <span className="text-xs" style={{ color: C.muted }}>
                {(a.nachrichten || []).length} Einträge · bleiben dauerhaft erhalten
              </span>
            </div>

            <div className="px-4 py-3 space-y-3" style={{ maxHeight: 380, overflowY: "auto" }}>
              {(a.nachrichten || []).length === 0 && (
                <p className="text-sm py-4 text-center" style={{ color: C.muted }}>
                  Noch keine Nachrichten. Schreib die erste, alle Beteiligten am Vorgang lesen mit.
                </p>
              )}
              {(a.nachrichten || []).map((n) => {
                const eigen = n.von === user.name;
                const farbe = ROLLENFARBE[n.rolle] || C.muted;
                return (
                  <div key={n.id} className="rounded p-3"
                       style={{ background: eigen ? "#F1F5FA" : "#F6F8FA",
                                borderLeft: "3px solid " + farbe }}>
                    <div className="flex flex-wrap items-baseline gap-x-2 mb-1">
                      <span className="text-sm">{n.von}</span>
                      <span className="text-xs" style={{ color: farbe }}>{n.rolle}</span>
                      <span className="flex-1" />
                      <span className="text-xs" style={{ color: C.muted, fontVariantNumeric: "tabular-nums" }}>
                        {datum(n.datum)}, {n.zeit} Uhr
                      </span>
                    </div>
                    <p className="text-sm" style={{ whiteSpace: "pre-wrap" }}>{n.text}</p>
                  </div>
                );
              })}
            </div>

            <div className="px-4 py-3" style={{ borderTop: "1px solid " + C.line }}>
              <textarea rows={2} value={nachricht} onChange={(e) => setNachricht(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) nachrichtSenden();
                }}
                placeholder={"Nachricht als " + user.rolle + " schreiben"}
                className="w-full px-3 py-2 text-sm rounded outline-none"
                style={{ border: "1px solid " + C.line }} />
              <div className="flex items-center gap-3 mt-2">
                <Btn icon={Send} onClick={nachrichtSenden} disabled={!nachricht.trim()}>Senden</Btn>
                <span className="text-xs" style={{ color: C.muted }}>
                  Wird mit deinem Namen, deiner Rolle und dem Zeitpunkt gespeichert.
                </span>
              </div>
            </div>
          </div>
          {/* Zielpreis bei Spotmarkt */}
          {istSpot && (
            <div className="rounded p-4"
                 style={{ background: C.card, border: "1px solid " + (a.zielpreis ? C.gruen : C.line) }}>
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-sm">Zielpreis Spotmarkt</span>
                {a.zielpreis && (
                  <span className="text-lg" style={{ fontVariantNumeric: "tabular-nums" }}>
                    {a.zielpreis} ct/kWh
                  </span>
                )}
              </div>
              <p className="text-xs mb-3" style={{ color: C.muted, maxWidth: "60ch" }}>
                Preis, zu dem für den Kunden fixiert werden soll. Wird in der Kundeninfo angezeigt.
              </p>

              {darfZielpreis ? (
                <>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Feld label="Zielpreis in ct/kWh" value={zielpreis} onChange={setZielpreis}
                      placeholder="z. B. 9,80" />
                    <Feld label="Notiz" value={zielNotiz} onChange={setZielNotiz}
                      placeholder="Tranche, Zeitfenster, Absprache mit dem Kunden" />
                  </div>
                  <div className="mt-3">
                    <Btn variante="hell" icon={Check}
                      onClick={() => onUpdate({ ...a, zielpreis, zielpreisNotiz: zielNotiz })}>
                      Zielpreis speichern
                    </Btn>
                  </div>
                </>
              ) : a.zielpreis ? (
                a.zielpreisNotiz && <p className="text-sm">{a.zielpreisNotiz}</p>
              ) : (
                <p className="text-sm" style={{ color: C.muted }}>Noch kein Zielpreis hinterlegt.</p>
              )}
            </div>
          )}

          {/* Lieferstellen */}
          <div className="rounded" style={{ background: C.card, border: "1px solid " + C.line }}>
            <div className="px-4 py-3 text-sm" style={{ borderBottom: "1px solid " + C.line }}>
              Lieferstellen ({a.lieferstellen.length})
            </div>
            {a.lieferstellen.map((l) => (
              <div key={l.id} className="p-4" style={{ borderBottom: "1px solid " + C.line,
                   borderLeft: "3px solid " + (l.medium === "strom" ? C.strom : C.gas) }}>
                <div className="flex items-center gap-2 mb-3">
                  <MediumIcon medium={l.medium} />
                  <span className="text-sm">{l.bezeichnung || "Lieferstelle"}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded"
                        style={{ border: "1px solid " + C.line, color: C.muted }}>{l.zaehlerart}</span>
                  <span className="text-xs" style={{ color: C.muted }}>{l.plz} {l.ort}</span>
                </div>
                <div className="grid sm:grid-cols-2 gap-x-8">
                  <Zeile k="Versorger" v={l.versorger} />
                  <Zeile k="Jahresverbrauch" v={num(parseFloat(l.verbrauch) || 0) + " kWh"} />
                  <Zeile k="Zählernummer" v={l.zaehlernummer} />
                  <Zeile k="Marktlokations-ID" v={l.maloId} />
                </div>
                <div className="space-y-2 mt-3">
                  {l.abrechnung
                    ? <DateiChip datei={l.abrechnung} label="Versorgerabrechnung" />
                    : !l.neueinzug && (
                      <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: C.warn }}>
                        <X size={13} /> keine Versorgerabrechnung
                      </span>
                    )}
                  {l.zaehlerart === "RLM" && (l.lastgang
                    ? <DateiChip datei={l.lastgang} label="Lastgang" />
                    : <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: C.warn }}>
                        <X size={13} /> kein Lastgang
                      </span>)}
                  {l.zaehlerfoto && <DateiChip datei={l.zaehlerfoto} label="Zählerfoto" />}
                  {l.neueinzug && (
                    <>
                      <div className="text-xs" style={{ color: C.gas }}>Neueinzug, kein Vorversorger</div>
                      {l.gewerbeanmeldung && <DateiChip datei={l.gewerbeanmeldung} label="Gewerbeanmeldung" />}
                      {l.pachtvertrag && <DateiChip datei={l.pachtvertrag} label="Pachtvertrag" />}
                    </>
                  )}
                </div>
                <div className="flex flex-wrap gap-4 mt-3 text-xs">
                  {l.energiepreis && (
                    <span style={{ color: C.text, fontVariantNumeric: "tabular-nums" }}>
                      Energiepreis {l.energiepreis} ct/kWh
                    </span>
                  )}
                  {l.preis && (
                    <span style={{ color: C.text, fontVariantNumeric: "tabular-nums" }}>
                      Arbeitspreis {l.preis} ct/kWh
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Kalkulationsbereich */}
          {istKalk && a.status !== "abgeschlossen" && (
            <div className="rounded p-5" style={{ background: C.card, border: "1px solid " + C.line }}>
              <div className="flex flex-wrap gap-2 mb-5">
                <Btn variante={modus === "kalk" ? "primär" : "hell"} onClick={() => setModus("kalk")} icon={Calculator}>
                  Angebot kalkulieren
                </Btn>
                <Btn variante={modus === "rueck" ? "gefahr" : "hell"} onClick={() => setModus("rueck")} icon={RotateCcw}>
                  Unterlagen nachfordern
                </Btn>
                <Btn variante={modus === "gf" ? "primär" : "hell"} onClick={() => setModus("gf")} icon={Users}>
                  Rücksprache Geschäftsführung
                </Btn>
              </div>

              {modus === "kalk" && (
                <div className="space-y-5">
                  <p className="text-sm" style={{ color: C.muted, maxWidth: "60ch" }}>
                    Du kannst mehrere Varianten zurückgeben, etwa Festpreis und Spotmarkt nebeneinander.
                    Der Vertriebspartner wählt daraus aus. Preisangaben sind optional, das Angebots-PDF
                    ist je Variante erforderlich.
                  </p>

                  {vars.map((v, i) => (
                    <div key={v.id} className="rounded overflow-hidden" style={{ border: "1px solid " + C.line }}>
                      <div className="flex items-center justify-between px-4 py-2"
                           style={{ background: "#F6F8FA", borderBottom: "1px solid " + C.line }}>
                        <span className="text-sm">
                          Variante {i + 1}: {v.produkt} · {laufzeitMonate(v) || v.laufzeit} Monate
                          {v.sparte && v.sparte !== "beide" ? " · " + (v.sparte === "gas" ? "Erdgas" : "Strom") : ""}
                        </span>
                        {vars.length > 1 && (
                          <button onClick={() => varLoeschen(v.id)} style={{ color: C.muted }}>
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                      <div className="p-4 space-y-4">
                        <div className="grid sm:grid-cols-2 gap-4">
                          <Select label="Gilt für" value={v.sparte || "beide"}
                            onChange={(x) => setVar(v.id, "sparte", x)} options={SPARTEN} />
                          <Select label="Produkt" value={v.produkt}
                            onChange={(x) => setVar(v.id, "produkt", x)} options={PRODUKTE} />
                          <Feld label="Bestätigter Aufschlag (ct/kWh)" value={v.aufschlag}
                            onChange={(x) => setVar(v.id, "aufschlag", x)}
                            placeholder={"Wunsch: " + num(a.aufschlag, 3)} />
                          <Feld label="Lieferbeginn" type="date" value={v.lieferbeginn || ""}
                            onChange={(x) => setVar(v.id, "lieferbeginn", x)} />
                          <Select label="Vertragsdauer festlegen über" value={v.laufzeitArt || "monate"}
                            onChange={(x) => setVar(v.id, "laufzeitArt", x)}
                            options={[{ value: "monate", label: "Laufzeit in Monaten" },
                                      { value: "ende", label: "festes Lieferende" }]} />
                          {(v.laufzeitArt || "monate") === "ende" ? (
                            <Feld label="Lieferende" type="date" value={v.lieferende || ""}
                              onChange={(x) => setVar(v.id, "lieferende", x)} />
                          ) : (
                            <Select label="Vertragslaufzeit" value={String(v.laufzeit)}
                              onChange={(x) => setVar(v.id, "laufzeit", parseInt(x))}
                              options={LAUFZEITEN.map((l) => ({ value: String(l), label: l + " Monate" }))} />
                          )}
                          <Feld label="Angebot gültig bis" type="date" value={v.gueltigBis || ""}
                            onChange={(x) => setVar(v.id, "gueltigBis", x)} breit />
                        </div>
                        {(v.laufzeitArt || "monate") === "ende" && v.lieferbeginn && v.lieferende && (
                          <p className="text-xs" style={{ color: C.muted }}>
                            Ergibt {num(monateZwischen(v.lieferbeginn, v.lieferende) || 0)} Monate Laufzeit.
                          </p>
                        )}

                        <div>
                          <div className="flex items-baseline justify-between mb-2">
                            <span className="text-sm">Preise je Lieferstelle</span>
                            <span className="text-xs" style={{ color: C.muted }}>optional</span>
                          </div>
                          <div className="space-y-3">
                            {a.lieferstellen
                              .filter((l) => !v.sparte || v.sparte === "beide" || l.medium === v.sparte)
                              .map((l) => (
                              <div key={l.id} className="p-3 rounded"
                                   style={{ border: "1px solid " + C.line,
                                            borderLeft: "3px solid " + (l.medium === "strom" ? C.strom : C.gas) }}>
                                <div className="flex items-center gap-2 mb-2 text-sm">
                                  <MediumIcon medium={l.medium} />
                                  {l.bezeichnung || (l.medium === "strom" ? "Strom" : "Erdgas")}
                                </div>
                                <div className="grid sm:grid-cols-2 gap-4">
                                  <Feld label="Reiner Energiepreis (ct/kWh)"
                                    value={(v.preise[l.id] || {}).energie || ""}
                                    onChange={(x) => setVarPreis(v.id, l.id, "energie", x)} />
                                  <Feld label="Arbeitspreis gesamt (ct/kWh)"
                                    value={(v.preise[l.id] || {}).arbeit || ""}
                                    onChange={(x) => setVarPreis(v.id, l.id, "arbeit", x)} />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <Provisionsblock a={a} mitarbeiter={mitarbeiter} user={user}
                          laufzeit={laufzeitMonate(v)}
                          variante={{ ...v, aufschlag: parseFloat(String(v.aufschlag).replace(",", ".")) || 0 }} />

                        <label className="block">
                          <span className="block text-xs mb-1" style={{ color: C.muted }}>Bemerkung zu dieser Variante</span>
                          <textarea rows={2} value={v.bemerkung}
                            onChange={(e) => setVar(v.id, "bemerkung", e.target.value)}
                            className="w-full px-3 py-2 text-sm rounded outline-none"
                            style={{ border: "1px solid " + C.line }} />
                        </label>

                        <Datei label="Angebot als PDF – erforderlich" datei={v.angebot}
                          onSet={(f) => setVar(v.id, "angebot", f)} hinweis="Angebot anhängen" />
                      </div>
                    </div>
                  ))}

                  <Btn variante="hell" icon={Plus} onClick={() => setVars([...vars, leereVariante(a)])}>
                    Weitere Variante hinzufügen
                  </Btn>

                  <Datei label="Maklervollmacht (PDF) – gilt für alle Varianten" datei={vollmacht}
                    onSet={setVollmacht} hinweis="PDF anhängen" />

                  <div>
                    <Btn icon={Send} onClick={angebotSenden} disabled={!bereit}>
                      {vars.length > 1 ? vars.length + " Angebote an Vertriebspartner senden" : "Angebot an Vertriebspartner senden"}
                    </Btn>
                    {!bereit && (
                      <p className="text-xs mt-2" style={{ color: C.muted }}>
                        Jede Variante braucht ein angehängtes Angebots-PDF.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {modus === "rueck" && (
                <div className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-2">
                    {FEHLGRUENDE.map((f) => (
                      <label key={f} className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={fehlend.includes(f)}
                          onChange={() => setFehlend(fehlend.includes(f)
                            ? fehlend.filter((x) => x !== f) : [...fehlend, f])}
                          style={{ accentColor: C.warn }} />
                        {f}
                      </label>
                    ))}
                  </div>
                  <label className="block">
                    <span className="block text-xs mb-1" style={{ color: C.muted }}>Ergänzender Hinweis</span>
                    <textarea rows={3} value={fehlendText} onChange={(e) => setFehlendText(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded outline-none"
                      style={{ border: "1px solid " + C.line }} />
                  </label>
                  <Btn variante="gefahr" icon={RotateCcw} disabled={fehlend.length === 0}
                    onClick={zurueckAnVertrieb}>
                    Anfrage an Vertriebspartner zurücksenden
                  </Btn>
                </div>
              )}

              {modus === "gf" && (
                <div className="space-y-4">
                  <p className="text-sm" style={{ color: C.muted, maxWidth: "60ch" }}>
                    Der Vorgang geht zur Abstimmung an die Geschäftsführung und ist so lange für die
                    Kalkulation gesperrt. Nach der Antwort landet er wieder im Eingang.
                  </p>
                  <label className="block">
                    <span className="block text-xs mb-1" style={{ color: C.muted }}>Frage an die Geschäftsführung</span>
                    <textarea rows={4} value={frage} onChange={(e) => setFrage(e.target.value)}
                      placeholder="z. B. Kunde ist offen für Spot. Bei 2,4 GWh Jahresmenge: welchen Aufschlag geben wir frei?"
                      className="w-full px-3 py-2 text-sm rounded outline-none"
                      style={{ border: "1px solid " + C.line }} />
                  </label>
                  <Btn icon={Send} onClick={rueckspracheStellen} disabled={!frage.trim()}>
                    Rücksprache anfragen
                  </Btn>
                </div>
              )}
            </div>
          )}

          {a.nachreichung && (
            <div className="rounded p-4" style={{ background: C.card, border: "1px solid " + C.ok }}>
              <div className="text-sm mb-2">Nachgereicht vom Vertriebspartner</div>
              {a.nachreichung.text && <p className="text-sm mb-3">{a.nachreichung.text}</p>}
              <div className="space-y-2">
                {(a.nachreichung.dateien || []).map((d, i) => <DateiChip key={i} datei={d} />)}
              </div>
              <p className="text-xs mt-3" style={{ color: C.muted }}>
                {a.nachreichung.von} · {datum(a.nachreichung.datum)}
              </p>
            </div>
          )}

          {a.bemerkungVertrieb && (
            <div className="rounded p-4" style={{ background: C.card, border: "1px solid " + C.line }}>
              <div className="text-sm mb-2">Bemerkung des Vertriebspartners</div>
              <p className="text-sm">{a.bemerkungVertrieb}</p>
            </div>
          )}

          {(a.produkt === EMPFEHLUNG || a.produktGas === EMPFEHLUNG) && (
            <div className="rounded p-4" style={{ background: "#F1F7F0", border: "1px solid " + C.gruen }}>
              <div className="text-sm mb-1" style={{ color: C.ok }}>Produktempfehlung angefragt</div>
              <p className="text-sm">
                Der Vertriebspartner möchte eine Empfehlung für
                {a.produkt === EMPFEHLUNG && verbrauchMedium(a, "strom") > 0 ? " Strom" : ""}
                {a.produkt === EMPFEHLUNG && a.produktGas === EMPFEHLUNG && verbrauchMedium(a, "gas") > 0 ? " und" : ""}
                {a.produktGas === EMPFEHLUNG && verbrauchMedium(a, "gas") > 0 ? " Erdgas" : ""}.
              </p>
              {a.beratungHinweis && (
                <p className="text-sm mt-2 p-3 rounded" style={{ background: "#fff" }}>{a.beratungHinweis}</p>
              )}
            </div>
          )}

          {/* Rücksprache mit der Geschäftsführung */}
          {intern && a.ruecksprache && (
            <div className="rounded p-5" style={{ background: C.card,
                 border: "1px solid " + (a.status === "ruecksprache" ? C.gruen : C.line) }}>
              <div className="text-sm mb-3">Rücksprache Geschäftsführung</div>
              <div className="p-3 rounded text-sm" style={{ background: "#F6F8FA" }}>
                {a.ruecksprache.frage}
                <span className="block text-xs mt-1" style={{ color: C.muted }}>
                  {a.ruecksprache.von} · {datum(a.ruecksprache.datum)}
                </span>
              </div>

              {a.ruecksprache.antwort ? (
                <div className="p-3 rounded text-sm mt-3" style={{ background: "#F1F7F0" }}>
                  {a.ruecksprache.antwort}
                  <span className="block text-xs mt-1" style={{ color: C.muted }}>
                    {a.ruecksprache.antwortVon} · {datum(a.ruecksprache.antwortDatum)}
                  </span>
                </div>
              ) : istGF ? (
                <div className="mt-4 space-y-3">
                  <label className="block">
                    <span className="block text-xs mb-1" style={{ color: C.muted }}>Antwort und Freigabe</span>
                    <textarea rows={4} value={antwort} onChange={(e) => setAntwort(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded outline-none"
                      style={{ border: "1px solid " + C.line }} />
                  </label>
                  <Btn variante="ok" icon={Send} onClick={rueckspracheBeantworten} disabled={!antwort.trim()}>
                    Antwort an Kalkulation senden
                  </Btn>
                </div>
              ) : (
                <p className="text-sm mt-3" style={{ color: C.muted }}>
                  Wartet auf Antwort der Geschäftsführung.
                </p>
              )}
            </div>
          )}

          {/* Aufgabe 10: Bearbeitung durch das Kalkulationsteam nach dem Abschluss */}
          {istKalk && a.status === "uebermittelt" && (
            <div className="rounded p-5"
                 style={{ background: a.einreichung ? "#FDF9EC" : C.card,
                          border: "1px solid " + (a.einreichung ? C.gold : C.strom) }}>
              <div className="text-sm mb-3">Versorgerbestätigung ausstehend</div>

              {a.annahme && (
                <div className="space-y-2 mb-4">
                  {a.annahme.angebotUnterschrieben
                    ? <DateiChip datei={a.annahme.angebotUnterschrieben} label="Angebot unterschrieben" />
                    : a.annahme.kundeInformiert && (
                      <p className="text-sm px-3 py-2 rounded" style={{ background: "#F6F8FA" }}>
                        Kunde ist informiert und einverstanden, kein unterschriebenes Angebot beigefügt.
                      </p>
                    )}
                  {a.annahme.vollmacht && <DateiChip datei={a.annahme.vollmacht} label="Maklervollmacht" />}
                  {(a.annahme.weitere || []).map((d, i) => <DateiChip key={i} datei={d} label="weiteres Dokument" />)}
                  {a.annahme.abweichung && (
                    <p className="text-sm p-3 rounded" style={{ background: "#FDF6EE" }}>
                      Abweichungswunsch: {a.annahme.abweichung}
                    </p>
                  )}
                </div>
              )}

              <label className="flex items-center gap-3 text-sm mb-5">
                <input type="checkbox" checked={!!a.einreichung}
                  onChange={(e) => onUpdate({ ...a, einreichung: e.target.checked })}
                  style={{ accentColor: C.gold }} />
                In Einreichung beim Versorger
              </label>

              <div className="flex flex-wrap gap-2">
                <Btn variante={vModus === "best" ? "ok" : "hell"} icon={Check} onClick={() => setVModus("best")}>
                  Auftrag bestätigt
                </Btn>
                <Btn variante={vModus === "klaer" ? "primär" : "hell"} icon={AlertTriangle} onClick={() => setVModus("klaer")}>
                  Klärfall
                </Btn>
                <Btn variante={vModus === "abl" ? "gefahr" : "hell"} icon={X} onClick={() => setVModus("abl")}>
                  Abgelehnt
                </Btn>
              </div>

              {vModus === "best" && (
                <div className="mt-5 space-y-4 pt-5" style={{ borderTop: "1px solid " + C.line }}>
                  <Select label="Versorger" value={best.versorger}
                    onChange={(v) => setBest({ ...best, versorger: v })}
                    options={[{ value: "", label: "Bitte wählen" },
                      ...(versorger || []).map((x) => ({ value: x.name, label: x.name })),
                      ...((versorger || []).some((x) => x.name === best.versorger) || !best.versorger
                        ? [] : [{ value: best.versorger, label: best.versorger }])]} />

                  <div className="space-y-3">
                    {a.lieferstellen.map((l) => (
                      <div key={l.id} className="p-3 rounded"
                           style={{ border: "1px solid " + C.line,
                                    borderLeft: "3px solid " + (l.medium === "strom" ? C.strom : C.gas) }}>
                        <div className="flex items-center gap-2 mb-2 text-sm">
                          <MediumIcon medium={l.medium} />
                          {l.bezeichnung || (l.medium === "strom" ? "Strom" : "Erdgas")}
                          <span className="text-xs" style={{ color: C.muted }}>
                            angefragt {num(parseFloat(l.verbrauch) || 0)} kWh
                          </span>
                        </div>
                        <div className="grid sm:grid-cols-3 gap-4">
                          <Feld label="Bestätigte kWh" value={(best.stellen[l.id] || {}).kwh || ""}
                            onChange={(v) => setBestStelle(l.id, "kwh", v.replace(/[^\d]/g, ""))} />
                          <Feld label="Lieferbeginn" type="date" value={(best.stellen[l.id] || {}).beginn || ""}
                            onChange={(v) => setBestStelle(l.id, "beginn", v)} />
                          <Feld label="Lieferende" type="date" value={(best.stellen[l.id] || {}).ende || ""}
                            onChange={(v) => setBestStelle(l.id, "ende", v)} />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="grid sm:grid-cols-3 gap-4">
                    <Feld label="Gesamtaufschlag (ct/kWh)" value={best.aufschlag}
                      onChange={(v) => setBest({ ...best, aufschlag: v })} />
                    <Feld label="Bonuszahlung (€)" value={best.bonus}
                      onChange={(v) => setBest({ ...best, bonus: v })} />
                    <Select label="Bonus wird gezahlt" value={best.bonusArt}
                      onChange={(v) => setBest({ ...best, bonusArt: v })}
                      options={[{ value: "einmalig", label: "einmalig" },
                                { value: "jaehrlich", label: "pro Lieferjahr" }]} />
                  </div>

                  <Provisionsblock a={{ ...a, bestaetigung: { ...best,
                    aufschlag: parseFloat(String(best.aufschlag).replace(",", ".")) || 0 } }}
                    mitarbeiter={mitarbeiter} user={user} laufzeit={laufzeitVon(a)} />

                  <Btn variante="ok" icon={Check} onClick={auftragBestaetigen}
                    disabled={!best.versorger || bestaetigteMenge({ ...a, bestaetigung: best }) === 0}>
                    Auftrag final bestätigen
                  </Btn>
                </div>
              )}

              {vModus === "klaer" && (
                <div className="mt-5 space-y-4 pt-5" style={{ borderTop: "1px solid " + C.line }}>
                  <label className="block">
                    <span className="block text-xs mb-1" style={{ color: C.muted }}>Was ist zu klären?</span>
                    <textarea rows={3} value={vKlaer.text}
                      onChange={(e) => setVKlaer({ ...vKlaer, text: e.target.value })}
                      className="w-full px-3 py-2 text-sm rounded outline-none"
                      style={{ border: "1px solid " + C.line }} />
                  </label>
                  <div className="space-y-2">
                    {vKlaer.dateien.map((d, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="flex-1 min-w-0"><DateiChip datei={d} /></div>
                        <button onClick={() => setVKlaer({ ...vKlaer,
                          dateien: vKlaer.dateien.filter((_, x) => x !== i) })}
                          style={{ color: C.muted }}><X size={15} /></button>
                      </div>
                    ))}
                  </div>
                  <label className="flex items-center gap-2 px-3 py-2 rounded text-sm cursor-pointer"
                         style={{ border: "1px dashed " + C.line, color: C.muted, background: "#fff" }}>
                    <Upload size={14} /> Dokumente anhängen
                    <input type="file" multiple className="hidden"
                      onChange={(e) => Array.from(e.target.files || []).forEach((f) =>
                        dateiLesen(f, (d) => setVKlaer((v) => ({ ...v, dateien: [...v.dateien, d] }))))} />
                  </label>
                  <Btn icon={RotateCcw} onClick={versorgerKlaerfall} disabled={!vKlaer.text.trim()}>
                    Auftrag an den Vertriebspartner zurücksenden
                  </Btn>
                </div>
              )}

              {vModus === "abl" && (
                <div className="mt-5 space-y-4 pt-5" style={{ borderTop: "1px solid " + C.line }}>
                  <Datei label="Ablehnungsbegründung des Versorgers" datei={vAbl.dokument}
                    onSet={(f) => setVAbl({ ...vAbl, dokument: f })} hinweis="Datei auswählen" />
                  <label className="block">
                    <span className="block text-xs mb-1" style={{ color: C.muted }}>Weitere Informationen</span>
                    <textarea rows={3} value={vAbl.text}
                      onChange={(e) => setVAbl({ ...vAbl, text: e.target.value })}
                      className="w-full px-3 py-2 text-sm rounded outline-none"
                      style={{ border: "1px solid " + C.line }} />
                  </label>
                  <div className="p-4 rounded" style={{ background: "#F6F8FA", border: "1px solid " + C.line }}>
                    <label className="flex items-center gap-3 text-sm">
                      <input type="checkbox" checked={vAbl.alternativ}
                        onChange={(e) => setVAbl({ ...vAbl, alternativ: e.target.checked })}
                        style={{ accentColor: C.ink }} />
                      Alternativangebot vorhanden
                    </label>
                    {vAbl.alternativ && (
                      <div className="mt-3">
                        <Datei label="Alternatives Angebot" datei={vAbl.alternativAngebot}
                          onSet={(f) => setVAbl({ ...vAbl, alternativAngebot: f })} hinweis="Datei auswählen" />
                      </div>
                    )}
                  </div>
                  <Btn variante="gefahr" icon={RotateCcw} onClick={versorgerAblehnung}
                    disabled={!vAbl.dokument && !vAbl.text.trim()}>
                    Ablehnung an den Vertriebspartner senden
                  </Btn>
                </div>
              )}
            </div>
          )}

          {/* Vertragsmanagement: Provisionseingang bestätigen */}
          {istVM && a.status === "bestaetigt" && (
            <div className="rounded p-5" style={{ background: C.card, border: "1px solid " + C.ok }}>
              <div className="text-sm mb-3">Provision prüfen und bestätigen</div>
              <div className="grid sm:grid-cols-2 gap-x-8 mb-4">
                <Zeile k="Versorger" v={a.bestaetigung && a.bestaetigung.versorger} />
                <Zeile k="Bestätigte Menge" v={num(bestaetigteMenge(a)) + " kWh"} />
                <Zeile k="Gesamtaufschlag" v={a.bestaetigung ? num(a.bestaetigung.aufschlag, 3) + " ct/kWh" : "–"} />
                <Zeile k="Gesamtprovision" v={eur(gesamtprovision(a))} />
              </div>
              <Btn variante="ok" icon={Check}
                onClick={() => { onUpdate({
                  ...a, status: "abgeschlossen", vertragsStatus: "Lieferung aktiv",
                  provisionErhalten: { von: user.name, datum: heute() },
                  verlauf: [...a.verlauf, { d: heute(), t: "Provisionseingang bestätigt", w: user.name }],
                }); onZurueck(); }}>
                Provisionseingang bestätigen
              </Btn>
            </div>
          )}

          {/* Aufgabe 8: Klärfall beim Vertriebspartner */}
          {istPartner && a.status === "klaerfall" && (
            <div className="rounded p-5" style={{ background: C.card, border: "1px solid " + C.warn }}>
              <div className="flex items-center gap-2 mb-3" style={{ color: C.warn }}>
                <AlertTriangle size={16} />
                <span className="text-sm">Das Team Kalkulation braucht noch etwas von dir</span>
              </div>

              {(a.fehlend || []).length > 0 && (
                <ul className="text-sm ml-5 list-disc mb-3">
                  {a.fehlend.map((f) => <li key={f}>{f}</li>)}
                </ul>
              )}
              {a.fehlendText && (
                <p className="text-sm p-3 rounded mb-3" style={{ background: "#F6F8FA" }}>{a.fehlendText}</p>
              )}
              {a.klaerung && a.klaerung.dateien && a.klaerung.dateien.length > 0 && (
                <div className="space-y-2 mb-3">
                  {a.klaerung.dateien.map((d, i) => <DateiChip key={i} datei={d} label="von der Kalkulation" />)}
                </div>
              )}

              <label className="block mb-4">
                <span className="block text-xs mb-1" style={{ color: C.muted }}>
                  Deine Rückmeldung an die Kalkulation
                </span>
                <textarea rows={3} value={klaerText} onChange={(e) => setKlaerText(e.target.value)}
                  placeholder="Welche Angaben reichst du nach, was hast du geklärt?"
                  className="w-full px-3 py-2 text-sm rounded outline-none"
                  style={{ border: "1px solid " + C.line }} />
              </label>

              <div className="space-y-2 mb-3">
                {klaerDateien.map((d, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="flex-1 min-w-0"><DateiChip datei={d} /></div>
                    <button onClick={() => setKlaerDateien(klaerDateien.filter((_, x) => x !== i))}
                      style={{ color: C.muted }}><X size={15} /></button>
                  </div>
                ))}
              </div>
              <label className="flex items-center gap-2 px-3 py-2 rounded text-sm cursor-pointer mb-4"
                     style={{ border: "1px dashed " + C.line, color: C.muted, background: "#fff" }}>
                <Upload size={14} /> Unterlagen nachreichen
                <input type="file" multiple className="hidden"
                  onChange={(e) => Array.from(e.target.files || []).forEach((f) =>
                    dateiLesen(f, (d) => setKlaerDateien((v) => [...v, d])))} />
              </label>

              <div className="flex flex-wrap gap-2">
                <Btn icon={Send} onClick={klaerfallZurueck} disabled={!klaerText.trim() && klaerDateien.length === 0}>
                  An die Kalkulation zurücksenden
                </Btn>
                <Btn variante="hell" onClick={() => onBearbeiten && onBearbeiten(a)}>
                  Anfrage bearbeiten
                </Btn>
              </div>
            </div>
          )}

          {/* Aufgabe 9: Abschlussmaske nach Annahme */}
          {istPartner && annahme.variante && (
            <div className="rounded p-5" style={{ background: C.card, border: "1px solid " + C.ok }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm">Abschluss vorbereiten</span>
                <button onClick={() => setAnnahme({ ...annahme, variante: null })} style={{ color: C.muted }}>
                  <X size={16} />
                </button>
              </div>
              <p className="text-sm mb-5" style={{ color: C.muted, maxWidth: "60ch" }}>
                Angenommen wird {annahme.variante.produkt} über{" "}
                {laufzeitMonate(annahme.variante) || annahme.variante.laufzeit} Monate. Lade die
                unterschriebenen Unterlagen hoch, danach geht der Auftrag an die Kalkulation.
              </p>

              <div className="space-y-4">
                <Datei label="Maklervollmacht unterschrieben – erforderlich" datei={annahme.vollmacht}
                  onSet={(f) => setAnnahme({ ...annahme, vollmacht: f })} hinweis="Datei auswählen" />

                <div className="p-4 rounded" style={{ background: "#F6F8FA", border: "1px solid " + C.line }}>
                  <Datei label="Unterschriebenes Angebot" datei={annahme.angebotUnterschrieben}
                    onSet={(f) => setAnnahme({ ...annahme, angebotUnterschrieben: f })}
                    hinweis="Datei auswählen" />
                  <div className="text-xs my-3" style={{ color: C.muted }}>oder</div>
                  <label className="flex items-start gap-3 text-sm">
                    <input type="checkbox" checked={annahme.kundeInformiert} className="mt-0.5"
                      onChange={(e) => setAnnahme({ ...annahme, kundeInformiert: e.target.checked })}
                      style={{ accentColor: C.ink }} />
                    <span>
                      Der Kunde ist über die notwendigen Schritte informiert und gibt sein
                      Einverständnis für Bearbeitung und Abschluss
                    </span>
                  </label>
                </div>

                <label className="flex items-start gap-3 text-sm">
                  <input type="checkbox" checked={annahme.wieBeschrieben} className="mt-0.5"
                    onChange={(e) => setAnnahme({ ...annahme, wieBeschrieben: e.target.checked })}
                    style={{ accentColor: C.ink }} />
                  Der Kunde nimmt das kalkulierte Angebot wie beschrieben an
                </label>

                <label className="block">
                  <span className="block text-xs mb-1" style={{ color: C.muted }}>Abweichungswünsche</span>
                  <textarea rows={2} value={annahme.abweichung}
                    onChange={(e) => setAnnahme({ ...annahme, abweichung: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded outline-none"
                    style={{ border: "1px solid " + C.line }} />
                </label>

                <div>
                  <span className="block text-xs mb-2" style={{ color: C.muted }}>Weitere Dokumente</span>
                  <div className="space-y-2 mb-2">
                    {annahme.weitere.map((d, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="flex-1 min-w-0"><DateiChip datei={d} /></div>
                        <button onClick={() => setAnnahme({ ...annahme,
                          weitere: annahme.weitere.filter((_, x) => x !== i) })}
                          style={{ color: C.muted }}><X size={15} /></button>
                      </div>
                    ))}
                  </div>
                  <label className="flex items-center gap-2 px-3 py-2 rounded text-sm cursor-pointer"
                         style={{ border: "1px dashed " + C.line, color: C.muted, background: "#fff" }}>
                    <Upload size={14} /> Dokumente hinzufügen
                    <input type="file" multiple className="hidden"
                      onChange={(e) => Array.from(e.target.files || []).forEach((f) =>
                        dateiLesen(f, (d) => setAnnahme((v) => ({ ...v, weitere: [...v.weitere, d] }))))} />
                  </label>
                </div>

                <div className="pt-2">
                  <Btn variante="ok" icon={Send} onClick={abschlussSenden}
                    disabled={!annahme.vollmacht || (!annahme.angebotUnterschrieben && !annahme.kundeInformiert)}>
                    Abschluss an das Kalkulationsteam senden
                  </Btn>
                  {(!annahme.vollmacht || (!annahme.angebotUnterschrieben && !annahme.kundeInformiert)) && (
                    <p className="text-xs mt-2" style={{ color: C.muted }}>
                      Die unterschriebene Maklervollmacht ist Pflicht. Zusätzlich braucht es entweder das
                      unterschriebene Angebot oder die Bestätigung, dass der Kunde einverstanden ist.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Angebotsansicht */}
          {a.kalkulation && (
            <div className="rounded p-5" style={{ background: C.card, border: "1px solid " + C.line }}>
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-sm">
                  {varianten(a).length > 1 ? varianten(a).length + " Angebote" : "Angebot"} vom {datum(a.kalkulation.datum)}
                </span>
                <span className="text-xs" style={{ color: C.muted }}>{a.kalkulation.bearbeiter}</span>
              </div>
              {varianten(a).length > 1 && a.status === "angebot" && (
                <p className="text-sm mb-4" style={{ color: C.muted }}>
                  Der Kunde wählt aus. Je Sparte wird eine Variante angenommen, bei Strom und Erdgas
                  können es also zwei sein.
                </p>
              )}

              <div className="space-y-4 mt-4">
                {varianten(a).map((v, i) => {
                  const gewaehlt = gewaehlte(a).some((x) => x.id === v.id);
                  const verworfen = a.status === "abgeschlossen" && !gewaehlt && varianten(a).length > 1;
                  const ende = enddatum(v);
                  return (
                    <div key={v.id} className="rounded overflow-hidden"
                         style={{ border: "1px solid " + (gewaehlt ? C.ok : C.line), opacity: verworfen ? 0.5 : 1 }}>
                      <div className="flex items-center justify-between px-4 py-2"
                           style={{ background: gewaehlt ? "#F1F7F0" : "#F6F8FA", borderBottom: "1px solid " + C.line }}>
                        <span className="text-sm">
                          {varianten(a).length > 1 ? "Variante " + (i + 1) + ": " : ""}{v.produkt}
                          {" · " + (laufzeitMonate(v) || v.laufzeit) + " Monate"}
                          {v.sparte && v.sparte !== "beide" ? " · " + (v.sparte === "gas" ? "Erdgas" : "Strom") : ""}
                        </span>
                        {gewaehlt && (
                          <span className="inline-flex items-center gap-1 text-xs" style={{ color: C.ok }}>
                            <Check size={13} /> angenommen
                          </span>
                        )}
                      </div>

                      <div className="p-4">
                        <div className="grid sm:grid-cols-2 gap-x-8">
                          <Zeile k="Lieferbeginn" v={v.lieferbeginn ? datum(v.lieferbeginn) : "offen"} />
                          <Zeile k="Vertragsende" v={(ende ? datum(ende) : "offen")
                            + ((v.laufzeitArt === "ende") ? " (fest)" : "")} />
                          <Zeile k="Aufschlag" v={num(v.aufschlag, 3) + " ct/kWh"} />
                          <Zeile k="Gültig bis" v={datum(v.gueltigBis)} />
                        </div>

                        {a.lieferstellen.some((l) => v.preise && v.preise[l.id] &&
                          ((v.preise[l.id].energie) || (v.preise[l.id].arbeit))) && (
                          <div className="mt-3 space-y-1">
                            {a.lieferstellen.map((l) => {
                              const pr = (v.preise || {})[l.id] || {};
                              if (!pr.energie && !pr.arbeit) return null;
                              return (
                                <div key={l.id} className="flex items-center gap-3 text-sm py-1">
                                  <MediumIcon medium={l.medium} />
                                  <span className="flex-1">{l.bezeichnung || (l.medium === "strom" ? "Strom" : "Erdgas")}</span>
                                  <span style={{ color: C.muted, fontVariantNumeric: "tabular-nums" }}>
                                    {pr.energie ? "Energie " + pr.energie : ""}
                                    {pr.energie && pr.arbeit ? " · " : ""}
                                    {pr.arbeit ? "Arbeitspreis " + pr.arbeit : ""} ct/kWh
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        <div className="mt-3">
                          <Provisionsblock a={a} mitarbeiter={mitarbeiter} user={user}
                            laufzeit={laufzeitMonate(v)} variante={v} />
                        </div>

                        {v.bemerkung && (
                          <p className="text-sm mt-3 p-3 rounded" style={{ background: "#F6F8FA" }}>{v.bemerkung}</p>
                        )}

                        {v.angebot && (
                          <div className="mt-3"><DateiChip datei={v.angebot} label="Angebot" /></div>
                        )}

                        {istPartner && ["angebot", "abgeschlossen"].includes(a.status) && !gewaehlt && (
                          <div className="mt-4">
                            <Btn variante="ok" icon={Check} onClick={() => annehmen(v)}>
                              {varianten(a).length > 1 ? "Diese Variante annehmen" : "Angebot angenommen"}
                            </Btn>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {a.kalkulation.vollmacht && (
                <div className="mt-4"><DateiChip datei={a.kalkulation.vollmacht} label="Maklervollmacht" /></div>
              )}

              {istPartner && a.status === "angebot" && (
                <div className="mt-4">
                  <Btn variante="hell" icon={X}
                    onClick={() => { onUpdate({ ...a, status: "abgelehnt",
                      verlauf: [...a.verlauf, { d: heute(), t: "Alle Angebote abgelehnt", w: user.name }] }); onZurueck(); }}>
                    Kein Angebot angenommen
                  </Btn>
                </div>
              )}
            </div>
          )}

          {/* Vertragsmanagement */}
          {istVM && a.status === "abgeschlossen" && (
            <div className="rounded p-5" style={{ background: C.card, border: "1px solid " + C.line }}>
              <Select label="Vertragsstatus" value={a.vertragsStatus || "Vertrag zu erstellen"}
                onChange={(v) => onUpdate({ ...a, vertragsStatus: v })}
                options={["Vertrag zu erstellen", "Vertrag versendet", "Vertrag unterschrieben",
                          "Beim Versorger eingereicht", "Lieferung aktiv"]} />
            </div>
          )}
        </div>

        {/* Seitenspalte */}
        <div className="space-y-5">
          <div className="rounded p-4" style={{ background: C.card, border: "1px solid " + C.line }}>
            <div className="text-sm mb-3">Kunde</div>
            <Zeile k="Ansprechpartner" v={a.kunde.ansprechpartner} />
            <Zeile k="Telefon" v={a.kunde.telefon} />
            <Zeile k="E-Mail" v={a.kunde.email} />
            <Zeile k="Branche" v={a.kunde.branche} />
            {istSpot && (
              <Zeile k="Zielpreis Spotmarkt" v={a.zielpreis ? a.zielpreis + " ct/kWh" : "offen"} />
            )}
            <Zeile k="Anschrift" v={a.kunde.plz + " " + a.kunde.ort} />
          </div>

          <div className="rounded p-4" style={{ background: C.card, border: "1px solid " + C.line }}>
            <div className="text-sm mb-3">Angebotswunsch</div>
            {verbrauchMedium(a, "strom") > 0 && <Zeile k="Produkt Strom" v={a.produkt} />}
            {verbrauchMedium(a, "gas") > 0 && <Zeile k="Produkt Erdgas" v={a.produktGas || a.produkt} />}
            <Zeile k="Vertragsdauer" v={a.laufzeitArt === "ende"
              ? "fest bis " + (a.wunschLieferende ? datum(a.wunschLieferende) : "offen")
              : a.laufzeit + " Monate"} />
            <Zeile k="Aufschlag" v={num(a.aufschlag, 3) + " ct/kWh"} />
            <Zeile k="Wunsch-Lieferbeginn" v={a.wunschLieferbeginn ? datum(a.wunschLieferbeginn) : "offen"} />
            <Zeile k="Gesamtmenge" v={num(verbrauchGesamt(a)) + " kWh"} />
            {a.vertragsStatus && <Zeile k="Vertrag" v={a.vertragsStatus} />}
            {a.bestaetigung && <Zeile k="Versorger" v={a.bestaetigung.versorger} />}
            {a.bestaetigung && <Zeile k="Bestätigte Menge" v={num(bestaetigteMenge(a)) + " kWh"} />}
            {a.provisionErhalten && <Zeile k="Provision erhalten" v={datum(a.provisionErhalten.datum)} />}
          </div>

          <div className="rounded p-4" style={{ background: C.card, border: "1px solid " + C.line }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm">Verlauf</span>
              {darfProtokoll && (
                <button onClick={protokollLaden} className="text-xs px-2 py-1 rounded"
                        style={{ border: "1px solid " + C.line, color: C.strom }}>
                  als PDF
                </button>
              )}
            </div>
            {a.verlauf.length === 0 && <p className="text-sm" style={{ color: C.muted }}>Noch keine Einträge.</p>}
            {a.verlauf.map((v, i) => (
              <div key={i} className="flex gap-3 py-2 text-sm" style={{ borderTop: i ? "1px solid " + C.line : "none" }}>
                <span style={{ color: C.muted, fontVariantNumeric: "tabular-nums" }}>{datum(v.d)}</span>
                <span className="flex-1">{v.t}<span className="block text-xs" style={{ color: C.muted }}>{v.w}</span></span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Listen                                                             */
/* ------------------------------------------------------------------ */
function Liste({ anfragen, onOeffnen, leerText }) {
  if (anfragen.length === 0)
    return (
      <div className="rounded p-8 text-center text-sm"
           style={{ border: "1px dashed " + C.line, color: C.muted }}>{leerText}</div>
    );
  return (
    <div className="rounded overflow-hidden" style={{ background: C.card, border: "1px solid " + C.line }}>
      {anfragen.map((a, i) => (
        <button key={a.id} onClick={() => onOeffnen(a.id)}
          className="w-full text-left px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-1"
          style={{ borderTop: i ? "1px solid " + C.line : "none",
                   background: a.einreichung ? "#FDF9EC" : "transparent" }}>
          <div className="flex gap-1 w-10">
            {a.lieferstellen.some((l) => l.medium === "strom") && <MediumIcon medium="strom" />}
            {a.lieferstellen.some((l) => l.medium === "gas") && <MediumIcon medium="gas" />}
          </div>
          <div className="flex-1 min-w-40">
            <div className="text-sm">{a.kunde.firma || "Neue Anfrage"}</div>
            <div className="text-xs" style={{ color: C.muted }}>
              {a.id} · {aktiveVariante(a) ? aktiveVariante(a).produkt : a.produkt} · {laufzeitVon(a)} Mon. · {a.partnerName}
            </div>
          </div>
          <div className="text-sm text-right w-28" style={{ fontVariantNumeric: "tabular-nums" }}>
            {num(verbrauchGesamt(a))} kWh
          </div>
          <div className="w-40">
            <StatusPunkt status={a.status} />
            {a.einreichung && (
              <span className="block text-xs" style={{ color: C.gold }}>in Einreichung</span>
            )}
          </div>
          <ChevronRight size={15} style={{ color: C.muted }} />
        </button>
      ))}
    </div>
  );
}

function Provisionen({ anfragen, mitarbeiter, user }) {
  const vollsicht = ["Geschäftsführung", "Leitung Vertrieb"].includes(user.rolle);
  const sichtFirma = user.rolle === "Geschäftsführung";
  const rel = anfragen.filter((a) => {
    if (!a.kalkulation) return false;
    if (vollsicht) return true;
    return anteilVon(a, user.id, mitarbeiter) > 0;
  });
  const offen = rel.filter((a) => ["angebot", "uebermittelt", "bestaetigt"].includes(a.status));
  const fix = rel.filter((a) => a.status === "abgeschlossen");

  const eigen = (a) => anteilVon(a, user.id, mitarbeiter);
  const firma = (a) => verteilung(gesamtprovision(a), a.partnerId, mitarbeiter).firma;
  const summe = (l, f) => l.reduce((s, a) => s + f(a), 0);
  const kopf = (l) => (vollsicht ? summe(l, gesamtprovision) : summe(l, eigen));

  const Block = ({ titel, liste, farbe }) => (
    <div className="rounded overflow-hidden mb-5" style={{ background: C.card, border: "1px solid " + C.line }}>
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid " + C.line }}>
        <span className="text-sm">{titel}</span>
        <span className="text-lg" style={{ color: farbe, fontVariantNumeric: "tabular-nums" }}>{eur(kopf(liste))}</span>
      </div>
      {liste.length === 0 && <div className="px-4 py-4 text-sm" style={{ color: C.muted }}>Keine Einträge.</div>}
      {liste.map((a, i) => {
        const v = verteilung(gesamtprovision(a), a.partnerId, mitarbeiter);
        const meins = v.anteile.find((x) => x.id === user.id);
        return (
          <div key={a.id} className="flex items-center gap-4 px-4 py-2.5 text-sm"
               style={{ borderTop: i ? "1px solid " + C.line : "none" }}>
            <span className="flex-1">{a.kunde.firma}
              <span className="block text-xs" style={{ color: C.muted }}>
                {a.id} · {a.partnerName} · {a.laufzeit} Monate
                {meins && meins.overhead ? " · Overhead" : ""}
              </span>
            </span>
            {vollsicht ? (
              <>
                <span className="w-28 text-right" style={{ fontVariantNumeric: "tabular-nums", color: C.muted }}>
                  {eur(v.anteile.reduce((s, x) => s + x.betrag, 0))}
                </span>
                {sichtFirma && (
                  <span className="w-28 text-right" style={{ fontVariantNumeric: "tabular-nums" }}>{eur(firma(a))}</span>
                )}
              </>
            ) : (
              <span style={{ fontVariantNumeric: "tabular-nums" }}>{eur(eigen(a))}</span>
            )}
          </div>
        );
      })}
      {vollsicht && liste.length > 0 && (
        <div className="flex items-center gap-4 px-4 py-2 text-xs" style={{ borderTop: "1px solid " + C.line, color: C.muted }}>
          <span className="flex-1" />
          <span className="w-28 text-right">ausgeschüttet</span>
          {sichtFirma && <span className="w-28 text-right">Firma</span>}
        </div>
      )}
    </div>
  );

  return (
    <div>
      <div className="mb-6 p-5 rounded" style={{ background: C.ink, color: "#fff" }}>
        <div className="text-xs mb-1" style={{ color: "#8B9BB0" }}>
          {vollsicht
            ? "Gesamtprovision aus abgeschlossenen Verträgen, je Lieferjahr"
            : "Deine Provision aus abgeschlossenen Verträgen, je Lieferjahr"}
        </div>
        <div className="text-4xl" style={{ fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}>
          {eur(kopf(fix))}
        </div>
        {vollsicht && (
          <div className="text-sm mt-2" style={{ color: "#8B9BB0" }}>
            ausgeschüttet {eur(summe(fix, gesamtprovision) - summe(fix, firma))}
            {sichtFirma ? " · verbleibt in der Firma " + eur(summe(fix, firma)) : ""}
          </div>
        )}
        {!vollsicht && user.rolle !== "Vertriebspartner" && (
          <div className="text-sm mt-2" style={{ color: "#8B9BB0" }}>
            Differenz zu deinem Satz von {num(user.satz || 0, 0)} % aus der eigenen Struktur
          </div>
        )}
      </div>
      <Block titel="Abgeschlossen" liste={fix} farbe={C.ok} />
      <Block titel="In Aussicht (Angebot liegt beim Kunden)" liste={offen} farbe={C.muted} />
    </div>
  );
}

/* Profilbild oder Initialen */
function Avatar({ m, size = 36 }) {
  const initialen = (m.name || "?").split(" ").map((t) => t[0]).slice(0, 2).join("");
  if (m.bild)
    return <img src={m.bild} alt="" className="rounded-full object-cover"
                style={{ width: size, height: size }} />;
  return (
    <span className="rounded-full inline-flex items-center justify-center"
          style={{ width: size, height: size, background: C.inkSoft, color: "#fff",
                   fontSize: size / 2.8 }}>{initialen}</span>
  );
}

/* Bild auf 160 px verkleinern, damit es in den Browserspeicher passt */
function bildLaden(file, fertig) {
  const leser = new FileReader();
  leser.onload = () => {
    const img = new Image();
    img.onload = () => {
      const k = 160 / Math.max(img.width, img.height);
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * k);
      c.height = Math.round(img.height * k);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      fertig(c.toDataURL("image/jpeg", 0.8));
    };
    img.src = leser.result;
  };
  leser.readAsDataURL(file);
}

const PartnerStatus = ({ status }) => {
  const st = PARTNER_STATUS[status] || PARTNER_STATUS.eingeladen;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs whitespace-nowrap" style={{ color: st.color }}>
      <span className="w-2 h-2 rounded-full" style={{ background: st.color }} />
      {st.label}
    </span>
  );
};

/* Formular für die Stammdaten eines Handelsvertreters.
   schreiben=false zeigt dieselben Daten schreibgeschützt. */
function StammdatenFormular({ sd, setSd, schreiben }) {
  const setz = (k, v) => setSd({ ...sd, [k]: v });
  const Anzeige = ({ k, v }) => (
    <div>
      <div className="text-xs mb-1" style={{ color: C.muted }}>{k}</div>
      <div className="text-sm">{v || "–"}</div>
    </div>
  );
  const DateiZeile = ({ label, datei }) =>
    datei ? <DateiChip datei={datei} label={label} /> : (
      <div className="flex items-center gap-2 px-3 py-2 rounded text-sm"
           style={{ border: "1px solid " + C.line, background: "#F6F8FA", color: C.muted }}>
        <FileText size={15} /><span className="flex-1">nicht hinterlegt</span>
        <span className="text-xs">{label}</span>
      </div>
    );

  if (!schreiben)
    return (
      <div className="space-y-5">
        <div className="grid sm:grid-cols-2 gap-4">
          <Anzeige k="Firmierung" v={sd.firma} />
          <Anzeige k="Steuernummer" v={sd.steuernummer} />
          <Anzeige k="Anschrift" v={[sd.strasse, [sd.plz, sd.ort].filter(Boolean).join(" ")].filter(Boolean).join(", ")} />
          <Anzeige k="Kontoinhaber" v={sd.kontoinhaber} />
          <Anzeige k="IBAN" v={sd.iban} />
          <Anzeige k="Bank / BIC" v={[sd.bank, sd.bic].filter(Boolean).join(" · ")} />
          <Anzeige k="Umsatzsteuer" v={sd.ustBerechtigt ? "vorsteuerabzugsberechtigt" : "nicht vorsteuerabzugsberechtigt"} />
          <Anzeige k="USt-IdNr." v={sd.ustBerechtigt ? sd.ustId : "–"} />
        </div>
        <div className="space-y-2">
          <DateiZeile label="Gewerbeanmeldung" datei={sd.gewerbe} />
          <DateiZeile label="Ausweis Vorderseite" datei={sd.ausweisVorne} />
          <DateiZeile label="Ausweis Rückseite" datei={sd.ausweisHinten} />
          {sd.ustBerechtigt && <DateiZeile label="Nachweis Umsatzsteuer" datei={sd.ustNachweis} />}
        </div>
      </div>
    );

  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-4">
        <Feld label="Firmierung" value={sd.firma} onChange={(v) => setz("firma", v)}
          placeholder="Mustermann Energievertrieb e.K." breit />
        <Feld label="Straße und Hausnummer" value={sd.strasse} onChange={(v) => setz("strasse", v)} breit />
        <Feld label="PLZ" value={sd.plz} onChange={(v) => setz("plz", v)} />
        <Feld label="Ort" value={sd.ort} onChange={(v) => setz("ort", v)} />
        <Feld label="Steuernummer" value={sd.steuernummer} onChange={(v) => setz("steuernummer", v)} breit />
      </div>

      <div>
        <div className="text-sm mb-3">Bankverbindung</div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Feld label="Kontoinhaber" value={sd.kontoinhaber} onChange={(v) => setz("kontoinhaber", v)} breit />
          <Feld label="IBAN" value={sd.iban} onChange={(v) => setz("iban", v)} breit />
          <Feld label="Bank" value={sd.bank} onChange={(v) => setz("bank", v)} />
          <Feld label="BIC" value={sd.bic} onChange={(v) => setz("bic", v)} />
        </div>
      </div>

      <div>
        <div className="text-sm mb-3">Nachweise</div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Datei label="Gewerbeanmeldung (PDF oder Bild)" datei={sd.gewerbe}
            onSet={(f) => setz("gewerbe", f)} hinweis="Datei auswählen" />
          <div />
          <Datei label="Personalausweis Vorderseite" datei={sd.ausweisVorne}
            onSet={(f) => setz("ausweisVorne", f)} hinweis="Datei auswählen" />
          <Datei label="Personalausweis Rückseite" datei={sd.ausweisHinten}
            onSet={(f) => setz("ausweisHinten", f)} hinweis="Datei auswählen" />
        </div>
      </div>

      <div className="p-4 rounded" style={{ background: "#F6F8FA", border: "1px solid " + C.line }}>
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" checked={!!sd.ustBerechtigt} className="mt-0.5"
            onChange={(e) => setz("ustBerechtigt", e.target.checked)} style={{ accentColor: C.ink }} />
          <span>
            Ich bin zum Vorsteuerabzug berechtigt und weise Umsatzsteuer aus
            <span className="block text-xs mt-0.5" style={{ color: C.muted }}>
              Bestimmt, ob Provisionen mit oder ohne Umsatzsteuer abgerechnet werden.
            </span>
          </span>
        </label>
        {sd.ustBerechtigt && (
          <div className="grid sm:grid-cols-2 gap-4 mt-4">
            <Feld label="Umsatzsteuer-Identifikationsnummer" value={sd.ustId}
              onChange={(v) => setz("ustId", v)} placeholder="DE123456789" />
            <Datei label="Nachweis (Bescheinigung Finanzamt)" datei={sd.ustNachweis}
              onSet={(f) => setz("ustNachweis", f)} hinweis="Datei auswählen" />
          </div>
        )}
      </div>
    </div>
  );
}

/* Eigene Stammdaten: vor der Freigabe editierbar, danach gesperrt */
function MeineStammdaten({ user, mitarbeiter, setMitarbeiter }) {
  const [sd, setSd] = useState(user.stammdaten || leereStammdaten());
  const [telefon, setTelefon] = useState(user.telefon || "");
  const [gesendet, setGesendet] = useState(false);
  const offen = ["registriert", "abgelehnt"].includes(user.status);
  const luecken = stammdatenLuecken(sd);

  const schreib = (aend) =>
    setMitarbeiter(mitarbeiter.map((m) => (m.id === user.id ? { ...m, ...aend } : m)));

  const einreichen = () => {
    schreib({ stammdaten: sd, telefon, status: "pruefung", pruefHinweis: "" });
    setGesendet(true);
  };

  return (
    <div className="space-y-5">
      <div className="rounded p-5" style={{ background: C.card, border: "1px solid " + C.line }}>
        <div className="flex items-center gap-4">
          <Avatar m={user} size={56} />
          <div className="flex-1">
            <div className="text-sm">{user.name}</div>
            <div className="text-xs" style={{ color: C.muted }}>{user.rolle} · {user.email}</div>
          </div>
          <PartnerStatus status={user.status} />
        </div>

        <div className="grid sm:grid-cols-2 gap-4 mt-5">
          <Feld label="Telefonnummer" value={telefon}
            onChange={(v) => { setTelefon(v); schreib({ telefon: v }); }} />
          <div>
            <span className="block text-xs mb-1" style={{ color: C.muted }}>Profilbild</span>
            <label className="flex items-center gap-2 px-3 py-2 rounded text-sm cursor-pointer"
                   style={{ border: "1px dashed " + C.line, color: C.muted, background: "#fff" }}>
              <Upload size={14} /> Bild auswählen
              <input type="file" accept="image/*" className="hidden"
                onChange={(e) => {
                  const f = e.target.files && e.target.files[0];
                  if (f) bildLaden(f, (dataUrl) => schreib({ bild: dataUrl }));
                }} />
            </label>
          </div>
        </div>
        <p className="text-xs mt-2" style={{ color: C.muted }}>
          Telefonnummer und Profilbild kannst du jederzeit selbst ändern.
        </p>
      </div>

      {user.status === "abgelehnt" && user.pruefHinweis && (
        <div className="p-4 rounded" style={{ background: "#FCF3F0", border: "1px solid " + C.warn }}>
          <div className="flex items-center gap-2 mb-1" style={{ color: C.warn }}>
            <AlertTriangle size={15} /><span className="text-sm">Die Geschäftsführung bittet um Nachbesserung</span>
          </div>
          <p className="text-sm ml-6">{user.pruefHinweis}</p>
        </div>
      )}

      {user.status === "pruefung" && (
        <div className="p-4 rounded text-sm" style={{ background: "#F6F8FA", border: "1px solid " + C.strom, color: C.strom }}>
          {gesendet ? "Stammdaten eingereicht. " : ""}
          Die Geschäftsführung prüft deine Unterlagen. Bis zur Freigabe sind die Daten gesperrt.
        </div>
      )}

      <div className="rounded p-5" style={{ background: C.card, border: "1px solid " + C.line }}>
        <div className="flex items-baseline justify-between mb-4">
          <span className="text-sm">Stammdaten als Handelsvertreter</span>
          {!offen && <span className="text-xs" style={{ color: C.muted }}>schreibgeschützt</span>}
        </div>

        <StammdatenFormular sd={sd} setSd={setSd} schreiben={offen} />

        {offen && (
          <div className="mt-6 pt-5" style={{ borderTop: "1px solid " + C.line }}>
            <label className="block mb-5">
              <span className="block text-xs mb-1" style={{ color: C.muted }}>
                Bemerkung an das Team Kalkulation
              </span>
              <textarea rows={3} value={a.bemerkungVertrieb || ""}
                onChange={(e) => setA({ ...a, bemerkungVertrieb: e.target.value })}
                placeholder="Weitere Informationen zum Kunden, zur Menge oder zum gewünschten Vorgehen"
                className="w-full px-3 py-2 text-sm rounded outline-none"
                style={{ border: "1px solid " + C.line }} />
            </label>

            {sperren.length > 0 && (
              <div className="p-4 rounded mb-5" style={{ background: "#FCF3F0", border: "1px solid " + C.warn }}>
                <div className="flex items-center gap-2 mb-2" style={{ color: C.warn }}>
                  <AlertTriangle size={15} />
                  <span className="text-sm">Senden ist erst möglich, wenn das erledigt ist</span>
                </div>
                <ul className="text-sm ml-6 list-disc">{sperren.map((f) => <li key={f}>{f}</li>)}</ul>
              </div>
            )}

            {luecken.length > 0 ? (
              <div className="p-4 rounded mb-4" style={{ background: "#FCF3F0", border: "1px solid " + C.warn }}>
                <div className="text-sm mb-2" style={{ color: C.warn }}>Es fehlt noch</div>
                <ul className="text-sm ml-5 list-disc">{luecken.map((f) => <li key={f}>{f}</li>)}</ul>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3 rounded mb-4 text-sm"
                   style={{ background: "#F1F7F0", border: "1px solid " + C.ok, color: C.ok }}>
                <Check size={15} /> Alle Unterlagen liegen vor.
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <Btn variante="hell" onClick={() => schreib({ stammdaten: sd })}>Zwischenspeichern</Btn>
              <Btn icon={Send} onClick={einreichen} disabled={luecken.length > 0}>
                Zur Freigabe einreichen
              </Btn>
            </div>
            <p className="text-xs mt-3" style={{ color: C.muted }}>
              Nach der Freigabe kannst du diese Daten nicht mehr selbst ändern. Änderungen nimmt die
              Geschäftsführung vor.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* Verwaltung der Vertriebsmitarbeiter: anlegen, einladen, Sätze setzen, freigeben */
function Partnerverwaltung({ mitarbeiter, setMitarbeiter, user }) {
  const [auswahl, setAuswahl] = useState(null);
  const [neu, setNeu] = useState(null);
  const [link, setLink] = useState(null);
  const [hinweis, setHinweis] = useState("");
  const [sd, setSd] = useState(null);
  const [bearbeiten, setBearbeiten] = useState(false);

  const istGF = user.rolle === "Geschäftsführung";
  const vertrieb = mitarbeiter.filter((m) =>
    ["Vertriebspartner", "Teamleiter", "Leitung Vertrieb"].includes(m.rolle));
  const koepfe = mitarbeiter.filter((m) => ["Teamleiter", "Leitung Vertrieb"].includes(m.rolle));
  const gewaehlt = mitarbeiter.find((m) => m.id === auswahl);

  const setz = (id, aend) => setMitarbeiter(mitarbeiter.map((m) => (m.id === id ? { ...m, ...aend } : m)));

  const anlegen = () => {
    const code = uid().toUpperCase() + uid().toUpperCase();
    const m = {
      id: "vp-" + uid(), name: neu.name, rolle: neu.rolle, team: neu.team || "-",
      satz: parseFloat(String(neu.satz).replace(",", ".")) || 0,
      upline: neu.upline || null, email: neu.email, telefon: "",
      status: "eingeladen", passwort: "", bild: null, einladung: code,
      stammdaten: leereStammdaten(),
    };
    setMitarbeiter([...mitarbeiter, m]);
    setLink({ name: m.name, url: "https://egc-energie-vertriebsportal.netlify.app/registrieren?code=" + code });
    setNeu(null);
  };

  const freigeben = () => {
    setz(gewaehlt.id, { status: "aktiv", freigabe: { von: user.name, datum: heute() }, pruefHinweis: "" });
    setAuswahl(null);
  };
  const zurueckweisen = () => {
    setz(gewaehlt.id, { status: "abgelehnt", pruefHinweis: hinweis });
    setHinweis(""); setAuswahl(null);
  };

  /* ---------- Einladungslink nach dem Anlegen ---------- */
  if (link)
    return (
      <div className="rounded p-5" style={{ background: C.card, border: "1px solid " + C.ok }}>
        <div className="flex items-center gap-2 mb-3" style={{ color: C.ok }}>
          <Check size={16} /><span className="text-sm">{link.name} wurde angelegt</span>
        </div>
        <p className="text-sm mb-3" style={{ color: C.muted, maxWidth: "60ch" }}>
          Schick diesen Link an den neuen Vertriebspartner. Er vergibt darüber sein Passwort und
          hinterlegt anschließend seine Stammdaten.
        </p>
        <div className="p-3 rounded text-sm break-all"
             style={{ background: "#F6F8FA", border: "1px solid " + C.line }}>{link.url}</div>
        <div className="flex flex-wrap gap-2 mt-4">
          <Btn icon={Check} onClick={() => {
            try { navigator.clipboard.writeText(link.url); } catch (e) { /* manuell kopieren */ }
          }}>Link kopieren</Btn>
          <Btn variante="hell" onClick={() => setLink(null)}>Fertig</Btn>
        </div>
      </div>
    );

  /* ---------- Neuen Partner anlegen ---------- */
  if (neu)
    return (
      <div className="rounded p-5" style={{ background: C.card, border: "1px solid " + C.line }}>
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => setNeu(null)} style={{ color: C.muted }}><ArrowLeft size={18} /></button>
          <h2 className="text-lg">Neuen Vertriebsmitarbeiter anlegen</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Feld label="Name" value={neu.name} onChange={(v) => setNeu({ ...neu, name: v })} />
          <Feld label="E-Mail" value={neu.email} onChange={(v) => setNeu({ ...neu, email: v })} />
          <Select label="Rolle" value={neu.rolle} onChange={(v) => setNeu({ ...neu, rolle: v })}
            options={["Vertriebspartner", "Teamleiter"]} />
          <Feld label="Team" value={neu.team} onChange={(v) => setNeu({ ...neu, team: v })} placeholder="Süd" />
          <Feld label="Provisionssatz in %" value={neu.satz} onChange={(v) => setNeu({ ...neu, satz: v })} />
          <Select label="Zugeordnet an (Overhead)" value={neu.upline || ""}
            onChange={(v) => setNeu({ ...neu, upline: v || null })}
            options={[{ value: "", label: "Keine Zuordnung" },
                      ...koepfe.map((k) => ({ value: k.id, label: k.name + " · " + k.rolle }))]} />
        </div>
        <div className="flex gap-2 mt-6">
          <Btn icon={Send} onClick={anlegen} disabled={!neu.name || !neu.email}>
            Anlegen und Einladungslink erzeugen
          </Btn>
          <Btn variante="hell" onClick={() => setNeu(null)}>Abbrechen</Btn>
        </div>
      </div>
    );

  /* ---------- Einzelner Partner ---------- */
  if (gewaehlt) {
    const daten = sd || gewaehlt.stammdaten || leereStammdaten();
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <button onClick={() => { setAuswahl(null); setSd(null); setBearbeiten(false); }} style={{ color: C.muted }}>
            <ArrowLeft size={18} />
          </button>
          <Avatar m={gewaehlt} size={40} />
          <div className="flex-1">
            <div className="text-lg">{gewaehlt.name}</div>
            <div className="text-xs" style={{ color: C.muted }}>
              {gewaehlt.rolle} · Team {gewaehlt.team} · {gewaehlt.email}
              {gewaehlt.telefon ? " · " + gewaehlt.telefon : ""}
            </div>
          </div>
          <PartnerStatus status={gewaehlt.status} />
        </div>

        <div className="rounded p-5" style={{ background: C.card, border: "1px solid " + C.line }}>
          <div className="text-sm mb-4">Vergütung und Struktur</div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Feld label="Provisionssatz in %" value={gewaehlt.satz}
              onChange={(v) => setz(gewaehlt.id, { satz: parseFloat(v.replace(",", ".")) || 0 })} />
            <Select label="Zugeordnet an (Overhead)" value={gewaehlt.upline || ""}
              onChange={(v) => setz(gewaehlt.id, { upline: v || null })}
              options={[{ value: "", label: "Keine Zuordnung" },
                        ...koepfe.filter((k) => k.id !== gewaehlt.id)
                          .map((k) => ({ value: k.id, label: k.name + " · " + k.rolle }))]} />
          </div>
          {(() => {
            const v = verteilung(1000, gewaehlt.id, mitarbeiter);
            return (
              <p className="text-xs mt-3" style={{ color: C.muted }}>
                Bei 1.000 € Gesamtprovision: {v.anteile.map((x) =>
                  x.name + " " + eur(x.betrag)).join(" · ")}
                {istGF ? " · Firma " + eur(v.firma) : ""}
              </p>
            );
          })()}
        </div>

        {gewaehlt.status === "eingeladen" && gewaehlt.einladung && (
          <div className="rounded p-5" style={{ background: C.card, border: "1px solid " + C.line }}>
            <div className="text-sm mb-2">Einladung offen</div>
            <div className="p-3 rounded text-sm break-all"
                 style={{ background: "#F6F8FA", border: "1px solid " + C.line }}>
              https://egc-energie-vertriebsportal.netlify.app/registrieren?code={gewaehlt.einladung}
            </div>
          </div>
        )}

        {gewaehlt.status !== "eingeladen" && (
          <div className="rounded p-5" style={{ background: C.card, border: "1px solid " + C.line }}>
            <div className="flex items-baseline justify-between mb-4">
              <span className="text-sm">Stammdaten als Handelsvertreter</span>
              {istGF && gewaehlt.status === "aktiv" && (
                <button className="text-sm" style={{ color: C.strom }}
                  onClick={() => { setSd(gewaehlt.stammdaten || leereStammdaten()); setBearbeiten(!bearbeiten); }}>
                  {bearbeiten ? "Bearbeitung beenden" : "Daten ändern"}
                </button>
              )}
            </div>

            <StammdatenFormular sd={daten} setSd={setSd}
              schreiben={istGF && (bearbeiten || gewaehlt.status === "pruefung")} />

            {istGF && (bearbeiten || gewaehlt.status === "pruefung") && (
              <div className="mt-4">
                <Btn variante="hell" onClick={() => { setz(gewaehlt.id, { stammdaten: daten }); setBearbeiten(false); }}>
                  Änderungen speichern
                </Btn>
              </div>
            )}

            {gewaehlt.freigabe && (
              <p className="text-xs mt-4" style={{ color: C.muted }}>
                Freigegeben von {gewaehlt.freigabe.von} am {datum(gewaehlt.freigabe.datum)}
              </p>
            )}
          </div>
        )}

        {istGF && gewaehlt.status === "pruefung" && (
          <div className="rounded p-5" style={{ background: C.card, border: "1px solid " + C.strom }}>
            <div className="text-sm mb-3">Prüfung und Freigabe</div>
            <p className="text-sm mb-4" style={{ color: C.muted, maxWidth: "60ch" }}>
              Prüfe Gewerbeanmeldung, Ausweis und Bankverbindung auf Übereinstimmung mit der
              Firmierung. Nach der Freigabe kann nur noch die Geschäftsführung diese Daten ändern.
            </p>
            <label className="block mb-4">
              <span className="block text-xs mb-1" style={{ color: C.muted }}>
                Hinweis bei Nachbesserung
              </span>
              <textarea rows={3} value={hinweis} onChange={(e) => setHinweis(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded outline-none"
                style={{ border: "1px solid " + C.line }} />
            </label>
            <div className="flex flex-wrap gap-2">
              <Btn variante="ok" icon={Check} onClick={freigeben}>Freischalten</Btn>
              <Btn variante="gefahr" icon={RotateCcw} onClick={zurueckweisen} disabled={!hinweis.trim()}>
                Zur Nachbesserung zurück
              </Btn>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ---------- Liste ---------- */
  const zurPruefung = vertrieb.filter((m) => m.status === "pruefung");
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <p className="text-sm" style={{ color: C.muted, maxWidth: "52ch" }}>
          Neue Mitarbeiter werden hier angelegt und erhalten einen Einladungslink zur Registrierung.
        </p>
        <Btn icon={Plus} onClick={() => setNeu({ name: "", email: "", rolle: "Vertriebspartner", team: "", satz: 25, upline: null })}>
          Vertriebsmitarbeiter anlegen
        </Btn>
      </div>

      {istGF && zurPruefung.length > 0 && (
        <div className="rounded p-4 mb-5" style={{ background: "#F6F8FA", border: "1px solid " + C.strom }}>
          <span className="text-sm" style={{ color: C.strom }}>
            {zurPruefung.length} Stammdatensatz{zurPruefung.length === 1 ? "" : "-Sätze"} wartet auf deine Freigabe
          </span>
        </div>
      )}

      <div className="rounded overflow-hidden" style={{ background: C.card, border: "1px solid " + C.line }}>
        {vertrieb.map((m, i) => {
          const kopf = mitarbeiter.find((x) => x.id === m.upline);
          return (
            <button key={m.id} onClick={() => { setAuswahl(m.id); setSd(null); setBearbeiten(false); }}
              className="w-full text-left px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-2"
              style={{ borderTop: i ? "1px solid " + C.line : "none" }}>
              <Avatar m={m} size={34} />
              <div className="flex-1 min-w-40">
                <div className="text-sm">{m.name}</div>
                <div className="text-xs" style={{ color: C.muted }}>
                  {m.rolle} · {num(m.satz, 0)} % · {kopf ? "Struktur " + kopf.name : "ohne Strukturkopf"}
                </div>
              </div>
              <div className="w-44"><PartnerStatus status={m.status} /></div>
              <ChevronRight size={15} style={{ color: C.muted }} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* Registrierung über den Einladungslink: Passwort vergeben */
function Registrierung({ m, onFertig, onAbbruch }) {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const regeln = passwortRegeln(pw);
  const passt = regeln.every((r) => r.ok) && pw === pw2;

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
         style={{ background: C.ink, fontFamily: FONT }}>
      <div className="w-full max-w-md">
        <img src={LOGO} alt="EGC Energie" className="w-44 mx-auto mb-8" />
        <div className="rounded p-6" style={{ background: C.card }}>
          <h1 className="text-lg mb-1">Willkommen, {m.name}</h1>
          <p className="text-sm mb-5" style={{ color: C.muted }}>
            Vergib ein Passwort für deinen Zugang zum Vertriebsportal.
          </p>

          <div className="space-y-4">
            <Feld label="Passwort" type="password" value={pw} onChange={setPw} />
            <Feld label="Passwort wiederholen" type="password" value={pw2} onChange={setPw2} />
          </div>

          <div className="mt-4 space-y-1">
            {regeln.map((r) => (
              <div key={r.text} className="flex items-center gap-2 text-xs"
                   style={{ color: r.ok ? C.ok : C.muted }}>
                {r.ok ? <Check size={13} /> : <X size={13} />} {r.text}
              </div>
            ))}
            {pw2 && (
              <div className="flex items-center gap-2 text-xs" style={{ color: pw === pw2 ? C.ok : C.muted }}>
                {pw === pw2 ? <Check size={13} /> : <X size={13} />} Passwörter stimmen überein
              </div>
            )}
          </div>

          <div className="mt-6">
            <Btn icon={Check} onClick={() => onFertig(pw)} disabled={!passt}>
              Passwort setzen und anmelden
            </Btn>
          </div>
          <button className="text-xs mt-4" style={{ color: C.muted }} onClick={onAbbruch}>
            Zurück zur Anmeldung
          </button>
        </div>
      </div>
    </div>
  );
}

/* Login-Maske */
function Login({ mitarbeiter, onLogin, onCode }) {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [code, setCode] = useState("");
  const [fehler, setFehler] = useState("");
  const [modus, setModus] = useState("login");

  const anmelden = () => {
    const m = mitarbeiter.find((x) => (x.email || "").toLowerCase() === email.trim().toLowerCase());
    if (!m) return setFehler("Kein Zugang mit dieser E-Mail gefunden.");
    if (m.status === "eingeladen") return setFehler("Für diesen Zugang wurde noch kein Passwort vergeben. Bitte den Einladungslink nutzen.");
    if (m.passwort !== pw) return setFehler("Passwort stimmt nicht.");
    setFehler(""); onLogin(m.id);
  };

  const einloesen = () => {
    const m = mitarbeiter.find((x) => x.einladung && x.einladung === code.trim().toUpperCase());
    if (!m) return setFehler("Dieser Einladungscode ist ungültig oder bereits verwendet.");
    setFehler(""); onCode(m.id);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
         style={{ background: C.ink, fontFamily: FONT }}>
      <div className="w-full max-w-md">
        <img src={LOGO} alt="EGC Energie" className="w-44 mx-auto mb-8" />
        <div className="rounded p-6" style={{ background: C.card }}>
          <div className="flex gap-1 mb-5">
            {[["login", "Anmelden"], ["code", "Einladung einlösen"]].map(([id, label]) => (
              <button key={id} onClick={() => { setModus(id); setFehler(""); }}
                className="px-3 py-1.5 text-sm rounded"
                style={{
                  background: modus === id ? C.ink : "transparent",
                  color: modus === id ? "#fff" : C.muted,
                  border: "1px solid " + (modus === id ? C.ink : C.line),
                }}>{label}</button>
            ))}
          </div>

          {modus === "login" ? (
            <div className="space-y-4">
              <Feld label="E-Mail" value={email} onChange={setEmail} placeholder="name@egc-energie.de" />
              <Feld label="Passwort" type="password" value={pw} onChange={setPw} />
              <Btn onClick={anmelden} disabled={!email || !pw}>Anmelden</Btn>
            </div>
          ) : (
            <div className="space-y-4">
              <Feld label="Einladungscode aus deinem Link" value={code} onChange={setCode}
                placeholder="Code hinter ?code= im Link" />
              <Btn onClick={einloesen} disabled={!code}>Weiter zur Registrierung</Btn>
            </div>
          )}

          {fehler && <p className="text-sm mt-4" style={{ color: C.warn }}>{fehler}</p>}

          <p className="text-xs mt-6 pt-4" style={{ color: C.muted, borderTop: "1px solid " + C.line }}>
            {VERSION}<br /><br />
            Demo-Zugänge: karsten@egc-energie.de (Geschäftsführung), m.weber@egc-energie.de
            (Vertriebspartner), kalkulation@egc-energie.de. Passwort für alle: {DEMO_PASSWORT}
          </p>
        </div>
      </div>
    </div>
  );
}

/* Leads aus Social Media, Tippgebern oder Kaltakquise */
function Leads({ leads, setLeads, mitarbeiter, user, onUebernehmen, onGelesen }) {
  const [auswahl, setAuswahl] = useState(null);
  const [entwurf, setEntwurf] = useState(null);
  const [zieht, setZieht] = useState(null);
  const [ueber, setUeber] = useState(null);

  const [modus, setModus] = useState("kanban");
  const [zeitraum, setZeitraum] = useState("alle");
  const [tag, setTag] = useState(heute());
  const [quelle, setQuelle] = useState("alle");

  /* Sehen alle Leads: Leitung und Geschäftsführung.
     Anlegen darf jeder im Vertrieb, zuweisen an andere nur ab Teamleiter aufwärts. */
  const sichtAlle = ["Leitung Vertrieb", "Geschäftsführung"].includes(user.rolle);
  const darfAnlegen = ["Vertriebspartner", "Teamleiter", "Leitung Vertrieb", "Geschäftsführung"]
    .includes(user.rolle);
  const darfZuweisen = ["Teamleiter", "Leitung Vertrieb", "Geschäftsführung"].includes(user.rolle);
  const meineIds = user.rolle === "Teamleiter"
    ? [user.id, ...strukturUnter(user.id, mitarbeiter).map((m) => m.id)]
    : [user.id];
  const eigene = sichtAlle ? leads : leads.filter((l) => meineIds.includes(l.zugewiesen));
  const sichtbar = eigene.filter((l) =>
    imZeitraum(l.angelegt, zeitraum, tag) && (quelle === "alle" || l.quelle === quelle));
  const empfaenger = (sichtAlle
    ? mitarbeiter.filter((m) =>
        ["Vertriebspartner", "Teamleiter", "Leitung Vertrieb"].includes(m.rolle))
    : [user, ...strukturUnter(user.id, mitarbeiter)]
  ).filter((m) => m.status === "aktiv");
  const lead = leads.find((l) => l.id === auswahl);

  const setz = (id, aend) => setLeads(leads.map((l) => {
    if (l.id !== id) return l;
    const neu = { ...l, ...aend };
    if (aend.status === "auftrag" && !neu.abschlussAm) neu.abschlussAm = heute();
    if (aend.status && aend.status !== "auftrag") neu.abschlussAm = "";
    return neu;
  }));
  const oeffnen = (l) => {
    setAuswahl(l.id);
    if (!l.gelesen && l.zugewiesen === user.id) onGelesen(l.id);
  };

  const speichern = () => {
    const vorhanden = leads.some((l) => l.id === entwurf.id);
    const fertig = { ...entwurf };
    /* Wer nicht zuweisen darf, legt Leads für sich selbst an */
    if (!darfZuweisen && !fertig.zugewiesen) {
      fertig.zugewiesen = user.id;
      fertig.zugewiesenVon = user.name;
      fertig.zugewiesenAm = heute();
      fertig.gelesen = true;
    }
    if (fertig.zugewiesen === user.id) fertig.gelesen = true;
    if (fertig.zugewiesen && !fertig.zugewiesenAm) {
      fertig.zugewiesenVon = user.name;
      fertig.zugewiesenAm = heute();
      fertig.gelesen = false;
    }
    setLeads(vorhanden ? leads.map((l) => (l.id === fertig.id ? fertig : l)) : [fertig, ...leads]);
    setEntwurf(null);
  };

  /* ---------- Formular ---------- */
  if (entwurf) {
    const setF = (k, v) => setEntwurf({ ...entwurf, [k]: v });
    return (
      <div>
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => setEntwurf(null)} style={{ color: C.muted }}><ArrowLeft size={18} /></button>
          <h2 className="text-lg">{leads.some((l) => l.id === entwurf.id) ? "Lead bearbeiten" : "Neuen Lead einspielen"}</h2>
        </div>

        <div className="space-y-5">
          <div className="rounded p-5" style={{ background: C.card, border: "1px solid " + C.line }}>
            <div className="text-sm mb-4">Unternehmen und Ansprechpartner</div>
            <div className="grid sm:grid-cols-2 gap-4">
              <Feld label="Firma" value={entwurf.firma} onChange={(v) => setF("firma", v)} breit />
              <Feld label="Straße und Hausnummer" value={entwurf.strasse} onChange={(v) => setF("strasse", v)} breit />
              <Feld label="PLZ" value={entwurf.plz} onChange={(v) => setF("plz", v)} />
              <Feld label="Ort" value={entwurf.ort} onChange={(v) => setF("ort", v)} />
              <Feld label="Ansprechpartner" value={entwurf.ansprechpartner} onChange={(v) => setF("ansprechpartner", v)} />
              <Feld label="Position" value={entwurf.position} onChange={(v) => setF("position", v)} />
              <Feld label="Telefon" value={entwurf.telefon} onChange={(v) => setF("telefon", v)} />
              <Feld label="E-Mail" value={entwurf.email} onChange={(v) => setF("email", v)} />
            </div>
          </div>

          <div className="rounded p-5" style={{ background: C.card, border: "1px solid " + C.line }}>
            <div className="text-sm mb-4">Verbrauch und aktuelle Versorgung</div>
            <div className="grid sm:grid-cols-2 gap-4">
              <Feld label="Jahresverbrauch Strom in kWh" value={entwurf.verbrauchStrom}
                onChange={(v) => setF("verbrauchStrom", v.replace(/[^\d]/g, ""))} />
              <Feld label="Jahresverbrauch Erdgas in kWh" value={entwurf.verbrauchGas}
                onChange={(v) => setF("verbrauchGas", v.replace(/[^\d]/g, ""))} />
              <Feld label="Vertrag Strom läuft bis" type="date" value={entwurf.laufzeitStrom}
                onChange={(v) => setF("laufzeitStrom", v)} />
              <Feld label="Vertrag Erdgas läuft bis" type="date" value={entwurf.laufzeitGas}
                onChange={(v) => setF("laufzeitGas", v)} />
              <Feld label="Aktuelle Beschaffung" value={entwurf.beschaffung}
                onChange={(v) => setF("beschaffung", v)}
                placeholder="z. B. Festpreis über Stadtwerke seit 2024" breit />
            </div>
            <label className="flex items-center gap-3 text-sm mt-4">
              <input type="checkbox" checked={!!entwurf.dienstleister}
                onChange={(e) => setF("dienstleister", e.target.checked)} style={{ accentColor: C.ink }} />
              Kunde arbeitet bereits mit einem Energiedienstleister
            </label>
            {entwurf.dienstleister && (
              <div className="mt-4">
                <Feld label="Welcher Dienstleister?" value={entwurf.dienstleisterName}
                  onChange={(v) => setF("dienstleisterName", v)} />
              </div>
            )}
          </div>

          <div className="rounded p-5" style={{ background: C.card, border: "1px solid " + C.line }}>
            <div className="text-sm mb-4">Herkunft und Termin</div>
            <div className="grid sm:grid-cols-2 gap-4">
              <Select label="Lead generiert über" value={entwurf.quelle}
                onChange={(v) => setF("quelle", v)} options={LEAD_QUELLEN} />
              <Feld label="Details zur Herkunft" value={entwurf.quelleDetail}
                onChange={(v) => setF("quelleDetail", v)}
                placeholder="Kampagne, Tippgeber, Kontaktanlass" />
              <Feld label="Termin am" type="date" value={entwurf.terminDatum}
                onChange={(v) => setF("terminDatum", v)} />
              <Feld label="Uhrzeit" value={entwurf.terminZeit}
                onChange={(v) => setF("terminZeit", v)} placeholder="14:30" />
              <Select label="Terminform" value={entwurf.terminArt}
                onChange={(v) => setF("terminArt", v)} options={TERMINARTEN} breit />
            </div>
            <label className="block mt-4">
              <span className="block text-xs mb-1" style={{ color: C.muted }}>Bemerkungen</span>
              <textarea rows={3} value={entwurf.bemerkung} onChange={(e) => setF("bemerkung", e.target.value)}
                className="w-full px-3 py-2 text-sm rounded outline-none"
                style={{ border: "1px solid " + C.line }} />
            </label>
          </div>

          <div className="rounded p-5" style={{ background: C.card, border: "1px solid " + C.line }}>
            <div className="text-sm mb-1">Unterlagen</div>
            <p className="text-xs mb-4" style={{ color: C.muted }}>
              Versorgerabrechnungen, Lastgänge und alles Weitere als PDF, Excel oder CSV.
            </p>
            <div className="space-y-2 mb-3">
              {entwurf.dateien.map((d, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="flex-1 min-w-0"><DateiChip datei={d} /></div>
                  <button onClick={() => setF("dateien", entwurf.dateien.filter((_, x) => x !== i))}
                    style={{ color: C.muted }}><X size={15} /></button>
                </div>
              ))}
            </div>
            <label className="flex items-center gap-2 px-3 py-2 rounded text-sm cursor-pointer"
                   style={{ border: "1px dashed " + C.line, color: C.muted, background: "#fff" }}>
              <Upload size={14} /> Dateien hinzufügen
              <input type="file" multiple className="hidden"
                onChange={(e) => {
                  Array.from(e.target.files || []).forEach((f) =>
                    dateiLesen(f, (d) => setEntwurf((v) => ({ ...v, dateien: [...v.dateien, d] }))));
                }} />
            </label>
          </div>

          <div className="rounded p-5" style={{ background: C.card, border: "1px solid " + C.line }}>
            <div className="text-sm mb-4">Zuweisung</div>
            {!darfZuweisen ? (
              <p className="text-sm" style={{ color: C.muted }}>
                Der Lead läuft auf dich. Teamleiter und Vertriebsleitung sehen ihn in ihren Übersichten mit.
              </p>
            ) : (
            <Select label="Lead zuweisen an" value={entwurf.zugewiesen || ""}
              onChange={(v) => setF("zugewiesen", v || null)}
              options={[{ value: "", label: "Noch nicht zuweisen" },
                        ...empfaenger.map((m) => ({
                          value: m.id,
                          label: (m.id === user.id ? m.name + " (ich)" : m.name) + " · " + m.rolle + " · Team " + m.team,
                        }))]} />
            )}
            {darfZuweisen && (
              <p className="text-xs mt-2" style={{ color: C.muted }}>
                Der Empfänger sieht den Lead sofort in seiner Übersicht, markiert als neu.
                {!sichtAlle ? " Du kannst innerhalb deiner Struktur zuweisen." : ""}
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <Btn icon={Check} onClick={speichern} disabled={!entwurf.firma}>Lead speichern</Btn>
            <Btn variante="hell" onClick={() => setEntwurf(null)}>Abbrechen</Btn>
          </div>
        </div>
      </div>
    );
  }

  /* ---------- Einzelansicht ---------- */
  if (lead) {
    const inhaber = mitarbeiter.find((m) => m.id === lead.zugewiesen);
    const st = LEAD_STATUS[leadSpalte(lead)];
    const Zeile = ({ k, v }) => (
      <div className="flex justify-between gap-4 py-1.5 text-sm" style={{ borderBottom: "1px solid " + C.line }}>
        <span style={{ color: C.muted }}>{k}</span>
        <span className="text-right" style={{ fontVariantNumeric: "tabular-nums" }}>{v || "–"}</span>
      </div>
    );
    return (
      <div>
        <div className="flex items-center gap-3 mb-1">
          <button onClick={() => setAuswahl(null)} style={{ color: C.muted }}><ArrowLeft size={18} /></button>
          <h2 className="text-lg">{lead.firma}</h2>
          <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: st.color }}>
            <span className="w-2 h-2 rounded-full" style={{ background: st.color }} />{st.label}
          </span>
        </div>
        <p className="text-sm mb-4 ml-8" style={{ color: C.muted }}>
          {lead.id} · {lead.quelle}{lead.quelleDetail ? " · " + lead.quelleDetail : ""} · eingespielt {datum(lead.angelegt)}
        </p>

        <div className="rounded p-4 mb-5" style={{ background: C.card, border: "1px solid " + st.color }}>
          <div className="sm:max-w-xs">
            <Select label="Aktuelle Phase" value={leadSpalte(lead)}
              onChange={(v) => setz(lead.id, { status: v })}
              options={LEAD_SPALTEN.map((sp) => ({ value: sp.id, label: sp.label }))} />
          </div>
          {lead.abschlussAm && (
            <p className="text-xs mt-2" style={{ color: C.muted }}>
              Abschluss am {datum(lead.abschlussAm)} · {num(tageZwischen(lead.angelegt, lead.abschlussAm) || 0)} Tage nach Eingang
            </p>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            <div className="rounded p-5" style={{ background: C.card, border: "1px solid " + C.line }}>
              <div className="text-sm mb-3">Verbrauch und Versorgung</div>
              <div className="grid sm:grid-cols-2 gap-x-8">
                <Zeile k="Strom" v={lead.verbrauchStrom ? num(parseFloat(lead.verbrauchStrom)) + " kWh" : "–"} />
                <Zeile k="Erdgas" v={lead.verbrauchGas ? num(parseFloat(lead.verbrauchGas)) + " kWh" : "–"} />
                <Zeile k="Vertrag Strom bis" v={datum(lead.laufzeitStrom)} />
                <Zeile k="Vertrag Erdgas bis" v={datum(lead.laufzeitGas)} />
                <Zeile k="Aktuelle Beschaffung" v={lead.beschaffung} />
                <Zeile k="Dienstleister" v={lead.dienstleister ? (lead.dienstleisterName || "ja") : "keiner"} />
              </div>
            </div>

            <div className="rounded p-5" style={{ background: C.card, border: "1px solid " + C.line }}>
              <div className="text-sm mb-3">Termin</div>
              <div className="grid sm:grid-cols-2 gap-x-8">
                <Zeile k="Datum" v={lead.terminDatum ? datum(lead.terminDatum) + (lead.terminZeit ? ", " + lead.terminZeit + " Uhr" : "") : "noch offen"} />
                <Zeile k="Form" v={lead.terminArt} />
              </div>
              {lead.bemerkung && (
                <p className="text-sm mt-4 p-3 rounded" style={{ background: "#F6F8FA" }}>{lead.bemerkung}</p>
              )}
            </div>

            {lead.dateien.length > 0 && (
              <div className="rounded p-5" style={{ background: C.card, border: "1px solid " + C.line }}>
                <div className="text-sm mb-3">Unterlagen</div>
                <div className="space-y-2">
                  {lead.dateien.map((d, i) => <DateiChip key={i} datei={d} />)}
                </div>
              </div>
            )}

            <div className="rounded p-5" style={{ background: C.card, border: "1px solid " + C.line }}>
              <div className="flex flex-wrap gap-2">
                <Btn icon={Plus} onClick={() => { setz(lead.id, { status: "angebot" }); onUebernehmen(lead); }}>
                  Angebotsanfrage aus Lead erstellen
                </Btn>
                {(sichtAlle || lead.zugewiesen === user.id) && (
                  <Btn variante="hell" onClick={() => setEntwurf(lead)}>Lead bearbeiten</Btn>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded p-4" style={{ background: C.card, border: "1px solid " + C.line }}>
              <div className="text-sm mb-3">Kontakt</div>
              <Zeile k="Ansprechpartner" v={lead.ansprechpartner} />
              <Zeile k="Position" v={lead.position} />
              <Zeile k="Telefon" v={lead.telefon} />
              <Zeile k="E-Mail" v={lead.email} />
              <Zeile k="Anschrift" v={[lead.strasse, lead.plz + " " + lead.ort].filter(Boolean).join(", ")} />
            </div>

            <div className="rounded p-4" style={{ background: C.card, border: "1px solid " + C.line }}>
              <div className="text-sm mb-3">Zuweisung</div>
              {inhaber ? (
                <div className="flex items-center gap-3">
                  <Avatar m={inhaber} size={34} />
                  <div>
                    <div className="text-sm">{inhaber.name}</div>
                    <div className="text-xs" style={{ color: C.muted }}>
                      {inhaber.rolle} · von {lead.zugewiesenVon} am {datum(lead.zugewiesenAm)}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm" style={{ color: C.muted }}>Noch niemandem zugewiesen.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ---------- Kanban ---------- */
  const Karte = ({ l }) => {
    const inhaber = mitarbeiter.find((m) => m.id === l.zugewiesen);
    const neu = !l.gelesen && l.zugewiesen === user.id;
    const menge = (parseFloat(l.verbrauchStrom) || 0) + (parseFloat(l.verbrauchGas) || 0);
    return (
      <div
        draggable
        onDragStart={(e) => { setZieht(l.id); e.dataTransfer.effectAllowed = "move"; }}
        onDragEnd={() => setZieht(null)}
        className="rounded p-3 mb-2"
        style={{
          background: neu ? "#F1F7F0" : "#fff",
          border: "1px solid " + (neu ? C.ok : C.line),
          opacity: zieht === l.id ? 0.4 : 1,
          cursor: "grab",
        }}>
        <button onClick={() => oeffnen(l)} className="w-full text-left">
          <div className="text-sm flex items-start gap-2">
            <span className="flex-1">{l.firma}</span>
            {neu && <span className="text-xs px-1.5 rounded" style={{ background: C.ok, color: "#fff" }}>neu</span>}
          </div>
          <div className="text-xs mt-1" style={{ color: C.muted }}>
            {l.ort} · {l.quelle}
          </div>
          <div className="flex items-center justify-between mt-2 text-xs" style={{ color: C.muted }}>
            <span style={{ fontVariantNumeric: "tabular-nums" }}>{num(menge)} kWh</span>
            {l.terminDatum && <span>{datum(l.terminDatum)}</span>}
          </div>
          {inhaber && (sichtAlle || inhaber.id !== user.id) && (
            <div className="flex items-center gap-2 mt-2 pt-2" style={{ borderTop: "1px solid " + C.line }}>
              <Avatar m={inhaber} size={20} />
              <span className="text-xs truncate" style={{ color: C.muted }}>{inhaber.name}</span>
            </div>
          )}
        </button>

        <div className="mt-2">
          <select
            value={leadSpalte(l)}
            onChange={(e) => setz(l.id, { status: e.target.value })}
            className="w-full px-2 py-1 text-xs rounded outline-none"
            style={{ border: "1px solid " + C.line, color: C.muted, background: "#F6F8FA" }}>
            {LEAD_SPALTEN.map((sp) => (
              <option key={sp.id} value={sp.id}>{sp.label}</option>
            ))}
          </select>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex gap-1">
          {[["kanban", "Board"], ["liste", "Liste"], ["auswertung", "Auswertung"]].map(([id, label]) => (
            <button key={id} onClick={() => setModus(id)}
              className="px-3 py-1.5 text-sm rounded"
              style={{
                background: modus === id ? C.ink : "transparent",
                color: modus === id ? "#fff" : C.muted,
                border: "1px solid " + (modus === id ? C.ink : C.line),
              }}>{label}</button>
          ))}
        </div>
        {darfAnlegen && (
          <Btn icon={Plus} onClick={() => setEntwurf({
            ...leererLead(),
            quelle: darfZuweisen ? "Kaltakquise" : "Eigenakquise",
            zugewiesen: darfZuweisen ? null : user.id,
          })}>Lead anlegen</Btn>
        )}
      </div>

      <div className="rounded p-3 mb-5 grid sm:grid-cols-3 gap-3"
           style={{ background: C.card, border: "1px solid " + C.line }}>
        <Select label="Eingespielt im Zeitraum" value={zeitraum} onChange={setZeitraum} options={ZEITRAEUME} />
        {zeitraum === "tag" ? (
          <Feld label="Tag" type="date" value={tag} onChange={setTag} />
        ) : (
          <div className="hidden sm:block" />
        )}
        <Select label="Herkunft des Leads" value={quelle} onChange={setQuelle}
          options={[{ value: "alle", label: "Alle Quellen" }, ...LEAD_QUELLEN]} />
      </div>

      {modus === "auswertung" ? (
        <LeadAuswertung leads={sichtbar} mitarbeiter={mitarbeiter} user={user} darfAlles={sichtAlle} />
      ) : sichtbar.length === 0 ? (
        <div className="rounded p-8 text-center text-sm"
             style={{ border: "1px dashed " + C.line, color: C.muted }}>
          Keine Leads im gewählten Zeitraum.
        </div>
      ) : modus === "liste" ? (
        <div className="rounded overflow-hidden" style={{ background: C.card, border: "1px solid " + C.line }}>
          {[...sichtbar].sort((a, b) => (b.angelegt || "").localeCompare(a.angelegt || "")).map((l, i) => {
            const sp = LEAD_STATUS[leadSpalte(l)];
            const inhaber = mitarbeiter.find((m) => m.id === l.zugewiesen);
            const neuL = !l.gelesen && l.zugewiesen === user.id;
            return (
              <button key={l.id} onClick={() => oeffnen(l)}
                className="w-full text-left px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-1"
                style={{ borderTop: i ? "1px solid " + C.line : "none",
                         background: neuL ? "#F1F7F0" : "transparent" }}>
                <div className="flex-1 min-w-40">
                  <div className="text-sm flex items-center gap-2">
                    {l.firma}
                    {neuL && <span className="text-xs px-1.5 rounded" style={{ background: C.ok, color: "#fff" }}>neu</span>}
                  </div>
                  <div className="text-xs" style={{ color: C.muted }}>
                    {l.ort} · {l.quelle} · eingespielt {datum(l.angelegt)}
                    {inhaber && inhaber.id !== user.id ? " · " + inhaber.name : ""}
                  </div>
                </div>
                <div className="text-sm text-right w-28" style={{ fontVariantNumeric: "tabular-nums" }}>
                  {num((parseFloat(l.verbrauchStrom) || 0) + (parseFloat(l.verbrauchGas) || 0))} kWh
                </div>
                <span className="inline-flex items-center gap-1.5 text-xs w-36" style={{ color: sp.color }}>
                  <span className="w-2 h-2 rounded-full" style={{ background: sp.color }} />{sp.label}
                </span>
                <ChevronRight size={15} style={{ color: C.muted }} />
              </button>
            );
          })}
        </div>
      ) : (
        <div className="overflow-x-auto pb-2">
          <div className="flex gap-3" style={{ minWidth: LEAD_SPALTEN.length * 244 }}>
            {LEAD_SPALTEN.map((sp) => {
              const drin = sichtbar.filter((l) => leadSpalte(l) === sp.id);
              const menge = drin.reduce((t, l) =>
                t + (parseFloat(l.verbrauchStrom) || 0) + (parseFloat(l.verbrauchGas) || 0), 0);
              return (
                <div key={sp.id} className="flex-1 rounded p-2"
                  style={{
                    minWidth: 232,
                    background: ueber === sp.id ? "#E8EDF3" : "#F6F8FA",
                    border: "1px solid " + (ueber === sp.id ? sp.color : C.line),
                  }}
                  onDragOver={(e) => { e.preventDefault(); setUeber(sp.id); }}
                  onDragLeave={() => setUeber((x) => (x === sp.id ? null : x))}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (zieht) setz(zieht, { status: sp.id });
                    setZieht(null); setUeber(null);
                  }}>
                  <div className="px-2 py-2 mb-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: sp.color }} />
                      <span className="text-sm flex-1">{sp.label}</span>
                      <span className="text-xs" style={{ color: C.muted, fontVariantNumeric: "tabular-nums" }}>
                        {drin.length}
                      </span>
                    </div>
                    <div className="text-xs mt-1 ml-4" style={{ color: C.muted, fontVariantNumeric: "tabular-nums" }}>
                      {menge > 0 ? num(menge) + " kWh" : "–"}
                    </div>
                  </div>

                  {drin.map((l) => <Karte key={l.id} l={l} />)}

                  {drin.length === 0 && (
                    <div className="rounded px-2 py-6 text-center text-xs"
                         style={{ border: "1px dashed " + C.line, color: C.muted }}>
                      hierher ziehen
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* Auswertung: Termine, Abschlüsse, Quote und Dauer je Vertriebsmitarbeiter */
function LeadAuswertung({ leads, mitarbeiter, user, darfAlles }) {
  const kennzahlen = (menge) => {
    const termine = menge.filter((l) => l.terminDatum && l.terminDatum <= heute()).length;
    const auftrag = menge.filter((l) => leadSpalte(l) === "auftrag");
    const verloren = menge.filter((l) => leadSpalte(l) === "verloren").length;
    const dauern = auftrag.map((l) => tageZwischen(l.angelegt, l.abschlussAm)).filter((x) => x != null);
    return {
      leads: menge.length,
      termine,
      abschluesse: auftrag.length,
      verloren,
      quote: termine > 0 ? (auftrag.length / termine) * 100 : 0,
      dauer: dauern.length ? dauern.reduce((a, b) => a + b, 0) / dauern.length : null,
      menge: menge.reduce((t, l) =>
        t + (parseFloat(l.verbrauchStrom) || 0) + (parseFloat(l.verbrauchGas) || 0), 0),
    };
  };

  const personen = darfAlles
    ? mitarbeiter.filter((m) => ["Vertriebspartner", "Teamleiter", "Leitung Vertrieb"].includes(m.rolle))
    : user.rolle === "Teamleiter"
      ? [user, ...strukturUnter(user.id, mitarbeiter)]
      : [user];

  const zeilen = personen
    .map((m) => ({ m, k: kennzahlen(leads.filter((l) => l.zugewiesen === m.id)) }))
    .filter((z) => z.k.leads > 0)
    .sort((a, b) => b.k.abschluesse - a.k.abschluesse || b.k.quote - a.k.quote);

  const gesamt = kennzahlen(leads);

  const Kachel = ({ k, v, farbe }) => (
    <div className="rounded p-4" style={{ background: C.card, border: "1px solid " + C.line }}>
      <div className="text-xs mb-2" style={{ color: C.muted }}>{k}</div>
      <div className="text-2xl" style={{ color: farbe || C.text, fontVariantNumeric: "tabular-nums" }}>{v}</div>
    </div>
  );

  const Kopf = ({ children, rechts }) => (
    <th className={"px-3 py-2 text-xs font-normal " + (rechts ? "text-right" : "text-left")}
        style={{ color: C.muted, whiteSpace: "nowrap" }}>{children}</th>
  );
  const Zelle = ({ children, rechts, dick }) => (
    <td className={"px-3 py-2.5 text-sm " + (rechts ? "text-right" : "")}
        style={{ fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap",
                 borderTop: "1px solid " + C.line, fontWeight: dick ? 500 : 400 }}>{children}</td>
  );

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kachel k="Termine wahrgenommen" v={gesamt.termine} />
        <Kachel k="Abschlüsse" v={gesamt.abschluesse} farbe={C.ok} />
        <Kachel k="Verloren" v={gesamt.verloren} farbe={gesamt.verloren ? C.warn : C.text} />
        <Kachel k="Abschlussquote auf Termin" v={num(gesamt.quote, 0) + " %"} />
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <Kachel k="Ø Tage von Eingang bis Abschluss"
          v={gesamt.dauer != null ? num(gesamt.dauer, 0) : "–"} />
        <Kachel k="Menge in den Leads (kWh/Jahr)" v={num(gesamt.menge)} />
      </div>

      {zeilen.length > 0 && (
        <div className="rounded overflow-x-auto" style={{ background: C.card, border: "1px solid " + C.line }}>
          <table className="w-full" style={{ minWidth: 720 }}>
            <thead>
              <tr>
                <Kopf>Vertriebsmitarbeiter</Kopf>
                <Kopf rechts>Leads</Kopf>
                <Kopf rechts>Termine</Kopf>
                <Kopf rechts>Abschlüsse</Kopf>
                <Kopf rechts>Verloren</Kopf>
                <Kopf rechts>Quote</Kopf>
                <Kopf rechts>Ø Tage</Kopf>
              </tr>
            </thead>
            <tbody>
              {zeilen.map(({ m, k }) => (
                <tr key={m.id}>
                  <Zelle>
                    <span className="inline-flex items-center gap-2">
                      <Avatar m={m} size={26} />
                      <span>{m.name}
                        <span className="block text-xs" style={{ color: C.muted }}>
                          {m.rolle} · Team {m.team}
                        </span>
                      </span>
                    </span>
                  </Zelle>
                  <Zelle rechts>{k.leads}</Zelle>
                  <Zelle rechts>{k.termine}</Zelle>
                  <Zelle rechts>{k.abschluesse}</Zelle>
                  <Zelle rechts>{k.verloren}</Zelle>
                  <Zelle rechts dick>{num(k.quote, 0)} %</Zelle>
                  <Zelle rechts>{k.dauer != null ? num(k.dauer, 0) : "–"}</Zelle>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs" style={{ color: C.muted, maxWidth: "68ch" }}>
        Als Termin zählt ein Lead mit Termindatum, das nicht in der Zukunft liegt. Die Quote setzt
        Abschlüsse ins Verhältnis zu wahrgenommenen Terminen. Die Dauer misst die Tage vom Einspielen
        des Leads bis zum Verschieben in die Spalte Auftrag.
      </p>
    </div>
  );
}

/* Versorger, mit denen zusammengearbeitet wird */
function Versorgerliste({ versorger, setVersorger, user }) {
  const [name, setName] = useState("");
  const [notiz, setNotiz] = useState("");
  const darfAendern = user.rolle === "Geschäftsführung";

  const anlegen = () => {
    const sauber = name.trim();
    if (!sauber) return;
    if (versorger.some((v) => v.name.toLowerCase() === sauber.toLowerCase())) return;
    setVersorger([...versorger, { id: "v-" + uid(), name: sauber, notiz: notiz.trim() }]);
    setName(""); setNotiz("");
  };

  return (
    <div>
      <p className="text-sm mb-5" style={{ color: C.muted, maxWidth: "60ch" }}>
        Diese Liste erscheint beim Kalkulationsteam im Auswahlfeld, wenn ein Auftrag bestätigt wird.
        {darfAendern ? "" : " Ändern darf sie nur die Geschäftsführung."}
      </p>

      {darfAendern && (
        <div className="rounded p-4 mb-5" style={{ background: C.card, border: "1px solid " + C.line }}>
          <div className="grid sm:grid-cols-2 gap-4">
            <Feld label="Versorger" value={name} onChange={setName} placeholder="Name des Versorgers" />
            <Feld label="Notiz" value={notiz} onChange={setNotiz}
              placeholder="Konditionen, Ansprechpartner, Besonderheiten" />
          </div>
          <div className="mt-4">
            <Btn icon={Plus} onClick={anlegen} disabled={!name.trim()}>Versorger anlegen</Btn>
          </div>
        </div>
      )}

      <div className="rounded overflow-hidden" style={{ background: C.card, border: "1px solid " + C.line }}>
        <div className="px-4 py-3 text-sm" style={{ borderBottom: "1px solid " + C.line }}>
          {versorger.length} Versorger
        </div>
        {versorger.length === 0 && (
          <div className="px-4 py-4 text-sm" style={{ color: C.muted }}>Noch kein Versorger angelegt.</div>
        )}
        {versorger.map((v, i) => (
          <div key={v.id} className="flex items-center gap-4 px-4 py-3"
               style={{ borderTop: i ? "1px solid " + C.line : "none" }}>
            <div className="flex-1 min-w-0">
              <div className="text-sm">{v.name}</div>
              {v.notiz && <div className="text-xs" style={{ color: C.muted }}>{v.notiz}</div>}
            </div>
            {darfAendern && (
              <button onClick={() => setVersorger(versorger.filter((x) => x.id !== v.id))}
                style={{ color: C.muted }} title="Entfernen">
                <Trash2 size={15} />
              </button>
            )}
          </div>
        ))}
      </div>

      {darfAendern && (
        <p className="text-xs mt-4" style={{ color: C.muted, maxWidth: "60ch" }}>
          Ein entfernter Versorger verschwindet nur aus der Auswahl. Bereits bestätigte Aufträge
          behalten ihren Eintrag, damit die Historie stimmt.
        </p>
      )}
    </div>
  );
}

/* Schulungen, Dokumente und Marketingunterlagen */
function Ablage({ ablage, setAblage, user, start }) {
  const [bereich, setBereich] = useState(start || "dokumente");
  const [entwurf, setEntwurf] = useState(null);
  const darfPflegen = ["Leitung Vertrieb", "Geschäftsführung"].includes(user.rolle);
  const aktuell = ABLAGE_BEREICHE.find((b) => b.id === bereich);
  const drin = ablage.filter((d) => d.bereich === bereich);

  const speichern = () => {
    const vorhanden = ablage.some((d) => d.id === entwurf.id);
    const fertig = { ...entwurf, von: entwurf.von || user.name };
    setAblage(vorhanden ? ablage.map((d) => (d.id === fertig.id ? fertig : d)) : [fertig, ...ablage]);
    setEntwurf(null);
  };

  if (entwurf) {
    const setF = (k, v) => setEntwurf({ ...entwurf, [k]: v });
    return (
      <div>
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => setEntwurf(null)} style={{ color: C.muted }}><ArrowLeft size={18} /></button>
          <h2 className="text-lg">{ablage.some((d) => d.id === entwurf.id) ? "Unterlage bearbeiten" : "Unterlage hinzufügen"}</h2>
        </div>
        <div className="rounded p-5 space-y-4" style={{ background: C.card, border: "1px solid " + C.line }}>
          <div className="grid sm:grid-cols-2 gap-4">
            <Feld label="Titel" value={entwurf.titel} onChange={(v) => setF("titel", v)} breit />
            <Select label="Bereich" value={entwurf.bereich} onChange={(v) => setF("bereich", v)}
              options={ABLAGE_BEREICHE.map((b) => ({ value: b.id, label: b.label }))} />
            <Select label="Art" value={entwurf.art} onChange={(v) => setF("art", v)} options={ABLAGE_ARTEN} />
          </div>
          <label className="block">
            <span className="block text-xs mb-1" style={{ color: C.muted }}>Beschreibung</span>
            <textarea rows={2} value={entwurf.beschreibung} onChange={(e) => setF("beschreibung", e.target.value)}
              className="w-full px-3 py-2 text-sm rounded outline-none"
              style={{ border: "1px solid " + C.line }} />
          </label>
          <div className="grid sm:grid-cols-2 gap-4">
            <Datei label="Datei" datei={entwurf.datei} onSet={(f) => setF("datei", f)} hinweis="Datei auswählen" />
            <Feld label="Oder Link (z. B. Online-Schulung)" value={entwurf.url}
              onChange={(v) => setF("url", v)} placeholder="https://" />
          </div>
          <div className="flex gap-2 pt-2">
            <Btn icon={Check} onClick={speichern} disabled={!entwurf.titel}>Speichern</Btn>
            <Btn variante="hell" onClick={() => setEntwurf(null)}>Abbrechen</Btn>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex gap-1 flex-wrap">
          {ABLAGE_BEREICHE.map((b) => (
            <button key={b.id} onClick={() => setBereich(b.id)}
              className="px-3 py-1.5 text-sm rounded"
              style={{
                background: bereich === b.id ? C.ink : "transparent",
                color: bereich === b.id ? "#fff" : C.muted,
                border: "1px solid " + (bereich === b.id ? C.ink : C.line),
              }}>
              {b.label} <span style={{ opacity: 0.6 }}>{ablage.filter((d) => d.bereich === b.id).length}</span>
            </button>
          ))}
        </div>
        {darfPflegen && (
          <Btn icon={Plus} onClick={() => setEntwurf(leererEintrag(bereich))}>Unterlage hinzufügen</Btn>
        )}
      </div>

      <p className="text-sm mb-5" style={{ color: C.muted, maxWidth: "60ch" }}>{aktuell.text}</p>

      {drin.length === 0 ? (
        <div className="rounded p-8 text-center text-sm"
             style={{ border: "1px dashed " + C.line, color: C.muted }}>
          {bereich === "schulung"
            ? "Die Schulungsunterlagen werden hier eingestellt, sobald sie fertig sind."
            : "Noch keine Unterlagen in diesem Bereich."}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {drin.map((d) => (
            <div key={d.id} className="rounded p-4 flex flex-col"
                 style={{ background: C.card, border: "1px solid " + C.line }}>
              <div className="flex items-start gap-3">
                <span className="rounded p-2" style={{ background: "#F6F8FA" }}>
                  <FileText size={18} style={{ color: d.url ? C.gruen : C.strom }} />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm">{d.titel}</div>
                  <div className="text-xs" style={{ color: C.muted }}>
                    {d.art}{d.datei ? " · " + d.datei.name : ""}
                  </div>
                </div>
              </div>

              {d.beschreibung && (
                <p className="text-sm mt-3" style={{ color: C.muted }}>{d.beschreibung}</p>
              )}

              <div className="flex items-center gap-2 mt-4 pt-3"
                   style={{ borderTop: "1px solid " + C.line }}>
                {d.url ? (
                  <a href={d.url} target="_blank" rel="noreferrer"
                     className="inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded"
                     style={{ background: C.ink, color: "#fff" }}>
                    <Send size={14} /> Öffnen
                  </a>
                ) : d.datei && d.datei.url ? (
                  <div className="flex gap-2">
                    <button onClick={() => dateiOeffnen(d.datei)}
                            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded"
                            style={{ background: C.ink, color: "#fff" }}>
                      <FileText size={14} /> Öffnen
                    </button>
                    <button onClick={() => dateiLaden(d.datei)}
                            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded"
                            style={{ border: "1px solid " + C.line, color: C.text }}>
                      <Upload size={14} style={{ transform: "rotate(180deg)" }} /> Speichern
                    </button>
                  </div>
                ) : (
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded"
                        style={{ border: "1px solid " + C.line, color: C.muted }}>
                    <Paperclip size={14} /> keine Datei hinterlegt
                  </span>
                )}
                <span className="flex-1" />
                {darfPflegen && (
                  <>
                    <button className="text-xs" style={{ color: C.strom }}
                      onClick={() => setEntwurf(d)}>bearbeiten</button>
                    <button className="text-xs" style={{ color: C.muted }}
                      onClick={() => setAblage(ablage.filter((x) => x.id !== d.id))}>entfernen</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* Kundenübersicht: laufende Verträge mit Menge und Provision je Sparte */
function Kunden({ anfragen, leads, mitarbeiter, user, onOeffnen, onLead }) {
  const [bereich, setBereich] = useState("meine");
  const istTL = user.rolle === "Teamleiter";
  const vollsicht = ["Geschäftsführung", "Leitung Vertrieb"].includes(user.rolle);
  const ids = bereichIds(user, mitarbeiter, bereich);
  const liste = imBereich(anfragen, ids)
    .filter((a) => a.status === "abgeschlossen" && a.kalkulation)
    .sort((x, y) => (x.kunde.firma || "").localeCompare(y.kunde.firma || ""));

  const basis = (a) => (vollsicht ? gesamtprovision(a) : anteilVon(a, user.id, mitarbeiter));
  /* Provision je Sparte: spartenreine Varianten zählen direkt,
     gemischte Varianten werden nach Menge aufgeteilt */
  const jeSparte = (a, medium) => {
    const vs = gewaehlte(a).length ? gewaehlte(a) : varianten(a).slice(0, 1);
    const faktor = vollsicht ? 1 : (gesamtprovision(a) > 0 ? basis(a) / gesamtprovision(a) : 0);
    return vs.reduce((t, v) => {
      const p = provisionVariante(a, v) * faktor;
      if ((v.sparte || "beide") === medium) return t + p;
      if ((v.sparte || "beide") !== "beide") return t;
      const g = verbrauchGesamt(a);
      return t + (g > 0 ? (p * verbrauchMedium(a, medium)) / g : 0);
    }, 0);
  };
  const sum = (f) => liste.reduce((t, a) => t + f(a), 0);

  const Kopf = ({ children, rechts }) => (
    <th className={"px-3 py-2 text-xs font-normal " + (rechts ? "text-right" : "text-left")}
        style={{ color: C.muted, whiteSpace: "nowrap" }}>{children}</th>
  );
  const Zelle = ({ children, rechts, dick }) => (
    <td className={"px-3 py-2.5 text-sm " + (rechts ? "text-right" : "")}
        style={{ fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap",
                 borderTop: "1px solid " + C.line, fontWeight: dick ? 500 : 400 }}>{children}</td>
  );

  return (
    <div>
      {istTL && <Umschalter bereich={bereich} setBereich={setBereich} />}
      <p className="text-sm mb-4" style={{ color: C.muted, maxWidth: "60ch" }}>
        {vollsicht
          ? "Alle laufenden Verträge mit Gesamtprovision je Lieferjahr."
          : "Deine laufenden Verträge mit deiner Provision je Lieferjahr."}
      </p>

      {liste.length === 0 ? (
        <div className="rounded p-8 text-center text-sm"
             style={{ border: "1px dashed " + C.line, color: C.muted }}>
          Noch keine abgeschlossenen Kunden. Angenommene Angebote erscheinen hier.
        </div>
      ) : (
        <div className="rounded overflow-x-auto" style={{ background: C.card, border: "1px solid " + C.line }}>
          <table className="w-full" style={{ minWidth: 860 }}>
            <thead>
              <tr>
                <Kopf>Kunde</Kopf>
                <Kopf>Laufzeit</Kopf>
                <Kopf>Vertragsende</Kopf>
                <Kopf rechts>kWh Strom</Kopf>
                <Kopf rechts>kWh Erdgas</Kopf>
                <Kopf rechts>Provision Strom</Kopf>
                <Kopf rechts>Provision Erdgas</Kopf>
                <Kopf rechts>Gesamt</Kopf>
              </tr>
            </thead>
            <tbody>
              {liste.map((a) => {
                const va = aktiveVariante(a);
                const ende = va ? enddatum(va) : null;
                return (
                  <tr key={a.id} onClick={() => onOeffnen(a.id)} style={{ cursor: "pointer" }}>
                    <Zelle>
                      {a.kunde.firma}
                      <span className="block text-xs" style={{ color: C.muted }}>
                        {a.kunde.ort}{vollsicht || bereich === "team" ? " · " + a.partnerName : ""}
                      </span>
                    </Zelle>
                    <Zelle>{laufzeitVon(a)} Monate
                      <span className="block text-xs" style={{ color: C.muted }}>
                        {va && va.lieferbeginn ? "ab " + datum(va.lieferbeginn) : va ? va.produkt : ""}
                      </span>
                    </Zelle>
                    <Zelle>{ende ? datum(ende) : "offen"}</Zelle>
                    <Zelle rechts>{verbrauchMedium(a, "strom") ? num(verbrauchMedium(a, "strom")) : "–"}</Zelle>
                    <Zelle rechts>{verbrauchMedium(a, "gas") ? num(verbrauchMedium(a, "gas")) : "–"}</Zelle>
                    <Zelle rechts>{verbrauchMedium(a, "strom") ? eur(jeSparte(a, "strom")) : "–"}</Zelle>
                    <Zelle rechts>{verbrauchMedium(a, "gas") ? eur(jeSparte(a, "gas")) : "–"}</Zelle>
                    <Zelle rechts dick>{eur(basis(a))}</Zelle>
                  </tr>
                );
              })}
              <tr style={{ background: "#F6F8FA" }}>
                <Zelle dick>{liste.length} Kunden</Zelle>
                <Zelle />
                <Zelle />
                <Zelle rechts>{num(sum((a) => verbrauchMedium(a, "strom")))}</Zelle>
                <Zelle rechts>{num(sum((a) => verbrauchMedium(a, "gas")))}</Zelle>
                <Zelle rechts>{eur(sum((a) => jeSparte(a, "strom")))}</Zelle>
                <Zelle rechts>{eur(sum((a) => jeSparte(a, "gas")))}</Zelle>
                <Zelle rechts dick>{eur(sum(basis))}</Zelle>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {(() => {
        const anbahnung = (leads || [])
          .filter((l) => ["angebot", "verhandlung", "auftrag"].includes(leadSpalte(l)))
          .filter((l) => vollsicht || (ids ? ids.includes(l.zugewiesen) : l.zugewiesen === user.id));
        if (anbahnung.length === 0) return null;
        return (
          <div className="mt-8">
            <div className="flex items-baseline justify-between mb-3">
              <span className="text-sm">In Anbahnung aus Leads</span>
              <span className="text-xs" style={{ color: C.muted }}>
                ab Angebotsphase, noch ohne Vertrag
              </span>
            </div>
            <div className="rounded overflow-hidden" style={{ background: C.card, border: "1px solid " + C.line }}>
              {anbahnung.map((l, i) => {
                const sp = LEAD_STATUS[leadSpalte(l)];
                const inhaber = mitarbeiter.find((m) => m.id === l.zugewiesen);
                return (
                  <button key={l.id} onClick={() => onLead && onLead()}
                    className="w-full text-left px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-1"
                    style={{ borderTop: i ? "1px solid " + C.line : "none" }}>
                    <div className="flex-1 min-w-40">
                      <div className="text-sm">{l.firma}</div>
                      <div className="text-xs" style={{ color: C.muted }}>
                        {l.ort} · {l.quelle}
                        {vollsicht && inhaber ? " · " + inhaber.name : ""}
                      </div>
                    </div>
                    <div className="text-sm text-right w-28" style={{ fontVariantNumeric: "tabular-nums" }}>
                      {num(parseFloat(l.verbrauchStrom) || 0)} kWh
                    </div>
                    <div className="text-sm text-right w-28" style={{ fontVariantNumeric: "tabular-nums" }}>
                      {num(parseFloat(l.verbrauchGas) || 0)} kWh
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-xs w-36" style={{ color: sp.color }}>
                      <span className="w-2 h-2 rounded-full" style={{ background: sp.color }} />{sp.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

/* Welche Vorgänge gehören zum gewählten Bereich? null = alle */
function bereichIds(user, mitarbeiter, bereich) {
  if (["Leitung Vertrieb", "Geschäftsführung", "Kalkulation", "Vertragsmanagement"].includes(user.rolle))
    return null;
  if (user.rolle === "Teamleiter" && bereich === "team")
    return [user.id, ...strukturUnter(user.id, mitarbeiter).map((m) => m.id)];
  return [user.id];
}

const imBereich = (anfragen, ids) => (ids ? anfragen.filter((a) => ids.includes(a.partnerId)) : anfragen);

function Umschalter({ bereich, setBereich }) {
  return (
    <div className="flex gap-1 mb-5">
      {[["meine", "Meine Übersicht"], ["team", "Vertriebsteam"]].map(([id, label]) => (
        <button key={id} onClick={() => setBereich(id)}
          className="px-3 py-1.5 text-sm rounded"
          style={{
            background: bereich === id ? C.ink : "transparent",
            color: bereich === id ? "#fff" : C.muted,
            border: "1px solid " + (bereich === id ? C.ink : C.line),
          }}>
          {label}
        </button>
      ))}
    </div>
  );
}

/* Rangliste nach vermittelter Provision je Lieferjahr */
function Rangliste({ titel, zeilen, hinweis }) {
  const max = Math.max(...zeilen.map((z) => z.wert), 1);
  return (
    <div className="rounded overflow-hidden" style={{ background: C.card, border: "1px solid " + C.line }}>
      <div className="flex items-baseline justify-between px-4 py-3" style={{ borderBottom: "1px solid " + C.line }}>
        <span className="text-sm">{titel}</span>
        {hinweis && <span className="text-xs" style={{ color: C.muted }}>{hinweis}</span>}
      </div>
      {zeilen.length === 0 && (
        <div className="px-4 py-4 text-sm" style={{ color: C.muted }}>Noch keine Abschlüsse.</div>
      )}
      {zeilen.map((z, i) => (
        <div key={z.id} className="px-4 py-3" style={{ borderTop: i ? "1px solid " + C.line : "none" }}>
          <div className="flex items-center gap-3">
            <span className="text-sm w-6 text-center"
                  style={{ color: i < 3 ? C.ok : C.muted, fontVariantNumeric: "tabular-nums" }}>
              {i + 1}
            </span>
            {z.person && <Avatar m={z.person} size={30} />}
            <span className="flex-1 min-w-0">
              <span className="text-sm block truncate">{z.name}</span>
              <span className="text-xs" style={{ color: C.muted }}>{z.unten}</span>
            </span>
            <span className="text-sm" style={{ fontVariantNumeric: "tabular-nums" }}>{eur(z.wert)}</span>
          </div>
          <div className="mt-2 h-1 rounded" style={{ background: "#EDEFF2" }}>
            <div className="h-1 rounded"
                 style={{ width: Math.max(2, (z.wert / max) * 100) + "%",
                          background: i === 0 ? C.gruen : C.inkSoft }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function Dashboard({ anfragen, mitarbeiter, user, onOeffnen }) {
  const [bereich, setBereich] = useState("meine");
  const istTL = user.rolle === "Teamleiter";
  const ids = bereichIds(user, mitarbeiter, bereich);
  const menge_ = imBereich(anfragen, ids);

  const vollsicht = ["Geschäftsführung", "Leitung Vertrieb"].includes(user.rolle);
  const sichtFirma = user.rolle === "Geschäftsführung";
  const geld = !["Kalkulation", "Vertragsmanagement"].includes(user.rolle);
  const struktur = vollsicht || (istTL && bereich === "team");

  const z = {
    eingang: menge_.filter((a) => a.status === "eingereicht").length,
    klaer: menge_.filter((a) => a.status === "klaerfall").length,
    angebot: menge_.filter((a) => a.status === "angebot").length,
    fix: menge_.filter((a) => a.status === "abgeschlossen").length,
  };
  const fixe = menge_.filter((a) => a.status === "abgeschlossen" && a.kalkulation);
  const kwh = fixe.reduce((t, a) => t + verbrauchGesamt(a), 0);
  const prov = fixe.reduce(
    (t, a) => t + (vollsicht ? gesamtprovision(a) : anteilVon(a, user.id, mitarbeiter)), 0);
  const beiFirma = fixe.reduce(
    (t, a) => t + verteilung(gesamtprovision(a), a.partnerId, mitarbeiter).firma, 0);
  const quote = z.angebot + z.fix > 0 ? (z.fix / (z.angebot + z.fix)) * 100 : 0;

  const Kachel = ({ k, v, farbe }) => (
    <div className="rounded p-4" style={{ background: C.card, border: "1px solid " + C.line }}>
      <div className="text-xs mb-2" style={{ color: C.muted }}>{k}</div>
      <div className="text-2xl" style={{ color: farbe || C.text, fontVariantNumeric: "tabular-nums" }}>{v}</div>
    </div>
  );

  const Karte = ({ titel, children }) => (
    <div className="rounded overflow-hidden" style={{ background: C.card, border: "1px solid " + C.line }}>
      <div className="px-4 py-3 text-sm" style={{ borderBottom: "1px solid " + C.line }}>{titel}</div>
      {children}
    </div>
  );

  const Reihe = ({ i, links, unten, rechts, klick }) => (
    <div onClick={klick} className="flex items-center gap-4 px-4 py-3 text-sm"
         style={{ borderTop: i ? "1px solid " + C.line : "none", cursor: klick ? "pointer" : "default" }}>
      <span className="flex-1">{links}
        {unten && <span className="block text-xs" style={{ color: C.muted }}>{unten}</span>}
      </span>
      <span style={{ fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{rechts}</span>
    </div>
  );

  const wartend = menge_.filter((a) => a.status === "eingereicht")
    .sort((x, y) => x.angelegt.localeCompare(y.angelegt));
  const meineOffen = menge_.filter((a) => ["klaerfall", "angebot"].includes(a.status));

  return (
    <div className="space-y-5">
      {istTL && <Umschalter bereich={bereich} setBereich={setBereich} />}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kachel k="Bei Kalkulation" v={z.eingang} farbe={C.strom} />
        <Kachel k="Klärfälle" v={z.klaer} farbe={z.klaer ? C.warn : C.text} />
        <Kachel k="Angebote beim Kunden" v={z.angebot} farbe={C.ok} />
        <Kachel k="Abschlüsse" v={z.fix} />
      </div>

      <div className={"grid gap-3 " + (geld ? (sichtFirma ? "sm:grid-cols-4" : "sm:grid-cols-3") : "sm:grid-cols-2")}>
        <Kachel k="Vermittelte Menge (kWh/Jahr)" v={num(kwh)} />
        {geld && (
          <Kachel k={vollsicht ? "Gesamtprovision (€/Jahr)" : "Deine Provision (€/Jahr)"}
            v={num(prov, 2)} farbe={vollsicht ? C.text : C.ok} />
        )}
        {geld && sichtFirma && <Kachel k="davon Firma (€/Jahr)" v={num(beiFirma, 2)} farbe={C.ok} />}
        <Kachel k="Abschlussquote" v={num(quote, 0) + " %"} />
      </div>

      {struktur && (() => {
        const kandidaten = mitarbeiter.filter((u) =>
          ids ? ids.includes(u.id) : ["Vertriebspartner", "Teamleiter"].includes(u.rolle));
        const personen = kandidaten.map((u) => {
          const abg = anfragen.filter((a) =>
            a.partnerId === u.id && a.status === "abgeschlossen" && a.kalkulation);
          return {
            id: u.id, person: u, name: u.name,
            wert: abg.reduce((t, a) => t + (vollsicht ? gesamtprovision(a) : anteilVon(a, u.id, mitarbeiter)), 0),
            menge: abg.reduce((t, a) => t + verbrauchGesamt(a), 0),
            abschluesse: abg.length,
            team: u.team,
          };
        }).map((z) => ({ ...z, unten: z.abschluesse + " Abschlüsse · " + num(z.menge) + " kWh" }))
          .sort((a, b) => b.wert - a.wert);

        const teams = {};
        personen.forEach((z) => {
          const t = z.team || "-";
          if (!teams[t]) teams[t] = { id: t, name: "Team " + t, wert: 0, menge: 0, abschluesse: 0, koepfe: 0 };
          teams[t].wert += z.wert; teams[t].menge += z.menge;
          teams[t].abschluesse += z.abschluesse; teams[t].koepfe += 1;
        });
        const teamZeilen = Object.values(teams)
          .map((t) => ({ ...t, unten: t.koepfe + " Mitarbeiter · " + t.abschluesse + " Abschlüsse · " + num(t.menge) + " kWh" }))
          .sort((a, b) => b.wert - a.wert);

        return (
          <div className="space-y-5">
            {vollsicht && teamZeilen.length > 1 && (
              <Rangliste titel="Ranking Vertriebsteams" zeilen={teamZeilen}
                hinweis="Gesamtprovision je Lieferjahr" />
            )}
            <Rangliste
              titel={istTL ? "Ranking meiner Vertriebspartner" : "Ranking Vertriebsmitarbeiter"}
              zeilen={personen}
              hinweis={vollsicht ? "Gesamtprovision je Lieferjahr" : "Provisionsanteil je Lieferjahr"} />
          </div>
        );
      })()}

      {user.rolle === "Kalkulation" && (
        <Karte titel="Wartet auf Kalkulation">
          {wartend.length === 0 && <div className="px-4 py-4 text-sm" style={{ color: C.muted }}>Nichts offen.</div>}
          {wartend.map((a, i) => (
            <Reihe key={a.id} i={i} links={a.kunde.firma}
              unten={a.id + " · " + a.partnerName + " · " + num(verbrauchGesamt(a)) + " kWh"}
              rechts={"seit " + datum(a.angelegt)} klick={() => onOeffnen(a.id)} />
          ))}
        </Karte>
      )}

      {user.rolle === "Vertragsmanagement" && (
        <Karte titel="Verträge nach Status">
          {["Vertrag zu erstellen", "Vertrag versendet", "Vertrag unterschrieben",
            "Beim Versorger eingereicht", "Lieferung aktiv"].map((st, i) => (
            <Reihe key={st} i={i} links={st}
              rechts={anfragen.filter((a) => a.status === "abgeschlossen" && (a.vertragsStatus || "Vertrag zu erstellen") === st).length} />
          ))}
        </Karte>
      )}

      {!struktur && geld && (
        <Karte titel="Was gerade offen ist">
          {meineOffen.length === 0 && (
            <div className="px-4 py-4 text-sm" style={{ color: C.muted }}>
              Nichts offen. Alle Vorgänge sind entweder in Kalkulation oder abgeschlossen.
            </div>
          )}
          {meineOffen.map((a, i) => (
            <Reihe key={a.id} i={i} links={a.kunde.firma}
              unten={a.id + " · " + (a.status === "klaerfall" ? "Daten fehlen" : "Angebot liegt beim Kunden")}
              rechts={a.status === "angebot" ? eur(anteilVon(a, user.id, mitarbeiter)) : ""}
              klick={() => onOeffnen(a.id)} />
          ))}
        </Karte>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  App                                                                */
/* ------------------------------------------------------------------ */
export default function App() {
  const [anfragen, setAnfragen] = useState(seed());
  const [mitarbeiter, setMitarbeiter] = useState(USERS);
  const [leads, setLeads] = useState(seedLeads());
  const [ablage, setAblage] = useState(seedAblage());
  const [versorger, setVersorger] = useState(VERSORGER);
  const [userId, setUserId] = useState(null);
  const [registriert, setRegistriert] = useState(null);
  const [ansicht, setAnsicht] = useState("anfragen");
  const [offen, setOffen] = useState(null);
  const [tab, setTab] = useState("offen");
  const [entwurf, setEntwurf] = useState(null);
  const [geladen, setGeladen] = useState(false);
  const [menu, setMenu] = useState(false);

  const user = mitarbeiter.find((u) => u.id === userId) || null;

  useEffect(() => {
    (async () => {
      try {
        const r = await window.storage.get("egc-crm:anfragen");
        if (r && r.value) setAnfragen(JSON.parse(r.value));
        try {
          const m = await window.storage.get("egc-crm:mitarbeiter");
          if (m && m.value) setMitarbeiter(JSON.parse(m.value));
        } catch (e2) { /* Standardsätze */ }
        try {
          const l = await window.storage.get("egc-crm:leads");
          if (l && l.value) setLeads(JSON.parse(l.value));
        } catch (e3) { /* Demo-Leads */ }
        try {
          const d = await window.storage.get("egc-crm:ablage");
          if (d && d.value) setAblage(JSON.parse(d.value));
        } catch (e4) { /* Standardunterlagen */ }
        try {
          const vs = await window.storage.get("egc-crm:versorger");
          if (vs && vs.value) setVersorger(JSON.parse(vs.value));
        } catch (e5) { /* Standardversorger */ }
      } catch (e) { /* erster Start: Demodaten */ }
      setGeladen(true);
    })();
  }, []);

  useEffect(() => {
    if (!geladen) return;
    (async () => {
      try {
        await window.storage.set("egc-crm:anfragen", JSON.stringify(anfragen));
        await window.storage.set("egc-crm:mitarbeiter", JSON.stringify(mitarbeiter));
        await window.storage.set("egc-crm:leads", JSON.stringify(leads));
        await window.storage.set("egc-crm:ablage", JSON.stringify(ablage));
        await window.storage.set("egc-crm:versorger", JSON.stringify(versorger));
      } catch (e) { /* Speichern nicht verfügbar */ }
    })();
  }, [anfragen, mitarbeiter, leads, ablage, versorger, geladen]);

  const speichern = (a) =>
    setAnfragen((prev) => (prev.some((x) => x.id === a.id)
      ? prev.map((x) => (x.id === a.id ? a : x)) : [a, ...prev]));

  const einreichen = (a) => {
    speichern({
      ...a, status: "eingereicht", fehlend: [], fehlendText: "",
      verlauf: [...a.verlauf, {
        d: heute(),
        t: a.verlauf.length ? "Unterlagen ergänzt und erneut eingereicht" : "Anfrage eingereicht",
        w: user.name,
      }],
    });
    setAnsicht("anfragen"); setTab("offen"); setEntwurf(null);
  };

  const neueLeads = user ? leads.filter((l) => l.zugewiesen === user.id && !l.gelesen).length : 0;

  const ausLead = (l) => {
    const a = leereAnfrage(user);
    a.kunde = {
      firma: l.firma, strasse: l.strasse, plz: l.plz, ort: l.ort,
      ansprechpartner: l.ansprechpartner, email: l.email, telefon: l.telefon,
    };
    const stellen = [];
    if (parseFloat(l.verbrauchStrom) > 0)
      stellen.push({ ...leereLieferstelle("strom"), bezeichnung: "Hauptstandort",
        strasse: l.strasse, plz: l.plz, ort: l.ort, verbrauch: l.verbrauchStrom });
    if (parseFloat(l.verbrauchGas) > 0)
      stellen.push({ ...leereLieferstelle("gas"), bezeichnung: "Hauptstandort",
        strasse: l.strasse, plz: l.plz, ort: l.ort, verbrauch: l.verbrauchGas });
    if (stellen.length) a.lieferstellen = stellen;
    a.wunschLieferbeginn = l.laufzeitStrom || l.laufzeitGas || "";
    a.beratungHinweis = l.bemerkung || "";
    setEntwurf(a);
    setAnsicht("neu");
  };

  const meine = user ? anfragen.filter((a) => a.partnerId === user.id) : [];
  const rolle = user ? user.rolle : "Vertriebspartner";

  const NAV = {
    Vertriebspartner: [
      { id: "dashboard", label: "Übersicht", icon: BarChart3 },
      { id: "neu", label: "Neue Anfrage", icon: Plus },
      { id: "anfragen", label: "Meine Anfragen", icon: Inbox },
      { id: "leads", label: "Meine Leads", icon: Users, badge: neueLeads },
      { id: "kunden", label: "Meine Kunden", icon: FileSignature },
      { id: "provisionen", label: "Provisionen", icon: Wallet },
      { id: "unterlagen", label: "Unterlagen", icon: FileText },
      { id: "meine-daten", label: "Meine Stammdaten", icon: Users },
    ],
    Kalkulation: [
      { id: "dashboard", label: "Übersicht", icon: BarChart3 },
      { id: "eingang", label: "Eingang", icon: Calculator },
      { id: "versorger", label: "Versorgerbestätigung ausstehend", icon: FileSignature },
      { id: "alle", label: "Alle Vorgänge", icon: Inbox },
      { id: "versorgerliste", label: "Versorger", icon: Zap },
      { id: "unterlagen", label: "Unterlagen", icon: FileText },
    ],
    Teamleiter: [
      { id: "dashboard", label: "Übersicht", icon: BarChart3 },
      { id: "neu", label: "Neue Anfrage", icon: Plus },
      { id: "anfragen", label: "Meine Anfragen", icon: Inbox },
      { id: "alle", label: "Team-Vorgänge", icon: Users },
      { id: "leads", label: "Meine Leads", icon: Inbox, badge: neueLeads },
      { id: "kunden", label: "Kunden im Team", icon: FileSignature },
      { id: "provisionen", label: "Meine Provisionen", icon: Wallet },
      { id: "unterlagen", label: "Unterlagen", icon: FileText },
      { id: "meine-daten", label: "Meine Stammdaten", icon: Users },
    ],
    "Leitung Vertrieb": [
      { id: "dashboard", label: "Übersicht", icon: BarChart3 },
      { id: "neu", label: "Neue Anfrage", icon: Plus },
      { id: "anfragen", label: "Meine Anfragen", icon: Inbox },
      { id: "alle", label: "Alle Vorgänge", icon: Inbox },
      { id: "leads", label: "Leads", icon: Users, badge: neueLeads },
      { id: "kunden", label: "Alle Kunden", icon: FileSignature },
      { id: "provisionen", label: "Provisionen", icon: Wallet },
      { id: "partner", label: "Vertriebsmitarbeiter", icon: Users },
      { id: "versorgerliste", label: "Versorger", icon: Zap },
      { id: "unterlagen", label: "Unterlagen", icon: FileText },
      { id: "meine-daten", label: "Meine Stammdaten", icon: FileSignature },
    ],
    Vertragsmanagement: [
      { id: "dashboard", label: "Übersicht", icon: BarChart3 },
      { id: "vertraege", label: "Verträge", icon: FileSignature },
      { id: "alle", label: "Alle Vorgänge", icon: Inbox },
      { id: "unterlagen", label: "Unterlagen", icon: FileText },
    ],
    Geschäftsführung: [
      { id: "dashboard", label: "Übersicht", icon: BarChart3 },
      { id: "alle", label: "Alle Vorgänge", icon: Inbox },
      { id: "leads", label: "Leads", icon: Users, badge: neueLeads },
      { id: "ruecksprachen", label: "Rücksprachen", icon: AlertTriangle },
      { id: "kunden", label: "Alle Kunden", icon: FileSignature },
      { id: "provisionen", label: "Provisionen gesamt", icon: Wallet },
      { id: "partner", label: "Vertriebsmitarbeiter", icon: Users },
      { id: "versorgerliste", label: "Versorger", icon: Zap },
      { id: "unterlagen", label: "Unterlagen", icon: FileText },
    ],
  }[rolle];

  useEffect(() => {
    setOffen(null); setEntwurf(null);
    if (!userId) return;
    const m = mitarbeiter.find((x) => x.id === userId);
    setAnsicht(m && ["registriert", "abgelehnt", "pruefung"].includes(m.status) ? "meine-daten" : NAV[0].id);
  }, [userId]);

  const aktuell = anfragen.find((a) => a.id === offen);

  const TABS = [
    { id: "offen", label: "Offene Anfragen", f: (a) => ["entwurf", "eingereicht", "ruecksprache"].includes(a.status) },
    { id: "angebote", label: "Angebote", f: (a) => a.status === "angebot" },
    { id: "klaer", label: "Klärfälle", f: (a) => a.status === "klaerfall" },
    { id: "uebermittelt", label: "Auftrag an Versorger übermittelt", f: (a) => a.status === "uebermittelt" },
    { id: "bestaetigt", label: "Bestätigte Kunden", f: (a) => a.status === "bestaetigt" },
    { id: "fix", label: "Abgeschlossene Kunden", f: (a) => a.status === "abgeschlossen" },
  ];

  const sichtbar =
    rolle === "Teamleiter" && user ? anfragen.filter((a) => a.team === user.team) : anfragen;

  /* Registrierung über den Einladungslink */
  if (registriert) {
    const m = mitarbeiter.find((x) => x.id === registriert);
    if (m)
      return (
        <Registrierung m={m}
          onFertig={(pw) => {
            setMitarbeiter(mitarbeiter.map((x) =>
              x.id === m.id ? { ...x, passwort: pw, status: "registriert", einladung: null } : x));
            setRegistriert(null);
            setUserId(m.id);
          }}
          onAbbruch={() => setRegistriert(null)} />
      );
  }

  /* Anmeldung */
  if (!user)
    return (
      <Login mitarbeiter={mitarbeiter}
        onLogin={(id) => setUserId(id)}
        onCode={(id) => setRegistriert(id)} />
    );

  const gesperrt = ["registriert", "abgelehnt", "pruefung"].includes(user.status);

  let inhalt;
  if (gesperrt) {
    inhalt = <MeineStammdaten user={user} mitarbeiter={mitarbeiter} setMitarbeiter={setMitarbeiter} />;
  } else if (aktuell) {
    inhalt = (
      <Detail a={aktuell} user={user} mitarbeiter={mitarbeiter} versorger={versorger}
        onZurueck={() => setOffen(null)} onUpdate={(a) => speichern(a)}
        onBearbeiten={(a) => { setOffen(null); setEntwurf(a); }} />
    );
  } else if (ansicht === "neu" || entwurf) {
    inhalt = (
      <Assistent user={user} mitarbeiter={mitarbeiter} entwurf={entwurf}
        onSpeichern={(a) => { speichern(a); setEntwurf(null); setAnsicht("anfragen"); setTab("offen"); }}
        onSenden={einreichen}
        onAbbrechen={() => { setEntwurf(null); setAnsicht("anfragen"); }} />
    );
  } else if (ansicht === "anfragen") {
    const t = TABS.find((x) => x.id === tab);
    inhalt = (
      <div>
        <div className="flex flex-wrap gap-1 mb-5">
          {TABS.map((x) => {
            const n = meine.filter(x.f).length;
            return (
              <button key={x.id} onClick={() => setTab(x.id)}
                className="px-3 py-1.5 text-sm rounded"
                style={{
                  background: tab === x.id ? C.ink : "transparent",
                  color: tab === x.id ? "#fff" : C.muted,
                  border: "1px solid " + (tab === x.id ? C.ink : C.line),
                }}>
                {x.label} {n > 0 && <span style={{ opacity: 0.7 }}>{n}</span>}
              </button>
            );
          })}
        </div>
        <Liste
          anfragen={meine.filter(t.f)}
          leerText={
            tab === "uebermittelt" ? "Hier stehen Aufträge, die beim Versorger eingereicht sind."
            : tab === "bestaetigt" ? "Bestätigte Aufträge, bei denen noch die Provision aussteht."
            : tab === "klaer" ? "Keine offenen Klärfälle. Gut so."
            : tab === "angebote" ? "Sobald die Kalkulation ein Angebot zurückschickt, erscheint es hier."
            : tab === "fix" ? "Noch keine abgeschlossenen Kunden."
            : "Noch keine Anfragen. Leg mit „Neue Anfrage“ los."
          }
          onOeffnen={(id) => {
            const a = anfragen.find((x) => x.id === id);
            if (a.status === "entwurf") setEntwurf(a);
            else setOffen(id);
          }}
        />
      </div>
    );
  } else if (ansicht === "eingang") {
    inhalt = (
      <Liste anfragen={anfragen.filter((a) => a.status === "eingereicht")}
        leerText="Keine neuen Anfragen im Eingang." onOeffnen={setOffen} />
    );
  } else if (ansicht === "versorger") {
    inhalt = (
      <Liste anfragen={anfragen.filter((a) => a.status === "uebermittelt")}
        leerText="Keine Aufträge in der Versorgerbestätigung." onOeffnen={setOffen} />
    );
  } else if (ansicht === "vertraege") {
    inhalt = (
      <Liste anfragen={anfragen.filter((a) => ["bestaetigt", "abgeschlossen"].includes(a.status))}
        leerText="Noch keine Verträge zu bearbeiten." onOeffnen={setOffen} />
    );
  } else if (ansicht === "provisionen") {
    inhalt = <Provisionen anfragen={sichtbar} mitarbeiter={mitarbeiter} user={user} />;
  } else if (ansicht === "dashboard") {
    inhalt = <Dashboard anfragen={anfragen} mitarbeiter={mitarbeiter} user={user} onOeffnen={setOffen} />;
  } else if (ansicht === "ruecksprachen") {
    inhalt = (
      <Liste anfragen={anfragen.filter((a) => a.status === "ruecksprache")}
        leerText="Keine offenen Rücksprachen." onOeffnen={setOffen} />
    );
  } else if (ansicht === "kunden") {
    inhalt = <Kunden anfragen={anfragen} leads={leads} mitarbeiter={mitarbeiter} user={user}
               onOeffnen={setOffen} onLead={() => setAnsicht("leads")} />;
  } else if (ansicht === "leads") {
    inhalt = (
      <Leads leads={leads} setLeads={setLeads} mitarbeiter={mitarbeiter} user={user}
        onUebernehmen={ausLead}
        onGelesen={(id) => setLeads(leads.map((l) => (l.id === id ? { ...l, gelesen: true } : l)))} />
    );
  } else if (ansicht === "versorgerliste") {
    inhalt = <Versorgerliste versorger={versorger} setVersorger={setVersorger} user={user} />;
  } else if (ansicht === "unterlagen") {
    inhalt = <Ablage ablage={ablage} setAblage={setAblage} user={user} />;
  } else if (ansicht === "partner") {
    inhalt = <Partnerverwaltung mitarbeiter={mitarbeiter} setMitarbeiter={setMitarbeiter} user={user} />;
  } else if (ansicht === "meine-daten") {
    inhalt = <MeineStammdaten user={user} mitarbeiter={mitarbeiter} setMitarbeiter={setMitarbeiter} />;
  } else {
    inhalt = <Liste anfragen={sichtbar} leerText="Keine Vorgänge." onOeffnen={setOffen} />;
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row"
         style={{ background: C.paper, color: C.text, fontFamily: FONT }}>
      {/* Seitenleiste, auf dem Handy als einklappbare Kopfzeile */}
      <aside className="lg:w-64 shrink-0 lg:px-4 lg:py-5" style={{ background: C.ink, color: "#fff" }}>
        {/* Kopfzeile mobil */}
        <div className="flex items-center gap-3 px-4 py-3 lg:px-0 lg:py-0 lg:block lg:mb-6">
          <img src={LOGO} alt="EGC Energie" className="w-28 lg:w-48" />
          <div className="hidden lg:block text-xs mt-2" style={{ color: "#8B9BB0" }}>Vertriebsportal</div>

          <span className="flex-1 lg:hidden" />

          <button onClick={() => setMenu(!menu)} className="lg:hidden flex items-center gap-2 px-3 py-2 rounded"
            style={{ background: C.inkSoft, color: "#fff" }}>
            {menu ? <X size={18} /> : <Menu size={18} />}
            <span className="text-sm">{menu ? "Schließen" : "Menü"}</span>
            {!menu && neueLeads > 0 && (
              <span className="text-xs px-1.5 rounded-full"
                    style={{ background: C.gruen, color: "#0A1626" }}>{neueLeads}</span>
            )}
          </button>
        </div>

        {/* Alles Weitere: mobil nur bei geöffnetem Menü */}
        <div className={(menu ? "block" : "hidden") + " lg:block px-4 pb-4 lg:px-0 lg:pb-0"}>
          <div className="flex items-center gap-3 mb-3">
            <Avatar m={user} size={38} />
            <div className="flex-1 min-w-0">
              <div className="text-sm truncate">{user.name}</div>
              <div className="text-xs truncate" style={{ color: "#8B9BB0" }}>{user.rolle}</div>
            </div>
            <button onClick={() => setUserId(null)} title="Abmelden" style={{ color: "#8B9BB0" }}>
              <ArrowLeft size={16} />
            </button>
          </div>

          <nav className="lg:block">
            {(gesperrt ? [] : NAV).map((n) => (
              <button key={n.id}
                onClick={() => { setAnsicht(n.id); setOffen(null); setEntwurf(null); setMenu(false); }}
                className="flex items-center gap-2.5 px-3 py-2 rounded text-sm w-full"
                style={{
                  background: ansicht === n.id && !offen ? C.inkSoft : "transparent",
                  color: ansicht === n.id && !offen ? "#fff" : "#93A4B8",
                }}>
                <n.icon size={15} />
                <span className="flex-1 text-left">{n.label}</span>
                {n.badge > 0 && (
                  <span className="text-xs px-1.5 rounded-full"
                        style={{ background: C.gruen, color: "#0A1626" }}>{n.badge}</span>
                )}
              </button>
            ))}
          </nav>

          <select value={userId} onChange={(e) => { setUserId(e.target.value); setMenu(false); }}
            className="w-full mt-5 px-3 py-2 text-xs rounded outline-none"
            style={{ background: C.inkSoft, color: "#8B9BB0", border: "1px solid " + C.inkLine }}>
            {mitarbeiter.map((u) => (
              <option key={u.id} value={u.id}>Demo-Ansicht: {u.rolle} · {u.name}</option>
            ))}
          </select>

          <p className="text-xs mt-4" style={{ color: "#5C6E85" }}>{VERSION}</p>
          {gesperrt && (
            <p className="text-xs mt-2" style={{ color: "#8B9BB0" }}>
              Das Portal wird freigeschaltet, sobald deine Stammdaten geprüft sind.
            </p>
          )}
        </div>
      </aside>

      {/* Inhalt */}
      <main className="flex-1 px-4 sm:px-8 py-5 lg:py-6 max-w-6xl w-full">{inhalt}</main>
    </div>
  );
}
