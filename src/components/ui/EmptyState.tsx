import type { ReactNode } from 'react';

export interface EmptyStateProps {
  title: ReactNode;
  description: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ title, description, icon, action, className = '' }: EmptyStateProps) {
  return (
    <div
      className={[
        'flex flex-col items-center gap-3 rounded-2xl border border-dashed border-primary-200 bg-white/60 px-6 py-10 text-center',
        className,
      ].join(' ')}
    >
      {icon && (
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-50 text-primary-700">
          {icon}
        </span>
      )}
      <h3 className="text-lg font-bold text-slate-900">{title}</h3>
      <p className="max-w-sm text-base text-slate-600">{description}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
