import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Menu, Sparkles, X } from 'lucide-react';
import { loadTracker, TRACKER_CHANGED_EVENT, TRACKER_KEY } from '../lib/tracker';

const links = [
  { to: '/', label: 'Home' },
  { to: '/results', label: 'Results' },
  { to: '/tracker', label: 'Tracker' },
  { to: '/admin', label: 'Admin' },
  { to: '/partners', label: 'Partners' },
];

const MENU_ID = 'primary-nav-menu';

function linkClass({ isActive }: { isActive: boolean }) {
  return [
    'inline-flex min-h-[48px] items-center rounded-full px-4 py-2 text-base font-semibold transition duration-150',
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

function TrackerBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span
      aria-label={`${count} tracked`}
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
    <header className="sticky top-0 z-40 bg-white shadow-soft">
      <nav className="mx-auto flex max-w-2xl items-center justify-between gap-2 px-4 py-3">
        <NavLink to="/" end onClick={close} className="inline-flex items-center gap-2 text-2xl font-extrabold tracking-tight text-primary-800">
          <Sparkles aria-hidden="true" className="h-5 w-5 text-accent-700" />
          Hakku
          <span className="hidden sm:inline ml-2 text-xs font-normal text-primary-700">Claim what&apos;s yours</span>
        </NavLink>

        <ul className="hidden gap-1 md:flex">
          {links.map((link) => (
            <li key={link.to}>
              <NavLink to={link.to} end={link.to === '/'} className={linkClass}>
                {link.label}
                {link.to === '/tracker' && <TrackerBadge count={count} />}
              </NavLink>
            </li>
          ))}
        </ul>

        <button
          type="button"
          aria-expanded={open}
          aria-controls={MENU_ID}
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((prev) => !prev)}
          className="inline-flex min-h-[48px] min-w-[48px] items-center justify-center rounded-xl text-primary-800 transition duration-150 hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 md:hidden"
        >
          {open ? <X aria-hidden="true" className="h-6 w-6" /> : <Menu aria-hidden="true" className="h-6 w-6" />}
        </button>
      </nav>

      <div id={MENU_ID} hidden={!open} className="border-t border-slate-100 bg-white px-4 pb-3 md:hidden">
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
                {link.to === '/tracker' && <TrackerBadge count={count} />}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
    </header>
  );
}
