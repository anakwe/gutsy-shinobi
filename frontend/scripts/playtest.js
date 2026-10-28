import { prepareCapture } from "./browserTools.js";

// Usage: npm run playtest -- [loopback URL]. Fail when startup produces script
// errors or failed HTTP responses. Diagnostic HTML, URLs, and stacks are not saved.
const { url, browser, page } = await prepareCapture(
  process.argv.slice(2),
  "playtest",
);
const errors = [];
page.on("pageerror", (error) => errors.push(error.name));
page.on("response", (response) => {
  if (response.status() >= 400) errors.push(`HTTP ${response.status()}`);
});
try {
  await page.goto(url, { waitUntil: "networkidle0", timeout: 30000 });
  await page.waitForSelector("#app canvas", { timeout: 15000 });
  if (errors.length)
    throw new Error(`Browser startup failed: ${errors.join(", ")}`);
  console.log(
    "Browser startup passed: game canvas present; no script or HTTP errors.",
  );
} finally {
  await browser.close();
}
