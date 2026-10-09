// Sends a WhatsApp message through Twilio's REST API (server only — reads secrets from the environment).

export interface WhatsAppConfig {
  accountSid: string;
  authToken: string;
  from: string; // "whatsapp:+14155238886" (Twilio sandbox)
  to: string;   // "whatsapp:+234…" — the single phone alerts may go to
}

export type SendResult =
  | { ok: true; sid: string; status: string }
  | { ok: false; reason: string; code?: number };

const API = "https://api.twilio.com/2010-04-01";
const TIMEOUT_MS = 10_000;
const STATUS_CHECKS = 3;
const STATUS_INTERVAL_MS = 1_200;

const WHATSAPP_NUMBER = /^whatsapp:\+\d{8,15}$/;

/** Reads the four settings from the environment; null if any is missing or malformed. */
export function whatsAppConfig(env: Record<string, string | undefined> = process.env): WhatsAppConfig | null {
  const config = {
    accountSid: env.TWILIO_ACCOUNT_SID?.trim() ?? "",
    authToken: env.TWILIO_AUTH_TOKEN?.trim() ?? "",
    from: env.TWILIO_WHATSAPP_FROM?.trim() ?? "",
    to: env.ALERT_WHATSAPP_TO?.trim() ?? "",
  };
  if (!/^AC[0-9a-fA-F]{32}$/.test(config.accountSid) || !config.authToken) return null;
  if (!WHATSAPP_NUMBER.test(config.from) || !WHATSAPP_NUMBER.test(config.to)) return null;
  return config;
}

/** "•••• 1234" — enough for the presenter to recognise the phone, never the full number. */
export function maskNumber(to: string): string {
  return `•••• ${to.replace(/\D/g, "").slice(-4)}`;
}

const FRIENDLY: Record<number, string> = {
  20003: "Twilio rejected the account details. Check TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in .env.local.",
  21211: "The phone number in ALERT_WHATSAPP_TO isn't valid. Use the format whatsapp:+234XXXXXXXXXX.",
  63007: "Twilio couldn't find that WhatsApp sender. TWILIO_WHATSAPP_FROM should be whatsapp:+14155238886 (the sandbox number).",
  63015: "This phone hasn't joined the WhatsApp Sandbox, or its 3-day opt-in has expired. Send your join code to +1 415 523 8886 on WhatsApp, then try again.",
  63016: "WhatsApp only allows this message within 24 hours of the phone messaging the sandbox. Send \"hi\" to +1 415 523 8886 from the demo phone, then try again.",
};

function failure(code: number | undefined, message: string | undefined): SendResult {
  return {
    ok: false,
    code,
    reason: (code && FRIENDLY[code]) || (code ? `Twilio error ${code}: ${message ?? "unknown error"}` : message ?? "Twilio didn't accept the message."),
  };
}

const auth = (c: WhatsAppConfig) => `Basic ${Buffer.from(`${c.accountSid}:${c.authToken}`).toString("base64")}`;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Sends `body` and briefly follows the message's status: Twilio accepts a message first and reports
 * problems such as "not joined the sandbox" (63015) a moment later.
 */
export async function sendWhatsApp(config: WhatsAppConfig, body: string, fetchImpl: typeof fetch = fetch, wait = sleep): Promise<SendResult> {
  const url = `${API}/Accounts/${config.accountSid}/Messages.json`;
  let created: { sid?: string; status?: string; code?: number; message?: string };
  try {
    const res = await fetchImpl(url, {
      method: "POST",
      headers: { Authorization: auth(config), "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ From: config.from, To: config.to, Body: body }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    created = await res.json();
    if (!res.ok || !created.sid) return failure(created.code, created.message);
  } catch {
    return { ok: false, reason: "Couldn't reach Twilio. Check the internet connection and try again." };
  }

  let status = created.status ?? "queued";
  for (let i = 0; i < STATUS_CHECKS && !["delivered", "read", "failed", "undelivered"].includes(status); i++) {
    await wait(STATUS_INTERVAL_MS);
    try {
      const res = await fetchImpl(`${API}/Accounts/${config.accountSid}/Messages/${created.sid}.json`, {
        headers: { Authorization: auth(config) },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      const m = (await res.json()) as { status?: string; error_code?: number | null; error_message?: string | null };
      status = m.status ?? status;
      if (status === "failed" || status === "undelivered") return failure(m.error_code ?? undefined, m.error_message ?? undefined);
    } catch {
      break; // accepted by Twilio; we just couldn't follow it further
    }
  }
  return { ok: true, sid: created.sid, status };
}
