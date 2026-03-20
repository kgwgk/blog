// Usage: node worker/scripts/seed-admin.js <password> <email> <hash_pepper>
// Outputs JSON record to stdout. Pipe to:
//   wrangler kv key put --binding HCENTNER_BLOG_AUTH_USERS "user:admin" -

import { argon2id } from "hash-wasm";

const [password, email, hashPepper] = process.argv.slice(2);

if (!password || !email || !hashPepper) {
  console.error(
    "Usage: node worker/scripts/seed-admin.js <password> <email> <hash_pepper>"
  );
  process.exit(1);
}

// Derive salt from username: SHA-256("hcentner.dev:admin"), take first 16 bytes
const enc = new TextEncoder();
const saltBuf = await crypto.subtle.digest(
  "SHA-256",
  enc.encode("hcentner.dev:admin")
);
const salt = new Uint8Array(saltBuf).slice(0, 16);

// Client-side Argon2id hash (same as browser would produce)
const clientHash = await argon2id({
  password,
  salt,
  parallelism: 4,
  iterations: 3,
  memorySize: 65536,
  hashLength: 32,
  outputType: "encoded",
});

// Server-side pepper: HMAC-SHA256(clientHash, hashPepper)
const hmacKey = await crypto.subtle.importKey(
  "raw",
  enc.encode(hashPepper),
  { name: "HMAC", hash: "SHA-256" },
  false,
  ["sign"]
);
const sig = await crypto.subtle.sign("HMAC", hmacKey, enc.encode(clientHash));
const bytes = new Uint8Array(sig);
let binary = "";
for (const b of bytes) binary += String.fromCharCode(b);
const hashedPassword = btoa(binary)
  .replace(/\+/g, "-")
  .replace(/\//g, "_")
  .replace(/=+$/, "");

const record = {
  schemaVersion: 1,
  username: "admin",
  email,
  phone: null,
  signalId: null,
  hashedPassword,
  role: "admin",
  status: "approved",
};

console.log(JSON.stringify(record));
