/**
 * views.ts — Server-side HTML rendering as small composable functions.
 *
 * Every function takes a resolved `Copy` bundle (see i18n.ts) plus its data and
 * returns a string of HTML. Untrusted values (user/lead input, testimonials)
 * pass through escapeHtml at interpolation. Authored copy may contain trusted
 * markup (e.g. <strong>, &amp;) and is interpolated raw by design. No inline
 * <script> except SEO JSON-LD (a data block, CSP-exempt) — strict CSP holds.
 */

import { BUSINESS, COUNTY_JAIL, fullAddress } from "./config.ts";
import { escapeHtml } from "./security.ts";
import { type Copy, fill, type Lang, otherLang } from "./i18n.ts";
import { localBusinessJsonLd, socialMeta } from "./seo.ts";
import type { Stats, StoredLead, Testimonial } from "./kv.ts";

/** Per-request page metadata threaded into the layout. */
export interface PageMeta {
  readonly lang: Lang;
  /** Request pathname (drives the language toggle, canonical + OG URLs). */
  readonly path: string;
  /** Request origin, e.g. https://example.com (for absolute URLs). */
  readonly origin: string;
  /** Active nav id for highlighting. */
  readonly active: string;
  /** Localized page title. */
  readonly title: string;
}

const fmtUsd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });

/** The "Call Now: (xxx)" + "Request a Bondsman" button row. */
function ctaRow(copy: Copy): string {
  return `<div class="cta-row">
    <a class="btn btn-primary" href="tel:${BUSINESS.phonePrimaryTel}">${copy.cta.callPrefix} ${
    escapeHtml(BUSINESS.phonePrimary)
  }</a>
    <a class="btn btn-ghost" href="/contact">${copy.cta.request}</a>
  </div>`;
}

/** Wrap a page body in the shared document shell (head, nav, footer). */
export function layout(copy: Copy, page: PageMeta, body: string): string {
  const canonical = page.origin + page.path;
  const navLink = (id: string, label: string, href: string) =>
    `<a href="${href}" class="${page.active === id ? "active" : ""}">${label}</a>`;
  const toggleHref = `${page.path}?lang=${otherLang(page.lang)}`;
  const fullTitle = `${escapeHtml(page.title)} · ${escapeHtml(BUSINESS.name)}`;
  return `<!DOCTYPE html>
<html lang="${copy.htmlLang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="${escapeHtml(copy.meta.description)}">
<meta name="theme-color" content="#0d0d0d">
<title>${fullTitle}</title>
<link rel="canonical" href="${escapeHtml(canonical)}">
<link rel="alternate" hreflang="en" href="${escapeHtml(page.origin + page.path)}?lang=en">
<link rel="alternate" hreflang="es" href="${escapeHtml(page.origin + page.path)}?lang=es">
<link rel="alternate" hreflang="x-default" href="${escapeHtml(page.origin + page.path)}">
${
    socialMeta({
      title: page.title,
      description: copy.meta.description,
      url: canonical,
      image: `${page.origin}/favicon.svg`,
    })
  }
${localBusinessJsonLd(page.origin)}
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="stylesheet" href="/styles.css">
</head>
<body>
<a class="skip-link" href="#main">${copy.nav.home}</a>
<div class="callbar" role="region" aria-label="Call now">
  <span class="callbar-pulse" aria-hidden="true"></span>
  ${copy.callbar}
  <a href="tel:${BUSINESS.phonePrimaryTel}">${escapeHtml(BUSINESS.phonePrimary)}</a>
</div>
<header class="site-header">
  <a class="brand" href="/">
    <span class="brand-mark" aria-hidden="true">⚖</span>
    <span class="brand-text">${escapeHtml(BUSINESS.name)}</span>
  </a>
  <nav class="site-nav" aria-label="Primary">
    ${navLink("home", copy.nav.home, "/")}
    ${navLink("how", copy.nav.how, "/how-it-works")}
    ${navLink("calc", copy.nav.calc, "/calculator")}
    ${navLink("jail", copy.nav.jail, "/jail")}
    ${navLink("contact", copy.nav.contact, "/contact")}
    <a class="lang-toggle" href="${toggleHref}" rel="nofollow" aria-label="${copy.switchLabel}">🌐 ${copy.switchLabel}</a>
  </nav>
</header>
<main id="main">
${body}
</main>
<footer class="site-footer">
  <div class="foot-grid">
    <div>
      <h3>${escapeHtml(BUSINESS.name)}</h3>
      <p>${escapeHtml(fullAddress())}</p>
      <p>${copy.footer.familyLine}</p>
    </div>
    <div>
      <h3>${copy.footer.availHead}</h3>
      <p><a href="tel:${BUSINESS.phonePrimaryTel}">${escapeHtml(BUSINESS.phonePrimary)}</a></p>
      <p><a href="tel:${BUSINESS.phoneSecondaryTel}">${escapeHtml(BUSINESS.phoneSecondary)}</a></p>
      <p><a href="mailto:${escapeHtml(BUSINESS.email)}">${escapeHtml(BUSINESS.email)}</a></p>
    </div>
    <div>
      <h3>${copy.footer.serveHead}</h3>
      <ul>${BUSINESS.serves.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ul>
    </div>
  </div>
  <p class="foot-legal">${
    fill(copy.footer.legalTmpl, { year: new Date().getFullYear(), name: escapeHtml(BUSINESS.name) })
  }</p>
</footer>
<script src="/app.js" defer></script>
</body>
</html>`;
}

