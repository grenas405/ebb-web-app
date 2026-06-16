/**
 * seo.ts — Discovery primitives: structured data, social meta, sitemap, robots.
 *
 * Unix philosophy: pure string builders, no I/O. Each function emits one kind
 * of markup/text. Handlers and the layout compose them. Helps the site rank in
 * "bail bonds near me" local results and preview cleanly when shared.
 */

import { BUSINESS, COUNTY_JAIL } from "./config.ts";
import { escapeHtml } from "./security.ts";

/** Public-facing paths included in the sitemap (no admin/health). */
export const PUBLIC_PATHS = ["/", "/how-it-works", "/calculator", "/jail", "/contact"] as const;

/**
 * LocalBusiness JSON-LD for rich results and local SEO.
 *
 * Emitted as <script type="application/ld+json">: this is a *data* block, not
 * executable script, so it is exempt from our strict `script-src 'self'` CSP
 * and needs no nonce. Search engines read it; browsers never execute it.
 */
export function localBusinessJsonLd(origin: string): string {
  const a = BUSINESS.address;
  const data = {
    "@context": "https://schema.org",
    "@type": "BailBondsAgent",
    name: BUSINESS.name,
    image: `${origin}/favicon.svg`,
    url: `${origin}/`,
    telephone: BUSINESS.phonePrimaryTel,
    email: BUSINESS.email,
    priceRange: "10% premium · payment plans available",
    address: {
      "@type": "PostalAddress",
      streetAddress: a.street,
      addressLocality: a.city,
      addressRegion: a.state,
      postalCode: a.zip,
      addressCountry: "US",
    },
    areaServed: BUSINESS.serves,
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      opens: "00:00",
      closes: "23:59",
    },
    knowsLanguage: ["en", "es"],
    nearTo: COUNTY_JAIL.name,
  };
  // JSON.stringify escapes quotes; additionally neutralize "</" so the JSON can
  // never break out of the <script> element.
  const json = JSON.stringify(data).replace(/<\//g, "<\\/");
  return `<script type="application/ld+json">${json}</script>`;
}

/** OpenGraph + Twitter meta tags for clean link previews. */
export function socialMeta(opts: {
  title: string;
  description: string;
  url: string;
  image: string;
}): string {
  const e = escapeHtml;
  return [
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="${e(BUSINESS.name)}">`,
    `<meta property="og:title" content="${e(opts.title)}">`,
    `<meta property="og:description" content="${e(opts.description)}">`,
    `<meta property="og:url" content="${e(opts.url)}">`,
    `<meta property="og:image" content="${e(opts.image)}">`,
    `<meta name="twitter:card" content="summary">`,
    `<meta name="twitter:title" content="${e(opts.title)}">`,
    `<meta name="twitter:description" content="${e(opts.description)}">`,
  ].join("\n");
}

/** Build an XML sitemap of public pages for the given site origin. */
export function sitemapXml(origin: string): string {
  const urls = PUBLIC_PATHS.map((p) =>
    `  <url><loc>${escapeHtml(origin + p)}</loc><changefreq>weekly</changefreq></url>`
  ).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

/** robots.txt allowing crawl of public pages and pointing at the sitemap. */
export function robotsTxt(origin: string): string {
  return [
    "User-agent: *",
    "Allow: /",
    "Disallow: /admin",
    `Sitemap: ${origin}/sitemap.xml`,
    "",
  ].join("\n");
}
