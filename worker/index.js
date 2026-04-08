import {
  getSession,
  verifySupabaseJwt,
  refreshSession,
  makeSessionCookie,
  clearSessionCookie,
} from "./jwt.js";
import { isAlwaysPublic, getRequiredRole, hasRole } from "./routes.js";
import { loginPage } from "./pages/login.js";
import { registerPage } from "./pages/register.js";
import { membersPage } from "./pages/members.js";
import { forgotPasswordPage } from "./pages/forgot-password.js";
import { resetPasswordPage } from "./pages/reset-password.js";

const COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days

function redirect(url, headers = {}) {
  return new Response(null, {
    status: 302,
    headers: { Location: url, ...headers },
  });
}

async function resolveSession(request, env) {
  const result = await getSession(request, env);

  if (result.session) {
    return { session: result.session, cookies: null };
  }

  if (result.needsRefresh) {
    const refreshed = await refreshSession(
      result.refreshToken,
      env.SUPABASE_URL,
      env.SUPABASE_ANON_KEY,
    );
    if (refreshed) {
      return {
        session: refreshed.session,
        cookies: [
          makeSessionCookie("sb_access_token", refreshed.accessToken, COOKIE_MAX_AGE),
          makeSessionCookie("sb_refresh_token", refreshed.refreshToken, COOKIE_MAX_AGE),
        ],
      };
    }
  }

  return { session: null, cookies: null };
}

function addCookies(response, cookies) {
  if (!cookies) return response;
  const newResp = new Response(response.body, response);
  for (const cookie of cookies) {
    newResp.headers.append("Set-Cookie", cookie);
  }
  return newResp;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname } = url;
    const method = request.method;

    // --- Auth API routes ---

    if (method === "POST" && pathname === "/auth/callback") {
      const form = await request.formData();
      const accessToken = form.get("access_token");
      const refreshToken = form.get("refresh_token");
      const redir = form.get("redirect") || "/";

      if (!accessToken || !refreshToken) {
        return redirect("/login?error=invalid");
      }

      const payload = await verifySupabaseJwt(accessToken, env.SUPABASE_JWT_SECRET);
      if (!payload) {
        return redirect("/login?error=invalid");
      }

      const role = payload.app_metadata?.role;
      if (!role) {
        return redirect("/login?error=pending");
      }

      const headers = new Headers();
      headers.set("Location", redir);
      headers.append("Set-Cookie", makeSessionCookie("sb_access_token", accessToken, COOKIE_MAX_AGE));
      headers.append("Set-Cookie", makeSessionCookie("sb_refresh_token", refreshToken, COOKIE_MAX_AGE));
      return new Response(null, { status: 302, headers });
    }

    if (pathname === "/auth/logout") {
      const headers = new Headers();
      headers.set("Location", "/");
      headers.append("Set-Cookie", clearSessionCookie("sb_access_token"));
      headers.append("Set-Cookie", clearSessionCookie("sb_refresh_token"));
      return new Response(null, { status: 302, headers });
    }

    // --- Worker-served pages ---

    if (method === "GET" && pathname === "/login") {
      const error = url.searchParams.get("error");
      const redir = url.searchParams.get("redirect") || "/";
      return loginPage(error, redir, env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
    }

    if (method === "GET" && pathname === "/register") {
      return registerPage(false, null, env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
    }

    if (method === "GET" && pathname === "/forgot-password") {
      return forgotPasswordPage(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
    }

    if (method === "GET" && pathname === "/reset-password") {
      return resetPasswordPage(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
    }

    // --- Members page ---

    if (pathname === "/members/" || pathname === "/members") {
      const { session, cookies } = await resolveSession(request, env);
      if (!session) {
        return redirect(`/login?redirect=${encodeURIComponent(pathname)}`);
      }
      return addCookies(membersPage(session.email), cookies);
    }

    // --- Protected path check ---

    if (!isAlwaysPublic(pathname)) {
      const requiredRole = getRequiredRole(pathname);
      if (requiredRole) {
        const { session, cookies } = await resolveSession(request, env);
        if (!session) {
          return redirect(`/login?redirect=${encodeURIComponent(pathname)}`);
        }
        if (!hasRole(session.role, requiredRole)) {
          return new Response("Forbidden", { status: 403 });
        }
        const response = await env.ASSETS.fetch(request);
        return addCookies(response, cookies);
      }
    }

    // --- Passthrough to static assets ---

    return env.ASSETS.fetch(request);
  },
};
