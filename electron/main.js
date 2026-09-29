// Smart Screen – aplikacioni desktop (Electron).
// Nis serverin .NET (të paketuar te resources/server) në sfond dhe hap panelin React në dritare.
const { app, BrowserWindow, shell, dialog } = require('electron');
const { spawn } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const path = require('path');

// Porti i serverit. TV-të lidhen te http://<IP-e-këtij-kompjuterit>:5080/player/
const PORT = 5080;
const APP_URL = `http://127.0.0.1:${PORT}/`;

let server = null; // procesi .NET
let win = null;

// Vetëm një dritare e aplikacionit njëherësh (serveri s'mund të niset dy herë në të njëjtin port).
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });
  app.whenReady().then(main);
}

function serverDir() {
  // I paketuar: <instalimi>\resources\server — gjatë zhvillimit: electron\server
  return app.isPackaged ? path.join(process.resourcesPath, 'server') : path.join(__dirname, 'server');
}

function isServerUp() {
  return new Promise(resolve => {
    const req = http.get(`${APP_URL}api/health`, { timeout: 1000 }, res => {
      res.resume();
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
  });
}

/** Çelës i rastësishëm JWT, i krijuar një herë për çdo instalim. */
function jwtKey(dataDir) {
  const file = path.join(dataDir, 'jwt.key');
  try {
    const key = fs.readFileSync(file, 'utf8').trim();
    if (key.length >= 32) return key;
  } catch { /* s'ekziston ende */ }
  const key = crypto.randomBytes(48).toString('hex');
  fs.writeFileSync(file, key);
  return key;
}

function startServer(dataDir) {
  const dir = serverDir();
  const exe = path.join(dir, process.platform === 'win32' ? 'SmartScreen.Api.exe' : 'SmartScreen.Api');
  if (!fs.existsSync(exe)) throw new Error(`Nuk u gjet serveri:\n${exe}\n\nNisni fillimisht publish-desktop.cmd`);

  const log = fs.openSync(path.join(dataDir, 'server.log'), 'w');
  server = spawn(exe, [
    `--urls=http://0.0.0.0:${PORT}`,
    // Databaza dhe media ruhen te AppData (dosja e instalimit në Program Files s'lejon shkrim).
    `--ConnectionStrings:Sqlite=Data Source=${path.join(dataDir, 'smartscreen.db')}`,
    `--Storage:UploadsPath=${path.join(dataDir, 'uploads')}`,
    `--Jwt:Key=${jwtKey(dataDir)}`,
  ], { cwd: dir, windowsHide: true, stdio: ['ignore', log, log] });

  server.on('exit', code => {
    server = null;
    if (!app.isQuitting) showError(`Serveri u ndal (kodi ${code}).\nShikoni ${path.join(dataDir, 'server.log')}`);
  });
}

function stopServer() {
  if (server) {
    server.kill();
    server = null;
  }
}

function showError(msg) {
  if (win && !win.isDestroyed()) {
    win.loadFile(path.join(__dirname, 'loading.html'))
      .then(() => win.webContents.executeJavaScript(`window.showError(${JSON.stringify(msg)})`))
      .catch(() => dialog.showErrorBox('Smart Screen', msg));
  } else {
    dialog.showErrorBox('Smart Screen', msg);
  }
}

async function main() {
  win = new BrowserWindow({
    width: 1366,
    height: 850,
    minWidth: 1000,
    minHeight: 650,
    title: 'Smart Screen',
    backgroundColor: '#121419',
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  win.removeMenu();
  win.on('closed', () => { win = null; });

  // Lidhjet e jashtme (p.sh. /swagger ose faqe web) hapen në shfletues, jo brenda aplikacionit.
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  await win.loadFile(path.join(__dirname, 'loading.html'));

  const dataDir = app.getPath('userData');
  fs.mkdirSync(dataDir, { recursive: true });

  try {
    // Nëse serveri punon tashmë (p.sh. në IIS), vetëm lidhemi me të.
    if (!(await isServerUp())) startServer(dataDir);
  } catch (e) {
    showError(e.message);
    return;
  }

  const started = Date.now();
  while (!(await isServerUp())) {
    if (!server && Date.now() - started > 2000) return; // u ndal, gabimi u shfaq te 'exit'
    if (Date.now() - started > 60000) {
      showError(`Serveri nuk u nis brenda 60 sekondave.\nShikoni ${path.join(dataDir, 'server.log')}`);
      return;
    }
    await new Promise(r => setTimeout(r, 400));
  }
  if (win) win.loadURL(APP_URL);
}

app.on('before-quit', () => { app.isQuitting = true; stopServer(); });
// Edhe nëse aplikacioni mbyllet me forcë, mos e lër serverin të ndezur.
process.on('exit', stopServer);
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => app.quit());
app.on('window-all-closed', () => app.quit());
