import { describe, it, expect } from "vitest";
import { verifyTurnstile } from "../turnstile.js";

// Uses Cloudflare's well-known test secret keys (handled locally, no HTTP)
const ALWAYS_PASS = "1x0000000000000000000000000000000AA";
const ALWAYS_FAIL = "2x0000000000000000000000000000000AA";

describe("verifyTurnstile", () => {
  it("returns true for always-pass test key", async () => {
    const result = await verifyTurnstile("test-token", ALWAYS_PASS, "127.0.0.1");
    expect(result).toBe(true);
  });

  it("returns false for always-fail test key", async () => {
    const result = await verifyTurnstile("test-token", ALWAYS_FAIL, "127.0.0.1");
    expect(result).toBe(false);
  });

  it("returns false for missing token", async () => {
    const result = await verifyTurnstile(null, ALWAYS_PASS, "127.0.0.1");
    expect(result).toBe(false);
  });

  it("returns false for empty string token", async () => {
    const result = await verifyTurnstile("", ALWAYS_PASS, "127.0.0.1");
    expect(result).toBe(false);
  });
});