/** Home page. `visits` demonstrates live Deno KV state. */
export function homePage(copy: Copy, testimonials: Testimonial[], visits: number): string {
  const h = copy.home;
  const trio = (t: { icon: string; title: string; body: string }) =>
    `<article class="card"><div class="card-icon" aria-hidden="true">${t.icon}</div><h3>${t.title}</h3><p>${t.body}</p></article>`;
  const step = (s: { icon: string; title: string; body: string }) =>
    `<li><span class="step-num">${s.icon}</span><h3>${s.title}</h3><p>${s.body}</p></li>`;
  return `
<section class="hero">
  <div class="hero-inner">
    <p class="hero-kicker">${h.kicker}</p>
    <h1>${h.title} <span class="hl">${h.titleHl}</span></h1>
    <p class="hero-sub">${h.sub}</p>
    ${ctaRow(copy)}
    <p class="hero-trust">${h.trust}</p>
  </div>
</section>

<section class="band">
  <h2>${h.servicesHead}</h2>
  <div class="cards">${h.services.map(trio).join("")}</div>
</section>

<section class="band band-dark">
  <h2>${h.stepsHead}</h2>
  <ol class="steps">${h.steps.map(step).join("")}</ol>
  ${ctaRow(copy)}
</section>

<section class="band">
  <h2>${h.reviewsHead}</h2>
  <div class="cards">${testimonials.map(renderTestimonial).join("")}</div>
</section>

<section class="band band-accent">
  <div class="locate">
    <div>
      <h2>${h.findHead}</h2>
      <p class="address-big">${escapeHtml(fullAddress())}</p>
      <p>${h.nearby}</p>
      ${ctaRow(copy)}
      <p class="kv-stat">${fill(h.trustedTmpl, { n: visits.toLocaleString() })}</p>
    </div>
    <a class="map-link" href="https://maps.google.com/?q=${
    encodeURIComponent(fullAddress())
  }" rel="noopener noreferrer" target="_blank">
      <span aria-hidden="true">📍</span> ${h.mapCta}
    </a>
  </div>
</section>`;
}

function renderTestimonial(t: Testimonial): string {
  const stars = "★".repeat(Math.max(0, Math.min(5, t.stars)));
  return `<article class="card testimonial">
    <p class="stars" aria-label="${t.stars} / 5">${stars}</p>
    <blockquote>${escapeHtml(t.text)}</blockquote>
    <footer>— ${escapeHtml(t.author)}, ${escapeHtml(t.location)}</footer>
  </article>`;
}

/** "How bail works" educational page (Oklahoma-specific). */
export function howItWorksPage(copy: Copy): string {
  const w = copy.how;
  return `
<section class="page-hero">
  <h1>${w.title}</h1>
  <p>${w.intro}</p>
</section>
<section class="band prose">
  <h2>${w.processHead}</h2>
  <p>${w.processBody}</p>
  <h2>${w.faqHead}</h2>
  <div class="faq">
    ${w.faqs.map((f) => `<details><summary>${f.q}</summary><p>${f.a}</p></details>`).join("")}
  </div>
  ${ctaRow(copy)}
</section>`;
}

