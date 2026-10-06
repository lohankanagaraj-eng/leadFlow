-- ============================================================
-- LeadFlow · Seed data (roles, demo users, sample records)
-- Demo password for every seeded user: Admin@123 / Emp@123 / Dev@123
-- ============================================================
USE leadflow;

-- ---------- permissions ----------
INSERT INTO roles_permissions (role, module, permission, allowed) VALUES
('admin','dashboard','read',1),('admin','companies','manage',1),('admin','leads','manage',1),
('admin','calls','manage',1),('admin','followups','manage',1),('admin','employees','manage',1),
('admin','developers','manage',1),('admin','projects','manage',1),('admin','tasks','manage',1),
('admin','notifications','read',1),('admin','activity','read',1),('admin','analytics','read',1),
('employee','dashboard','read',1),('employee','companies','create',1),('employee','companies','read',1),
('employee','companies','update',1),('employee','leads','create',1),('employee','leads','read',1),
('employee','leads','update',1),('employee','calls','create',1),('employee','calls','read',1),
('employee','followups','create',1),('employee','followups','read',1),('employee','followups','update',1),
('employee','projects','read',1),('employee','notifications','read',1),('employee','activity','read',1),
('developer','dashboard','read',1),('developer','projects','read',1),('developer','projects','update',1),
('developer','tasks','create',1),('developer','tasks','read',1),('developer','tasks','update',1),
('developer','notifications','read',1);

-- ---------- users (bcrypt hashes generated for demo passwords) ----------
INSERT INTO employees
(employee_code, name, email, password_hash, phone, role, designation, department, hire_date, is_active) VALUES
('EMP-0001','System Admin','admin@leadflow.io','$2b$10$0kE0S0yY7v0jH6l0m4t6Y.1z6bJ4lB1l5hV3qW7yY8xM2nQ4rT6sC','+91 90000 00001','admin','Chief Administrator','Administration','2023-01-01',1),
('EMP-0002','Priya Sharma','priya@leadflow.io','$2b$10$0kE0S0yY7v0jH6l0m4t6Y.1z6bJ4lB1l5hV3qW7yY8xM2nQ4rT6sC','+91 90000 00002','employee','Sales Manager','Sales','2023-03-15',1),
('EMP-0003','Rahul Verma','rahul@leadflow.io','$2b$10$0kE0S0yY7v0jH6l0m4t6Y.1z6bJ4lB1l5hV3qW7yY8xM2nQ4rT6sC','+91 90000 00003','employee','SEO Specialist','Digital Marketing','2024-01-10',1),
('EMP-0004','Arun Kumar','arun@leadflow.io','$2b$10$0kE0S0yY7v0jH6l0m4t6Y.1z6bJ4lB1l5hV3qW7yY8xM2nQ4rT6sC','+91 90000 00004','developer','Senior Full-Stack Developer','Engineering','2023-06-01',1),
('EMP-0005','Sneha Iyer','sneha@leadflow.io','$2b$10$0kE0S0yY7v0jH6l0m4t6Y.1z6bJ4lB1l5hV3qW7yY8xM2nQ4rT6sC','+91 90000 00005','developer','UI/UX Designer','Design','2024-02-20',1),
('EMP-0006','Vikram Singh','vikram@leadflow.io','$2b$10$0kE0S0yY7v0jH6l0m4t6Y.1z6bJ4lB1l5hV3qW7yY8xM2nQ4rT6sC','+91 90000 00006','developer','Mobile Developer','Engineering','2024-05-05',1),
('EMP-0007','Kavitha Nair','kavitha@leadflow.io','$2b$10$0kE0S0yY7v0jH6l0m4t6Y.1z6bJ4lB1l5hV3qW7yY8xM2nQ4rT6sC','+91 90000 00007','employee','Inside Sales Executive','Sales','2024-08-01',1),
('EMP-0008','Deepak Sharma','deepak@leadflow.io','$2b$10$0kE0S0yY7v0jH6l0m4t6Y.1z6bJ4lB1l5hV3qW7yY8xM2nQ4rT6sC','+91 90000 00008','employee','Account Manager','Client Success','2025-01-15',1);

