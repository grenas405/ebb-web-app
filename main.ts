/**
 * main.ts — Composition root. Wires config, KV, routes, and the server.
 *
 * The request pipeline is a small, readable composition:
 *   request → route match → handler → security headers → response
 * Everything is built on Deno's native APIs only (Deno.serve, Deno.stat,
 * Deno.open) — no third-party HTTP framework.
 */

import { loadRuntimeConfig } from "./src/config.ts";
import { openKv, seedTestimonials } from "./src/kv.ts";
import { clientIp, withSecurity } from "./src/security.ts";
import { type Ctx, get, match, post, type Route } from "./src/router.ts";
import { serveStatic } from "./src/static.ts";
import * as h from "./src/handlers.ts";

/** The declarative route table — the app's surface area at a glance. */
const routes: readonly Route[] = [
  get("/", h.home),
  get("/how-it-works", h.howItWorks),
  get("/calculator", h.calculator),
  post("/calculator", h.calculatorSubmit),
  get("/contact", h.contact),
  post("/contact", h.contactSubmit),
  get("/thank-you-sent", h.thankYouSent),
  get("/admin", h.admin),
  get("/health", h.health),
];

const config = loadRuntimeConfig();
const kv = await openKv();
await seedTestimonials(kv);

/** Strip the body for HEAD, cancelling any underlying file stream first. */
async function headOf(res: Response): Promise<Response> {
  await res.body?.cancel();
  return new Response(null, { status: res.status, headers: res.headers });
}

/** The single fetch handler: route → static → 404, all security-wrapped. */
async function handle(req: Request, info: Deno.ServeHandlerInfo): Promise<Response> {
  const url = new URL(req.url);
  const remote = (info.remoteAddr as Deno.NetAddr).hostname;
  // HTTPS either directly (url.protocol) or reported by a trusted proxy.
  const secure = url.protocol === "https:" ||
    (config.trustProxy && req.headers.get("x-forwarded-proto") === "https");
  const ctx: Ctx = {
    kv,
    config,
    url,
    ip: clientIp(req, remote, config.trustProxy),
    secure,
  };

  // 1. Dynamic routes. HEAD is served by the matching GET handler with the
  //    body stripped, per HTTP semantics.
  const isHead = req.method === "HEAD";
  const handler = match(routes, isHead ? "GET" : req.method, url.pathname);
  if (handler) {
    const res = withSecurity(await handler(req, ctx), secure);
    return isHead ? await headOf(res) : res;
  }

  // 2. Static assets from fsRoot (only for safe methods).
  if (req.method === "GET" || isHead) {
    const asset = await serveStatic(config.staticRoot, url.pathname);
    if (asset) {
      const res = withSecurity(asset, secure);
      return isHead ? await headOf(res) : res;
    }
  }

  // 3. Fallback.
  return withSecurity(h.notFound(), secure);
}

Deno.serve({
  port: config.port,
  hostname: config.hostname,
  onListen: ({ hostname, port }) => {
    // Show a browser-friendly host: 0.0.0.0 binds all interfaces but some
    // browsers won't navigate to it — point the user at localhost instead.
    const host = hostname === "0.0.0.0" || hostname === "::" ? "localhost" : hostname;
    console.log(`%c⚖  Esmeralda's Bail Bonds`, "color:#ffd23f;font-weight:bold");
    console.log(`   Serving on http://${host}:${port}  (bound to ${hostname})`);
    console.log(`   Static fsRoot: ${config.staticRoot}`);
  },
}, handle);
