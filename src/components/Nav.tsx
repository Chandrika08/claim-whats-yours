import { NavLink } from 'react-router-dom';

const links = [
  { to: '/', label: 'Home' },
  { to: '/results', label: 'Results' },
  { to: '/tracker', label: 'Tracker' },
  { to: '/admin', label: 'Admin' },
  { to: '/partners', label: 'Partners' },
];

export default function Nav() {
  return (
    <nav className="border-b bg-white">
      <ul className="flex flex-wrap gap-4 px-4 py-3">
        {links.map((link) => (
          <li key={link.to}>
            <NavLink
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) =>
                isActive ? 'font-semibold text-green-700' : 'text-gray-600 hover:text-green-700'
              }
            >
              {link.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
