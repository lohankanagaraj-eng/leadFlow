import { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from 'lucide-react';

const ToastContext = createContext(null);
let idc = 0;

const icons = {
  success: <CheckCircle2 size={18} className="text-emerald-500" />,
  error: <XCircle size={18} className="text-rose-500" />,
  warning: <AlertTriangle size={18} className="text-amber-500" />,
  info: <Info size={18} className="text-sky-500" />,
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const toast = useCallback((message, type = 'success', title = null) => {
    const id = ++idc;
    setToasts((t) => [...t.slice(-3), { id, message, type, title }]);
    setTimeout(() => remove(id), 4200);
  }, [remove]);

  const api = {
    success: (m, t) => toast(m, 'success', t),
    error: (m, t) => toast(m, 'error', t),
    warning: (m, t) => toast(m, 'warning', t),
    info: (m, t) => toast(m, 'info', t),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[100] flex w-full max-w-sm flex-col gap-2">
        {toasts.map((t) => (
          <div key={t.id}
            className="pointer-events-auto flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-lg animate-slide-in dark:border-slate-700 dark:bg-slate-900">
            <div className="mt-0.5">{icons[t.type] || icons.info}</div>
            <div className="min-w-0 flex-1">
              {t.title && <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{t.title}</p>}
              <p className="text-sm text-slate-600 dark:text-slate-400">{t.message}</p>
            </div>
            <button onClick={() => remove(t.id)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <X size={15} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
};
