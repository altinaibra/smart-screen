import { FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { locale } from '../i18n';
import Icon from '../components/Icon';
import { ErrorBox, Field, Modal, PageHeader } from '../components/ui';
import { useMe } from '../services/Business/businessQueries';
import { useAccessOptions, useCreateUser, useDeleteUser, useUpdateUser, useUsers } from '../services/User/userQueries';
import type { AccessOption, User, UserRole } from '../types';

/** Qasja e përdoruesit në një biznes. */
type Access = 'none' | 'full' | 'screens';

/** Përdoruesit dhe qasjet e tyre (vetëm për administratorin). */
export default function UsersPage() {
  const { t } = useTranslation();
  const { data: me } = useMe();
  const { data: users = [], error: loadError } = useUsers();
  const { data: options = [] } = useAccessOptions();
  const { mutateAsync: deleteUser } = useDeleteUser();
  const [editing, setEditing] = useState<User | 'new' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function remove(u: User) {
    if (!confirm(t('users.confirmDelete', { name: u.username }))) return;
    setError(null);
    await deleteUser(u.id).catch(e => setError(e.message));
  }

  return (
    <>
      <PageHeader
        title={t('users.title')}
        subtitle={t('users.subtitle')}
        actions={<button className="btn primary" onClick={() => setEditing('new')}><Icon name="plus" />{t('users.add')}</button>}
      />
      <ErrorBox error={error ?? loadError?.message ?? null} />

      <div className="card">
        <table className="table">
          <thead>
            <tr><th>{t('users.username')}</th><th>{t('users.role')}</th><th>{t('users.access')}</th><th>{t('users.created')}</th><th /></tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td className="strong">{u.username} {u.id === me?.id && <span className="tag gray">{t('users.you')}</span>}</td>
                <td>{u.role === 'Admin' ? <span className="tag yellow">{t('users.role_Admin')}</span> : t('users.role_User')}</td>
                <td><AccessSummary user={u} options={options} /></td>
                <td className="muted nowrap">{new Date(u.createdAt).toLocaleDateString(locale())}</td>
                <td className="right nowrap">
                  <button className="btn" onClick={() => setEditing(u)}>{t('common.edit')}</button>{' '}
                  <button className="btn danger ghost" onClick={() => remove(u)} disabled={u.id === me?.id}>{t('common.delete')}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && <UserModal user={editing === 'new' ? null : editing} options={options} onClose={() => setEditing(null)} />}
    </>
  );
}

function AccessSummary({ user, options }: { user: User; options: AccessOption[] }) {
  const { t } = useTranslation();
  if (user.role === 'Admin') return <span className="muted">{t('users.allBusinesses')}</span>;

  const parts = options.flatMap(b => {
    if (user.businessIds.includes(b.id)) return [b.name];
    const screens = b.screens.filter(s => user.screenIds.includes(s.id));
    return screens.length ? [`${b.name}: ${screens.map(s => s.name).join(', ')}`] : [];
  });
  return parts.length ? <>{parts.join(' · ')}</> : <span className="muted">{t('users.noAccess')}</span>;
}

function UserModal({ user, options, onClose }: { user: User | null; options: AccessOption[]; onClose: () => void }) {
  const { t } = useTranslation();
  const [username, setUsername] = useState(user?.username ?? '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>(user?.role ?? 'User');
  const [screenIds, setScreenIds] = useState<number[]>(user?.screenIds ?? []);
  const [changed, setChanged] = useState<Record<number, Access>>({});
  const accessOf = (b: AccessOption): Access => changed[b.id]
    ?? (user?.businessIds.includes(b.id) ? 'full' : b.screens.some(s => user?.screenIds.includes(s.id)) ? 'screens' : 'none');
  const create = useCreateUser();
  const update = useUpdateUser();
  const error = create.error ?? update.error;

  const toggleScreen = (id: number, on: boolean) =>
    setScreenIds(ids => (on ? [...ids, id] : ids.filter(x => x !== id)));

  function submit(e: FormEvent) {
    e.preventDefault();
    const businessIds = options.filter(b => accessOf(b) === 'full').map(b => b.id);
    // Vetëm ekranet e bizneseve ku është zgjedhur "Vetëm disa ekrane".
    const screens = options.filter(b => accessOf(b) === 'screens')
      .flatMap(b => b.screens.filter(s => screenIds.includes(s.id)).map(s => s.id));
    const req = { username, password: password || null, role, businessIds, screenIds: screens };
    if (user) update.mutate({ id: user.id, ...req }, { onSuccess: onClose });
    else create.mutate(req, { onSuccess: onClose });
  }

  return (
    <Modal wide title={user ? t('users.edit') : t('users.new')} onClose={onClose}
      footer={<><button className="btn" onClick={onClose}>{t('common.cancel')}</button><button className="btn primary" form="user-form">{t('common.save')}</button></>}>
      <form id="user-form" onSubmit={submit}>
        <ErrorBox error={error?.message ?? null} />
        <div className="grid-2">
          <Field label={t('users.username')}>
            <input value={username} maxLength={100} onChange={e => setUsername(e.target.value)} required autoFocus autoComplete="off" />
          </Field>
          <Field label={t('login.password')} hint={user ? t('users.passwordKeep') : t('settings.newPasswordHint')}>
            <input type="password" value={password} minLength={6} onChange={e => setPassword(e.target.value)} required={!user} autoComplete="new-password" />
          </Field>
        </div>

        <div className="field">
          <span className="field-label">{t('users.role')}</span>
          <div className="segmented">
            {(['User', 'Admin'] as UserRole[]).map(r => (
              <button key={r} type="button" className={role === r ? 'active' : ''} onClick={() => setRole(r)}>{t(`users.role_${r}`)}</button>
            ))}
          </div>
          <span className="field-hint">{t(`users.roleHint_${role}`)}</span>
        </div>

        {role === 'User' && (
          <div className="field">
            <span className="field-label">{t('users.access')}</span>
            <div className="access-list">
              {options.map(b => (
                <div key={b.id} className="access-item">
                  <div className="access-head">
                    <span className="strong">{b.name}</span>
                    <select value={accessOf(b)} onChange={e => setChanged(a => ({ ...a, [b.id]: e.target.value as Access }))}>
                      <option value="none">{t('users.access_none')}</option>
                      <option value="full">{t('users.access_full')}</option>
                      <option value="screens">{t('users.access_screens')}</option>
                    </select>
                  </div>
                  {accessOf(b) === 'screens' && (
                    b.screens.length === 0 ? <div className="muted">{t('users.noScreens')}</div> : (
                      <div className="access-screens">
                        {b.screens.map(s => (
                          <label key={s.id} className="inline-check">
                            <input type="checkbox" checked={screenIds.includes(s.id)} onChange={e => toggleScreen(s.id, e.target.checked)} />
                            {' '}{s.name}{s.location ? <span className="muted"> · {s.location}</span> : null}
                          </label>
                        ))}
                      </div>
                    )
                  )}
                </div>
              ))}
            </div>
            <span className="field-hint">{t('users.accessHint')}</span>
          </div>
        )}
      </form>
    </Modal>
  );
}
