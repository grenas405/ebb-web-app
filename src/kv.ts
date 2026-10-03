/**
 * kv.ts — Deno KV data layer. Persists leads, testimonials, and analytics.
 *
 * One module owns all KV key schemas, so the storage shape is explicit and the
 * rest of the app depends only on these typed functions (dependency inversion).
 */

import type { Lead } from "./validate.ts";
import { openMemoryKv } from "./memory_kv.ts";

/** Narrow alias so other modules don't import the whole Deno namespace. */
export type Kv = Deno.Kv;

/** A persisted lead with server-assigned id + timestamp. */
export interface StoredLead extends Lead {
  readonly id: string;
  readonly createdAt: string;
}

/** A customer testimonial shown as social proof. */
export interface Testimonial {
  readonly author: string;
  readonly location: string;
  readonly stars: number;
  readonly text: string;
}

/** An audit record of a lead-notification delivery attempt. */
export interface NotificationLog {
  readonly id: string;
  readonly leadId: string;
  readonly createdAt: string;
  /** Delivery channel that handled it, e.g. "log" or "webhook". */
  readonly channel: string;
  readonly ok: boolean;
  readonly detail: string;
}

/**
 * Open the default KV store (on disk locally, managed on Deno Deploy). If none
 * is available — e.g. a Deploy app with no KV database attached — fall back to
 * an in-memory store so the site still boots; data then won't survive restarts.
 */
export async function openKv(): Promise<Kv> {
  try {
    return await Deno.openKv();
  } catch (err) {
    console.warn(
      `⚠  Deno KV unavailable (${err instanceof Error ? err.message : String(err)})\n` +
        "   Using an in-memory store: leads and stats will NOT persist across restarts.",
    );
    return openMemoryKv();
  }
}

/** Persist a validated lead and return the stored record. */
export async function saveLead(kv: Kv, lead: Lead): Promise<StoredLead> {
  const id = crypto.randomUUID();
  const stored: StoredLead = { ...lead, id, createdAt: new Date().toISOString() };
  // Time-ordered key so leads list newest-first via reverse iteration.
  await kv.set(["lead", stored.createdAt, id], stored);
  await kv.atomic().sum(["stats", "leads"], 1n).commit();
  return stored;
}

/** List the most recent leads (admin view), newest first. */
export async function recentLeads(kv: Kv, limit = 50): Promise<StoredLead[]> {
  const out: StoredLead[] = [];
  const iter = kv.list<StoredLead>({ prefix: ["lead"] }, { reverse: true, limit });
  for await (const entry of iter) out.push(entry.value);
  return out;
}

/** Atomically increment and read the homepage visit counter. */
export async function bumpVisits(kv: Kv): Promise<number> {
  await kv.atomic().sum(["stats", "visits"], 1n).commit();
  const v = await kv.get<Deno.KvU64>(["stats", "visits"]);
  return v.value ? Number(v.value.value) : 0;
}

/** Persist a notification audit record and bump the notifications counter. */
export async function saveNotification(kv: Kv, n: NotificationLog): Promise<void> {
  await kv.set(["notification", n.createdAt, n.id], n);
  await kv.atomic().sum(["stats", "notifications"], 1n).commit();
}

/** Aggregate stats for the admin dashboard. */
export interface Stats {
  readonly visits: number;
  readonly leads: number;
  readonly notifications: number;
}

/** Read aggregate stats for the admin dashboard. */
export async function readStats(kv: Kv): Promise<Stats> {
  const [visits, leads, notifications] = await kv.getMany<
    [Deno.KvU64, Deno.KvU64, Deno.KvU64]
  >([
    ["stats", "visits"],
    ["stats", "leads"],
    ["stats", "notifications"],
  ]);
  const n = (v: { value: Deno.KvU64 | null }) => v.value ? Number(v.value.value) : 0;
  return { visits: n(visits), leads: n(leads), notifications: n(notifications) };
}

/** Seed testimonials once (idempotent) so the demo always has social proof. */
export async function seedTestimonials(kv: Kv): Promise<void> {
  const marker = await kv.get(["seeded", "testimonials"]);
  if (marker.value) return;
  const seed: Testimonial[] = [
    {
      author: "Maria G.",
      location: "South OKC",
      stars: 5,
      text:
        "They answered the phone at 3 in the morning and had my brother out of the county jail before lunch. Esmeralda treated us like family.",
    },
    {
      author: "James T.",
      location: "Del City",
      stars: 5,
      text:
        "Honest about the costs up front, no surprises. Payment plan made it possible. I can't thank them enough.",
    },
    {
      author: "Andrea R.",
      location: "Moore, OK",
      stars: 5,
      text:
        "Fast, respectful, and they walked me through every step of the bail process. Highly recommend to anyone in the metro.",
    },
  ];
  const atomic = kv.atomic();
  seed.forEach((t, i) => atomic.set(["testimonial", i], t));
  atomic.set(["seeded", "testimonials"], true);
  await atomic.commit();
}

/** List seeded testimonials. */
export async function listTestimonials(kv: Kv): Promise<Testimonial[]> {
  const out: Testimonial[] = [];
  for await (const e of kv.list<Testimonial>({ prefix: ["testimonial"] })) out.push(e.value);
  return out;
}
