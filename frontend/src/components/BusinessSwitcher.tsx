import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Business } from '../types';

/** Inicialet e emrit për avatarin, p.sh. "Burger House" -> "BH". */
export function initials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return ((words[0]?.[0] ?? '') + (words[1]?.[0] ?? words[0]?.[1] ?? '')).toUpperCase();
}

/** Zgjedhja e biznesit në krye të menusë anësore (kartë me avatar + listë që hapet). */
export default function BusinessSwitcher({ businesses, current, onChange }: {
  businesses: Business[]; current: Business; onChange: (id: number) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const canSwitch = businesses.length > 1;

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onClick); document.removeEventListener('keydown', onKey); };
  }, [open]);

  return (
    <div ref={ref} className="biz-switch">
      <button type="button" className="biz-current" disabled={!canSwitch} aria-haspopup="listbox" aria-expanded={open}
        onClick={() => setOpen(o => !o)}>
        <BusinessAvatar business={current} />
        <span className="biz-text">
          <span className="biz-label">{t('businesses.current')}</span>
          <span className="biz-name">{current.name}</span>
        </span>
        {canSwitch && (
          <svg className="biz-chevron" viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
            <path d="M8 9l4-4 4 4M16 15l-4 4-4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
      {open && (
        <ul className="biz-options" role="listbox" aria-label={t('businesses.current')}>
          {businesses.map(b => (
            <li key={b.id}>
              <button type="button" role="option" aria-selected={b.id === current.id} className={b.id === current.id ? 'active' : ''}
                onClick={() => { setOpen(false); if (b.id !== current.id) onChange(b.id); }}>
                <BusinessAvatar business={b} />
                <span className="biz-text">
                  <span className="biz-name">{b.name}</span>
                  <span className="biz-label">{b.fullAccess ? t(`settings.type_${b.businessType}`) : t('businesses.screensOnly')}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function BusinessAvatar({ business }: { business: Business }) {
  return business.logoUrl
    ? <img className="biz-avatar" src={business.logoUrl} alt="" />
    : <span className="biz-avatar">{initials(business.name)}</span>;
}
