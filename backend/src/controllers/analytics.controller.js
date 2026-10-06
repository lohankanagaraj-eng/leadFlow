import { query, one } from '../config/db.js';
import { ApiError, asyncHandler, ok } from '../utils/api.js';

/**
 * Power BI data endpoints.
 * Each route returns the exact aggregate shape a Power BI report page expects.
 * The SQL views backing them live in src/db/powerbi_views.sql.
 */

export const leadAnalytics = asyncHandler(async (req, res) => {
  const range = validRange(req.query.range);
  const [byStatus, bySource, byMonth, byPriority, funnel, byOwner] = await Promise.all([
    query(`SELECT status, COUNT(*) AS leads, COALESCE(SUM(expected_value),0) AS value
           FROM leads WHERE created_at >= ? GROUP BY status`, [range]),
    query(`SELECT source, COUNT(*) AS leads, COALESCE(SUM(expected_value),0) AS value
           FROM leads WHERE created_at >= ? GROUP BY source ORDER BY leads DESC`, [range]),
    query(`SELECT DATE_FORMAT(created_at, '%Y-%m') AS month, COUNT(*) AS leads,
                  SUM(status='Approved') AS converted, COALESCE(SUM(expected_value),0) AS value
           FROM leads WHERE created_at >= ? GROUP BY month ORDER BY month`, [range]),
    query(`SELECT priority, COUNT(*) AS leads FROM leads WHERE created_at >= ? GROUP BY priority`, [range]),
    query(`SELECT 'Created' AS stage, COUNT(*) AS count FROM leads WHERE created_at >= ?
           UNION ALL SELECT 'Assigned', COUNT(*) FROM lead_assignments la JOIN leads l ON l.id=la.lead_id WHERE l.created_at >= ?
           UNION ALL SELECT 'Contacted', COUNT(*) FROM leads WHERE status NOT IN ('New','Assigned') AND created_at >= ?
           UNION ALL SELECT 'Qualified', COUNT(*) FROM leads WHERE status IN ('Qualified','Approved') AND created_at >= ?
           UNION ALL SELECT 'Approved', COUNT(*) FROM leads WHERE status='Approved' AND created_at >= ?`,
      [range, range, range, range, range]),
    query(`SELECT e.name, COUNT(*) AS leads, SUM(l.status='Approved') AS converted
           FROM lead_assignments la JOIN leads l ON l.id=la.lead_id JOIN employees e ON e.id=la.employee_id
           WHERE l.created_at >= ? GROUP BY e.id ORDER BY converted DESC`, [range]),
  ]);
  const [totals] = await query(
    `SELECT COUNT(*) AS total, SUM(status='Approved') AS approved,
            SUM(status IN ('New','Assigned','Contacted','Follow Up','Qualified')) AS open,
            COALESCE(SUM(expected_value),0) AS pipeline_value,
            COALESCE(SUM(CASE WHEN status='Approved' THEN expected_value END),0) AS won_value,
            CASE WHEN COUNT(*) = 0 THEN 0 ELSE ROUND(SUM(status='Approved')/COUNT(*)*100,1) END AS conversion_pct
     FROM leads WHERE created_at >= ?`, [range]);
  ok(res, { byStatus, bySource, byMonth, byPriority, funnel, byOwner, totals });
});

export const employeeAnalytics = asyncHandler(async (_req, res) => {
  const [performance, leadsByDept, callProductivity, conversionTrend] = await Promise.all([
    query(`SELECT * FROM vw_employee_performance ORDER BY revenue_booked DESC`),
    query(`SELECT COALESCE(e.department, 'Unassigned') AS department,
                  COUNT(DISTINCT la.lead_id) AS leads, SUM(l.status='Approved') AS conversions
           FROM employees e
           LEFT JOIN lead_assignments la ON la.employee_id = e.id AND la.is_active = 1
           LEFT JOIN leads l ON l.id = la.lead_id
           GROUP BY department ORDER BY leads DESC`),
    query(`SELECT e.name, COUNT(cl.id) AS calls,
                  ROUND(COALESCE(SUM(cl.duration_sec),0)/3600, 1) AS hours,
                  SUM(cl.call_status='connected') AS connected
           FROM employees e LEFT JOIN call_logs cl ON cl.employee_id = e.id
           GROUP BY e.id HAVING calls > 0 ORDER BY calls DESC`),
    query(`SELECT DATE_FORMAT(l.approved_at, '%Y-%m') AS month, COUNT(*) AS conversions,
                  COALESCE(SUM(l.expected_value),0) AS value
           FROM leads l WHERE l.approved_at IS NOT NULL GROUP BY month ORDER BY month`),
  ]);
  ok(res, { performance, leadsByDept, callProductivity, conversionTrend });
});

