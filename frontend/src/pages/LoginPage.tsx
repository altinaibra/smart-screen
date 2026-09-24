import { FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import { ErrorBox, Field, PasswordInput } from '../components/ui';
import LanguageSelect from '../components/LanguageSelect';
import { useLogin } from '../services/Auth/authQueries';

export default function LoginPage() {
  const { t } = useTranslation();
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
        <p className="muted login-sub">{t('login.subtitle')}</p>
        <ErrorBox error={error?.message ?? null} />
        <Field label={t('login.username')}>
          <input value={username} onChange={e => setUsername(e.target.value)} autoFocus required />
        </Field>
        <Field label={t('login.password')}>
          <PasswordInput value={password} onChange={e => setPassword(e.target.value)} required />
        </Field>
        <button className="btn primary block" disabled={busy}>{busy ? t('login.submitting') : t('login.submit')}</button>
        <div className="login-lang"><LanguageSelect /></div>
      </form>
    </div>
  );
}
