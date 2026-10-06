import { query, one } from '../config/db.js';
import { ApiError, asyncHandler, ok, created } from '../utils/api.js';
import { paginate } from '../middleware/validate.js';
import { audit } from '../middleware/audit.js';

export const list = asyncHandler(async (req, res) => {
  const { page, limit, offset } = paginate(req);
  const where = [];
  const params = [];

  if (req.query.status) { where.push('f.status = ?'); params.push(req.query.status); }
  if (req.query.lead_id) { where.push('f.lead_id = ?'); params.push(req.query.lead_id); }
  if (req.query.type) { where.push('f.type = ?'); params.push(req.query.type); }
  if (req.user.role === 'employee') { where.push('f.owner_id = ?'); params.push(req.user.id); }
  if (req.user.role === 'developer') { where.push('1 = 0'); }
  if (req.query.view === 'today') where.push('DATE(f.due_at) = CURDATE()');
  if (req.query.view === 'overdue') where.push("f.due_at < NOW() AND f.status = 'pending'");

  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const rows = await query(
    `SELECT f.*, l.lead_code, l.contact_name, l.status AS lead_status, e.name AS owner_name
     FROM followups f
     JOIN leads l ON l.id = f.lead_id
     JOIN employees e ON e.id = f.owner_id
     ${clause}
     ORDER BY f.due_at ASC LIMIT ${limit} OFFSET ${offset}`, params
  );
  const [{ total }] = await query(`SELECT COUNT(*) AS total FROM followups f ${clause}`, params);
  const [stats] = await query(
    `SELECT
       SUM(status = 'pending') AS pending,
       SUM(status = 'done') AS done,
       SUM(status = 'pending' AND due_at < NOW()) AS overdue,
       SUM(status = 'pending' AND DATE(due_at) = CURDATE()) AS due_today
     FROM followups f ${clause}`, params
  );
  ok(res, rows, { page, limit, total, stats });
});

export const create = asyncHandler(async (req, res) => {
  const b = req.validated || req.body;
  const lead = await one('SELECT * FROM leads WHERE id = ?', [b.lead_id]);
  if (!lead) throw ApiError.notFound('Lead not found');

  const ownerId = req.user.role === 'admin' && b.owner_id ? b.owner_id : req.user.id;
  const { insertId } = await query(
    `INSERT INTO followups (lead_id, owner_id, due_at, type, subject, notes, status)
     VALUES (?,?,?,?,?,?, 'pending')`,
    [b.lead_id, ownerId, b.due_at, b.type || 'call', b.subject, b.notes || null]
  );
  await audit({ userId: req.user.id, actorName: req.user.name, action: 'create', entity: 'followup', entityId: insertId, summary: `Scheduled: ${b.subject}`, req });
  created(res, await one('SELECT * FROM followups WHERE id = ?', [insertId]), 'Follow-up scheduled');
});

export const update = asyncHandler(async (req, res) => {
  const row = await one('SELECT * FROM followups WHERE id = ?', [req.params.id]);
  if (!row) throw ApiError.notFound('Follow-up not found');
  const b = req.validated || req.body;

  const sets = [];
  const params = [];
  for (const f of ['due_at', 'type', 'subject', 'notes', 'status']) {
    if (b[f] !== undefined) { sets.push(`${f} = ?`); params.push(b[f]); }
  }
  if (b.status === 'done') { sets.push('completed_at = NOW()'); }
  if (sets.length) { params.push(row.id); await query(`UPDATE followups SET ${sets.join(', ')} WHERE id = ?`, params); }

  if (b.status === 'done' && row.status !== 'done' && row.lead_id) {
    const lead = await one('SELECT lead_code, status FROM leads WHERE id = ?', [row.lead_id]);
    if (lead && (lead.status === 'New' || lead.status === 'Assigned')) {
      await query("UPDATE leads SET status = 'Follow Up' WHERE id = ?", [row.lead_id]);
    }
  }

  await audit({ userId: req.user.id, actorName: req.user.name, action: 'update', entity: 'followup', entityId: row.id, summary: `Follow-up → ${b.status || 'updated'}`, req });
  ok(res, await one('SELECT * FROM followups WHERE id = ?', [row.id]), null, 'Follow-up updated');
});

export const remove = asyncHandler(async (req, res) => {
  const row = await one('SELECT * FROM followups WHERE id = ?', [req.params.id]);
  if (!row) throw ApiError.notFound('Follow-up not found');
  await query('DELETE FROM followups WHERE id = ?', [row.id]);
  ok(res, null, null, 'Follow-up deleted');
});
