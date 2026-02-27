#!/bin/bash

# Purpose: Build the React frontend and upload to lolipop FTP server.
# Target URL: https://tajmahal.mond.jp/research/video_analyzer
# Usage: bash src/utils/upload_video_analyzer.sh
#   Run from the project root: /Users/katano/work/Baseball/video_analyzer

set -e

# --- FTP Configuration ---
FTP_HOST="ftp.tajmahal.mond.jp"
FTP_USER="mond.jp-tajmahal"
FTP_PASS="lolipopftpjkl28d"
REMOTE_ROOT="research/video_analyzer"

# --- Project directories ---
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
DIST_DIR="$FRONTEND_DIR/dist"

# --- Step 1: Build ---
echo "=== Building React app ==="
cd "$FRONTEND_DIR"
npm run build
echo "Build complete."

# --- Step 2: Upload ---
echo ""
echo "=== Uploading to ftp://$FTP_HOST/$REMOTE_ROOT/ ==="

upload_file() {
    local local_path="$1"
    local remote_path="$2"

    echo "  → $remote_path"
    curl -T "$local_path" \
         "ftp://$FTP_HOST/$remote_path" \
         --user "$FTP_USER:$FTP_PASS" \
         --ftp-create-dirs \
         --silent --show-error

    if [ $? -ne 0 ]; then
        echo "  [FAILED] $local_path"
    fi
}

# Walk all files in dist/ and upload maintaining directory structure
find "$DIST_DIR" -type f | while read -r file; do
    # Strip the dist/ prefix to get relative path
    rel_path="${file#$DIST_DIR/}"
    remote_file="$REMOTE_ROOT/$rel_path"
    upload_file "$file" "$remote_file"
done

echo ""
echo "=== Upload finished ==="
echo "View at: https://tajmahal.mond.jp/research/video_analyzer/"
