import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

// A classic, self-contained script works offline in both native webviews.
export default defineConfig({
  publicDir: false,
  build: {
    outDir: "dist-screensaver",
    lib: {
      entry: fileURLToPath(new URL("./src/screensaver.js", import.meta.url)),
      name: "GutsyScreensaver",
      formats: ["iife"],
      fileName: () => "screensaver.js",
      cssFileName: "screensaver",
    },
    minify: true,
  },
  plugins: [
    {
      name: "offline-screensaver-document",
      generateBundle() {
        this.emitFile({
          type: "asset",
          fileName: "index.html",
          source: `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'self' gutsy:; style-src 'self' gutsy: 'unsafe-inline'; img-src 'self' gutsy: data: blob:; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Gutsy Shinobi Screensaver</title><link rel="stylesheet" href="screensaver.css"></head>
<body><div id="app"></div><script src="screensaver.js"></script></body></html>`,
        });
      },
    },
  ],
});
