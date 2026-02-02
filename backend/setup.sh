#!/bin/bash

# Acro Backend Setup Script

echo "Setting up Acro Backend..."

# Create virtual environment
echo "Creating virtual environment..."
python3 -m venv venv

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Upgrade pip
echo "Upgrading pip..."
pip install --upgrade pip

# Install dependencies
echo "Installing dependencies..."
pip install -r requirements.txt

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file from .env.example..."
    cp .env.example .env
    echo "Please edit .env with your configuration."
fi

echo ""
echo "Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env with your database credentials"
echo "2. Create the MySQL database: CREATE DATABASE acro_db;"
echo "3. Run the application: python app.py"
echo ""
echo "To activate the virtual environment in the future, run:"
echo "  source venv/bin/activate"
