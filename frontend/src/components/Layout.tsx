import { useTranslation } from 'react-i18next';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { auth } from '../api';
import { queryClient } from '../services/queryClient';
import Icon, { type IconName } from './Icon';
import LanguageSelect from './LanguageSelect';
import Logo from './Logo';

const links: { to: string; label: string; icon: IconName; end?: boolean }[] = [
  { to: '/', label: 'nav.dashboard', icon: 'dashboard', end: true },
  { to: '/screens', label: 'nav.screens', icon: 'screens' },
  { to: '/playlists', label: 'nav.playlists', icon: 'playlists' },
  { to: '/media', label: 'nav.media', icon: 'media' },
  { to: '/menu', label: 'nav.menu', icon: 'menu' },
  { to: '/currencies', label: 'nav.currencies', icon: 'currency' },
  { to: '/payment-methods', label: 'nav.paymentMethods', icon: 'payment' },
  { to: '/settings', label: 'nav.settings', icon: 'settings' },
];

export default function Layout() {
  const { t } = useTranslation();
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
              <span className="nav-icon"><Icon name={l.icon} /></span>
              {t(l.label)}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <a href="/player/" target="_blank" rel="noreferrer">{t('nav.openPlayer')} <Icon name="external-link" /></a>
          <LanguageSelect dark up />
          <div className="user">
            <span>{auth.username}</span>
            <button className="link" onClick={() => { auth.clear(); queryClient.clear(); navigate('/login'); }}>
              <Icon name="logout" />{t('nav.logout')}
            </button>
          </div>
        </div>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
