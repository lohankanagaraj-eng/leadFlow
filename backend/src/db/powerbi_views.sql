-- ============================================================
-- LeadFlow · Power BI semantic views
-- Connect Power BI > Get Data > MySQL Database > run these views
-- ============================================================
USE leadflow;

CREATE OR REPLACE VIEW vw_lead_analytics AS
SELECT
  l.id                 AS lead_id,
  l.lead_code,
  l.status,
  l.priority,
  l.source,
  l.expected_value,
  l.budget,
  DATE(l.created_at)   AS created_date,
  DATE_FORMAT(l.created_at, '%Y-%m') AS created_month,
  DATE_FORMAT(l.created_at, '%Y')    AS created_year,
  c.name               AS company_name,
  c.industry,
  e.name               AS owner_name,
  e.department         AS owner_department,
  l.approved_at,
  CASE WHEN l.status = 'Approved' THEN 1 ELSE 0 END AS is_converted
FROM leads l
LEFT JOIN companies c ON c.id = l.company_id
LEFT JOIN lead_assignments la ON la.lead_id = l.id AND la.is_active = 1
LEFT JOIN employees e  ON e.id = la.employee_id;

CREATE OR REPLACE VIEW vw_employee_performance AS
SELECT
  e.id                 AS employee_id,
  e.employee_code,
  e.name,
  e.role,
  e.department,
  e.designation,
  COUNT(DISTINCT l.id) AS leads_owned,
  SUM(CASE WHEN l.status = 'Approved' THEN 1 ELSE 0 END) AS leads_converted,
  COUNT(DISTINCT cl.id) AS calls_made,
  COALESCE(SUM(cl.duration_sec), 0) / 3600.0 AS call_hours,
  COUNT(DISTINCT f.id) AS followups_total,
  SUM(CASE WHEN f.status = 'done' THEN 1 ELSE 0 END) AS followups_done,
  COALESCE(SUM(CASE WHEN l.status='Approved' THEN l.expected_value END), 0) AS revenue_booked
FROM employees e
LEFT JOIN lead_assignments la ON la.employee_id = e.id AND la.is_active = 1
LEFT JOIN leads l   ON l.id = la.lead_id
LEFT JOIN call_logs cl ON cl.employee_id = e.id
LEFT JOIN followups f  ON f.owner_id = e.id
GROUP BY e.id, e.employee_code, e.name, e.role, e.department, e.designation;

CREATE OR REPLACE VIEW vw_call_analytics AS
SELECT
  cl.id,
  cl.direction,
  cl.call_status,
  cl.duration_sec,
  DATE(cl.started_at) AS call_date,
  DATE_FORMAT(cl.started_at, '%Y-%m') AS call_month,
  HOUR(cl.started_at) AS call_hour,
  l.lead_code,
  l.status AS lead_status,
  e.name AS employee_name,
  e.department
FROM call_logs cl
JOIN leads l ON l.id = cl.lead_id
JOIN employees e ON e.id = cl.employee_id;

CREATE OR REPLACE VIEW vw_project_analytics AS
SELECT
  p.id                AS project_id,
  p.project_code,
  p.title,
  p.status,
  p.priority,
  p.progress,
  p.payment_status,
  p.budget,
  p.paid_amount,
  DATE(p.created_at)  AS created_date,
  DATE_FORMAT(p.created_at, '%Y-%m') AS created_month,
  p.start_date,
  p.deadline,
  p.completed_at,
  CASE WHEN p.completed_at IS NOT NULL AND p.deadline IS NOT NULL
        AND p.completed_at <= p.deadline THEN 1 ELSE 0 END AS on_time,
  DATEDIFF(COALESCE(p.completed_at, CURDATE()), p.start_date) AS duration_days,
  c.name AS company_name,
  c.industry,
  l.lead_code AS source_lead,
  (SELECT COUNT(*) FROM project_tasks t WHERE t.project_id = p.id) AS total_tasks,
  (SELECT COUNT(*) FROM project_tasks t WHERE t.project_id = p.id AND t.status='done') AS done_tasks,
  (SELECT COUNT(DISTINCT pa.developer_id) FROM project_assignments pa
    WHERE pa.project_id = p.id AND pa.is_active = 1) AS team_size
FROM projects p
LEFT JOIN companies c ON c.id = p.company_id
LEFT JOIN leads l ON l.id = p.lead_id;

CREATE OR REPLACE VIEW vw_revenue_analytics AS
SELECT
  p.id AS project_id,
  p.project_code,
  p.title,
  p.payment_status,
  p.budget,
  p.paid_amount,
  (p.budget - p.paid_amount) AS outstanding,
  DATE(p.created_at) AS created_date,
  DATE_FORMAT(p.created_at, '%Y-%m') AS created_month,
  DATE_FORMAT(p.created_at, '%Y') AS created_year,
  c.name AS company_name,
  c.industry
FROM projects p
LEFT JOIN companies c ON c.id = p.company_id;

CREATE OR REPLACE VIEW vw_resource_utilization AS
SELECT
  d.id AS developer_id,
  e.employee_code,
  e.name,
  d.availability,
  d.capacity_hours,
  JSON_LENGTH(COALESCE(d.skills, '[]')) AS skill_count,
  COUNT(DISTINCT CASE WHEN pa.is_active = 1 THEN pa.project_id END) AS active_projects,
  COALESCE(SUM(CASE WHEN pa.is_active = 1 THEN pa.allocated_pct END), 0) AS allocated_pct,
  GREATEST(0, d.capacity_hours - COALESCE(SUM(CASE WHEN pa.is_active = 1
        THEN d.capacity_hours * pa.allocated_pct / 100 END), 0)) AS free_hours,
  (SELECT COUNT(*) FROM project_tasks t
     JOIN project_assignments p2 ON p2.project_id = t.project_id
    WHERE p2.developer_id = d.id AND p2.is_active = 1
      AND t.status IN ('todo','in_progress','review')) AS open_tasks,
  (SELECT COALESCE(SUM(t.logged_hrs),0) FROM project_tasks t
     JOIN project_assignments p2 ON p2.project_id = t.project_id
    WHERE p2.developer_id = d.id) AS logged_hours
FROM developers d
JOIN employees e ON e.id = d.employee_id
LEFT JOIN project_assignments pa ON pa.developer_id = d.id AND pa.is_active = 1
GROUP BY d.id, e.employee_code, e.name, d.availability, d.capacity_hours, d.skills;

CREATE OR REPLACE VIEW vw_kpi_overview AS
SELECT
  (SELECT COUNT(*) FROM leads) AS total_leads,
  (SELECT COUNT(*) FROM leads WHERE status='Approved') AS converted_leads,
  (SELECT COUNT(*) FROM companies WHERE segment='client') AS total_clients,
  (SELECT COUNT(*) FROM projects) AS total_projects,
  (SELECT COUNT(*) FROM projects WHERE status <> 'Completed') AS active_projects,
  (SELECT COUNT(*) FROM projects WHERE status = 'Completed') AS completed_projects,
  (SELECT COALESCE(SUM(paid_amount),0) FROM projects) AS revenue_collected,
  (SELECT COALESCE(SUM(budget),0) FROM projects) AS revenue_booked,
  (SELECT COALESCE(SUM(budget - paid_amount),0) FROM projects) AS outstanding,
  (SELECT COUNT(*) FROM employees WHERE is_active=1) AS active_employees,
  (SELECT COUNT(*) FROM developers WHERE availability='available') AS available_developers,
  (SELECT COUNT(*) FROM followups WHERE status='pending' AND due_at < NOW()) AS overdue_followups;
