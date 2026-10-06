import { useEffect } from 'react';
import { X, Loader2, Search, Inbox, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/utils/constants';

/* ---------------- Button ---------------- */
export function Button({ variant = 'primary', size = 'md', loading, children, className, ...props }) {
  const variants = {
    primary: 'btn-primary', secondary: 'btn-secondary', danger: 'btn-danger', ghost: 'btn-ghost', success: 'btn-success',
  };
  const sizes = { xs: 'px-2 py-1 text-[11px]', sm: 'px-2.5 py-1.5 text-xs', md: 'px-3.5 py-2 text-sm', lg: 'px-5 py-2.5 text-base' };
  return (
    <button className={cn(variants[variant], sizes[size], className)} disabled={loading || props.disabled} {...props}>
      {loading && <Loader2 size={15} className="animate-spin" />}
      {children}
    </button>
  );
}

/* ---------------- Card ---------------- */
export function Card({ className, children, ...props }) {
  return <div className={cn('card', className)} {...props}>{children}</div>;
}

export function CardHeader({ title, subtitle, action, className }) {
  return (
    <div className={cn('flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800', className)}>
      <div>
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

/* ---------------- Badge ---------------- */
export function Badge({ color = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300', children, className }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium', color, className)}>
      {children}
    </span>
  );
}

/* ---------------- Form primitives ---------------- */
export function Field({ label, error, required, hint, children }) {
  return (
    <div>
      {label && <label className="label">{label}{required && <span className="ml-0.5 text-rose-500">*</span>}</label>}
      {children}
      {error && <p className="mt-1 text-xs text-rose-500">{error}</p>}
      {!error && hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

export const Input = ({ className, ...p }) => <input className={cn('input', className)} {...p} />;
export const Textarea = ({ className, ...p }) => <textarea className={cn('input min-h-[80px]', className)} {...p} />;
export const Select = ({ className, children, ...p }) => (
  <select className={cn('input appearance-none', className)} {...p}>{children}</select>
);

/* ---------------- Spinner / Empty / Error ---------------- */
export function Spinner({ className, size = 20 }) {
  return <Loader2 size={size} className={cn('animate-spin text-brand-500', className)} />;
}

export function Loading({ label = 'Loading…', className }) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-2 py-14 text-slate-400', className)}>
      <Spinner size={26} />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function EmptyState({ title = 'Nothing here yet', description, action, icon: Icon = Inbox }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
        <Icon size={22} className="text-slate-400" />
      </div>
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</p>
      {description && <p className="max-w-sm text-xs text-slate-500 dark:text-slate-400">{description}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="flex flex-col items-center gap-2 py-12 text-center">
      <p className="text-sm font-semibold text-rose-500">Something went wrong</p>
      <p className="max-w-md text-xs text-slate-500">{error?.message || 'Unexpected error'}</p>
      {onRetry && <Button variant="secondary" size="sm" onClick={onRetry} className="mt-2">Retry</Button>}
    </div>
  );
}

/* ---------------- ProgressBar ---------------- */
export function ProgressBar({ value = 0, color, className, showLabel = false }) {
  const v = Math.min(100, Math.max(0, Number(value) || 0));
  const bar = color || (v >= 100 ? 'bg-emerald-500' : v >= 50 ? 'bg-brand-500' : v >= 25 ? 'bg-amber-500' : 'bg-slate-400');
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
        <div className={cn('h-full rounded-full transition-all duration-500', bar)} style={{ width: `${v}%` }} />
      </div>
      {showLabel && <span className="w-9 text-right text-xs font-medium text-slate-500">{v}%</span>}
    </div>
  );
}

/* ---------------- StatCard ---------------- */
export function StatCard({ title, value, sub, icon: Icon, tone = 'brand', trend }) {
  const tones = {
    brand: 'bg-brand-500/10 text-brand-500', emerald: 'bg-emerald-500/10 text-emerald-500',
    amber: 'bg-amber-500/10 text-amber-500', rose: 'bg-rose-500/10 text-rose-500',
    violet: 'bg-violet-500/10 text-violet-500', sky: 'bg-sky-500/10 text-sky-500',
  };
  return (
    <Card className="card-hover p-5">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{title}</p>
          <p className="mt-2 truncate text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
          {(sub || trend) && (
            <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{trend || sub}</p>
          )}
        </div>
        {Icon && (
          <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', tones[tone])}>
            <Icon size={19} />
          </div>
        )}
      </div>
    </Card>
  );
}

/* ---------------- Modal ---------------- */
export function Modal({ open, onClose, title, description, children, footer, size = 'md' }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;
  const sizes = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl' };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />
      <div className={cn('relative w-full rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900', sizes[size])} style={{ animation: 'fade-in .18s ease-out' }}>
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h3>
            {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800">
            <X size={18} />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3.5 dark:border-slate-800">{footer}</div>}
      </div>
    </div>
  );
}

/* ---------------- Confirm ---------------- */
export function ConfirmDialog({ open, onClose, onConfirm, title = 'Are you sure?', message, confirmLabel = 'Delete', loading }) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="danger" loading={loading} onClick={onConfirm}>{confirmLabel}</Button>
        </>
      }>
      <p className="text-sm text-slate-600 dark:text-slate-300">{message}</p>
    </Modal>
  );
}

