import { query } from '../config/db.js';

export async function notify(userId, { title, body = null, type = 'info', link = null }) {
  if (!userId) return null;
  const res = await query(
    'INSERT INTO notifications (user_id, title, body, type, link) VALUES (?,?,?,?,?)',
    [userId, title, body, type, link]
  );
  return res.insertId;
}

export async function notifyMany(userIds, payload) {
  const unique = [...new Set(userIds.filter(Boolean))];
  await Promise.all(unique.map((id) => notify(id, payload)));
}

export async function notifyRole(role, payload) {
  const users = await query('SELECT id FROM employees WHERE role = ? AND is_active = 1', [role]);
  await notifyMany(users.map((u) => u.id), payload);
}

export async function listNotifications(userId, { limit = 20, unreadOnly = false } = {}) {
  const where = unreadOnly ? 'AND is_read = 0' : '';
  return query(
    `SELECT * FROM notifications WHERE user_id = ? ${where}
     ORDER BY created_at DESC LIMIT ${Number(limit)}`,
    [userId]
  );
}

export async function markRead(userId, id) {
  await query('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [id, userId]);
}

export async function markAllRead(userId) {
  const res = await query('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0', [userId]);
  return res.affectedRows;
}

export async function unreadCount(userId) {
  const rows = await query(
    'SELECT COUNT(*) AS c FROM notifications WHERE user_id = ? AND is_read = 0',
    [userId]
  );
  return rows[0].c;
}
