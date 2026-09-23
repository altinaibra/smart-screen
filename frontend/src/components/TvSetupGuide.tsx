import { useEffect, useState } from 'react';
import { api } from '../api';

type ServerInfo = { addresses: string[]; port: number };

type Platform = { id: string; label: string; needs: string; steps: (url: string, server: string) => JSX.Element };

const platforms: Platform[] = [
  {
    id: 'android',
    label: 'Android TV / Sony / Google TV',
    needs: 'Asnjë pajisje shtesë – instalohet APK-ja direkt në TV.',
    steps: (_url, server) => (
      <ol>
        <li>Ndërtoni APK-në nga <code>tv-apps/android-tv</code> (Android Studio → Build APK) ose përdorni atë të gatshmen.</li>
        <li>Në TV: <b>Settings → Device Preferences → Security</b> → lejoni <b>Unknown sources</b>.</li>
        <li>Kopjoni APK-në në një USB dhe hapeni me një file manager (p.sh. <i>File Commander</i>), ose instalojeni me <i>Send Files to TV</i> / <i>Downloader</i>.</li>
        <li>Hapni <b>Smart Screen</b>, shkruani adresën e serverit <code>{server}</code> dhe shtypni <b>Ruaj</b>.</li>
        <li>Aplikacioni niset vetë sa herë ndizet TV-ja.</li>
      </ol>
    ),
  },
  {
    id: 'lg',
    label: 'LG (webOS)',
    needs: 'Asnjë pajisje shtesë. Aplikacioni ose shfletuesi i TV-së.',
    steps: (url, server) => (
      <ol>
        <li><b>Më e shpejta:</b> hapni aplikacionin <b>Web Browser</b> të TV-së dhe shkruani <code>{url}</code>.</li>
        <li><b>Si aplikacion (rekomandohet):</b> instaloni <i>Developer Mode</i> nga LG Content Store, pastaj
          nga kompjuteri: <code>ares-package tv-apps/lg-webos</code> → <code>ares-install *.ipk</code>.</li>
        <li>Në hapjen e parë shkruani adresën e serverit <code>{server}</code> dhe shtypni <b>Ruaj</b>.</li>
        <li>Për nisje automatike: LG Signage/Hotel mode lejon zgjedhjen e aplikacionit në ndezje.</li>
      </ol>
    ),
  },
  {
    id: 'samsung',
    label: 'Samsung (Tizen)',
    needs: 'Asnjë pajisje shtesë. Aplikacioni ose shfletuesi i TV-së.',
    steps: (url, server) => (
      <ol>
        <li><b>Më e shpejta:</b> hapni aplikacionin <b>Internet</b> të TV-së dhe shkruani <code>{url}</code>.</li>
        <li><b>Si aplikacion (rekomandohet):</b> në TV: <b>Apps</b> → shtypni <b>1 2 3 4 5</b> me telekomandë → aktivizoni
          <i>Developer mode</i> me IP-në e kompjuterit. Në Tizen Studio hapni <code>tv-apps/samsung-tizen</code> → <b>Run As → Tizen Web Application</b>.</li>
        <li>Në hapjen e parë shkruani adresën e serverit <code>{server}</code> dhe shtypni <b>Ruaj</b>.</li>
        <li>Samsung Smart Signage (QB/QM): <b>Menu → URL Launcher</b> → vendosni <code>{url}</code>.</li>
      </ol>
    ),
  },
  {
    id: 'firetv',
    label: 'Fire TV / TV Box',
    needs: 'Për TV jo-smart ose shumë të vjetër: një Android TV Box, Fire TV Stick ose Chromecast me Google TV në portën HDMI.',
    steps: (_url, server) => (
      <ol>
        <li>Lidheni kutinë në HDMI të TV-së dhe në të njëjtin rrjet me serverin.</li>
        <li>Instaloni APK-në nga <code>tv-apps/android-tv</code> (në Fire TV me aplikacionin <i>Downloader</i>).</li>
        <li>Hapni <b>Smart Screen</b> dhe shkruani adresën e serverit <code>{server}</code>.</li>
        <li>Kutia niset vetë dhe hap player-in sa herë ndizet.</li>
      </ol>
    ),
  },
  {
    id: 'browser',
    label: 'PC / Monitor / Tjetër',
    needs: 'Çdo pajisje me shfletues modern (PC, mini-PC, Raspberry Pi, Chromebox).',
    steps: url => (
      <ol>
        <li>Hapni <code>{url}</code> në Chrome/Edge dhe shtypni <b>F11</b> për ekran të plotë.</li>
        <li>Për nisje automatike (kiosk): <code>chrome --kiosk --autoplay-policy=no-user-gesture-required {url}</code> në Startup.</li>
      </ol>
    ),
  },
];

export default function TvSetupGuide() {
  const [info, setInfo] = useState<ServerInfo | null>(null);
  const [tab, setTab] = useState(platforms[0].id);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api<ServerInfo>('/server-info').then(setInfo).catch(() => {});
  }, []);

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
      <strong>Si të lidhni një TV të ri:</strong>
      <ol>
        <li>Vendosni player-in në TV sipas markës (shih më poshtë). Adresa e player-it:{' '}
          <code>{url}</code> <button type="button" className="btn small" onClick={copy}>{copied ? 'U kopjua ✓' : 'Kopjo'}</button>
          {servers.length > 1 && <span className="muted"> · adresa të tjera: {servers.slice(1).map(s => <code key={s}>{s}</code>)}</span>}
        </li>
        <li>Në ekran do të shfaqet një <b>kod 6-shifror</b>.</li>
        <li>Klikoni <b>Shto ekran</b>, vendosni kodin dhe zgjidhni playlist-ën.</li>
      </ol>
      {onlyLocalhost && (
        <div className="alert info" style={{ marginTop: 10 }}>
          TV-ja nuk mund të përdorë <code>localhost</code>. Përdorni IP-në e kompjuterit ku punon serveri
          (Windows: <code>ipconfig</code> → IPv4 Address), p.sh. <code>http://192.168.1.10:5080/player/</code>.
        </div>
      )}

      <div className="tabs">
        {platforms.map(p => (
          <button key={p.id} type="button" className={`tab ${p.id === tab ? 'active' : ''}`} onClick={() => setTab(p.id)}>{p.label}</button>
        ))}
      </div>
      <div className="tab-body">
        <div className="muted">{current.needs}</div>
        {current.steps(url, server)}
        <div className="muted">
          TV-ja dhe serveri duhet të jenë në të njëjtin rrjet (ose serveri në internet me domen/HTTPS). Lejoni portin {info?.port ?? 5080} në Firewall.
        </div>
      </div>
    </div>
  );
}
