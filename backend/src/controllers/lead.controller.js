import { query, one, transaction } from '../config/db.js';
import { ApiError, asyncHandler, ok, created } from '../utils/api.js';
import { paginate } from '../middleware/validate.js';
import { audit } from '../middleware/audit.js';
import { convertLeadToProject, LEAD_STATUSES } from '../services/workflow.service.js';
import { notify, notifyMany } from '../services/notification.service.js';

export const list = asyncHandler(async (req, res) => {
  const { page, limit, offset } = paginate(req);
  const where = [];
  const params = [];

  const search = (req.query.search || '').trim();
  if (search) {
    where.push('(l.contact_name LIKE ? OR l.email LIKE ? OR l.phone LIKE ? OR l.lead_code LIKE ? OR c.name LIKE ?)');
    params.push(...Array(5).fill(`%${search}%`));
  }
  if (req.query.status) { where.push('l.status = ?'); params.push(req.query.status); }
  if (req.query.priority) { where.push('l.priority = ?'); params.push(req.query.priority); }
  if (req.query.source) { where.push('l.source = ?'); params.push(req.query.source); }
  if (req.query.company_id) { where.push('l.company_id = ?'); params.push(req.query.company_id); }

  // Employees only see leads assigned to them.
  if (req.user.role === 'employee') {
    where.push('EXISTS (SELECT 1 FROM lead_assignments la WHERE la.lead_id = l.id AND la.employee_id = ? AND la.is_active = 1)');
    params.push(req.user.id);
  }

  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const rows = await query(
    `SELECT l.*, c.company_code AS company_code, c.name AS company_name,
       c.industry AS company_industry, c.address AS company_address,
       c.email AS company_email, c.phone AS company_phone, c.city AS company_city,
       (SELECT e.name FROM lead_assignments la JOIN employees e ON e.id = la.employee_id
         WHERE la.lead_id = l.id AND la.is_active = 1 ORDER BY la.id LIMIT 1) AS owner_name,
       (SELECT la.employee_id FROM lead_assignments la
         WHERE la.lead_id = l.id AND la.is_active = 1 ORDER BY la.id LIMIT 1) AS owner_id,
       (SELECT e.employee_code FROM lead_assignments la JOIN employees e ON e.id = la.employee_id
         WHERE la.lead_id = l.id AND la.is_active = 1 ORDER BY la.id LIMIT 1) AS owner_code,
       (SELECT COUNT(*) FROM call_logs cl WHERE cl.lead_id = l.id) AS call_count,
       (SELECT COUNT(*) FROM followups f WHERE f.lead_id = l.id AND f.status = 'pending') AS pending_followups
     FROM leads l
     LEFT JOIN companies c ON c.id = l.company_id
     ${clause}
     ORDER BY l.created_at DESC LIMIT ${limit} OFFSET ${offset}`,
    params
  );
  const [{ total }] = await query(`SELECT COUNT(DISTINCT l.id) AS total FROM leads l LEFT JOIN companies c ON c.id = l.company_id ${clause}`, params);

  const statusAgg = req.user.role === 'employee'
    ? await query(
        `SELECT l.status, COUNT(*) AS count FROM leads l
         JOIN lead_assignments la ON la.lead_id = l.id AND la.employee_id = ? AND la.is_active = 1
         GROUP BY l.status`, [req.user.id])
    : await query('SELECT status, COUNT(*) AS count FROM leads GROUP BY status');
  ok(res, rows, { page, limit, total, statusAgg });
});

export const getOne = asyncHandler(async (req, res) => {
  const lead = await one(
    `SELECT l.*, c.name AS company_name, c.segment AS company_segment
     FROM leads l LEFT JOIN companies c ON c.id = l.company_id WHERE l.id = ?`,
    [req.params.id]
  );
  if (!lead) throw ApiError.notFound('Lead not found');
  if (req.user.role === 'employee') {
    const mine = await one(
      'SELECT id FROM lead_assignments WHERE lead_id = ? AND employee_id = ? AND is_active = 1',
      [lead.id, req.user.id]
    );
    if (!mine) throw ApiError.forbidden('You can only view leads assigned to you');
  }

  const [assignments, calls, followups, project] = await Promise.all([
    query(`SELECT la.*, e.name, e.employee_code, e.role FROM lead_assignments la
           JOIN employees e ON e.id = la.employee_id WHERE la.lead_id = ? ORDER BY la.assigned_at DESC`, [lead.id]),
    query(`SELECT cl.*, e.name AS employee_name FROM call_logs cl
           JOIN employees e ON e.id = cl.employee_id WHERE cl.lead_id = ? ORDER BY cl.started_at DESC`, [lead.id]),
    query(`SELECT f.*, e.name AS owner_name FROM followups f
           JOIN employees e ON e.id = f.owner_id WHERE f.lead_id = ? ORDER BY f.due_at ASC`, [lead.id]),
    one('SELECT id, project_code, title, status, progress FROM projects WHERE lead_id = ?', [lead.id]),
  ]);

  ok(res, { ...lead, assignments, calls, followups, project });
});

