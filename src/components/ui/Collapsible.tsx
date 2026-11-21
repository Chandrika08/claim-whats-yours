import { useId, useState } from 'react';
import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

export interface CollapsibleProps {
  title: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
  id?: string;
  className?: string;
}

export function Collapsible({ title, defaultOpen = false, children, id, className = '' }: CollapsibleProps) {
  const [open, setOpen] = useState(defaultOpen);
  const generatedId = useId();
  const baseId = id ?? `collapsible-${generatedId}`;
  const contentId = `${baseId}-content`;

  return (
    <div className={['rounded-2xl border border-slate-200 bg-white', className].join(' ')} id={baseId}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={contentId}
        onClick={() => setOpen((prev) => !prev)}
        className="flex min-h-[48px] w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left font-semibold text-slate-900 transition duration-150 hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        <span>{title}</span>
        <ChevronDown
          aria-hidden="true"
          className={['h-5 w-5 shrink-0 text-primary-700 transition-transform duration-300', open ? 'rotate-180' : ''].join(' ')}
        />
      </button>
      <div
        className={[
          'grid transition-[grid-template-rows] duration-300 ease-in-out',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        ].join(' ')}
      >
        <div className="overflow-hidden">
          <div id={contentId} className="px-4 pb-4 pt-1 text-base text-slate-700">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
