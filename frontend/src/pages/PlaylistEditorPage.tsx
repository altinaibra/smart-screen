import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import i18n from '../i18n';
import { formatDuration } from '../api';
import Icon from '../components/Icon';
import MediaPicker, { MediaThumb } from '../components/MediaPicker';
import ScreenPreview, { resolutions } from '../components/ScreenPreview';
import { ErrorBox, Field, PageHeader } from '../components/ui';
import { useCategories } from '../services/Menu/menuQueries';
import { usePlaylist, usePlaylistPreview, useUpdatePlaylist } from '../services/Playlist/playlistQueries';
import { slideTypes, type Category, type Media, type MediaType, type Orientation, type Playlist, type PlaylistItem, type SlideType } from '../types';

const durations: Record<SlideType, number> = { Video: 0, Menu: 12, Promo: 8, Combo: 9, Brand: 6, Image: 10, Text: 10, WebPage: 10 };

const newItem = (type: SlideType): PlaylistItem => ({
  type,
  durationSeconds: durations[type],
  isEnabled: true,
  fit: 'Cover',
  title: type === 'Text' ? i18n.t('editor.defaultTitle') : null,
  text: type === 'Text' ? i18n.t('editor.defaultText') : null,
  badge: type === 'Combo' ? i18n.t('editor.defaultKicker') : null,
  price: null,
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
  const { t } = useTranslation();
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
        subtitle={t('editor.summary', { count: playlist.items.length, duration: formatDuration(total) })}
        actions={
          <>
            <Link to="/playlists" className="btn"><Icon name="arrow-left" />{t('common.back')}</Link>
            <button className="btn primary" onClick={save} disabled={!dirty}>
              {saved ? <><Icon name="check" />{t('common.saved')}</> : t('editor.saveChanges')}
            </button>
          </>
        }
      />
      <ErrorBox error={error} />

      <div className="editor">
        <div className="editor-main">
          <div className="card">
            <div className="grid-2">
              <Field label={t('common.name')}><input value={playlist.name} onChange={e => { setPlaylist({ ...playlist, name: e.target.value }); setDirty(true); }} /></Field>
              <Field label={t('common.description')}><input value={playlist.description ?? ''} onChange={e => { setPlaylist({ ...playlist, description: e.target.value }); setDirty(true); }} /></Field>
            </div>
          </div>

          {playlist.items.map((item, i) => (
            <div key={i} className={`card slide-item ${item.isEnabled ? '' : 'disabled'}`}>
              <div className="slide-item-head">
                <span className="slide-index">{i + 1}</span>
                <span className={`tag type-${item.type}`}>{t(`slideType.${item.type}`)}</span>
                <label className="inline-check">
                  <input type="checkbox" checked={item.isEnabled} onChange={e => update(i, { isEnabled: e.target.checked })} /> {t('editor.active')}
                </label>
                <div className="spacer" />
                <button className="icon-btn" onClick={() => move(i, -1)} disabled={i === 0} title={t('editor.up')}><Icon name="arrow-up" /></button>
                <button className="icon-btn" onClick={() => move(i, 1)} disabled={i === playlist.items.length - 1} title={t('editor.down')}><Icon name="arrow-down" /></button>
                <button className="icon-btn" onClick={() => setItems(items => [...items.slice(0, i + 1), { ...item, id: null }, ...items.slice(i + 1)])} title={t('editor.duplicate')}><Icon name="copy" /></button>
                <button className="icon-btn danger" onClick={() => setItems(items => items.filter((_, idx) => idx !== i))} title={t('common.delete')}><Icon name="close" /></button>
              </div>
              <SlideFields item={item} categories={categories}
                onChange={patch => update(i, patch)}
                onPick={type => setPicker({ index: i, type })} />
            </div>
          ))}

          <div className="card add-slide">
            <span className="muted">{t('editor.addSlide')}</span>
            {slideTypes.map(type => (
              <button key={type} className="btn" onClick={() => setItems(items => [...items, newItem(type)])}><Icon name="plus" />{t(`slideType.${type}`)}</button>
            ))}
          </div>
        </div>

        <div className="editor-side">
          <div className="card sticky">
            <div className="card-header">
              <h2>{t('editor.preview')}</h2>
              <select value={resIndex} onChange={e => setResIndex(Number(e.target.value))}>
                {resolutions.map((r, i) => <option key={r.label} value={i}>{t(r.label)}</option>)}
              </select>
            </div>
            <ScreenPreview content={preview} resolution={resolution} />
            <p className="muted small">{dirty ? t('editor.previewDirty') : t('editor.previewHint')}</p>
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
  const { t } = useTranslation();
  const duration = (
    <Field label={t('editor.duration')} hint={item.type === 'Video' ? t('editor.durationVideoHint') : undefined}>
      <input type="number" min={item.type === 'Video' ? 0 : 3} max={3600} value={item.durationSeconds}
        onChange={e => onChange({ durationSeconds: Number(e.target.value) })} />
    </Field>
  );
  const colors = (
    <>
      <Field label={t('editor.bgColor')}>
        <div className="color-input">
          <input type="color" value={item.backgroundColor ?? '#c8102e'} onChange={e => onChange({ backgroundColor: e.target.value })} />
          {item.backgroundColor && <button className="link" onClick={() => onChange({ backgroundColor: null })}>{t('editor.defaultColor')}</button>}
        </div>
      </Field>
      <Field label={t('editor.textColor')}>
        <div className="color-input">
          <input type="color" value={item.textColor ?? '#ffffff'} onChange={e => onChange({ textColor: e.target.value })} />
          {item.textColor && <button className="link" onClick={() => onChange({ textColor: null })}>{t('editor.defaultColor')}</button>}
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
            <span>{item.mediaAsset ? t('editor.change') : item.type === 'Image' ? t('editor.pickImage') : t('editor.pickVideo')}</span>
          </button>
          <div className="grid-2 grow">
            {duration}
            <Field label={t('editor.fit')}>
              <select value={item.fit} onChange={e => onChange({ fit: e.target.value as PlaylistItem['fit'] })}>
                <option value="Cover">{t('editor.fitCover')}</option>
                <option value="Contain">{t('editor.fitContain')}</option>
              </select>
            </Field>
            <Field label={t('editor.overlayTitle')}><input value={item.title ?? ''} onChange={e => onChange({ title: e.target.value || null })} /></Field>
            <Field label={t('editor.overlayText')}><input value={item.text ?? ''} onChange={e => onChange({ text: e.target.value || null })} /></Field>
          </div>
        </div>
      );
    case 'Menu':
      return (
        <div className="slide-fields grid-2">
          <Field label={t('editor.category')}>
            <select value={item.menuCategoryId ?? ''} onChange={e => onChange({ menuCategoryId: e.target.value ? Number(e.target.value) : null })}>
              <option value="">★ {t('editor.featured')}</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name} ({c.products.length})</option>)}
            </select>
          </Field>
          {duration}
          <Field label={t('editor.menuTitle')} hint={t('editor.menuTitleHint')}><input value={item.title ?? ''} onChange={e => onChange({ title: e.target.value || null })} /></Field>
          {colors}
        </div>
      );
    case 'Text':
      return (
        <div className="slide-fields grid-2">
          <Field label={t('editor.title')}><input value={item.title ?? ''} onChange={e => onChange({ title: e.target.value })} /></Field>
          {duration}
          <Field label={t('editor.text')}><textarea rows={3} value={item.text ?? ''} onChange={e => onChange({ text: e.target.value })} /></Field>
          <div className="grid-2">{colors}</div>
        </div>
      );
    case 'Promo':
    case 'Combo': {
      const products = categories.flatMap(c => c.products);
      const fromProduct = (id: number) => {
        const p = products.find(x => x.id === id);
        if (p) onChange({ title: p.name, text: p.description ?? null, price: p.price });
      };
      return (
        <div className="slide-fields media-fields">
          <button className="thumb-btn" onClick={() => onPick('Image')}>
            <MediaThumb media={item.mediaAsset} />
            <span>{item.mediaAsset ? t('editor.change') : t('editor.pickImage')}</span>
          </button>
          <div className="grid-2 grow">
            {item.type === 'Promo' && products.length > 0 && (
              <Field label={t('editor.fromProduct')} hint={t('editor.fromProductHint')}>
                <select value="" onChange={e => e.target.value && fromProduct(Number(e.target.value))}>
                  <option value="">{t('editor.chooseProduct')}</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </Field>
            )}
            <Field label={item.type === 'Promo' ? t('editor.badge') : t('editor.kicker')} hint={item.type === 'Promo' ? t('editor.badgeHint') : t('editor.kickerHint')}>
              <input value={item.badge ?? ''} maxLength={100} onChange={e => onChange({ badge: e.target.value || null })} />
            </Field>
            <Field label={t('editor.title')} hint={t('editor.heroTitleHint')}>
              <textarea rows={2} value={item.title ?? ''} onChange={e => onChange({ title: e.target.value })} />
            </Field>
            <Field label={item.type === 'Promo' ? t('editor.text') : t('editor.items')} hint={item.type === 'Combo' ? t('editor.itemsHint') : undefined}>
              <textarea rows={3} value={item.text ?? ''} onChange={e => onChange({ text: e.target.value || null })} />
            </Field>
            <Field label={t('editor.price')} hint={t('editor.priceHint')}>
              <input type="number" step="any" min="0" value={item.price ?? ''}
                onChange={e => onChange({ price: e.target.value === '' ? null : Number(e.target.value) })} />
            </Field>
            {duration}
            {item.mediaAsset && <button className="link" onClick={() => onChange({ mediaAssetId: null, mediaAsset: null })}>{t('editor.removePhoto')}</button>}
          </div>
        </div>
      );
    }
    case 'Brand':
      return (
        <div className="slide-fields grid-2">
          <p className="muted">{t('editor.brandHint')}</p>
          {duration}
        </div>
      );
    case 'WebPage':
      return (
        <div className="slide-fields grid-2">
          <Field label={t('editor.url')} hint={t('editor.urlHint')}><input type="url" value={item.url ?? ''} placeholder="https://..." onChange={e => onChange({ url: e.target.value })} /></Field>
          {duration}
        </div>
      );
  }
}
