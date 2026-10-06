import bcrypt from 'bcryptjs';
import { query, one } from '../config/db.js';
import { ApiError, asyncHandler, ok, created } from '../utils/api.js';
import { paginate } from '../middleware/validate.js';
import { audit } from '../middleware/audit.js';
import { publicUser } from './auth.controller.js';

export const list = asyncHandler(async (req, res) => {
  const { page, limit, offset } = paginate(req);
  const where = [];
  const params = [];
  const search = (req.query.search || '').trim();
  if (search) { where.push('(e.name LIKE ? OR e.email LIKE ? OR e.employee_code LIKE ?)'); params.push(...Array(3).fill(`%${search}%`)); }
  if (req.query.role) { where.push('e.role = ?'); params.push(req.query.role); }
  if (req.query.status) { where.push('e.is_active = ?'); params.push(req.query.status === 'active' ? 1 : 0); }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const rows = await query(
    `SELECT e.id, e.employee_code, e.name, e.email, e.phone, e.role, e.designation, e.department,
            e.avatar_url, e.hire_date, e.is_active, e.last_login_at, e.created_at,
       (SELECT COUNT(*) FROM lead_assignments la WHERE la.employee_id = e.id AND la.is_active = 1) AS active_leads,
       (SELECT COUNT(*) FROM lead_assignments la JOIN leads l ON l.id = la.lead_id
         WHERE la.employee_id = e.id AND l.status = 'Approved') AS converted_leads,
       (SELECT COUNT(*) FROM call_logs cl WHERE cl.employee_id = e.id) AS calls_made,
       d.availability
     FROM employees e
     LEFT JOIN developers d ON d.employee_id = e.id
     ${clause}
     ORDER BY e.created_at DESC LIMIT ${limit} OFFSET ${offset}`, params
  );
  const [{ total }] = await query(`SELECT COUNT(*) AS total FROM employees e ${clause}`, params);
  ok(res, rows, { page, limit, total });
});

export const getOne = asyncHandler(async (req, res) => {
  const emp = await one('SELECT * FROM employees WHERE id = ?', [req.params.id]);
  if (!emp) throw ApiError.notFound('Employee not found');
  const [leads, calls, followups] = await Promise.all([
    query(`SELECT l.id, l.lead_code, l.contact_name, l.status, l.expected_value, la.assigned_at
           FROM lead_assignments la JOIN leads l ON l.id = la.lead_id
           WHERE la.employee_id = ? ORDER BY la.assigned_at DESC LIMIT 30`, [emp.id]),
    query('SELECT id, started_at, duration_sec, call_status, outcome FROM call_logs WHERE employee_id = ? ORDER BY started_at DESC LIMIT 30', [emp.id]),
    query("SELECT id, subject, due_at, status, type FROM followups WHERE owner_id = ? ORDER BY due_at DESC LIMIT 30", [emp.id]),
  ]);
  ok(res, { ...publicUser(emp), leads, calls, followups });
});

export const create = asyncHandler(async (req, res) => {
  const b = req.validated || req.body;
  const exists = await one('SELECT id FROM employees WHERE email = ?', [b.email]);
  if (exists) throw ApiError.conflict('Email already in use');

  const hash = await bcrypt.hash(String(b.password), Number(process.env.BCRYPT_ROUNDS || 10));
  const code = await nextCode();
  const { insertId } = await query(
    `INSERT INTO employees (employee_code, name, email, password_hash, phone, role, designation, department, salary, hire_date, is_active)
     VALUES (?,?,?,?,?,?,?,?,?,?,1)`,
    [code, b.name, b.email, hash, b.phone || null, b.role || 'employee',
     b.designation || null, b.department || null, b.salary || null, b.hire_date || null]
  );
  if (b.role === 'developer') {
    await query('INSERT INTO developers (employee_id, skills, experience_years, availability, hourly_rate) VALUES (?,?,?,?,?)',
      [insertId, JSON.stringify(b.skills || []), b.experience_years || 0, b.availability || 'available', b.hourly_rate || null]);
  }
  await audit({ userId: req.user.id, actorName: req.user.name, action: 'create', entity: 'employee', entityId: insertId, summary: `Created employee ${b.name}`, req });
  created(res, publicUser(await one('SELECT * FROM employees WHERE id = ?', [insertId])), 'Employee created');
});

