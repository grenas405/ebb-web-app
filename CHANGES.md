# Changelog

All notable changes to this project are documented here.

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
