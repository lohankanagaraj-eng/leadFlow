import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, CalendarClock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useFetch } from '@/hooks/useFetch';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { post, put, del } from '@/api/client';
import DataTable from '@/components/DataTable';
import { PageHeader } from '@/components/Page';
import { Button, Modal, Field, Input, Textarea, Select, Badge, StatCard, ConfirmDialog } from '@/components/ui';
import { format } from 'date-fns';

const statusColor = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  done: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  cancelled: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
  overdue: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
};

export default function FollowUps() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [view, setView] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [toDelete, setToDelete] = useState(null);

  const { data, meta, loading, error, reload } = useFetch('/crm/followups', {
    params: { page, limit: 15, view, status }, deps: [page, view, status],
  });

  const { data: leads } = useFetch('/leads', { params: { limit: 200 } });

  const stats = meta?.stats || {};

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    const payload = Object.fromEntries(new FormData(e.target).entries());
    try {
      await post('/crm/followups', payload);
      toast.success('Follow-up scheduled');
      setOpen(false);
      reload();
    } catch (err) {
      const map = {};
      (err.errors || []).forEach((x) => { map[x.path] = x.message; });
      setErrors(map);
      toast.error(err.errors?.length ? Object.values(map).join(', ') : err.message);
    } finally { setSaving(false); }
  };

  const complete = async (row) => {
    try {
      await put(`/crm/followups/${row.id}`, { status: 'done' });
      toast.success('Marked as done');
      reload();
    } catch (err) { toast.error(err.message); }
  };

  const remove = async () => {
    try { await del(`/crm/followups/${toDelete.id}`); toast.success('Follow-up deleted'); reload(); }
    catch (err) { toast.error(err.message); }
    finally { setToDelete(null); }
  };

  const columns = [
    {
      key: 'subject', header: 'Follow-up',
      render: (r) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-slate-800 dark:text-slate-100">{r.subject}</p>
          <p className="truncate text-xs text-slate-400">{r.lead_code} · {r.contact_name}</p>
        </div>
      ),
    },
    { key: 'type', header: 'Type', render: (r) => <Badge className="capitalize">{r.type}</Badge> },
    { key: 'owner_name', header: 'Owner', render: (r) => <span className="text-xs">{r.owner_name}</span> },
    {
      key: 'due_at', header: 'Due',
      render: (r) => {
        const overdue = r.status === 'pending' && new Date(r.due_at) < new Date();
        return (
          <span className={`text-xs ${overdue ? 'font-semibold text-rose-500' : 'text-slate-500'}`}>
            {format(new Date(r.due_at), 'MMM d, yyyy HH:mm')}
            {overdue && ' · overdue'}
          </span>
        );
      },
    },
    { key: 'status', header: 'Status', render: (r) => <Badge color={statusColor[r.status]}>{r.status}</Badge> },
    {
      key: 'actions', header: '', align: 'right', sortable: false,
      render: (r) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          {r.status === 'pending' && <Button size="sm" variant="secondary" onClick={() => complete(r)}>Mark done</Button>}
          <Button size="sm" variant="ghost" onClick={() => navigate(`/leads/${r.lead_id}`)}>Open lead</Button>
          {user?.role === 'admin' && <Button size="sm" variant="ghost" className="!text-rose-500" onClick={() => setToDelete(r)}>Delete</Button>}
        </div>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-[1600px] p-4 sm:p-6">
      <PageHeader title="Follow-Ups" subtitle="Never let a warm conversation go cold."
        actions={user?.role !== 'developer' && <Button onClick={() => setOpen(true)}><Plus size={15} /> Schedule follow-up</Button>} />

      <div className="mb-5 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard title="Pending" value={stats.pending ?? 0} icon={CalendarClock} tone="amber" />
        <StatCard title="Due today" value={stats.due_today ?? 0} icon={CalendarClock} tone="brand" />
        <StatCard title="Overdue" value={stats.overdue ?? 0} icon={AlertTriangle} tone={stats.overdue > 0 ? 'rose' : 'emerald'} />
        <StatCard title="Completed" value={stats.done ?? 0} icon={CheckCircle2} tone="emerald" />
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {[['', 'All'], ['today', 'Today'], ['overdue', 'Overdue']].map(([v, label]) => (
          <button key={v} onClick={() => { setView(v); setPage(1); }}
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${view === v ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-400'}`}>
            {label}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        rows={data || []}
        loading={loading}
        error={error}
        onRetry={reload}
        page={page}
        limit={15}
        total={meta?.total}
        onPage={setPage}
        emptyTitle="No follow-ups scheduled"
        emptyDescription="Schedule your next touchpoint to keep the pipeline moving."
        emptyAction={user?.role !== 'developer' && <Button onClick={() => setOpen(true)}>Schedule follow-up</Button>}
        filters={
          <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="w-40">
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="done">Done</option>
            <option value="cancelled">Cancelled</option>
          </Select>
        }
      />

      <Modal open={open} onClose={() => setOpen(false)} title="Schedule a follow-up"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button form="fu-form" type="submit" loading={saving}>Schedule</Button>
          </>
        }>
        <form id="fu-form" onSubmit={submit} className="space-y-4">
          <Field label="Lead" required error={errors.lead_id}>
            <Select name="lead_id" required defaultValue="">
              <option value="" disabled>— Select lead —</option>
              {(leads || []).map((l) => <option key={l.id} value={l.id}>{l.lead_code} · {l.contact_name}</option>)}
            </Select>
          </Field>
          <Field label="Subject" required error={errors.subject}>
            <Input name="subject" required placeholder="Send commercial proposal" />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Type">
              <Select name="type" defaultValue="call">
                {['call', 'email', 'meeting', 'demo', 'proposal', 'other'].map((t) => <option key={t}>{t}</option>)}
              </Select>
            </Field>
            <Field label="Due at" required error={errors.due_at}>
              <Input type="datetime-local" name="due_at" required />
            </Field>
          </div>
          <Field label="Notes"><Textarea name="notes" /></Field>
        </form>
      </Modal>

      <ConfirmDialog open={!!toDelete} onClose={() => setToDelete(null)} onConfirm={remove}
        title="Delete follow-up?" message={toDelete?.subject} />
    </div>
  );
}