export const callAnalytics = asyncHandler(async (req, res) => {
  const range = validRange(req.query.range);
  const [byStatus, byDirection, byHour, byMonth, byOutcome, avgDuration] = await Promise.all([
    query(`SELECT call_status, COUNT(*) AS count FROM call_logs WHERE started_at >= ? GROUP BY call_status`, [range]),
    query(`SELECT direction, COUNT(*) AS count FROM call_logs WHERE started_at >= ? GROUP BY direction`, [range]),
    query(`SELECT HOUR(started_at) AS hour, COUNT(*) AS count FROM call_logs WHERE started_at >= ? GROUP BY hour ORDER BY hour`, [range]),
    query(`SELECT DATE_FORMAT(started_at, '%Y-%m') AS month, COUNT(*) AS calls,
                  ROUND(AVG(duration_sec),0) AS avg_seconds
           FROM call_logs WHERE started_at >= ? GROUP BY month ORDER BY month`, [range]),
    query(`SELECT COALESCE(outcome,'Unspecified') AS outcome, COUNT(*) AS count
           FROM call_logs WHERE started_at >= ? GROUP BY outcome ORDER BY count DESC`, [range]),
    query(`SELECT COUNT(*) AS total, ROUND(AVG(duration_sec),0) AS avg_seconds,
                  SUM(call_status='connected') AS connected,
                  ROUND(SUM(call_status='connected')/NULLIF(COUNT(*),0)*100,1) AS connect_rate
           FROM call_logs WHERE started_at >= ?`, [range]),
  ]);
  ok(res, { byStatus, byDirection, byHour, byMonth, byOutcome, summary: avgDuration[0] });
});

export const projectAnalytics = asyncHandler(async (req, res) => {
  const range = validRange(req.query.range);
  const [byStatus, byMonth, byPriority, delivery, workload, progressBuckets] = await Promise.all([
    query(`SELECT status, COUNT(*) AS count, ROUND(AVG(progress),1) AS avg_progress FROM projects GROUP BY status`),
    query(`SELECT DATE_FORMAT(created_at, '%Y-%m') AS month, COUNT(*) AS projects, COALESCE(SUM(budget),0) AS budget
           FROM projects WHERE created_at >= ? GROUP BY month ORDER BY month`, [range]),
    query(`SELECT priority, COUNT(*) AS count FROM projects GROUP BY priority`),
    query(`SELECT COUNT(*) AS total, SUM(status='Completed') AS completed,
                  SUM(completed_at IS NOT NULL AND deadline IS NOT NULL AND completed_at <= deadline) AS on_time,
                  ROUND(AVG(CASE WHEN completed_at IS NOT NULL
                    THEN DATEDIFF(completed_at, start_date) END),1) AS avg_duration_days
           FROM projects`),
    query(`SELECT e.name, COUNT(DISTINCT pa.project_id) AS projects,
                  SUM(t.logged_hrs) AS logged_hours
           FROM developers d JOIN employees e ON e.id = d.employee_id
           LEFT JOIN project_assignments pa ON pa.developer_id = d.id AND pa.is_active = 1
           LEFT JOIN project_tasks t ON t.assignee_id = d.id
           GROUP BY d.id ORDER BY projects DESC`),
    query(`SELECT CASE WHEN progress < 25 THEN '0-24%' WHEN progress < 50 THEN '25-49%'
                    WHEN progress < 75 THEN '50-74%' ELSE '75-100%' END AS bucket,
                  COUNT(*) AS count FROM projects GROUP BY bucket`),
  ]);
  ok(res, { byStatus, byMonth, byPriority, delivery, workload, progressBuckets });
});

