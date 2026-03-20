# Configuration for the project's Nix devShells
# `default` uses haskell-flake + pre-commit (full tooling)
# `lite` is a lightweight shell with cabal, GHC, and essentials

{
  perSystem = { config, pkgs, lib, ... }:
    let
      workerDeps = pkgs.buildNpmPackage {
        pname = "hcentner-blog-worker-deps";
        version = "0.1.0";
        src = ../../..;
        npmDepsHash = "sha256-s0u7sgPJedoRFYXSRkJXrufwyvA0+OmRcOucw+aWR+I=";
        dontNpmBuild = true;
      };
    in
    {
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
        nixd
        ghciwatch
        wrangler
        nodejs
        patchelf
      ];

      shellHook = ''
        if [ ! -e node_modules ]; then
          cp -r ${workerDeps}/lib/node_modules/hcentner-blog-worker/node_modules .
          chmod -R u+w node_modules
        fi
      '';
    };

    # Lightweight shell — haskell-flake + preview tools, no pre-commit hooks.
    devShells.lite = pkgs.mkShell {
      name = "hcentner-blog-lite";
      meta.description = "Lightweight dev environment";

      inputsFrom = [
        config.haskellProjects.default.outputs.devShell
      ];

      packages = with pkgs; [
        wrangler
        nodejs
      ];
    };
  };
}
