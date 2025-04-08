#!/bin/bash

# ====================================================
# DEPENDENCIES AND INSTALLATION
# ====================================================
# One-liner installation (copy and paste this):
# brew install pandoc weasyprint parallel basictex python && python3 -m ensurepip --upgrade && pip3 install cffi pango cairo && sudo tlmgr update --self && sudo tlmgr install collection-fontsrecommended
#
# This script requires the following dependencies:
#
# 1. pandoc - Universal document converter
#    brew install pandoc
#
# 2. weasyprint - HTML/CSS to PDF converter
#    brew install weasyprint
#
# 3. GNU Parallel - Parallel processing tool
#    brew install parallel
#
# 4. BasicTeX (for weasyprint's PDF generation)
#    brew install basictex
#
# 5. Python (required by weasyprint)
#    brew install python
#
# 6. pip (Python package manager)
#    python3 -m ensurepip --upgrade
#
# 7. Additional Python packages for weasyprint
#    pip3 install cffi
#    pip3 install pango
#    pip3 install cairo
#
# Note: After installing BasicTeX, you might need to run:
#    sudo tlmgr update --self
#    sudo tlmgr install collection-fontsrecommended
#
# ====================================================

# Check if pandoc is installed
if ! command -v pandoc &>/dev/null; then
  echo "Error: pandoc is not installed. Please install it first."
  echo "On macOS, you can install it using: brew install pandoc"
  exit 1
fi

# Check if weasyprint is installed
if ! command -v weasyprint &>/dev/null; then
  echo "Error: weasyprint is not installed. Please install it first."
  echo "On macOS, you can install it using: brew install weasyprint"
  exit 1
fi

# Check if parallel is installed
if ! command -v parallel &>/dev/null; then
  echo "Error: GNU Parallel is not installed. Please install it first."
  echo "On macOS, you can install it using: brew install parallel"
  exit 1
fi

# Function to process a single file
process_file() {
  local md_file="$1"
  local html_file="${md_file%.*}.html"
  local pdf_file="${md_file%.*}.pdf"

  echo "Starting conversion of: $md_file"

  # Convert to HTML
  pandoc "$md_file" -o "$html_file" --standalone --css=scripts/github.css

  # Convert to PDF
  weasyprint "$html_file" "$pdf_file"

  # Clean up
  rm "$html_file"

  if [ $? -eq 0 ]; then
    echo "✅ Successfully generated: $pdf_file"
  else
    echo "❌ Failed to generate: $pdf_file"
  fi
}

# Export the function so parallel can use it
export -f process_file

# Find all markdown files and process them in parallel
# Using 80% of available CPU cores, with a nice progress bar
find . -type f -name "*.md" \
  -not -path "*/\.git/*" \
  -not -path "*/\.history/*" \
  -not -path "*/node_modules/*" |
  parallel --bar --jobs 80% process_file

echo "🎉 All PDFs generated! Time for a coffee break!"
