/**
 * config.ts — Single source of truth for business + runtime constants.
 *
 * Unix philosophy: this module does one thing — expose immutable
 * configuration. No side effects, no I/O. Everything else composes over it.
 */

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

/** Runtime configuration resolved from the environment (12-factor style). */
export interface RuntimeConfig {
  readonly port: number;
  readonly hostname: string;
  readonly staticRoot: string;
  /** Trust X-Forwarded-For (only behind a known proxy). */
  readonly trustProxy: boolean;
}

/** Read runtime config from the environment with safe defaults. */
export function loadRuntimeConfig(): RuntimeConfig {
  return {
    port: Number(Deno.env.get("PORT") ?? "8000"),
    hostname: Deno.env.get("HOST") ?? "0.0.0.0",
    staticRoot: new URL("../static", import.meta.url).pathname,
    trustProxy: Deno.env.get("TRUST_PROXY") === "1",
  };
}

/** Full single-line postal address. */
export function fullAddress(): string {
  const a = BUSINESS.address;
  return `${a.street}, ${a.city}, ${a.state} ${a.zip}`;
}
