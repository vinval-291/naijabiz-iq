// WhatsApp alerts (Twilio). GET: is sending set up? POST: write an alert with the engine and send it.
//
// The browser picks only the alert type (and amount); the server writes the text from verified numbers
// and sends it to the ONE number in ALERT_WHATSAPP_TO. Secrets stay in .env.local / the host's env vars.

import { createRateLimiter, parseAlertRequest, writeAlert, type AlertResponse, type AlertStatus } from "@/lib/alerts";
import { DEMO_ACCOUNT, DEMO_AS_OF, DEMO_TRANSACTIONS } from "@/lib/demo";
import { analyze } from "@/lib/engine";
import { maskNumber, sendWhatsApp, whatsAppConfig } from "@/lib/twilio";

const MIN_INTERVAL_MS = 20_000;
const rateLimit = createRateLimiter(MIN_INTERVAL_MS);
const transactionIds = new Set(DEMO_TRANSACTIONS.map((t) => t.id));

export async function GET() {
  const config = whatsAppConfig();
  return Response.json({ configured: Boolean(config), to: config ? maskNumber(config.to) : null } satisfies AlertStatus);
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Expected a JSON body." }, { status: 400 });
  }
  const parsed = parseAlertRequest(body, transactionIds);
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });

  const { kind, amount, purpose, confirmations } = parsed.value;
  const message = writeAlert(analyze(DEMO_TRANSACTIONS, DEMO_ACCOUNT, DEMO_AS_OF, confirmations), { kind, amount, purpose });

  const config = whatsAppConfig();
  if (!config) {
    return Response.json({
      sent: false, reason: "not-configured", message,
      detail: "Live sending is off on this server, so nothing was sent.",
    } satisfies AlertResponse);
  }

  const wait = rateLimit(Date.now());
  if (wait > 0) {
    return Response.json(
      { sent: false, reason: "rate-limited", message, detail: `A WhatsApp alert was just sent. Try again in ${wait} seconds.` } satisfies AlertResponse,
      { status: 429 },
    );
  }

  const result = await sendWhatsApp(config, message);
  return Response.json(
    result.ok
      ? ({ sent: true, to: maskNumber(config.to), message, status: result.status } satisfies AlertResponse)
      : ({ sent: false, reason: "send-failed", message, detail: result.reason } satisfies AlertResponse),
  );
}
