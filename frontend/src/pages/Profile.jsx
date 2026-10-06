import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, LogOut, ShieldCheck, Moon, Sun, Mail, Phone, Building, Fingerprint, RefreshCw } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import { useFetch } from '@/hooks/useFetch';
import { put, get } from '@/api/client';
import { PageHeader } from '@/components/Page';
import {
  Card, CardHeader, Badge, Button, Field, Input, Loading, ErrorState, Avatar,
} from '@/components/ui';
import { roleLabel } from '@/utils/constants';
import { format } from 'date-fns';

export default function Profile() {
  const { user, logout, refresh } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const toast = useToast();
  const navigate = useNavigate();

  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});
  const [done, setDone] = useState(false);

  const { data: mine, loading, error, reload } = useFetch('/activity', { params: { mine: '1', limit: 8 } });

  useEffect(() => { if (done) { const t = setTimeout(() => setDone(false), 2500); return () => clearTimeout(t); } return undefined; }, [done]);

  const changePassword = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    const form = new FormData(e.target);
    const currentPassword = form.get('currentPassword');
    const newPassword = form.get('newPassword');
    const confirm = form.get('confirm');

    if (newPassword !== confirm) {
      setErrors({ confirm: 'Passwords do not match' });
      setBusy(false);
      return;
    }
    try {
      await put('/auth/password', { currentPassword, newPassword });
      toast.success('Password updated', 'Use it next time you sign in');
      setDone(true);
      e.target.reset();
    } catch (err) {
      const map = {};
      (err.errors || []).forEach((x) => { map[x.path] = x.message; });
      setErrors(map);
      if (!map.currentPassword && !map.newPassword) toast.error(err.message);
    } finally { setBusy(false); }
  };

  const recheckSession = async () => {
    try { await refresh(); toast.success('Session refreshed'); } catch { /* handled in context */ }
  };

  if (loading && !mine) return <div className="p-6"><Loading /></div>;
  if (error && !mine) return <div className="p-6"><ErrorState error={error} onRetry={reload} /></div>;

  return (
    <div className="mx-auto max-w-[1100px] p-4 sm:p-6">
      <PageHeader title="Profile" subtitle="Your account, security and preferences."
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={toggleTheme}>
              {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
              {theme === 'dark' ? 'Light mode' : 'Dark mode'}
            </Button>
            <Button variant="secondary" size="sm" onClick={recheckSession}><RefreshCw size={14} /> Refresh session</Button>
            <Button variant="secondary" size="sm" className="!text-rose-500" onClick={logout}><LogOut size={14} /> Sign out</Button>
          </>
        } />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Identity */}
        <div className="space-y-5">
          <Card className="p-6 text-center">
            <Avatar name={user?.name} size={76} className="mx-auto" />
            <h3 className="mt-4 text-lg font-bold">{user?.name}</h3>
            <p className="text-sm text-slate-400">{user?.designation || roleLabel(user?.role)}</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <Badge color="bg-brand-500/10 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">{roleLabel(user?.role)}</Badge>
              {user?.department && <Badge>{user.department}</Badge>}
            </div>
            <div className="mt-5 space-y-2.5 border-t border-slate-100 pt-5 text-left text-sm dark:border-slate-800">
              <p className="flex items-center gap-2 text-slate-500"><Mail size={14} className="text-slate-400" /> {user?.email}</p>
              <p className="flex items-center gap-2 text-slate-500"><Phone size={14} className="text-slate-400" /> {user?.phone || '—'}</p>
              <p className="flex items-center gap-2 text-slate-500"><Building size={14} className="text-slate-400" /> {user?.employee_code || '—'}</p>
              <p className="flex items-center gap-2 text-slate-500"><Fingerprint size={14} className="text-slate-400" /> ID {user?.id}</p>
            </div>
          </Card>

          <Card>
            <CardHeader title="Session" />
            <div className="space-y-2 p-5 text-xs text-slate-500">
              <p className="flex items-center gap-2"><ShieldCheck size={14} className="text-emerald-500" /> Authenticated via JWT (Bearer)</p>
              <p>Token stored in <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">localStorage → lf_token</code></p>
              <p>Last refreshed: {format(new Date(), 'MMM d, yyyy HH:mm')}</p>
            </div>
          </Card>
        </div>

        {/* Password + activity */}
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <CardHeader title="Change password" subtitle="Minimum 8 characters" />
            <form onSubmit={changePassword} className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field label="Current password" required error={errors.currentPassword}>
                  <Input type="password" name="currentPassword" required autoComplete="current-password" placeholder="••••••••" />
                </Field>
              </div>
              <Field label="New password" required error={errors.newPassword}>
                <Input type="password" name="newPassword" required minLength={8} autoComplete="new-password" placeholder="At least 8 characters" />
              </Field>
              <Field label="Confirm new password" required error={errors.confirm}>
                <Input type="password" name="confirm" required minLength={8} autoComplete="new-password" placeholder="Repeat new password" />
              </Field>
              <div className="flex items-center gap-3 sm:col-span-2">
                <Button type="submit" loading={busy}><KeyRound size={14} /> Update password</Button>
                {done && <span className="text-xs font-medium text-emerald-500">Password updated successfully.</span>}
              </div>
            </form>
          </Card>

          <Card>
            <CardHeader title="My recent activity" action={
              <Button size="sm" variant="ghost" onClick={() => navigate('/activity')}>View all</Button>
            } />
            <div className="divide-y divide-slate-100 dark:divide-slate-800/70">
              {!(mine || []).length && <p className="px-5 py-8 text-center text-sm text-slate-400">No activity recorded yet.</p>}
              {(mine || []).map((a) => (
                <div key={a.id} className="flex items-center gap-3 px-5 py-3">
                  <Badge color={a.action === 'create' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                    : a.action === 'delete' ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300'
                      : 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300'}>
                    {a.action}
                  </Badge>
                  <span className="text-xs capitalize text-slate-400">{a.entity}</span>
                  <p className="min-w-0 flex-1 truncate text-sm text-slate-600 dark:text-slate-300">{a.summary}</p>
                  <span className="whitespace-nowrap text-[11px] text-slate-400">{format(new Date(a.created_at), 'MMM d, HH:mm')}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
