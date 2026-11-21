import { Info } from 'lucide-react';

export default function Disclaimer() {
  return (
    <footer className="mx-auto w-full max-w-2xl px-4 pb-6">
      <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-soft">
        <Info aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <p>Likely eligibility only, not a guarantee. Confirm with the official office before applying.</p>
      </div>
    </footer>
  );
}
