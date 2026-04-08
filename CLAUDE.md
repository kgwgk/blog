# hcentner-blog

Personal blog at [hcentner.dev](https://hcentner.dev), built with Hakyll (Haskell static site generator).

## Project Structure

- `static/` - Hakyll site generator and content
  - `static/src/site.hs` - Main Hakyll site generator (single source file)
  - `static/hcentner-blog.cabal` - Cabal project file
  - `static/posts/` - Blog posts in Markdown (named `YYYY-MM-DD-slug.md`)
  - `static/templates/` - Hakyll HTML templates (`default.html` is the base layout)
  - `static/css/default.css` - Site stylesheet
  - `static/images/` - Static images
  - `static/_site/` - Generated output (do not edit)
- `worker/` - Cloudflare Worker for authentication (see below)
  - `worker/wrangler.jsonc` - Wrangler config
  - `worker/package.json` / `worker/package-lock.json` - npm deps for `hash-wasm`
  - `worker/vitest.config.mjs` - Test config
- `nix/modules/flake/` - Nix flake modules (devshell, haskell-flake, pre-commit)

## Development

### Environment Setup

```sh
nix develop        # Full dev shell (includes pre-commit hooks, ghciwatch, wrangler)
nix develop .#lite # Lightweight shell (no pre-commit hooks)
```

The full dev shell auto-copies `node_modules` into `worker/` from a Nix `buildNpmPackage` derivation (defined in `devshell.nix`). If you update `worker/package.json`, regenerate the lockfile and update `npmDepsHash`:

```sh
cd worker && nix shell nixpkgs#nodejs_22 -c npm install --package-lock-only
nix shell nixpkgs#prefetch-npm-deps -c prefetch-npm-deps worker/package-lock.json
```

### Common Commands

```sh
cd static && cabal build        # Build the site generator
cd static && cabal run site -- build   # Generate the site
cd static && cabal run site -- watch   # Serve with live reload
cd worker && npx wrangler dev          # Run wrangler dev server (worker + static assets)
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
- **Language**: GHC2021 with extensions defined in `static/hcentner-blog.cabal` `shared` stanza (OverloadedStrings, StrictData, DerivingStrategies, LambdaCase, etc.)
- **Fourmolu style**: 2-space indentation, leading comma style, record brace space
- **GHC warnings**: `-Wall -Wincomplete-record-updates -Wincomplete-uni-patterns -Wmissing-deriving-strategies`
- **Math rendering**: Inline Typst math in posts is converted to TeX for MathJax

## Cloudflare Worker Auth

A Cloudflare Worker (`worker/index.js`) sits in front of static assets to protect paths like `/members/*`.

### Architecture

- **Authentication**: Supabase Auth handles user registration, login, password reset, and email sending. Browser pages use `@supabase/supabase-js` from CDN.
- **Sessions**: After browser authenticates with Supabase, tokens are POSTed to `/auth/callback`. The Worker verifies the JWT (HMAC-SHA256) and sets HttpOnly cookies (`sb_access_token`, `sb_refresh_token`).
- **Token refresh**: When access token expires, the Worker refreshes server-side via Supabase REST API.
- **Roles**: Stored in Supabase `app_metadata.role`. Hierarchy: `friend` (1) < `family` (2) < `admin` (3). `/members/*` requires `friend`. Users without a role are treated as "pending".
- **User management**: Done via Supabase dashboard (approve users, set roles).

### Worker Files

- `worker/index.js` - Main fetch handler (routing, auth callback, token refresh, asset passthrough)
- `worker/jwt.js` - Supabase JWT verification, session extraction, token refresh, cookie helpers
- `worker/routes.js` - Protected path config, role hierarchy, path matching
- `worker/pages/shared.js` - Shared HTML fragments (header, nav, theme toggle, styles, Supabase client script)
- `worker/pages/login.js` - Login page (email + password via Supabase JS client)
- `worker/pages/register.js` - Registration form (signUp via Supabase, pending approval)
- `worker/pages/members.js` - Members landing page
- `worker/pages/forgot-password.js` - Forgot password (resetPasswordForEmail via Supabase)
- `worker/pages/reset-password.js` - Reset password (reads tokens from URL hash, updateUser via Supabase)

### Secrets

One Cloudflare secret (set via `wrangler secret put`):
- **`SUPABASE_JWT_SECRET`** - JWT signing secret from Supabase dashboard

Public vars (in `wrangler.jsonc`):
- **`SUPABASE_URL`** - Supabase project URL
- **`SUPABASE_ANON_KEY`** - Supabase anonymous/public key

For local dev, secrets are in `.dev.vars` (gitignored).

### Setup

```sh
wrangler secret put SUPABASE_JWT_SECRET
# Set SUPABASE_URL and SUPABASE_ANON_KEY in wrangler.jsonc
```

## Version Control

This project uses **jj** (Jujutsu) for version control. Do not use raw git commands — use `jj` instead. **Do not run any version control operations (commits, branches, etc.) unless explicitly asked.** Only the user manages version control.

## Build and CI

- The `PROD` env var controls production-specific behavior (e.g., analytics)
- Site deploys to hcentner.dev (Cloudflare, via wrangler)
- Worker tests run in CI via GitHub Actions on a NixOS self-hosted runner (`nixos-zylphia`) in the `nixos-restricted` runner group. There are no ubuntu-latest or macos runners available.
