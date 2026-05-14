-- Migration 028: Add share_token to projects for public share links
ALTER TABLE projects ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE;
