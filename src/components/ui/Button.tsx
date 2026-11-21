import type { ButtonHTMLAttributes } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-primary-700 text-white shadow-soft hover:bg-primary-800',
  secondary: 'bg-accent-500 text-slate-900 shadow-soft hover:bg-accent-600',
  ghost: 'bg-transparent text-primary-700 hover:bg-primary-50',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export function Button({ variant = 'primary', className = '', type = 'button', ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={[
        'inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl px-5 py-2.5 font-semibold',
        'transition duration-150 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        variantClasses[variant],
        className,
      ].join(' ')}
      {...props}
    />
  );
}
