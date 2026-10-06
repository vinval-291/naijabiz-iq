// Records the demo journey (master plan Phase 20) as a video, as a backup for demo day.
// Plays at presentation pace with a visible cursor. Start the app first.
//
//   npm run record-demo -- [baseUrl] [desktop|mobile]     default http://localhost:3100 desktop
//
// Output: demo-backup/naijabiz-iq-demo-<variant>.webm and a screenshot per step.

import { mkdirSync, readdirSync, renameSync, rmSync } from "node:fs";
import { join } from "node:path";
import { chromium, type Locator, type Page } from "playwright-core";

const BASE = process.argv[2] ?? "http://localhost:3100";
const VARIANT = process.argv[3] === "mobile" ? "mobile" : "desktop";
const OUT = "demo-backup";
const VIEWPORT = VARIANT === "mobile" ? { width: 390, height: 844 } : { width: 1366, height: 768 };

/** A visible cursor and click ripple — recorded browsers don't show the mouse. */
const CURSOR_SCRIPT = `
  window.addEventListener("DOMContentLoaded", () => {
    const dot = document.createElement("div");
    dot.style.cssText = "position:fixed;z-index:99999;width:22px;height:22px;margin:-11px 0 0 -11px;border-radius:50%;" +
      "background:rgba(152,29,135,.35);border:2px solid #981D87;pointer-events:none;transition:transform .15s;left:-50px;top:-50px";
    document.body.appendChild(dot);
    addEventListener("mousemove", (e) => { dot.style.left = e.clientX + "px"; dot.style.top = e.clientY + "px"; }, true);
    addEventListener("mousedown", () => { dot.style.transform = "scale(.7)"; }, true);
    addEventListener("mouseup", () => { dot.style.transform = "none"; }, true);
  });`;

const pause = (page: Page, ms: number) => page.waitForTimeout(ms);
let step = 0;

async function shot(page: Page, name: string) {
  step++;
  await page.screenshot({ path: join(OUT, `${VARIANT}-${String(step).padStart(2, "0")}-${name}.png`) });
}

/** Glide the cursor to an element, then click it. */
async function clickOn(page: Page, target: Locator) {
  await target.scrollIntoViewIfNeeded();
  const box = await target.boundingBox();
  if (box) await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 25 });
  await pause(page, 350);
  await target.click();
}

async function scrollBy(page: Page, dy: number, ms = 1200) {
  const steps = 30;
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, dy / steps);
    await pause(page, ms / steps);
  }
}

(async () => {
  mkdirSync(OUT, { recursive: true });
  const videoDir = join(OUT, `.raw-${VARIANT}`);
  rmSync(videoDir, { recursive: true, force: true });

  const browser = await chromium.launch({ channel: "msedge" });
  const context = await browser.newContext({ viewport: VIEWPORT, recordVideo: { dir: videoDir, size: VIEWPORT } });
  await context.addInitScript(CURSOR_SCRIPT);
  const page = await context.newPage();

  // 1. Meet Aisha
  await page.goto(BASE);
  await pause(page, 3500);
  await shot(page, "welcome");

  // 2. Set up and connect her Wema account
  await clickOn(page, page.getByRole("link", { name: "Get started" }));
  await page.getByLabel("Business name").waitFor();
  await pause(page, 2000);
  await clickOn(page, page.getByRole("button", { name: "Continue" }));
  await pause(page, 1500);
  await clickOn(page, page.getByRole("button", { name: "Connect Wema account" }));
  await pause(page, 3000);
  await shot(page, "consent");
  await clickOn(page, page.getByRole("button", { name: "Allow and connect" }));
  await pause(page, 1600);
  await shot(page, "importing");
  await page.getByText("247 transactions imported").first().waitFor();
  await pause(page, 3000);
  await shot(page, "imported");

  // 3. Dashboard: revenue is growing… but something is wrong
  await clickOn(page, page.getByRole("link", { name: "See my business" }));
  await page.getByText("Key insight").waitFor();
  await pause(page, 5000);
  await shot(page, "dashboard");
  await scrollBy(page, VARIANT === "mobile" ? 900 : 420);
  await pause(page, 3500);
  await shot(page, "dashboard-chart-health");
  await scrollBy(page, VARIANT === "mobile" ? 1100 : 500);
  await pause(page, 3000);

  // 4. NaijaBiz IQ learns: one answer recognizes similar transactions
  await page.goto(`${BASE}/transactions?view=review`);
  await pause(page, 2000);
  await clickOn(page, page.getByRole("button", { name: /POS PURCHASE/ }).first());
  await pause(page, 2000);
  await shot(page, "review-question");
  await clickOn(page, page.getByRole("button", { name: "Generator fuel" }));
  await page.getByText("We also recognized").waitFor();
  await pause(page, 3500);
  await shot(page, "learned");

  // 5. Forecast: medium cash pressure
  await page.goto(`${BASE}/forecast`);
  await pause(page, 4000);
  await shot(page, "forecast");
  await scrollBy(page, VARIANT === "mobile" ? 700 : 380);
  await pause(page, 3500);

  // 6. The killer moment: can Aisha afford ₦300,000 of stock?
  await page.goto(`${BASE}/afford`);
  await pause(page, 1500);
  const amount = page.getByLabel("How much do you want to spend?");
  await clickOn(page, amount);
  await amount.pressSequentially("300000", { delay: 180 });
  await pause(page, 800);
  await clickOn(page, page.getByRole("button", { name: "Check", exact: true }));
  await page.getByText("You can, but be careful.").waitFor();
  await pause(page, 6000);
  await shot(page, "afford-careful");
  await clickOn(page, page.getByRole("button", { name: /^Check ₦\d+K instead$/ }));
  await page.getByText("Yes, you can afford this comfortably.").waitFor();
  await pause(page, 4000);
  await shot(page, "afford-comfortable");

  // 7. What to do next
  await page.goto(`${BASE}/advice`);
  await pause(page, 5000);
  await shot(page, "recommendations");

  await context.close(); // finishes writing the video
  await browser.close();

  const [raw] = readdirSync(videoDir).filter((f) => f.endsWith(".webm"));
  const video = join(OUT, `naijabiz-iq-demo-${VARIANT}.webm`);
  rmSync(video, { force: true });
  renameSync(join(videoDir, raw), video);
  rmSync(videoDir, { recursive: true, force: true });
  console.log(`Saved ${video} and ${step} screenshots in ${OUT}/`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
