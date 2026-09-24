import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useServerInfo } from '../services/Screen/screenQueries';
import Icon from './Icon';

/** Hapat për çdo markë: çelësat te `tvSetup.<id>.s1..sN` në skedarët e përkthimit. */
const platforms = [
  { id: 'android', steps: 5 },
  { id: 'lg', steps: 4 },
  { id: 'samsung', steps: 4 },
  { id: 'firetv', steps: 4 },
  { id: 'browser', steps: 2 },
];

// Etiketat HTML që lejohen brenda teksteve të përkthyera.
const markup = { b: <b />, i: <i />, code: <code /> };

export default function TvSetupGuide() {
  const { t } = useTranslation();
  const { data: info } = useServerInfo();
  const [tab, setTab] = useState(platforms[0].id);
  const [copied, setCopied] = useState(false);

  const fallback = `${location.protocol}//${location.hostname}:5080`;
  const servers = info?.addresses.length ? info.addresses : [fallback];
  const server = servers[0];
  const url = `${server}/player/`;
  const onlyLocalhost = !info?.addresses.length && /^(localhost|127\.)/.test(location.hostname);
  const current = platforms.find(p => p.id === tab)!;

  function copy() {
    navigator.clipboard?.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  }

  return (
    <div className="card help">
      <strong>{t('tvSetup.howTo')}</strong>
      <ol>
        <li>{t('tvSetup.step1')}{' '}
          <code>{url}</code>{' '}
          <button type="button" className="btn small" onClick={copy}>
            {copied ? <><Icon name="check" />{t('tvSetup.copied')}</> : <><Icon name="copy" />{t('common.copy')}</>}
          </button>
          {servers.length > 1 && <span className="muted"> · {t('tvSetup.otherAddresses')} {servers.slice(1).map(s => <code key={s}>{s}</code>)}</span>}
        </li>
        <li><Trans i18nKey="tvSetup.step2" components={markup} /></li>
        <li><Trans i18nKey="tvSetup.step3" components={markup} /></li>
      </ol>
      {onlyLocalhost && (
        <div className="alert info" style={{ marginTop: 10 }}>
          <Trans i18nKey="tvSetup.localhostWarning" components={markup} />
        </div>
      )}

      <div className="downloads">
        <strong>{t('tvSetup.downloadApp')}</strong>
        <a className="btn" href="/downloads/smart-screen-player.apk" download><Icon name="download" />Android TV / Sony / Fire TV (.apk)</a>
        <a className="btn" href="/downloads/smart-screen-player-lg.ipk" download><Icon name="download" />LG webOS (.ipk)</a>
        <a className="btn" href="/downloads/smart-screen-player.cmd" download><Icon name="download" />{t('tvSetup.windowsPlayer')}</a>
      </div>

      <div className="tabs">
        {platforms.map(p => (
          <button key={p.id} type="button" className={`tab ${p.id === tab ? 'active' : ''}`} onClick={() => setTab(p.id)}>
            {t(`tvSetup.${p.id}.label`)}
          </button>
        ))}
      </div>
      <div className="tab-body">
        <div className="muted">{t(`tvSetup.${current.id}.needs`)}</div>
        <ol>
          {Array.from({ length: current.steps }, (_, i) => (
            <li key={i}><Trans i18nKey={`tvSetup.${current.id}.s${i + 1}`} values={{ url, server }} components={markup} /></li>
          ))}
        </ol>
        <div className="muted">{t('tvSetup.network', { port: info?.port ?? 5080 })}</div>
      </div>
    </div>
  );
}
