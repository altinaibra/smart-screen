import { useEffect, useLayoutEffect, useRef, useState } from 'react';

/** Rezolucione tipike TV-sh për të parë si duket përmbajtja në madhësi të ndryshme. */
export const resolutions = [
  { label: 'Full HD 1920×1080', w: 1920, h: 1080 },
  { label: 'HD 1280×720', w: 1280, h: 720 },
  { label: '4K 3840×2160', w: 3840, h: 2160 },
  { label: 'Vertikal 1080×1920', w: 1080, h: 1920 },
  { label: 'Ultra-wide 2560×1080', w: 2560, h: 1080 },
];

/**
 * Shfaq player-in e vërtetë (/player/?preview=1) në një iframe të zvogëluar
 * dhe i dërgon përmbajtjen me postMessage (pa ekspozuar token-in në URL).
 */
export default function ScreenPreview({ content, resolution }: { content: unknown; resolution: { w: number; h: number } }) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [scale, setScale] = useState(0.2);

  useLayoutEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const update = () => setScale(Math.min(box.clientWidth / resolution.w, 520 / resolution.h));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(box);
    return () => ro.disconnect();
  }, [resolution.w, resolution.h]);

  useEffect(() => {
    if (ready && content && frameRef.current?.contentWindow) {
      frameRef.current.contentWindow.postMessage({ type: 'smartscreen-preview', content }, location.origin);
    }
  }, [ready, content]);

  return (
    <div ref={boxRef} className="preview-box">
      <div className="preview-frame" style={{ width: resolution.w * scale, height: resolution.h * scale }}>
        <iframe
          ref={frameRef}
          title="Preview"
          src="/player/?preview=1"
          onLoad={() => setReady(true)}
          style={{ width: resolution.w, height: resolution.h, transform: `scale(${scale})` }}
        />
      </div>
    </div>
  );
}
