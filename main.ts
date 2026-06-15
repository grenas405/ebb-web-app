/**
 * main.ts — Composition root. Wires config, KV, routes, and the server.
 *
 * The request pipeline is a small, readable composition:
 *   request → route match → handler → security headers → response
 * Static assets are served from fsRoot via @std/http's serveDir.
 */

import { serveDir } from "@std/http/file-server";
import { loadRuntimeConfig } from "./src/config.ts";
import { openKv, seedTestimonials } from "./src/kv.ts";
import { clientIp, withSecurity } from "./src/security.ts";
import { type Ctx, get, match, post, type Route } from "./src/router.ts";
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

/** Serve a file from fsRoot; returns null when no file matches the path. */
async function tryStatic(req: Request, staticRoot: string): Promise<Response | null> {
  const res = await serveDir(req, {
    fsRoot: staticRoot,
    quiet: true,
    enableCors: false,
  });
  return res.status === 404 ? null : res;
}

/** The single fetch handler: route → static → 404, all security-wrapped. */
async function handle(req: Request, info: Deno.ServeHandlerInfo): Promise<Response> {
  const url = new URL(req.url);
  const remote = (info.remoteAddr as Deno.NetAddr).hostname;
  const ctx: Ctx = {
    kv,
    config,
    url,
    ip: clientIp(req, remote, config.trustProxy),
  };

  // 1. Dynamic routes.
  const handler = match(routes, req.method, url.pathname);
  if (handler) return withSecurity(await handler(req, ctx));

  // 2. Static assets from fsRoot (only for safe methods).
  if (req.method === "GET" || req.method === "HEAD") {
    const asset = await tryStatic(req, config.staticRoot);
    if (asset) return withSecurity(asset);
  }

  // 3. Fallback.
  return withSecurity(h.notFound());
}

Deno.serve({
  port: config.port,
  hostname: config.hostname,
  onListen: ({ hostname, port }) => {
    console.log(`%c⚖  Esmeralda's Bail Bonds`, "color:#ffd23f;font-weight:bold");
    console.log(`   Serving on http://${hostname}:${port}`);
    console.log(`   Static fsRoot: ${config.staticRoot}`);
  },
}, handle);
