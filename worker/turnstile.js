const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

// Cloudflare's well-known test secret keys (no HTTP call needed)
const ALWAYS_PASS_SECRET = "1x0000000000000000000000000000000AA";
const ALWAYS_FAIL_SECRET = "2x0000000000000000000000000000000AA";

export async function verifyTurnstile(token, secretKey, remoteip) {
  if (!token) return false;

  // Handle Cloudflare test keys locally (workerd can't reach siteverify in tests)
  if (secretKey === ALWAYS_PASS_SECRET) return true;
  if (secretKey === ALWAYS_FAIL_SECRET) return false;

  const resp = await fetch(SITEVERIFY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      secret: secretKey,
      response: token,
      remoteip,
    }),
  });

  const data = await resp.json();
  return data.success === true;
}
