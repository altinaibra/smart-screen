import { FormEvent, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import Icon from '../components/Icon';
import LanguageSelect from '../components/LanguageSelect';
import MediaPicker from '../components/MediaPicker';
import { ErrorBox, Field, PageHeader } from '../components/ui';
import { useChangePassword } from '../services/Auth/authQueries';
import { useCurrentBusiness } from '../services/Business/businessQueries';
import { useCurrencies, useSetMainCurrency } from '../services/Currency/currencyQueries';
import { useSettings, useUpdateSettings } from '../services/Settings/settingsQueries';
import type { BusinessType, Settings } from '../types';

/** Llojet e biznesit dhe ngjyra që sugjerohet për secilin (si në dizajn). */
const businessTypes: { type: BusinessType; color: string }[] = [
  { type: 'restaurant', color: '#e8452f' },
  { type: 'barber', color: '#2f7bf5' },
  { type: 'shop', color: '#d63a7a' },
];

/** Ngjyrat e gatshme të dizajnit (mund të zgjidhet edhe çdo ngjyrë tjetër). */
const themeColors = ['#e8452f', '#2f7bf5', '#1fa36b', '#d63a7a', '#f08a24', '#7b4ff0'];

const timeZones = ['Europe/Tirane', 'Europe/Belgrade', 'Europe/Skopje', 'Europe/Berlin', 'Europe/Rome', 'Europe/London', 'America/New_York', 'UTC'];

export default function SettingsPage() {
  const { t } = useTranslation();
  const fullAccess = useCurrentBusiness()?.fullAccess ?? false;
  const { data, error } = useSettings();
  // Pa qasje të plotë në biznes: vetëm gjuha e panelit dhe fjalëkalimi.
  if (!fullAccess) {
    return (
      <>
        <PageHeader title={t('settings.title')} />
        <div className="settings-side narrow"><LanguageCard /><PasswordCard /></div>
      </>
    );
  }
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
          <div className="field">
            <span className="field-label">{t('settings.businessType')}</span>
            <div className="segmented">
              {businessTypes.map(b => (
                <button key={b.type} type="button" className={s.businessType === b.type ? 'active' : ''}
                  onClick={() => set({ businessType: b.type, primaryColor: b.color })}>
                  {t(`settings.type_${b.type}`)}
                </button>
              ))}
            </div>
            <span className="field-hint">{t('settings.businessTypeHint')}</span>
          </div>
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
            <Field label={t('settings.tagline')} hint={t('settings.taglineHint')}>
              <input value={s.tagline ?? ''} maxLength={100} onChange={e => set({ tagline: e.target.value })} placeholder="BURGER & GRILL" />
            </Field>
            <Field label={t('settings.slogan')} hint={t('settings.sloganHint')}>
              <input value={s.slogan ?? ''} maxLength={200} onChange={e => set({ slogan: e.target.value })} />
            </Field>
            <Field label={t('settings.openingTime')}>
              <input type="time" value={s.openingTime ?? ''} onChange={e => set({ openingTime: e.target.value })} />
            </Field>
            <Field label={t('settings.closingTime')} hint={t('settings.closingTimeHint')}>
              <input value={s.closingTime ?? ''} maxLength={5} placeholder="24:00" pattern="([01]\d|2[0-3]):[0-5]\d|24:00"
                onChange={e => set({ closingTime: e.target.value })} />
            </Field>
            <Field label={t('settings.phone')}>
              <input value={s.phone ?? ''} maxLength={50} onChange={e => set({ phone: e.target.value })} placeholder="044 555 010" />
            </Field>
            <Field label={t('settings.social')}>
              <input value={s.socialHandle ?? ''} maxLength={100} onChange={e => set({ socialHandle: e.target.value })} placeholder="@emri.juaj" />
            </Field>
          </div>

          <h2>{t('settings.design')}</h2>
          <div className="field">
            <span className="field-label">{t('settings.primaryColor')}</span>
            <div className="swatches">
              {themeColors.map(c => (
                <button key={c} type="button" className={`swatch ${s.primaryColor.toLowerCase() === c ? 'active' : ''}`}
                  style={{ background: c }} title={c} onClick={() => set({ primaryColor: c })} />
              ))}
              <div className="color-input"><input type="color" value={s.primaryColor} onChange={e => set({ primaryColor: e.target.value })} /><code>{s.primaryColor}</code></div>
            </div>
            <span className="field-hint">{t('settings.primaryColorHint')}</span>
          </div>
          <div className="grid-2">
            <Field label={t('settings.accentColor')} hint={t('settings.accentColorHint')}>
              <div className="color-input"><input type="color" value={s.accentColor} onChange={e => set({ accentColor: e.target.value })} /><code>{s.accentColor}</code></div>
            </Field>
            <Field label={t('settings.screenLanguage')} hint={t('settings.screenLanguageHint')}>
              <select value={s.screenLanguage ?? 'sq'} onChange={e => set({ screenLanguage: e.target.value as Settings['screenLanguage'] })}>
                <option value="sq">Shqip</option>
                <option value="en">English</option>
              </select>
            </Field>
          </div>

          <h2>{t('settings.screen')}</h2>
          <label className="inline-check"><input type="checkbox" checked={s.showClock} onChange={e => set({ showClock: e.target.checked })} /> {t('settings.showClock')}</label>
          <label className="inline-check"><input type="checkbox" checked={s.showTicker} onChange={e => set({ showTicker: e.target.checked })} /> {t('settings.showTicker')}</label>
          {s.showTicker && (
            <Field label={t('settings.tickerText')} hint={t('settings.tickerHint', { symbol: s.currency || '€' })}><textarea rows={2} value={s.tickerText ?? ''} onChange={e => set({ tickerText: e.target.value })} /></Field>
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
  const { t } = useTranslation();
  return (
    <div className="card">
      <h2>{t('settings.panel')}</h2>
      <div className="field">
        <span className="field-label">{t('common.language')}</span>
        <LanguageSelect />
        <span className="field-hint">{t('settings.languageHint')}</span>
      </div>
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
