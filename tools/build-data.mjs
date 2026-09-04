// Generates data/places.generated.js from data/places.json.
// Run: node tools/build-data.mjs
// The generated file is committed so the static site needs no build step to run,
// but data/places.json remains the single source of truth for editing/validation.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const src = join(root, "data", "places.json");
const out = join(root, "data", "places.generated.js");

const places = JSON.parse(readFileSync(src, "utf-8"));

const ids = new Set();
const errors = [];
const warnings = [];
places.forEach((p, i) => {
  if (!p.n) errors.push(`#${i}: missing name (n)`);
  if (typeof p.lat !== "number" || typeof p.lng !== "number") warnings.push(`#${i} (${p.n}): missing coordinates — will be excluded from distance/map features`);
  if (!p.k) errors.push(`#${i} (${p.n}): missing kind (k)`);
  const id = p.n;
  if (ids.has(id)) errors.push(`#${i}: duplicate place name used as id: "${id}"`);
  ids.add(id);
});
if (warnings.length) {
  console.warn(`Data quality warnings (${warnings.length}) — not blocking, pre-existing data gaps:`);
  warnings.forEach(w => console.warn(" - " + w));
}
if (errors.length) {
  console.error(`Data validation failed with ${errors.length} issue(s):`);
  errors.forEach(e => console.error(" - " + e));
  process.exit(1);
}

const banner = "// AUTO-GENERATED FILE — do not edit directly.\n" +
  "// Source of truth: data/places.json — edit that file, then run `node tools/build-data.mjs`.\n";
writeFileSync(out, banner + `const PLACES = ${JSON.stringify(places)};\n`);
console.log(`OK: wrote ${out} with ${places.length} places (0 validation issues).`);
