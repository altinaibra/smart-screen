import { FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { timeAgo } from '../api';
import Icon from '../components/Icon';
import TvSetupGuide from '../components/TvSetupGuide';
import { Empty, ErrorBox, Field, Modal, PageHeader } from '../components/ui';
import { confirmDialog } from '../components/ConfirmDialog';
import { useCurrentBusiness } from '../services/Business/businessQueries';
import { usePlaylists } from '../services/Playlist/playlistQueries';
import { useDeleteScreen, usePairScreen, useReloadScreen, useScreens, useUpdateScreen } from '../services/Screen/screenQueries';
import type { Orientation, PlaylistSummary, Schedule, Screen } from '../types';

export default function ScreensPage() {
  const { t } = useTranslation();
  const { data: screens = [], error: loadError } = useScreens();
  const { data: playlists = [] } = usePlaylists();
  // Pa qasje të plotë (vetëm disa ekrane): nuk shtohen dhe nuk fshihen ekrane.
  const fullAccess = useCurrentBusiness()?.fullAccess ?? false;
  const { mutateAsync: reloadScreen } = useReloadScreen();
  const { mutateAsync: deleteScreen } = useDeleteScreen();
  const [error, setError] = useState<string | null>(null);
  const [pairing, setPairing] = useState(false);
  const [editing, setEditing] = useState<Screen | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function reload(s: Screen) {
    try {
      await reloadScreen(s.id);
    } catch (e) { setError((e as Error).message); return; }
    setNotice(t('screens.reloadNotice', { name: s.name }));
  }

  async function remove(s: Screen) {
    if (!(await confirmDialog(t('screens.confirmDelete', { name: s.name })))) return;
    await deleteScreen(s.id).catch(e => setError(e.message));
  }

  return (
    <>
      <PageHeader
        title={t('screens.title')}
        subtitle={t('screens.subtitle')}
        actions={fullAccess && <button className="btn primary" onClick={() => setPairing(true)}><Icon name="plus" />{t('screens.add')}</button>}
      />
      <ErrorBox error={error ?? loadError?.message ?? null} />
      {notice && <div className="alert info" onClick={() => setNotice(null)}>{notice}</div>}

      {fullAccess && <TvSetupGuide />}

      {screens.length === 0 ? (
        <Empty>{t('screens.empty')}</Empty>
      ) : (
        <div className="screen-grid">
          {screens.map(s => (
            <div key={s.id} className="card screen-card">
              <div className="screen-card-top">
                <div className={`screen-shape ${s.orientation === 'Portrait' ? 'portrait' : ''}`}>
                  <span className={`dot ${s.isOnline ? 'on' : 'off'}`} />
                </div>
                <div>
                  <h3>{s.name}</h3>
                  <div className="muted">{s.location || t('screens.noLocation')}</div>
                </div>
              </div>
              <dl className="kv">
                <dt>{t('screens.status')}</dt><dd>{s.isOnline ? <span className="tag green">{t('common.online')}</span> : <span className="tag gray">{t('common.offline')}</span>} <span className="muted">{timeAgo(s.lastSeenAt)}</span></dd>
                <dt>{t('screens.platform')}</dt><dd>{t(`platform.${s.platform}`)}</dd>
                <dt>{t('screens.resolution')}</dt><dd>{s.resolutionWidth}×{s.resolutionHeight} · {s.orientation === 'Portrait' ? t('common.portrait') : t('common.landscape')}</dd>
                <dt>{t('common.playlist')}</dt><dd>{s.defaultPlaylistName ?? <span className="muted">{t('common.none')}</span>}</dd>
                <dt>{t('screens.schedules')}</dt><dd>{s.schedules.length ? t('screens.scheduleCount', { count: s.schedules.length }) : <span className="muted">—</span>}</dd>
              </dl>
              <div className="row-actions">
                <button className="btn" onClick={() => setEditing(s)}>{t('common.edit')}</button>
                <button className="btn" onClick={() => reload(s)}>{t('screens.reloadTv')}</button>
                {fullAccess && <button className="btn danger ghost" onClick={() => remove(s)}>{t('common.delete')}</button>}
              </div>
            </div>
          ))}
        </div>
      )}

      {pairing && <PairModal playlists={playlists} onClose={() => setPairing(false)} onDone={() => setPairing(false)} />}
      {editing && <EditModal screen={editing} playlists={playlists} onClose={() => setEditing(null)} onDone={() => setEditing(null)} />}
    </>
  );
}

function OrientationSelect({ value, onChange }: { value: Orientation; onChange: (o: Orientation) => void }) {
  const { t } = useTranslation();
  return (
    <select value={value} onChange={e => onChange(e.target.value as Orientation)}>
      <option value="Landscape">{t('common.landscape')}</option>
      <option value="Portrait">{t('common.portraitRotated')}</option>
    </select>
  );
}

function PairModal({ playlists, onClose, onDone }: { playlists: PlaylistSummary[]; onClose: () => void; onDone: () => void }) {
  const { t } = useTranslation();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [playlistId, setPlaylistId] = useState<string>(playlists[0]?.id.toString() ?? '');
  const [orientation, setOrientation] = useState<Orientation>('Landscape');
  const { mutate: pairScreen, error } = usePairScreen();

  function submit(e: FormEvent) {
    e.preventDefault();
    pairScreen(
      { pairingCode: code, name, location, defaultPlaylistId: playlistId ? Number(playlistId) : null, orientation },
      { onSuccess: onDone },
    );
  }

  return (
    <Modal title={t('screens.pairTitle')} onClose={onClose}
      footer={<><button className="btn" onClick={onClose}>{t('common.cancel')}</button><button className="btn primary" form="pair-form">{t('screens.pairSubmit')}</button></>}>
      <form id="pair-form" onSubmit={submit}>
        <ErrorBox error={error?.message ?? null} />
        <Field label={t('screens.pairCode')}>
          <input className="code-input" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="123456" inputMode="numeric" required autoFocus />
        </Field>
        <Field label={t('screens.screenName')}>
          <input value={name} onChange={e => setName(e.target.value)} placeholder={t('screens.screenNamePlaceholder')} required />
        </Field>
        <Field label={t('common.location')}>
          <input value={location} onChange={e => setLocation(e.target.value)} placeholder={t('screens.locationPlaceholder')} />
        </Field>
        <div className="grid-2">
          <Field label={t('common.playlist')}>
            <select value={playlistId} onChange={e => setPlaylistId(e.target.value)}>
              <option value="">{t('common.noneOption')}</option>
              {playlists.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label={t('common.orientation')}>
            <OrientationSelect value={orientation} onChange={setOrientation} />
          </Field>
        </div>
      </form>
    </Modal>
  );
}

function EditModal({ screen, playlists, onClose, onDone }: {
  screen: Screen; playlists: PlaylistSummary[]; onClose: () => void; onDone: () => void;
}) {
  const { t } = useTranslation();
  const days = t('screens.days').split(','); // bit 0 = e diel
  const [name, setName] = useState(screen.name);
  const [location, setLocation] = useState(screen.location ?? '');
  const [playlistId, setPlaylistId] = useState(screen.defaultPlaylistId?.toString() ?? '');
  const [orientation, setOrientation] = useState<Orientation>(screen.orientation);
  const [schedules, setSchedules] = useState<Schedule[]>(screen.schedules);
  const { mutate: updateScreen, error } = useUpdateScreen();

  const updateSchedule = (i: number, patch: Partial<Schedule>) =>
    setSchedules(list => list.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));

  function submit(e: FormEvent) {
    e.preventDefault();
    updateScreen(
      { id: screen.id, name, location, defaultPlaylistId: playlistId ? Number(playlistId) : null, orientation, schedules },
      { onSuccess: onDone },
    );
  }

  return (
    <Modal title={t('screens.editTitle', { name: screen.name })} onClose={onClose} wide
      footer={<><button className="btn" onClick={onClose}>{t('common.cancel')}</button><button className="btn primary" form="edit-form">{t('common.save')}</button></>}>
      <form id="edit-form" onSubmit={submit}>
        <ErrorBox error={error?.message ?? null} />
        <div className="grid-2">
          <Field label={t('common.name')}><input value={name} onChange={e => setName(e.target.value)} required /></Field>
          <Field label={t('common.location')}><input value={location} onChange={e => setLocation(e.target.value)} /></Field>
          <Field label={t('screens.mainPlaylist')} hint={t('screens.mainPlaylistHint')}>
            <select value={playlistId} onChange={e => setPlaylistId(e.target.value)}>
              <option value="">{t('common.noneOption')}</option>
              {playlists.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label={t('common.orientation')}>
            <OrientationSelect value={orientation} onChange={setOrientation} />
          </Field>
        </div>

        <div className="section-title">
          <h4>{t('screens.schedules')}</h4>
          <span className="muted">{t('screens.schedulesHint')}</span>
        </div>
        {schedules.length === 0 && <p className="muted">{t('screens.noSchedules')}</p>}
        {schedules.map((s, i) => (
          <div key={i} className="schedule-row">
            <select value={s.playlistId} onChange={e => updateSchedule(i, { playlistId: Number(e.target.value) })}>
              {playlists.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input type="time" value={s.startTime} onChange={e => updateSchedule(i, { startTime: e.target.value })} />
            <span>–</span>
            <input type="time" value={s.endTime} onChange={e => updateSchedule(i, { endTime: e.target.value })} />
            <div className="days">
              {days.map((d, bit) => (
                <button type="button" key={bit} className={`day ${s.daysOfWeek & (1 << bit) ? 'on' : ''}`}
                  onClick={() => updateSchedule(i, { daysOfWeek: s.daysOfWeek ^ (1 << bit) })}>{d}</button>
              ))}
            </div>
            <input type="number" title={t('screens.priority')} className="narrow" value={s.priority}
              onChange={e => updateSchedule(i, { priority: Number(e.target.value) })} />
            <button type="button" className="icon-btn" title={t('common.delete')}
              onClick={() => setSchedules(list => list.filter((_, idx) => idx !== i))}><Icon name="close" /></button>
          </div>
        ))}
        <button type="button" className="btn" disabled={!playlists.length}
          onClick={() => setSchedules(list => [...list, { playlistId: playlists[0].id, daysOfWeek: 127, startTime: '07:00', endTime: '11:00', priority: 0 }])}>
          <Icon name="plus" />{t('screens.addSchedule')}
        </button>
      </form>
    </Modal>
  );
}
