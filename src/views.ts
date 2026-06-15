/**
 * views.ts — Server-side HTML rendering as small composable functions.
 *
 * Every function returns a string of HTML. Untrusted values are passed through
 * escapeHtml at the point of interpolation. There is no template engine and no
 * inline script — strict CSP stays intact.
 */

import { BUSINESS, fullAddress } from "./config.ts";
import { escapeHtml } from "./security.ts";
import type { StoredLead, Testimonial } from "./kv.ts";

/** Wrap page body in the shared document shell (header, nav, footer). */
export function layout(title: string, body: string, opts: { active?: string } = {}): string {
  const a = (id: string, label: string, href: string) =>
    `<a href="${href}" class="${opts.active === id ? "active" : ""}">${label}</a>`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="${
    escapeHtml(BUSINESS.name)
  } — 24/7 bail bonds in Oklahoma City. Fast, affordable, family-owned. Call ${
    escapeHtml(BUSINESS.phonePrimary)
  }.">
<meta name="theme-color" content="#0d0d0d">
<title>${escapeHtml(title)} · ${escapeHtml(BUSINESS.name)}</title>
<link rel="preconnect" href="/">
<link rel="stylesheet" href="/styles.css">
</head>
<body>
<a class="skip-link" href="#main">Skip to content</a>
<div class="callbar" role="region" aria-label="Call now">
  <span class="callbar-pulse" aria-hidden="true"></span>
  Arrested? We answer 24/7 —
  <a href="tel:${BUSINESS.phonePrimaryTel}">${escapeHtml(BUSINESS.phonePrimary)}</a>
</div>
<header class="site-header">
  <a class="brand" href="/">
    <span class="brand-mark" aria-hidden="true">⚖</span>
    <span class="brand-text">${escapeHtml(BUSINESS.name)}</span>
  </a>
  <nav class="site-nav" aria-label="Primary">
    ${a("home", "Home", "/")}
    ${a("how", "How Bail Works", "/how-it-works")}
    ${a("calc", "Bail Calculator", "/calculator")}
    ${a("contact", "Get Help Now", "/contact")}
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
      <p>Family-owned · Licensed Oklahoma bondsman</p>
    </div>
    <div>
      <h3>Available 24 Hours</h3>
      <p><a href="tel:${BUSINESS.phonePrimaryTel}">${escapeHtml(BUSINESS.phonePrimary)}</a></p>
      <p><a href="tel:${BUSINESS.phoneSecondaryTel}">${escapeHtml(BUSINESS.phoneSecondary)}</a></p>
      <p><a href="mailto:${escapeHtml(BUSINESS.email)}">${escapeHtml(BUSINESS.email)}</a></p>
    </div>
    <div>
      <h3>We Serve</h3>
      <ul>${BUSINESS.serves.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ul>
    </div>
  </div>
  <p class="foot-legal">© ${new Date().getFullYear()} ${
    escapeHtml(BUSINESS.name)
  }. All rights reserved. This site is a demonstration and not legal advice.</p>
</footer>
<script src="/app.js" defer></script>
</body>
</html>`;
}

/** Reusable call-to-action button row. */
function ctaRow(): string {
  return `<div class="cta-row">
    <a class="btn btn-primary" href="tel:${BUSINESS.phonePrimaryTel}">Call Now: ${
    escapeHtml(BUSINESS.phonePrimary)
  }</a>
    <a class="btn btn-ghost" href="/contact">Request a Bondsman</a>
  </div>`;
}

/** Home page. `visits` demonstrates live Deno KV state. */
export function homePage(testimonials: Testimonial[], visits: number): string {
  const services = [
    [
      "🏛️",
      "Felony &amp; Misdemeanor Bonds",
      "Any charge, any amount — we post bonds across the OKC metro.",
    ],
    [
      "⏱️",
      "Fast Release",
      "We start your paperwork the moment you call to get your loved one home.",
    ],
    [
      "💵",
      "Flexible Payment Plans",
      "Affordable options and financing so cost never keeps family apart.",
    ],
    [
      "🔒",
      "Confidential &amp; Respectful",
      "Your situation stays private. We treat every client with dignity.",
    ],
  ];
  const steps = [
    ["1", "Call Us", "Phone us any hour. We gather the defendant's name and the jail."],
    [
      "2",
      "We Quote You",
      "You pay a small percentage of the bail — clear, up front, no surprises.",
    ],
    ["3", "We Post Bond", "Our licensed bondsman heads to the jail and posts the bond."],
    ["4", "Go Home", "Your loved one is released so they can prepare for court with family."],
  ];
  return `
<section class="hero">
  <div class="hero-inner">
    <p class="hero-kicker">Oklahoma City · Available 24/7 · Family-Owned</p>
    <h1>Get Your Loved One <span class="hl">Home Tonight</span></h1>
    <p class="hero-sub">${
    escapeHtml(BUSINESS.tagline)
  } Serving the Oklahoma County Detention Center and the entire OKC metro with fast, affordable, judgment-free bail bonds.</p>
    ${ctaRow()}
    <p class="hero-trust">★★★★★ Rated 5 stars · BBB-listed · Licensed Oklahoma bondsman</p>
  </div>
</section>

<section class="band">
  <h2>How We Help Oklahoma Families</h2>
  <div class="cards">
    ${
    services.map(([icon, t, d]) =>
      `<article class="card"><div class="card-icon" aria-hidden="true">${icon}</div><h3>${t}</h3><p>${d}</p></article>`
    ).join("")
  }
  </div>
</section>

<section class="band band-dark">
  <h2>Out in 4 Simple Steps</h2>
  <ol class="steps">
    ${
    steps.map(([n, t, d]) =>
      `<li><span class="step-num">${n}</span><h3>${escapeHtml(t)}</h3><p>${escapeHtml(d)}</p></li>`
    ).join("")
  }
  </ol>
  ${ctaRow()}
</section>

<section class="band">
  <h2>What Your Neighbors Say</h2>
  <div class="cards">
    ${testimonials.map(renderTestimonial).join("")}
  </div>
</section>

<section class="band band-accent">
  <div class="locate">
    <div>
      <h2>Find Us &amp; Call Anytime</h2>
      <p class="address-big">${escapeHtml(fullAddress())}</p>
      <p>Minutes from the Oklahoma County Detention Center.</p>
      ${ctaRow()}
      <p class="kv-stat">Trusted by <strong>${visits.toLocaleString()}</strong> visitors and counting.</p>
    </div>
    <a class="map-link" href="https://maps.google.com/?q=${
    encodeURIComponent(fullAddress())
  }" rel="noopener noreferrer" target="_blank">
      <span aria-hidden="true">📍</span> Open in Google Maps
    </a>
  </div>
