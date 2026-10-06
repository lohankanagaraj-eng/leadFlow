import { useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Users, IndianRupee, Calendar, History, FileText, Plus, Upload,
  Trash2, Send, CheckCircle2, Clock,
} from 'lucide-react';
import { useFetch } from '@/hooks/useFetch';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { patch, post, put, del, uploadFile } from '@/api/client';
import { PageHeader, SectionTitle } from '@/components/Page';
import {
  Button, Card, CardHeader, Badge, Loading, ErrorState, Modal, Field, Input,
  Textarea, Select, Tabs, ProgressBar, Avatar, ConfirmDialog, Spinner,
} from '@/components/ui';
import {
  cn, PROJECT_STATUSES, TASK_STATUSES, projectStatusColor, taskStatusColor, priorityColor,
  currency, compactCurrency,
} from '@/utils/constants';
import { format } from 'date-fns';

const payColor = {
  Unpaid: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
  Partial: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  Paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  Refunded: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
};

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const fileRef = useRef(null);

  const { data: project, loading, error, reload } = useFetch(`/projects/${id}`);
  const { data: developers } = useFetch('/developers', { params: { limit: 200 } });

  const [tab, setTab] = useState('board');
  const [statusOpen, setStatusOpen] = useState(false);
  const [nextStatus, setNextStatus] = useState('');
  const [remark, setRemark] = useState('');
  const [taskOpen, setTaskOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [selectedDevs, setSelectedDevs] = useState([]);
  const [alloc, setAlloc] = useState(100);
  const [busy, setBusy] = useState(false);
  const [comment, setComment] = useState('');
  const [uploading, setUploading] = useState(false);
  const [confirmTask, setConfirmTask] = useState(null);
  const [errors, setErrors] = useState({});

  if (loading) return <div className="p-6"><Loading /></div>;
  if (error) return <div className="p-6"><ErrorState error={error} onRetry={reload} /></div>;
  if (!project) return null;

  const isAdmin = user?.role === 'admin';
  const canEdit = user?.role === 'admin' || user?.role === 'employee';
  const idx = PROJECT_STATUSES.indexOf(project.status);

  const changeStatus = async () => {
    setBusy(true);
    try {
      await patch(`/projects/${id}/status`, { status: nextStatus, remark: remark || null });
      toast.success(`Moved to ${nextStatus}`, 'Status updated');
      setStatusOpen(false); setRemark('');
      reload();
    } catch (err) { toast.error(err.message); } finally { setBusy(false); }
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    const payload = Object.fromEntries(new FormData(e.target).entries());
    try {
      await put(`/projects/${id}`, payload);
      toast.success('Project updated');
      setEditOpen(false);
      reload();
    } catch (err) {
      const map = {};
      (err.errors || []).forEach((x) => { map[x.path] = x.message; });
      setErrors(map);
      toast.error(err.message);
    } finally { setBusy(false); }
  };

  const savePayment = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await put(`/projects/${id}`, { paid_amount: Number(new FormData(e.target).get('paid_amount')) });
      toast.success('Payment recorded');
      setPaymentOpen(false);
      reload();
    } catch (err) { toast.error(err.message); } finally { setBusy(false); }
  };

  const addTask = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    const payload = Object.fromEntries(new FormData(e.target).entries());
    try {
      await post(`/projects/${id}/tasks`, payload);
      toast.success('Task created');
      setTaskOpen(false);
      reload();
    } catch (err) {
      const map = {};
      (err.errors || []).forEach((x) => { map[x.path] = x.message; });
      setErrors(map);
      toast.error(err.message);
    } finally { setBusy(false); }
  };

  const updateTask = async (taskId, body) => {
    try {
      await put(`/projects/tasks/${taskId}`, body);
      reload();
    } catch (err) { toast.error(err.message); }
  };

  const deleteTask = async () => {
    try {
      await del(`/projects/tasks/${confirmTask.id}`);
      toast.success('Task deleted');
      reload();
    } catch (err) { toast.error(err.message); }
    finally { setConfirmTask(null); }
  };

  const assign = async () => {
    if (!selectedDevs.length) return;
    setBusy(true);
    try {
      await patch(`/projects/${id}/assign`, { developer_ids: selectedDevs, allocated_pct: Number(alloc) });
      toast.success('Developers assigned');
      setAssignOpen(false); setSelectedDevs([]);
      reload();
    } catch (err) { toast.error(err.message); } finally { setBusy(false); }
  };

  const unassign = async (devId) => {
    try {
      await del(`/projects/${id}/assign/${devId}`);
      toast.success('Developer removed');
      reload();
    } catch (err) { toast.error(err.message); }
  };

  const postUpdate = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setBusy(true);
    try {
      await post(`/projects/${id}/updates`, { comment });
      setComment('');
      toast.success('Update posted');
      reload();
    } catch (err) { toast.error(err.message); } finally { setBusy(false); }
  };

  const uploadDoc = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('category', 'other');
    try {
      await uploadFile(`/projects/${id}/documents`, fd);
      toast.success(`${file.name} uploaded`);
      reload();
    } catch (err) { toast.error(err.message); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  const deleteDoc = async (docId) => {
    try { await del(`/projects/documents/${docId}`); toast.success('Document deleted'); reload(); }
    catch (err) { toast.error(err.message); }
  };

  const taskColumns = TASK_STATUSES.map((s) => ({ status: s, tasks: (project.tasks || []).filter((t) => t.status === s) }));
  const devAvailable = (developers || []).filter((d) => !project.team?.some((t) => Number(t.developer_id) === Number(d.id)));

  return (
    <div className="mx-auto max-w-[1600px] p-4 sm:p-6">
      <button onClick={() => navigate('/projects')} className="mb-4 flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
        <ArrowLeft size={15} /> Back to projects
      </button>

      <PageHeader
        title={project.title}
        subtitle={`${project.project_code}${project.company_name ? ' · ' + project.company_name : ''}${project.lead_code ? ` · from ${project.lead_code}` : ''}`}
        actions={
          <>
            <Badge color={projectStatusColor[project.status]} className="!px-3 !py-1.5">{project.status}</Badge>
            <Badge color={priorityColor[project.priority]}>{project.priority}</Badge>
            <Badge color={payColor[project.payment_status]}>{project.payment_status}</Badge>
            {canEdit && <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}>Edit</Button>}
            {isAdmin && <Button variant="secondary" size="sm" onClick={() => setPaymentOpen(true)}><IndianRupee size={14} /> Payment</Button>}
            {isAdmin && <Button size="sm" onClick={() => { setNextStatus(project.status); setStatusOpen(true); }}>Change status</Button>}
          </>
        }
      />

      {/* Status pipeline */}
      <Card className="mb-5 overflow-x-auto p-4">
        <div className="flex min-w-[900px] items-center">
          {PROJECT_STATUSES.map((s, i) => {
            const done = i < idx;
            const current = i === idx;
            return (
              <div key={s} className="flex flex-1 items-center last:flex-none">
                <div className="flex flex-col items-center gap-1.5">
                  <div className={cn('flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors',
                    done ? 'bg-emerald-500 text-white' : current ? 'bg-brand-600 text-white ring-4 ring-brand-500/20' : 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-500')}>
                    {done ? <CheckCircle2 size={15} /> : i + 1}
                  </div>
                  <span className={cn('w-20 text-center text-[9px] font-medium leading-tight',
                    current ? 'text-brand-600 dark:text-brand-300' : done ? 'text-slate-600 dark:text-slate-300' : 'text-slate-400')}>
                    {s}
                  </span>
                </div>
                {i < PROJECT_STATUSES.length - 1 && (
                  <div className={cn('mx-1 h-0.5 flex-1', i < idx ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-800')} />
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <div className="mb-5 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Progress</p>
          <div className="mt-2"><ProgressBar value={project.progress} showLabel /></div>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Budget / collected</p>
          <p className="mt-1 text-lg font-bold">{compactCurrency(project.budget)} <span className="text-xs font-normal text-slate-400">/ {compactCurrency(project.paid_amount)}</span></p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Timeline</p>
          <p className="mt-1 text-sm font-semibold">
            {project.start_date ? format(new Date(project.start_date), 'MMM d') : '—'} → {project.deadline ? format(new Date(project.deadline), 'MMM d, yyyy') : '—'}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Team</p>
          <div className="mt-1.5 flex -space-x-2">
            {(project.team || []).map((t) => <Avatar key={t.id} name={t.name} size={26} className="ring-2 ring-white dark:ring-slate-900" />)}
            {!(project.team || []).length && <span className="text-xs text-slate-400">No developers assigned</span>}
            {isAdmin && <button onClick={() => setAssignOpen(true)} className="ml-3 flex h-7 w-7 items-center justify-center rounded-full border border-dashed border-slate-400 text-slate-400 hover:border-brand-500 hover:text-brand-500"><Plus size={13} /></button>}
          </div>
        </Card>
      </div>

      <Tabs className="mb-4"
        tabs={[
          { value: 'board', label: 'Task board', count: (project.tasks || []).length },
          { value: 'team', label: 'Team', count: (project.team || []).length },
          { value: 'updates', label: 'Updates', count: (project.updates || []).length },
          { value: 'documents', label: 'Documents', count: (project.documents || []).length },
          { value: 'history', label: 'History', count: (project.history || []).length },
          { value: 'requirement', label: 'Requirement' },
        ]}
        active={tab} onChange={setTab} />

      {/* ---------------- TASK BOARD ---------------- */}
      {tab === 'board' && (
        <>
          <div className="mb-3 flex justify-end">
            <Button size="sm" onClick={() => setTaskOpen(true)}><Plus size={14} /> New task</Button>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-5">
            {taskColumns.map((col) => (
              <div key={col.status} className="rounded-xl bg-slate-100/70 p-2.5 dark:bg-slate-900/70">
                <div className="mb-2 flex items-center justify-between px-1">
                  <span className="text-xs font-semibold capitalize text-slate-600 dark:text-slate-300">
                    {col.status.replace('_', ' ')}
                  </span>
                  <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-slate-500 dark:bg-slate-800">{col.tasks.length}</span>
                </div>
                <div className="space-y-2">
                  {col.tasks.map((t) => (
                    <div key={t.id} className="group rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-semibold leading-snug text-slate-800 dark:text-slate-100">{t.title}</p>
                        <Badge color={priorityColor[t.priority]}>{t.priority?.[0]}</Badge>
                      </div>
                      {t.description && <p className="mt-1 line-clamp-2 text-[11px] text-slate-500">{t.description}</p>}
                      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] text-slate-400">
                        <Badge>{t.stage}</Badge>
                        {t.assignee_name && <span className="flex items-center gap-1"><Avatar name={t.assignee_name} size={14} />{t.assignee_name.split(' ')[0]}</span>}
                        {t.due_date && <span className={cn(new Date(t.due_date) < new Date() && t.status !== 'done' && 'font-semibold text-rose-500')}>{format(new Date(t.due_date), 'MMM d')}</span>}
                        {Number(t.estimate_hrs) > 0 && <span>{t.logged_hrs}/{t.estimate_hrs}h</span>}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {TASK_STATUSES.filter((s) => s !== t.status).map((s) => (
                          <button key={s} onClick={() => updateTask(t.id, { status: s })}
                            className="rounded border border-slate-200 px-1.5 py-0.5 text-[10px] text-slate-400 opacity-0 transition hover:border-brand-400 hover:text-brand-500 group-hover:opacity-100 dark:border-slate-800">
                            → {s.replace('_', ' ')}
                          </button>
                        ))}
                        <button onClick={() => setConfirmTask(t)}
                          className="rounded border border-transparent px-1.5 py-0.5 text-[10px] text-rose-400 opacity-0 transition hover:bg-rose-50 group-hover:opacity-100 dark:hover:bg-rose-500/10">
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {!col.tasks.length && <p className="px-1 py-4 text-center text-[10px] text-slate-400">Empty</p>}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ---------------- TEAM ---------------- */}
      {tab === 'team' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader title="Assigned developers" action={isAdmin && <Button size="sm" variant="secondary" onClick={() => setAssignOpen(true)}><Plus size={14} /> Assign</Button>} />
            <div className="divide-y divide-slate-100 dark:divide-slate-800/70">
              {!(project.team || []).length && <p className="px-5 py-10 text-center text-sm text-slate-400">No developers assigned yet.</p>}
              {(project.team || []).map((t) => (
                <div key={t.id} className="flex items-center gap-3 px-5 py-4">
                  <Avatar name={t.name} size={38} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{t.name}</p>
                    <p className="truncate text-xs text-slate-400">{t.role_in_project || 'Developer'} · {t.employee_code}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {(t.skills || []).slice(0, 4).map((s) => <Badge key={s}>{s}</Badge>)}
                    </div>
                  </div>
                  <div className="w-28">
                    <p className="mb-1 text-right text-xs font-semibold text-slate-500">{t.allocated_pct}%</p>
                    <ProgressBar value={t.allocated_pct} />
                  </div>
                  {isAdmin && (
                    <Button size="sm" variant="ghost" className="!text-rose-500" onClick={() => unassign(t.developer_id)}>Remove</Button>
                  )}
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="Team workload" subtitle="Tasks by assignee" />
            <div className="space-y-4 p-5">
              {(project.team || []).map((t) => {
                const tasks = (project.tasks || []).filter((x) => x.assignee_id === t.developer_id);
                const done = tasks.filter((x) => x.status === 'done').length;
                return (
                  <div key={t.id}>
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <span className="font-medium">{t.name}</span>
                      <span className="text-slate-400">{done}/{tasks.length} tasks</span>
                    </div>
                    <ProgressBar value={tasks.length ? (done / tasks.length) * 100 : 0} showLabel />
                  </div>
                );
              })}
              {!(project.team || []).length && <p className="py-6 text-center text-xs text-slate-400">Assign developers to see workload.</p>}
            </div>
          </Card>
        </div>
      )}

      {/* ---------------- UPDATES ---------------- */}
      {tab === 'updates' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader title="Project timeline" />
            <form onSubmit={postUpdate} className="border-b border-slate-200 p-4 dark:border-slate-800">
              <Textarea value={comment} onChange={(e) => setComment(e.target.value)}
                placeholder="Post a progress update or blocker…" className="!min-h-[70px]" />
              <div className="mt-2 flex justify-end">
                <Button type="submit" size="sm" loading={busy} disabled={!comment.trim()}>
                  <Send size={13} /> Post update
                </Button>
              </div>
            </form>
            <div className="divide-y divide-slate-100 dark:divide-slate-800/70">
              {!(project.updates || []).length && <p className="px-5 py-10 text-center text-sm text-slate-400">No updates yet.</p>}
              {(project.updates || []).map((u) => (
                <div key={u.id} className="flex gap-3 px-5 py-4">
                  <Avatar name={u.author_name} size={30} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs font-semibold">{u.author_name}</p>
                      <Badge className="capitalize">{u.author_role}</Badge>
                      {u.status_to && <Badge color={projectStatusColor[u.status_to]}>{u.status_from ? `${u.status_from} → ` : ''}{u.status_to}</Badge>}
                      <span className="text-[10px] text-slate-400">{format(new Date(u.created_at), 'MMM d, HH:mm')}</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{u.comment}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="Payment status" action={isAdmin && <Button size="sm" variant="ghost" onClick={() => setPaymentOpen(true)}>Update</Button>} />
            <div className="space-y-3 p-5 text-sm">
              <Row label="Contract budget" value={currency(project.budget)} />
              <Row label="Collected" value={currency(project.paid_amount)} accent="text-emerald-500" />
              <Row label="Outstanding" value={currency(Number(project.budget || 0) - Number(project.paid_amount || 0))} accent="text-amber-500" />
              <Row label="Status" value={<Badge color={payColor[project.payment_status]}>{project.payment_status}</Badge>} />
              <div className="pt-2">
                <ProgressBar value={project.budget ? Math.round((project.paid_amount / project.budget) * 100) : 0} showLabel />
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ---------------- DOCUMENTS ---------------- */}
      {tab === 'documents' && (
        <Card>
          <CardHeader title="Documents" action={
            <>
              <input ref={fileRef} type="file" className="hidden" onChange={uploadDoc} />
              <Button size="sm" onClick={() => fileRef.current?.click()} loading={uploading}>
                <Upload size={14} /> Upload
              </Button>
            </>
          } />
          <div className="divide-y divide-slate-100 dark:divide-slate-800/70">
            {!(project.documents || []).length && (
              <p className="px-5 py-12 text-center text-sm text-slate-400">No documents uploaded. Attach requirements, designs, invoices or QA reports.</p>
            )}
            {(project.documents || []).map((d) => (
              <div key={d.id} className="flex items-center gap-3 px-5 py-3.5">
                <FileText size={16} className="text-slate-400" />
                <div className="min-w-0 flex-1">
                  <a href={d.file_path} target="_blank" rel="noreferrer" className="truncate text-sm font-medium text-brand-500 hover:underline">{d.original_name}</a>
                  <p className="text-[11px] text-slate-400">{d.category} · {(d.size_bytes / 1024).toFixed(1)} KB</p>
                </div>
                <Button size="sm" variant="ghost" className="!text-rose-500" onClick={() => deleteDoc(d.id)}><Trash2 size={13} /></Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ---------------- HISTORY ---------------- */}
      {tab === 'history' && (
        <Card>
          <CardHeader title="Status history" />
          <div className="p-5">
            <ol className="relative ml-3 border-l border-slate-200 dark:border-slate-800">
              {(project.history || []).map((h) => (
                <li key={h.id} className="mb-5 ml-5">
                  <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full bg-brand-500 ring-4 ring-brand-500/15" />
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {h.from_status ? `${h.from_status} → ` : ''}{h.to_status}
                  </p>
                  <p className="text-xs text-slate-400">
                    {h.changed_by_name || 'System'} · {format(new Date(h.created_at), 'MMM d, yyyy HH:mm')}
                  </p>
                  {h.remark && <p className="mt-0.5 text-xs text-slate-500">{h.remark}</p>}
                </li>
              ))}
              {!(project.history || []).length && <li className="text-sm text-slate-400">No history.</li>}
            </ol>
          </div>
        </Card>
      )}

      {/* ---------------- REQUIREMENT ---------------- */}
      {tab === 'requirement' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader title="Source lead" subtitle={project.lead_code ? <Link to={`/leads/${project.lead_id}`} className="text-brand-500 hover:underline">Open {project.lead_code}</Link> : 'Manually created project'} />
            <div className="space-y-4 p-5 text-sm">
              <Row label="Lead contact" value={project.lead_contact || '—'} />
              <Row label="Service type" value={project.service_type || '—'} />
              <Row label="Company" value={project.company_name || '—'} />
              <Row label="Company email" value={project.company_email || '—'} />
              <Row label="Company phone" value={project.company_phone || '—'} />
            </div>
          </Card>
          <Card>
            <CardHeader title="Requirement brief" />
            <div className="p-5">
              <p className="whitespace-pre-wrap rounded-lg bg-slate-50 p-4 text-sm text-slate-600 dark:bg-slate-800/50 dark:text-slate-300">
                {project.description || project.lead_requirement || 'No requirement documented yet.'}
              </p>
            </div>
          </Card>
        </div>
      )}

      {/* ---------- Modals ---------- */}
      <Modal open={statusOpen} onClose={() => setStatusOpen(false)} title="Change project status"
        description="Status changes are written to project history and notify the team."
        footer={
          <>
            <Button variant="secondary" onClick={() => setStatusOpen(false)}>Cancel</Button>
            <Button loading={busy} onClick={changeStatus} disabled={nextStatus === project.status}>Update status</Button>
          </>
        }>
        <div className="space-y-4">
          <Field label="New status" required>
            <Select value={nextStatus} onChange={(e) => setNextStatus(e.target.value)}>
              {PROJECT_STATUSES.map((s) => <option key={s}>{s}</option>)}
            </Select>
          </Field>
          <Field label="Remark"><Textarea value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="Why is this changing?" /></Field>
        </div>
      </Modal>

      <Modal open={taskOpen} onClose={() => setTaskOpen(false)} title="New task"
        footer={
          <>
            <Button variant="secondary" onClick={() => setTaskOpen(false)}>Cancel</Button>
            <Button form="task-form" type="submit" loading={busy}>Create task</Button>
          </>
        }>
        <form id="task-form" onSubmit={addTask} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Title" required error={errors.title}><Input name="title" required placeholder="Build checkout flow" /></Field>
          </div>
          <Field label="Stage">
            <Select name="stage" defaultValue="Development">
              {PROJECT_STATUSES.slice(1, -1).map((s) => <option key={s}>{s}</option>)}
            </Select>
          </Field>
          <Field label="Priority">
            <Select name="priority" defaultValue={project.priority}>
              {['Low', 'Medium', 'High', 'Urgent'].map((p) => <option key={p}>{p}</option>)}
            </Select>
          </Field>
          <Field label="Assign to">
            <Select name="assignee_id" defaultValue="">
              <option value="">— Unassigned —</option>
              {(project.team || []).map((t) => <option key={t.developer_id} value={t.developer_id}>{t.name}</option>)}
            </Select>
          </Field>
          <Field label="Estimate (hrs)"><Input type="number" name="estimate_hrs" min={0} step={0.5} /></Field>
          <Field label="Start date"><Input type="date" name="start_date" /></Field>
          <Field label="Due date"><Input type="date" name="due_date" /></Field>
          <div className="sm:col-span-2">
            <Field label="Description"><Textarea name="description" /></Field>
          </div>
        </form>
      </Modal>

      <Modal open={assignOpen} onClose={() => setAssignOpen(false)} title="Assign developers"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAssignOpen(false)}>Cancel</Button>
            <Button loading={busy} onClick={assign} disabled={!selectedDevs.length}>Assign</Button>
          </>
        }>
        <div className="space-y-3">
          <Field label="Allocation (% of capacity)">
            <Input type="number" min={5} max={100} value={alloc} onChange={(e) => setAlloc(e.target.value)} />
          </Field>
          <p className="label">Select developers</p>
          <div className="space-y-2">
            {devAvailable.map((d) => (
              <label key={d.id}
                className={cn('flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition',
                  selectedDevs.includes(d.id) ? 'border-brand-500 bg-brand-500/5' : 'border-slate-200 dark:border-slate-800')}>
                <input type="checkbox" className="accent-brand-600"
                  checked={selectedDevs.includes(d.id)}
                  onChange={() => setSelectedDevs((s) => s.includes(d.id) ? s.filter((x) => x !== d.id) : [...s, d.id])} />
                <Avatar name={d.name} size={28} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{d.name}</p>
                  <p className="truncate text-xs text-slate-400">{(d.skills || []).slice(0, 3).join(', ') || 'No skills listed'}</p>
                </div>
                <Badge color={d.availability === 'available' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'}>
                  {d.availability?.replace('_', ' ')}
                </Badge>
              </label>
            ))}
            {!devAvailable.length && <p className="py-6 text-center text-sm text-slate-400">All developers are already on this project.</p>}
          </div>
        </div>
      </Modal>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit project"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button form="edit-proj" type="submit" loading={busy}>Save</Button>
          </>
        }>
        <form id="edit-proj" onSubmit={saveEdit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><Field label="Title" required><Input name="title" defaultValue={project.title} required /></Field></div>
          <Field label="Priority">
            <Select name="priority" defaultValue={project.priority}>
              {['Low', 'Medium', 'High', 'Urgent'].map((p) => <option key={p}>{p}</option>)}
            </Select>
          </Field>
          <Field label="Service type"><Input name="service_type" defaultValue={project.service_type || ''} /></Field>
          <Field label="Budget (₹)"><Input type="number" name="budget" defaultValue={project.budget || ''} /></Field>
          <Field label="Start date"><Input type="date" name="start_date" defaultValue={project.start_date?.slice(0, 10) || ''} /></Field>
          <Field label="Deadline"><Input type="date" name="deadline" defaultValue={project.deadline?.slice(0, 10) || ''} /></Field>
          <Field label="End date"><Input type="date" name="end_date" defaultValue={project.end_date?.slice(0, 10) || ''} /></Field>
          <div className="sm:col-span-2"><Field label="Description"><Textarea name="description" defaultValue={project.description || ''} /></Field></div>
        </form>
      </Modal>

      <Modal open={paymentOpen} onClose={() => setPaymentOpen(false)} title="Record payment"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPaymentOpen(false)}>Cancel</Button>
            <Button form="pay-form" type="submit" loading={busy}>Save</Button>
          </>
        }>
        <form id="pay-form" onSubmit={savePayment} className="space-y-4">
          <div className="rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-800/60">
            <div className="flex justify-between"><span className="text-slate-500">Budget</span><span className="font-semibold">{currency(project.budget)}</span></div>
            <div className="mt-1 flex justify-between"><span className="text-slate-500">Already collected</span><span className="font-semibold text-emerald-500">{currency(project.paid_amount)}</span></div>
          </div>
          <Field label="Total collected amount (₹)" required>
            <Input type="number" name="paid_amount" min={0} defaultValue={project.paid_amount} required />
          </Field>
          <p className="text-xs text-slate-400">Payment status is derived automatically (Unpaid → Partial → Paid).</p>
        </form>
      </Modal>

      <ConfirmDialog open={!!confirmTask} onClose={() => setConfirmTask(null)} onConfirm={deleteTask}
        title="Delete task?" message={confirmTask?.title} />
    </div>
  );
}

function Row({ label, value, accent }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-slate-500">{label}</span>
      <span className={cn('font-semibold text-slate-800 dark:text-slate-100', accent)}>{value}</span>
    </div>
  );
}
