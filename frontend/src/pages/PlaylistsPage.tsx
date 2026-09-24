import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { formatDuration } from '../api';
import { Empty, ErrorBox, Field, Modal, PageHeader } from '../components/ui';
import { useCreatePlaylist, useDeletePlaylist, useDuplicatePlaylist, usePlaylists } from '../services/Playlist/playlistQueries';
import type { PlaylistSummary } from '../types';

export default function PlaylistsPage() {
  const navigate = useNavigate();
  const { data: items = [], error: loadError } = usePlaylists();
  const { mutateAsync: createPlaylist } = useCreatePlaylist();
  const { mutateAsync: duplicatePlaylist } = useDuplicatePlaylist();
  const { mutateAsync: deletePlaylist } = useDeletePlaylist();
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');

  async function create(e: FormEvent) {
    e.preventDefault();
    try {
      const p = await createPlaylist({ name, items: [] });
      navigate(`/playlists/${p.id}`);
    } catch (err) { setError((err as Error).message); }
  }

  async function duplicate(p: PlaylistSummary) {
    await duplicatePlaylist(p.id).catch(e => setError(e.message));
  }

  async function remove(p: PlaylistSummary) {
    if (!confirm(`Të fshihet playlist-a "${p.name}"?${p.screenCount ? ` Përdoret nga ${p.screenCount} ekran(e).` : ''}`)) return;
    await deletePlaylist(p.id).catch(e => setError(e.message));
  }

  return (
    <>
      <PageHeader
        title="Playlistat"
        subtitle="Radha e reklamave, fotove, videove dhe menuve që luhen në TV"
        actions={<button className="btn primary" onClick={() => { setName(''); setCreating(true); }}>+ Playlist e re</button>}
      />
      <ErrorBox error={error ?? loadError?.message ?? null} />

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
