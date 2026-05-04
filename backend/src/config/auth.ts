import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '7d';

if (!JWT_SECRET) {
  throw new Error('Missing environment variable: JWT_SECRET');
}

export interface JwtPayload {
  sub: string;   // user id
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

/**
 * Signs a JWT for the given user. Returns a token valid for JWT_EXPIRES_IN.
 */
export function generateToken(userId: string, email: string, role: string): string {
  return jwt.sign(
    { sub: userId, email, role },
    JWT_SECRET as string,
    { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions,
  );
}

/**
 * Verifies a JWT and returns the decoded payload.
 * Throws if the token is invalid or expired.
 */
export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET as string) as JwtPayload;
}
