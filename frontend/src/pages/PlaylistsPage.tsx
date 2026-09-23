import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, formatDuration } from '../api';
import { Empty, ErrorBox, Field, Modal, PageHeader } from '../components/ui';
import type { Playlist, PlaylistSummary } from '../types';

export default function PlaylistsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<PlaylistSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');

  const load = useCallback(() => {
    api<PlaylistSummary[]>('/playlists').then(setItems).catch(e => setError(e.message));
  }, []);
  useEffect(load, [load]);

  async function create(e: FormEvent) {
    e.preventDefault();
    try {
      const p = await api<Playlist>('/playlists', { method: 'POST', json: { name, items: [] } });
      navigate(`/playlists/${p.id}`);
    } catch (err) { setError((err as Error).message); }
  }

  async function duplicate(p: PlaylistSummary) {
    await api(`/playlists/${p.id}/duplicate`, { method: 'POST' }).catch(e => setError(e.message));
    load();
  }

  async function remove(p: PlaylistSummary) {
    if (!confirm(`Të fshihet playlist-a "${p.name}"?${p.screenCount ? ` Përdoret nga ${p.screenCount} ekran(e).` : ''}`)) return;
    await api(`/playlists/${p.id}`, { method: 'DELETE' }).catch(e => setError(e.message));
    load();
  }

  return (
    <>
      <PageHeader
        title="Playlistat"
        subtitle="Radha e reklamave, fotove, videove dhe menuve që luhen në TV"
        actions={<button className="btn primary" onClick={() => { setName(''); setCreating(true); }}>+ Playlist e re</button>}
      />
      <ErrorBox error={error} />

      {items.length === 0 ? <Empty>Nuk ka playlista.</Empty> : (
        <div className="card">
          <table className="table">
            <thead><tr><th>Emri</th><th>Slide</th><th>Kohëzgjatja</th><th>Ekrane</th><th /></tr></thead>
            <tbody>
              {items.map(p => (
                <tr key={p.id}>
                  <td>
                    <Link to={`/playlists/${p.id}`} className="strong">{p.name}</Link>
                    {p.description && <div className="muted">{p.description}</div>}
                  </td>
                  <td>{p.itemCount}</td>
                  <td>{formatDuration(p.totalDurationSeconds)}</td>
                  <td>{p.screenCount}</td>
                  <td className="right">
                    <Link to={`/playlists/${p.id}`} className="btn">Ndrysho</Link>{' '}
                    <button className="btn" onClick={() => duplicate(p)}>Kopjo</button>{' '}
                    <button className="btn danger ghost" onClick={() => remove(p)}>Fshi</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {creating && (
        <Modal title="Playlist e re" onClose={() => setCreating(false)}
          footer={<><button className="btn" onClick={() => setCreating(false)}>Anulo</button><button className="btn primary" form="new-pl">Krijo</button></>}>
          <form id="new-pl" onSubmit={create}>
            <Field label="Emri"><input value={name} onChange={e => setName(e.target.value)} placeholder="p.sh. Menuja e drekës" required autoFocus /></Field>
          </form>
        </Modal>
      )}
    </>
  );
}
