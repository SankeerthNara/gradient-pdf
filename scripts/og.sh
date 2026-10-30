#!/bin/sh
# Renders scripts/og.html to public/og.png (1200x630) with headless Chrome.
CHROME="${CHROME:-/c/Program Files/Google/Chrome/Application/chrome.exe}"
"$CHROME" --headless=new --disable-gpu --hide-scrollbars --window-size=1200,630 \
  --screenshot="$(pwd -W)/public/og.png" "file:///$(pwd -W)/scripts/og.html"
