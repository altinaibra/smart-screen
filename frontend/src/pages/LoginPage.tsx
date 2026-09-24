import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import { ErrorBox, Field } from '../components/ui';
import { useLogin } from '../services/Auth/authQueries';

export default function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const { mutate: login, isPending: busy, error } = useLogin();

  function submit(e: FormEvent) {
    e.preventDefault();
    login({ username, password }, { onSuccess: () => navigate('/') });
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={submit}>
        <div className="login-logo"><Logo size={72} /></div>
        <h1 className="login-title">Smart Screen</h1>
        <p className="muted login-sub">Menaxhimi i ekraneve dhe reklamave</p>
        <ErrorBox error={error?.message ?? null} />
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
