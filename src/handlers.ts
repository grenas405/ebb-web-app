/**
 * handlers.ts — One small handler per route. Each returns a Response.
 *
 * Handlers compose the i18n, view, kv, validate, notify, seo, and security
 * modules. They hold request-specific glue only; reusable logic lives in those
 * modules. Every HTML handler resolves a `Copy` bundle from ctx.lang and a
 * `PageMeta` from the request, then renders through `view.layout`.
 */

import { BUSINESS } from "./config.ts";
import type { Ctx } from "./router.ts";
import * as view from "./views.ts";
import type { PageMeta } from "./views.ts";
import * as kv from "./kv.ts";
import { type Copy, copyFor } from "./i18n.ts";
import { notifyNewLead } from "./notify.ts";
import { robotsTxt, sitemapXml } from "./seo.ts";
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

/** Build per-request page metadata from the context. */
function meta(ctx: Ctx, active: string, title: string): PageMeta {
  return { lang: ctx.lang, path: ctx.url.pathname, origin: ctx.url.origin, active, title };
}

/** Render a full localized page: copy + layout + body → HTML Response. */
function page(
  ctx: Ctx,
  copy: Copy,
  active: string,
  title: string,
  body: string,
  status = 200,
  extra?: Record<string, string>,
): Response {
  return html(view.layout(copy, meta(ctx, active, title), body), status, extra);
}

/** Redirect helper. */
function redirect(location: string): Response {
  return new Response(null, { status: 303, headers: { location } });
}

/** GET / — homepage. Bumps the KV visit counter to show live persistence. */
export async function home(_req: Request, ctx: Ctx): Promise<Response> {
  const copy = copyFor(ctx.lang);
  const [testimonials, visits] = await Promise.all([
    kv.listTestimonials(ctx.kv),
    kv.bumpVisits(ctx.kv),
  ]);
  return page(ctx, copy, "home", copy.nav.home, view.homePage(copy, testimonials, visits));
}

/** GET /how-it-works */
export function howItWorks(_req: Request, ctx: Ctx): Response {
  const copy = copyFor(ctx.lang);
  return page(ctx, copy, "how", copy.nav.how, view.howItWorksPage(copy));
}

/** GET /calculator */
export function calculator(_req: Request, ctx: Ctx): Response {
  const copy = copyFor(ctx.lang);
  return page(ctx, copy, "calc", copy.nav.calc, view.calculatorPage(copy));
}

/** POST /calculator — server-side estimate for no-JS clients. */
export async function calculatorSubmit(req: Request, ctx: Ctx): Promise<Response> {
  const copy = copyFor(ctx.lang);
  const form = await req.formData();
  const bail = money.money(form.get("bail"), "bail amount", 10_000_000);
  if (!bail.ok) {
    return page(ctx, copy, "calc", copy.nav.calc, view.calculatorPage(copy), 400);
  }
  const premium = Math.round(bail.value * BUSINESS.premiumRate * 100) / 100;
  return page(
    ctx,
    copy,
    "calc",
    copy.calc.yourEstimate,
    view.calculatorResult(copy, bail.value, premium),
  );
}

/** GET /jail — find-an-inmate / jail-info hub. */
export function jail(_req: Request, ctx: Ctx): Response {
  const copy = copyFor(ctx.lang);
  return page(ctx, copy, "jail", copy.nav.jail, view.jailPage(copy));
}

/** GET /contact — issues a fresh CSRF token via double-submit cookie. */
export function contact(_req: Request, ctx: Ctx): Response {
  const copy = copyFor(ctx.lang);
  const token = newCsrfToken();
  return page(ctx, copy, "contact", copy.nav.contact, view.contactPage(copy, token), 200, {
    "set-cookie": csrfCookie(token, ctx.secure),
  });
}