export const create = asyncHandler(async (req, res) => {
  const b = req.validated || req.body;
  const code = await nextCode('leads', 'lead_code', 'LEAD-');

  const lead = await transaction(async (db) => {
    const r = await db.query(
      `INSERT INTO leads (lead_code, company_id, contact_name, email, phone, designation, source,
        service_interest, budget, expected_value, currency, status, priority, requirement, website_url, notes, created_by)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,'New',?,?,?,?,?)`,
      [code, b.company_id || null, b.contact_name, b.email || null, b.phone || null,
       b.designation || null, b.source || 'website',
       JSON.stringify(b.service_interest || []), b.budget || null, b.expected_value || null,
       b.currency || 'INR', b.priority || 'Medium', b.requirement || null,
       b.website_url || null, b.notes || null, req.user.id]
    );
    const leadId = r.insertId;

    if (b.assign_to) {
      await db.query(
        'INSERT INTO lead_assignments (lead_id, employee_id, assigned_by, note) VALUES (?,?,?,?)',
        [leadId, b.assign_to, req.user.id, 'Auto-assigned on creation']
      );
      await db.query("UPDATE leads SET status = 'Assigned' WHERE id = ?", [leadId]);
    }
    return db.one('SELECT * FROM leads WHERE id = ?', [leadId]);
  });

  if (b.assign_to) {
    await notify(b.assign_to, {
      title: `New lead ${code} assigned to you`,
      body: `${b.contact_name}${b.email ? ' · ' + b.email : ''}`,
      type: 'assignment', link: `/leads/${lead.id}`,
    });
  }

  await audit({ userId: req.user.id, actorName: req.user.name, action: 'create', entity: 'lead', entityId: lead.id, summary: `Created lead ${code}`, req });
  created(res, lead, 'Lead created');
});

export const update = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const existing = await one('SELECT * FROM leads WHERE id = ?', [id]);
  if (!existing) throw ApiError.notFound('Lead not found');
  if (req.user.role === 'employee') {
    const mine = await one(
      'SELECT id FROM lead_assignments WHERE lead_id = ? AND employee_id = ? AND is_active = 1',
      [id, req.user.id]
    );
    if (!mine) throw ApiError.forbidden('You can only update leads assigned to you');
  }
  const b = req.validated || req.body;

  const fields = ['company_id','contact_name','email','phone','designation','source','budget',
    'expected_value','currency','priority','requirement','website_url','notes'];
  const sets = [];
  const params = [];
  for (const f of fields) {
    if (b[f] !== undefined) { sets.push(`${f} = ?`); params.push(b[f]); }
  }
  if (b.service_interest !== undefined) { sets.push('service_interest = ?'); params.push(JSON.stringify(b.service_interest)); }

  let newStatus = null;
  if (b.status && b.status !== existing.status) {
    if (!LEAD_STATUSES.includes(b.status)) throw ApiError.badRequest('Invalid lead status');
    newStatus = b.status;
    sets.push('status = ?');
    params.push(b.status);
    if (b.status === 'Approved') {
      sets.push('approved_at = NOW()', 'approved_by = ?');
      params.push(req.user.id);
    }
  }

  if (sets.length) {
    params.push(id);
    await query(`UPDATE leads SET ${sets.join(', ')} WHERE id = ?`, params);
  }

  let project = null;
  let autoCreated = false;
  if (newStatus === 'Approved') {
    const result = await convertLeadToProject(id, req.user);
    project = result.project;
    autoCreated = !result.alreadyConverted;
  }

  await audit({
    userId: req.user.id, actorName: req.user.name, action: 'update', entity: 'lead', entityId: id,
    summary: newStatus ? `Lead ${existing.lead_code} status → ${newStatus}` : `Updated lead ${existing.lead_code}`,
    metadata: { from: existing.status, to: newStatus }, req,
  });

  ok(res, { lead: await one('SELECT * FROM leads WHERE id = ?', [id]), project, autoCreated },
    null, autoCreated ? 'Lead approved and project auto-created' : 'Lead updated');
});

export const remove = asyncHandler(async (req, res) => {
  const existing = await one('SELECT * FROM leads WHERE id = ?', [req.params.id]);
  if (!existing) throw ApiError.notFound('Lead not found');
  await query('DELETE FROM leads WHERE id = ?', [req.params.id]);
  await audit({ userId: req.user.id, actorName: req.user.name, action: 'delete', entity: 'lead', entityId: req.params.id, summary: `Deleted ${existing.lead_code}`, req });
  ok(res, null, null, 'Lead deleted');
});

/** Assign / reassign a lead to an employee. */
export const assign = asyncHandler(async (req, res) => {
  const leadId = req.params.id;
  const { employee_id, note } = req.validated || req.body;
  const lead = await one('SELECT * FROM leads WHERE id = ?', [leadId]);
  if (!lead) throw ApiError.notFound('Lead not found');
  const employee = await one('SELECT * FROM employees WHERE id = ? AND is_active = 1', [employee_id]);
  if (!employee) throw ApiError.notFound('Employee not found');

  await transaction(async (db) => {
    await db.query('UPDATE lead_assignments SET is_active = 0, released_at = NOW() WHERE lead_id = ? AND is_active = 1', [leadId]);
    await db.query(
      'INSERT INTO lead_assignments (lead_id, employee_id, assigned_by, note) VALUES (?,?,?,?)',
      [leadId, employee_id, req.user.id, note || null]
    );
    await db.query("UPDATE leads SET status = IF(status = 'New', 'Assigned', status) WHERE id = ?", [leadId]);
  });

  await notify(employee_id, {
    title: `Lead ${lead.lead_code} assigned to you`,
    body: `${lead.contact_name}${note ? ' · ' + note : ''}`,
    type: 'assignment', link: `/leads/${leadId}`,
  });
  await audit({ userId: req.user.id, actorName: req.user.name, action: 'update', entity: 'lead', entityId: leadId, summary: `Assigned ${lead.lead_code} to ${employee.name}`, req });
  ok(res, await one('SELECT * FROM leads WHERE id = ?', [leadId]), null, 'Lead assigned');
});

async function nextCode(table, column, prefix) {
  const row = await one(`SELECT ${column} FROM ${table} ORDER BY id DESC LIMIT 1`);
  const last = row ? Number(String(row[column]).split('-').pop()) : 0;
  return `${prefix}${String(last + 1).padStart(4, '0')}`;
}
