export interface ShimmerProps {
  count?: number;
  height?: string;
  className?: string;
}

export function Shimmer({ count = 3, height = '5rem', className = '' }: ShimmerProps) {
  return (
    <div className={['flex flex-col gap-3', className].join(' ')} aria-busy="true" aria-live="polite">
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="animate-shimmer rounded-2xl bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 bg-[length:200%_100%]"
          style={{ height }}
        />
      ))}
    </div>
  );
}
