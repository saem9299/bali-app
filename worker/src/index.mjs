// JALAN menu-AI proxy — the ONLY thing this Worker exists to do is put a real,
// secret Anthropic API key between the browser and https://api.anthropic.com,
// since api.anthropic.com (a) requires x-api-key/anthropic-version headers a
// static GitHub Pages site cannot hold secretly, and (b) does not send CORS
// headers for arbitrary browser origins, so a direct browser fetch to it from
// a real deployment can never work. This Worker is deliberately narrow: one
// endpoint, one allowed origin, one pinned model — not a general Anthropic
// proxy anyone could point at any origin/model.

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
// Pinned server-side so a compromised/rewritten frontend can't make this
// Worker call an arbitrary model on the API key's account. The client-sent
// `model` field (whatever JALAN's frontend happens to send) is ignored.
const PINNED_MODEL = "claude-sonnet-5";
const UPSTREAM_TIMEOUT_MS = 25000;
const MAX_BODY_BYTES = 100 * 1024; // menu prompts are plain OCR/search text, never images
const MAX_TOKENS_CAP = 1500;
const RATE_LIMIT_PER_MIN = 20; // best-effort, per-isolate — see docs/menu-ai.md

// Best-effort in-memory rate limiter. Cloudflare can spin up multiple
// isolates for the same Worker, so this is NOT a globally accurate limiter —
// it only guards a single hot isolate against a tight local abuse loop. For
// real abuse protection, pair this with a Cloudflare dashboard Rate Limiting
// Rule on the route (documented in docs/menu-ai.md); that's the part that's
// actually enforced network-wide.
const hits = new Map(); // ip -> [timestamps]
function rateLimited(ip) {
  const now = Date.now();
  const windowStart = now - 60000;
  const arr = (hits.get(ip) || []).filter(t => t > windowStart);
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 5000) hits.clear(); // crude memory guard for a long-lived isolate
  return arr.length > RATE_LIMIT_PER_MIN;
}

function corsHeaders(origin, allowedOrigin) {
  if (origin !== allowedOrigin) return {};
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}
function jsonError(code, message, status, extraHeaders, debug) {
  const body = { error: { code, message } };
  if (debug) body.error.debug = debug; // TEMP DIAGNOSTIC field, see call site
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...(extraHeaders || {}) },
  });
}

function mapUpstreamStatus(status) {
  if (status === 400) return ["BAD_REQUEST", "طلب غير صالح.", 400];
  if (status === 401 || status === 403) return ["AI_UNAVAILABLE", "خدمة الترجمة غير متاحة الآن.", 502];
  if (status === 408) return ["TIMEOUT", "استغرق الطلب وقتًا طويلاً.", 504];
  if (status === 413) return ["PAYLOAD_TOO_LARGE", "النص المرسل طويل جدًا.", 413];
  if (status === 429) return ["RATE_LIMITED", "الخدمة مزدحمة حاليًا، حاول بعد قليل.", 429];
  if (status >= 500) return ["UPSTREAM_ERROR", "تعذر الوصول لخدمة الترجمة الآن.", 502];
  return ["UNKNOWN", "حدث خطأ غير متوقع.", 502];
}

