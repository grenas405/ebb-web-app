# Esmeralda's Bail Bonds — Web App Demo

A fast, mobile-first marketing and lead-capture web app for **Esmeralda's Bail Bonds**, 2801 S
Shields Blvd, Oklahoma City, OK 73129 — built on [Deno](https://deno.com) with `Deno.serve`,
`Deno.openKv`, and the Deno standard library (`@std/http`, `@std/path`). Dependencies resolve from
the local Deno cache, so the app runs **fully offline** on any OS once the cache is warmed (see
[Offline demo](#offline-demo-on-the-windows-host)).

> Designed for Oklahoma City families in a stressful moment: big type, big buttons, one-tap calling,
> and an honest, no-jargon walkthrough of how bail works in Oklahoma.

## Why this is a persuasive demo

- **Captures leads 24/7 and alerts the bondsman instantly.** Every submission is stored durably in
  Deno KV and triggers a new-lead alert (console + optional webhook to a CRM/SMS service). In bail
  bonds, the first callback usually wins — this turns the site into a speed-to-contact machine.
- **Fully bilingual (English / Spanish).** One-tap language toggle, `Se habla español` throughout —
  a major differentiator for south OKC's Hispanic community. Choice persists via cookie and respects
  the browser's `Accept-Language`.
- **Find-an-Inmate hub.** Direct links to the Oklahoma County jail roster, court records (OSCN), and
  state offender search, plus a "what to have ready" checklist — genuinely useful in the crisis
  moment, which earns the call.
- **Free bail estimate calculator.** Visitors instantly see the standard 10% Oklahoma premium,
  lowering the barrier to calling.
- **Found by more people.** `BailBondsAgent` JSON-LD structured data, OpenGraph/Twitter cards,
  `sitemap.xml`, and `robots.txt` help the business rank in "bail bonds near me" results.
- **Live trust signals.** A KV-backed visit counter and seeded 5-star testimonials build
  credibility.
- **Always reachable.** A sticky 24/7 call bar and click-to-call links on every page and screen
  size.

## Architecture (Unix philosophy + OWASP)

Small, explicit, composable functions — each module does one thing:

| Module            | Responsibility                                         |
| ----------------- | ------------------------------------------------------ |
| `main.ts`         | Composition root: config → KV → routes → server        |
| `src/config.ts`   | Immutable business profile + 12-factor runtime config  |
| `src/router.ts`   | Tiny exact-match router (`get`/`post`/`match`)         |
| `src/handlers.ts` | One small handler per route                            |
| `src/views.ts`    | Server-rendered HTML as pure string functions          |
| `src/kv.ts`       | Deno KV data layer (leads, testimonials, analytics)    |
| `src/validate.ts` | Boundary input validation returning typed `Result`s    |
| `src/security.ts` | OWASP primitives: headers, escaping, CSRF, rate limit  |
| `src/i18n.ts`     | All EN/ES copy + language resolution (`Copy` bundle)   |
| `src/notify.ts`   | New-lead alert transports (console + optional webhook) |
| `src/seo.ts`      | JSON-LD, social meta, sitemap, robots                  |
| `static/`         | `styles.css` + progressive-enhancement `app.js`        |

Each new feature is its own small module (Unix philosophy): `i18n` owns every user-facing string and
the rules for picking a language, so views never branch on language — they render a resolved `Copy`
object. `notify` turns a saved lead into an alert via composable transports that degrade gracefully
(the webhook is skipped when unconfigured, so the offline demo always works). `seo` is pure string
builders for discovery markup.

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
cache is warm, run `deno run --cached-only -A main.ts` (fails fast if anything is missing).

## Deployment

The same code runs unchanged on a VPS or Deno Deploy:

- **VPS** — `git pull`, `deno cache main.ts`, then run `deno task start` behind a TLS-terminating
  reverse proxy (set `TRUST_PROXY=1` so client IPs and HTTPS detection work). KV persists to a local
  SQLite file.
- **Deno Deploy** (console.deno.com) — connect the GitHub repo as a new app. The entrypoint
  (`main.ts`) comes from the `deploy` section of `deno.json`, and Deploy resolves the JSR imports
  from `deno.json` + `deno.lock`. Two one-time steps in the dashboard:
  1. **Provision a Deno KV database** (Databases → Provision Database → Deno KV) and **assign it to
     the app**. Without this, leads, stats, and rate limits are not persisted.
  2. **Set environment variables**: `ADMIN_TOKEN` and, optionally, `NOTIFY_WEBHOOK_URL`. Leave
     `PORT`, `HOST`, and `TRUST_PROXY` unset — Deploy routes traffic to the server itself.

  Deploy can't take runtime flags like `--unstable-kv`, so KV is turned on with `"unstable": ["kv"]`
  in `deno.json` instead. Deploy runs on its own filesystem with `file://` module URLs, so
  `staticRoot` and `serveDir` work unchanged. The console alert transport writes to Deploy's logs;
  set `NOTIFY_WEBHOOK_URL` so leads actually reach a phone.

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

| Variable             | Default   | Purpose                                                                                     |
| -------------------- | --------- | ------------------------------------------------------------------------------------------- |
| `PORT`               | `8000`    | Listen port                                                                                 |
| `HOST`               | `0.0.0.0` | Bind address                                                                                |
| `ADMIN_TOKEN`        | _(unset)_ | Token gating `/admin`; unset = admin disabled                                               |
| `TRUST_PROXY`        | _(unset)_ | Set to `1` to trust `X-Forwarded-For` (behind LB)                                           |
| `NOTIFY_WEBHOOK_URL` | _(unset)_ | POST new leads as JSON here (Zapier/Make/CRM/SMS). Unset = log + store only (offline demo). |

## Routes

| Method | Path            | Description                               |
| ------ | --------------- | ----------------------------------------- |
| GET    | `/`             | Homepage (hero, services, steps, reviews) |
| GET    | `/how-it-works` | Oklahoma bail process + FAQ               |
| GET    | `/calculator`   | Bail cost estimator                       |
| POST   | `/calculator`   | Server-side estimate (no-JS fallback)     |
| GET    | `/jail`         | Find-an-Inmate hub + jail/court resources |
| GET    | `/contact`      | Lead-capture form (issues CSRF token)     |
| POST   | `/contact`      | Validate + persist lead, fire alert       |
| GET    | `/sitemap.xml`  | Sitemap of public pages                   |
| GET    | `/robots.txt`   | Crawler directives                        |
| GET    | `/admin`        | Token-gated dashboard of leads + stats    |
| GET    | `/health`       | JSON liveness probe                       |

Add `?lang=es` (or `?lang=en`) to any page, or use the 🌐 toggle in the nav, to switch language.

Try the admin dashboard: `http://localhost:8000/admin?token=YOUR_ADMIN_TOKEN`.

## Disclaimer

This is a demonstration site. Content is illustrative and is not legal advice.
