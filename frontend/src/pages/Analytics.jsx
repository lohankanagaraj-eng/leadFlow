import { useState, useEffect } from 'react';
import { BarChart3, Database, ExternalLink } from 'lucide-react';
import { useFetch } from '@/hooks/useFetch';
import { PageHeader, SectionTitle } from '@/components/Page';
import {
  Card, CardHeader, Badge, Select, Tabs, Loading, ErrorState, StatCard, Field, Input,
} from '@/components/ui';
import { AreaChartCard, BarChartCard, DonutChartCard, LineChartCard } from '@/components/Charts';
import { compactCurrency, cn } from '@/utils/constants';

const DATASETS = [
  { key: 'leads', label: 'Lead Analytics' },
  { key: 'employees', label: 'Employee Analytics' },
  { key: 'calls', label: 'Call Analytics' },
  { key: 'projects', label: 'Project Analytics' },
  { key: 'revenue', label: 'Revenue Analytics' },
  { key: 'resources', label: 'Resource Utilization' },
];

export default function Analytics() {
  const [tab, setTab] = useState('leads');
  const [range, setRange] = useState(365);
  const [embedUrl, setEmbedUrl] = useState(() => localStorage.getItem('lf_pbi_url') || '');
  const [groupId, setGroupId] = useState(() => localStorage.getItem('lf_pbi_group') || '');

  const { data: cfg, loading: cfgLoading } = useFetch('/analytics/config');
  const { data, loading, error, reload } = useFetch(`/analytics/${tab}`, { params: { range }, deps: [tab, range] });

  useEffect(() => { localStorage.setItem('lf_pbi_url', embedUrl); }, [embedUrl]);
  useEffect(() => { localStorage.setItem('lf_pbi_group', groupId); }, [groupId]);

  if (cfgLoading) return <div className="p-6"><Loading /></div>;
  if (error) return <div className="p-6"><ErrorState error={error} onRetry={reload} /></div>;

  const embedReady = embedUrl.trim().length > 0;

  return (
    <div className="mx-auto max-w-[1600px] p-4 sm:p-6">
      <PageHeader title="Power BI Analytics" subtitle="Six enterprise datasets — live from your MySQL semantic views."
        actions={
          <Select value={range} onChange={(e) => setRange(Number(e.target.value))} className="w-40">
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={365}>Last 12 months</option>
            <option value={1095}>Last 3 years</option>
          </Select>
        } />

      <Tabs className="mb-5" tabs={DATASETS} active={tab} onChange={setTab} />

      {loading && <Loading label="Crunching analytics…" />}

      {!loading && tab === 'leads' && data && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <StatCard title="Total leads" value={data.totals?.total} />
            <StatCard title="Pipeline value" value={compactCurrency(data.totals?.pipeline_value)} tone="brand" />
            <StatCard title="Won value" value={compactCurrency(data.totals?.won_value)} tone="emerald" />
            <StatCard title="Conversion" value={`${data.totals?.conversion_pct || 0}%`} tone="violet" />
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <AreaChartCard title="Lead volume & value by month" data={data.byMonth || []} xKey="month"
                series={[{ key: 'leads', label: 'Leads', color: '#3b63f6' }, { key: 'converted', label: 'Converted', color: '#10b981' }]} />
            </div>
            <DonutChartCard title="By status" data={(data.byStatus || []).map((s) => ({ name: s.status, value: Number(s.leads) }))} />
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <BarChartCard title="Lead sources" data={data.bySource || []} xKey="source" series={[{ key: 'leads', label: 'Leads', color: '#8b5cf6' }]} />
            <BarChartCard title="Conversion funnel" data={data.funnel || []} xKey="stage" series={[{ key: 'count', label: 'Leads', color: '#06b6d4' }]} />
          </div>
        </div>
      )}

      {!loading && tab === 'employees' && data && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <BarChartCard title="Revenue booked by employee" data={(data.performance || []).map((p) => ({ name: p.name.split(' ')[0], revenue: Number(p.revenue_booked) }))}
              xKey="name" series={[{ key: 'revenue', label: '₹', color: '#10b981' }]} />
            <BarChartCard title="Call productivity" data={data.callProductivity || []} xKey="name"
              series={[{ key: 'calls', label: 'Calls', color: '#3b63f6' }, { key: 'connected', label: 'Connected', color: '#06b6d4' }]} />
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <BarChartCard title="Leads by department" data={data.leadsByDept || []} xKey="department" series={[{ key: 'leads', label: 'Leads', color: '#8b5cf6' }]} />
            <LineChartCard title="Conversion trend" data={data.conversionTrend || []} xKey="month"
              series={[{ key: 'conversions', label: 'Conversions', color: '#10b981' }, { key: 'value', label: 'Value', color: '#f59e0b' }]} />
          </div>
        </div>
      )}

      {!loading && tab === 'calls' && data && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <StatCard title="Total calls" value={data.summary?.total} />
            <StatCard title="Connected" value={data.summary?.connected} tone="emerald" />
            <StatCard title="Connect rate" value={`${data.summary?.connect_rate || 0}%`} tone="brand" />
            <StatCard title="Avg duration" value={`${Math.round((data.summary?.avg_seconds || 0) / 60)}m`} tone="violet" />
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <BarChartCard title="Calls by hour of day" data={data.byHour || []} xKey="hour" series={[{ key: 'count', label: 'Calls', color: '#3b63f6' }]} />
            <AreaChartCard title="Monthly call volume" data={data.byMonth || []} xKey="month" series={[{ key: 'calls', label: 'Calls', color: '#06b6d4' }]} />
            <DonutChartCard title="By call status" data={(data.byStatus || []).map((s) => ({ name: s.call_status, value: Number(s.count) }))} />
            <DonutChartCard title="By direction" data={(data.byDirection || []).map((s) => ({ name: s.direction, value: Number(s.count) }))} />
          </div>
        </div>
      )}

      {!loading && tab === 'projects' && data && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <StatCard title="Total projects" value={data.delivery?.total} />
            <StatCard title="Completed" value={data.delivery?.completed} tone="emerald" />
            <StatCard title="On-time delivery" value={`${data.delivery?.total ? Math.round((data.delivery.on_time / data.delivery.total) * 100) : 0}%`} tone="brand" />
            <StatCard title="Avg duration" value={`${data.delivery?.avg_duration_days || 0} days`} tone="violet" />
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <BarChartCard title="Projects by status" data={data.byStatus || []} xKey="status" series={[{ key: 'count', label: 'Projects', color: '#06b6d4' }]} />
            </div>
            <DonutChartCard title="Progress buckets" data={(data.progressBuckets || []).map((b) => ({ name: b.bucket, value: Number(b.count) }))} />
          </div>
          <BarChartCard title="Developer workload" data={(data.workload || []).map((w) => ({ name: w.name.split(' ')[0], projects: w.projects, hours: Number(w.logged_hours || 0) }))}
            xKey="name" series={[{ key: 'projects', label: 'Projects', color: '#8b5cf6' }, { key: 'hours', label: 'Logged hrs', color: '#f59e0b' }]} />
        </div>
      )}

      {!loading && tab === 'revenue' && data && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <StatCard title="Booked" value={compactCurrency(data.summary?.booked)} tone="brand" />
            <StatCard title="Collected" value={compactCurrency(data.summary?.collected)} tone="emerald" />
            <StatCard title="Outstanding" value={compactCurrency(data.summary?.outstanding)} tone="amber" />
            <StatCard title="Collection rate" value={`${data.summary?.collection_pct || 0}%`} tone="violet" />
          </div>
          <AreaChartCard title="Booked vs collected" data={data.byMonth || []} xKey="month"
            series={[{ key: 'booked', label: 'Booked', color: '#3b63f6' }, { key: 'collected', label: 'Collected', color: '#10b981' }, { key: 'outstanding', label: 'Outstanding', color: '#f59e0b' }]} />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <BarChartCard title="Revenue by service line" data={(data.byService || []).slice(0, 8)} xKey="service"
              series={[{ key: 'booked', label: 'Booked', color: '#3b63f6' }, { key: 'collected', label: 'Collected', color: '#10b981' }]} />
            <DonutChartCard title="Payment status" data={(data.byPayment || []).map((p) => ({ name: p.payment_status, value: Number(p.budget) }))} />
          </div>
        </div>
      )}

      {!loading && tab === 'resources' && data && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <BarChartCard title="Developer allocation (%)" data={(data.utilization || []).map((u) => ({ name: u.name.split(' ')[0], allocated: Number(u.allocated_pct), open: Number(u.open_tasks) }))}
                xKey="name" series={[{ key: 'allocated', label: 'Allocated %', color: '#3b63f6' }]} />
            </div>
            <DonutChartCard title="Availability" data={(data.availability || []).map((a) => ({ name: a.availability, value: Number(a.count) }))} />
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <BarChartCard title="Skill coverage" data={(data.skills || []).slice(0, 12)} xKey="skill" series={[{ key: 'developers', label: 'Developers', color: '#8b5cf6' }]} />
            <Card>
              <CardHeader title="Current allocations" />
              <div className="max-h-[280px] divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800/70">
                {(data.allocation || []).map((a, i) => (
                  <div key={i} className="flex items-center gap-3 px-5 py-3 text-sm">
                    <span className="w-28 truncate font-medium">{a.name}</span>
                    <span className="min-w-0 flex-1 truncate text-xs text-slate-400">{a.project_code} · {a.title}</span>
                    <span className="text-xs font-semibold text-brand-500">{a.allocated_pct}%</span>
                    <Badge>{a.status}</Badge>
                  </div>
                ))}
                {!(data.allocation || []).length && <p className="py-8 text-center text-xs text-slate-400">No active allocations</p>}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ---------- Power BI connection panel ---------- */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Power BI dataset" subtitle="Point Power BI Desktop / Service at these MySQL views"
            action={<Badge color="bg-brand-500/10 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300"><Database size={12} /> DirectQuery / Import</Badge>} />
          <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
            <Field label="Server"><Input readOnly value={cfg?.connection?.server || 'localhost'} /></Field>
            <Field label="Database"><Input readOnly value={cfg?.connection?.database || 'leadflow'} /></Field>
          </div>
          <div className="px-5 pb-5">
            <p className="label">Available views</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {(cfg?.views || []).map((v) => (
                <div key={v.name} className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                  <p className="font-mono text-xs font-semibold text-brand-500">{v.name}</p>
                  <p className="mt-0.5 text-[11px] text-slate-400">{v.description}</p>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Embedded report" subtitle="Paste your Power BI report embed URL" />
          <div className="space-y-4 p-5">
            <Field label="Workspace / Group ID">
              <Input value={groupId} onChange={(e) => setGroupId(e.target.value)} placeholder="xxxxxxxx-xxxx-…" />
            </Field>
            <Field label="Report embed URL" hint="Report Embed URL from Power BI → File → Embed">
              <Input value={embedUrl} onChange={(e) => setEmbedUrl(e.target.value)} placeholder="https://app.powerbi.com/reportEmbed?reportId=…" />
            </Field>
            <a href="https://app.powerbi.com/" target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-500 hover:underline">
              Open Power BI Service <ExternalLink size={12} />
            </a>
          </div>
          {embedReady && (
            <div className="border-t border-slate-200 p-3 dark:border-slate-800">
              <div className="relative w-full overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800" style={{ paddingTop: '62%' }}>
                <iframe title="Power BI report" src={embedUrl}
                  className="absolute inset-0 h-full w-full" allowFullScreen frameBorder="0" />
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
