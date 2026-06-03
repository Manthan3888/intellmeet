import { cn } from '@/lib/utils';

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('rounded-xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur', className)}>
      {children}
    </div>
  );
}

export function CardHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-4">
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      {description && <p className="mt-1 text-sm text-slate-400">{description}</p>}
    </div>
  );
}

export function Badge({ children, variant = 'default' }: { children: React.ReactNode; variant?: 'default' | 'success' | 'warning' | 'live' }) {
  const variants = {
    default: 'bg-slate-800 text-slate-300',
    success: 'bg-emerald-500/20 text-emerald-400',
    warning: 'bg-amber-500/20 text-amber-400',
    live: 'bg-red-500/20 text-red-400 animate-pulse',
  };
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', variants[variant])}>
      {children}
    </span>
  );
}
