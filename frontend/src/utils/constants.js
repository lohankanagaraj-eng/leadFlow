export function cn(...args) {
  return args.filter(Boolean).join(' ');
}

export const LEAD_STATUSES = ['New', 'Assigned', 'Contacted', 'Follow Up', 'Qualified', 'Approved', 'Rejected', 'Lost'];

export const PROJECT_STATUSES = ['Pending', 'Requirement Gathering', 'UI/UX Design', 'Development', 'Testing', 'QA', 'Client Review', 'Deployment', 'Maintenance', 'Completed'];

export const TASK_STATUSES = ['todo', 'in_progress', 'review', 'blocked', 'done'];

export const LEAD_SOURCES = ['website', 'referral', 'cold_call', 'social', 'seo', 'ads', 'email', 'other'];

export const SERVICE_INTERESTS = ['Website Development', 'Software Development', 'Digital Marketing', 'SEO', 'Mobile App Development', 'IT Services'];

export const leadStatusColor = {
  New: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  Assigned: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
  Contacted: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300',
  'Follow Up': 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  Qualified: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300',
  Approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  Rejected: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
  Lost: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
};

export const projectStatusColor = {
  Pending: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  'Requirement Gathering': 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
  'UI/UX Design': 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
  Development: 'bg-brand-100 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300',
  Testing: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  QA: 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300',
  'Client Review': 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300',
  Deployment: 'bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300',
  Maintenance: 'bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300',
  Completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
};

export const taskStatusColor = {
  todo: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  in_progress: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
  review: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
  blocked: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
  done: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
};

export const priorityColor = {
  Low: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  Medium: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
  High: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  Urgent: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
};

export const currency = (n, cur = 'INR') => {
  const value = Number(n || 0);
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(value);
  } catch {
    return `${cur} ${value.toLocaleString('en-IN')}`;
  }
};

export const compactCurrency = (n) => {
  const v = Number(n || 0);
  if (Math.abs(v) >= 1e7) return `₹${(v / 1e7).toFixed(1)}Cr`;
  if (Math.abs(v) >= 1e5) return `₹${(v / 1e5).toFixed(1)}L`;
  if (Math.abs(v) >= 1e3) return `₹${(v / 1e3).toFixed(1)}K`;
  return `₹${v}`;
};

export const initials = (name = '') =>
  name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('') || '?';

export const formatDuration = (sec = 0) => {
  const s = Number(sec);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}m ${r}s`;
};

export const roleLabel = (role) => ({ admin: 'Admin', employee: 'Employee', developer: 'Developer' }[role] || role);

export const NAV = {
  admin: ['dashboard', 'leads', 'companies', 'followups', 'calls', 'employees', 'developers', 'projects', 'analytics', 'activity'],
  employee: ['dashboard', 'leads', 'companies', 'followups', 'calls', 'projects', 'tasks'],
  developer: ['dashboard', 'projects', 'tasks'],
};
