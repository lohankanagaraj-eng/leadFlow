import { z } from 'zod';

const password = z.string().min(8, 'Password must be at least 8 characters').max(72);

export const loginSchema = z.object({
  email: z.string().email('Valid email required'),
  password: z.string().min(1, 'Password required'),
});

export const registerSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  password,
  role: z.enum(['admin', 'employee', 'developer']).default('employee'),
  phone: z.string().max(20).optional().nullable(),
  designation: z.string().max(80).optional().nullable(),
  department: z.string().max(80).optional().nullable(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: password,
});

export const companySchema = z.object({
  name: z.string().min(2, 'Company name is required').max(160),
  industry: z.string().max(80).optional().nullable(),
  website: z.string().max(200).optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal('')),
  phone: z.string().max(30).optional().nullable(),
  address: z.string().max(255).optional().nullable(),
  city: z.string().max(80).optional().nullable(),
  state: z.string().max(80).optional().nullable(),
  country: z.string().max(80).optional().nullable(),
  pincode: z.string().max(12).optional().nullable(),
  gst_number: z.string().max(30).optional().nullable(),
  segment: z.enum(['lead', 'client', 'partner', 'vendor']).default('lead'),
  notes: z.string().optional().nullable(),
});

export const leadSchema = z.object({
  contact_name: z.string().min(2, 'Contact name is required').max(120),
  email: z.string().email().optional().nullable().or(z.literal('')),
  phone: z.string().max(30).optional().nullable(),
  designation: z.string().max(80).optional().nullable(),
  company_id: z.coerce.number().int().positive().optional().nullable(),
  source: z.enum(['website', 'referral', 'cold_call', 'social', 'seo', 'ads', 'email', 'other']).default('website'),
  service_interest: z.array(z.string()).default([]),
  budget: z.coerce.number().nonnegative().optional().nullable(),
  expected_value: z.coerce.number().nonnegative().optional().nullable(),
  currency: z.string().max(6).default('INR'),
  priority: z.enum(['Low', 'Medium', 'High', 'Urgent']).default('Medium'),
  requirement: z.string().optional().nullable(),
  website_url: z.string().max(255).optional().nullable(),
  notes: z.string().optional().nullable(),
  assign_to: z.coerce.number().int().positive().optional().nullable(),
});

export const leadStatusSchema = z.object({
  status: z.enum(['New', 'Assigned', 'Contacted', 'Follow Up', 'Qualified', 'Approved', 'Rejected', 'Lost']),
  remark: z.string().max(255).optional().nullable(),
});

export const assignLeadSchema = z.object({
  employee_id: z.coerce.number().int().positive({ message: 'Select an employee' }),
  note: z.string().max(255).optional().nullable(),
});

export const callSchema = z.object({
  lead_id: z.coerce.number().int().positive({ message: 'Lead is required' }),
  employee_id: z.coerce.number().int().positive().optional().nullable(),
  direction: z.enum(['outbound', 'inbound']).default('outbound'),
  call_status: z.enum(['connected', 'no_answer', 'busy', 'voicemail', 'failed']).default('connected'),
  started_at: z.string().optional().nullable(),
  duration_sec: z.coerce.number().int().nonnegative().default(0),
  summary: z.string().optional().nullable(),
  outcome: z.string().max(120).optional().nullable(),
  next_step: z.string().max(255).optional().nullable(),
  followup_after_days: z.coerce.number().int().positive().max(90).optional().nullable(),

  // Details to capture/update during the call.
  contact_name: z.string().min(2, 'Contact name must be at least 2 characters').max(120).optional(),
  phone: z.string().max(30).optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal('')),
  company_name: z.string().min(2, 'Company name must be at least 2 characters').max(160).optional(),
  company_industry: z.string().max(80).optional().nullable(),
  company_email: z.string().email().optional().nullable().or(z.literal('')),
  company_phone: z.string().max(30).optional().nullable(),
  company_city: z.string().max(80).optional().nullable(),
});

export const followupSchema = z.object({
  lead_id: z.coerce.number().int().positive({ message: 'Lead is required' }),
  owner_id: z.coerce.number().int().positive().optional().nullable(),
  due_at: z.string().min(1, 'Due date is required'),
  type: z.enum(['call', 'email', 'meeting', 'demo', 'proposal', 'other']).default('call'),
  subject: z.string().min(3, 'Subject is required').max(200),
  notes: z.string().optional().nullable(),
});

export const followupUpdateSchema = z.object({
  due_at: z.string().optional().nullable(),
  type: z.enum(['call', 'email', 'meeting', 'demo', 'proposal', 'other']).optional(),
  subject: z.string().min(3).max(200).optional(),
  notes: z.string().optional().nullable(),
  status: z.enum(['pending', 'done', 'cancelled']).optional(),
});

