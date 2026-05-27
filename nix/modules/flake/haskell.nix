# haskell-flake configuration goes in this module.

{ root, inputs, ... }:
{
  imports = [
    inputs.haskell-flake.flakeModule
  ];
  perSystem = { self', lib, config, pkgs, ... }: {
    # Our only Haskell project. You can have multiple projects, but this template
    # has only one.
    # See https://github.com/srid/haskell-flake/blob/master/example/flake.nix
    haskellProjects.default = {
      # To avoid unnecessary rebuilds, we filter projectRoot:
      # https://community.flake.parts/haskell-flake/local#rebuild
      projectRoot = builtins.toString (lib.fileset.toSource {
        root = root + /static;
        fileset = lib.fileset.unions [
          (root + /static/src)
          (root + /static/app)
          (root + /static/test)
          (root + /static/hcentner-blog.cabal)
        ];
      });

      # The base package set (this value is the default)
      # basePackages = pkgs.haskellPackages;

      # Packages to add on top of `basePackages`
      packages = {
        # Add source or Hackage overrides here
        # (Local packages are added automatically)
        /*
        aeson.source = "1.5.0.0" # Hackage version
        */
      };

      # Add your package overrides here
      settings = {
        hcentner-blog = {
          stan = true;
          haddock = false;
        };
        # Enable Hakyll's external link checker (`site check`). nixpkgs builds
        # hakyll with this flag off (dropping http-conduit); we need it on so the
        # `site` binary checks external links in CI. hakyll's own test suite hits
        # the network when this flag is on, so skip it.
        hakyll = {
          check = false;
          cabalFlags.checkExternal = true;
        };
        /*
        aeson = {
          check = false;
        };
        */
      };

      # What should haskell-flake add to flake outputs?
      autoWire = [ "packages" "apps" "checks" ]; # Wire all but the devShell
    };

    # Default package & app.
    packages.default = self'.packages.hcentner-blog;
    apps.default = self'.apps.site;
  };
}
