import path from 'node:path';
import fs from 'node:fs/promises';
import { query, one, transaction } from '../config/db.js';
import { ApiError, asyncHandler, ok, created } from '../utils/api.js';
import { paginate } from '../middleware/validate.js';
import { audit } from '../middleware/audit.js';
import { moveProjectStatus, recomputeProjectProgress, PROJECT_STATUSES } from '../services/workflow.service.js';
import { notify, notifyMany } from '../services/notification.service.js';

const UPLOAD_DIR = path.resolve('uploads');

export const list = asyncHandler(async (req, res) => {
  const { page, limit, offset } = paginate(req);
  const where = [];
  const params = [];
  const search = (req.query.search || '').trim();
  if (search) {
    where.push('(p.title LIKE ? OR p.project_code LIKE ? OR c.name LIKE ?)');
    params.push(...Array(3).fill(`%${search}%`));
  }
  if (req.query.status) { where.push('p.status = ?'); params.push(req.query.status); }
  if (req.query.priority) { where.push('p.priority = ?'); params.push(req.query.priority); }
  if (req.query.payment_status) { where.push('p.payment_status = ?'); params.push(req.query.payment_status); }

  if (req.user.role === 'developer') {
    where.push('EXISTS (SELECT 1 FROM project_assignments pa JOIN developers d ON d.id = pa.developer_id WHERE pa.project_id = p.id AND pa.is_active = 1 AND d.employee_id = ?)');
    params.push(req.user.id);
  }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const rows = await query(
    `SELECT p.*, c.name AS company_name, l.lead_code,
       (SELECT COUNT(*) FROM project_tasks t WHERE t.project_id = p.id) AS task_total,
       (SELECT COUNT(*) FROM project_tasks t WHERE t.project_id = p.id AND t.status = 'done') AS task_done,
       (SELECT COUNT(DISTINCT pa.developer_id) FROM project_assignments pa WHERE pa.project_id = p.id AND pa.is_active = 1) AS team_size
     FROM projects p
     LEFT JOIN companies c ON c.id = p.company_id
     LEFT JOIN leads l ON l.id = p.lead_id
     ${clause}
     ORDER BY p.created_at DESC LIMIT ${limit} OFFSET ${offset}`, params
  );
  const [{ total }] = await query(`SELECT COUNT(*) AS total FROM projects p LEFT JOIN companies c ON c.id = p.company_id ${clause}`, params);
  const statusAgg = await query('SELECT status, COUNT(*) AS count FROM projects GROUP BY FIELD(status, "Pending","Requirement Gathering","UI/UX Design","Development","Testing","QA","Client Review","Deployment","Maintenance","Completed")');
  ok(res, rows, { page, limit, total, statusAgg, allowedStatuses: PROJECT_STATUSES });
});

export const getOne = asyncHandler(async (req, res) => {
  const project = await one(
    `SELECT p.*, c.name AS company_name, c.email AS company_email, c.phone AS company_phone,
            l.lead_code, l.contact_name AS lead_contact, l.requirement AS lead_requirement
     FROM projects p
     LEFT JOIN companies c ON c.id = p.company_id
     LEFT JOIN leads l ON l.id = p.lead_id
     WHERE p.id = ?`, [req.params.id]
  );
  if (!project) throw ApiError.notFound('Project not found');

  const [team, tasks, updates, history, documents] = await Promise.all([
    query(`SELECT pa.*, d.id AS developer_id, d.skills, e.name, e.employee_code, e.designation, e.avatar_url
           FROM project_assignments pa
           JOIN developers d ON d.id = pa.developer_id
           JOIN employees e ON e.id = d.employee_id
           WHERE pa.project_id = ? ORDER BY pa.assigned_at DESC`, [project.id]),
    query(`SELECT t.*, d.id AS dev_profile_id, e.name AS assignee_name
           FROM project_tasks t
           LEFT JOIN developers d ON d.id = t.assignee_id
           LEFT JOIN employees e ON e.id = d.employee_id
           WHERE t.project_id = ?
           ORDER BY FIELD(t.status,'in_progress','review','todo','blocked','done'), t.due_date ASC`, [project.id]),
    query(`SELECT u.*, e.name AS author_name, e.role AS author_role
           FROM project_updates u JOIN employees e ON e.id = u.author_id
           WHERE u.project_id = ? ORDER BY u.created_at DESC LIMIT 50`, [project.id]),
    query(`SELECT h.*, e.name AS changed_by_name FROM project_status_history h
           LEFT JOIN employees e ON e.id = h.changed_by
           WHERE h.project_id = ? ORDER BY h.created_at DESC`, [project.id]),
    query('SELECT * FROM project_documents WHERE project_id = ? ORDER BY created_at DESC', [project.id]),
  ]);

  ok(res, { ...project, team, tasks, updates, history, documents, allowedStatuses: PROJECT_STATUSES });
});

