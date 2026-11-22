import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Menu, Sparkles, X } from 'lucide-react';
import { loadTracker, TRACKER_CHANGED_EVENT, TRACKER_KEY } from '../lib/tracker';
import { useLanguage } from '../i18n/useLanguage';
import LanguageSelector from './LanguageSelector';

const MENU_ID = 'primary-nav-menu';

function linkClass({ isActive }: { isActive: boolean }) {
  return [
    'inline-flex min-h-11 items-center rounded-full px-3 py-2 lg:px-4 text-base font-semibold transition duration-150',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
    isActive
      ? 'bg-primary-700 text-white shadow-soft'
      : 'text-slate-700 hover:bg-primary-50 hover:text-primary-800',
  ].join(' ');
}

function trackerCount(): number {
  try {
    return loadTracker().length;
  } catch {
    return 0;
  }
}

function TrackerBadge({ count, label }: { count: number; label: string }) {
  if (count === 0) return null;
  return (
    <span
      aria-label={label}
      className="ml-2 inline-flex min-w-[1.5rem] items-center justify-center rounded-full bg-accent-500 px-1.5 text-xs font-bold text-slate-900"
    >
      {count}
    </span>
  );
}

export default function Nav() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const location = useLocation();
  const [count, setCount] = useState(trackerCount);
  const { t } = useLanguage();

  const links = [
    { to: '/', label: t('nav.home') },
    { to: '/results', label: t('nav.results') },
    { to: '/tracker', label: t('nav.tracker') },
    { to: '/admin', label: t('nav.admin') },
    { to: '/partners', label: t('nav.partners') },
  ];

  useEffect(() => {
    const refresh = () => setCount(trackerCount());
    refresh();
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === TRACKER_KEY) refresh();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener(TRACKER_CHANGED_EVENT, refresh);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(TRACKER_CHANGED_EVENT, refresh);
    };
  }, [location.pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-stone-200 bg-white shadow-sm">
      <nav className="mx-auto flex max-w-2xl flex-wrap items-center justify-between gap-x-2 gap-y-2 px-4 py-3 md:max-w-3xl lg:max-w-5xl">
        <NavLink to="/" end onClick={close} className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap text-2xl font-extrabold tracking-tight text-primary">
          <Sparkles aria-hidden="true" className="h-5 w-5 text-accent-700" />
          Hakku
          <span className="ml-2 hidden whitespace-nowrap text-xs font-normal text-primary-700 lg:inline">{t('nav.tagline')}</span>
        </NavLink>

        <ul className="hidden flex-wrap items-center gap-1 md:flex">
          {links.map((link) => (
            <li key={link.to}>
              <NavLink to={link.to} end={link.to === '/'} className={linkClass}>
                {link.label}
                {link.to === '/tracker' && (
                  <TrackerBadge count={count} label={t('nav.trackedCount', { count })} />
                )}
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="flex shrink-0 items-center gap-2">
          <div className="hidden md:flex">
            <LanguageSelector />
          </div>
          <button
            type="button"
            aria-expanded={open}
            aria-controls={MENU_ID}
            aria-label={open ? t('nav.closeMenu') : t('nav.openMenu')}
            onClick={() => setOpen((prev) => !prev)}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-primary-800 transition duration-150 hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 md:hidden"
          >
            {open ? <X aria-hidden="true" className="h-6 w-6" /> : <Menu aria-hidden="true" className="h-6 w-6" />}
          </button>
        </div>
      </nav>

      <div id={MENU_ID} hidden={!open} className="border-t border-stone-200 bg-white px-4 pb-3 md:hidden">
        <ul className="flex flex-col gap-1 pt-2">
          {links.map((link) => (
            <li key={link.to}>
              <NavLink
                to={link.to}
                end={link.to === '/'}
                onClick={close}
                className={({ isActive }) => `${linkClass({ isActive })} w-full justify-start`}
              >
                {link.label}
                {link.to === '/tracker' && (
                  <TrackerBadge count={count} label={t('nav.trackedCount', { count })} />
                )}
              </NavLink>
            </li>
          ))}
        </ul>
        <div className="pt-3">
          <LanguageSelector />
        </div>
      </div>
    </header>
  );
}
