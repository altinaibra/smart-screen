import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, auth } from '../api';
import Logo from '../components/Logo';
import { ErrorBox, Field } from '../components/ui';

export default function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ token: string; username: string }>('/auth/login', {
        method: 'POST', json: { username, password },
      });
      auth.save(res.token, res.username);
      navigate('/');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={submit}>
        <div className="login-logo"><Logo size={72} /></div>
        <h1 className="login-title">Smart Screen</h1>
        <p className="muted login-sub">Menaxhimi i ekraneve dhe reklamave</p>
        <ErrorBox error={error} />
        <Field label="Përdoruesi">
          <input value={username} onChange={e => setUsername(e.target.value)} autoFocus required />
        </Field>
        <Field label="Fjalëkalimi">
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
        </Field>
        <button className="btn primary block" disabled={busy}>{busy ? 'Duke hyrë...' : 'Hyr'}</button>
      </form>
    </div>
  );
}