export const create = asyncHandler(async (req, res) => {
  const b = req.validated || req.body;
  const code = await nextCode();
  const { insertId } = await query(
    `INSERT INTO projects (project_code, company_id, title, description, service_type, status, priority,
       progress, budget, paid_amount, payment_status, start_date, end_date, deadline, created_by)
     VALUES (?,?,?,?,?,?,?,0,?,0,'Unpaid',?,?,?,?)`,
    [code, b.company_id || null, b.title, b.description || null, b.service_type || null,
     b.status || 'Pending', b.priority || 'Medium', b.budget || null,
     b.start_date || new Date().toISOString().slice(0, 10), b.end_date || null,
     b.deadline || null, req.user.id]
  );
  await query(`INSERT INTO project_status_history (project_id, from_status, to_status, changed_by, remark)
                VALUES (?, NULL, ?, ?, 'Manually created')`, [insertId, b.status || 'Pending', req.user.id]);
  await audit({ userId: req.user.id, actorName: req.user.name, action: 'create', entity: 'project', entityId: insertId, summary: `Created project ${code}`, req });
  created(res, await one('SELECT * FROM projects WHERE id = ?', [insertId]), 'Project created');
});

export const update = asyncHandler(async (req, res) => {
  const project = await one('SELECT * FROM projects WHERE id = ?', [req.params.id]);
  if (!project) throw ApiError.notFound('Project not found');
  const b = req.validated || req.body;

  const fields = ['title','description','service_type','priority','budget','paid_amount','payment_status',
    'start_date','end_date','deadline','company_id'];
  const sets = [];
  const params = [];
  for (const f of fields) if (b[f] !== undefined) { sets.push(`${f} = ?`); params.push(b[f]); }

  if (b.paid_amount !== undefined && project.budget) {
    const paid = Number(b.paid_amount);
    const payment = paid <= 0 ? 'Unpaid' : paid >= Number(project.budget) ? 'Paid' : 'Partial';
    sets.push('payment_status = ?');
    params.push(payment);
  }

  let statusChanged = false;
  if (b.status && b.status !== project.status) statusChanged = true;

  if (sets.length && !statusChanged) { params.push(project.id); await query(`UPDATE projects SET ${sets.join(', ')} WHERE id = ?`, params); }
  else if (sets.length && statusChanged) { params.push(project.id); await query(`UPDATE projects SET ${sets.join(', ')} WHERE id = ?`, params); }

  if (statusChanged) await moveProjectStatus(project.id, b.status, req.user, b.remark || null);

  await audit({ userId: req.user.id, actorName: req.user.name, action: 'update', entity: 'project', entityId: project.id, summary: `Updated ${project.project_code}`, req });
  ok(res, await one('SELECT * FROM projects WHERE id = ?', [project.id]), null, 'Project updated');
});

export const remove = asyncHandler(async (req, res) => {
  const project = await one('SELECT * FROM projects WHERE id = ?', [req.params.id]);
  if (!project) throw ApiError.notFound('Project not found');
  await query('DELETE FROM projects WHERE id = ?', [project.id]);
  await audit({ userId: req.user.id, actorName: req.user.name, action: 'delete', entity: 'project', entityId: project.id, summary: `Deleted ${project.project_code}`, req });
  ok(res, null, null, 'Project deleted');
});

export const changeStatus = asyncHandler(async (req, res) => {
  const { status, remark } = req.validated || req.body;
  const project = await moveProjectStatus(req.params.id, status, req.user, remark || null);
  await audit({ userId: req.user.id, actorName: req.user.name, action: 'update', entity: 'project', entityId: req.params.id, summary: `Status → ${status}`, req });
  ok(res, project, null, `Project moved to ${status}`);
});

