import { Link } from 'react-router-dom';
import { Compass, ArrowLeft, LayoutDashboard } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 text-center dark:bg-slate-950">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-500">
        <Compass size={30} />
      </div>
      <p className="mt-6 text-7xl font-extrabold tracking-tight text-slate-200 dark:text-slate-800">404</p>
      <h1 className="mt-3 text-xl font-bold text-slate-800 dark:text-slate-100">Page not found</h1>
      <p className="mt-2 max-w-sm text-sm text-slate-500">
        The page you are looking for doesn’t exist or has been moved.
      </p>
      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        <Link to="/dashboard" className="btn btn-primary">
          <LayoutDashboard size={15} /> Back to dashboard
        </Link>
        <button onClick={() => window.history.back()} className="btn btn-secondary">
          <ArrowLeft size={15} /> Go back
        </button>
      </div>
    </div>
  );
}
