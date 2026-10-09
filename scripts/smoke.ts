// Clicks through the demo journey in a real browser (installed Microsoft Edge) and saves screenshots.
//
//   npm run smoke -- [baseUrl] [outDir]      defaults: http://localhost:3100  ./.smoke

import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium, type Page } from "playwright-core";

const BASE = process.argv[2] ?? "http://localhost:3100";
const OUT = process.argv[3] ?? ".smoke";
mkdirSync(OUT, { recursive: true });

const errors: string[] = [];

/** Fails the run if anything makes the page wider than the screen (the browser would zoom out). */
async function assertNoOverflow(page: Page, where: string) {
  const { viewport, scrollWidth } = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  if (scrollWidth > viewport) errors.push(`${where}: page is ${scrollWidth}px wide on a ${viewport}px screen`);
}

async function shot(page: Page, name: string) {
  await assertNoOverflow(page, name);
  await page.screenshot({ path: join(OUT, `${name}.png`), fullPage: true });
  console.log(`  ✓ ${name}`);
}

async function journey(label: string, viewport: { width: number; height: number }) {
  console.log(`\n${label} (${viewport.width}×${viewport.height})`);
  const browser = await chromium.launch({ channel: "msedge" });
  const page = await browser.newPage({ viewport });
  page.on("pageerror", (e) => errors.push(`${label}: ${e.message}`));
  page.on("console", (m) => m.type() === "error" && errors.push(`${label} console: ${m.text()}`));

  await page.goto(BASE);
  await page.waitForTimeout(1500); // let the reveal animation finish
  await shot(page, `${label}-1-welcome`);

  await page.getByRole("link", { name: "Get started" }).click();
  await page.getByLabel("Business name").waitFor();
  await shot(page, `${label}-2-setup`);

  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Connect Wema account" }).click();
  await shot(page, `${label}-3-consent`);

  await page.getByRole("button", { name: "Allow and connect" }).click();
  await page.waitForTimeout(1400);
  await shot(page, `${label}-4-importing`);

  await page.getByText("247 transactions imported").first().waitFor({ timeout: 10_000 });
  await shot(page, `${label}-5-imported`);

  await page.getByRole("link", { name: "See my business" }).click();
  await page.getByText("Key insight").waitFor();
  await page.getByText("Your business at a glance").waitFor(); // simple mode is the default
  await shot(page, `${label}-6-dashboard`);

  // In-depth mode reveals the statistics; switch back so the rest of the journey runs in simple mode.
  await page.getByRole("button", { name: "In-depth", exact: true }).click();
  await page.getByText("Money in vs money out").waitFor();
  await shot(page, `${label}-6b-dashboard-in-depth`);
  await page.getByRole("button", { name: "Simple", exact: true }).click();
  await page.getByText("Your business at a glance").waitFor();

  // State survives a refresh (localStorage).
  await page.reload();
  await page.getByText("Key insight").waitFor();
  console.log("  ✓ dashboard survives refresh");

  // Review question: confirming one bare card purchase recognizes the similar ones.
  await page.goto(`${BASE}/transactions?view=review`);
  await page.getByRole("tab", { name: "Needs your input (7)" }).waitFor();
  await page.getByRole("button", { name: /POS PURCHASE/ }).first().click();
  await shot(page, `${label}-7-review`);
  await page.getByRole("button", { name: "Generator fuel" }).click();
  await page.getByText("We also recognized 4 similar transactions").waitFor();
  await page.getByRole("tab", { name: "Needs your input (2)" }).waitFor();
  await shot(page, `${label}-8-reviewed`);

  // Can I afford this? ₦300K → careful; the suggested amount → comfortable.
  await page.goto(`${BASE}/afford`);
  await page.getByLabel("How much do you want to spend?").fill("300000");
  await page.getByRole("button", { name: "Check", exact: true }).click();
  await page.getByRole("heading", { name: "You can, but be careful." }).waitFor();
  await shot(page, `${label}-9-afford`);
  await page.getByRole("button", { name: /^Check ₦\d+K instead$/ }).click();
  await page.getByRole("heading", { name: "Yes, you can afford this comfortably." }).waitFor();
  console.log("  ✓ suggested amount is comfortable");

  // WhatsApp alert: only exercised when Twilio isn't configured, so the smoke test never sends real messages.
  const { configured } = await (await page.request.get(`${BASE}/api/alerts/whatsapp`)).json();
  if (!configured) {
    await page.goto(`${BASE}/forecast`);
    await page.getByRole("button", { name: "Send this alert to my WhatsApp" }).click();
    await page.getByText("WhatsApp preview").waitFor();
    await page.getByText("about ₦393K around 12 Oct").first().waitFor();
    await shot(page, `${label}-10b-whatsapp-preview`);
  } else {
    console.log("  • WhatsApp is configured: skipped the send button (no real messages from tests)");
  }

  for (const [path, text, name] of [
    ["/forecast", "Medium cash pressure", "10-forecast"],
    ["/insights", "Business Health Score", "11-insights"],
    ["/advice", "Protect your operating cash reserve", "12-advice"],
    ["/readiness", "Next steps", "13-readiness"],
  ] as const) {
    await page.goto(`${BASE}${path}`);
    await page.getByText(text).first().waitFor();
    await shot(page, `${label}-${name}`);
  }

  // Charts drawn at desktop width must shrink when the screen narrows (DevTools, rotating a phone).
  if (viewport.width >= 1024) {
    await page.goto(`${BASE}/dashboard`);
    await page.getByRole("button", { name: "In-depth", exact: true }).click(); // the charts live in in-depth mode
    for (const path of ["/dashboard", "/forecast"]) {
      await page.goto(`${BASE}${path}`);
      await page.waitForTimeout(500);
      await page.setViewportSize({ width: 375, height: 812 });
      await page.waitForTimeout(500);
      await assertNoOverflow(page, `${label} ${path} after narrowing to 375px`);
      await page.setViewportSize(viewport);
    }
    console.log("  ✓ charts shrink when the screen narrows");
  }

  await browser.close();
}

(async () => {
  await journey("desktop", { width: 1280, height: 800 });
  await journey("mobile", { width: 390, height: 844 });
  await journey("small", { width: 320, height: 640 });
  if (errors.length) {
    console.log(`\n✗ ${errors.length} browser error(s):`);
    errors.forEach((e) => console.log(`  ${e}`));
    process.exit(1);
  }
  console.log(`\nAll steps passed. Screenshots in ${OUT}/`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
