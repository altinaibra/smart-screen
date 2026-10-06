import { FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { locale } from '../i18n';
import { useClearAlert, useSetAlert, useSettings } from '../services/Settings/settingsQueries';
import type { Alert } from '../types';
import Icon from './Icon';
import { ErrorBox, Field, Modal } from './ui';

/** Ngjyrat e gatshme për njoftimin (e kuqe = urgjente, portokalli = paralajmërim, blu/jeshile = informacion). */
const alertColors = ['#c8102e', '#e8590c', '#1c64f2', '#1fa36b', '#111827'];

/** Kohëzgjatjet në minuta; 0 = derisa ta hiqni vetë. */
const durations = [0, 15, 30, 60, 120, 240, 480, 1440];

/**
 * Njoftimi urgjent i biznesit: kur është aktiv shfaqet si shirit në panel me butonin "Hiq";
 * përndryshe vetëm butoni që hap formularin. Arrin te të gjitha TV-të brenda ~15 sekondave.
 */
export default function AlertPanel() {
  const { t } = useTranslation();
  const { data: settings } = useSettings();
  const [open, setOpen] = useState(false);
  const { mutateAsync: clearAlert, isPending: clearing } = useClearAlert();
  const [error, setError] = useState<string | null>(null);

  const alert = settings?.alert ?? null;

  async function clear() {
    setError(null);
    try { await clearAlert(); } catch (e) { setError((e as Error).message); }
  }

  return (
    <>
      <ErrorBox error={error} />
      {alert ? (
        <div className="broadcast-banner" style={{ borderColor: alert.color }}>
          <span className="broadcast-swatch" style={{ background: alert.color }}>!</span>
          <div className="grow">
            <div className="broadcast-label">{t('alert.live')}</div>
            <div className="strong">{alert.title || alert.text}</div>
            {alert.title && alert.text && <div className="muted small pre-line">{alert.text}</div>}
            <div className="muted small">{expiryText(alert, t)}</div>
          </div>
          <button type="button" className="btn" onClick={() => setOpen(true)}>{t('common.edit')}</button>
          <button type="button" className="btn danger" onClick={clear} disabled={clearing}>{t('alert.stop')}</button>
        </div>
      ) : (
        <button type="button" className="btn" onClick={() => setOpen(true)}><Icon name="alert" />{t('alert.button')}</button>
      )}
      {open && <AlertForm initial={alert} onClose={() => setOpen(false)} />}
    </>
  );
}

function expiryText(alert: Alert, t: TFunction) {
  if (!alert.expiresAt) return t('alert.noExpiry');
  return t('alert.until', { time: new Date(alert.expiresAt).toLocaleString(locale(), { dateStyle: 'short', timeStyle: 'short' }) });
}

function AlertForm({ initial, onClose }: { initial: Alert | null; onClose: () => void }) {
  const { t } = useTranslation();
  const [title, setTitle] = useState(initial?.title ?? '');
  const [text, setText] = useState(initial?.text ?? '');
  const [color, setColor] = useState(initial?.color ?? alertColors[0]);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const { mutateAsync: setAlert, isPending } = useSetAlert();

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await setAlert({ title: title.trim() || null, text: text.trim() || null, color, durationMinutes: duration || null });
      onClose();
    } catch (err) { setError((err as Error).message); }
  }

  return (
    <Modal title={t('alert.title')} onClose={onClose}
      footer={<>
        <button type="button" className="btn" onClick={onClose}>{t('common.cancel')}</button>
        <button type="submit" form="alert-form" className="btn primary" disabled={isPending || (!title.trim() && !text.trim())}>
          {t('alert.send')}
        </button>
      </>}>
      <form id="alert-form" onSubmit={submit}>
        <p className="muted small">{t('alert.hint')}</p>
        <ErrorBox error={error} />
        <Field label={t('alert.heading')}>
          <input value={title} maxLength={200} onChange={e => setTitle(e.target.value)} placeholder={t('alert.headingPlaceholder')} autoFocus />
        </Field>
        <Field label={t('alert.text')}>
          <textarea rows={3} value={text} maxLength={1000} onChange={e => setText(e.target.value)} placeholder={t('alert.textPlaceholder')} />
        </Field>
        <div className="field">
          <span className="field-label">{t('alert.color')}</span>
          <div className="swatches">
            {alertColors.map(c => (
              <button key={c} type="button" className={`swatch ${color === c ? 'active' : ''}`} style={{ background: c }} title={c} onClick={() => setColor(c)} />
            ))}
            <div className="color-input"><input type="color" value={color} onChange={e => setColor(e.target.value)} /><code>{color}</code></div>
          </div>
        </div>
        <Field label={t('alert.duration')}>
          <select value={duration} onChange={e => setDuration(Number(e.target.value))}>
            {durations.map(m => (
              <option key={m} value={m}>
                {m === 0 ? t('alert.untilRemoved') : m < 60 ? t('alert.minutes', { count: m }) : t('alert.hours', { count: m / 60 })}
              </option>
            ))}
          </select>
        </Field>
        <div className="alert-preview" style={{ background: color }}>
          <span className="alert-preview-icon">!</span>
          {title.trim() && <div className="alert-preview-title">{title}</div>}
          {text.trim() && <div className="alert-preview-text">{text}</div>}
        </div>
      </form>
    </Modal>
  );
}
