import { FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { locale } from '../i18n';
import Icon from '../components/Icon';
import { ErrorBox, Field, Modal, PageHeader } from '../components/ui';
import { useCreateCurrency, useCurrencies, useSetMainCurrency, useUpdateCurrency } from '../services/Currency/currencyQueries';
import type { Currency } from '../types';

/** Valutat që përdoren zakonisht; përdoruesi vetëm zgjedh cilat i përdor (nuk i shkruan me dorë). */
const catalog = [
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'ALL', symbol: 'L', name: 'Leku shqiptar', aliases: ['LEK'] },
  { code: 'USD', symbol: '$', name: 'Dollari amerikan' },
  { code: 'CHF', symbol: 'CHF', name: 'Franga zvicerane' },
  { code: 'GBP', symbol: '£', name: 'Paundi britanik' },
  { code: 'MKD', symbol: 'ден', name: 'Denari maqedonas' },
  { code: 'RSD', symbol: 'дин', name: 'Dinari serb' },
  { code: 'TRY', symbol: '₺', name: 'Lira turke' },
  { code: 'BAM', symbol: 'KM', name: 'Marka boshnjake' },
];

type Row = { code: string; symbol: string; name: string; currency?: Currency };

export default function CurrenciesPage() {
  const { t } = useTranslation();
  const { data: currencies = [], error: loadError } = useCurrencies();
  const { mutateAsync: setMainCurrency } = useSetMainCurrency();
  const { mutateAsync: createCurrency } = useCreateCurrency();
  const { mutateAsync: updateCurrency } = useUpdateCurrency();
  const [editing, setEditing] = useState<Currency | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Lista e plotë: valutat e katalogut + ato të shtuara më parë me dorë që nuk janë në katalog.
  const matches = (c: Currency, code: string, aliases: string[] = []) => [code, ...aliases].includes(c.currencyCode);
  const rows: Row[] = [
    ...catalog.map(k => ({ code: k.code, symbol: k.symbol, name: k.name, currency: currencies.find(c => matches(c, k.code, k.aliases)) })),
    ...currencies.filter(c => !catalog.some(k => matches(c, k.code, k.aliases)))
      .map(c => ({ code: c.currencyCode, symbol: c.currencySymbol, name: c.currencyName, currency: c })),
  ];

  async function run(code: string, action: () => Promise<unknown>) {
    setError(null);
    setBusy(code);
    await action().catch(e => setError(e.message));
    setBusy(null);
  }

  /** Aktivizon/çaktivizon valutën. E para që zgjidhet bëhet kryesore. */
  function toggle(row: Row, used: boolean) {
    const c = row.currency;
    const hasMain = currencies.some(x => x.isMainCurrency && x.status);
    return run(row.code, () => c
      ? updateCurrency({ ...c, status: used, isMainCurrency: c.isMainCurrency || (used && !hasMain) })
      : createCurrency({
        currencyCode: row.code, currencyName: row.name, currencySymbol: row.symbol, exchangeRate: 1,
        status: true, isMainCurrency: !hasMain, fiscalType: -1, rowVersion: null,
      }));
  }

  return (
    <>
      <PageHeader title={t('currencies.title')} subtitle={t('currencies.subtitlePick')} />
      <ErrorBox error={error ?? loadError?.message ?? null} />

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>{t('currencies.used')}</th><th>{t('currencies.code')}</th><th>{t('common.name')}</th><th>{t('currencies.symbol')}</th>
              <th className="right">{t('currencies.exchangeRate')}</th><th />
            </tr>
          </thead>
          <tbody>
            {rows.map(row => {
              const c = row.currency;
              const used = !!c?.status;
              return (
                <tr key={row.code} className={used ? '' : 'faded'}>
                  <td>
                    <input type="checkbox" checked={used} disabled={busy === row.code || !!c?.isMainCurrency}
                      title={c?.isMainCurrency ? t('currencies.mainCannotDisable') : undefined}
                      onChange={e => toggle(row, e.target.checked)} />
                  </td>
                  <td className="strong">{row.code} {c?.isMainCurrency && <span className="tag yellow"><Icon name="star" />{t('currencies.main')}</span>}</td>
                  <td>{row.name}</td>
                  <td>{row.symbol}</td>
                  <td className="right">{used ? c!.exchangeRate.toLocaleString(locale(), { minimumFractionDigits: 3, maximumFractionDigits: 6 }) : '—'}</td>
                  <td className="right nowrap">
                    {used && !c!.isMainCurrency && <><button className="btn" disabled={busy === row.code} onClick={() => run(row.code, () => setMainCurrency(c!.currencyId))}>{t('currencies.makeMain')}</button>{' '}</>}
                    {used && <button className="btn" onClick={() => setEditing(c!)}>{t('currencies.editRate')}</button>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="muted">{t('currencies.pickHint')}</p>
      </div>

      {editing && <RateModal currency={editing} onClose={() => setEditing(null)} />}
    </>
  );
}

/** Vetëm kursi dhe lloji fiskal ndryshohen; kodi, emri dhe simboli vijnë nga lista. */
function RateModal({ currency, onClose }: { currency: Currency; onClose: () => void }) {
  const { t } = useTranslation();
  const [rate, setRate] = useState(currency.exchangeRate);
  const [fiscalType, setFiscalType] = useState(currency.fiscalType);
  const update = useUpdateCurrency();

  function submit(e: FormEvent) {
    e.preventDefault();
    update.mutate({ ...currency, exchangeRate: rate, fiscalType }, { onSuccess: onClose });
  }

  return (
    <Modal title={`${currency.currencyCode} – ${currency.currencyName}`} onClose={onClose}
      footer={<><button className="btn" onClick={onClose}>{t('common.cancel')}</button><button className="btn primary" form="currency-form" disabled={update.isPending}>{t('common.save')}</button></>}>
      <form id="currency-form" onSubmit={submit}>
        <ErrorBox error={update.error?.message ?? null} />
        <div className="grid-2">
          <Field label={t('currencies.exchangeRate')} hint={t('currencies.exchangeRateHint')}>
            <input type="number" step="any" min="0" value={rate} onChange={e => setRate(Number(e.target.value))} required autoFocus />
          </Field>
          <Field label={t('currencies.fiscalType')} hint={t('currencies.fiscalTypeHint')}>
            <input type="number" step="1" value={fiscalType} onChange={e => setFiscalType(Number(e.target.value))} required />
          </Field>
        </div>
      </form>
    </Modal>
  );
}
