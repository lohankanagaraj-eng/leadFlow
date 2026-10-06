import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Plus, Users, CheckCircle2, Clock, TrendingUp, Filter, XCircle } from 'lucide-react';
import { useFetch } from '@/hooks/useFetch';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { get, post, patch } from '@/api/client';
import DataTable from '@/components/DataTable';
import { PageHeader } from '@/components/Page';
import {
  Button, Modal, Field, Input, Textarea, Select, Badge, Card, StatCard, Avatar,
} from '@/components/ui';
import { cn, LEAD_STATUSES, LEAD_SOURCES, SERVICE_INTERESTS, leadStatusColor, priorityColor, compactCurrency } from '@/utils/constants';
import { format } from 'date-fns';

const blankForm = {
  contact_name: '', email: '', phone: '', designation: '', company_id: '',
  source: 'website', service_interest: [], budget: '', expected_value: '',
  priority: 'Medium', requirement: '', website_url: '', notes: '', assign_to: '',
};

export default function Leads() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const [params, setParams] = useSearchParams();

  const [search, setSearch] = useState(params.get('search') || '');
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState(params.get('status') || '');
  const [priority, setPriority] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(blankForm);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [acting, setActing] = useState(null);

  const query = { search, page, limit: 15, status, priority };
  const { data, meta, loading, error, reload } = useFetch('/leads', { params: query, deps: [page, status, priority] });

  const { data: employees } = useFetch('/employees', { params: { limit: 100, status: 'active' }, enabled: user?.role === 'admin' });
  const { data: companies } = useFetch('/companies', { params: { limit: 100 } });

  const stats = useMemo(() => {
    const agg = meta?.statusAgg || [];
    const map = Object.fromEntries(agg.map((s) => [s.status, Number(s.count)]));
    return {
      total: agg.reduce((a, s) => a + Number(s.count), 0),
      approved: map.Approved || 0,
      open: LEAD_STATUSES.filter((s) => !['Approved', 'Rejected', 'Lost'].includes(s))
        .reduce((a, s) => a + (map[s] || 0), 0),
    };
  }, [meta]);

  const setFilter = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    setParams(next, { replace: true });
  };

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const toggleService = (s) => setForm((f) => ({
    ...f,
    service_interest: f.service_interest.includes(s)
      ? f.service_interest.filter((x) => x !== s)
      : [...f.service_interest, s],
  }));

  const submit = async (e) => {
    e.preventDefault();
    setErrors({});
    setSaving(true);
    try {
      const payload = {
        ...form,
        company_id: form.company_id || null,
        assign_to: form.assign_to || null,
        budget: form.budget || null,
        expected_value: form.expected_value || null,
        email: form.email || null,
        phone: form.phone || null,
      };
      const res = await post('/leads', payload);
      toast.success(`${res.data.lead_code} created${res.data.status === 'Assigned' ? ' and assigned' : ''}`, 'Lead created');
      setOpen(false);
      setForm(blankForm);
      reload();
    } catch (err) {
      const map = {};
      (err.errors || []).forEach((x) => { map[x.path] = x.message; });
      setErrors(map);
      toast.error(err.message, 'Could not create lead');
    } finally {
      setSaving(false);
    }
  };

  const act = async (r, status) => {
    const key = `${status}-${r.id}`;
    setActing(key);
    try {
      const res = await patch(`/leads/${r.id}/status`, { status });
      toast.success(res.data.autoCreated
        ? 'Accepted — project auto-created!'
        : status === 'Approved' ? 'Lead accepted' : 'Lead rejected');
      reload();
    } catch (err) {
      toast.error(err.message, status === 'Approved' ? 'Could not accept' : 'Could not reject');
    } finally {
      setActing(null);
    }
  };

  const columns = [
    {
      key: 'contact_name', header: 'Contact',
      render: (r) => (
        <div className="flex items-center gap-3">
          <Avatar name={r.contact_name} size={32} />
          <div className="min-w-0">
            <p className="truncate font-medium text-slate-800 dark:text-slate-100">{r.contact_name}</p>
            <p className="truncate text-xs text-slate-400">{r.lead_code}</p>
          </div>
        </div>
      ),
    },
    { key: 'company_name', header: 'Company', render: (r) => r.company_name || <span className="text-slate-400">—</span> },
    { key: 'source', header: 'Source', render: (r) => <span className="capitalize">{r.source}</span> },
    { key: 'status', header: 'Status', render: (r) => <Badge color={leadStatusColor[r.status]}>{r.status}</Badge> },
    { key: 'priority', header: 'Priority', render: (r) => <Badge color={priorityColor[r.priority]}>{r.priority}</Badge> },
    { key: 'expected_value', header: 'Value', align: 'right', render: (r) => <span className="font-semibold">{compactCurrency(r.expected_value)}</span> },
    {
      key: 'owner_name', header: 'Owner',
      render: (r) => r.owner_name
        ? <span className="text-xs">{r.owner_name}</span>
        : <span className="text-xs text-slate-400">Unassigned</span>,
    },
    {
      key: 'activity', header: 'Activity', sortable: false,
      render: (r) => (
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="flex items-center gap-1"><Clock size={12} /> {r.pending_followups}</span>
          <span className="flex items-center gap-1"><TrendingUp size={12} /> {r.call_count}</span>
        </div>
      ),
    },
    {
      key: 'actions', header: 'Decision', sortable: false,
      render: (r) => {
        if (['Approved', 'Rejected', 'Lost'].includes(r.status)) {
          return <span className="text-xs text-slate-300">—</span>;
        }
        return (
          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            <Button size="xs" variant="danger" loading={acting === `Rejected-${r.id}`} onClick={() => act(r, 'Rejected')}>
              <XCircle size={13} /> Reject
            </Button>
            <Button size="xs" variant="success" loading={acting === `Approved-${r.id}`} onClick={() => act(r, 'Approved')}>
              <CheckCircle2 size={13} /> Accept
            </Button>
          </div>
        );
      },
    },
    { key: 'created_at', header: 'Created', render: (r) => <span className="text-xs text-slate-400">{format(new Date(r.created_at), 'MMM d, yyyy')}</span> },
  ];

  return (
    <div className="mx-auto max-w-[1600px] p-4 sm:p-6">
      <PageHeader
        title="Lead Management"
        subtitle="Capture, assign and convert leads into delivery projects."
        actions={
          <>
            <Button variant="secondary" onClick={reload}>Refresh</Button>
            <Button onClick={() => setOpen(true)}><Plus size={15} /> New lead</Button>
          </>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard title="Total leads" value={stats.total} icon={Users} tone="brand" />
        <StatCard title="Open pipeline" value={stats.open} icon={Clock} tone="amber" />
        <StatCard title="Approved" value={stats.approved} icon={CheckCircle2} tone="emerald" />
        <StatCard title="Conversion rate" value={stats.total ? `${Math.round((stats.approved / stats.total) * 100)}%` : '0%'} icon={TrendingUp} tone="violet" />
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        <button onClick={() => { setStatus(''); setFilter('status', ''); }}
          className={cn('rounded-full px-3 py-1.5 text-xs font-medium transition',
            !status ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800')}>
          All
        </button>
        {LEAD_STATUSES.map((s) => (
          <button key={s} onClick={() => { setStatus(s); setFilter('status', s); }}
            className={cn('rounded-full px-3 py-1.5 text-xs font-medium transition',
              status === s ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800')}>
            {s}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        rows={data || []}
        loading={loading}
        error={error}
        onRetry={reload}
        search={search}
        onSearch={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder="Search contact, company, lead code…"
        page={page}
        limit={15}
        total={meta?.total}
        onPage={setPage}
        onRowClick={(r) => navigate(`/leads/${r.id}`)}
        emptyTitle="No leads found"
        emptyDescription="Create your first lead to start the conversion pipeline."
        emptyAction={<Button onClick={() => setOpen(true)}><Plus size={15} /> New lead</Button>}
        filters={
          <Select value={priority} onChange={(e) => { setPriority(e.target.value); setPage(1); }} className="w-40">
            <option value="">All priorities</option>
            {['Low', 'Medium', 'High', 'Urgent'].map((p) => <option key={p}>{p}</option>)}
          </Select>
        }
      />

      {/* ---------- Create modal ---------- */}
      <Modal open={open} onClose={() => setOpen(false)} title="Create new lead"
        description="Leads can be auto-assigned to an employee on creation." size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button form="lead-form" type="submit" loading={saving}>Create lead</Button>
          </>
        }>
        <form id="lead-form" onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Contact name" required error={errors.contact_name}>
            <Input value={form.contact_name} onChange={(e) => set('contact_name', e.target.value)} required placeholder="John Doe" />
          </Field>
          <Field label="Company" error={errors.company_id}>
            <Select value={form.company_id} onChange={(e) => set('company_id', e.target.value)}>
              <option value="">— No company —</option>
              {(companies || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label="Email" error={errors.email}>
            <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="john@company.com" />
          </Field>
          <Field label="Phone" error={errors.phone}>
            <Input value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+91 98xxx xxxxx" />
          </Field>
          <Field label="Lead source">
            <Select value={form.source} onChange={(e) => set('source', e.target.value)}>
              {LEAD_SOURCES.map((s) => <option key={s} value={s} className="capitalize">{s.replace('_', ' ')}</option>)}
            </Select>
          </Field>
          <Field label="Priority">
            <Select value={form.priority} onChange={(e) => set('priority', e.target.value)}>
              {['Low', 'Medium', 'High', 'Urgent'].map((p) => <option key={p}>{p}</option>)}
            </Select>
          </Field>
          <Field label="Expected value (₹)">
            <Input type="number" min="0" value={form.expected_value} onChange={(e) => set('expected_value', e.target.value)} placeholder="450000" />
          </Field>
          <Field label="Budget (₹)">
            <Input type="number" min="0" value={form.budget} onChange={(e) => set('budget', e.target.value)} placeholder="500000" />
          </Field>

          <div className="sm:col-span-2">
            <Field label="Service interest">
              <div className="flex flex-wrap gap-2">
                {SERVICE_INTERESTS.map((s) => (
                  <button key={s} type="button" onClick={() => toggleService(s)}
                    className={cn('rounded-lg border px-3 py-1.5 text-xs font-medium transition',
                      form.service_interest.includes(s)
                        ? 'border-brand-500 bg-brand-500/10 text-brand-600 dark:text-brand-300'
                        : 'border-slate-300 text-slate-600 hover:border-slate-400 dark:border-slate-700 dark:text-slate-400')}>
                    {s}
                  </button>
                ))}
              </div>
            </Field>
          </div>

          <div className="sm:col-span-2">
            <Field label="Requirement / brief" error={errors.requirement}>
              <Textarea value={form.requirement} onChange={(e) => set('requirement', e.target.value)}
                placeholder="Describe what the client needs…" />
            </Field>
          </div>

          {user?.role === 'admin' && (
            <div className="sm:col-span-2">
              <Field label="Assign to employee" hint="Assigning sets the lead status to Assigned.">
                <Select value={form.assign_to} onChange={(e) => set('assign_to', e.target.value)}>
                  <option value="">— Leave unassigned —</option>
                  {(employees || []).filter((e) => e.role !== 'developer').map((e) => (
                    <option key={e.id} value={e.id}>{e.name} · {e.designation}</option>
                  ))}
                </Select>
              </Field>
            </div>
          )}
        </form>
      </Modal>
    </div>
  );
}
