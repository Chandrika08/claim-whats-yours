import type { ButtonHTMLAttributes, ReactNode } from 'react';

// Utility group of a class token, e.g. "px-4" -> "px", "hover:bg-x" -> "hover:bg".
function groupOf(token: string): string {
  const colon = token.lastIndexOf(':');
  const prefix = token.slice(0, colon + 1);
  const rest = token.slice(colon + 1).replace(/^-/, '');
  const dash = rest.indexOf('-');
  return prefix + (dash === -1 ? rest : rest.slice(0, dash));
}

// Joins class names, dropping falsy values. Caller-supplied utilities replace
// base utilities of the same group (e.g. className="px-3" replaces "px-4").
function mergeClasses(base: string, ...overrides: Array<string | false | null | undefined>): string {
  const extra = overrides.filter(Boolean).join(' ').split(/\s+/).filter(Boolean);
  const overridden = new Set(extra.map(groupOf));
  const kept = base.split(/\s+/).filter((token) => token && !overridden.has(groupOf(token)));
  return [...kept, ...extra].join(' ');
}

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
  icon?: ReactNode;
  children?: ReactNode;
}

export function Chip({ selected, icon, children, className, type = 'button', ...props }: ChipProps) {
  return (
    <button
      type={type}
      aria-pressed={selected === undefined ? undefined : selected}
      className={mergeClasses(
        [
          'inline-flex min-h-11 items-center gap-2 rounded-full border px-4 py-2 text-base font-medium',
          'transition duration-150 active:scale-[0.96] hover:shadow-sm',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
          selected
            ? 'border-primary-700 bg-primary-700 text-white'
            : 'border-slate-300 bg-white text-slate-800 hover:border-primary-500 hover:bg-primary-50',
        ].join(' '),
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
