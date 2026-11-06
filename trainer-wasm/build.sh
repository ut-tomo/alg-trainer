#!/bin/bash
set -e
cd "$(dirname "$0")"
echo "🔨 Building WASM module..."
wasm-pack build --target web --release --out-dir ../docs/pkg
echo "✅ Build complete!"
echo "  cd ../docs && python3 -m http.server 8000"
echo "Then open: http://localhost:8000"
