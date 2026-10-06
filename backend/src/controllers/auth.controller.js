import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query, one } from '../config/db.js';
import { ApiError, asyncHandler, ok, created } from '../utils/api.js';
import { signToken } from '../middleware/auth.js';
import { audit } from '../middleware/audit.js';

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.validated || req.body;
  const user = await one('SELECT * FROM employees WHERE email = ? LIMIT 1', [email]);
  if (!user) throw ApiError.unauthorized('Invalid email or password');

  const match = await bcrypt.compare(String(password), user.password_hash);
  if (!match) throw ApiError.unauthorized('Invalid email or password');
  if (!user.is_active) throw ApiError.forbidden('Account is deactivated. Contact your administrator.');

  await query('UPDATE employees SET last_login_at = NOW() WHERE id = ?', [user.id]);

  const permissions = await query(
    'SELECT module, permission FROM roles_permissions WHERE role = ? AND allowed = 1',
    [user.role]
  );

  const token = signToken({ sub: user.id, role: user.role, name: user.name });

  await audit({
    userId: user.id, actorName: user.name, action: 'login', entity: 'auth',
    summary: `${user.email} signed in`, req,
  });

  ok(res, {
    token,
    user: publicUser(user),
    permissions: permissions.map((p) => `${p.module}:${p.permission}`),
  }, null, 'Signed in successfully');
});

export const register = asyncHandler(async (req, res) => {
  const { name, email, password, role = 'employee', phone, designation, department } =
    req.validated || req.body;

  const exists = await one('SELECT id FROM employees WHERE email = ?', [email]);
  if (exists) throw ApiError.conflict('An account with this email already exists');

  const hash = await bcrypt.hash(String(password), Number(process.env.BCRYPT_ROUNDS || 10));
  const { insertId } = await query(
    `INSERT INTO employees (employee_code, name, email, password_hash, phone, role, designation, department)
     VALUES (?,?,?,?,?,?,?,?)`,
    [await nextEmployeeCode(), name, email, hash, phone || null, role, designation || null, department || null]
  );

  if (role === 'developer') {
    await query('INSERT INTO developers (employee_id) VALUES (?)', [insertId]);
  }

  await audit({ userId: insertId, actorName: name, action: 'create', entity: 'employee', entityId: insertId, summary: `Registered ${email}`, req });
  created(res, publicUser(await one('SELECT * FROM employees WHERE id = ?', [insertId])), 'Account created');
});

export const me = asyncHandler(async (req, res) => {
  const permissions = await query(
    'SELECT module, permission FROM roles_permissions WHERE role = ? AND allowed = 1',
    [req.user.role]
  );
  ok(res, {
    user: req.user,
    permissions: permissions.map((p) => `${p.module}:${p.permission}`),
  });
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.validated || req.body;
  const user = await one('SELECT * FROM employees WHERE id = ?', [req.user.id]);
  const match = await bcrypt.compare(String(currentPassword), user.password_hash);
  if (!match) throw ApiError.badRequest('Current password is incorrect');
  const hash = await bcrypt.hash(String(newPassword), Number(process.env.BCRYPT_ROUNDS || 10));
  await query('UPDATE employees SET password_hash = ? WHERE id = ?', [hash, req.user.id]);
  await audit({ userId: req.user.id, actorName: req.user.name, action: 'update', entity: 'auth', summary: 'Password changed', req });
  ok(res, null, null, 'Password updated');
});

export function publicUser(u) {
  if (!u) return null;
  const { password_hash, ...rest } = u;
  return rest;
}

async function nextEmployeeCode() {
  const row = await one('SELECT employee_code FROM employees ORDER BY id DESC LIMIT 1');
  const last = row ? Number(row.employee_code.split('-').pop()) : 0;
  return `EMP-${String(last + 1).padStart(4, '0')}`;
}
