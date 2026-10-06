import { useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { Eye, EyeOff, ShieldCheck, ArrowRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { Button, Input, Field } from '@/components/ui';

const DEMO = [
  { role: 'Admin', email: 'admin@leadflow.io' },
  { role: 'Employee', email: 'priya@leadflow.io' },
  { role: 'Developer', email: 'arun@leadflow.io' },
];

export default function Login() {
  const { login, isAuthenticated } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate(location.state?.from?.pathname || '/dashboard', { replace: true });
    } catch (err) {
      setError(err.errors?.length
        ? err.errors.map((x) => x.message).join(', ')
        : err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Brand panel */}
      <div className="relative hidden w-1/2 overflow-hidden bg-gradient-to-br from-brand-700 via-brand-800 to-slate-950 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-brand-500/20 blur-3xl" />
        <div className="absolute -bottom-40 -left-24 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-lg font-black text-white backdrop-blur">LF</div>
          <div>
            <p className="text-lg font-bold text-white">LeadFlow</p>
            <p className="text-xs text-white/60">Enterprise CRM Suite</p>
          </div>
        </div>

        <div className="relative">
          <h1 className="max-w-lg text-4xl font-bold leading-tight text-white">
            From first call to final deployment — one operating system.
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-white/70">
            Capture leads, run follow-ups, convert approvals into projects automatically,
            and track delivery with real-time dashboards and Power BI analytics.
          </p>
          <div className="mt-8 grid max-w-lg grid-cols-3 gap-3">
            {[['Leads →', 'Auto conversion'], ['Projects →', 'Stage pipeline'], ['Power BI →', 'Live analytics']].map(([a, b]) => (
              <div key={b} className="rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur">
                <p className="text-sm font-semibold text-white">{a}</p>
                <p className="text-xs text-white/60">{b}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-white/40">© {new Date().getFullYear()} LeadFlow · IT Services CRM</p>
      </div>

      {/* Form panel */}
      <div className="flex w-full items-center justify-center px-5 py-10 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-7 flex items-center justify-between">
            <div className="flex items-center gap-2.5 lg:hidden">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-sm font-black text-white">LF</div>
              <span className="font-bold">LeadFlow</span>
            </div>
            <button onClick={toggle} className="ml-auto rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
          </div>

          <div className="mb-6 flex items-center gap-2 text-brand-500">
            <ShieldCheck size={18} />
            <span className="text-xs font-semibold uppercase tracking-wider">JWT secured access</span>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Welcome back</h2>
          <p className="mt-1 text-sm text-slate-500">Sign in to your workspace to continue.</p>

          <form onSubmit={submit} className="mt-7 space-y-4">
            {error && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-600 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
                {error}
              </div>
            )}
            <Field label="Email address" required>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com" required autoFocus autoComplete="username" />
            </Field>
            <Field label="Password" required>
              <div className="relative">
                <Input type={show ? 'text' : 'password'} value={password}
                  onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required
                  autoComplete="current-password" className="pr-10" />
                <button type="button" onClick={() => setShow((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  {show ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </Field>
            <Button type="submit" loading={loading} className="w-full !py-2.5">
              Sign in <ArrowRight size={15} />
            </Button>
          </form>

          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-900">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Demo accounts · password Admin@123</p>
            <div className="space-y-1.5">
              {DEMO.map((d) => (
                <button key={d.email} type="button"
                  onClick={() => { setEmail(d.email); setPassword('Admin@123'); }}
                  className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs transition hover:border-brand-400 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-brand-500">
                  <span className="font-medium text-slate-700 dark:text-slate-300">{d.email}</span>
                  <span className="text-slate-400">{d.role}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
