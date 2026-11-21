import { LANGS, LANG_META } from '../i18n/types';
import { useLanguage } from '../i18n/useLanguage';

export default function LanguageSelector() {
  const { lang, setLang, t } = useLanguage();

  return (
    <div
      role="group"
      aria-label={t('nav.language')}
      className="inline-flex shrink-0 items-center rounded-full border border-primary-300 bg-white p-0.5 shadow-sm"
    >
      {LANGS.map((code) => {
        const active = code === lang;
        const meta = LANG_META[code];
        return (
          <button
            key={code}
            type="button"
            aria-label={meta.nativeName}
            aria-pressed={active}
            lang={meta.htmlLang}
            onClick={() => setLang(code)}
            className={`min-h-9 whitespace-nowrap rounded-full px-2.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 md:px-2.5 md:text-sm ${
              active
                ? 'bg-primary-700 text-white shadow'
                : 'text-primary-800 hover:bg-primary-50'
            }`}
          >
            <span className="md:hidden">{meta.shortName}</span>
            <span className="hidden md:inline">{meta.nativeName}</span>
          </button>
        );
      })}
    </div>
  );
}
