// Dev-only utility for merging externally-researched factual data (TomTom or
// any other source) into data/places.json safely — never wired into the app,
// the build, or GitHub Pages. Run manually:
//
//   node tools/enrich-places.mjs path/to/candidates.json
//
// candidates.json is a plain array you prepare yourself (e.g. copied out of a
// TomTom lookup done in a chat session, or any other research pass) — this
// script never calls any API and needs no key. Each candidate looks like:
//   { "n": "Exact or close place name", "lat": -8.67, "lng": 115.16,
//     "ph": "+62...", "r": 4.8, "rc": 120, "oh": [600,1320],
//     "u": "https://maps...", "source": "tomtom" }
// Only "n" is required; every other field is optional — provide whatever the
// source actually gave you.
//
// What it does, per the DATA ENRICHMENT ARCHITECTURE rule (external source ->
// normalize -> validate -> duplicate check -> compare -> update only approved
// fields -> preserve editorial fields -> save):
//   1. Matches each candidate against existing places by (a) normalized exact
//      name, (b) phone (digits-only), (c) coordinate proximity (<80m) — in
//      that order. A match is required for anything other than the safest
//      no-op: no match found -> the candidate is written to
//      tools/enrich-review.json for a human to look at, NEVER auto-inserted
//      as a new place (no unreviewed TomTom result becomes a JALAN place).
//   2. On a match, updates ONLY the whitelisted factual fields below, and
//      only fills a field that's currently empty/null — it never overwrites
//      an existing value, so a later, less-complete source can't clobber a
//      better one. Editorial fields (desc, cats, tags, res, warnings, etc.)
//      are never touched by this script, full stop — they aren't even in
//      the whitelist.
//   3. Records src="<source>" and verAt="<today, UTC date>" on every place it
//      touches, so it's always visible where a fact came from and when it
//      was last checked.
//   4. Validates candidate coordinates fall inside Bali's bounding box before
//      accepting them; rejects (and reports) anything outside it.
//
// This never runs automatically — not on `npm start`, not in the build, not
// in CI. It's a manual step a developer runs when they have new researched
// data ready to merge.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const placesPath = join(root, "data", "places.json");
const reviewPath = join(root, "tools", "enrich-review.json");

const FACTUAL_WHITELIST = ["lat", "lng", "ph", "r", "rc", "oh", "u"];
const BALI_BOUNDS = { minLat: -9.5, maxLat: -8.0, minLng: 114.4, maxLng: 115.8 };

const candFile = process.argv[2];
if (!candFile) {
  console.error("Usage: node tools/enrich-places.mjs path/to/candidates.json");
  process.exit(1);
}
if (!existsSync(candFile)) {
  console.error(`Not found: ${candFile}`);
  process.exit(1);
}

const norm = s => (s || "").toLowerCase().normalize("NFKD").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const digits = s => (s || "").replace(/\D+/g, "");
const haversineKm = (a, b) => {
  const R = 6371, toRad = x => x * Math.PI / 180;
  const dLat = toRad(b[0] - a[0]), dLng = toRad(b[1] - a[1]);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
};

const places = JSON.parse(readFileSync(placesPath, "utf-8"));
const candidates = JSON.parse(readFileSync(candFile, "utf-8"));

function findMatch(cand) {
  const cn = norm(cand.n);
  let m = places.find(p => norm(p.n) === cn);
  if (m) return { place: m, via: "name" };
  const cph = digits(cand.ph);
  if (cph) {
    m = places.find(p => p.ph && digits(p.ph) === cph);
    if (m) return { place: m, via: "phone" };
  }
  if (typeof cand.lat === "number" && typeof cand.lng === "number") {
    m = places.find(p => typeof p.lat === "number" &&
      haversineKm([p.lat, p.lng], [cand.lat, cand.lng]) < 0.08);
    if (m) return { place: m, via: "coordinates" };
  }
  return null;
}

const unmatched = [];
let updated = 0, fieldsFilled = 0, rejectedOutOfBounds = 0;

for (const cand of candidates) {
  if (!cand.n) { unmatched.push({ candidate: cand, reason: "missing name" }); continue; }
  if (typeof cand.lat === "number" && typeof cand.lng === "number") {
    const { minLat, maxLat, minLng, maxLng } = BALI_BOUNDS;
    if (cand.lat < minLat || cand.lat > maxLat || cand.lng < minLng || cand.lng > maxLng) {
      rejectedOutOfBounds++;
      unmatched.push({ candidate: cand, reason: "coordinates outside Bali bounding box" });
      continue;
    }
  }
  const match = findMatch(cand);
  if (!match) { unmatched.push({ candidate: cand, reason: "no confident match — needs manual review" }); continue; }
  const { place } = match;
  let touched = false;
  for (const field of FACTUAL_WHITELIST) {
    const val = cand[field];
    if (val == null) continue;
    const current = place[field];
    const isEmpty = current == null || current === "" || (Array.isArray(current) && !current.length);
    if (isEmpty) { place[field] = val; fieldsFilled++; touched = true; }
  }
  if (touched) {
    place.src = cand.source || "external";
    place.verAt = new Date().toISOString().slice(0, 10);
    updated++;
  }
}

writeFileSync(placesPath, JSON.stringify(places, null, 1));
if (unmatched.length) writeFileSync(reviewPath, JSON.stringify(unmatched, null, 1));

console.log(`Updated ${updated} existing place(s), filled ${fieldsFilled} empty field(s).`);
if (rejectedOutOfBounds) console.log(`Rejected ${rejectedOutOfBounds} candidate(s) outside Bali's bounding box.`);
if (unmatched.length) {
  console.log(`${unmatched.length} candidate(s) had no confident match — written to tools/enrich-review.json for manual review (NOT auto-added as new places).`);
} else if (existsSync(reviewPath)) {
  writeFileSync(reviewPath, "[]");
}
console.log("Next: run `node tools/build-data.mjs` to regenerate data/places.generated.js.");
