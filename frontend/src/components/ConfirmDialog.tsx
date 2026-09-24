import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from './ui';

// Zëvendëson window.confirm() me një modal në mes të faqes.
// Përdorimi: if (!(await confirmDialog(t('...')))) return;
// <ConfirmHost /> duhet të vendoset një herë në rrënjën e aplikacionit (main.tsx).

type ConfirmOptions = { title?: string; confirmText?: string; danger?: boolean };
type Request = ConfirmOptions & { message: string; resolve: (ok: boolean) => void };

let show: ((req: Request) => void) | null = null;

export function confirmDialog(message: string, options: ConfirmOptions = {}): Promise<boolean> {
  if (!show) return Promise.resolve(window.confirm(message));
  return new Promise(resolve => show!({ danger: true, ...options, message, resolve }));
}

export function ConfirmHost() {
  const { t } = useTranslation();
  const [req, setReq] = useState<Request | null>(null);
  const okRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    show = next => setReq(prev => { prev?.resolve(false); return next; });
    return () => { show = null; };
  }, []);

  useEffect(() => { if (req) okRef.current?.focus(); }, [req]);

  if (!req) return null;
  const close = (ok: boolean) => { req.resolve(ok); setReq(null); };

  return (
    <Modal
      title={req.title ?? t('common.confirmTitle')}
      onClose={() => close(false)}
      footer={<>
        <button className="btn" onClick={() => close(false)}>{t('common.cancel')}</button>
        <button ref={okRef} className={`btn ${req.danger ? 'danger' : 'primary'}`} onClick={() => close(true)}>
          {req.confirmText ?? (req.danger ? t('common.delete') : t('common.confirm'))}
        </button>
      </>}
    >
      <p className="confirm-message">{req.message}</p>
    </Modal>
  );
}