export const update = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const existing = await one('SELECT * FROM employees WHERE id = ?', [id]);
  if (!existing) throw ApiError.notFound('Employee not found');

  const b = req.validated || req.body;
  const fields = ['name','phone','role','designation','department','salary','hire_date','avatar_url'];
  const sets = [];
  const params = [];
  for (const f of fields) if (b[f] !== undefined) { sets.push(`${f} = ?`); params.push(b[f]); }
  if (b.is_active !== undefined) { sets.push('is_active = ?'); params.push(b.is_active ? 1 : 0); }
  if (sets.length) { params.push(id); await query(`UPDATE employees SET ${sets.join(', ')} WHERE id = ?`, params); }

  if (b.password) {
    const hash = await bcrypt.hash(String(b.password), Number(process.env.BCRYPT_ROUNDS || 10));
    await query('UPDATE employees SET password_hash = ? WHERE id = ?', [hash, id]);
  }
  if (b.role === 'developer') {
    await query('INSERT IGNORE INTO developers (employee_id) VALUES (?)', [id]);
    if (b.skills || b.availability || b.experience_years !== undefined || b.hourly_rate !== undefined) {
      await query(
        `UPDATE developers SET skills = COALESCE(?, skills), availability = COALESCE(?, availability),
          experience_years = COALESCE(?, experience_years), hourly_rate = COALESCE(?, hourly_rate)
         WHERE employee_id = ?`,
        [b.skills ? JSON.stringify(b.skills) : null, b.availability || null,
         b.experience_years ?? null, b.hourly_rate ?? null, id]
      );
    }
  }
  await audit({ userId: req.user.id, actorName: req.user.name, action: 'update', entity: 'employee', entityId: id, summary: `Updated ${existing.name}`, req });
  ok(res, publicUser(await one('SELECT * FROM employees WHERE id = ?', [id])), null, 'Employee updated');
});

export const remove = asyncHandler(async (req, res) => {
  const existing = await one('SELECT * FROM employees WHERE id = ?', [req.params.id]);
  if (!existing) throw ApiError.notFound('Employee not found');
  if (existing.role === 'admin') throw ApiError.badRequest('Admin accounts cannot be deleted — deactivate instead');
  await query('DELETE FROM employees WHERE id = ?', [existing.id]);
  await audit({ userId: req.user.id, actorName: req.user.name, action: 'delete', entity: 'employee', entityId: existing.id, summary: `Deleted ${existing.name}`, req });
  ok(res, null, null, 'Employee deleted');
});

export const performance = asyncHandler(async (req, res) => {
  const rows = await query(
    `SELECT e.id, e.employee_code, e.name, e.role, e.department, e.designation,
       COUNT(DISTINCT la.id) AS leads_owned,
       SUM(CASE WHEN l.status = 'Approved' THEN 1 ELSE 0 END) AS leads_converted,
       COUNT(DISTINCT cl.id) AS calls_made,
       COALESCE(SUM(cl.duration_sec),0) AS call_hours,
       COUNT(DISTINCT f.id) AS followups_total,
       SUM(CASE WHEN f.status = 'done' THEN 1 ELSE 0 END) AS followups_done,
       COALESCE(SUM(CASE WHEN l.status = 'Approved' THEN l.expected_value END),0) AS revenue_booked
     FROM employees e
     LEFT JOIN lead_assignments la ON la.employee_id = e.id AND la.is_active = 1
     LEFT JOIN leads l ON l.id = la.lead_id
     LEFT JOIN call_logs cl ON cl.employee_id = e.id
     LEFT JOIN followups f ON f.owner_id = e.id
     WHERE e.is_active = 1
     GROUP BY e.id
     ORDER BY revenue_booked DESC, leads_converted DESC`
  );
  const enriched = rows.map((r) => ({
    ...r,
    call_hours: Math.round((r.call_hours / 3600) * 10) / 10,
    conversion_rate: r.leads_owned ? Math.round((r.leads_converted / r.leads_owned) * 100) : 0,
    followup_rate: r.followups_total ? Math.round((r.followups_done / r.followups_total) * 100) : 0,
  }));
  ok(res, enriched);
});

async function nextCode() {
  const row = await one('SELECT employee_code FROM employees ORDER BY id DESC LIMIT 1');
  const last = row ? Number(row.employee_code.split('-').pop()) : 0;
  return `EMP-${String(last + 1).padStart(4, '0')}`;
}