async function callAnthropicWithRetry(body, apiKey) {
  const attempt = async () => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), UPSTREAM_TIMEOUT_MS);
    try {
      const res = await fetch(ANTHROPIC_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": ANTHROPIC_VERSION,
        },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      return res;
    } finally {
      clearTimeout(t);
    }
  };

  let res;
  try {
    res = await attempt();
  } catch (e) {
    throw { transient: true, message: e && e.name === "AbortError" ? "TIMEOUT" : "NETWORK" };
  }
  // Limited, transient-only retry: one retry, only on 429/5xx, never on 4xx
  // logic errors (400/401/403/413) — those will fail identically again.
  if (res.status === 429 || res.status >= 500) {
    await new Promise(r => setTimeout(r, 600));
    try {
      res = await attempt();
    } catch (e) {
      throw { transient: true, message: e && e.name === "AbortError" ? "TIMEOUT" : "NETWORK" };
    }
  }
  return res;
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const allowedOrigin = env.ALLOWED_ORIGIN;
    const cors = corsHeaders(origin, allowedOrigin);

    if (request.method === "OPTIONS") {
      // Preflight: only answer with CORS headers for the exact allowed origin;
      // anything else gets a bare 204 with no CORS headers, which the
      // requesting browser will then itself block.
      return new Response(null, { status: 204, headers: cors });
    }

    if (request.method !== "POST") {
      return jsonError("METHOD_NOT_ALLOWED", "Method not allowed.", 405, cors);
    }

    if (origin !== allowedOrigin) {
      return jsonError("FORBIDDEN_ORIGIN", "Origin not allowed.", 403, cors);
    }

    const url = new URL(request.url);
    if (url.pathname !== "/v1/messages") {
      return jsonError("NOT_FOUND", "Not found.", 404, cors);
    }

    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    if (rateLimited(ip)) {
      return jsonError("RATE_LIMITED", "طلبات كثيرة، حاول بعد قليل.", 429, cors);
    }

    const contentType = request.headers.get("Content-Type") || "";
    if (!contentType.includes("application/json")) {
      return jsonError("BAD_REQUEST", "Content-Type must be application/json.", 400, cors);
    }

    const lenHeader = request.headers.get("Content-Length");
    if (lenHeader && Number(lenHeader) > MAX_BODY_BYTES) {
      return jsonError("PAYLOAD_TOO_LARGE", "الطلب كبير جدًا.", 413, cors);
    }

    let raw;
    try {
      raw = await request.text();
    } catch (e) {
      return jsonError("BAD_REQUEST", "Could not read request body.", 400, cors);
    }
    if (raw.length > MAX_BODY_BYTES) {
      return jsonError("PAYLOAD_TOO_LARGE", "الطلب كبير جدًا.", 413, cors);
    }

    let body;
    try {
      body = JSON.parse(raw);
    } catch (e) {
      return jsonError("BAD_REQUEST", "Invalid JSON.", 400, cors);
    }

    if (!body || !Array.isArray(body.messages) || body.messages.length === 0) {
      return jsonError("BAD_REQUEST", "`messages` is required and must be a non-empty array.", 400, cors);
    }
    for (const m of body.messages) {
      if (!m || typeof m !== "object" || !m.role || m.content == null) {
        return jsonError("BAD_REQUEST", "Each message needs a role and content.", 400, cors);
      }
    }
    // Only the two tools JALAN's menu feature actually uses are allowed through —
    // this isn't a general-purpose Anthropic proxy for arbitrary tool use.
    if (body.tools) {
      if (!Array.isArray(body.tools) || body.tools.some(t => t && t.name !== "web_search")) {
        return jsonError("BAD_REQUEST", "Unsupported tool requested.", 400, cors);
      }
    }

    const upstreamBody = {
      model: PINNED_MODEL, // client-requested model is always ignored — see PINNED_MODEL comment
      max_tokens: Math.min(Number(body.max_tokens) || 1000, MAX_TOKENS_CAP),
      messages: body.messages,
    };
    if (body.tools) upstreamBody.tools = body.tools;

    if (!env.ANTHROPIC_API_KEY) {
      // Server misconfiguration (secret not set yet) — never say that
      // specifically to the client, just a generic unavailable.
      return jsonError("AI_UNAVAILABLE", "خدمة الترجمة غير متاحة الآن.", 502, cors);
    }

    let upstreamRes;
    try {
      upstreamRes = await callAnthropicWithRetry(upstreamBody, env.ANTHROPIC_API_KEY);
    } catch (e) {
      const code = e && e.message === "TIMEOUT" ? "TIMEOUT" : "NETWORK";
      const status = code === "TIMEOUT" ? 504 : 502;
      return jsonError(code, "تعذر الوصول لخدمة الترجمة الآن.", status, cors);
    }

    if (!upstreamRes.ok) {
      const [code, message, status] = mapUpstreamStatus(upstreamRes.status);
      // TEMP DIAGNOSTIC: include Anthropic's real error text (safe, non-secret
      // descriptive text) while we track down a production issue. Remove
      // `debug` before considering this done.
      let debugDetail = "";
      try { debugDetail = (await upstreamRes.text()).slice(0, 500); } catch (e) {}
      return jsonError(code, message, status, cors, debugDetail);
    }

    let data;
    try {
      data = await upstreamRes.json();
    } catch (e) {
      return jsonError("UPSTREAM_ERROR", "رد غير صالح من خدمة الترجمة.", 502, cors);
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json", ...cors },
    });
  },
};
