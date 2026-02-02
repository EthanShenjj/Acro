#!/bin/bash

# Acro Extension Testing Setup Script
# This script helps prepare the environment for testing the Chrome extension

set -e

echo "🎬 Acro Extension Testing Setup"
echo "================================"
echo ""

# Check if backend directory exists
if [ ! -d "../backend" ]; then
    echo "❌ Error: Backend directory not found"
    echo "   Please run this script from the extension directory"
    exit 1
fi

# Check Python installation
echo "📋 Checking Python installation..."
if ! command -v python &> /dev/null; then
    echo "❌ Error: Python not found"
    echo "   Please install Python 3.11+ to continue"
    exit 1
fi

PYTHON_VERSION=$(python -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')
echo "✅ Python $PYTHON_VERSION found"
echo ""

# Check if backend dependencies are installed
echo "📦 Checking backend dependencies..."
cd ../backend

if [ ! -f "requirements.txt" ]; then
    echo "❌ Error: requirements.txt not found"
    exit 1
fi

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "⚠️  Virtual environment not found"
    echo "   Creating virtual environment..."
    python -m venv venv
    echo "✅ Virtual environment created"
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "📥 Installing backend dependencies..."
pip install -q -r requirements.txt
echo "✅ Backend dependencies installed"
echo ""

# Check if database is initialized
echo "🗄️  Checking database..."
if [ ! -f "acro.db" ]; then
    echo "⚠️  Database not found"
    echo "   Initializing database..."
    python init_db.py
    echo "✅ Database initialized"
else
    echo "✅ Database found"
fi
echo ""

# Check if extension icons exist
echo "🎨 Checking extension icons..."
cd ../extension

ICONS_MISSING=false
for size in 16 48 128; do
    if [ ! -f "icons/icon${size}.png" ]; then
        ICONS_MISSING=true
        break
    fi
done

if [ "$ICONS_MISSING" = true ]; then
    echo "⚠️  Extension icons not found"
    echo "   You can create icons using icons/generate-icons.html"
    echo "   Or temporarily comment out icon references in manifest.json"
else
    echo "✅ Extension icons found"
fi
echo ""

# Summary
echo "================================"
echo "✅ Setup Complete!"
echo ""
echo "Next steps:"
echo "1. Start the backend server:"
echo "   cd backend"
echo "   source venv/bin/activate  # On Windows: venv\\Scripts\\activate"
echo "   python app.py"
echo ""
echo "2. Load the extension in Chrome:"
echo "   - Open chrome://extensions/"
echo "   - Enable 'Developer mode'"
echo "   - Click 'Load unpacked'"
echo "   - Select the 'extension' directory"
echo ""
echo "3. Follow the testing guide:"
echo "   - Open extension/TESTING_GUIDE.md"
echo "   - Complete all test scenarios"
echo ""
echo "Happy testing! 🚀"
