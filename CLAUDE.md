# hcentner-blog

Personal blog at [hcentner.dev](https://hcentner.dev), built with Hakyll (Haskell static site generator).

## Project Structure

- `static/` - Hakyll site generator and content
  - `static/app/site.hs` - Main Hakyll site generator executable
  - `static/app/emails.hs` - Emits Supabase email templates as a Management API JSON payload
  - `static/src/Design/` - Design library: `Tokens.hs` (single source of truth for colors/fonts/sizing), `Css.hs` (clay stylesheet), `Email.hs` (lucid email templates)
  - `static/test/EmailSpec.hs` - Email template test suite
  - `static/hcentner-blog.cabal` - Cabal project file (library + `site`/`emails` executables + `email-tests`)
  - `static/posts/` - Blog posts in Markdown (named `YYYY-MM-DD-slug.md`)
  - `static/templates/` - Hakyll HTML templates (`default.html` is the base layout)
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
cd static && cabal run emails          # Print Supabase email-template JSON payload
cd static && cabal test                # Run email template tests
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

## Design System (single source of truth)

All design values (colors, fonts, sizing) live in `static/src/Design/Tokens.hs`. Everything downstream is generated — there is no hand-written CSS:

- `Design.Css` (clay) renders the full stylesheet; the `site` executable emits it as `css/default.css` during site generation. The worker auth shells and miso WASM apps style themselves via classes from this same stylesheet, so they need no design code of their own.
- `Design.Email` (lucid) renders the five Supabase auth email templates (confirm signup, invite, magic link, change email, reset password) with inline styles (email clients ignore external CSS and CSS variables; light palette only). Supabase Go-template placeholders like `{{ .ConfirmationURL }}` are emitted literally.
- The `emails` executable prints the templates as a JSON payload using Supabase Management API field names (`mailer_subjects_*`, `mailer_templates_*_content`); CI PATCHes it to `api.supabase.com/v1/projects/{ref}/config/auth` (see Build and CI).

To change the design: edit `Design.Tokens` (or `Design.Css` for structural rules), rebuild, and run `site rebuild` — Hakyll cannot track Haskell-code changes as content dependencies, so a plain `site build` won't regenerate the CSS. After changing library deps in the cabal file, re-enter `nix develop` to refresh the GHC package set.

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
- Worker tests run in CI via GitHub Actions on a NixOS self-hosted runner (`nixos-zylphia`) in the `nixos-restricted` runner group. `ubuntu-latest` is also available (used by `build-site.yml`, `check-links.yml`, and `sync-email-templates.yml`); there are no macos runners.
- `sync-email-templates.yml` pushes generated Supabase email templates to the Management API on master pushes touching `static/src/Design/**` (also manual dispatch). Requires GitHub secrets `SUPABASE_ACCESS_TOKEN` (Supabase personal access token) and `SUPABASE_PROJECT_REF`.
