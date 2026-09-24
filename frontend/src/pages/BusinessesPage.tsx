import { FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import Icon from '../components/Icon';
import { ErrorBox, Field, Modal, PageHeader } from '../components/ui';
import { switchBusiness, useCreateBusiness, useCurrentBusiness, useDeleteBusiness, useMe } from '../services/Business/businessQueries';
import type { Business, BusinessType } from '../types';

const businessTypes: BusinessType[] = ['restaurant', 'barber', 'shop'];

/** Bizneset (vetëm për administratorin). Secili biznes ka ekranet, reklamat dhe menunë e vet. */
export default function BusinessesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: me } = useMe();
  const current = useCurrentBusiness();
  const { mutateAsync: deleteBusiness } = useDeleteBusiness();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const businesses = me?.businesses ?? [];

  async function open(b: Business, path: string) {
    await switchBusiness(b.id);
    navigate(path);
  }

  async function remove(b: Business) {
    if (!confirm(t('businesses.confirmDelete', { name: b.name }))) return;
    setError(null);
    await deleteBusiness(b.id).catch(e => setError(e.message));
  }

  return (
    <>
      <PageHeader
        title={t('businesses.title')}
        subtitle={t('businesses.subtitle')}
        actions={<button className="btn primary" onClick={() => setCreating(true)}><Icon name="plus" />{t('businesses.add')}</button>}
      />
      <ErrorBox error={error} />

      <div className="card">
        <table className="table">
          <thead>
            <tr><th>{t('common.name')}</th><th>{t('settings.businessType')}</th><th>{t('businesses.screens')}</th><th /></tr>
          </thead>
          <tbody>
            {businesses.map(b => (
              <tr key={b.id}>
                <td className="strong">
                  {b.logoUrl && <img className="business-logo" src={b.logoUrl} alt="" />}
                  {b.name} {b.id === current?.id && <span className="tag green">{t('businesses.selected')}</span>}
                </td>
                <td>{t(`settings.type_${b.businessType}`)}</td>
                <td>{b.screenCount}</td>
                <td className="right nowrap">
                  <button className="btn" onClick={() => open(b, '/screens')}>{t('businesses.open')}</button>{' '}
                  <button className="btn" onClick={() => open(b, '/settings')}>{t('nav.settings')}</button>{' '}
                  <button className="btn danger ghost" onClick={() => remove(b)} disabled={businesses.length === 1}>{t('common.delete')}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {creating && <CreateModal onClose={() => setCreating(false)} onCreated={b => open(b, '/settings')} />}
    </>
  );
}

function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: (b: Business) => void }) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [type, setType] = useState<BusinessType>('restaurant');
  const create = useCreateBusiness();

  function submit(e: FormEvent) {
    e.preventDefault();
    create.mutate({ name, businessType: type }, { onSuccess: b => { onClose(); onCreated(b); } });
  }

  return (
    <Modal title={t('businesses.new')} onClose={onClose}
      footer={<><button className="btn" onClick={onClose}>{t('common.cancel')}</button><button className="btn primary" form="business-form" disabled={create.isPending}>{t('common.save')}</button></>}>
      <form id="business-form" onSubmit={submit}>
        <ErrorBox error={create.error?.message ?? null} />
        <Field label={t('settings.businessName')}>
          <input value={name} maxLength={100} onChange={e => setName(e.target.value)} placeholder="Barber Shop" required autoFocus />
        </Field>
        <div className="field">
          <span className="field-label">{t('settings.businessType')}</span>
          <div className="segmented">
            {businessTypes.map(bt => (
              <button key={bt} type="button" className={type === bt ? 'active' : ''} onClick={() => setType(bt)}>
                {t(`settings.type_${bt}`)}
              </button>
            ))}
          </div>
        </div>
        <p className="muted">{t('businesses.newHint')}</p>
      </form>
    </Modal>
  );
}
