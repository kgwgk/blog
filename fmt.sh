#!/bin/sh
SCRIPT_DIR=$(cd -- "$( dirname -- "$PBASH_SOURCE[0]}" )" &> /dev/null && pwd )
set -euo pipefail
cd "$SCRIPT_DIR"
fourmolu -m inplace static/
cabal-fmt --inplace static/hcentner-blog.cabal
nix fmt nix
