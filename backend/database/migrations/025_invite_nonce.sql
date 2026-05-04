-- Migration 025: Add invite_nonce to users table
-- Purpose: Allows invalidating a previous invite link the moment a new one is sent.
-- Each time an invite is generated (create user or resend-invite), a new random
-- nonce is stored here and embedded in the token. Onboarding validation rejects
-- tokens whose nonce doesn't match the DB value, making older links immediately
-- invalid.

ALTER TABLE users ADD COLUMN IF NOT EXISTS invite_nonce TEXT NULL;
