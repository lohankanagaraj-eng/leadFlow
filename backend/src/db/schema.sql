-- ============================================================
-- LeadFlow Enterprise CRM · MySQL 8 Schema
-- ============================================================
DROP DATABASE IF EXISTS leadflow;
CREATE DATABASE leadflow CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE leadflow;

-- ------------------------------------------------------------
-- 1. roles_permissions
-- ------------------------------------------------------------
CREATE TABLE roles_permissions (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  role          ENUM('admin','employee','developer') NOT NULL,
  module        VARCHAR(64)  NOT NULL,
  permission    ENUM('read','create','update','delete','manage') NOT NULL,
  allowed       TINYINT(1)   NOT NULL DEFAULT 1,
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_role_module_perm (role, module, permission)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 2. employees  (users of the system, all roles)
-- ------------------------------------------------------------
CREATE TABLE employees (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  employee_code  VARCHAR(20)  NOT NULL UNIQUE,
  name           VARCHAR(120) NOT NULL,
  email          VARCHAR(160) NOT NULL UNIQUE,
  password_hash  VARCHAR(255) NOT NULL,
  phone          VARCHAR(20)  NULL,
  role           ENUM('admin','employee','developer') NOT NULL DEFAULT 'employee',
  designation    VARCHAR(80)  NULL,
  department      VARCHAR(80) NULL,
  avatar_url     VARCHAR(500) NULL,
  salary         DECIMAL(12,2) NULL,
  hire_date      DATE NULL,
  is_active      TINYINT(1)   NOT NULL DEFAULT 1,
  last_login_at  DATETIME     NULL,
  created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_emp_role (role),
  INDEX idx_emp_active (is_active)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 3. developers  (profile extension of employees with role=developer)
-- ------------------------------------------------------------
CREATE TABLE developers (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  employee_id       INT NOT NULL UNIQUE,
  skills            JSON NULL,
  experience_years  TINYINT NOT NULL DEFAULT 0,
  availability      ENUM('available','busy','on_leave','offline') NOT NULL DEFAULT 'available',
  capacity_hours    DECIMAL(5,2) NOT NULL DEFAULT 40.00,
  hourly_rate       DECIMAL(10,2) NULL,
  bio               TEXT NULL,
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_dev_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 4. companies
-- ------------------------------------------------------------
CREATE TABLE companies (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  company_code   VARCHAR(20) NOT NULL UNIQUE,
  name           VARCHAR(160) NOT NULL,
  industry       VARCHAR(80) NULL,
  website        VARCHAR(200) NULL,
  email          VARCHAR(160) NULL,
  phone          VARCHAR(30) NULL,
  address        VARCHAR(255) NULL,
  city           VARCHAR(80) NULL,
  state          VARCHAR(80) NULL,
  country        VARCHAR(80) NULL,
  pincode        VARCHAR(12) NULL,
  gst_number     VARCHAR(30) NULL,
  segment        ENUM('lead','client','partner','vendor') NOT NULL DEFAULT 'lead',
  notes          TEXT NULL,
  created_by     INT NULL,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_company_segment (segment),
  CONSTRAINT fk_company_creator FOREIGN KEY (created_by) REFERENCES employees(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 5. leads
-- ------------------------------------------------------------
CREATE TABLE leads (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  lead_code       VARCHAR(20) NOT NULL UNIQUE,
  company_id      INT NULL,
  contact_name    VARCHAR(120) NOT NULL,
  email           VARCHAR(160) NULL,
  phone           VARCHAR(30) NULL,
  designation     VARCHAR(80) NULL,
  source          ENUM('website','referral','cold_call','social','seo','ads','email','other') NOT NULL DEFAULT 'website',
  service_interest JSON NULL,
  budget          DECIMAL(14,2) NULL,
  expected_value  DECIMAL(14,2) NULL,
  currency        VARCHAR(6) NOT NULL DEFAULT 'INR',
  status          ENUM('New','Assigned','Contacted','Follow Up','Qualified','Approved','Rejected','Lost') NOT NULL DEFAULT 'New',
  priority        ENUM('Low','Medium','High','Urgent') NOT NULL DEFAULT 'Medium',
  requirement     TEXT NULL,
  website_url     VARCHAR(255) NULL,
  notes           TEXT NULL,
  created_by      INT NULL,
  approved_at     DATETIME NULL,
  approved_by     INT NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_lead_status (status),
  INDEX idx_lead_priority (priority),
  INDEX idx_lead_created (created_at),
  CONSTRAINT fk_lead_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL,
  CONSTRAINT fk_lead_creator FOREIGN KEY (created_by) REFERENCES employees(id) ON DELETE SET NULL,
  CONSTRAINT fk_lead_approver FOREIGN KEY (approved_by) REFERENCES employees(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 6. lead_assignments
-- ------------------------------------------------------------
CREATE TABLE lead_assignments (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  lead_id      INT NOT NULL,
  employee_id  INT NOT NULL,
  assigned_by  INT NULL,
  assigned_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  released_at  DATETIME NULL,
  is_active    TINYINT(1) NOT NULL DEFAULT 1,
  note         VARCHAR(255) NULL,
  INDEX idx_la_lead (lead_id),
  INDEX idx_la_employee (employee_id),
  CONSTRAINT fk_la_lead FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
  CONSTRAINT fk_la_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  CONSTRAINT fk_la_by FOREIGN KEY (assigned_by) REFERENCES employees(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 7. call_logs
-- ------------------------------------------------------------
CREATE TABLE call_logs (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  lead_id       INT NOT NULL,
  employee_id   INT NOT NULL,
  direction     ENUM('outbound','inbound') NOT NULL DEFAULT 'outbound',
  call_status   ENUM('connected','no_answer','busy','voicemail','failed') NOT NULL DEFAULT 'connected',
  started_at    DATETIME NOT NULL,
  duration_sec  INT NOT NULL DEFAULT 0,
  summary       TEXT NULL,
  outcome       VARCHAR(120) NULL,
  next_step     VARCHAR(255) NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_call_lead (lead_id),
  INDEX idx_call_employee (employee_id),
  INDEX idx_call_started (started_at),
  CONSTRAINT fk_call_lead FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
  CONSTRAINT fk_call_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 8. followups
-- ------------------------------------------------------------
CREATE TABLE followups (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  lead_id       INT NOT NULL,
  owner_id      INT NOT NULL,
  due_at        DATETIME NOT NULL,
  type          ENUM('call','email','meeting','demo','proposal','other') NOT NULL DEFAULT 'call',
  subject       VARCHAR(200) NOT NULL,
  notes         TEXT NULL,
  status        ENUM('pending','done','cancelled','overdue') NOT NULL DEFAULT 'pending',
  completed_at  DATETIME NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_fu_due (due_at),
  INDEX idx_fu_status (status),
  CONSTRAINT fk_fu_lead FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
  CONSTRAINT fk_fu_owner FOREIGN KEY (owner_id) REFERENCES employees(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 9. projects  (auto-created from approved leads)
-- ------------------------------------------------------------
CREATE TABLE projects (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  project_code    VARCHAR(24) NOT NULL UNIQUE,
  lead_id         INT NULL,
  company_id      INT NULL,
  title           VARCHAR(200) NOT NULL,
  description     TEXT NULL,
  service_type    VARCHAR(120) NULL,
  status          ENUM('Pending','Requirement Gathering','UI/UX Design','Development','Testing','QA','Client Review','Deployment','Maintenance','Completed') NOT NULL DEFAULT 'Pending',
  priority        ENUM('Low','Medium','High','Urgent') NOT NULL DEFAULT 'Medium',
  progress        TINYINT NOT NULL DEFAULT 0,
  budget          DECIMAL(14,2) NULL,
  paid_amount     DECIMAL(14,2) NOT NULL DEFAULT 0,
  payment_status  ENUM('Unpaid','Partial','Paid','Refunded') NOT NULL DEFAULT 'Unpaid',
  start_date      DATE NULL,
  end_date        DATE NULL,
  deadline        DATE NULL,
  created_by      INT NULL,
  started_at      DATETIME NULL,
  completed_at    DATETIME NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_proj_status (status),
  INDEX idx_proj_payment (payment_status),
  CONSTRAINT fk_proj_lead FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL,
  CONSTRAINT fk_proj_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL,
  CONSTRAINT fk_proj_creator FOREIGN KEY (created_by) REFERENCES employees(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 10. project_assignments (multiple developers per project)
-- ------------------------------------------------------------
CREATE TABLE project_assignments (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  project_id    INT NOT NULL,
  developer_id  INT NOT NULL,
  role_in_project VARCHAR(80) NULL,
  assigned_by   INT NULL,
  allocated_pct TINYINT NOT NULL DEFAULT 100,
  assigned_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  released_at   DATETIME NULL,
  is_active     TINYINT(1) NOT NULL DEFAULT 1,
  UNIQUE KEY uq_proj_dev (project_id, developer_id),
  INDEX idx_pa_dev (developer_id),
  CONSTRAINT fk_pa_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_pa_dev FOREIGN KEY (developer_id) REFERENCES developers(id) ON DELETE CASCADE,
  CONSTRAINT fk_pa_by FOREIGN KEY (assigned_by) REFERENCES employees(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 11. project_tasks
-- ------------------------------------------------------------
CREATE TABLE project_tasks (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  project_id    INT NOT NULL,
  title         VARCHAR(200) NOT NULL,
  description   TEXT NULL,
  stage         ENUM('Requirement Gathering','UI/UX Design','Development','Testing','QA','Client Review','Deployment','Maintenance') NOT NULL DEFAULT 'Development',
  assignee_id   INT NULL,
  status        ENUM('todo','in_progress','review','blocked','done') NOT NULL DEFAULT 'todo',
  priority      ENUM('Low','Medium','High','Urgent') NOT NULL DEFAULT 'Medium',
  estimate_hrs  DECIMAL(6,2) NULL,
  logged_hrs    DECIMAL(6,2) NOT NULL DEFAULT 0,
  due_date      DATE NULL,
  start_date    DATE NULL,
  completed_at  DATETIME NULL,
  created_by    INT NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_task_project (project_id),
  INDEX idx_task_status (status),
  CONSTRAINT fk_task_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_task_assignee FOREIGN KEY (assignee_id) REFERENCES developers(id) ON DELETE SET NULL,
  CONSTRAINT fk_task_creator FOREIGN KEY (created_by) REFERENCES employees(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 12. project_updates (progress notes / comments)
-- ------------------------------------------------------------
CREATE TABLE project_updates (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  project_id  INT NOT NULL,
  author_id   INT NOT NULL,
  status_from VARCHAR(40) NULL,
  status_to   VARCHAR(40) NULL,
  progress    TINYINT NULL,
  comment     TEXT NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_pu_project (project_id),
  CONSTRAINT fk_pu_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_pu_author FOREIGN KEY (author_id) REFERENCES employees(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 13. project_documents
-- ------------------------------------------------------------
CREATE TABLE project_documents (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  project_id     INT NOT NULL,
  uploaded_by    INT NOT NULL,
  file_name      VARCHAR(255) NOT NULL,
  original_name  VARCHAR(255) NOT NULL,
  mime_type      VARCHAR(120) NULL,
  size_bytes     INT NOT NULL DEFAULT 0,
  file_path      VARCHAR(500) NOT NULL,
  category       ENUM('requirement','design','invoice','source','qa','other') NOT NULL DEFAULT 'other',
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_doc_project (project_id),
  CONSTRAINT fk_doc_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_doc_uploader FOREIGN KEY (uploaded_by) REFERENCES employees(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 14. project_status_history
-- ------------------------------------------------------------
CREATE TABLE project_status_history (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  project_id  INT NOT NULL,
  from_status VARCHAR(40) NULL,
  to_status   VARCHAR(40) NOT NULL,
  changed_by  INT NULL,
  remark      VARCHAR(255) NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_psh_project (project_id),
  CONSTRAINT fk_psh_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_psh_by FOREIGN KEY (changed_by) REFERENCES employees(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 15. notifications
-- ------------------------------------------------------------
CREATE TABLE notifications (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  title       VARCHAR(180) NOT NULL,
  body        VARCHAR(500) NULL,
  type        ENUM('info','success','warning','assignment','followup','project','system') NOT NULL DEFAULT 'info',
  link        VARCHAR(255) NULL,
  is_read     TINYINT(1) NOT NULL DEFAULT 0,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_notif_user_read (user_id, is_read),
  CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES employees(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 16. activity_logs (audit trail)
-- ------------------------------------------------------------
CREATE TABLE activity_logs (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NULL,
  actor_name  VARCHAR(120) NULL,
  action      VARCHAR(60) NOT NULL,
  entity      VARCHAR(60) NOT NULL,
  entity_id   VARCHAR(64) NULL,
  summary     VARCHAR(255) NULL,
  metadata    JSON NULL,
  ip_address  VARCHAR(64) NULL,
  user_agent  VARCHAR(255) NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_al_user (user_id),
  INDEX idx_al_entity (entity, entity_id),
  INDEX idx_al_created (created_at),
  CONSTRAINT fk_al_user FOREIGN KEY (user_id) REFERENCES employees(id) ON DELETE SET NULL
) ENGINE=InnoDB;
