import { Trans, useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { timeAgo } from '../api';
import { Empty, ErrorBox, PageHeader } from '../components/ui';
import { useDashboard } from '../services/Dashboard/dashboardQueries';

export default function DashboardPage() {
  const { t } = useTranslation();
  const { data, error } = useDashboard();

  return (
    <>
      <PageHeader title={t('dashboard.title')} subtitle={t('dashboard.subtitle')} />
      <ErrorBox error={error?.message ?? null} />
      {data && (
        <>
          <div className="stats">
            <Stat label={t('dashboard.screensOnline')} value={`${data.screensOnline} / ${data.screensTotal}`} to="/screens" />
            <Stat label={t('dashboard.playlists')} value={data.playlistCount} to="/playlists" />
            <Stat label={t('dashboard.media')} value={data.mediaCount} to="/media" />
            <Stat label={t('dashboard.products')} value={data.productCount} to="/menu" />
          </div>

          <div className="card">
            <div className="card-header">
              <h2>{t('dashboard.screenStatus')}</h2>
              <Link to="/screens" className="btn">{t('dashboard.manageScreens')}</Link>
            </div>
            {data.screens.length === 0 ? (
              <Empty>
                <Trans i18nKey="dashboard.noScreens" values={{ url: `${location.origin}/player/` }}
                  components={{ code: <code />, link: <Link to="/screens" /> }} />
              </Empty>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>{t('dashboard.colScreen')}</th><th>{t('dashboard.colPlatform')}</th><th>{t('dashboard.colResolution')}</th>
                    <th>{t('dashboard.colPlaylist')}</th><th>{t('dashboard.colLastSeen')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.screens.map(s => (
                    <tr key={s.id}>
                      <td><span className={`dot ${s.isOnline ? 'on' : 'off'}`} />{s.name}{s.location && <span className="muted"> · {s.location}</span>}</td>
                      <td>{t(`platform.${s.platform}`)}</td>
                      <td>{s.resolutionWidth}×{s.resolutionHeight}</td>
                      <td>{s.defaultPlaylistName ?? <span className="muted">—</span>}</td>
                      <td>{timeAgo(s.lastSeenAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </>
  );
}

function Stat({ label, value, to }: { label: string; value: number | string; to: string }) {
  return (
    <Link to={to} className="stat">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </Link>
  );
}
