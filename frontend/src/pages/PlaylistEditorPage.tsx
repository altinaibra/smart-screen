import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { formatDuration } from '../api';
import MediaPicker, { MediaThumb } from '../components/MediaPicker';
import ScreenPreview, { resolutions } from '../components/ScreenPreview';
import { ErrorBox, Field, PageHeader } from '../components/ui';
import { useCategories } from '../services/Menu/menuQueries';
import { usePlaylist, usePlaylistPreview, useUpdatePlaylist } from '../services/Playlist/playlistQueries';
import { slideTypeLabels, type Category, type Media, type MediaType, type Orientation, type Playlist, type PlaylistItem, type SlideType } from '../types';

const newItem = (type: SlideType): PlaylistItem => ({
  type,
  durationSeconds: type === 'Video' ? 0 : type === 'Menu' ? 12 : 10,
  isEnabled: true,
  fit: 'Cover',
  title: type === 'Text' ? 'Titulli' : null,
  text: type === 'Text' ? 'Teksti i njoftimit' : null,
});

export default function PlaylistEditorPage() {
  const id = Number(useParams().id);
  const { data, error } = usePlaylist(id);
  const { data: categories = [] } = useCategories();

  if (!data) return <ErrorBox error={error?.message ?? null} />;
  // Redaktimi bëhet në një kopje lokale; rifreskimet e query-t nuk prishin ndryshimet e paruajtura.
  return <PlaylistEditor key={data.id} initial={data} categories={categories} />;
}

function PlaylistEditor({ initial, categories }: { initial: Playlist; categories: Category[] }) {
  const [playlist, setPlaylist] = useState<Playlist>(initial);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [picker, setPicker] = useState<{ index: number; type: MediaType } | null>(null);
  const [resIndex, setResIndex] = useState(0);
  const { mutateAsync: updatePlaylist } = useUpdatePlaylist();

  const resolution = resolutions[resIndex];
  const orientation: Orientation = resolution.h > resolution.w ? 'Portrait' : 'Landscape';

  const { data: preview = null } = usePlaylistPreview(playlist.id, orientation);

  const total = useMemo(
    () => playlist.items.filter(i => i.isEnabled).reduce((s, i) => s + i.durationSeconds, 0),
    [playlist],
  );

  const setItems = (fn: (items: PlaylistItem[]) => PlaylistItem[]) => {
    setPlaylist(p => ({ ...p, items: fn(p.items) }));
    setDirty(true);
    setSaved(false);
  };
  const update = (i: number, patch: Partial<PlaylistItem>) => setItems(items => items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const move = (i: number, dir: -1 | 1) => setItems(items => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return items;
    const copy = [...items];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    return copy;
  });

  async function save() {
    setError(null);
    try {
      // onSuccess rifreskon edhe preview-në dhe listat e playlistave/ekraneve.
      const res = await updatePlaylist({ id: playlist.id, name: playlist.name, description: playlist.description, items: playlist.items });
      setPlaylist(res);
      setDirty(false);
      setSaved(true);
    } catch (e) { setError((e as Error).message); }
  }

  function onPick(m: Media) {
    if (picker) update(picker.index, { mediaAssetId: m.id, mediaAsset: m, title: playlist.items[picker.index].title });
  }

  return (
    <>
      <PageHeader
        title={playlist.name}
        subtitle={`${playlist.items.length} slide · ${formatDuration(total)} për cikël`}
        actions={
          <>
            <Link to="/playlists" className="btn">← Kthehu</Link>
            <button className="btn primary" onClick={save} disabled={!dirty}>{saved ? '✓ U ruajt' : 'Ruaj ndryshimet'}</button>
          </>
        }
      />
      <ErrorBox error={error} />

      <div className="editor">
        <div className="editor-main">
          <div className="card">
            <div className="grid-2">
              <Field label="Emri"><input value={playlist.name} onChange={e => { setPlaylist({ ...playlist, name: e.target.value }); setDirty(true); }} /></Field>
              <Field label="Përshkrimi"><input value={playlist.description ?? ''} onChange={e => { setPlaylist({ ...playlist, description: e.target.value }); setDirty(true); }} /></Field>
            </div>
          </div>

          {playlist.items.map((item, i) => (
            <div key={i} className={`card slide-item ${item.isEnabled ? '' : 'disabled'}`}>
              <div className="slide-item-head">
                <span className="slide-index">{i + 1}</span>
                <span className={`tag type-${item.type}`}>{slideTypeLabels[item.type]}</span>
                <label className="inline-check">
                  <input type="checkbox" checked={item.isEnabled} onChange={e => update(i, { isEnabled: e.target.checked })} /> Aktiv
                </label>
                <div className="spacer" />
                <button className="icon-btn" onClick={() => move(i, -1)} disabled={i === 0} title="Lart">↑</button>
                <button className="icon-btn" onClick={() => move(i, 1)} disabled={i === playlist.items.length - 1} title="Poshtë">↓</button>
                <button className="icon-btn" onClick={() => setItems(items => [...items.slice(0, i + 1), { ...item, id: null }, ...items.slice(i + 1)])} title="Dyfisho">⧉</button>
                <button className="icon-btn danger" onClick={() => setItems(items => items.filter((_, idx) => idx !== i))} title="Fshi">✕</button>
              </div>
              <SlideFields item={item} categories={categories}
                onChange={patch => update(i, patch)}
                onPick={type => setPicker({ index: i, type })} />
            </div>
          ))}

          <div className="card add-slide">
            <span className="muted">Shto slide:</span>
            {(Object.keys(slideTypeLabels) as SlideType[]).map(t => (
              <button key={t} className="btn" onClick={() => setItems(items => [...items, newItem(t)])}>+ {slideTypeLabels[t]}</button>
            ))}
          </div>
        </div>

        <div className="editor-side">
          <div className="card sticky">
            <div className="card-header">
              <h2>Preview</h2>
              <select value={resIndex} onChange={e => setResIndex(Number(e.target.value))}>
                {resolutions.map((r, i) => <option key={r.label} value={i}>{r.label}</option>)}
              </select>
            </div>
            <ScreenPreview content={preview} resolution={resolution} />
            <p className="muted small">{dirty ? 'Ruani ndryshimet për të përditësuar preview-në.' : 'Kështu do të duket në TV. Ndryshimet arrijnë te ekranet brenda ~15 sekondave.'}</p>
          </div>
        </div>
      </div>

      {picker && <MediaPicker type={picker.type} onSelect={onPick} onClose={() => setPicker(null)} />}
    </>
  );
}

