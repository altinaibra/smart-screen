import { FormEvent, useState } from 'react';
import { timeAgo } from '../api';
import TvSetupGuide from '../components/TvSetupGuide';
import { Empty, ErrorBox, Field, Modal, PageHeader } from '../components/ui';
import { usePlaylists } from '../services/Playlist/playlistQueries';
import { useDeleteScreen, usePairScreen, useReloadScreen, useScreens, useUpdateScreen } from '../services/Screen/screenQueries';
import { platformLabels, type Orientation, type PlaylistSummary, type Schedule, type Screen } from '../types';

const days = ['Di', 'Hë', 'Ma', 'Më', 'En', 'Pr', 'Sh']; // bit 0 = e diel

export default function ScreensPage() {
  const { data: screens = [], error: loadError } = useScreens();
  const { data: playlists = [] } = usePlaylists();
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
    setNotice(`"${s.name}" do të rifreskohet brenda ~15 sekondave.`);
  }

  async function remove(s: Screen) {
    if (!confirm(`Të fshihet ekrani "${s.name}"? TV-ja do të shfaqë një kod të ri çiftimi.`)) return;
    await deleteScreen(s.id).catch(e => setError(e.message));
  }

  return (
    <>
      <PageHeader
        title="Ekranet (TV)"
        subtitle="LG, Samsung, Android TV, Sony dhe çdo monitor me shfletues"
        actions={<button className="btn primary" onClick={() => setPairing(true)}>+ Shto ekran</button>}
      />
      <ErrorBox error={error ?? loadError?.message ?? null} />
      {notice && <div className="alert info" onClick={() => setNotice(null)}>{notice}</div>}

      <TvSetupGuide />

      {screens.length === 0 ? (
        <Empty>Ende nuk ka ekrane të lidhura.</Empty>
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
                  <div className="muted">{s.location || 'Pa vendndodhje'}</div>
                </div>
              </div>
              <dl className="kv">
                <dt>Statusi</dt><dd>{s.isOnline ? <span className="tag green">Online</span> : <span className="tag gray">Offline</span>} <span className="muted">{timeAgo(s.lastSeenAt)}</span></dd>
                <dt>Platforma</dt><dd>{platformLabels[s.platform]}</dd>
                <dt>Rezolucioni</dt><dd>{s.resolutionWidth}×{s.resolutionHeight} · {s.orientation === 'Portrait' ? 'Vertikal' : 'Horizontal'}</dd>
                <dt>Playlist-a</dt><dd>{s.defaultPlaylistName ?? <span className="muted">Asnjë</span>}</dd>
                <dt>Orare</dt><dd>{s.schedules.length ? `${s.schedules.length} orar(e)` : <span className="muted">—</span>}</dd>
              </dl>
              <div className="row-actions">
                <button className="btn" onClick={() => setEditing(s)}>Ndrysho</button>
                <button className="btn" onClick={() => reload(s)}>Rifresko TV</button>
                <button className="btn danger ghost" onClick={() => remove(s)}>Fshi</button>
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

function PairModal({ playlists, onClose, onDone }: { playlists: PlaylistSummary[]; onClose: () => void; onDone: () => void }) {
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
    <Modal title="Shto ekran të ri" onClose={onClose}
      footer={<><button className="btn" onClick={onClose}>Anulo</button><button className="btn primary" form="pair-form">Lidh ekranin</button></>}>
      <form id="pair-form" onSubmit={submit}>
        <ErrorBox error={error?.message ?? null} />
        <Field label="Kodi që shfaqet në TV">
          <input className="code-input" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="123456" inputMode="numeric" required autoFocus />
        </Field>
        <Field label="Emri i ekranit">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="p.sh. Menuja mbi arkë" required />
        </Field>
        <Field label="Vendndodhja">
          <input value={location} onChange={e => setLocation(e.target.value)} placeholder="p.sh. Dyqani Qendër" />
        </Field>
        <div className="grid-2">
          <Field label="Playlist-a">
            <select value={playlistId} onChange={e => setPlaylistId(e.target.value)}>
              <option value="">— Asnjë —</option>
              {playlists.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="Orientimi">
            <select value={orientation} onChange={e => setOrientation(e.target.value as Orientation)}>
              <option value="Landscape">Horizontal</option>
              <option value="Portrait">Vertikal (TV i rrotulluar)</option>
            </select>
          </Field>
        </div>
      </form>
    </Modal>
  );
}

function EditModal({ screen, playlists, onClose, onDone }: {
  screen: Screen; playlists: PlaylistSummary[]; onClose: () => void; onDone: () => void;
}) {
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
    <Modal title={`Ndrysho: ${screen.name}`} onClose={onClose} wide
      footer={<><button className="btn" onClick={onClose}>Anulo</button><button className="btn primary" form="edit-form">Ruaj</button></>}>
      <form id="edit-form" onSubmit={submit}>
        <ErrorBox error={error?.message ?? null} />
        <div className="grid-2">
          <Field label="Emri"><input value={name} onChange={e => setName(e.target.value)} required /></Field>
          <Field label="Vendndodhja"><input value={location} onChange={e => setLocation(e.target.value)} /></Field>
          <Field label="Playlist-a kryesore" hint="Luhet kur nuk ka orar aktiv">
            <select value={playlistId} onChange={e => setPlaylistId(e.target.value)}>
              <option value="">— Asnjë —</option>
              {playlists.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="Orientimi">
            <select value={orientation} onChange={e => setOrientation(e.target.value as Orientation)}>
              <option value="Landscape">Horizontal</option>
              <option value="Portrait">Vertikal (TV i rrotulluar)</option>
            </select>
          </Field>
        </div>

        <div className="section-title">
          <h4>Orare</h4>
          <span className="muted">p.sh. menuja e mëngjesit 07:00–11:00, oferta e drekës 12:00–15:00</span>
        </div>
        {schedules.length === 0 && <p className="muted">Nuk ka orare. Ekrani luan gjithmonë playlist-ën kryesore.</p>}
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
                <button type="button" key={d} className={`day ${s.daysOfWeek & (1 << bit) ? 'on' : ''}`}
                  onClick={() => updateSchedule(i, { daysOfWeek: s.daysOfWeek ^ (1 << bit) })}>{d}</button>
              ))}
            </div>
            <input type="number" title="Prioriteti" className="narrow" value={s.priority}
              onChange={e => updateSchedule(i, { priority: Number(e.target.value) })} />
            <button type="button" className="icon-btn" onClick={() => setSchedules(list => list.filter((_, idx) => idx !== i))}>✕</button>
          </div>
        ))}
        <button type="button" className="btn" disabled={!playlists.length}
          onClick={() => setSchedules(list => [...list, { playlistId: playlists[0].id, daysOfWeek: 127, startTime: '07:00', endTime: '11:00', priority: 0 }])}>
          + Shto orar
        </button>
      </form>
    </Modal>
  );
}
