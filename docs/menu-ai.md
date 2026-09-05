# JALAN Menu AI — architecture, deployment, and troubleshooting

## Why this exists

JALAN's "ترجمة المنيو" feature needs to call an LLM (Anthropic) to translate a
menu (either found via web search, or OCR'd from a photo) into Arabic. The
original implementation called `https://api.anthropic.com/v1/messages`
**directly from the browser**. That cannot work in production, for two
separate, unavoidable reasons:

1. **Authentication.** Every Anthropic API request needs an `x-api-key`
   header. JALAN is a static site on GitHub Pages — there is nowhere to put
   a real API key that isn't visible to anyone who views the page source.
2. **CORS.** `api.anthropic.com` does not send
   `Access-Control-Allow-Origin` headers for arbitrary browser origins, so
   even with a key, a real browser sitting on `https://saem9299.github.io`
   would have the request blocked by its own CORS policy before it ever
   reached Anthropic.

The fix is a small Cloudflare Worker (`worker/`) that sits between the
browser and Anthropic and holds the real key server-side.

## Architecture

```
Browser (GitHub Pages, https://saem9299.github.io/bali-app/)
        │  POST /v1/messages   (no secret, just the menu prompt)
        ▼
Cloudflare Worker  (worker/src/index.mjs)
        │  adds x-api-key + anthropic-version server-side
        │  pins the model, caps tokens, validates the payload
        ▼
https://api.anthropic.com/v1/messages
        │
        ▼  response passed straight back through the Worker
Browser
```

The Worker is deliberately narrow — one route (`POST /v1/messages`), one
allowed origin, one pinned model. It is not a general-purpose Anthropic
proxy: it exists only to run JALAN's own menu-translation prompts.

**What the Worker enforces**, all implemented in `worker/src/index.mjs`:
- Only `https://saem9299.github.io` (set via the `ALLOWED_ORIGIN` var in
  `wrangler.toml`) gets a CORS-approved response; every other origin gets a
  bare, header-less response the browser itself will then block.
- Only `POST /v1/messages`; anything else is `405`/`404`.
- Request body must be JSON, under 100 KB, with a non-empty `messages`
  array — this call only ever carries plain text (OCR-extracted menu text
  or a search prompt), never an image, so 100 KB is generous headroom.
- The client-sent `model` field is **ignored** — the Worker always calls a
  pinned model (`claude-sonnet-4-5` in `PINNED_MODEL`) so a compromised or
  rewritten frontend can't redirect calls to a different, possibly more
  expensive model on your API key's account.
- `tools` is allowed through only for `web_search` (what JALAN's menu
  lookup actually uses) — any other tool name is rejected.
- One limited retry (with a short backoff) on `429`/`5xx` upstream errors
  only — never on `400`/`401`/`403`/`413`, which will fail identically
  again.
- A 25-second timeout on the Anthropic call itself, so a stuck upstream
  request can't leave the Worker (or the user) hanging indefinitely.
- A best-effort per-IP rate limit (20 requests/minute) held in memory.
  **This is not a strong guarantee** — Cloudflare can run multiple isolates
  for the same Worker, each with its own counter. For real abuse
  protection at scale, add a
  [Cloudflare Rate Limiting Rule](https://developers.cloudflare.com/waf/rate-limiting-rules/)
  on the Worker's route from the dashboard; that one is enforced
  network-wide.
- Every error response is `{"error":{"code":"...","message":"..."}}` with a
  short, user-safe Arabic message — never a stack trace, never the API key,
  never raw upstream error text.

## Deployment

You'll need a (free) Cloudflare account. From `worker/`:

```bash
cd worker
npm install         # installs wrangler as a dev dependency
npx wrangler login   # opens a browser to authorize the CLI — one-time
```

Set the secret (you'll be prompted to paste your Anthropic key
interactively — it is never written to any file or shown in your shell
history):

```bash
npx wrangler secret put ANTHROPIC_API_KEY
```

Deploy:

```bash
npx wrangler deploy
```

Wrangler prints the Worker's live URL, something like:

```
https://jalan-menu-ai.<your-subdomain>.workers.dev
```

**Copy that exact URL.** Open `js/app.js`, find the `AI_API_URL` constant
(search for `AI_API_URL`, near the menu-system code, currently a
placeholder `https://jalan-menu-ai.YOUR-SUBDOMAIN.workers.dev/v1/messages`),
and replace it with `<your worker URL>/v1/messages`. Then:

```bash
node tools/build-data.mjs   # only needed if you also touched data/places.json
```

Commit and push — GitHub Pages picks up the change on the next deploy of
the `main`/tracked branch as usual. No other build step exists for the
frontend.

## Local development

```bash
cd worker
cp .dev.vars.example .dev.vars   # if you keep an example file — otherwise create it
echo '{"ANTHROPIC_API_KEY":"sk-ant-...-your-real-or-test-key"}' > .dev.vars
npm run dev            # wrangler dev, http://localhost:8787
```

`.dev.vars` is gitignored — it never gets committed. Point a local copy of
`AI_API_URL` in `js/app.js` at `http://localhost:8787/v1/messages` while
testing, and remember to change it back before deploying the real site.

Run the Worker's own test suite (spins up `wrangler dev` itself, uses a
fake key, never touches the real Anthropic API):

```bash
cd worker
npm test
```

## Production testing checklist

After deploying and updating `AI_API_URL`:

1. Open the real GitHub Pages URL.
2. Open any restaurant/café place → "ترجمة المنيو".
3. Open DevTools → Network. Confirm:
   - **No** request to `api.anthropic.com`.
   - **One** request to your `*.workers.dev` (or custom domain) URL.
   - That request returns `200` with a JSON body containing the menu text.
4. Confirm the Arabic menu renders in the UI.
5. Confirm the Console has no CORS errors, no `401`, no unhandled promise
   rejections.
6. Try the photo path (📷 ترجمة من صورة) — OCR should run locally as
   before (Tesseract.js, unchanged), then the same Worker endpoint handles
   the translation step.
7. Turn off the Worker temporarily (or point `AI_API_URL` at a bad URL) and
   confirm the existing fallback still works: a clear Arabic error message,
   a retry button, "اختيار صورة أخرى", and either "فتح المنيو الأصلي" or
   "ابحث في قوقل" — never a stuck spinner, never a broken page.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Browser console shows a CORS error | `Origin` header from your site doesn't exactly match `ALLOWED_ORIGIN` in `wrangler.toml` | Confirm the deployed site's exact origin (scheme + host, no path) and redeploy the Worker if it changed |
| `401`/`AI_UNAVAILABLE` from the Worker | `ANTHROPIC_API_KEY` secret not set, or invalid | `npx wrangler secret put ANTHROPIC_API_KEY` again with a valid key |
| `429`/`RATE_LIMITED` | Either Anthropic's own rate limit, or the Worker's in-memory guard tripped | Wait a minute; if it's frequent in real usage, add a Cloudflare dashboard Rate Limiting Rule instead of relying on the in-memory one |
| `5xx`/`UPSTREAM_ERROR` | Anthropic's API had an outage | Transient — the Worker already retries once; if it persists, check https://status.anthropic.com |
| Request just times out / spinner never resolves | `AI_API_URL` still points at the placeholder, or the Worker itself is down | Verify `AI_API_URL` in `js/app.js` matches the deployed Worker's real URL |
| "Worker unavailable" / DNS failure | Worker not deployed yet, or URL typo | Re-run `npx wrangler deploy`, re-check the printed URL |

## Security notes

- The Anthropic API key exists **only** as a Cloudflare secret
  (`ANTHROPIC_API_KEY`), set via `wrangler secret put` — never in
  `wrangler.toml`, never in `js/app.js`, never in Git, never in GitHub
  Actions logs.
- `worker/.dev.vars` (used for local `wrangler dev` testing) is gitignored.
- The frontend only ever knows the Worker's public URL — that's meant to be
  public, the same way any API endpoint URL is.
