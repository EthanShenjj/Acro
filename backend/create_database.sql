-- Acro Database Creation Script
-- Run this script to create the MySQL database

-- Create database
CREATE DATABASE IF NOT EXISTS acro_db 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

-- Use the database
USE acro_db;

-- Show success message
SELECT 'Database acro_db created successfully!' AS message;
