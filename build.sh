#!/usr/bin/env bash
# Install Tesseract OCR
echo "Installing Tesseract OCR..."
apt-get update
apt-get install -y tesseract-ocr tesseract-ocr-eng

# Install Python dependencies
echo "Installing Python packages..."
pip install -r requirements.txt

echo "Build completed successfully!"
