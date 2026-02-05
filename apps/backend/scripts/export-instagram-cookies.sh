#!/usr/bin/env bash
set -euo pipefail

BROWSER=${1:-chrome}
OUTPUT=${2:-/tmp/instagram_cookies.txt}

if ! command -v yt-dlp >/dev/null 2>&1; then
  echo "yt-dlp is required. Install it first." >&2
  exit 1
fi

yt-dlp --cookies-from-browser "$BROWSER" --cookies "$OUTPUT" --no-playlist "https://www.instagram.com/" >/dev/null

if [ ! -f "$OUTPUT" ]; then
  echo "Failed to write cookies to $OUTPUT" >&2
  exit 1
fi

echo "Cookies exported to $OUTPUT"
