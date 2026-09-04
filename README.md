# JALAN — جالان

"وين نروح اليوم؟" — a fast decision tool for where to go in Bali right now
(restaurants, cafés, beach clubs, sports, hotels, sights), not a general directory.

## Tech stack

Plain HTML/CSS/JS, no build tool, no framework. Chosen deliberately: the
original app was a single working HTML file with zero dependencies beyond
two CDN scripts (Leaflet for the map, Google Fonts). This migration keeps
that model — it's the "smallest safe migration path" out of a monolithic
file, not a rewrite into a different stack. A framework/TypeScript/bundler
migration is a real option for later, but it's a separate decision with its
own cost (build pipeline, hosting change, retraining) and is intentionally
out of scope here.

- No npm dependencies for the app itself (`tools/build-data.mjs` is a
  zero-dependency Node script, used only to regenerate `data/places.generated.js`).
- Runs by opening `index.html` directly or serving the folder with any
  static file server.

## Project structure

```
index.html                    shell markup (header, nav, sheet containers)
css/styles.css                all styling (extracted verbatim from the original file)
data/places.json              canonical place data — edit this file
data/places.generated.js      generated from places.json — do not hand-edit
js/app.js                     all app logic (rendering, filters, search, planner, map, favorites)
tools/build-data.mjs          regenerates places.generated.js from places.json, with validation
```

This replaces the original 997-line single `.html` file that had markup,
~1000 lines of CSS, all JS logic, and a 215-record inline JSON array all in
one `<script>` tag. The split is a pure extraction — no rendering, filtering,
or scoring logic was rewritten in this pass.

## Running locally

```
python3 -m http.server 8080
# open http://localhost:8080
```

Any static server works. There is no dev server, watch mode, or build step
for day-to-day work — edit `css/styles.css` / `js/app.js` / `index.html` and
reload.

## Editing place data

1. Edit `data/places.json` (see fields below).
2. Run `node tools/build-data.mjs` to regenerate `data/places.generated.js`
   and validate the data (fails the build on missing name/kind or duplicate
   IDs; warns, but does not fail, on missing coordinates since some existing
   records don't have them yet).
3. Reload the page.

### Place data model

Each place is one JSON object (field names are short — this mirrors the
original data as-is, not renamed, to avoid a data migration in this pass):

| field | meaning |
|---|---|
| `n` | name (used as the stable ID — see "Known limitations") |
| `o` | alternate/original name shown as "saved as" |
| `a` | area/region (e.g. Canggu, Ubud) |
| `c` | category label shown in the UI (Arabic) |
| `k` | category key (e.g. `cafe`, `padel`, `gym`) — drives icon/color and section membership |
| `r`, `rc` | rating, review count |
| `p` | price band (`$`–`$$$$`) or `null` if unknown |
| `lat`, `lng` | coordinates (map/distance). `null` if unknown — 1 record currently has none |
| `u` | Google Maps URL |
| `ph` | phone / WhatsApp number |
| `b`, `l`, `d`, `br` | meal-time flags: breakfast, lunch, dinner, brunch |
| `res` | booking recommended |
| `act` | booking required |
| `desc` | Arabic description, may include warnings inline (⚠️, 💰, 📅 markers) |

## Categories today

Sections group category keys (`SECTIONS` in `js/app.js`): food, beach,
activities & sports, stay, spa, shop, sights. "Activities & sports" today
lumps padel, boxing, surf, adventure, culture, family, and gym into one flat
list — this is one of the items flagged for the sports-category-architecture
phase described in the product brief (Padel/Gym/Tennis/Pilates/CrossFit/HYROX
etc. as independent categories with their own data fields). There is currently
no separate Drinks hierarchy (coffee/matcha/smoothies/protein) — cafés exist
as one `cafe` kind.

## Known fixes made in this pass

- **Favorites/Visited/Notes persistence was broken outside the original
  hosting sandbox.** The original code called `window.storage.get/set`, an
  API injected by that sandbox — it does not exist in a normal browser, so
  every favorite/visited/note silently failed to save. `js/app.js` now
  installs a small shim (`localStorage`-backed) that provides the same
  `{get(key), set(key, value)}` async interface only when no host
  implementation is already present. Verified in a real browser: star a
  place, reload, it's still starred.

## Known limitations (not fixed in this pass — flagging per "don't invent data/functionality")

- **AI menu translation calls `https://api.anthropic.com/v1/messages`
  directly from the browser with no API key and no backend.** This will
  fail (no auth, and the Anthropic API does not support unauthenticated
  browser calls) outside the original sandbox that intercepted the request.
  The failure is already handled gracefully in the UI (falls back to a
  "Search Google" link), so nothing is broken further, but the feature
  itself needs a small backend proxy holding a real API key before it can
  work in production. Not something to fix by embedding a key in client code.
- **Place IDs are the display name (`n`), not a stable synthetic ID.**
  Renaming a place in the data changes its favorite/visited/note key. Works
  today because names are unique (validated by `tools/build-data.mjs`), but
  a stable `id` field is recommended before this data set grows much more.
- One place (`SUNSET BEACH BALI | Seminyak Beach`) has no coordinates in the
  source data — pre-existing gap, not invented or removed.

## Data audit (current codebase, not the brief's reference numbers)

| metric | count |
|---|---|
| total places | 215 |
| places with a phone/WhatsApp number (`ph`) | 191 |
| places with booking recommended (`res`) | 122 |
| places with booking required (`act`) | 20 |
| places with an explicit booking-warning flag (`b`) | 60 |

These match the brief's places/phone counts exactly. The brief's "95 booking
warnings" doesn't map onto a single field as-is — `res` (122) and `act` (20)
together are the closest equivalents; flagging the discrepancy here rather
than guessing which the brief meant.

## What this pass did not touch (by design — see PR/commit description for the phased plan)

Recommendation engine, planner logic, drinks/sports category re-architecture,
TypeScript/schema types, automated tests, and a build pipeline are all real
gaps against the full product brief, but are separate, larger phases — not
safe to bundle into one pass on top of a from-scratch audit. See the final
report in the PR description for the phase-by-phase plan.
