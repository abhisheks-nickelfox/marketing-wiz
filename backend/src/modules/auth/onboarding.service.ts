import logger from '../../config/logger';
import { verifyInviteToken } from '../../services/invite.service';
import { generateToken } from '../../config/auth';
import { uploadBase64Image } from '../../config/storage';
import {
  findUserById,
  fetchInviteNonce,
  storeInviteNonce,
  updateUser,
  replaceSkillsWithExperience,
} from '../users/users.service';
import { findOrCreateSkillByName } from '../skills/skills.service';
import { sendWelcomeEmail, sendSkillRequestEmail } from '../../services/email.service';
import { notifyAdmins, notifyUser } from '../notifications/notifications.service';
import { User } from '../../models';
import type { CompleteOnboardingDto } from './dto/complete-onboarding.dto';

// ── Types ────────────────────────────────────────────────────────────────────

export interface ValidateTokenResult {
  email: string;
  name: string | null;
}

export interface CompleteOnboardingResult {
  /** JWT access token — null if auto-login failed after activation. */
  token: string | null;
  user?: { id: string; email: string; name: string };
  message?: string;
}

export interface AvatarUploadResult {
  avatar_url: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Verify the invite token and check that the nonce still matches the DB.
 * Throws with a descriptive message on any failure.
 * Returns the token payload on success.
 */
async function verifyTokenWithNonce(token: string) {
  const payload = verifyInviteToken(token); // throws if expired or tampered

  const currentNonce = await fetchInviteNonce(payload.userId);
  if (!currentNonce || currentNonce !== payload.nonce) {
    throw Object.assign(
      new Error('This invite link has expired. Please ask an admin to resend it.'),
      { statusCode: 400 },
    );
  }

  return payload;
}

// ── Service methods ──────────────────────────────────────────────────────────

/**
 * Validate an onboarding invite token and return the associated user's email and name.
 * Called by GET /api/auth/onboarding/validate.
 */
export async function validateOnboardingToken(token: string): Promise<ValidateTokenResult> {
  const payload = await verifyTokenWithNonce(token);

  const user = await findUserById(payload.userId);
  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 400 });
  }
  if (user.status !== 'invited') {
    throw Object.assign(new Error('This invite has already been used'), { statusCode: 400 });
  }

  return { email: user.email, name: user.name };
}

/**
 * Complete the onboarding flow:
 *   1. Re-verify the token (guarded by nonce check).
 *   2. Set password + profile fields on the user, mark status Active.
 *   3. Assign skills if provided.
 *   4. Fire-and-forget welcome email.
 *   5. Issue a JWT and return it so the frontend can skip a separate login step.
 *
 * Called by POST /api/auth/onboarding/complete.
 */
export async function completeOnboarding(
  dto: CompleteOnboardingDto,
): Promise<CompleteOnboardingResult> {
  const { token, first_name, last_name, phone_number, avatar_url, password, skills, pending_skills } = dto;

  const payload = await verifyTokenWithNonce(token);

  const user = await findUserById(payload.userId);
  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 400 });
  }
  if (user.status !== 'invited') {
    throw Object.assign(new Error('This invite has already been used'), { statusCode: 400 });
  }

  const fullName = `${first_name.trim()} ${last_name.trim()}`.trim();

  // Clear the nonce so this token can never be replayed, then activate the account.
  await storeInviteNonce(payload.userId, null);

  await updateUser(payload.userId, {
    password,
    name:         fullName,
    first_name:   first_name.trim(),
    last_name:    last_name.trim(),
    phone_number: phone_number?.trim() || undefined,
    avatar_url:   avatar_url || undefined,
    status:       'Active',
  });

  // Fire-and-forget welcome notification — does not block account activation.
  notifyUser(payload.userId, 'Welcome to the team!', 'Your account has been activated. You can now log in and get started.').catch((e) =>
    logger.warn('[onboarding.service] notifyUser (welcome) failed:', e),
  );

  // Assign skills if provided — resolve each skill_name to an id (find or create).
  if (skills && skills.length > 0) {
    try {
      const resolved = await Promise.all(
        skills.map(async ({ skill_name, experience }) => ({
          skill_id: await findOrCreateSkillByName(skill_name),
          experience,
        })),
      );
      // Deduplicate by skill_id — if the same skill was entered twice, keep the last experience.
      const uniqueMap = new Map<string, { skill_id: string; experience?: string }>();
      for (const r of resolved) uniqueMap.set(r.skill_id, r);
      await replaceSkillsWithExperience(payload.userId, Array.from(uniqueMap.values()));
    } catch (e) {
      // Don't block onboarding completion — skills can be added later via profile edit.
      logger.error('[onboarding.service] Skill assignment failed:', e);
    }
  }

  // If the member requested skills not in the catalog, notify all admins.
  if (pending_skills && pending_skills.length > 0) {
    const filteredPending = pending_skills.map((s) => s.trim()).filter(Boolean);
    if (filteredPending.length > 0) {
      const notifMsg = `${fullName} requested ${filteredPending.length} new skill(s) during onboarding: ${filteredPending.join(', ')}`;
      notifyAdmins(notifMsg, 'skill_request').catch((e) =>
        logger.warn('[onboarding.service] notifyAdmins (skill_request) failed:', e),
      );

      // Email each admin — fire-and-forget
      void (async () => {
        try {
          const admins = await User.findAll({
            where: { role: 'admin' },
            attributes: ['email', 'name'],
            raw: true,
          });
          for (const admin of admins as unknown as { email: string; name: string }[]) {
            sendSkillRequestEmail(admin.email, fullName, filteredPending).catch((e: unknown) =>
              logger.warn('[onboarding.service] sendSkillRequestEmail failed:', e),
            );
          }
        } catch (e) {
          logger.warn('[onboarding.service] fetch admins for skill email failed:', e);
        }
      })();
    }
  }

  // Fire-and-forget welcome email.
  sendWelcomeEmail(payload.email, fullName).catch((e) =>
    logger.warn('[onboarding.service] Welcome email failed:', e),
  );

  // Issue a JWT directly — no separate login round-trip required.
  const refetchedUser = await findUserById(payload.userId);
  if (!refetchedUser) {
    return { token: null, message: 'Account activated. Please log in.' };
  }

  const jwtToken = generateToken(payload.userId, payload.email, refetchedUser.role);

  return {
    token: jwtToken,
    user: { id: payload.userId, email: payload.email, name: fullName },
  };
}

/**
 * Upload a base64-encoded avatar for an invited user to S3 (or data URL fallback).
 * Called by POST /api/auth/onboarding/avatar.
 */
export async function uploadOnboardingAvatar(
  token: string,
  image: string,
): Promise<AvatarUploadResult> {
  const payload = await verifyTokenWithNonce(token);

  const mimeMatch = image.match(/^data:(image\/\w+);base64,/);
  const mimeType = mimeMatch?.[1] ?? 'image/jpeg';
  const ext = mimeType.split('/')[1];
  const key = `${payload.userId}.${ext}`;

  const finalUrl = await uploadBase64Image(key, image);

  await updateUser(payload.userId, { avatar_url: finalUrl });

  return { avatar_url: finalUrl };
}
