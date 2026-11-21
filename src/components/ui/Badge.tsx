import type { HTMLAttributes, ReactNode } from 'react';

export type BadgeTone = 'eligible' | 'possible' | 'notEligible' | 'info' | 'accent';

const toneClasses: Record<BadgeTone, string> = {
  eligible: 'bg-green-100 text-green-800 ring-green-200',
  possible: 'bg-amber-100 text-amber-800 ring-amber-200',
  notEligible: 'bg-slate-100 text-slate-700 ring-slate-200',
  info: 'bg-primary-50 text-primary-800 ring-primary-200',
  accent: 'bg-accent-100 text-accent-800 ring-accent-200',
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  icon?: ReactNode;
  children?: ReactNode;
}

export function Badge({ tone = 'info', icon, children, className = '', ...props }: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ring-1 ring-inset',
        toneClasses[tone],
        className,
      ].join(' ')}
      {...props}
    >
      {icon}
      {children}
    </span>
  );
}