</section>`;
}

function renderTestimonial(t: Testimonial): string {
  const stars = "★".repeat(Math.max(0, Math.min(5, t.stars)));
  return `<article class="card testimonial">
    <p class="stars" aria-label="${t.stars} out of 5 stars">${stars}</p>
    <blockquote>${escapeHtml(t.text)}</blockquote>
    <footer>— ${escapeHtml(t.author)}, ${escapeHtml(t.location)}</footer>
  </article>`;
}

/** "How bail works" educational page (Oklahoma-specific). */
export function howItWorksPage(): string {
  const faqs = [
    [
      "How much does a bail bond cost in Oklahoma?",
      "Oklahoma bondsmen typically charge a non-refundable premium of about 10% of the total bail amount. On a $10,000 bond that's roughly $1,000. We offer payment plans to make it manageable.",
    ],
    [
      "How long does release take?",
      "Once the bond is posted, the Oklahoma County Detention Center usually takes 4–12 hours to process a release depending on volume. Smaller county jails are often faster.",
    ],
    [
      "What do you need from me?",
      "The defendant's full name and date of birth, the jail or county where they're held, and the bail amount if it's been set. We handle the rest.",
    ],
    [
      "Do you offer payment plans?",
      "Yes. We work with families on flexible, affordable financing so cost never keeps someone in jail longer than necessary.",
    ],
    [
      "What is collateral?",
      "For larger bonds we may ask for collateral (such as property) to secure the bond. It is returned when the case concludes and all court dates are met.",
    ],
  ];
  return `
<section class="page-hero">
  <h1>How Bail Bonds Work in Oklahoma</h1>
  <p>A clear, honest walkthrough for Oklahoma City families — no legal jargon.</p>
</section>
<section class="band prose">
  <h2>The Bail Process, Step by Step</h2>
  <p>When someone is arrested in Oklahoma City they are booked into jail — usually the
  Oklahoma County Detention Center. A judge sets the bail amount based on the charge,
  the person's history, and flight risk. You can pay the full cash bond yourself, or pay
  a licensed bondsman a small percentage to post the bond for you. Working with a
  bondsman means you pay far less out of pocket to get your loved one home today.</p>

  <h2>Frequently Asked Questions</h2>
  <div class="faq">
    ${
    faqs.map(([q, a]) =>
      `<details><summary>${escapeHtml(q)}</summary><p>${escapeHtml(a)}</p></details>`
    ).join("")
  }
  </div>
  ${ctaRow()}
</section>`;
}

/** Bail premium calculator page. Math also runs client-side in app.js. */
export function calculatorPage(): string {
  return `
