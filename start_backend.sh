#!/bin/bash
# Usage: bash start_backend.sh
# Starts the FastAPI backend for Baseball Video Analyzer on port 8000.
# Requires: backend/venv must be set up (see backend/venv/)

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/backend"

echo "=== Starting Baseball Video Analyzer Backend ==="
echo "API docs: http://localhost:8000/docs"
source venv/bin/activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000
