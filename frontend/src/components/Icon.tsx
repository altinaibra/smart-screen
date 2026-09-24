/**
 * Ikonat e panelit. Çdo ikonë është një skedar SVG te `src/assets/icons/<emri>.svg`
 * (nga https://www.svgrepo.com/). Mjafton të shtoni skedarin dhe ta thërrisni: <Icon name="plus" />.
 * Ngjyra merr ngjyrën e tekstit (currentColor), madhësia është 1em (ose `size`).
 */
const files = import.meta.glob('../assets/icons/*.svg', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

const svgs: Record<string, string> = {};
for (const [path, raw] of Object.entries(files)) {
  const name = path.split('/').pop()!.replace(/\.svg$/, '');
  svgs[name] = raw
    .replace(/<\?xml[^>]*>|<!--[\s\S]*?-->|<!DOCTYPE[^>]*>/g, '')
    // ngjyrat fikse -> ngjyra e tekstit, që ikona të ndjekë temën/butonin
    .replace(/(stroke|fill)="(?!none|currentColor)[^"]*"/g, '$1="currentColor"')
    .replace(/\swidth="[^"]*"|\sheight="[^"]*"/g, '')
    .replace('<svg', '<svg width="1em" height="1em" aria-hidden="true" focusable="false"');
}

/** Emrat e ikonave dhe simboli që shfaqet derisa të shtohet skedari SVG. */
export const iconFallbacks = {
  dashboard: '▦',
  screens: '▭',
  playlists: '▶',
  media: '▣',
  menu: '☰',
  currency: '¤',
  payment: '▤',
  settings: '⚙',
  'external-link': '↗',
  close: '✕',
  plus: '+',
  upload: '↑',
  download: '⬇',
  star: '★',
  'arrow-left': '←',
  'arrow-up': '↑',
  'arrow-down': '↓',
  copy: '⧉',
  check: '✓',
  logout: '⎋',
  language: '🌐',
} as const;

export type IconName = keyof typeof iconFallbacks;

export default function Icon({ name, size, className }: { name: IconName; size?: number | string; className?: string }) {
  const style = size ? { fontSize: size } : undefined;
  const svg = svgs[name];
  if (!svg) return <span className={`icon ${className ?? ''}`} style={style} aria-hidden="true">{iconFallbacks[name]}</span>;
  return <span className={`icon ${className ?? ''}`} style={style} dangerouslySetInnerHTML={{ __html: svg }} />;
}
