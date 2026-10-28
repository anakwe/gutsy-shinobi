import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

export default defineConfig({
  base: "./",
  build: {
    rolldownOptions: {
      input: {
        game: fileURLToPath(new URL("./index.html", import.meta.url)),
        screensaver: fileURLToPath(
          new URL("./screensaver.html", import.meta.url),
        ),
      },
    },
  },
  server: { host: "127.0.0.1", strictPort: true },
  preview: { host: "127.0.0.1", strictPort: true },
});
