// Local test suite for the JALAN menu-AI Worker. Run with `npm test` inside
// worker/ — spins up `wrangler dev` pointed at a fake ANTHROPIC_API_KEY
// (from .dev.vars) so these tests never touch the real Anthropic API; they
// verify the Worker's own validation/CORS/error-mapping logic.
import { spawn } from "node:child_process";

const BASE = "http://localhost:8787";
const ALLOWED_ORIGIN = "https://saem9299.github.io";
let pass = 0, fail = 0;

function ok(name, cond, detail) {
  if (cond) { pass++; console.log(`  ok  - ${name}`); }
  else { fail++; console.log(`  FAIL - ${name}${detail ? " :: " + detail : ""}`); }
}

async function main() {
  console.log("Starting `wrangler dev`...");
  const proc = spawn("npx", ["wrangler", "dev", "--port", "8787", "--local"], {
    cwd: new URL("..", import.meta.url).pathname,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let ready = false;
  proc.stdout.on("data", d => { if (d.toString().includes("Starting local server")) ready = true; });
  proc.stderr.on("data", () => {});
  for (let i = 0; i < 40 && !ready; i++) await new Promise(r => setTimeout(r, 500));
  await new Promise(r => setTimeout(r, 1500)); // let the listener actually bind

  try {
    // 1. OPTIONS preflight from the allowed origin
    {
      const r = await fetch(`${BASE}/v1/messages`, { method: "OPTIONS", headers: { Origin: ALLOWED_ORIGIN } });
      ok("OPTIONS from allowed origin -> 204 + CORS header", r.status === 204 && r.headers.get("access-control-allow-origin") === ALLOWED_ORIGIN);
    }
    // 2. OPTIONS from a disallowed origin gets no CORS header
    {
      const r = await fetch(`${BASE}/v1/messages`, { method: "OPTIONS", headers: { Origin: "https://evil.example" } });
      ok("OPTIONS from disallowed origin -> no CORS header", !r.headers.get("access-control-allow-origin"));
    }
    // 3. GET not allowed
    {
      const r = await fetch(`${BASE}/v1/messages`, { method: "GET", headers: { Origin: ALLOWED_ORIGIN } });
      ok("GET -> 405", r.status === 405);
    }
    // 4. POST from disallowed origin -> 403, forbidden
    {
      const r = await fetch(`${BASE}/v1/messages`, {
        method: "POST", headers: { Origin: "https://evil.example", "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: "hi" }] }),
      });
      const j = await r.json();
      ok("POST from disallowed origin -> 403 FORBIDDEN_ORIGIN", r.status === 403 && j.error.code === "FORBIDDEN_ORIGIN");
    }
    // 5. Invalid JSON body
    {
      const r = await fetch(`${BASE}/v1/messages`, {
        method: "POST", headers: { Origin: ALLOWED_ORIGIN, "Content-Type": "application/json" },
        body: "{not json",
      });
      const j = await r.json();
      ok("Invalid JSON -> 400 BAD_REQUEST", r.status === 400 && j.error.code === "BAD_REQUEST");
    }
    // 6. Missing messages field
    {
      const r = await fetch(`${BASE}/v1/messages`, {
        method: "POST", headers: { Origin: ALLOWED_ORIGIN, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "whatever" }),
      });
      const j = await r.json();
      ok("Missing `messages` -> 400 BAD_REQUEST", r.status === 400 && j.error.code === "BAD_REQUEST");
    }
    // 7. Oversized payload rejected
    {
      const big = "x".repeat(200 * 1024);
      const r = await fetch(`${BASE}/v1/messages`, {
        method: "POST", headers: { Origin: ALLOWED_ORIGIN, "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: big }] }),
      });
      ok("Oversized payload -> 413", r.status === 413);
    }
    // 8. Disallowed tool name rejected
    {
      const r = await fetch(`${BASE}/v1/messages`, {
        method: "POST", headers: { Origin: ALLOWED_ORIGIN, "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: "hi" }], tools: [{ type: "x", name: "run_shell" }] }),
      });
      const j = await r.json();
      ok("Disallowed tool -> 400 BAD_REQUEST", r.status === 400 && j.error.code === "BAD_REQUEST");
    }
    // 9. Wrong Content-Type rejected
    {
      const r = await fetch(`${BASE}/v1/messages`, {
        method: "POST", headers: { Origin: ALLOWED_ORIGIN, "Content-Type": "text/plain" },
        body: "hello",
      });
      ok("Wrong Content-Type -> 400", r.status === 400);
    }
    // 10. Valid, well-formed request reaches upstream logic (will fail against
    //     the fake test key, but must fail as AI_UNAVAILABLE/UPSTREAM_ERROR —
    //     never crash, never leak the key, never hang).
    {
      const started = Date.now();
      const r = await fetch(`${BASE}/v1/messages`, {
        method: "POST", headers: { Origin: ALLOWED_ORIGIN, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "whatever-the-client-sends", max_tokens: 99999, messages: [{ role: "user", content: "hi" }] }),
      });
      const elapsed = Date.now() - started;
      const j = await r.json();
      ok("Valid request with fake key -> clean JSON error, not a crash", r.status >= 400 && j.error && j.error.code, JSON.stringify(j));
      ok("Valid request does not expose the API key", !JSON.stringify(j).includes("sk-ant-test"));
      ok("Valid request resolves promptly (no hang)", elapsed < UPSTREAM_TIMEOUT_GUARD());
      ok("CORS header present on success/error alike", r.headers.get("access-control-allow-origin") === ALLOWED_ORIGIN);
    }
    // 11. 404 for unknown path
    {
      const r = await fetch(`${BASE}/v1/other`, { method: "POST", headers: { Origin: ALLOWED_ORIGIN, "Content-Type": "application/json" }, body: "{}" });
      ok("Unknown path -> 404", r.status === 404);
    }
  } finally {
    proc.kill("SIGTERM");
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}
function UPSTREAM_TIMEOUT_GUARD() { return 27000; } // just under the Worker's own 25s + retry budget

main().catch(e => { console.error(e); process.exit(1); });
