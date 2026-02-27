#!/bin/bash

# Purpose: Upload project artifacts (root index, results, docs) to FTP.
# Expected Effect: Mirror local HTML/images/videos and data files (JSON/NPY/CSV)
#   under remote ${FTP_HOST}/${REMOTE_ROOT} structure, preserving paths.
# Input Data: Local files under `index.html`, `results/**`, `docs/**`.
# Output Data: Remote files uploaded via FTP to `${REMOTE_ROOT}/...`.
# Usage: bash src/utils/upload_with_curl.sh
# Notes: Credentials are in plain text per current policy; consider env vars later.

# FTP Configuration
FTP_HOST="ftp.tajmahal.mond.jp"
FTP_USER="mond.jp-tajmahal"
FTP_PASS="lolipopftpjkl28d"
# Public base URL: https://tajmahal.mond.jp/SSD-02/
# Remote root directory for this project on the server
REMOTE_ROOT="SSD-02"

# Function to upload a single file
upload_file() {
    local local_path="$1"
    local remote_path="$2"
    
    echo "Uploading $local_path to $remote_path..."
    curl -T "$local_path" \
         "ftp://$FTP_HOST/$remote_path" \
         --user "$FTP_USER:$FTP_PASS" \
         --ftp-create-dirs \
         --silent --show-error
    
    if [ $? -eq 0 ]; then
        echo "Success."
    else
        echo "Failed to upload $local_path"
    fi
}

# 1. Upload Root index.html
if [ -f "index.html" ]; then
    upload_file "index.html" "$REMOTE_ROOT/index.html"
fi

# 2. Upload results directory recursively (include HTML, media, and data files)
if [ -d "results" ]; then
    find results -type f \
        \( -name "*.html" -o -name "*.wav" -o -name "*.mp4" \
           -name "*.png" -o -name "*.jpg" -o -name "*.jpeg" -o -name "*.gif" \
           -o -name "*.json" -o -name "*.npy" -o -name "*.csv" \) | while read -r file; do
        # results/phase0/intro.html -> beam_forminig/results/phase0/intro.html
        remote_file="$REMOTE_ROOT/$file"
        upload_file "$file" "$remote_file"
    done
fi

# 3. Upload docs directory (HTML files)
if [ -d "docs" ]; then
    find docs -type f -name "*.html" | while read -r file; do
        remote_file="$REMOTE_ROOT/$file"
        upload_file "$file" "$remote_file"
    done
fi

# 5. Upload docs/images directory
if [ -d "docs/images" ]; then
    find docs/images -type f \( -name "*.png" -o -name "*.jpg" -o -name "*.jpeg" -o -name "*.gif" -o -name "*.mp4" \) | while read -r file; do
        remote_file="$REMOTE_ROOT/$file"
        upload_file "$file" "$remote_file"
    done
fi

echo "Upload process finished."
