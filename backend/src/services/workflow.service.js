import { query, one, transaction } from '../config/db.js';
import { ApiError } from '../utils/api.js';
import { notify, notifyMany, notifyRole } from './notification.service.js';
import { audit } from '../middleware/audit.js';

export const LEAD_STATUSES = ['New', 'Assigned', 'Contacted', 'Follow Up', 'Qualified', 'Approved', 'Rejected', 'Lost'];
export const PROJECT_STATUSES = [
  'Pending', 'Requirement Gathering', 'UI/UX Design', 'Development',
  'Testing', 'QA', 'Client Review', 'Deployment', 'Maintenance', 'Completed',
];

const STATUS_PROGRESS = {
  Pending: 0, 'Requirement Gathering': 10, 'UI/UX Design': 25, Development: 45,
  Testing: 65, QA: 75, 'Client Review': 85, Deployment: 92, Maintenance: 96, Completed: 100,
};

async function nextCode(db, table, column, prefix, width = 4) {
  const row = await db.one(
    `SELECT ${column} FROM ${table} WHERE ${column} LIKE ? ORDER BY id DESC LIMIT 1`,
    [`${prefix}%`]
  );
  const last = row ? Number(String(row[column]).split('-').pop()) : 0;
  return `${prefix}${String(last + 1).padStart(width, '0')}`;
}

/**
 * CORE WORKFLOW HOOK
 * When a lead flips to "Approved": create the project atomically,
 * transfer company + requirement details, generate project ID,
 * set timeline/priority/payment status, and notify everyone involved.
 */
export async function convertLeadToProject(leadId, actor) {
  const existing = await one('SELECT id, project_code FROM projects WHERE lead_id = ?', [leadId]);
  if (existing) return { project: existing, alreadyConverted: true };

  const lead = await one('SELECT * FROM leads WHERE id = ?', [leadId]);
  if (!lead) throw ApiError.notFound('Lead not found');
  if (lead.status !== 'Approved') throw ApiError.badRequest('Lead must be Approved to convert');

  const owner = await one(
    'SELECT employee_id FROM lead_assignments WHERE lead_id = ? AND is_active = 1 ORDER BY id DESC LIMIT 1',
    [leadId]
  );

  const project = await transaction(async (db) => {
    const code = await nextCode(db, 'projects', 'project_code', 'PRJ-');
    const start = new Date();
    const deadline = new Date(start.getTime() + 45 * 86400000);
    const priority = lead.priority || 'Medium';

    const res = await db.query(
      `INSERT INTO projects
        (project_code, lead_id, company_id, title, description, service_type,
         status, priority, progress, budget, paid_amount, payment_status,
         start_date, deadline, created_by, started_at)
       VALUES (?,?,?,?,?,?, 'Pending', ?, 0, ?, 0, 'Unpaid', ?, ?, ?, ?)`,
      [
        code,
        lead.id,
        lead.company_id,
        `${(lead.service_interest && lead.service_interest[0]) || 'Project'} — ${lead.contact_name}`,
        lead.requirement,
        Array.isArray(lead.service_interest) ? lead.service_interest.join(', ') : lead.service_interest,
        priority,
        lead.expected_value || lead.budget || null,
        start.toISOString().slice(0, 10),
        deadline.toISOString().slice(0, 10),
        actor?.id || null,
        start,
      ]
    );
    const projectId = res.insertId;

    await db.query(
      `INSERT INTO project_status_history (project_id, from_status, to_status, changed_by, remark)
       VALUES (?, NULL, 'Pending', ?, 'Auto-created from approved lead')`,
      [projectId, actor?.id || null]
    );
    await db.query(
      `INSERT INTO project_updates (project_id, author_id, status_to, progress, comment)
       VALUES (?, ?, 'Pending', 0, ?)`,
      [projectId, actor?.id || null, `Project ${code} auto-created from lead ${lead.lead_code}.`]
    );
    if (lead.company_id) {
      await db.query('UPDATE companies SET segment = ? WHERE id = ? AND segment = ?', ['client', lead.company_id, 'lead']);
    }

    const insertTask = (title, stage, assignee) => db.query(
      `INSERT INTO project_tasks (project_id, title, stage, assignee_id, status, priority, due_date, created_by)
       VALUES (?,?,?,?, 'todo', ?, ?, ?)`,
      [projectId, title, stage, assignee, priority,
        new Date(start.getTime() + 10 * 86400000).toISOString().slice(0, 10), actor?.id || null]
    );
    await insertTask('Collect & document detailed requirements', 'Requirement Gathering', null);
    await insertTask('Create wireframes and UI/UX design', 'UI/UX Design', null);
    await insertTask('Implement core development scope', 'Development', null);
    await insertTask('Execute QA & test plan', 'Testing', null);
    await insertTask('Client review & approval round', 'Client Review', null);
    await insertTask('Production deployment & handover', 'Deployment', null);

    return {
      id: projectId,
      project_code: code,
      lead_id: lead.id,
      status: 'Pending',
      priority,
      deadline: deadline.toISOString().slice(0, 10),
    };
  });

  const watchers = [
    actor?.id,
    owner?.employee_id,
    lead.created_by,
  ].filter(Boolean);
  await notifyManyWatchers(watchers, project, lead);

  await audit({
    userId: actor?.id, actorName: actor?.name, action: 'auto_convert',
    entity: 'project', entityId: project.project_code,
    summary: `Lead ${lead.lead_code} approved → project ${project.project_code} created`,
    metadata: { leadId, projectId: project.id },
  });

  return { project, alreadyConverted: false };
}

