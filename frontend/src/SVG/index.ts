import type React from 'react';
import LogOutIcon from './LogOutIcon';
import SettingsIcon from './SettingsIcon';
import type { SvgIconProps } from './types';

export type { SvgIconProps };
export { LogOutIcon, SettingsIcon };

/**
 * Ikonat që thërret <Icon name="..." />. Për një ikonë të re:
 * 1. krijoni `SVG/EmriIcon.tsx` (si LogOutIcon.tsx) me SVG-në nga svgrepo.com,
 * 2. shtojeni këtu me emrin e saj.
 */
export const svgIcons: Partial<Record<string, React.FC<SvgIconProps>>> = {
  logout: LogOutIcon,
  settings: SettingsIcon,
};
