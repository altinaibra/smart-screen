import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { auth } from '../api';
import { queryClient } from '../services/queryClient';
import Logo from './Logo';

const links = [
  { to: '/', label: 'Paneli', icon: '▦', end: true },
  { to: '/screens', label: 'Ekranet (TV)', icon: '▭' },
  { to: '/playlists', label: 'Playlistat', icon: '▶' },
  { to: '/media', label: 'Foto & Video', icon: '▣' },
  { to: '/menu', label: 'Menuja & Çmimet', icon: '☰' },
  { to: '/settings', label: 'Cilësimet', icon: '⚙' },
];

export default function Layout() {
  const navigate = useNavigate();

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <Logo size={36} withText tagline />
        </div>
        <nav>
          {links.map(l => (
            <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => (isActive ? 'active' : '')}>
              <span className="nav-icon">{l.icon}</span>
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <a href="/player/" target="_blank" rel="noreferrer">Hap player-in ↗</a>
          <div className="user">
            <span>{auth.username}</span>
            <button className="link" onClick={() => { auth.clear(); queryClient.clear(); navigate('/login'); }}>Dil</button>
          </div>
        </div>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
