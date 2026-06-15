# Changelog

All notable changes to this project are documented here.

## [1.0.0] — 2026-06-15

### Added — Initial demo release

- **Deno web app** for Esmeralda's Bail Bonds (Oklahoma City, OK) built on
  `@std/http` and Deno KV, serving static assets from `fsRoot`.
- **Pages**: homepage (hero, services, 4-step process, testimonials, location),
  Oklahoma "How Bail Works" guide with FAQ, bail cost calculator, contact /
  lead-capture form, token-gated admin dashboard, and a JSON health probe.
- **Deno KV data layer**: durable lead storage, atomic visit + lead counters,
  and seeded 5-star testimonials for social proof.
- **Bail calculator**: server-rendered estimate (no-JS fallback) plus live
  client-side computation via progressive enhancement, using Oklahoma's
  standard 10% premium.
- **Composable architecture** (Unix philosophy): small explicit functions split
  across `config`, `router`, `handlers`, `views`, `kv`, `validate`, `security`.
- **OWASP-aligned security**: strict CSP and hardened response headers,
  double-submit CSRF protection with constant-time comparison, HTML output
  escaping, KV-backed rate limiting, bot honeypot, and boundary input
  validation. Runs under least-privilege Deno permissions.
- **Design**: dark red / yellow / black theme, large type and tap targets,
  sticky 24/7 call bar, click-to-call everywhere, fully responsive and
  accessible (skip link, focus styles, reduced-motion support, ARIA labels).
- **Docs**: README with architecture, security notes, and run instructions.
