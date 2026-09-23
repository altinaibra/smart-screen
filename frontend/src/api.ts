const TOKEN_KEY = 'ss_admin_token';
const USER_KEY = 'ss_admin_user';

export const auth = {
  get token() { return localStorage.getItem(TOKEN_KEY); },
  get username() { return localStorage.getItem(USER_KEY); },
  save(token: string, username: string) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, username);
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
};

function onUnauthorized() {
  auth.clear();
  if (location.pathname !== '/login') location.href = '/login';
}

async function errorMessage(res: Response) {
  try {
    const body = await res.json();
    if (body.message) return body.message as string;
    if (body.errors) return Object.values(body.errors).flat().join(' ');
    if (body.title) return body.title as string;
  } catch { /* jo JSON */ }
  return `Gabim ${res.status}`;
}

export async function api<T = void>(path: string, options: RequestInit & { json?: unknown } = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (auth.token) headers.set('Authorization', `Bearer ${auth.token}`);
  let body = options.body;
  if (options.json !== undefined) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(options.json);
  }

  const res = await fetch(`/api${path}`, { ...options, headers, body });
  if (res.status === 401 && !path.startsWith('/auth/login')) {
    onUnauthorized();
    throw new Error('Sesioni skadoi. Hyni përsëri.');
  }
  if (!res.ok) throw new Error(await errorMessage(res));
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

/** Ngarkim me progres (për video të mëdha). */
export function uploadFile<T>(file: File, onProgress: (percent: number) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const form = new FormData();
    form.append('file', file);
    xhr.open('POST', '/api/media');
    if (auth.token) xhr.setRequestHeader('Authorization', `Bearer ${auth.token}`);
    xhr.upload.onprogress = e => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      if (xhr.status === 401) { onUnauthorized(); return reject(new Error('Sesioni skadoi.')); }
      let data: any = null;
      try { data = JSON.parse(xhr.responseText); } catch { /* ignore */ }
      if (xhr.status >= 200 && xhr.status < 300) resolve(data as T);
      else reject(new Error(data?.message ?? `Gabim ${xhr.status}`));
    };
    xhr.onerror = () => reject(new Error('Gabim rrjeti gjatë ngarkimit.'));
    xhr.send(form);
  });
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m ? `${m} min ${s ? `${s} s` : ''}` : `${s} s`;
}

export function timeAgo(iso?: string | null) {
  if (!iso) return 'asnjëherë';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'tani';
  if (diff < 3600) return `${Math.floor(diff / 60)} min më parë`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} orë më parë`;
  return new Date(iso).toLocaleString('sq-AL');
}
