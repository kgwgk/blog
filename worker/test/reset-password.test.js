import { env } from "cloudflare:workers";
import { describe, it, expect, beforeEach } from "vitest";
import worker from "../index.js";

const BASE = "http://localhost";

function request(path, options = {}) {
  return worker.fetch(new Request(`${BASE}${path}`, options), env);
}

function postForm(path, data) {
  const body = new URLSearchParams(data);
  return request(path, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
}

async function seedUser(username, email, status = "approved") {
  const record = {
    schemaVersion: 1,
    username,
    email,
    phone: null,
    signalId: null,
    hashedPassword: "dummy-hash",
    role: "friend",
    status,
  };
  await env.HCENTNER_BLOG_AUTH_USERS.put(
    `user:${username}`,
    JSON.stringify(record)
  );
}

async function getResetToken() {
  const list = await env.RESET_TOKENS.list({ prefix: "reset:" });
  if (list.keys.length === 0) return null;
  const key = list.keys[0].name;
  return key.replace("reset:", "");
}

describe("GET /forgot-password", () => {
  it("renders the forgot password form", async () => {
    const resp = await request("/forgot-password");
    expect(resp.status).toBe(200);
    const html = await resp.text();
    expect(html).toContain("Forgot Password");
    expect(html).toContain('action="/auth/forgot-password"');
    expect(html).toContain('name="username"');
  });
});

describe("POST /auth/forgot-password", () => {
  beforeEach(async () => {
    // Clear KV state
    const users = await env.HCENTNER_BLOG_AUTH_USERS.list();
    for (const key of users.keys) {
      await env.HCENTNER_BLOG_AUTH_USERS.delete(key.name);
    }
    const tokens = await env.RESET_TOKENS.list();
    for (const key of tokens.keys) {
      await env.RESET_TOKENS.delete(key.name);
    }
  });

  it("returns error for empty username", async () => {
    const resp = await postForm("/auth/forgot-password", { username: "" });
    expect(resp.status).toBe(200);
    const html = await resp.text();
    expect(html).toContain("Username is required");
  });

  it("shows success for existing user and creates token", async () => {
    await seedUser("alice", "alice@example.com");
    const resp = await postForm("/auth/forgot-password", {
      username: "alice",
    });
    expect(resp.status).toBe(200);
    const html = await resp.text();
    expect(html).toContain(
      "If an account with that username exists, a password reset email has been sent."
    );

    // Verify token was created
    const token = await getResetToken();
    expect(token).not.toBeNull();
    expect(token.length).toBe(64); // 32 bytes hex

    // Verify token data
    const data = await env.RESET_TOKENS.get(`reset:${token}`, "json");
    expect(data.username).toBe("alice");
    expect(data.createdAt).toBeTypeOf("number");
  });

  it("shows same success for non-existent user (no enumeration)", async () => {
    const resp = await postForm("/auth/forgot-password", {
      username: "nobody",
    });
    expect(resp.status).toBe(200);
    const html = await resp.text();
    expect(html).toContain(
      "If an account with that username exists, a password reset email has been sent."
    );

    // Verify no token was created
    const token = await getResetToken();
    expect(token).toBeNull();
  });

  it("shows success for user without email (no token created)", async () => {
    const record = {
      schemaVersion: 1,
      username: "noemail",
      email: "",
      phone: null,
      signalId: null,
      hashedPassword: "dummy",
      role: "friend",
      status: "approved",
    };
    await env.HCENTNER_BLOG_AUTH_USERS.put(
      "user:noemail",
      JSON.stringify(record)
    );

    const resp = await postForm("/auth/forgot-password", {
      username: "noemail",
    });
    expect(resp.status).toBe(200);
    const html = await resp.text();
    expect(html).toContain("If an account with that username exists");

    const token = await getResetToken();
    expect(token).toBeNull();
  });

  it("rate limits repeated requests for same user", async () => {
    await seedUser("bob", "bob@example.com");

    // First request creates token
    await postForm("/auth/forgot-password", { username: "bob" });
    const firstToken = await getResetToken();
    expect(firstToken).not.toBeNull();

    // Second request is rate limited — no new token
    await postForm("/auth/forgot-password", { username: "bob" });
    const list = await env.RESET_TOKENS.list({ prefix: "reset:" });
    expect(list.keys.length).toBe(1); // Still just one token
  });

  it("allows reset for pending users", async () => {
    await seedUser("pending-user", "pending@example.com", "pending");
    const resp = await postForm("/auth/forgot-password", {
      username: "pending-user",
    });
    const html = await resp.text();
    expect(html).toContain("If an account with that username exists");

    const token = await getResetToken();
    expect(token).not.toBeNull();
  });

  it("allows reset for disabled users", async () => {
    await seedUser("disabled-user", "disabled@example.com", "disabled");
    const resp = await postForm("/auth/forgot-password", {
      username: "disabled-user",
    });
    const html = await resp.text();
    expect(html).toContain("If an account with that username exists");

    const token = await getResetToken();
    expect(token).not.toBeNull();
  });

  it("normalizes username to lowercase", async () => {
    await seedUser("mixedcase", "mixed@example.com");
    await postForm("/auth/forgot-password", { username: "  MixedCase  " });
    const token = await getResetToken();
    expect(token).not.toBeNull();

    const data = await env.RESET_TOKENS.get(`reset:${token}`, "json");
    expect(data.username).toBe("mixedcase");
  });
});

describe("GET /reset-password", () => {
  beforeEach(async () => {
    const tokens = await env.RESET_TOKENS.list();
    for (const key of tokens.keys) {
      await env.RESET_TOKENS.delete(key.name);
    }
  });

  it("shows expired page when no token provided", async () => {
    const resp = await request("/reset-password");
    expect(resp.status).toBe(400);
    const html = await resp.text();
    expect(html).toContain("invalid or has expired");
  });

  it("shows expired page for invalid token", async () => {
    const resp = await request("/reset-password?token=badtoken");
    expect(resp.status).toBe(400);
    const html = await resp.text();
    expect(html).toContain("invalid or has expired");
  });

  it("renders reset form for valid token", async () => {
    const token = "a".repeat(64);
    await env.RESET_TOKENS.put(
      `reset:${token}`,
      JSON.stringify({ username: "alice", createdAt: Date.now() })
    );

    const resp = await request(`/reset-password?token=${token}`);
    expect(resp.status).toBe(200);
    const html = await resp.text();
    expect(html).toContain("Reset Password");
    expect(html).toContain("Resetting password for");
    expect(html).toContain("alice");
    expect(html).toContain(`value="${token}"`);
    expect(html).toContain('name="password"');
    expect(html).toContain('name="confirmPassword"');
    expect(html).toContain("hash-wasm");
  });
});

describe("POST /auth/reset-password", () => {
  beforeEach(async () => {
    const users = await env.HCENTNER_BLOG_AUTH_USERS.list();
    for (const key of users.keys) {
      await env.HCENTNER_BLOG_AUTH_USERS.delete(key.name);
    }
    const tokens = await env.RESET_TOKENS.list();
    for (const key of tokens.keys) {
      await env.RESET_TOKENS.delete(key.name);
    }
  });

  it("rejects missing token", async () => {
    const resp = await postForm("/auth/reset-password", {
      clientHash: "somehash",
    });
    expect(resp.status).toBe(400);
    const html = await resp.text();
    expect(html).toContain("invalid or has expired");
  });

  it("rejects missing clientHash", async () => {
    const resp = await postForm("/auth/reset-password", {
      token: "sometoken",
    });
    expect(resp.status).toBe(400);
    const html = await resp.text();
    expect(html).toContain("invalid or has expired");
  });

  it("rejects invalid token", async () => {
    const resp = await postForm("/auth/reset-password", {
      token: "nonexistent",
      clientHash: "somehash",
    });
    expect(resp.status).toBe(400);
    const html = await resp.text();
    expect(html).toContain("invalid or has expired");
  });

  it("resets password with valid token and deletes token", async () => {
    await seedUser("charlie", "charlie@example.com");
    const originalUser = await env.HCENTNER_BLOG_AUTH_USERS.get(
      "user:charlie",
      "json"
    );

    const token = "b".repeat(64);
    await env.RESET_TOKENS.put(
      `reset:${token}`,
      JSON.stringify({ username: "charlie", createdAt: Date.now() })
    );

    const resp = await postForm("/auth/reset-password", {
      token,
      clientHash: "$argon2id$v=19$m=65536,t=3,p=4$newsalt$newhash",
    });
    expect(resp.status).toBe(200);
    const html = await resp.text();
    expect(html).toContain("password has been reset successfully");

    // Verify password was updated
    const updatedUser = await env.HCENTNER_BLOG_AUTH_USERS.get(
      "user:charlie",
      "json"
    );
    expect(updatedUser.hashedPassword).not.toBe(originalUser.hashedPassword);

    // Verify token was deleted
    const tokenData = await env.RESET_TOKENS.get(`reset:${token}`);
    expect(tokenData).toBeNull();
  });

  it("prevents token reuse", async () => {
    await seedUser("dave", "dave@example.com");

    const token = "c".repeat(64);
    await env.RESET_TOKENS.put(
      `reset:${token}`,
      JSON.stringify({ username: "dave", createdAt: Date.now() })
    );

    // First use succeeds
    const resp1 = await postForm("/auth/reset-password", {
      token,
      clientHash: "$argon2id$v=19$m=65536,t=3,p=4$salt1$hash1",
    });
    expect(resp1.status).toBe(200);
    expect(await resp1.text()).toContain("reset successfully");

    // Second use fails
    const resp2 = await postForm("/auth/reset-password", {
      token,
      clientHash: "$argon2id$v=19$m=65536,t=3,p=4$salt2$hash2",
    });
    expect(resp2.status).toBe(400);
    expect(await resp2.text()).toContain("invalid or has expired");
  });

  it("rejects token for deleted user", async () => {
    const token = "d".repeat(64);
    await env.RESET_TOKENS.put(
      `reset:${token}`,
      JSON.stringify({ username: "ghost", createdAt: Date.now() })
    );

    const resp = await postForm("/auth/reset-password", {
      token,
      clientHash: "somehash",
    });
    expect(resp.status).toBe(400);
    const html = await resp.text();
    expect(html).toContain("invalid or has expired");
  });
});

describe("Login page", () => {
  it("has forgot password link", async () => {
    const resp = await request("/login");
    expect(resp.status).toBe(200);
    const html = await resp.text();
    expect(html).toContain("/forgot-password");
    expect(html).toContain("Forgot password?");
  });
});

describe("Public route access", () => {
  it("/forgot-password is publicly accessible", async () => {
    const resp = await request("/forgot-password");
    expect(resp.status).toBe(200);
  });

  it("/reset-password is publicly accessible (shows expired for no token)", async () => {
    const resp = await request("/reset-password");
    // 400 but still served (not a redirect to login)
    expect(resp.status).toBe(400);
    const html = await resp.text();
    expect(html).toContain("invalid or has expired");
  });
});
