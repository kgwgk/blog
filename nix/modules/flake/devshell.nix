# Configuration for the project's Nix devShells
# `default` uses haskell-flake + pre-commit (full tooling)
# `lite` is a lightweight shell with just cabal, GHC, and essentials

{
  perSystem = { config, pkgs, ... }: {
    # Full shell with haskell-flake and pre-commit hooks.
    devShells.default = pkgs.mkShell {
      name = "hcentner-blog";
      meta.description = "Haskell development environment";

      # See https://community.flake.parts/haskell-flake/devshell#composing-devshells
      inputsFrom = [
        config.haskellProjects.default.outputs.devShell # See ./nix/modules/haskell.nix
        config.pre-commit.devShell # See ./nix/modules/formatter.nix
      ];

      packages = with pkgs; [
        just
        nixd
        ghciwatch
        wrangler
        nodejs
        patchelf
      ];
    };

    # Lightweight shell — haskell-flake + preview tools, no pre-commit hooks.
    devShells.lite = pkgs.mkShell {
      name = "hcentner-blog-lite";
      meta.description = "Lightweight Haskell dev environment";

      inputsFrom = [
        config.haskellProjects.default.outputs.devShell
      ];

      packages = with pkgs; [
        wrangler
        nodejs
        just
      ];
    };
  };
}
