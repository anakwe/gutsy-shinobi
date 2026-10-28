import { describe, it, expect } from "vitest";
import { localTarget } from "./browserTools";

describe("local capture targets", () => {
  it("accepts IPv4, IPv6 and hostname loopback targets", () => {
    for (const url of [
      "http://127.0.0.1:5173/",
      "http://localhost:5173/screensaver.html",
      "http://[::1]:5173/",
    ])
      expect(localTarget(url)).toBe(url);
  });

  it("rejects remote hosts, embedded usernames, and non-HTTP schemes", () => {
    for (const url of [
      "https://example.com/",
      "http://127.0.0.1.example.com/",
      "http://user@127.0.0.1/",
      "file:///tmp/index.html",
      "javascript:void(0)",
      "invalid URL",
    ])
      expect(() => localTarget(url)).toThrow("loopback");
  });
});