/** Assign / unassign multiple developers to a project. */
export const assignDevelopers = asyncHandler(async (req, res) => {
  const projectId = Number(req.params.id);
  const { developer_ids, allocated_pct = 100, role_in_project } = req.validated || req.body;
  const project = await one('SELECT * FROM projects WHERE id = ?', [projectId]);
  if (!project) throw ApiError.notFound('Project not found');
  if (!Array.isArray(developer_ids) || !developer_ids.length) throw ApiError.badRequest('developer_ids required');

  const added = [];
  await transaction(async (db) => {
    if (req.body.replace) {
      await db.query('UPDATE project_assignments SET is_active = 0, released_at = NOW() WHERE project_id = ?', [projectId]);
    }
    for (const devId of developer_ids) {
      const dev = await db.one('SELECT id, employee_id FROM developers WHERE id = ?', [devId]);
      if (!dev) throw ApiError.badRequest(`Developer ${devId} not found`);
      const dupe = await db.one(
        'SELECT id FROM project_assignments WHERE project_id = ? AND developer_id = ? AND is_active = 1',
        [projectId, devId]
      );
      if (dupe) continue;
      await db.query(
        `INSERT INTO project_assignments (project_id, developer_id, assigned_by, role_in_project, allocated_pct)
         VALUES (?,?,?,?,?)`,
        [projectId, devId, req.user.id, role_in_project || null, allocated_pct]
      );
      added.push(dev.employee_id);
      await db.query(
        `INSERT INTO project_updates (project_id, author_id, comment) VALUES (?,?,?)`,
        [projectId, req.user.id, `Developer assigned to project (allocated ${allocated_pct}%).`]
      );
    }
  });

  await notifyMany(added, {
    title: `Assigned to ${project.project_code}`,
    body: project.title, type: 'assignment', link: `/projects/${projectId}`,
  });
  await audit({ userId: req.user.id, actorName: req.user.name, action: 'update', entity: 'project', entityId: projectId, summary: 'Assigned developers', req });
  ok(res, await getProjectTeam(projectId), null, 'Developers assigned');
});

export const unassignDeveloper = asyncHandler(async (req, res) => {
  const projectId = Number(req.params.id);
  await query('UPDATE project_assignments SET is_active = 0, released_at = NOW() WHERE project_id = ? AND developer_id = ?', [projectId, req.params.devId]);
  ok(res, await getProjectTeam(projectId), null, 'Developer removed');
});

/** Post a progress update / comment. */
export const addUpdate = asyncHandler(async (req, res) => {
  const project = await one('SELECT * FROM projects WHERE id = ?', [req.params.id]);
  if (!project) throw ApiError.notFound('Project not found');
  const { comment, progress, status } = req.validated || req.body;

  if (status && status !== project.status) {
    await moveProjectStatus(project.id, status, req.user, comment);
  } else {
    await query(
      'INSERT INTO project_updates (project_id, author_id, progress, comment) VALUES (?,?,?,?)',
      [project.id, req.user.id, progress ?? null, comment]
    );
    if (progress != null) await query('UPDATE projects SET progress = ? WHERE id = ?', [Math.min(100, progress), project.id]);
  }

  const team = await query(
    'SELECT employee_id FROM project_assignments pa JOIN developers d ON d.id = pa.developer_id WHERE pa.project_id = ? AND pa.is_active = 1',
    [project.id]
  );
  await notifyMany([...team.map((t) => t.employee_id), project.created_by], {
    title: `Update on ${project.project_code}`, body: comment.slice(0, 180), type: 'project', link: `/projects/${project.id}`,
  });
  ok(res, await query('SELECT u.*, e.name AS author_name FROM project_updates u JOIN employees e ON e.id = u.author_id WHERE u.project_id = ? ORDER BY u.created_at DESC LIMIT 20', [project.id]), null, 'Update posted');
});

