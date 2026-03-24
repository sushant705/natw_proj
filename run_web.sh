#!/usr/bin/env bash
set -euo pipefail

PORT="${1:-8000}"
echo "Starting web UI at http://localhost:${PORT}/web/"
python3 -m http.server "${PORT}" --directory .
