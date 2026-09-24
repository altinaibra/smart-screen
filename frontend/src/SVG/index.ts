import type React from 'react';
import CurrencyIcon from './CurrencyIcon';
import DashboardIcon from './DashboardIcon';
import DownloadIcon from './DownloadIcon';
import ExternalLinkIcon from './ExternalLinkIcon';
import LogOutIcon from './LogOutIcon';
import MediaIcon from './MediaIcon';
import PaymentMethodIcon from './PaymentMethodIcon';
import PlaylistIcon from './PlaylistIcon';
import ScreenIcon from './ScreenIcon';
import SettingsIcon from './SettingsIcon';
import type { SvgIconProps } from './types';

export type { SvgIconProps };
export { CurrencyIcon, DashboardIcon, DownloadIcon, ExternalLinkIcon, LogOutIcon, MediaIcon, PaymentMethodIcon, PlaylistIcon, ScreenIcon, SettingsIcon };

/**
 * Ikonat që thërret <Icon name="..." />. Për një ikonë të re:
 * 1. krijoni `SVG/EmriIcon.tsx` (si LogOutIcon.tsx) me SVG-në nga svgrepo.com,
 * 2. shtojeni këtu me emrin e saj.
 */
export const svgIcons: Partial<Record<string, React.FC<SvgIconProps>>> = {
  dashboard: DashboardIcon,
  logout: LogOutIcon,
  media: MediaIcon,
  playlists: PlaylistIcon,
  screens: ScreenIcon,
  download: DownloadIcon,
  'external-link': ExternalLinkIcon,
  settings: SettingsIcon,
  payment: PaymentMethodIcon,
  currency: CurrencyIcon,
  menu: CurrencyIcon, // e njëjta ikonë si Valutat (kartëmonedhë)
};
