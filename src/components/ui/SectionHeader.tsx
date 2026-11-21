import type { ReactNode } from 'react';

export interface SectionHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  eyebrow?: ReactNode;
  icon?: ReactNode;
  className?: string;
}

export function SectionHeader({ title, subtitle, eyebrow, icon, className = '' }: SectionHeaderProps) {
  return (
    <header className={['flex items-start gap-3', className].join(' ')}>
      {icon && (
        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-700">
          {icon}
        </span>
      )}
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-wide text-accent-700">{eyebrow}</p>
        )}
        <h2 className="text-xl font-bold text-slate-900">{title}</h2>
        {subtitle && <p className="mt-1 text-base text-slate-600">{subtitle}</p>}
      </div>
    </header>
  );
}
