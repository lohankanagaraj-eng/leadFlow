import { Link, useNavigate } from 'react-router-dom';
import {
  Users, FolderKanban, PhoneCall, IndianRupee, TrendingUp, CalendarClock,
  CheckCircle2, AlertTriangle, ArrowUpRight, Code2, ListChecks, Timer,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useFetch } from '@/hooks/useFetch';
import { StatCard, Card, CardHeader, Badge, Loading, ErrorState, ProgressBar, Avatar } from '@/components/ui';
import { PageHeader, SectionTitle } from '@/components/Page';
import { AreaChartCard, BarChartCard, DonutChartCard } from '@/components/Charts';
import { cn, compactCurrency, leadStatusColor, projectStatusColor, formatDuration } from '@/utils/constants';
import { format, isPast, isToday } from 'date-fns';


/* ============================ ADMIN ============================ */
function AdminDashboard() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useFetch('/dashboard/admin');
  if (loading) return <Loading />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const kpi = data?.kpi || {};
  const revenue = (data?.revenueByMonth || []).slice().reverse();

  return (
    <>
      <PageHeader title={`Welcome back, ${user?.name.split(' ')[0]}`}
        subtitle="Your business at a glance — leads, pipeline and delivery health." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total Leads" value={kpi.total_leads ?? 0}
          sub={`${kpi.converted_leads ?? 0} converted`} icon={Users} tone="brand" />
        <StatCard title="Active Projects" value={kpi.active_projects ?? 0}
          sub={`${kpi.completed_projects ?? 0} completed`} icon={FolderKanban} tone="violet" />
        <StatCard title="Revenue Collected" value={compactCurrency(kpi.revenue_collected)}
          sub={`${compactCurrency(kpi.outstanding)} outstanding`} icon={IndianRupee} tone="emerald" />
        <StatCard title="Overdue Follow-Ups" value={kpi.overdue_followups ?? 0}
          sub={`${kpi.available_developers} developers free`} icon={AlertTriangle}
          tone={kpi.overdue_followups > 0 ? 'rose' : 'emerald'} />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AreaChartCard title="Revenue trend" subtitle="Booked vs collected, last 12 months"
            data={revenue} xKey="month"
            series={[
              { key: 'booked', label: 'Booked', color: '#3b63f6' },
              { key: 'collected', label: 'Collected', color: '#10b981' },
            ]} />
        </div>
        <DonutChartCard title="Leads by status" subtitle="Current pipeline distribution"
          data={(data?.leadByStatus || []).map((x) => ({ name: x.status, value: Number(x.count) }))}
          nameKey="name" valueKey="value" centerLabel={`${kpi.total_leads ?? 0} leads`} />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <BarChartCard title="Lead sources" subtitle="Where leads originate"
          data={data?.leadsBySource || []} xKey="source"
          series={[{ key: 'count', label: 'Leads', color: '#8b5cf6' }]} />
        <BarChartCard title="Projects by status" subtitle="Delivery pipeline"
          data={data?.projectByStatus || []} xKey="status"
          series={[{ key: 'count', label: 'Projects', color: '#06b6d4' }]} />
        <Card>
          <CardHeader title="Top performers" subtitle="Conversions this period" />
          <div className="divide-y divide-slate-100 dark:divide-slate-800/70">
            {(data?.topPerformers || []).map((e) => (
              <div key={e.id} className="flex items-center gap-3 px-5 py-3">
                <Avatar name={e.name} size={30} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-slate-800 dark:text-slate-100">{e.name}</p>
                  <p className="truncate text-[11px] text-slate-400">{e.designation}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-emerald-500">{e.conversions} won</p>
                  <p className="text-[10px] text-slate-400">{e.leads} leads</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Recent leads" action={<Link to="/leads" className="text-xs font-medium text-brand-500 hover:underline">View all</Link>} />
          <div className="divide-y divide-slate-100 dark:divide-slate-800/70">
            {(data?.recentLeads || []).map((l) => (
              <Link key={l.id} to={`/leads/${l.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-slate-800 dark:text-slate-100">{l.contact_name}</p>
                  <p className="truncate text-[11px] text-slate-400">{l.lead_code} · {l.company_name || 'No company'}</p>
                </div>
                <span className="text-xs font-medium text-slate-500">{compactCurrency(l.expected_value)}</span>
                <Badge color={leadStatusColor[l.status]}>{l.status}</Badge>
              </Link>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Overdue follow-ups" action={<Link to="/followups" className="text-xs font-medium text-brand-500 hover:underline">View all</Link>} />
          <div className="divide-y divide-slate-100 dark:divide-slate-800/70">
            {!(data?.overdueFollowups || []).length && (
              <p className="px-5 py-8 text-center text-xs text-slate-400">All caught up 🎉</p>
            )}
            {(data?.overdueFollowups || []).map((f) => (
              <div key={f.id} className="flex items-center gap-3 px-5 py-3">
                <CalendarClock size={15} className="text-rose-500" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-slate-800 dark:text-slate-100">{f.subject}</p>
                  <p className="truncate text-[11px] text-slate-400">{f.lead_code} · {f.contact_name} · {f.owner_name}</p>
                </div>
                <span className="text-[11px] font-medium text-rose-500">{format(new Date(f.due_at), 'MMM d, HH:mm')}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}

/* ============================ EMPLOYEE ============================ */
function EmployeeDashboard() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useFetch('/dashboard/employee');
  if (loading) return <Loading />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  const k = data?.kpi || {};

  return (
    <>
      <PageHeader title={`Hey, ${user?.name.split(' ')[0]}`}
        subtitle="Your leads, follow-ups and call activity for today." />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard title="Assigned leads" value={k.assigned ?? 0} icon={Users} tone="brand" />
        <StatCard title="Converted" value={k.converted ?? 0}
          sub={`${k.conversionRate ?? 0}% conversion`} icon={TrendingUp} tone="emerald" />
        <StatCard title="Calls logged" value={k.calls ?? 0}
          sub={`${k.callHours ?? 0} hours`} icon={PhoneCall} tone="sky" />
        <StatCard title="Pending follow-ups" value={k.pendingFollowups ?? 0}
          sub={k.overdueFollowups > 0 ? `${k.overdueFollowups} overdue` : 'On track'}
          icon={CalendarClock} tone={k.overdueFollowups > 0 ? 'rose' : 'amber'} />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SectionTitle action={<Link to="/leads" className="text-xs text-brand-500 hover:underline">All leads</Link>}>My leads</SectionTitle>
          <Card>
            <div className="divide-y divide-slate-100 dark:divide-slate-800/70">
              {!(data?.myLeads || []).length && <p className="px-5 py-8 text-center text-xs text-slate-400">No leads assigned yet</p>}
              {(data?.myLeads || []).map((l) => (
                <Link key={l.id} to={`/leads/${l.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-slate-800 dark:text-slate-100">{l.contact_name}</p>
                    <p className="truncate text-[11px] text-slate-400">{l.lead_code} · {l.company_name || '—'}</p>
                  </div>
                  <Badge color={leadStatusColor[l.status]}>{l.status}</Badge>
                  <span className="w-20 text-right text-xs font-medium text-slate-500">{compactCurrency(l.expected_value)}</span>
                </Link>
              ))}
            </div>
          </Card>
        </div>

        <div>
          <SectionTitle action={<Link to="/followups" className="text-xs text-brand-500 hover:underline">All</Link>}>Upcoming follow-ups</SectionTitle>
          <Card>
            <div className="divide-y divide-slate-100 dark:divide-slate-800/70">
              {!(data?.todayFollowups || []).length && <p className="px-5 py-8 text-center text-xs text-slate-400">Nothing scheduled</p>}
              {(data?.todayFollowups || []).map((f) => {
                const overdue = isPast(new Date(f.due_at));
                return (
                  <div key={f.id} className="px-4 py-3">
                    <p className="truncate text-xs font-semibold text-slate-800 dark:text-slate-100">{f.subject}</p>
                    <p className="truncate text-[11px] text-slate-400">{f.lead_code} · {f.contact_name}</p>
                    <p className={cn('mt-1 text-[11px] font-medium', overdue ? 'text-rose-500' : isToday(new Date(f.due_at)) ? 'text-amber-500' : 'text-slate-400')}>
                      {format(new Date(f.due_at), 'MMM d, HH:mm')}
                    </p>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>

      <div className="mt-5">
        <SectionTitle>Recent call activity</SectionTitle>
        <Card>
          <div className="divide-y divide-slate-100 dark:divide-slate-800/70">
            {!(data?.myCalls || []).length && <p className="px-5 py-8 text-center text-xs text-slate-400">No calls logged yet</p>}
            {(data?.myCalls || []).map((c) => (
              <div key={c.id} className="flex items-center gap-3 px-5 py-3">
                <PhoneCall size={15} className={c.call_status === 'connected' ? 'text-emerald-500' : 'text-slate-400'} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-slate-800 dark:text-slate-100">{c.contact_name}</p>
                  <p className="truncate text-[11px] text-slate-400">{c.lead_code} · {c.summary || c.outcome}</p>
                </div>
                <span className="text-[11px] text-slate-400">{formatDuration(c.duration_sec)}</span>
                <Badge color={c.call_status === 'connected' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}>
                  {c.call_status}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}

/* ============================ DEVELOPER ============================ */
function DeveloperDashboard() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useFetch('/dashboard/developer');
  if (loading) return <Loading />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  const k = data?.kpi || {};

  return (
    <>
      <PageHeader title={`Hey, ${user?.name.split(' ')[0]}`}
        subtitle="Your assigned projects, tasks and workload." />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard title="Active projects" value={k.projects ?? 0} icon={FolderKanban} tone="brand" />
        <StatCard title="Open tasks" value={k.openTasks ?? 0} icon={ListChecks} tone="amber" />
        <StatCard title="Completed tasks" value={k.doneTasks ?? 0} icon={CheckCircle2} tone="emerald" />
        <StatCard title="Hours logged" value={`${k.hours ?? 0}h`} icon={Timer} tone="violet" />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div>
          <SectionTitle>My projects</SectionTitle>
          <div className="space-y-3">
            {!(data?.projects || []).length && (
              <Card><p className="px-5 py-10 text-center text-xs text-slate-400">No active projects assigned</p></Card>
            )}
            {(data?.projects || []).map((p) => (
              <Link key={p.id} to={`/projects/${p.id}`}>
                <Card className="card-hover p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{p.title}</p>
                      <p className="text-[11px] text-slate-400">{p.project_code} · {p.role_in_project || 'Developer'}</p>
                    </div>
                    <Badge color={projectStatusColor[p.status]}>{p.status}</Badge>
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <ProgressBar value={p.progress} showLabel className="flex-1" />
                    <span className="text-[11px] text-slate-400">{p.allocated_pct}% allocated</span>
                  </div>
                  {p.deadline && <p className="mt-2 text-[11px] text-slate-400">Due {format(new Date(p.deadline), 'MMM d, yyyy')}</p>}
                </Card>
              </Link>
            ))}
          </div>
        </div>

        <div>
          <SectionTitle action={<Link to="/tasks" className="text-xs text-brand-500 hover:underline">Open board</Link>}>Task queue</SectionTitle>
          <Card>
            <div className="divide-y divide-slate-100 dark:divide-slate-800/70">
              {!(data?.tasks || []).length && <p className="px-5 py-8 text-center text-xs text-slate-400">No open tasks 🎉</p>}
              {(data?.tasks || []).map((t) => (
                <div key={t.id} className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <p className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-800 dark:text-slate-100">{t.title}</p>
                    <Badge color={{
                      todo: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
                      in_progress: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
                      review: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
                      blocked: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
                    }[t.status]}>{t.status}</Badge>
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    {t.project_code}{t.due_date ? ` · due ${format(new Date(t.due_date), 'MMM d')}` : ''}
                  </p>
                </div>
              ))}
            </div>
          </Card>

          <SectionTitle><span className="mt-4 block">Latest project updates</span></SectionTitle>
          <Card>
            <div className="divide-y divide-slate-100 dark:divide-slate-800/70">
              {!(data?.recentUpdates || []).length && <p className="px-5 py-6 text-center text-xs text-slate-400">No updates yet</p>}
              {(data?.recentUpdates || []).slice(0, 4).map((u) => (
                <div key={u.id} className="px-5 py-3">
                  <p className="text-[11px] font-semibold text-brand-500">{u.project_code}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-slate-600 dark:text-slate-300">{u.comment}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  return (
    <div className="mx-auto max-w-[1600px] p-4 sm:p-6">
      {user?.role === 'admin' && <AdminDashboard />}
      {user?.role === 'employee' && <EmployeeDashboard />}
      {user?.role === 'developer' && <DeveloperDashboard />}
    </div>
  );
}


