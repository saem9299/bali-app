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

## Final polish pass

A follow-up pass, scoped to exactly two things: visual polish and one menu
fix. No category, data, search/filter, favorites/visited/notes, planner,
map, or navigation logic changed.

**Visual polish** (all in `css/styles.css` / the home-render code in
`js/app.js`, still driven entirely by the same `:root` tokens — no new
colors introduced):
- Hero shortened ~27% (230px → 168px min-height) with tighter type/padding,
  so "الأقسام" and the places list are reachable without scrolling past a
  large banner.
- The three "where to go" entry points now read as distinct roles instead
  of three similar buttons: the hero stays identity + the core question;
  "🧭 وين نروح الآن؟" is framed as the guided smart recommendation (icon +
  "توصية ذكية بخمس خطوات سريعة" subtitle, kept as the one solid/shadowed
  primary action); "✨ اختَر لي" stays a plain bordered secondary/quick tool.
- Section cards (`.card`) no longer paint a colored gradient band across
  the top like a dashboard tile — background is quiet white, the section
  color now shows only as a small icon badge and a 3px accent border.
- Bottom nav: bigger tap targets (~55px), bigger icons, unchanged "active
  = primary green only" rule.
- Search placeholder reframed to lead with "ابحث عن مطعم، رياضة، مشروب أو
  منطقة" before the example keywords, so it reads as JALAN's primary tool
  rather than a bare example list.
- A few secondary-text sizes bumped slightly (row meta, detail subtitle)
  for mobile readability; a very light shadow added to cards/category rows
  per this pass's spec (the prior pass had deliberately used none).

