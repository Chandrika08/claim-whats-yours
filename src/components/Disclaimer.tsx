import { Info } from 'lucide-react';
import { useLanguage } from '../i18n/useLanguage';

export default function Disclaimer() {
  const { t } = useLanguage();
  return (
    <footer className="mx-auto w-full max-w-2xl px-4 pb-6">
      <div className="flex items-start gap-3 rounded-2xl border border-accent-200 bg-accent-50 px-4 py-3 text-sm text-accent-900 shadow-soft">
        <Info aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-possible" />
        <p>{t('disclaimer.text')}</p>
      </div>
    </footer>
  );
}
