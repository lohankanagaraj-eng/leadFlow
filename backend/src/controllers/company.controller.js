import { query, one } from '../config/db.js';
import { ApiError, asyncHandler, ok, created } from '../utils/api.js';
import { paginate } from '../middleware/validate.js';
import { audit } from '../middleware/audit.js';

export const list = asyncHandler(async (req, res) => {
  const { page, limit, offset } = paginate(req);
  const search = (req.query.search || '').trim();
  const segment = req.query.segment || '';
  const where = [];
  const params = [];

  if (search) { where.push('(c.name LIKE ? OR c.email LIKE ? OR c.phone LIKE ?)'); params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
  if (segment) { where.push('c.segment = ?'); params.push(segment); }

  // Employees only see companies linked to the leads assigned to them.
  if (req.user.role !== 'admin') {
    where.push(`EXISTS (SELECT 1 FROM leads l JOIN lead_assignments la ON la.lead_id = l.id
              AND la.employee_id = ? AND la.is_active = 1 WHERE l.company_id = c.id)`);
    params.push(req.user.id);
  }

  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const rows = await query(
    `SELECT c.*,
       (SELECT COUNT(*) FROM leads l WHERE l.company_id = c.id) AS lead_count,
       (SELECT COUNT(*) FROM projects p WHERE p.company_id = c.id) AS project_count
     FROM companies c ${clause}
     ORDER BY c.created_at DESC LIMIT ${limit} OFFSET ${offset}`, params
  );
  const [{ total }] = await query(`SELECT COUNT(*) AS total FROM companies c ${clause}`, params);
  ok(res, rows, { page, limit, total });
});

export const getOne = asyncHandler(async (req, res) => {
  const company = await one('SELECT * FROM companies WHERE id = ?', [req.params.id]);
  if (!company) throw ApiError.notFound('Company not found');
  if (req.user.role !== 'admin') {
    const mine = await one(
      `SELECT l.company_id FROM leads l JOIN lead_assignments la ON la.lead_id = l.id
         AND la.employee_id = ? AND la.is_active = 1 WHERE l.company_id = ? LIMIT 1`,
      [req.user.id, company.id]
    );
    if (!mine) throw ApiError.forbidden('You can only view companies assigned to you');
  }
  const [leads, projects] = await Promise.all([
    query(`SELECT id, lead_code, contact_name, status, expected_value, created_at FROM leads l
           WHERE l.company_id = ? ${req.user.role !== 'admin'
             ? 'AND EXISTS (SELECT 1 FROM lead_assignments la WHERE la.lead_id = l.id AND la.employee_id = ? AND la.is_active = 1)'
             : ''} ORDER BY l.created_at DESC LIMIT 20`,
      req.user.role !== 'admin' ? [company.id, req.user.id] : [company.id]),
    query(`SELECT id, project_code, title, status, progress, budget, payment_status FROM projects
           WHERE company_id = ? ORDER BY created_at DESC LIMIT 20`, [company.id]),
  ]);
  ok(res, { ...company, leads, projects });
});

export const create = asyncHandler(async (req, res) => {
  const b = req.validated || req.body;
  const code = await nextCode('companies', 'company_code', 'COMP-');
  const { insertId } = await query(
    `INSERT INTO companies (company_code, name, industry, website, email, phone, address, city, state, country, pincode, gst_number, segment, notes, created_by)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [code, b.name, b.industry || null, b.website || null, b.email || null, b.phone || null,
     b.address || null, b.city || null, b.state || null, b.country || null, b.pincode || null,
     b.gst_number || null, b.segment || 'lead', b.notes || null, req.user.id]
  );
  await audit({ userId: req.user.id, actorName: req.user.name, action: 'create', entity: 'company', entityId: insertId, summary: `Created company ${b.name}`, req });
  created(res, await one('SELECT * FROM companies WHERE id = ?', [insertId]));
});

export const update = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const existing = await one('SELECT * FROM companies WHERE id = ?', [id]);
  if (!existing) throw ApiError.notFound('Company not found');
  const b = req.validated || req.body;
  const fields = ['name','industry','website','email','phone','address','city','state','country','pincode','gst_number','segment','notes'];
  const sets = [];
  const params = [];
  for (const f of fields) {
    if (b[f] !== undefined) { sets.push(`${f} = ?`); params.push(b[f]); }
  }
  if (sets.length) {
    params.push(id);
    await query(`UPDATE companies SET ${sets.join(', ')} WHERE id = ?`, params);
  }
  await audit({ userId: req.user.id, actorName: req.user.name, action: 'update', entity: 'company', entityId: id, summary: 'Updated company', req });
  ok(res, await one('SELECT * FROM companies WHERE id = ?', [id]), null, 'Company updated');
});

export const remove = asyncHandler(async (req, res) => {
  const existing = await one('SELECT * FROM companies WHERE id = ?', [req.params.id]);
  if (!existing) throw ApiError.notFound('Company not found');
  await query('DELETE FROM companies WHERE id = ?', [req.params.id]);
  await audit({ userId: req.user.id, actorName: req.user.name, action: 'delete', entity: 'company', entityId: req.params.id, summary: `Deleted ${existing.name}`, req });
  ok(res, null, null, 'Company deleted');
});

async function nextCode(table, column, prefix) {
  const row = await one(`SELECT ${column} FROM ${table} ORDER BY id DESC LIMIT 1`);
  const last = row ? Number(String(row[column]).split('-').pop()) : 0;
  return `${prefix}${String(last + 1).padStart(4, '0')}`;
}
