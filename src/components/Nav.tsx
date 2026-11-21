import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

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

export default function Nav() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <header className="sticky top-0 z-40 bg-white shadow-soft">
      <nav className="mx-auto flex max-w-2xl items-center justify-between gap-2 px-4 py-3">
        <NavLink to="/" end onClick={close} className="text-lg font-bold text-primary-800">
          Claim What&apos;s Yours
        </NavLink>

        <ul className="hidden gap-1 md:flex">
          {links.map((link) => (
            <li key={link.to}>
              <NavLink to={link.to} end={link.to === '/'} className={linkClass}>
                {link.label}
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
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
    </header>
  );
}
