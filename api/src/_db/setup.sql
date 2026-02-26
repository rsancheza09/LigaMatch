-- Destroy existing
DROP DATABASE IF EXISTS :database;

-- Create the database
CREATE DATABASE :database;
ALTER DATABASE :database SET TIME ZONE 'UTC';
\c :database

-- Create required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";