/** POST /contact — validate, rate-limit, CSRF-check, persist, then notify. */
export async function contactSubmit(req: Request, ctx: Ctx): Promise<Response> {
  const copy = copyFor(ctx.lang);

  // 1. Rate limit by IP: max 5 submissions per minute.
  const allowed = await rateLimit(ctx.kv, `contact:${ctx.ip}`, 5, 60_000);
  if (!allowed) {
    return page(
      ctx,
      copy,
      "contact",
      copy.nav.contact,
      view.contactPage(copy, newCsrfToken(), copy.contact.errTooMany),
      429,
      { "set-cookie": csrfCookie(newCsrfToken(), ctx.secure), "retry-after": "60" },
    );
  }

  const form = await req.formData();

  // 2. CSRF double-submit check (cookie value must match form field).
  const cookieToken = readCsrfCookie(req);
  const formToken = String(form.get("csrf") ?? "");
  if (!cookieToken || !timingSafeEqual(cookieToken, formToken)) {
    const fresh = newCsrfToken();
    return page(
      ctx,
      copy,
      "contact",
      copy.nav.contact,
      view.contactPage(copy, fresh, copy.contact.errExpired),
      403,
      { "set-cookie": csrfCookie(fresh, ctx.secure) },
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
    return page(
      ctx,
      copy,
      "contact",
      copy.nav.contact,
      view.contactPage(copy, fresh, result.error),
      400,
      { "set-cookie": csrfCookie(fresh, ctx.secure) },
    );
  }

  // 5. Persist, then fire the new-lead alert (best-effort, never blocks).
  const stored = await kv.saveLead(ctx.kv, result.value);
  await notifyNewLead(ctx.kv, stored, ctx.config.notifyWebhookUrl);
  return page(ctx, copy, "contact", copy.nav.contact, view.thankYouPage(copy, stored));
}

/** Static thank-you page used for the silently-dropped honeypot path. */
export function thankYouSent(_req: Request, ctx: Ctx): Response {
  const copy = copyFor(ctx.lang);
  return page(
    ctx,
    copy,
    "contact",
    copy.nav.contact,
    view.thankYouPage(copy, {
      id: "",
      createdAt: new Date().toISOString(),
      name: "Friend",
      phone: BUSINESS.phonePrimary,
      email: "",
      defendant: "",
      facility: "",
      message: "",
    }),
  );
}

/** GET /sitemap.xml — public-page sitemap for crawlers. */
export function sitemap(_req: Request, ctx: Ctx): Response {
  return new Response(sitemapXml(ctx.url.origin), {
    headers: { "content-type": "application/xml; charset=utf-8" },
  });
}

/** GET /robots.txt */
export function robots(_req: Request, ctx: Ctx): Response {
  return new Response(robotsTxt(ctx.url.origin), {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}

/**
 * GET /admin — demo dashboard. Gated by a bearer token from the environment.
 * In production this would sit behind real auth; the token keeps the demo safe.
 */
export async function admin(req: Request, ctx: Ctx): Promise<Response> {
  const copy = copyFor(ctx.lang);
  const expected = Deno.env.get("ADMIN_TOKEN");
  const provided = ctx.url.searchParams.get("token") ??
    (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!expected || !provided || !timingSafeEqual(expected, provided)) {
    return page(
      ctx,
      copy,
      "",
      "Unauthorized",
      view.errorPage(401, "Admin access requires a valid token.", copy.notFound.back),
      401,
    );
  }
  const [stats, leads] = await Promise.all([kv.readStats(ctx.kv), kv.recentLeads(ctx.kv)]);
  return page(ctx, copy, "", "Admin", view.adminPage(stats, leads));
}

/** Lightweight liveness probe for ops/monitoring. */
export function health(_req: Request, _ctx: Ctx): Response {
  return new Response(JSON.stringify({ status: "ok", ts: Date.now() }), {
    headers: { "content-type": "application/json" },
  });
}

/** 404 fallback. */
export function notFound(ctx: Ctx): Response {
  const copy = copyFor(ctx.lang);
  return page(
    ctx,
    copy,
    "",
    copy.notFound.title,
    view.errorPage(404, copy.notFound.body, copy.notFound.back),
    404,
  );
}
