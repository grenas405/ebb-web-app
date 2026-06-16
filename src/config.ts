/**
 * config.ts — Single source of truth for business + runtime constants.
 *
 * Unix philosophy: this module does one thing — expose immutable
 * configuration. No side effects, no I/O. Everything else composes over it.
 */

import { fromFileUrl } from "@std/path";

/** Immutable business profile for Esmeralda's Bail Bonds. */
export const BUSINESS = {
  name: "Esmeralda's Bail Bonds",
  tagline: "Get Home Fast. Family-Owned. Available 24/7.",
  phonePrimary: "(405) 272-0806",
  phonePrimaryTel: "+14052720806",
  phoneSecondary: "(405) 650-4545",
  phoneSecondaryTel: "+14056504545",
  email: "esmeraldaarellano71@yahoo.com",
  address: {
    street: "2801 S Shields Blvd",
    city: "Oklahoma City",
    state: "OK",
    zip: "73129",
  },
  /** Standard Oklahoma bail bond premium (non-refundable). */
  premiumRate: 0.10,
  serves: [
    "Oklahoma County Detention Center",
    "Cleveland County",
    "Canadian County",
    "Pottawatomie County",
    "All Oklahoma City Metro courts",
  ],
} as const;

/** Reference data for the local jail (used by the Find-an-Inmate page). */
export const COUNTY_JAIL = {
  name: "Oklahoma County Detention Center",
  phone: "(405) 713-1000",
  phoneTel: "+14057131000",
  visitation: "(405) 713-2015",
  address: "201 N Shartel Ave, Oklahoma City, OK 73102",
  /** Official facility site with the resident/inmate search. */
  inmateSearchUrl: "https://www.okcountydc.net/",
} as const;

/** Official court / corrections lookups linked from the Find-an-Inmate page. */
export const COURT_RESOURCES = {
  /** Oklahoma State Courts Network — dockets, charges, hearing dates. */
  oscnUrl: "https://www.oscn.net/",
  /** Oklahoma Dept. of Corrections offender search. */
  docUrl: "https://oklahoma.gov/doc/offender-info.html",
} as const;

/** Runtime configuration resolved from the environment (12-factor style). */
export interface RuntimeConfig {
  readonly port: number;
  readonly hostname: string;
  /**
   * Absolute filesystem path to the static-asset directory, in the OS-native
   * form `@std/http`'s serveDir expects. We derive it with `fromFileUrl` (not
   * `URL.pathname`) so it is correct on every platform — notably Windows, where
   * `URL.pathname` yields an invalid `/C:/...` string.
   */
  readonly staticRoot: string;
  /** Trust X-Forwarded-For (only behind a known proxy). */
  readonly trustProxy: boolean;
  /**
   * Optional webhook that receives new leads as JSON (Zapier/Make/a CRM).
   * Unset = leads are logged + stored only, which keeps the offline demo working.
   */
  readonly notifyWebhookUrl: string | undefined;
}

/**
 * Resolve the static-asset directory for serveDir's fsRoot.
 *
 * Run from local files (dev, VPS, the Windows demo host) `import.meta.url` is a
 * `file://` URL, which we convert to a native OS path with `fromFileUrl`
 * (C:\... on Windows, /... on POSIX — never the invalid `/C:/...` form). On
 * hosts that load modules over `https://` (e.g. Deno Deploy), fall back to the
 * URL pathname, since `fromFileUrl` only accepts file URLs.
 */
function resolveStaticRoot(): string {
  const url = new URL("../static", import.meta.url);
  return url.protocol === "file:" ? fromFileUrl(url) : url.pathname;
}

/** Read runtime config from the environment with safe defaults. */
export function loadRuntimeConfig(): RuntimeConfig {
  return {
    port: Number(Deno.env.get("PORT") ?? "8000"),
    hostname: Deno.env.get("HOST") ?? "0.0.0.0",
    staticRoot: resolveStaticRoot(),
    trustProxy: Deno.env.get("TRUST_PROXY") === "1",
    notifyWebhookUrl: Deno.env.get("NOTIFY_WEBHOOK_URL") || undefined,
  };
}

/** Full single-line postal address. */
export function fullAddress(): string {
  const a = BUSINESS.address;
  return `${a.street}, ${a.city}, ${a.state} ${a.zip}`;
}
