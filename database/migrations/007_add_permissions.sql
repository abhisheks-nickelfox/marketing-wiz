-- Migration 007: Add permissions column to users table
ALTER TABLE users ADD COLUMN permissions text[] NOT NULL DEFAULT '{}';
