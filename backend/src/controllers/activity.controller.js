import { query } from '../config/db.js';
import { asyncHandler, ok } from '../utils/api.js';
import { paginate } from '../middleware/validate.js';

export const list = asyncHandler(async (req, res) => {
  const { page, limit, offset } = paginate(req, { defaultLimit: 25, maxLimit: 200 });
  const where = [];
  const params = [];

  const search = (req.query.search || '').trim();
  if (search) {
    where.push('(actor_name LIKE ? OR summary LIKE ? OR entity LIKE ?)');
    params.push(...Array(3).fill(`%${search}%`));
  }
  if (req.query.entity) { where.push('entity = ?'); params.push(req.query.entity); }
  if (req.query.action) { where.push('action = ?'); params.push(req.query.action); }
  if (req.query.user_id) { where.push('user_id = ?'); params.push(req.query.user_id); }
  if (req.query.mine === '1') { where.push('user_id = ?'); params.push(req.user.id); }

  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const rows = await query(
    `SELECT a.*, e.role AS user_role FROM activity_logs a
     LEFT JOIN employees e ON e.id = a.user_id
     ${clause} ORDER BY a.created_at DESC LIMIT ${limit} OFFSET ${offset}`, params
  );
  const [{ total }] = await query(`SELECT COUNT(*) AS total FROM activity_logs a ${clause}`, params);
  const entities = await query('SELECT DISTINCT entity FROM activity_logs ORDER BY entity');
  ok(res, rows, { page, limit, total, entities: entities.map((e) => e.entity) });
});
