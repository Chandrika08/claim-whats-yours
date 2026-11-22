import type { ButtonHTMLAttributes } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

// Utility group of a class token, e.g. "px-5" -> "px", "hover:bg-x" -> "hover:bg".
function groupOf(token: string): string {
  const colon = token.lastIndexOf(':');
  const prefix = token.slice(0, colon + 1);
  const rest = token.slice(colon + 1).replace(/^-/, '');
  const dash = rest.indexOf('-');
  return prefix + (dash === -1 ? rest : rest.slice(0, dash));
}

// Joins class names, dropping falsy values. Caller-supplied utilities replace
// base utilities of the same group (e.g. className="px-3" replaces "px-5").
function mergeClasses(base: string, ...overrides: Array<string | false | null | undefined>): string {
  const extra = overrides.filter(Boolean).join(' ').split(/\s+/).filter(Boolean);
  const overridden = new Set(extra.map(groupOf));
  const kept = base.split(/\s+/).filter((token) => token && !overridden.has(groupOf(token)));
  return [...kept, ...extra].join(' ');
}

const baseClasses = [
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 py-2.5 font-semibold',
  'transition duration-150 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
].join(' ');

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-primary-700 text-white shadow-sm hover:bg-primary-800',
  secondary: 'bg-accent-500 text-slate-900 shadow-sm hover:bg-accent-600',
  ghost: 'bg-transparent text-primary-700 hover:bg-primary-50',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export function Button({ variant = 'primary', className, type = 'button', ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={mergeClasses(`${baseClasses} ${variantClasses[variant]}`, className)}
      {...props}
    />
  );
}
