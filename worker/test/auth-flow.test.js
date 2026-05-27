import { describe, it, expect } from "vitest";
import { SELF } from "cloudflare:test";

const TEST_SECRET = "test-jwt-secret-for-verification";

async function createTestJwt(payload) {
  const header = { alg: "HS256", typ: "JWT" };
  const enc = new TextEncoder();

  function base64urlEncode(buf) {
    const bytes = new Uint8Array(buf);
    let binary = "";
    for (const b of bytes) binary += String.fromCharCode(b);
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  const headerB64 = base64urlEncode(enc.encode(JSON.stringify(header)));
  const payloadB64 = base64urlEncode(enc.encode(JSON.stringify(payload)));
  const signingInput = headerB64 + "." + payloadB64;

  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(TEST_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(signingInput));
  return headerB64 + "." + payloadB64 + "." + base64urlEncode(sig);
}

describe("POST /auth/callback", () => {
  it("sets cookies and returns redirect JSON on valid token with role", async () => {
    const token = await createTestJwt({
      sub: "user-123",
      email: "test@example.com",
      exp: Math.floor(Date.now() / 1000) + 3600,
      app_metadata: { role: "friend" },
    });

    const resp = await SELF.fetch("https://example.com/auth/callback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        access_token: token,
        refresh_token: "fake-refresh",
        redirect: "/members",
      }),
    });

    expect(resp.status).toBe(200);
    const body = await resp.json();
    expect(body).toEqual({ ok: true, redirect: "/members" });

    const cookies = resp.headers.getAll("Set-Cookie");
    expect(cookies.some((c) => c.startsWith("sb_access_token="))).toBe(true);
    expect(cookies.some((c) => c.startsWith("sb_refresh_token="))).toBe(true);
  });

  it("rejects invalid token with 401 JSON", async () => {
    const resp = await SELF.fetch("https://example.com/auth/callback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        access_token: "invalid.token.here",
        refresh_token: "fake-refresh",
      }),
    });

    expect(resp.status).toBe(401);
    const body = await resp.json();
    expect(body).toEqual({ ok: false, error: "invalid" });
  });

  it("rejects pending user (no role) with 403 JSON", async () => {
    const token = await createTestJwt({
      sub: "user-456",
      email: "pending@example.com",
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    const resp = await SELF.fetch("https://example.com/auth/callback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        access_token: token,
        refresh_token: "fake-refresh",
      }),
    });

    expect(resp.status).toBe(403);
    const body = await resp.json();
    expect(body).toEqual({ ok: false, error: "pending" });
  });
});

describe("GET /auth/logout", () => {
  it("clears cookies and redirects to /", async () => {
    const resp = await SELF.fetch("https://example.com/auth/logout", {
      redirect: "manual",
    });

    expect(resp.status).toBe(302);
    expect(resp.headers.get("Location")).toBe("/");

    const cookies = resp.headers.getAll("Set-Cookie");
    expect(cookies.some((c) => c.includes("sb_access_token=;"))).toBe(true);
    expect(cookies.some((c) => c.includes("sb_refresh_token=;"))).toBe(true);
  });
});

describe("protected paths", () => {
  it("redirects to login when no session cookie", async () => {
    const resp = await SELF.fetch("https://example.com/members/", {
      redirect: "manual",
    });

    expect(resp.status).toBe(302);
    expect(resp.headers.get("Location")).toContain("/login?redirect=");
  });

  it("allows access with valid session cookie", async () => {
    const token = await createTestJwt({
      sub: "user-123",
      email: "test@example.com",
      exp: Math.floor(Date.now() / 1000) + 3600,
      app_metadata: { role: "friend" },
    });

    const resp = await SELF.fetch("https://example.com/members/", {
      headers: {
        Cookie: `sb_access_token=${token}`,
      },
    });

    expect(resp.status).toBe(200);
    const text = await resp.text();
    expect(text).toContain("test@example.com");
  });
});