/** Bail premium calculator page. Math also runs client-side in app.js. */
export function calculatorPage(copy: Copy): string {
  const c = copy.calc;
  const rate = BUSINESS.premiumRate * 100;
  // app.js reads data-template and substitutes {amt} for a live, localized result.
  const template = fill(c.resultTmpl, { rate, amt: "{amt}" });
  return `
<section class="page-hero">
  <h1>${c.title}</h1>
  <p>${fill(c.intro, { rate })}</p>
</section>
<section class="band">
  <form class="calc" id="calc-form" action="/calculator" method="post" novalidate>
    <label for="bail">${c.label}</label>
    <div class="money-input">
      <span aria-hidden="true">$</span>
      <input type="text" inputmode="decimal" id="bail" name="bail" placeholder="10,000" autocomplete="off" required>
    </div>
    <button class="btn btn-primary" type="submit">${c.button}</button>
    <output id="calc-result" class="calc-result" aria-live="polite" data-template="${
    escapeHtml(template)
  }"></output>
    <p class="fineprint">${c.fineprint}</p>
  </form>
  ${ctaRow(copy)}
</section>`;
}

/** Server-rendered result fragment for a no-JS calculator submission. */
export function calculatorResult(copy: Copy, bail: number, premium: number): string {
  const c = copy.calc;
  const rate = BUSINESS.premiumRate * 100;
  return `
<section class="page-hero">
  <h1>${c.yourEstimate}</h1>
</section>
<section class="band">
  <div class="estimate-box">
    <p>${fill(c.forAmountTmpl, { bail: fmtUsd(bail) })}</p>
    <p class="estimate-figure">${fmtUsd(premium)}</p>
    <p>${fill(c.premiumNote, { rate })}</p>
  </div>
  ${ctaRow(copy)}
</section>`;
}

/** Find-an-inmate / jail-info hub with official outbound resources. */
export function jailPage(copy: Copy): string {
  const j = copy.jail;
  const card = (r: { icon: string; title: string; body: string; href: string; cta: string }) =>
    `<article class="card resource">
      <div class="card-icon" aria-hidden="true">${r.icon}</div>
      <h3>${r.title}</h3>
      <p>${r.body}</p>
      <a class="btn btn-ghost" href="${
      escapeHtml(r.href)
    }" target="_blank" rel="noopener noreferrer nofollow">${r.cta} ↗</a>
    </article>`;
  return `
<section class="page-hero">
  <h1>${j.title}</h1>
  <p>${j.intro}</p>
</section>
<section class="band">
  <h2>${j.resourcesHead}</h2>
  <div class="cards">${j.resources.map(card).join("")}</div>
</section>
<section class="band band-dark">
  <h2>${j.bringHead}</h2>
  <ul class="checklist">${j.bring.map((b) => `<li>${escapeHtml(b)}</li>`).join("")}</ul>
  <p class="fineprint">${j.disclaimer}</p>
  ${ctaRow(copy)}
</section>
<section class="band band-accent">
  <div class="locate">
    <div>
      <h2>${COUNTY_JAIL.name}</h2>
      <p class="address-big">${escapeHtml(COUNTY_JAIL.address)}</p>
      <p>${copy.footer.availHead}: <a href="tel:${COUNTY_JAIL.phoneTel}">${
    escapeHtml(COUNTY_JAIL.phone)
  }</a></p>
      ${ctaRow(copy)}
    </div>
    <a class="map-link" href="https://maps.google.com/?q=${
    encodeURIComponent(COUNTY_JAIL.address)
  }" rel="noopener noreferrer" target="_blank"><span aria-hidden="true">📍</span> ${copy.home.mapCta}</a>
  </div>
</section>`;
}

