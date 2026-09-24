import { DragEvent, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatBytes } from '../api';
import Icon from '../components/Icon';
import { MediaThumb } from '../components/MediaPicker';
import { Empty, ErrorBox, PageHeader } from '../components/ui';
import { confirmDialog } from '../components/ConfirmDialog';
import { useDeleteMedia, useMediaList, useRenameMedia, useUploadMedia } from '../services/Media/mediaQueries';
import type { Media, MediaType } from '../types';

interface Upload { id: number; name: string; progress: number; done?: boolean; error?: string }
let uploadSeq = 0;

export default function MediaPage() {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<MediaType | ''>('');
  const { data: items = [], error: loadError } = useMediaList(filter || undefined);
  const { mutateAsync: uploadMedia } = useUploadMedia();
  const { mutateAsync: renameMedia } = useRenameMedia();
  const { mutateAsync: deleteMedia } = useDeleteMedia();
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function upload(files: FileList | File[]) {
    const list = Array.from(files).map(file => ({ file, id: ++uploadSeq }));
    setUploads(u => [...u, ...list.map(({ file, id }) => ({ id, name: file.name, progress: 0 }))]);
    const patch = (id: number, p: Partial<Upload>) => setUploads(u => u.map(x => (x.id === id ? { ...x, ...p } : x)));

    await Promise.all(list.map(async ({ file, id }) => {
      try {
        await uploadMedia({ file, onProgress: progress => patch(id, { progress }) });
        patch(id, { progress: 100, done: true });
      } catch (e) {
        patch(id, { error: (e as Error).message });
      }
    }));
    const finished = new Set(list.map(x => x.id));
    setTimeout(() => setUploads(u => u.filter(x => !(finished.has(x.id) && x.done))), 2000);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length) upload(e.dataTransfer.files);
  }

  async function rename(m: Media) {
    const name = prompt(t('common.newName'), m.name);
    if (!name || name === m.name) return;
    await renameMedia({ id: m.id, name }).catch(e => setError(e.message));
  }

  async function remove(m: Media) {
    if (!(await confirmDialog(t('media.confirmDelete', { name: m.name })))) return;
    await deleteMedia(m.id).catch(e => setError(e.message));
  }

  return (
    <>
      <PageHeader
        title={t('media.title')}
        subtitle={t('media.subtitle')}
        actions={
          <>
            <select value={filter} onChange={e => setFilter(e.target.value as MediaType | '')}>
              <option value="">{t('media.all')}</option>
              <option value="Image">{t('media.images')}</option>
              <option value="Video">{t('media.videos')}</option>
            </select>
            <button className="btn primary" onClick={() => inputRef.current?.click()}><Icon name="upload" />{t('media.upload')}</button>
          </>
        }
      />
      <ErrorBox error={error ?? loadError?.message ?? null} />

      <div
        className={`dropzone ${dragging ? 'over' : ''}`}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
      >
        <strong>{t('media.dropTitle')}</strong> {t('media.dropOr')}
        <div className="muted">{t('media.dropHint')}</div>
        <input ref={inputRef} type="file" multiple hidden accept="image/*,video/mp4,video/webm"
          onChange={e => { if (e.target.files) upload(e.target.files); e.target.value = ''; }} />
      </div>

      {uploads.length > 0 && (
        <div className="card uploads">
          {uploads.map(u => (
            <div key={u.id} className="upload-row">
              <span className="upload-name">{u.name}</span>
              {u.error ? <span className="text-danger">{u.error}</span> : (
                <div className="progress"><div style={{ width: `${u.progress}%` }} /></div>
              )}
            </div>
          ))}
        </div>
      )}

      {items.length === 0 ? <Empty>{t('media.empty')}</Empty> : (
        <div className="media-grid">
          {items.map(m => (
            <div key={m.id} className="media-card">
              <a href={m.url} target="_blank" rel="noreferrer"><MediaThumb media={m} /></a>
              <span className={`tag ${m.type === 'Video' ? 'purple' : 'blue'} media-type`}>{m.type === 'Video' ? t('media.video') : t('media.image')}</span>
              <div className="media-name" title={m.name}>{m.name}</div>
              <div className="media-meta">
                <span className="muted">{formatBytes(m.sizeBytes)}</span>
                <span>
                  <button className="link" onClick={() => rename(m)}>{t('common.rename')}</button>
                  <button className="link text-danger" onClick={() => remove(m)}>{t('common.delete')}</button>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
