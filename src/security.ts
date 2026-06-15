/**
 * security.ts — OWASP-aligned primitives: headers, escaping, CSRF, rate limiting.
 *
 * Each export is a small, pure-where-possible function that composes into the
 * request pipeline. No global mutable state except what Deno KV persists.
 */

import type { Kv } from "./kv.ts";

/**
 * Hardened response headers (OWASP Secure Headers Project).
 * A strict CSP is feasible because all markup is server-rendered and the only
 * script is our own first-party /app.js (no inline scripts, no third parties).
 */
export function securityHeaders(): Headers {
  const h = new Headers();
  h.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self'",
      "img-src 'self' data:",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "object-src 'none'",
    ].join("; "),
  );
  h.set("X-Content-Type-Options", "nosniff");
  h.set("X-Frame-Options", "DENY");
  h.set("Referrer-Policy", "strict-origin-when-cross-origin");
  h.set("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
  h.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  h.set("Cross-Origin-Opener-Policy", "same-origin");
  return h;
}

/** Merge security headers into an existing Response (returns a new Response). */
export function withSecurity(res: Response): Response {
  const merged = new Headers(res.headers);
  for (const [k, v] of securityHeaders()) merged.set(k, v);
  return new Response(res.body, { status: res.status, headers: merged });
}

const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/** Escape untrusted text for safe interpolation into HTML (XSS defense). */
export function escapeHtml(input: string): string {
  return input.replace(/[&<>"']/g, (c) => ESCAPES[c]);
}

/** Best-effort client IP, honoring proxy headers only when explicitly trusted. */
export function clientIp(req: Request, remote: string, trustProxy: boolean): string {
  if (trustProxy) {
    const fwd = req.headers.get("x-forwarded-for");
    if (fwd) return fwd.split(",")[0].trim();
  }
  return remote;
}

/**
 * Fixed-window rate limiter backed by Deno KV with atomic increments.
 * Returns true when the request is allowed, false when the limit is exceeded.
 */
export async function rateLimit(
  kv: Kv,
  bucket: string,
  limit: number,
  windowMs: number,
): Promise<boolean> {
  const window = Math.floor(Date.now() / windowMs);
  const key = ["ratelimit", bucket, window];
  const res = await kv.atomic()
    .mutate({ type: "sum", key, value: new Deno.KvU64(1n) })
    .commit();
  if (!res.ok) return true; // fail-open on contention; never block real users
  const current = await kv.get<Deno.KvU64>(key);
  const count = current.value ? Number(current.value.value) : 1;
  if (count === 1) {
    // set TTL so old windows self-expire
    await kv.set(key, new Deno.KvU64(BigInt(count)), { expireIn: windowMs * 2 });
  }
  return count <= limit;
}

/** Generate a cryptographically-random, URL-safe CSRF token. */
export function newCsrfToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replace(
    /[+/=]/g,
    (c) => ({ "+": "-", "/": "_", "=": "" }[c]!),
  );
}

/** Constant-time string comparison to avoid timing oracles. */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Parse the CSRF cookie value from a request, if present. */
export function readCsrfCookie(req: Request): string | null {
  const cookie = req.headers.get("cookie") ?? "";
  const match = cookie.match(/(?:^|;\s*)csrf=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

/** Build a Set-Cookie header value for the CSRF double-submit token. */
export function csrfCookie(token: string): string {
  // Not HttpOnly: the double-submit pattern requires the page to echo it back
  // in a hidden field, but it is SameSite=Strict + Secure to block CSRF/leaks.
  return `csrf=${encodeURIComponent(token)}; Path=/; SameSite=Strict; Secure; Max-Age=7200`;
}
