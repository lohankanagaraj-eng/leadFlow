import { query } from '../config/db.js';

/**
 * Persists an audit trail entry for every mutating request.
 * Never throws — auditing must not break the business flow.
 */
export async function audit({ userId, actorName, action, entity, entityId, summary, req, metadata }) {
  try {
    await query(
      `INSERT INTO activity_logs
        (user_id, actor_name, action, entity, entity_id, summary, metadata, ip_address, user_agent)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [
        userId ?? null,
        actorName ?? 'system',
        action,
        entity,
        entityId != null ? String(entityId) : null,
        summary ?? null,
        metadata ? JSON.stringify(metadata) : null,
        req ? (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null) : null,
        req ? (req.headers['user-agent'] || null) : null,
      ]
    );
  } catch (err) {
    console.warn('[audit] skipped:', err.message);
  }
}

/** Express middleware: auto-audit successful mutations. */
export function auditMiddleware(entityResolver) {
  return (req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode < 400 && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
        const entity = typeof entityResolver === 'function' ? entityResolver(req) : entityResolver || req.baseUrl.split('/').pop();
        audit({
          userId: req.user?.id,
          actorName: req.user?.name,
          action: req.method === 'DELETE' ? 'delete' : req.method === 'POST' ? 'create' : 'update',
          entity,
          entityId: req.params?.id || body?.data?.id || null,
          summary: `${req.method} ${req.baseUrl}`,
          req,
          metadata: { body: sanitize(req.body), params: req.params, query: req.query },
        });
      }
      return originalJson(body);
    };
    next();
  };
}

function sanitize(body) {
  if (!body || typeof body !== 'object') return body;
  const clone = { ...body };
  delete clone.password;
  delete clone.password_hash;
  delete clone.newPassword;
  return clone;
}
