import path from "node:path";
import { prepareCapture } from "./browserTools.js";

// Usage: npm run screenshots -- [loopback URL] [output directory].
// A fresh browser profile avoids including saved names or scores in captures.
const { url, output, browser, page } = await prepareCapture(
  process.argv.slice(2),
  "screenshots",
);
try {
  await page.goto(url, { waitUntil: "networkidle0", timeout: 30000 });
  await page.waitForSelector("#app canvas", { timeout: 15000 });
  await page.screenshot({ path: path.join(output, "initial.png") });
  if (!new URL(url).pathname.endsWith("screensaver.html")) {
    await page.keyboard.press("KeyL");
    await page.screenshot({ path: path.join(output, "leaderboard.png") });
    await page.keyboard.press("Escape");
    await page.keyboard.press("Space");
    await page.screenshot({ path: path.join(output, "gameplay.png") });
  }
  console.log(
    "Screenshots saved. Review visible content and metadata before sharing.",
  );
} finally {
  await browser.close();
}
