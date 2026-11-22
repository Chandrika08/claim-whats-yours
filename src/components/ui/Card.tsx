import type { HTMLAttributes } from 'react';

// Utility group of a class token, e.g. "p-5" -> "p", "hover:bg-x" -> "hover:bg".
function groupOf(token: string): string {
  const colon = token.lastIndexOf(':');
  const prefix = token.slice(0, colon + 1);
  const rest = token.slice(colon + 1).replace(/^-/, '');
  const dash = rest.indexOf('-');
  return prefix + (dash === -1 ? rest : rest.slice(0, dash));
}

// Joins class names, dropping falsy values. Caller-supplied utilities replace
// base utilities of the same group (e.g. className="p-0" replaces "p-5").
function mergeClasses(base: string, ...overrides: Array<string | false | null | undefined>): string {
  const extra = overrides.filter(Boolean).join(' ').split(/\s+/).filter(Boolean);
  const overridden = new Set(extra.map(groupOf));
  const kept = base.split(/\s+/).filter((token) => token && !overridden.has(groupOf(token)));
  return [...kept, ...extra].join(' ');
}

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  animate?: boolean;
}

export function Card({ animate = false, className, ...props }: CardProps) {
  return (
    <div
      className={mergeClasses(
        'rounded-xl border border-stone-200 bg-white p-5 shadow-sm',
        animate && 'animate-fadeSlideIn',
        className,
      )}
      {...props}
    />
  );
}
