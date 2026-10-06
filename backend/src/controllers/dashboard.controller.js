import { query, one } from '../config/db.js';
import { asyncHandler, ok } from '../utils/api.js';

export const adminDashboard = asyncHandler(async (_req, res) => {
  const [kpi] = await query('SELECT * FROM vw_kpi_overview');
  const [leadByStatus, projectByStatus, revenueByMonth, leadsBySource, pipeline] = await Promise.all([
    query('SELECT status, COUNT(*) AS count FROM leads GROUP BY status'),
    query('SELECT status, COUNT(*) AS count FROM projects GROUP BY status'),
    query(`SELECT DATE_FORMAT(created_at, '%Y-%m') AS month,
                  SUM(budget) AS booked, SUM(paid_amount) AS collected
           FROM projects GROUP BY month ORDER BY month DESC LIMIT 12`),
    query('SELECT source, COUNT(*) AS count FROM leads GROUP BY source ORDER BY count DESC'),
    query(`SELECT COALESCE(SUM(expected_value),0) AS open_pipeline
           FROM leads WHERE status NOT IN ('Approved','Rejected','Lost')`),
  ]);
  const [recentLeads, recentProjects, overdueFollowups, topPerformers] = await Promise.all([
    query(`SELECT l.id, l.lead_code, l.contact_name, l.status, l.priority, l.expected_value, l.created_at, c.name AS company_name
           FROM leads l LEFT JOIN companies c ON c.id = l.company_id ORDER BY l.created_at DESC LIMIT 6`),
    query(`SELECT p.id, p.project_code, p.title, p.status, p.progress, p.payment_status, p.deadline, c.name AS company_name
           FROM projects p LEFT JOIN companies c ON c.id = p.company_id ORDER BY p.updated_at DESC LIMIT 6`),
    query(`SELECT f.id, f.subject, f.due_at, l.lead_code, l.contact_name, e.name AS owner_name
           FROM followups f JOIN leads l ON l.id = f.lead_id JOIN employees e ON e.id = f.owner_id
           WHERE f.status = 'pending' AND f.due_at < NOW() ORDER BY f.due_at ASC LIMIT 6`),
    query(`SELECT e.id, e.name, e.role, e.designation,
              COUNT(DISTINCT la.lead_id) AS leads,
              SUM(CASE WHEN l.status='Approved' THEN 1 ELSE 0 END) AS conversions
            FROM employees e
            LEFT JOIN lead_assignments la ON la.employee_id = e.id AND la.is_active = 1
            LEFT JOIN leads l ON l.id = la.lead_id
            WHERE e.is_active = 1 GROUP BY e.id
            ORDER BY conversions DESC, leads DESC LIMIT 5`),
  ]);

  ok(res, { kpi, leadByStatus, projectByStatus, revenueByMonth, leadsBySource, pipeline, recentLeads, recentProjects, overdueFollowups, topPerformers });
});

