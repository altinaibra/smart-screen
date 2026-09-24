import { FormEvent, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import Icon from '../components/Icon';
import MediaPicker from '../components/MediaPicker';
import { ErrorBox, Field, PageHeader } from '../components/ui';
import { changeLanguage, languages, type Language } from '../i18n';
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
  const { t } = useTranslation();
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
      <PageHeader title={t('settings.title')} subtitle={t('settings.subtitle')} />
      <ErrorBox error={error} />
      <div className="settings-layout">
        <form className="card" onSubmit={submit}>
          <h2>{t('settings.business')}</h2>
          <div className="grid-2">
            <Field label={t('settings.businessName')}><input value={s.businessName} onChange={e => set({ businessName: e.target.value })} required /></Field>
            <Field label={t('settings.currency')} hint={t('settings.currencyHint')}>
              {currencies.length > 0 ? (
                <select value={mainId ?? ''} onChange={e => { setChosenMainId(Number(e.target.value)); setSaved(false); }}>
                  {currencies.map(c => (
                    <option key={c.currencyId} value={c.currencyId}>{c.currencyCode} – {c.currencyName} ({c.currencySymbol})</option>
                  ))}
                </select>
              ) : <div className="muted"><Trans i18nKey="settings.noCurrencies" components={{ link: <Link to="/currencies" /> }} /></div>}
            </Field>
          </div>
          <Field label={t('settings.logo')}>
            <div className="logo-row">
              {s.logoUrl ? <img src={s.logoUrl} alt="logo" className="logo-preview" /> : <span className="muted">{t('settings.noLogo')}</span>}
              <button type="button" className="btn" onClick={() => setPicking(true)}>{t('settings.choose')}</button>
              {s.logoUrl && <button type="button" className="link" onClick={() => set({ logoAssetId: null, logoUrl: null })}>{t('settings.remove')}</button>}
            </div>
          </Field>
          <div className="grid-2">
            <Field label={t('settings.primaryColor')} hint={t('settings.primaryColorHint')}>
              <div className="color-input"><input type="color" value={s.primaryColor} onChange={e => set({ primaryColor: e.target.value })} /><code>{s.primaryColor}</code></div>
            </Field>
            <Field label={t('settings.accentColor')} hint={t('settings.accentColorHint')}>
              <div className="color-input"><input type="color" value={s.accentColor} onChange={e => set({ accentColor: e.target.value })} /><code>{s.accentColor}</code></div>
            </Field>
          </div>

          <h2>{t('settings.screen')}</h2>
          <label className="inline-check"><input type="checkbox" checked={s.showClock} onChange={e => set({ showClock: e.target.checked })} /> {t('settings.showClock')}</label>
          <label className="inline-check"><input type="checkbox" checked={s.showTicker} onChange={e => set({ showTicker: e.target.checked })} /> {t('settings.showTicker')}</label>
          {s.showTicker && (
            <Field label={t('settings.tickerText')}><textarea rows={2} value={s.tickerText ?? ''} onChange={e => set({ tickerText: e.target.value })} /></Field>
          )}
          <Field label={t('settings.timeZone')} hint={t('settings.timeZoneHint')}>
            <select value={s.timeZoneId} onChange={e => set({ timeZoneId: e.target.value })}>
              {[...new Set([s.timeZoneId, ...timeZones])].map(tz => <option key={tz}>{tz}</option>)}
            </select>
          </Field>
          <div className="form-actions">
            <button className="btn primary">{saved ? <><Icon name="check" />{t('common.saved')}</> : t('settings.save')}</button>
          </div>
        </form>

        <div className="settings-side">
          <LanguageCard />
          <PasswordCard />
        </div>
      </div>
      {picking && <MediaPicker type="Image" onClose={() => setPicking(false)} onSelect={m => set({ logoAssetId: m.id, logoUrl: m.url })} />}
    </>
  );
}

/** Gjuha e panelit (shqip / anglisht) – ndërrohet menjëherë dhe ruhet në shfletues. */
function LanguageCard() {
  const { t, i18n } = useTranslation();
  return (
    <div className="card">
      <h2>{t('settings.panel')}</h2>
      <Field label={t('common.language')} hint={t('settings.languageHint')}>
        <select value={i18n.language} onChange={e => changeLanguage(e.target.value as Language)}>
          {languages.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
        </select>
      </Field>
    </div>
  );
}

function PasswordCard() {
  const { t } = useTranslation();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const { mutate: changePassword } = useChangePassword();

  function submit(e: FormEvent) {
    e.preventDefault();
    changePassword({ currentPassword: current, newPassword: next }, {
      onSuccess: () => { setMsg({ ok: true, text: t('settings.passwordChanged') }); setCurrent(''); setNext(''); },
      onError: err => setMsg({ ok: false, text: err.message }),
    });
  }

  return (
    <form className="card" onSubmit={submit}>
      <h2>{t('settings.changePassword')}</h2>
      {msg && <div className={`alert ${msg.ok ? 'info' : 'error'}`}>{msg.text}</div>}
      <Field label={t('settings.currentPassword')}><input type="password" value={current} onChange={e => setCurrent(e.target.value)} required /></Field>
      <Field label={t('settings.newPassword')} hint={t('settings.newPasswordHint')}><input type="password" minLength={6} value={next} onChange={e => setNext(e.target.value)} required /></Field>
      <div className="form-actions"><button className="btn">{t('settings.change')}</button></div>
    </form>
  );
}