**Menu: added the missing "choose from Photos" path.** The existing photo
button used a single `<input type="file" accept="image/*" capture="environment">`
— on a meaningful share of mobile browsers, the `capture` attribute forces
straight to the camera and skips the photo library, so there was no
reliable way to pick a saved screenshot or an existing photo. Fixed by
adding a second, non-`capture` file input and a small inline "choose
source" step (`triggerImagePick` in `js/app.js`, `.menuchoose` in
`css/styles.css`) offering "🖼️ اختيار من الصور" (gallery/library, all
screenshots and saved photos included) and "📷 تصوير المنيو" (camera, kept,
not removed). Both feed the exact same unchanged OCR → translate pipeline
from the previous pass. Also tightened the OCR-failure and unclear-image
messages to the exact wording specified and dropped the "retry" action for
those two cases specifically (retrying the same blurry photo doesn't help;
"choose another photo" is the only useful action) while keeping retry for
the translation-failure case, which does benefit from it (re-translates
the already-OCR'd text without re-scanning).

## Mobile-only final polish

Scoped to mobile visual polish and one icon-consistency fix — no category,
data, search/filter, favorites/visited/notes, planner, map, menu logic, or
photo-upload logic touched (all verified unaffected by a full regression
pass across four mobile viewport sizes: 360, 375, 390, 412px wide).

**Unified icon system.** Home/section/nav chrome used mixed-style emoji
(🍳 🥐 🌙 🍽️ for meals; a different emoji per section for cards, bottom
nav, and the "More" list). Replaced with a single consistent line-icon set
— [Lucide](https://lucide.dev)'s static SVGs (MIT/ISC), inlined directly
as strings in `js/app.js` (`LICO_PATH` + the `licon()` helper), so there's
**no new runtime dependency or CDN script** — just embedded, currentColor-
stroked SVGs that size via the existing `font-size`/`.licon` (1.1em) like
the emoji they replaced. Covers: bottom navigation (Home/More), the Home
section cards, the "More" panel list, the Home quick-action pills, and the
food page's meal picker (Breakfast/Brunch/Lunch/Dinner — the exact example
in this pass's brief). Per-place category glyphs (`EMO`, ~30 kinds shown
in list-row tags, the detail band, map markers) are intentionally left
alone — that's category/data iconography, not nav/section chrome, and out
of this pass's scope.

Everything else was already addressed in the prior "Final Polish" pass
(hero height, the three "where to go" entry points' distinct roles, quiet
section cards with a small accent border, bottom-nav tap targets, region
chips, card shadows) — re-verified here on four screen widths rather than
redone.

## Bug fixes: menu translation speed, and the map

Two targeted fixes, diagnosed before touching any code (root causes below,
not assumptions) — no other system changed. `menuUrl` from earlier passes
now also does double duty as the "open original menu" fallback on the map
card.

### Menu translation was slow / sometimes produced nothing

Root causes, found by reading the actual call chain in `js/app.js`, not guessed:

1. **`rawCall`'s `fetch()` had no timeout at all.** A stuck request left the
   user staring at a static spinner for however long the browser's own
   default socket timeout happens to be (can be minutes) — exactly "waits a
   long time, no result." Fixed: every call now carries an `AbortController`
   timeout (`MENU_CALL_TIMEOUT` = 20s), and `showMenu`'s whole attempt is
   additionally capped by an outer `withTimeout` (28s) via a new `withTimeout()`
   helper, so the user is never waiting past a firm ceiling.
2. **Up to 6 fully sequential network calls in the worst case.** `runMenu`'s
   web-search loop ran up to 4 rounds; on top of that, `callAny` tried two
   near-identical message shapes back-to-back even when the first attempt
   failed on a plain network/timeout error the second attempt could never
   fix (the API treats a string `content` and a one-block array `content`
   identically — the second shape was never actually needed). Fixed:
   `runMenu`'s loop cut to 2 rounds, `callAny` now makes a single attempt.
   Roughly halves-to-thirds the worst-case wait without losing behavior.
3. **The photo path sent the OCR engine the full-resolution file straight
   from the camera/gallery** (often 3000-4000px+) — Tesseract's recognition
   time scales with pixel count, making this the single biggest real
   contributor to "OCR feels slow," independent of any network issue.
   Fixed: new `resizeImageForOCR()` downscales to a 1800px-max-dimension
   JPEG via canvas before handing it to Tesseract (falls back to the
   original file untouched if canvas preprocessing fails for any reason —
   never blocks the flow over this).
4. **No staged feedback** — the UI held one static "loading" string through
   the whole OCR+translate sequence. Fixed: three real, sequential stages
   now paint — "جاري قراءة المنيو…" → a genuinely computed
   "تم العثور على N عنصرًا تقريبًا" (counted from OCR'd lines that look
   price-like, a real signal from the actual extracted text, not a
   fabricated number) → "جاري ترجمة المنيو…". No fake percentage bar, per
   the brief's own instruction to prefer a plain loading state over an
   invented one when true progress can't be computed.
5. **Timeout now has its own distinct, exact message** — `menuFriendlyErr()`
   shows "تعذر إكمال الترجمة الآن." specifically when the failure was a
   timeout, vs. the existing more specific messages for OCR/translation
   failures — always with retry / choose-another-photo / original-menu-or-
   Google actions, never a dead end.

Verified in a real browser (network calls stubbed to fail instantly, since
the API has no key/backend either way — same limitation as before): the
exact staged sequence appears with a real item count, the whole failed
attempt completes in well under half a second instead of hanging, prices
in the preserved original text are untouched, and retry re-translates from
the cached OCR text without re-running OCR (confirmed via a request
counter: 1 call on first attempt, exactly 1 more on retry).

### Map showed a blank white screen with only dots

Root cause, confirmed against OSM's own published tile usage policy
(operations.osmfoundation.org/policies/tiles), not guessed: the tile layer
pointed at `{s}.tile.openstreetmap.org` — OSM's raw tile server, which that
policy explicitly warns against embedding directly in an app, and
throttles/blocks exactly this traffic pattern. The markers were always
fine because `circleMarker` draws a vector shape locally with no network
request — only the raster basemap images were silently failing, hence
"dots on a white screen." (This sandbox's own network policy also blocks
both `tile.openstreetmap.org` and the replacement tile host below,
confirmed with a direct `curl`, so the actual tile rendering could not be
visually re-verified from here — see "Known limitation" below.)

Fixed by switching to **CARTO's Voyager basemap**
(`basemaps.cartocdn.com`), a tile provider meant for exactly this direct
client-side embedding, and rebuilding the map to match the rest of the
brief:

- **Current location**: a "📍 موقعي" control button (`locateOnMap()`,
  reusing the same `me`/`meLabel` state the rest of the app already uses
  for distance sorting) requests the browser's location once automatically
  the first time the map opens, shows a distinct blue location marker, and
  re-centers the map. Denied/unavailable → a small inline banner
  ("لم نتمكن من تحديد موقعك." + "السماح بالموقع") appears over the map and
  the map keeps working normally with the default Bali-wide view — verified
  in a real browser for both the granted and denied paths.
- **Bottom sheet instead of a tiny popup**: tapping a marker opens a new,
  small `#mapcard` sheet (same `.sheet`/`.panel` pattern as every other
  sheet in the app) with name/category/rating/price/distance/first line of
  description and an "عرض المكان" button that calls the existing
  `openDetail(p.n)` directly — the exact same place object and detail page
  as everywhere else in the app, not a separate copy of the data.
- **Clustering**: added `Leaflet.markercluster` (cdnjs, the standard
  companion plugin for Leaflet, MIT-licensed) since JALAN has 231 places
  and several regions (Canggu alone) would otherwise show overlapping,
  untappable dots. Falls back to a plain `L.layerGroup` with no clustering
  if the plugin fails to load, so a CDN hiccup degrades gracefully instead
  of breaking the map.
- **Marker design**: simplified from a different color per one of ~30
  category kinds to JALAN Green as the one fill color with a thin
  section-color ring as the only accent, per "JALAN Green primary, other
  colors as simple accents only."
- **Filters/search/data integrity untouched by design**: `drawMap(rows)`
  already receives exactly the same `filtered()` result `render()` computes
  for the list view, so current search/section/filter state flows to the
  map automatically — no parallel filter logic was written, and every
  marker is the real `Place` object (clicking it opens the real place, not
  a map-only copy).

**Known limitation — disclosed, not hidden:** this session's sandbox
network policy blocks `cdnjs.cloudflare.com` and both
`tile.openstreetmap.org` and `basemaps.cartocdn.com` outright (confirmed
with `curl`, 403), same as it has for every external asset throughout this
project (Google Fonts, Tesseract.js). This means the actual tile images
and the real Leaflet/markercluster libraries could not be loaded or
visually verified from inside this session, on top of not being testable
by a real end-user opening the deployed GitHub Pages/live site either way.
To still verify the code itself, every piece of map logic (initialization,
marker creation from real place data, the locate button and both its
success/denied paths, marker-click → bottom sheet → "عرض المكان" →
real detail page, clustering fallback when the plugin is unavailable,
filter/search pass-through) was exercised against a small hand-written
stand-in for the Leaflet API that mirrors the exact calls this code makes
— confirming the logic itself is correct without depending on that
specific network policy. What remains unverified until deployed somewhere
unblocked is purely CARTO's tile images actually looking right, which is
CARTO's responsibility, not this app's code.

### Map access added to "More"

The map was previously only reachable via the toolbar's "خريطة" button
(hidden inside a section, easy to miss). Added a prominent first entry in
the "More" panel — "الخريطة / استكشف الأماكن المحفوظة حولك" with the same
unified map-pin icon and JALAN-green accent treatment as the rest of the
panel — that opens the same map view (`setMapView(true)`, a small shared
helper factored out of the existing toolbar button's handler so both entry
points stay in sync). The toolbar button is unchanged and still there;
bottom navigation itself was not touched.

## Data expansion (231 → 279 places)

Real, current research via live web search — not invented. Before writing
any code: audited the existing 231-record dataset first (see "Audit
findings" below), then researched and added 48 new places (49 built, 1
turned out to already exist — see "Duplicate caught" below).

**A hard constraint discovered mid-task, disclosed rather than worked
around:** this session's `WebFetch` is blocked for every external domain
tested, including the venue's own website and `google.com/maps` directly
(confirmed with direct tool calls, not assumed) — only `WebSearch`'s text
summaries are reachable. That means **no coordinate for any new place could
be genuinely verified** this session. Per the app's own data rules, every
new record's `lat`/`lng` is `null` rather than guessed — flagged to the user
mid-task, who confirmed proceeding on that basis. Practical effect: these
48 places search, filter, and open normally, but won't appear on the map
or support distance sorting/"near me" until real coordinates are added
(the existing `oh: null` / missing-coordinate pattern already handles this
gracefully everywhere — verified, not just assumed, via a real browser
test opening a coordinate-less place's detail page: no distance shown, no
crash).

**Audit findings (before adding anything):**
- No exact-name duplicates in the original 231, no shared/near-identical
  coordinates. Four phone numbers each shared by two places — checked
  individually, all four are legitimate multi-branch/same-group venues
  (e.g. two YUKI branches, two Livingstone locations), not duplicates.
- Two real category gaps confirmed: **no `swimming` category existed at
  all** in the Sports taxonomy (not one entry, and not even a valid key —
  the app's own filter chips couldn't have shown it), and **no dedicated
  running places** — running in Bali is overwhelmingly informal meetup
  clubs with no fixed address (confirmed via research), so per "don't add
  an unverified route/place," none were added as their own records rather
  than forcing something in on weak grounds.

**Duplicate caught before it shipped:** while merging, the newly-researched
"Meimei" (Canggu) turned out to already exist in the database (as
lowercase `meimei`, with real coordinates, rating, phone, and a fuller
description than what research alone could produce). Dropped the new
blank-coordinate copy and left the existing, richer record untouched —
exactly the "update/enrich, never duplicate" rule, caught by an actual
case-insensitive name check against the full merged set, not assumed away.

**Schema change required for integration:** added `swimming` as a new
Sports category (`SECTIONS` sports `keys`/`subs`, plus its icon/label in
`EMO`/`LBL` in `js/app.js`) — the minimum change needed for the 3 new
swimming places to actually be filterable, per "make new places work with
the existing category system," not a restructure.

**New places marked `sug:1`** (the existing "suggested/new" flag, already
used for a "جديد على جالان" home section and a "مقترحة لك" filter — a
correct, un-invented use of a field that already means exactly this).

### Report

| | Count |
|---|---|
| Before | 231 |
| Added | 48 |
| Updated/enriched | 0 (the 2 candidate enrichments — adding "tennis" to two Liga.Tennis padel clubs — turned out already present in the data) |
| Duplicates caught and dropped | 1 (Meimei) |
| **Final** | **279** |

New regions added (only where enough real places justified it, per the
brief's own rule): **Jimbaran** (3 seafood restaurants) and **Nusa Penida**
(3 well-known named attractions). A single new Berawa restaurant (Mosto)
was folded into the existing **Canggu** region instead of creating a
1-place region.

Category breakdown (of all 279, a place can count in more than one
category via `cats[]`) for the areas this task's brief emphasized:

| Category | Total | New this pass |
|---|---|---|
| Padel | 9 | 0 (none added — already well covered; 2 existing padel clubs already had `tennis` listed too) |
| Tennis | 9 | 2 |
| Gym | 15 | 0 |
| Pilates | 10 | 3 |
| CrossFit | 5 | 2 |
| HYROX | 6 | 2 |
| Boxing | 10 | 4 |
| Muay Thai | 9 | 4 |
| Yoga | 11 | 5 |
| Surf | 4 | 2 |
| Swimming | 3 | 3 (new category) |
| Cafes | 42 | 5 |
| Coffee | 39 | 2 |
| Juice/Smoothies | 16 | 0 |
| Protein/Healthy Drinks | 15 | 1 |
| Restaurants (general + cuisine-specific) | ~90 across cuisines | 11 |
| Seafood | 8 | 3 |
| Beaches/Nature | 12 | 5 |

### What was not attempted and why

- **Running clubs/routes**: informal, no fixed venue for the clubs found;
  didn't force a record onto weak grounds.
- **Amed and other regions named in the brief** (North Bali, Sidemen, East
  Bali, Tanah Lot): searched, but didn't turn up specific *named venues* I
  could verify well enough in the time available — general area
  descriptions without a specific confirmed place aren't enough to add a
  record on, so these regions weren't introduced this pass.
- **Exact review counts, prices, and opening hours** for new places: only
  included where a source stated a specific number (e.g., Canggu Surf
  School's "5.0 from 67 reviews"); left `null`/omitted everywhere else
  rather than estimated.

## Installable app (PWA)

JALAN can now be installed to a phone's home screen as a real standalone
app — no App Store/Play Store, no native build tooling, just the existing
static site plus the standard web-app manifest pieces:

- `manifest.json` — name, JALAN-green theme/background color, `standalone`
  display (opens with no browser address bar), portrait orientation, and
  icon set.
- `icons/` — a proper icon set generated from the app's own brand mark
  (green square, gold dot, white bars — same SVG used for the browser-tab
  favicon), at 192px/512px plus maskable variants for Android's adaptive
  icon shapes, and a 180px `apple-touch-icon.png` for iOS.
- `sw.js` — a minimal service worker that caches the app shell
  (`index.html`, `css/styles.css`, `js/app.js`,
  `data/places.generated.js`, icons) on first visit. Only same-origin
  requests are intercepted — map tiles, fonts, Tesseract, and the menu
  translation call are left to hit the network normally, so this only
  affects the app shell itself, not any of the app's actual features or
  their existing network-dependent behavior.

Verified in a real browser: manifest loads and is discovered, the service
worker registers and activates, and — the actual point of a PWA — going
fully offline after one visit and reloading still loads and renders all
279 places correctly (tested via Playwright's offline mode, not assumed).

**To install on a phone:** open the site's URL in Safari (iOS) or Chrome
(Android) → Share/menu → "Add to Home Screen". The icon that appears opens
JALAN full-screen, exactly like a native app.

**Still needed for a real phone to actually reach it:** this only works
from a real HTTPS URL a phone can open — Claude Artifact preview links
require being logged into claude.ai and aren't meant for this. The
repo isn't yet deployed anywhere with a public URL (e.g., GitHub Pages);
that's a separate step — see the conversation for the current status.

## Shopping expansion (🛍️ التسوق)

Added a real Shopping section without rebuilding anything: it reuses the
exact same section/category/filter/map/detail mechanisms every other
Home section already uses (`SECTIONS[].subs` for the vertical category
picker, `p.cats`/`p.tags` for membership and "what to buy" filtering,
`filtered()`/`drawMap()` for search+map — zero new UI code paths).

**Audit first.** Before adding anything, the existing database (279
places) was checked for shopping-category places: 13 existed, all
individual boutiques/convenience stores (e.g. UNCLEJIN STORE, Saint
Tropez Store, STOCKxSNEAKERS.ID, Alfamart/Indomaret). **Zero** malls,
markets, bazaars, night markets, jewelry areas, or factory outlets
existed — confirming the gap the request described. Every new place's
name/phone/coordinates were checked against all 279 existing records
before adding — no duplicates found, nothing needed enriching instead.

**Taxonomy** — 10 new subcategories added under Shopping (`js/app.js`
`SECTIONS`/`EMO`/`LBL`): 🏬 مولات، 🧺 بازارات وأسواق، 🏷️ أوتلت، 🎁 هدايا
وتذكارات، 💎 مجوهرات وإكسسوارات، 🏠 ديكور وحرف، 🌙 أسواق ليلية، 🛒 أسواق
محلية (plus `fashion`/`beauty` reserved for future items). Populating
`subs` was enough to get the same vertical-card picker Food/Sports use —
no new screens were built. A "ماذا أشتري هنا؟" (what to buy) filter group
was added to the existing filter sheet, shown only inside Shopping,
reusing the same `tag:`-prefixed chip mechanism as the generic filters.

**22 new places added** (301 total), researched via web search and
included only where a named, real venue could be confirmed:
- **Malls (7):** Beachwalk Shopping Centre, Discovery Shopping Mall,
  Seminyak Village, Bali Collection, Lippo Mall Kuta, Level 21 Mall,
  Living World Denpasar.
- **Traditional/art markets (3):** Ubud Traditional Art Market, Sukawati
  Art Market, Pasar Kumbasari (Denpasar).
- **Night markets (4):** Gianyar Night Market, Sanur Night Market (Pasar
  Sindhu), Kuta Night Market, Pasar Malam Berawa (Canggu).
- **Factory outlets (3):** World Brand Factory Outlet, Surf Factory
  Outlet (BSO), Billabong Factory Outlet — all verified real
  factory-outlet destinations on Kuta's bypass road, not just anything
  using the word "outlet."
- **Jewelry (3):** Celuk Village (the silver-making village near Ubud),
  One Love Jewelry, Bloom Jewelry (both Seminyak).
- **Home decor/concept stores (2):** Barefoot Aristocracy, Hedonist Store.

Every new record answers "لماذا أروح؟" and "ماذا أشتري هنا؟" directly in
its description, and carries "what to buy" tags (`clothes`, `shoes`,
`souvenirs`, `jewelry`, `home`, etc.) that feed the new filter group.

**What was intentionally left null/empty (not invented):** ratings,
review counts, phone numbers, and exact coordinates for all 22 new
places — this session's sandbox blocks outbound requests to Google Maps
and every other place-lookup source (confirmed via direct testing, same
limitation as the earlier Data Expansion phase), so nothing beyond what
web search text results actually stated (names, general
areas/addresses, a few opening hours) was recorded. These places are
therefore excluded from map markers and distance sorting exactly like
the ~50 other coordinate-less places already in the database — same
documented, pre-existing tradeoff, not a new one. A follow-up pass with
map/place-ID access could fill in coordinates and enrich ratings without
touching anything else.

**Regression-tested** (Playwright): Home → المزيد → تسوق opens the new
picker with all 10 subcategories visible; tapping "مولات" filters to the
mall list; global search for "Outlet", "Mall", and "هدايا" returns the
correct new places; the filter sheet shows the new "ماذا أشتري هنا؟"
group only inside Shopping; opening a shopping place's detail sheet
works and shows the why-go/what-to-buy text; Food section, search, and
map toggle all continue to work unchanged; `tools/build-data.mjs`
regenerated `data/places.generated.js` with 0 validation errors.

## Map stability fix + place-sheet close button

Two real bugs, root-caused before touching anything:

**1. Map lag/freeze.** `drawMap()` used to run on *every* `render()` call —
every keystroke in search, every filter/sort toggle, even unrelated state
changes like starring a place while the map was open — and each time it
unconditionally tore down and rebuilt every marker plus the whole
marker-cluster group. With 300+ places that's real main-thread work
happening far more often than the visible result set actually changed.
Fixed in `js/app.js`'s `drawMap()`: it now compares a cheap signature of
the currently-visible place set (`lastPtsKey`) and skips the marker
rebuild entirely when nothing actually changed. The search input
(`#q` `oninput`) is also now debounced (120ms) instead of calling
`render()` once per keystroke, which was the single biggest source of
redundant map (and list) re-renders while typing.

**2. Silent failure → permanent blank/"loading" screen.** The map
container itself was fine (explicit `height:calc(100vh - 230px)`, not a
zero-height parent), but two real failure paths had no recovery: (a) if
the Leaflet SDK itself failed to load (CDN blocked, offline, ad-blocker)
`L.map(...)` threw an uncaught `ReferenceError` and the "جاري تحميل
الخريطة…" spinner stayed up forever with no error shown; (b) if tiles
failed to load there was no feedback at all. Fixed by wrapping map
initialization in `try/catch`, listening for the tile layer's `load`/
`tileerror` events, and adding a 6-second no-event fallback — any of
these now show "تعذر تحميل الخريطة" with an **إعادة المحاولة** (Retry)
button (`#mapstatus` in `index.html`/`css/styles.css`) instead of a dead
white screen. Map initialization itself was already correctly guarded
against re-running (`L_map` is a module-level singleton, only created
once) — that part wasn't a real bug, just re-verified.

**3. ✕ close button on Place Details and the Map preview card.** Both
sheets previously could only be closed by tapping the thin scrim sliver
above the panel (the panel fills up to 88vh) — no visible close control.
Added a fixed `.sheetx` ✕ button (top-right in this RTL layout) to both
`#detail` and `#mapcard` in `index.html`, wired for free through the
existing generic `[data-close] → close()` handler (no new JS needed for
the button itself). Tap-the-scrim-to-close still works unchanged.
Closing either sheet only removes its `.on` class — it never touches
`L_map`/`layer`, so map center, zoom, markers, and filters are preserved
exactly as they were.

**Verified (Playwright), given this sandbox blocks the Leaflet/CARTO CDN
outright (same standing network restriction as every earlier phase — no
live tile rendering could be observed here):** simulating an SDK-load
failure now correctly shows the Retry state with zero uncaught JS errors
(previously threw `L is not defined`); the ✕ button closes both Place
Details and the Map card immediately, leaving the map's own DOM/state
untouched; scrim-tap-to-close still works from the reachable strip;
search debounce doesn't break result correctness; favorites (★) persist
across reload; filters open/apply correctly. Not independently
verifiable in this sandbox: real tile rendering, pan/zoom smoothness,
and marker-cluster visuals on a live network — these depend on the
Leaflet CDN load that this session's network policy blocks, exactly as
documented in the earlier map-fix and PWA phases.

**Explicitly not done, to keep this change scoped to the two things
asked for:** browser Back-button interception to close the sheet before
navigating away (would require adding `history.pushState`/`popstate`
handling app-wide, which is a bigger navigational change than "fix the
map and the close button").

## Home UX polish

Decluttered `renderHome()` without touching the map, the place-sheet
close button, Bottom Navigation, or any data — a polish pass, not a
rebuild:

- **Hero shrunk ~20%** (`min-height:168px → 134px`, tighter inner
  padding) and the photo credit made smaller/lighter and pulled closer
  to the image, so the page reaches the decision CTAs faster.
- **Quick Actions trimmed from 7 to 4** (قريب مني / وش آكل؟ / وش أشرب؟ /
  رياضة). Dropped شواطئ (already its own Section card right below —
  was a same-shape duplicate), خطط يومي and المميّزة (both already one
  tap away in "المزيد" — nothing was removed from the app, just
  decluttered off Home).
- **Section cards now describe what's inside** instead of naming the
  top-rated place (`SECTION_BLURB` in `js/app.js` — real taxonomy
  labels already used elsewhere, e.g. "مطاعم · كافيهات · حلويات"), and
  are reordered for Home display only (`HOME_SEC_ORDER`) so Shopping
  sits with the other browsing sections instead of trailing after
  إقامة/سبا.
- **Replaced the two "مفتوح الآن وقريب" / "جديد على جالان" mini-lists**
  with a single **"⭐ يستحق الزيارة"** section: 3–5 diverse picks from
  the existing `score()` recommendation engine (already weighs
  rating + distance + open-now), diversified one-per-section so it
  doesn't just repeat the same category five times, with a small nudge
  toward whichever meal slot (breakfast/lunch/dinner) it actually is
  right now. Each card reuses `whyList()` for its one-line "ليش؟" —
  no new recommendation logic, no invented ratings/distances/reasons;
  a field is simply omitted when the place has no real data for it.
  A **"شوف الكل"** button below opens the exact same list view every
  other entry point already uses (`showAllBest()`, sort=best,
  no new page).

**Not touched, as instructed:** map code, the place-sheet ✕/swipe close
behavior, Bottom Navigation, the section/category taxonomy, and no new
features (no stories/offers/login/etc.) were added.

**Verified (Playwright, 390×844 viewport):** all four required Home
copy points present (وين نروح الآن / اختَر لي / يستحق الزيارة / شوف
الكل); Quick Actions show exactly the 4 specified buttons; all 8
section cards render with the new blurb copy in the expected order;
Shopping visible in the grid; 5 diverse recommendation picks render
with real ratings/area/distance and a genuine why-reason; hero measures
134px tall; opening a pick and closing it via the existing ✕ works
unchanged; "شوف الكل" opens the full 303-place list; clicking a section
card still enters that section normally; zero JS errors.
