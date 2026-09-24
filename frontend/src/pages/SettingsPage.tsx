import { FormEvent, useState } from 'react';
import MediaPicker from '../components/MediaPicker';
import { ErrorBox, Field, PageHeader } from '../components/ui';
import { useChangePassword } from '../services/Auth/authQueries';
import { useCurrencies, useSetMainCurrency } from '../services/Currency/currencyQueries';
import { useSettings, useUpdateSettings } from '../services/Settings/settingsQueries';
import type { Settings } from '../types';

const timeZones = ['Europe/Tirane', 'Europe/Belgrade', 'Europe/Skopje', 'Europe/Berlin', 'Europe/Rome', 'Europe/London', 'America/New_York', 'UTC'];

export default function SettingsPage() {
  const { data, error } = useSettings();
  if (!data) return <ErrorBox error={error?.message ?? null} />;
  // Formulari punon me një kopje lokale; rifreskimet e query-t nuk prishin ndryshimet e paruajtura.
  return <SettingsForm initial={data} />;
}

function SettingsForm({ initial }: { initial: Settings }) {
  const [s, setS] = useState<Settings>(initial);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [picking, setPicking] = useState(false);
  const { data: currencies = [] } = useCurrencies(true);
  const [chosenMainId, setChosenMainId] = useState<number | null>(null);
  const { mutateAsync: setMainCurrency } = useSetMainCurrency();
  const { mutateAsync: updateSettings } = useUpdateSettings();

  const currentMainId = currencies.find(c => c.isMainCurrency)?.currencyId ?? null;
  const mainId = chosenMainId ?? currentMainId;
  const set = (patch: Partial<Settings>) => { setS({ ...s, ...patch }); setSaved(false); };

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      // Monedha që shfaqet te çmimet është gjithmonë valuta kryesore (isMainCurrency).
      if (mainId !== null && mainId !== currentMainId) await setMainCurrency(mainId);
      setChosenMainId(null);
      setS(await updateSettings(s));
      setSaved(true);
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
            <Field label="Monedha" hint="Valuta kryesore – shfaqet te çmimet në panel dhe në TV">
              {currencies.length > 0 ? (
                <select value={mainId ?? ''} onChange={e => { setChosenMainId(Number(e.target.value)); setSaved(false); }}>
                  {currencies.map(c => (
                    <option key={c.currencyId} value={c.currencyId}>{c.currencyCode} – {c.currencyName} ({c.currencySymbol})</option>
                  ))}
                </select>
              ) : <input value={s.currency} disabled />}
            </Field>
          </div>
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
          </div>

          <h2>Ekrani</h2>
          <label className="inline-check"><input type="checkbox" checked={s.showClock} onChange={e => set({ showClock: e.target.checked })} /> Shfaq orën</label>
          <label className="inline-check"><input type="checkbox" checked={s.showTicker} onChange={e => set({ showTicker: e.target.checked })} /> Shfaq shiritin e lajmeve (poshtë)</label>
          {s.showTicker && (
            <Field label="Teksti i shiritit"><textarea rows={2} value={s.tickerText ?? ''} onChange={e => set({ tickerText: e.target.value })} /></Field>
          )}
          <Field label="Zona kohore" hint="Përdoret për oraret e playlistave">
            <select value={s.timeZoneId} onChange={e => set({ timeZoneId: e.target.value })}>
              {[...new Set([s.timeZoneId, ...timeZones])].map(tz => <option key={tz}>{tz}</option>)}
            </select>
          </Field>
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
  const { mutate: changePassword } = useChangePassword();

  function submit(e: FormEvent) {
    e.preventDefault();
    changePassword({ currentPassword: current, newPassword: next }, {
      onSuccess: () => { setMsg({ ok: true, text: 'Fjalëkalimi u ndryshua.' }); setCurrent(''); setNext(''); },
      onError: err => setMsg({ ok: false, text: err.message }),
    });
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
