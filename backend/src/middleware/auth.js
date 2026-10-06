import jwt from 'jsonwebtoken';
import { ApiError } from '../utils/api.js';
import { one } from '../config/db.js';

export function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  });
}

export async function protect(req, _res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw ApiError.unauthorized('Authentication token missing');

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      throw ApiError.unauthorized('Invalid or expired token');
    }

    const user = await one(
      'SELECT id, employee_code, name, email, role, designation, department, avatar_url, is_active FROM employees WHERE id = ?',
      [decoded.sub]
    );
    if (!user) throw ApiError.unauthorized('Account no longer exists');
    if (!user.is_active) throw ApiError.forbidden('Account is deactivated');

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

/** Permission check driven by roles_permissions table (RBAC). */
export function authorize(...allowedRoles) {
  return (req, _res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (allowedRoles.length && !allowedRoles.includes(req.user.role)) {
      return next(ApiError.forbidden(`Requires role: ${allowedRoles.join(' or ')}`));
    }
    return next();
  };
}

/** Module-level permission guard, falls back to role check when no row exists. */
export function permission(module, action = 'read') {
  return async (req, _res, next) => {
    try {
      const role = req.user?.role;
      if (!role) throw ApiError.unauthorized();
      if (role === 'admin') return next();

      const row = await one(
        'SELECT allowed FROM roles_permissions WHERE role = ? AND module = ? AND permission = ?',
        [role, module, action]
      );
      if (row && row.allowed) return next();
      throw ApiError.forbidden(`Missing permission: ${module}.${action}`);
    } catch (err) {
      next(err);
    }
  };
}
