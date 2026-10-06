import { asyncHandler, ok } from '../utils/api.js';
import { listNotifications, markRead, markAllRead, unreadCount } from '../services/notification.service.js';

export const list = asyncHandler(async (req, res) => {
  const rows = await listNotifications(req.user.id, {
    limit: Number(req.query.limit) || 20,
    unreadOnly: req.query.unread === '1' || req.query.unread === 'true',
  });
  ok(res, rows, { unread: await unreadCount(req.user.id) });
});

export const unread = asyncHandler(async (_req, res) => {
  ok(res, { count: await unreadCount(_req.user.id) });
});

export const readOne = asyncHandler(async (req, res) => {
  await markRead(req.user.id, req.params.id);
  ok(res, null, { unread: await unreadCount(req.user.id) }, 'Marked as read');
});

export const readAll = asyncHandler(async (req, res) => {
  const count = await markAllRead(req.user.id);
  ok(res, { updated: count }, { unread: 0 }, 'All notifications marked as read');
});