export const revenueAnalytics = asyncHandler(async (req, res) => {
  const range = validRange(req.query.range);
  const [byMonth, byService, byPayment, byIndustry, outstanding] = await Promise.all([
    query(`SELECT DATE_FORMAT(created_at, '%Y-%m') AS month,
                  COALESCE(SUM(budget),0) AS booked,
                  COALESCE(SUM(paid_amount),0) AS collected,
                  COALESCE(SUM(budget - paid_amount),0) AS outstanding
           FROM projects WHERE created_at >= ? GROUP BY month ORDER BY month`, [range]),
    query(`SELECT COALESCE(service_type,'Unspecified') AS service, COUNT(*) AS projects,
                  COALESCE(SUM(budget),0) AS booked, COALESCE(SUM(paid_amount),0) AS collected
           FROM projects GROUP BY service_type ORDER BY booked DESC`),
    query('SELECT payment_status, COUNT(*) AS count, COALESCE(SUM(budget),0) AS budget, COALESCE(SUM(paid_amount),0) AS collected FROM projects GROUP BY payment_status'),
    query(`SELECT COALESCE(c.industry,'Unknown') AS industry, COUNT(*) AS projects, COALESCE(SUM(p.budget),0) AS budget
           FROM projects p LEFT JOIN companies c ON c.id = p.company_id GROUP BY industry ORDER BY budget DESC`),
    query(`SELECT project_code, title, budget, paid_amount, (budget - paid_amount) AS due, deadline
           FROM projects WHERE budget > paid_amount ORDER BY (budget - paid_amount) DESC LIMIT 20`),
  ]);
  const [summary] = await query(
    `SELECT COALESCE(SUM(budget),0) AS booked, COALESCE(SUM(paid_amount),0) AS collected,
            COALESCE(SUM(budget - paid_amount),0) AS outstanding,
            CASE WHEN COALESCE(SUM(budget),0)=0 THEN 0
                 ELSE ROUND(SUM(paid_amount)/SUM(budget)*100,1) END AS collection_pct
     FROM projects WHERE created_at >= ?`, [range]);
  ok(res, { byMonth, byService, byPayment, byIndustry, outstanding, summary });
});

export const resourceAnalytics = asyncHandler(async (_req, res) => {
  const [utilization, availability, allocation, skills] = await Promise.all([
    query('SELECT * FROM vw_resource_utilization ORDER BY allocated_pct DESC'),
    query(`SELECT availability, COUNT(*) AS count FROM developers GROUP BY availability`),
    query(`SELECT e.name, p.project_code, p.title, pa.allocated_pct, p.status
           FROM project_assignments pa
           JOIN developers d ON d.id = pa.developer_id
           JOIN employees e ON e.id = d.employee_id
           JOIN projects p ON p.id = pa.project_id
           WHERE pa.is_active = 1 ORDER BY e.name`),
    query(`SELECT jt.value AS skill, COUNT(*) AS developers
           FROM developers, JSON_TABLE(skills, '$[*]' COLUMNS (value VARCHAR(60) PATH '$')) jt
           GROUP BY jt.value ORDER BY developers DESC`),
  ]);
  ok(res, { utilization, availability, allocation, skills });
});

/** Power BI connection metadata for the in-app embed settings page. */
export const powerBiConfig = asyncHandler(async (_req, res) => {
  const views = [
    { name: 'vw_lead_analytics', description: 'Lead funnel, source and conversion metrics' },
    { name: 'vw_employee_performance', description: 'Per-employee leads, calls, follow-ups, revenue' },
    { name: 'vw_call_analytics', description: 'Call volume, connect rate, timing' },
    { name: 'vw_project_analytics', description: 'Project status, delivery, task rollups' },
    { name: 'vw_revenue_analytics', description: 'Booked vs collected revenue' },
    { name: 'vw_resource_utilization', description: 'Developer capacity and allocation' },
    { name: 'vw_kpi_overview', description: 'Single-row executive KPI card' },
  ];
  ok(res, {
    views,
    connection: {
      server: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'leadflow',
      mode: 'DirectQuery / Import (MySQL 8 connector)',
    },
    datasets: ['Lead Analytics','Employee Analytics','Call Analytics','Project Analytics','Revenue Analytics','Resource Utilization'],
  });
});

function validRange(range) {
  const days = Number(range);
  const d = Number.isFinite(days) && days > 0 ? Math.min(days, 1500) : 365;
  return new Date(Date.now() - d * 86400000).toISOString().slice(0, 19).replace('T', ' ');
}