-- ---------- developers ----------
INSERT INTO developers (employee_id, skills, experience_years, availability, capacity_hours, hourly_rate, bio) VALUES
(4,'["React","Node.js","MySQL","Express","TypeScript","AWS"]',7,'available',40,1200,'Lead engineer for web platforms and APIs.'),
(5,'["Figma","UI/UX","Tailwind","Illustration","Design Systems"]',5,'available',40,900,'Product designer focused on SaaS dashboards.'),
(6,'["React Native","Flutter","Android","iOS","Firebase"]',4,'busy',40,1000,'Cross-platform mobile specialist.');

-- ---------- companies ----------
INSERT INTO companies (company_code, name, industry, website, email, phone, city, country, segment, created_by) VALUES
('COMP-0001','Nova Retail Pvt Ltd','Retail','https://novaretail.example','hello@novaretail.example','+91 98111 22331','Mumbai','India','client',1),
('COMP-0002','Zenith Health','Healthcare','https://zenithhealth.example','info@zenithhealth.example','+91 98111 22332','Bengaluru','India','client',1),
('COMP-0003','BlueWave Logistics','Logistics','https://bluewave.example','ops@bluewave.example','+91 98111 22333','Chennai','India','lead',2);

-- ---------- leads ----------
INSERT INTO leads (lead_code, company_id, contact_name, email, phone, source, service_interest, budget, expected_value, status, priority, requirement, created_by) VALUES
('LEAD-0001',1,'Anil Mehta','anil@novaretail.example','+91 98222 11001','website','["Website Development","SEO"]',450000,450000,'Approved','High','E-commerce storefront with SEO optimisation.',2),
('LEAD-0002',2,'Dr. Kavita Rao','kavita@zenithhealth.example','+91 98222 11002','referral','["Mobile App Development"]',900000,900000,'Qualified','Urgent','Patient booking app for iOS + Android.',2),
('LEAD-0003',3,'Suresh Nair','suresh@bluewave.example','+91 98222 11003','cold_call','["Digital Marketing","SEO"]',250000,200000,'Contacted','Medium','Monthly SEO + performance marketing retainer.',3),
('LEAD-0004',NULL,'Meera Joshi','meera@freshbite.example','+91 98222 11004','social','["Software Development"]',NULL,320000,'New','Low','Custom POS software for restaurant chain.',2);

-- ---------- ~10 company leads (assigned for the "My Tasks → Company Leads" flow) ----------
INSERT INTO companies (company_code, name, industry, website, email, phone, address, city, state, country, segment, created_by) VALUES
('COMP-0004','GreenLeaf Organics','Food & Beverage','https://greenleaf.example','hello@greenleaf.example','+91 98410 40001','12, Anna Salai, Nungambakkam','Chennai','Tamil Nadu','India','lead',1),
('COMP-0005','SwiftCourier Express','Logistics','https://swiftcourier.example','ops@swiftcourier.example','+91 98420 40002','45, Race Course Road','Coimbatore','Tamil Nadu','India','lead',1),
('COMP-0006','BrightPath Academy','Education','https://brightpath.example','admin@brightpath.example','+91 98430 40003','9, Anna Nagar','Madurai','Tamil Nadu','India','lead',1),
('COMP-0007','SilverLine Jewels','Jewellery','https://silverline.example','care@silverline.example','+91 98440 40004','22, Big Bazaar Street','Coimbatore','Tamil Nadu','India','lead',1),
('COMP-0008','TechNest Solutions','IT Services','https://technest.example','info@technest.example','+91 98450 40005','66, MG Road, Indiranagar','Bengaluru','Karnataka','India','lead',1),
('COMP-0009','UrbanNest Builders','Real Estate','https://urbannest.example','sales@urbannest.example','+91 98460 40006','3, Banjara Hills Road','Hyderabad','Telangana','India','lead',1),
('COMP-0010','KisanFresh Agro','Agriculture','https://kisanfresh.example','contact@kisanfresh.example','+91 98470 40007','18, Salem Main Road','Salem','Tamil Nadu','India','lead',1),
('COMP-0011','MedPlus Clinics','Healthcare','https://medplusclinics.example','hello@medplusclinics.example','+91 98480 40008','7, Gandhi Nagar','Vellore','Tamil Nadu','India','lead',1),
('COMP-0012','Horizon Travels','Travel & Tourism','https://horizontravels.example','bookings@horizontravels.example','+91 98490 40009','29, Marine Drive','Kochi','Kerala','India','lead',1),
('COMP-0013','StyleHub Fashion','Retail','https://stylehub.example','support@stylehub.example','+91 98500 40010','54, Thennur High Road','Tiruchirappalli','Tamil Nadu','India','lead',1);

