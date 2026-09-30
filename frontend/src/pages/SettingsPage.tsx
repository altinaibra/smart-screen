import { FormEvent, useEffect, useState } from 'react';
import { api } from '../api';
import { refreshBranding } from '../branding';
import MediaPicker from '../components/MediaPicker';
import { ErrorBox, Field, PageHeader } from '../components/ui';
import type { Language, Settings } from '../types';

export default function SettingsPage() {
  const [s, setS] = useState<Settings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [picking, setPicking] = useState(false);

  const [languages, setLanguages] = useState<Language[]>([]);
  const [timeZones, setTimeZones] = useState<string[]>([]);

  useEffect(() => {
    api<Settings>('/settings').then(setS).catch(e => setError(e.message));
    api<Language[]>('/languages').then(setLanguages).catch(() => {});
    api<string[]>('/settings/timezones').then(setTimeZones).catch(() => {});
  }, []);

  if (!s) return <ErrorBox error={error} />;
  const set = (patch: Partial<Settings>) => { setS({ ...s, ...patch }); setSaved(false); };

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      setS(await api<Settings>('/settings', { method: 'PUT', json: s }));
      setSaved(true);
      refreshBranding();
    } catch (err) { setError((err as Error).message); }
  }

  return (
    <>
      <PageHeader title="Cilësimet" subtitle="Të dhënat e biznesit që shfaqen në të gjitha ekranet" />
      <ErrorBox error={error} />
      <div className="settings-layout">
        <form className="card" onSubmit={submit}>
          <h2>Biznesi</h2>
          <div className="grid-2">
            <Field label="Emri i biznesit"><input value={s.businessName} onChange={e => set({ businessName: e.target.value })} required /></Field>
            <Field label="Monedha"><input value={s.currency} onChange={e => set({ currency: e.target.value })} placeholder="L, €, $" required /></Field>
          </div>
          <Field label="Nëntitulli" hint="Shfaqet nën emrin (TV, paneli)"><input value={s.tagline ?? ''} onChange={e => set({ tagline: e.target.value })} /></Field>
          <Field label="Logo">
            <div className="logo-row">
              {s.logoUrl ? <img src={s.logoUrl} alt="logo" className="logo-preview" /> : <span className="muted">Pa logo</span>}
              <button type="button" className="btn" onClick={() => setPicking(true)}>Zgjidh</button>
              {s.logoUrl && <button type="button" className="link" onClick={() => set({ logoAssetId: null, logoUrl: null })}>Hiq</button>}
            </div>
          </Field>
          <div className="grid-2">
            <Field label="Ngjyra kryesore" hint="Sfondi i menuve dhe njoftimeve">
              <div className="color-input"><input type="color" value={s.primaryColor} onChange={e => set({ primaryColor: e.target.value })} /><code>{s.primaryColor}</code></div>
            </Field>
            <Field label="Ngjyra theksuese" hint="Shiriti i lajmeve, etiketat e ofertave">
              <div className="color-input"><input type="color" value={s.accentColor} onChange={e => set({ accentColor: e.target.value })} /><code>{s.accentColor}</code></div>
            </Field>
            <Field label="Teksti mbi ngjyrën theksuese" hint="Ngjyra e shkrimit në shirit dhe etiketa">
              <div className="color-input"><input type="color" value={s.accentTextColor} onChange={e => set({ accentTextColor: e.target.value })} /><code>{s.accentTextColor}</code></div>
            </Field>
            <Field label="Sfondi i ekraneve të sistemit" hint="Çiftimi, lidhja, pa përmbajtje">
              <div className="color-input"><input type="color" value={s.backgroundColor} onChange={e => set({ backgroundColor: e.target.value })} /><code>{s.backgroundColor}</code></div>
            </Field>
          </div>

          <h2>Ekrani</h2>
          <label className="inline-check"><input type="checkbox" checked={s.showClock} onChange={e => set({ showClock: e.target.checked })} /> Shfaq orën</label>
          <label className="inline-check"><input type="checkbox" checked={s.showTicker} onChange={e => set({ showTicker: e.target.checked })} /> Shfaq shiritin e lajmeve (poshtë)</label>
          {s.showTicker && (
            <Field label="Teksti i shiritit"><textarea rows={2} value={s.tickerText ?? ''} onChange={e => set({ tickerText: e.target.value })} /></Field>
          )}
          <div className="grid-2">
            <Field label="Gjuha në TV" hint="Tekstet menaxhohen te 'Tekstet e TV-së'">
              <select value={s.languageId ?? ''} onChange={e => set({ languageId: e.target.value ? Number(e.target.value) : null })}>
                {languages.length === 0 && <option value="">—</option>}
                {languages.map(l => <option key={l.id} value={l.id}>{l.name} ({l.code})</option>)}
              </select>
            </Field>
            <Field label="Zona kohore" hint="Përdoret për oraret e playlistave">
              <select value={s.timeZoneId} onChange={e => set({ timeZoneId: e.target.value })}>
                {[...new Set([s.timeZoneId, ...timeZones])].map(tz => <option key={tz}>{tz}</option>)}
              </select>
            </Field>
          </div>
          <div className="form-actions">
            <button className="btn primary">{saved ? '✓ U ruajt' : 'Ruaj cilësimet'}</button>
          </div>
        </form>

        <PasswordCard />
      </div>
      {picking && <MediaPicker type="Image" onClose={() => setPicking(false)} onSelect={m => set({ logoAssetId: m.id, logoUrl: m.url })} />}
    </>
  );
}

function PasswordCard() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    try {
      await api('/auth/password', { method: 'PUT', json: { currentPassword: current, newPassword: next } });
      setMsg({ ok: true, text: 'Fjalëkalimi u ndryshua.' });
      setCurrent(''); setNext('');
    } catch (err) { setMsg({ ok: false, text: (err as Error).message }); }
  }

  return (
    <form className="card" onSubmit={submit}>
      <h2>Ndrysho fjalëkalimin</h2>
      {msg && <div className={`alert ${msg.ok ? 'info' : 'error'}`}>{msg.text}</div>}
      <Field label="Fjalëkalimi aktual"><input type="password" value={current} onChange={e => setCurrent(e.target.value)} required /></Field>
      <Field label="Fjalëkalimi i ri" hint="Të paktën 6 karaktere"><input type="password" minLength={6} value={next} onChange={e => setNext(e.target.value)} required /></Field>
      <div className="form-actions"><button className="btn">Ndrysho</button></div>
    </form>
  );
}
