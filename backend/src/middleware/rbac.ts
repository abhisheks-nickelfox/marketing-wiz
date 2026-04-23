import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, PermissionKey } from '../types';
import { ADMIN_ROLES, MEMBER_ROLES } from '../config/constants';

/**
 * Requires the authenticated user to have role = 'admin' or 'super_admin'.
 * Must be used after the `authenticate` middleware.
 */
export function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  if (!ADMIN_ROLES.includes(req.user.role as 'admin' | 'super_admin')) {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }

  next();
}

/**
 * Requires admin role OR member role with the specified permission key.
 * Must be used after the `authenticate` middleware.
 */
export function requirePermission(permission: PermissionKey) {
  return function (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): void {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    if (ADMIN_ROLES.includes(req.user.role as 'admin' | 'super_admin')) {
      next();
      return;
    }
    if (req.user.role === 'member' && (req.user.permissions ?? []).includes(permission)) {
      next();
      return;
    }
    res.status(403).json({ error: 'Permission denied' });
  };
}

/**
 * Requires the authenticated user to have any valid role (admin, member, or super_admin).
 * Effectively just checks that the user is authenticated and has a recognized role.
 * Must be used after the `authenticate` middleware.
 */
export function requireMember(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  if (!MEMBER_ROLES.includes(req.user.role as 'admin' | 'member' | 'super_admin')) {
    res.status(403).json({ error: 'Member access required' });
    return;
  }

  next();
}

/**
 * Requires the authenticated user to have role = 'super_admin'.
 * Used exclusively for destructive operations (e.g. deleting user accounts).
 * Must be used after the `authenticate` middleware.
 */
export function requireSuperAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  if (req.user.role !== 'super_admin') {
    res.status(403).json({ error: 'Super admin access required' });
    return;
  }

  next();
}