export const employeeDashboard = asyncHandler(async (req, res) => {
  const id = req.user.id;
  const [assigned, converted, calls, pendingFu, overdueFu, value] = await Promise.all([
    query('SELECT COUNT(*) AS c FROM lead_assignments WHERE employee_id = ? AND is_active = 1', [id]),
    query(`SELECT COUNT(*) AS c FROM lead_assignments la JOIN leads l ON l.id = la.lead_id
           WHERE la.employee_id = ? AND la.is_active = 1 AND l.status = 'Approved'`, [id]),
    query('SELECT COUNT(*) AS c, COALESCE(SUM(duration_sec),0) AS secs FROM call_logs WHERE employee_id = ?', [id]),
    query("SELECT COUNT(*) AS c FROM followups WHERE owner_id = ? AND status = 'pending'", [id]),
    query("SELECT COUNT(*) AS c FROM followups WHERE owner_id = ? AND status = 'pending' AND due_at < NOW()", [id]),
    query(`SELECT COALESCE(SUM(l.expected_value),0) AS v FROM lead_assignments la JOIN leads l ON l.id = la.lead_id
           WHERE la.employee_id = ? AND la.is_active = 1 AND l.status = 'Approved'`, [id]),
  ]);

  const [myLeads, todayFollowups, myCalls, weeklyActivity] = await Promise.all([
    query(`SELECT l.id, l.lead_code, l.contact_name, l.status, l.priority, l.expected_value, l.updated_at, c.name AS company_name
           FROM lead_assignments la JOIN leads l ON l.id = la.lead_id
           LEFT JOIN companies c ON c.id = l.company_id
           WHERE la.employee_id = ? AND la.is_active = 1 ORDER BY l.updated_at DESC LIMIT 8`, [id]),
    query(`SELECT f.*, l.lead_code, l.contact_name FROM followups f JOIN leads l ON l.id = f.lead_id
           WHERE f.owner_id = ? AND f.status = 'pending' AND f.due_at >= CURDATE()
           ORDER BY f.due_at ASC LIMIT 6`, [id]),
    query(`SELECT cl.*, l.lead_code, l.contact_name FROM call_logs cl JOIN leads l ON l.id = cl.lead_id
           WHERE cl.employee_id = ? ORDER BY cl.started_at DESC LIMIT 6`, [id]),
    query(`SELECT DATE(created_at) AS day, COUNT(*) AS count FROM activity_logs
           WHERE user_id = ? AND created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
           GROUP BY day ORDER BY day`, [id]),
  ]);

  ok(res, {
    kpi: {
      assigned: assigned[0].c, converted: converted[0].c, calls: calls[0].c,
      callHours: Math.round((calls[0].secs / 3600) * 10) / 10,
      pendingFollowups: pendingFu[0].c, overdueFollowups: overdueFu[0].c,
      revenue: value[0].v,
      conversionRate: assigned[0].c ? Math.round((converted[0].c / assigned[0].c) * 100) : 0,
    },
    myLeads, todayFollowups, myCalls, weeklyActivity,
  });
});

export const developerDashboard = asyncHandler(async (req, res) => {
  const dev = await one('SELECT id FROM developers WHERE employee_id = ?', [req.user.id]);
  if (!dev) return ok(res, { kpi: { projects: 0, tasks: 0, openTasks: 0, doneTasks: 0, hours: 0 }, projects: [], tasks: [], activity: [] });

  const [projects, openTasks, doneTasks, hours] = await Promise.all([
    query(`SELECT COUNT(DISTINCT p.id) AS c FROM project_assignments pa
           JOIN projects p ON p.id = pa.project_id
           WHERE pa.developer_id = ? AND pa.is_active = 1 AND p.status <> 'Completed'`, [dev.id]),
    query("SELECT COUNT(*) AS c FROM project_tasks WHERE assignee_id = ? AND status IN ('todo','in_progress','review','blocked')", [dev.id]),
    query("SELECT COUNT(*) AS c FROM project_tasks WHERE assignee_id = ? AND status = 'done'", [dev.id]),
    query('SELECT COALESCE(SUM(logged_hrs),0) AS h FROM project_tasks WHERE assignee_id = ?', [dev.id]),
  ]);

  const [myProjects, myTasks, recentUpdates] = await Promise.all([
    query(`SELECT p.id, p.project_code, p.title, p.status, p.progress, p.priority, p.deadline, pa.allocated_pct, pa.role_in_project
           FROM project_assignments pa JOIN projects p ON p.id = pa.project_id
           WHERE pa.developer_id = ? AND pa.is_active = 1 ORDER BY p.deadline ASC LIMIT 6`, [dev.id]),
    query(`SELECT t.*, p.project_code FROM project_tasks t JOIN projects p ON p.id = t.project_id
           WHERE t.assignee_id = ? AND t.status <> 'done' ORDER BY t.due_date ASC LIMIT 8`, [dev.id]),
    query(`SELECT u.*, p.project_code FROM project_updates u JOIN projects p ON p.id = u.project_id
           WHERE p.id IN (SELECT project_id FROM project_assignments WHERE developer_id = ? AND is_active = 1)
           ORDER BY u.created_at DESC LIMIT 6`, [dev.id]),
  ]);

  ok(res, {
    kpi: { projects: projects[0].c, openTasks: openTasks[0].c, doneTasks: doneTasks[0].c, hours: hours[0].h },
    projects: myProjects, tasks: myTasks, recentUpdates,
  });
});

export const overview = asyncHandler(async (_req, res) => {
  const [kpi] = await query('SELECT * FROM vw_kpi_overview');
  ok(res, { kpi });
});
