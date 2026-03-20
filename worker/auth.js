// Cookie signing with HMAC-SHA256 via Web Crypto

async function getHmacKey(secret) {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

function base64urlEncode(buf) {
  const bytes =
    buf instanceof ArrayBuffer ? new Uint8Array(buf) : new Uint8Array(buf);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlDecode(str) {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function signCookie(payload, secret) {
  const key = await getHmacKey(secret);
  const enc = new TextEncoder();
  const data = base64urlEncode(enc.encode(JSON.stringify(payload)));
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return `${data}.${base64urlEncode(sig)}`;
}

export async function verifyCookie(cookieValue, secret) {
  const parts = cookieValue.split(".");
  if (parts.length !== 2) return null;

  const [data, sig] = parts;
  const key = await getHmacKey(secret);
  const enc = new TextEncoder();

  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    base64urlDecode(sig),
    enc.encode(data)
  );
  if (!valid) return null;

  const json = JSON.parse(new TextDecoder().decode(base64urlDecode(data)));

  // Check expiry
  if (json.exp && Date.now() / 1000 > json.exp) return null;

  return json;
}

// Server-side pepper: HMAC the client-provided Argon2 hash with server secret
export async function pepperHash(clientHash, secret) {
  const key = await getHmacKey(secret);
  const enc = new TextEncoder();
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(clientHash));
  return base64urlEncode(sig);
}

export async function verifyPepperedHash(clientHash, storedPeppered, secret) {
  const peppered = await pepperHash(clientHash, secret);
  // Constant-time comparison
  if (peppered.length !== storedPeppered.length) return false;
  const enc = new TextEncoder();
  const a = enc.encode(peppered);
  const b = enc.encode(storedPeppered);
  // Import as HMAC keys and compare via sign — a timing-safe workaround
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
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

export function makeSessionCookie(value, maxAge = 7 * 24 * 60 * 60) {
  return `session=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

export function clearSessionCookie() {
  return "session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0";
}
