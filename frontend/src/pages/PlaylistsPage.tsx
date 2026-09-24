import { FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { formatDuration } from '../api';
import Icon from '../components/Icon';
import { Empty, ErrorBox, Field, Modal, PageHeader } from '../components/ui';
import { confirmDialog } from '../components/ConfirmDialog';
import { useCreatePlaylist, useDeletePlaylist, useDuplicatePlaylist, usePlaylists } from '../services/Playlist/playlistQueries';
import type { PlaylistSummary } from '../types';

export default function PlaylistsPage() {
  const { t } = useTranslation();
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
    const used = p.screenCount ? t('playlists.usedByScreens', { count: p.screenCount }) : '';
    if (!(await confirmDialog(t('playlists.confirmDelete', { name: p.name }) + used))) return;
    await deletePlaylist(p.id).catch(e => setError(e.message));
  }

  return (
    <>
      <PageHeader
        title={t('playlists.title')}
        subtitle={t('playlists.subtitle')}
        actions={<button className="btn primary" onClick={() => { setName(''); setCreating(true); }}><Icon name="plus" />{t('playlists.new')}</button>}
      />
      <ErrorBox error={error ?? loadError?.message ?? null} />

      {items.length === 0 ? <Empty>{t('playlists.empty')}</Empty> : (
        <div className="card">
          <table className="table">
            <thead>
              <tr><th>{t('common.name')}</th><th>{t('playlists.colSlides')}</th><th>{t('playlists.colDuration')}</th><th>{t('playlists.colScreens')}</th><th /></tr>
            </thead>
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
                    <Link to={`/playlists/${p.id}`} className="btn">{t('common.edit')}</Link>{' '}
                    <button className="btn" onClick={() => duplicate(p)}><Icon name="copy" />{t('playlists.duplicate')}</button>{' '}
                    <button className="btn danger ghost" onClick={() => remove(p)}>{t('common.delete')}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {creating && (
        <Modal title={t('playlists.new')} onClose={() => setCreating(false)}
          footer={<><button className="btn" onClick={() => setCreating(false)}>{t('common.cancel')}</button><button className="btn primary" form="new-pl">{t('playlists.create')}</button></>}>
          <form id="new-pl" onSubmit={create}>
            <Field label={t('common.name')}><input value={name} onChange={e => setName(e.target.value)} placeholder={t('playlists.namePlaceholder')} required autoFocus /></Field>
          </form>
        </Modal>
      )}
    </>
  );
}
