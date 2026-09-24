import { useState } from 'react';
import { useServerInfo } from '../services/Screen/screenQueries';

type Platform = { id: string; label: string; needs: string; steps: (url: string, server: string) => JSX.Element };

const platforms: Platform[] = [
  {
    id: 'android',
    label: 'Android TV / Sony / Google TV',
    needs: 'Asnjë pajisje shtesë – instalohet APK-ja direkt në TV.',
    steps: (_url, server) => (
      <ol>
        <li>Në TV instaloni aplikacionin falas <b>Downloader</b> (nga Google Play në TV).</li>
        <li>Hapeni dhe shkruani <code>{server}/downloads/smart-screen-player.apk</code> → <b>Install</b>.
          Herën e parë TV-ja kërkon leje për <b>Unknown sources</b> – lejojeni për Downloader.</li>
        <li>Ose: shkarkoni APK-në më lart, kopjojeni në USB dhe hapeni në TV me një file manager.</li>
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
          shkarkoni <b>paketën LG (.ipk)</b> më lart dhe instalojeni nga kompjuteri me <code>ares-install smart-screen-player-lg.ipk</code>
          (webOS CLI, pasi ta shtoni TV-në me <code>ares-setup-device</code>).</li>
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
        <li>Instaloni aplikacionin <b>Downloader</b> dhe shkruani <code>{server}/downloads/smart-screen-player.apk</code>
          (Fire TV: <b>Settings → My Fire TV → Developer options → Install unknown apps</b>).</li>
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
        <li><b>Windows:</b> shkarkoni <b>Player për Windows</b> më lart dhe klikoni dy herë mbi të. Player-i hapet në ekran të plotë
          dhe niset vetë sa herë ndizet kompjuteri. Mbyllja: <b>Alt+F4</b>.</li>
        <li>Tjetër (Linux, Raspberry Pi, Mac): <code>chromium --kiosk --autoplay-policy=no-user-gesture-required {url}</code>.</li>
      </ol>
    ),
  },
];

export default function TvSetupGuide() {
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

      <div className="downloads">
        <strong>Shkarko aplikacionin për TV:</strong>
        <a className="btn" href="/downloads/smart-screen-player.apk" download>⬇ Android TV / Sony / Fire TV (.apk)</a>
        <a className="btn" href="/downloads/smart-screen-player-lg.ipk" download>⬇ LG webOS (.ipk)</a>
        <a className="btn" href="/downloads/smart-screen-player.cmd" download>⬇ Player për Windows</a>
      </div>

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
