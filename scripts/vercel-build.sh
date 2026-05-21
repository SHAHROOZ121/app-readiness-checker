#!/usr/bin/env sh
set -eu

# Monorepo root (parent of scripts/)
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

OUTPUT_DIR="${VERCEL_OUTPUT_DIR:-$ROOT/public}"

pnpm --filter @workspace/app-ready run build
rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR"
cp -r "$ROOT/artifacts/app-ready/dist/public/." "$OUTPUT_DIR/"
