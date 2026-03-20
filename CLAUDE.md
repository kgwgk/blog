# hcentner-blog

Personal blog at [hcentner.dev](https://hcentner.dev), built with Hakyll (Haskell static site generator).

## Project Structure

- `src/site.hs` - Main Hakyll site generator (single source file)
- `posts/` - Blog posts in Markdown (named `YYYY-MM-DD-slug.md`)
- `templates/` - Hakyll HTML templates (`default.html` is the base layout)
- `css/default.css` - Site stylesheet
- `images/` - Static images
- `nix/modules/flake/` - Nix flake modules (devshell, haskell-flake, pre-commit)
- `_site/` - Generated output (do not edit)
- `worker/` - Cloudflare Worker for authentication (see below)
- `package.json` / `package-lock.json` - npm deps for `hash-wasm` (used by seed script and client-side hashing)

## Development

### Environment Setup

```sh
nix develop        # Full dev shell (includes pre-commit hooks, ghciwatch, just, wrangler)
nix develop .#lite # Lightweight shell (no pre-commit hooks)
```

The full dev shell auto-copies `node_modules` from a Nix `buildNpmPackage` derivation (defined in `devshell.nix`). If you update `package.json`, regenerate the lockfile and update `npmDepsHash`:

```sh
nix shell nixpkgs#nodejs_22 -c npm install --package-lock-only
nix shell nixpkgs#prefetch-npm-deps -c prefetch-npm-deps package-lock.json
```

### Common Commands

```sh
just run           # Build and serve site via ghcid (auto-recompile)
just repl          # cabal repl
just docs          # Local hoogle on port 8888
just dev           # Run wrangler dev server (worker + static assets)
just deploy        # Build site and deploy to Cloudflare
cabal build        # Build the site generator
cabal run site -- build   # Generate the site
cabal run site -- watch   # Serve with live reload
```

### Formatting and Linting

Pre-commit hooks run automatically in the default dev shell:
- **fourmolu** - Haskell formatter (2-space indent, leading commas)
- **hlint** - Haskell linter
- **cabal-fmt** - Cabal file formatter
- **nixpkgs-fmt** - Nix file formatter

Manual formatting: `./fmt.sh`

## Code Conventions

- **Prelude**: Uses `relude` (NoImplicitPrelude) instead of base Prelude
- **Language**: GHC2021 with extensions defined in `hcentner-blog.cabal` `shared` stanza (OverloadedStrings, StrictData, DerivingStrategies, LambdaCase, etc.)
- **Fourmolu style**: 2-space indentation, leading comma style, record brace space
- **GHC warnings**: `-Wall -Wincomplete-record-updates -Wincomplete-uni-patterns -Wmissing-deriving-strategies`
- **Math rendering**: Inline Typst math in posts is converted to TeX for MathJax

## Cloudflare Worker Auth

A Cloudflare Worker (`worker/index.js`) sits in front of static assets to protect paths like `/members/*` and `/admin/*`.

### Architecture

- **Client-side hashing**: Browser computes Argon2id hash via `hash-wasm` (loaded from CDN). Salt is derived deterministically: `SHA-256("hcentner.dev:" + username)[:16]`.
- **Server-side pepper**: Worker applies `HMAC-SHA256(clientHash, HASH_PEPPER)` before storing/comparing. No WASM needed in the Worker — all server crypto uses Web Crypto API.
- **Sessions**: Stateless signed cookies (`HMAC-SHA256`, 7-day expiry). Payload: `{ sub, role, exp }`.
- **Storage**: Cloudflare KV (`HCENTNER_BLOG_AUTH_USERS` binding), key format `user:<username>`.
- **Roles**: `friend` (1) < `family` (2) < `admin` (3). `/members/*` requires `friend`, `/admin/*` requires `admin`.
- **Password reset**: User enters username → Worker generates random token stored in `RESET_TOKENS` KV (30-min TTL) → sends email via Resend → user clicks link → client-side Argon2id rehash → Worker updates password. Rate-limited to 1 request per username per 5 minutes. No user enumeration (always shows success).

### Worker Files

- `worker/index.js` - Main fetch handler (routing, auth checks, asset passthrough)
- `worker/auth.js` - HMAC cookie signing, password pepper functions (Web Crypto)
- `worker/routes.js` - Protected path config, role hierarchy, path matching
- `worker/migrate.js` - Schema migration logic (lazy upgrades on KV read)
- `worker/pages/login.js` - Login page HTML + shared HTML fragments (header, nav, theme toggle)
- `worker/pages/register.js` - Registration form HTML
- `worker/pages/members.js` - Members landing page
- `worker/pages/forgot-password.js` - Forgot password form (enter username to receive reset email)
- `worker/pages/reset-password.js` - Reset password form (set new password via token link)
- `worker/pages/admin.js` - Admin dashboard (list/approve/disable/role-set/password-reset users)
- `worker/email.js` - Resend email helper for sending password reset emails
- `worker/scripts/seed-admin.js` - CLI script to create first admin user in KV

### Secrets

Three Cloudflare secrets (set via `wrangler secret put`):
- **`COOKIE_SECRET`** - Signs session cookies
- **`HASH_PEPPER`** - HMAC pepper for password hashes
- **`RESEND_API_KEY`** - Resend API key for sending password reset emails

For local dev, these are in `.dev.vars` (gitignored).

### Setup

```sh
wrangler kv namespace create HCENTNER_BLOG_AUTH_USERS
wrangler kv namespace create HCENTNER_BLOG_AUTH_USERS --preview
wrangler kv namespace create RESET_TOKENS
wrangler kv namespace create RESET_TOKENS --preview
wrangler secret put COOKIE_SECRET
wrangler secret put HASH_PEPPER
wrangler secret put RESEND_API_KEY
just seed-admin <password> <email>
```

## Version Control

This project uses **jj** (Jujutsu) for version control. Do not use raw git commands — use `jj` instead.

## Build and CI

- The `PROD` env var controls production-specific behavior (e.g., analytics)
- Site deploys to hcentner.dev (Cloudflare, via wrangler)
- Worker tests run in CI via GitHub Actions on a NixOS self-hosted runner (`nixos-zylphia`) in the `nixos-restricted` runner group. There are no ubuntu-latest or macos runners available.
