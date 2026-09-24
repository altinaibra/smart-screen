import { FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { locale } from '../i18n';
import Icon from '../components/Icon';
import { Empty, ErrorBox, Field, Modal, PageHeader } from '../components/ui';
import type { SavePaymentMethodRequest } from '../services/PaymentMethod/paymentMethodMethods';
import {
  useCreatePaymentMethod, useDeletePaymentMethod, usePaymentMethods, useUpdatePaymentMethod,
} from '../services/PaymentMethod/paymentMethodQueries';
import type { PaymentMethod } from '../types';

type PaymentMethodForm = SavePaymentMethodRequest & { paymentMethodId?: number };

export default function PaymentMethodsPage() {
  const { t } = useTranslation();
  const { data: methods = [], isLoading, error: loadError } = usePaymentMethods();
  const { mutateAsync: deletePaymentMethod } = useDeletePaymentMethod();
  const [form, setForm] = useState<PaymentMethodForm | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function remove(m: PaymentMethod) {
    if (!confirm(t('paymentMethods.confirmDelete', { name: m.paymentMethodName }))) return;
    setError(null);
    await deletePaymentMethod(m.paymentMethodId).catch(e => setError(e.message));
  }

  const openNew = () => setForm({
    paymentMethodCode: '', paymentMethodName: '', status: true, isDefault: methods.length === 0,
    sortOrder: methods.length + 1, fiscalType: -1, rowVersion: null,
  });

  return (
    <>
      <PageHeader
        title={t('paymentMethods.title')}
        subtitle={t('paymentMethods.subtitle')}
        actions={<button className="btn primary" onClick={openNew}><Icon name="plus" />{t('paymentMethods.add')}</button>}
      />
      <ErrorBox error={error ?? loadError?.message ?? null} />

      {!isLoading && methods.length === 0 ? <Empty>{t('paymentMethods.empty')}</Empty> : (
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th><th>{t('paymentMethods.code')}</th><th>{t('common.name')}</th><th>{t('common.sortOrder')}</th>
                <th>{t('paymentMethods.fiscalType')}</th><th>{t('paymentMethods.status')}</th><th>{t('paymentMethods.entryDate')}</th><th />
              </tr>
            </thead>
            <tbody>
              {methods.map(m => (
                <tr key={m.paymentMethodId} className={m.status ? '' : 'faded'}>
                  <td className="muted">{m.paymentMethodId}</td>
                  <td className="strong">{m.paymentMethodCode} {m.isDefault && <span className="tag yellow"><Icon name="star" />{t('paymentMethods.default')}</span>}</td>
                  <td>{m.paymentMethodName}</td>
                  <td>{m.sortOrder}</td>
                  <td>{m.fiscalType}</td>
                  <td>{m.status ? <span className="tag green">{t('common.active')}</span> : <span className="tag gray">{t('common.inactive')}</span>}</td>
                  <td className="muted nowrap">{new Date(m.entryDate).toLocaleString(locale())}</td>
                  <td className="right nowrap">
                    <button className="btn" onClick={() => setForm({ ...m })}>{t('common.edit')}</button>{' '}
                    <button className="btn danger ghost" onClick={() => remove(m)}>{t('common.delete')}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {form && <PaymentMethodModal initial={form} onClose={() => setForm(null)} />}
    </>
  );
}

function PaymentMethodModal({ initial, onClose }: { initial: PaymentMethodForm; onClose: () => void }) {
  const { t } = useTranslation();
  const [form, setForm] = useState(initial);
  const create = useCreatePaymentMethod();
  const update = useUpdatePaymentMethod();
  const error = create.error ?? update.error;
  const set = (patch: Partial<PaymentMethodForm>) => setForm(f => ({ ...f, ...patch }));

  function submit(e: FormEvent) {
    e.preventDefault();
    const { paymentMethodId, ...req } = form;
    if (paymentMethodId) update.mutate({ paymentMethodId, ...req }, { onSuccess: onClose });
    else create.mutate(req, { onSuccess: onClose });
  }

  return (
    <Modal title={form.paymentMethodId ? t('paymentMethods.edit') : t('paymentMethods.new')} onClose={onClose}
      footer={<><button className="btn" onClick={onClose}>{t('common.cancel')}</button><button className="btn primary" form="pm-form">{t('common.save')}</button></>}>
      <form id="pm-form" onSubmit={submit}>
        <ErrorBox error={error?.message ?? null} />
        <div className="grid-2">
          <Field label={t('paymentMethods.code')} hint={t('paymentMethods.codeHint')}>
            <input value={form.paymentMethodCode} maxLength={20} onChange={e => set({ paymentMethodCode: e.target.value.toUpperCase() })} required autoFocus />
          </Field>
          <Field label={t('common.name')}>
            <input value={form.paymentMethodName} maxLength={100} onChange={e => set({ paymentMethodName: e.target.value })} required />
          </Field>
          <Field label={t('common.sortOrder')}>
            <input type="number" step="1" value={form.sortOrder} onChange={e => set({ sortOrder: Number(e.target.value) })} />
          </Field>
          <Field label={t('paymentMethods.fiscalType')} hint={t('paymentMethods.fiscalTypeHint')}>
            <input type="number" step="1" value={form.fiscalType} onChange={e => set({ fiscalType: Number(e.target.value) })} required />
          </Field>
        </div>
        <label className="inline-check"><input type="checkbox" checked={form.status} onChange={e => set({ status: e.target.checked })} /> {t('common.active')}</label>
        <label className="inline-check"><input type="checkbox" checked={form.isDefault} onChange={e => set({ isDefault: e.target.checked })} /> {t('paymentMethods.isDefault')}</label>
      </form>
    </Modal>
  );
}