async function notifyManyWatchers(watchers, project, lead) {
  await notifyMany(watchers, {
    title: `Project ${project.project_code} created`,
    body: `Auto-converted from approved lead ${lead.lead_code}.`,
    type: 'project',
    link: `/projects/${project.id}`,
  });
  await notifyRole('admin', {
    title: 'New project generated from lead approval',
    body: `${project.project_code} · ${project.title}`,
    type: 'project',
    link: `/projects/${project.id}`,
  });
}

/** Move a project to a new status, writing history + progress + notifications. */
export async function moveProjectStatus(projectId, toStatus, actor, remark = null) {
  if (!PROJECT_STATUSES.includes(toStatus)) throw ApiError.badRequest('Invalid project status');
  const project = await one('SELECT * FROM projects WHERE id = ?', [projectId]);
  if (!project) throw ApiError.notFound('Project not found');
  if (project.status === toStatus) return project;

  const progress = STATUS_PROGRESS[toStatus];
  const completedAt = toStatus === 'Completed' ? new Date() : null;

  await transaction(async (db) => {
    await db.query(
      `UPDATE projects SET status = ?, progress = ?,
        completed_at = CASE WHEN ? = 'Completed' THEN NOW() ELSE completed_at END,
        started_at = COALESCE(started_at, CASE WHEN ? <> 'Pending' THEN NOW() END)
       WHERE id = ?`,
      [toStatus, progress, toStatus, toStatus, projectId]
    );
    await db.query(
      `INSERT INTO project_status_history (project_id, from_status, to_status, changed_by, remark)
       VALUES (?,?,?,?,?)`,
      [projectId, project.status, toStatus, actor?.id || null, remark]
    );
    await db.query(
      `INSERT INTO project_updates (project_id, author_id, status_from, status_to, progress, comment)
       VALUES (?,?,?,?,?,?)`,
      [projectId, actor?.id || null, project.status, toStatus, progress,
        remark || `Status changed from ${project.status} to ${toStatus}.`]
    );
  });

  const team = await query(
    'SELECT employee_id FROM project_assignments pa JOIN developers d ON d.id = pa.developer_id WHERE pa.project_id = ? AND pa.is_active = 1',
    [projectId]
  );
  await notifyMany(
    [...team.map((t) => t.employee_id), project.created_by, actor?.id],
    {
      title: `${project.project_code} → ${toStatus}`,
      body: remark || project.title,
      type: 'project',
      link: `/projects/${projectId}`,
    }
  );

  if (completedAt) await notify(project.created_by, {
    title: `${project.project_code} completed`, body: project.title, type: 'success', link: `/projects/${projectId}`,
  });

  return one('SELECT * FROM projects WHERE id = ?', [projectId]);
}

/** Recompute project progress from task completion ratio. */
export async function recomputeProjectProgress(projectId) {
  const row = await one(
    `SELECT COUNT(*) AS total, SUM(status = 'done') AS done FROM project_tasks WHERE project_id = ?`,
    [projectId]
  );
  if (!row || !row.total) return 0;
  const pct = Math.round((row.done / row.total) * 100);
  await query('UPDATE projects SET progress = GREATEST(progress, ?) WHERE id = ?', [pct, projectId]);
  return pct;
}
