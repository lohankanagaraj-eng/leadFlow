import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, PhoneCall, PhoneIncoming, PhoneOff, Timer, Building2, UserRound, ChevronDown } from 'lucide-react';
import { useFetch } from '@/hooks/useFetch';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { post, del } from '@/api/client';
import DataTable from '@/components/DataTable';
import { PageHeader } from '@/components/Page';
import { Button, Modal, Field, Input, Textarea, Select, Badge, StatCard, ConfirmDialog } from '@/components/ui';
import { cn, formatDuration } from '@/utils/constants';
import { format } from 'date-fns';

export default function Calls() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [direction, setDirection] = useState('');
  const [callStatus, setCallStatus] = useState('');
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [toDelete, setToDelete] = useState(null);
  const [selectedLead, setSelectedLead] = useState(null);
  const [captureDetails, setCaptureDetails] = useState(true);

  const { data, meta, loading, error, reload } = useFetch('/crm/calls', {
    params: { page, limit: 15, direction, call_status: callStatus }, deps: [page, direction, callStatus],
  });
  const { data: leads, reload: reloadLeads } = useFetch('/leads', { params: { limit: 200 } });

  const rows = data || [];
  const totalSec = rows.reduce((a, r) => a + Number(r.duration_sec || 0), 0);
  const connected = rows.filter((r) => r.call_status === 'connected').length;
  const connectRate = rows.length ? Math.round((connected / rows.length) * 100) : 0;

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    const payload = Object.fromEntries(new FormData(e.target).entries());
    try {
      await post('/crm/calls', payload);
      toast.success('Call logged', selectedLead?.company_name
        ? `Details captured for ${selectedLead.company_name}`
        : 'Call recorded and lead marked Contacted');
      setOpen(false);
      reload();
      reloadLeads();
    } catch (err) {
      const map = {};
      (err.errors || []).forEach((x) => { map[x.path] = x.message; });
      setErrors(map);
      toast.error(err.errors?.length ? Object.values(map).join(', ') : err.message);
    } finally { setSaving(false); }
  };

  const remove = async () => {
    try { await del(`/crm/calls/${toDelete.id}`); toast.success('Call log deleted'); reload(); }
    catch (err) { toast.error(err.message); }
    finally { setToDelete(null); }
  };

  const columns = [
    { key: 'lead_code', header: 'Lead', render: (r) => (
      <div className="min-w-0">
        <p className="truncate font-medium text-slate-800 dark:text-slate-100">{r.contact_name}</p>
        <p className="truncate text-xs text-slate-400">{r.lead_code} · {r.lead_status}</p>
      </div>
    ) },
    { key: 'direction', header: 'Direction', render: (r) => (
      <Badge color={r.direction === 'inbound' ? 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300' : 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300'}>
        {r.direction === 'inbound' ? <PhoneIncoming size={11} /> : <PhoneCall size={11} />} {r.direction}
      </Badge>
    ) },
    { key: 'call_status', header: 'Status', render: (r) => (
      <Badge color={r.call_status === 'connected' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}>
        {r.call_status !== 'connected' && <PhoneOff size={11} />} {r.call_status.replace('_', ' ')}
      </Badge>
    ) },
    { key: 'employee_name', header: 'By', render: (r) => <span className="text-xs">{r.employee_name}</span> },
    { key: 'outcome', header: 'Outcome', render: (r) => r.outcome || <span className="text-slate-400">—</span> },
    { key: 'duration_sec', header: 'Duration', align: 'right', render: (r) => (
      <span className="inline-flex items-center gap-1 text-xs"><Timer size={11} className="text-slate-400" /> {formatDuration(r.duration_sec)}</span>
    ) },
    { key: 'started_at', header: 'When', render: (r) => <span className="text-xs text-slate-400">{format(new Date(r.started_at), 'MMM d, HH:mm')}</span> },
    {
      key: 'actions', header: '', align: 'right', sortable: false,
      render: (r) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Button size="sm" variant="ghost" onClick={() => navigate(`/leads/${r.lead_id}`)}>Open lead</Button>
          {user?.role === 'admin' && <Button size="sm" variant="ghost" className="!text-rose-500" onClick={() => setToDelete(r)}>Delete</Button>}
        </div>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-[1600px] p-4 sm:p-6">
      <PageHeader title="Call Tracking" subtitle="Every conversation logged against the pipeline."
        actions={user?.role !== 'developer' && <Button onClick={() => setOpen(true)}><Plus size={15} /> Log call</Button>} />

      <div className="mb-5 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard title="Calls (page)" value={rows.length} icon={PhoneCall} tone="brand" />
        <StatCard title="Connected" value={connected} icon={PhoneCall} tone="emerald" />
        <StatCard title="Connect rate" value={`${connectRate}%`} icon={PhoneCall} tone="violet" />
        <StatCard title="Talk time" value={formatDuration(totalSec)} icon={Timer} tone="sky" />
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        error={error}
        onRetry={reload}
        page={page}
        limit={15}
        total={meta?.total}
        onPage={setPage}
        emptyTitle="No calls logged"
        emptyDescription="Log outbound and inbound calls to build call history."
        emptyAction={user?.role !== 'developer' && <Button onClick={() => setOpen(true)}>Log call</Button>}
        filters={
          <>
            <Select value={direction} onChange={(e) => { setDirection(e.target.value); setPage(1); }} className="w-36">
              <option value="">All directions</option>
              <option value="outbound">Outbound</option>
              <option value="inbound">Inbound</option>
            </Select>
            <Select value={callStatus} onChange={(e) => { setCallStatus(e.target.value); setPage(1); }} className="w-36">
              <option value="">All statuses</option>
              {['connected', 'no_answer', 'busy', 'voicemail', 'failed'].map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </Select>
          </>
        }
      />

      <Modal open={open} onClose={() => setOpen(false)} title="Log a call"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button form="call-form" type="submit" loading={saving}>Save call</Button>
          </>
        }>
        <form id="call-form" onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Lead" required error={errors.lead_id}>
              <Select name="lead_id" required defaultValue=""
                onChange={(e) => {
                  setSelectedLead((leads || []).find((l) => String(l.id) === e.target.value) || null);
                }}>
                <option value="" disabled>— Select lead —</option>
                {(leads || []).map((l) => <option key={l.id} value={l.id}>{l.lead_code} · {l.contact_name}{l.company_name ? ` · ${l.company_name}` : ''}</option>)}
              </Select>
            </Field>
            {user?.role === 'employee' && (
              <p className="mt-1 text-[11px] text-slate-400">Only leads assigned to you are shown.</p>
            )}
          </div>
          <Field label="Direction">
            <Select name="direction" defaultValue="outbound"><option value="outbound">Outbound</option><option value="inbound">Inbound</option></Select>
          </Field>
          <Field label="Call status">
            <Select name="call_status" defaultValue="connected">
              {['connected', 'no_answer', 'busy', 'voicemail', 'failed'].map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </Select>
          </Field>
          <Field label="Duration (seconds)"><Input type="number" name="duration_sec" min={0} defaultValue={300} /></Field>
          <Field label="Outcome"><Input name="outcome" placeholder="Interested" /></Field>
          <div className="sm:col-span-2"><Field label="Summary"><Textarea name="summary" /></Field></div>
          <div className="sm:col-span-2"><Field label="Next step"><Input name="next_step" /></Field></div>
          <div className="sm:col-span-2">
            <Field label="Schedule follow-up after (days)" hint="Optional.">
              <Input type="number" name="followup_after_days" min={1} max={90} />
            </Field>
          </div>

          {/* Capture details collected during the call */}
          <div className="sm:col-span-2">
            <button type="button" onClick={() => setCaptureDetails((c) => !c)}
              className="flex w-full items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-left text-xs font-semibold text-slate-600 transition hover:border-brand-400 dark:border-slate-800 dark:text-slate-300">
              <Building2 size={14} className="text-brand-500" />
              Update contact &amp; company details from this call
              <ChevronDown size={14} className={cn('ml-auto transition-transform', captureDetails && 'rotate-180')} />
            </button>
            {captureDetails && (
              <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-900/40">
                <p className="mb-3 flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                  <UserRound size={12} /> Details you collect while talking get saved to the lead &amp; company.
                </p>
                <div key={selectedLead?.id || 'none'} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Contact person's name" error={errors.contact_name}>
                    <Input name="contact_name" defaultValue={selectedLead?.contact_name || ''} placeholder="Reception's name or new POC…" />
                  </Field>
                  <Field label="Contact phone" error={errors.phone}>
                    <Input name="phone" defaultValue={selectedLead?.phone || ''} placeholder="+91 …" />
                  </Field>
                  <Field label="Contact email" error={errors.email}>
                    <Input name="email" defaultValue={selectedLead?.email || ''} placeholder="name@company.com" />
                  </Field>
                  <Field label="Company name" error={errors.company_name}>
                    <Input name="company_name" defaultValue={selectedLead?.company_name || ''} placeholder="e.g. Acme Pvt Ltd" />
                  </Field>
                  <Field label="Industry" error={errors.company_industry}>
                    <Input name="company_industry" defaultValue={selectedLead?.company_industry || ''} placeholder="Retail, Healthcare…" />
                  </Field>
                  <Field label="Company phone" error={errors.company_phone}>
                    <Input name="company_phone" defaultValue={selectedLead?.company_phone || ''} placeholder="+91 …" />
                  </Field>
                  <Field label="Company email" error={errors.company_email}>
                    <Input name="company_email" defaultValue={selectedLead?.company_email || ''} placeholder="info@company.com" />
                  </Field>
                  <Field label="City" error={errors.company_city}>
                    <Input name="company_city" defaultValue={selectedLead?.company_city || ''} placeholder="Chennai" />
                  </Field>
                </div>
                <p className="mt-3 text-[10px] text-slate-400">
                  Fills what's missing — if the lead has no company yet, a new one is created and linked automatically.
                </p>
              </div>
            )}
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!toDelete} onClose={() => setToDelete(null)} onConfirm={remove}
        title="Delete call log?" message="This call record will be permanently removed." />
    </div>
  );
}