export const employeeSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  password,
  role: z.enum(['admin', 'employee', 'developer']).default('employee'),
  phone: z.string().max(20).optional().nullable(),
  designation: z.string().max(80).optional().nullable(),
  department: z.string().max(80).optional().nullable(),
  salary: z.coerce.number().nonnegative().optional().nullable(),
  hire_date: z.string().optional().nullable(),
  is_active: z.coerce.boolean().optional(),
  skills: z.array(z.string()).optional(),
  experience_years: z.coerce.number().int().min(0).optional(),
  availability: z.enum(['available', 'busy', 'on_leave', 'offline']).optional(),
  hourly_rate: z.coerce.number().nonnegative().optional().nullable(),
});

export const developerSchema = z.object({
  employee_id: z.coerce.number().int().positive({ message: 'Select an employee' }),
  skills: z.array(z.string()).default([]),
  experience_years: z.coerce.number().int().min(0).default(0),
  availability: z.enum(['available', 'busy', 'on_leave', 'offline']).default('available'),
  capacity_hours: z.coerce.number().positive().default(40),
  hourly_rate: z.coerce.number().nonnegative().optional().nullable(),
  bio: z.string().optional().nullable(),
});

export const developerUpdateSchema = z.object({
  skills: z.array(z.string()).optional(),
  experience_years: z.coerce.number().int().min(0).optional(),
  availability: z.enum(['available', 'busy', 'on_leave', 'offline']).optional(),
  capacity_hours: z.coerce.number().positive().optional(),
  hourly_rate: z.coerce.number().nonnegative().optional().nullable(),
  bio: z.string().optional().nullable(),
});

export const projectSchema = z.object({
  title: z.string().min(3, 'Title is required').max(200),
  description: z.string().optional().nullable(),
  company_id: z.coerce.number().int().positive().optional().nullable(),
  service_type: z.string().max(120).optional().nullable(),
  status: z.enum(['Pending', 'Requirement Gathering', 'UI/UX Design', 'Development', 'Testing', 'QA', 'Client Review', 'Deployment', 'Maintenance', 'Completed']).default('Pending'),
  priority: z.enum(['Low', 'Medium', 'High', 'Urgent']).default('Medium'),
  budget: z.coerce.number().nonnegative().optional().nullable(),
  paid_amount: z.coerce.number().nonnegative().optional().nullable(),
  start_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
  deadline: z.string().optional().nullable(),
  remark: z.string().max(255).optional().nullable(),
});

export const projectStatusSchema = z.object({
  status: z.enum(['Pending', 'Requirement Gathering', 'UI/UX Design', 'Development', 'Testing', 'QA', 'Client Review', 'Deployment', 'Maintenance', 'Completed']),
  remark: z.string().max(255).optional().nullable(),
});

export const assignDevelopersSchema = z.object({
  developer_ids: z.array(z.coerce.number().int().positive()).min(1, 'Select at least one developer'),
  allocated_pct: z.coerce.number().int().min(5).max(100).default(100),
  role_in_project: z.string().max(80).optional().nullable(),
  replace: z.coerce.boolean().optional(),
});

export const taskSchema = z.object({
  title: z.string().min(3, 'Task title is required').max(200),
  description: z.string().optional().nullable(),
  stage: z.enum(['Requirement Gathering', 'UI/UX Design', 'Development', 'Testing', 'QA', 'Client Review', 'Deployment', 'Maintenance']).default('Development'),
  assignee_id: z.coerce.number().int().positive().optional().nullable(),
  status: z.enum(['todo', 'in_progress', 'review', 'blocked', 'done']).default('todo'),
  priority: z.enum(['Low', 'Medium', 'High', 'Urgent']).optional(),
  estimate_hrs: z.coerce.number().nonnegative().optional().nullable(),
  due_date: z.string().optional().nullable(),
  start_date: z.string().optional().nullable(),
});

export const taskUpdateSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().optional().nullable(),
  stage: z.enum(['Requirement Gathering', 'UI/UX Design', 'Development', 'Testing', 'QA', 'Client Review', 'Deployment', 'Maintenance']).optional(),
  assignee_id: z.coerce.number().int().positive().optional().nullable(),
  status: z.enum(['todo', 'in_progress', 'review', 'blocked', 'done']).optional(),
  priority: z.enum(['Low', 'Medium', 'High', 'Urgent']).optional(),
  estimate_hrs: z.coerce.number().nonnegative().optional().nullable(),
  logged_hrs: z.coerce.number().nonnegative().optional(),
  due_date: z.string().optional().nullable(),
  start_date: z.string().optional().nullable(),
});

export const projectUpdateSchema = z.object({
  comment: z.string().min(2, 'Comment is required').max(1000),
  progress: z.coerce.number().int().min(0).max(100).optional().nullable(),
  status: z.enum(['Pending', 'Requirement Gathering', 'UI/UX Design', 'Development', 'Testing', 'QA', 'Client Review', 'Deployment', 'Maintenance', 'Completed']).optional().nullable(),
});
