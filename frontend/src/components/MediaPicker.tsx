import { useTranslation } from 'react-i18next';
import { useMediaList } from '../services/Media/mediaQueries';
import type { Media, MediaType } from '../types';
import { Empty, Modal } from './ui';

export function MediaThumb({ media, className }: { media?: Media | null; className?: string }) {
  if (!media) return <div className={`thumb empty-thumb ${className ?? ''}`}>—</div>;
  return media.type === 'Video'
    ? <video className={`thumb ${className ?? ''}`} src={media.url} muted preload="metadata" />
    : <img className={`thumb ${className ?? ''}`} src={media.url} alt={media.name} loading="lazy" />;
}

export default function MediaPicker({ type, onSelect, onClose }: {
  type: MediaType; onSelect: (m: Media) => void; onClose: () => void;
}) {
  const { t } = useTranslation();
  const { data: items, isLoading } = useMediaList(type);

  return (
    <Modal title={type === 'Image' ? t('media.pickImage') : t('media.pickVideo')} onClose={onClose} wide>
      {isLoading && <p className="muted">{t('common.loading')}</p>}
      {items?.length === 0 && <Empty>{type === 'Image' ? t('media.pickerEmptyImage') : t('media.pickerEmptyVideo')}</Empty>}
      <div className="media-grid small">
        {items?.map(m => (
          <button key={m.id} className="media-card selectable" onClick={() => { onSelect(m); onClose(); }}>
            <MediaThumb media={m} />
            <div className="media-name">{m.name}</div>
          </button>
        ))}
      </div>
    </Modal>
  );
}