/* ---------------- Tabs ---------------- */
export function Tabs({ tabs, active, onChange, className }) {
  return (
    <div className={cn('flex gap-1 overflow-x-auto border-b border-slate-200 dark:border-slate-800', className)}>
      {tabs.map((t) => {
        const key = typeof t === 'string' ? t : t.value;
        const label = typeof t === 'string' ? t : t.label;
        const count = typeof t === 'object' ? t.count : undefined;
        return (
          <button key={key} onClick={() => onChange(key)}
            className={cn('relative whitespace-nowrap px-3.5 py-2.5 text-sm font-medium transition-colors',
              active === key
                ? 'text-brand-600 dark:text-brand-300'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200')}>
            {label}
            {count != null && <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] dark:bg-slate-800">{count}</span>}
            {active === key && <span className="absolute inset-x-0 -bottom-px h-0.5 bg-brand-500" />}
          </button>
        );
      })}
    </div>
  );
}

/* ---------------- Pagination ---------------- */
export function Pagination({ page, limit = 15, total = 0, onPage }) {
  const pages = Math.max(1, Math.ceil(total / limit));
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 dark:border-slate-800">
      <p className="text-xs text-slate-500">
        Showing {((page - 1) * limit) + 1}–{Math.min(page * limit, total)} of {total}
      </p>
      <div className="flex items-center gap-1">
        <button className="btn-ghost !px-2 !py-1.5" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          <ChevronLeft size={15} />
        </button>
        <span className="px-2 text-xs font-medium text-slate-600 dark:text-slate-300">Page {page} of {pages}</span>
        <button className="btn-ghost !px-2 !py-1.5" disabled={page >= pages} onClick={() => onPage(page + 1)}>
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}

/* ---------------- SearchInput ---------------- */
export function SearchInput({ value, onChange, placeholder = 'Search…', className }) {
  return (
    <div className={cn('relative', className)}>
      <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="input !pl-9" />
    </div>
  );
}

/* ---------------- Avatar ---------------- */
export function Avatar({ name = '', size = 32, className }) {
  const letters = name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('') || '?';
  const palette = ['bg-brand-500/15 text-brand-600 dark:text-brand-300', 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300',
    'bg-violet-500/15 text-violet-600 dark:text-violet-300', 'bg-amber-500/15 text-amber-600 dark:text-amber-300',
    'bg-sky-500/15 text-sky-600 dark:text-sky-300'];
  const idx = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % palette.length;
  return (
    <div className={cn('flex shrink-0 items-center justify-center rounded-full font-semibold', palette[idx], className)}
      style={{ width: size, height: size, fontSize: size * 0.38 }}>
      {letters}
    </div>
  );
}
