import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Building2, Mail, Phone, Globe, CheckCircle2, PhoneCall,
  CalendarClock, UserCheck, FolderKanban, Sparkles, Pencil, Trash2, UserPlus, XCircle,
} from 'lucide-react';
import { useFetch } from '@/hooks/useFetch';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { patch, post, del, put } from '@/api/client';
import { PageHeader, SectionTitle } from '@/components/Page';
import {
  Button, Card, CardHeader, Badge, Loading, ErrorState, Modal, Field, Input,
  Textarea, Select, Tabs, ProgressBar, Avatar, ConfirmDialog,
} from '@/components/ui';
import {
  cn, LEAD_STATUSES, LEAD_SOURCES, SERVICE_INTERESTS, leadStatusColor, priorityColor,
  currency, compactCurrency, formatDuration,
} from '@/utils/constants';
import { format } from 'date-fns';

export default function LeadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();

  const { data: lead, loading, error, reload, setData } = useFetch(`/leads/${id}`);
  const { data: employees } = useFetch('/employees', { params: { limit: 100, status: 'active' }, enabled: user?.role === 'admin' });
  const { data: companies } = useFetch('/companies', { params: { limit: 100 } }, []);

  const [tab, setTab] = useState('overview');
  const [statusOpen, setStatusOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [remark, setRemark] = useState('');
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignTo, setAssignTo] = useState('');
  const [callOpen, setCallOpen] = useState(false);
  const [fuOpen, setFuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({});

  useEffect(() => { if (lead) { setNewStatus(lead.status); setForm({
    contact_name: lead.contact_name, email: lead.email || '', phone: lead.phone || '',
    designation: lead.designation || '', company_id: lead.company_id || '',
    source: lead.source, priority: lead.priority, expected_value: lead.expected_value || '',
    budget: lead.budget || '', requirement: lead.requirement || '', notes: lead.notes || '',
    website_url: lead.website_url || '',
    service_interest: Array.isArray(lead.service_interest) ? lead.service_interest : [],
  }); } }, [lead]);

  if (loading) return <div className="p-6"><Loading /></div>;
  if (error) return <div className="p-6"><ErrorState error={error} onRetry={reload} /></div>;
  if (!lead) return null;

  const isAdmin = user?.role === 'admin';
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const changeStatus = async () => {
    setBusy(true);
    try {
      const res = await patch(`/leads/${id}/status`, { status: newStatus, remark: remark || null });
      setData((d) => ({ ...d, lead: res.data.lead }));
      if (res.data.autoCreated) {
        toast.success(`${res.data.lead.status} — project ${res.data.project.project_code} created automatically!`, 'Lead approved');
        navigate(`/projects/${res.data.project.id}`);
      } else {
        toast.success(`Status changed to ${newStatus}`, 'Lead updated');
      }
      setStatusOpen(false);
      setRemark('');
      reload();
    } catch (err) {
      toast.error(err.message, 'Status change failed');
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (status, successMsg) => {
    setBusy(true);
    try {
      const res = await patch(`/leads/${id}/status`, { status });
      setData((d) => ({ ...d, lead: res.data.lead }));
      if (res.data.autoCreated) {
        toast.success(`${res.data.lead.status} — project ${res.data.project.project_code} created automatically!`, 'Lead accepted');
        navigate(`/projects/${res.data.project.id}`);
      } else {
        toast.success(successMsg, 'Lead updated');
      }
      setRemark('');
      reload();
    } catch (err) {
      toast.error(err.message, status === 'Approved' ? 'Could not accept' : 'Could not reject');
    } finally {
      setBusy(false);
    }
  };

  const assign = async () => {
    if (!assignTo) return;
    setBusy(true);
    try {
      await patch(`/leads/${id}/assign`, { employee_id: Number(assignTo) });
      toast.success('Lead assigned', 'Owner updated');
      setAssignOpen(false);
      reload();
    } catch (err) { toast.error(err.message); } finally { setBusy(false); }
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await put(`/leads/${id}`, form);
      toast.success('Lead updated');
      setEditOpen(false);
      reload();
    } catch (err) {
      const map = {};
      (err.errors || []).forEach((x) => { map[x.path] = x.message; });
      toast.error(err.errors?.length ? Object.values(map).join(', ') : err.message);
    } finally { setBusy(false); }
  };

  const addCall = async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    setBusy(true);
    try {
      await post('/crm/calls', Object.fromEntries(f.entries()));
      toast.success('Call logged');
      setCallOpen(false);
      reload();
    } catch (err) { toast.error(err.message); } finally { setBusy(false); }
  };

  const addFollowup = async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    setBusy(true);
    try {
      await post('/crm/followups', Object.fromEntries(f.entries()));
      toast.success('Follow-up scheduled');
      setFuOpen(false);
      reload();
    } catch (err) { toast.error(err.message); } finally { setBusy(false); }
  };

  const remove = async () => {
    setBusy(true);
    try { await del(`/leads/${id}`); toast.success('Lead deleted'); navigate('/leads'); }
    catch (err) { toast.error(err.message); } finally { setBusy(false); setConfirmDel(false); }
  };

  const owner = lead.assignments?.find((a) => Number(a.is_active) === 1);

  return (
    <div className="mx-auto max-w-[1400px] p-4 sm:p-6">
      <button onClick={() => navigate('/leads')} className="mb-4 flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
        <ArrowLeft size={15} /> Back to leads
      </button>

      <PageHeader
        title={lead.contact_name}
        subtitle={`${lead.lead_code} · ${lead.company_name || 'No company linked'}`}
        actions={
          <>
            <Badge color={leadStatusColor[lead.status]} className="!text-xs !px-3 !py-1.5">{lead.status}</Badge>
            <Badge color={priorityColor[lead.priority]}>{lead.priority}</Badge>
            {!['Approved', 'Rejected', 'Lost'].includes(lead.status) && (
              <>
                <Button variant="danger" size="sm" loading={busy} onClick={() => setStatus('Rejected', 'Lead rejected')}>
                  <XCircle size={14} /> Reject
                </Button>
                <Button variant="success" size="sm" loading={busy} onClick={() => setStatus('Approved', 'Lead accepted')}>
                  <CheckCircle2 size={14} /> Accept
                </Button>
              </>
            )}
            <Button variant="secondary" size="sm" onClick={() => setAssignOpen(true)}><UserPlus size={14} /> Assign</Button>
            <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}><Pencil size={14} /> Edit</Button>
            <Button size="sm" onClick={() => setStatusOpen(true)}>Change status</Button>
            {isAdmin && <Button variant="danger" size="sm" onClick={() => setConfirmDel(true)}><Trash2 size={14} /></Button>}
          </>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Expected value</p>
          <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{compactCurrency(lead.expected_value)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Owner</p>
          <div className="mt-1.5 flex items-center gap-2">
            <Avatar name={owner?.name || '?'} size={26} />
            <p className="truncate text-sm font-semibold">{owner?.name || 'Unassigned'}</p>
          </div>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Calls / Follow-ups</p>
          <p className="mt-1 text-xl font-bold">{(lead.calls || []).length} <span className="text-sm font-normal text-slate-400">/ {(lead.followups || []).length}</span></p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Linked project</p>
          {lead.project ? (
            <Link to={`/projects/${lead.project.id}`} className="mt-1 block text-sm font-semibold text-brand-500 hover:underline">
              {lead.project.project_code} · {lead.project.progress}%
            </Link>
          ) : (
            <p className="mt-1 text-sm font-semibold text-slate-500">Not converted yet</p>
          )}
        </Card>
      </div>

      <Tabs active={tab} onChange={setTab} className="mb-4"
        tabs={[
          { value: 'overview', label: 'Overview' },
          { value: 'calls', label: 'Calls', count: (lead.calls || []).length },
          { value: 'followups', label: 'Follow-Ups', count: (lead.followups || []).length },
          { value: 'activity', label: 'Assignment history', count: (lead.assignments || []).length },
        ]} />

      {tab === 'overview' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader title="Lead details" action={
              <span className="text-xs text-slate-400">Created {format(new Date(lead.created_at), 'MMM d, yyyy')}</span>
            } />
            <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2">
              <InfoRow icon={Mail} label="Email" value={lead.email} />
              <InfoRow icon={Phone} label="Phone" value={lead.phone} />
              <InfoRow icon={Building2} label="Company" value={lead.company_name} />
              <InfoRow icon={Globe} label="Website" value={lead.website_url} />
              <InfoRow icon={UserCheck} label="Designation" value={lead.designation} />
              <InfoRow icon={Sparkles} label="Source" value={lead.source?.replace('_', ' ')} />
              <div className="sm:col-span-2">
                <p className="label">Services interested in</p>
                <div className="flex flex-wrap gap-1.5">
                  {(lead.service_interest || []).length
                    ? lead.service_interest.map((s) => <Badge key={s} color="bg-brand-500/10 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">{s}</Badge>)
                    : <span className="text-xs text-slate-400">None specified</span>}
                </div>
              </div>
              <div className="sm:col-span-2">
                <p className="label">Requirement</p>
                <p className="whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm text-slate-600 dark:bg-slate-800/50 dark:text-slate-300">
                  {lead.requirement || 'No requirement captured yet.'}
                </p>
              </div>
              {lead.notes && (
                <div className="sm:col-span-2">
                  <p className="label">Internal notes</p>
                  <p className="whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">{lead.notes}</p>
                </div>
              )}
            </div>
          </Card>

          <div className="space-y-4">
            <Card className="p-5">
              <SectionTitle>Workflow progress</SectionTitle>
              <div className="space-y-2.5">
                {LEAD_STATUSES.slice(0, 6).map((s, i) => {
                  const idx = LEAD_STATUSES.indexOf(lead.status);
                  const done = i < idx;
                  const current = i === idx;
                  return (
                    <div key={s} className="flex items-center gap-3">
                      <div className={cn('flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold',
                        done ? 'bg-emerald-500 text-white' : current ? 'bg-brand-600 text-white' : 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-500')}>
                        {done ? '✓' : i + 1}
                      </div>
                      <span className={cn('text-xs font-medium', current ? 'text-brand-600 dark:text-brand-300' : done ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400')}>
                        {s}
                      </span>
                    </div>
                  );
                })}
              </div>
              <Button className="mt-5 w-full" onClick={() => setStatusOpen(true)}>Change status</Button>
              <p className="mt-2 text-center text-[11px] text-slate-400">
                Accept auto-generates the project record.
              </p>
            </Card>

            <Card className="p-5">
              <SectionTitle>Budget</SectionTitle>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Client budget</span><span className="font-semibold">{currency(lead.budget)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Expected value</span><span className="font-semibold text-emerald-500">{currency(lead.expected_value)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Currency</span><span className="font-medium">{lead.currency}</span></div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {tab === 'calls' && (
        <Card>
          <CardHeader title="Call log" action={<Button size="sm" onClick={() => setCallOpen(true)}><PhoneCall size={14} /> Log call</Button>} />
          <div className="divide-y divide-slate-100 dark:divide-slate-800/70">
            {!(lead.calls || []).length && <p className="px-5 py-10 text-center text-sm text-slate-400">No calls logged for this lead yet.</p>}
            {(lead.calls || []).map((c) => (
              <div key={c.id} className="flex items-start gap-4 px-5 py-4">
                <div className={cn('mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg',
                  c.call_status === 'connected' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-100 text-slate-400 dark:bg-slate-800')}>
                  <PhoneCall size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold">{c.employee_name}</p>
                    <Badge>{c.direction}</Badge>
                    <Badge color={c.call_status === 'connected' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800'}>{c.call_status}</Badge>
                    {c.outcome && <Badge color="bg-brand-500/10 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">{c.outcome}</Badge>}
                  </div>
                  {c.summary && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{c.summary}</p>}
                  {c.next_step && <p className="mt-1 text-xs text-amber-500">Next: {c.next_step}</p>}
                </div>
                <div className="text-right text-xs text-slate-400">
                  <p>{format(new Date(c.started_at), 'MMM d, HH:mm')}</p>
                  <p className="mt-0.5">{formatDuration(c.duration_sec)}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === 'followups' && (
        <Card>
          <CardHeader title="Follow-ups" action={<Button size="sm" onClick={() => setFuOpen(true)}><CalendarClock size={14} /> Schedule</Button>} />
          <div className="divide-y divide-slate-100 dark:divide-slate-800/70">
            {!(lead.followups || []).length && <p className="px-5 py-10 text-center text-sm text-slate-400">No follow-ups scheduled.</p>}
            {(lead.followups || []).map((f) => (
              <div key={f.id} className="flex items-center gap-4 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{f.subject}</p>
                  <p className="text-xs text-slate-400">{f.owner_name} · {f.type}</p>
                  {f.notes && <p className="mt-1 text-xs text-slate-500">{f.notes}</p>}
                </div>
                <Badge color={
                  f.status === 'done' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                    : f.status === 'cancelled' ? 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                      : new Date(f.due_at) < new Date() ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'}>
                  {f.status}
                </Badge>
                <span className="w-32 text-right text-xs text-slate-400">{format(new Date(f.due_at), 'MMM d, HH:mm')}</span>
                {f.status === 'pending' && user?.role !== 'developer' && (
                  <Button size="sm" variant="secondary"
                    onClick={async () => {
                      try {
                        await put(`/crm/followups/${f.id}`, { status: 'done' });
                        toast.success('Follow-up completed');
                        reload();
                      } catch (err) { toast.error(err.message); }
                    }}>Done</Button>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === 'activity' && (
        <Card>
          <CardHeader title="Assignment history" />
          <div className="divide-y divide-slate-100 dark:divide-slate-800/70">
            {(lead.assignments || []).map((a) => (
              <div key={a.id} className="flex items-center gap-3 px-5 py-4">
                <Avatar name={a.name} size={30} />
                <div className="flex-1">
                  <p className="text-sm font-semibold">{a.name} <span className="text-xs font-normal text-slate-400">· {a.employee_code} · {a.role}</span></p>
                  <p className="text-xs text-slate-400">{a.note || 'Assigned'}</p>
                </div>
                <div className="text-right text-xs text-slate-400">
                  <p>{format(new Date(a.assigned_at), 'MMM d, yyyy HH:mm')}</p>
                  {a.released_at && <p className="text-rose-400">Released {format(new Date(a.released_at), 'MMM d, yyyy')}</p>}
                  {Number(a.is_active) === 1 && <p className="text-emerald-500">Active</p>}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* -------- Status modal -------- */}
      <Modal open={statusOpen} onClose={() => setStatusOpen(false)} title="Change lead status"
        description="Approving a lead automatically creates the delivery project."
        footer={
          <>
            <Button variant="secondary" onClick={() => setStatusOpen(false)}>Cancel</Button>
            <Button loading={busy} onClick={changeStatus} disabled={newStatus === lead.status}>
              {newStatus === 'Approved' ? 'Approve & create project' : 'Update status'}
            </Button>
          </>
        }>
        <div className="space-y-4">
          <Field label="New status" required>
            <Select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
              {LEAD_STATUSES.map((s) => <option key={s}>{s}</option>)}
            </Select>
          </Field>
          {newStatus === 'Approved' && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
              This will generate a project ID, transfer company & requirement details, set timeline,
              priority, payment status, and seed the requirement → design → development → testing →
              deployment task pipeline.
            </div>
          )}
          <Field label="Remark (optional)">
            <Textarea value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="Optional note for the audit trail" />
          </Field>
        </div>
      </Modal>

      {/* -------- Assign modal -------- */}
      <Modal open={assignOpen} onClose={() => setAssignOpen(false)} title="Assign this lead"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAssignOpen(false)}>Cancel</Button>
            <Button loading={busy} onClick={assign} disabled={!assignTo}>Assign</Button>
          </>
        }>
        <Field label="Employee" required hint="The previous owner is released and a notification is sent.">
          <Select value={assignTo} onChange={(e) => setAssignTo(e.target.value)}>
            <option value="">— Select employee —</option>
            {(employees || []).filter((e) => e.role !== 'developer').map((e) => (
              <option key={e.id} value={e.id}>{e.name} · {e.designation}</option>
            ))}
          </Select>
        </Field>
      </Modal>

      {/* -------- Edit modal -------- */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit lead" size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button form="edit-lead" type="submit" loading={busy}>Save changes</Button>
          </>
        }>
        <form id="edit-lead" onSubmit={saveEdit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Contact name" required><Input value={form.contact_name} onChange={(e) => set('contact_name', e.target.value)} required /></Field>
          <Field label="Company">
            <Select value={form.company_id} onChange={(e) => set('company_id', e.target.value)}>
              <option value="">— None —</option>
              {(companies || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label="Email"><Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} /></Field>
          <Field label="Phone"><Input value={form.phone} onChange={(e) => set('phone', e.target.value)} /></Field>
          <Field label="Source">
            <Select value={form.source} onChange={(e) => set('source', e.target.value)}>
              {LEAD_SOURCES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </Select>
          </Field>
          <Field label="Priority">
            <Select value={form.priority} onChange={(e) => set('priority', e.target.value)}>
              {['Low', 'Medium', 'High', 'Urgent'].map((p) => <option key={p}>{p}</option>)}
            </Select>
          </Field>
          <Field label="Expected value (₹)"><Input type="number" value={form.expected_value} onChange={(e) => set('expected_value', e.target.value)} /></Field>
          <Field label="Budget (₹)"><Input type="number" value={form.budget} onChange={(e) => set('budget', e.target.value)} /></Field>
          <div className="sm:col-span-2">
            <Field label="Services interested in">
              <div className="flex flex-wrap gap-2">
                {SERVICE_INTERESTS.map((s) => (
                  <button key={s} type="button"
                    onClick={() => set('service_interest', (form.service_interest || []).includes(s)
                      ? form.service_interest.filter((x) => x !== s)
                      : [...(form.service_interest || []), s])}
                    className={cn('rounded-lg border px-3 py-1.5 text-xs font-medium',
                      (form.service_interest || []).includes(s)
                        ? 'border-brand-500 bg-brand-500/10 text-brand-600 dark:text-brand-300'
                        : 'border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-400')}>{s}</button>
                ))}
              </div>
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Requirement"><Textarea value={form.requirement} onChange={(e) => set('requirement', e.target.value)} /></Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Notes"><Textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} /></Field>
          </div>
        </form>
      </Modal>

      {/* -------- Log call -------- */}
      <Modal open={callOpen} onClose={() => setCallOpen(false)} title="Log a call"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCallOpen(false)}>Cancel</Button>
            <Button form="call-form" type="submit" loading={busy}>Save call</Button>
          </>
        }>
        <form id="call-form" onSubmit={addCall} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <input type="hidden" name="lead_id" value={lead.id} />
          <Field label="Direction">
            <Select name="direction" defaultValue="outbound"><option value="outbound">Outbound</option><option value="inbound">Inbound</option></Select>
          </Field>
          <Field label="Call status">
            <Select name="call_status" defaultValue="connected">
              {['connected', 'no_answer', 'busy', 'voicemail', 'failed'].map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </Select>
          </Field>
          <Field label="Duration (seconds)"><Input type="number" name="duration_sec" defaultValue={300} min={0} /></Field>
          <Field label="Outcome"><Input name="outcome" placeholder="Interested / Proposal sent…" /></Field>
          <div className="sm:col-span-2"><Field label="Summary"><Textarea name="summary" placeholder="What was discussed…" /></Field></div>
          <div className="sm:col-span-2"><Field label="Next step"><Input name="next_step" placeholder="Send proposal by Friday" /></Field></div>
          <div className="sm:col-span-2">
            <Field label="Schedule follow-up after (days)" hint="Leave empty to skip.">
              <Input type="number" name="followup_after_days" min={1} max={90} placeholder="e.g. 3" />
            </Field>
          </div>
        </form>
      </Modal>

      {/* -------- Schedule follow-up -------- */}
      <Modal open={fuOpen} onClose={() => setFuOpen(false)} title="Schedule follow-up"
        footer={
          <>
            <Button variant="secondary" onClick={() => setFuOpen(false)}>Cancel</Button>
            <Button form="fu-form" type="submit" loading={busy}>Schedule</Button>
          </>
        }>
        <form id="fu-form" onSubmit={addFollowup} className="space-y-4">
          <input type="hidden" name="lead_id" value={lead.id} />
          <Field label="Subject" required><Input name="subject" required placeholder="Send commercial proposal" /></Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Type">
              <Select name="type" defaultValue="call">
                {['call', 'email', 'meeting', 'demo', 'proposal', 'other'].map((t) => <option key={t}>{t}</option>)}
              </Select>
            </Field>
            <Field label="Due at" required><Input type="datetime-local" name="due_at" required /></Field>
          </div>
          <Field label="Notes"><Textarea name="notes" /></Field>
        </form>
      </Modal>

      <ConfirmDialog open={confirmDel} onClose={() => setConfirmDel(false)} onConfirm={remove}
        title="Delete this lead?" message={`${lead.lead_code} and its calls, follow-ups and assignments will be permanently removed.`}
        loading={busy} />
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
        <Icon size={14} className="text-slate-400" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-slate-400">{label}</p>
        <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">{value || '—'}</p>
      </div>
    </div>
  );
}
