import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, timeAgo } from '../api';
import { Empty, ErrorBox, PageHeader } from '../components/ui';
import { platformLabels, type Dashboard } from '../types';

export default function DashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = () => api<Dashboard>('/dashboard').then(setData).catch(e => setError(e.message));
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, []);

  return (
    <>
      <PageHeader title="Paneli" subtitle="Pasqyrë e ekraneve dhe përmbajtjes" />
      <ErrorBox error={error} />
      {data && (
        <>
          <div className="stats">
            <Stat label="Ekrane online" value={`${data.screensOnline} / ${data.screensTotal}`} to="/screens" />
            <Stat label="Playlista" value={data.playlistCount} to="/playlists" />
            <Stat label="Foto & video" value={data.mediaCount} to="/media" />
            <Stat label="Produkte në menu" value={data.productCount} to="/menu" />
          </div>

          <div className="card">
            <div className="card-header">
              <h2>Statusi i ekraneve</h2>
              <Link to="/screens" className="btn">Menaxho ekranet</Link>
            </div>
            {data.screens.length === 0 ? (
              <Empty>
                Nuk keni asnjë ekran. Hapni <code>{location.origin}/player/</code> në TV dhe çiftojeni te <Link to="/screens">Ekranet</Link>.
              </Empty>
            ) : (
              <table className="table">
                <thead><tr><th>Ekrani</th><th>Platforma</th><th>Rezolucioni</th><th>Playlist-a</th><th>Parë së fundi</th></tr></thead>
                <tbody>
                  {data.screens.map(s => (
                    <tr key={s.id}>
                      <td><span className={`dot ${s.isOnline ? 'on' : 'off'}`} />{s.name}{s.location && <span className="muted"> · {s.location}</span>}</td>
                      <td>{platformLabels[s.platform]}</td>
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
