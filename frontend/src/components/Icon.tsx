import { svgIcons } from '../SVG';

/**
 * Ikonat e panelit: <Icon name="logout" />. Komponentët SVG janë te dosja `src/SVG/`
 * (p.sh. SVG/LogOutIcon.tsx) dhe regjistrohen te `SVG/index.ts`.
 * Ngjyra ndjek tekstin (currentColor), madhësia është 1em (ose `size`).
 */

/** Emrat e ikonave dhe simboli që shfaqet derisa të shtohet komponenti SVG. */
export const iconFallbacks = {
  dashboard: '▦',
  screens: '▭',
  playlists: '▶',
  media: '▣',
  menu: '☰',
  currency: '¤',
  payment: '▤',
  settings: '⚙',
  business: '⌂',
  users: '👥',
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
  eye: '👁',
  'eye-off': '⊘',
} as const;

export type IconName = keyof typeof iconFallbacks;

export default function Icon({ name, size, color, className }: { name: IconName; size?: number | string; color?: string; className?: string }) {
  const Svg = svgIcons[name];
  return (
    <span className={`icon ${className ?? ''}`} style={size ? { fontSize: size } : undefined} aria-hidden="true">
      {Svg ? <Svg color={color} /> : iconFallbacks[name]}
    </span>
  );
}
