import { FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { locale } from '../i18n';
import Icon from '../components/Icon';
import { Empty, ErrorBox, Field, Modal, PageHeader } from '../components/ui';
import { confirmDialog } from '../components/ConfirmDialog';
import type { SaveCurrencyRequest } from '../services/Currency/currencyMethods';
import { useCreateCurrency, useCurrencies, useDeleteCurrency, useSetMainCurrency, useUpdateCurrency } from '../services/Currency/currencyQueries';
import type { Currency } from '../types';

type CurrencyForm = SaveCurrencyRequest & { currencyId?: number };

const emptyForm = (first: boolean): CurrencyForm => ({
  currencyCode: '', currencyName: '', currencySymbol: '', exchangeRate: 1,
  status: true, isMainCurrency: first, fiscalType: -1, rowVersion: null,
});

export default function CurrenciesPage() {
  const { t } = useTranslation();
  const { data: currencies = [], isLoading, error: loadError } = useCurrencies();
  const { mutateAsync: setMainCurrency } = useSetMainCurrency();
  const { mutateAsync: deleteCurrency } = useDeleteCurrency();
  const [form, setForm] = useState<CurrencyForm | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function makeMain(c: Currency) {
    setError(null);
    await setMainCurrency(c.currencyId).catch(e => setError(e.message));
  }

  async function remove(c: Currency) {
    if (!(await confirmDialog(t('currencies.confirmDelete', { code: c.currencyCode })))) return;
    setError(null);
    await deleteCurrency(c.currencyId).catch(e => setError(e.message));
  }

  return (
    <>
      <PageHeader
        title={t('currencies.title')}
        subtitle={t('currencies.subtitle')}
        actions={<button className="btn primary" onClick={() => setForm(emptyForm(currencies.length === 0))}><Icon name="plus" />{t('currencies.add')}</button>}
      />
      <ErrorBox error={error ?? loadError?.message ?? null} />

      {!isLoading && currencies.length === 0 ? <Empty>{t('currencies.empty')}</Empty> : (
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th><th>{t('currencies.code')}</th><th>{t('common.name')}</th><th>{t('currencies.symbol')}</th>
                <th className="right">{t('currencies.exchangeRate')}</th><th>{t('currencies.fiscalType')}</th>
                <th>{t('currencies.status')}</th><th>{t('currencies.entryDate')}</th><th />
              </tr>
            </thead>
            <tbody>
              {currencies.map(c => (
                <tr key={c.currencyId} className={c.status ? '' : 'faded'}>
                  <td className="muted">{c.currencyId}</td>
                  <td className="strong">{c.currencyCode} {c.isMainCurrency && <span className="tag yellow"><Icon name="star" />{t('currencies.main')}</span>}</td>
                  <td>{c.currencyName}</td>
                  <td>{c.currencySymbol}</td>
                  <td className="right">{c.exchangeRate.toLocaleString(locale(), { minimumFractionDigits: 3, maximumFractionDigits: 6 })}</td>
                  <td>{c.fiscalType}</td>
                  <td>{c.status ? <span className="tag green">{t('common.active')}</span> : <span className="tag gray">{t('common.inactive')}</span>}</td>
                  <td className="muted nowrap">{new Date(c.entryDate).toLocaleString(locale())}</td>
                  <td className="right nowrap">
                    {!c.isMainCurrency && c.status && <><button className="btn" onClick={() => makeMain(c)}>{t('currencies.makeMain')}</button>{' '}</>}
                    <button className="btn" onClick={() => setForm({ ...c })}>{t('common.edit')}</button>{' '}
                    <button className="btn danger ghost" onClick={() => remove(c)} disabled={c.isMainCurrency}>{t('common.delete')}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {form && <CurrencyModal initial={form} onClose={() => setForm(null)} />}
    </>
  );
}

function CurrencyModal({ initial, onClose }: { initial: CurrencyForm; onClose: () => void }) {
  const { t } = useTranslation();
  const [form, setForm] = useState(initial);
  const create = useCreateCurrency();
  const update = useUpdateCurrency();
  const error = create.error ?? update.error;
  const set = (patch: Partial<CurrencyForm>) => setForm(f => ({ ...f, ...patch }));

  function submit(e: FormEvent) {
    e.preventDefault();
    const { currencyId, ...req } = form;
    if (currencyId) update.mutate({ currencyId, ...req }, { onSuccess: onClose });
    else create.mutate(req, { onSuccess: onClose });
  }

  return (
    <Modal title={form.currencyId ? t('currencies.edit') : t('currencies.new')} onClose={onClose}
      footer={<><button className="btn" onClick={onClose}>{t('common.cancel')}</button><button className="btn primary" form="currency-form">{t('common.save')}</button></>}>
      <form id="currency-form" onSubmit={submit}>
        <ErrorBox error={error?.message ?? null} />
        <div className="grid-2">
          <Field label={t('currencies.code')} hint={t('currencies.codeHint')}>
            <input value={form.currencyCode} maxLength={10} onChange={e => set({ currencyCode: e.target.value.toUpperCase() })} required autoFocus />
          </Field>
          <Field label={t('currencies.symbol')}>
            <input value={form.currencySymbol} maxLength={10} onChange={e => set({ currencySymbol: e.target.value })} placeholder="€, L, $" required />
          </Field>
        </div>
        <Field label={t('common.name')}>
          <input value={form.currencyName} maxLength={100} onChange={e => set({ currencyName: e.target.value })} placeholder="Euro" required />
        </Field>
        <div className="grid-2">
          <Field label={t('currencies.exchangeRate')} hint={t('currencies.exchangeRateHint')}>
            <input type="number" step="any" min="0" value={form.exchangeRate} onChange={e => set({ exchangeRate: Number(e.target.value) })} required />
          </Field>
          <Field label={t('currencies.fiscalType')} hint={t('currencies.fiscalTypeHint')}>
            <input type="number" step="1" value={form.fiscalType} onChange={e => set({ fiscalType: Number(e.target.value) })} required />
          </Field>
        </div>
        <label className="inline-check"><input type="checkbox" checked={form.status} onChange={e => set({ status: e.target.checked })} /> {t('common.active')}</label>
        <label className="inline-check"><input type="checkbox" checked={form.isMainCurrency} onChange={e => set({ isMainCurrency: e.target.checked })} /> {t('currencies.isMain')}</label>
      </form>
    </Modal>
  );
}
