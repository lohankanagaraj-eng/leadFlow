import { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Building2, PhoneCall, CalendarClock, UserCog, Code2,
  FolderKanban, BarChart3, Activity, LogOut, Sun, Moon, Bell, Menu, X, ChevronDown, Search, CheckCheck, ListChecks,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { get, post } from '@/api/client';
import { Avatar, Badge, Spinner } from '@/components/ui';
import { cn, roleLabel, NAV } from '@/utils/constants';

const ALL_NAV = [
  { key: 'dashboard', to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'leads', to: '/leads', label: 'Leads', icon: Users },
  { key: 'companies', to: '/companies', label: 'Companies', icon: Building2 },
  { key: 'followups', to: '/followups', label: 'Follow-Ups', icon: CalendarClock },
  { key: 'calls', to: '/calls', label: 'Call Tracking', icon: PhoneCall },
  { key: 'employees', to: '/employees', label: 'Employees', icon: UserCog },
  { key: 'developers', to: '/developers', label: 'Developers', icon: Code2 },
  { key: 'projects', to: '/projects', label: 'Projects', icon: FolderKanban },
  { key: 'tasks', to: '/tasks', label: 'My Tasks', icon: ListChecks },
  { key: 'analytics', to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { key: 'activity', to: '/activity', label: 'Activity Logs', icon: Activity },
];

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifs, setNotifs] = useState([]);
  const [unread, setUnread] = useState(0);
  const [notifLoading, setNotifLoading] = useState(false);
  const [clock, setClock] = useState(new Date());
  const notifRef = useRef(null);
  const profileRef = useRef(null);

  const allowed = NAV[user?.role] || [];
  const items = ALL_NAV.filter((n) => allowed.includes(n.key));

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => { setSidebarOpen(false); setNotifOpen(false); setProfileOpen(false); }, [location.pathname]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await get('/notifications', { limit: 12 });
        if (!active) return;
        setNotifs(res.data || []);
        setUnread(res.meta?.unread || 0);
      } catch { /* offline / expired */ }
    };
    load();
    const t = setInterval(load, 45000);
    return () => { active = false; clearInterval(t); };
  }, []);

  useEffect(() => {
    const onClick = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const openNotifications = async () => {
    setNotifOpen((o) => !o);
    if (unread > 0) {
      setNotifLoading(true);
      try {
        await post('/notifications/read-all');
        setUnread(0);
        setNotifs((n) => n.map((x) => ({ ...x, is_read: 1 })));
      } catch { /* ignore */ }
      setNotifLoading(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* Sidebar */}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-200 dark:border-slate-800 dark:bg-slate-900 lg:static lg:translate-x-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full')}>
        <div className="flex h-16 items-center justify-between gap-2 border-b border-slate-200 px-5 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-black text-white">LF</div>
            <div>
              <p className="text-sm font-bold leading-none text-slate-900 dark:text-white">LeadFlow</p>
              <p className="mt-0.5 text-[10px] uppercase tracking-widest text-slate-400">Enterprise CRM</p>
            </div>
          </div>
          <button className="lg:hidden" onClick={() => setSidebarOpen(false)}><X size={18} /></button>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          {items.map((item) => (
            <NavLink key={item.key} to={item.to}
              className={({ isActive }) => cn('nav-link', isActive && 'nav-link-active')}>
              <item.icon size={17} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-200 p-3 dark:border-slate-800">
          <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">System status</p>
            <div className="mt-1.5 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              API online · {clock.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-slate-950/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
          <button className="lg:hidden" onClick={() => setSidebarOpen(true)}><Menu size={20} /></button>

          <div className="relative hidden md:block">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              placeholder="Search leads, projects…"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.target.value.trim()) {
                  navigate(`/leads?search=${encodeURIComponent(e.target.value.trim())}`);
                  e.target.value = '';
                }
              }}
              className="input w-72 !pl-9" />
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            <button onClick={toggle}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              title="Toggle theme">
              {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            </button>

            <div className="relative" ref={notifRef}>
              <button onClick={openNotifications}
                className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800">
                <Bell size={17} />
                {unread > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </button>
              {notifOpen && (
                <div className="absolute right-0 top-11 w-80 animate-fade-in overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5 dark:border-slate-800">
                    <p className="text-sm font-semibold">Notifications</p>
                    {notifLoading && <Spinner size={14} />}
                    <button onClick={async () => { await post('/notifications/read-all'); setNotifs((n) => n.map((x) => ({ ...x, is_read: 1 }))); setUnread(0); }}
                      className="flex items-center gap-1 text-xs text-brand-500 hover:text-brand-400">
                      <CheckCheck size={13} /> Mark all
                    </button>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {!notifs.length && <p className="px-4 py-8 text-center text-xs text-slate-400">No notifications yet</p>}
                    {notifs.map((n) => (
                      <button key={n.id}
                        onClick={() => { if (n.link) navigate(n.link); setNotifOpen(false); if (!n.is_read) { post(`/notifications/${n.id}/read`); setUnread((u) => Math.max(0, u - 1)); } }}
                        className={cn('flex w-full gap-3 border-b border-slate-100 px-4 py-3 text-left hover:bg-slate-50 dark:border-slate-800/60 dark:hover:bg-slate-800/50',
                          !n.is_read && 'bg-brand-50/60 dark:bg-brand-500/5')}>
                        <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full',
                          n.type === 'success' ? 'bg-emerald-500' : n.type === 'warning' ? 'bg-amber-500' : n.type === 'assignment' ? 'bg-brand-500' : 'bg-sky-500')} />
                        <span className="min-w-0">
                          <span className="block truncate text-xs font-semibold text-slate-800 dark:text-slate-100">{n.title}</span>
                          <span className="block truncate text-xs text-slate-500">{n.body}</span>
                          <span className="mt-0.5 block text-[10px] text-slate-400">{new Date(n.created_at).toLocaleString()}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="relative" ref={profileRef}>
              <button onClick={() => setProfileOpen((o) => !o)}
                className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 hover:bg-slate-100 dark:hover:bg-slate-800">
                <Avatar name={user?.name} size={30} />
                <span className="hidden text-left sm:block">
                  <span className="block text-xs font-semibold leading-tight text-slate-800 dark:text-slate-100">{user?.name}</span>
                  <span className="block text-[10px] uppercase tracking-wide text-slate-400">{roleLabel(user?.role)}</span>
                </span>
                <ChevronDown size={14} className="text-slate-400" />
              </button>
              {profileOpen && (
                <div className="absolute right-0 top-12 w-52 animate-fade-in overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl dark:border-slate-800 dark:bg-slate-900">
                  <div className="border-b border-slate-100 px-4 py-2 dark:border-slate-800">
                    <p className="truncate text-xs font-semibold">{user?.email}</p>
                    <p className="text-[10px] text-slate-400">{user?.employee_code} · {user?.department}</p>
                  </div>
                  <button onClick={() => navigate('/profile')}
                    className="flex w-full items-center gap-2 px-4 py-2 text-xs text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800">
                    <UserCog size={14} /> My profile
                  </button>
                  <button onClick={logout}
                    className="flex w-full items-center gap-2 px-4 py-2 text-xs text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10">
                    <LogOut size={14} /> Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
