import { FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { locale } from '../i18n';
import Icon from '../components/Icon';
import { Empty, ErrorBox, Field, Modal, PageHeader, PasswordInput } from '../components/ui';
import { enterClient } from '../services/Business/businessQueries';
import type { CreateClientRequest, SaveClientRequest } from '../services/Client/clientMethods';
import { useClients, useCreateClient, useDeleteClient, useUpdateClient } from '../services/Client/clientQueries';
import type { BusinessType, Client } from '../types';

const businessTypes: BusinessType[] = ['restaurant', 'barber', 'shop'];

/** Klientët që kanë blerë aplikacionin (vetëm për pronarin). "Kyçu" hap panelin e klientit. */
export default function ClientsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: clients = [], isLoading, error: loadError } = useClients();
  const { mutateAsync: deleteClient } = useDeleteClient();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  const q = search.trim().toLowerCase();
  const visible = clients.filter(c => !q || [c.name, c.contactPerson, c.phone, c.email].some(v => v?.toLowerCase().includes(q)));

  async function enter(c: Client) {
    await enterClient(c.id);
    navigate('/');
  }

  async function remove(c: Client) {
    if (!confirm(t('clients.confirmDelete', { name: c.name }))) return;
    setError(null);
    await deleteClient(c.id).catch(e => setError(e.message));
  }

  return (
    <>
      <PageHeader
        title={t('clients.title')}
        subtitle={t('clients.subtitle')}
        actions={<button className="btn primary" onClick={() => setCreating(true)}><Icon name="plus" />{t('clients.add')}</button>}
      />
      <ErrorBox error={error ?? loadError?.message ?? null} />

      {!isLoading && clients.length === 0 ? <Empty>{t('clients.empty')}</Empty> : (
        <div className="card">
          <input className="clients-search" type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder={t('clients.search')} />
          <table className="table">
            <thead>
              <tr>
                <th>{t('clients.client')}</th><th>{t('clients.contact')}</th><th>{t('clients.businesses')}</th>
                <th>{t('clients.screens')}</th><th>{t('clients.users')}</th><th>{t('clients.status')}</th><th>{t('clients.since')}</th><th />
              </tr>
            </thead>
            <tbody>
              {visible.map(c => (
                <tr key={c.id} className={c.isActive ? '' : 'faded'}>
                  <td className="strong">{c.name}</td>
                  <td>
                    {c.contactPerson && <div>{c.contactPerson}</div>}
                    <div className="muted">{[c.phone, c.email].filter(Boolean).join(' · ') || '—'}</div>
                  </td>
                  <td>{c.businessCount}</td>
                  <td>{c.screenCount} <span className="muted">({t('clients.online', { count: c.screensOnline })})</span></td>
                  <td>{c.userCount}</td>
                  <td>{c.isActive ? <span className="tag green">{t('common.active')}</span> : <span className="tag gray">{t('common.inactive')}</span>}</td>
                  <td className="muted nowrap">{new Date(c.createdAt).toLocaleDateString(locale())}</td>
                  <td className="right nowrap">
                    <button className="btn primary" onClick={() => enter(c)}>{t('clients.enter')}</button>{' '}
                    <button className="btn" onClick={() => setEditing(c)}>{t('common.edit')}</button>{' '}
                    <button className="btn danger ghost" onClick={() => remove(c)}>{t('common.delete')}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {creating && <CreateModal onClose={() => setCreating(false)} />}
      {editing && <EditModal client={editing} onClose={() => setEditing(null)} />}
    </>
  );
}

function ContactFields<T extends SaveClientRequest | CreateClientRequest>({ form, set }: { form: T; set: (patch: Partial<T>) => void }) {
  const { t } = useTranslation();
  return (
    <>
      <Field label={t('clients.name')}>
        <input value={form.name} maxLength={150} onChange={e => set({ name: e.target.value } as Partial<T>)} placeholder="Pizza Roma SH.P.K." required autoFocus />
      </Field>
      <div className="grid-2">
        <Field label={t('clients.contactPerson')}>
          <input value={form.contactPerson ?? ''} maxLength={150} onChange={e => set({ contactPerson: e.target.value } as Partial<T>)} />
        </Field>
        <Field label={t('clients.phone')}>
          <input value={form.phone ?? ''} maxLength={50} onChange={e => set({ phone: e.target.value } as Partial<T>)} />
        </Field>
      </div>
      <Field label={t('clients.email')}>
        <input type="email" value={form.email ?? ''} maxLength={150} onChange={e => set({ email: e.target.value } as Partial<T>)} />
      </Field>
      <Field label={t('clients.notes')} hint={t('clients.notesHint')}>
        <textarea rows={2} value={form.notes ?? ''} onChange={e => set({ notes: e.target.value } as Partial<T>)} />
      </Field>
    </>
  );
}

function CreateModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const [form, setForm] = useState<CreateClientRequest>({
    name: '', contactPerson: '', phone: '', email: '', notes: '',
    businessName: '', businessType: 'restaurant', adminUsername: '', adminPassword: '',
  });
  const create = useCreateClient();
  const set = (patch: Partial<CreateClientRequest>) => setForm(f => ({ ...f, ...patch }));

  function submit(e: FormEvent) {
    e.preventDefault();
    create.mutate({ ...form, businessName: form.businessName || form.name }, { onSuccess: onClose });
  }

  return (
    <Modal wide title={t('clients.new')} onClose={onClose}
      footer={<><button className="btn" onClick={onClose}>{t('common.cancel')}</button><button className="btn primary" form="client-form" disabled={create.isPending}>{t('common.save')}</button></>}>
      <form id="client-form" onSubmit={submit}>
        <ErrorBox error={create.error?.message ?? null} />
        <ContactFields form={form} set={set} />

        <h4 className="form-section">{t('clients.firstBusiness')}</h4>
        <div className="grid-2">
          <Field label={t('settings.businessName')} hint={t('clients.businessNameHint')}>
            <input value={form.businessName} maxLength={100} onChange={e => set({ businessName: e.target.value })} placeholder={form.name} />
          </Field>
          <div className="field">
            <span className="field-label">{t('settings.businessType')}</span>
            <div className="segmented">
              {businessTypes.map(bt => (
                <button key={bt} type="button" className={form.businessType === bt ? 'active' : ''} onClick={() => set({ businessType: bt })}>
                  {t(`settings.type_${bt}`)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <h4 className="form-section">{t('clients.adminAccount')}</h4>
        <div className="grid-2">
          <Field label={t('users.username')}>
            <input value={form.adminUsername} maxLength={100} onChange={e => set({ adminUsername: e.target.value })} required autoComplete="off" />
          </Field>
          <Field label={t('login.password')} hint={t('settings.newPasswordHint')}>
            <PasswordInput value={form.adminPassword} minLength={6} onChange={e => set({ adminPassword: e.target.value })} required autoComplete="new-password" />
          </Field>
        </div>
        <p className="muted">{t('clients.adminHint')}</p>
      </form>
    </Modal>
  );
}

function EditModal({ client, onClose }: { client: Client; onClose: () => void }) {
  const { t } = useTranslation();
  const [form, setForm] = useState<SaveClientRequest>({
    name: client.name, contactPerson: client.contactPerson, phone: client.phone, email: client.email,
    notes: client.notes, isActive: client.isActive,
  });
  const update = useUpdateClient();
  const set = (patch: Partial<SaveClientRequest>) => setForm(f => ({ ...f, ...patch }));

  function submit(e: FormEvent) {
    e.preventDefault();
    update.mutate({ id: client.id, ...form }, { onSuccess: onClose });
  }

  return (
    <Modal title={t('clients.edit')} onClose={onClose}
      footer={<><button className="btn" onClick={onClose}>{t('common.cancel')}</button><button className="btn primary" form="client-form">{t('common.save')}</button></>}>
      <form id="client-form" onSubmit={submit}>
        <ErrorBox error={update.error?.message ?? null} />
        <ContactFields form={form} set={set} />
        <label className="inline-check"><input type="checkbox" checked={form.isActive} onChange={e => set({ isActive: e.target.checked })} /> {t('common.active')}</label>
        <span className="field-hint">{t('clients.activeHint')}</span>
      </form>
    </Modal>
  );
}
