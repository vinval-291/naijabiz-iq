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
async function shot(page: Page, name: string) {
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
  await shot(page, `${label}-6-dashboard`);

  // State survives a refresh (localStorage).
  await page.reload();
  await page.getByText("Key insight").waitFor();
  console.log("  ✓ dashboard survives refresh");

  await browser.close();
}

(async () => {
  await journey("desktop", { width: 1280, height: 800 });
  await journey("mobile", { width: 390, height: 844 });
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
