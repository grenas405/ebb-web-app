/**
 * notify.ts — Deliver a new-lead alert to the bondsman.
 *
 * Unix philosophy: one job (turn a lead into an outbound alert), built from
 * small pieces — a pure formatter, a set of transports, and a dispatcher that
 * always records an audit trail in KV. Delivery never blocks or fails the
 * visitor's request; the worst case is a logged, stored notification.
 *
 * Transports degrade gracefully so the offline demo always "works":
 *   - log     — always runs; prints a clear alert to the server console.
 *   - webhook — runs only when NOTIFY_WEBHOOK_URL is set (Zapier/Make/CRM/SMS).
 * Swapping in real email/SMS later means adding one transport here — nothing
 * else in the app changes.
 */

import { BUSINESS } from "./config.ts";
import { type Kv, type NotificationLog, saveNotification } from "./kv.ts";
import type { StoredLead } from "./kv.ts";

/** A plain-text alert built from a lead. Pure — no I/O. */
export interface Alert {
  readonly subject: string;
  readonly text: string;
}

/** Format a lead into a concise, skimmable alert for a phone screen. */
export function formatAlert(lead: StoredLead): Alert {
  const lines = [
    `New bail lead for ${BUSINESS.name}`,
    `Name:      ${lead.name}`,
    `Phone:     ${lead.phone}`,
    lead.email ? `Email:     ${lead.email}` : "",
    `Defendant: ${lead.defendant}`,
    lead.facility ? `Facility:  ${lead.facility}` : "",
    lead.message ? `Message:   ${lead.message}` : "",
    `Received:  ${new Date(lead.createdAt).toLocaleString("en-US")}`,
  ].filter((l) => l !== "");
  return {
    subject: `📞 New bail lead: ${lead.name} (${lead.phone})`,
    text: lines.join("\n"),
  };
}

/** Result of one transport attempt. */
interface Delivery {
  readonly channel: string;
  readonly ok: boolean;
  readonly detail: string;
}

/** Console transport — always available, proves the feature works offline. */
function deliverToLog(alert: Alert): Delivery {
  console.log(
    `%c${alert.subject}`,
    "color:#ffd23f;font-weight:bold",
  );
  console.log(alert.text);
  return { channel: "log", ok: true, detail: "printed to server console" };
}

/** Webhook transport — POSTs the lead + alert as JSON when a URL is configured. */
async function deliverToWebhook(url: string, lead: StoredLead, alert: Alert): Promise<Delivery> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ subject: alert.subject, text: alert.text, lead }),
      signal: AbortSignal.timeout(5000),
    });
    return {
      channel: "webhook",
      ok: res.ok,
      detail: `POST ${url} → ${res.status}`,
    };
  } catch (err) {
    return {
      channel: "webhook",
      ok: false,
      detail: `POST ${url} failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/**
 * Notify the business of a new lead and record the outcome in KV.
 * Best-effort: any transport error is captured, never thrown.
 */
export async function notifyNewLead(
  kv: Kv,
  lead: StoredLead,
  webhookUrl: string | undefined,
): Promise<void> {
  const alert = formatAlert(lead);
  const deliveries: Delivery[] = [deliverToLog(alert)];
  if (webhookUrl) deliveries.push(await deliverToWebhook(webhookUrl, lead, alert));

  const log: NotificationLog = {
    id: crypto.randomUUID(),
    leadId: lead.id,
    createdAt: new Date().toISOString(),
    channel: deliveries.map((d) => d.channel).join("+"),
    ok: deliveries.every((d) => d.ok),
    detail: deliveries.map((d) => d.detail).join("; "),
  };
  try {
    await saveNotification(kv, log);
  } catch (err) {
    console.error("Failed to record notification:", err);
  }
}
