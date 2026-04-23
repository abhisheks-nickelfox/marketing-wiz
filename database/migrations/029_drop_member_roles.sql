-- Migration 029: Remove member_roles catalog table
-- The member_role TEXT column on users is retained for backward compatibility.
-- The catalog (selectable role names) is no longer maintained via the API.

DROP TABLE IF EXISTS member_roles;
