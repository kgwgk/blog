import {
  pepperHash,
  verifyPepperedHash,
  signCookie,
  verifyCookie,
  parseCookies,
  makeSessionCookie,
  clearSessionCookie,
} from "./auth.js";
import { migrateUser, CURRENT_SCHEMA_VERSION } from "./migrate.js";
import { isAlwaysPublic, getRequiredRole, hasRole } from "./routes.js";
import { loginPage } from "./pages/login.js";
import { registerPage } from "./pages/register.js";
import { adminPage } from "./pages/admin.js";
import { membersPage } from "./pages/members.js";
import { forgotPasswordPage } from "./pages/forgot-password.js";
import { resetPasswordPage, resetPasswordExpiredPage, resetPasswordSuccessPage } from "./pages/reset-password.js";
import { sendResetEmail } from "./email.js";

const COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days
const RESET_TOKEN_TTL = 30 * 60; // 30 minutes
const RESET_RATE_LIMIT_TTL = 5 * 60; // 5 minutes

async function getUser(env, username) {
  const raw = await env.HCENTNER_BLOG_AUTH_USERS.get(`user:${username}`, "json");
  if (!raw) return null;
  const { record, changed } = migrateUser(raw);
  if (changed) {
    await env.HCENTNER_BLOG_AUTH_USERS.put(`user:${username}`, JSON.stringify(record));
  }
  return record;
}

async function getSession(request, env) {
  const cookies = parseCookies(request.headers.get("Cookie"));
  if (!cookies.session) return null;
  return verifyCookie(cookies.session, env.COOKIE_SECRET);
}

