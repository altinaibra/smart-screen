import { useEffect, useLayoutEffect, useRef, useState } from 'react';

/** Rezolucione tipike TV-sh për të parë si duket përmbajtja në madhësi të ndryshme. */
/** `label` është çelës përkthimi: t(label). */
export const resolutions = [
  { label: 'preview.fullHd', w: 1920, h: 1080 },
  { label: 'preview.hd', w: 1280, h: 720 },
  { label: 'preview.uhd', w: 3840, h: 2160 },
  { label: 'preview.vertical', w: 1080, h: 1920 },
  { label: 'preview.ultraWide', w: 2560, h: 1080 },
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
