# Unified formatting via treefmt-nix.
# Run `nix fmt` to format all files.

{ inputs, ... }:
{
  imports = [
    inputs.treefmt-nix.flakeModule
    inputs.fourmolu-nix.flakeModule
  ];
  perSystem = { config, pkgs, ... }: {
    treefmt = {
      projectRootFile = "flake.nix";
      programs = {
        fourmolu = {
          enable = true;
          package = config.fourmolu.wrapper;
        };
        nixpkgs-fmt.enable = true;
        cabal-fmt.enable = true;
        prettier = {
          enable = true;
          includes = [ "worker/**/*.js" "*.json" ];
        };
      };
    };

    fourmolu.settings = {
      indentation = 2;
      comma-style = "leading";
      record-brace-space = true;
      indent-wheres = true;
      import-export-style = "diff-friendly";
      respectful = true;
      haddock-style = "multi-line";
      newlines-between-decls = 1;
      extensions = [ "ImportQualifiedPost" ];
    };
  };
}
