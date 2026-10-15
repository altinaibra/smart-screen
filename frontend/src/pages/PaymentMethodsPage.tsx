import { FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Icon from '../components/Icon';
import { ErrorBox, Field, Modal, PageHeader } from '../components/ui';
import { confirmDialog } from '../components/ConfirmDialog';
import type { SavePaymentMethodRequest } from '../services/PaymentMethod/paymentMethodMethods';
import {
  useCreatePaymentMethod, useDeletePaymentMethod, usePaymentMethods, useUpdatePaymentMethod,
} from '../services/PaymentMethod/paymentMethodQueries';
import type { PaymentMethod } from '../types';

type PaymentMethodForm = SavePaymentMethodRequest & { paymentMethodId?: number };

/** Mënyrat e pagesës që përdoren zakonisht; zgjidhen me një klik. Të tjerat shtohen me "Mënyrë pagese". */
const catalog = [
  { code: 'CASH', name: 'Para në dorë' },
  { code: 'CARD', name: 'Kartë (POS)' },
  { code: 'BANK', name: 'Transfertë bankare (xhirollogari)' },
  { code: 'LATER', name: 'Me pritje' },
  { code: 'PCB', name: 'PCB POS' },
  { code: 'RFZ', name: 'RFZ POS' },
  { code: 'TEB', name: 'TEB POS' },
  { code: 'NLB', name: 'NLB POS' },
  { code: 'BKT', name: 'BKT POS' },
];
const isCatalog = (code: string) => catalog.some(k => k.code === code);

type Row = { code: string; name: string; method?: PaymentMethod };

export default function PaymentMethodsPage() {
  const { t } = useTranslation();
  const { data: methods = [], error: loadError } = usePaymentMethods();
  const { mutateAsync: createPaymentMethod } = useCreatePaymentMethod();
  const { mutateAsync: updatePaymentMethod } = useUpdatePaymentMethod();
  const { mutateAsync: deletePaymentMethod } = useDeletePaymentMethod();
  const [form, setForm] = useState<PaymentMethodForm | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Lista e plotë: mënyrat e gatshme + ato të shtuara nga përdoruesi.
  const rows: Row[] = [
    ...catalog.map(k => ({ ...k, method: methods.find(m => m.paymentMethodCode === k.code) })),
    ...methods.filter(m => !isCatalog(m.paymentMethodCode))
      .map(m => ({ code: m.paymentMethodCode, name: m.paymentMethodName, method: m })),
  ];

  async function run(code: string, action: () => Promise<unknown>) {
    setError(null);
    setBusy(code);
    await action().catch(e => setError(e.message));
    setBusy(null);
  }

  /** Aktivizon/çaktivizon mënyrën. E para që zgjidhet bëhet e parazgjedhur. */
  function toggle(row: Row, used: boolean) {
    const m = row.method;
    const hasDefault = methods.some(x => x.isDefault && x.status);
    return run(row.code, () => m
      ? updatePaymentMethod({ ...m, status: used, isDefault: used ? m.isDefault || !hasDefault : false })
      : createPaymentMethod({
        paymentMethodCode: row.code, paymentMethodName: row.name, status: true, isDefault: !hasDefault,
        sortOrder: catalog.findIndex(k => k.code === row.code) + 1, fiscalType: -1, rowVersion: null,
      }));
  }

  async function remove(m: PaymentMethod) {
    if (!(await confirmDialog(t('paymentMethods.confirmDelete', { name: m.paymentMethodName })))) return;
    await run(m.paymentMethodCode, () => deletePaymentMethod(m.paymentMethodId));
  }

  const openNew = () => setForm({
    paymentMethodCode: '', paymentMethodName: '', status: true, isDefault: !methods.some(m => m.isDefault && m.status),
    sortOrder: rows.length + 1, fiscalType: -1, rowVersion: null,
  });

  return (
    <>
      <PageHeader
        title={t('paymentMethods.title')}
        subtitle={t('paymentMethods.subtitlePick')}
        actions={<button className="btn primary" onClick={openNew}><Icon name="plus" />{t('paymentMethods.add')}</button>}
      />
      <ErrorBox error={error ?? loadError?.message ?? null} />

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>{t('paymentMethods.used')}</th><th>{t('paymentMethods.code')}</th><th>{t('common.name')}</th>
              <th>{t('paymentMethods.fiscalType')}</th><th />
            </tr>
          </thead>
          <tbody>
            {rows.map(row => {
              const m = row.method;
              const used = !!m?.status;
              return (
                <tr key={row.code} className={used ? '' : 'faded'}>
                  <td><input type="checkbox" checked={used} disabled={busy === row.code} onChange={e => toggle(row, e.target.checked)} /></td>
                  <td className="strong">{row.code} {m?.isDefault && used && <span className="tag yellow"><Icon name="star" />{t('paymentMethods.default')}</span>}</td>
                  <td>{m?.paymentMethodName ?? row.name}</td>
                  <td>{m ? m.fiscalType : '—'}</td>
                  <td className="right nowrap">
                    {used && !m!.isDefault && <><button className="btn" disabled={busy === row.code} onClick={() => run(row.code, () => updatePaymentMethod({ ...m!, isDefault: true }))}>{t('paymentMethods.makeDefault')}</button>{' '}</>}
                    {m && <button className="btn" onClick={() => setForm({ ...m })}>{t('common.edit')}</button>}
                    {m && !isCatalog(m.paymentMethodCode) && <>{' '}<button className="btn danger ghost" onClick={() => remove(m)}>{t('common.delete')}</button></>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="muted">{t('paymentMethods.pickHint')}</p>
      </div>

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
            <input value={form.paymentMethodCode} maxLength={20} onChange={e => set({ paymentMethodCode: e.target.value.toUpperCase() })} required autoFocus
              disabled={!!form.paymentMethodId && isCatalog(initial.paymentMethodCode)} />
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
