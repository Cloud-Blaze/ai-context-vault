#!/bin/bash
# Generate PNG icons from SVG for Chrome extension

# Check if ImageMagick is installed
if ! command -v convert &>/dev/null; then
  echo "Error: ImageMagick not found. Please install it first."
  echo "On macOS: brew install imagemagick"
  echo "On Ubuntu/Debian: sudo apt-get install imagemagick"
  exit 1
fi

# Path to SVG file
SVG_FILE="public/icons/icon.svg"

# Check if the SVG file exists
if [ ! -f "$SVG_FILE" ]; then
  echo "Error: SVG file not found at $SVG_FILE"
  exit 1
fi

# Create the icons directory if it doesn't exist
mkdir -p public/icons

# Generate icons in different sizes
echo "Generating icons from SVG..."

# 16x16 icon
convert -background none -size 16x16 "$SVG_FILE" public/icons/icon16.png
echo "✓ Created 16x16 icon"

# 48x48 icon
convert -background none -size 48x48 "$SVG_FILE" public/icons/icon48.png
echo "✓ Created 48x48 icon"

# 128x128 icon
convert -background none -size 128x128 "$SVG_FILE" public/icons/icon128.png
echo "✓ Created 128x128 icon"

echo "Icon generation complete!"
