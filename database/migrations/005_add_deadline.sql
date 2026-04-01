-- Migration 005: Add deadline column to tickets table
ALTER TABLE tickets ADD COLUMN deadline date;
