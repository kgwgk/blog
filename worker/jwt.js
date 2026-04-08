// Supabase JWT verification via Web Crypto (HMAC-SHA256)

async function getHmacKey(secret) {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

function base64urlDecode(str) {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function verifySupabaseJwt(token, jwtSecret) {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [header, payload, sig] = parts;
  const key = await getHmacKey(jwtSecret);
  const enc = new TextEncoder();

  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    base64urlDecode(sig),
    enc.encode(header + "." + payload),
  );
  if (!valid) return null;

  const decoded = JSON.parse(new TextDecoder().decode(base64urlDecode(payload)));

  if (decoded.exp && Date.now() / 1000 > decoded.exp) return null;

  return decoded;
}

export async function getSession(request, env) {
  const cookies = parseCookies(request.headers.get("Cookie"));
  const accessToken = cookies["sb_access_token"];
  if (!accessToken) return { session: null, needsRefresh: false };

  const payload = await verifySupabaseJwt(accessToken, env.SUPABASE_JWT_SECRET);
  if (payload) {
    return {
      session: {
        sub: payload.sub,
        email: payload.email,
        role: payload.app_metadata?.role || null,
      },
      needsRefresh: false,
    };
  }

  // Access token invalid/expired — check for refresh token
  const refreshToken = cookies["sb_refresh_token"];
  if (!refreshToken) return { session: null, needsRefresh: false };

  return { session: null, needsRefresh: true, refreshToken };
}

export async function refreshSession(refreshToken, supabaseUrl, supabaseAnonKey) {
  const resp = await fetch(
    `${supabaseUrl}/auth/v1/token?grant_type=refresh_token`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseAnonKey,
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    },
  );

  if (!resp.ok) return null;

  const data = await resp.json();
  if (!data.access_token || !data.refresh_token) return null;

  // Parse the payload to extract role info
  const parts = data.access_token.split(".");
  const decoded = JSON.parse(
    new TextDecoder().decode(base64urlDecode(parts[1])),
  );

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    session: {
      sub: decoded.sub,
      email: decoded.email,
      role: decoded.app_metadata?.role || null,
    },
  };
}

export function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;
  for (const pair of cookieHeader.split(";")) {
    const [name, ...rest] = pair.trim().split("=");
    if (name) cookies[name.trim()] = rest.join("=").trim();
  }
  return cookies;
}

export function makeSessionCookie(name, value, maxAge = 7 * 24 * 60 * 60) {
  return `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

export function clearSessionCookie(name) {
  return `${name}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}
