# Esmeralda's Bail Bonds — Web App Demo

A fast, mobile-first marketing and lead-capture web app for **Esmeralda's Bail Bonds**, 2801 S
Shields Blvd, Oklahoma City, OK 73129 — built on [Deno](https://deno.com) with `Deno.serve`,
`Deno.openKv`, and the Deno standard library (`@std/http`). The std dependencies are **vendored into
`./vendor`**, so the app runs **fully offline** on any OS with no network fetch.

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

Static assets are served from **`fsRoot`** via `@std/http`'s `serveDir`. The `fsRoot` path is
derived with `@std/path`'s `fromFileUrl(new URL("../static", import.meta.url))` — **not**
`URL.pathname`, which would yield an invalid `/C:/...` string on Windows. This makes asset serving
correct on every OS. `serveDir` confines requests to `fsRoot`, so path-traversal attempts cannot
escape it.

### Offline demo on the Windows host

The demo runs on a Windows host with **no internet connection**. The deps are _not_ vendored into
the repo; instead, warm the local Deno cache **once while the host has network**, then run offline:

```sh
git pull origin main
deno cache main.ts        # downloads @std/http + @std/path into DENO_DIR (needs net, one time)
deno task start           # subsequent runs work fully offline
```

`deno.lock` is committed, so the cached versions are pinned and integrity-checked. To prove the
cache is warm, run `deno run --cached-only -A --unstable-kv main.ts` (fails fast if anything is
missing).

## Deployment

The same code runs unchanged on a VPS or Deno Deploy:

- **VPS** — `git pull`, `deno cache main.ts`, then run `deno task start` behind a TLS-terminating
  reverse proxy (set `TRUST_PROXY=1` so client IPs and HTTPS detection work). KV persists to a local
  SQLite file.
- **Deno Deploy** — push the repo; Deploy resolves the JSR imports from `deno.json` + `deno.lock`
  and provides managed Deno KV automatically (no `--unstable-kv` flag needed). `staticRoot` already
  handles Deploy's non-`file://` module URLs, so `serveDir` keeps working there.

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
