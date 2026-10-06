import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, UserCog, TrendingUp, PhoneCall, Users } from 'lucide-react';
import { useFetch } from '@/hooks/useFetch';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { get, post, put, del } from '@/api/client';
import DataTable from '@/components/DataTable';
import { PageHeader, SectionTitle } from '@/components/Page';
import {
  Button, Modal, Field, Input, Select, Badge, Avatar, ConfirmDialog, Tabs, Card, ProgressBar,
} from '@/components/ui';
import { BarChartCard } from '@/components/Charts';
import { roleLabel } from '@/utils/constants';
import { format } from 'date-fns';

const blank = {
  name: '', email: '', password: '', role: 'employee', phone: '',
  designation: '', department: '', salary: '', hire_date: '',
};

const roleColor = {
  admin: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
  employee: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
  developer: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
};

export default function Employees() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState('directory');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [role, setRole] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  const { data, meta, loading, error, reload } = useFetch('/employees', {
    params: { search, page, limit: 15, role }, deps: [page, role],
  });
  const { data: perf, loading: perfLoading } = useFetch('/employees/performance', { enabled: tab === 'performance' });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const openCreate = () => { setEditing(null); setForm(blank); setErrors({}); setOpen(true); };
  const openEdit = (row) => {
    setEditing(row);
    setForm({ ...blank, ...row, salary: row.salary || '', hire_date: row.hire_date || '' });
    setErrors({});
    setOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      if (editing) {
        const payload = { ...form };
        if (!payload.password) delete payload.password;
        await put(`/employees/${editing.id}`, payload);
        toast.success('Employee updated');
      } else {
        await post('/employees', form);
        toast.success('Employee created');
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
    try { await del(`/employees/${toDelete.id}`); toast.success('Employee deleted'); reload(); }
    catch (err) { toast.error(err.message); }
    finally { setToDelete(null); }
  };

  const columns = [
    {
      key: 'name', header: 'Employee',
      render: (r) => (
        <div className="flex items-center gap-3">
          <Avatar name={r.name} size={34} />
          <div className="min-w-0">
            <p className="truncate font-medium text-slate-800 dark:text-slate-100">{r.name}</p>
            <p className="truncate text-xs text-slate-400">{r.employee_code} · {r.email}</p>
          </div>
        </div>
      ),
    },
    { key: 'role', header: 'Role', render: (r) => <Badge color={roleColor[r.role]}>{roleLabel(r.role)}</Badge> },
    { key: 'designation', header: 'Designation', render: (r) => <span className="text-xs">{r.designation || '—'}</span> },
    { key: 'department', header: 'Department', render: (r) => <span className="text-xs">{r.department || '—'}</span> },
    { key: 'active_leads', header: 'Active leads', align: 'right' },
    { key: 'converted_leads', header: 'Converted', align: 'right', render: (r) => <span className="font-semibold text-emerald-500">{r.converted_leads}</span> },
    { key: 'calls_made', header: 'Calls', align: 'right' },
    { key: 'is_active', header: 'Status', render: (r) => (
      <Badge color={Number(r.is_active) ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}>
        {Number(r.is_active) ? 'Active' : 'Inactive'}
      </Badge>
    ) },
    {
      key: 'actions', header: '', align: 'right', sortable: false,
      render: (r) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Button size="sm" variant="ghost" onClick={() => openEdit(r)}>Edit</Button>
          <Button size="sm" variant="ghost" className="!text-rose-500" onClick={() => setToDelete(r)}>Delete</Button>
        </div>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-[1600px] p-4 sm:p-6">
      <PageHeader title="Employee Management" subtitle="Directory, performance and lead conversion tracking."
        actions={<Button onClick={openCreate}><Plus size={15} /> Add employee</Button>} />

      <Tabs className="mb-5"
        tabs={[{ value: 'directory', label: 'Directory' }, { value: 'performance', label: 'Performance' }]}
        active={tab} onChange={setTab} />

      {tab === 'directory' && (
        <DataTable
          columns={columns}
          rows={data || []}
          loading={loading}
          error={error}
          onRetry={reload}
          search={search}
          onSearch={(v) => { setSearch(v); setPage(1); }}
          searchPlaceholder="Search name, email, code…"
          page={page}
          limit={15}
          total={meta?.total}
          onPage={setPage}
          onRowClick={openEdit}
          emptyTitle="No employees found"
          emptyAction={<Button onClick={openCreate}>Add employee</Button>}
          filters={
            <Select value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }} className="w-44">
              <option value="">All roles</option>
              <option value="admin">Admin</option>
              <option value="employee">Employee</option>
              <option value="developer">Developer</option>
            </Select>
          }
        />
      )}

      {tab === 'performance' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <BarChartCard title="Revenue booked by employee" subtitle="Value of approved leads owned"
                data={(perf || []).map((p) => ({ name: p.name.split(' ')[0], revenue: Number(p.revenue_booked) }))}
                xKey="name" series={[{ key: 'revenue', label: 'Revenue (₹)', color: '#10b981' }]} height={280} />
            </div>
            <Card className="p-5">
              <SectionTitle>Conversion leaderboard</SectionTitle>
              <div className="space-y-3">
                {(perf || []).slice(0, 6).map((p) => (
                  <div key={p.id}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-medium">{p.name}</span>
                      <span className="text-slate-400">{p.conversion_rate}% · {p.converted} won</span>
                    </div>
                    <ProgressBar value={p.conversion_rate} showLabel={false} />
                  </div>
                ))}
                {!(perf || []).length && !perfLoading && <p className="py-6 text-center text-xs text-slate-400">No performance data</p>}
              </div>
            </Card>
          </div>

          <DataTable
            columns={[
              { key: 'name', header: 'Employee', render: (r) => (
                <div className="flex items-center gap-3">
                  <Avatar name={r.name} size={30} />
                  <div>
                    <p className="font-medium">{r.name}</p>
                    <p className="text-xs text-slate-400">{r.designation}</p>
                  </div>
                </div>
              ) },
              { key: 'role', header: 'Role', render: (r) => <Badge color={roleColor[r.role]}>{roleLabel(r.role)}</Badge> },
              { key: 'leads_owned', header: 'Leads', align: 'right' },
              { key: 'leads_converted', header: 'Converted', align: 'right', render: (r) => <span className="font-semibold text-emerald-500">{r.leads_converted}</span> },
              { key: 'conversion_rate', header: 'Conv. rate', align: 'right', render: (r) => `${r.conversion_rate}%` },
              { key: 'calls_made', header: 'Calls', align: 'right' },
              { key: 'call_hours', header: 'Talk hrs', align: 'right' },
              { key: 'followups_done', header: 'Follow-ups', render: (r) => `${r.followups_done}/${r.followups_total}` },
              { key: 'revenue_booked', header: 'Revenue', align: 'right', render: (r) => <span className="font-semibold">₹{Number(r.revenue_booked).toLocaleString('en-IN')}</span> },
            ]}
            rows={perf || []}
            loading={perfLoading}
            emptyTitle="No performance data yet"
          />
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit employee' : 'Add employee'} size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button form="emp-form" type="submit" loading={saving}>{editing ? 'Save' : 'Create'}</Button>
          </>
        }>
        <form id="emp-form" onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Full name" required error={errors.name}>
            <Input value={form.name} onChange={(e) => set('name', e.target.value)} required />
          </Field>
          <Field label="Email" required error={errors.email}>
            <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} required />
          </Field>
          <Field label={editing ? 'New password (optional)' : 'Password'} required={!editing} error={errors.password}>
            <Input type="password" value={form.password} onChange={(e) => set('password', e.target.value)}
              required={!editing} placeholder={editing ? 'Leave blank to keep current' : 'Min 8 characters'} />
          </Field>
          <Field label="Role" required>
            <Select value={form.role} onChange={(e) => set('role', e.target.value)}>
              <option value="employee">Employee</option>
              <option value="developer">Developer</option>
              <option value="admin">Admin</option>
            </Select>
          </Field>
          <Field label="Phone"><Input value={form.phone} onChange={(e) => set('phone', e.target.value)} /></Field>
          <Field label="Designation"><Input value={form.designation} onChange={(e) => set('designation', e.target.value)} placeholder="Sales Manager" /></Field>
          <Field label="Department"><Input value={form.department} onChange={(e) => set('department', e.target.value)} placeholder="Sales" /></Field>
          <Field label="Salary (₹)"><Input type="number" value={form.salary} onChange={(e) => set('salary', e.target.value)} /></Field>
          <Field label="Hire date"><Input type="date" value={form.hire_date} onChange={(e) => set('hire_date', e.target.value)} /></Field>
          {editing && (
            <Field label="Account status">
              <Select value={String(Number(editing.is_active))} onChange={(e) => set('is_active', e.target.value)}>
                <option value="1">Active</option>
                <option value="0">Deactivated</option>
              </Select>
            </Field>
          )}
        </form>
      </Modal>

      <ConfirmDialog open={!!toDelete} onClose={() => setToDelete(null)} onConfirm={remove}
        title="Delete employee?" message={`${toDelete?.name} and all related assignments will be removed.`} />
    </div>
  );
}
