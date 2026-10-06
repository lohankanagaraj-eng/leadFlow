import { query, one, transaction } from '../config/db.js';
import { ApiError, asyncHandler, ok, created } from '../utils/api.js';
import { paginate } from '../middleware/validate.js';
import { audit } from '../middleware/audit.js';
import { notify } from '../services/notification.service.js';

export const list = asyncHandler(async (req, res) => {
  const { page, limit, offset } = paginate(req);
  const where = [];
  const params = [];
  if (req.query.lead_id) { where.push('cl.lead_id = ?'); params.push(req.query.lead_id); }
  if (req.query.employee_id) { where.push('cl.employee_id = ?'); params.push(req.query.employee_id); }
  if (req.query.direction) { where.push('cl.direction = ?'); params.push(req.query.direction); }
  if (req.query.call_status) { where.push('cl.call_status = ?'); params.push(req.query.call_status); }
  if (req.user.role === 'employee') { where.push('cl.employee_id = ?'); params.push(req.user.id); }

  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const rows = await query(
    `SELECT cl.*, l.lead_code, l.contact_name, l.status AS lead_status, e.name AS employee_name
     FROM call_logs cl
     JOIN leads l ON l.id = cl.lead_id
     JOIN employees e ON e.id = cl.employee_id
     ${clause}
     ORDER BY cl.started_at DESC LIMIT ${limit} OFFSET ${offset}`, params
  );
  const [{ total }] = await query(`SELECT COUNT(*) AS total FROM call_logs cl ${clause}`, params);
  ok(res, rows, { page, limit, total });
});

export const create = asyncHandler(async (req, res) => {
  const b = req.validated || req.body;
  const lead = await one('SELECT * FROM leads WHERE id = ?', [b.lead_id]);
  if (!lead) throw ApiError.notFound('Lead not found');

  const employeeId = req.user.role === 'admin' && b.employee_id ? b.employee_id : req.user.id;

  // Employees may only call the leads assigned to them.
  if (req.user.role === 'employee') {
    const assigned = await one(
      'SELECT 1 FROM lead_assignments WHERE lead_id = ? AND employee_id = ? AND is_active = 1',
      [lead.id, employeeId]
    );
    if (!assigned) throw ApiError.forbidden('You can only call leads assigned to you');
  }

  const callId = await transaction(async (t) => {
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    const ins = await t.query(
      `INSERT INTO call_logs (lead_id, employee_id, direction, call_status, started_at, duration_sec, summary, outcome, next_step)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [lead.id, employeeId, b.direction || 'outbound', b.call_status || 'connected',
       b.started_at || now, b.duration_sec || 0, b.summary || null, b.outcome || null, b.next_step || null]
    );

    // Capture the contact person's details gathered during the call.
    if (b.contact_name !== undefined || b.email !== undefined || b.phone !== undefined) {
      const sets = [];
      const values = [];
      if (b.contact_name !== undefined) { sets.push('contact_name = ?'); values.push(b.contact_name); }
      if (b.email !== undefined) { sets.push('email = ?'); values.push(b.email || null); }
      if (b.phone !== undefined) { sets.push('phone = ?'); values.push(b.phone || null); }
      if (sets.length) {
        values.push(lead.id);
        await t.query(`UPDATE leads SET ${sets.join(', ')} WHERE id = ?`, values);
      }
    }

    // Capture company details gathered during the call.
    if (b.company_name) {
      if (lead.company_id) {
        await t.query(
          `UPDATE companies SET
             name = COALESCE(?, name),
             industry = COALESCE(?, industry),
             email = COALESCE(?, email),
             phone = COALESCE(?, phone),
             city = COALESCE(?, city)
           WHERE id = ?`,
          [b.company_name || null, b.company_industry || null, b.company_email || null,
           b.company_phone || null, b.company_city || null, lead.company_id]
        );
      } else {
        const codes = await t.query('SELECT company_code FROM companies ORDER BY id DESC LIMIT 1');
        const last = codes.length ? Number(String(codes[0].company_code).split('-').pop()) : 0;
        const code = `COMP-${String(last + 1).padStart(4, '0')}`;
        const company = await t.query(
          `INSERT INTO companies (company_code, name, industry, email, phone, city, segment, created_by)
           VALUES (?,?,?,?,?,?, 'lead', ?)`,
          [code, b.company_name, b.company_industry || null, b.company_email || null,
           b.company_phone || null, b.company_city || null, employeeId]
        );
        await t.query('UPDATE leads SET company_id = ? WHERE id = ?', [company.insertId, lead.id]);
      }
    }

    // A first touch always moves the lead to Contacted.
    if (lead.status === 'New' || lead.status === 'Assigned') {
      await t.query("UPDATE leads SET status = 'Contacted' WHERE id = ?", [lead.id]);
    }

    if (b.followup_after_days) {
      const due = new Date(Date.now() + Number(b.followup_after_days) * 86400000);
      await t.query(
        `INSERT INTO followups (lead_id, owner_id, due_at, type, subject, notes, status)
         VALUES (?,?,?, 'call', ?, ?, 'pending')`,
        [lead.id, employeeId, due.toISOString().slice(0, 19).replace('T', ' '),
         `Follow-up after call on ${lead.lead_code}`, b.next_step || null]
      );
      await notify(employeeId, {
        title: `Follow-up scheduled for ${lead.lead_code}`,
        body: `Due ${due.toLocaleDateString()} · ${b.next_step || 'Call again'}`,
        type: 'followup', link: `/leads/${lead.id}`,
      });
    }

    return ins.insertId;
  });

  await audit({ userId: req.user.id, actorName: req.user.name, action: 'create', entity: 'call', entityId: callId, summary: `Logged call for ${lead.lead_code}`, req });
  created(res, await one('SELECT * FROM call_logs WHERE id = ?', [callId]), 'Call logged');
});

export const remove = asyncHandler(async (req, res) => {
  const row = await one('SELECT * FROM call_logs WHERE id = ?', [req.params.id]);
  if (!row) throw ApiError.notFound('Call log not found');
  await query('DELETE FROM call_logs WHERE id = ?', [row.id]);
  await audit({ userId: req.user.id, actorName: req.user.name, action: 'delete', entity: 'call', entityId: row.id, summary: 'Deleted call log', req });
  ok(res, null, null, 'Call log deleted');
});
