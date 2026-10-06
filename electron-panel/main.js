// Smart Screen Panel – vetëm paneli i administrimit (pa server).
// Herën e parë pyet adresën e serverit Smart Screen (p.sh. 192.168.110.133), e ruan dhe pastaj
// hap panelin direkt në dritaren e vet. Adresa ndryshohet me Ctrl+Shift+S ose nga menyja "Serveri".
const { app, BrowserWindow, Menu, ipcMain, shell } = require('electron');
const fs = require('fs');
const http = require('http');
const https = require('https');
const path = require('path');

const DEFAULT_PORT = 5080;
let win = null;

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (win) { if (win.isMinimized()) win.restore(); win.focus(); }
  });
  app.whenReady().then(main);
}

const configFile = () => path.join(app.getPath('userData'), 'config.json');

function loadServer() {
  try { return JSON.parse(fs.readFileSync(configFile(), 'utf8')).server || null; } catch { return null; }
}

function saveServer(server) {
  fs.mkdirSync(path.dirname(configFile()), { recursive: true });
  fs.writeFileSync(configFile(), JSON.stringify({ server }, null, 2));
}

/** "192.168.1.10" -> "http://192.168.1.10:5080"; "https://domen.com" mbetet si është. */
function normalize(input) {
  let s = String(input || '').trim().replace(/\/+$/, '');
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) s = 'http://' + s;
  try {
    const u = new URL(s);
    if (!u.port && u.protocol === 'http:') u.port = String(DEFAULT_PORT);
    return u.origin;
  } catch { return null; }
}

/** Kontrollon që në atë adresë punon serveri Smart Screen (/api/health). */
function ping(server) {
  return new Promise(resolve => {
    const lib = server.startsWith('https:') ? https : http;
    const req = lib.get(`${server}/api/health`, { timeout: 4000 }, res => {
      let body = '';
      res.on('data', c => { body += c; });
      res.on('end', () => resolve(res.statusCode === 200 && body.includes('ok')));
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
  });
}

function showSetup(error) {
  const server = loadServer();
  win.loadFile(path.join(__dirname, 'setup.html'), {
    query: { server: server ? server.replace(/^http:\/\//, '') : '', error: error || '' },
  });
}

async function openPanel() {
  const server = loadServer();
  if (!server) return showSetup();
  if (!(await ping(server))) {
    return showSetup(`Serveri ${server} nuk përgjigjet. Kontrolloni që serveri është i ndezur, adresën dhe Firewall-in (porti ${DEFAULT_PORT}).`);
  }
  win.loadURL(server + '/');
}

ipcMain.handle('panel:connect', async (_e, input) => {
  const server = normalize(input);
  if (!server) return { ok: false, error: 'Adresa nuk është e vlefshme.' };
  if (!(await ping(server))) {
    return { ok: false, error: `Nuk u gjet serveri Smart Screen te ${server}. Kontrolloni adresën, që serveri është i ndezur dhe Firewall-in.` };
  }
  saveServer(server);
  win.loadURL(server + '/');
  return { ok: true };
});

function buildMenu() {
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    {
      label: 'Serveri',
      submenu: [
        { label: 'Ndrysho serverin…', accelerator: 'Ctrl+Shift+S', click: () => showSetup() },
        { label: 'Rifresko', accelerator: 'F5', click: () => win && win.webContents.reload() },
        { label: 'Hap në shfletues', click: () => { const s = loadServer(); if (s) shell.openExternal(s + '/'); } },
        { type: 'separator' },
        { label: 'Zmadho', accelerator: 'Ctrl+=', role: 'zoomIn' },
        { label: 'Zvogëlo', accelerator: 'Ctrl+-', role: 'zoomOut' },
        { label: 'Madhësia normale', accelerator: 'Ctrl+0', role: 'resetZoom' },
        { type: 'separator' },
        { label: 'Dil', role: 'quit' },
      ],
    },
  ]));
}

async function main() {
  buildMenu();
  win = new BrowserWindow({
    width: 1400,
    height: 880,
    minWidth: 1000,
    minHeight: 650,
    title: 'Smart Screen Panel',
    backgroundColor: '#121419',
    autoHideMenuBar: true, // menyja shfaqet me tastin Alt
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  win.on('closed', () => { win = null; });

  win.webContents.setWindowOpenHandler(({ url }) => {
    const server = loadServer();
    // "Hap ekranin" / "Hap player-in" hapen në dritare të re brenda aplikacionit; faqet e tjera në shfletues.
    if (url === 'about:blank' || (server && url.startsWith(server))) {
      return { action: 'allow', overrideBrowserWindowOptions: { autoHideMenuBar: true, icon: path.join(__dirname, 'build', 'icon.png') } };
    }
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Serveri u ndal ndërkohë -> kthehu te faqja e lidhjes me mesazh.
  win.webContents.on('did-fail-load', (_e, code, desc, url, isMainFrame) => {
    if (isMainFrame && !url.startsWith('file:')) showSetup(`Lidhja me serverin dështoi (${desc}).`);
  });

  await openPanel();
}

app.on('window-all-closed', () => app.quit());
