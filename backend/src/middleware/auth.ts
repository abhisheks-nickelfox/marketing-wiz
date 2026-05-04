import { Response, NextFunction } from 'express';
import { verifyToken } from '../config/auth';
import { User } from '../models';
import { AuthenticatedRequest } from '../types';
import logger from '../config/logger';

/**
 * Verifies the Bearer JWT from the Authorization header using jsonwebtoken,
 * then fetches the full user profile from the DB and attaches it to req.user.
 */
export async function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or malformed Authorization header' });
    return;
  }

  const token = authHeader.split(' ')[1];

  let payload: { sub: string };
  try {
    payload = verifyToken(token);
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  try {
    const profile = await User.findByPk(payload.sub, { raw: true });

    if (!profile) {
      res.status(401).json({ error: 'User profile not found' });
      return;
    }

    // Cast to the domain User type that routes/services expect.
    // We spread the Sequelize raw row — all fields are present.
    req.user = profile as unknown as import('../types').User;
    next();
  } catch (err) {
    logger.error('[auth] Profile fetch failed:', err);
    res.status(500).json({ error: 'Failed to load user profile' });
  }
}
