# jalan-menu-ai

Cloudflare Worker that proxies JALAN's menu-translation calls to the
Anthropic API, holding the API key server-side and enforcing CORS/
validation/rate-limits so the frontend (a static GitHub Pages site) never
talks to `api.anthropic.com` directly.

Full architecture, deployment steps, local dev, and troubleshooting:
**[`../docs/menu-ai.md`](../docs/menu-ai.md)**.

Quick reference:

```bash
npm install
npx wrangler login                       # one-time, opens a browser
npx wrangler secret put ANTHROPIC_API_KEY  # paste your key when prompted
npx wrangler deploy                      # prints the live Worker URL
npm test                                 # local test suite, no real API calls
```

After deploying, copy the printed URL into the `AI_API_URL` constant in
`../js/app.js`.
