import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { changeLanguage, languages } from '../i18n';

/**
 * Zgjedhja e gjuhës me flamur anash emrit (një <select> i zakonshëm nuk lejon foto brenda opsioneve).
 * `dark` = për sfondin e errët të menusë anësore.
 */
export default function LanguageSelect({ dark = false, up = false }: { dark?: boolean; up?: boolean }) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = languages.find(l => l.code === i18n.language) ?? languages[0];

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onClick); document.removeEventListener('keydown', onKey); };
  }, [open]);

  return (
    <div ref={ref} className={`lang-picker ${dark ? 'dark' : ''} ${up ? 'up' : ''}`}>
      <button type="button" className="lang-current" aria-haspopup="listbox" aria-expanded={open}
        title={t('common.language')} onClick={() => setOpen(o => !o)}>
        <img className="flag" src={current.flag} alt="" />
        <span>{current.label}</span>
        <span className="lang-caret" aria-hidden="true">▾</span>
      </button>
      {open && (
        <ul className="lang-options" role="listbox" aria-label={t('common.language')}>
          {languages.map(l => (
            <li key={l.code}>
              <button type="button" role="option" aria-selected={l.code === current.code}
                className={l.code === current.code ? 'active' : ''}
                onClick={() => { changeLanguage(l.code); setOpen(false); }}>
                <img className="flag" src={l.flag} alt="" />
                <span>{l.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
