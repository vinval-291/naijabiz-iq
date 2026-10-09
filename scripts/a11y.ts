// Accessibility scan (axe-core, WCAG 2.1 A/AA) of every screen, in installed Microsoft Edge.
// Exits with code 1 on any serious or critical violation.
//
//   npm run a11y -- [baseUrl]      default http://localhost:3100 (start the app first)

import AxeBuilder from "@axe-core/playwright";
import { chromium, type Page } from "playwright-core";

const BASE = process.argv[2] ?? "http://localhost:3100";
let blocking = 0;

async function scan(page: Page, name: string) {
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const serious = violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  blocking += serious.length;
  console.log(`${serious.length ? "✗" : "✓"} ${name}${violations.length ? `  (${violations.length} issue type${violations.length === 1 ? "" : "s"})` : ""}`);
  for (const v of violations) {
    console.log(`    [${v.impact}] ${v.id}: ${v.help} — ${v.nodes.length} element(s)`);
    for (const n of v.nodes.slice(0, 3)) console.log(`        ${n.target.join(" ")}  ${n.failureSummary?.split("\n")[1]?.trim() ?? ""}`);
  }
}

(async () => {
  const browser = await chromium.launch({ channel: "msedge" });
  for (const viewport of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
    console.log(`\n${viewport.width}px`);
    const context = await browser.newContext({ viewport, reducedMotion: "reduce" });
    const page = await context.newPage();

    await page.goto(BASE);
    await scan(page, "Welcome");
    await page.goto(`${BASE}/setup`);
    await scan(page, "Setup");
    await page.goto(`${BASE}/connect`);
    await scan(page, "Connect");
    await page.getByRole("button", { name: "Connect Wema account" }).click();
    await scan(page, "Consent");
    await page.getByRole("button", { name: "Allow and connect" }).click();
    await page.getByText("247 transactions imported").first().waitFor();
    await scan(page, "Imported");

    for (const [path, ready, name] of [
      ["/dashboard", "Key insight", "Dashboard"],
      ["/forecast", "Medium cash pressure", "Forecast"],
      ["/insights", "Business Health Score", "Insights"],
      ["/advice", "Do this now", "Recommendations"],
      ["/readiness", "Next steps", "Readiness"],
      ["/more", "Connected account", "More"],
      ["/does-not-exist", "This page doesn't exist", "Not found"],
    ] as const) {
      await page.goto(`${BASE}${path}`);
      await page.getByText(ready).first().waitFor();
      await scan(page, name);
    }

    await page.goto(`${BASE}/dashboard`);
    await page.getByRole("button", { name: "In-depth", exact: true }).click();
    await page.getByText("Money in vs money out").waitFor();
    await scan(page, "Dashboard (in-depth)");
    await page.goto(`${BASE}/forecast`);
    await page.getByText("Expected balance, day by day").waitFor();
    await scan(page, "Forecast (in-depth)");
    await page.getByRole("button", { name: "Simple", exact: true }).click();

    await page.goto(`${BASE}/transactions?view=review`);
    await page.getByRole("button", { name: /POS PURCHASE/ }).first().click();
    await scan(page, "Transactions (review question open)");

    await page.goto(`${BASE}/afford`);
    await page.getByLabel("How much do you want to spend?").fill("300000");
    await page.getByRole("button", { name: "Check", exact: true }).click();
    await page.getByText("You can, but be careful.").waitFor();
    await scan(page, "Can I afford this? (result)");

    await context.close();
  }
  await browser.close();
  console.log(blocking ? `\n✗ ${blocking} serious/critical issue type(s) to fix.` : "\nNo serious or critical accessibility issues.");
  process.exit(blocking ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
