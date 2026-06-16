# Changelog

All notable changes to this project are documented here.

## [1.4.0] — 2026-06-16

### Added

- **Bilingual English / Spanish.** New `src/i18n.ts` owns every user-facing string as a typed `Copy`
  bundle plus language resolution (precedence: `?lang=` query → `lang` cookie → `Accept-Language` →
  English). A 🌐 nav toggle switches languages; the choice persists via cookie. `<html lang>`, the
  meta description, and `hreflang` alternates all follow the active language. Views no longer hold
  copy — they render a resolved `Copy` object.
- **Instant new-lead alerts.** New `src/notify.ts` turns each saved lead into an alert via
  composable transports: a console transport (always on, proves the feature offline) and an optional
  webhook transport (`NOTIFY_WEBHOOK_URL`, POSTs JSON to Zapier/Make/a CRM/SMS). Best-effort and
  non-blocking; every attempt is audited in KV and surfaced as "Alerts Sent" on the admin dashboard.
- **Find-an-Inmate page (`/jail`).** Official links to the Oklahoma County jail roster, court
  records (OSCN), and state offender search, plus a "what to have ready" checklist and the jail's
  address/phone.
- **SEO / discovery.** New `src/seo.ts` emits `BailBondsAgent` JSON-LD, OpenGraph/Twitter meta,
  `/sitemap.xml`, and `/robots.txt`; layout adds a canonical link and `hreflang` alternates.

### Fixed

- **Optional form fields rejected when omitted.** `validate.text` treated a missing field (null) as
  "required" even at `min: 0`; an absent optional field (e.g. facility/message submitted by a
  non-browser client) now passes, while required fields still report "is required".

### Changed

- `app.js` is now language-agnostic: the calculator's result string is localized server-side and
  passed via the output element's `data-template` attribute.
- Admin dashboard gained an "Alerts Sent" stat.

## [1.3.0] — 2026-06-15

### Changed

- **Dropped the committed `vendor/` directory and `"vendor": true`.** Per the intended workflow,
  dependencies are now resolved from the local Deno cache (`deno cache main.ts`, run once while the
  host has network) rather than vendored into the repo. `vendor/` is gitignored. `deno.lock` stays
  committed so cached versions are pinned and integrity-checked.
- **Hardened `staticRoot` resolution for Deno Deploy.** `fromFileUrl` only accepts `file://` URLs
  and would throw where modules load over `https://` (e.g. Deno Deploy). Resolution now falls back
  to the URL pathname for non-`file:` schemes, so `serveDir` works on a local host, a VPS, and
  Deploy.

### Added

- **Deployment notes** in the README covering the offline Windows demo (warm the cache, then run
  with `--cached-only`), a VPS (reverse proxy + `TRUST_PROXY`), and Deno Deploy (managed KV, JSR
  imports).

## [1.2.0] — 2026-06-15

### Changed

- **Reintroduced `@std/http` for static serving, now vendored for offline use.** `serveDir` again
  serves files from `fsRoot`, replacing the hand-rolled `src/static.ts` (removed). To keep the
  cross-platform fix, `fsRoot` is derived with `@std/path`'s
  `fromFileUrl(new URL("../static", import.meta.url))` instead of `URL.pathname`, so it resolves
  correctly on Windows (`C:\...`) and POSIX.

### Added

- **Vendored dependencies for fully offline operation.** `deno.json` sets `"vendor": true` and the
  resolved `@std/http` + `@std/path` modules are committed under `./vendor` (~1 MB). The Windows
  demo host runs with no network access; `deno run` loads everything from disk. `deno.lock` is
  committed for reproducibility.

## [1.1.1] — 2026-06-15

### Fixed

- **Static assets 404'd on Windows.** `staticRoot` was derived via `URL.pathname`, which produces an
  invalid `/C:/Users/.../static` path on Windows, so `Deno.stat`/`Deno.open` never found the files.
  The static root is now kept as a `file://` **URL** and passed straight to Deno's FS APIs (which
  resolve file URLs correctly on every platform), and request paths are resolved against it with
  `new URL()`. Verified cross-platform; traversal protection and MIME handling are unchanged.

## [1.1.0] — 2026-06-15

### Changed

- **Removed the `@std/http` dependency — the app now uses only native Deno APIs.** Static-file
  serving was reimplemented in `src/static.ts` on top of `Deno.stat` and `Deno.open(...).readable`,
  replacing `@std/http`'s `serveDir`. `deno.json` no longer declares any imports and the project has
  zero external dependencies.
- Content types are set from an explicit extension map (no MIME sniffing), and path-traversal (`..`,
  encoded slashes, backslashes, null bytes) is rejected before any filesystem access.
- `HEAD` responses now cancel the underlying file stream before dropping the body, preventing
  file-descriptor leaks.

## [1.0.2] — 2026-06-15

### Added

- **Branded SVG favicon** (`static/favicon.svg`, scales of justice in the brand palette), linked
  from every page. Eliminates the `/favicon.ico` 404 console noise and adds polish in the browser
  tab.

## [1.0.1] — 2026-06-15

### Fixed

- **Page failed to load / CSS + JS missing over HTTP.** The `Strict-Transport-Security` (HSTS)
  header was sent over plain HTTP, causing browsers to force-upgrade `http://…:8000` (and every
  CSS/JS subresource) to `https://`, where no TLS listener exists — surfacing as a "page moved"
  redirect. HSTS and the `Secure` cookie flag are now emitted only when the request actually arrives
  over HTTPS (direct or via a trusted proxy's `X-Forwarded-Proto`).
- **`HEAD` requests to pages returned 404.** `HEAD` is now served by the matching `GET` handler with
  the body stripped, per HTTP semantics.
- Startup log now points to `http://localhost:<port>` instead of the bind-all `0.0.0.0`, which some
  browsers refuse to navigate to.

## [1.0.0] — 2026-06-15

### Added — Initial demo release

- **Deno web app** for Esmeralda's Bail Bonds (Oklahoma City, OK) built on `@std/http` and Deno KV,
  serving static assets from `fsRoot`.
- **Pages**: homepage (hero, services, 4-step process, testimonials, location), Oklahoma "How Bail
  Works" guide with FAQ, bail cost calculator, contact / lead-capture form, token-gated admin
  dashboard, and a JSON health probe.
- **Deno KV data layer**: durable lead storage, atomic visit + lead counters, and seeded 5-star
  testimonials for social proof.
- **Bail calculator**: server-rendered estimate (no-JS fallback) plus live client-side computation
  via progressive enhancement, using Oklahoma's standard 10% premium.
- **Composable architecture** (Unix philosophy): small explicit functions split across `config`,
  `router`, `handlers`, `views`, `kv`, `validate`, `security`.
- **OWASP-aligned security**: strict CSP and hardened response headers, double-submit CSRF
  protection with constant-time comparison, HTML output escaping, KV-backed rate limiting, bot
  honeypot, and boundary input validation. Runs under least-privilege Deno permissions.
- **Design**: dark red / yellow / black theme, large type and tap targets, sticky 24/7 call bar,
  click-to-call everywhere, fully responsive and accessible (skip link, focus styles, reduced-motion
  support, ARIA labels).
- **Docs**: README with architecture, security notes, and run instructions.
