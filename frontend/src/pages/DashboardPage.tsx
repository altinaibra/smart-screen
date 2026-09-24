import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { timeAgo } from '../api';
import Icon, { type IconName } from '../components/Icon';
import { Empty, ErrorBox } from '../components/ui';
import { useCurrentBusiness } from '../services/Business/businessQueries';
import { useDashboard } from '../services/Dashboard/dashboardQueries';
import { useBusinessType } from '../services/Settings/settingsQueries';
import type { Screen } from '../types';

type Filter = 'all' | 'online' | 'offline';

export default function DashboardPage() {
  const { t } = useTranslation();
  const { data, error } = useDashboard();
  const context = useBusinessType();
  const business = useCurrentBusiness();
  const fullAccess = business?.fullAccess ?? false;
  const [filter, setFilter] = useState<Filter>('all');

  const screens = data?.screens ?? [];
  const offline = screens.filter(s => !s.isOnline);
  const assigned = screens.filter(s => s.defaultPlaylistId != null).length;
  const shown = screens.filter(s => filter === 'all' || (filter === 'online') === s.isOnline);

  return (
    <>
      <div className="page-header">
        <div>
          {business && <div className="breadcrumb">{business.name}</div>}
          <h1>{t('dashboard.title')}</h1>
        </div>
        <div className="actions">
          <Link to="/media" className="btn">{t('dashboard.uploadMedia')}</Link>
          {fullAccess && <Link to="/screens?pair=1" className="btn primary"><Icon name="plus" />{t('dashboard.addScreen')}</Link>}
        </div>
      </div>
      <ErrorBox error={error?.message ?? null} />

      {data && offline.length > 0 && <OfflineAlert offline={offline} total={screens.length} troubleshoot={fullAccess} />}

      {data && (
        <>
          <div className="stats">
            <Stat to="/screens" icon="screens" label={t('dashboard.screensOnline')}
              value={data.screensOnline} total={data.screensTotal}
              note={screens.length === 0 ? t('dashboard.noScreensYet')
                : offline.length === screens.length ? t('dashboard.statAllOffline')
                  : offline.length ? t('dashboard.statSomeOffline', { count: offline.length }) : t('dashboard.statAllOnline')}
              tone={screens.length === 0 ? undefined : offline.length === screens.length ? 'danger' : offline.length ? 'warning' : 'success'} />
            <Stat to="/playlists" icon="playlists" label={t('dashboard.playlists')} value={data.playlistCount}
              note={t('dashboard.assignedTo', { count: assigned })} />
            <Stat to="/media" icon="media" label={t('dashboard.media')} value={data.mediaCount} note={t('dashboard.inLibrary')} />
            {fullAccess && <Stat to="/menu" icon="menu" label={t('dashboard.products', { context })} value={data.productCount}
              note={t('dashboard.acrossCategories')} />}
          </div>

          <div className="card table-card">
            <div className="table-card-header">
              <h2>{t('dashboard.screenStatus')}</h2>
              <div className="filter-tabs">
                {(['all', 'online', 'offline'] as Filter[]).map(f => (
                  <button key={f} type="button" className={filter === f ? 'active' : ''} onClick={() => setFilter(f)}>
                    {t(`dashboard.filter_${f}`)}
                    <span className="count">{f === 'all' ? screens.length : f === 'online' ? screens.length - offline.length : offline.length}</span>
                  </button>
                ))}
              </div>
              <span className="spacer" />
              <Link to="/screens" className="btn">{t('dashboard.manageScreens')}</Link>
            </div>
            {screens.length === 0 ? (
              <Empty>
                <Trans i18nKey="dashboard.noScreens" values={{ url: `${location.origin}/player/` }}
                  components={{ code: <code />, link: <Link to="/screens" /> }} />
              </Empty>
            ) : (
              <table className="table screen-table">
                <thead>
                  <tr>
                    <th>{t('dashboard.colScreen')}</th><th>{t('dashboard.colStatus')}</th><th>{t('dashboard.colPlaylist')}</th>
                    <th>{t('dashboard.colDevice')}</th><th className="right">{t('dashboard.colLastSeen')}</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map(s => <ScreenRow key={s.id} screen={s} />)}
                  {shown.length === 0 && <tr><td colSpan={5} className="muted center">{t('dashboard.noneInFilter')}</td></tr>}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </>
  );
}

function OfflineAlert({ offline, total, troubleshoot }: { offline: Screen[]; total: number; troubleshoot: boolean }) {
  const { t } = useTranslation();
  const all = offline.length === total;
  // Ekrani që është parë së fundi.
  const last = [...offline].sort((a, b) => (b.lastSeenAt ?? '').localeCompare(a.lastSeenAt ?? ''))[0];
  return (
    <div className={`status-alert ${all ? 'danger' : 'warning'}`}>
      <span className="status-alert-icon" aria-hidden="true">!</span>
      <div className="grow">
        <div className="status-alert-title">
          {all ? t('dashboard.allOffline', { count: total }) : t('dashboard.someOffline', { count: offline.length, total })}
        </div>
        <div className="status-alert-text">
          {last?.lastSeenAt
            ? t('dashboard.lastSignal', { time: timeAgo(last.lastSeenAt), name: [last.name, last.location].filter(Boolean).join(' · ') })
            : t('dashboard.checkDevices')}
        </div>
      </div>
      {troubleshoot && <Link to="/screens" className="status-alert-link">{t('dashboard.troubleshoot')} →</Link>}
    </div>
  );
}

function ScreenRow({ screen: s }: { screen: Screen }) {
  const { t } = useTranslation();
  return (
    <tr>
      <td>
        <div className="screen-cell">
          <span className={`screen-thumb ${s.orientation === 'Portrait' ? 'portrait' : ''}`}><span className={`dot ${s.isOnline ? 'on' : 'off'}`} /></span>
          <div>
            <div className="strong">{s.name}</div>
            {s.location && <div className="muted small">{s.location}</div>}
          </div>
        </div>
      </td>
      <td><span className={`status-pill ${s.isOnline ? 'online' : 'offline'}`}>{s.isOnline ? t('common.online') : t('common.offline')}</span></td>
      <td>{s.defaultPlaylistName ?? <span className="muted">—</span>}</td>
      <td>
        <div>{t(`platform.${s.platform}`)}</div>
        <div className="mono muted small">{s.resolutionWidth} × {s.resolutionHeight}</div>
      </td>
      <td className="right muted nowrap">{timeAgo(s.lastSeenAt)}</td>
    </tr>
  );
}

function Stat({ to, icon, label, value, total, note, tone }: {
  to: string; icon: IconName; label: string; value: number; total?: number; note: string; tone?: 'danger' | 'warning' | 'success';
}) {
  return (
    <Link to={to} className="stat">
      <div className="stat-head">
        <span className="stat-label">{label}</span>
        <span className="stat-icon"><Icon name={icon} /></span>
      </div>
      <div className="stat-value">{value}{total !== undefined && <span className="stat-total"> / {total}</span>}</div>
      <div className={`stat-note ${tone ?? ''}`}>{note}</div>
    </Link>
  );
}
