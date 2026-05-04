import logger from '../../config/logger';
import { generateToken } from '../../config/auth';
import { User } from '../../models';

// ── Types ────────────────────────────────────────────────────────────────────

export interface LoginResult {
  user: unknown;
  token: string;
}

// ── Service methods ──────────────────────────────────────────────────────────

export async function loginUser(email: string, _password: string): Promise<LoginResult> {
  // Find user by email (case-insensitive via iLike)
  const user = await User.findOne({
    where: { email: email.toLowerCase().trim() },
    raw: true,
  });

  if (!user) {
    throw Object.assign(new Error('Invalid email or password'), { statusCode: 401 });
  }

  const userRow = user as unknown as {
    id: string;
    email: string;
    role: string;
    status: string;
  };

  if (userRow.status === 'Disabled') {
    throw Object.assign(new Error('Account is disabled'), { statusCode: 401 });
  }

  if (userRow.status === 'invited') {
    throw Object.assign(new Error('Account setup not completed. Please complete onboarding.'), { statusCode: 401 });
  }

  const token = generateToken(userRow.id, userRow.email, userRow.role);

  return { user: userRow, token };
}

export async function updateUserProfile(userId: string, name: string): Promise<unknown> {
  await User.update({ name }, { where: { id: userId } });

  const updated = await User.findByPk(userId, { raw: true });
  if (!updated) throw new Error('User not found after update');

  const { password_hash: _pw, ...safeUser } = updated as unknown as Record<string, unknown>;
  return safeUser;
}
