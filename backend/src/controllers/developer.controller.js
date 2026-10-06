import { query, one } from '../config/db.js';
import { ApiError, asyncHandler, ok, created } from '../utils/api.js';
import { paginate } from '../middleware/validate.js';
import { audit } from '../middleware/audit.js';

const SKILL_POOL = ['React','Node.js','Express','MySQL','MongoDB','TypeScript','Next.js','Tailwind CSS',
  'React Native','Flutter','Android','iOS','Figma','UI/UX','SEO','Performance Marketing','Content Marketing',
  'Python','Django','Java','Spring Boot','AWS','Docker','DevOps','QA Automation','Selenium','Power BI'];

export const list = asyncHandler(async (req, res) => {
  const { page, limit, offset } = paginate(req);
  const where = [];
  const params = [];
  const search = (req.query.search || '').trim();
  if (search) { where.push('(e.name LIKE ? OR e.email LIKE ?)'); params.push(`%${search}%`, `%${search}%`); }
  if (req.query.availability) { where.push('d.availability = ?'); params.push(req.query.availability); }
  const skill = (req.query.skill || '').trim();
  if (skill) { where.push('JSON_CONTAINS(d.skills, ?)'); params.push(JSON.stringify(skill)); }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const rows = await query(
    `SELECT d.id, d.employee_id, d.skills, d.experience_years, d.availability, d.capacity_hours,
            d.hourly_rate, d.bio, e.name, e.email, e.phone, e.employee_code, e.designation, e.is_active,
       (SELECT COUNT(*) FROM project_assignments pa
         JOIN projects p ON p.id = pa.project_id
        WHERE pa.developer_id = d.id AND pa.is_active = 1 AND p.status <> 'Completed') AS active_projects,
       (SELECT COALESCE(SUM(pa.allocated_pct),0) FROM project_assignments pa
         JOIN projects p ON p.id = pa.project_id
        WHERE pa.developer_id = d.id AND pa.is_active = 1 AND p.status <> 'Completed') AS allocated_pct,
       (SELECT COUNT(*) FROM project_tasks t WHERE t.assignee_id = d.id AND t.status IN ('todo','in_progress','review')) AS open_tasks
     FROM developers d
     JOIN employees e ON e.id = d.employee_id
     ${clause}
     ORDER BY e.name ASC LIMIT ${limit} OFFSET ${offset}`, params
  );
  const [{ total }] = await query(`SELECT COUNT(*) AS total FROM developers d JOIN employees e ON e.id = d.employee_id ${clause}`, params);
  const skills = await query(`SELECT DISTINCT value FROM developers, JSON_TABLE(skills, '$[*]' COLUMNS (value VARCHAR(60) PATH '$')) jt ORDER BY value`);
  ok(res, rows.map((r) => ({ ...r, skills: parseSkills(r.skills), utilization: Math.min(100, Number(r.allocated_pct) || 0) })),
    { page, limit, total, skillPool: SKILL_POOL, skillsAvailable: skills.map((s) => s.value) });
});

export const getOne = asyncHandler(async (req, res) => {
  const dev = await one(
    `SELECT d.*, e.name, e.email, e.phone, e.employee_code, e.designation, e.department, e.is_active, e.hire_date
     FROM developers d JOIN employees e ON e.id = d.employee_id WHERE d.id = ?`,
    [req.params.id]
  );
  if (!dev) throw ApiError.notFound('Developer not found');

  const [projects, tasks] = await Promise.all([
    query(`SELECT p.id, p.project_code, p.title, p.status, p.progress, pa.allocated_pct, pa.role_in_project
           FROM project_assignments pa JOIN projects p ON p.id = pa.project_id
           WHERE pa.developer_id = ? AND pa.is_active = 1 ORDER BY pa.assigned_at DESC`, [dev.id]),
    query(`SELECT t.*, p.project_code FROM project_tasks t JOIN projects p ON p.id = t.project_id
           WHERE t.assignee_id = ? ORDER BY t.due_date ASC LIMIT 50`, [dev.id]),
  ]);
  ok(res, { ...dev, skills: parseSkills(dev.skills), projects, tasks });
});

export const create = asyncHandler(async (req, res) => {
  const b = req.validated || req.body;
  const employee = await one('SELECT * FROM employees WHERE id = ?', [b.employee_id]);
  if (!employee) throw ApiError.notFound('Employee not found');
  const exists = await one('SELECT id FROM developers WHERE employee_id = ?', [b.employee_id]);
  if (exists) throw ApiError.conflict('This employee already has a developer profile');

  const { insertId } = await query(
    `INSERT INTO developers (employee_id, skills, experience_years, availability, capacity_hours, hourly_rate, bio)
     VALUES (?,?,?,?,?,?,?)`,
    [b.employee_id, JSON.stringify(b.skills || []), b.experience_years || 0,
     b.availability || 'available', b.capacity_hours || 40, b.hourly_rate || null, b.bio || null]
  );
  if (employee.role !== 'developer') {
    await query("UPDATE employees SET role = 'developer' WHERE id = ?", [b.employee_id]);
  }
  await audit({ userId: req.user.id, actorName: req.user.name, action: 'create', entity: 'developer', entityId: insertId, summary: `Added developer ${employee.name}`, req });
  created(res, await one('SELECT * FROM developers WHERE id = ?', [insertId]), 'Developer added');
});

export const update = asyncHandler(async (req, res) => {
  const dev = await one('SELECT * FROM developers WHERE id = ?', [req.params.id]);
  if (!dev) throw ApiError.notFound('Developer not found');
  const b = req.validated || req.body;

  await query(
    `UPDATE developers SET skills = COALESCE(?, skills), experience_years = COALESCE(?, experience_years),
       availability = COALESCE(?, availability), capacity_hours = COALESCE(?, capacity_hours),
       hourly_rate = COALESCE(?, hourly_rate), bio = COALESCE(?, bio)
     WHERE id = ?`,
    [b.skills ? JSON.stringify(b.skills) : null, b.experience_years ?? null, b.availability || null,
     b.capacity_hours ?? null, b.hourly_rate ?? null, b.bio || null, dev.id]
  );
  await audit({ userId: req.user.id, actorName: req.user.name, action: 'update', entity: 'developer', entityId: dev.id, summary: 'Updated developer profile', req });
  ok(res, await one('SELECT * FROM developers WHERE id = ?', [dev.id]), null, 'Developer updated');
});

export const remove = asyncHandler(async (req, res) => {
  const dev = await one('SELECT * FROM developers WHERE id = ?', [req.params.id]);
  if (!dev) throw ApiError.notFound('Developer not found');
  const active = await one(
    `SELECT COUNT(*) AS c FROM project_assignments pa JOIN projects p ON p.id = pa.project_id
     WHERE pa.developer_id = ? AND pa.is_active = 1 AND p.status <> 'Completed'`, [dev.id]
  );
  if (active.c > 0) throw ApiError.badRequest('Developer is assigned to active projects');
  await query('DELETE FROM developers WHERE id = ?', [dev.id]);
  ok(res, null, null, 'Developer removed');
});

export const skills = asyncHandler(async (_req, res) => ok(res, SKILL_POOL));

function parseSkills(v) {
  if (Array.isArray(v)) return v;
  if (!v) return [];
  try { return JSON.parse(v); } catch { return String(v).split(',').map((s) => s.trim()).filter(Boolean); }
}
