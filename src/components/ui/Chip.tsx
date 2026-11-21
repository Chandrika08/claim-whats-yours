import type { ButtonHTMLAttributes, ReactNode } from 'react';

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
  icon?: ReactNode;
  children?: ReactNode;
}

export function Chip({ selected, icon, children, className = '', type = 'button', ...props }: ChipProps) {
  return (
    <button
      type={type}
      aria-pressed={selected === undefined ? undefined : selected}
      className={[
        'inline-flex min-h-[48px] items-center gap-2 rounded-full border px-4 py-2 text-base font-medium',
        'transition duration-150 active:scale-[0.96] hover:shadow-soft',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        selected
          ? 'border-primary-700 bg-primary-700 text-white'
          : 'border-slate-300 bg-white text-slate-800 hover:border-primary-500 hover:bg-primary-50',
        className,
      ].join(' ')}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
