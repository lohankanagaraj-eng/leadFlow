import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, CartesianAxis,
} from 'recharts';
import { useTheme } from '@/context/ThemeContext';
import { Card, CardHeader } from '@/components/ui';

const PALETTE = ['#3b63f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];

export function useChartTheme() {
  const { theme } = useTheme();
  const dark = theme === 'dark';
  return {
    grid: dark ? '#1e293b' : '#e2e8f0',
    axis: dark ? '#64748b' : '#94a3b8',
    tooltip: {
      contentStyle: {
        background: dark ? '#0f172a' : '#ffffff',
        border: `1px solid ${dark ? '#1e293b' : '#e2e8f0'}`,
        borderRadius: 10, fontSize: 12,
        color: dark ? '#e2e8f0' : '#0f172a',
      },
      labelStyle: { color: dark ? '#94a3b8' : '#64748b', fontSize: 11 },
    },
    dark,
  };
}

function Frame({ title, subtitle, action, height = 260, children }) {
  return (
    <Card className="overflow-hidden">
      {(title || action) && <CardHeader title={title} subtitle={subtitle} action={action} />}
      <div className="px-2 py-4" style={{ height }}>{children}</div>
    </Card>
  );
}

export function AreaChartCard({ title, subtitle, data, xKey, series, height = 260, action }) {
  const t = useChartTheme();
  return (
    <Frame title={title} subtitle={subtitle} height={height} action={action}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 6, right: 12, left: -18, bottom: 0 }}>
          <defs>
            {series.map((s, i) => (
              <linearGradient key={s.key} id={`g-${s.key}-${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color || PALETTE[i % PALETTE.length]} stopOpacity={0.35} />
                <stop offset="100%" stopColor={s.color || PALETTE[i % PALETTE.length]} stopOpacity={0.02} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={t.grid} vertical={false} />
          <XAxis dataKey={xKey} stroke={t.axis} fontSize={11} tickLine={false} axisLine={false} />
          <YAxis stroke={t.axis} fontSize={11} tickLine={false} axisLine={false} />
          <Tooltip {...t.tooltip} />
          {series.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" iconSize={7} />}
          {series.map((s, i) => (
            <Area key={s.key} type="monotone" dataKey={s.key} name={s.label || s.key}
              stroke={s.color || PALETTE[i % PALETTE.length]} strokeWidth={2}
              fill={`url(#g-${s.key}-${i})`} />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </Frame>
  );
}

export function BarChartCard({ title, subtitle, data, xKey, series, height = 260, stacked = false, action }) {
  const t = useChartTheme();
  return (
    <Frame title={title} subtitle={subtitle} height={height} action={action}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 6, right: 12, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={t.grid} vertical={false} />
          <XAxis dataKey={xKey} stroke={t.axis} fontSize={11} tickLine={false} axisLine={false} interval={0} angle={data?.length > 6 ? -25 : 0} textAnchor={data?.length > 6 ? 'end' : 'middle'} height={data?.length > 6 ? 55 : 30} />
          <YAxis stroke={t.axis} fontSize={11} tickLine={false} axisLine={false} />
          <Tooltip {...t.tooltip} cursor={{ fill: t.dark ? '#1e293b22' : '#00000010' }} />
          {series.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" iconSize={7} />}
          {series.map((s, i) => (
            <Bar key={s.key} dataKey={s.key} name={s.label || s.key} fill={s.color || PALETTE[i % PALETTE.length]}
              radius={[4, 4, 0, 0]} stackId={stacked ? 'a' : undefined} maxBarSize={46} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </Frame>
  );
}

export function LineChartCard({ title, subtitle, data, xKey, series, height = 260 }) {
  const t = useChartTheme();
  return (
    <Frame title={title} subtitle={subtitle} height={height}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 6, right: 12, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={t.grid} vertical={false} />
          <XAxis dataKey={xKey} stroke={t.axis} fontSize={11} tickLine={false} axisLine={false} />
          <YAxis stroke={t.axis} fontSize={11} tickLine={false} axisLine={false} />
          <Tooltip {...t.tooltip} />
          {series.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" iconSize={7} />}
          {series.map((s, i) => (
            <Line key={s.key} type="monotone" dataKey={s.key} name={s.label || s.key}
              stroke={s.color || PALETTE[i % PALETTE.length]} strokeWidth={2}
              dot={{ r: 3, strokeWidth: 0 }} activeDot={{ r: 5 }} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </Frame>
  );
}

export function DonutChartCard({ title, subtitle, data, nameKey = 'name', valueKey = 'value', height = 260, centerLabel }) {
  const t = useChartTheme();
  const total = (data || []).reduce((a, d) => a + Number(d[valueKey] || 0), 0);
  return (
    <Frame title={title} subtitle={subtitle} height={height}>
      <div className="flex h-full items-center gap-4 px-3">
        <ResponsiveContainer width="60%" height="100%">
          <PieChart>
            <Pie data={data} dataKey={valueKey} nameKey={nameKey} innerRadius="62%" outerRadius="88%"
              paddingAngle={2} stroke="none">
              {(data || []).map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
            </Pie>
            <Tooltip {...t.tooltip} />
          </PieChart>
        </ResponsiveContainer>
        <div className="min-w-0 flex-1 space-y-2">
          {centerLabel && (
            <p className="text-lg font-bold text-slate-900 dark:text-white">{centerLabel}</p>
          )}
          {(data || []).map((d, i) => (
            <div key={d[nameKey]} className="flex items-center gap-2 text-xs">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} />
              <span className="truncate text-slate-600 dark:text-slate-400">{d[nameKey]}</span>
              <span className="ml-auto font-semibold text-slate-800 dark:text-slate-200">{d[valueKey]}</span>
            </div>
          ))}
        </div>
      </div>
    </Frame>
  );
}

export { PALETTE };
export { CartesianAxis };
