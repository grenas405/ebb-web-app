# Esmeralda's Bail Bonds — Web App Demo

A fast, mobile-first marketing and lead-capture web app for **Esmeralda's Bail Bonds**, 2801 S
Shields Blvd, Oklahoma City, OK 73129 — built in [Deno](https://deno.com) with the standard library
(`@std/http`) and **Deno KV**.

> Designed for Oklahoma City families in a stressful moment: big type, big buttons, one-tap calling,
> and an honest, no-jargon walkthrough of how bail works in Oklahoma.

## Why this is a persuasive demo

- **Captures leads 24/7.** Every contact submission is stored durably in Deno KV and surfaced on a
  live admin dashboard — no database to provision.
- **Free bail estimate calculator.** Visitors instantly see the standard 10% Oklahoma premium,
  lowering the barrier to calling.
- **Live trust signals.** A real KV-backed visit counter and seeded 5-star testimonials build
  credibility.
- **Always reachable.** A sticky 24/7 call bar and click-to-call links appear on every page and
  every screen size.

## Architecture (Unix philosophy + OWASP)

Small, explicit, composable functions — each module does one thing:

| Module            | Responsibility                                        |
| ----------------- | ----------------------------------------------------- |
| `main.ts`         | Composition root: config → KV → routes → server       |
| `src/config.ts`   | Immutable business profile + 12-factor runtime config |
| `src/router.ts`   | Tiny exact-match router (`get`/`post`/`match`)        |
| `src/handlers.ts` | One small handler per route                           |
| `src/views.ts`    | Server-rendered HTML as pure string functions         |
| `src/kv.ts`       | Deno KV data layer (leads, testimonials, analytics)   |
| `src/validate.ts` | Boundary input validation returning typed `Result`s   |
| `src/security.ts` | OWASP primitives: headers, escaping, CSRF, rate limit |
| `static/`         | `styles.css` + progressive-enhancement `app.js`       |

Static assets are served from **`fsRoot`** via `@std/http`'s `serveDir`.

### Security (OWASP-aligned)

- **Hardened headers** on every response: strict CSP (`'self'` only, no inline script),
  `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`,
  `Permissions-Policy`, COOP, and HSTS (sent only over HTTPS so local HTTP dev is not
  force-upgraded).
- **CSRF** via double-submit cookie (`SameSite=Strict`, plus `Secure` over HTTPS) + constant-time
  token comparison.
- **XSS defense** — all untrusted output passes through `escapeHtml`.
- **Rate limiting** on form submission (KV atomic counters, fail-open).
- **Bot honeypot** field silently drops automated spam.
- **Input validation** at the boundary; no value is trusted by shape alone.
- **Least privilege** — runs with only `--allow-net --allow-read --allow-env`.

## Running

```sh
# Development (auto-reload)
deno task dev

# Production
deno task start

# Type-check, lint, and format-check
deno task check
```

Then open http://localhost:8000.

### Environment variables

| Variable      | Default   | Purpose                                           |
| ------------- | --------- | ------------------------------------------------- |
| `PORT`        | `8000`    | Listen port                                       |
| `HOST`        | `0.0.0.0` | Bind address                                      |
| `ADMIN_TOKEN` | _(unset)_ | Token gating `/admin`; unset = admin disabled     |
| `TRUST_PROXY` | _(unset)_ | Set to `1` to trust `X-Forwarded-For` (behind LB) |

## Routes

| Method | Path            | Description                               |
| ------ | --------------- | ----------------------------------------- |
| GET    | `/`             | Homepage (hero, services, steps, reviews) |
| GET    | `/how-it-works` | Oklahoma bail process + FAQ               |
| GET    | `/calculator`   | Bail cost estimator                       |
| POST   | `/calculator`   | Server-side estimate (no-JS fallback)     |
| GET    | `/contact`      | Lead-capture form (issues CSRF token)     |
| POST   | `/contact`      | Validate + persist lead to KV             |
| GET    | `/admin`        | Token-gated dashboard of leads + stats    |
| GET    | `/health`       | JSON liveness probe                       |

Try the admin dashboard: `http://localhost:8000/admin?token=YOUR_ADMIN_TOKEN`.

## Disclaimer

This is a demonstration site. Content is illustrative and is not legal advice.
