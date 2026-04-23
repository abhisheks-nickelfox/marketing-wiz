// Shape of the POST /api/auth/onboarding/complete request body.
export interface CompleteOnboardingDto {
  /** Signed invite token from the onboarding URL query param. */
  token: string;
  first_name: string;
  last_name: string;
  /** E.164 format, e.g. +12025551234. Optional. */
  phone_number?: string;
  /** Pre-uploaded avatar URL (from POST /onboarding/avatar). Optional. */
  avatar_url?: string;
  /** Must be at least 8 characters. */
  password: string;
  /** Skills to assign on activation. Each entry resolves or creates the skill by name. */
  skills?: { skill_name: string; experience?: string }[];
  /** Skills the member wants to request that don't exist in the catalog yet. Notifies admins. */
  pending_skills?: string[];
}
