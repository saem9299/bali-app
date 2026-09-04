# JALAN — جالان

"وين نروح اليوم؟" — a fast decision tool for where to go in Bali right now
(restaurants, cafés, drinks, sports, beach clubs, hotels, sights), not a
general directory.

## Tech stack

Plain HTML/CSS/JS, no build tool, no framework. Chosen deliberately: the
source app was a single working HTML file with zero dependencies beyond two
CDN includes (Leaflet for the map, Google Fonts). This migration keeps that
model — it's the "smallest safe migration path" out of a monolithic file,
not a rewrite into a different stack. A framework/TypeScript/bundler
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
css/styles.css                all styling (extracted verbatim from the source file)
data/places.json              canonical place data — edit this file
data/places.generated.js      generated from places.json — do not hand-edit
js/app.js                     all app logic (rendering, filters, search, decision flow, planner, map, favorites)
tools/build-data.mjs          regenerates places.generated.js from places.json, with validation
```

This replaces the source single `.html` file that had markup, CSS, all JS
logic, and a 231-record inline JSON array all in one `<script>` tag. The
split is a pure extraction — no rendering, filtering, or scoring logic was
rewritten, with two named exceptions documented below (persistence fix,
Protein/Drinks fix).

> **Note on source history:** the first import into this repo (commit
> `774aa53`) used an earlier draft of the app (215 places, no opening hours,
> single category per place, a standalone "Protein" home shortcut). The
> correct/latest version — 231 places, `oh` opening hours, multi-category
> `cats[]`, `tags[]`, cuisine field `cu`, a 5-step decision flow, and
> dedicated drink/sport kinds (coffee/matcha/juice/protein,
> padel/tennis/pilates/crossfit/hyrox/boxing/muaythai/yoga/surf/recovery) —
> was supplied afterward and is what this codebase now reflects. Treat that
> commit's numbers/structure as superseded by this README.

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
   IDs; warns, but does not fail, on missing coordinates since one existing
   record doesn't have them).
3. Reload the page.

### Place data model

Each place is one JSON object (field names are short — this mirrors the
source data as-is, not renamed, to avoid a data migration in this pass):

| field | meaning |
|---|---|
| `n` | name (used as the stable ID — see "Known limitations") |
| `o` | alternate/original name shown as "saved as" |
| `a` | area/region (e.g. Canggu, Ubud) |
| `c` | category label shown in the UI (Arabic) |
| `k` | primary category key (e.g. `cafe`, `padel`, `protein`) — drives icon/color |
| `cats` | array of category keys this place belongs to (one place, many categories — falls back to `[k]` when absent) |
| `tags` | free-form tags (e.g. `booking`, `view`) |
| `cu` | cuisine, where applicable |
| `r`, `rc` | rating, review count |
| `p` | price band (`$`–`$$$$`) or `null` if unknown |
| `lat`, `lng` | coordinates (map/distance). `null` if unknown — 1 record currently has none |
| `u` | Google Maps URL |
| `ph` | phone / WhatsApp number |
| `b`, `l`, `d`, `br` | meal-time flags: breakfast, lunch, dinner, brunch |
| `oh` | opening hours as `[openMinutes, closeMinutes]` from midnight, when confirmed — absent (not guessed) otherwise |
| `res` | booking recommended |
| `act` | booking required |
| `desc` | Arabic description, may include warnings inline (⚠️, 💰, 📅 markers) |

## Categories today

Home sections (`SECTIONS` in `js/app.js`): Food, Drinks, Sports, Beach &
beach clubs, Worth Visiting, Stay, Spa & Beauty, Shop.

- **Drinks → Coffee / Matcha / Juice & Smoothies / Protein & Healthy.**
  Protein is a subcategory inside Drinks, shown as a vertically-stacked
  filter chip once you're in the Drinks section — there is no standalone
  "Protein" tile on the Home screen. (This was fixed in this pass — see
  below.)
- **Sports** is one Home tile whose subcategory list (same vertical-chip
  pattern) breaks out Gym / Padel / Tennis / Pilates / CrossFit / HYROX /
  Boxing / Muay Thai / Yoga / Surf / Recovery — each independently
  filterable and countable, though they don't yet carry the
  category-specific fields the brief describes (day-pass price, indoor/
  outdoor, number of courts, etc.) — that data doesn't exist in the source
  yet and wasn't invented here.

## Known fixes made in this pass

- **Protein Shake was a primary Home shortcut, not a Drinks subcategory —
  fixed.** The source `SECTIONS` array had a standalone `{id:"protein"}`
  section with its own Home quick-button (`💪 بروتين` next to `🥤 مشروبات`),
  directly contradicting the product rule "Protein Shake lives inside
  Drinks, not as a primary Home shortcut." Merged `protein` into the
  `drinks` section's `keys`/`subs` (`js/app.js`, `SECTIONS`), removed the
  standalone Home button, and re-pointed the 5-step decision flow's
  "protein" option to `state.sec="drinks", state.sub="protein"` so it still
  works. Verified in a real browser: Home → Drinks → subcategory list now
  shows All / Coffee / Matcha / Juice & Smoothies / **Protein & Healthy**
  (13 places), no separate Protein tile on Home.
- **Favorites/Visited/Notes persistence was broken outside the source app's
  original hosting sandbox.** The source code called `window.storage.get/set`,
  an API injected by that sandbox — it does not exist in a normal browser,
  so every favorite/visited/note silently failed to save. `js/app.js` now
  installs a small shim (`localStorage`-backed) providing the same
  `{get(key), set(key, value)}` async interface, only when no host
  implementation is already present. Verified in a real browser: star a
  place, reload, it's still starred.

## Known limitations (not fixed in this pass — flagging per "don't invent data/functionality")

- **AI menu translation calls `https://api.anthropic.com/v1/messages`
  directly from the browser with no API key and no backend.** This will
  fail (no auth, and the Anthropic API does not support unauthenticated
  browser calls) outside the source app's original sandbox that intercepted
  the request. The failure is already handled gracefully in the UI (falls
  back to a "Search Google" link), so nothing is broken further, but the
  feature needs a small backend proxy holding a real API key before it can
  work in production. Not something to fix by embedding a key in client code.
