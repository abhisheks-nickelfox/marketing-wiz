import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, PermissionKey } from '../types';

/**
 * Requires the authenticated user to have role = 'admin'.
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

  if (req.user.role !== 'admin' && req.user.role !== 'super_admin' && req.user.role !== 'project_manager') {
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
    if (req.user.role === 'admin' || req.user.role === 'super_admin' || req.user.role === 'project_manager') {
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
 * Requires the authenticated user to have role = 'admin' or 'member'.
 * Effectively just checks that the user is authenticated and has a valid role.
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

  if (req.user.role !== 'admin' && req.user.role !== 'member' && req.user.role !== 'super_admin' && req.user.role !== 'project_manager') {
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