INSERT INTO leads (lead_code, company_id, contact_name, email, phone, source, service_interest, budget, expected_value, status, priority, requirement, created_by) VALUES
('LEAD-0005',4,'Ramesh Kumar','ramesh@greenleaf.example','+91 98222 12001','referral','["Website Development","SEO"]',350000,300000,'New','Medium','Online ordering portal for the organic store.',1),
('LEAD-0006',5,'Abdul Latif','abdul@swiftcourier.example','+91 98222 12002','cold_call','["Software Development"]',500000,450000,'Assigned','High','Courier dispatch and tracking software.',1),
('LEAD-0007',6,'Meenakshi Sundaram','meena@brightpath.example','+91 98222 12003','website','["Website Development","Digital Marketing"]',200000,180000,'New','Medium','Admission portal with online fees.',1),
('LEAD-0008',7,'Lakshmi Narayanan','lakshmi@silverline.example','+91 98222 12004','social','["Website Development","SEO"]',275000,250000,'Assigned','Low','Jewellery catalogue with enquiry form.',1),
('LEAD-0009',8,'Naveen Raj','naveen@technest.example','+91 98222 12005','referral','["IT Services","Software Development"]',750000,700000,'New','High','Staff augmentation for fintech product.',1),
('LEAD-0010',9,'Pooja Reddy','pooja@urbannest.example','+91 98222 12006','website','["Digital Marketing","Website Development"]',400000,350000,'Contacted','Medium','Real-estate listing site with lead capture.',1),
('LEAD-0011',10,'Murugan C','murugan@kisanfresh.example','+91 98222 12007','cold_call','["Mobile App Development"]',320000,280000,'New','Medium','Farmer marketplace mobile app.',1),
('LEAD-0012',11,'Dr. Senthil','senthil@medplusclinics.example','+91 98222 12008','referral','["Website Development","SEO"]',260000,240000,'Assigned','Low','Multi-speciality clinic appointment site.',1),
('LEAD-0013',12,'Fathima Beevi','fathima@horizontravels.example','+91 98222 12009','social','["Digital Marketing","Website Development"]',380000,320000,'New','Medium','Tour package booking engine.',1),
('LEAD-0014',13,'Karthik Prabhu','karthik@stylehub.example','+91 98222 12010','website','["E-Commerce","Website Development"]',600000,550000,'Assigned','High','Fashion e-commerce with payment gateway.',1);

INSERT INTO lead_assignments (lead_id, employee_id, assigned_by) VALUES
(5,2,1),(6,3,1),(7,7,1),(8,8,1),
(9,2,1),(10,3,1),(11,7,1),(12,8,1),
(13,2,1),(14,3,1);

-- ---------- assignments / calls / followups ----------
INSERT INTO lead_assignments (lead_id, employee_id, assigned_by) VALUES (1,2,1),(2,2,1),(3,3,1),(4,3,1);

INSERT INTO call_logs (lead_id, employee_id, direction, call_status, started_at, duration_sec, summary, outcome) VALUES
(1,2,'outbound','connected',DATE_SUB(NOW(), INTERVAL 9 DAY),540,'Walked through scope and budget. Client keen on launch before festive season.','Interested'),
(1,2,'inbound','connected',DATE_SUB(NOW(), INTERVAL 4 DAY),300,'Shared commercial proposal and timeline.','Proposal Sent'),
(2,2,'outbound','connected',DATE_SUB(NOW(), INTERVAL 6 DAY),720,'Demo of similar healthcare app delivered.','Demo Done'),
(3,3,'outbound','no_answer',DATE_SUB(NOW(), INTERVAL 3 DAY),0,'No answer, retry scheduled.','No Answer'),
(4,3,'outbound','connected',DATE_SUB(NOW(), INTERVAL 1 DAY),420,'Discovery call on POS requirements.','Qualified');

