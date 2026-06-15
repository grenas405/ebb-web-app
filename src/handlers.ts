/**
 * handlers.ts — One small handler per route. Each returns a Response.
 *
 * Handlers compose the view, kv, validate, and security modules. They contain
 * the request-specific glue only; reusable logic lives in those modules.
 */

import { BUSINESS } from "./config.ts";
import type { Ctx } from "./router.ts";
import * as view from "./views.ts";
import * as kv from "./kv.ts";
import { validateLead } from "./validate.ts";
import * as money from "./validate.ts";
import {
  csrfCookie,
  newCsrfToken,
  rateLimit,
  readCsrfCookie,
  timingSafeEqual,
} from "./security.ts";

const HTML = "text/html; charset=utf-8";

/** Build an HTML Response, optionally with extra headers. */
function html(body: string, status = 200, extra?: Record<string, string>): Response {
  const headers = new Headers({ "content-type": HTML });
  if (extra) { for (const [k, v] of Object.entries(extra)) headers.set(k, v); }
  return new Response(body, { status, headers });
}

/** Redirect helper. */
function redirect(location: string): Response {
  return new Response(null, { status: 303, headers: { location } });
}

/** GET / — homepage. Bumps the KV visit counter to show live persistence. */
export async function home(_req: Request, ctx: Ctx): Promise<Response> {
  const [testimonials, visits] = await Promise.all([
    kv.listTestimonials(ctx.kv),
    kv.bumpVisits(ctx.kv),
  ]);
  return html(view.layout("Home", view.homePage(testimonials, visits), { active: "home" }));
}

/** GET /how-it-works */
export function howItWorks(_req: Request, _ctx: Ctx): Response {
  return html(view.layout("How Bail Works", view.howItWorksPage(), { active: "how" }));
}

/** GET /calculator */
export function calculator(_req: Request, _ctx: Ctx): Response {
  return html(view.layout("Bail Calculator", view.calculatorPage(), { active: "calc" }));
}

/** POST /calculator — server-side estimate for no-JS clients. */
export async function calculatorSubmit(req: Request, _ctx: Ctx): Promise<Response> {
  const form = await req.formData();
  const bail = money.money(form.get("bail"), "bail amount", 10_000_000);
  if (!bail.ok) {
    return html(view.layout("Bail Calculator", view.calculatorPage(), { active: "calc" }), 400);
  }
  const premium = Math.round(bail.value * BUSINESS.premiumRate * 100) / 100;
  return html(view.layout("Your Estimate", view.calculatorResult(bail.value, premium)));
}

/** GET /contact — issues a fresh CSRF token via double-submit cookie. */
export function contact(_req: Request, _ctx: Ctx): Response {
  const token = newCsrfToken();
  return html(
    view.layout("Get Help Now", view.contactPage(token), { active: "contact" }),
    200,
    { "set-cookie": csrfCookie(token) },
  );
}

/** POST /contact — validate, rate-limit, CSRF-check, then persist the lead. */
export async function contactSubmit(req: Request, ctx: Ctx): Promise<Response> {
  // 1. Rate limit by IP: max 5 submissions per minute.
  const allowed = await rateLimit(ctx.kv, `contact:${ctx.ip}`, 5, 60_000);
  if (!allowed) {
    return html(
      view.layout(
        "Get Help Now",
        view.contactPage(newCsrfToken(), "Too many requests. Please call us directly."),
        {
          active: "contact",
        },
      ),
      429,
      { "set-cookie": csrfCookie(newCsrfToken()), "retry-after": "60" },
    );
  }

  const form = await req.formData();

  // 2. CSRF double-submit check (cookie value must match form field).
  const cookieToken = readCsrfCookie(req);
  const formToken = String(form.get("csrf") ?? "");
  if (!cookieToken || !timingSafeEqual(cookieToken, formToken)) {
    const fresh = newCsrfToken();
    return html(
      view.layout(
        "Get Help Now",
        view.contactPage(fresh, "Your session expired. Please try again."),
        {
          active: "contact",
        },
      ),
      403,
      { "set-cookie": csrfCookie(fresh) },
    );
  }

  // 3. Honeypot: bots fill the hidden "company" field; humans never see it.
  if (String(form.get("company") ?? "").trim() !== "") {
    return redirect("/thank-you-sent"); // silently drop, pretend success
  }

  // 4. Validate input at the boundary.
  const result = validateLead(form);
  if (!result.ok) {
    const fresh = newCsrfToken();
    return html(
      view.layout("Get Help Now", view.contactPage(fresh, result.error), { active: "contact" }),
      400,
      { "set-cookie": csrfCookie(fresh) },
    );
  }

  // 5. Persist and confirm.
  const stored = await kv.saveLead(ctx.kv, result.value);
  return html(view.layout("Thank You", view.thankYouPage(stored)));
}

/** Static thank-you page used for the silently-dropped honeypot path. */
export function thankYouSent(_req: Request, _ctx: Ctx): Response {
  return html(view.layout(
    "Thank You",
    view.thankYouPage({
      id: "",
      createdAt: new Date().toISOString(),
      name: "Friend",
      phone: BUSINESS.phonePrimary,
      email: "",
      defendant: "",
      facility: "",
      message: "",
    }),
  ));
}

/**
 * GET /admin — demo dashboard. Gated by a bearer token from the environment.
 * In production this would sit behind real auth; the token keeps the demo safe.
 */
export async function admin(req: Request, ctx: Ctx): Promise<Response> {
  const expected = Deno.env.get("ADMIN_TOKEN");
  const provided = ctx.url.searchParams.get("token") ??
    (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!expected || !provided || !timingSafeEqual(expected, provided)) {
    return html(
      view.layout("Unauthorized", view.errorPage(401, "Admin access requires a valid token."), {}),
      401,
    );
  }
  const [stats, leads] = await Promise.all([kv.readStats(ctx.kv), kv.recentLeads(ctx.kv)]);
  return html(view.layout("Admin", view.adminPage(stats, leads)));
}

/** Lightweight liveness probe for ops/monitoring. */
export function health(_req: Request, _ctx: Ctx): Response {
  return new Response(JSON.stringify({ status: "ok", ts: Date.now() }), {
    headers: { "content-type": "application/json" },
  });
}

/** 404 fallback. */
export function notFound(): Response {
  return html(view.layout("Not Found", view.errorPage(404, "That page doesn't exist.")), 404);
}
