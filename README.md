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

## Visual identity (design tokens)

`css/styles.css` `:root` is the single source of truth for color — every
component reads from these custom properties, nothing hardcodes a brand hex
outside `:root`:

| token | value | role |
|---|---|---|
| `--primary` | `#087F5B` | Jalan Green — primary actions, active states |
| `--secondary` | `#F97316` | Sunset Orange — Drinks section, distance |
| `--accent` | `#EAB308` | Bali Gold — ratings/marks |
| `--success` / `--warning` / `--error` / `--info` | `#16A34A` / `#EA580C` / `#DC2626` / `#2563EB` | status badges (open/closed, booking, warnings) |
| `--ink` / `--text2` / `--muted` / `--faint` | `#111827` / `#4B5563` / `#6B7280` / `#9CA3AF` | text hierarchy |
| `--sand` / `--paper` / `--tint` / `--stone` / `--hair` | `#FFFDF8` / `#FFFFFF` / `#F3F4F6` / `#E5E7EB` / `#EFF1F3` | backgrounds, cards, borders |

`--jade` / `--clay` / `--gold` remain as aliases to `--primary` / `--warning` /
`--accent` so nothing broke silently if a reference to the old names was missed.

**Per-section accent, not per-category hue.** The source app painted a
different HSL hue for all ~30 category kinds (steak, bakery, hotel, shop…
each its own color). Per the brief's "use the section color as an accent
only — don't give every card a different color," `tintBg`/`tintFg` in
`js/app.js` were rewritten to derive color from the place's **Home section**
instead: Food/Drinks/Sports/Beach/Worth-Visiting map to the five brand
section colors; Stay/Spa/Shop (not named in the brief's 5) get a neutral
gray rather than an invented sixth color. A kind that belongs to two
sections (`cafe` is in both Food and Drinks) keeps one consistent color
everywhere in the app — the section it's listed under first — rather than
shifting color depending which list it's shown in.

**Typography.** Dropped the decorative "Amiri" serif used for headings
site-wide (hero title, section headings, plan/filter titles) in favor of
IBM Plex Sans Arabic at weight 700, per the brief's "professional, modern,
clean" typography brief; added Inter as the Latin-script pairing font.

**A real pre-existing bug fixed along the way:** `css/styles.css` had been
extracted from the original single-file build with the literal `<style>`
/ `</style>` wrapper tags left in as the file's first and last lines. A
standalone `.css` file starting with `<style>` is invalid CSS — browsers
discard the entire first rule (which happened to be `:root`) as a parse
error, silently dropping every color/spacing token. This meant **the color
tokens were never actually applying** even before this pass (confirmed via
`getComputedStyle` before/after the fix). Removed the two stray lines;
verified via `getComputedStyle` that `--primary` etc. now resolve, and the
page background before this fix was `transparent` (falling through to
whatever the browser default is), after: the intended `#FFFDF8`.

## Menu system & Arabic translation

Inside a restaurant's detail sheet (shown only where `FOODK.has(p.k)`, same
gating as before), a dedicated "المنيو" section renders up to three
buttons and a content area, per the brief's four fallback states:

1. **ترجمة المنيو** (always shown) — the existing internet-lookup path
   (`showMenu`/`runMenu`/`callAny`, unchanged logic): searches the web via
   the Anthropic API and asks for an Arabic menu. This call has no API key
   and no backend (same limitation flagged in the first pass) — it will
   fail outside a sandbox that intercepts it, and now fails **into the new
   graceful error UI** (retry / upload a photo instead / search Google)
   rather than a raw error string.
2. **فتح المنيو الأصلي ↗** (shown only when `p.menuUrl` is set) — a plain
   external link. Added `menuUrl` as a new, empty-by-default field on every
   place (`data/places.json`) so this is ready for future data enrichment;
   no URLs were invented, so this button doesn't appear yet on any place.
3. **📷 ترجمة من صورة** (always shown) — new. Opens the device's photo
   picker/camera (`<input type="file" accept="image/*" capture="environment">`),
   runs OCR fully client-side via **Tesseract.js** (loaded from cdnjs on
   first use, ~67KB — the only new dependency added; no existing OCR/translate
   library existed to reuse, and this is the standard, widely-deployed choice
   for browser-only OCR with no server or API key), then sends the extracted
   text through the same `callAny` Anthropic path with a strict prompt:
   preserve prices/currency exactly, never invent a dish/price/description,
   mark unreadable fragments as `unclear` instead of guessing, and prefer the
   common Arabic transliteration + short description for known dishes
   (`Nasi Goreng` → `ناسي غورينغ`) over a literal translation.

**Toggle.** Whenever a result has both an Arabic rendering and the original
OCR'd text, a "العربية | الأصلي" toggle appears above the content
(`.menutoggle` in `js/app.js`/`css/styles.css`).

**Fallback chain, not a single path.** If OCR succeeds but the translation
call fails (the expected outcome without a backend), the OCR'd original
text is still cached and shown — nothing extracted is thrown away. The
error banner (`.menuerr`) never shows a raw technical error; it always
offers "إعادة المحاولة" (retries translation from the cached OCR text
directly, without re-scanning the photo), "رفع صورة أخرى", and a Google
search link.

**Caching.** Results cache under `menu:<place name>` via the same
`window.storage`/localStorage shim as favorites — `{source, dishes, rawAr,
rawOrig, t}`. The photo itself is never stored, only the text extracted
from it (per "don't keep user photos unless necessary").

**Known limitation (same root cause as before):** the Arabic-translation
step — for both the internet-lookup and the photo-OCR path — depends on
`https://api.anthropic.com/v1/messages` being reachable with a valid key
directly from the browser, which is not how that API works in production.
OCR itself (Tesseract.js) has no such dependency and works standalone. To
make translation actually succeed for real users, route `rawCall()` in
`js/app.js` through a small backend proxy that holds the API key server-side
— everything else (UI states, caching, fallback chain) is already built to
work with that call unchanged.
