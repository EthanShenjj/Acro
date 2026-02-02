#!/bin/bash

# Acro Backend - MySQL Database Setup Script
# This script creates the MySQL database for the Acro application

echo "🗄️  Acro MySQL Database Setup"
echo "================================"
echo ""

# Read database configuration from .env file
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "❌ Error: .env file not found"
    echo "Please copy .env.example to .env and configure your database settings"
    exit 1
fi

# Set default values if not in .env
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-3306}
DB_USER=${DB_USER:-root}
DB_NAME=${DB_NAME:-acro_db}

echo "Database Configuration:"
echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT"
echo "  User: $DB_USER"
echo "  Database: $DB_NAME"
echo ""

# Prompt for MySQL root password if not set
if [ -z "$DB_PASSWORD" ]; then
    echo "Enter MySQL password for user '$DB_USER' (press Enter if no password):"
    read -s DB_PASSWORD
    echo ""
fi

# Create database
echo "Creating database '$DB_NAME'..."

if [ -z "$DB_PASSWORD" ]; then
    # No password
    mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -e "CREATE DATABASE IF NOT EXISTS $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>/dev/null
else
    # With password
    mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" -e "CREATE DATABASE IF NOT EXISTS $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>/dev/null
fi

if [ $? -eq 0 ]; then
    echo "✅ Database '$DB_NAME' created successfully"
else
    echo "❌ Failed to create database. Please check:"
    echo "   - MySQL server is running"
    echo "   - Database credentials are correct"
    echo "   - User has permission to create databases"
    exit 1
fi

echo ""
echo "Initializing database schema..."
python3 init_db.py

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Database setup complete!"
    echo ""
    echo "You can now start the backend server with:"
    echo "  python3 app.py"
else
    echo ""
    echo "❌ Database initialization failed"
    echo "Please check the error messages above"
    exit 1
fi