/** Contact / lead-capture form. `csrf` is the double-submit token. */
export function contactPage(copy: Copy, csrf: string, error?: string): string {
  const c = copy.contact;
  const field = (name: string, label: string, type: string, required: boolean, extra = "") => `
    <div class="field">
      <label for="${name}">${escapeHtml(label)}${
    required ? ' <span class="req">*</span>' : ""
  }</label>
      <input type="${type}" id="${name}" name="${name}" ${required ? "required" : ""} ${extra}>
    </div>`;
  return `
<section class="page-hero">
  <h1>${c.title}</h1>
  <p>${c.introPre}<a href="tel:${BUSINESS.phonePrimaryTel}">${
    escapeHtml(BUSINESS.phonePrimary)
  }</a>${c.introPost}</p>
</section>
<section class="band">
  ${error ? `<p class="form-error" role="alert">${escapeHtml(error)}</p>` : ""}
  <form class="lead-form" action="/contact" method="post" novalidate>
    <input type="hidden" name="csrf" value="${escapeHtml(csrf)}">
    <input type="text" name="company" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true">
    <div class="field-grid">
      ${field("name", c.name, "text", true, 'autocomplete="name" maxlength="80"')}
      ${field("phone", c.phone, "tel", true, 'autocomplete="tel" maxlength="20"')}
      ${field("email", c.email, "email", false, 'autocomplete="email" maxlength="254"')}
      ${field("defendant", c.defendant, "text", true, 'maxlength="80"')}
      ${field("facility", c.facility, "text", false, 'maxlength="120"')}
    </div>
    <div class="field">
      <label for="message">${escapeHtml(c.messageLabel)}</label>
      <textarea id="message" name="message" rows="4" maxlength="2000"></textarea>
    </div>
    <button class="btn btn-primary btn-block" type="submit">${c.submit}</button>
    <p class="fineprint">${c.consent}</p>
  </form>
</section>`;
}

/** Confirmation page after a successful lead submission. */
export function thankYouPage(copy: Copy, lead: StoredLead): string {
  const t = copy.thankyou;
  return `
<section class="page-hero">
  <h1>${fill(t.titleTmpl, { name: escapeHtml(lead.name.split(" ")[0]) })}</h1>
  <p>${fill(t.subTmpl, { phone: escapeHtml(lead.phone) })}</p>
</section>
<section class="band">
  <div class="estimate-box">
    <p>${t.dontWait}</p>
    <p class="estimate-figure"><a href="tel:${BUSINESS.phonePrimaryTel}">${
    escapeHtml(BUSINESS.phonePrimary)
  }</a></p>
  </div>
</section>`;
}

/** Minimal admin dashboard (internal — kept in English). */
export function adminPage(stats: Stats, leads: StoredLead[]): string {
  const rows = leads.map((l) => `
    <tr>
      <td>${escapeHtml(new Date(l.createdAt).toLocaleString("en-US"))}</td>
      <td>${escapeHtml(l.name)}</td>
      <td><a href="tel:${escapeHtml(l.phone)}">${escapeHtml(l.phone)}</a></td>
      <td>${escapeHtml(l.defendant)}</td>
      <td>${escapeHtml(l.facility || "—")}</td>
      <td>${escapeHtml(l.message || "—")}</td>
    </tr>`).join("");
  return `
<section class="page-hero">
  <h1>Admin Dashboard</h1>
  <p>Live data persisted in Deno KV.</p>
</section>
<section class="band">
  <div class="cards">
    <article class="card stat-card"><h3>Page Visits</h3><p class="big-num">${stats.visits.toLocaleString()}</p></article>
    <article class="card stat-card"><h3>Leads Captured</h3><p class="big-num">${stats.leads.toLocaleString()}</p></article>
    <article class="card stat-card"><h3>Alerts Sent</h3><p class="big-num">${stats.notifications.toLocaleString()}</p></article>
  </div>
  <h2>Recent Leads</h2>
  <div class="table-wrap">
    <table class="leads-table">
      <thead><tr><th>When</th><th>Name</th><th>Phone</th><th>Defendant</th><th>Facility</th><th>Message</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="6">No leads yet.</td></tr>'}</tbody>
    </table>
  </div>
</section>`;
}

/** Generic error page. */
export function errorPage(status: number, message: string, back: string): string {
  return `
<section class="page-hero">
  <h1>${status}</h1>
  <p>${escapeHtml(message)}</p>
  <p><a class="btn btn-primary" href="/">${escapeHtml(back)}</a></p>
</section>`;
}
