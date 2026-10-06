import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { useFetch } from '@/hooks/useFetch';
import { PageHeader } from '@/components/Page';
import { Badge, Select, Avatar } from '@/components/ui';
import DataTable from '@/components/DataTable';
import { cn, roleLabel } from '@/utils/constants';

const actionTone = {
  create: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  update: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
  delete: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
  login: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
  logout: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  assign: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  status: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300',
};

const entityTone = {
  lead: 'bg-brand-500/10 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300',
  project: 'bg-violet-500/10 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300',
  task: 'bg-sky-500/10 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300',
  employee: 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300',
  company: 'bg-teal-500/10 text-teal-600 dark:bg-teal-500/15 dark:text-teal-300',
  auth: 'bg-rose-500/10 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300',
};

export default function ActivityLogs() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [entity, setEntity] = useState('');
  const [action, setAction] = useState('');
  const [mine, setMine] = useState(false);

  const { data, meta, loading, error, reload } = useFetch('/activity', {
    params: { page, limit: 20, search, entity, action, mine: mine ? '1' : '' },
    deps: [page, search, entity, action, mine],
  });

  const entities = meta?.entities || [];

  const columns = [
    {
      key: 'actor_name', header: 'Actor', sortable: false, width: '17%',
      render: (r) => (
        <div className="flex items-center gap-2">
          <Avatar name={r.actor_name || 'System'} size={28} />
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-slate-700 dark:text-slate-200">{r.actor_name || 'System'}</p>
            <p className="truncate text-[10px] uppercase text-slate-400">{roleLabel(r.user_role)}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'entity', header: 'Entity', sortable: false,
      render: (r) => <Badge color={entityTone[r.entity]} className="capitalize">{r.entity}</Badge>,
    },
    { key: 'action', header: 'Action', sortable: false, render: (r) => <Badge color={actionTone[r.action] || undefined} className="capitalize">{r.action}</Badge> },
    { key: 'summary', header: 'Details', sortable: false, render: (r) => <span className="line-clamp-2 text-xs">{r.summary}</span> },
    {
      key: 'created_at', header: 'When', align: 'right',
      render: (r) => (
        <span className="whitespace-nowrap text-xs text-slate-400">
          {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
        </span>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-[1400px] p-4 sm:p-6">
      <PageHeader title="Activity Logs" subtitle="Full audit trail of every action taken in the system." />

      <DataTable
        columns={columns}
        rows={data || []}
        loading={loading}
        error={error}
        onRetry={reload}
        keyField="id"
        page={page}
        limit={meta?.limit || 20}
        total={meta?.total || 0}
        onPage={setPage}
        search={search}
        onSearch={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder="Search actor, summary, entity…"
        emptyTitle="No activity found"
        emptyDescription="Adjust your filters or perform some actions in the app."
        initialSort={{ key: 'created_at', dir: 'desc' }}
        filters={
          <>
            <Select value={entity} onChange={(e) => { setEntity(e.target.value); setPage(1); }} className="w-40">
              <option value="">All entities</option>
              {entities.map((e) => <option key={e} value={e} className="capitalize">{e}</option>)}
            </Select>
            <Select value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }} className="w-36">
              <option value="">All actions</option>
              {['create', 'update', 'delete', 'assign', 'status', 'login', 'logout'].map((a) => (
                <option key={a} value={a} className="capitalize">{a}</option>
              ))}
            </Select>
            <button
              onClick={() => { setMine((m) => !m); setPage(1); }}
              className={cn('rounded-lg border px-3 py-2 text-xs font-medium transition',
                mine
                  ? 'border-brand-500 bg-brand-500 text-white'
                  : 'border-slate-300 text-slate-500 hover:border-slate-400 dark:border-slate-700 dark:text-slate-400')}>
              My actions only
            </button>
          </>
        }
      />
    </div>
  );
}
