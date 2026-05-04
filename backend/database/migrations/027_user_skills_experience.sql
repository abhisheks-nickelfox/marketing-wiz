-- Migration 027: Add experience column to user_skills
-- Stores the user-declared experience level for each skill (collected during onboarding)

ALTER TABLE user_skills ADD COLUMN IF NOT EXISTS experience TEXT;