function SlideFields({ item, categories, onChange, onPick }: {
  item: PlaylistItem; categories: Category[];
  onChange: (patch: Partial<PlaylistItem>) => void; onPick: (type: MediaType) => void;
}) {
  const duration = (
    <Field label="Kohëzgjatja (sekonda)" hint={item.type === 'Video' ? '0 = luaj videon deri në fund' : undefined}>
      <input type="number" min={item.type === 'Video' ? 0 : 3} max={3600} value={item.durationSeconds}
        onChange={e => onChange({ durationSeconds: Number(e.target.value) })} />
    </Field>
  );
  const colors = (
    <>
      <Field label="Ngjyra e sfondit">
        <div className="color-input">
          <input type="color" value={item.backgroundColor ?? '#c8102e'} onChange={e => onChange({ backgroundColor: e.target.value })} />
          {item.backgroundColor && <button className="link" onClick={() => onChange({ backgroundColor: null })}>parazgjedhur</button>}
        </div>
      </Field>
      <Field label="Ngjyra e tekstit">
        <div className="color-input">
          <input type="color" value={item.textColor ?? '#ffffff'} onChange={e => onChange({ textColor: e.target.value })} />
          {item.textColor && <button className="link" onClick={() => onChange({ textColor: null })}>parazgjedhur</button>}
        </div>
      </Field>
    </>
  );

  switch (item.type) {
    case 'Image':
    case 'Video':
      return (
        <div className="slide-fields media-fields">
          <button className="thumb-btn" onClick={() => onPick(item.type as MediaType)}>
            <MediaThumb media={item.mediaAsset} />
            <span>{item.mediaAsset ? 'Ndrysho' : `Zgjidh ${item.type === 'Image' ? 'foton' : 'videon'}`}</span>
          </button>
          <div className="grid-2 grow">
            {duration}
            <Field label="Përshtatja">
              <select value={item.fit} onChange={e => onChange({ fit: e.target.value as PlaylistItem['fit'] })}>
                <option value="Cover">Mbush ekranin (pret skajet)</option>
                <option value="Contain">E plotë (me shirita)</option>
              </select>
            </Field>
            <Field label="Titull mbi foto (opsional)"><input value={item.title ?? ''} onChange={e => onChange({ title: e.target.value || null })} /></Field>
            <Field label="Nëntitull (opsional)"><input value={item.text ?? ''} onChange={e => onChange({ text: e.target.value || null })} /></Field>
          </div>
        </div>
      );
    case 'Menu':
      return (
        <div className="slide-fields grid-2">
          <Field label="Kategoria">
            <select value={item.menuCategoryId ?? ''} onChange={e => onChange({ menuCategoryId: e.target.value ? Number(e.target.value) : null })}>
              <option value="">★ Produktet e veçuara (oferta)</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name} ({c.products.length})</option>)}
            </select>
          </Field>
          {duration}
          <Field label="Titulli (opsional)" hint="Bosh = emri i kategorisë"><input value={item.title ?? ''} onChange={e => onChange({ title: e.target.value || null })} /></Field>
          {colors}
        </div>
      );
    case 'Text':
      return (
        <div className="slide-fields grid-2">
          <Field label="Titulli"><input value={item.title ?? ''} onChange={e => onChange({ title: e.target.value })} /></Field>
          {duration}
          <Field label="Teksti"><textarea rows={3} value={item.text ?? ''} onChange={e => onChange({ text: e.target.value })} /></Field>
          <div className="grid-2">{colors}</div>
        </div>
      );
    case 'WebPage':
      return (
        <div className="slide-fields grid-2">
          <Field label="URL" hint="Disa faqe nuk lejojnë shfaqjen brenda iframe."><input type="url" value={item.url ?? ''} placeholder="https://..." onChange={e => onChange({ url: e.target.value })} /></Field>
          {duration}
        </div>
      );
  }
}
