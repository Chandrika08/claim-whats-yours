import type { HTMLAttributes, ReactNode } from 'react';

export type BadgeTone = 'eligible' | 'possible' | 'notEligible' | 'info' | 'accent';

const toneClasses: Record<BadgeTone, string> = {
  eligible: 'bg-primary-100 text-primary-800 ring-primary-200',
  possible: 'bg-accent-100 text-possible ring-accent-200',
  notEligible: 'bg-slate-100 text-notEligible ring-slate-200',
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
