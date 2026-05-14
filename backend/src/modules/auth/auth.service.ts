import bcrypt from 'bcrypt';
import logger from '../../config/logger';
import { generateToken } from '../../config/auth';
import { User } from '../../models';

// ── Types ────────────────────────────────────────────────────────────────────

export interface LoginResult {
  user: unknown;
  token: string;
}

// ── Service methods ──────────────────────────────────────────────────────────

export async function loginUser(email: string, password: string): Promise<LoginResult> {
  // Fetch user including password_hash for verification
  const user = await User.findOne({
    where: { email: email.toLowerCase().trim() },
    attributes: { include: ['password_hash'] },
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
    password_hash: string | null;
  };

  if (userRow.status === 'Disabled') {
    throw Object.assign(new Error('Account is disabled'), { statusCode: 401 });
  }

  if (userRow.status === 'invited') {
    throw Object.assign(new Error('Account setup not completed. Please complete onboarding.'), { statusCode: 401 });
  }

  if (!userRow.password_hash) {
    throw Object.assign(new Error('Invalid email or password'), { statusCode: 401 });
  }

  const passwordMatch = await bcrypt.compare(password, userRow.password_hash);
  if (!passwordMatch) {
    throw Object.assign(new Error('Invalid email or password'), { statusCode: 401 });
  }

  // Strip password_hash before returning
  const { password_hash: _pw, ...safeUser } = userRow;
  const token = generateToken(safeUser.id, safeUser.email, safeUser.role);

  return { user: safeUser, token };
}

export async function updateUserProfile(userId: string, name: string): Promise<unknown> {
  await User.update({ name }, { where: { id: userId } });

  const updated = await User.findByPk(userId, { raw: true });
  if (!updated) throw new Error('User not found after update');

  const { password_hash: _pw, ...safeUser } = updated as unknown as Record<string, unknown>;
  return safeUser;
}
