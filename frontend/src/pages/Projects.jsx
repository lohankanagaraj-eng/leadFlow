import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FolderKanban, IndianRupee, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useFetch } from '@/hooks/useFetch';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { post } from '@/api/client';
import DataTable from '@/components/DataTable';
import { PageHeader } from '@/components/Page';
import {
  Button, Modal, Field, Input, Textarea, Select, Badge, StatCard, ProgressBar, Card,
} from '@/components/ui';
import { BarChartCard } from '@/components/Charts';
import { cn, PROJECT_STATUSES, projectStatusColor, priorityColor, compactCurrency } from '@/utils/constants';
import { format } from 'date-fns';

const payColor = {
  Unpaid: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
  Partial: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  Paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  Refunded: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
};

export default function Projects() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [payment, setPayment] = useState('');
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [view, setView] = useState('table');

  const { data, meta, loading, error, reload } = useFetch('/projects', {
    params: { page, limit: 15, search, status, payment_status: payment }, deps: [page, status, payment],
  });
  const { data: companies } = useFetch('/companies', { params: { limit: 200 } });

  const stats = (meta?.statusAgg || []).reduce((a, s) => {
    a.total += Number(s.count);
    if (s.status === 'Completed') a.done = Number(s.count);
    else a.active += Number(s.count);
    return a;
  }, { total: 0, active: 0, done: 0 });

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    const payload = Object.fromEntries(new FormData(e.target).entries());
    try {
      const res = await post('/projects', payload);
      toast.success(`${res.data.project_code} created`, 'Project created');
      setOpen(false);
      navigate(`/projects/${res.data.id}`);
    } catch (err) {
      const map = {};
      (err.errors || []).forEach((x) => { map[x.path] = x.message; });
      setErrors(map);
      toast.error(err.errors?.length ? Object.values(map).join(', ') : err.message);
    } finally { setSaving(false); }
  };

  const columns = [
    {
      key: 'project_code', header: 'Project',
      render: (r) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-slate-800 dark:text-slate-100">{r.title}</p>
          <p className="truncate text-xs text-slate-400">{r.project_code} · {r.company_name || '—'}</p>
        </div>
      ),
    },
    { key: 'status', header: 'Status', render: (r) => <Badge color={projectStatusColor[r.status]}>{r.status}</Badge> },
    { key: 'priority', header: 'Priority', render: (r) => <Badge color={priorityColor[r.priority]}>{r.priority}</Badge> },
    {
      key: 'progress', header: 'Progress',
      render: (r) => (
        <div className="flex w-36 items-center gap-2">
          <ProgressBar value={r.progress} className="flex-1" />
          <span className="w-9 text-right text-xs text-slate-400">{r.progress}%</span>
        </div>
      ),
    },
    { key: 'team_size', header: 'Team', align: 'right', render: (r) => `${r.team_size} dev` },
    { key: 'task_done', header: 'Tasks', align: 'right', render: (r) => `${r.task_done}/${r.task_total}` },
    { key: 'budget', header: 'Budget', align: 'right', render: (r) => <span className="font-semibold">{compactCurrency(r.budget)}</span> },
    { key: 'payment_status', header: 'Payment', render: (r) => <Badge color={payColor[r.payment_status]}>{r.payment_status}</Badge> },
    { key: 'deadline', header: 'Deadline', render: (r) => r.deadline ? (
      <span className={cn('text-xs', new Date(r.deadline) < new Date() && r.status !== 'Completed' ? 'font-semibold text-rose-500' : 'text-slate-400')}>
        {format(new Date(r.deadline), 'MMM d, yyyy')}
      </span>
    ) : '—' },
  ];

  return (
    <div className="mx-auto max-w-[1600px] p-4 sm:p-6">
      <PageHeader title="Projects" subtitle="Delivery pipeline from requirement gathering to maintenance."
        actions={
          <>
            <div className="flex overflow-hidden rounded-lg border border-slate-300 dark:border-slate-700">
              {['table', 'board'].map((v) => (
                <button key={v} onClick={() => setView(v)}
                  className={cn('px-3 py-2 text-xs font-medium capitalize',
                    view === v ? 'bg-brand-600 text-white' : 'bg-white text-slate-500 dark:bg-slate-900 dark:text-slate-400')}>
                  {v}
                </button>
              ))}
            </div>
            {user?.role === 'admin' && <Button onClick={() => setOpen(true)}><Plus size={15} /> New project</Button>}
          </>
        } />

      <div className="mb-5 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard title="Total projects" value={stats.total} icon={FolderKanban} tone="brand" />
        <StatCard title="Active" value={stats.active} icon={AlertTriangle} tone="amber" />
        <StatCard title="Completed" value={stats.done} icon={CheckCircle2} tone="emerald" />
        <StatCard title="Booked value" value={compactCurrency((data || []).reduce((a, r) => a + Number(r.budget || 0), 0))} icon={IndianRupee} tone="violet" />
      </div>

      {view === 'table' ? (
        <DataTable
          columns={columns}
          rows={data || []}
          loading={loading}
          error={error}
          onRetry={reload}
          search={search}
          onSearch={(v) => { setSearch(v); setPage(1); }}
          searchPlaceholder="Search project, code, company…"
          page={page}
          limit={15}
          total={meta?.total}
          onPage={setPage}
          onRowClick={(r) => navigate(`/projects/${r.id}`)}
          emptyTitle="No projects yet"
          emptyDescription="Approve a lead to auto-create a project, or create one manually."
          filters={
            <>
              <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="w-48">
                <option value="">All statuses</option>
                {PROJECT_STATUSES.map((s) => <option key={s}>{s}</option>)}
              </Select>
              <Select value={payment} onChange={(e) => { setPayment(e.target.value); setPage(1); }} className="w-36">
                <option value="">Payments</option>
                {['Unpaid', 'Partial', 'Paid', 'Refunded'].map((p) => <option key={p}>{p}</option>)}
              </Select>
            </>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(data || []).map((p) => (
            <Card key={p.id} className="card-hover cursor-pointer p-5" onClick={() => navigate(`/projects/${p.id}`)}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{p.title}</p>
                  <p className="text-xs text-slate-400">{p.project_code} · {p.company_name || '—'}</p>
                </div>
                <Badge color={projectStatusColor[p.status]}>{p.status}</Badge>
              </div>
              <div className="mt-4"><ProgressBar value={p.progress} showLabel /></div>
              <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                <span>{p.team_size} devs · {p.task_done}/{p.task_total} tasks</span>
                <span className="font-semibold text-slate-600 dark:text-slate-300">{compactCurrency(p.budget)}</span>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Badge color={priorityColor[p.priority]}>{p.priority}</Badge>
                <Badge color={payColor[p.payment_status]}>{p.payment_status}</Badge>
              </div>
            </Card>
          ))}
          {!loading && !(data || []).length && (
            <Card className="col-span-full"><p className="py-12 text-center text-sm text-slate-400">No projects found</p></Card>
          )}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Create project" size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button form="proj-form" type="submit" loading={saving}>Create</Button>
          </>
        }>
        <form id="proj-form" onSubmit={submit} className="space-y-4">
          <Field label="Title" required error={errors.title}>
            <Input name="title" required placeholder="Client portal redesign" />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Company">
              <Select name="company_id" defaultValue="">
                <option value="">— None —</option>
                {(companies || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
            <Field label="Service type">
              <Input name="service_type" placeholder="Website Development" />
            </Field>
            <Field label="Priority">
              <Select name="priority" defaultValue="Medium">
                {['Low', 'Medium', 'High', 'Urgent'].map((p) => <option key={p}>{p}</option>)}
              </Select>
            </Field>
            <Field label="Budget (₹)"><Input type="number" name="budget" min={0} /></Field>
            <Field label="Start date"><Input type="date" name="start_date" /></Field>
            <Field label="Deadline"><Input type="date" name="deadline" /></Field>
          </div>
          <Field label="Description"><Textarea name="description" /></Field>
        </form>
      </Modal>
    </div>
  );
}
