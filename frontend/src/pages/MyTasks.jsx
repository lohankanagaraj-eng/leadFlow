import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Phone, MapPin, Hash, PhoneCall, ExternalLink, CheckCircle2, ListChecks, FolderKanban, Timer, IndianRupee } from 'lucide-react';
import { useFetch } from '@/hooks/useFetch';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { put, post } from '@/api/client';
import { PageHeader } from '@/components/Page';
import { Card, Badge, Select, StatCard, Loading, ErrorState, EmptyState, Modal, Field, Input, Textarea, Button, ProgressBar } from '@/components/ui';
import { cn, taskStatusColor, priorityColor, leadStatusColor, compactCurrency, TASK_STATUSES } from '@/utils/constants';
import { format } from 'date-fns';

const LEAD_BOARD_STATUSES = ['New', 'Assigned', 'Contacted', 'Follow Up', 'Qualified'];

export default function MyTasks() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const [status, setStatus] = useState('');

  const { data: projects, reload } = useFetch('/projects', { params: { limit: 100 } });
  const { data: leads, loading, error, reload: reloadLeads } = useFetch('/leads', { params: { limit: 200 } });

  const [callOpen, setCallOpen] = useState(false);
  const [callLead, setCallLead] = useState(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const isLeadWorker = user?.role === 'admin' || user?.role === 'employee';

  const tasks = useMemo(() => {
    const all = [];
    (projects || []).forEach((p) => (p.tasks || []).forEach((t) => all.push({ ...t, project_code: p.project_code, project_id: p.id, project_title: p.title })));
    return all.filter((t) => !status || t.status === status)
      .sort((a, b) => new Date(a.due_date || '2999-01-01') - new Date(b.due_date || '2999-01-01'));
  }, [projects, status]);

  const leadRows = (leads || []).filter((l) => !status || l.status === status);
  const leadColumns = LEAD_BOARD_STATUSES.map((s) => ({ status: s, rows: leadRows.filter((l) => l.status === s) }));
  const doneTasks = tasks.filter((t) => t.status === 'done').length;
  const estValue = leadRows.reduce((a, l) => a + Number(l.expected_value || l.budget || 0), 0);

  const move = async (taskId, next) => {
    try {
      await put(`/projects/tasks/${taskId}`, { status: next });
      toast.success(`Moved to ${next.replace('_', ' ')}`);
      reload();
    } catch (err) { toast.error(err.message); }
  };

  const quickCall = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    const payload = Object.fromEntries(new FormData(e.target).entries());
    payload.lead_id = callLead?.id;
    try {
      await post('/crm/calls', payload);
      toast.success('Call logged', `${callLead?.company_name || callLead?.contact_name} moved forward`);
      setCallOpen(false);
      reloadLeads();
    } catch (err) {
      const map = {};
      (err.errors || []).forEach((x) => { map[x.path] = x.message; });
      setErrors(map);
      toast.error(err.errors?.length ? Object.values(map).join(', ') : err.message);
    } finally { setSaving(false); }
  };

  if (loading && !leads) return <div className="p-6"><Loading /></div>;
  if (error && !leads) return <div className="p-6"><ErrorState error={error} onRetry={reloadLeads} /></div>;

  return (
    <div className="mx-auto max-w-[1600px] p-4 sm:p-6">
      <PageHeader
        title={isLeadWorker ? 'Task Board' : 'Task Board'}
        subtitle={isLeadWorker
          ? 'Company leads assigned to call — company ID, name, place, location & phone. Log the call to advance the task.'
          : `Assigned development work · ${user?.name}`}
        actions={
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-44">
            <option value="">All statuses</option>
            {isLeadWorker
              ? LEAD_BOARD_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)
              : TASK_STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </Select>
        } />

      {/* ---------- stat cards ---------- */}
      {isLeadWorker ? (
        <div className="mb-5 grid grid-cols-2 gap-4 xl:grid-cols-4">
          <StatCard title="Assigned leads" value={(leads || []).length} icon={ListChecks} tone="brand" />
          <StatCard title="Called / worked" value={(leads || []).filter((l) => l.status !== 'New' && l.status !== 'Assigned').length} icon={CheckCircle2} tone="emerald" />
          <StatCard title="Companies" value={new Set((leads || []).map((l) => l.company_id).filter(Boolean)).size} icon={FolderKanban} tone="violet" />
          <StatCard title="Est. value" value={compactCurrency(estValue)} icon={IndianRupee} tone="sky" />
        </div>
      ) : (
        <div className="mb-5 grid grid-cols-2 gap-4 xl:grid-cols-4">
          <StatCard title="Tasks" value={tasks.length} icon={ListChecks} tone="brand" />
          <StatCard title="Completed" value={doneTasks} icon={CheckCircle2} tone="emerald" />
          <StatCard title="In progress" value={tasks.filter((t) => t.status === 'in_progress').length} icon={Timer} tone="sky" />
          <StatCard title="Projects" value={new Set(tasks.map((t) => t.project_id)).size} icon={FolderKanban} tone="violet" />
        </div>
      )}

      {/* ---------- COMPANY-LEAD KANBAN BOARD ---------- */}
      {isLeadWorker ? (
        !leadRows.length ? (
          <Card><EmptyState title="No company leads" description="Leads assigned to you will appear here as call tasks." /></Card>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
            {leadColumns.map((col) => (
              <div key={col.status} className="rounded-xl bg-slate-100/70 p-2.5 dark:bg-slate-900/70">
                <div className="mb-2 flex items-center justify-between px-1">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{col.status}</span>
                  <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-slate-500 dark:bg-slate-800">{col.rows.length}</span>
                </div>
                <div className="space-y-2">
                  {col.rows.map((l) => (
                    <div key={l.id} className="group rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold text-slate-800 dark:text-slate-100">{l.company_name || '—'}</p>
                          <p className="mt-0.5 flex items-center gap-1 text-[10px] text-slate-400">
                            <Hash size={10} /> {l.company_code || 'No company'} · {l.lead_code}
                          </p>
                        </div>
                        <Badge color={priorityColor[l.priority]}>{l.priority?.[0]}</Badge>
                      </div>

                      <dl className="mt-2 space-y-1 text-[10px] text-slate-500">
                        <Row icon={Building2} label="Place">{l.company_city || '—'}</Row>
                        <Row icon={MapPin} label="Location"><span className="line-clamp-1">{l.company_address || '—'}</span></Row>
                        <Row icon={Phone} label="Phone">
                          <span className="font-semibold text-slate-600 dark:text-slate-300">{l.company_phone || '—'}</span>
                        </Row>
                      </dl>
                      <p className="mt-2 flex items-center gap-1 text-[10px] text-slate-400"><Building2 size={10} /> {l.contact_name}</p>

                      <div className="mt-2 flex gap-1.5">
                        <Button size="xs" className="flex-1" onClick={() => { setCallLead(l); setCallOpen(true); }}>
                          <PhoneCall size={11} /> Call
                        </Button>
                        <Button size="xs" variant="secondary" onClick={() => navigate(`/leads/${l.id}`)}>
                          <ExternalLink size={11} />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {!col.rows.length && <p className="px-1 py-4 text-center text-[10px] text-slate-400">Empty</p>}
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* ---------- DEVELOPER TASK LIST ---------- */
        !tasks.length ? (
          <Card><EmptyState title="No tasks" description="Tasks assigned to you will appear here." /></Card>
        ) : (
          <div className="space-y-3">
            {tasks.map((t) => (
              <Card key={t.id} className="card-hover p-4">
                <div className="flex flex-wrap items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{t.title}</p>
                      <Badge color={priorityColor[t.priority]}>{t.priority}</Badge>
                      <Badge color={taskStatusColor[t.status]}>{t.status.replace('_', ' ')}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                      <button onClick={() => navigate(`/projects/${t.project_id}`)} className="text-brand-500 hover:underline">{t.project_code}</button>
                      {' · '}{t.project_title} · {t.stage}
                    </p>
                    {t.description && <p className="mt-1 line-clamp-2 text-xs text-slate-500">{t.description}</p>}
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                      {t.due_date && (
                        <span className={cn(new Date(t.due_date) < new Date() && t.status !== 'done' && 'font-semibold text-rose-500')}>
                          Due {format(new Date(t.due_date), 'MMM d, yyyy')}
                        </span>
                      )}
                      <span>{t.logged_hrs}/{t.estimate_hrs || 0} hrs</span>
                    </div>
                    <div className="mt-2 max-w-xs">
                      <ProgressBar value={t.status === 'done' ? 100 : t.status === 'in_progress' ? 50 : 0} showLabel />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {TASK_STATUSES.filter((s) => s !== t.status).map((s) => (
                      <button key={s} onClick={() => move(t.id, s)}
                        className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-medium text-slate-500 transition hover:border-brand-400 hover:text-brand-500 dark:border-slate-800">
                        → {s.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )
      )}

      {/* ---------- quick call modal ---------- */}
      <Modal open={callOpen} onClose={() => setCallOpen(false)}
        title={`Call ${callLead?.company_name || callLead?.contact_name || 'lead'}`}
        description={callLead ? `${callLead.company_code || 'No company'} · ${callLead.lead_code} · ${callLead.contact_name}` : ''}
        footer={
          <>
            <Button variant="secondary" onClick={() => setCallOpen(false)}>Cancel</Button>
            <Button form="quick-call" type="submit" loading={saving}>Save call &amp; advance task</Button>
          </>
        }>
        <form id="quick-call" onSubmit={quickCall} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500 sm:col-span-2 dark:bg-slate-800/60">
            Dialing <span className="font-semibold text-slate-700 dark:text-slate-200">{callLead?.company_phone || callLead?.phone || 'no phone on record'}</span> ·
            {callLead?.company_city || callLead?.company_address ? ` ${callLead.company_city || callLead.company_address}` : ' location unknown'}.
          </div>
          <Field label="Call status">
            <Select name="call_status" defaultValue="connected">
              {['connected', 'no_answer', 'busy', 'voicemail', 'failed'].map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </Select>
          </Field>
          <Field label="Duration (seconds)"><Input type="number" name="duration_sec" min={0} defaultValue={300} /></Field>
          <Field label="Outcome"><Input name="outcome" placeholder="Interested, Not now…" /></Field>
          <Field label="Schedule follow-up (days)"><Input type="number" name="followup_after_days" min={1} max={90} /></Field>
          <div className="sm:col-span-2"><Field label="Summary"><Textarea name="summary" placeholder="What did you collect from this call?" /></Field></div>
          <div className="sm:col-span-2"><Field label="Next step"><Input name="next_step" /></Field></div>
        </form>
      </Modal>
    </div>
  );
}

function Row({ icon: Icon, label, children }) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon size={11} className="shrink-0 text-slate-400" />
      <span className="w-12 shrink-0 text-slate-400">{label}</span>
      <span className="min-w-0 flex-1">{children}</span>
    </div>
  );
}