function redirect(url, headers = {}) {
  return new Response(null, {
    status: 302,
    headers: { Location: url, ...headers },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname } = url;
    const method = request.method;

    // --- Auth API routes ---

    if (method === "POST" && pathname === "/auth/login") {
      const form = await request.formData();
      const username = form.get("username")?.trim().toLowerCase();
      const clientHash = form.get("clientHash");
      const redir = form.get("redirect") || "/";

      if (!username || !clientHash) {
        return loginPage("Missing credentials", redir);
      }

      const user = await getUser(env, username);
      if (!user) {
        return loginPage("invalid", redir);
      }
      if (user.status === "pending") {
        return loginPage("pending", redir);
      }
      if (user.status !== "approved") {
        return loginPage("invalid", redir);
      }

      const valid = await verifyPepperedHash(clientHash, user.hashedPassword, env.HASH_PEPPER);
      if (!valid) {
        return loginPage("invalid", redir);
      }

      const exp = Math.floor(Date.now() / 1000) + COOKIE_MAX_AGE;
      const token = await signCookie(
        { sub: user.username, role: user.role, exp },
        env.COOKIE_SECRET
      );

      return redirect(redir, {
        "Set-Cookie": makeSessionCookie(token, COOKIE_MAX_AGE),
      });
    }

    if (method === "POST" && pathname === "/auth/register") {
      const form = await request.formData();
      const username = form.get("username")?.trim().toLowerCase();
      const email = form.get("email")?.trim();
      const clientHash = form.get("clientHash");
      const phone = form.get("phone")?.trim() || null;
      const signalId = form.get("signalId")?.trim() || null;

      if (!username || !email || !clientHash) {
        return registerPage(false, "Username, email, and password are required.");
      }

      if (username.length < 3 || !/^[a-z0-9_-]+$/.test(username)) {
        return registerPage(
          false,
          "Username must be at least 3 characters (lowercase letters, numbers, hyphens, underscores)."
        );
      }

      const existing = await env.HCENTNER_BLOG_AUTH_USERS.get(`user:${username}`);
      if (existing) {
        return registerPage(false, "Username already taken.");
      }

      const hashedPassword = await pepperHash(clientHash, env.HASH_PEPPER);

      const record = {
        schemaVersion: CURRENT_SCHEMA_VERSION,
        username,
        email,
        phone,
        signalId,
        hashedPassword,
        role: "friend",
        status: "pending",
      };

      await env.HCENTNER_BLOG_AUTH_USERS.put(`user:${username}`, JSON.stringify(record));
      return registerPage(true);
    }

    if (pathname === "/auth/logout") {
      return redirect("/", { "Set-Cookie": clearSessionCookie() });
    }

    if (method === "POST" && pathname === "/auth/forgot-password") {
      const form = await request.formData();
      const username = form.get("username")?.trim().toLowerCase();

      if (!username) {
        return forgotPasswordPage(false, "Username is required.");
      }

      // Always show success to prevent user enumeration
      const successResponse = () => forgotPasswordPage(true);

      // Rate limit: one reset per username per 5 minutes
      const rateKey = `rate:${username}`;
      const rateLimited = await env.RESET_TOKENS.get(rateKey);
      if (rateLimited) {
        return successResponse();
      }

      const user = await getUser(env, username);
      if (!user || !user.email) {
        return successResponse();
      }

      // Generate cryptographically random token
      const tokenBytes = new Uint8Array(32);
      crypto.getRandomValues(tokenBytes);
      const token = Array.from(tokenBytes).map(b => b.toString(16).padStart(2, "0")).join("");

      // Store token in dedicated KV namespace with TTL
      await env.RESET_TOKENS.put(
        `reset:${token}`,
        JSON.stringify({ username, createdAt: Date.now() }),
        { expirationTtl: RESET_TOKEN_TTL }
      );

      // Set rate limit
      await env.RESET_TOKENS.put(rateKey, "1", { expirationTtl: RESET_RATE_LIMIT_TTL });

      // Send email (best-effort, don't leak failures)
      try {
        await sendResetEmail(user.email, username, token, env.RESEND_API_KEY);
      } catch (e) {
        console.error("Failed to send reset email:", e);
      }

      return successResponse();
    }

    if (method === "POST" && pathname === "/auth/reset-password") {
      const form = await request.formData();
      const token = form.get("token");
      const clientHash = form.get("clientHash");

      if (!token || !clientHash) {
        return resetPasswordExpiredPage();
      }

      // Look up and validate token
      const tokenData = await env.RESET_TOKENS.get(`reset:${token}`, "json");
      if (!tokenData) {
        return resetPasswordExpiredPage();
      }

      const { username } = tokenData;
      const user = await getUser(env, username);
      if (!user) {
        return resetPasswordExpiredPage();
      }

      // Update password
      user.hashedPassword = await pepperHash(clientHash, env.HASH_PEPPER);
      await env.HCENTNER_BLOG_AUTH_USERS.put(`user:${username}`, JSON.stringify(user));

      // Delete token (single-use)
      await env.RESET_TOKENS.delete(`reset:${token}`);

      return resetPasswordSuccessPage();
    }

    // --- Worker-served pages ---

    if (method === "GET" && pathname === "/login") {
      const error = url.searchParams.get("error");
      const redir = url.searchParams.get("redirect") || "/";
      return loginPage(error, redir);
    }

    if (method === "GET" && pathname === "/register") {
      return registerPage();
    }

    if (method === "GET" && pathname === "/forgot-password") {
      return forgotPasswordPage();
    }

    if (method === "GET" && pathname === "/reset-password") {
      const token = url.searchParams.get("token");
      if (!token) {
        return resetPasswordExpiredPage();
      }

      const tokenData = await env.RESET_TOKENS.get(`reset:${token}`, "json");
      if (!tokenData) {
        return resetPasswordExpiredPage();
      }

      return resetPasswordPage(token, tokenData.username);
    }

    // --- Members page ---

    if (pathname === "/members/" || pathname === "/members") {
      const session = await getSession(request, env);
      if (!session) {
        return redirect(`/login?redirect=${encodeURIComponent(pathname)}`);
      }
      return membersPage(session.sub);
    }

    // --- Admin routes ---

    if (pathname.startsWith("/admin")) {
      const session = await getSession(request, env);
      if (!session || !hasRole(session.role, "admin")) {
        if (!session) {
          return redirect(`/login?redirect=${encodeURIComponent(pathname)}`);
        }
        return new Response("Forbidden", { status: 403 });
      }

      // Admin API actions
      if (method === "POST" && pathname === "/admin/api/approve") {
        const form = await request.formData();
        const username = form.get("username");
        const role = form.get("role") || "friend";
        const user = await getUser(env, username);
        if (user) {
          user.status = "approved";
          user.role = role;
          await env.HCENTNER_BLOG_AUTH_USERS.put(`user:${username}`, JSON.stringify(user));
        }
        return redirect("/admin");
      }

      if (method === "POST" && pathname === "/admin/api/disable") {
        const form = await request.formData();
        const username = form.get("username");
        const user = await getUser(env, username);
        if (user) {
          user.status = "disabled";
          await env.HCENTNER_BLOG_AUTH_USERS.put(`user:${username}`, JSON.stringify(user));
        }
        return redirect("/admin");
      }

      if (method === "POST" && pathname === "/admin/api/set-role") {
        const form = await request.formData();
        const username = form.get("username");
        const role = form.get("role");
        const user = await getUser(env, username);
        if (user && ["friend", "family", "admin"].includes(role)) {
          user.role = role;
          await env.HCENTNER_BLOG_AUTH_USERS.put(`user:${username}`, JSON.stringify(user));
        }
        return redirect("/admin");
      }

      if (method === "POST" && pathname === "/admin/api/reset-password") {
        const form = await request.formData();
        const username = form.get("username");
        const clientHash = form.get("clientHash");
        const user = await getUser(env, username);
        if (user && clientHash) {
          user.hashedPassword = await pepperHash(clientHash, env.HASH_PEPPER);
          await env.HCENTNER_BLOG_AUTH_USERS.put(`user:${username}`, JSON.stringify(user));
        }
        return redirect("/admin");
      }

      // Admin dashboard page
      return adminPage(env);
    }

    // --- Protected path check ---

    if (!isAlwaysPublic(pathname)) {
      const requiredRole = getRequiredRole(pathname);
      if (requiredRole) {
        const session = await getSession(request, env);
        if (!session) {
          return redirect(`/login?redirect=${encodeURIComponent(pathname)}`);
        }
        if (!hasRole(session.role, requiredRole)) {
          return new Response("Forbidden", { status: 403 });
        }
      }
    }

    // --- Passthrough to static assets ---

    return env.ASSETS.fetch(request);
  },
};
