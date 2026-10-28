import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer";

// Capture tools accept only a local server. Browser sandboxing stays enabled.
export function localTarget(value = "http://127.0.0.1:5173/") {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Use a loopback HTTP(S) URL without credentials.");
  }
  if (
    !["http:", "https:"].includes(url.protocol) ||
    !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) ||
    url.username ||
    url.password
  ) {
    throw new Error("Use a loopback HTTP(S) URL without credentials.");
  }
  return url.href;
}

export async function launchBrowser() {
  const localChrome =
    process.platform === "darwin"
      ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
      : null;
  const executablePath =
    process.env.PUPPETEER_EXECUTABLE_PATH ||
    (localChrome && existsSync(localChrome) ? localChrome : undefined);
  return puppeteer.launch({ executablePath, headless: true });
}

export async function prepareCapture(args, kind) {
  const url = localTarget(args[0]);
  const output = path.resolve(args[1] || `artifacts/${kind}`);
  await fs.mkdir(output, { recursive: true });
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 800 });
    return { url, output, browser, page };
  } catch (error) {
    await browser.close();
    throw error;
  }
}
