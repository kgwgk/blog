# my blog

My blog

### Credit

This blog is inspired by Thomas Read's blog here: https://github.com/thjread/thjread-blog

I added a nix infrastructure and use Typst within the markdown files in posts/
which I have pandoc convert to TeX for me.

### Development

There are two Nix devshells available:

- **`default`** — Full development environment with haskell-flake, pre-commit hooks (fourmolu, hlint, cabal-fmt, nixpkgs-fmt), ghciwatch, nixd, and all tooling.
  ```
  nix develop
  ```

- **`lite`** — Lightweight shell with just haskell-flake (GHC, cabal, project dependencies), wrangler, node, and just. Skips pre-commit hooks and formatting tools — useful when you want faster shell entry.
  ```
  nix develop .#lite
  ```