<section class="page-hero">
  <h1>Free Bail Cost Estimate</h1>
  <p>See roughly what you'll pay to get your loved one out. Based on Oklahoma's standard ${
    BUSINESS.premiumRate * 100
  }% premium.</p>
</section>
<section class="band">
  <form class="calc" id="calc-form" action="/calculator" method="post" novalidate>
    <label for="bail">Total bail amount set by the court</label>
    <div class="money-input">
      <span aria-hidden="true">$</span>
      <input type="text" inputmode="decimal" id="bail" name="bail" placeholder="10,000" autocomplete="off" required>
    </div>
    <button class="btn btn-primary" type="submit">Estimate My Cost</button>
    <output id="calc-result" class="calc-result" aria-live="polite"></output>
    <p class="fineprint">Estimate only. Final premium and any payment plan are confirmed by a licensed bondsman. Premiums are non-refundable.</p>
  </form>
  ${ctaRow()}
</section>`;
}

/** Server-rendered result fragment for a no-JS calculator submission. */
export function calculatorResult(bail: number, premium: number): string {
  const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });
  return `
<section class="page-hero">
  <h1>Your Estimate</h1>
</section>
<section class="band">
  <div class="estimate-box">
    <p>For a bail amount of <strong>${fmt(bail)}</strong>, your estimated cost to a bondsman is:</p>
    <p class="estimate-figure">${fmt(premium)}</p>
    <p>That's our standard ${BUSINESS.premiumRate * 100}% premium. Ask about payment plans.</p>
  </div>
  ${ctaRow()}
</section>`;
}

/** Contact / lead-capture form. `csrf` is the double-submit token. */
export function contactPage(csrf: string, error?: string): string {
  const field = (
    name: string,
    label: string,
    type: string,
    required: boolean,
    extra = "",
  ) => `
    <div class="field">
      <label for="${name}">${escapeHtml(label)}${
    required ? ' <span class="req">*</span>' : ""
  }</label>
      <input type="${type}" id="${name}" name="${name}" ${required ? "required" : ""} ${extra}>
    </div>`;
  return `
<section class="page-hero">
  <h1>Get Help Now</h1>
  <p>Fill this out and we'll call you back fast — or just call <a href="tel:${BUSINESS.phonePrimaryTel}">${
    escapeHtml(BUSINESS.phonePrimary)
  }</a> right now, 24/7.</p>
</section>
<section class="band">
  ${error ? `<p class="form-error" role="alert">${escapeHtml(error)}</p>` : ""}
  <form class="lead-form" action="/contact" method="post" novalidate>
    <input type="hidden" name="csrf" value="${escapeHtml(csrf)}">
    <input type="text" name="company" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true">
    <div class="field-grid">
      ${field("name", "Your name", "text", true, 'autocomplete="name" maxlength="80"')}
      ${field("phone", "Your phone", "tel", true, 'autocomplete="tel" maxlength="20"')}
      ${
    field("email", "Your email (optional)", "email", false, 'autocomplete="email" maxlength="254"')
  }
      ${field("defendant", "Defendant's name", "text", true, 'maxlength="80"')}
      ${field("facility", "Jail / county (if known)", "text", false, 'maxlength="120"')}
    </div>
    <div class="field">
      <label for="message">Anything we should know? (charge, bail amount, etc.)</label>
      <textarea id="message" name="message" rows="4" maxlength="2000"></textarea>
    </div>
    <button class="btn btn-primary btn-block" type="submit">Send — We'll Call You Back</button>
    <p class="fineprint">Your information is kept confidential. By submitting you consent to be contacted about bail services.</p>
  </form>
</section>`;
}

/** Confirmation page after a successful lead submission. */
export function thankYouPage(lead: StoredLead): string {
  return `
<section class="page-hero">
  <h1>We've Got It, ${escapeHtml(lead.name.split(" ")[0])} 🙏</h1>
  <p>A bondsman will call <strong>${
    escapeHtml(lead.phone)
  }</strong> shortly. Need help this minute?</p>
</section>
<section class="band">
  <div class="estimate-box">
    <p>Don't wait by the phone — call us directly, any hour:</p>
    <p class="estimate-figure"><a href="tel:${BUSINESS.phonePrimaryTel}">${
    escapeHtml(BUSINESS.phonePrimary)
  }</a></p>
  </div>
</section>`;
}

/** Minimal admin dashboard demonstrating persisted KV data. */
export function adminPage(stats: { visits: number; leads: number }, leads: StoredLead[]): string {
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
export function errorPage(status: number, message: string): string {
  return `
<section class="page-hero">
  <h1>${status}</h1>
  <p>${escapeHtml(message)}</p>
  <p><a class="btn btn-primary" href="/">Back to safety</a></p>
</section>`;
}
