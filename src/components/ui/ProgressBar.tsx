export type ProgressTone = 'primary' | 'accent' | 'eligible' | 'possible';

const fillClasses: Record<ProgressTone, string> = {
  primary: 'bg-primary-600',
  accent: 'bg-accent-500',
  eligible: 'bg-eligible',
  possible: 'bg-possible',
};

export interface ProgressBarProps {
  value: number;
  max: number;
  label?: string;
  tone?: ProgressTone;
  className?: string;
}

export function ProgressBar({ value, max, label, tone = 'primary', className = '' }: ProgressBarProps) {
  const safeMax = max > 0 ? max : 1;
  const clamped = Math.min(Math.max(value, 0), safeMax);
  const percent = Math.round((clamped / safeMax) * 100);

  return (
    <div className={['w-full', className].join(' ')}>
      {label && (
        <div className="mb-1 flex justify-between text-sm font-medium text-slate-700">
          <span>{label}</span>
          <span>{percent}%</span>
        </div>
      )}
      <div
        role="progressbar"
        aria-label={label}
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={max}
        className="h-3 w-full overflow-hidden rounded-full bg-slate-200"
      >
        <div
          className={['h-full rounded-full transition-[width] duration-500 ease-out', fillClasses[tone]].join(' ')}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
