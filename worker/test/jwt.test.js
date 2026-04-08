import { describe, it, expect } from "vitest";
import { verifySupabaseJwt } from "../jwt.js";

const TEST_SECRET = "test-jwt-secret-for-verification";

async function createTestJwt(payload, secret = TEST_SECRET) {
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
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(signingInput));
  const sigB64 = base64urlEncode(sig);

  return headerB64 + "." + payloadB64 + "." + sigB64;
}

describe("verifySupabaseJwt", () => {
  it("verifies a valid JWT and returns payload", async () => {
    const payload = {
      sub: "user-123",
      email: "test@example.com",
      exp: Math.floor(Date.now() / 1000) + 3600,
      app_metadata: { role: "friend" },
    };
    const token = await createTestJwt(payload);
    const result = await verifySupabaseJwt(token, TEST_SECRET);

    expect(result).not.toBeNull();
    expect(result.sub).toBe("user-123");
    expect(result.email).toBe("test@example.com");
    expect(result.app_metadata.role).toBe("friend");
  });

  it("rejects an expired JWT", async () => {
    const payload = {
      sub: "user-123",
      exp: Math.floor(Date.now() / 1000) - 60,
    };
    const token = await createTestJwt(payload);
    const result = await verifySupabaseJwt(token, TEST_SECRET);

    expect(result).toBeNull();
  });

  it("rejects a tampered JWT", async () => {
    const payload = {
      sub: "user-123",
      exp: Math.floor(Date.now() / 1000) + 3600,
    };
    const token = await createTestJwt(payload);
    // Tamper with the payload
    const parts = token.split(".");
    parts[1] = parts[1] + "x";
    const tampered = parts.join(".");

    const result = await verifySupabaseJwt(tampered, TEST_SECRET);
    expect(result).toBeNull();
  });

  it("rejects a JWT signed with wrong secret", async () => {
    const payload = {
      sub: "user-123",
      exp: Math.floor(Date.now() / 1000) + 3600,
    };
    const token = await createTestJwt(payload, "wrong-secret");
    const result = await verifySupabaseJwt(token, TEST_SECRET);

    expect(result).toBeNull();
  });

  it("extracts app_metadata.role correctly", async () => {
    const payload = {
      sub: "user-456",
      email: "admin@example.com",
      exp: Math.floor(Date.now() / 1000) + 3600,
      app_metadata: { role: "admin" },
    };
    const token = await createTestJwt(payload);
    const result = await verifySupabaseJwt(token, TEST_SECRET);

    expect(result.app_metadata.role).toBe("admin");
  });

  it("returns payload with missing app_metadata", async () => {
    const payload = {
      sub: "user-789",
      email: "pending@example.com",
      exp: Math.floor(Date.now() / 1000) + 3600,
    };
    const token = await createTestJwt(payload);
    const result = await verifySupabaseJwt(token, TEST_SECRET);

    expect(result).not.toBeNull();
    expect(result.app_metadata).toBeUndefined();
  });

  it("rejects malformed tokens", async () => {
    expect(await verifySupabaseJwt("not.a.jwt", TEST_SECRET)).toBeNull();
    expect(await verifySupabaseJwt("", TEST_SECRET)).toBeNull();
    expect(await verifySupabaseJwt("abc", TEST_SECRET)).toBeNull();
  });
});
