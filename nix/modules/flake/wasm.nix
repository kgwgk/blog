# WASM frontend development environment and build (GHC 9.12 via ghc-wasm-meta)

{ inputs, ... }:
{
  perSystem = { pkgs, lib, ... }:
    let
      ghcWasm = inputs.ghc-wasm-meta.packages.${pkgs.system}.all_9_12;

      frontendWasm = pkgs.stdenvNoCC.mkDerivation {
        name = "hcentner-blog-wasm";
        src = ../../../frontend;

        nativeBuildInputs = with pkgs; [
          ghcWasm
          nodejs
          cacert
          git
        ];

        # Fixed-output derivation: network access allowed, output hash pinned.
        # Rebuild with `lib.fakeHash` to get the new hash when deps change.
        outputHashMode = "recursive";
        outputHashAlgo = "sha256";
        outputHash = "sha256-ticjs8TwmFTPssXZDZpvsnKoiugp2UHmfuS/L1J88kc=";

        buildPhase = ''
          export HOME=$TMPDIR
          export SSL_CERT_FILE=${pkgs.cacert}/etc/ssl/certs/ca-bundle.crt

          wasm32-wasi-cabal update
          wasm32-wasi-cabal build counter --allow-newer

          WASM_BIN=$(wasm32-wasi-cabal list-bin counter)
          GHC_LIBDIR=$(wasm32-wasi-ghc --print-libdir)

          mkdir -p $out
          "$GHC_LIBDIR/post-link.mjs" \
            -i "$WASM_BIN" \
            -o "$out/counter_ghc_wasm_jsffi.js"
          cp "$WASM_BIN" "$out/counter.wasm"

          if command -v wasm-opt &>/dev/null; then
            wasm-opt -Oz "$out/counter.wasm" -o "$out/counter.wasm"
          fi
        '';

        dontInstall = true;
        dontFixup = true;
      };
    in
    {
      packages.wasm = frontendWasm;

      devShells.wasm = pkgs.mkShell {
        name = "hcentner-blog-wasm";
        meta.description = "WASM frontend development environment";
        packages = [
          ghcWasm
          pkgs.nodejs
        ];
      };
    };
}
