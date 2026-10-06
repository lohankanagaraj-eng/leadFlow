import { useState } from 'react';
import { Plus, Code2, Gauge, Briefcase } from 'lucide-react';
import { useFetch } from '@/hooks/useFetch';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { post, put, del } from '@/api/client';
import DataTable from '@/components/DataTable';
import { PageHeader } from '@/components/Page';
import {
  Button, Modal, Field, Input, Select, Badge, Avatar, ConfirmDialog, Card, ProgressBar, Textarea, Tabs,
} from '@/components/ui';

const AVAIL = {
  available: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  busy: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  on_leave: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
  offline: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
};

export default function Developers() {
  const { user } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState('list');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [availability, setAvailability] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [form, setForm] = useState({
    employee_id: '', skills: [], experience_years: 0, availability: 'available',
    capacity_hours: 40, hourly_rate: '', bio: '',
  });
  const [skillInput, setSkillInput] = useState('');

  const { data, meta, loading, error, reload } = useFetch('/developers', {
    params: { search, page, limit: 15, availability }, deps: [page, availability],
  });
  const { data: employees } = useFetch('/employees', { params: { limit: 200, status: 'active' } });
  const pool = meta?.skillPool || [];

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const openCreate = () => {
    setEditing(null);
    setForm({ employee_id: '', skills: [], experience_years: 0, availability: 'available', capacity_hours: 40, hourly_rate: '', bio: '' });
    setErrors({});
    setOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      employee_id: row.employee_id, skills: row.skills || [], experience_years: row.experience_years,
      availability: row.availability, capacity_hours: row.capacity_hours,
      hourly_rate: row.hourly_rate || '', bio: row.bio || '',
    });
    setErrors({});
    setOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      if (editing) {
        await put(`/developers/${editing.id}`, form);
        toast.success('Developer updated');
      } else {
        await post('/developers', form);
        toast.success('Developer added');
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
    try { await del(`/developers/${toDelete.id}`); toast.success('Developer removed'); reload(); }
    catch (err) { toast.error(err.message); }
    finally { setToDelete(null); }
  };

  const addSkill = (s) => {
    const v = (s || '').trim();
    if (v && !form.skills.includes(v)) set('skills', [...form.skills, v]);
    setSkillInput('');
  };

  const columns = [
    {
      key: 'name', header: 'Developer',
      render: (r) => (
        <div className="flex items-center gap-3">
          <Avatar name={r.name} size={34} />
          <div className="min-w-0">
            <p className="truncate font-medium text-slate-800 dark:text-slate-100">{r.name}</p>
            <p className="truncate text-xs text-slate-400">{r.employee_code} · {r.designation}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'skills', header: 'Skills', sortable: false,
      render: (r) => (
        <div className="flex max-w-[260px] flex-wrap gap-1">
          {(r.skills || []).slice(0, 3).map((s) => <Badge key={s}>{s}</Badge>)}
          {(r.skills || []).length > 3 && <Badge>+{r.skills.length - 3}</Badge>}
          {!(r.skills || []).length && <span className="text-xs text-slate-400">—</span>}
        </div>
      ),
    },
    { key: 'availability', header: 'Availability', render: (r) => <Badge color={AVAIL[r.availability]}>{r.availability.replace('_', ' ')}</Badge> },
    { key: 'active_projects', header: 'Projects', align: 'right' },
    {
      key: 'allocated_pct', header: 'Load',
      render: (r) => (
        <div className="flex w-32 items-center gap-2">
          <ProgressBar value={r.allocated_pct} className="flex-1" />
          <span className="w-9 text-right text-xs text-slate-400">{r.allocated_pct}%</span>
        </div>
      ),
    },
    { key: 'open_tasks', header: 'Open tasks', align: 'right' },
    { key: 'experience_years', header: 'Exp', render: (r) => `${r.experience_years}y` },
    {
      key: 'actions', header: '', align: 'right', sortable: false,
      render: (r) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Button size="sm" variant="ghost" onClick={() => openEdit(r)}>Edit</Button>
          <Button size="sm" variant="ghost" className="!text-rose-500" onClick={() => setToDelete(r)}>Remove</Button>
        </div>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-[1600px] p-4 sm:p-6">
      <PageHeader title="Developers" subtitle="Skills, availability and workload across the engineering team."
        actions={user?.role === 'admin' && <Button onClick={openCreate}><Plus size={15} /> Add developer</Button>} />

      <Tabs className="mb-5"
        tabs={[{ value: 'list', label: 'Team' }, { value: 'pool', label: 'Skill pool' }]}
        active={tab} onChange={setTab} />

      {tab === 'list' && (
        <DataTable
          columns={columns}
          rows={data || []}
          loading={loading}
          error={error}
          onRetry={reload}
          search={search}
          onSearch={(v) => { setSearch(v); setPage(1); }}
          searchPlaceholder="Search developer…"
          page={page}
          limit={15}
          total={meta?.total}
          onPage={setPage}
          emptyTitle="No developers yet"
          emptyDescription="Add employees as developers to assign them to projects."
          emptyAction={user?.role === 'admin' && <Button onClick={openCreate}>Add developer</Button>}
          filters={
            <Select value={availability} onChange={(e) => { setAvailability(e.target.value); setPage(1); }} className="w-44">
              <option value="">All availability</option>
              {['available', 'busy', 'on_leave', 'offline'].map((a) => <option key={a} value={a}>{a.replace('_', ' ')}</option>)}
            </Select>
          }
        />
      )}

      {tab === 'pool' && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {(data || []).map((d) => (
            <Card key={d.id} className="card-hover p-5">
              <div className="flex items-start gap-3">
                <Avatar name={d.name} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{d.name}</p>
                  <p className="truncate text-xs text-slate-400">{d.designation}</p>
                </div>
                <Badge color={AVAIL[d.availability]}>{d.availability.replace('_', ' ')}</Badge>
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                {(d.skills || []).map((s) => <Badge key={s}>{s}</Badge>)}
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                <div><p className="font-bold text-slate-800 dark:text-slate-100">{d.active_projects}</p><p className="text-slate-400">Projects</p></div>
                <div><p className="font-bold text-slate-800 dark:text-slate-100">{d.open_tasks}</p><p className="text-slate-400">Tasks</p></div>
                <div><p className="font-bold text-slate-800 dark:text-slate-100">{d.experience_years}y</p><p className="text-slate-400">Exp</p></div>
              </div>
              <div className="mt-3">
                <ProgressBar value={d.allocated_pct} showLabel />
              </div>
            </Card>
          ))}
          {!loading && !(data || []).length && (
            <Card className="col-span-full"><p className="py-10 text-center text-sm text-slate-400">No developers found</p></Card>
          )}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit developer' : 'Add developer'} size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button form="dev-form" type="submit" loading={saving}>{editing ? 'Save' : 'Add'}</Button>
          </>
        }>
        <form id="dev-form" onSubmit={submit} className="space-y-4">
          {!editing && (
            <Field label="Employee" required error={errors.employee_id}>
              <Select value={form.employee_id} onChange={(e) => set('employee_id', e.target.value)} required>
                <option value="" disabled>— Select employee —</option>
                {(employees || []).map((e) => <option key={e.id} value={e.id}>{e.name} · {e.designation || e.role}</option>)}
              </Select>
            </Field>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Experience (years)">
              <Input type="number" min={0} value={form.experience_years} onChange={(e) => set('experience_years', e.target.value)} />
            </Field>
            <Field label="Availability">
              <Select value={form.availability} onChange={(e) => set('availability', e.target.value)}>
                {['available', 'busy', 'on_leave', 'offline'].map((a) => <option key={a} value={a}>{a.replace('_', ' ')}</option>)}
              </Select>
            </Field>
            <Field label="Capacity (hrs/week)">
              <Input type="number" min={1} value={form.capacity_hours} onChange={(e) => set('capacity_hours', e.target.value)} />
            </Field>
          </div>

          <Field label="Skills" hint="Pick from the pool or type a custom skill.">
            <div className="flex flex-wrap gap-1.5">
              {form.skills.map((s) => (
                <button key={s} type="button" onClick={() => set('skills', form.skills.filter((x) => x !== s))}
                  className="inline-flex items-center gap-1 rounded-full bg-brand-500/10 px-2.5 py-1 text-xs font-medium text-brand-600 dark:text-brand-300">
                  {s} ×
                </button>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <Input value={skillInput} onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill(skillInput); } }}
                placeholder="Type a skill and press Enter" />
              <Button type="button" variant="secondary" onClick={() => addSkill(skillInput)}>Add</Button>
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {pool.filter((s) => !form.skills.includes(s)).slice(0, 14).map((s) => (
                <button key={s} type="button" onClick={() => addSkill(s)}
                  className="rounded-full border border-slate-300 px-2.5 py-1 text-[11px] text-slate-500 hover:border-brand-400 hover:text-brand-500 dark:border-slate-700">
                  + {s}
                </button>
              ))}
            </div>
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Hourly rate (₹)"><Input type="number" min={0} value={form.hourly_rate} onChange={(e) => set('hourly_rate', e.target.value)} /></Field>
            <Field label="Bio"><Textarea value={form.bio} onChange={(e) => set('bio', e.target.value)} className="!min-h-[46px]" /></Field>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!toDelete} onClose={() => setToDelete(null)} onConfirm={remove}
        title="Remove developer?" message={`${toDelete?.name} will be removed from the developer pool.`} />
    </div>
  );
}
