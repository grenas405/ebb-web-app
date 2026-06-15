/**
 * router.ts — A tiny, explicit, composable router.
 *
 * A Route binds an HTTP method + exact path to a Handler. `route()` walks the
 * table and dispatches; no regex magic, no framework. Unix philosophy: one
 * small thing, done plainly.
 */

import type { Kv } from "./kv.ts";
import type { RuntimeConfig } from "./config.ts";

/** Per-request context threaded to every handler. */
export interface Ctx {
  readonly kv: Kv;
  readonly config: RuntimeConfig;
  readonly url: URL;
  readonly ip: string;
  /** True when the request arrived over HTTPS (governs HSTS + Secure cookies). */
  readonly secure: boolean;
}

export type Handler = (req: Request, ctx: Ctx) => Response | Promise<Response>;

export interface Route {
  readonly method: string;
  readonly path: string;
  readonly handler: Handler;
}

/** Helper constructors keep the route table declarative and readable. */
export const get = (path: string, handler: Handler): Route => ({ method: "GET", path, handler });
export const post = (path: string, handler: Handler): Route => ({ method: "POST", path, handler });

/**
 * Match a request against the table. Returns the matched handler or null.
 * Exact-path matching keeps routing predictable and avoids ReDoS surface.
 */
export function match(routes: readonly Route[], method: string, path: string): Handler | null {
  for (const r of routes) {
    if (r.method === method && r.path === path) return r.handler;
  }
  return null;
}
