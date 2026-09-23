import { useEffect, useState } from 'react';
import { api } from '../api';
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
  const [items, setItems] = useState<Media[] | null>(null);

  useEffect(() => {
    api<Media[]>(`/media?type=${type}`).then(setItems).catch(() => setItems([]));
  }, [type]);

  return (
    <Modal title={type === 'Image' ? 'Zgjidh foto' : 'Zgjidh video'} onClose={onClose} wide>
      {items === null && <p className="muted">Duke ngarkuar...</p>}
      {items?.length === 0 && <Empty>Nuk ka {type === 'Image' ? 'foto' : 'video'}. Ngarkoni te faqja "Foto & Video".</Empty>}
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
