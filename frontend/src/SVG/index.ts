import type React from 'react';
import CurrencyIcon from './CurrencyIcon';
import DashboardIcon from './DashboardIcon';
import LogOutIcon from './LogOutIcon';
import MediaIcon from './MediaIcon';
import PaymentMethodIcon from './PaymentMethodIcon';
import SettingsIcon from './SettingsIcon';
import type { SvgIconProps } from './types';

export type { SvgIconProps };
export { CurrencyIcon, DashboardIcon, LogOutIcon, MediaIcon, PaymentMethodIcon, SettingsIcon };

/**
 * Ikonat që thërret <Icon name="..." />. Për një ikonë të re:
 * 1. krijoni `SVG/EmriIcon.tsx` (si LogOutIcon.tsx) me SVG-në nga svgrepo.com,
 * 2. shtojeni këtu me emrin e saj.
 */
export const svgIcons: Partial<Record<string, React.FC<SvgIconProps>>> = {
  dashboard: DashboardIcon,
  logout: LogOutIcon,
  media: MediaIcon,
  settings: SettingsIcon,
  payment: PaymentMethodIcon,
  currency: CurrencyIcon,
  menu: CurrencyIcon, // e njëjta ikonë si Valutat (kartëmonedhë)
};
