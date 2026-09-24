import { InputHTMLAttributes, ReactNode, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Icon from './Icon';

export function Modal({ title, onClose, children, footer, wide }: {
  title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean;
}) {
  const { t } = useTranslation();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-label={title}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label={t('common.close')} title={t('common.close')}><Icon name="close" /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p className="muted">{subtitle}</p>}
      </div>
      {actions && <div className="actions">{actions}</div>}
    </div>
  );
}

export function ErrorBox({ error }: { error?: string | null }) {
  return error ? <div className="alert error">{error}</div> : null;
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

/** Fushë fjalëkalimi me butonin "sy" për ta parë/fshehur atë që shkruhet. */
export function PasswordInput(props: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const label = visible ? t('common.hidePassword') : t('common.showPassword');
  return (
    <span className="password-input">
      <input {...props} type={visible ? 'text' : 'password'} />
      <button type="button" className="password-toggle" onClick={() => setVisible(v => !v)}
        aria-label={label} title={label} aria-pressed={visible}>
        <Icon name={visible ? 'eye-off' : 'eye'} />
      </button>
    </span>
  );
}