INSERT INTO followups (lead_id, owner_id, due_at, type, subject, status) VALUES
(1,2,DATE_ADD(NOW(), INTERVAL 1 DAY),'meeting','Finalise SOW and payment schedule','pending'),
(2,2,DATE_ADD(NOW(), INTERVAL 2 DAY),'proposal','Send app development proposal','pending'),
(3,3,DATE_SUB(NOW(), INTERVAL 2 HOUR),'call','Retry SEO retainer call','pending'),
(4,3,DATE_ADD(NOW(), INTERVAL 4 DAY),'demo','POS walkthrough demo','pending');

-- ---------- project auto-created for approved lead 1 ----------
INSERT INTO projects (project_code, lead_id, company_id, title, description, service_type, status, priority, progress, budget, paid_amount, payment_status, start_date, deadline, created_by, started_at) VALUES
('PRJ-2026-0001',1,1,'Nova Retail E-commerce Platform','E-commerce storefront with SEO optimisation and analytics.','Website Development','Development', 'High',45,450000,180000,'Partial',DATE_SUB(CURDATE(), INTERVAL 20 DAY),DATE_ADD(CURDATE(), INTERVAL 40 DAY),1,DATE_SUB(NOW(), INTERVAL 20 DAY));

INSERT INTO project_assignments (project_id, developer_id, assigned_by, role_in_project, allocated_pct) VALUES
(1,1,1,'Tech Lead',70),(1,2,1,'UI Designer',40);

INSERT INTO project_tasks (project_id, title, stage, assignee_id, status, priority, estimate_hrs, logged_hrs, due_date, created_by) VALUES
(1,'Finalise product catalogue schema','Requirement Gathering',1,'done','High',16,18,DATE_SUB(CURDATE(), INTERVAL 12 DAY),1),
(1,'Homepage & PLP wireframes','UI/UX Design',2,'done','High',20,22,DATE_SUB(CURDATE(), INTERVAL 6 DAY),1),
(1,'Cart & checkout module','Development',1,'in_progress','Urgent',60,28,DATE_ADD(CURDATE(), INTERVAL 10 DAY),1),
(1,'Payment gateway integration','Development',1,'todo','High',24,0,DATE_ADD(CURDATE(), INTERVAL 15 DAY),1),
(1,'Responsive QA sweep','Testing',2,'todo','Medium',12,0,DATE_ADD(CURDATE(), INTERVAL 25 DAY),1);

INSERT INTO project_updates (project_id, author_id, status_from, status_to, progress, comment) VALUES
(1,1,NULL,'Pending',0,'Project auto-created from LEAD-0001.'),
(1,1,'Pending','Requirement Gathering',10,'Kickoff call completed, requirements signed off.'),
(1,1,'Requirement Gathering','UI/UX Design',25,'Wireframes approved by client.'),
(1,1,'UI/UX Design','Development',45,'Development sprint started.');

INSERT INTO project_status_history (project_id, from_status, to_status, changed_by, remark) VALUES
(1,NULL,'Pending',1,'Auto-created from approved lead'),
(1,'Pending','Requirement Gathering',1,'Kickoff'),
(1,'Requirement Gathering','UI/UX Design',1,'Wireframes approved'),
(1,'UI/UX Design','Development',1,'Sprint start');

-- ---------- notifications / activity ----------
INSERT INTO notifications (user_id, title, body, type, link) VALUES
(2,'Lead LEAD-0002 assigned to you','Dr. Kavita Rao · Zenith Health · App development enquiry.','assignment','/leads/2'),
(3,'Follow-up due today','Retry SEO retainer call with BlueWave Logistics.','followup','/followups'),
(1,'Project PRJ-2026-0001 moved to Development','Progress now 45%.','project','/projects/1'),
(4,'Task assigned: Cart & checkout module','Due in 10 days.','project','/projects/1');

INSERT INTO activity_logs (user_id, actor_name, action, entity, entity_id, summary) VALUES
(1,'System Admin','login','auth',NULL,'Signed in from dashboard'),
(2,'Priya Sharma','create','lead','1','Created lead LEAD-0001'),
(1,'System Admin','update','lead','1','Lead status changed to Approved'),
(1,'System Admin','create','project','PRJ-2026-0001','Project auto-created from lead approval'),
(3,'Rahul Verma','create','call','4','Logged outbound call for LEAD-0003');
