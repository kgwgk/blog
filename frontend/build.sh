#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

wasm32-wasi-cabal build counter --allow-newer
WASM_BIN=$(wasm32-wasi-cabal list-bin counter)

DIST=dist
mkdir -p "$DIST"

# Generate JS FFI bindings
"$(wasm32-wasi-ghc --print-libdir)/post-link.mjs" \
  -i "$WASM_BIN" \
  -o "$DIST/ghc_wasm_jsffi.js"

cp "$WASM_BIN" "$DIST/counter.wasm"

# Optimize if wasm-opt available
if command -v wasm-opt &>/dev/null; then
  wasm-opt -Oz "$DIST/counter.wasm" -o "$DIST/counter.wasm"
fi

echo "Build complete. Artifacts in $DIST/"
ls -lh "$DIST/"
