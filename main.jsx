import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";

/* Speicher-Anbindung: im Browser über localStorage.
   Dieselbe API wie in der Vorschau, damit die App unverändert bleibt. */
if (!window.storage) {
  const key = (k) => "egc:" + k;
  window.storage = {
    async get(k) {
      const v = localStorage.getItem(key(k));
      if (v === null) throw new Error("not found");
      return { key: k, value: v };
    },
    async set(k, value) {
      localStorage.setItem(key(k), value);
      return { key: k, value };
    },
    async delete(k) {
      localStorage.removeItem(key(k));
      return { key: k, deleted: true };
    },
    async list(prefix = "") {
      const keys = Object.keys(localStorage)
        .filter((x) => x.startsWith("egc:"))
        .map((x) => x.slice(4))
        .filter((x) => x.startsWith(prefix));
      return { keys, prefix };
    },
  };
}

createRoot(document.getElementById("root")).render(<App />);
