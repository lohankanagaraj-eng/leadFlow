import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Building2 } from 'lucide-react';
import { useFetch } from '@/hooks/useFetch';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { post, put, del } from '@/api/client';
import DataTable from '@/components/DataTable';
import { PageHeader } from '@/components/Page';
import {
  Button, Modal, Field, Input, Textarea, Select, Badge, ConfirmDialog,
} from '@/components/ui';

const SEGMENT_COLOR = {
  lead: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
  client: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  partner: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
  vendor: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
};

const blank = {
  name: '', industry: '', website: '', email: '', phone: '', address: '',
  city: '', state: '', country: 'India', pincode: '', gst_number: '',
  segment: 'lead', notes: '',
};

export default function Companies() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [segment, setSegment] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  const { data, meta, loading, error, reload } = useFetch('/companies', {
    params: { search, page, limit: 15, segment }, deps: [page, segment],
  });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const openCreate = () => { setEditing(null); setForm(blank); setErrors({}); setOpen(true); };
  const openEdit = (row) => { setEditing(row); setForm({ ...blank, ...row }); setErrors({}); setOpen(true); };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      if (editing) {
        await put(`/companies/${editing.id}`, form);
        toast.success('Company updated');
      } else {
        const res = await post('/companies', form);
        toast.success(`${res.data.company_code} created`, 'Company added');
      }
      setOpen(false);
      reload();
    } catch (err) {
      const map = {};
      (err.errors || []).forEach((x) => { map[x.path] = x.message; });
      setErrors(map);
      toast.error(err.errors?.length ? Object.values(map).join(', ') : err.message);
    } finally { setSaving(false); }
  };

  const remove = async () => {
    try {
      await del(`/companies/${toDelete.id}`);
      toast.success('Company deleted');
      reload();
    } catch (err) { toast.error(err.message); }
    finally { setToDelete(null); }
  };

  const columns = [
    {
      key: 'name', header: 'Company',
      render: (r) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-300">
            <Building2 size={16} />
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium text-slate-800 dark:text-slate-100">{r.name}</p>
            <p className="truncate text-xs text-slate-400">{r.company_code} · {r.industry || '—'}</p>
          </div>
        </div>
      ),
    },
    { key: 'segment', header: 'Segment', render: (r) => <Badge color={SEGMENT_COLOR[r.segment]}>{r.segment}</Badge> },
    { key: 'email', header: 'Contact', render: (r) => (
      <div className="text-xs">
        <p>{r.email || '—'}</p>
        <p className="text-slate-400">{r.phone || ''}</p>
      </div>
    ) },
    { key: 'city', header: 'Location', render: (r) => <span className="text-xs">{[r.city, r.country].filter(Boolean).join(', ') || '—'}</span> },
    { key: 'lead_count', header: 'Leads', align: 'right' },
    { key: 'project_count', header: 'Projects', align: 'right' },
    {
      key: 'actions', header: '', align: 'right', sortable: false,
      render: (r) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          {user?.role === 'admin' && (
            <>
              <Button size="sm" variant="ghost" onClick={() => openEdit(r)}>Edit</Button>
              <Button size="sm" variant="ghost" className="!text-rose-500" onClick={() => setToDelete(r)}>Delete</Button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-[1600px] p-4 sm:p-6">
      <PageHeader title="Companies" subtitle="Manage client and prospect organisations."
        actions={user?.role === 'admin' && <Button onClick={openCreate}><Plus size={15} /> New company</Button>} />

      <DataTable
        columns={columns}
        rows={data || []}
        loading={loading}
        error={error}
        onRetry={reload}
        search={search}
        onSearch={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder="Search company, email, phone…"
        page={page}
        limit={15}
        total={meta?.total}
        onPage={setPage}
        emptyTitle="No companies yet"
        emptyDescription="Add companies to link them with leads and projects."
        emptyAction={user?.role === 'admin' && <Button onClick={openCreate}>New company</Button>}
        filters={
          <Select value={segment} onChange={(e) => { setSegment(e.target.value); setPage(1); }} className="w-40">
            <option value="">All segments</option>
            {['lead', 'client', 'partner', 'vendor'].map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        }
      />

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit company' : 'New company'} size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button form="co-form" type="submit" loading={saving}>{editing ? 'Save' : 'Create'}</Button>
          </>
        }>
        <form id="co-form" onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Company name" required error={errors.name}>
            <Input value={form.name} onChange={(e) => set('name', e.target.value)} required />
          </Field>
          <Field label="Industry"><Input value={form.industry} onChange={(e) => set('industry', e.target.value)} placeholder="Retail, Healthcare…" /></Field>
          <Field label="Email" error={errors.email}><Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} /></Field>
          <Field label="Phone"><Input value={form.phone} onChange={(e) => set('phone', e.target.value)} /></Field>
          <Field label="Website"><Input value={form.website} onChange={(e) => set('website', e.target.value)} placeholder="https://" /></Field>
          <Field label="Segment">
            <Select value={form.segment} onChange={(e) => set('segment', e.target.value)}>
              {['lead', 'client', 'partner', 'vendor'].map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </Field>
          <Field label="City"><Input value={form.city} onChange={(e) => set('city', e.target.value)} /></Field>
          <Field label="State"><Input value={form.state} onChange={(e) => set('state', e.target.value)} /></Field>
          <Field label="Country"><Input value={form.country} onChange={(e) => set('country', e.target.value)} /></Field>
          <Field label="PIN code"><Input value={form.pincode} onChange={(e) => set('pincode', e.target.value)} /></Field>
          <Field label="GST number"><Input value={form.gst_number} onChange={(e) => set('gst_number', e.target.value)} /></Field>
          <div className="sm:col-span-2">
            <Field label="Address"><Input value={form.address} onChange={(e) => set('address', e.target.value)} /></Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Notes"><Textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} /></Field>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!toDelete} onClose={() => setToDelete(null)} onConfirm={remove}
        title="Delete company?" message={`${toDelete?.name} and its linked records will be removed.`} />
    </div>
  );
}
