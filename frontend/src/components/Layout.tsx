import { useTranslation } from 'react-i18next';
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { auth } from '../api';
import { queryClient } from '../services/queryClient';
import { enterClient, switchBusiness, useCurrentBusiness, useMe } from '../services/Business/businessQueries';
import Icon, { type IconName } from './Icon';
import LanguageSelect from './LanguageSelect';
import Logo from './Logo';
import { ErrorBox } from './ui';

type NavItem = { to: string; label: string; icon: IconName; end?: boolean; fullAccess?: boolean };

// fullAccess: vetëm për përdoruesit me qasje të plotë në biznes (jo vetëm disa ekrane).
const links: NavItem[] = [
  { to: '/', label: 'nav.dashboard', icon: 'dashboard', end: true },
  { to: '/screens', label: 'nav.screens', icon: 'screens' },
  { to: '/playlists', label: 'nav.playlists', icon: 'playlists' },
  { to: '/media', label: 'nav.media', icon: 'media' },
  { to: '/menu', label: 'nav.menu', icon: 'menu', fullAccess: true },
  { to: '/currencies', label: 'nav.currencies', icon: 'currency', fullAccess: true },
  { to: '/payment-methods', label: 'nav.paymentMethods', icon: 'payment', fullAccess: true },
  { to: '/settings', label: 'nav.settings', icon: 'settings' },
];

// Vetëm për administratorin (pronari brenda një klienti ose administratori i klientit).
const adminLinks: NavItem[] = [
  { to: '/businesses', label: 'nav.businesses', icon: 'business' },
  { to: '/users', label: 'nav.users', icon: 'users' },
];

// Vetëm për pronarin e aplikacionit.
const ownerLinks: NavItem[] = [
  { to: '/clients', label: 'nav.clients', icon: 'clients' },
];

export default function Layout() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: me, error } = useMe();
  const business = useCurrentBusiness();

  const logout = () => { auth.clear(); queryClient.clear(); navigate('/login'); };

  // Pronari pa klient të zgjedhur sheh vetëm listën e klientëve.
  const ownerHome = !!me?.isOwner && !me.client;

  // Faqet ngarkohen vetëm pasi dihet biznesi, që kërkesat të shkojnë te biznesi i duhur.
  let page = <Outlet />;
  if (!me) page = <ErrorBox error={error?.message ?? null} />;
  else if (ownerHome && location.pathname !== '/clients') page = <Navigate to="/clients" replace />;
  else if (ownerHome) page = <Outlet />;
  else if (!business && !me.isAdmin) page = <div className="empty">{t('businesses.noAccess')}</div>;
  else if (isBlocked(location.pathname, me, business?.fullAccess ?? false)) page = <Navigate to="/" replace />;

  async function backToClients() {
    await enterClient(null);
    navigate('/clients');
  }

  async function changeBusiness(id: number) {
    await switchBusiness(id);
    // Faqet me id (p.sh. /playlists/5) i përkasin biznesit të mëparshëm.
    if (/\/\d+/.test(location.pathname)) navigate('/playlists');
  }

  const visible = links.filter(l => !l.fullAccess || business?.fullAccess);

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <Logo size={36} withText tagline />
        </div>
        {me?.isOwner && me.client && (
          <div className="client-banner">
            <span>{t('clients.client')}</span>
            <strong>{me.client.name}</strong>
            <button className="link" onClick={backToClients}><Icon name="arrow-left" /> {t('clients.back')}</button>
          </div>
        )}
        {me && business && (me.businesses.length > 1 || me.isAdmin) && (
          <label className="business-switch">
            <span>{t('businesses.current')}</span>
            <select value={business.id} onChange={e => changeBusiness(Number(e.target.value))}>
              {me.businesses.map(b => (
                <option key={b.id} value={b.id}>{b.name}{b.fullAccess ? '' : ` (${t('businesses.screensOnly')})`}</option>
              ))}
            </select>
          </label>
        )}
        <nav>
          {ownerHome && ownerLinks.map(l => <Link key={l.to} item={l} />)}
          {!ownerHome && business && visible.map(l => <Link key={l.to} item={l} context={business.businessType} />)}
          {me?.isAdmin && !ownerHome && (
            <>
              <div className="nav-section">{t('nav.administration')}</div>
              {adminLinks.map(l => <Link key={l.to} item={l} />)}
            </>
          )}
        </nav>
        <div className="sidebar-footer">
          <a href="/player/" target="_blank" rel="noreferrer">{t('nav.openPlayer')} <Icon name="external-link" /></a>
          <LanguageSelect dark up />
          <div className="user">
            <span>{me?.username ?? auth.username}</span>
            <button className="link" onClick={logout}>
              <Icon name="logout" />{t('nav.logout')}
            </button>
          </div>
        </div>
      </aside>
      <main className="content">
        {page}
      </main>
    </div>
  );
}

function Link({ item, context }: { item: NavItem; context?: string }) {
  const { t } = useTranslation();
  return (
    <NavLink to={item.to} end={item.end} className={({ isActive }) => (isActive ? 'active' : '')}>
      <span className="nav-icon"><Icon name={item.icon} /></span>
      {t(item.label, { context })}
    </NavLink>
  );
}

/** Faqet që përdoruesi nuk i sheh (hapur p.sh. nga një link i vjetër) → kthehet te paneli. */
function isBlocked(path: string, me: { isAdmin: boolean; isOwner: boolean }, fullAccess: boolean) {
  const matches = (items: NavItem[]) => items.some(l => l.to !== '/' && path.startsWith(l.to));
  if (matches(ownerLinks)) return !me.isOwner;
  if (matches(adminLinks)) return !me.isAdmin;
  return !fullAccess && matches(links.filter(l => l.fullAccess));
}