export const addTask = asyncHandler(async (req, res) => {
  const project = await one('SELECT * FROM projects WHERE id = ?', [req.params.id]);
  if (!project) throw ApiError.notFound('Project not found');
  const b = req.validated || req.body;

  const { insertId } = await query(
    `INSERT INTO project_tasks (project_id, title, description, stage, assignee_id, status, priority, estimate_hrs, due_date, start_date, created_by)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    [project.id, b.title, b.description || null, b.stage || 'Development',
     b.assignee_id || null, b.status || 'todo', b.priority || project.priority,
     b.estimate_hrs || null, b.due_date || null, b.start_date || null, req.user.id]
  );

  if (b.assignee_id) {
    const dev = await one('SELECT employee_id FROM developers WHERE id = ?', [b.assignee_id]);
    if (dev) await notify(dev.employee_id, {
      title: `Task assigned · ${project.project_code}`, body: b.title, type: 'project', link: `/projects/${project.id}`,
    });
  }
  await audit({ userId: req.user.id, actorName: req.user.name, action: 'create', entity: 'task', entityId: insertId, summary: `Task "${b.title}" on ${project.project_code}`, req });
  created(res, await one('SELECT * FROM project_tasks WHERE id = ?', [insertId]), 'Task created');
});

export const updateTask = asyncHandler(async (req, res) => {
  const task = await one('SELECT * FROM project_tasks WHERE id = ?', [req.params.id]);
  if (!task) throw ApiError.notFound('Task not found');
  const b = req.validated || req.body;

  const fields = ['title','description','stage','assignee_id','status','priority','estimate_hrs','due_date','start_date'];
  const sets = [];
  const params = [];
  for (const f of fields) if (b[f] !== undefined) { sets.push(`${f} = ?`); params.push(b[f]); }
  if (b.logged_hrs !== undefined) { sets.push('logged_hrs = logged_hrs + ?'); params.push(Number(b.logged_hrs) || 0); }
  if (b.status === 'done' && task.status !== 'done') { sets.push('completed_at = NOW()'); }
  if (b.status && b.status !== 'done') { sets.push('completed_at = NULL'); }
  if (sets.length) { params.push(task.id); await query(`UPDATE project_tasks SET ${sets.join(', ')} WHERE id = ?`, params); }

  const pct = await recomputeProjectProgress(task.project_id);
  await audit({ userId: req.user.id, actorName: req.user.name, action: 'update', entity: 'task', entityId: task.id, summary: `Task "${task.title}" → ${b.status || 'updated'}`, req });
  ok(res, { task: await one('SELECT * FROM project_tasks WHERE id = ?', [task.id]), projectProgress: pct }, null, 'Task updated');
});

export const deleteTask = asyncHandler(async (req, res) => {
  const task = await one('SELECT * FROM project_tasks WHERE id = ?', [req.params.id]);
  if (!task) throw ApiError.notFound('Task not found');
  await query('DELETE FROM project_tasks WHERE id = ?', [task.id]);
  await recomputeProjectProgress(task.project_id);
  ok(res, null, null, 'Task deleted');
});

/** Multipart document upload. */
export const uploadDocument = asyncHandler(async (req, res) => {
  const project = await one('SELECT * FROM projects WHERE id = ?', [req.params.id]);
  if (!project) throw ApiError.notFound('Project not found');
  if (!req.file) throw ApiError.badRequest('No file uploaded');

  const relative = `/uploads/${project.project_code}/${req.file.filename}`;
  const { insertId } = await query(
    `INSERT INTO project_documents (project_id, uploaded_by, file_name, original_name, mime_type, size_bytes, file_path, category)
     VALUES (?,?,?,?,?,?,?,?)`,
    [project.id, req.user.id, req.file.filename, req.file.originalname,
     req.file.mimetype, req.file.size, relative, req.body.category || 'other']
  );
  await audit({ userId: req.user.id, actorName: req.user.name, action: 'create', entity: 'document', entityId: insertId, summary: `Uploaded ${req.file.originalname}`, req });
  created(res, await one('SELECT * FROM project_documents WHERE id = ?', [insertId]), 'Document uploaded');
});

export const deleteDocument = asyncHandler(async (req, res) => {
  const doc = await one('SELECT * FROM project_documents WHERE id = ?', [req.params.id]);
  if (!doc) throw ApiError.notFound('Document not found');
  try { await fs.unlink(path.join(path.resolve('.'), doc.file_path)); } catch { /* file may be gone */ }
  await query('DELETE FROM project_documents WHERE id = ?', [doc.id]);
  ok(res, null, null, 'Document deleted');
});

export const history = asyncHandler(async (req, res) => {
  const rows = await query(
    `SELECT h.*, e.name AS changed_by_name, p.project_code
     FROM project_status_history h
     JOIN projects p ON p.id = h.project_id
     LEFT JOIN employees e ON e.id = h.changed_by
     WHERE h.project_id = ? ORDER BY h.created_at DESC`, [req.params.id]
  );
  ok(res, rows);
});

async function getProjectTeam(projectId) {
  return query(
    `SELECT pa.*, d.skills, e.name, e.employee_code, e.designation FROM project_assignments pa
     JOIN developers d ON d.id = pa.developer_id JOIN employees e ON e.id = d.employee_id
     WHERE pa.project_id = ? ORDER BY pa.assigned_at DESC`, [projectId]
  );
}

async function nextCode() {
  const row = await one('SELECT project_code FROM projects ORDER BY id DESC LIMIT 1');
  const last = row ? Number(String(row.project_code).split('-').pop()) : 0;
  return `PRJ-${new Date().getFullYear()}-${String(last + 1).padStart(4, '0')}`;
}
