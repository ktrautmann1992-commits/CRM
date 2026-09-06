import { mkdir, cp, rm, writeFile } from "node:fs/promises";
import { execSync } from "node:child_process";

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

await cp("index.html", "dist/index.html");
await writeFile(
  "dist/_headers",
  "/*\n  X-Frame-Options: SAMEORIGIN\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n"
);

console.log("Build fertig: dist/");
