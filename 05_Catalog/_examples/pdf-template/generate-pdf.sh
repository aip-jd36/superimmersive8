#!/bin/bash

# ===========================================
# Rights Package PDF Generator
# SuperImmersive 8
# ===========================================
#
# Usage: ./generate-pdf.sh input.html output.pdf
#
# Requires: wkhtmltopdf
# Install: brew install wkhtmltopdf
#
# ===========================================

# Check if wkhtmltopdf is installed
if ! command -v wkhtmltopdf &> /dev/null; then
    echo "❌ Error: wkhtmltopdf is not installed"
    echo ""
    echo "Install with:"
    echo "  macOS:   brew install wkhtmltopdf"
    echo "  Ubuntu:  sudo apt-get install wkhtmltopdf"
    echo ""
    exit 1
fi

# Check arguments
if [ $# -lt 2 ]; then
    echo "Usage: $0 <input.html> <output.pdf>"
    echo ""
    echo "Example:"
    echo "  $0 neon-dreams.html neon-dreams-rights-package.pdf"
    echo ""
    exit 1
fi

INPUT_HTML="$1"
OUTPUT_PDF="$2"

# Check if input file exists
if [ ! -f "$INPUT_HTML" ]; then
    echo "❌ Error: Input file not found: $INPUT_HTML"
    exit 1
fi

echo "🎬 Generating Rights Package PDF..."
echo "   Input:  $INPUT_HTML"
echo "   Output: $OUTPUT_PDF"
echo ""

# Generate PDF with wkhtmltopdf
wkhtmltopdf \
  --page-size A4 \
  --margin-top 20mm \
  --margin-bottom 20mm \
  --margin-left 15mm \
  --margin-right 15mm \
  --enable-local-file-access \
  --print-media-type \
  --enable-smart-shrinking \
  --no-stop-slow-scripts \
  --javascript-delay 1000 \
  "$INPUT_HTML" \
  "$OUTPUT_PDF"

# Check if PDF was created successfully
if [ -f "$OUTPUT_PDF" ]; then
    PDF_SIZE=$(du -h "$OUTPUT_PDF" | cut -f1)
    echo ""
    echo "✅ PDF generated successfully!"
    echo "   File: $OUTPUT_PDF"
    echo "   Size: $PDF_SIZE"
    echo ""
    echo "Open with:"
    echo "  open \"$OUTPUT_PDF\""
else
    echo ""
    echo "❌ Error: PDF generation failed"
    exit 1
fi
