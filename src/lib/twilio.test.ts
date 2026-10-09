import { describe, expect, it, vi } from "vitest";
import { maskNumber, sendWhatsApp, whatsAppConfig, type WhatsAppConfig } from "./twilio";

const ENV = {
  TWILIO_ACCOUNT_SID: "AC" + "0123456789abcdef".repeat(2),
  TWILIO_AUTH_TOKEN: "secret-token",
  TWILIO_WHATSAPP_FROM: "whatsapp:+14155238886",
  ALERT_WHATSAPP_TO: "whatsapp:+2348012345678",
};
const config = whatsAppConfig(ENV) as WhatsAppConfig;
const noWait = async () => {};

/** A fake Twilio: first response for the create call, then one per status check. */
function fakeTwilio(...responses: { status?: number; json: unknown }[]) {
  const calls: { url: string; init?: RequestInit }[] = [];
  const impl = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    const r = responses[Math.min(calls.length - 1, responses.length - 1)];
    return new Response(JSON.stringify(r.json), { status: r.status ?? 200 });
  });
  return { impl: impl as unknown as typeof fetch, calls };
}

describe("whatsAppConfig", () => {
  it("reads complete settings", () => {
    expect(config).toEqual({
      accountSid: ENV.TWILIO_ACCOUNT_SID, authToken: "secret-token",
      from: "whatsapp:+14155238886", to: "whatsapp:+2348012345678",
    });
  });

  it("is null when anything is missing or malformed", () => {
    expect(whatsAppConfig({})).toBeNull();
    expect(whatsAppConfig({ ...ENV, TWILIO_AUTH_TOKEN: "" })).toBeNull();
    expect(whatsAppConfig({ ...ENV, TWILIO_ACCOUNT_SID: "not-a-sid" })).toBeNull();
    expect(whatsAppConfig({ ...ENV, ALERT_WHATSAPP_TO: "+2348012345678" })).toBeNull(); // missing whatsapp: prefix
  });

  it("masks the number", () => {
    expect(maskNumber(config.to)).toBe("•••• 5678");
  });
});

describe("sendWhatsApp", () => {
  it("sends the message and reports delivery", async () => {
    const t = fakeTwilio({ status: 201, json: { sid: "SM1", status: "queued" } }, { json: { status: "delivered" } });
    expect(await sendWhatsApp(config, "Hello Aisha", t.impl, noWait)).toEqual({ ok: true, sid: "SM1", status: "delivered" });

    const [create] = t.calls;
    expect(create.url).toBe(`https://api.twilio.com/2010-04-01/Accounts/${ENV.TWILIO_ACCOUNT_SID}/Messages.json`);
    expect(create.init?.method).toBe("POST");
    expect(new Headers(create.init?.headers).get("Authorization")).toBe(
      `Basic ${Buffer.from(`${ENV.TWILIO_ACCOUNT_SID}:secret-token`).toString("base64")}`,
    );
    const form = create.init?.body as URLSearchParams;
    expect(Object.fromEntries(form)).toEqual({ From: "whatsapp:+14155238886", To: "whatsapp:+2348012345678", Body: "Hello Aisha" });
  });

  it("reports a phone that hasn't joined the sandbox (63015)", async () => {
    const t = fakeTwilio({ status: 201, json: { sid: "SM2", status: "queued" } }, { json: { status: "failed", error_code: 63015 } });
    const r = await sendWhatsApp(config, "x", t.impl, noWait);
    expect(r).toMatchObject({ ok: false, code: 63015 });
    expect(!r.ok && r.reason).toMatch(/hasn't joined the WhatsApp Sandbox/);
  });

  it("explains WhatsApp's 24-hour window (63016)", async () => {
    const t = fakeTwilio({ status: 201, json: { sid: "SM3", status: "queued" } }, { json: { status: "undelivered", error_code: 63016 } });
    const r = await sendWhatsApp(config, "x", t.impl, noWait);
    expect(!r.ok && r.reason).toMatch(/within 24 hours/);
  });

  it("reports bad credentials at creation (20003)", async () => {
    const t = fakeTwilio({ status: 401, json: { code: 20003, message: "Authenticate" } });
    const r = await sendWhatsApp(config, "x", t.impl, noWait);
    expect(!r.ok && r.reason).toMatch(/TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN/);
    expect(t.calls).toHaveLength(1);
  });

  it("passes through unknown Twilio errors", async () => {
    const t = fakeTwilio({ status: 400, json: { code: 99999, message: "Something odd" } });
    const r = await sendWhatsApp(config, "x", t.impl, noWait);
    expect(!r.ok && r.reason).toBe("Twilio error 99999: Something odd");
  });

  it("handles no internet", async () => {
    const offline = vi.fn(async () => { throw new TypeError("fetch failed"); }) as unknown as typeof fetch;
    const r = await sendWhatsApp(config, "x", offline, noWait);
    expect(!r.ok && r.reason).toMatch(/Couldn't reach Twilio/);
  });

  it("still reports accepted if the status can't be followed", async () => {
    let n = 0;
    const flaky = vi.fn(async () => {
      if (n++ === 0) return new Response(JSON.stringify({ sid: "SM4", status: "queued" }), { status: 201 });
      throw new TypeError("fetch failed");
    }) as unknown as typeof fetch;
    expect(await sendWhatsApp(config, "x", flaky, noWait)).toEqual({ ok: true, sid: "SM4", status: "queued" });
  });
});