- **Place IDs are the display name (`n`), not a stable synthetic ID.**
  Renaming a place in the data changes its favorite/visited/note key. Works
  today because names are unique (validated by `tools/build-data.mjs`), but
  a stable `id` field is recommended before this data set grows much more.
- One place (`SUNSET BEACH BALI | Seminyak Beach`) has no coordinates in the
  source data — pre-existing gap, not invented or removed.
- Sports subcategories are filterable but don't yet carry the
  category-specific fields the brief asks for (courts, day-pass price,
  indoor/outdoor, coaching, etc.) — not in the source data.

## Data audit (current codebase)

| metric | count |
|---|---|
| total places | 231 |
| places with a phone/WhatsApp number (`ph`) | 206 |
| places with confirmed opening hours (`oh`) | 52 |
| places with booking recommended (`res`) | 138 |
| places with booking required (`act`) | 36 |
| places with an explicit booking-warning flag (`b`) | 60 |

By category (via `cats[]`, one place can count in more than one):

| category | count | category | count |
|---|---|---|---|
| Coffee | 34 | Gym | 12 |
| Matcha | 14 | Padel | 7 |
| Juice & Smoothies | 14 | Tennis | 7 |
| Protein & Healthy | 13 | Recovery | 9 |
| — | | Pilates | 6 |
| — | | Yoga | 6 |
| — | | Boxing | 5 |
| — | | HYROX | 4 |
| — | | Muay Thai | 4 |
| — | | CrossFit | 3 |
| — | | Surf | 2 |

The brief's reference numbers (215 places / 191 phone / 95 booking warnings /
20 sports-activities / 12 suggested places) were against an earlier draft of
the data; this codebase (231 places) is the actual source of truth per the
brief's own instruction to prefer the codebase over the reference numbers
when they diverge.

## What this pass did not touch (by design — see final report for the phased plan)

Recommendation engine (scored "why this place"), planner-day logic beyond
what already exists, sport-specific structured fields (courts, pricing
tiers, coaching), TypeScript/schema types, automated tests, and a build/deploy
pipeline are all real gaps against the full product brief, but are separate,
larger phases — not safe to bundle into one pass on top of an audit and a
targeted architecture fix.
